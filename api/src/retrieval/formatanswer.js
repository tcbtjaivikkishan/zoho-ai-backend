export function formatAnswer(text) {
    if (!text) return "";
  
    return text
      // convert escaped newlines to real
      .replace(/\\n/g, "\n")
  
      // remove markdown bold
      .replace(/\*\*/g, "")
  
      // collapse too many newlines
      .replace(/\n{3,}/g, "\n\n")
  
      // collapse spaces
      .replace(/[ \t]+/g, " ")
  
      // remove trailing spaces per line
      .replace(/\s+\n/g, "\n")
  
      .trim();
  }
  
  
  /* optional — flat version (single paragraph) */
  export function formatFlat(text) {
    if (!text) return "";
  
    return text
      .replace(/\\n/g, " ")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }





