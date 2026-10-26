const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readChatStream } = require("../../assets/js/chat-stream");

function stream(bytes, split) {
  return new ReadableStream({ start(controller) {
    controller.enqueue(bytes.slice(0, split)); controller.enqueue(bytes.slice(split)); controller.close();
  } });
}

test("browser SSE reader survives every byte boundary, Unicode, CRLF and trailing DONE without newline", async () => {
  const input = ': comment\r\n\r\ndata: {"text":"Héllo "}\r\n\r\ndata: {"text":"🖤"}\r\n\r\ndata: [DONE]';
  const bytes = new TextEncoder().encode(input);
  for (let split = 0; split <= bytes.length; split++) {
    let rendered = "";
    const text = await readChatStream(stream(bytes, split), (_, full) => { rendered = full; });
    assert.equal(text, "Héllo 🖤");
    assert.equal(rendered, text);
  }
});

test("browser reader rejects empty, malformed, failed and truncated answers", async () => {
  for (const input of ["", 'data: [DONE]\n\n', 'data: {bad}\n\n', 'data: {"text":"partial"}\n\n',
    'data: {"text":"partial"}\n\ndata: {"error":"Service failed"}\n\ndata: [DONE]\n\n']) {
    await assert.rejects(readChatStream(new Response(input).body, () => {}));
  }
  await assert.rejects(readChatStream(null, () => {}));
});

test("browser reader releases its stream on errors and applies response size limits", async () => {
  const body = new Response(`data: ${JSON.stringify({ text: "x".repeat(65537) })}\n\n`).body;
  await assert.rejects(readChatStream(body, () => {}), /size limit/);
  assert.equal(body.locked, false);
});
