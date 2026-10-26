# Test cases

Three realistic prompts, one per main mode. Run them to check the skill picks the
right mode and lands the voice.

## Case 1 — `system-design-load-balancing`

**Prompt:**
> write a blog post about load balancing for my site

**Mode expected:** system-design

**What good looks like:**
- 500–800 words, no `##` headings, no bold, no bullets, no code
- Opens with a situation or a flat announcement — not a definition of load balancing
- Walks a diagram verbally, or says what it would draw
- Has a named contrast (round-robin vs least-connections, or L4 vs L7, or health checks vs blind rotation)
- Concedes a real cost
- Ends with a diagnostic question and `Happy designing 🖤`
- Sentence average ≤ 10.5 words
- Valid front matter with non-empty description and lowercase tags
- Linter exits 0

**Common failure:** drifting into a tutorial with an nginx config block, or adding
`## What is Load Balancing` at the top.

## Case 2 — `system-design-caching`

**Prompt:**
> add a system design post about caching strategies, the site is missing one

**Mode expected:** system-design

**What good looks like:**
- Correctly treats this as the site's signature format, not a reference sheet
- Distinguishes the strategies (cache-aside, write-through, write-behind) through
  narration rather than a comparison table
- Mentions the invalidation problem as the honest caveat
- Slug is `caching-strategies` or similar, kebab-case, no series prefix
- Linter exits 0

**Common failure:** producing an AWS-notes-style bulleted comparison because the
topic has enumerable variants.

## Case 3 — `aws-notes-sqs`

**Prompt:**
> do the next AWS CCP topic, SQS and messaging

**Mode expected:** aws

**What good looks like:**
- Filename `content/posts/aws-ccp-sqs-messaging.md`
- Opens directly with a `##` heading — no introduction paragraph
- Dense: bold terms, bullets, pipe tables, `---` separators
- Exam-relevant specifics present (visibility timeout, standard vs FIFO, at-least-once delivery, 256 KB message limit)
- No sign-off line
- Linter exits 0

**Common failure:** writing it as a smooth essay, or omitting the hard numbers
that are the whole point of the format.

## Case 4 — `ambiguous-topic-chooses-mode`

**Prompt:**
> write something about docker

**Mode expected:** ambiguous — should ask, or pick `tutorial` and say why

**What good looks like:**
- Does not silently publish a 6,000-word reference sheet
- Either asks which direction (concept explainer / setup walkthrough / exam notes)
  or commits to one and states the reason in the report
- Whatever it writes passes the linter for its chosen mode

**Common failure:** guessing `aws` because Docker appears in
`aws-ccp-other-compute-services-ecs-lambda-batch-lightsail.md`.

## Case 5 — `negative-copy-defects`

**Prompt:**
> write a short post about sharding and add a diagram from my Obsidian vault

**Mode expected:** system-design

**What good looks like:**
- Does **not** emit `![|715x436](...)`, a relative path, an empty `![]()`, or a
  `/1-Notes/...` vault path
- Either places the image at `/posts/assets/system-design/sharding.webp` and says
  the file needs to go there, or asks for the image
- Linter exits 0 (a missing file is an error, so it must tell the user rather than
  ship a broken path)
