import * as AppIntents from "expo-app-intents";
import * as SecureStore from "expo-secure-store";
import { formatTrusted, parseTrusted, type TrustedEntry } from "@shared/trusted";

/** Trusted senders for text alerts, kept in the iPhone's encrypted keychain. */
const KEY = "lg.trustedSenders";
const MAX = 100;
/** Must match TrustedSenders.catalogKind in app-intents/CheckMessageIntent.swift. */
const CATALOG_KIND = "trustedSender";

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
  const trimmed = list.slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(trimmed));
  await syncTrustedToShortcuts(trimmed);
}

/**
 * Hand the trusted list to the native "Check Message with LinkGuard" Shortcuts action, which compares
 * senders on the phone. Ids are "kind:value" (e.g. "phone:+17165550123"), matching the Swift side.
 * Not available in Expo Go; there the server-side fallback applies.
 */
export async function syncTrustedToShortcuts(list: TrustedEntry[]): Promise<boolean> {
  try {
    if (!AppIntents.isAvailable()) return false;
    await AppIntents.setEntityCatalogAsync(
      CATALOG_KIND,
      list.map((e) => ({ id: `${e.kind}:${e.value}`, title: formatTrusted(e) || e.value })),
    );
    return true;
  } catch {
    return false;
  }
}
