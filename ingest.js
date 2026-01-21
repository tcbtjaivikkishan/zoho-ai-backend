import fs from "fs";
import { extractPdfText } from "./ingestion/extract/pdfTextExtractor.js";
import { extractWithOCR } from "./ingestion/extract/ocrExtractor.js";
import { cleanText } from "./ingestion/clean/textCleaner.js";
import { chunkText } from "./ingestion/chunk/chunkText.js";
import { storeChunks } from "./ingestion/embed/embedAndStore.js";

const pdfPath = "data/pdfs/Test.pdf";

let text = await extractPdfText(pdfPath);
if (!text) text = await extractWithOCR(pdfPath);

text = cleanText(text);

const chunks = chunkText(text);
await storeChunks(chunks, pdfPath);

console.log("✅ Ingestion completed");
