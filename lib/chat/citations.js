// Remove numeric source markers even when their brackets span streaming packets.
// Preserve numbered Markdown links, ordered lists, dates and ordinary numbers.
class CitationFilter {
  constructor() { this.pending = ""; }
  push(text, final = false) {
    let input = this.pending + text;
    this.pending = "";
    let hold = input.length;
    const incomplete = input.match(/\[(?:\d[\d\s,;–-]*)?$/);
    if (!final && incomplete && incomplete[0].length < 100) hold = incomplete.index;
    const last = input.match(/\[\d+(?:\s*[,;–-]\s*\d+)*\]$/);
    if (!final && last) hold = Math.min(hold, last.index);
    this.pending = input.slice(hold);
    input = input.slice(0, hold);
    return input.replace(/\[\d+(?:\s*[,;–-]\s*\d+)*\](?!\()/g, "");
  }
  finish() { return this.push("", true); }
}

module.exports = { CitationFilter };
