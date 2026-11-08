import { checkMessage } from "./checker";
import { extractUrls } from "./extract";
import { NOT_LISTED_NOTE, reputationEvidence, type ReputationResult } from "./reputation";
import type { CheckReport } from "./types";

/**
 * Google Safe Browsing Lookup API v4 (server-only). Sends only the links, never the message.
 * Free for non-commercial use; a commercial product would use Google's Web Risk API instead.
 * If the key is missing or Google is slow, we skip the check: the rule-based result stands.
 */
const ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const cache = new Map<string, { threat: string | null; until: number }>();

function withScheme(u: string): string {
  return /^https?:\/\//i.test(u) ? u : `http://${u}`;
}

export async function lookupUrls(rawUrls: string[]): Promise<ReputationResult> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY?.trim();
  const urls = [...new Set(rawUrls.map(withScheme))].slice(0, 20);
  if (!key || urls.length === 0) return { checked: false, flagged: [] };

  const now = Date.now();
  const flagged: { url: string; threat: string }[] = [];
  const toAsk = urls.filter((u) => {
    const hit = cache.get(u);
    if (hit && hit.until > now) {
      if (hit.threat) flagged.push({ url: u, threat: hit.threat });
      return false;
    }
    return true;
  });
  if (toAsk.length === 0) return { checked: true, flagged };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        client: { clientId: "linkguard", clientVersion: "0.1.0" },
        threatInfo: {
          threatTypes: ["SOCIAL_ENGINEERING", "MALWARE", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: toAsk.map((url) => ({ url })),
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { checked: false, flagged };
    const data = (await res.json()) as { matches?: { threatType: string; threat: { url: string } }[] };
    const matched = new Map((data.matches ?? []).map((m) => [m.threat.url, m.threatType]));
    for (const u of toAsk) {
      const threat = matched.get(u) ?? null;
      cache.set(u, { threat, until: now + 5 * 60_000 });
      if (threat) flagged.push({ url: u, threat });
    }
    if (cache.size > 2000) for (const [k, v] of cache) if (v.until < now) cache.delete(k);
    return { checked: true, flagged };
  } catch {
    return { checked: false, flagged };
  }
}

/** The rule-based check plus Google's reputation list. Rules still decide; a listing adds strong evidence. */
export async function checkWithReputation(text: string): Promise<CheckReport> {
  const rep = await lookupUrls(extractUrls(text).slice(0, 10));
  const report = checkMessage(text, { extraEvidence: reputationEvidence(rep) });
  if (rep.checked && rep.flagged.length === 0 && report.links.length > 0 && (report.level === "none" || report.level === "low")) {
    report.evidence.push(NOT_LISTED_NOTE);
  }
  return report;
}
