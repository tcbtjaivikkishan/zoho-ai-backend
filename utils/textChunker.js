export const chunkText = (text, size = 400, overlap = 80) => {
  const words = text.split(" ");
  const chunks = [];

  let start = 0;
  while (start < words.length) {
    const chunk = words
      .slice(start, start + size)
      .join(" ");
    chunks.push(chunk);
    start += size - overlap;
  }

  return chunks;
};
