export function cleanText(text) {
  return text
    .replace(/\n{2,}/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/(PDF reader|Hindi → English|Google)/gi, "")
    .trim();
}
