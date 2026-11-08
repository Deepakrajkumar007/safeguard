import * as SecureStore from "expo-secure-store";
import { parseTrusted, type TrustedEntry } from "@shared/trusted";

/** Trusted senders for text alerts, kept in the iPhone's encrypted keychain. */
const KEY = "lg.trustedSenders";
const MAX = 100;

export async function loadTrusted(): Promise<TrustedEntry[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    // Re-validate on load so a bad value can never reach the Shortcut.
    return list
      .map((e) => (e && typeof e === "object" && typeof (e as TrustedEntry).value === "string" ? parseTrusted((e as TrustedEntry).value) : null))
      .filter((e): e is TrustedEntry => Boolean(e))
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export async function saveTrusted(list: TrustedEntry[]): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(list.slice(0, MAX)));
}
