export function cleanText(text) {
  return text
    // Unicode normalize (good for Hindi)
    .normalize("NFKC")

    // standardize line breaks
    .replace(/\r/g, "")

    // remove junk bullets/symbols
    .replace(/[•●▪◦]/g, "")

    // remove zero-width chars (very important for Hindi)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")

    // fix spacing before punctuation
    .replace(/\s+([।,!?])/g, "$1")

    // collapse multiple spaces BUT keep newlines
    .replace(/[ \t]+/g, " ")

    // collapse excessive newlines (but keep paragraphs)
    .replace(/\n{3,}/g, "\n\n")

    // trim lines
    .split("\n")
    .map(line => line.trim())
    .join("\n")

    .trim();
}
