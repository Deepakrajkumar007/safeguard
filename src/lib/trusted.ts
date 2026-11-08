/**
 * Trusted senders for text alerts: people whose texts LinkGuard must NOT check.
 * Shared by the iPhone app (where the list is kept) and the server (which ignores them).
 *
 * An entry can be a phone number, an email (iCloud / iMessage address), or a contact name exactly as
 * Messages shows it ("Mom"), because Shortcuts may report a saved contact by name instead of number.
 */

export type TrustedKind = "phone" | "email" | "name";

export interface TrustedEntry {
  kind: TrustedKind;
  /** Canonical form used for matching: "+17165550123", "mom@icloud.com", "mom". */
  value: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits only, with a US default: 10 digits -> +1XXXXXXXXXX, 11 starting with 1 -> +1XXXXXXXXXX. */
export function normalizePhone(raw: string): string | null {
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (!plus && digits.length === 10) return `+1${digits}`;
  if (!plus && digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

export function parseTrusted(raw: string): TrustedEntry | null {
  const s = raw.trim();
  if (!s || s.length > 120) return null;
  if (EMAIL_RE.test(s)) return { kind: "email", value: s.toLowerCase() };
  // Mostly digits and phone punctuation: treat as a phone number.
  if (/^[+(\d][\d\s().-]*$/.test(s)) {
    const p = normalizePhone(s);
    return p ? { kind: "phone", value: p } : null;
  }
  // Otherwise a contact name: letters, spaces, and a few common characters.
  if (/^[\p{L}\p{M}][\p{L}\p{M}\s.'’&-]{0,59}$/u.test(s)) return { kind: "name", value: s.toLowerCase().replace(/\s+/g, " ") };
  return null;
}

/** Display form: US numbers as (716) 555-0123, others unchanged. */
export function formatTrusted(e: TrustedEntry): string {
  if (e.kind === "phone" && /^\+1\d{10}$/.test(e.value)) {
    const d = e.value.slice(2);
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return e.value;
}

/** The comma-separated list a person pastes into their Shortcut. */
export function serializeTrusted(list: TrustedEntry[]): string {
  return list.map((e) => e.value).join(",");
}

/** Parse a comma/newline-separated list (from a Shortcut request), dropping anything invalid. */
export function deserializeTrusted(raw: string): TrustedEntry[] {
  return raw
    .split(/[,\n;]/)
    .map((x) => parseTrusted(x))
    .filter((x): x is TrustedEntry => Boolean(x))
    .slice(0, 100);
}

/** Is this sender (as Shortcuts reports it) on the trusted list? */
export function isTrustedSender(sender: string, list: TrustedEntry[]): boolean {
  const who = parseTrusted(sender);
  if (!who) return false;
  return list.some((e) => e.kind === who.kind && e.value === who.value);
}
