import { GMAIL_SCOPE } from "@/lib/gmail";
import { OAUTH_COOKIE, redirectUri, withParams } from "@/lib/gmail-oauth";
import { limitOnly } from "@/lib/guard";
import { seal, unseal } from "@/lib/session";

// Step 2 of Google sign-in: Google sends the person back here with a one-time code.
function readCookie(request: Request): string | null {
  const raw = request.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|;\\s*)${OAUTH_COOKIE}=([^;]+)`).exec(raw);
  return m ? m[1] : null;
}

function back(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Set-Cookie": `${OAUTH_COOKIE}=; Path=/api/gmail; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const limited = limitOnly(request, "gmail-callback", 10);
  if (limited) return limited;

  const flow = unseal<{ state: string; verifier: string; ret: string }>(readCookie(request));
  if (!flow) return new Response("Sign-in expired. Please go back to LinkGuard and try again.", { status: 400 });

  const params = new URL(request.url).searchParams;
  if (params.get("error")) return back(withParams(flow.ret, { error: "denied" }));
  if (params.get("state") !== flow.state) return back(withParams(flow.ret, { error: "state" }));
  const code = params.get("code");
  if (!code) return back(withParams(flow.ret, { error: "nocode" }));

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: redirectUri(request),
        grant_type: "authorization_code",
        code_verifier: flow.verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const tok = (await res.json()) as { access_token?: string; expires_in?: number; scope?: string };
    if (!res.ok || !tok.access_token) return back(withParams(flow.ret, { error: "token" }));
    // Google lets people untick the Gmail box on the consent screen. Without it we can't scan.
    if (!(tok.scope ?? "").split(" ").includes(GMAIL_SCOPE)) return back(withParams(flow.ret, { error: "scope" }));

    const ttl = Math.max(60, Math.min(3600, (tok.expires_in ?? 3600) - 60));
    const session = seal({ at: tok.access_token }, ttl);
    return back(withParams(flow.ret, { session, expires: String(Date.now() + ttl * 1000) }));
  } catch {
    return back(withParams(flow.ret, { error: "network" }));
  }
}
