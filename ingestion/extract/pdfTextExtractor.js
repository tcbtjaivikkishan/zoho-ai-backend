import fs from "fs";
import pdf from "pdf-parse";

export async function extractPdfText(path) {
  const buffer = fs.readFileSync(path);
  const data = await pdf(buffer);

  // If text layer exists, use it
  if (data.text.trim().length > 100) {
    return data.text;
  }

  return null; // trigger OCR fallback
}
