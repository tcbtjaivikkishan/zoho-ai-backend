import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";
import { data } from "../ingestion/data.js";


/* -----------------------------
   Topic Keywords (NO DB CHANGE)
------------------------------ */
/* -----------------------------
   Text Cleaner
------------------------------ */

function cleanText(text) {
  return text
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

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

  const joined = filtered.length
    ? filtered.join("। ")
    : context;

  return cleanText(joined);
}

/* -----------------------------
   Semantic Cache
------------------------------ */

async function getQueryEmbedding(question) {
  const normalized = question.trim().toLowerCase();

  // cleanup old cache
  supabase
    .from("query_cache")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - 7 * 86400000).toISOString()
    );

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: normalized,
  });

  const embedding = res.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding");
  }

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

  await supabase.from("query_cache").insert({
    question: normalized,
    embedding
  });

  console.log("💾 Cached new embedding");
  return embedding;
}

/* -----------------------------
   Topic Boost Scoring
------------------------------ */

function topicBoostScore(text) {
  let score = 0;
  for (const t of BOOK_TOPICS) {
    if (text.includes(t)) score += 0.03;
  }
  return score;
}

/* -----------------------------
   LLM Reranker
------------------------------ */

async function rerankChunks(question, chunks) {
  if (!chunks || chunks.length <= 3) return chunks;

  const preview = chunks
    .map((c, i) =>
      `Chunk ${i + 1}: ${c.content.slice(0, 250)}`
    )
    .join("\n\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [{
      role: "user",
      content: `
Question: ${question}

Pick best 3 chunks.

${preview}

Reply only numbers like: 1,3,5
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
   MAIN SEARCH (NO DB CHANGE)
------------------------------ */

export async function searchContext(question) {
  if (!question) return "";

  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });

  const queryEmbedding = emb.data[0].embedding;

  // 2️⃣ vector search in supabase
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: 6
  });

  if (error) throw error;

  // 3️⃣ join context text
  const context = data
    .map(d => d.content)
    .join("\n\n");

  return { context, matches: data };
}
