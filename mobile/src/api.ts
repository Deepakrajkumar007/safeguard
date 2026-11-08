import Constants from "expo-constants";

/**
 * Where the SafeGuard server lives.
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
