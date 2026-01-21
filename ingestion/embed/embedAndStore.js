import { supabase } from "../../db/supabase.js";
import { embedText } from "./localEmbedder.js";

export async function storeChunks(chunks, source) {
  for (const chunk of chunks) {
    const embedding = await embedText(chunk);

    const { error } = await supabase.from("documents").insert({
      source,
      chunk,
      embedding
    });

    if (error) {
      console.error("❌ Insert failed:", error.message);
    }
  }
}
