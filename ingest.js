import fs from "fs";
import path from "path";
import { ingestPDF } from "./services/ingestion.service.js";

const PDF_DIR = "./data/pdfs";

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

for (const file of pdfFiles) {
  const fullPath = path.join(PDF_DIR, file);
  console.log("📄 Ingesting:", fullPath);
  await ingestPDF(fullPath);
}

console.log("✅ All PDFs ingested successfully");
