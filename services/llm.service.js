import fetch from "node-fetch";

export async function answerFromContext(question, context) {
  const isHindi = /[ऀ-ॿ]/.test(question);

  const prompt = isHindi
    ? `
आप एक ज्ञान सहायक हैं।

नीचे दिए गए संदर्भ के आधार पर उत्तर दें।

महत्वपूर्ण निर्देश:
- यह दस्तावेज़ प्राकृतिक खेती के दृष्टिकोण से लिखा गया है,
  जिसमें प्रकृति और पंचमहाभूत को मुख्य कर्ता माना गया है,
  और किसान को सहायक या माध्यम।
- यदि जानकारी कई वाक्यों या अनुच्छेदों में बंटी हो,
  तो उन्हें जोड़कर संक्षिप्त और स्पष्ट उत्तर दें।
- यदि प्रश्न दार्शनिक हो (जैसे "कौन", "क्यों"),
  तो संदर्भ के आधार पर तार्किक निष्कर्ष प्रस्तुत करें।
- उत्तर केवल दिए गए संदर्भ और उसमें निहित
  प्राकृतिक खेती के दृष्टिकोण के अनुरूप हो।
- जब तक संदर्भ में प्रकृति, पंचमहाभूत, ऊर्जा या खेती से संबंधित
  विचार मौजूद हों, तब तक मना न करें।
- केवल तभी मना करें जब विषय से संबंधित
  कोई जानकारी ही न हो।

यदि वास्तव में जानकारी नहीं है, तभी कहें:
"दिए गए दस्तावेज़ों में इस विषय की जानकारी उपलब्ध नहीं है।"

संदर्भ:
${context}

प्रश्न:
${question}
`
    : `
You are a knowledge assistant.

Answer using ONLY the context below.
If the answer is implicit or spread across multiple passages,
combine them into a clear, logical conclusion.

Only say "I don't know based on the provided documents"
if the context contains no relevant information.

Context:
${context}

Question:
${question}
`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Zoho AI Backend"
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25
    })
  });

  const json = await res.json();
  return json.choices[0].message.content;
}
