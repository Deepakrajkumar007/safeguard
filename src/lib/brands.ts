/**
 * Verified brand list. This is the single source of truth for:
 *  - the voice launcher (speech picks a brand NAME; the URL always comes from `launchUrl` here)
 *  - the link checker (a link is "official" only if its registrable domain is exactly in `domains`)
 *
 * Rules:
 *  - `domains` are registrable domains (eTLD+1), matched EXACTLY. Never substring matching.
 *  - Do NOT add domains where anyone can host content (amazonaws.com, windows.net, sharepoint.com,
 *    googleusercontent.com, etc.). Those go in USER_CONTENT_HOSTS instead.
 *  - `tokens` are brand words used to spot look-alike domains (e.g. "paypal" in paypal-login.top).
 *  - `commonWord: true` means the brand name is also an ordinary English word (Chase, Apple, Target).
 *    Those only count as brand misuse when the link also has account/login words, to avoid false alarms.
 */

export interface Brand {
  id: string;
  name: string;
  /** Spoken names for the voice launcher, lowercase. */
  aliases: string[];
  /** The one URL the voice launcher will ever open for this brand. */
  launchUrl: string;
  /** Official registrable domains, exact match only. */
  domains: string[];
  /** Brand words for look-alike detection, lowercase, letters/digits only. */
  tokens: string[];
  commonWord?: boolean;
  /** Text names to detect "message claims to be from X" (matched on word boundaries). */
  textNames?: string[];
}

