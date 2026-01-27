import { supabase } from "../db/supabase.js";
import { embedText } from "../ingestion/embed/localEmbedder.js";
import { expandQuery, expandQueryHindi } from "../retrieval/queryExpander.js";

/* -----------------------------
   Intent detection helpers
------------------------------ */

function isDefinitionQuestion(q) {
  return /क्या\s+हैं|क्या\s+है|परिभाषा|बताइए/.test(q);
}

function isWhoQuestionHindi(q) {
  return /कौन/.test(q);
}

/* -----------------------------
   Main retrieval
------------------------------ */

export async function retrieveContext(question) {
  const isHindi = /[ऀ-ॿ]/.test(question);
  const isDefinition = isHindi && isDefinitionQuestion(question);
  const isWho = isHindi && isWhoQuestionHindi(question);

  /* 🔥 CRITICAL FIX:
     Do NOT expand definition / who questions
  */
  let expandedQueries;
  if (isDefinition || isWho) {
    expandedQueries = [question];
  } else {
    expandedQueries = isHindi
      ? expandQueryHindi(question)
      : expandQuery(question);
  }

  console.log("🟡 Using queries:", expandedQueries);

  /* -----------------------------
     1️⃣ Embed all queries
  ------------------------------ */

  const embeddings = [];
  for (const q of expandedQueries) {
    embeddings.push(await embedText(q)); // query:
  }

  /* -----------------------------
     2️⃣ Merge embeddings (average)
  ------------------------------ */

  const finalEmbedding = embeddings[0].map((_, i) =>
    embeddings.reduce((sum, e) => sum + e[i], 0) / embeddings.length
  );

  /* -----------------------------
     3️⃣ Single Supabase call
  ------------------------------ */

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: finalEmbedding,
    match_threshold: isHindi ? 0.12 : 0.25,
    match_count: 12
  });

  if (error) {
    console.error("Retrieval error:", error.message);
    return "";
  }

  /* -----------------------------
     4️⃣ Rank + clean
  ------------------------------ */

  const unique = new Map();

  for (const d of data || []) {
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
     5️⃣ HARD LIMIT context
  ------------------------------ */

  return cleaned
    .slice(0, 3)
    .map(c => c.slice(0, 700))
    .join("\n\n");
}
