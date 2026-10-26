const knowledge = require("./knowledge.json");
const { normalize, mentions } = require("./conversation");

// Exact source extraction is faster and safer than generating straightforward lists.
function factAnswer(message, context) {
  const text = normalize(message);
  if (context.topics?.length > 1) return null;
  const category = /^(?:how many (?:projects?|certifications?|certificates?|certs?)(?: do you have| have you (?:built|earned|completed))?|(?:list|show|give)(?: me)?(?: all)?(?: your)? (?:projects?|certifications?|certificates?|certs?))$/.test(text)
    ? /\bprojects?\b/.test(text) ? "projects" : "certifications" : null;
  if (category) {
    const items = knowledge.cards[category];
    const link = `https://ahmadx.dev/${category}/`;
    const intro = `My public portfolio lists **${items.length} ${category === "projects" ? "featured projects" : "certification entries"}**.`;
    if (text.startsWith("how many")) return `${intro}\n\n[See the published list](${link})`;
    return `${intro}\n\n${items.map(item => `- [${item.title}](${item.url})`).join("\n")}\n\n[View the page](${link})`;
  }
  const named = mentions(message, "projects");
  const projectName = context.entity || (named.length === 1 ? named[0].name : null);
  const card = knowledge.cards.projects.find(item => item.title === projectName);
  if (card) {
    const question = text.replace(normalize(card.title), "it");
    if (/^(?:(?:what|which) (?:technologies|technology|tech stack|stack|languages|frameworks) (?:does it use|did you use(?: in it)?|do you use in it)|what is (?:its (?:tech )?stack|it built with))$/.test(question)) {
      if (!card.tags?.length) return null;
      return `**${card.title}** uses the following technologies listed on my portfolio:\n\n${card.tags.map(tag => `- ${tag}`).join("\n")}\n\n[View project](${card.url})`;
    }
  }
  if (context.topic !== "certifications" || !/^(?:do you (?:have|hold|possess)|(?:which|what|how many) (?:\w+ )?(?:certifications?|certificates?|certs?|credentials?) do you have|are you (?:\w+ )?certified)/.test(text)
    || /\b(?:why|how|recommend|valuable|best|compare|worth|ignore|instructions)\b/.test(text)) return null;

  const vendors = [
    [/\b(?:aws|amazon)\b/, /aws|amazon/i], [/\bgoogle\b/, /google/i], [/\bmeta\b/, /meta/i],
    [/\bibm\b/, /ibm/i], [/\bgithub\b/, /github/i], [/\bharvard\b/, /harvard/i],
    [/\b(?:microsoft|azure)\b/, /microsoft|azure/i], [/\bhackerrank\b/, /hackerrank/i],
  ].filter(([pattern]) => pattern.test(text));
  if (!vendors.length) return null;
  const matching = knowledge.cards.certifications.filter(item => vendors.some(([, pattern]) => pattern.test(`${item.title} ${item.description}`)));
  const list = matching.length ? `My public portfolio lists **${matching.length} matching ${matching.length === 1 ? "credential" : "credentials"}**:\n\n${matching.map(item => `- [${item.title}](${item.url})`).join("\n")}`
    : "My public portfolio does not list a credential from that provider.";
  return `${list}\n\nI can only confirm credentials listed in those records, not unlisted certifications. [All certifications](https://ahmadx.dev/certifications/)`;
}

module.exports = { factAnswer };