export const BRANDS: Brand[] = [
  // Banks and payments
  {
    id: "chase",
    name: "Chase",
    aliases: ["chase", "chase bank", "jp morgan chase", "jpmorgan chase"],
    launchUrl: "https://www.chase.com",
    domains: ["chase.com", "jpmorganchase.com", "jpmorgan.com"],
    tokens: ["chase", "jpmorgan", "jpmorganchase"],
    commonWord: true,
    textNames: ["Chase", "JPMorgan", "JP Morgan"],
  },
  {
    id: "bankofamerica",
    name: "Bank of America",
    aliases: ["bank of america", "b of a", "bofa", "bank america"],
    launchUrl: "https://www.bankofamerica.com",
    domains: ["bankofamerica.com"],
    tokens: ["bankofamerica", "bofa"],
    textNames: ["Bank of America", "BofA"],
  },
  {
    id: "wellsfargo",
    name: "Wells Fargo",
    aliases: ["wells fargo", "wells", "wells fargo bank"],
    launchUrl: "https://www.wellsfargo.com",
    domains: ["wellsfargo.com", "wf.com"],
    tokens: ["wellsfargo"],
    textNames: ["Wells Fargo"],
  },
  {
    id: "citi",
    name: "Citi",
    aliases: ["citi", "citibank", "citi bank"],
    launchUrl: "https://www.citi.com",
    domains: ["citi.com", "citibank.com", "citigroup.com"],
    tokens: ["citi", "citibank"],
    textNames: ["Citi", "Citibank"],
  },
  {
    id: "capitalone",
    name: "Capital One",
    aliases: ["capital one", "capitol one", "capital 1"],
    launchUrl: "https://www.capitalone.com",
    domains: ["capitalone.com"],
    tokens: ["capitalone"],
    textNames: ["Capital One"],
  },
  {
    id: "paypal",
    name: "PayPal",
    aliases: ["paypal", "pay pal"],
    launchUrl: "https://www.paypal.com",
    domains: ["paypal.com", "paypal.me", "paypalobjects.com", "paypal-community.com"],
    tokens: ["paypal"],
    textNames: ["PayPal"],
  },
  {
    id: "venmo",
    name: "Venmo",
    aliases: ["venmo"],
    launchUrl: "https://venmo.com",
    domains: ["venmo.com"],
    tokens: ["venmo"],
    textNames: ["Venmo"],
  },
  {
    id: "zelle",
    name: "Zelle",
    aliases: ["zelle", "zell"],
    launchUrl: "https://www.zellepay.com",
    domains: ["zellepay.com"],
    tokens: ["zelle", "zellepay"],
    textNames: ["Zelle"],
  },
  {
    id: "coinbase",
    name: "Coinbase",
    aliases: ["coinbase", "coin base"],
    launchUrl: "https://www.coinbase.com",
    domains: ["coinbase.com"],
    tokens: ["coinbase"],
    textNames: ["Coinbase"],
  },

  // Shopping
  {
    id: "amazon",
    name: "Amazon",
    aliases: ["amazon", "amazon shopping"],
    launchUrl: "https://www.amazon.com",
    domains: [
      "amazon.com", "amazon.ca", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazon.es",
      "amazon.in", "amazon.co.jp", "amazon.com.au", "amazon.com.mx", "amazon.com.br", "amazon.nl",
      "amazon.se", "amazon.pl", "amazon.sg", "amazon.ae", "amazon.sa", "amazon.com.tr", "amazon.com.be",
      "amzn.to", "amzn.com", "a.co", "primevideo.com", "audible.com",
    ],
    tokens: ["amazon", "amzn"],
    textNames: ["Amazon"],
  },
  {
    id: "walmart",
    name: "Walmart",
    aliases: ["walmart", "wal mart", "wal-mart"],
    launchUrl: "https://www.walmart.com",
    domains: ["walmart.com"],
    tokens: ["walmart"],
    textNames: ["Walmart"],
  },
  {
    id: "costco",
    name: "Costco",
    aliases: ["costco"],
    launchUrl: "https://www.costco.com",
    domains: ["costco.com"],
    tokens: ["costco"],
    textNames: ["Costco"],
  },
  {
    id: "target",
    name: "Target",
    aliases: ["target"],
    launchUrl: "https://www.target.com",
    domains: ["target.com"],
    tokens: ["target"],
    commonWord: true,
    textNames: ["Target"],
  },

  // Tech
  {
    id: "microsoft",
    name: "Microsoft",
    aliases: ["microsoft", "micro soft", "microsoft account", "office", "microsoft office"],
    launchUrl: "https://www.microsoft.com",
    domains: [
      "microsoft.com", "live.com", "microsoftonline.com", "office.com", "office365.com",
      "microsoft365.com", "outlook.com", "hotmail.com", "msn.com", "bing.com", "xbox.com",
      "skype.com", "aka.ms",
    ],
    tokens: ["microsoft", "microsoftonline", "office365", "msoffice", "onedrive", "hotmail"],
    textNames: ["Microsoft", "Office 365", "Microsoft 365", "OneDrive"],
  },
  {
    id: "outlook",
    name: "Outlook",
    aliases: ["outlook", "hotmail", "outlook email", "my outlook"],
    launchUrl: "https://outlook.live.com",
    domains: ["outlook.com", "live.com", "office.com", "hotmail.com"],
    tokens: ["outlook"],
    textNames: ["Outlook"],
  },
  {
    id: "google",
    name: "Google",
    aliases: ["google", "google search"],
    launchUrl: "https://www.google.com",
    domains: [
      "google.com", "google.ca", "google.co.uk", "google.de", "google.fr", "google.co.in",
      "google.com.au", "google.co.jp", "google.com.mx", "google.com.br", "google.es", "google.it",
      "google.nl", "gmail.com", "youtube.com", "youtu.be", "g.co",
    ],
    tokens: ["google"],
    textNames: ["Google"],
  },
  {
    id: "gmail",
    name: "Gmail",
    aliases: ["gmail", "g mail", "google mail", "my email"],
    launchUrl: "https://mail.google.com",
    domains: ["google.com", "gmail.com"],
    tokens: ["gmail"],
    textNames: ["Gmail"],
  },
  {
    id: "youtube",
    name: "YouTube",
    aliases: ["youtube", "you tube"],
    launchUrl: "https://www.youtube.com",
    domains: ["youtube.com", "youtu.be"],
    tokens: ["youtube"],
    textNames: ["YouTube"],
  },
  {
    id: "apple",
    name: "Apple",
    aliases: ["apple", "apple id", "apple account"],
    launchUrl: "https://www.apple.com",
    domains: ["apple.com", "icloud.com", "me.com", "apple.co"],
    tokens: ["apple", "appleid", "icloud", "itunes"],
    commonWord: true,
    textNames: ["Apple", "iCloud", "Apple ID", "iTunes"],
  },
  {
    id: "icloud",
    name: "iCloud",
    aliases: ["icloud", "i cloud"],
    launchUrl: "https://www.icloud.com",
    domains: ["icloud.com", "apple.com"],
    tokens: ["icloud"],
    textNames: ["iCloud"],
  },
  {
    id: "facebook",
    name: "Facebook",
    aliases: ["facebook", "face book"],
    launchUrl: "https://www.facebook.com",
    domains: ["facebook.com", "fb.com", "messenger.com", "meta.com", "facebookmail.com"], // facebookmail.com: Facebook's real email sender
    tokens: ["facebook"],
    textNames: ["Facebook", "Meta"],
  },
  {
    id: "netflix",
    name: "Netflix",
    aliases: ["netflix", "net flix"],
    launchUrl: "https://www.netflix.com",
    domains: ["netflix.com"],
    tokens: ["netflix"],
    textNames: ["Netflix"],
  },

  // Delivery
  {
    id: "usps",
    name: "USPS",
    aliases: ["usps", "post office", "postal service", "us postal service", "the post office", "mail tracking"],
    launchUrl: "https://www.usps.com",
    domains: ["usps.com"],
    tokens: ["usps", "uspost", "uspostal"],
    textNames: ["USPS", "Postal Service", "Post Office"],
  },
  {
    id: "ups",
    name: "UPS",
    aliases: ["ups", "u p s"],
    launchUrl: "https://www.ups.com",
    domains: ["ups.com"],
    tokens: ["ups"],
    commonWord: true,
    textNames: ["UPS"],
  },
  {
    id: "fedex",
    name: "FedEx",
    aliases: ["fedex", "fed ex", "federal express"],
    launchUrl: "https://www.fedex.com",
    domains: ["fedex.com"],
    tokens: ["fedex"],
    textNames: ["FedEx"],
  },
  {
    id: "dhl",
    name: "DHL",
    aliases: ["dhl", "d h l"],
    launchUrl: "https://www.dhl.com",
    domains: ["dhl.com"],
    tokens: ["dhl"],
    textNames: ["DHL"],
  },

  // Government
  {
    id: "irs",
    name: "IRS",
    aliases: ["irs", "i r s", "internal revenue service", "taxes"],
    launchUrl: "https://www.irs.gov",
    domains: ["irs.gov"],
    tokens: ["irs"],
    textNames: ["IRS", "Internal Revenue Service"],
  },
  {
    id: "ssa",
    name: "Social Security",
    aliases: ["social security", "social security administration", "ssa", "my social security"],
    launchUrl: "https://www.ssa.gov",
    domains: ["ssa.gov"],
    tokens: ["ssa", "socialsecurity"],
    textNames: ["Social Security", "SSA"],
  },
  {
    id: "medicare",
    name: "Medicare",
    aliases: ["medicare", "medi care"],
    launchUrl: "https://www.medicare.gov",
    domains: ["medicare.gov"],
    tokens: ["medicare"],
    textNames: ["Medicare"],
  },
  {
    id: "ftc",
    name: "Report fraud (FTC)",
    aliases: ["report fraud", "ftc", "report a scam", "federal trade commission"],
    launchUrl: "https://reportfraud.ftc.gov",
    domains: ["ftc.gov"],
    tokens: [],
  },

  // Phone carriers
  {
    id: "att",
    name: "AT&T",
    aliases: ["at&t", "at and t", "att", "a t and t"],
    launchUrl: "https://www.att.com",
    domains: ["att.com"],
    tokens: [],
    textNames: ["AT&T"],
  },
  {
    id: "verizon",
    name: "Verizon",
    aliases: ["verizon", "verizon wireless"],
    launchUrl: "https://www.verizon.com",
    domains: ["verizon.com", "vzw.com"],
    tokens: ["verizon"],
    textNames: ["Verizon"],
  },
  {
    id: "tmobile",
    name: "T-Mobile",
    aliases: ["t-mobile", "t mobile", "tmobile"],
    launchUrl: "https://www.t-mobile.com",
    domains: ["t-mobile.com"],
    tokens: ["tmobile"],
    textNames: ["T-Mobile"],
  },

  // Toll agencies (toll-bill texts are one of the most common scams right now)
  {
    id: "ezpass",
    name: "E-ZPass",
    aliases: ["e-zpass", "ezpass", "e z pass", "easy pass"],
    launchUrl: "https://www.e-zpassiag.com",
    domains: [
      "e-zpassiag.com", "e-zpassny.com", "ezpassnj.com", "ezpassva.com", "ezpassmd.com",
      "ezdrivema.com", "paturnpike.com",
    ],
    tokens: ["ezpass", "ezdrive"],
    textNames: ["E-ZPass", "EZPass", "E-Z Pass"],
  },
  {
    id: "sunpass",
    name: "SunPass",
    aliases: ["sunpass", "sun pass"],
    launchUrl: "https://www.sunpass.com",
    domains: ["sunpass.com"],
    tokens: ["sunpass"],
    textNames: ["SunPass"],
  },
];

