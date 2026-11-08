import { GoogleGenAI } from "@google/genai";
import { checkMessage } from "@/lib/checker";
import { DEFAULT_GEMINI_MODEL } from "@/lib/explain";
import {
  EXTRACTION_PROMPT,
  EXTRACTION_SCHEMA,
  MAX_IMAGE_BYTES,
  decodeDataUrl,
  parseExtraction,
  sniffImageType,
  textForChecker,
} from "@/lib/screenshot";

// Privacy: the screenshot is sent to Google's Gemini API to read the text. We don't log or store it,
// and we ask Google not to store the interaction (store: false). Links in it are never opened.
const TIMEOUT_MS = 30_000;

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  // Base64 is ~4/3 the file size, plus JSON overhead.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES * 1.4 + 1024) return fail("That image is too big. Use a screenshot under 5 MB.", 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Send JSON like {"image": "data:image/png;base64,..."}', 400);
  }
  const dataUrl = typeof (body as { image?: unknown })?.image === "string" ? (body as { image: string }).image : "";
  const bytes = dataUrl ? decodeDataUrl(dataUrl) : null;
  if (!bytes || bytes.length === 0) return fail("That doesn't look like an image. Try a PNG or JPEG screenshot.", 400);
  if (bytes.length > MAX_IMAGE_BYTES) return fail("That image is too big. Use a screenshot under 5 MB.", 413);
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return fail("That file type isn't supported. Use a PNG, JPEG, WebP, or HEIC screenshot.", 415);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fail("Screenshot reading is turned off because no Gemini API key is set.", 503);
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  // Image input in the Interactions API is only on v1beta (v1 rejects it), so this route opts in.
  const ai = new GoogleGenAI({ apiKey, apiVersion: "v1beta" });

  try {
    const interaction = await ai.interactions.create(
      {
        model,
        system_instruction: EXTRACTION_PROMPT,
        input: [
          { type: "text", text: "Transcribe the message in this screenshot." },
          { type: "image", data: Buffer.from(bytes).toString("base64"), mime_type: mimeType },
        ],
        response_format: { type: "text", mime_type: "application/json", schema: EXTRACTION_SCHEMA },
        generation_config: { thinking_level: "low" },
        store: false,
      },
      { timeout_ms: TIMEOUT_MS },
    );
    const extracted = parseExtraction(interaction.output_text);
    if (!extracted) return fail("Couldn't read that screenshot. Try pasting the text instead.", 502);
    const text = textForChecker(extracted);
    if (!text.trim()) return fail("We couldn't find a message in that image. Try a clearer screenshot.", 422);
    // The deterministic checker decides. The AI only transcribed.
    return Response.json({ extracted, text, report: checkMessage(text) });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    console.warn(`[screenshot] Gemini error status=${status ?? "none"}: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
    if (status === 429) return fail("The AI is busy right now. Try again in a minute, or paste the text instead.", 503);
    return fail("Couldn't read that screenshot right now. Try pasting the text instead.", 503);
  }
}
