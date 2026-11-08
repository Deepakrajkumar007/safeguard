import { parse } from "tldts";
import { BRANDS, type Brand } from "./brands";
import { editDistance } from "./strings";

/**
 * Voice launcher matching. Speech (or typing) only ever picks a BRAND from the verified list.
 * The address we open is always that brand's fixed `launchUrl`. Speech is never turned into a URL.
 */

export interface LaunchMatch {
  /** The brand to open, if we're confident. */
  brand: Brand | null;
  /** "Did you mean…" options when we're not sure. */
  suggestions: Brand[];
  /** The person typed or said a web address we don't recognize. We refuse to open it. */
  unknownAddress: boolean;
}

const LAUNCHABLE = BRANDS.filter((b) => b.launchUrl);

// Words people say around the name: "please open up the Chase website for me".
const FILLER = [
  "please", "can you", "could you", "would you", "i want to", "i'd like to", "i would like to", "help me",
  "open up", "open", "go to", "goto", "take me to", "launch", "visit", "show me", "bring up", "pull up",
  "for me", "the", "my", "website", "web site", "site", "app", "page", "account", "online",
  "log in", "login", "sign in", "dot com", "dot gov", "dot org",
];

export function normalizeSpoken(input: string): string {
  // Dictation adds punctuation ("Open Chase."), so drop it all. Addresses were already handled before this.
  let s = ` ${input.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\s]/g, " ")} `;
  for (const f of FILLER) s = s.replace(new RegExp(`\\s${f.replace(/ /g, "\\s+")}(?=\\s)`, "g"), " ");
  return s.replace(/\s+/g, " ").trim();
}

const ALIASES: { brand: Brand; alias: string }[] = LAUNCHABLE.flatMap((brand) =>
  [...new Set([brand.name, ...brand.aliases].map((a) => normalizeSpoken(a)).filter(Boolean))].map((alias) => ({ brand, alias })),
);

/** If the input is a web address, return its hostname; otherwise null. */
function asHostname(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!/^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/.test(t)) return null;
  const p = parse(t);
  return p.hostname && p.domain ? p.hostname : null;
}

export function matchSpoken(input: string): LaunchMatch {
  const none: LaunchMatch = { brand: null, suggestions: [], unknownAddress: false };
  if (!input.trim()) return none;

  // 1. A typed address: open it only if its hostname EXACTLY matches a verified domain (or www. + domain).
  const host = asHostname(input);
  if (host) {
    const bare = host.replace(/^www\./, "");
    const brand = LAUNCHABLE.find((b) => b.domains.includes(bare));
    return brand ? { brand, suggestions: [], unknownAddress: false } : { ...none, unknownAddress: true };
  }

  const said = normalizeSpoken(input);
  if (!said) return none;

  // 2. Exact name match: "chase", "bank of america", "pay pal".
  const exact = ALIASES.filter((a) => a.alias === said);
  if (exact.length) return { brand: exact[0].brand, suggestions: [], unknownAddress: false };

  // 3. The name appears as whole words inside what they said: "amazon prime" -> Amazon. Longest name wins.
  const words = ` ${said} `;
  const within = ALIASES.filter((a) => words.includes(` ${a.alias} `)).sort((x, y) => y.alias.length - x.alias.length);
  if (within.length) {
    const top = within[0];
    const others = uniqueBrands(within.slice(1).map((w) => w.brand)).filter((b) => b.id !== top.brand.id);
    return { brand: top.brand, suggestions: others.slice(0, 3), unknownAddress: false };
  }

  // 4. Close misspellings or mishearings: suggest, don't open automatically.
  const limit = said.length >= 6 ? 2 : said.length >= 4 ? 1 : 0;
  const close = ALIASES.map((a) => ({ ...a, d: editDistance(said, a.alias) }))
    .filter((a) => a.d <= limit)
    .sort((x, y) => x.d - y.d);
  return { brand: null, suggestions: uniqueBrands(close.map((c) => c.brand)).slice(0, 3), unknownAddress: false };
}

function uniqueBrands(list: Brand[]): Brand[] {
  const seen = new Set<string>();
  return list.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true)));
}

/** "https://www.chase.com" -> "www dot chase dot com", for reading aloud. */
export function spokenAddress(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\./g, " dot ").replace(/-/g, " dash ");
}

/** Brands shown before the person says anything. */
export const POPULAR_IDS = ["chase", "bankofamerica", "wellsfargo", "amazon", "paypal", "medicare", "ssa", "usps", "gmail", "irs"];
export const POPULAR: Brand[] = POPULAR_IDS.map((id) => LAUNCHABLE.find((b) => b.id === id)).filter((b): b is Brand => Boolean(b));
