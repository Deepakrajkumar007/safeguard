import { parse } from "tldts";
import { checkMessage, levelFor } from "./checker";
import { analyzeLink, officialBrandFor } from "./url-analysis";
import type { Level } from "./types";

/**
 * Gmail scanning (server-only). Privacy limits are enforced HERE, in the Gmail search itself:
 *  - only mail from the last 24 hours (newer_than:1d), at most MAX_EMAILS
 *  - senders on the person's "never scan" list are excluded by Gmail, so we never download them
 * Only the rule-based checker runs. Email bodies are never returned to the phone, logged, or stored.
 */

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const MAX_EMAILS = 30;
export const MAX_SKIP = 25;

// ---------- "Never scan" list ----------

/** Accepts "name@company.com", "@company.com", or "company.com". Returns a safe canonical form or null. */
export function normalizeSkipEntry(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s.length > 120) return null;
  if (/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) return s; // full address
  const domain = s.replace(/^@/, "");
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) && parse(domain).domain) return `@${domain}`;
  return null;
}

/** Gmail search: last 24 hours, minus never-scan senders. Entries are validated, so no query injection. */
export function buildQuery(skip: string[]): string {
  const parts = ["newer_than:1d", "-in:chats"];
  for (const entry of skip.slice(0, MAX_SKIP)) {
    const n = normalizeSkipEntry(entry);
    if (n) parts.push(`-from:${n.startsWith("@") ? n.slice(1) : n}`);
  }
  return parts.join(" ");
}

// ---------- Parsing a Gmail API message ----------

interface GmailPart {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: { name: string; value: string }[];
}
export interface GmailMessage {
  id: string;
  internalDate?: string;
  payload?: GmailPart;
}

export interface ParsedEmail {
  id: string;
  from: string;
  fromAddress: string;
  subject: string;
  receivedAt: string | null;
  text: string;
  links: string[];
  /** Domain Gmail verified with DMARC (Authentication-Results: dmarc=pass header.from=...). */
  dmarcPassDomain: string | null;
}

