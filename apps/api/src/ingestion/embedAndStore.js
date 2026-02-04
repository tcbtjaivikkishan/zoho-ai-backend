import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

export async function embedAndStore(chunks, batchSize = 10) {
  const rows = [];

  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    rows.push({
      content: text,
      embedding: embeddingResponse.data[0].embedding,
      source: "docx",
    });

    console.log(`🧠 Embedded ${i + 1}/${chunks.length}`);

    // insert in batches
    if (rows.length === batchSize || i === chunks.length - 1) {
      const { error } = await supabase
        .from("knowledge_chunks")
        .insert(rows);

      if (error) {
        console.error("Supabase batch insert error:", error);
        throw error;
      }

      console.log(`📦 Inserted batch of ${rows.length}`);
      rows.length = 0; // clear batch
    }
  }
}
