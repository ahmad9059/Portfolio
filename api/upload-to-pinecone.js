// =============================================================================
// Upload embeddings to Pinecone
// Run: node api/upload-to-pinecone.js
// =============================================================================
// This creates a serverless index with 768 dimensions (Gemini embedding size)
// =============================================================================

const { Pinecone } = require("@pinecone-database/pinecone");

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const INDEX_NAME = "portfolio-rag";
const NAMESPACE = "ahmad-knowledge";
const EMBEDDING_DIM = 3072; // Gemini embedding dimension

async function uploadEmbeddings() {
  if (!PINECONE_API_KEY) {
    console.error("Error: PINECONE_API_KEY environment variable required");
    console.log("Usage: PINECONE_API_KEY=your_key node api/upload-to-pinecone.js");
    process.exit(1);
  }

  try {
    console.log("Initializing Pinecone...");
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });

    // List existing indexes
    const { indexes } = await pinecone.listIndexes();
    const indexExists = indexes?.some(i => i.name === INDEX_NAME);

    if (!indexExists) {
      console.log(`Creating serverless index "${INDEX_NAME}" (${EMBEDDING_DIM} dimensions)...`);
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: EMBEDDING_DIM,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1"
          }
        }
      });

      console.log("Waiting for index initialization...");
      await new Promise(r => setTimeout(r, 15000)); // Wait15s for initialization
    } else {
      console.log(`Index "${INDEX_NAME}" already exists`);
    }

    const index = pinecone.Index(INDEX_NAME);

    // Load data
    console.log("Loading knowledge and embeddings...");
    const knowledge = require("./knowledge.json");
    const embeddings = require("./embeddings.json");

    console.log(`Preparing ${embeddings.length} vectors...`);

    // Create knowledge map for metadata
    const knowledgeMap = {};
    knowledge.forEach(chunk => {
      knowledgeMap[chunk.id] = chunk;
    });

    // Prepare vectors (Pinecone has metadata size limit of 40KB per vector)
    const vectors = embeddings.map(item => ({
      id: item.id,
      values: item.vector,
      metadata: {
        category: knowledgeMap[item.id]?.category || "unknown",
        title: (knowledgeMap[item.id]?.title || "").slice(0, 200), // Limit title
        content: (knowledgeMap[item.id]?.content || "").slice(0, 7000), // Limit content
      }
    }));

    // Upload in batches of 100 (Pinecone limit)
    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      await index.namespace(NAMESPACE).upsert(batch);
      console.log(`Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)}`);
    }

    console.log(`\n✓ Successfully uploaded ${vectors.length} vectors!`);
    console.log(`  Index: ${INDEX_NAME}`);
    console.log(`  Namespace: ${NAMESPACE}`);
    console.log(`  Dimensions: ${EMBEDDING_DIM}`);
    console.log(`  Metric: cosine`);
    console.log("\nTest it with:");
    console.log(`  node -e \"const {Pinecone}=require('@pinecone-database/pinecone');const p=new Pinecone({apiKey:'${PINECONE_API_KEY.slice(0,10)}...'});p.Index('${INDEX_NAME}').namespace('${NAMESPACE}').describeIndexStats().then(console.log)\"`);

  } catch (error) {
    console.error("\nError:", error.message);
    if (error.message.includes("already exists")) {
      console.log("\nIndex already exists. Continuing with upload...");
    } else {
      process.exit(1);
    }
  }
}

uploadEmbeddings();