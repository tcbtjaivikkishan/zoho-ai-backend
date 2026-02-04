import "dotenv/config";
import { loadDocx } from "./docxLoader.js";
import { cleanText } from "./textCleaner.js";
import { chunkText } from "./chunker.js";
import { embedAndStore } from "./embedAndStore.js";

const DOCX_PATH = "data/source.docx";

(async () => {
  try {
    console.log("📄 Loading DOCX...");
    const rawText = await loadDocx(DOCX_PATH);

    console.log("🧹 Cleaning text...");
    const cleanedText = cleanText(rawText);

    console.log("✂️ Chunking text...");
    const chunks = chunkText(cleanedText, 900, 200);

    console.log(`📦 Total chunks: ${chunks.length}`);

    console.log("🧠 Creating embeddings & storing...");
    await embedAndStore(chunks);

    console.log("🎉 Ingestion completed successfully");
  } catch (err) {
    console.error("❌ Ingestion failed:", err.message);
  }
})();
