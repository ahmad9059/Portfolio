const { test } = require("node:test");
const assert = require("node:assert/strict");
const { AnswerCache } = require("../../lib/chat/cache");

test("answer cache is bounded, expires and refreshes LRU order", () => {
  let now = 0;
  const cache = new AnswerCache({ max: 2, ttl: 10, now: () => now });
  cache.set("a", "first"); cache.set("b", "second");
  assert.equal(cache.get("a"), "first");
  cache.set("c", "third");
  assert.equal(cache.get("b"), null);
  cache.set("a", "updated");
  assert.equal(cache.entries.size, 2);
  assert.equal(cache.get("a"), "updated");
  now = 10;
  assert.equal(cache.get("a"), null);
  cache.set("empty", "");
  cache.set("large", "x".repeat(20001));
  assert.equal(cache.get("empty"), null);
  assert.equal(cache.get("large"), null);
});
