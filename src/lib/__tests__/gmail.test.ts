import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildQuery, dmarcPassDomain, htmlToText, judgeEmail, normalizeSkipEntry, parseGmailMessage, type GmailMessage } from "../gmail";
import { safeReturnUrl } from "../gmail-oauth";
import { pkceChallenge, seal, unseal } from "../session";

beforeAll(() => {
  process.env.SESSION_SECRET = "x".repeat(64);
});
afterAll(() => {
  delete process.env.SESSION_SECRET;
  vi.useRealTimers();
});

describe("sealed session tokens", () => {
  it("round-trips and hides contents", () => {
    const t = seal({ at: "ya29.secret-token" }, 60);
    expect(t).not.toContain("ya29");
    expect(unseal<{ at: string }>(t)?.at).toBe("ya29.secret-token");
  });
  it("rejects tampering", () => {
    const t = seal({ at: "abc" }, 60);
    const flipped = t.slice(0, -2) + (t.endsWith("A") ? "B" : "A") + t.slice(-1);
    expect(unseal(flipped)).toBeNull();
    expect(unseal("garbage")).toBeNull();
  });
  it("expires", () => {
    vi.useFakeTimers();
    const t = seal({ at: "abc" }, 60);
    vi.advanceTimersByTime(61_000);
    expect(unseal(t)).toBeNull();
    vi.useRealTimers();
  });
  it("PKCE challenge is S256 base64url (RFC 7636 example)", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("never-scan list and 24-hour window", () => {
  it("normalizes addresses and domains", () => {
    expect(normalizeSkipEntry(" Boss@Company.com ")).toBe("boss@company.com");
    expect(normalizeSkipEntry("@company.com")).toBe("@company.com");
    expect(normalizeSkipEntry("company.com")).toBe("@company.com");
  });
  it("rejects anything that could change the Gmail search", () => {
    for (const bad of ["a@b.com OR in:anywhere", "{x}", "older_than:10y", "label:secret", "a b", ""]) {
      expect(normalizeSkipEntry(bad)).toBeNull();
    }
  });
  it("always limits to the last day and excludes listed senders", () => {
    expect(buildQuery(["boss@company.com", "@bank.example.com", "evil OR in:anywhere"])).toBe(
      "newer_than:1d -in:chats -from:boss@company.com -from:bank.example.com",
    );
    expect(buildQuery([])).toBe("newer_than:1d -in:chats");
  });
});

describe("OAuth return address", () => {
  it("only returns into the LinkGuard app", () => {
    expect(safeReturnUrl("exp://10.0.0.5:8081/--/gmail")).toBeTruthy();
    expect(safeReturnUrl("linkguard://gmail")).toBeTruthy();
    expect(safeReturnUrl("https://evil.example/steal")).toBeNull();
    expect(safeReturnUrl("javascript:alert(1)")).toBeNull();
  });
});

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
function message(from: string, subject: string, html: string, auth = ""): GmailMessage {
  return {
    id: "m1",
    internalDate: String(Date.UTC(2026, 10, 7)),
    payload: {
      mimeType: "multipart/alternative",
      headers: [
        { name: "From", value: from },
        { name: "Subject", value: subject },
        ...(auth ? [{ name: "Authentication-Results", value: auth }] : []),
      ],
      parts: [{ mimeType: "text/html", body: { data: b64(html) } }],
    },
  };
}

describe("email parsing", () => {
  it("reads the real link target, not the text shown", () => {
    const { text, hrefs } = htmlToText('<p>Visit <a href="https://chase-verify.top/login">www.chase.com</a></p>');
    expect(text).toContain("www.chase.com");
    expect(hrefs).toEqual(["https://chase-verify.top/login"]);
  });
  it("finds Gmail's DMARC result", () => {
    expect(dmarcPassDomain("mx.google.com; dkim=pass header.i=@chase.com; spf=pass; dmarc=pass (p=REJECT) header.from=chase.com")).toBe("chase.com");
    expect(dmarcPassDomain("mx.google.com; dmarc=fail header.from=chase.com")).toBeNull();
  });
});

describe("email verdicts", () => {
  it("flags a fake bank email whose link hides behind real-looking text", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Chase Security <alerts@chase-secure-mail.com>",
          "Your account has been locked",
          '<p>We detected unusual activity. Verify your identity within 24 hours.</p><a href="https://chase-secure-login.top/verify">www.chase.com</a>',
        ),
      ),
    );
    expect(v.level).toBe("high");
    expect(v.reasons.length).toBeGreaterThan(0);
  });

  it("trusts a real Chase email that Gmail verified (DMARC pass)", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Chase <no.reply.alerts@chase.com>",
          "Your statement is ready",
          '<a href="https://click.e.chase.com/abc">View statement</a> <a href="https://u123.ct.sendgrid.net/ls/click?x">Unsubscribe</a>',
          "mx.google.com; dkim=pass header.i=@chase.com; spf=pass; dmarc=pass (p=REJECT) header.from=chase.com",
        ),
      ),
    );
    expect(v.level).toBe("none");
    expect(v.verifiedSender).toBe("Chase");
  });

  it("does not trust a look-alike sender even if its own DMARC passes", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "PayPal <service@paypa1-support.com>",
          "Confirm your account",
          '<p>Your account is limited. Confirm your identity now.</p><a href="https://paypa1-support.com/confirm">Confirm</a>',
          "mx.google.com; dmarc=pass header.from=paypa1-support.com",
        ),
      ),
    );
    expect(v.verifiedSender).toBeNull();
    expect(v.level).toBe("high");
  });

  it("does not flag an ordinary newsletter sent through an email service", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Local Library <news@springfieldlibrary.org>",
          "This week at the library",
          '<p>Join us for story time on Saturday. Books on sale at Amazon too.</p><a href="https://springfieldlibrary.us12.list-manage.com/track/click?u=1">Read more</a>',
        ),
      ),
    );
    expect(["none", "low"]).toContain(v.level);
  });
});
