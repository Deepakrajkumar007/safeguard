import { parse } from "tldts";

// Links with a scheme or "www.", or bare domains like "chase-alerts.top/login".
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<>"'`]+|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?::\d{2,5})?(?:\/[^\s<>"'`]*)?/gi;

// US phone numbers: (888) 555-0199, 888-555-0199, +1 888 555 0199, 1-888-555-0199.
// Lookarounds stop us from grabbing 10 digits out of a long tracking number.
const PHONE_RE = /(?<![\d-])(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})(?![\d-])/g;

// File names that look like domains when written bare ("invoice.zip").
const BARE_FILE_TLDS = new Set(["zip", "mov", "pdf", "doc", "jpg", "png"]);

function trimTrailing(s: string): string {
  return s.replace(/[.,;:!?)\]}'"…]+$/u, "");
}

/** Find links in free text. Bare domains must end in a real ICANN domain ending. */
export function extractUrls(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(URL_RE)) {
    const raw = trimTrailing(match[0]);
    if (!raw) continue;
    const hasScheme = /^(https?:\/\/|www\.)/i.test(raw);
    if (!hasScheme) {
      const p = parse(raw);
      if (!p.domain || p.isIcann !== true) continue;
      const tld = (p.publicSuffix ?? "").toLowerCase();
      if (BARE_FILE_TLDS.has(tld) && !raw.includes("/")) continue;
    }
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

/** Find US-style phone numbers, formatted as (888) 555-0199. */
export function extractPhones(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of text.matchAll(PHONE_RE)) {
    const formatted = `(${m[1]}) ${m[2]}-${m[3]}`;
    if (seen.has(formatted)) continue;
    seen.add(formatted);
    out.push(formatted);
  }
  return out;
}
