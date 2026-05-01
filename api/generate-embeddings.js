const fs = require("fs");
const path = require("path");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = "gemini-embedding-001";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

async function getEmbedding(text) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY environment variable is required.");
    console.error("Usage: GEMINI_API_KEY=your_key node api/generate-embeddings.js");
    process.exit(1);
  }

  const knowledgePath = path.join(__dirname, "knowledge.json");
  const outputPath = path.join(__dirname, "embeddings.json");

  console.log("Loading knowledge base...");
  const knowledge = JSON.parse(fs.readFileSync(knowledgePath, "utf-8"));
  console.log(`Found ${knowledge.length} chunks to embed.\n`);

  const embeddings = [];

  for (let i = 0; i < knowledge.length; i++) {
    const chunk = knowledge[i];
    const textToEmbed = `${chunk.title}: ${chunk.content}`;

    try {
      process.stdout.write(`[${i + 1}/${knowledge.length}] Embedding: ${chunk.id}...`);
      const vector = await getEmbedding(textToEmbed);
      embeddings.push({
        id: chunk.id,
        vector,
      });
      console.log(" done");

      if (i < knowledge.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (error) {
      console.error(` FAILED: ${error.message}`);
      process.exit(1);
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(embeddings, null, 0));

  const fileSize = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\nDone! Generated ${embeddings.length} embeddings.`);
  console.log(`Output: ${outputPath} (${fileSize} KB)`);
}

main();