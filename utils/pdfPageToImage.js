import { convert } from "pdf-poppler";
import fs from "fs";
import path from "path";

export async function pdfPageToImage(pdfPath, pageNum) {
  const outDir = "pdf/images";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const opts = {
    format: "png",
    out_dir: outDir,
    out_prefix: `page_${pageNum}`,
    page: pageNum,
  };

  await convert(pdfPath, opts);

  return path.join(outDir, `page_${pageNum}-1.png`);
}
