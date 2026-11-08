import { guard } from "@/lib/guard";
import { unseal } from "@/lib/session";

// Sign out: tell Google to cancel the access token right away.
export async function POST(request: Request) {
  const blocked = guard(request, "gmail-signout", 10);
  if (blocked) return blocked;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const session = unseal<{ at: string }>(bearer);
  if (session) {
    try {
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: session.at }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      /* the token still expires on its own within an hour */
    }
  }
  return Response.json({ ok: true });
}
