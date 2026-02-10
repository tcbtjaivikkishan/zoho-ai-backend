import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

export async function embedAndStore(chunks, batchSize = 20) {
  for (let i = 0; i < chunks.length; i += batchSize) {

    const batch = chunks.slice(i, i + batchSize);

    // ✅ Normalize Hindi text
    const texts = batch.map(c => c.text.normalize("NFC"));

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    const rows = batch.map((chunk, idx) => ({
      content: chunk.text,
      embedding: embeddingResponse.data[idx].embedding,
      metadata: {
        book: "TCBT Panchmahabhoot Krishi",
        chapter: chunk.chapter,
        language: "hi",
        source_id: "tcbt_book_1",
        version: "v2-heading-aware",
        chunk_index: i + idx,
        length: chunk.text.length
      },
    }));

    const { error } = await supabase
      .from("knowledge_chunks_2")
      .insert(rows);

    if (error) throw error;

    console.log(`📦 Inserted ${i + batch.length}/${chunks.length}`);
  }
}
