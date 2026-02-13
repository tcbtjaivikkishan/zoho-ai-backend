import fs from "fs";
import mammoth from "mammoth";

export async function loadDocx(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("DOCX file not found: " + filePath);
  }

  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });

  return result.value;
  console.log(result.value)
}


