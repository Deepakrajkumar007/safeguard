import Constants from "expo-constants";
import type { Explanation } from "@shared/explain";

/**
 * Where the LinkGuard server lives.
 * - EXPO_PUBLIC_API_URL (e.g. the deployed https URL) wins if set.
 * - Otherwise, in development, use the laptop that's running Expo: same IP, port 3000.
 */
export function apiBase(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:3000` : null;
}

/** Headers for every server call. The key is a speed bump against abuse, not a secret (it ships in the app). */
export function apiHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.EXPO_PUBLIC_LINKGUARD_KEY;
  if (key) h["x-linkguard-key"] = key;
  return h;
}

export type ExplainResult = { ok: true; data: Explanation } | { ok: false; message: string };

/** Ask the server's AI (Google Gemini) to explain the checker's verdict. The score never comes from here. */
export async function fetchExplanation(text: string): Promise<ExplainResult> {
  const base = apiBase();
  if (!base) return { ok: false, message: "The AI explanation isn't set up on this phone." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${base}/api/explain`, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ text: text.slice(0, 5000) }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, message: data.error ?? "The AI explanation isn't available right now." };
    return { ok: true, data: data as Explanation };
  } catch {
    return { ok: false, message: "Couldn't reach the AI. The result above still applies." };
  } finally {
    clearTimeout(timer);
  }
}
