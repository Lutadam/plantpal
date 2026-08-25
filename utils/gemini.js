import { GEMINI_API_KEY } from "../gemini/config";

// Confirmed live against the Gemini API: an earlier attempt with an older
// model id returned a 404 whose error message explicitly named this model as
// its replacement, and requests against it have since returned 200s.
const MODEL = "gemini-3.6-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// The chat UI renders plain text (no Markdown parser), so strip common
// Markdown syntax in case the model uses it despite being asked not to.
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\* /gm, "• ")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1");
}

// status: "no-key" (not configured) | "rate-limited" (429) | "invalid-key" (401/403)
// | "network-error" (request never reached/completed) | "unavailable" (any other
// server-side failure) | "ok"
export async function sendChatMessage(history, systemPrompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    return { status: "no-key" };
  }

  let response;
  try {
    const contents = history.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const body = {
      contents,
      ...(systemPrompt
        ? { systemInstruction: { parts: [{ text: systemPrompt }] } }
        : {}),
    };

    response = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { status: "network-error" };
  }

  if (response.status === 429) return { status: "rate-limited" };
  if (response.status === 401 || response.status === 403) {
    return { status: "invalid-key" };
  }
  if (!response.ok) return { status: "unavailable" };

  try {
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { status: "unavailable" };

    return { status: "ok", text: stripMarkdown(text) };
  } catch {
    return { status: "unavailable" };
  }
}
