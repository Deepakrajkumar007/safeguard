import * as SecureStore from "expo-secure-store";

/**
 * The last Gmail scan's COUNTS only (no senders, subjects, or content), for the Home dashboard.
 */
export interface LastScan {
  scanned: number;
  flagged: number;
  verified: number;
  at: number;
}

const KEY = "lg.lastScan";

export async function loadLastScan(): Promise<LastScan | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastScan>;
    if ([v.scanned, v.flagged, v.verified, v.at].some((n) => typeof n !== "number")) return null;
    return v as LastScan;
  } catch {
    return null;
  }
}

export async function saveLastScan(s: LastScan): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  } catch {
    /* dashboard numbers are a convenience */
  }
}

export function timeAgo(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}
