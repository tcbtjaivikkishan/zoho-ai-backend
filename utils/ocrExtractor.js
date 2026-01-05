import Tesseract from "tesseract.js";

export const extractTextFromImage = async (imageBuffer) => {
  const result = await Tesseract.recognize(
    imageBuffer,
    "hin+eng"
  );

  return result.data.text || "";
};
