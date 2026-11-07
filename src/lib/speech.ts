"use client";

import type { CheckReport } from "./types";

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Read text aloud with the browser's built-in voice. Slightly slow for clarity. */
export function speak(text: string, onEnd?: () => void): void {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  u.lang = "en-US";
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** Turn a report into a short spoken summary: verdict, top reasons, top steps. */
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
