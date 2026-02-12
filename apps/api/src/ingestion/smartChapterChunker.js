/* =========================================================
   SIMPLE & STABLE CHUNKER
   (Revert-safe version)
========================================================= */

export function chunkByHeadings(text, maxChars = 600) {

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const chunks = [];

  let currentChapter = "General";
  let buffer = "";

  /* -----------------------------
     Basic Heading Detection
     (Minimal heuristic)
  ------------------------------ */
  function isHeading(line) {
    return (
      line.length > 5 &&
      line.length < 70 &&
      !/[।!?]/.test(line)
    );
  }

  /* -----------------------------
     Flush Buffer into Chunk
  ------------------------------ */
  function flush() {

    const cleanText = buffer.trim();

    if (cleanText.length > 150) {
      chunks.push({
        chapter: currentChapter,
        section: "Content",
        embedding_title: currentChapter,
        text: cleanText
      });
    }

    buffer = "";
  }

  /* -----------------------------
     Main Processing Loop
  ------------------------------ */
  for (const line of lines) {

    // If new heading detected
    if (isHeading(line)) {
      flush();
      currentChapter = line;
      continue;
    }

    // If chunk exceeds size limit
    if ((buffer + line).length > maxChars) {
      flush();
    }

    buffer += line + " ";
  }

  // Flush remaining buffer
  flush();

  return chunks;
}
