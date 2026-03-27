# Portfolio Project — Context Reference

**Site:** https://ahmadx.dev  
**Owner:** Ahmad Hassan — Software Engineer & Full Stack Developer, Pakistan  
**Employer:** VieroMind  
**Education:** MNS University of Agriculture, Multan  

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Static site generator | Hugo 0.140.2 (extended) |
| Theme | PaperMod (vendored, heavily customized) |
| Frontend | Vanilla HTML / CSS / JS — zero framework |
| Fonts | JetBrains Mono + Work Sans (Google Fonts, non-render-blocking) + Noto Nastaliq Urdu (self-hosted) |
| Client search | Fuse.js 7.0.0 (lazy CDN load) |
| AI chat backend | Node.js Vercel Serverless Functions |
| AI text generation | Google Gemini (`gemini-2.5-flash` → `gemini-2.5-flash-lite` fallback) |
| AI embeddings | `gemini-embedding-001` (3072 dimensions) |
| Vector DB | Pinecone (serverless, `portfolio-rag` index, `ahmad-knowledge` namespace) |
| Deployment | Vercel |
| Analytics | Google Analytics `G-2GLY0PDB4W` |
| Build command | `hugo --gc --minify` |

---

## Directory Structure

```
Portfolio/
├── hugo.yaml                    # Master Hugo config (menus, params, SEO, theme)
├── vercel.json                  # Vercel build config + API rewrites
├── dev-server.js                # Local Node.js API dev server (port 3001)
├── quickScript.sh               # Obsidian vault sync → git push automation
├── .env                         # Local env vars: GEMINI_API_KEY, PINECONE_API_KEY
│
├── content/                     # All site content (Markdown)
│   ├── about.md
│   ├── projects.md              # Embeds raw HTML/CSS — project card grid
│   ├── certifications.md        # Embeds raw HTML/CSS — tabbed gallery + modal zoom
│   ├── tools.md
│   ├── contact.md
│   ├── chat.md                  # Uses chat.html layout
│   ├── search.md                # Uses search.html layout
│   └── posts/                   # 43 blog posts (see Blog Posts section)
│
├── layouts/
│   ├── _default/
│   │   ├── baseof.html          # Base template
│   │   ├── chat.html            # Full chat UI (766 lines — HTML + CSS + JS)
│   │   ├── search.html          # Search page layout
│   │   ├── terms.html           # Tag listing with SVG category icons
│   │   ├── sitemap.xml          # Custom sitemap template
│   │   └── _markup/             # Goldmark render hooks
│   └── partials/
│       ├── extend_head.html     # JSON-LD schemas + Twitter meta + Google Fonts
│       ├── extend_footer.html   # Search modal + Fuse.js + API warmup script
│       ├── header.html          # Site header override (theme toggle + hamburger)
│       ├── footer.html          # Site footer override
│       ├── head.html            # Head override
│       └── templates/           # Additional partials
│
├── assets/css/
│   ├── core/
│   │   ├── theme-vars.css       # shadcn/ui-inspired CSS custom properties (light + dark)
│   │   ├── reset.css
│   │   └── zmedia.css
│   ├── common/                  # Page-level styles
│   │   ├── main.css             # Layout wrapper, pagination, code copy button
│   │   ├── header.css           # Nav, logo, hamburger, responsive breakpoint
│   │   ├── footer.css
│   │   ├── post-single.css      # Blog post page styles
│   │   ├── post-entry.css       # Blog post list card styles
│   │   ├── archive.css
│   │   ├── search.css
│   │   ├── profile-mode.css
│   │   ├── terms.css
│   │   └── 404.css
│   ├── extended/
│   │   ├── code-light.css       # Light-mode syntax highlight overrides + language label
│   │   ├── urdu-font.css        # Noto Nastaliq Urdu typography
│   │   └── blank.css            # Stub for extra overrides
│   └── includes/
│       ├── bg-pattern.css       # Background grid pattern
│       ├── scroll-bar.css
│       ├── chroma-styles.css    # Hugo syntax highlight base
│       └── chroma-mod.css
│
├── static/                      # Served as-is (no Hugo processing)
│   ├── Ahmad-Hassan-Resume.pdf
│   ├── assets/                  # Images (profile, projects, certs), favicons
│   ├── llms.txt                 # LLM-readable site description (full knowledge base)
│   └── *.svg                    # check, copy, globe, heart, laptop, sprout icons
│
├── api/                         # Vercel serverless functions
│   ├── chat.js                  # Main RAG handler (467 lines)
│   ├── health.js                # Health check
│   ├── ping.js                  # Ping endpoint
│   ├── upload-to-pinecone.js    # One-time script: create index + batch upload embeddings
│   ├── knowledge.json           # Knowledge chunks (metadata — gitignored or large)
│   ├── embeddings.json          # Pre-computed 3072-dim vectors (gitignored or large)
│   ├── package.json             # Only dependency: @pinecone-database/pinecone ^3.0.3
│   └── README.md                # RAG architecture + Pinecone setup guide
│
├── scripts/
│   └── import-aws-articles.sh   # Batch-import AWS CCP notes from temp/
│
├── themes/PaperMod/             # Vendored theme (no git submodule)
├── temp/                        # Raw Obsidian notes (not published)
├── archetypes/default.md        # Default front matter for `hugo new`
├── resources/                   # Hugo resource cache
└── public/                      # Generated site output (after build)
```

