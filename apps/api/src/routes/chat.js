import { searchContext } from "../retrieval/search.js";
import { buildPrompt } from "../retrieval/promptBuilder.js";
import { openai } from "../config/openai.js";

export async function chat(req, res) {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }

    const context = await searchContext(question, 5);
    const prompt = buildPrompt(context, question);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    res.json({
      answer: completion.choices[0].message.content,
      language: "hi",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}
