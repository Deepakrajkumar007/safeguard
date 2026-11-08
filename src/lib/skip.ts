import { parse } from "tldts";

/**
 * The Gmail "never scan" list, shared by the server (src/app/api/gmail/scan) and the phone app (which also
 * hides never-scan senders from results right away, without waiting for a rescan).
 */
export const MAX_SKIP = 25;

/** True when the domain ends in a real ending (.com, .co.uk, ...), so typos like "gmail.con" are caught. */
function realDomain(domain: string): boolean {
  const p = parse(domain);
  return Boolean(p.domain) && Boolean(p.isIcann || p.isPrivate);
}

/** Accepts "name@company.com", "@company.com", or "company.com". Returns a safe canonical form or null. */
export function normalizeSkipEntry(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s.length > 120) return null;
  if (/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return realDomain(s.split("@")[1]) ? s : null; // full address
  const domain = s.replace(/^@/, "");
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) && realDomain(domain)) return `@${domain}`;
  return null;
}

/** "gmail.con" -> ".com": a friendly hint for the most common ending typos, or null. */
export function endingTypoHint(raw: string): string | null {
  const m = /\.(con|cmo|ocm|vom|xom|comm|cm|om|co m)$/.exec(raw.trim().toLowerCase());
  return m ? ".com" : null;
}

/** "Deepak <hi@mail.example.com>" -> "hi@mail.example.com" */
export function addressFromHeader(fromHeader: string): string {
  return (/<([^>]+)>/.exec(fromHeader)?.[1] ?? fromHeader).trim().toLowerCase();
}

/**
 * Safety net behind Gmail's own -from: search filter: true when the sender's ADDRESS is on the never-scan list.
 * "name@x.com" matches that address; "@x.com" matches x.com and its subdomains (mail.x.com).
 * The display name is ignored on purpose: a scammer could name themselves "x.com" to dodge the scan.
 */
export function isSkippedSender(fromHeader: string, skip: string[]): boolean {
  const addr = addressFromHeader(fromHeader);
  const at = addr.lastIndexOf("@");
  if (at < 1) return false;
  const domain = addr.slice(at + 1);
  return skip.some((raw) => {
    const n = normalizeSkipEntry(raw);
    if (!n) return false;
    if (!n.startsWith("@")) return n === addr;
    const d = n.slice(1);
    return domain === d || domain.endsWith(`.${d}`);
  });
}
