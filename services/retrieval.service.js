import { supabase } from "../db/supabase.js";
import { embedText } from "../ingestion/embed/localEmbedder.js";
import { expandQuery, expandQueryHindi } from "../retrieval/queryExpander.js";

/* -----------------------------
   Intent detection helpers
------------------------------ */
function isWhyQuestionHindi(q) {
  return /क्यों|कैसे|कारण/.test(q);
}

function isDefinitionQuestion(q) {
  return /क्या\s+हैं|क्या\s+है|परिभाषा|बताइए/.test(q);
}

function hasConcreteAgriCause(context) {
  return /फंगस|रोग|नमी|आर्द्रता|जल|पानी|जलभराव|मिट्टी|जीवाणु|सूक्ष्मजीव|जैविक/i.test(context);
}

function isWhoQuestionHindi(q) {
  return /कौन/.test(q);
}

function isEffectQuestionHindi(q) {
  return /क्या\s+प्रभाव|क्या\s+होता|परिणाम|असर/.test(q);
}

/* -----------------------------
   Supabase RPC with retry
------------------------------ */

async function rpcWithRetry(payload, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await supabase.rpc("match_documents", payload);
      if (res.error) throw res.error;
      return res.data;
    } catch (err) {
      console.error(`Retrieval attempt ${attempt} failed:`, err.message);
      if (attempt === retries) return [];
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

/* -----------------------------
   Main retrieval
------------------------------ */

export async function retrieveContext(question) {
  const isHindi = /[ऀ-ॿ]/.test(question);
  const isDefinition = isHindi && isDefinitionQuestion(question);
  const isWho = isHindi && isWhoQuestionHindi(question);
  const isEffect = isHindi && isEffectQuestionHindi(question);
  const isWhy = isWhyQuestionHindi(question);

  /* 🔥 Intent-aware expansion */
  let expandedQueries;
  if (isDefinition || isWho || isEffect) {
    expandedQueries = [question];
  } else {
    expandedQueries = isHindi
      ? expandQueryHindi(question)
      : expandQuery(question);
  }

  console.log("🟡 Using queries:", expandedQueries);

  /* -----------------------------
     1️⃣ Embed queries
  ------------------------------ */

  const embeddings = [];
  for (const q of expandedQueries) {
    embeddings.push(await embedText(q)); // query:
  }

  if (embeddings.length === 0) return "";

  /* -----------------------------
     2️⃣ Average embeddings
  ------------------------------ */

  const finalEmbedding = embeddings[0].map((_, i) =>
    embeddings.reduce((sum, e) => sum + e[i], 0) / embeddings.length
  );

  /* -----------------------------
     3️⃣ Vector search (with retry)
  ------------------------------ */

  const data = await rpcWithRetry({
    query_embedding: finalEmbedding,
  match_threshold: isEffect ? 0.06 : (isHindi ? 0.12 : 0.25),
  match_count: isEffect ? 20 : 12
  });

  if (!data || data.length === 0) return "";

  /* -----------------------------
     4️⃣ Rank + clean
  ------------------------------ */

  const unique = new Map();

  for (const d of data) {
    if (!unique.has(d.chunk)) {
      unique.set(d.chunk, d.similarity);
    }
  }

  const cleaned = [...unique.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([chunk]) => chunk.trim())
    .filter(chunk => {
      const length = chunk.length;
      const words = chunk.split(/\s+/).length;
      return length >= 40 && words >= 5;
    });

  console.log("✅ Retrieved chunks:", cleaned.length);

  /* -----------------------------
     5️⃣ Context limit
  ------------------------------ */

const maxChunks = isEffect ? 6 : 3;

const finalContext = cleaned
  .slice(0, maxChunks)
  .map(c => c.slice(0, 700))
  .join("\n\n");

if (isWhy && !hasConcreteAgriCause(finalContext)) {
  console.log("⛔ WHY question blocked — no concrete agri causes found");
  return "";
}

return finalContext;


}
