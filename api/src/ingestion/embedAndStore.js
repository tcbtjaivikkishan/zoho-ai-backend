
import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

export async function embedAndStore(chunks) {
  for (const c of chunks) {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: c.text
    });
  
    try {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          content: c.text,
          section: c.section,
          subsection: c.subsection,
          chunk_no: c.chunk,
          embedding: emb.data[0].embedding
        });
    
      if (error) throw error;   // 🔥 THIS LINE IS REQUIRED
    
      console.log(`Inserted → ${c.section} / ${c.subsection ?? "-"} / ${c.chunk}`);
    
    } catch (err) {
      console.log(
        `Insert FAILED → ${c.section} / ${c.subsection ?? "-"} / ${c.chunk}`
      );
      console.error(err.message);
    }
    
  
  }
}





