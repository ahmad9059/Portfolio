# Portfolio Chat API

The chat searches a bundled public knowledge snapshot in memory. It makes no Pinecone or embedding requests and has no npm runtime dependencies.

## Local development

Use Node.js 22 or later. Add `GEMINI_API_KEY` to the repository-root `.env` (never commit it), then run:

```bash
node dev-server.js
```

Run `hugo server` in another terminal. The API defaults to port 3001. The dev server rebuilds the knowledge snapshot on startup. Restart it after editing content.

Only Gemini generation requires a credential. `PINECONE_API_KEY` is no longer used. You may remove that variable from local and Vercel settings. The migration does not delete the hosted index or its data.

## Knowledge and retrieval

`node scripts/build-chat-knowledge.js` compiles:

- Public about, projects, certifications, tools and contact pages.
- Published blog summaries and paragraph-sized article sections, with their original URLs.
- Structured project descriptions, technology tags, certificate issuers, and verification links extracted from the public cards.
- A validated public profile for identity answers such as “who are you?”.

The compiler excludes draft and future posts, scripts, styles, images, private files and `.env`. It does not import private information from the former hosted index. Unknown facts, including personal facts absent from the public pages, remain unknown.

The generated file is `lib/chat/knowledge.json`. Commit this snapshot with its compiler. The Vercel build regenerates it, and function configuration explicitly includes `lib/chat/**`. Runtime search never needs the source Markdown files. A content hash versions the snapshot.

Local BM25 ranking uses title/category boosts and a small alias dictionary. It retrieves up to five whole chunks, with a 6,500-character content budget. Unlike embeddings, lexical search can miss paraphrases or misspellings. Add query aliases in `lib/chat/retrieval.js` and regression tests when needed. Retrieval scores are ranking scores, not cosine confidence values.

## Response paths

1. Greetings, identity questions, and narrow generic project/certification questions return source-derived prepared answers without an AI request.
2. Other questions search the local index. Unsupported topics receive a short no-context answer without generation.
3. Relevant questions call Gemini once and stream its answer.
4. Successfully completed answers enter a bounded, ten-minute in-memory LRU cache. Cache keys include knowledge version, model, question and sanitized conversation. Incomplete, failed and token-limited responses are not cached.

The cache belongs to each warm function instance. It is not shared between instances, and cold starts clear it. Prepared answers remain fast on a cold instance because they need no network service.

## Conversation grounding

The API accepts up to ten recent valid user/assistant messages, bounded to 10,000 characters in total. System roles from the client are discarded. Explicit new topics reset the model context. Follow-ups preserve the active topic, including narrowing turns such as “what about Google?” followed by “tell me more”. Named and ordinal references resolve against known portfolio entities. Ambiguous references ask for clarification instead of guessing.

Previous assistant text identifies referents only; it is not treated as evidence. Retrieval scopes certifications, work, projects, biography, and blog questions to the relevant source categories. Unknown personal facts cannot use an unrelated blog paragraph as biography. This is deterministic local topic resolution, not a semantic model, so ambiguous language can still require clarification.

Source prompts use descriptive titles rather than numbered IDs. A streaming filter removes numeric citation markers such as `[1]` and `[2]` while preserving real Markdown links, lists, and numbers. The chat renderer also rejects executable URL schemes and unsafe link attributes.

## Generation and errors

Default model: `gemini-flash-lite-latest`. Optional `GEMINI_MODEL` overrides it. Verify access before selecting another model. There is no slow fallback chain.

The generation deadline is 15 seconds and covers headers and the streamed body. The server parses split SSE events, suppresses thought parts, and checks completion. Before streaming, failures return JSON with a 502/504 status. During streaming, failures emit an SSE `error` followed by `[DONE]`. Provider error bodies and API keys are not sent to visitors.

`GET /api/health` reports local knowledge count/version, model and whether generation is configured. It does not call Gemini or reveal keys. Without a generation key it returns 503, but prepared answers still work.

## Deploy

Set `GEMINI_API_KEY` in the Vercel production environment, then redeploy. `vercel.json` runs:

```bash
node scripts/build-chat-knowledge.js && hugo --gc --minify
```

No index creation, embedding generation, or upload is needed. Check `/api/health` after deployment. A local code change does not update production by itself.

## Tests and latency

```bash
node scripts/build-chat-knowledge.js
node --test tests/chat/*.test.js
# With the local API running; this makes real generation requests:
node scripts/test-chat-performance.js
```

Tests use mocked generation and need no credentials. They cover content extraction, draft exclusion, retrieval, prepared answers, cache isolation/expiry, rate limits, SSE parsing, errors and deadlines.

Measure time to the **first text event** separately from full completion. Local retrieval removes two remote calls but cannot guarantee 1–2 seconds for novel generated answers. Model load, network distance and function cold starts still matter. Prepared and warm cached answers avoid that dependency. Rate limiting and caching are instance-local, not a distributed abuse-prevention system.
