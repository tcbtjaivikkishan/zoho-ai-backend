import { supabase } from "./db/supabase.js";
import { embedText } from "./ingestion/embed/localEmbedder.js";

const question = "What are the five elements of nature?";

const queryEmbedding = await embedText(question);

const { data, error } = await supabase.rpc("match_documents", {
  query_embedding: queryEmbedding,
  match_threshold: 0.3,
  match_count: 5
});

if (error) {
  console.error(error);
  process.exit(1);
}

console.log("Results:\n");
data.forEach((row, i) => {
  console.log(`--- ${i + 1} (score ${row.similarity.toFixed(2)}) ---`);
  console.log(row.chunk);
});
