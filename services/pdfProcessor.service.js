import fs from "fs";
import { cleanText } from "../utils/textCleaner.js";
import { extractTextFromPdfCloud } from "../utils/ocrCloud.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

function isReadable(text = "") {
  if (text.length < 200) return false;
  return /[\u0900-\u097F\u0041-\u007A]/.test(text);
}

async function extractTextWithPdfJs(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(i => i.str).join(" ") + "\n";
  }

  return text;
}

export async function processPdfService(pdfPath) {
  console.log("📄 Processing PDF:", pdfPath);

  const pdfText = await extractTextWithPdfJs(pdfPath);

  // ✅ If text is good → use it
  if (isReadable(pdfText)) {
    console.log("✅ Using PDF text layer");
    return cleanText(pdfText);
  }

  // 🔁 Else → cloud OCR
  console.log("⚠️ Using CLOUD OCR");
  const ocrText = await extractTextFromPdfCloud(pdfPath);

  return cleanText(ocrText);
}
