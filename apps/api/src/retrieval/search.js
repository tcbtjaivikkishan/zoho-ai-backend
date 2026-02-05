import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

/* -----------------------------
   Intent Detection (Hindi)
------------------------------ */

const WHY_RE = /क्यों|कैसे|कारण/;
const EFFECT_RE = /क्या\s+प्रभाव|क्या\s+होता|परिणाम|असर/;

const isWhyQuestionHindi = q => WHY_RE.test(q);
const isEffectQuestionHindi = q => EFFECT_RE.test(q);

/* -----------------------------
   Context Compression
------------------------------ */

function compressContext(context, keywords) {
  if (!context) return "";

  const sentences = context
    .replace(/\n+/g, " ")
    .split(/[।!?]/);

  const filtered = sentences.filter(s =>
    keywords.some(k => s.includes(k))
  );

  return filtered.length
    ? filtered.join("। ")
    : context;
}

/* -----------------------------
   Semantic Cache (SAFE)
------------------------------ */

async function getQueryEmbedding(question) {
  const normalized = question.trim().toLowerCase();

  /* cleanup old cache (fire & forget) */
  supabase
    .from("query_cache")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  /* generate embedding */
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: normalized,
  });

  const embedding = res.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding shape");
  }

  /* try semantic cache */
  const { data: cached } = await supabase.rpc(
    "match_query_cache",
    {
      query_embedding: embedding,
      similarity_threshold: 0.92,
      match_count: 1
    }
  );

  if (cached?.length) {
    console.log("⚡ Semantic cache hit");
    return cached[0].embedding;
  }

  /* store */
  await supabase.from("query_cache").insert({
    question: normalized,
    embedding
  });

  console.log("💾 Cached new embedding");
  return embedding;
}

/* -----------------------------
   LLM Reranker (guarded)
------------------------------ */

async function rerankChunks(question, chunks) {
  if (!chunks || chunks.length <= 3) return chunks;

  const preview = chunks
    .map((c, i) => `Chunk ${i + 1}: ${c.content.slice(0, 300)}`)
    .join("\n\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [{
      role: "user",
      content: `
Question: ${question}

Pick the 3 most relevant chunks.

${preview}

Reply ONLY with numbers like: 1,3,5
`
    }]
  });

  const text = res.choices?.[0]?.message?.content || "";
  const ids = [...text.matchAll(/\d+/g)]
    .map(m => Number(m[0]) - 1)
    .filter(i => i >= 0 && i < chunks.length);

  return ids.length
    ? ids.map(i => chunks[i])
    : chunks.slice(0, 3);
}

/* -----------------------------
   Main Retrieval
------------------------------ */

export async function searchContext(question, k = 8) {
  if (!question) return "";

  const isWhy = isWhyQuestionHindi(question);
  const isEffect = isEffectQuestionHindi(question);

  const keywords = question
    .split(/\s+/)
    .filter(w => w.length > 2);

  /* single, stable embedding */
  const queryEmbedding = await getQueryEmbedding(question);

  /* vector search */
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: isEffect ? 20 : k
  });

  if (error || !data?.length) return "";

  /* hybrid scoring */
  const seen = new Set();
  const hybrid = data
    .filter(d => {
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return d.content?.length > 60;
    })
    .map(d => {
      const hits = keywords.filter(k => d.content.includes(k)).length;
      return { ...d, score: d.similarity + hits * 0.05 };
    })
    .sort((a, b) => b.score - a.score);

  console.log("🔎 Hybrid:", hybrid.length);

  /* rerank only top few */
  const reranked = await rerankChunks(
    question,
    hybrid.slice(0, 8)
  );

  console.log("⭐ Reranked:", reranked.length);

  const context = reranked
    .slice(0, isEffect ? 5 : 3)
    .map(d => d.content.slice(0, 700))
    .join("\n\n");

  if (isWhy && context.length < 50) return "";

  return compressContext(context, keywords);
}
