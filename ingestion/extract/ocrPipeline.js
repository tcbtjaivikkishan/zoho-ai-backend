import fs from "fs-extra";
import path from "path";
import pdf from "pdf-poppler";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

const PAGES_DIR = "pages";
const CLEAN_DIR = "clean";

/**
 * Convert PDF pages to images
 */
async function pdfToImages(pdfPath) {
  await fs.ensureDir(PAGES_DIR);

  await pdf.convert(pdfPath, {
    format: "png",
    out_dir: PAGES_DIR,
    out_prefix: "page",
    dpi: 350
  });
}

/**
 * Preprocess image for better OCR
 */
async function preprocessImage(input, output) {
  const img = sharp(input);
  const meta = await img.metadata();

  const topCrop = Math.floor(meta.height * 0.12);   // remove Google header
  const bottomCrop = Math.floor(meta.height * 0.15); // remove translate bar

  await img
    .extract({
      left: 0,
      top: topCrop,
      width: meta.width,
      height: meta.height - topCrop - bottomCrop
    })
    .resize({ width: 2200 })
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(145)
    .toFile(output);
}

/**
 * OCR pipeline entry point
 */
export async function extractTextFromPdfImages(pdfPath) {
  await pdfToImages(pdfPath);

const worker = await createWorker("eng+hin");

  let fullText = "";

  const files = fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".png"));

  for (const file of files) {
    const rawPath = path.join(PAGES_DIR, file);
    const cleanPath = path.join(CLEAN_DIR, file);

    await preprocessImage(rawPath, cleanPath);

    const {
      data: { text }
    } = await worker.recognize(cleanPath);

    fullText += text + "\n";
  }

  await worker.terminate();
  return fullText;
}
