import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

const DEBUG = true;

/* -----------------------------
   Intent Detection (Hindi)
------------------------------ */

const WHY_RE = /क्यों|कारण/;
const EFFECT_RE = /क्या\s+प्रभाव|क्या\s+होता|परिणाम|असर/;
const PROCEDURE_RE = /उपाय|विधि|इलाज|नियंत्रण|कैसे\s+करें|कैसे\s+करे/;

const isWhyQuestion = q => WHY_RE.test(q);
const isEffectQuestion = q => EFFECT_RE.test(q);
const isProcedureQuestion = q => PROCEDURE_RE.test(q);

/* -----------------------------
   Context Compression (STRICT)
------------------------------ */

function compressContext(context, keywords) {
  if (!context) return "";

  const sentences = context
    .replace(/\n+/g, " ")
    .split(/[।!?]/)
    .map(s => s.trim())
    .filter(Boolean);

  const filtered = sentences.filter(sentence =>
    keywords.some(k =>
      sentence.includes(k) || sentence.includes(k.slice(0, 3))
    )
  );

  return filtered.length ? filtered.join("। ") : "";
}

/* -----------------------------
   Semantic Cache
------------------------------ */

async function getQueryEmbedding(question) {
  const normalized = question.trim().toLowerCase();

  supabase
    .from("query_cache")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    );

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: normalized
  });

  const embedding = res.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding");
  }

  const { data: cached } = await supabase.rpc("match_query_cache", {
    query_embedding: embedding,
    similarity_threshold: 0.88,
    match_count: 1
  });

  if (cached?.length && normalized.length > 10) {
    if (DEBUG) console.log("⚡ Semantic cache hit");
    return cached[0].embedding;
  }

  await supabase.from("query_cache").insert({
    question: normalized,
    embedding
  });

  return embedding;
}

/* -----------------------------
   LLM Reranker (STRICT)
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

Pick the most relevant chunks.
यदि कोई भी chunk सीधे प्रश्न से संबंधित नहीं है,
तो "NONE" लिखें।

${preview}

Reply ONLY with numbers like: 1,3
`
    }]
  });

  const text = res.choices?.[0]?.message?.content || "";

  if (/NONE/i.test(text)) return [];

  const ids = [...text.matchAll(/\d+/g)]
    .map(m => Number(m[0]) - 1)
    .filter(i => i >= 0 && i < chunks.length);

  return ids.length ? ids.map(i => chunks[i]) : [];
}

/* -----------------------------
   Main Retrieval
------------------------------ */

export async function searchContext(question, k = 8) {
  if (!question || question.trim().length < 3) return "";

  const isWhy = isWhyQuestion(question);
  const isEffect = isEffectQuestion(question);
  const isProcedure = isProcedureQuestion(question);

  let keywords = question
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (isWhy) {
    keywords = [
      ...keywords,
      "कठोर",
      "हवा",
      "पानी",
      "कार्बन",
      "पीएच",
      "खनिज",
      "जीवाणु",
      "बीमारी"
    ];
  }

  const queryEmbedding = await getQueryEmbedding(question);

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: isEffect ? 20 : k
  });

  if (error || !data?.length) return "";

  if (DEBUG) {
    console.log("🧱 RAW CHUNKS:", data.length);
  }

  /* -------- Hybrid Scoring -------- */

  const seen = new Set();

  const MIN_SCORE = isWhy ? 0.6 : isProcedure ? 0.7 : 0.65;

  const hybrid = data
    .filter(d => {
      if (!d?.content || d.content.length < 60) return false;
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return true;
    })
    .map(d => {
      const hits = keywords.filter(k =>
        d.content.includes(k) || d.content.includes(k.slice(0, 3))
      ).length;



      return {
        ...d,
        score: d.similarity + hits * 0.05
      };
    })
    .filter(d => d.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score);

  if (DEBUG) {
    console.log("🔎 HYBRID:", hybrid.length);
    hybrid.forEach((d, i) => {
      console.log(
        `H${i + 1}`,
        d.score.toFixed(3),
        "|",
        d.content.slice(0, 120)
      );
    });
  }

  if (!hybrid.length) return "";

  if (isProcedure && hybrid.length < 2) return "";

  /* -------- Rerank -------- */

  const reranked = await rerankChunks(
    question,
    hybrid.slice(0, 6)
  );

  if (DEBUG) {
    console.log("⭐ RERANKED:", reranked.length);
  }

  if (!reranked.length) return "";

  if (reranked[0].score < 0.8) return "";

  if (isWhy && reranked.length < 2) return "";

  /* -------- Context Assembly -------- */

  const maxChunks = isProcedure ? 2 : isEffect ? 5 : 3;

  const context = reranked
    .slice(0, maxChunks)
    .map(d => d.content.slice(0, 700))
    .join("\n\n");

  if (DEBUG) {
    console.log("📄 CONTEXT BEFORE COMPRESSION:");
    console.log(context);
  }

  if (!context) return "";

  // 🔥 KEY FIX: WHY questions keep full explanation
  if (isWhy) {
    if (DEBUG) console.log("🟢 WHY detected → skipping compression");
    return context;
  }

  const compressed = compressContext(context, keywords);

  if (DEBUG) {
    console.log("✂️ CONTEXT AFTER COMPRESSION:");
    console.log(compressed);
  }

  return compressed;
}
