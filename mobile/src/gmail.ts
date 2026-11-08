import * as Linking from "expo-linking";
import { endingTypoHint, isSkippedSender, normalizeSkipEntry } from "@shared/skip";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { apiBase, apiHeaders } from "./api";

export { endingTypoHint };

/**
 * Gmail on the phone. The phone never sees your Google password or a long-lived token: it keeps only a
 * sealed 1-hour session from the LinkGuard server, in the iPhone's encrypted keychain (SecureStore).
 */

const SESSION_KEY = "lg.gmailSession";
const SKIP_KEY = "lg.gmailSkip";

export interface EmailVerdict {
  id: string;
  from: string;
  subject: string;
  receivedAt: string | null;
  score: number;
  level: "none" | "low" | "caution" | "high";
  scamType: string | null;
  reasons: { title: string; detail: string }[];
  verifiedSender: string | null;
}

export interface ScanResult {
  account: string | null;
  window: string;
  scanned: number;
  skippedSenders: string[];
  flagged: EmailVerdict[];
  verifiedCount: number;
}

export async function getSession(): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    const { token, expires } = JSON.parse(raw) as { token: string; expires: number };
    if (Date.now() > expires) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export type SignInResult = { ok: true } | { ok: false; message: string };

const SIGN_IN_ERRORS: Record<string, string> = {
  denied: "Sign-in was cancelled.",
  scope: "LinkGuard needs the 'Read your email' permission to scan. Please tick that box when signing in.",
  state: "Sign-in check failed. Please try again.",
  token: "Google didn't finish the sign-in. Please try again.",
  network: "Couldn't reach Google. Check your internet and try again.",
};

export async function signIn(): Promise<SignInResult> {
  const base = apiBase();
  if (!base) return { ok: false, message: "The LinkGuard server isn't set up on this phone." };
  const returnUrl = Linking.createURL("gmail");
  const start = `${base}/api/gmail/start?return=${encodeURIComponent(returnUrl)}`;
  const result = await WebBrowser.openAuthSessionAsync(start, returnUrl);
  if (result.type !== "success") return { ok: false, message: "Sign-in was cancelled." };
  const params = Linking.parse(result.url).queryParams ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  if (error) return { ok: false, message: SIGN_IN_ERRORS[error] ?? "Sign-in didn't work. Please try again." };
  const token = typeof params.session === "string" ? params.session : null;
  const expires = Number(params.expires) || Date.now() + 50 * 60_000;
  if (!token) return { ok: false, message: "Sign-in didn't work. Please try again." };
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token, expires }));
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const token = await getSession();
  await SecureStore.deleteItemAsync(SESSION_KEY);
  const base = apiBase();
  if (token && base) {
    // Ask Google to cancel the access right away.
    await fetch(`${base}/api/gmail/signout`, {
      method: "POST",
      headers: { ...apiHeaders(), Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }
}

export type ScanOutcome = { ok: true; data: ScanResult } | { ok: false; message: string; expired?: boolean };

export async function scan(skip: string[]): Promise<ScanOutcome> {
  const base = apiBase();
  const token = await getSession();
  if (!base) return { ok: false, message: "The LinkGuard server isn't set up on this phone." };
  if (!token) return { ok: false, message: "Please sign in with Google first.", expired: true };
  try {
    const res = await fetch(`${base}/api/gmail/scan`, {
      method: "POST",
      headers: { ...apiHeaders(), Authorization: `Bearer ${token}` },
      body: JSON.stringify({ skip }),
    });
    const data = await res.json();
    if (res.status === 401) await SecureStore.deleteItemAsync(SESSION_KEY);
    if (!res.ok) return { ok: false, message: data.error ?? "The scan didn't work. Try again.", expired: res.status === 401 };
    return { ok: true, data: data as ScanResult };
  } catch {
    return { ok: false, message: "Couldn't reach LinkGuard. Check your internet and try again." };
  }
}

// ---------- Never-scan list (kept on the phone, sent with each scan) ----------

export async function loadSkipList(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(SKIP_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function saveSkipList(list: string[]): Promise<void> {
  await SecureStore.setItemAsync(SKIP_KEY, JSON.stringify(list.slice(0, 25)));
}

/** Same rule as the server (shared code): "name@company.com", "@company.com", or "company.com". */
export function cleanSkipEntry(raw: string): string | null {
  return normalizeSkipEntry(raw);
}

/** Drops never-scan senders from a result list (backs up the server, and applies right after you add one). */
export function withoutSkipped(flagged: EmailVerdict[], skip: string[]): EmailVerdict[] {
  return skip.length ? flagged.filter((v) => !isSkippedSender(v.from, skip)) : flagged;
}

// ---------- Notification ----------

export async function notifyFlagged(count: number): Promise<void> {
  if (count === 0) return;
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: count === 1 ? "LinkGuard found 1 risky email" : `LinkGuard found ${count} risky emails`,
        body: "From the last 24 hours. Don't click links in them. Open LinkGuard to see why.",
        data: { url: "/gmail" },
      },
      trigger: null,
    });
  } catch {
    /* notifications are a bonus; the results still show on screen */
  }
}
