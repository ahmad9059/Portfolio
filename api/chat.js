// =============================================================================
// RAG Chat API — Vercel Serverless Function
// Embeds user query → retrieves relevant knowledge → generates response as Ahmad
// =============================================================================

// Load knowledge base and embeddings at cold start
let knowledge = null;
let knowledgeMap = {};
let embeddingsArray = []; // Flat array for faster iteration
let idToArrayIndex = {}; // Map ID to array index
let loadError = null;

try {
  knowledge = require("./knowledge.json");
  const embeddingsData = require("./embeddings.json");

  knowledge.forEach((chunk) => {
    knowledgeMap[chunk.id] = chunk;
  });

  // Store embeddings as Float32Array for faster math
  embeddingsData.forEach((item, idx) => {
    embeddingsArray.push({
      id: item.id,
      vec: new Float32Array(item.vector),
      norm: Math.sqrt(item.vector.reduce((sum, v) => sum + v * v, 0))
    });
    idToArrayIndex[item.id] = idx;
  });
} catch (e) {
  loadError = e.message;
  console.error("Failed to load knowledge/embeddings:", e.message);
}

// -----------------------------------------------------------------------------
// Rate Limiter — sliding window per IP
// -----------------------------------------------------------------------------
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
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

// Periodically clean expired rate limit entries (prevent memory leak on long-lived instances)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW * 5);

// Query embedding cache (LRU-style, max 100 entries)
const embeddingCache = new Map();
const EMBEDDING_CACHE_MAX = 100;
const EMBEDDING_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedEmbedding(text) {
  const cached = embeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < EMBEDDING_CACHE_TTL) {
    return cached.vector;
  }
  return null;
}

function setCachedEmbedding(text, vector) {
  if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
    const oldestKey = embeddingCache.keys().next().value;
    embeddingCache.delete(oldestKey);
  }
  embeddingCache.set(text, { vector: new Float32Array(vector), timestamp: Date.now() });
}

function cosineSimilarity(queryVec, doc) {
  let dot = 0;
  for (let i = 0; i < queryVec.length; i++) {
    dot += queryVec[i] * doc.vec[i];
  }
  return dot / (doc.norm * Math.sqrt(queryVec.reduce((s, v) => s + v * v, 0)));
}

// -----------------------------------------------------------------------------
// Embedding — calls Gemini embedding API with timeout
// -----------------------------------------------------------------------------
const EMBEDDING_MODEL = "gemini-embedding-001";
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]; // Primary → fallback
const API_TIMEOUT = 15000; // 15 second timeout for API calls

async function fetchWithTimeout(url, options, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// Call Gemini with model fallback — tries primary model, falls back on 429/5xx
async function callGemini(apiKey, requestBody) {
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }, 30000); // 30s timeout for generation

    if (response.ok) {
      console.log(`Generated response using ${model}`);
      return { response, model };
    }

    // If rate limited or server error, try next model
    if ((response.status === 429 || response.status >= 500) && i < GEMINI_MODELS.length - 1) {
      console.log(`${model} returned ${response.status}, falling back to ${GEMINI_MODELS[i + 1]}`);
      continue;
    }

    // Last model or non-retryable error — return as-is
    return { response, model };
  }
}

async function getQueryEmbedding(text, apiKey) {
  // Check cache first
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

  // Cache for future use
  setCachedEmbedding(text, embedding);

  return new Float32Array(embedding);
}

const MAX_CHUNKS = 5;
const RELEVANCE_THRESHOLD = 0.65;
const HIGH_RELEVANCE_THRESHOLD = 0.9; // Early termination threshold

function retrieveChunks(queryVector, topK = MAX_CHUNKS) {
  const scores = [];

  // Fast iteration over flat array
  for (let i = 0; i < embeddingsArray.length; i++) {
    const doc = embeddingsArray[i];
    const similarity = cosineSimilarity(queryVector, doc);
    scores.push({ id: doc.id, similarity });
  }

  // Partial sort - only need topK, not full sort
  scores.sort((a, b) => b.similarity - a.similarity);

  const topScore = scores[0]?.similarity || 0;
  const results = [];
  const limit = topScore < RELEVANCE_THRESHOLD ? 2 : topK;

  for (let i = 0; i < scores.length && results.length < limit; i++) {
    const chunk = knowledgeMap[scores[i].id];
    if (chunk) results.push({ ...chunk, similarity: scores[i].similarity });
  }

  return { chunks: results, topScore };
}

// -----------------------------------------------------------------------------
// Query Enhancement — combine recent conversation context for better retrieval
// -----------------------------------------------------------------------------
const FOLLOWUP_PATTERNS = /^(tell me more|more|go on|continue|elaborate|what else|and\??|yes|yeah|sure|okay|ok)$/i;

function buildEnhancedQuery(message, history) {
  // For the first message or short conversations, just use the message
  if (!history || history.length === 0) return message;

  // Only enhance for genuinely vague follow-ups (e.g. "tell me more", "yes", "go on")
  // Do NOT enhance clear standalone questions like "give me certs"
  if (!FOLLOWUP_PATTERNS.test(message.trim())) return message;

  // Take last user message for context on vague follow-ups
  const lastUserMsg = history
    .filter((m) => m.role === "user")
    .slice(-1)[0];

  if (lastUserMsg) {
    return lastUserMsg.content + " " + message;
  }

  return message;
}

