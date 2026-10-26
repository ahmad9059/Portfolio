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

Local BM25 ranking uses an inverted index, precomputed IDF weights, source facets, and query aliases. It retrieves up to five whole chunks, with a 6,500-character content budget. Mixed-topic requests reserve evidence for each topic; named article queries stay within that article. Unlike embeddings, lexical search can still miss paraphrases or misspellings. Add query aliases in `lib/chat/retrieval.js` and regression tests when needed. Retrieval scores are ranking scores, not cosine confidence values.

## Response paths

1. Greetings, identity questions, narrow generic portfolio questions, project descriptions/technology lists, and simple provider-specific credential questions return source-derived prepared answers without an AI request. These paths extract public facts; they do not guess recommendations or missing details.
2. Other questions search the local index. Unsupported topics receive a short no-context answer without generation.
3. Relevant questions call Gemini once and stream its answer.
4. Successfully completed answers enter a bounded, ten-minute in-memory LRU cache, checked before retrieval. Cache keys include prompt-policy version, UTC date, knowledge version, model/configuration, question and sanitized conversation. Incomplete, failed and token-limited responses are not cached.
5. Concurrent identical generation requests share one streamed upstream call. Different histories remain isolated. Disconnecting the last subscriber cancels upstream work; at most eight unique generations run simultaneously per instance.

The cache belongs to each warm function instance. It is not shared between instances, and cold starts clear it. Prepared answers remain fast on a cold instance because they need no network service.

## Conversation grounding

The chat uses Ahmad's first-person portfolio voice for normal replies and introductions ("I'm Ahmad Hassan", "my projects"), without unsolicited assistant disclaimers. Explicit questions about whether the chat is AI or Ahmad responding live receive a truthful AI disclosure.

Common topic misspellings (including `eduction`) are normalized before both intent detection and retrieval. Corrections use an explicit alias list, not fuzzy substitutions of names or source facts.

Requests to list earlier questions use a separate, model-free chat-history path. It lists original user messages only and explains the available-history limit. The browser sends up to 40 recent messages; recall accepts at most 20,000 characters. Portfolio generation still uses the smaller context window described below. This is not persistent memory and cannot recover other chats or missing history.

The API accepts up to ten recent valid user/assistant messages, bounded to 10,000 characters in total. System roles from the client are discarded. Explicit new topics reset the model context. Follow-ups preserve the active topic, including narrowing turns such as “what about Google?” followed by “tell me more”. Named and ordinal references resolve against known portfolio entities. Ambiguous references ask for clarification instead of guessing.

Previous assistant text identifies referents only; it is not treated as evidence. Retrieval scopes certifications, work, projects, biography, and blog questions to the relevant source categories. Unknown personal facts cannot use an unrelated blog paragraph as biography. This is deterministic local topic resolution, not a semantic model, so ambiguous language can still require clarification.

Catalog records carry complete public project/certificate names and counts. Direct count/full-list questions use the structured records rather than counting a partial retrieval window. Counts describe published portfolio entries, not a claim about every project ever built or every professional exam passed. The generation prompt includes today's UTC date and forbids adding overlapping job tenures into a fabricated total.

Source prompts use descriptive titles rather than numbered IDs. A streaming filter removes numeric citation markers such as `[1]` and `[2]` while preserving real Markdown links, lists, and numbers. The chat renderer also rejects executable URL schemes and unsafe link attributes.

## Generation and errors

Default model: **`gemini-3.5-flash-lite`**, explicitly pinned rather than using a changing alias. Minimal thinking is configured for supported Flash-Lite versions; arbitrary `GEMINI_MODEL` overrides do not receive unsupported thinking-level settings. Detailed questions get a larger output budget. Verify model access before selecting another model. There is no slow fallback chain or duplicate speculative provider requests.

The generation deadline is 15 seconds and covers headers and the streamed body. The server parses split SSE events, suppresses thought parts, and checks completion. Before streaming, failures return JSON with a 502/504 status. During streaming, failures emit an SSE `error` followed by `[DONE]`. Provider error bodies and API keys are not sent to visitors.

Provider throttling and local generation-capacity limits return 503 with `Retry-After`. Token-limited answers emit an explicit truncation error. The browser has a 25-second deadline, rejects interrupted/malformed streams, and requires `[DONE]` before recording an assistant turn. The shared browser SSE reader is regression-tested across every byte split of Unicode/CRLF examples. User turns are recorded even if their requests fail; failed assistant answers are not used as context.

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

The scenario suite also covers the screenshot failures (`eduction`, previous-question recall), mixed topics, unknown/private facts, source facets, pronoun/ordinal references, concurrent request sharing, disconnect cleanup, browser streaming, and the pinned model's thinking configuration. This is regression coverage, not proof of all possible language or guaranteed model correctness. `SHOW_ANSWERS=1` prints the live benchmark answers for manual grounding checks.

Measure time to the **first text event** separately from full completion. Local retrieval removes two remote calls but cannot guarantee 1–2 seconds for novel generated answers. Model load, network distance and function cold starts still matter. Prepared and warm cached answers avoid that dependency. Rate limiting and caching are instance-local, not a distributed abuse-prevention system.
