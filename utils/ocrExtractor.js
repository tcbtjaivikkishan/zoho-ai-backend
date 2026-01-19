import Tesseract from "tesseract.js";

export async function extractTextFromImage(imagePath) {
  const { data } = await Tesseract.recognize(
    imagePath,
    "hin+eng", // 🔥 VERY IMPORTANT
    {
      logger: m => {
        if (m.status === "recognizing text") {
          console.log(`🧠 OCR ${Math.round(m.progress * 100)}%`);
        }
      }
    }
  );

  return data.text || "";
}