---

## Hugo Configuration (`hugo.yaml`)

```yaml
baseURL: "https://ahmadx.dev"
title: Ahmad Hassan
theme: PaperMod
defaultTheme: auto          # respects system light/dark preference
googleAnalytics: "G-2GLY0PDB4W"
markup.goldmark.renderer.unsafe: true   # allows raw HTML in Markdown
highlight.style: dracula                # dark code theme (overridden for light mode)
outputs.home: [HTML, RSS, JSON]         # JSON powers Fuse.js search index
```

**Extra CSS loaded** (via `params.assets.css`):
- `css/extended/urdu-font.css`
- `css/extended/code-light.css`

**Menu items** (in order): About → Projects → Certs → Blog → Contact → Chat → Search

**Profile mode** (homepage): name, subtitle, profile image (`/assets/profile-1.webp`), buttons: blogs / tools / resume

**Social icons**: GitHub (`ahmad9059`), LinkedIn (`ahmad9059`), X (`ahmad9059x`), LeetCode (`ahmad9059`), Instagram (`ahmad9059x`), Email (`hi@ahmadx.dev`)

---

## Vercel Configuration (`vercel.json`)

```json
{
  "build": { "env": { "HUGO_VERSION": "0.140.2", "GO_VERSION": "1.20.6" } },
  "buildCommand": "hugo --gc --minify",
  "rewrites": [
    { "source": "/api/chat",   "destination": "/api/chat.js" },
    { "source": "/api/health", "destination": "/api/health.js" },
    { "source": "/api/ping",   "destination": "/api/ping.js" },
    { "source": "/personal",   "destination": "/api/personal.js" }
  ]
}
```

**Note:** `vercel.json` currently has a syntax duplication bug (the file has two root objects). The first block is the active one.

---

## Pages Reference

| Route | Source File | Layout | Notes |
|---|---|---|---|
| `/` | Hugo profile mode | profile | Homepage with profile card + social icons + hero buttons |
| `/about/` | `content/about.md` | default | Bio, experience, open source, competitive programming |
| `/projects/` | `content/projects.md` | default | Raw HTML grid — 7 project cards |
| `/certifications/` | `content/certifications.md` | default | Raw HTML — tabbed gallery with modal zoom |
| `/tools/` | `content/tools.md` | default | Daily tooling writeup |
| `/contact/` | `content/contact.md` | default | Contact information |
| `/chat/` | `content/chat.md` | `chat.html` | Full AI chat interface |
| `/search/` | `content/search.md` | `search.html` | Fuse.js powered search |
| `/posts/` | `content/posts/*.md` | default | Blog listing + 43 articles |
| `/api/chat` | `api/chat.js` | serverless | RAG chat endpoint |
| `/api/health` | `api/health.js` | serverless | Health check |
| `/api/ping` | `api/ping.js` | serverless | Ping endpoint |

