const knowledge = require("./knowledge.json");

function normalize(text) {
  return text.toLowerCase().replace(/[’']/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const TOPICS = [
  ["identity", /^(?:who (?:are|r) (?:you|u)|who is ahmad(?: hassan)?|what is your name|whats your name|introduce yourself|tell me about yourself|tell me about ahmad(?: hassan)?|about you|your background)$/],
  ["personal", /\b(?:your (?:birthday|age|date of birth|address|relationship|marital status)|when were you born|how old are you)\b/],
  ["certifications", /\b(?:certifications?|certificates?|certs?|credentials?)\b/],
  ["projects", /\b(?:projects?|apps?|applications?)\b/],
  ["experience", /\b(?:work|working|worked|job|company|employer|employment|experience|career)\b/],
  ["education", /\b(?:education|study|studying|studied|university|college|degree|student)\b/],
  ["skills", /\b(?:skills?|stack|languages?|technologies|programming languages)\b/],
  ["tools", /\b(?:tools?|setup|editor|terminal|shell|desktop|linux|hyprland|neovim)\b/],
  ["contact", /\b(?:contact|email|reach you|connect with you|hire you|resume|linkedin)\b/],
  ["blog", /\b(?:blog|posts?|articles?|written|writing)\b/],
  ["achievements", /\b(?:achievements?|awards?|competitions?|ranked|rankings?|contributions|stars|problems solved)\b/],
  ["interests", /\b(?:hobbies|hobby|interests|free time|outside coding|beyond code)\b/],
];

const entities = [
  ...knowledge.cards.projects.map(item => ({ name: item.title, topic: "projects" })),
  ...knowledge.cards.certifications.map(item => ({ name: item.title, topic: "certifications" })),
  ...knowledge.documents.filter(d => d.category === "blog" && d.kind === "summary").flatMap(d => {
    const short = d.title.split(" (")[0];
    return [...new Set([d.title, short])].map(name => ({ name, topic: "blog" }));
  }),
  ...["VieroMind", "BinaryBytes", "Digistartup"].map(name => ({ name, topic: "experience" })),
].map(item => ({ ...item, normalized: normalize(item.name) }));

function mentions(text, topic) {
  const normalized = ` ${normalize(text)} `;
  return entities.filter(entity => (!topic || entity.topic === topic) && normalized.includes(` ${entity.normalized} `))
    .map(entity => ({ ...entity, position: normalized.indexOf(` ${entity.normalized} `) }))
    .sort((a, b) => a.position - b.position || b.name.length - a.name.length)
    .filter((item, index, all) => !all.slice(0, index).some(other => other.normalized.includes(item.normalized)));
}

function topicOf(message) {
  const normalized = normalize(message);
  const direct = TOPICS.find(([, pattern]) => pattern.test(normalized))?.[0];
  const named = mentions(message)[0];
  if (named && (!direct || ["skills", "tools"].includes(direct))) return named.topic;
  return direct || named?.topic || null;
}

function sanitizeHistory(history) {
  const messages = history.slice(-10)
    .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
    .map(item => ({ role: item.role, content: item.content.trim().slice(0, 2000) }))
    .filter(item => item.content);
  let remaining = 10000;
  const selected = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].content.length > remaining) break;
    selected.unshift(messages[i]);
    remaining -= messages[i].content.length;
  }
  return selected;
}

function resolveConversation(message, history) {
  const normalized = normalize(message);
  const topic = topicOf(message);
  const named = mentions(message);
  const referential = /\b(?:it|its|that|those|them|these|ones?|first|second|third|last|former|latter)\b/.test(normalized);
  const continuation = /^(?:(?:tell me |explain )?more|go on|continue|elaborate|what else|and|yes|yeah|sure|okay|ok|which ones?|why|how so|links?|sources?|all of them|list (?:them|all)|show all)$/.test(normalized);
  const elliptical = /^(?:and |what about |how about |why |when |how much |how many |where |can you |give me |show me |send me )/.test(normalized);
  const followup = !named.length && topic !== "identity" && (referential || continuation || (!topic && elliptical));

  // Explicit entities and standalone topics replace the active topic.
  if (!followup) return { query: message, topic, entity: named.length === 1 ? named[0].name : null, history: [], followup: false };

  let anchorIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role !== "user") continue;
    if (topicOf(history[i].content)) { anchorIndex = i; break; }
    const prior = normalize(history[i].content);
    // Do not revive an older portfolio topic after a standalone unrelated question.
    if (!/\b(?:it|its|that|those|them|these|ones?|first|second|third|last)\b/.test(prior)
        && !/^(?:tell me more|more|go on|continue|elaborate|what else|and\b|yes$|yeah$|sure$|okay$|ok$|which|why$|links?$|sources?$|what about|how about)/.test(prior)) break;
  }
  if (anchorIndex < 0) {
    // A self-contained new question is not ambiguous just because it starts with "where".
    if (topic && !referential && !continuation) return { query: message, topic, history: [], followup: false };
    return { query: "", topic: null, history: [], followup: true, clarification: "Which project, certification, or topic do you mean?" };
  }

  const anchor = history[anchorIndex];
  const activeTopic = topicOf(anchor.content);
  if (topic && topic !== activeTopic && !/\b(?:it|its|that|those|them|these)\b/.test(normalized)) {
    return { query: message, topic, history: [], followup: false };
  }
  const relevantHistory = history.slice(anchorIndex);
  const lastAssistant = relevantHistory.filter(item => item.role === "assistant").at(-1);
  const candidates = mentions(lastAssistant?.content || "", activeTopic);
  const ordinal = normalized.match(/\b(first|second|third|last|former|latter)\b/)?.[1];
  let target;
  if (ordinal && candidates.length) {
    const position = { first: 0, second: 1, third: 2, former: 0, latter: 1, last: candidates.length - 1 }[ordinal];
    target = candidates[position]?.name;
    if (!target) return { query: "", topic: activeTopic, history: relevantHistory, followup: true, clarification: "Which item do you mean? Please name it so I can give you the right details." };
  } else if (/\b(?:it|its|that (?:one|project|certification))\b/.test(normalized)) {
    const original = mentions(anchor.content, activeTopic);
    target = original.length === 1 ? original[0].name : candidates.length === 1 ? candidates[0].name : null;
    if (!target && candidates.length > 1) return { query: "", topic: activeTopic, history: relevantHistory, followup: true, clarification: `Which one do you mean: ${candidates.slice(0, 4).map(item => item.name).join(", ")}?` };
  }
  // Assistant messages identify entities only. They are never added as source facts.
  const referenced = !target && /^(?:which ones?|links?|sources?|all of them|list (?:them|all)|show all)$/.test(normalized)
    ? candidates.slice(0, 6).map(candidate => candidate.name).join("\n") : "";
  // Retain a narrowing turn such as "what about Google?" through later "more"/"links" turns.
  // A new sibling filter such as "and AWS?" replaces that narrowing instead of mixing vendors.
  const refinements = /^(?:and |what about |how about )/.test(normalized) ? ""
    : relevantHistory.filter(item => item.role === "user" && item !== anchor)
      .filter(item => !/^(?:tell me more|more|continue|go on|which ones?|links?|sources?|yes|okay|ok)$/.test(normalize(item.content)))
      .slice(-2).map(item => item.content).join("\n");
  return {
    query: `${target || anchor.content}\n${refinements}\n${referenced}\n${message}`,
    topic: target ? mentions(target)[0]?.topic || activeTopic : activeTopic,
    entity: target,
    history: relevantHistory,
    followup: true,
  };
}

module.exports = { normalize, topicOf, mentions, sanitizeHistory, resolveConversation };
