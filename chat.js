import "dotenv/config";
import readline from "readline";
import { supabase } from "./db/supabase.js";
import { embedText } from "./ingestion/embed/localEmbedder.js";

const OPENROUTER_URL = process.env.OPENROUTER_URL ;
console.log("OPENROUTER_API_KEY loaded:", !!process.env.OPENROUTER_API_KEY);

async function retrieveContext(question) {
  const queryEmbedding = await embedText(question);

  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 5
  });

  if (error) {
    console.error("Retrieval error:", error.message);
    return "";
  }

  return data.map(d => d.chunk).join("\n\n");
}

async function answerFromContext(question, context) {
  const prompt = `
You are a knowledge assistant.
Answer ONLY using the context below.
If the answer is not present, reply exactly:
"I don't know based on the provided documents."

Context:
${context}

Question:
${question}
`;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_APP_NAME || "local-dev",
      "X-Title": "Zoho AI Backend"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL, // ✅ good balance
      messages: [{ role: "user", content: prompt }],
      temperature: 0
    })
  });

  const json = await res.json();

  if (!json.choices?.length) {
    console.error("OpenRouter error:", json);
    return "Error generating answer";
  }

  return json.choices[0].message.content;
}

// CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("Ask your question: ", async (question) => {
  const context = await retrieveContext(question);
  const answer = await answerFromContext(question, context);

  console.log("\n🤖 Answer:\n", answer);
  rl.close();
});
