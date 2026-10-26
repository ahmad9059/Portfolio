// In-process BM25 search. The statically required JSON is bundled with the function.
const knowledge = require("./knowledge.json");
const { topicOf, topicsOf, normalize } = require("./conversation");
const { normalizeInput } = require("./input");

const STOP = new Set("a an the i me my you your yours he his him tell about what which who where how is are was were do does did have has had of in on for to and or with can could would please more know want some it its this that built use using".split(" "));
const ALIASES = {
  cert: "certification", certs: "certification", certificate: "certification", certificates: "certification", certifications: "certification", certified: "certification", credentials: "certification",
  projects: "project", apps: "project", app: "project", applications: "project",
  employment: "experience", employed: "experience", job: "experience", company: "experience", employer: "experience", career: "experience", work: "experience", working: "experience",
  study: "education", studying: "education", college: "education", university: "education", degree: "education", qualification: "education", qualifications: "education",
  skills: "skill", language: "skill", languages: "skill", stack: "skill", technologies: "skill", tech: "skill",
  posts: "blog", post: "blog", articles: "blog", article: "blog", blogs: "blog", writing: "blog",
  email: "contact", reach: "contact", mail: "contact", connect: "contact", hire: "contact",
  awards: "achievement", achievements: "achievement", competitions: "achievement",
  os: "linux", editor: "neovim", setup: "tools", equipment: "tools", laptop: "hardware",
  identity: "bio", yourself: "bio", background: "bio", introduce: "bio", hobbies: "interests", hobby: "interests",
};

function tokenize(text) {
  return (normalizeInput(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(t => !STOP.has(t))
    .map(t => ALIASES[t] || t);
}

const index = knowledge.documents.map(document => {
  const terms = tokenize(document.content);
  const frequencies = new Map();
  for (const term of terms) frequencies.set(term, (frequencies.get(term) || 0) + 1);
  return { document, frequencies, length: terms.length, title: new Set(tokenize(document.title)), category: new Set(tokenize(`${document.category} ${(document.facets || []).join(" ")} ${document.searchTerms || ""}`)) };
});
const averageLength = index.reduce((sum, d) => sum + d.length, 0) / index.length || 1;
const documentFrequency = new Map();
const postings = new Map();
for (const [i, d] of index.entries()) {
  for (const term of new Set([...d.frequencies.keys(), ...d.title, ...d.category])) {
    documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    if (!postings.has(term)) postings.set(term, []);
    postings.get(term).push(i);
  }
}
const inverseFrequency = new Map([...documentFrequency].map(([term, df]) => [term, Math.log(1 + (index.length - df + 0.5) / (df + 0.5))]));

function retrieve(query, { limit = 5, maxChars = 6500, topic = null, topics = null, entity = null } = {}) {
  topic = topic || topicOf(query);
  topics = topics?.length ? topics : topicsOf(query);
  if (!topics.length && topic) topics = [topic];
  if (topics.includes("personal")) return [];
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  if (!topics.length && /\b(?:weather|forecast|stock price|sports score)\b/i.test(query)) return [];
  const matchingIds = new Set(terms.flatMap(term => postings.get(term) || []));
  const focusUrl = topic === "blog" && entity ? knowledge.documents.find(d => d.kind === "summary"
    && (normalize(d.title) === normalize(entity) || normalize(d.title).startsWith(normalize(entity) + " ")))?.url : null;
  // A stray word in a long tutorial must not turn an unrelated question into a match.
  // Article bodies require an explicit blog topic or a recognized article title.
  const candidates = [...matchingIds].map(i => index[i]).filter(d => {
    const facets = d.document.facets || [d.document.category];
    return (topics.length ? topics.some(t => facets.includes(t)) : d.document.kind !== "article")
      && (!focusUrl || d.document.url === focusUrl);
  });
  const ranked = candidates.map(d => {
    let score = 0;
    for (const term of terms) {
      const idf = inverseFrequency.get(term) || 0;
      const tf = d.frequencies.get(term) || 0;
      const normalizer = 1.2 * (0.25 + 0.75 * d.length / averageLength);
      score += idf * ((tf * 2.2) / (tf + normalizer) + (d.title.has(term) ? 2 : 0) + (d.category.has(term) ? 2.5 : 0));
    }
    const preferred = terms.includes("experience") || terms.includes("education") || terms.includes("skill") ? "about"
      : terms.includes("contact") ? "contact" : terms.includes("tools") ? "tools" : topic === "achievements" ? "about" : null;
    if (d.document.category === preferred) score *= 1.7;
    // A named source wins over incidental mentions in unrelated summaries.
    if (entity && d.document.title.toLowerCase() === entity.toLowerCase()) score += 100;
    return { document: d.document, score };
  }).filter(d => d.score > 0).sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id));

  const selected = [];
  let chars = 0;
  function select({ document: doc, score }) {
    if (selected.length >= limit || selected.some(d => d.id === doc.id)) return;
    // Keep whole chunks and their links intact. Do not cut Markdown URLs mid-token.
    if (chars + doc.content.length > maxChars) return;
    selected.push({ ...doc, score });
    chars += doc.content.length;
  }
  // Mixed questions must include evidence for each requested topic, not just the first keyword.
  if (topics.length > 1) {
    for (const t of topics) {
      const best = ranked.find(d => (d.document.facets || [d.document.category]).includes(t));
      if (best) select(best);
    }
  }
  for (const doc of ranked) select(doc);
  return selected;
}