function b64url(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function header(part: GmailPart | undefined, name: string): string {
  return part?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** HTML to plain text, collecting real link targets (href), which can differ from the visible text. */
export function htmlToText(html: string): { text: string; hrefs: string[] } {
  const hrefs: string[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const u = m[1].trim().replace(/&amp;/g, "&");
    if (/^https?:\/\//i.test(u)) hrefs.push(u);
  }
  const text = html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return { text, hrefs };
}

function collect(part: GmailPart | undefined, acc: { plain: string[]; html: string[] }) {
  if (!part) return;
  const type = (part.mimeType ?? "").toLowerCase();
  if (type === "text/plain" && part.body?.data) acc.plain.push(b64url(part.body.data));
  else if (type === "text/html" && part.body?.data) acc.html.push(b64url(part.body.data));
  for (const p of part.parts ?? []) collect(p, acc);
}

/** "dmarc=pass ... header.from=chase.com" -> "chase.com" */
export function dmarcPassDomain(authResults: string): string | null {
  const m = /dmarc=pass\b[^;]*?header\.from=([a-z0-9.-]+)/i.exec(authResults);
  return m ? m[1].toLowerCase() : null;
}

export function parseGmailMessage(msg: GmailMessage): ParsedEmail {
  const acc = { plain: [] as string[], html: [] as string[] };
  collect(msg.payload, acc);
  const fromHeader = header(msg.payload, "From");
  const fromAddress = (/<([^>]+)>/.exec(fromHeader)?.[1] ?? fromHeader).trim().toLowerCase();
  const html = acc.html.map(htmlToText);
  const text = (acc.plain.join("\n").trim() || html.map((h) => h.text).join("\n")).slice(0, 4000);
  const links = [...new Set(html.flatMap((h) => h.hrefs))];
  const auth = msg.payload?.headers?.filter((h) => h.name.toLowerCase() === "authentication-results").map((h) => h.value) ?? [];
  return {
    id: msg.id,
    from: fromHeader.slice(0, 200),
    fromAddress,
    subject: header(msg.payload, "Subject").slice(0, 300),
    receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : null,
    text,
    links,
    dmarcPassDomain: auth.map(dmarcPassDomain).find(Boolean) ?? null,
  };
}

// ---------- Verdict ----------

// Email marketing / click-tracking services that real companies send through. Their links are left out of
// brand-mismatch checks so ordinary newsletters don't look like scams.
const EMAIL_SERVICE_DOMAINS = new Set([
  "sendgrid.net", "list-manage.com", "mailchimp.com", "mailchi.mp", "hubspotlinks.com", "hubspotemail.net",
  "exacttarget.com", "rs6.net", "constantcontact.com", "klclick.com", "klclick1.com", "klaviyomail.com",
  "customeriomail.com", "mandrillapp.com", "mailgun.org", "sparkpostmail.com", "ct.sendgrid.net", "mcusercontent.com",
  "convertkit-mail.com", "ck.page", "substack.com", "beehiiv.com", "braze.com", "awstrack.me", "mktdns.com", "mkt.com",
]);

function isEmailService(url: string): boolean {
  const d = parse(url).domain;
  return d ? EMAIL_SERVICE_DOMAINS.has(d) : false;
}

export interface EmailVerdict {
  id: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  score: number;
  level: Level;
  scamType: string | null;
  reasons: { title: string; detail: string }[];
  /** Set when Gmail verified the sender is a brand on our list (e.g. "Chase"). */
  verifiedSender: string | null;
}

export function judgeEmail(e: ParsedEmail): EmailVerdict {
  const base = { id: e.id, from: e.from, subject: e.subject, receivedAt: e.receivedAt };

  // Gmail checked this email really came from a verified brand domain (DMARC pass). Strong sign it's genuine.
  const verifiedDomain = e.dmarcPassDomain ? parse(e.dmarcPassDomain).domain : null;
  const brand = officialBrandFor(verifiedDomain);
  const fromDomain = parse(e.fromAddress.split("@")[1] ?? "").domain;
  if (brand && fromDomain === verifiedDomain) {
    return {
      ...base,
      score: 0,
      level: "none",
      scamType: null,
      reasons: [{ title: `Really from ${brand.name}`, detail: `Gmail confirmed this email came from ${verifiedDomain}.` }],
      verifiedSender: brand.name,
    };
  }

  const links = e.links.filter((l) => !isEmailService(l)).slice(0, 10);
  const textLinks = e.text.split(/\s+/).filter((w) => /^https?:\/\//i.test(w) && isEmailService(w));
  let body = e.text;
  for (const l of textLinks) body = body.split(l).join(" ");
  // The sender's display name goes in with the text ("Chase Security"), but the sender's ADDRESS is checked
  // on its own below, so a normal sender domain isn't mistaken for a suspicious link.
  const displayName = e.from.replace(/<[^>]*>/g, "").replace(/"/g, "").trim();
  const forChecker = [`From: ${displayName}`, `Subject: ${e.subject}`, "", body, ...links].join("\n").slice(0, 5000);
  const r = checkMessage(forChecker);

  const senderDomain = e.fromAddress.split("@")[1] ?? "";
  const senderEvidence = senderDomain
    ? analyzeLink(`https://${senderDomain}`)
        .evidence.filter((x) => x.weight > 0 && !["link.login_words", "link.many_dashes"].includes(x.id))
        .map((x) => ({ ...x, detail: `Sender address (${e.fromAddress}): ${x.detail}` }))
    : [];
  const risky = [...senderEvidence, ...r.evidence.filter((x) => !x.good)].sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, risky.reduce((sum, x) => sum + x.weight, 0));
  const level = levelFor(score, risky.length > 0);
  return {
    ...base,
    score,
    level,
    scamType: level === "none" ? null : (r.scamType?.label ?? (senderEvidence.length ? "Fake sender address" : null)),
    reasons: risky.slice(0, 3).map((x) => ({ title: x.title, detail: x.detail })),
    verifiedSender: null,
  };
}
