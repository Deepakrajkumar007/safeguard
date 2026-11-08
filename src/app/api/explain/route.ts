import { GoogleGenAI } from "@google/genai";
import { checkMessage } from "@/lib/checker";
import {
  DEFAULT_GEMINI_MODEL,
  EXPLANATION_SCHEMA,
  SYSTEM_PROMPT,
  buildUserContent,
  enforceNoSafeClaim,
  parseExplanation,
} from "@/lib/explain";
import { guard } from "@/lib/guard";

// Privacy: the message is sent to Google's Gemini API to write the explanation.
// We don't log or store it, and we ask Google not to store the interaction (store: false).
const MAX_CHARS = 5000;
const TIMEOUT_MS = 20_000;

function unavailable(reason: string, status = 503) {
  return Response.json({ error: reason }, { status });
}

export async function POST(request: Request) {
  const blocked = guard(request, "explain", 20);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return unavailable('Send JSON like {"text": "..."}', 400);
  }
  const text = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text : "";
  if (!text.trim() || text.length > MAX_CHARS) {
    return unavailable("Paste a text message or link first (5,000 characters max).", 400);
  }

  // Re-run the checker on the server. The AI only ever sees evidence our own code produced,
  // never a report sent by the browser.
  const report = checkMessage(text);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return unavailable("The AI explanation is turned off because no Gemini API key is set.");
  }
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const interaction = await ai.interactions.create(
      {
        model,
        system_instruction: SYSTEM_PROMPT,
        input: buildUserContent(report, text),
        response_format: { type: "text", mime_type: "application/json", schema: EXPLANATION_SCHEMA },
        // A short explanation doesn't need deep reasoning. Low thinking keeps it fast for a live demo.
        generation_config: { thinking_level: "low" },
        store: false,
      },
      { timeout_ms: TIMEOUT_MS },
    );

    const parsed = parseExplanation(interaction.output_text);
    if (!parsed) {
      return unavailable("The AI explanation didn't come through. The checker's result above still applies.");
    }
    return Response.json({ ...enforceNoSafeClaim(parsed), model, score: report.score });
  } catch (error) {
    // Map common failures to plain messages. Never echo the raw error (it can include request details).
    const status = (error as { status?: number; statusCode?: number })?.status ?? (error as { statusCode?: number })?.statusCode;
    // Server log for debugging: status and a short error summary only, never the user's message.
    console.warn(`[explain] Gemini error status=${status ?? "none"}: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
    if (status === 400 || status === 401 || status === 403) {
      return unavailable("The AI explanation is turned off because the Gemini API key is missing or invalid.");
    }
    if (status === 404) {
      return unavailable(`The AI model "${model}" wasn't found. Set GEMINI_MODEL in .env.local.`);
    }
    if (status === 429) {
      return unavailable("The AI is busy right now. Try again in a minute. The checker's result above still applies.");
    }
    return unavailable("Couldn't reach the AI right now. The checker's result above still applies.");
  }
}
