import { afterEach, describe, expect, it, vi } from "vitest";
import { checkMessage } from "../checker";
import { reputationEvidence } from "../reputation";
import { checkWithReputation, lookupUrls } from "../safe-browsing";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOOGLE_SAFE_BROWSING_KEY;
});

describe("reputation evidence", () => {
  it("a Google listing makes an otherwise quiet link high risk", () => {
    const url = "http://plain-looking-site.example.com/page";
    const quiet = checkMessage(url);
    const listed = checkMessage(url, { extraEvidence: reputationEvidence({ checked: true, flagged: [{ url, threat: "SOCIAL_ENGINEERING" }] }) });
    expect(quiet.level).not.toBe("high");
    expect(listed.level).toBe("high");
    expect(listed.evidence[0].title).toBe("Google lists this site as dangerous");
  });
});

describe("Safe Browsing lookup", () => {
  it("skips quietly without a key (rules still work)", async () => {
    expect(await lookupUrls(["https://x.example.com"])).toEqual({ checked: false, flagged: [] });
  });

  it("sends only links, with the key in a header, and reads matches", async () => {
    process.env.GOOGLE_SAFE_BROWSING_KEY = "k";
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(init.headers).toMatchObject({ "x-goog-api-key": "k" });
      expect(body.threatInfo.threatEntries).toEqual([{ url: "http://bad.example.net/login" }]);
      return new Response(JSON.stringify({ matches: [{ threatType: "MALWARE", threat: { url: "http://bad.example.net/login" } }] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const r = await checkWithReputation("Your account is locked, see bad.example.net/login");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("k");
    expect(r.evidence.some((e) => e.id === "reputation.safe_browsing")).toBe(true);
  });

  it("if Google errors, the rule-based result still comes back", async () => {
    process.env.GOOGLE_SAFE_BROWSING_KEY = "k";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const r = await checkWithReputation("https://chase-secure-login.top/verify");
    expect(r.level).not.toBe("none");
  });
});
