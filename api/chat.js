// =============================================================================
// RAG Chat API — Vercel Serverless Function with Pinecone
// Fast retrieval via Pinecone
// =============================================================================

// Pinecone client (lazy initialized)
let pineconeIndex = null;
let pineconeReady = false;
const PINECONE_INDEX_NAME = "portfolio-rag";
const PINECONE_NAMESPACE = "ahmad-knowledge";

async function initPinecone(apiKey) {
  if (pineconeReady) return true;
  
  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    const pinecone = new Pinecone({ apiKey });
    pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);
    pineconeReady = true;
    console.log("Pinecone initialized successfully");
    return true;
  } catch (e) {
    console.error("Pinecone init failed:", e.message);
    return false;
  }
}

// Rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW * 5);

// Embedding cache (LRU,100 entries, 30min TTL)
const embeddingCache = new Map();
const EMBEDDING_CACHE_MAX = 100;
const EMBEDDING_CACHE_TTL = 30 * 60 * 1000;

function getCachedEmbedding(text) {
  const cached = embeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL) return cached.vector;
  return null;
}

function setCachedEmbedding(text, vector) {
  if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
    const oldestKey = embeddingCache.keys().next().value;
    embeddingCache.delete(oldestKey);
  }
  embeddingCache.set(text, { vector: new Float32Array(vector), timestamp: Date.now() });
}

// Query-result cache for Pinecone hits
const queryResultCache = new Map();
const QUERY_CACHE_MAX = 50;
const QUERY_CACHE_TTL = 10 * 60 * 1000; // 10min

function getCachedQuery(key) {
  const cached = queryResultCache.get(key);
  if (cached && Date.now() - cached.timestamp < QUERY_CACHE_TTL) return cached.result;
  return null;
}

function setCachedQuery(key, result) {
  if (queryResultCache.size >= QUERY_CACHE_MAX) {
    const oldestKey = queryResultCache.keys().next().value;
    queryResultCache.delete(oldestKey);
  }
  queryResultCache.set(key, { result, timestamp: Date.now() });
}

// Pinecone retrieval
async function retrievePinecone(queryVector, topK = 5) {
  if (!pineconeReady) return null;
  
  try {
    const results = await pineconeIndex.namespace(PINECONE_NAMESPACE).query({
      vector: Array.from(queryVector),
      topK,
      includeMetadata: true,
    });

    if (!results.matches?.length) return null;

    const chunks = results.matches.map(m => ({
      id: m.id,
      category: m.metadata?.category || "unknown",
      title: m.metadata?.title || "",
      content: m.metadata?.content || "",
      similarity: m.score || 0
    }));

    return { chunks, topScore: chunks[0]?.similarity || 0 };
  } catch (e) {
    console.error("Pinecone query failed:", e.message);
    return null;
  }
}

// Gemini embedding
const EMBEDDING_MODEL = "gemini-embedding-001";
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

