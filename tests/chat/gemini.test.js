const { test } = require("node:test");
const assert = require("node:assert/strict");
const { streamAnswer, generationConfig } = require("../../lib/chat/gemini");

function packet(parts, finishReason) {
  return `data: ${JSON.stringify({ candidates: [{ content: { parts }, ...(finishReason ? { finishReason } : {}) }] })}\n\n`;
}

test("Flash-Lite uses minimal thinking while arbitrary model overrides keep compatible settings", () => {
  assert.equal(generationConfig("gemini-3.5-flash-lite", "hello").thinkingConfig.thinkingLevel, "minimal");
  assert.ok(generationConfig("gemini-3.5-flash-lite", "compare projects in detail").maxOutputTokens
    > generationConfig("gemini-3.5-flash-lite", "hello").maxOutputTokens);
  assert.equal(generationConfig("some-other-model", "hello").thinkingConfig, undefined);
});

test("SSE handles split UTF-8, CRLF, multiple parts, thought exclusion and final unterminated event", async () => {
  const data = (packet([{ text: "secret", thought: true }, { text: "Hé" }, { text: "llo " }])
    + packet([{ text: "🖤" }], "STOP").trimEnd()).replace(/\n/g, "\r\n");
  const bytes = new TextEncoder().encode(data);
  const response = new Response(new ReadableStream({
    start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); }
  }));
  let output = "";
  const result = await streamAnswer({ apiKey: "test-secret", model: "test", body: {},
    onText: text => { output += text; }, fetchImpl: async (url, options) => {
      assert.ok(!url.includes("test-secret"));
      assert.equal(options.headers["x-goog-api-key"], "test-secret");
      return response;
    }
  });
  assert.equal(output, "Héllo 🖤");
  assert.equal(result.text, output);
  assert.equal(result.cacheable, true);
});

test("empty, blocked, malformed and interrupted streams fail instead of caching success", async () => {
  for (const data of ["", "data: {bad}\n\n", packet([{ text: "partial" }]), 'data: {"promptFeedback":{"blockReason":"SAFETY"}}\n\n']) {
    await assert.rejects(streamAnswer({ apiKey: "test", model: "test", body: {}, onText() {}, fetchImpl: async () => new Response(data) }));
  }
});

test("token-limited answers are not cacheable", async () => {
  const result = await streamAnswer({ apiKey: "test", model: "test", body: {}, onText() {}, fetchImpl: async () => new Response(packet([{ text: "partial" }], "MAX_TOKENS")) });
  assert.equal(result.cacheable, false);
});

test("upstream error bodies are not exposed", async () => {
  await assert.rejects(streamAnswer({ apiKey: "test", model: "test", body: {}, onText() {}, fetchImpl: async () => new Response("private upstream details", { status: 429 }) }), error => {
    assert.equal(error.upstreamStatus, 429);
    assert.doesNotMatch(error.message, /private/);
    return true;
  });
});

test("deadline covers stalled response bodies", async () => {
  await assert.rejects(streamAnswer({ apiKey: "test", model: "test", body: {}, onText() {}, timeoutMs: 20,
    fetchImpl: async (_, options) => new Response(new ReadableStream({ start(controller) {
      const keepAlive = setTimeout(() => {}, 1000);
      options.signal.addEventListener("abort", () => { clearTimeout(keepAlive); controller.error(options.signal.reason); });
    } }))
  }), { name: "TimeoutError" });
});
