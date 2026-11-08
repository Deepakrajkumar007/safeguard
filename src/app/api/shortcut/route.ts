import { checkWithReputation } from "@/lib/safe-browsing";
import { guard } from "@/lib/guard";

/**
 * For the iOS Shortcuts automation ("When I get a message…").
 * Body: {"text": "<message>", "source": "action" | "try" | "paste"}
 * Response: {show, notification, alert, level, score, title, body}
 * The Shortcut shows `notification` only when `show` is "yes". (Plain strings are easier to use in
 * Shortcuts' "If" action than JSON true/false.)
 *
 * Privacy: texts go through the rule-based checker only (no AI) and are not logged or stored.
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
  const b = (body ?? {}) as { text?: unknown; source?: unknown };
  // Where the check came from, for the diagnostic log line only: the Shortcuts action, a test, or Home's "Check a message".
  const source = b.source === "action" || b.source === "try" || b.source === "paste" ? b.source : "other";

  const text = typeof b.text === "string" ? b.text.slice(0, 5000) : "";
  if (!text.trim()) return Response.json(QUIET);

  const r = await checkWithReputation(text);
  const alert = r.level === "high" || r.level === "caution";
  // Diagnostics only: the verdict level, never the message, sender, or links.
  console.info(`[shortcut] checked source=${source} level=${r.level} alert=${alert}`);
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
