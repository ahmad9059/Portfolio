// Compile public portfolio content. No credentials, network requests or embeddings.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "lib/chat/knowledge.json");
const SITE = "https://ahmadx.dev";

function scalar(frontMatter, key) {
  const value = frontMatter.match(new RegExp(`^${key}:\\s*(.*)$`, "mi"))?.[1] || "";
  return value.trim().replace(/^(["'])(.*)\1$/, "$2");
}

function decode(text) {
  return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " " };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const hex = entity.toLowerCase().startsWith("&#x");
    const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
  });
}

function absolute(url) {
  try {
    const parsed = new URL(decode(url), SITE);
    return ["https:", "http:", "mailto:"].includes(parsed.protocol) ? parsed.href : "";
  } catch { return ""; }
}

function clean(text) {
  return decode(text
    .replace(/<(style|script|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/{{[<%][\s\S]*?[>%]}}/g, "")
    .replace(/```[^\n]*\n[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, url, label) => {
      const target = absolute(url);
      return target ? `[${label.replace(/<[^>]*>/g, "")}](${target})` : label;
    })
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, title) => `\n\n${"#".repeat(Number(level))} ${title}\n\n`)
    .replace(/<\/(?:p|div|li|section|article|tr)>|<br\s*\/?\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/(?<!!)\[([^\]]+)\]\((\/[^)]+)\)/g, (_, label, url) => `[${label}](${absolute(url)})`)
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")).trim();
}

function chunks(text, max = 1800) {
  const result = [];
  let current = "";
  for (const paragraph of text.split(/\n\s*\n/)) {
    if (!paragraph.trim()) continue;
    if (paragraph.length <= max) {
      if (current && current.length + paragraph.length + 2 > max) { result.push(current.trim()); current = ""; }
      current += (current ? "\n\n" : "") + paragraph.trim();
      continue;
    }
    const words = paragraph.split(/\s+/);
    let piece = "";
    const pieces = [];
    for (const word of words) {
      if (piece.length + word.length + 1 > max && piece) { pieces.push(piece); piece = ""; }
      piece += (piece ? " " : "") + word;
    }
    if (piece) pieces.push(piece);
    for (const part of pieces) {
      if (current && current.length + part.length + 2 > max) { result.push(current); current = ""; }
      current += (current ? "\n\n" : "") + part;
    }
  }
  if (current) result.push(current);
  return result;
}

function buildKnowledge(root = ROOT, today = new Date().toISOString().slice(0, 10)) {
  const documents = [];
  const cards = { projects: [], certifications: [] };
  let profile;
  const pages = ["about", "projects", "certifications", "tools", "contact"];
  const posts = fs.readdirSync(path.join(root, "content/posts")).filter(f => f.endsWith(".md")).sort();
  const files = [...pages.map(p => `${p}.md`), ...posts.map(p => `posts/${p}`)];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(root, "content", file), "utf8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) throw new Error(`Missing front matter: ${file}`);
    const [, fm, body] = match;
    const date = scalar(fm, "publishDate") || scalar(fm, "date");
    if (scalar(fm, "draft").toLowerCase() === "true" || (date && date.slice(0, 10) > today)) continue;
    const title = scalar(fm, "title");
    if (!title) throw new Error(`Missing title: ${file}`);
    const post = file.startsWith("posts/");
    const slug = scalar(fm, "slug") || path.basename(file, ".md").toLowerCase();
    const url = absolute(scalar(fm, "url") || `/${post ? "posts/" : ""}${slug}/`);
    const category = post ? "blog" : path.basename(file, ".md");
    const text = clean(body);
    if (category === "about") {
      const name = clean(body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
      const role = clean(body.match(/<p class="profile-role">([\s\S]*?)<\/p>/)?.[1] || "");
      const bio = clean(body.match(/<p class="profile-bio">([\s\S]*?)<\/p>/)?.[1] || "");
      if (!name || !role || !bio) throw new Error("Public profile extraction is incomplete");
      profile = { name, role, bio, url };
    }

    // Index article sections locally. Retrieval still sends only a small bounded selection.
    if (post) {
      documents.push({ id: file, category, kind: "summary", title, url, content: `${title}\n${scalar(fm, "description") || text.slice(0, 500)}\nRead: ${url}` });
      text.split(/\n(?=#{1,6} )/).forEach((section, index) => {
        const heading = section.match(/^#{1,6}\s+([^\n]+)/)?.[1];
        chunks(section).forEach((content, part) => {
          documents.push({ id: `${file}:${index}:${part}`, category, kind: "article", title: heading ? `${title}: ${heading}` : title, url, content });
        });
      });
      continue;
    }

    // Structured cards preserve the correct project and certificate verification links.
    const cardClass = category === "projects" ? "project-card-info" : "cert-card-info";
    if (cards[category]) {
      // Bound project cards at the next card, not the first nested </div>.
      const pattern = category === "projects"
        ? /<div class="project-card-info">([\s\S]*?)(?=<div class="project-card">|$)/g
        : new RegExp(`<div class="${cardClass}">([\\s\\S]*?)<\\/div>`, "g");
      for (const card of body.matchAll(pattern)) {
        const name = clean(card[1].match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "");
        const links = [...card[1].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g)];
        const href = (links.find(link => /Website|Live Demo/.test(link[2])) || links[0])?.[1];
        if (name) {
          const description = clean(card[1].match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] || "");
          const tags = [...card[1].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map(match => clean(match[1]));
          const details = { title: name, url: absolute(href || url), description, ...(tags.length ? { tags } : {}) };
          cards[category].push(details);
          documents.push({ id: `${file}:card:${cards[category].length}`, category, title: name, url,
            content: `${name}\n${description}${tags.length ? `\nTechnologies: ${tags.join(", ")}` : ""}\n${links.map(link => `[${clean(link[2])}](${absolute(link[1])})`).join("\n")}` });
        }
      }
    }

    const achievementTitles = new Set([...((body.split('<div id="achievements"')[1]) || "").matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map(match => clean(match[1])));
    const sections = text.split(/\n(?=#{1,6} )/);
    sections.forEach((section, index) => {
      const heading = section.match(/^#{1,6}\s+([^\n]+)/)?.[1] || title;
      // Cards are already indexed as self-contained records. Keep achievements separate.
      if (cards[category] && cards[category].some(card => card.title === heading)) return;
      chunks(section).forEach((content, part) => {
        const searchTerms = category === "about" && index === 0 && /student/i.test(content)
          ? "education university college student background bio" : "";
        const recordCategory = category === "certifications" && achievementTitles.has(heading) ? "achievements" : category;
        documents.push({ id: `${file}:${index}:${part}`, category: recordCategory, title: `${title}: ${heading}`, url, content, ...(searchTerms ? { searchTerms } : {}) });
      });
    });
  }

  if (!documents.length || !cards.projects.length || !cards.certifications.length || !profile) {
    throw new Error("Knowledge extraction is incomplete; check public page markup.");
  }
  const payload = { documents, cards, profile };
  const version = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
  return { version, ...payload };
}

if (require.main === module) {
  const knowledge = buildKnowledge();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(knowledge, null, 2) + "\n");
  console.log(`Chat knowledge: ${knowledge.documents.length} documents, ${knowledge.cards.projects.length} projects, ${knowledge.cards.certifications.length} certifications (${knowledge.version})`);
}

module.exports = { buildKnowledge, clean, chunks };
