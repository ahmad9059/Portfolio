#!/usr/bin/env python3
"""Lint a portfolio blog post against this site's conventions.

Usage:
    python3 check-post.py content/posts/slug.md --type system-design
    python3 check-post.py content/posts/slug.md --type aws --stats
    python3 check-post.py content/posts/*.md                # infer type per post

Exit code 0 = no errors (warnings may still be present).
Exit code 1 = at least one error.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import sys
from dataclasses import dataclass, field

# .skills/portfolio-blog/scripts/check-post.py -> repo root
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))

TAG_VOCAB = {
    "tech", "web", "cloud", "aws", "certification", "system-design",
    "architecture", "database", "sql", "mysql", "javascript", "css", "html",
    "react", "gsap", "locomotive", "shell", "scripting", "terminal", "ai",
    "computer", "productivity", "self-improvement", "love", "thoughts", "music",
}

CATEGORIES = {"tech", "web", "life", "system-design", "urdu"}

# Range of (min, max) words per mode, plus a soft target band.
MODES = {
    "system-design": {"words": (420, 950), "headings": (0, 0), "bold": (0, 0)},
    "aws": {"words": (900, 7000), "bold_min_per_100w": 3.0},
    "tutorial": {"words": (400, 3500)},
    "personal": {"words": (350, 2200)},
}

AI_PHRASES = [
    "in today's fast-paced", "in today's world", "let's dive in", "let's dive",
    "buckle up", "game-changer", "game changer", "delve into", "dive deep",
    "it's important to note", "it is important to note", "worth noting",
    "in the ever-evolving", "ever-evolving landscape", "seamless",
    "robust solution", "unlock the power", "harness the power of",
    "at the end of the day", "when it comes to",
]

HEDGES = ["it could be argued", "arguably", "in some cases it may",
          "it may potentially", "one could argue", "there is no denying"]


@dataclass
class Issue:
    level: str  # ERROR | WARN
    msg: str


@dataclass
class Result:
    path: str
    mode: str = ""
    issues: list = field(default_factory=list)
    stats: dict = field(default_factory=dict)

    def err(self, msg):
        self.issues.append(Issue("ERROR", msg))

    def warn(self, msg):
        self.issues.append(Issue("WARN", msg))

    @property
    def errors(self):
        return [i for i in self.issues if i.level == "ERROR"]

    @property
    def warnings(self):
        return [i for i in self.issues if i.level == "WARN"]


def split_front_matter(text: str):
    """Return (fm_lines, body, has_front_matter)."""
    if not text.startswith("---"):
        return [], text, False
    parts = text.split("---", 2)
    if len(parts) < 3:
        return [], text, False
    return parts[1].splitlines(), parts[2], True


def parse_list(fm_lines, key):
    out, active = [], False
    for line in fm_lines:
        if re.match(rf"^{key}\s*:", line):
            active = True
            rest = line.split(":", 1)[1].strip()
            if rest:
                out.extend(x.strip() for x in re.split(r"[,\[\]]", rest) if x.strip())
            continue
        if active:
            m = re.match(r"^\s+-\s*(.*)$", line)
            if m:
                out.append(m.group(1).strip())
            elif line.strip() and not line.startswith((" ", "\t")):
                active = False
    return out


def get_scalar(fm_lines, key):
    for line in fm_lines:
        m = re.match(rf"^{key}\s*:\s*(.*)$", line)
        if m:
            v = m.group(1).strip()
            return v.strip('"').strip("'")
    return None


def infer_mode(path, title):
    name = os.path.basename(path).lower()
    if name.startswith("aws-ccp"):
        return "aws"
    blob = f"{name} {title or ''}".lower()
    if any(k in blob for k in ("cap-theorem", "system-design", "architecture",
                               "microservice", "event-driven", "sharding",
                               "load-balanc", "consisten", "caching")):
        return "system-design"
    return ""


def count_code_fences(body):
    return len(re.findall(r"^\s*```", body, re.M))


def strip_code(body):
    """Remove fenced blocks and inline code so prose checks ignore them."""
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    body = re.sub(r"`[^`\n]*`", "", body)
    return body


def check(path, mode):
    res = Result(path=path)
    try:
        text = open(path, encoding="utf-8").read()
    except OSError as e:
        res.err(f"cannot read file: {e}")
        return res

    fm, body, has_fm = split_front_matter(text)
    if not has_fm:
        res.err("missing YAML front matter")
        return res

    res.mode = mode
    title = get_scalar(fm, "title")
    prose = strip_code(body)
    words = len(prose.split())

    # ---- front matter -------------------------------------------------
    if not title:
        res.err("missing title")
    elif title == os.path.basename(path)[:-3]:
        res.warn("title is the raw filename slug — give it real words")

    draft = get_scalar(fm, "draft")
    if draft not in ("true", "false"):
        res.err(f'draft must be true or false (got {draft!r})')

    date = get_scalar(fm, "date")
    if not date:
        res.err("missing date")
    elif not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        res.err(f"date must be YYYY-MM-DD (got {date!r})")

    desc = get_scalar(fm, "description")
    if desc is None:
        res.err("missing description")
    elif not desc.strip():
        res.err("description is empty — it feeds meta tags and post previews")
    elif len(desc) > 160:
        res.warn(f"description is {len(desc)} chars; SERPs truncate past 160")

    has_author = any(re.match(r"^Author\s*:", l) for l in fm)
    has_author_lower = any(re.match(r"^author\s*:", l) for l in fm)
    if has_author_lower and not has_author:
        res.warn("use `Author` (capital A) — 39 of 42 posts do")
    elif not has_author:
        res.err("missing `Author: Ahmad Hassan`")

    # key order (the site's convention)
    order = ["title", "draft", "date", "description", "categories", "tags", "Author"]
    seen = []
    for line in fm:
        m = re.match(r"^([A-Za-z_]+)\s*:", line)
        if m and m.group(1) in order and m.group(1) not in seen:
            seen.append(m.group(1))
    expected = [k for k in order if k in seen]
    if seen != expected:
        res.warn(f"front matter key order is {seen}; convention is {expected}")

    # ---- tags / categories --------------------------------------------
    cats = parse_list(fm, "categories")
    tags = parse_list(fm, "tags")
    if not cats:
        res.err("no categories")
    for c in cats:
        if c not in CATEGORIES:
            res.warn(f"unknown category {c!r} (known: {sorted(CATEGORIES)})")
        if c != c.lower():
            res.err(f"category {c!r} is not lowercase")
    if not tags:
        res.err("no tags")
    for t in tags:
        if t != t.strip():
            res.err(f"tag {t!r} has trailing whitespace")
        if t and t != t.lower():
            res.err(f"tag {t!r} is not lowercase — splits the taxonomy")
        if t.lower() not in TAG_VOCAB:
            res.warn(f"tag {t!r} is new; existing vocab is in references/conventions.md")
    dupes = {t for t in tags if tags.count(t) > 1}
    if dupes:
        res.err(f"duplicate tags: {sorted(dupes)}")

    # ---- headings -----------------------------------------------------
    if re.search(r"^#\s+\S", prose, re.M):
        n = len(re.findall(r"^#\s+\S", prose, re.M))
        res.err(f"{n} H1 heading(s) in body — the title already renders as <h1>; use ##")

    h2 = len(re.findall(r"^##\s+\S", prose, re.M))

    # ---- images -------------------------------------------------------
    img_re = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)")
    for alt, src in img_re.findall(body):
        if src.startswith(("http://", "https://")):
            continue
        if src.startswith("|") or "|" in alt:
            res.err(f"`|WxH` sizing syntax in {src} — it leaks into the alt attribute")
        if not src.startswith("/"):
            res.err(f"relative image path {src!r} — resolves against the post URL and 404s")
        elif src.startswith("/posts/assets/"):
            if not os.path.exists(os.path.join(REPO, "content", src.lstrip("/"))):
                res.err(f"image not found: content{src}")
        elif src.startswith("/assets/") or src.startswith("/fonts/"):
            if not os.path.exists(os.path.join(REPO, "static", src.lstrip("/"))):
                res.err(f"image not found: static{src}")
        elif src.startswith("/1-Notes/") or src.startswith("/posts/../"):
            res.err(f"vault path {src!r} — move the file into content/posts/assets/")
        if not alt.strip():
            res.warn(f"image has no alt text: {src}")

    # ---- narrative links (skip anchors & code) -------------------------
    link_re = re.compile(r"(?<!!)\[[^\]]*\]\((/[^)\s]+)\)")
    for target in link_re.findall(prose):
        base = target.split("#")[0].split("?")[0]
        if not base or base.startswith(("/api/", "/cdn-cgi/")):
            continue
        cands = [
            os.path.join(REPO, "static", base.lstrip("/")),
            os.path.join(REPO, "content", base.lstrip("/")),
            os.path.join(REPO, "content", base.lstrip("/").rstrip("/") + ".md"),
            os.path.join(REPO, "content", base.lstrip("/"), "index.md"),
            os.path.join(REPO, "content", base.lstrip("/")),
        ]
        if base.startswith("/posts/") and not any(os.path.exists(c) for c in cands):
            res.warn(f"link target not found in repo: {base}")

    # ---- mode-specific -------------------------------------------------
    cfg = MODES.get(mode)
    if cfg:
        lo, hi = cfg["words"]
        if not (lo <= words <= hi):
            res.warn(f"{mode} mode expects {lo}-{hi} words; got {words}")

    if mode == "system-design":
        if h2:
            res.err(f"system-design mode has no headings, but found {h2} `##`")
        bold = len(re.findall(r"\*\*.+?\*\*", prose))
        if bold:
            res.err(f"system-design mode has no bold, but found {bold} `**...**`")
        bullets = len(re.findall(r"^\s*[-*]\s+\S", prose, re.M))
        if bullets:
            res.err(f"system-design mode has no bullet lists, but found {bullets}")
        # banned punctuation
        if "—" in prose:
            res.warn(f"{prose.count('—')} em dash(es); the model posts use zero")
        if ";" in prose:
            res.warn(f"{prose.count(';')} semicolon(s); the model posts use zero")
        if prose.count("!") > 1:
            res.warn(f"{prose.count('!')} exclamation marks; max 1")
        # voice metrics — only the two that are consistent across all model posts
        sents = [s for s in re.split(r"(?<=[.!?])\s+", prose) if s.strip()]
        if sents:
            avg = sum(len(s.split()) for s in sents) / len(sents)
            if avg > 10.5:
                res.warn(f"avg sentence is {avg:.1f} words; model posts sit at 6-9 — "
                         f"cut clauses, split into shorter declaratives")
        paras = [p for p in re.split(r"\n\s*\n", prose) if p.strip()]
        pw = sorted(len(p.split()) for p in paras)
        if pw and pw[len(pw) // 2] > 45:
            res.warn(f"median paragraph is {pw[len(pw)//2]} words; model posts sit at "
                     f"24-41 — break the long blocks")
        # colons (1-12) and questions (0-18) vary too much between model posts to
        # enforce; they are reported in --stats instead.

    if mode == "aws":
        if not h2:
            res.err("aws notes need `##` headings — start with one, not an intro")
        bold = len(re.findall(r"\*\*.+?\*\*", prose))
        per100 = bold / max(words, 1) * 100
        if per100 < cfg["bold_min_per_100w"]:
            res.warn(f"only {per100:.1f} bold runs per 100 words; the aws posts average 15+")
        if re.search(r"^##\s+(Introduction|Conclusion|Summary)\b", body, re.M | re.I):
            res.warn("aws notes have no intro/conclusion sections — start with the topic")

    if mode == "tutorial":
        fences = count_code_fences(body)
        if fences < 2:
            res.warn(f"only {fences} code fence marker(s); tutorials are mostly commands")
        for m in re.finditer(r"^```(\S*)", body, re.M):
            pass
        bare = 0
        blocks = re.findall(r"^```([^\n`]*)$", body, re.M)
        for i, lang in enumerate(blocks):
            if i % 2 == 0 and not lang.strip():
                bare += 1
        if bare:
            res.warn(f"{bare} code block(s) with no language tag")

    if mode == "personal":
        if h2 and "forher" in os.path.basename(path).lower():
            res.warn("lyrical personal essays have no headings")
        if count_code_fences(body):
            res.warn("personal essays contain no code")

    # ---- style ---------------------------------------------------------
    low = prose.lower()
    for phrase in AI_PHRASES:
        if phrase in low:
            res.err(f"AI filler phrase: {phrase!r}")
    for h in HEDGES:
        if h in low:
            res.warn(f"hedging: {h!r}")

    # escaped asterisks from Obsidian exports: \***\*text\*\*** renders literally
    esc = re.findall(r"\\\*\\\*", prose)
    if esc:
        res.err(f"{len(esc)} escaped-bold marker(s) `\\*\\*` — renders literally; remove the backslashes")
    # an odd number of ** on a line means an unclosed span
    for n, line in enumerate(prose.splitlines(), 1):
        if line.count("**") % 2:
            res.warn(f"unpaired `**` on body line {n}: {line.strip()[:60]!r}")
            break

    # ---- stats ---------------------------------------------------------
    sents = [s for s in re.split(r"(?<=[.!?])\s+", prose) if s.strip()]
    word_counts = [len(s.split()) for s in sents] or [0]
    paras = [p for p in re.split(r"\n\s*\n", prose) if p.strip()]
    para_words = [len(p.split()) for p in paras] or [0]
    res.stats = {
        "words": words,
        "paragraphs": len(paras),
        "median_para_words": sorted(para_words)[len(para_words) // 2],
        "sentences": len(sents),
        "avg_sentence_words": round(sum(word_counts) / len(word_counts), 1),
        "h2": h2,
        "h3": len(re.findall(r"^###\s+\S", prose, re.M)),
        "bold": len(re.findall(r"\*\*.+?\*\*", prose)),
        "bullets": len(re.findall(r"^\s*[-*]\s+\S", prose, re.M)),
        "images": len(img_re.findall(body)),
        "code_blocks": count_code_fences(body) // 2,
        "colons": prose.count(":"),
        "emdashes": prose.count("—"),
        "semicolons": prose.count(";"),
        "questions": prose.count("?"),
    }
    return res


def report(res, show_stats):
    status = "FAIL" if res.errors else ("WARN" if res.warnings else "OK")
    print(f"\n{status}  {os.path.relpath(res.path, REPO)}  [{res.mode or 'auto'}]")
    for i in res.errors:
        print(f"  ✗ {i.msg}")
    for i in res.warnings:
        print(f"  ! {i.msg}")
    if show_stats and res.stats:
        st = res.stats
        print(f"  stats: {st['words']}w | {st['avg_sentence_words']}w/sentence | "
              f"median para {st['median_para_words']}w | h2={st['h2']} h3={st['h3']} | "
              f"bold={st['bold']} bullets={st['bullets']} | cols={st['colons']} "
              f"dash={st['emdashes']} semi={st['semicolons']} q={st['questions']}")
        cfg = MODES.get(res.mode)
        if cfg:
            lo, hi = cfg["words"]
            print(f"  target: {lo}-{hi} words")


def main():
    ap = argparse.ArgumentParser(description="Lint portfolio blog posts.")
    ap.add_argument("paths", nargs="+", help="markdown file(s) or glob(s)")
    ap.add_argument("--type", choices=list(MODES) + ["auto"], default="auto")
    ap.add_argument("--stats", action="store_true", help="print style metrics")
    ap.add_argument("--quiet", action="store_true", help="only print failures")
    args = ap.parse_args()

    paths = []
    for p in args.paths:
        paths.extend(sorted(glob.glob(p)) or [p])

    failed = 0
    for path in paths:
        if not os.path.isfile(path):
            print(f"MISSING  {path}")
            failed += 1
            continue
        mode = args.type
        if mode == "auto":
            fm, _, _ = split_front_matter(open(path, encoding="utf-8").read())
            mode = infer_mode(path, get_scalar(fm, "title")) or "auto"
        res = check(path, mode)
        if res.errors:
            failed += 1
        if not (args.quiet and not res.errors):
            report(res, args.stats)

    total = len(paths)
    print(f"\n{total - failed}/{total} clean")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
