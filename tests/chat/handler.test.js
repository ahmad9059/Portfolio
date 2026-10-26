const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;
const originalPinecone = process.env.PINECONE_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
let nextIp = 0;

afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of [["GEMINI_API_KEY", originalKey], ["PINECONE_API_KEY", originalPinecone], ["GEMINI_MODEL", originalModel]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

function handler() {
  delete require.cache[require.resolve("../../api/chat")];
  return require("../../api/chat");
}
function response() {
  return { headers: {}, headersSent: false, statusCode: 200, output: "", ended: false,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.headers["content-type"] = "application/json"; this.output = JSON.stringify(data); this.headersSent = true; this.ended = true; },
    write(text) { this.headersSent = true; this.output += text; },
    end() { this.ended = true; },
  };
}
async function request(h, body, extra = {}) {
  const res = response();
  await h({ method: "POST", headers: { "x-real-ip": String(++nextIp) }, body, ...extra }, res);
  return res;
}
function generated(text = "I work at VieroMind.", reason = "STOP") {
  return new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: reason }] })}\n\n`);
}

test("prepared answers and unsupported questions need no API keys or outbound requests", async () => {
  delete process.env.GEMINI_API_KEY; delete process.env.PINECONE_API_KEY;
  global.fetch = async () => { throw new Error("Unexpected network request"); };
  const h = handler();
  for (const message of ["hi", "Tell me about your certifications", "what projects have you built?", "what is your birthday?"]) {
    const res = await request(h, { message });
    assert.equal(res.statusCode, 200);
    assert.match(res.output, /data: \[DONE\]/);
    assert.equal(res.headers["cache-control"], "no-store");
    assert.ok(res.ended);
  }
});

test("specific question makes exactly one generation request, then replays cached answer", async () => {
  process.env.GEMINI_API_KEY = "test"; delete process.env.PINECONE_API_KEY;
  delete process.env.GEMINI_MODEL;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.match(url, /gemini-flash-lite-latest:streamGenerateContent/);
    assert.doesNotMatch(url, /embedContent|pinecone/);
    const body = JSON.parse(options.body);
    assert.match(body.system_instruction.parts[0].text, /VieroMind/);
    assert.ok(body.system_instruction.parts[0].text.length < 9500);
    return generated();
  };
  const h = handler();
  const first = await request(h, { message: "Where do you work?" });
  const second = await request(h, { message: "Where do you work?" });
  assert.equal(calls, 1);
  assert.equal(first.output, second.output);
  assert.equal(first.headers["x-chat-source"], "generated");
  assert.equal(second.headers["x-chat-source"], "cache");
});

test("follow-up cache keys include history; explicit new topics do not retrieve old topics", async () => {
  process.env.GEMINI_API_KEY = "test";
  let calls = 0;
  global.fetch = async (_, options) => {
    calls++;
    const prompt = JSON.parse(options.body).system_instruction.parts[0].text;
    if (calls === 3) assert.match(prompt, /VieroMind/);
    return generated();
  };
  const h = handler();
  await request(h, { message: "tell me more", history: [{ role: "user", content: "HyprFlux" }] });
  await request(h, { message: "tell me more", history: [{ role: "user", content: "SehatScan" }] });
  await request(h, { message: "Where do you work?", history: [{ role: "user", content: "Tell me about your certifications" }] });
  assert.equal(calls, 3);
});

test("truncated answers are never cached", async () => {
  process.env.GEMINI_API_KEY = "test";
  let calls = 0;
  global.fetch = async () => { calls++; return generated("partial", "MAX_TOKENS"); };
  const h = handler();
  await request(h, { message: "Where do you work?" });
  await request(h, { message: "Where do you work?" });
  assert.equal(calls, 2);
});

test("invalid inputs and methods return appropriate statuses", async () => {
  const h = handler();
  for (const body of [undefined, {}, { message: " " }, { message: 7 }, { message: "x".repeat(501) }, { message: "Hi", history: {} }]) {
    assert.equal((await request(h, body)).statusCode, 400);
  }
  assert.equal((await request(h, {}, { method: "GET" })).statusCode, 405);
  assert.equal((await request(h, {}, { method: "OPTIONS" })).statusCode, 200);
});

test("missing generation key and upstream errors return JSON, without exposing provider details", async () => {
  delete process.env.GEMINI_API_KEY;
  const h = handler();
  assert.equal((await request(h, { message: "Where do you work?" })).statusCode, 503);
  process.env.GEMINI_API_KEY = "test";
  global.fetch = async () => new Response("secret provider details", { status: 403 });
  const result = await request(h, { message: "Where do you work?" });
  assert.equal(result.statusCode, 502);
  assert.equal(result.headers["content-type"], "application/json");
  assert.doesNotMatch(result.output, /secret provider details/);
});

test("rate limiting still applies to prepared and cached answers", async () => {
  const h = handler();
  for (let i = 0; i < 10; i++) assert.equal((await request(h, { message: "hi" }, { headers: { "x-real-ip": "rate-test" } })).statusCode, 200);
  const result = await request(h, { message: "hi" }, { headers: { "x-real-ip": "rate-test" } });
  assert.equal(result.statusCode, 429);
  assert.equal(result.headers["retry-after"], "60");
});

test("partial stream failures emit a safe SSE error and are not cached", async () => {
  process.env.GEMINI_API_KEY = "test";
  let calls = 0;
  global.fetch = async () => {
    calls++;
    // Text arrives, but the upstream never supplies a finish reason.
    return new Response('data: {"candidates":[{"content":{"parts":[{"text":"some text"}]}}]}\n\n');
  };
  const h = handler();
  for (let i = 0; i < 2; i++) {
    const result = await request(h, { message: "Where do you work?" });
    assert.equal(result.statusCode, 200);
    assert.match(result.output, /"text":"some text"/);
    assert.match(result.output, /"error":"The AI service is temporarily unavailable/);
    assert.match(result.output, /data: \[DONE\]/);
    assert.ok(result.ended);
  }
  assert.equal(calls, 2);
});

test("health reports bundled knowledge, not old embedding files or credentials", () => {
  const health = require("../../api/health");
  process.env.GEMINI_API_KEY = "must-not-leak";
  let res = response();
  health({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.output).retrieval, "local-bm25");
  assert.doesNotMatch(res.output, /must-not-leak|embeddings|PINECONE/);
  delete process.env.GEMINI_API_KEY;
  res = response(); health({}, res);
  assert.equal(res.statusCode, 503);
  process.env.GEMINI_MODEL = "invalid/name";
  res = response(); health({}, res);
  assert.equal(res.statusCode, 503);
});
