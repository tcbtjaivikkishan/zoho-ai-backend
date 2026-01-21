import { pipeline } from "@xenova/transformers";

let embedder;

export async function embedText(text) {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2" // 384-dim, fast, free
    );
  }

  const output = await embedder(text, {
    pooling: "mean",
    normalize: true
  });

  return Array.from(output.data);
}