---

## CSS Architecture

### Token System (`assets/css/core/theme-vars.css`)

shadcn/ui-inspired CSS custom properties — full light and dark token sets.

**Light mode key tokens:**
```css
--background: #ffffff;   --foreground: #0a0a0a;
--card: #ffffff;         --primary: #18181b;
--muted: #f4f4f5;        --muted-foreground: #71717a;
--border: #e4e4e7;       --secondary: #f4f4f5;
--accent: var(--chart-1) /* #ea580c — orange */
--radius: 0.625rem;
```

**Dark mode key tokens (`.dark` class):**
```css
--background: #0a0a0a;   --foreground: #fafafa;
--card: #0a0a0a;         --primary: #fafafa;
--muted: #18181b;        --muted-foreground: #a1a1aa;
--border: #27272a;       --secondary: #27272a;
--accent: var(--chart-1) /* #1d4ed8 — blue */
```

**Legacy bridge vars** (keeps PaperMod internals working):
```css
--theme: var(--background);
--entry: var(--card);
--tertiary: var(--muted);
--content: var(--foreground);
```

**Layout vars:**
```css
--gap: 24px;  --content-gap: 20px;
--nav-width: 1024px;  --main-width: 720px;
--header-height: 60px;  --footer-height: 60px;
```

### Theme Toggle Logic

Stored in `localStorage` as `pref-theme` (`"dark"` | `"light"`). Falls back to `prefers-color-scheme`. Toggled by clicking the moon/sun button. Handled inline in `layouts/partials/header.html` before first paint.

### Responsive Breakpoints

- `768px` — hamburger menu activates, nav collapses into vertical dropdown
- `600px` — chat message bubbles expand to 92% width

### Code Block Styling (`assets/css/extended/code-light.css`)

- Light mode bg: `#eef0f3`, border: `#dee2e6`
- Language label shown top-right, fades on hover to reveal copy button
- Syntax colors (light): comments `#6a737d`, keywords `#d73a49`, strings `#0a6640`, names `#6f42c1`, numbers `#005cc5`
- Dark mode uses Hugo's built-in Dracula theme

---

## AI Chat System (`api/chat.js`)

### Architecture Flow

```
POST /api/chat  { message, history[] }
        │
        ├─ CORS + OPTIONS handling
        ├─ Rate limit check (10 req/min per IP, in-memory Map)
        │
        ├─ [Greeting shortcut] ─────────────────────────────────────┐
        │   matches: hi/hello/hey/hii/hola/howdy                    │
        │   → skip embedding + retrieval                             │
        │   → callGemini (non-streaming) → simulate word-by-word SSE │
        │   → return immediately                                     ┘
        │
        ├─ buildEnhancedQuery (resolves follow-up fragments against history)
        │
        ├─ getQueryEmbedding (Gemini embedding-001, 3072-dim)
        │   └─ embeddingCache (LRU 100 entries, 30-min TTL)
        │
        ├─ initPinecone (lazy, once per cold start)
        │
        ├─ retrievePinecone (topK=5, cosine, namespace: ahmad-knowledge)
        │   └─ queryResultCache (LRU 50 entries, 10-min TTL, key = first 100 chars)
        │
        ├─ buildSystemPrompt (injects context chunks + persona instructions)
        │
        ├─ sanitizeHistory (last 4 messages, truncate assistant to 80 chars)
        │
        └─ callGeminiStreaming → SSE stream → res.write chunks → res.end
```

### Key Constants

