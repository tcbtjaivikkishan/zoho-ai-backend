import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

const DEBUG = true;

/* =========================================================
   INTENT DETECTION
========================================================= */

function detectQueryIntent(query) {

  const q = query
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const intentRules = [
    {
      type: "reason",
      patterns: [/क्यों/, /कारण/, /वजह/, /किसलिए/, /आवश्यक|जरूरी/]
    },
    {
      type: "definition",
      patterns: [/क्या है/, /क्या होता/, /क्या होती/, /परिचय/, /मतलब/]
    },
    {
      type: "symptoms",
      patterns: [/लक्षण/, /संकेत/, /कमी के लक्षण/, /कैसा दिखे/]
    },
    {
      type: "solution",
      patterns: [
        /कैसे/,
        /उपचार/,
        /समाधान/,
        /क्या करें/,
        /कैसे सुधार/,
        /कैसे बनाऊँ/,
        /कैसे बनाएं/,
        /कैसे बचाएं/,
        /कैसे ठीक/
      ]
    },
    {
      type: "preparation",
      patterns: [
        /कैसे बनता/,
        /कैसे तैयार/,
        /बनाने की विधि/,
        /तैयार करने की विधि/
      ]
    },
    {
      type: "benefits",
      patterns: [/लाभ/, /फायदे/, /क्या फायदा/]
    },
    {
      type: "process",
      patterns: [/प्रक्रिया/, /चरण/, /स्टेप/]
    },
    {
      type: "problem",
      patterns: [/समस्या/, /दिक्कत/, /परेशानी/]
    }
  ];

  const scores = {};

  for (const rule of intentRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(q)) {
        scores[rule.type] = (scores[rule.type] || 0) + 1;
      }
    }
  }

  if (!Object.keys(scores).length) return null;

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}

/* =========================================================
   CHAPTER DETECTION (Soft use only)
========================================================= */

function detectChapterFromQuery(question) {
  const match = question.match(/([\u0900-\u097F]+\s+जल)/);
  return match ? match[1].trim() : null;
}

/* =========================================================
   QUERY EMBEDDING
========================================================= */

async function getQueryEmbedding(question) {

  const normalized = question.trim().toLowerCase();

  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: normalized,
  });

  return res.data[0].embedding;
}

/* =========================================================
   OPTIONAL LLM RERANKER
========================================================= */

async function rerankChunks(question, chunks) {

  if (!chunks || chunks.length <= 3) return chunks;

  const preview = chunks
    .map((c, i) => `Chunk ${i + 1}: ${c.content.slice(0, 300)}`)
    .join("\n\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0,
    messages: [{
      role: "user",
      content: `
Question: ${question}

Pick the most relevant chunks.
If none match → NONE.

${preview}

Reply ONLY numbers like: 1,3
`
    }]
  });

  const text = res.choices?.[0]?.message?.content || "";

  if (/NONE/i.test(text)) return [];

  const ids = [...text.matchAll(/\d+/g)]
    .map(m => Number(m[0]) - 1)
    .filter(i => i >= 0 && i < chunks.length);

  return ids.length ? ids.map(i => chunks[i]) : chunks;
}

/* =========================================================
   MAIN SEARCH FUNCTION
========================================================= */

export async function searchContext(question, k = 8) {

  if (!question || question.trim().length < 3) return "";

  const detectedIntent = detectQueryIntent(question);
  const detectedChapter = detectChapterFromQuery(question);

  const keywords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (DEBUG) {
    console.log("🎯 Detected intent:", detectedIntent);
    console.log("📚 Detected chapter:", detectedChapter);
  }

  const queryEmbedding = await getQueryEmbedding(question);

  /* =============================
     ALWAYS BROAD RETRIEVAL
  ============================== */

  const { data, error } = await supabase.rpc(
    "match_knowledge_chunks_advanced",
    {
      query_embedding: queryEmbedding,
      match_count: 25,
      filter_intent: null,
      filter_chapter: null
    }
  );

  if (error || !data?.length) return "";

  if (DEBUG) {
    console.log("🧱 Raw chunks:", data.length);
  }

  /* =============================
     HYBRID SCORING
  ============================== */

  const seen = new Set();

  const hybrid = data
    .filter(d => {
      if (!d?.content || d.content.length < 50) return false;
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return true;
    })
    .map(d => {

      const contentNorm = d.content.toLowerCase();

      const keywordHits = keywords.filter(k =>
        contentNorm.includes(k)
      ).length;

      const keywordBoost = keywordHits * 0.08;

      const intentBoost =
        detectedIntent && d.intent_type === detectedIntent
          ? 0.1
          : 0;

      const chapterBoost =
        detectedChapter && d.chapter?.includes(detectedChapter)
          ? 0.15
          : 0;

      const reasonBoost =
        detectedIntent === "reason" &&
        /(इसलिए|जरूरी|आवश्यक|कारण)/.test(contentNorm)
          ? 0.15
          : 0;

      return {
        ...d,
        score:
          (d.similarity * 0.8) +
          keywordBoost +
          intentBoost +
          chapterBoost +
          reasonBoost
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!hybrid.length) return "";

  if (DEBUG) {
    console.log("🔎 Top score:", hybrid[0].score);
  }

  let finalChunks = hybrid;

  if (hybrid[0].similarity < 0.80) {
    finalChunks = await rerankChunks(
      question,
      hybrid.slice(0, 5)
    );
  }

  if (!finalChunks.length) return "";

  /* =============================
     DEBUG FINAL CHUNKS
  ============================== */

  if (DEBUG) {
    console.log("----- FINAL CHUNKS -----");
    finalChunks.forEach((c, i) => {
      console.log("Chunk", i + 1);
      console.log(c.content);
    });
  }

  /* =============================
     CONTEXT ASSEMBLY
  ============================== */

  const context = finalChunks
    .slice(0, 3)
    .map(d =>
      `अध्याय: ${d.chapter}
खंड: ${d.section}

${d.content}`
    )
    .join("\n\n━━━━━━━━━━━━━━━━━━\n\n");

  if (DEBUG) {
    console.log("📄 Final context length:", context.length);
  }

  return context;
}
