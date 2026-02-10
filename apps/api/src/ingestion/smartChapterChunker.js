export function chunkByHeadings(text, maxChars = 1200) {
  const lines = text.split("\n").map(l => l.trim());

  const chunks = [];

  let currentHeading = "General";
  let buffer = "";

  function flushBuffer() {
    if (buffer.trim().length > 80) {
      chunks.push({
        text: `अध्याय: ${currentHeading}\n${buffer.trim()}`,
        chapter: currentHeading,
      });
    }
    buffer = "";
  }

  for (let line of lines) {
    // detect heading (short line, no punctuation)
    if (
      line.length > 3 &&
      line.length < 60 &&
      !/[।!?]/.test(line)
    ) {
      flushBuffer();
      currentHeading = line;
      continue;
    }

    // sentence-aware accumulation
    if ((buffer + line).length > maxChars) {
      flushBuffer();
    }

    buffer += line + " ";
  }

  flushBuffer();

  return chunks;
}
