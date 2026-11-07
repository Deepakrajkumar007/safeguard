import { describe, expect, it } from "vitest";
import { checkMessage } from "../checker";
import { extractPhones, extractUrls } from "../extract";
import { analyzeLink } from "../url-analysis";
import { hostToUnicode } from "../strings";

// Real login/account pages. A false alarm on any of these is a demo-killer.
const REAL_BRAND_LINKS = [
  "https://secure.chase.com/web/auth/dashboard",
  "https://www.chase.com/personal/credit-cards",
  "https://www.amazon.com/ap/signin?openid.pape.max_auth_age=0",
  "https://www.amazon.co.uk/gp/css/order-history",
  "https://amzn.to/3xYz123",
  "https://a.co/d/abc1234",
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=abc",
  "https://login.live.com/login.srf",
  "https://outlook.office.com/mail/",
  "https://account.microsoft.com/account",
  "https://aka.ms/mfasetup",
  "https://www.paypal.com/signin",
  "https://www.paypal.com/us/home",
  "https://accounts.google.com/signin/v2/identifier",
  "https://mail.google.com/mail/u/0/",
  "https://myaccount.google.com/security",
  "https://appleid.apple.com/sign-in",
  "https://www.icloud.com/",
  "https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go",
  "https://connect.secure.wellsfargo.com/auth/login/present",
  "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490",
  "https://www.ups.com/track?tracknum=1Z999AA10123456784",
  "https://www.fedex.com/fedextrack/?trknbr=123456789012",
  "https://www.irs.gov/payments",
  "https://secure.ssa.gov/RIL/SiView.action",
  "https://www.medicare.gov/account/login",
  "https://www.netflix.com/login",
  "https://verified.capitalone.com/auth/signin",
  "https://online.citi.com/US/login.do",
  "https://www.walmart.com/account/login",
  "https://www.facebook.com/login",
  "https://www.coinbase.com/signin",
  "https://www.verizon.com/signin",
  "https://venmo.com/account/sign-in",
  "https://www.zellepay.com",
  "https://www.e-zpassny.com/vector/account/home/accountLogin.do",
  "https://reportfraud.ftc.gov",
];

// Real sites that contain or resemble brand words. Must NOT be called look-alikes.
const REAL_NON_BRAND_LINKS = [
  "https://www.citizensbank.com",
  "https://www.purchase.edu",
  "https://www.applebees.com",
  "https://groups.io",
  "https://www.first.com",
  "https://www.medicaid.gov",
  "https://www.wellsfargoadvisors.com",
  "https://www.wikipedia.org/wiki/Apple",
  "https://www.nytimes.com/section/business",
];

describe("real brand links: zero false alarms", () => {
  for (const url of REAL_BRAND_LINKS) {
    it(url, () => {
      const link = analyzeLink(url);
      expect(link.officialBrand, `${url} should be official`).not.toBeNull();
      const r = checkMessage(url);
      expect(r.score).toBe(0);
      expect(r.level).toBe("none");
      expect(r.headline).toBe("No red flags found");
    });
  }
});

describe("real non-brand links: no look-alike flags", () => {
  for (const url of REAL_NON_BRAND_LINKS) {
    it(url, () => {
      const ids = analyzeLink(url).evidence.map((e) => e.id);
      expect(ids.filter((id) => id.startsWith("link.brand") || id.startsWith("link.idn"))).toEqual([]);
      expect(["none", "low"]).toContain(checkMessage(url).level);
    });
  }
});

describe("real messages: no caution or high", () => {
  const messages = [
    "Chase: Your one-time code is 482913. Don't share this code with anyone. We'll never call or text you for it.",
    "Your verification code is 123456",
    "Your Amazon package was delivered. Track at https://www.amazon.com/gp/your-account/order-history",
    "USPS: Your item 9400111899223197428490 was delivered at 2:15 pm. https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490",
    "Hi Grandma! Can't wait to see you Sunday for dinner. Love, Emma",
    "Reminder: your appointment with Dr. Smith is tomorrow at 10am. Reply C to confirm.",
    "CVS Pharmacy: Your prescription is ready for pickup.",
    "Microsoft will never ask you to share your password or code.",
    "Your Netflix membership renews on Dec 1. Manage it at https://www.netflix.com/account",
  ];
  for (const m of messages) {
    it(m.slice(0, 60), () => {
      const r = checkMessage(m);
      expect(["none", "low"], JSON.stringify(r.evidence.map((e) => e.id))).toContain(r.level);
    });
  }
});

