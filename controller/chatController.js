import { processPdfService } from "../services/pdfProcessor.service.js";
import { createChunks } from "../services/chunking.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import  supabase  from "../utils/supabase.js";

export const uploadPdf = async (req, res) => {
  try {
    const pages = await processPdfService(req.file.path);
    const chunks = createChunks(pages, req.file.originalname);

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk.content);

      const { error } = await supabase
        .from("documents")
        .insert({
          pdf: chunk.pdf,
          page: chunk.page,
          content: chunk.content,
          embedding
        });

      if (error) throw error;
    }

    res.json({
      success: true,
      pagesProcessed: pages.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF processing failed" });
  }
};
