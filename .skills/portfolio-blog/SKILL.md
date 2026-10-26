---
name: Portfolio Blog
description: Write blog posts in Ahmad Hassan's house voice for this Hugo/PaperMod portfolio (ahmadx.dev). Covers the four distinct post formats this site actually uses: heading-less system-design explainers, dense AWS certification notes, step-by-step build tutorials, and first-person life essays. Use this skill whenever the user asks to write, draft, outline, expand, or generate a blog post, article, note, or essay for this site or this repo — including vague asks like "write about load balancing", "add a system design post", "do the next AWS topic", or "draft something for the blog". Also use it when reviewing or rewriting an existing post for consistency, or when adding front matter, images, tags, or sign-off lines to a post. Do not use it for README/docs updates or non-blog site pages (about, projects, certifications).
---

# Portfolio Blog

This repo publishes at `ahmadx.dev` with Hugo + PaperMod. Posts live in `content/posts/*.md`.

The site has **four different writerly modes**, and they do not resemble each other. Picking the wrong one is the single biggest failure mode, so pick first and write second.

| Mode | Feel | Length | Reference |
|---|---|---|---|
| **System design** | Spoken-word explainer, no headings, no bold | 500–800 words | `references/system-design.md` |
| **AWS / reference notes** | Dense study sheet, headings everywhere | 1,500–6,500 words | `references/aws-notes.md` |
| **Tutorial** | Numbered build-along, copy-pasteable | 600–3,000 words | `references/tutorial.md` |
| **Personal essay** | First-person, literary, no code | 600–800 words | `references/personal.md` |

## Step 1 — Choose the mode

Infer from the topic and the user's wording. Ask only if it is genuinely ambiguous *and* the choice changes the output substantially.

- An architecture or concept explainer (CAP, event-driven, microservices, caching, load balancing, sharding, consistency models) → **system design**
- Anything in the AWS Certified Cloud Practitioner series → **AWS notes**
- "Build X", "deploy X", "set up X", "install X", anything with commands the reader should run → **tutorial**
- Reflection, lessons, feelings, opinion, book notes → **personal**

The system-design mode is the most distinctive and the most likely thing the user means when they say "a blog post". When someone names a distributed-systems concept, default to it unless they say otherwise.

## Step 2 — Read the mode reference, then the shared conventions

Read the one reference for your mode, then always read `references/conventions.md`. The conventions file is not optional — it carries the front matter order, image rules, tag vocabulary, and sign-off lines that every mode shares, plus the six defects that are already present in the corpus and must not be copied forward.

Also read `references/voice.md` for the sentence-level habits that hold across all modes. It is short.

Do not read the other three mode references. They will pull the voice in the wrong direction.

## Step 3 — Draft

Use the model posts as your reference points. They are the ground truth:

- System design: `content/posts/cap-theorem.md`, `content/posts/event-driven-architecture.md`, `content/posts/microservice-architecture.md`
- Personal: `content/posts/80-20-rule.md`, `content/posts/forher.md`
- Tutorial: `content/posts/chatbot.md`, `content/posts/sqlServer.md`
- AWS notes: `content/posts/aws-ccp-vpc-networking.md`

Write `content/posts/<slug>.md`. Slug is lowercase kebab-case, descriptive, and does not repeat the series prefix unless it is AWS notes (`aws-ccp-<topic>`).

Set `draft: false` only if the user asked to publish. If they are drafting, or if the post is thin, use `draft: true` — an empty draft with a slug for a title is worse than no file.

## Step 4 — Lint

Always run the checker before reporting back:

```bash
python3 .skills/portfolio-blog/scripts/check-post.py content/posts/<slug>.md --type <mode>
```

Fix every `ERROR`. Fix `WARN` unless doing so would fight the voice — for example, `WARN missing alt text` is worth fixing, but do not add alt text that makes the prose clunky. `--stats` prints the post's metrics next to the mode's target range, which is the fastest way to see if you drifted.

## Step 5 — Report

Tell the user the file path, the mode you chose and why, the word count, and any `WARN`s you deliberately left. Keep it to a few lines.

## What not to do

- Do not invent facts about Ahmad's job, projects, or credentials. If a post needs biographical specifics, read `content/about.md`, `static/llms.txt`, and `content/projects.md` first, and quote only what is there.
- Do not put a `#` H1 in the body. The post title already renders as `<h1>`; a second one breaks the document outline and shows up twice on the page.
- Do not write all four modes into one post. A system design post with a bulleted summary and a code block is no longer a system design post.
- Do not add AI-flavoured filler ("In today's fast-paced world", "Let's dive in", "it's important to note"). The house voice is plain and declarative, and this is its opposite.
