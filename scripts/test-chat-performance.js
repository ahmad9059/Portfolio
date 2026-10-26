#!/usr/bin/env node
// Uses the real API: includes provider latency, cache behavior and SSE completion.
// API_BASE_URL=http://localhost:3001 node scripts/test-chat-performance.js
const { performance } = require("node:perf_hooks");
const { readChatStream } = require("../assets/js/chat-stream");

const tests = [
  { name: "Education typo (prepared)", message: "what is your eduction" },
  { name: "Project (prepared)", message: "What is HyprFlux?" },
  { name: "Conversation recall", message: "give me all previous question I have asked you?", history: [
    { role: "user", content: "who are you?" }, { role: "user", content: "what is your eduction" },
  ] },
  { name: "New generation", message: "What do you build at VieroMind?" },
  { name: "Same question (cache)", message: "What do you build at VieroMind?" },
  { name: "Comparison", message: "Compare HyprFlux and SehatScan" },
  { name: "Credential grounding", message: "Do you hold the AWS Solutions Architect certification, or only Cloud Practitioner?" },
  { name: "Follow-up", message: "what technologies does it use?", history: [
    { role: "user", content: "Tell me about SehatScan" },
    { role: "assistant", content: "SehatScan is my AI health assessment platform." },
  ] },
];

async function benchmark() {
  const base = process.env.API_BASE_URL || "http://localhost:3001";
  const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
  const diagnostics = await health.json();
  console.log(`Model: ${diagnostics.model}; knowledge: ${diagnostics.knowledgeCount} chunks`);
  console.log("Real HTTP measurements. Generated responses incur normal provider usage; this is a small sample, not an SLA.\n");
  const results = [];
  for (const item of tests) {
    const start = performance.now();
    let firstText = null;
    try {
      const response = await fetch(`${base}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: item.message, history: item.history || [] }),
        signal: AbortSignal.timeout(22000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await readChatStream(response.body, () => { if (firstText === null) firstText = performance.now() - start; });
      const result = { name: item.name, source: response.headers.get("x-chat-source"), firstTextMs: Math.round(firstText), totalMs: Math.round(performance.now() - start), chars: text.length };
      results.push(result);
      console.log(JSON.stringify(result));
      if (process.env.SHOW_ANSWERS === "1") console.log(text + "\n");
    } catch (error) {
      console.error(`${item.name}: ${error.message}`);
      process.exitCode = 1;
    }
  }
  const generated = results.filter(r => r.source === "generated").map(r => r.firstTextMs).sort((a, b) => a - b);
  if (generated.length) console.log(`\nUncached first text: min=${generated[0]}ms median=${generated[Math.floor(generated.length / 2)]}ms max=${generated.at(-1)}ms (${generated.length} samples)`);
}

benchmark().catch(error => { console.error(error.message); process.exitCode = 1; });
