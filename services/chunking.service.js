import { chunkText } from "../utils/textChunker.js";

export const createChunks = (pages, pdfName) => {
  const chunks = [];

  pages.forEach(({ page, text }) => {
    const pageChunks = chunkText(text);

    pageChunks.forEach(chunk => {
      chunks.push({
        pdf: pdfName,
        page,
        content: chunk
      });
    });
  });

  return chunks;
};
