import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { addressFromHeader, buildQuery, dmarcPassDomain, isSkippedSender, htmlToText, judgeEmail, normalizeSkipEntry, parseGmailMessage, type GmailMessage } from "../gmail";
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

  // --- Real-looking legitimate emails that used to risk false alarms ---
  it("store promo with many account links, urgency words, and app-store footer stays calm", () => {
    const manyLinks = Array.from({ length: 12 }, (_, i) => `<a href="https://www.examplestore.com/account/orders?item=${i}">Item ${i}</a>`).join(" ");
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Example Store <deals@examplestore.com>",
          "Today only: 30% off everything. Last chance!",
          `<p>Act now, this sale expires today. Log in to your account to see your deals.</p>${manyLinks}
           <p>Download on the App Store · Get it on Google Play · Pay with PayPal</p>
           <a href="https://apps.apple.com/us/app/example/id123">App Store</a>
           <a href="https://play.google.com/store/apps/details?id=com.example">Google Play</a>`,
        ),
      ),
    );
    expect(["none", "low"], JSON.stringify(v.reasons)).toContain(v.level);
  });

  it("rewards email with 'congratulations, claim your reward' stays calm", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Coffee Club Rewards <rewards@coffeeclub.com>",
          "Congratulations! You've earned a $10 reward",
          '<p>Congratulations! Claim your reward before it expires today.</p><a href="https://www.coffeeclub.com/rewards">Claim</a>',
        ),
      ),
    );
    expect(["none", "low"], JSON.stringify(v.reasons)).toContain(v.level);
  });

  it("receipt from a store that mentions PayPal in the subject isn't a fake-PayPal alert", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message("Etsy <transaction@etsy.com>", "Your PayPal payment to Etsy", '<p>Thanks for your order.</p><a href="https://www.etsy.com/your/purchases">View order</a>'),
      ),
    );
    expect(["none", "low"], JSON.stringify(v.reasons)).toContain(v.level);
  });

  // --- Scams must still be caught ---
  it("catches a display-name spoof: 'PayPal' sent from a random address", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "PayPal Service <service@account-review-center.com>",
          "Action needed",
          '<p>Your account has been limited. Confirm your identity to restore access.</p><a href="https://account-review-center.com/login">Restore access</a>',
        ),
      ),
    );
    expect(v.level).toBe("high");
    expect(v.reasons.map((r) => r.title).join(" ")).toContain("Says it's from PayPal");
  });

  it("catches a no-link gift card scam from a free email address", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Pastor Mike <pastor.mike.church@gmail.com>",
          "Quick favor",
          "<p>Are you available? I need you to buy 4 gift cards for a church member in the hospital. Send me photos of the codes on the back. Please keep this between us.</p>",
        ),
      ),
    );
    expect(["caution", "high"]).toContain(v.level);
  });
});


describe("never-scan safety net (isSkippedSender)", () => {
  it("matches a whole domain from the list", () => {
    expect(isSkippedSender("Deepak <hello@deepakrajkumar.com>", ["@deepakrajkumar.com"])).toBe(true);
    expect(isSkippedSender("hello@deepakrajkumar.com", ["deepakrajkumar.com"])).toBe(true);
  });
  it("matches subdomains of a listed domain", () => {
    expect(isSkippedSender("News <news@mail.deepakrajkumar.com>", ["deepakrajkumar.com"])).toBe(true);
  });
  it("matches an exact address, case-insensitively", () => {
    expect(isSkippedSender('"Boss" <Boss@Work.com>', ["boss@work.com"])).toBe(true);
    expect(isSkippedSender("other@work.com", ["boss@work.com"])).toBe(false);
  });
  it("does not match look-alike domains", () => {
    expect(isSkippedSender("x@notdeepakrajkumar.com", ["deepakrajkumar.com"])).toBe(false);
    expect(isSkippedSender("x@deepakrajkumar.com.evil.top", ["deepakrajkumar.com"])).toBe(false);
  });
  it("ignores the display name, so a scammer can't dodge the scan by naming themselves after a skipped domain", () => {
    expect(isSkippedSender("deepakrajkumar.com <scam@evil.top>", ["deepakrajkumar.com"])).toBe(false);
  });
  it("extracts the address from a From header", () => {
    expect(addressFromHeader("Deepak Rajkumar <Hi@Example.com>")).toBe("hi@example.com");
    expect(addressFromHeader("hi@example.com")).toBe("hi@example.com");
  });
});

describe("never-scan entries must be spelled right", () => {
  it("rejects made-up endings like .con, with a .com hint", async () => {
    const { endingTypoHint } = await import("../skip");
    expect(normalizeSkipEntry("deepakrajkumar2007@gmail.con")).toBeNull();
    expect(normalizeSkipEntry("work.cmo")).toBeNull();
    expect(endingTypoHint("deepakrajkumar2007@gmail.con")).toBe(".com");
    expect(endingTypoHint("boss@work.com")).toBeNull();
  });
  it("still accepts real addresses and domains", () => {
    expect(normalizeSkipEntry("deepakrajkumar2007@gmail.com")).toBe("deepakrajkumar2007@gmail.com");
    expect(normalizeSkipEntry("@work.co.uk")).toBe("@work.co.uk");
    expect(normalizeSkipEntry("deepakrajkumar.com")).toBe("@deepakrajkumar.com");
  });
});

describe("real Facebook notification emails", () => {
  it("does not call facebookmail.com a fake sender", () => {
    const v = judgeEmail(
      parseGmailMessage(
        message(
          "Facebook <notification@facebookmail.com>",
          "You have 4 notifications about Pages",
          '<p>See what you missed.</p><a href="https://www.facebook.com/n/?notifications">View notifications</a>',
          "mx.google.com; dkim=pass header.i=@facebookmail.com; spf=pass; dmarc=pass (p=REJECT) header.from=facebookmail.com",
        ),
      ),
    );
    expect(v.level === "none" || v.level === "low").toBe(true);
  });
  it("still flags a fake Facebook sender", () => {
    const v = judgeEmail(
      parseGmailMessage(message("Facebook Security <security@facebook-help-center.top>", "Your page will be removed", '<a href="https://facebook-help-center.top/appeal">Appeal now</a>')),
    );
    expect(v.level).toBe("high");
  });
});
