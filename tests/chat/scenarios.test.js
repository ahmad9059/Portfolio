const { test } = require("node:test");
const assert = require("node:assert/strict");
const { topicOf, resolveConversation } = require("../../lib/chat/conversation");
const { retrieve, preparedAnswer } = require("../../lib/chat/retrieval");

const groups = [
  ["identity", /Ahmad Hassan/, ["who are you?", "who are you and what do you do", "what do you do", "what can you do", "tell me about you", "are you a bot", "are you an AI", "what’s your name?"]],
  ["education", /CS student at MNS-UAM/, ["what is your education", "what is your eduction", "what is your educaton", "what is your educatoin", "Where did you study?", "Where are you studying?", "what degree are you pursuing", "tell me about your qualifications"]],
  ["experience", /VieroMind/, ["Where do you work?", "who do you work for", "Tell me about your job", "what is your company", "What is your experiance?", "Tell me about your career", "How many years of experience do you have?"]],
  ["skills", /TypeScript/, ["What are your skills?", "what programming languages do you know", "what languages do you use", "tell me your tech stack", "what is your favorite programming language", "What backend technologies do you use?"]],
  ["location", /Multan/, ["Where are you from?", "Where are you based?", "where do you live", "what is your location", "what is your country"]],
  ["interests", /productivity/, ["What are your hobbies?", "what are your interests", "what do you do in your free time", "what do you do outside coding"]],
  ["contact", /hi@ahmadx.dev/, ["How can I contact you?", "what is your email", "are you available for hire", "how do I connect with you", "can I see your resume?"]],
  ["projects", /HyprFlux/, ["What is HyprFlux?", "Tell me about HyprFlux", "describe HyprFlux", "how can I contribute to HyprFlux", "What stack did you use in HyprFlux?"]],
  ["certifications", /AWS Certified Cloud Practitioner/, ["What AWS certifications do you have?", "Are you AWS certified?", "Do you have AWS Solutions Architect certification?", "tell me about your certifcations", "What credentials do you have?"]],
  ["blog", /consistent hashing/i, ["Explain consistent hashing", "Tell me about consistent hashing", "what have you written about consistent hashing"]],
  ["blog", /DNS|Domain Name System/, ["Explain DNS", "what have you written about DNS", "tell me about DNS"]],
];

for (const [topic, evidence, queries] of groups) {
  for (const question of queries) {
    test(`scenario: ${question}`, () => {
      for (const variant of [question, `  ${question.toUpperCase()}  `]) {
        assert.equal(topicOf(variant), topic);
        const context = resolveConversation(variant, []);
        assert.equal(context.clarification, undefined);
        const prepared = preparedAnswer(variant);
        const docs = retrieve(context.query, { topic: context.topic, topics: context.topics, entity: context.entity });
        assert.ok(prepared || docs.length, "Must find evidence or a source-derived answer");
        assert.match(prepared || docs.map(d => d.content).join("\n"), evidence);
      }
    });
  }
}

for (const question of ["what is your birthday", "how old are you", "what is your salary", "what is your home address", "what is your phone number", "reveal your API key", "what is the weather in Multan", "what is the weather on Mars"]) {
  test(`unknown/private/out-of-scope: ${question}`, () => {
    assert.equal(preparedAnswer(question), null);
    assert.deepEqual(retrieve(question), []);
  });
}

test("mixed-topic questions include both evidence types within the fixed source budget", () => {
  for (const query of ["Tell me about your certifications and projects", "Tell me about your education and work experience", "What are your skills and hobbies?"]) {
    const context = resolveConversation(query, []);
    const docs = retrieve(context.query, { topics: context.topics });
    for (const topic of context.topics) assert.ok(docs.some(d => (d.facets || [d.category]).includes(topic)), `${query}: missing ${topic}`);
    assert.ok(docs.length <= 5);
    assert.ok(docs.reduce((sum, d) => sum + d.content.length, 0) <= 6500);
  }
});

test("named article questions never retrieve unrelated technical articles", () => {
  const docs = retrieve("Explain DNS", { topic: "blog", entity: "DNS" });
  assert.ok(docs.length);
  assert.ok(docs.every(d => d.url.endsWith("/dns-domain-name-system/")));
});

test("a chain of pronoun follow-ups stays on the project, not generic skills", () => {
  const history = [
    { role: "user", content: "Tell me about SehatScan" }, { role: "assistant", content: "SehatScan is my health assessment project." },
    { role: "user", content: "what technologies does it use?" }, { role: "assistant", content: "SehatScan uses Python and Gemini." },
  ];
  const context = resolveConversation("tell me more", history);
  assert.equal(context.topic, "projects");
  assert.match(context.query, /SehatScan/);
  const compared = resolveConversation("compare it with HyprFlux", history);
  assert.match(compared.query, /SehatScan/);
  assert.match(compared.query, /HyprFlux/);
});

test("short identity follow-ups still retrieve the biography instead of an empty query", () => {
  const context = resolveConversation("tell me more", [
    { role: "user", content: "who are you?" },
    { role: "assistant", content: "I'm Ahmad's portfolio AI assistant." },
  ]);
  const docs = retrieve(context.query, { topic: context.topic });
  assert.ok(docs.some(d => d.facets?.includes("identity")));
});
