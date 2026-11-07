import Anthropic from "@anthropic-ai/sdk";
import { betaJSONSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { checkMessage } from "@/lib/checker";
import {
  EXPLAIN_MODEL,
  EXPLANATION_SCHEMA,
  SYSTEM_PROMPT,
  buildUserContent,
  enforceNoSafeClaim,
  type Explanation,
} from "@/lib/explain";

// Privacy: the message is sent to Anthropic's API to write the explanation. We don't log or store it.
const MAX_CHARS = 5000;

function unavailable(reason: string, status = 503) {
  return Response.json({ error: reason }, { status });
}

export async function POST(request: Request) {
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

  // Re-run the checker on the server. Claude only ever sees evidence our own code produced,
  // never a report sent by the browser.
  const report = checkMessage(text);

  // No key configured: skip the call. The checker's verdict works fine without the AI.
  if (!process.env.ANTHROPIC_API_KEY?.trim() && !process.env.ANTHROPIC_AUTH_TOKEN?.trim()) {
    return unavailable("The AI explanation is turned off because no Anthropic API key is set.");
  }
  const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });

  try {
    const response = await client.beta.messages.parse({
      model: EXPLAIN_MODEL,
      max_tokens: 16000,
      // A short explanation doesn't need deep reasoning. Low effort keeps it fast for a live demo.
      output_config: {
        effort: "low",
        format: betaJSONSchemaOutputFormat(EXPLANATION_SCHEMA),
      },
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserContent(report, text) }],
    });

    if (response.stop_reason === "refusal") {
      return unavailable("The AI couldn't explain this one. The checker's result above still applies.");
    }
    const parsed = response.parsed_output as Explanation | null;
    if (!parsed) {
      return unavailable("The AI explanation didn't come through. The checker's result above still applies.");
    }
    return Response.json({ ...enforceNoSafeClaim(parsed), model: response.model, score: report.score });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return unavailable("The AI explanation is turned off because the Anthropic API key is missing or invalid.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return unavailable("The AI is busy right now. Try again in a minute. The checker's result above still applies.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return unavailable("Couldn't reach the AI (no internet?). The checker's result above still applies.");
    }
    if (error instanceof Anthropic.APIError) {
      return unavailable(`The AI returned an error (${error.status ?? "unknown"}). The checker's result above still applies.`);
    }
    return unavailable("Something went wrong with the AI explanation. The checker's result above still applies.");
  }
}
