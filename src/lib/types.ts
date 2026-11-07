// Shared types. No imports here so client components can use them safely.

export type Level = "none" | "low" | "caution" | "high";

export type ScamType =
  | "bank"
  | "prize"
  | "government"
  | "family"
  | "delivery"
  | "toll"
  | "tech"
  | "job"
  | "account"
  | "phishing_link";

export interface Evidence {
  /** Stable rule id, e.g. "link.brand_in_name". */
  id: string;
  source: "link" | "wording" | "phone" | "reputation" | "domain_age";
  /** Short plain-English title. */
  title: string;
  /** One or two plain sentences an older adult can follow. */
  detail: string;
  /** Risk points this adds. 0 for reassuring facts. */
  weight: number;
  /** A reassuring fact (e.g. "this is Chase's real website"). Never makes the verdict "safe". */
  good?: boolean;
  scamType?: ScamType;
  /** Snippet of the message or link that triggered this. */
  quote?: string;
}

export interface LinkReport {
  /** The link as it appeared in the message. */
  input: string;
  hostname: string;
  /** Registrable domain, e.g. "chase.com" for "secure.chase.com". */
  domain: string | null;
  /** Brand name if the domain is exactly on our verified list. */
  officialBrand: string | null;
  evidence: Evidence[];
}

export interface CheckReport {
  score: number;
  level: Level;
  headline: string;
  summary: string;
  scamType: { id: ScamType; label: string } | null;
  evidence: Evidence[];
  links: LinkReport[];
  phones: string[];
  nextSteps: string[];
}
