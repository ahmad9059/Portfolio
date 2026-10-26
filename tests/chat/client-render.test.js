const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Exercise the exact renderer shipped in the template without requiring a browser binary.
const template = fs.readFileSync(path.join(__dirname, "../../layouts/_default/chat.html"), "utf8");
const start = template.indexOf("function parseMarkdown(text)");
const end = template.indexOf("function scrollToBottom()", start);
const render = vm.runInNewContext(`(${template.slice(start, end).trim()})`);

test("chat renderer escapes model HTML and rejects executable URLs and injected attributes", () => {
  for (const input of [
    '<img src=x onerror="alert(1)">',
    '[click](javascript:alert(1))',
    '[click](data:text/html,<script>alert(1)</script>)',
    '[click](https://example.com/"onmouseover="alert(1))',
    '[click](//untrusted.example)',
  ]) {
    const html = render(input);
    assert.doesNotMatch(html, /<(?:script|img)\b|href="(?:javascript|data):| onmouseover="|href="\/\//i);
  }
});

test("chat renderer preserves real links, formatting, lists and Unicode", () => {
  const html = render('**SehatScan** 🖤\n\n- [Project](https://sehatscan.vercel.app/)\n- [Email](mailto:hi@ahmadx.dev)');
  assert.match(html, /<strong>SehatScan<\/strong>/);
  assert.match(html, /🖤/);
  assert.match(html, /<ul>/);
  assert.match(html, /href="https:\/\/sehatscan.vercel.app\/"/);
  assert.match(html, /href="mailto:hi@ahmadx.dev"/);
  assert.match(html, /rel="noopener noreferrer"/);
});
