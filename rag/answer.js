import OpenAI from "openai";

const openai = new OpenAI();

export async function answerQuestion(context, question) {
  const prompt = `
You are a knowledge assistant.
Answer ONLY from the provided context.
If the answer is not present, say "I don't know from the provided data."

Context:
${context}

Question:
${question}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }]
  });

  return res.choices[0].message.content;
}
