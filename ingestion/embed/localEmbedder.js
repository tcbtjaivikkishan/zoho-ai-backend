import { pipeline } from "@xenova/transformers";

let embedder;

export async function embedText(text, type = "query") {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/multilingual-e5-base"
    );
  }

  const prefixedText =
    type === "passage"
      ? `passage: ${text}`
      : `query: ${text}`;

  const output = await embedder(prefixedText, {
    pooling: "mean",
    normalize: true,
  });

  return Array.from(output.data);
}
