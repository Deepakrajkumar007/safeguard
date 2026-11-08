import { checkMessage } from "@/lib/checker";
import { guard } from "@/lib/guard";

/**
 * For the iOS Shortcuts automation ("When I get a message…").
 * Body: {"text": "<message>"}  Response: {alert, level, score, title, body}
 * The Shortcut shows a notification only when `alert` is true.
 *
 * Privacy: only the rule-based checker runs here (no AI). The message is not logged or stored.
 */
export async function POST(request: Request) {
  const blocked = guard(request, "shortcut", 60);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send JSON like {"text": "..."}' }, { status: 400 });
  }
  const text = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text.slice(0, 5000) : "";
  if (!text.trim()) return Response.json({ alert: false, level: "none", score: 0, title: "", body: "" });

  const r = checkMessage(text);
  const alert = r.level === "high" || r.level === "caution";
  const title = r.level === "high" ? "LinkGuard: High risk text" : r.level === "caution" ? "LinkGuard: Be careful" : "LinkGuard";
  const lead = r.scamType ? `Looks like a ${r.scamType.label.toLowerCase()}.` : r.headline + ".";
  const step = r.nextSteps[0] ?? "";
  return Response.json({ alert, level: r.level, score: r.score, title, body: `${lead} ${step}`.trim().slice(0, 180) });
}
