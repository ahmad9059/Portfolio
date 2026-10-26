# Shared conventions

Applies to every mode. Read this after the mode reference.

## Table of contents
- [Front matter](#front-matter)
- [Images](#images)
- [Tags and categories](#tags-and-categories)
- [Sign-offs](#sign-offs)
- [Existing defects — do not copy](#existing-defects--do-not-copy)
- [Fact-checking](#fact-checking)

---

## Front matter

Exact key order. This is what 39 of 42 posts use:

```yaml
---
title: CAP Theorem
draft: false
date: 2026-02-15
description: One sentence, under 160 characters, that states what the reader gets.
categories:
  - tech
tags:
  - tech
  - system-design
Author: Ahmad Hassan
---
```

- `title` — plain, no quotes needed unless it contains `:` or starts with a special character. Title Case for system design and AWS; sentence case is fine for tutorials.
- `draft` — `false` to publish, `true` while incomplete. Never leave `draft: true` on an empty file.
- `date` — `YYYY-MM-DD`, unquoted, no time component.
- `description` — **required and must be non-empty.** Three existing posts leave it blank and it silently degrades SEO. Under 160 characters or it truncates in search results.
- `categories` — see below.
- `tags` — see below.
- `Author` — capital `A`, `Ahmad Hassan`. Two older posts use lowercase `author`; do not follow them.

Optional keys used elsewhere: `slug`, `keywords`, `searchHidden`, `layout`, `hideMeta`. Only add them with a reason.

## Images

**Every image path must start with `/`.** A relative path resolves against the post URL and 404s. This is the most common defect in the corpus — five images are broken this way right now.

```markdown
![alt text](/posts/assets/system-design/consistent-hashing.webp)
```

- Post images live in `content/posts/assets/<topic>/` and are served at `/posts/assets/<topic>/<file>.webp`.
- Site-wide images live in `static/assets/` and are served at `/assets/<file>`.
- Use `.webp`. The corpus has `.png` refs pointing at `.webp` files — eight broken images from this alone.
- **Give every image alt text.** 171 of 197 images currently have `![]()` with nothing inside. Describe what the diagram shows: `![CAP theorem tradeoff under network partition]`.
- Hero image goes on the line directly below the front matter, in system-design and personal modes only.

**Never use the `|WxH` sizing syntax** (`![|715x436](/posts/assets/img-6.webp)`). It does not resize the image here — the render hook passes it through as the literal `alt` attribute, so the page shows `alt="|715x436"` and screen readers read the dimensions aloud. Size images before saving, or let CSS (`max-width: 100%`) handle it.

## Tags and categories

`categories` is the broad bucket, 1–2 values, drawn from: `tech`, `web`, `life`, `system-design`, `urdu`.

`tags` is the specific vocabulary. Keep to what already exists so the taxonomy does not fragment further:

```
tech  web  cloud  aws  certification  system-design  architecture
database  sql  mysql  javascript  css  html  react  gsap  locomotive
shell  scripting  terminal  ai  computer  productivity  self-improvement
love  thoughts  music
```

Rules:
- **All lowercase.** `Web` and `web` currently build two separate tag pages; `CSS` vs `css` likewise.
- No trailing whitespace.
- No duplicates within a post.
- Do not add a near-synonym when a term already exists (`laptops` → use `computer`).

## Sign-offs

| Mode | Closing line |
|---|---|
| System design | `Happy designing 🖤` |
| Tutorial | `Happy coding! 🚀` and/or a `## Final Notes` block |
| AWS notes | none — end on the last substantive section |
| Personal | none — end on the last line of prose |

Use one per post. Do not stack.

## Existing defects — do not copy

The corpus has real problems. When you touch a post, fix them; when you write a new one, avoid them.

1. **Empty `description:`** — 3 posts. Always fill it.
2. **`![]()` with no alt** — 171 images. Always write alt text.
3. **`.png` refs to `.webp` files** — `mysql.md` (7 refs), `reactjs.md` (1). Use the real extension.
4. **Relative image paths** — `css.md` (3), `mysql.md` (2). Always leading `/`.
5. **Duplicate H1** — 7 posts put `# Heading` in the body under an already-`<h1>` title. `fundamentals-of-javascript` does it 15 times. Use `##`.
6. **Nested bold** — `**` rendered literally in `web-dev-roadmap.md`, `css.md`, `asynchronous-js.md`. Do not bold text that is already inside bold or inside backticks.
7. **Leftover vault paths** — `shell-operation-shell-scripting.md` still points at `/1-Notes/Shell%20Scripting/assets/...`, which does not exist. Never write paths outside `static/` or `content/posts/assets/`.
8. **Tag casing** — see above.

## Fact-checking

- Version numbers, CLI flags, and API shapes must be verified before publishing. Check the vendor docs or the repo, not memory.
- Do not invent benchmarks, latencies, or "studies show". If a number is not sourced, talk about mechanism instead.
- Biographical claims: read `content/about.md`, `content/projects.md`, and `static/llms.txt` first and use only what is there.
