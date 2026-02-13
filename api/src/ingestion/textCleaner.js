export function cleanText(text) {
  return text
    // normalize unicode
    .normalize("NFKC")

    // remove weird extra spaces inside words
    .replace(/\s+/g, " ")

    // fix broken punctuation spacing
    .replace(/\s+([।,!?])/g, "$1")

    // remove junk bullets/symbols
    .replace(/[•●▪◦]/g, "")

    // trim
    .trim();
}
