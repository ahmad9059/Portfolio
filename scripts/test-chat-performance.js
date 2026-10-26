#!/usr/bin/env node
// Test script to measure RAG performance
// Usage: node scripts/test-chat-performance.js

async function testPerformance() {
  const apiBase = process.env.API_BASE_URL || "http://localhost:3001";
  const tests = [
    { name: "Prepared greeting", query: "hi" },
    { name: "Prepared projects", query: "what projects have you built?" },
    { name: "Generated answer", query: "What is HyprFlux?" },
    {
      name: "Same question (cache hit)",
      query: "What is HyprFlux?",
    },
    {
      name: "Complex question",
      query:
        "tell me about your certifications and which ones are most valuable for software engineering",
    },
  ];

  console.log("Testing RAG Performance...\n");
  console.log("Note: First call will be slower due to cold start\n");

  for (const test of tests) {
    const start = Date.now();
    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: test.query }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        console.log(`${test.name}: ERROR ${response.status}`);
        continue;
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", firstText = null, chars = 0, complete = false, streamError = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { complete = true; continue; }
          const event = JSON.parse(data);
          if (event.error) streamError = event.error;
          if (event.text) {
            if (firstText === null) firstText = Date.now() - start;
            chars += event.text.length;
          }
        }
      }

      const time = Date.now() - start;
      console.log(`${test.name}: first text=${firstText ?? "none"}ms total=${time}ms chars=${chars} complete=${complete && !streamError} source=${response.headers.get("x-chat-source")}`);
      if (streamError) console.log(`  Stream error: ${streamError}`);
    } catch (error) {
      console.log(`${test.name}: ERROR - ${error.message}`);
    }
  }
}

// Start local dev server first: node dev-server.js
// Then run this test: node scripts/test-chat-performance.js
// Optional: API_BASE_URL=http://localhost:3001 node scripts/test-chat-performance.js
testPerformance();
