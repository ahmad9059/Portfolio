const { documentCount, version } = require("../lib/chat/retrieval");
const { modelName } = require("../lib/chat/gemini");

module.exports = function handler(req, res) {
  let model;
  try { model = modelName(); } catch { model = null; }
  const configured = Boolean(process.env.GEMINI_API_KEY) && Boolean(model);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(configured ? 200 : 503).json({
    status: configured ? "ok" : "degraded",
    retrieval: "local-bm25",
    knowledgeLoaded: documentCount > 0,
    knowledgeCount: documentCount,
    knowledgeVersion: version,
    generationConfigured: configured,
    model,
  });
};
