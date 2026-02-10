import "dotenv/config";
import { loadDocx } from "./docxLoader.js";
import { cleanText } from "./textCleaner.js";
import { chunkByHeadings } from "./smartChapterChunker.js";
import { embedAndStore } from "./embedAndStore.js";

const DOCX_PATH = "data/source.docx";

(async () => {
  try {
    console.log("📄 Loading DOCX...");
    const rawText = await loadDocx(DOCX_PATH);

    console.log("🧹 Cleaning text...");
    const cleanedText = cleanText(rawText);

    console.log("📚 Chapter-aware chunking...");
    const chunks = chunkByHeadings(cleanedText, 400);

    console.log(`📦 Total chunks: ${chunks.length}`);

    console.log("🧠 Embedding & storing...");
    await embedAndStore(chunks);

    console.log("🎉 Ingestion completed");
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
})();
