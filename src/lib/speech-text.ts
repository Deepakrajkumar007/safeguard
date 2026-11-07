import type { CheckReport } from "./types";

/**
 * The words LinkGuard reads aloud for a result: verdict, top reasons, top steps.
 * Shared by the website and the iPhone app so both say exactly the same thing.
 */
export function reportToSpeech(r: CheckReport): string {
  const parts = [r.headline.replace(":", "."), r.scamType ? `This looks like a ${r.scamType.label}.` : "", r.summary];
  const reasons = r.evidence.filter((e) => !e.good).slice(0, 3);
  if (reasons.length) parts.push(`Here's why. ${reasons.map((e) => e.title).join(". ")}.`);
  const good = r.evidence.find((e) => e.good);
  if (good && !reasons.length) parts.push(good.title + ".");
  parts.push(`What to do. ${r.nextSteps.slice(0, 3).join(" ")}`);
  return parts
    .filter(Boolean)
    .join(" ")
    .replace(/reportfraud\.ftc\.gov/g, "report fraud dot F T C dot gov")
    .replace(/identitytheft\.gov/g, "identity theft dot gov")
    .replace(/\b7726\b/g, "7 7 2 6");
}
