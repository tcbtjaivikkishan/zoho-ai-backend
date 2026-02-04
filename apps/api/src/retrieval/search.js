import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

/* -----------------------------
   Intent Detection
------------------------------ */

function isHindi(q) {
  return /[ऀ-ॿ]/.test(q);
}

function isWhyQuestionHindi(q) {
  return /क्यों|कैसे|कारण/.test(q);
}

function isEffectQuestionHindi(q) {
  return /क्या\s+प्रभाव|क्या\s+होता|परिणाम|असर/.test(q);
}

/* -----------------------------
   Context Compression
------------------------------ */

function compressContext(context, keywords) {
  const sentences = context
    .replace(/\n/g, " ")
    .split(/[।.!?]/);

  const filtered = sentences.filter(sentence =>
    keywords.some(k => sentence.includes(k))
  );

  return filtered.join("। ");
}

/* -----------------------------
   Main Search
------------------------------ */

export async function searchContext(question, k = 8) {
  const hindi = isHindi(question);
  const isWhy = isWhyQuestionHindi(question);
  const isEffect = isEffectQuestionHindi(question);

  /* 🔑 Extract keywords once */
  const keywords = question
    .split(/\s+/)
    .filter(w => w.length > 2);

  /* 1️⃣ Query variations */
  const variations = [
    question,
    `${question} कारण`,
    `${question} समस्या`
  ];

  /* 2️⃣ Embed all */
  const allEmbeddings = [];

  for (const q of variations) {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: q,
    });
    allEmbeddings.push(emb.data[0].embedding);
  }

  /* 3️⃣ Average embeddings */
  const queryEmbedding = allEmbeddings[0].map((_, i) =>
    allEmbeddings.reduce((sum, e) => sum + e[i], 0) / allEmbeddings.length
  );

  /* 4️⃣ Vector Search */
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: isEffect ? 20 : k
  });

  if (error) throw error;
  if (!data?.length) return "";

  /* 5️⃣ Hybrid rerank */
  const seen = new Set();

  const cleaned = data
    .filter(d => {
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return true;
    })
    .map(d => {
      const keywordHits = keywords.filter(k =>
        d.content.includes(k)
      ).length;

      return {
        ...d,
        hybridScore: d.similarity + (keywordHits * 0.05)
      };
    })
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .filter(d => d.content.length > 60);

  /* 6️⃣ Limit context */
  const maxChunks = isEffect ? 6 : 4;

  const finalContext = cleaned
    .slice(0, maxChunks)
    .map(d => d.content.slice(0, 700))
    .join("\n\n");

  if (isWhy && finalContext.length < 50) return "";

  console.log("✅ Final chunks:", cleaned.length);

  /* 7️⃣ Compress */
  const compressed = compressContext(finalContext, keywords);

  return compressed || finalContext;
}
