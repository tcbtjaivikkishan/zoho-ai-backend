import fetch from "node-fetch";

export async function answerFromContext(question, context) {
  const isHindi = /[ऀ-ॿ]/.test(question);

  const prompt = isHindi
    ? `
आप एक ज्ञान सहायक हैं।

नीचे दिए गए संदर्भ के आधार पर उत्तर दें।

दृष्टिकोण (महत्वपूर्ण):
यह दस्तावेज़ प्राकृतिक खेती के दृष्टिकोण से लिखा गया है,
जिसमें प्रकृति और पंचमहाभूत को मुख्य कर्ता
और किसान को सहायक या माध्यम माना गया है।
उत्तर इसी दृष्टिकोण के अनुरूप होना चाहिए।

उत्तर देने के मुख्य नियम:
- उत्तर केवल दिए गए संदर्भ पर आधारित हो।
- यदि जानकारी कई वाक्यों या अनुच्छेदों में बंटी हो,
  तो उन्हें जोड़कर संक्षिप्त और स्पष्ट उत्तर दें।
- उत्तर में कोई नई जानकारी न जोड़ें
  जो संदर्भ में मौजूद न हो।

तार्किक निष्कर्ष की अनुमति:
- यदि प्रश्न दार्शनिक हो (जैसे "कौन", "क्यों"),
  तो संदर्भ में मौजूद अवधारणाओं
  (जैसे प्रकृति, पंचमहाभूत, संतुलन, जीवन शक्ति, ऊर्जा)
  के आधार पर तार्किक निष्कर्ष प्रस्तुत करें।
- यदि प्रश्न कारण–परिणाम से जुड़ा हो
  (जैसे "क्या प्रभाव पड़ता है", "क्या होता है"),
  और संदर्भ में संबंधित अवधारणाएँ मौजूद हों,
  तो उनके आपसी संबंध के आधार पर
  संभावित प्रभाव स्पष्ट करें।

मना करने का नियम (सबसे महत्वपूर्ण):
- केवल तभी मना करें जब
  संदर्भ में प्रश्न से संबंधित
  कोई भी अवधारणा, विचार या संकेत
  बिल्कुल मौजूद न हो।
- यदि संदर्भ में संबंधित अवधारणाएँ मौजूद हों,
  तो उत्तर देने का प्रयास अवश्य करें,
  भले ही प्रभाव सीधे शब्दों में न लिखा हो।

यदि वास्तव में जानकारी उपलब्ध न हो,
तो ठीक यही कहें:
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
