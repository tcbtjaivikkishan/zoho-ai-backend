import { extractTextFromPdfImages } from "./ocrPipeline.js";

export async function extractWithOCR(pdfPath) {
  return await extractTextFromPdfImages(pdfPath);
}
