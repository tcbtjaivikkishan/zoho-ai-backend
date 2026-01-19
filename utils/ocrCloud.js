import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export async function extractTextFromPdfCloud(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error("PDF file not found: " + pdfPath);
  }

  const form = new FormData();

  // ✅ IMPORTANT: use fs.createReadStream
  form.append("file", fs.createReadStream(pdfPath));
  form.append("language", "eng"); // start with English only
  form.append("isOverlayRequired", "false");

  const response = await axios.post(
    "https://api.ocr.space/parse/image",
    form,
    {
      headers: {
        ...form.getHeaders(),
        apikey: process.env.OCR_SPACE_API_KEY,
      },
      maxBodyLength: Infinity,
    }
  );

  if (!response.data || !response.data.ParsedResults) {
    console.error("OCR raw response:", response.data);
    throw new Error("Invalid OCR response");
  }

  const text = response.data.ParsedResults
    .map(r => r.ParsedText)
    .join("\n");

  if (!text.trim()) {
    throw new Error("OCR returned empty text");
  }

  return text;
}
