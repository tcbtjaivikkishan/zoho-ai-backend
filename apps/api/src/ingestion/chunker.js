// Section + sentence hybrid chunking
export function chunkText(text, maxSize = 600) {
  const sections = text.split(/\n{2,}/); // paragraphs / sections
  const chunks = [];

  for (const section of sections) {
    const sentences = section
      .split(/(?<=[।!?])/)
      .map(s => s.trim())
      .filter(Boolean);

    let buffer = "";

    for (const sentence of sentences) {
      if ((buffer + sentence).length <= maxSize) {
        buffer += sentence;
      } else {
        chunks.push(buffer);
        buffer = sentence;
      }
    }

    if (buffer) chunks.push(buffer);
  }

  return chunks.filter(c => c.length > 60);
}


/*
Sentence-aware chunking
export function chunkText(text, chunkSize = 500, overlap = 100) {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[।!?])/)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length <= chunkSize) {
      current += sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}
*/