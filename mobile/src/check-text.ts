import { apiBase, apiHeaders } from "./api";

/**
 * "Check a message" on Home: sends the pasted text to SafeGuard's rule-based checker (no AI), the same
 * check the Shortcuts action uses. Only the text is sent, and the server saves nothing.
 */
export type TextLevel = "none" | "low" | "caution" | "high";

export interface TextVerdict {
  level: TextLevel;
  body: string;
}

export async function checkText(text: string): Promise<TextVerdict> {
  const base = apiBase();
  if (!base) throw new Error("The SafeGuard server isn't set up in this build.");
  const res = await fetch(`${base}/api/shortcut`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ text: text.slice(0, 5000), source: "paste" }),
  });
  const d = (await res.json()) as { level?: string; body?: string; error?: string };
  if (!res.ok) throw new Error(d.error ?? "SafeGuard didn't answer. Try again.");
  const level: TextLevel = d.level === "high" || d.level === "caution" || d.level === "low" ? d.level : "none";
  return { level, body: d.body ?? "" };
}
