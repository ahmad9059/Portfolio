# Mode: Tutorial / build-along

Modelled on `chatbot.md`, `sqlServer.md`, `setup-mpd-and-rmpc.md`, and the shell-scripting series.

**Target: 600–3,000 words. Numbered `##` steps. Every command copy-pasteable.**

## Structure

The reader should be able to follow without reading ahead. That means each step is self-contained: what you are doing, the command, what you should see.

```markdown
## Step 1: Install the Prerequisites

Before we begin, make sure the following tools are installed on your machine:

1. Install Visual Studio Code ([VS Code](https://code.visualstudio.com)).
2. ...

## Step 2: Set Up the Project Directory

Create a folder named chatbot:

```bash
mkdir chatbot && cd chatbot
```
```

Step titles are imperative and specific: `Install the Prerequisites`, `Store Your API Key`, `Deploy to Vercel`. Not `Prerequisites` alone, not `Step 1` alone.

Two step-titling styles exist and both are fine:
- `## Step 1: Install the Prerequisites` (explicit numbering, used in `chatbot.md`)
- `## What is RMPC?` / `## Install MPD` (topic-named, used in `setup-mpd-and-rmpc.md`)

Pick one per post and hold it.

## Code blocks

- Always fence with the language tag: ` ```bash `, ` ```typescript `, ` ```python `. Bare fences are a defect.
- One idea per fence. Don't stack four commands the reader has to parse.
- Put the expected output in its own fence or as prose right after, never merged into the command block.
- Show the file path before the code that goes in it, as `chatbot.md` does:
  `Open the file:` → `` ```bash /app/api/chat/route.ts ``` `` → the code.

## Caveats, inline

Warnings go where they matter, not in a section at the end:

> *Clean up:* Delete the node_modules folder and .env.local file before uploading to GitHub for security reasons.

Use italics for the label, bold for the emphasis, and keep it to one line. Do not build a "Troubleshooting" section unless the user asks — the posts that have one (`setup-mpd-and-rmpc`) fold it in as short bullets under the relevant step.

## Closing

Tutorials end with a short `## Final Notes` of 2–4 bullets, or the sign-off line `Happy coding! 🚀`. Either is fine; `chatbot.md` uses both.

The notes should point forward, not summarise: keep the key secure, this is a starting point, here is what to build next.

## Anti-patterns

- ❌ A step that says what to do without saying how
- ❌ Placeholder commands that will not run (`npm install <package>` when you know the package)
- ❌ Screenshots of terminals instead of command fences
- ❌ Version-pinned commands you have not verified (check the repo or the vendor docs first)
- ❌ `Happy designing 🖤` — wrong sign-off for this mode
- ❌ Skipping the cleanup/security note when the tutorial touches API keys
