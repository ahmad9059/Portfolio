const { test } = require("node:test");
const assert = require("node:assert/strict");
const { InflightGenerations } = require("../../lib/chat/inflight");

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("identical concurrent requests share one generation and late subscribers receive earlier text", async () => {
  const hub = new InflightGenerations();
  const gate = deferred(), started = deferred();
  let calls = 0, first = "", second = "";
  const run = async ({ onText }) => {
    calls++; onText("first "); started.resolve();
    await gate.promise; onText("second");
    return { text: "first second", cacheable: true };
  };
  const a = hub.join("same", { run, onText: text => { first += text; } });
  await started.promise;
  const b = hub.join("same", { run, onText: text => { second += text; } });
  gate.resolve();
  const results = await Promise.all([a, b]);
  assert.equal(calls, 1);
  assert.equal(first, "first second");
  assert.equal(second, first);
  assert.deepEqual(results[0], results[1]);
});

test("different conversation keys do not share generations", async () => {
  const hub = new InflightGenerations();
  let calls = 0;
  const run = async () => { calls++; return {}; };
  await Promise.all(["project-a", "project-b"].map(key => hub.join(key, { run, onText() {} })));
  assert.equal(calls, 2);
});

test("disconnecting one subscriber does not cancel another visitor's answer", async () => {
  const hub = new InflightGenerations();
  const controller = new AbortController(), started = deferred(), gate = deferred();
  const run = async ({ signal, onText }) => {
    started.resolve(); await gate.promise;
    assert.equal(signal.aborted, false);
    onText("answer"); return { text: "answer" };
  };
  const a = hub.join("same", { run, onText() {}, signal: controller.signal });
  const b = hub.join("same", { run, onText() {} });
  await started.promise;
  const rejected = assert.rejects(a, { name: "AbortError" });
  controller.abort(); gate.resolve();
  await rejected;
  assert.equal((await b).text, "answer");
});

test("last subscriber disconnect aborts upstream and removes the active entry", async () => {
  const hub = new InflightGenerations();
  const controller = new AbortController(), started = deferred();
  let upstream;
  const task = hub.join("cancel", { signal: controller.signal, onText() {}, run: ({ signal }) => {
    upstream = signal; started.resolve();
    return new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  } });
  await started.promise;
  const rejected = assert.rejects(task, { name: "AbortError" });
  controller.abort(); await rejected;
  assert.equal(upstream.aborted, true);
  assert.equal(hub.entries.size, 0);
});

test("capacity is bounded, shared subscribers remain allowed, and failures can be retried", async () => {
  const hub = new InflightGenerations({ max: 1 });
  const gate = deferred();
  const a = hub.join("a", { run: () => gate.promise, onText() {} });
  const b = hub.join("a", { run: () => gate.promise, onText() {} });
  await assert.rejects(hub.join("b", { run() {}, onText() {} }), { code: "CHAT_BUSY" });
  const failures = Promise.all([assert.rejects(a, /upstream/), assert.rejects(b, /upstream/)]);
  gate.reject(new Error("upstream")); await failures;
  await Promise.resolve();
  assert.equal((await hub.join("a", { run: async () => "retry", onText() {} })), "retry");
});

test("a failing client writer removes its subscription and cancels otherwise-unused work", async () => {
  const hub = new InflightGenerations();
  let signal;
  const task = hub.join("writer", {
    onText() { throw new Error("connection closed"); },
    run: async options => {
      signal = options.signal;
      options.onText("text");
      assert.equal(signal.aborted, true);
      return {};
    },
  });
  await assert.rejects(task, /connection closed/);
  assert.equal(hub.entries.size, 0);
});
