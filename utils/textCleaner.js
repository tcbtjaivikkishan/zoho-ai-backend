export const cleanText = (raw = "") => {
  let text = raw;

  // Remove junk characters
  text = text.replace(/[�•■◆◦]/g, "");

  // Remove standalone page numbers
  text = text.replace(/^\s*\d+\s*$/gm, "");

  // Normalize spaces
  text = text.replace(/\s{2,}/g, " ");

  // Add space after punctuation
  text = text.replace(/([।,])([^\s])/g, "$1 $2");

  // Normalize newlines
  text = text.replace(/\n{2,}/g, "\n\n");

  return text.trim();
};
