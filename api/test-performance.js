#!/usr/bin/env node
// Test script to measure RAG performance
// Usage: node api/test-performance.js

async function testPerformance() {
  const apiBase = process.env.API_BASE_URL || "http://localhost:3001";
  const tests = [
    { name: "Greeting (cached)", query: "hi" },
    { name: "Greeting (cached)", query: "hi" }, // Should hit cache
    { name: "Simple question", query: "what projects have you built?" },
    {
      name: "Same question (cache hit)",
      query: "what projects have you built?",
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
      });

      if (!response.ok) {
        console.log(`${test.name}: ERROR ${response.status}`);
        continue;
      }

      // Read the stream
      const reader = response.body.getReader();
      let chunks = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks++;
      }

      const time = Date.now() - start;
      console.log(`${test.name}: ${time}ms`);
    } catch (error) {
      console.log(`${test.name}: ERROR - ${error.message}`);
    }
  }
}

// Start local dev server first: node dev-server.js
// Then run this test: node api/test-performance.js
// Optional: API_BASE_URL=http://localhost:3001 node api/test-performance.js
testPerformance();