// -----------------------------------------------------------------------------
// System Prompt — comprehensive persona with knowledge coverage hints
// -----------------------------------------------------------------------------
function buildSystemPrompt(contextChunks, topScore) {
  const context = contextChunks
    .map((c, i) => `[${i + 1}. ${c.category.toUpperCase()}: ${c.title}]\n${c.content}`)
    .join("\n\n");

  // Build category summary from retrieved chunks
  const categories = [...new Set(contextChunks.map((c) => c.category))];

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
Personal details (date of birth July 4 2005, age, address, marital status, favorite colors, nature), hobbies (book reading, chess, finance), goals & mentors, books read (70+ self-improvement and technical books), bio & background, education, work at VieroMind, open-source contributions, competitive programming, blog & writing, tools & setup (Dell XPS 15, Arch Linux, Neovim, Hyprland), 7 projects (HyprFlux, SehatScan, HisaabScore, RAF-SP, UAM Tracker, MindOasis, CodingHawks), 21 certifications (AWS, Meta, Google, GitHub, etc.), 9 achievements & competition results, 34 blog articles (system design, AWS CCP notes, shell scripting, JavaScript/web dev, databases, and more — you can share links to specific articles), contact info & social links.

RETRIEVED CONTEXT (${contextChunks.length} sections, relevance score: ${topScore.toFixed(2)}, from ${categories.join(", ")}):
${context}`;
}

// -----------------------------------------------------------------------------
// History Sanitization — trim and validate conversation history
// -----------------------------------------------------------------------------
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .slice(-4) // Last 4 messages (2 turns) — minimal context to reduce topic bleed
    .filter((msg) => msg && typeof msg.content === "string" && msg.content.length <= 1000)
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      // Heavily truncate assistant responses in history to prevent prior topics from
      // bleeding into new questions (e.g. certs answer polluting a "where do you work?" query)
      parts: [{ text: msg.role === "user" ? msg.content.trim() : msg.content.trim().slice(0, 80) + "..." }],
    }));
}

// =============================================================================
// Request Handler
// =============================================================================
module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limiting
  const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY env var");
    return res.status(500).json({ error: "Server configuration error: missing API key" });
  }

  if (loadError) {
    console.error("Data load failed at cold start:", loadError);
    return res.status(500).json({ error: "Server configuration error: failed to load knowledge data", detail: loadError });
  }

  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    if (trimmedMessage.length > 500) {
      return res.status(400).json({ error: "Message too long (max 500 characters)" });
    }

    // Step 1: Build enhanced query with conversation context for better retrieval
    const enhancedQuery = buildEnhancedQuery(trimmedMessage, history);

    // Step 2: Embed the (enhanced) query
    const queryVector = await getQueryEmbedding(enhancedQuery, apiKey);

    // Step 3: Retrieve relevant context chunks (with relevance scoring)
    const { chunks: relevantChunks, topScore } = retrieveChunks(queryVector);

    // Step 4: Build system prompt with retrieved context and relevance signal
    const systemPrompt = buildSystemPrompt(relevantChunks, topScore);

    // Step 5: Build conversation history for Gemini
    const conversationHistory = sanitizeHistory(history);

    // Add current user message with clear framing to distinguish from history
    // This prevents the model from confusing prior conversation topics with the current question
    const currentMessageText = conversationHistory.length > 0
      ? `[CURRENT QUESTION — answer THIS, not previous topics]: ${trimmedMessage}`
      : trimmedMessage;

    conversationHistory.push({
      role: "user",
      parts: [{ text: currentMessageText }],
    });

    // Step 6: Call Gemini API (with model fallback)
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: conversationHistory,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const { response: geminiResponse, model: usedModel } = await callGemini(apiKey, requestBody);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error (${usedModel}):`, geminiResponse.status, errorText);

      if (geminiResponse.status === 429) {
        return res.status(429).json({
          error: "I'm getting too many requests right now. Please try again in a minute.",
        });
      }
      if (geminiResponse.status === 403) {
        return res.status(500).json({
          error: "API configuration error. Please try again later.",
        });
      }
      return res.status(500).json({
        error: "Failed to generate response",
        detail: `Gemini ${geminiResponse.status}: ${errorText}`,
      });
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("No text in Gemini response:", JSON.stringify(geminiData));
      return res.status(500).json({ error: "Empty response from AI" });
    }

    // Step 7: Stream response as SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send the full text in chunks to simulate streaming
    const words = responseText.split(" ");
    const chunkSize = 2; // Smaller chunks = faster perceived response

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      const suffix = i + chunkSize < words.length ? " " : "";
      res.write(`data: ${JSON.stringify({ text: chunk + suffix })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Chat API error:", error.message, error.stack);

    // Handle timeout specifically
    if (error.name === "AbortError") {
      if (!res.headersSent) {
        return res.status(504).json({
          error: "The request took too long. Please try again with a simpler question.",
        });
      }
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: "An error occurred processing your request",
        detail: error.message,
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};
