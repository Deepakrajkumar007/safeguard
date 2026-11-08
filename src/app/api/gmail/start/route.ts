import { GMAIL_SCOPE } from "@/lib/gmail";
import { OAUTH_COOKIE, redirectUri, safeReturnUrl } from "@/lib/gmail-oauth";
import { limitOnly } from "@/lib/guard";
import { pkceChallenge, randomToken, seal } from "@/lib/session";

// Step 1 of Google sign-in. Opened by the app in a secure browser sheet.
export async function GET(request: Request) {
  const limited = limitOnly(request, "gmail-start", 10);
  if (limited) return limited;

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET?.trim() || !process.env.SESSION_SECRET?.trim()) {
    return new Response("Gmail sign-in isn't set up on this server yet.", { status: 503 });
  }
  const ret = safeReturnUrl(new URL(request.url).searchParams.get("return"));
  if (!ret) return new Response("Missing or invalid return address.", { status: 400 });

  const state = randomToken(24);
  const verifier = randomToken(48);
  const cookie = seal({ state, verifier, ret }, 600);

  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(request),
    response_type: "code",
    scope: GMAIL_SCOPE,
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    access_type: "online", // no refresh token: access ends when the 1-hour token expires
    prompt: "select_account",
  }).toString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: google.toString(),
      "Set-Cookie": `${OAUTH_COOKIE}=${cookie}; Path=/api/gmail; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
  });
}
