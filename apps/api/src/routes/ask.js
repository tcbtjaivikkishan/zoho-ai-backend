import "dotenv/config";
import express from "express";

import { searchContext } from "../retrieval/search.js";
import { buildPrompt } from "../retrieval/promptBuilder.js";
import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

import { requireSession } from "../middleware/sessionAuth.js";
import { sessionLimiter } from "../middleware/sessionRateLimit.js";

const router = express.Router();

/**
 * POST /api/ask
 * Headers:
 *   Authorization: Bearer <JWT_TOKEN>
 * Body:
 *   { "question": "..." }
 */
router.post(
  "/ask",
  requireSession,
  sessionLimiter,
  async (req, res) => {
    try {
      const { question } = req.body;
      const sessionId = req.sessionId;

      if (!question) {
        return res.status(400).json({
          error: "Question is required"
        });
      }

      console.log("❓ Question:", question);
      console.log("🆔 Session:", sessionId);

      /* 1️⃣ Store user message */
      await supabase.from("chats").insert({
        session_id: sessionId,
        role: "user",
        message: question
      });

      /* 2️⃣ Retrieve context (RAG) */
      const context = await searchContext(question);

      if (!context) {
        const fallback =
          "दिए गए दस्तावेज़ों के आधार पर जानकारी उपलब्ध नहीं है।";

        /* Store assistant fallback */
        await supabase.from("chats").insert({
          session_id: sessionId,
          role: "assistant",
          message: fallback
        });

        return res.json({ answer: fallback });
      }

      /* 3️⃣ Build prompt */
      const prompt = buildPrompt(context, question);

      /* 4️⃣ Call LLM */
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          { role: "user", content: prompt }
        ]
      });

      const answer = completion.choices[0].message.content;

      /* 5️⃣ Store assistant answer */
      await supabase.from("chats").insert({
        session_id: sessionId,
        role: "assistant",
        message: answer
      });

      /* 6️⃣ Return response */
      res.json({ answer });

    } catch (err) {
      console.error("❌ /ask error:", err);
      res.status(500).json({
        error: "Server error"
      });
    }
  }
);

export default router;
