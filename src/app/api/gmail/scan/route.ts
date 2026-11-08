import { buildQuery, isSkippedSender, judgeEmail, MAX_EMAILS, MAX_SKIP, normalizeSkipEntry, parseGmailMessage, type GmailMessage } from "@/lib/gmail";
import { guard } from "@/lib/guard";
import { unseal } from "@/lib/session";

// Scans the last 24 hours of Gmail with the rule-based checker. Returns a summary only, never email bodies.
export const maxDuration = 30;

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmail<T>(path: string, token: string): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

export async function POST(request: Request) {
  const blocked = guard(request, "gmail-scan", 6);
  if (blocked) return blocked;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const session = unseal<{ at: string }>(bearer);
  if (!session) return Response.json({ error: "Your Gmail sign-in expired. Please sign in again.", expired: true }, { status: 401 });

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }
  const rawSkip = Array.isArray((body as { skip?: unknown }).skip) ? ((body as { skip: unknown[] }).skip as unknown[]) : [];
  const skip = rawSkip.filter((s): s is string => typeof s === "string").map(normalizeSkipEntry).filter((s): s is string => Boolean(s)).slice(0, MAX_SKIP);
  const q = buildQuery(skip);

  try {
    const profile = await gmail<{ emailAddress?: string }>("/profile", session.at);
    if (profile.status === 401) return Response.json({ error: "Your Gmail sign-in expired. Please sign in again.", expired: true }, { status: 401 });
    if (!profile.ok) return Response.json({ error: "Gmail didn't respond. Try again in a minute." }, { status: 502 });

    const list = await gmail<{ messages?: { id: string }[] }>(`/messages?maxResults=${MAX_EMAILS}&q=${encodeURIComponent(q)}`, session.at);
    if (!list.ok) return Response.json({ error: "Couldn't list your recent emails. Try again in a minute." }, { status: 502 });
    let ids = (list.data.messages ?? []).map((m) => m.id).slice(0, MAX_EMAILS);

    // Safety net for the never-scan list: Gmail's -from: search doesn't always catch every sender, so read ONLY
    // the From header of each email first and drop never-scan senders before anything else is downloaded.
    let skippedCount = 0;
    if (skip.length) {
      const keep: string[] = [];
      for (let i = 0; i < ids.length; i += 6) {
        const batch = await Promise.all(
          ids.slice(i, i + 6).map(async (id) => ({
            id,
            m: await gmail<GmailMessage>(`/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=From`, session.at),
          })),
        );
        for (const { id, m } of batch) {
          const from = m.ok ? (m.data.payload?.headers?.find((h) => h.name.toLowerCase() === "from")?.value ?? "") : "";
          if (from && isSkippedSender(from, skip)) skippedCount++;
          else keep.push(id);
        }
      }
      ids = keep;
    }

    // Fetch a few at a time to stay quick and polite to Gmail.
    const verdicts = [];
    for (let i = 0; i < ids.length; i += 6) {
      const batch = await Promise.all(
        ids.slice(i, i + 6).map((id) => gmail<GmailMessage>(`/messages/${encodeURIComponent(id)}?format=full`, session.at)),
      );
      for (const m of batch) if (m.ok) verdicts.push(judgeEmail(parseGmailMessage(m.data)));
    }

    const flagged = verdicts.filter((v) => v.level === "high" || v.level === "caution").sort((a, b) => b.score - a.score);
    return Response.json({
      account: profile.data.emailAddress ?? null,
      window: "last 24 hours",
      scanned: verdicts.length,
      skippedSenders: skip,
      skippedCount,
      flagged,
      verifiedCount: verdicts.filter((v) => v.verifiedSender).length,
    });
  } catch {
    return Response.json({ error: "Couldn't reach Gmail right now. Try again in a minute." }, { status: 502 });
  }
}
