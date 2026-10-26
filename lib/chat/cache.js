class AnswerCache {
  constructor({ max = 100, ttl = 10 * 60 * 1000, now = Date.now } = {}) {
    this.entries = new Map();
    this.max = max;
    this.ttl = ttl;
    this.now = now;
  }
  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (this.now() - entry.at >= this.ttl) { this.entries.delete(key); return null; }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.text;
  }
  set(key, text) {
    if (!text || text.length > 20000) return;
    this.entries.delete(key);
    while (this.entries.size >= this.max) this.entries.delete(this.entries.keys().next().value);
    this.entries.set(key, { text, at: this.now() });
  }
}

module.exports = { AnswerCache };
