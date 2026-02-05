import "dotenv/config";
import express from "express";
import { searchContext } from "../retrieval/search.js";
import { buildPrompt } from "../retrieval/promptBuilder.js";
import { openai } from "../config/openai.js";

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
    const context = await searchContext(question);

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

    const answer =
      completion.choices[0].message.content;

    /* 4️⃣ Return */
    res.json({
      answer
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error"
    });
  }
});

export default router;
