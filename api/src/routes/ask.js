import "dotenv/config";
import express from "express";
import { searchContext } from "../retrieval/search.js";
import { buildPrompt } from "../retrieval/promptBuilder.js";
import { openai } from "../config/openai.js";
import { formatAnswer } from "../retrieval/formatanswer.js";

const router = express.Router();

router.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "Question is required"
      });
    }

    console.log("❓ Question:", question);

    /* 1️⃣ Retrieve context */
    const { context, matches }  = await searchContext(question);

    if (!context) {
      return res.json({
        answer: "दिए गए दस्तावेज़ों के आधार पर जानकारी उपलब्ध नहीं है।"
      });
    }

    /* 2️⃣ Build prompt */
    const prompt = buildPrompt(context, question);

    /* 3️⃣ LLM call */
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const rawAnswer =
    completion.choices?.[0]?.message?.content || "";
    const clean = cleanLLMResponse(rawAnswer);

    /* 4️⃣ Return */
    res.send(clean);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error"
    });
  }
});




export function cleanLLMResponse(raw) {
  try {
    // If already an object
    if (typeof raw === "object" && raw !== null) {
      const val = raw.cleanAnswer || raw.answer || JSON.stringify(raw);
      return formatText(val);
    }

    // If string → try parse JSON
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      const val = parsed.cleanAnswer || parsed.answer || raw;
      return formatText(val);
    }

    return String(raw);

  } catch (e) {
    // Not JSON — just format as plain text
    return formatText(raw);
  }
}

function formatText(text) {
  return text
    .replace(/\\n/g, "\n")        // convert escaped newlines
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")   // collapse extra blank lines
    .trim();
}


export default router;
