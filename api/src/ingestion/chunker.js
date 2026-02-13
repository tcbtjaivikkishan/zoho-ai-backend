export function flattenChunks(obj) {
  const all = [];

  for (const sectionName in obj) {
    const section = obj[sectionName];

    if (!Array.isArray(section)) continue;

    for (const item of section) {

      // ✅ Case 1 — direct chunk
      if (item.text && item.chunk) {
        all.push({
          section: sectionName,
          subsection: null,
          chunk: item.chunk,
          text: item.text
        });
      }

      // ✅ Case 2 — subsection with chunks[]
      if (item.subsection && Array.isArray(item.chunks)) {
        for (const subChunk of item.chunks) {
          all.push({
            section: sectionName,
            subsection: item.subsection,
            chunk: subChunk.chunk,
            text: subChunk.text
          });
        }
      }

    }
  }

  return all;
}