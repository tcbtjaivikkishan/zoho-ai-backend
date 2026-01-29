import fs from "fs";
import path from "path";
import { ingestPDF } from "./services/ingestion.service.js";

const PDF_DIR = path.resolve("./data/pdfs");

async function runIngestion() {
  console.log("🚀 Starting PDF ingestion...");
  console.log("📂 PDF directory:", PDF_DIR);

  if (!fs.existsSync(PDF_DIR)) {
    console.error("❌ Folder not found:", PDF_DIR);
    process.exit(1);
  }

  const pdfFiles = fs
    .readdirSync(PDF_DIR)
    .filter(file => file.toLowerCase().endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.error("❌ No PDF files found in data/pdfs");
    process.exit(1);
  }

  console.log(`📚 Found ${pdfFiles.length} PDF(s)\n`);

  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    const fullPath = path.join(PDF_DIR, file);

    console.log(`📄 [${i + 1}/${pdfFiles.length}] Ingesting: ${file}`);

    try {
      await ingestPDF(fullPath);
      console.log(`✅ Completed: ${file}\n`);
    } catch (err) {
      console.error(`❌ Failed to ingest ${file}`);
      console.error(err.message || err);
      console.log("➡️ Continuing with next PDF...\n");
    }
  }

  console.log("🎉 All PDFs ingestion process finished.");
}

// Run
runIngestion().catch(err => {
  console.error("🔥 Fatal ingestion error:", err);
  process.exit(1);
});
