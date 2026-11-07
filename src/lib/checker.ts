import { BRANDS } from "./brands";
import { extractPhones, extractUrls } from "./extract";
import { analyzeText } from "./text-rules";
import { analyzeLink } from "./url-analysis";
import type { CheckReport, Evidence, Level, LinkReport, ScamType } from "./types";

/**
 * The deterministic checker. This decides the score and the verdict.
 * The LLM only explains this result later; it never overrides it.
 */

export const SCAM_TYPE_LABELS: Record<ScamType, string> = {
  bank: "Fake bank alert",
  prize: "Too-good-to-be-true money offer",
  government: "Fake government threat (IRS / Social Security)",
  family: "Family emergency scam",
  delivery: "Fake delivery notice",
  toll: "Fake toll bill",
  tech: "Fake tech support",
  job: "Job or investment scam",
  account: "Attempt to get into your account",
  phishing_link: "Fake website link",
};

export function levelFor(score: number, hasEvidence: boolean): Level {
  if (score >= 60) return "high";
  if (score >= 30) return "caution";
  if (score > 0 || hasEvidence) return "low";
  return "none";
}

const HEADLINES: Record<Level, string> = {
  none: "No red flags found",
  low: "A few small warning signs",
  caution: "Be careful: warning signs found",
  high: "High risk: this looks like a scam",
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Brands the message claims to be from, e.g. "Chase: your account is locked". */
function brandsMentioned(text: string) {
  return BRANDS.filter((b) =>
    (b.textNames ?? []).some((name) => {
      const flags = b.commonWord ? "" : "i";
      return new RegExp(`(?<![A-Za-z])${escapeRe(name)}(?![A-Za-z])`, flags).test(text);
    }),
  );
}

function pickScamType(evidence: Evidence[]): ScamType | null {
  const sums = new Map<ScamType, number>();
  for (const e of evidence) {
    if (!e.scamType || e.weight <= 0) continue;
    sums.set(e.scamType, (sums.get(e.scamType) ?? 0) + e.weight);
  }
  // Prefer the story the message tells (bank, toll, family...) over "fake link".
  let best: ScamType | null = null;
  let bestSum = 0;
  for (const [type, sum] of sums) {
    if (type === "phishing_link") continue;
    if (sum > bestSum) {
      best = type;
      bestSum = sum;
    }
  }
  if (best && bestSum >= 15) return best;
  return (sums.get("phishing_link") ?? 0) >= 30 ? "phishing_link" : best;
}

function nextStepsFor(level: Level, type: ScamType | null, links: LinkReport[], phones: string[]): string[] {
  if (level === "none" || level === "low") {
    return [
      "If you weren't expecting this, contact the company yourself using the number on your card or their official website.",
      "Never share codes, passwords, or your Social Security number with someone who contacted you first.",
    ];
  }
  const steps: string[] = [];
  if (links.some((l) => !l.officialBrand)) steps.push("Don't tap the link.");
  if (phones.length) steps.push("Don't call the phone number in the message.");
  steps.push("Don't reply, not even with \"STOP\".");
  switch (type) {
    case "bank":
    case "account":
      steps.push("Call your bank using the number on the back of your card.");
      break;
    case "government":
      steps.push(
        "The IRS and Social Security never threaten arrest. If worried, call Social Security at 1-800-772-1213 or the IRS at 1-800-829-1040 yourself.",
      );
      break;
    case "family":
      steps.push("Call your family member at the number you already have.");
      steps.push("Ask a question only the real person would know, or agree on a family code word.");
      break;
    case "delivery":
      steps.push("To check a package, type usps.com, ups.com, or fedex.com yourself and enter your tracking number.");
      break;
    case "toll":
      steps.push("To check a toll bill, type your toll agency's website yourself or call the number on your statement.");
      break;
    case "tech":
      steps.push("Don't let anyone control your computer. Real tech companies don't contact you this way.");
      break;
    case "prize":
    case "job":
      steps.push("Never pay money to get a prize, a job, or an investment return.");
      break;
    case "phishing_link": {
      const brand = links.flatMap((l) => l.evidence).find((e) => e.id.startsWith("link.brand"));
      steps.push(
        brand
          ? "If you need the real company, type its address yourself or use LinkGuard's \"Open a site\" button."
          : "If you need to reach the company, type its address yourself instead of using this link.",
      );
      break;
    }
  }
  steps.push("Forward scam texts to 7726 (it spells SPAM), then delete them.");
  steps.push("Report it at reportfraud.ftc.gov.");
  steps.push("Already paid or shared information? Call your bank right away and visit identitytheft.gov.");
  return steps;
}

const MONEY_TYPES = new Set<ScamType>(["family", "prize", "government", "job", "tech", "toll", "delivery", "bank"]);

/** "Don't tap the link, call the number, or reply." Only the actions that fit this message. */
function doNotList(type: ScamType | null, links: LinkReport[], phones: string[]): string {
  const acts: string[] = [];
  if (links.some((l) => !l.officialBrand)) acts.push("tap the link");
  if (phones.length) acts.push("call the number");
  if (type && MONEY_TYPES.has(type)) acts.push("send money");
  acts.push("reply");
  if (acts.length <= 2) return acts.join(" or ");
  return `${acts.slice(0, -1).join(", ")}, or ${acts[acts.length - 1]}`;
}

function summaryFor(
  level: Level,
  typeLabel: string | null,
  top: Evidence[],
  doNot: string,
): string {
  switch (level) {
    case "none":
      return "We didn't find any warning signs. That isn't a guarantee. If it asks for money, codes, or personal details, contact the company yourself using a number you trust.";
    case "low":
      return `We found ${top.length === 1 ? "one small warning sign" : "some small warning signs"}. Be careful, and check with the company directly if you're unsure.`;
    case "caution":
      return `This has warning signs${typeLabel ? ` of a ${typeLabel.toLowerCase()}` : ""}. Don't ${doNot} until you check with the company directly.`;
    case "high":
      return `This has strong signs of a ${typeLabel ? typeLabel.toLowerCase() : "scam"}. Don't ${doNot}.`;
  }
}

export function checkMessage(input: string): CheckReport {
  const text = (input ?? "").slice(0, 5000);
  const urls = extractUrls(text).slice(0, 10);
  const links = urls.map(analyzeLink);
  // Links get their own checks. Remove them before reading the wording, so "wiki/Apple" or
  // "com-redelivery" inside a link isn't mistaken for what the message says.
  const prose = urls.reduce((t, u) => t.split(u).join(" "), text);
  const phones = extractPhones(prose).slice(0, 10);
  const wording = analyzeText(prose);
  const linkEvidence = links.flatMap((l) => l.evidence);
  const evidence: Evidence[] = [...linkEvidence, ...wording];

  // Message claims to be from a brand, but a link goes somewhere that isn't that brand (or any known brand).
  const mentioned = brandsMentioned(prose);
  const unknownLinks = links.filter((l) => !l.officialBrand);
  if (mentioned.length && unknownLinks.length) {
    const b = mentioned[0];
    const l = unknownLinks[0];
    evidence.push({
      id: "text.brand_mismatch",
      source: "link",
      title: `Says it's from ${b.name}, but the link isn't`,
      detail: `The message mentions ${b.name}, but the link goes to ${l.domain ?? l.hostname}. ${b.name}'s real website is ${b.domains[0]}.`,
      weight: 40,
      scamType: "phishing_link",
      quote: l.input,
    });
  }

  // A phone number to call, inside a bank/government/tech story.
  const storyTypes = new Set(wording.map((e) => e.scamType));
  if (phones.length && (storyTypes.has("bank") || storyTypes.has("government") || storyTypes.has("tech"))) {
    evidence.push({
      id: "phone.call_this_number",
      source: "phone",
      title: "Gives you a number to call",
      detail: `Calling ${phones[0]} from a suspicious message reaches the scammer. Use the number on your card or the official website instead.`,
      weight: 10,
      quote: phones[0],
    });
  }

  const risky = evidence.filter((e) => e.weight > 0).sort((a, b) => b.weight - a.weight);
  const good = evidence.filter((e) => e.good);
  const score = Math.min(100, risky.reduce((s, e) => s + e.weight, 0));
  const level = levelFor(score, risky.length > 0);
  const typeId = level === "none" ? null : pickScamType(risky);
  const scamType = typeId ? { id: typeId, label: SCAM_TYPE_LABELS[typeId] } : null;

  return {
    score,
    level,
    headline: HEADLINES[level],
    summary: summaryFor(level, scamType?.label ?? null, risky, doNotList(typeId, links, phones)),
    scamType,
    evidence: [...risky, ...good],
    links,
    phones,
    nextSteps: nextStepsFor(level, typeId, links, phones),
  };
}
