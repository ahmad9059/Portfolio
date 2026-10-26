// One generation request. Retrieval never calls an embedding or database service.
function modelName() {
  const name = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) throw new Error("Invalid model configuration");
  return name;
}

function generationConfig(model, message) {
  const detailed = /\b(?:detail(?:ed|s)?|comprehensive|step.by.step|in.depth|compare|comparison|all certifications)\b/i.test(message);
  return {
    maxOutputTokens: detailed ? 1400 : 768,
    // Gemini 3.5 Flash-Lite supports minimal thinking. Do not send unsupported levels to arbitrary overrides.
    ...(/^gemini-3\.(?:1|5)-flash-lite(?:-|$)/.test(model)
      ? { thinkingConfig: { thinkingLevel: "minimal" } } : { temperature: 0.3 }),
  };
}

async function streamAnswer({ apiKey, model, body, onText, signal, fetchImpl = fetch, timeoutMs = 15000 }) {
  // Keep the deadline active while reading the body, not just until headers arrive.
  const deadline = AbortSignal.timeout(timeoutMs);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: requestSignal,
    }
  );
  if (!response.ok) {
    await response.body?.cancel();
    const error = new Error(`Generation service returned HTTP ${response.status}`);
    error.upstreamStatus = response.status;
    throw error;
  }
  if (!response.body) throw new Error("Generation service returned no stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let finishReason;

  function event(frame) {
    const payload = frame.split("\n").filter(line => line.startsWith("data:"))
      .map(line => line.slice(5).trimStart()).join("\n");
    if (!payload || payload.trim() === "[DONE]") return;
    const data = JSON.parse(payload);
    if (data.error || data.promptFeedback?.blockReason) throw new Error("Generation service rejected the response");
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason) finishReason = candidate.finishReason;
    const delta = (candidate?.content?.parts || [])
      .filter(part => typeof part.text === "string" && !part.thought)
      .map(part => part.text).join("");
    if (delta) {
      text += delta;
      if (text.length > 20000) throw new Error("Generation response exceeded the size limit");
      onText(delta);
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Normalize CRLF without dropping a CR that straddles two packets.
      buffer = buffer.replace(/\r\n/g, "\n");
      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        event(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
      }
      if (buffer.length > 1024 * 1024) throw new Error("Generation event exceeded the size limit");
    }
    buffer += decoder.decode();
    if (buffer.trim()) event(buffer);
    if (!text.trim()) throw new Error("Generation service returned an empty response");
    if (!finishReason || !["STOP", "MAX_TOKENS"].includes(finishReason)) {
      throw new Error("Generation stream ended without a successful completion");
    }
    return { text, cacheable: finishReason === "STOP" };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

module.exports = { modelName, generationConfig, streamAnswer };
