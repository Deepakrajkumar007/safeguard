import { checkWithReputation } from "@/lib/safe-browsing";
import { guard } from "@/lib/guard";
import { deserializeTrusted, isTrustedSender } from "@/lib/trusted";

/**
 * For the iOS Shortcuts automation ("When I get a message…").
 * Body: {"text": "<message>", "sender": "<who sent it>", "trusted": "<comma-separated trusted senders>"}
 * Response: {show, notification, alert, level, score, title, body, skipped?}
 * The Shortcut shows `notification` only when `show` is "yes". (Plain strings are easier to use in
 * Shortcuts' "If" action than JSON true/false.)
 *
 * Privacy: texts from trusted senders are ignored right away: not checked, logged, or stored.
 * Other texts go through the rule-based checker only (no AI) and are not logged or stored.
 */
const QUIET = { show: "no", notification: "", alert: false, level: "none", score: 0, title: "", body: "" } as const;

export async function POST(request: Request) {
  const blocked = guard(request, "shortcut", 60);
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send JSON like {"text": "..."}' }, { status: 400 });
  }
  const b = (body ?? {}) as { text?: unknown; sender?: unknown; trusted?: unknown };
  const sender = typeof b.sender === "string" ? b.sender.slice(0, 200) : "";
  const trusted = typeof b.trusted === "string" ? deserializeTrusted(b.trusted.slice(0, 5000)) : [];

  // Trusted sender: stop before looking at the message at all.
  if (sender && trusted.length && isTrustedSender(sender, trusted)) {
    return Response.json({ ...QUIET, skipped: true });
  }

  const text = typeof b.text === "string" ? b.text.slice(0, 5000) : "";
  if (!text.trim()) return Response.json(QUIET);

  const r = await checkWithReputation(text);
  const alert = r.level === "high" || r.level === "caution";
  const title = r.level === "high" ? "LinkGuard: High risk text" : r.level === "caution" ? "LinkGuard: Be careful" : "LinkGuard";
  const lead = r.scamType ? `Looks like a ${r.scamType.label.toLowerCase()}.` : r.headline + ".";
  const step = r.nextSteps[0] ?? "";
  const note = `${lead} ${step}`.trim().slice(0, 180);
  return Response.json({
    show: alert ? "yes" : "no",
    notification: alert ? `${title}. ${note}` : "",
    alert,
    level: r.level,
    score: r.score,
    title,
    body: note,
  });
}
