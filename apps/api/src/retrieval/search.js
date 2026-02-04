import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

export async function searchContext(question, k = 8) {
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question,
  });

  const queryEmbedding = emb.data[0].embedding;

  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: k,
  });

  if (error) {
    console.error("RPC error:", error);
    throw error;
  }

  console.log("\n🔎 Retrieved chunks preview:");
  (data || []).forEach((d, i) => {
    console.log(`--- Chunk ${i + 1} (similarity: ${d.similarity?.toFixed(3)}) ---`);
    console.log(d.content.slice(0, 250));
  });

  return (data || []).map(d => d.content).join("\n");
}
