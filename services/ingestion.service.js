import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import poppler from "pdf-poppler";

import { supabase } from "../db/supabase.js";
import { embedText } from "../ingestion/embed/localEmbedder.js";

/* -------------------------------------------------
   Helpers
-------------------------------------------------- */

// Clean extracted / OCR text
function cleanText(text, isOCR = false) {
  let cleaned = text
    .replace(/Detected\s*>\s*English/gi, "")
    .replace(/PDF reader/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!isOCR) {
    cleaned = cleaned.replace(/[^\p{L}\p{N}\s।,.?-]/gu, "");
  }

  return cleaned;
}

// Sentence-aware chunking
function chunkText(text, size = 600, overlap = 150) {
  const sentences = text.split(/(?<=[.।?])/);
  const chunks = [];
  let current = "";

  for (const s of sentences) {
    if ((current + s).length > size) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + s;
    } else {
      current += s;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/* -------------------------------------------------
   PDF → TEXT
-------------------------------------------------- */

async function extractTextFromPDF(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  return cleanText(data.text || "");
}

/* -------------------------------------------------
   OCR FALLBACK
-------------------------------------------------- */

async function ocrPDF(pdfPath) {
  const outputDir = path.join(process.cwd(), "tmp_pages");
  fs.mkdirSync(outputDir, { recursive: true });

  await poppler.convert(pdfPath, {
    format: "png",
    out_dir: outputDir,
    out_prefix: "page",
    page: null,
    dpi: 300
  });

  const worker = await createWorker();
  await worker.loadLanguage("hin+eng");
  await worker.initialize("hin+eng");

  await worker.setParameters({
    tessedit_pageseg_mode: 6,
    preserve_interword_spaces: 1
  });

  let fullText = "";

  const files = fs.readdirSync(outputDir).filter(f => f.endsWith(".png"));
  for (const file of files) {
    const imgPath = path.join(outputDir, file);
    const { data } = await worker.recognize(imgPath);
    fullText += " " + data.text;
  }

  await worker.terminate();
  fs.rmSync(outputDir, { recursive: true, force: true });

  return cleanText(fullText, true);
}

/* -------------------------------------------------
   MAIN INGESTION PIPELINE
-------------------------------------------------- */

export async function ingestPDF(pdfPath) {
  const source = path.basename(pdfPath);

  try {
    console.log(`📄 Ingesting: ${pdfPath}`);

    let text = await extractTextFromPDF(pdfPath);

    if (!text || text.length < 200) {
      console.log("🔍 No readable text found, running OCR...");
      text = await ocrPDF(pdfPath);
    }

    if (!text || text.length < 200) {
      console.warn("⚠️ Skipping PDF — no usable content");
      return;
    }

    const chunks = chunkText(text, 350, 80);
    console.log(`✂️ Created ${chunks.length} chunks`);

    const rows = [];

    for (const chunk of chunks) {
      if (chunk.length < 80) continue;

      const embedding = await embedText(chunk, "passage");

      rows.push({
        source,
        chunk,
        embedding
      });
    }

    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const { error } = await supabase
        .from("documents")
        .insert(batch);

      if (error) {
        console.error("❌ Batch insert error:", error.message);
      } else {
        console.log(`✅ Inserted batch ${i / BATCH_SIZE + 1}`);
      }

      await new Promise(res => setTimeout(res, 300));
    }

    console.log(`✅ Ingestion completed: ${source}`);
  } catch (err) {
    console.error(`❌ Failed to ingest ${source}`);
    console.error(err.message);
  }
}
