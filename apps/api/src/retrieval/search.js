import { openai } from "../config/openai.js";
import { supabase } from "../config/supabase.js";

const DEBUG = true;

/* -----------------------------
   Intent Detection (Hindi)
------------------------------ */

const WHY_RE = /क्यों|कारण|वजह|किसलिए/;
const EFFECT_RE = /क्या\s+प्रभाव|क्या\s+होता|परिणाम|असर|नुकसान/;
const PROCEDURE_RE = /उपाय|विधि|इलाज|नियंत्रण|कैसे\s+करें|कैसे\s+करे|कैसे\s+ठीक/;

const isWhyQuestion = q => WHY_RE.test(q);
const isEffectQuestion = q => EFFECT_RE.test(q);
const isProcedureQuestion = q => PROCEDURE_RE.test(q);

/* -----------------------------
   Hindi Word Normalization
------------------------------ */

function normalizeHindi(w){
  return w
    .toLowerCase()
    .replace(/ों|ें|े|ी|ा|ो|ू|ु|ि|्$/,'');
}

/* -----------------------------
   Safe Context Compression
------------------------------ */

function compressContext(context, keywords){
  if (!context || context.length < 1200) return context;

  const sentences = context
    .replace(/\n+/g," ")
    .split(/[।!?]/)
    .map(s=>s.trim())
    .filter(Boolean);

  const filtered = sentences.filter(s =>
    keywords.some(k =>
      s.includes(k) || s.includes(k.slice(0,3))
    )
  );

  return filtered.length
    ? filtered.join("। ")
    : context;
}

/* -----------------------------
   Query Embedding
------------------------------ */

async function getQueryEmbedding(question){

  const normalized = question.trim().toLowerCase();

  for (let attempt = 1; attempt <= 3; attempt++){
    try{
      const res = await openai.embeddings.create({
        model:"text-embedding-3-small",
        input: normalized,
        timeout: 15_000 // 15 sec
      });

      return res.data[0].embedding;

    }catch(err){
      console.log(`⚠️ Embedding retry ${attempt}`);

      if (attempt === 3) throw err;

      await new Promise(r => setTimeout(r, 1000*attempt));
    }
  }
}


/* -----------------------------
   Conditional LLM Reranker
------------------------------ */

async function rerankChunks(question,chunks){
  if (!chunks || chunks.length<=3) return chunks;

  const preview = chunks
    .map((c,i)=>`Chunk ${i+1}: ${c.content.slice(0,250)}`)
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

/* -----------------------------
   MAIN SEARCH FUNCTION
------------------------------ */

export async function searchContext(question,k=8){

  if (!question || question.trim().length<3) return "";

  const isWhy = isWhyQuestion(question);
  const isEffect = isEffectQuestion(question);
  const isProcedure = isProcedureQuestion(question);

  /* ---- Keyword extraction ---- */

  let keywords = question
    .split(/\s+/)
    .filter(w=>w.length>2);

  const normKeywords = keywords.map(normalizeHindi);

  /* ---- Embed query ---- */

  const queryEmbedding = await getQueryEmbedding(question);

  const {data,error} = await supabase.rpc("match_chunks",{
    query_embedding: queryEmbedding,
    match_count: isEffect?20:k
  });

  if (error || !data?.length) return "";

  if (DEBUG){
    console.log("🧱 Raw chunks:",data.length);
  }

  /* ---- Hybrid scoring ---- */

  const seen = new Set();

  const hybrid = data
    .filter(d=>{
      if (!d?.content || d.content.length<60) return false;
      if (seen.has(d.content)) return false;
      seen.add(d.content);
      return true;
    })
    .map(d=>{
      const textNorm = normalizeHindi(d.content);

      const hits = normKeywords.filter(k =>
        textNorm.includes(k)
      ).length;

      /* metadata boost */
      const chapter = d.metadata?.chapter || "";
      const metaBoost = keywords.some(k =>
        chapter.includes(k)
      ) ? 0.1 : 0;

      return {
        ...d,
        score: d.similarity + hits*0.03 + metaBoost
      };
    })
    .sort((a,b)=>b.score-a.score)
    .slice(0,10);

  if (!hybrid.length) return "";

  if (DEBUG){
    console.log("🔎 Top score:",hybrid[0].score);
  }

  /* ---- Conditional rerank ---- */

  let finalChunks = hybrid;

  if (hybrid[0].similarity < 0.85){
    finalChunks = await rerankChunks(
      question,
      hybrid.slice(0,6)
    );
  }

  if (!finalChunks.length) return "";

  /* ---- Context assembly ---- */

  const maxChunks =
    isProcedure?2:
    isEffect?5:3;

  let context = finalChunks
    .slice(0,maxChunks)
    .map(d=>d.content.slice(0,700))
    .join("\n\n");

  if (!context) return "";

  if (!isWhy){
    context = compressContext(context,normKeywords);
  }

  if (DEBUG){
    console.log("📄 Final context:");
    console.log(context);
  }

  return context;
}
