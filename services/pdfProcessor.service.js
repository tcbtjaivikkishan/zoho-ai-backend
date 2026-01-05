import fs from "fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { cleanText } from "../utils/textCleaner.js";

export const processPdfService = async (pdfPath) => {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data }).promise;

  const processedPages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rawText = textContent.items
      .map(item => item.str)
      .join(" ");

    const cleaned = cleanText(rawText);

    if (cleaned.length > 50) {
      processedPages.push({
        page: pageNum,
        text: cleaned
      });
    }
  }

  console.log("Sample page [25]:");
  console.log(processedPages[25]?.text);

  return processedPages;
};