| Constant | Value |
|---|---|
| `PINECONE_INDEX_NAME` | `"portfolio-rag"` |
| `PINECONE_NAMESPACE` | `"ahmad-knowledge"` |
| `EMBEDDING_MODEL` | `"gemini-embedding-001"` |
| `GEMINI_MODELS` | `["gemini-2.5-flash", "gemini-2.5-flash-lite"]` |
| `RATE_LIMIT_MAX` | `10` requests/minute per IP |
| `EMBEDDING_CACHE_MAX` | `100` entries |
| `EMBEDDING_CACHE_TTL` | `30` minutes |
| `QUERY_CACHE_MAX` | `50` entries |
| `QUERY_CACHE_TTL` | `10` minutes |
| Max message length | `500` characters |
| `maxOutputTokens` | `800` (full query), `200` (greeting) |
| `temperature` | `0.7`, `topP: 0.9`, `topK: 40` |

### System Prompt Persona

- Always responds in first person as Ahmad Hassan
- Conversational, warm, professional
- Focuses exclusively on current question (ignores previous conversation topics)
- Low relevance mode (`topScore < 0.65`): ignores context, redirects politely
- Savage mode for relationship/romantic questions: witty roast (1-2 sentences)
- For greetings: warm, brief, suggests what it can help with
- For off-topic: politely redirects to portfolio content

### SSE Protocol

```
data: {"text": "chunk"}\n\n    (repeated per chunk)
data: [DONE]\n\n               (stream end signal)
data: {"error": "..."}\n\n     (error, if mid-stream)
```

### API Warmup

On every page load (once per session via `sessionStorage.api_warmed`), the footer script sends a silent `POST /api/chat` with `{ message: "hi" }`. Uses the greeting shortcut path — no embedding or retrieval — just warms the Vercel function and Pinecone connection.

---

## Search System

- **Index:** Hugo builds `/index.json` at compile time (via `outputs.home: [JSON]`)
- **Library:** Fuse.js 7.0.0 loaded lazily from CDN on first modal trigger
- **Config:** `keys: ['title'], threshold: 0.3, limit: 6`
- **Keyboard shortcuts:** `Ctrl+K` or `/` (when not in input/textarea) to open, `ESC` to close, arrow keys to navigate, `Enter` to follow link
- **Search nav item** in header calls `openSearchModal()` (onclick, prevents default navigation)

---

## Chat UI (`layouts/_default/chat.html`)

- Full-page layout: hides `.footer`, removes `.main` max-width and padding
- Height: `calc(100vh - var(--header-height, 60px))`
- Three sections (flex column): messages area → suggested questions → input area
- Max content width: `800px` centered

### Markdown Parser (custom, inline in chat.html)

Handles: `## headings`, `### headings`, `- unordered lists`, `1. ordered lists`, `**bold**`, `*italic*`, `` `inline code` ``, `[text](url)` links, paragraph wrapping. Processes line-by-line with HTML escaping before inline formatting.

### Conversation State

- `conversationHistory[]` stored in-memory (page-scoped JS)
- Last 10 messages sent with each request
- Server sanitizes to last 4 messages, truncates assistant messages to 80 chars
- History NOT sent for first message (server treats it as fresh)

### API URL Detection

```js
const API_URL = (hostname === 'localhost' || hostname === '127.0.0.1')
  ? 'http://localhost:3001/api/chat'
  : '/api/chat';
```

---

## Local Development

Two concurrent servers required:

```bash
# Terminal 1 — Hugo static site
hugo server
# → http://localhost:1313

# Terminal 2 — API (reads .env for keys)
node dev-server.js
# → http://localhost:3001/api/chat
#   http://localhost:3001/api/health
```

`dev-server.js` manually parses `.env`, parses POST body JSON, and wraps `http.ServerResponse` in a Vercel-compatible `res` object (`.setHeader`, `.status`, `.json`, `.write`, `.end`, `.headersSent`).

---

## Content Patterns

### Raw HTML in Markdown

`markup.goldmark.renderer.unsafe: true` allows embedding `<style>` blocks and raw HTML directly in `.md` files. Used extensively in:
- `content/projects.md` — project card grid with hover effects
- `content/certifications.md` — tabbed cert gallery with modal image zoom

### Front Matter Conventions

