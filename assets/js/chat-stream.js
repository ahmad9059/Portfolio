(function(root) {
  // The same SSE reader is used by the browser and Node regression tests.
  async function readChatStream(body, onText) {
    if (!body) throw new Error('No response stream received. Please try again.');
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '', text = '', complete = false;

    function event(frame) {
      const data = frame.split('\n').filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart()).join('\n');
      if (!data) return;
      if (data.trim() === '[DONE]') { complete = true; return; }
      let parsed;
      try { parsed = JSON.parse(data); } catch { throw new Error('Invalid response received. Please try again.'); }
      if (parsed.error) throw new Error(String(parsed.error).slice(0, 500));
      if (typeof parsed.text === 'string' && parsed.text) {
        text += parsed.text;
        if (text.length > 65536) throw new Error('Response exceeded the size limit.');
        onText(parsed.text, text);
      }
    }

    try {
      while (!complete) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        let boundary;
        while (!complete && (boundary = buffer.indexOf('\n\n')) !== -1) {
          event(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
        }
        if (buffer.length > 131072) throw new Error('Response event exceeded the size limit.');
      }
      buffer += decoder.decode();
      if (!complete && buffer.trim()) event(buffer);
      if (!complete) throw new Error('The response was interrupted. Please try again.');
      if (!text.trim()) throw new Error('No response received. Please try again.');
      return text;
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  if (typeof module === 'object' && module.exports) module.exports = { readChatStream };
  else root.PortfolioChatStream = { readChatStream };
})(globalThis);
