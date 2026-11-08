import { checkMessage } from "@/lib/checker";
import { guard } from "@/lib/guard";

// Privacy: the message is checked in memory and never logged or stored.
const MAX_CHARS = 5000;

export async function POST(request: Request) {
  const blocked = guard(request, "check", 60);
  if (blocked) return blocked;

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 50_000) {
    return Response.json({ error: "That message is too long. Paste just the text message or link." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send JSON like {"text": "..."}' }, { status: 400 });
  }

  const text = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text : "";
  if (!text.trim()) {
    return Response.json({ error: "Paste a text message or link first." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return Response.json({ error: "That message is too long. Paste just the text message or link." }, { status: 413 });
  }

  return Response.json(checkMessage(text));
}
