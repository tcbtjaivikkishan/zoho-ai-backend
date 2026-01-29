import { hindiToRoman } from "./transliterate.js";

export function normalizeText(text) {
  const lower = text.toLowerCase();

  // Transliterate Hindi → Roman
  const roman = hindiToRoman(lower);

  // Normalize spacing
  return roman.replace(/\s+/g, " ").trim();
}
