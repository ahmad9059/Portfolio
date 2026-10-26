# Mode: System design explainer

This is the signature format. Modelled on `cap-theorem.md`, `event-driven-architecture.md`, and `microservice-architecture.md`.

**Target: 500–800 words. Zero body headings. Zero bold. Zero bullet lists. Zero code.**

The shape is a person talking through a diagram with a friend. Not a reference doc, not a tutorial, not an article with sections. The absence of headings is the point — it forces the piece to be carried by argument and momentum instead of signposts.

## Why it works

The reader has read the definition of CAP theorem ten times and still can't use it. What they lack is not information but a *situation*. So the post rebuilds the situation: two nodes, a broken cable, a write request, a decision that must be made right now. The abstraction lands because the pressure arrives first.

Every structural choice below exists to serve that. If you find yourself adding a heading "for readability", you have reverted to the thing this format is a reaction against.

## The skeleton

Nine beats. They are not labelled in the output — they run together as continuous prose.

1. **Hook** — one or two sentences. Either a flat announcement (`Let's talk about microservice architecture`) or a contrarian claim (`CAP theorem is one of those ideas everyone knows, but very few actually design with`).
2. **Setup or scenario** — put the reader somewhere concrete. `Imagine you are building an e-commerce platform. A customer places an order.`
3. **The tension question** — address the reader directly and force the dilemma. `Now tell me honestly, should Order Service directly call all these services one by one?`
4. **Diagram walkthrough** — narrate the image left-to-right or top-to-bottom as if pointing. `Now look at the image. On the left, you see multiple Event Producers.` / `Look at the diagram first. Don't read labels yet. Just observe the flow.`
5. **Progressive reveal** — name the move you are making and make it. `Now let's rewind and start from the problem.` `Let's go deeper.` `Now let's ground this with intuition.`
6. **The contrast pair** — every one of these posts is built on a named opposition: consistency vs availability, CP vs AP, tight vs loose coupling, monolith vs microservice, synchronous vs asynchronous. Give each side its honest due.
7. **Honest caveats** — say what the thing costs. `But let's not romanticize it. There are challenges.` `But microservices are not a free lunch.` This beat is what makes the post trustworthy; without it the piece reads like advocacy.
8. **One-line mental model** — compress the whole argument into a parallel or a fragment. `Monoliths optimize for simplicity. Microservices optimize for change.` `Events represent facts, not commands.`
9. **Question back + sign-off** — hand the reader a diagnostic question about their own system, then `Happy designing 🖤`.

## Rhythm — the part that matters most

Measured across the three model posts: **average sentence is 6–9 words**, and paragraphs are clusters of those short sentences (median paragraph 24–41 words). Shortest sentences are one or two words. The longest is a list that got folded into a sentence.

The unit of rhythm is the **sentence**, not the paragraph. Measured paragraph medians are 24–41 words; measured sentence averages are 6–9 words. So a typical paragraph is three to seven short sentences in a row:

```
Assume you're building a distributed system. Not a single server, not a single database. Multiple nodes, multiple machines, talking over a network. The moment you distribute a system, one thing becomes inevitable: things will fail. Machines crash. Networks slow down. Packets get lost. You don't get to opt out of this.
```

Notice: fragments are fine. `Not a single server, not a single database.` is not a sentence and it is the best line in the paragraph. `Machines crash. Networks slow down. Packets get lost.` — three punches where a writer with less nerve would have written one long clause about failure modes.

Paragraph lengths across the model posts range from 3 words to 88, median ~25–30. The very short ones are deliberate beats that land a turn in the argument:

```
Now CAP enters the picture.
```

```
Same distributed reality. Different business priorities.
```

Use a one-line paragraph at a pivot — three or four per post, not ten. Everything else runs 20–50 words. `event-driven-architecture` runs longest (median 41) because it is doing a component inventory; that is the ceiling, not the target.

## Punctuation habits

- **Colons, heavily.** 8–19 per post. They introduce definitions and inline lists: `Consistency: every read sees the latest written data`. This is the main structural device replacing headings.
- **No em dashes.** Measured zero across all three posts. Reach for a colon, a comma, or a full stop instead.
- **No semicolons.** Measured zero.
- **One exclamation mark per post, at most.**
- Straight apostrophes and quotes. (`cap-theorem.md` uses curly ones; that is an inconsistency, not the rule.)
- Emoji only at the sign-off.

## Reader address

Second person, present tense, active. `you` appears 2–8 times per post. Rhetorical questions appear 0–8 times; `event-driven-architecture` uses eight and it is the liveliest of the three. The questions are not decoration — they stand in for the reader's objection at exactly the moment it would form.

`Now let me ask you something.` is a recurring hinge. Use it once or twice, not five times.

## Anti-patterns

- ❌ `## What is CAP Theorem` — no headings
- ❌ `- **Consistency**: ...` — no bold, no bullets
- ❌ A summary section at the end that repeats the post
- ❌ Hedging (`it can be argued that`, `in some cases this may potentially`)
- ❌ Explaining the same idea twice in different words to pad length
- ❌ A definition-first opening. The reader already knows the definition. Lead with the situation.
- ❌ Metrics you cannot source. Talk in orders of magnitude or in mechanism, not invented latencies.

## Diagram handling

Every one of these posts has a hero image directly under the front matter, and the post *talks about it*. The image is not decoration; it is a prop the prose points at.

Practically: reference the diagram by position (`on the left`, `in the center`, `at the bottom`) and translate each visual element into a responsibility. `In the center, you see Event Broker. This could be Kafka, RabbitMQ, Service Bus. Think of it as a central nervous system.` That last sentence is the move — name the real technology, then give an analogy the reader already has.

If you have no image, the post still works: describe the topology verbally in the same left-to-right order, and say what you would draw.
