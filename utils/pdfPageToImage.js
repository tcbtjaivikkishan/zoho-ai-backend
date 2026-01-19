import { convert } from "pdf-poppler";
import fs from "fs";
import path from "path";

export async function pdfPageToImage(pdfPath, pageNum) {
  const outDir = path.resolve("pdf/images");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const opts = {
    format: "png",
    out_dir: outDir,
    out_prefix: `page_${pageNum}`,
    page: pageNum,
  };

  await convert(pdfPath, opts);

  // 🔍 Find generated file dynamically
  const files = fs.readdirSync(outDir);
  const imageFile = files.find(
    (f) => f.startsWith(`page_${pageNum}`) && f.endsWith(".png")
  );

  if (!imageFile) {
    throw new Error(`OCR image not generated for page ${pageNum}`);
  }

  return path.join(outDir, imageFile);
}