/**
 * Hosts where anyone can publish a page. A link here is never treated as "official",
 * even when the parent company is a brand above (e.g. sites.google.com, forms.office.com).
 * Matched as exact hostname or a subdomain of the entry (dot-boundary), never "contains".
 * Free hosting platforms on the Public Suffix List (github.io, web.app, s3.amazonaws.com, ...)
 * are detected automatically by tldts and do not need to be listed here.
 */
export const USER_CONTENT_HOSTS: string[] = [
  "sites.google.com",
  "docs.google.com",
  "drive.google.com",
  "forms.gle",
  "storage.googleapis.com",
  "firebasestorage.googleapis.com",
  "sharepoint.com",
  "1drv.ms",
  "forms.office.com",
  "forms.microsoft.com",
  "blob.core.windows.net",
  "web.core.windows.net",
  "dropbox.com",
  "dropboxusercontent.com",
  "notion.site",
  "canva.site",
  "weebly.com",
  "wixsite.com",
  "square.site",
  "jotform.com",
  "typeform.com",
  "ipfs.io",
];

/** Link shorteners hide the real destination. Brand-owned shorteners (amzn.to, aka.ms) are in BRANDS. */
export const SHORTENERS: string[] = [
  "bit.ly", "bitly.com", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "rebrand.ly",
  "cutt.ly", "shorturl.at", "rb.gy", "t.ly", "s.id", "tiny.cc", "bl.ink", "qrco.de", "v.gd",
  "short.gy", "shorturl.gg", "tiny.one", "lnkd.in", "u.to", "clck.ru", "urlz.fr", "surl.li",
  "x.gd", "1url.com", "bit.do", "tr.ee", "linktr.ee",
];

/**
 * Domain endings (TLDs) that show up far more often in scam links than in real company links.
 * Based on public abuse reports (e.g. Spamhaus, Interisle). Mild signal on its own.
 */
export const RISKY_TLDS: string[] = [
  "top", "xyz", "icu", "buzz", "click", "link", "cfd", "sbs", "bond", "rest", "quest", "monster",
  "cyou", "tk", "ml", "ga", "cf", "gq", "work", "win", "vip", "lol", "zip", "mov", "support",
  "cam", "loan", "men", "date", "kim", "country", "stream", "download", "racing", "review",
  "cricket", "science", "party", "gdn", "bid", "trade", "accountant", "faith", "online", "site",
  "fun", "pw", "su", "ru", "cn", "life", "today", "info",
];
