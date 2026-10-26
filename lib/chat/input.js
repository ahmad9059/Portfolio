// Deliberate spelling aliases, not unrestricted fuzzy matching of names or facts.
const SPELLING = {
  eduction: "education", educaton: "education", educatoin: "education",
  qualifcation: "qualification", qualfication: "qualification",
  experiance: "experience", experince: "experience",
  certifcations: "certifications", certificaitons: "certifications",
  projetcs: "projects", porjects: "projects",
};

function normalizeInput(text) {
  return String(text).normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/[’‘]/g, "'")
    .replace(/\b[a-z]+\b/gi, word => SPELLING[word.toLowerCase()] || word);
}

module.exports = { normalizeInput };
