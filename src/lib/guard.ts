import { timingSafeEqual } from "node:crypto";

/**
 * Basic protection for the public server (server-only module).
 *
 * - App key: the iPhone app and the iOS Shortcut send `x-linkguard-key`. The website's own page is
 *   allowed through by the browser's `Sec-Fetch-Site: same-origin` header. This stops casual abuse
 *   of the Gemini quota. It is NOT strong authentication: the key ships inside the app.
 * - Rate limit: a per-IP token bucket in memory. On serverless hosting each instance keeps its own
 *   counts, so treat it as a speed bump, not a hard cap.
 *
 * If LINKGUARD_APP_KEY isn't set (local development), the key check is skipped.
 */

const buckets = new Map<string, { tokens: number; updated: number }>();

function allow(key: string, perMinute: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: perMinute, updated: now };
  b.tokens = Math.min(perMinute, b.tokens + ((now - b.updated) / 60_000) * perMinute);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now - v.updated > 10 * 60_000) buckets.delete(k);
  }
  return true;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function keyMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAllowedClient(req: Request): boolean {
  const appKey = process.env.LINKGUARD_APP_KEY?.trim();
  if (!appKey) return true;
  if (keyMatches(req.headers.get("x-linkguard-key"), appKey)) return true;
  return req.headers.get("sec-fetch-site") === "same-origin";
}

/** Returns an error Response to send back, or null if the request may continue. */
export function guard(req: Request, route: string, perMinute: number): Response | null {
  if (!isAllowedClient(req)) {
    return Response.json({ error: "This SafeGuard server only answers the SafeGuard app and website." }, { status: 401 });
  }
  if (!allow(`${route}:${clientIp(req)}`, perMinute)) {
    return Response.json({ error: "Too many checks in a short time. Please wait a minute and try again." }, { status: 429 });
  }
  return null;
}

/** Rate limit only, for browser page loads (OAuth start/callback) that can't send the app key. */
export function limitOnly(req: Request, route: string, perMinute: number): Response | null {
  if (!allow(`${route}:${clientIp(req)}`, perMinute)) {
    return new Response("Too many sign-in attempts. Please wait a minute and try again.", { status: 429 });
  }
  return null;
}
