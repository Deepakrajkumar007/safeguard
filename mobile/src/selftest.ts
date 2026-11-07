import { checkMessage } from "@shared/checker";

// Same expectations as the server's vitest suite, run on the phone's JavaScript engine (Hermes).
const REAL_LINKS = [
  "https://secure.chase.com/web/auth/dashboard",
  "https://www.amazon.com/ap/signin?openid.pape.max_auth_age=0",
  "https://amzn.to/3xYz123",
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=abc",
  "https://login.live.com/login.srf",
  "https://www.paypal.com/signin",
  "https://accounts.google.com/signin/v2/identifier",
  "https://appleid.apple.com/sign-in",
  "https://secure.bankofamerica.com/login/sign-in/signOnV2Screen.go",
  "https://connect.secure.wellsfargo.com/auth/login/present",
  "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223197428490",
  "https://www.irs.gov/payments",
  "https://secure.ssa.gov/RIL/SiView.action",
  "https://www.medicare.gov/account/login",
];

const SCAMS: [string, string][] = [
  ["Chase Alert: Your account has been locked due to unusual activity. Verify now: https://chase-secure-login.top/verify", "bank"],
  ["USPS: Your package could not be delivered due to an incomplete address. Update here: https://usps.com-redelivery.info/track", "delivery"],
  ["Deposit $100 and get $3,000 back guaranteed! Text me on WhatsApp", "prize"],
  ["Grandma it's me, I was in a car accident and I'm in jail. Please don't tell Mom. I need $2,000 for bail. Can you get gift cards?", "family"],
  ["E-ZPass: Unpaid toll balance of $6.99. Pay within 24 hours to avoid late fees: https://ezpass-tolls.xyz/pay", "toll"],
  ["https://xn--pple-43d.com/id", "phishing_link"],
  ["https://paypa1.com/signin", "phishing_link"],
];

export interface SelfTestResult {
  passed: number;
  total: number;
  failures: string[];
  ms: number;
}

export function runSelfTest(): SelfTestResult {
  const started = Date.now();
  const failures: string[] = [];
  let total = 0;
  for (const url of REAL_LINKS) {
    total++;
    try {
      const r = checkMessage(url);
      if (r.score !== 0 || r.level !== "none") failures.push(`False alarm on ${url} (score ${r.score})`);
    } catch (e) {
      failures.push(`Crash on ${url}: ${String(e)}`);
    }
  }
  for (const [msg, type] of SCAMS) {
    total++;
    try {
      const r = checkMessage(msg);
      if (r.level !== "high" || r.scamType?.id !== type) {
        failures.push(`Missed "${msg.slice(0, 40)}…" (got ${r.level}/${r.scamType?.id ?? "none"})`);
      }
    } catch (e) {
      failures.push(`Crash on "${msg.slice(0, 40)}…": ${String(e)}`);
    }
  }
  return { passed: total - failures.length, total, failures, ms: Date.now() - started };
}