```yaml
---
title: "..."
description: "..."      # used for SEO meta and JSON-LD
keywords: [...]         # page-specific keywords
lastmod: 2025-03-05
showtoc: false          # disable TOC
searchHidden: true      # exclude from search index
ShowShareButtons: false
hideMeta: true
---
```

### Blog Post Front Matter

```yaml
---
title: "..."
date: 2024-01-01
tags: [tag1, tag2]
categories: [tech]
cover:
  image: "/posts/assets/image.webp"
  alt: "..."
---
```

---

## SEO & Structured Data (`layouts/partials/extend_head.html`)

**Robots meta** (production only):
```html
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
```

**Twitter meta:** `@ahmad9059x` for both creator and site.

**JSON-LD schemas injected conditionally:**

| Page condition | Schema type |
|---|---|
| `.IsHome` | `Person` + `WebSite` (with `SearchAction`) |
| `.IsPage` + `.Section == "posts"` | `BlogPosting` |
| `projects.md` | `ItemList` of 7 `SoftwareSourceCode` items |

**Google Fonts loading strategy:** `rel="preconnect"` + `rel="preload" as="style"` + `media="print" onload="this.media='all'"` + `<noscript>` fallback — prevents render blocking.

---

## Projects

| # | Name | URL | GitHub | Stack |
|---|---|---|---|---|
| 1 | HyprFlux | hyprflux.dev | ahmad9059/HyprFlux | Linux, Arch, Hyprland, Waybar, Shell, CSS |
| 2 | SehatScan | sehatscan.vercel.app | ahmad9059/SehatScan | Python, Next.js, TS, AWS, Redis, PostgreSQL, Prisma, Gemini |
| 3 | HisaabScore | hisaabscore.vercel.app | ahmad9059/HisaabScore | Next.js, TS, Tailwind, Firebase, Genkit, Gemini 2.0, Prisma |
| 4 | RAF-SP | raf-sp.vercel.app | — | Next.js, TS, Tailwind, Prisma, Supabase, shadcn/ui, Framer Motion |
| 5 | UAM Tracker | uam-tracker.vercel.app | ahmad9059/UamTracker | Next.js, TS, Tailwind, Prisma, PostgreSQL, Better Auth, Recharts |
| 6 | MindOasis | mindoasis.vercel.app | ahmad9059/MindOasis | Next.js, TS, Tailwind, shadcn/ui, Firebase Genkit, Gemini |
| 7 | CodingHawks | codinghawks.vercel.app | ahmad9059/codinghawks | Next.js, TS, Tailwind, Prisma, Supabase, shadcn/ui |

---

## Blog Posts (43 total)

### AWS CCP Series (18 posts)
`aws-ccp-cloud-computing`, `aws-ccp-iam-identity-and-access-management`, `aws-ccp-ec2-elastic-compute-cloud`, `aws-ccp-ec2-instance-storage`, `aws-ccp-elb-asg-elastic-load-balancing-auto-scaling-groups`, `aws-ccp-amazon-s3`, `aws-ccp-databases-analytics`, `aws-ccp-other-compute-services-ecs-lambda-batch-lightsail`, `aws-ccp-deployments-managing-infrastructure-at-scale`, `aws-ccp-leveraging-the-aws-global-infrastructure`, `aws-ccp-cloud-integrations`, `aws-ccp-cloud-monitoring`, `aws-ccp-vpc-networking`, `aws-ccp-security-compliance`, `aws-ccp-machine-learning`, `aws-ccp-account-management-billing-support`, `aws-ccp-advanced-identity`, `aws-ccp-other-services`

### Web Development (11 posts)
`html`, `css`, `tailwind-css`, `Fundamentals-of-JavaScript`, `javascript-advanced`, `dom-js`, `asynchronous-js`, `reactjs`, `gsap-locomotive`, `web-dev-roadmap`, `chatbot`

### System Design (3 posts)
`cap-theorem`, `event-driven-architecture`, `microservice-architecture`

### Databases (2 posts)
`mysql`, `sqlServer`

### Shell Scripting & Linux (6 posts)
`intro-to-shell-scripting`, `variable-in-shell-scripting`, `shell-expansion`, `shell-operation-shell-scripting`, `setup-mpd-and-rmpc`, `vmware-archlinux-installation`

