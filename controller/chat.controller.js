import { retrieveContext } from "../services/retrieval.service.js";
import { answerFromContext } from "../services/llm.service.js";

export async function chatController(req, res) {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({
      error: "Question is required"
    });
  }

  const isHindi = /[ऀ-ॿ]/.test(question);

  let context = "";
  try {
    context = await retrieveContext(question);
  } catch (err) {
    console.error("Context retrieval failed:", err.message);
  }

  // ❌ Only say "I don't know" if NO context exists
  if (!context || !context.trim()) {
    return res.json({
      answer: isHindi
        ? "दिए गए दस्तावेज़ों के आधार पर मुझे जानकारी नहीं है।"
        : "I don't know based on the provided documents.",
      language: isHindi ? "hi" : "en"
    });
  }

  // ✅ Try LLM, but DON'T lie if it fails
  try {
    const answer = await answerFromContext(question, context);

    return res.json({
      answer,
      language: isHindi ? "hi" : "en"
    });
  } catch (err) {
    console.error("LLM failed, falling back to context:", err.message);

    // 🔥 Context-based fallback (no LLM)
    const fallbackAnswer = context
      .split("\n")
      .slice(0, 3)
      .join(" ")
      .trim();

    return res.json({
      answer: fallbackAnswer,
      language: isHindi ? "hi" : "en"
    });
  }
}

