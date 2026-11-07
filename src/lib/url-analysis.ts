import { parse } from "tldts";
import { BRANDS, RISKY_TLDS, SHORTENERS, USER_CONTENT_HOSTS, type Brand } from "./brands";
import { editDistance, hasNonAscii, hostToUnicode, mapConfusables, skeleton } from "./strings";
import type { Evidence, LinkReport } from "./types";

// Words that may sit next to a brand name in a fake domain: "mychase", "paypal-secure", "uspsdelivery".
const AFFIXES = new Set([
  "my", "secure", "security", "login", "logon", "signin", "verify", "verification", "the", "online",
  "www", "account", "accounts", "support", "help", "service", "services", "official", "web", "mobile",
  "app", "update", "updates", "alert", "alerts", "info", "us", "usa", "go", "get", "e", "bank",
  "banking", "pay", "payment", "payments", "mail", "id", "auth", "center", "centre", "team", "care",
  "billing", "refund", "refunds", "reward", "rewards", "gift", "track", "tracking", "delivery",
  "redelivery", "post", "express", "toll", "tolls", "customer", "portal", "home", "inc", "corp",
  "net", "com", "claim", "unlock", "confirm", "notice", "fraud", "case", "member", "members",
]);

// Account/login words. Needed before we flag brands that are also everyday words (Chase, Apple, UPS).
const CONTEXT_WORDS = new Set([
  "login", "logon", "signin", "sign", "verify", "verification", "account", "accounts", "secure",
  "security", "update", "billing", "payment", "pay", "refund", "support", "help", "unlock",
  "confirm", "wallet", "id", "auth", "password", "track", "tracking", "delivery", "redelivery",
  "parcel", "package", "customs", "alert", "alerts", "service", "bank", "banking", "online",
  "toll", "tolls", "claim", "reward", "rewards", "gift", "fraud", "suspended", "locked", "case",
]);

// Real words that are one letter away from a brand. Never call these look-alikes.
const NEAR_MISS_WORDS = new Set([
  "apply", "ample", "chose", "chaser", "chased", "chases", "chasm", "goggle", "goggles", "venom",
  "targe", "tarot", "amazons", "medicaid", "costa", "fedez",
]);

const LOGIN_PATH_RE =
  /(log-?in|sign-?in|verify|verification|account|update|secure|unlock|confirm|billing|payment|wallet|password|webscr|auth)/i;

export function hostMatches(hostname: string, entry: string): boolean {
  // Exact host or a true subdomain (dot boundary). Never "contains".
  return hostname === entry || hostname.endsWith("." + entry);
}

export function officialBrandFor(domain: string | null): Brand | null {
  if (!domain) return null;
  return BRANDS.find((b) => b.domains.includes(domain)) ?? null;
}

