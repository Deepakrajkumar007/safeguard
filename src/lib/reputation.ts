import type { Evidence } from "./types";

/**
 * Reputation evidence (pure, shared by server and phone). The lookup itself happens on the server
 * (src/lib/safe-browsing.ts); only links are ever sent to Google, never the message text.
 */
export interface ReputationResult {
  checked: boolean;
  flagged: { url: string; threat: string }[];
}

const THREAT_WORDS: Record<string, string> = {
  SOCIAL_ENGINEERING: "a scam or fake login site",
  MALWARE: "a site that spreads harmful software",
  UNWANTED_SOFTWARE: "a site with unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "a site with harmful apps",
};

export function reputationEvidence(r: ReputationResult): Evidence[] {
  return r.flagged.slice(0, 3).map((f) => ({
    id: "reputation.safe_browsing",
    source: "reputation" as const,
    title: "Google lists this site as dangerous",
    detail: `Google Safe Browsing reports ${f.url.replace(/^https?:\/\//, "").split("/")[0]} as ${THREAT_WORDS[f.threat] ?? "dangerous"}.`,
    weight: 60,
    scamType: "phishing_link" as const,
    quote: f.url,
  }));
}

/** Shown only when nothing else looks wrong: being unlisted is not proof of anything. */
export const NOT_LISTED_NOTE: Evidence = {
  id: "reputation.not_listed",
  source: "reputation",
  title: "Not on Google's list of dangerous sites",
  detail: "We checked the link with Google Safe Browsing. That's a good sign, but brand-new scam sites often aren't listed yet.",
  weight: 0,
  good: true,
};
