import Sanscript from "@sanskrit-coders/sanscript";

export function hindiToRoman(text) {
  try {
    return Sanscript.t(text, "devanagari", "itrans");
  } catch (e) {
    return "";
  }
}