/** Split a hostname (minus its public suffix) into word tokens. */
function hostTokens(hostname: string, publicSuffix: string | null): string[] {
  const withoutSuffix =
    publicSuffix && hostname.endsWith("." + publicSuffix)
      ? hostname.slice(0, -(publicSuffix.length + 1))
      : hostname;
  return withoutSuffix
    .split(/[.\-_]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

/** Tokens plus adjacent joins, so "wells-fargo" and "pay-pal" are seen as "wellsfargo" and "paypal". */
function withJoins(tokens: string[]): string[] {
  const out = [...tokens];
  for (let i = 0; i < tokens.length; i++) {
    if (i + 1 < tokens.length) out.push(tokens[i] + tokens[i + 1]);
    if (i + 2 < tokens.length) out.push(tokens[i] + tokens[i + 1] + tokens[i + 2]);
  }
  return out;
}

type BrandHit = { brand: Brand; how: "name" | "lookalike" | "misspelled" | "close"; token: string };

/** Does this single token use a brand name, exactly or with allowed affixes like "my"/"secure"? */
function usesBrandName(token: string, brandToken: string): boolean {
  if (token === brandToken) return true;
  let from = 0;
  for (;;) {
    const i = token.indexOf(brandToken, from);
    if (i < 0) return false;
    const prefix = token.slice(0, i);
    const suffix = token.slice(i + brandToken.length);
    const prefixOk = prefix === "" || AFFIXES.has(prefix);
    const suffixOk = suffix === "" || AFFIXES.has(suffix) || /^\d{1,4}$/.test(suffix);
    if (prefixOk && suffixOk) return true;
    from = i + 1;
  }
}

/** Strip one known affix from either end, to compare the "core" of a token to a brand. */
function cores(token: string): string[] {
  const out = new Set([token]);
  for (const a of AFFIXES) {
    if (token.length > a.length + 3) {
      if (token.startsWith(a)) out.add(token.slice(a.length));
      if (token.endsWith(a)) out.add(token.slice(0, -a.length));
    }
  }
  return [...out];
}

function findBrandHits(tokens: string[], hasContext: boolean): BrandHit[] {
  const hits: BrandHit[] = [];
  for (const brand of BRANDS) {
    if (!brand.tokens.length) continue;
    let hit: BrandHit | null = null;
    for (const token of tokens) {
      for (const bt of brand.tokens) {
        if (usesBrandName(token, bt)) {
          if (!brand.commonWord || hasContext) hit = { brand, how: "name", token };
        } else if (bt.length >= 4) {
          for (const core of cores(token)) {
            if (core === bt || core === bt + "s" || NEAR_MISS_WORDS.has(core)) continue;
            if (skeleton(core) === skeleton(bt)) {
              hit = { brand, how: "lookalike", token };
            } else if (bt.length >= 5 && core.length >= 4) {
              const dist = editDistance(core, bt);
              const limit = bt.length >= 9 ? 2 : 1;
              if (dist <= limit) {
                const how = bt.length >= 6 ? "misspelled" : "close";
                // Short brand names (chase, apple) are one letter from many real words. Need login/account context.
                if (how === "close" && !hasContext) continue;
                if (!hit || hit.how === "close") hit = { brand, how, token };
              }
            }
            if (hit && hit.how !== "close") break;
          }
        }
        if (hit && hit.how !== "close") break;
      }
      if (hit && hit.how !== "close") break;
    }
    if (hit) hits.push(hit);
  }
  return hits;
}

function toUrl(raw: string): URL | null {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

export function analyzeLink(raw: string): LinkReport {
  const evidence: Evidence[] = [];
  const url = toUrl(raw);
  if (!url) {
    return { input: raw, hostname: raw, domain: null, officialBrand: null, evidence };
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const p = parse(hostname);
  const pPriv = parse(hostname, { allowPrivateDomains: true });
  const domain = p.domain;
  const add = (e: Omit<Evidence, "source">) => evidence.push({ source: "link", quote: raw, ...e });

  // 1. Username trick: https://chase.com@evil.top -> really goes to evil.top
  if (url.username) {
    add({
      id: "link.at_trick",
      title: "Tricky link with an @ sign",
      detail: `This link shows "${decodeURIComponent(url.username)}" first, but it really goes to ${hostname}. Everything before the @ sign is ignored.`,
      weight: 60,
      scamType: "phishing_link",
    });
  }

  // 2. Raw IP address instead of a name
  if (p.isIp) {
    add({
      id: "link.ip_address",
      title: "Uses a number instead of a website name",
      detail: `This link goes to ${hostname}, a bare number address. Real companies use their name, like chase.com.`,
      weight: 40,
      scamType: "phishing_link",
    });
    return { input: raw, hostname, domain: null, officialBrand: null, evidence };
  }

  const userContent =
    pPriv.isPrivate === true || USER_CONTENT_HOSTS.some((h) => hostMatches(hostname, h));
  const brand = userContent ? null : officialBrandFor(domain);

  // 3. Official domain: a reassuring fact, never a "safe" verdict.
  if (brand) {
    add({
      id: "link.official",
      title: `Goes to ${brand.name}'s real website`,
      detail: `${domain} is on our list of verified ${brand.name} addresses. Still, never share passwords or codes with someone who contacted you first.`,
      weight: 0,
      good: true,
    });
    return { input: raw, hostname, domain, officialBrand: brand.name, evidence };
  }

  // 4. Shortened links hide the destination.
  if (domain && SHORTENERS.some((s) => hostMatches(hostname, s))) {
    add({
      id: "link.shortener",
      title: "Shortened link hides where it goes",
      detail: `${hostname} is a link shortener. You can't see the real website until you tap it, and scammers use that to hide fake sites.`,
      weight: 30,
      scamType: "phishing_link",
    });
  }

  // 5. Free hosting where anyone can make a page.
  if (userContent) {
    add({
      id: "link.user_content",
      title: "Page on a free website service",
      detail: `Anyone can make a page on ${pPriv.publicSuffix && pPriv.isPrivate ? pPriv.publicSuffix : hostname}. Real banks and stores don't send you links like this.`,
      weight: 15,
      scamType: "phishing_link",
    });
  }

  // 6. Brand look-alikes (including letters from other alphabets).
  const pathAndHost = `${hostname}${url.pathname}`.toLowerCase();
  const tokens = withJoins(hostTokens(hostname, p.publicSuffix));
  const pathTokens = url.pathname.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const hasContext =
    [...tokens, ...pathTokens].some((t) => CONTEXT_WORDS.has(t)) ||
    tokens.some((t) => [...CONTEXT_WORDS].some((w) => w.length >= 5 && t.includes(w)));

  const isPuny = hostname.split(".").some((l) => l.startsWith("xn--"));
  let unicodeHost = hostname;
  if (isPuny) unicodeHost = hostToUnicode(hostname);

  if (isPuny && hasNonAscii(unicodeHost)) {
    const mapped = mapConfusables(unicodeHost);
    const mappedTokens = withJoins(hostTokens(mapped, p.publicSuffix));
    const hits = findBrandHits(mappedTokens, true);
    if (hits.length) {
      add({
        id: "link.idn_lookalike",
        title: `Fake letters made to look like ${hits[0].brand.name}`,
        detail: `This address (${unicodeHost}) uses letters from another alphabet so it looks like ${hits[0].brand.name}. It is a different website.`,
        weight: 70,
        scamType: "phishing_link",
      });
    } else {
      add({
        id: "link.idn",
        title: "Uses letters from another alphabet",
        detail: `This address (${unicodeHost}) contains letters that are not normal English letters. Scammers use these to copy real names.`,
        weight: 25,
        scamType: "phishing_link",
      });
    }
  }

  const registrableTokens = domain ? withJoins(hostTokens(domain, p.publicSuffix)) : [];
  for (const hit of findBrandHits(tokens, hasContext)) {
    const inSubdomainOnly = !registrableTokens.includes(hit.token);
    const realSite = domain ?? hostname;
    if (hit.how === "name") {
      add({
        id: inSubdomainOnly ? "link.brand_disguise" : "link.brand_in_name",
        title: inSubdomainOnly
          ? `Uses "${hit.brand.name}" as a disguise`
          : `Uses the ${hit.brand.name} name, but isn't ${hit.brand.name}`,
        detail: inSubdomainOnly
          ? `The address starts with "${hit.token}", but the real website is ${realSite}. Only the last part before the first "/" tells you who owns a website.`
          : `${realSite} is not one of ${hit.brand.name}'s real websites (${hit.brand.domains.slice(0, 2).join(", ")}). Scammers put brand names in fake addresses.`,
        weight: inSubdomainOnly ? 60 : 45,
        scamType: "phishing_link",
      });
    } else if (hit.how === "lookalike") {
      add({
        id: "link.brand_lookalike",
        title: `Look-alike of ${hit.brand.name}`,
        detail: `"${hit.token}" is made to look like "${hit.brand.tokens[0]}" by swapping letters or numbers (like 0 for o, or rn for m). The real site is ${hit.brand.domains[0]}.`,
        weight: 60,
        scamType: "phishing_link",
      });
    } else {
      add({
        id: hit.how === "misspelled" ? "link.brand_misspelled" : "link.brand_close",
        title: hit.how === "misspelled" ? `Misspelled ${hit.brand.name} name` : `Name close to ${hit.brand.name}`,
        detail: `"${hit.token}" is one or two letters off from "${hit.brand.tokens[0]}". The real site is ${hit.brand.domains[0]}.`,
        weight: hit.how === "misspelled" ? 50 : hasContext ? 35 : 25,
        scamType: "phishing_link",
      });
    }
  }

  // 7. Risky domain ending.
  const tld = (p.publicSuffix ?? "").split(".").pop() ?? "";
  if (RISKY_TLDS.includes(tld)) {
    add({
      id: "link.risky_tld",
      title: `Unusual ending ".${tld}"`,
      detail: `Web addresses ending in ".${tld}" are often used for scam sites. Big companies usually use .com or .gov.`,
      weight: 15,
      scamType: "phishing_link",
    });
  }

  // 8. Lots of dashes in the name (e.g. secure-account-verify-login.com).
  const label = registrableTokens.length ? (domain ?? "").split(".")[0] : "";
  if ((label.match(/-/g) ?? []).length >= 2) {
    add({
      id: "link.many_dashes",
      title: "Long name with many dashes",
      detail: `Fake sites often use long names like "${label}". Real company names are short.`,
      weight: 10,
      scamType: "phishing_link",
    });
  }

  // 9. Login/payment words on an unknown site.
  if (LOGIN_PATH_RE.test(pathAndHost)) {
    add({
      id: "link.login_words",
      title: "Asks you to log in or pay",
      detail: `The link mentions logging in, verifying, or paying, but ${domain ?? hostname} is not a company we recognize.`,
      weight: 10,
      scamType: "phishing_link",
    });
  }

  return { input: raw, hostname, domain, officialBrand: null, evidence };
}