### Other (3 posts)
`80-20-rule`, `forher`, (+ any unlisted)

---

## Certifications (21)

AWS Certified Cloud Practitioner, AWS Introduction to Generative AI, Meta Front-End Developer, Meta Database Structures and Management with MySQL, Meta Introduction to Databases, Meta Programming with JavaScript, Google Agile Project Management, Google Cloud Digital Leader, Google Python, Google Data Analytics, Google Git and GitHub, GitHub Foundations, IBM DevOps, IBM Software Engineering, IBM Critical Thinking, HackerRank SQL Intermediate, HackerRank Problem Solving, Harvard CS50x Puzzle Day, UC Davis Critical Thinking Skills, DeepLearning.AI AI For Everyone, UC Berkeley CALICO Spring '25

---

## Key Achievements

- Ranked **#92 worldwide / #2 in Pakistan** at UC Berkeley CALICO Spring '25
- **2,000+** GitHub contributions in 2025
- **HyprFlux** — 800+ GitHub stars
- Full-time offer at **VieroMind**
- 2nd place at **Pakathon**
- 1st place at **Maktab-e-Gulab** competition
- 1st place at **Cybersecurity Workshop**
- 3rd place at **Speed Programming** competition
- 400+ problems solved on LeetCode and GeeksforGeeks

---

## Personal Details (used by AI persona)

- **DOB:** July 4, 2005
- **From:** Pakistan
- **Hobbies:** Book reading, chess, finance
- **Books read:** 70+ (self-improvement + technical)
- **Setup:** Dell XPS 15, Arch Linux, Neovim, Hyprland, Zsh
- **Email:** hi@ahmadx.dev

---

## Environment Variables

| Variable | Where Used |
|---|---|
| `GEMINI_API_KEY` | `api/chat.js` — Gemini generation + embeddings |
| `PINECONE_API_KEY` | `api/chat.js` — vector store queries |

Local: stored in `.env` at project root, parsed manually by `dev-server.js`.  
Production: set in Vercel Dashboard → Project → Settings → Environment Variables.

---

## Pinecone Setup (one-time)

```bash
cd api
npm install
node upload-to-pinecone.js
```

Creates serverless index `portfolio-rag` (3072 dims, cosine metric, AWS us-east-1), uploads `knowledge.json` + `embeddings.json` in batches of 100, stores in namespace `ahmad-knowledge`. Metadata per vector: `category`, `title` (≤200 chars), `content` (≤7000 chars).

---

## Content Automation

**`quickScript.sh`** — syncs posts from Obsidian vault via `rsync`, then `git add . && git commit && git push`  
**`scripts/import-aws-articles.sh`** — batch imports AWS CCP notes from `temp/1-Notes/AWS Certified Cloud Practitioner/` into `content/posts/`

---

## Static Assets (`static/assets/`)

- `profile-1.webp` — profile photo (used in homepage, chat avatar)
- `opengraph.webp` — OG/Twitter card image
- `fav.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` — favicons
- `projects/` — project screenshots (hyprflux, sehatscan, hisaabscore, raf-sp, uam-tracker, mindosis, codinghawks)
- `certs/` — certification images

**SVG icons in `static/`:** `check.svg`, `copy.svg`, `globe.svg`, `heart.svg`, `laptop.svg`, `sprout.svg`

---

## Known Issues / Notes

1. **`vercel.json` duplicate root** — the file has two JSON root objects (syntax error). The second block's rewrites differ slightly (`/install` instead of `/api/ping`). Needs cleanup.
2. **`api/knowledge.json` and `api/embeddings.json`** — large files, likely gitignored. Must be present locally and re-uploaded to Pinecone when knowledge changes.
3. The chat page hides the site footer entirely (`display: none !important`) and overrides `.main` constraints to allow full-viewport layout.
4. The search nav item doesn't navigate to `/search/` — it calls `openSearchModal()` via `onclick` and `event.preventDefault()`.