async function fetchWithTimeout(url, options, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiStreaming(apiKey, requestBody, res) {
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
    
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }, 30000);

      if (!response.ok) {
        const errorText = await response.text();
        if ((response.status === 429 || response.status >= 500) && model !== GEMINI_MODELS[GEMINI_MODELS.length - 1]) continue;
        throw new Error(`Gemini error ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            if (jsonStr.trim() === "[DONE]") continue;
            
            try {
              const data = JSON.parse(jsonStr);
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullText += text;
                res.write(`data: ${JSON.stringify({ text })}\n\n`);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
      return { success: true, text: fullText, model };
    } catch (error) {
      console.error(`Streaming error with ${model}:`, error.message);
      if (model === GEMINI_MODELS[GEMINI_MODELS.length - 1]) {
        throw error;
      }
    }
  }
}

async function callGemini(apiKey, requestBody) {
  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }, 30000);
    if (response.ok) {
      console.log(`Generated using ${model}`);
      return { response, model };
    }
    if ((response.status === 429 || response.status >= 500) && model !== GEMINI_MODELS[GEMINI_MODELS.length - 1]) continue;
    return { response, model };
  }
}

async function getQueryEmbedding(text, apiKey) {
  const cached = getCachedEmbedding(text);
  if (cached) {
    console.log("Cache hit for query embedding");
    return cached;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const embedding = data.embedding.values;
  setCachedEmbedding(text, embedding);
  return new Float32Array(embedding);
}

// Query enhancement
const FOLLOWUP_PATTERNS = /^(tell me more|more|go on|continue|elaborate|what else|and\??|yes|yeah|sure|okay|ok)$/i;

function buildEnhancedQuery(message, history) {
  if (!history || history.length === 0) return message;
  if (!FOLLOWUP_PATTERNS.test(message.trim())) return message;
  const lastUserMsg = history.filter(m => m.role === "user").slice(-1)[0];
  return lastUserMsg ? lastUserMsg.content + " " + message : message;
}

// System prompt
function buildSystemPrompt(contextChunks, topScore) {
  const context = contextChunks
    .map((c, i) => `[${i + 1}. ${c.category.toUpperCase()}: ${c.title}]\n${c.content}`)
    .join("\n\n");
  const categories = [...new Set(contextChunks.map(c => c.category))];
  const isLowRelevance = topScore < 0.65;

  return `You are Ahmad Hassan, a Software Engineer and Full Stack Developer from Pakistan. You are the AI version of Ahmad, responding to visitors on his portfolio website (ahmadx.dev).

PERSONA:
- Always respond in FIRST PERSON as Ahmad ("I", "my", "me")
- Be conversational, warm, and professional — like Ahmad is chatting directly
- Show genuine enthusiasm about your work without being over-the-top

RESPONSE RULES:
- CRITICAL: Answer ONLY the user's LATEST/CURRENT question. Completely IGNORE previous conversation topics. If the user previously asked about certifications but now asks about your company, respond ONLY about your company. Treat each question independently.
- ONLY answer what the user specifically asked about. If they ask about certifications, talk ONLY about certifications. If they ask about projects, talk ONLY about projects. NEVER mix topics or volunteer unrelated information.
- Do NOT start responses with summaries of previous topics. Focus directly on the current question.
- Keep responses concise: 1-3 short paragraphs for simple questions, up to 4 for detailed ones
- Use markdown: **bold** for emphasis, [text](url) for links, bullet lists for multiple items
- When mentioning projects or certifications, ALWAYS include the relevant URL as a clickable link
- Never make up information not present in the context below
- SAVAGE MODE: If someone asks about your relationship status, whether you're single, marital status, or anything romantic — reply with a short, witty, savage roast. Be funny and confident. Examples: "Yeah I'm single — my code compiles on the first try, I don't need another miracle in my life", "I'm in a committed relationship with my terminal — she never leaves me on read". Keep it to 1-2 sentences max, be creative, don't repeat the same line.
${isLowRelevance ? `
IMPORTANT — LOW RELEVANCE DETECTED (score: ${topScore.toFixed(2)}):
The retrieved context below is NOT closely related to the user's question. This likely means the user asked about something NOT covered in the portfolio (e.g., personal details like date of birth, age, relationship status, or general knowledge questions).
- Do NOT use the context below to answer. It is irrelevant to what was asked.
- Instead, respond BRIEFLY: "I don't have that information on my portfolio. Feel free to ask about my projects, certifications, skills, blog articles, or experience!"
- Do NOT list or mention any certifications, projects, or other portfolio content unless the user specifically asked about them.
` : `- If the context doesn't contain information relevant to the question, say "I don't have that specific info on my portfolio, but feel free to ask about my projects, skills, certifications, or experience!"`}
- For greetings (hi, hello, hey), respond warmly and briefly suggest what you can help with
- For off-topic questions (coding help, general knowledge, etc.), politely redirect: "That's a great question, but I'm here specifically to tell you about my work and experience. Want to know about my projects or skills?"

KNOWLEDGE COVERAGE (topics you can answer about):
Personal details (date of birth July 4 2005, age, address, marital status, favorite colors, nature), hobbies (book reading, chess, finance), goals & mentors, books read (70+ self-improvement and technical books), bio & background, education, work at VieroMind, open-source contributions, competitive programming, blog & writing, tools & setup (Dell XPS 15, Arch Linux, Neovim, Hyprland), 7 projects (HyprFlux — a complete Arch Linux desktop OS with branded live ISO, TUI installer, Hyprland desktop, boot theming, and developer tooling; SehatScan, HisaabScore, RAF-SP, UAM Tracker, MindOasis, CodingHawks), 21 certifications (AWS, Meta, Google, GitHub, etc.), 9 achievements & competition results, 34 blog articles (system design, AWS CCP notes, shell scripting, JavaScript/web dev, databases, and more — you can share links to specific articles), contact info & social links.

RETRIEVED CONTEXT (${contextChunks.length} sections, relevance score: ${topScore.toFixed(2)}, from ${categories.join(", ")}):
${context}`;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .slice(-4)
    .filter(msg => msg && typeof msg.content === "string" && msg.content.length <= 1000)
    .map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.role === "user" ? msg.content.trim() : msg.content.trim().slice(0, 80) + "..." }],
    }));
}

// Handler with performance logging
module.exports = async function handler(req, res) {
  const startTime = Date.now();
  const log = (label) => console.log(`[${Date.now() - startTime}ms] ${label}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
  if (!checkRateLimit(ip)) return res.status(429).json({ error: "Too many requests. Please wait a moment." });

  const geminiApiKey = process.env.GEMINI_API_KEY;
  const pineconeApiKey = process.env.PINECONE_API_KEY;

  if (!geminiApiKey) {
    console.error("Missing GEMINI_API_KEY");
    return res.status(500).json({ error: "Server configuration error: missing API key" });
  }

  if (!pineconeApiKey) {
    console.error("Missing PINECONE_API_KEY");
    return res.status(500).json({ error: "Server configuration error: missing Pinecone API key" });
  }

  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string") return res.status(400).json({ error: "Message is required" });
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) return res.status(400).json({ error: "Message cannot be empty" });
    if (trimmedMessage.length > 500) return res.status(400).json({ error: "Message too long (max 500 characters)" });

    // Greeting shortcut - skip embedding + retrieval entirely
    const lowerMsg = trimmedMessage.toLowerCase().trim();
    const greetings = ["hi", "hello", "hey", "hii", "hiii", "helo", "hola", "howdy"];
    if (greetings.includes(lowerMsg) || /^(hi|hello|hey|howdy)\s*[!.]*$/i.test(lowerMsg)) {
      log("Greeting shortcut");
      const systemPrompt = `You are Ahmad Hassan, a Software Engineer from Pakistan. Respond to the greeting warmly and briefly suggest what you can help with (projects, certifications, skills, experience). Keep it 1-2 sentences.`;
      
      const requestBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: trimmedMessage }] }],
        generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 200 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      };

      const { response: geminiResponse } = await callGemini(geminiApiKey, requestBody);
      log("Gemini responded");

      if (!geminiResponse.ok) {
        return res.status(500).json({ error: "Failed to generate response" });
      }

      const geminiData = await geminiResponse.json();
      const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) return res.status(500).json({ error: "Empty response from AI" });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const words = responseText.split(" ");
      for (let i = 0; i < words.length; i += 2) {
        const chunk = words.slice(i, i + 2).join(" ");
        const suffix = i + 2 < words.length ? " " : "";
        res.write(`data: ${JSON.stringify({ text: chunk + suffix })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
      log(`Total: ${Date.now() - startTime}ms`);
      return;
    }

    const enhancedQuery = buildEnhancedQuery(trimmedMessage, history);
    log("Query enhanced");

    // Get query embedding
    const queryVector = await getQueryEmbedding(enhancedQuery, geminiApiKey);
    log("Embedding API done");

    // Initialize Pinecone if needed
    if (!pineconeReady) {
      await initPinecone(pineconeApiKey);
      log("Pinecone init");
    }

    // Retrieve from Pinecone
    let retrievalResult;
    const cacheKey = trimmedMessage.toLowerCase().slice(0, 100);
    const cachedResult = getCachedQuery(cacheKey);
    
    if (cachedResult) {
      log("Query cache HIT");
      retrievalResult = cachedResult;
    } else {
      log("Query cache MISS");
      retrievalResult = await retrievePinecone(queryVector, 5);
      log("Pinecone query done");

      if (!retrievalResult) {
        console.error("Pinecone query returned no results");
        return res.status(500).json({ error: "Failed to retrieve context from knowledge base" });
      }

      setCachedQuery(cacheKey, retrievalResult);
    }

    const systemPrompt = buildSystemPrompt(retrievalResult.chunks, retrievalResult.topScore);
    log("System prompt built");

    const conversationHistory = sanitizeHistory(history);
    const currentMessageText = conversationHistory.length > 0 
      ? `[CURRENT QUESTION — answer THIS, not previous topics]: ${trimmedMessage}`
      : trimmedMessage;
    conversationHistory.push({ role: "user", parts: [{ text: currentMessageText }] });

    const requestBody = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: conversationHistory,
      generationConfig: { temperature: 0.7, topP: 0.9, topK: 40, maxOutputTokens: 800 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    log("Calling Gemini...");
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      await callGeminiStreaming(geminiApiKey, requestBody, res);
      log("TOTAL TIME");
    } catch (error) {
      console.error("Streaming error:", error.message);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to generate response" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  } catch (error) {
    console.error("Chat API error:", error.message, error.stack);
    if (error.name === "AbortError" && !res.headersSent) {
      return res.status(504).json({ error: "The request took too long. Please try again." });
    }
    if (!res.headersSent) {
      res.status(500).json({ error: "An error occurred processing your request" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};