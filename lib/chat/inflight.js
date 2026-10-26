// Share identical requests within one warm instance. Different histories never share a key.
class InflightGenerations {
  constructor({ max = 8 } = {}) {
    this.max = max;
    this.entries = new Map();
  }

  join(key, { run, onText, signal }) {
    if (signal?.aborted) return Promise.reject(signal.reason);
    let entry = this.entries.get(key);
    if (!entry && this.entries.size >= this.max) {
      const error = new Error("Generation capacity reached");
      error.code = "CHAT_BUSY";
      return Promise.reject(error);
    }
    const fresh = !entry;
    if (fresh) {
      entry = { controller: new AbortController(), subscribers: new Set(), text: "" };
      this.entries.set(key, entry);
    }
    const stopWhenUnused = () => {
      if (!entry.subscribers.size) {
        entry.controller.abort();
        if (this.entries.get(key) === entry) this.entries.delete(key);
      }
    };
    const promise = new Promise((resolve, reject) => {
      const remove = () => {
        entry.subscribers.delete(subscriber);
        signal?.removeEventListener("abort", abort);
      };
      const subscriber = {
        text(delta) {
          try { onText(delta); } catch (error) { remove(); reject(error); stopWhenUnused(); }
        },
        finish(error, result) { remove(); error ? reject(error) : resolve(result); },
      };
      const abort = () => {
        remove();
        reject(signal.reason);
        stopWhenUnused();
      };
      entry.subscribers.add(subscriber);
      signal?.addEventListener("abort", abort, { once: true });
      if (entry.text) subscriber.text(entry.text);
    });
    if (fresh) {
      Promise.resolve().then(() => run({
        signal: entry.controller.signal,
        onText: delta => {
          entry.text += delta;
          for (const subscriber of [...entry.subscribers]) subscriber.text(delta);
          stopWhenUnused();
        },
      })).then(
        result => { for (const subscriber of [...entry.subscribers]) subscriber.finish(null, result); },
        error => { for (const subscriber of [...entry.subscribers]) subscriber.finish(error); }
      ).finally(() => { if (this.entries.get(key) === entry) this.entries.delete(key); });
    }
    return promise;
  }
}

module.exports = { InflightGenerations };
