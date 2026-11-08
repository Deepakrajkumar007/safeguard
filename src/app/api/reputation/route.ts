import { guard } from "@/lib/guard";
import { lookupUrls } from "@/lib/safe-browsing";

// For the iPhone app: the phone checks the message itself, then asks only about its LINKS here.
// Body: {"urls": ["https://..."]}  Response: {checked, flagged: [{url, threat}]}
export async function POST(request: Request) {
  const blocked = guard(request, "reputation", 60);
  if (blocked) return blocked;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send JSON like {"urls": ["https://..."]}' }, { status: 400 });
  }
  const raw = (body as { urls?: unknown })?.urls;
  const urls = Array.isArray(raw) ? raw.filter((u): u is string => typeof u === "string" && u.length <= 2000).slice(0, 10) : [];
  return Response.json(await lookupUrls(urls));
}
