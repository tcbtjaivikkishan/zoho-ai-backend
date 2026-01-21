import { supabase } from "../db/supabase.js";

export async function retrieveContext(queryEmbedding) {
  const { data } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.75,
    match_count: 5
  });

  return data.map(d => d.chunk).join("\n");
}
