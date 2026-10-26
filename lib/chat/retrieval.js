// In-process BM25 search. The statically required JSON is bundled with the function.
const knowledge = require("./knowledge.json");
const { topicOf } = require("./conversation");

const STOP = new Set("a an the i me my you your yours he his him tell about what which who where how is are was were do does did have has had of in on for to and or with can could would please more know want some it its this that built use using".split(" "));
const ALIASES = {
  cert: "certification", certs: "certification", certificate: "certification", certificates: "certification", certifications: "certification", certified: "certification", credentials: "certification",
  projects: "project", apps: "project", app: "project", applications: "project",
  employment: "experience", employed: "experience", job: "experience", company: "experience", employer: "experience", career: "experience", work: "experience", working: "experience",
  study: "education", studying: "education", college: "education", university: "education", degree: "education",
  skills: "skill", stack: "skill", technologies: "skill", tech: "skill",
  posts: "blog", post: "blog", articles: "blog", article: "blog", blogs: "blog", writing: "blog",
  email: "contact", reach: "contact", mail: "contact", connect: "contact",
  awards: "achievement", achievements: "achievement", competitions: "achievement",
  os: "linux", editor: "neovim", setup: "tools", equipment: "tools", laptop: "hardware",
  identity: "bio", yourself: "bio", background: "bio", introduce: "bio", hobbies: "interests", hobby: "interests",
};

function tokenize(text) {
  return (String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(t => !STOP.has(t))
    .map(t => ALIASES[t] || t);
}

const index = knowledge.documents.map(document => {
  const terms = tokenize(document.content);
  const frequencies = new Map();
  for (const term of terms) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  return { document, frequencies, length: terms.length, title: new Set(tokenize(document.title)), category: new Set(tokenize(`${document.category} ${document.searchTerms || ""}`)) };
});
const averageLength = index.reduce((sum, d) => sum + d.length, 0) / index.length || 1;
const documentFrequency = new Map();
for (const d of index) {
  for (const term of new Set([...d.frequencies.keys(), ...d.title, ...d.category])) {
    documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
  }
}

function retrieve(query, { limit = 5, maxChars = 6500, topic = null, entity = null } = {}) {
  topic = topic || topicOf(query);
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const scope = {
    identity: ["about"], personal: ["about"], certifications: ["certifications"], projects: ["projects", "about", "achievements"],
    experience: ["about"], education: ["about"], skills: ["about"], tools: ["tools", "about"],
    contact: ["contact", "about"], blog: ["blog"], achievements: ["achievements", "about"], interests: ["about"],
  }[topic];
  // A stray word in a long tutorial must not turn an unrelated question into a match.
  // Article bodies require an explicit blog topic or a recognized article title.
  const candidates = index.filter(d => scope ? scope.includes(d.document.category) : d.document.kind !== "article");
  const ranked = candidates.map(d => {
    let score = 0;
    for (const term of terms) {
      const df = documentFrequency.get(term) || 0;
      const idf = Math.log(1 + (index.length - df + 0.5) / (df + 0.5));
      const tf = d.frequencies.get(term) || 0;
      const normalizer = 1.2 * (0.25 + 0.75 * d.length / averageLength);
      score += idf * ((tf * 2.2) / (tf + normalizer) + (d.title.has(term) ? 2 : 0) + (d.category.has(term) ? 2.5 : 0));
    }
    const preferred = terms.includes("experience") || terms.includes("education") || terms.includes("skill") ? "about"
      : terms.includes("contact") ? "contact" : terms.includes("tools") ? "tools" : topic === "achievements" ? "about" : null;
    if (d.document.category === preferred) score *= 1.7;
    // A named source wins over incidental mentions in unrelated summaries.
    if (entity && d.document.title.toLowerCase() === entity.toLowerCase()) score += 100;
    return { ...d.document, score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const selected = [];
  let chars = 0;
  for (const doc of ranked) {
    if (selected.length >= limit) break;
    // Keep whole chunks and their links intact. Do not cut Markdown URLs mid-token.
    if (chars + doc.content.length > maxChars) continue;
    selected.push(doc);
    chars += doc.content.length;
  }
  return selected;
}

function preparedAnswer(message) {
  const normalized = message.toLowerCase().trim().replace(/[?!.,]+$/g, "");
  if (/^(hi|hello|hey|hii|hiii|helo|hola|howdy)$/.test(normalized)) {
    return "Hi! I'm Ahmad's AI assistant. Ask me about my projects, certifications, skills, or experience.";
  }
  if (/^(?:who (?:are|r) (?:you|u)|who is ahmad(?: hassan)?|what(?:'s| is) your name|introduce yourself|tell me about yourself|tell me about ahmad(?: hassan)?|about you|your background)$/.test(normalized)) {
    const { name, role, bio, url } = knowledge.profile;
    return `I'm the portfolio AI assistant for **${name}**, a ${role}. ${bio}\n\n[More about me](${url})`;
  }
  // Only complete, generic questions qualify. Specific requests still use retrieval + AI.
  const project = /^(?:projects|(?:tell me|what can you tell me) about (?:your|the) projects|what projects (?:have you built|have you worked on|do you have)|show (?:me )?your projects)(?: please)?$/;
  const cert = /^(?:certifications|certificates|(?:tell me|what can you tell me) about (?:your|the) (?:certifications|certificates)|what (?:certifications|certificates) (?:do you have|have you earned)|show (?:me )?your certifications)(?: please)?$/;
  const category = project.test(normalized) ? "projects" : cert.test(normalized) ? "certifications" : null;
  if (!category) return null;
  const items = knowledge.cards[category];
  const displayed = category === "projects" ? items : items.slice(0, 6);
  const intro = category === "projects" ? "Here are my projects:" : `My portfolio lists **${items.length} certifications**. Here are a few:`;
  return `${intro}\n\n${displayed.map(item => `- [${item.title}](${item.url})`).join("\n")}\n\n[See all ${category}](https://ahmadx.dev/${category}/)`;
}

module.exports = { retrieve, preparedAnswer, tokenize, version: knowledge.version, documentCount: index.length };
