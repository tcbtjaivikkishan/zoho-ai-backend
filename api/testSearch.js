import "dotenv/config";
import { searchContext } from "./src/retrieval/search.js";
import { buildPrompt } from "./src/retrieval/promptBuilder.js";
import { openai } from "./src/config/openai.js";

const question = "मिट्टी का उपचार कैसे करे";

async function test() {
  try {
    console.log("\n❓ Question:", question);

    const context = await searchContext(question, 5);

    console.log("\n📚 Context Found:\n", context);

    if (!context) {
      console.log("⚠️ No context retrieved");
      return;
    }

    const prompt = buildPrompt(context, question);

    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    console.log("\n🤖 Answer:\n", res.choices[0].message.content);

  } catch (err) {
    console.error("\n❌ FULL ERROR:", err);
  }
}

test();