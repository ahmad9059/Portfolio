# RAG Chat API Setup

## Optimizations Applied

1. **Float32Arrays** —10-50% faster vector math
2. **Query embedding cache** — Instant response for repeated queries (100 cached,30min TTL)
3. **Query result cache** — Caches Pinecone results for10min
4. **Lazy Pinecone init** — Initializes on first use to avoid cold start penalty
5. **Local fallback** — Falls back to local embeddings if Pinecone fails
6. **Reduced chunks** — 5 retrieved chunks (down from8)
7. **Smaller stream chunks** — 2 words (down from3)

## Pinecone Setup (Optional but Recommended)

Pinecone provides sub-millisecond vector search. Without it, the system uses local brute-force search (still fast for~248 vectors).

### Steps:

1. **Create free account**: https://app.pinecone.io
2. **Get API key**: Dashboard → API Keys → Create Key
3. **Set environment variable**:
   ```bash
   export PINECONE_API_KEY="your-api-key"
   ```
4. **Upload embeddings**:
   ```bash
   cd api
   npm install
   node upload-to-pinecone.js
   ```

The script will:
- Create a serverless index named`portfolio-rag` (768 dimensions, cosine metric)
- Upload all embeddings with metadata
- Create namespace `ahmad-knowledge`

### Vercel Environment Variables

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```
GEMINI_API_KEY=your-gemini-api-key
PINECONE_API_KEY=your-pinecone-api-key
```

## Expected Performance

| Operation | Local | Pinecone |
|-----------|-------|----------|
| First query (cold) | ~500ms | ~200ms |
| Repeated query (cached) | ~50ms | ~50ms |
| Similar query (cache miss) | ~300ms | ~100ms |

## Architecture

```
User Query
    ↓
[Query Cache Hit?] ──Yes──→ Return cached result
    │No
    ↓
[Embedding Cache Hit?] ──Yes──→ Use cached embedding
    │No
    ↓
[Gemini Embedding API] ──→ Cache embedding
    │
    ↓
[Pinecone Ready?] ──Yes──→ Pinecone Query
    │No                          │
    ↓                            ↓
[Local Brute-Force] ←─────────┘
    │
    ↓
[Cache Result]
    ↓
[Build System Prompt]
    ↓
[Gemini Generation]
    ↓
[Stream Response]
```

## Files

- `api/chat.js` — Main RAG handler with Pinecone + local fallback
- `api/upload-to-pinecone.js` — Script to upload embeddings
- `api/knowledge.json` — Knowledge chunks (metadata)
- `api/embeddings.json` — Pre-computed vector embeddings
- `api/package.json` — Dependencies (Pinecone SDK)