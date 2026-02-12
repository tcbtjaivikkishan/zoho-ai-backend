import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

const DEBUG = true;

/* =========================================================
   INTENT DETECTION
========================================================= */

function detectQueryIntent(q){

  if (/कैसे/.test(q)) return "solution";

  if (/लक्षण|कमी/.test(q)) return "symptoms";

  if (/समाधान|उपचार|ठीक/.test(q)) return "solution";

  if (/क्या है/.test(q)) return "definition";

  return null;
}


/* =========================================================
   CHAPTER DETECTION
========================================================= */

function detectChapterFromQuery(question){

  // Extract pattern like: "ऊर्जा जल", "जीवाणु जल"
  const match = question.match(/([\u0900-\u097F]+\s+जल)/);

  if (match) {
    return match[1].trim();
  }

  return null;
}

/* =========================================================
   HINDI NORMALIZATION
========================================================= */

function normalizeHindi(w){
  return w
    .toLowerCase()
    .replace(/ों|ें|े|ी|ा|ो|ू|ु|ि|्$/,'');
}

/* =========================================================
   QUERY EMBEDDING
========================================================= */

async function getQueryEmbedding(question){

  const normalized = question.trim().toLowerCase();

  const res = await openai.embeddings.create({
    model:"text-embedding-3-small",
    input: normalized,
  });

  return res.data[0].embedding;
}

/* =========================================================
   OPTIONAL LLM RERANKER
========================================================= */

async function rerankChunks(question,chunks){
  if (!chunks || chunks.length <= 3) return chunks;

  const preview = chunks
    .map((c,i)=>`Chunk ${i+1}: ${c.content.slice(0,300)}`)
    .join("\n\n");

  const res = await openai.chat.completions.create({
    model:"gpt-4.1-mini",
    temperature:0,
    messages:[{
      role:"user",
      content:`
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
    .map(m=>Number(m[0])-1)
    .filter(i=>i>=0 && i<chunks.length);

  return ids.length ? ids.map(i=>chunks[i]) : chunks;
}

/* =========================================================
   MAIN SEARCH FUNCTION
========================================================= */

export async function searchContext(question, k = 8){

  if (!question || question.trim().length < 3) return "";

  const detectedIntent = detectQueryIntent(question);
  const detectedChapter = detectChapterFromQuery(question);

  if (DEBUG){
    console.log("🎯 Detected intent:", detectedIntent);
    console.log("📚 Detected chapter:", detectedChapter);
  }

  const queryEmbedding = await getQueryEmbedding(question);

  /* -----------------------------
     FIRST: Try Intent + Chapter filter
  ------------------------------ */

  let { data, error } = await supabase.rpc(
    "match_knowledge_chunks_advanced",
    {
      query_embedding: queryEmbedding,
      match_count: 25,
      filter_intent: detectedIntent || null,
      filter_chapter: detectedChapter || null
    }
  );

  /* -----------------------------
     FALLBACK: Remove chapter filter
  ------------------------------ */

  if ((!data || !data.length) && detectedChapter){
    if (DEBUG) console.log("↩ Fallback: removing chapter filter");

    const fallback = await supabase.rpc(
      "match_knowledge_chunks_advanced",
      {
        query_embedding: queryEmbedding,
        match_count: 15,
        filter_intent: detectedIntent || null,
        filter_chapter: null
      }
    );

    data = fallback.data;
  }

  if (error || !data?.length) return "";

  if (DEBUG){
    console.log("🧱 Raw chunks:", data.length);
  }

  /* -----------------------------
     HYBRID SCORING
  ------------------------------ */

  const seen = new Set();

  const hybrid = data
    .filter(d=>{
      if (!d?.content || d.content.length < 50) return false;
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return true;
    })
    .map(d=>{

      const keywordHits = keywords.filter(k =>
  d.content.includes(k)
).length;

const keywordBoost = keywordHits * 0.05;


      const intentBoost =
        detectedIntent && d.intent_type === detectedIntent
          ? 0.1
          : 0;

      const chapterBoost =
        detectedChapter && d.chapter === detectedChapter
          ? 0.15
          : 0;

      return {
        ...d,
        score:
          (d.similarity * 0.8) +
          intentBoost +
          chapterBoost +
          keywordBoost
      };
    })
    .sort((a,b)=>b.score - a.score)
    .slice(0,8);

  if (!hybrid.length) return "";

  if (DEBUG){
    console.log("🔎 Top score:", hybrid[0].score);
  }

  let finalChunks = hybrid;

  if (hybrid[0].similarity < 0.80){
    finalChunks = await rerankChunks(
      question,
      hybrid.slice(0,5)
    );
  }

  if (!finalChunks.length) return "";

  /* -----------------------------
     DEBUG FINAL CHUNKS
  ------------------------------ */

  if (DEBUG){
    console.log("----- FINAL CHUNKS -----");
    finalChunks.forEach((c,i)=>{
      console.log("Chunk",i+1);
      console.log(c.content);
    });
  }

  /* -----------------------------
     CONTEXT ASSEMBLY (NO TRUNCATION)
  ------------------------------ */

  const maxChunks =
    detectedIntent === "preparation" ? 4 :
    detectedIntent === "usage" ? 3 :
    detectedIntent === "symptoms" ? 3 :
    detectedIntent === "solution" ? 3 :
    3;

  const context = finalChunks
    .slice(0, maxChunks)
    .map(d =>
      `अध्याय: ${d.chapter}
खंड: ${d.section}

${d.content}`
    )
    .join("\n\n━━━━━━━━━━━━━━━━━━\n\n");

  if (DEBUG){
    console.log("📄 Final context length:", context.length);
  }

  return context;
}