describe("scam messages: high risk with the right scam type", () => {
  const cases: [string, string][] = [
    ["Chase Alert: Your account has been locked due to unusual activity. Verify now: https://chase-secure-login.top/verify", "bank"],
    ["USPS: Your package could not be delivered due to an incomplete address. Update here: https://usps.com-redelivery.info/track", "delivery"],
    ["Deposit $100 and get $3,000 back guaranteed! Text me on WhatsApp", "prize"],
    ["IRS: You owe back taxes. A warrant for your arrest will be issued unless you pay today with gift cards. Call 1-888-555-0199", "government"],
    ["Grandma it's me, I was in a car accident and I'm in jail. Please don't tell Mom. I need $2,000 for bail. Can you get gift cards?", "family"],
    ["E-ZPass: Unpaid toll balance of $6.99. Pay within 24 hours to avoid late fees: https://ezpass-tolls.xyz/pay", "toll"],
    ["Microsoft Support: Your computer has a virus. Call 1-800-555-0123 immediately. Do not turn off your computer. We will connect with AnyDesk.", "tech"],
    ["Congratulations! You've won a $1,000 Walmart gift card. Claim your prize here: http://walmart-rewards.click/claim", "prize"],
  ];
  for (const [msg, type] of cases) {
    it(msg.slice(0, 60), () => {
      const r = checkMessage(msg);
      expect(r.level, JSON.stringify(r.evidence.map((e) => `${e.id}:${e.weight}`))).toBe("high");
      expect(r.scamType?.id).toBe(type);
      expect(r.nextSteps.join(" ")).toContain("reportfraud.ftc.gov");
      expect(r.headline).not.toMatch(/safe/i);
    });
  }
});

describe("tricky links", () => {
  const cases: [string, string][] = [
    ["https://paypa1.com/signin", "link.brand_lookalike"],
    ["https://www.arnazon.com/account", "link.brand_lookalike"],
    ["https://xn--pple-43d.com/id", "link.idn_lookalike"],
    ["https://secure-chase.com.account-verify.icu/login", "link.brand_disguise"],
    ["https://www.chase.com@evil.top/login", "link.at_trick"],
    ["http://192.168.1.1/login", "link.ip_address"],
    ["https://bit.ly/3abcXYZ", "link.shortener"],
    ["https://wells-fargo-alerts.com/verify", "link.brand_in_name"],
    ["https://micros0ft-support.com/login", "link.brand_lookalike"],
    ["https://netflx.com/billing", "link.brand_misspelled"],
    ["https://chase-login.web.app", "link.user_content"],
    ["https://sites.google.com/view/chase-verify", "link.user_content"],
  ];
  for (const [url, id] of cases) {
    it(url, () => {
      const ids = analyzeLink(url).evidence.map((e) => e.id);
      expect(ids).toContain(id);
      expect(analyzeLink(url).officialBrand).toBeNull();
    });
  }

  it("sites.google.com is never treated as official Google", () => {
    expect(checkMessage("https://sites.google.com/view/x").evidence.some((e) => e.good)).toBe(false);
  });
});

describe("extraction", () => {
  it("finds links with and without https", () => {
    const urls = extractUrls("Go to chase-alerts.top/login or https://bit.ly/x. Also www.example.com, and email me at a@b.com.");
    expect(urls).toContain("chase-alerts.top/login");
    expect(urls).toContain("https://bit.ly/x");
    expect(urls).toContain("www.example.com");
  });
  it("ignores words with dots that aren't domains", () => {
    expect(extractUrls("e.g. U.S. Mr.Smith invoice.zip 3.50")).toEqual([]);
  });
  it("finds US phone numbers but not tracking numbers", () => {
    expect(extractPhones("Call (888) 555-0199 or 1-800-555-0123 now")).toEqual(["(888) 555-0199", "(800) 555-0123"]);
    expect(extractPhones("Tracking 9400111899223197428490")).toEqual([]);
  });
});

describe("wording", () => {
  it("never says safe", () => {
    const r = checkMessage("hello");
    expect(r.level).toBe("none");
    expect(`${r.headline} ${r.summary}`).not.toMatch(/\bsafe\b/i);
  });
});

describe("punycode decoding (runs without Node's url module)", () => {
  it.each([
    ["xn--pple-43d.com", "\u0430pple.com"],
    ["xn--mnchen-3ya.de", "m\u00fcnchen.de"],
    ["www.xn--80ak6aa92e.com", "www.\u0430\u0440\u0440\u04cf\u0435.com"],
    ["chase.com", "chase.com"],
    ["xn--!!bad.com", "xn--!!bad.com"],
  ])("%s", (input, expected) => {
    expect(hostToUnicode(input)).toBe(expected);
  });
});
