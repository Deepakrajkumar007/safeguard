/** Shared OAuth settings for the Gmail routes (server-only). */
export const OAUTH_COOKIE = "lg_oauth";

export function redirectUri(request: Request): string {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.origin}/api/gmail/callback`;
}

/** Only send people back into the LinkGuard app (Expo Go "exp://" in development, "linkguard://" when built). */
export function safeReturnUrl(raw: string | null): string | null {
  if (!raw || raw.length > 300) return null;
  return /^(exp|exps|linkguard):\/\/[^\s"'<>]+$/i.test(raw) ? raw : null;
}

export function withParams(base: string, params: Record<string, string>): string {
  const sep = base.includes("?") ? "&" : "?";
  return base + sep + new URLSearchParams(params).toString();
}
