import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export const getEmbedding = async (text) => {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/embeddings",
      {
        model: "nomic-ai/nomic-embed-text-v1.5",
        input: [text] // ✅ MUST be array
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:8000", // ✅ REQUIRED
          "X-Title": "Zoho AI Chatbot"              // ✅ REQUIRED
        }
      }
    );

    if (!response.data?.data?.length) {
      console.error("❌ Invalid embedding response:", response.data);
      throw new Error("Embedding generation failed");
    }

    return response.data.data[0].embedding;
  } catch (err) {
    console.error("❌ OpenRouter embedding error:", err.response?.data || err.message);
    throw err;
  }
};
