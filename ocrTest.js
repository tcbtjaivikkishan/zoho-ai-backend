import "dotenv/config";
import { extractTextFromPdfCloud } from "./utils/ocrCloud.js";

(async () => {
  const text = await extractTextFromPdfCloud(
    "./pdf/uploads/Test.pdf" // ← use your ENGLISH pdf here
  );

  console.log("OCR OUTPUT SAMPLE:");
  console.log(text.slice(0, 500));
})();
