const { test } = require("node:test");
const assert = require("node:assert/strict");
const { retrieve, preparedAnswer } = require("../../lib/chat/retrieval");
const knowledge = require("../../lib/chat/knowledge.json");

test("owner-provided education and hiring preferences are available without generation", () => {
  assert.match(preparedAnswer("what is your eduction"), /BSCS.*MNS-University of Agriculture, Multan/);
  assert.match(preparedAnswer("what is your education"), /2023.*2027/);
  const hiring = preparedAnswer("are you available for hire?");
  assert.match(hiring, /full-time.*freelance/);
  assert.match(hiring, /Linux, cloud, and AI/);
  assert.match(hiring, /remote, on-site, or hybrid/);
});

test("ownership and impact are grounded in owner statements, without fabricating user counts", () => {
  for (const name of ["HyprFlux", "SehatScan"]) {
    const docs = retrieve(`Did you build ${name} solo or with a team?`);
    assert.ok(docs.some(d => d.id === `owner:project:${name}` && /solo/.test(d.content)));
  }
  const downloads = retrieve("How many downloads does HyprFlux have?");
  assert.ok(downloads.some(d => /10,000\+ downloads/.test(d.content)));
  const facts = knowledge.documents.filter(d => d.id.startsWith("owner:"));
  assert.equal(facts.length, 5);
  assert.ok(facts.every(d => d.provenance && d.reportedOn));
  assert.ok(facts.every(d => d.url === "https://ahmadx.dev/chat/"));
  assert.doesNotMatch(facts.map(d => d.content).join("\n"), /10,000\+ users|graduated in 2027|immediately available/);
});