function preparedAnswer(message) {
  const normalized = normalizeInput(message).toLowerCase().trim().replace(/\s+/g, " ").replace(/[?!.,]+$/g, "");
  if (/^(hi|hello|hey|hii|hiii|helo|hola|howdy)$/.test(normalized)) {
    return "Hi! I'm Ahmad's AI assistant. Ask me about my projects, certifications, skills, or experience.";
  }
  if (/^(?:who (?:are|r) (?:you|u)|who is ahmad(?: hassan)?|what(?:'s| is) your name|introduce yourself|tell me about yourself|tell me about ahmad(?: hassan)?|about you|your background)$/.test(normalized)) {
    const { name, role, bio, url } = knowledge.profile;
    return `I'm the portfolio AI assistant for **${name}**, a ${role}. ${bio}\n\n[More about me](${url})`;
  }
  const simple = normalize(message);
  if (/^(?:what (?:is|are) your (?:education|qualifications)|whats your education|where (?:do|did) you study|where are you studying|tell me about your education|your education|education)$/.test(simple)) {
    const education = knowledge.profile.bio.match(/\bCS student[^.]*\./)?.[0];
    if (education) return `My public profile lists me as a ${education}\n\n[About my background](${knowledge.profile.url})`;
  }
  if (/^(?:where (?:are you (?:from|based|located)|do you live)|what is your (?:location|city|country)|your location)$/.test(simple) && knowledge.profile.location) {
    return `My public contact page lists **${knowledge.profile.location}**.\n\n[Contact me](https://ahmadx.dev/contact/)`;
  }
  const sourceFacet = /^(?:what (?:are|is) your (?:skills|tech stack|stack)|what (?:programming )?languages do you (?:know|use)|tell me about your skills|your skills)$/.test(simple) ? "skills"
    : /^(?:where do you work|who do you work for|what is your (?:job|company)|tell me about your (?:job|work))$/.test(simple) ? "experience"
    : /^(?:what are your (?:hobbies|interests)|what do you do (?:outside coding|in your free time)|tell me about your hobbies)$/.test(simple) ? "interests" : null;
  if (sourceFacet) {
    const doc = knowledge.documents.find(d => d.category === "about" && d.facets?.includes(sourceFacet));
    if (doc) {
      const content = doc.content.replace(/^#{1,6}[^\n]*\n+/, "");
      return `${sourceFacet === "experience" ? content.split("\n\n").slice(0, 2).join("\n\n") : content}\n\n[Read more](${doc.url})`;
    }
  }
  const projectCard = knowledge.cards.projects.find(card => [normalize(card.title), `what is ${normalize(card.title)}`, `tell me about ${normalize(card.title)}`, `describe ${normalize(card.title)}`].includes(simple));
  if (projectCard) return `**${projectCard.title}** — ${projectCard.description}\n\n${projectCard.tags?.length ? `Technologies: ${projectCard.tags.join(", ")}.\n\n` : ""}[View project](${projectCard.url})`;
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
