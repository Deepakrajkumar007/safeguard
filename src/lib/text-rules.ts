import type { Evidence, ScamType } from "./types";

/**
 * Scam-wording rules. Each rule fires at most once per message.
 * Weights are hand-set, not learned. They are a starting point, not a measured model.
 */
interface Rule {
  id: string;
  title: string;
  detail: string;
  weight: number;
  scamType?: ScamType;
  patterns: RegExp[];
  /** Only check sentences that do NOT contain a "never/don't" phrase (avoids flagging real security tips). */
  skipNegated?: boolean;
}

const MONEY = String.raw`\$\s?\d[\d,]*(?:\.\d{2})?`;

const RULES: Rule[] = [
  // Bank / account alerts
  {
    id: "text.account_problem",
    title: "Says your account has a problem",
    detail: "Scammers say your account is locked or has strange activity so you panic and act fast.",
    weight: 20,
    scamType: "bank",
    patterns: [
      /account (?:has been |is |was |will be )?(?:temporarily )?(?:locked|suspended|restricted|frozen|disabled|on hold|limited|deactivated|closed)/,
      /(?:unusual|suspicious|unauthori[sz]ed|irregular) (?:activity|sign-?in|log-?in|login|transaction|charge|purchase|access)/,
    ],
  },
  {
    id: "text.verify_account",
    title: "Asks you to \"verify\" your account",
    detail: "Real banks don't ask you to verify your account through a link in a text.",
    weight: 20,
    scamType: "bank",
    patterns: [
      /(?:verify|confirm|validate|re-?activate|unlock|restore) (?:your )?(?:account|identity|information|details|card|profile|access)/,
    ],
  },
  {
    id: "text.did_you",
    title: "Asks if you made a payment",
    detail: "Some real banks send these, but scammers copy them. Check by calling the number on your card.",
    weight: 15,
    scamType: "bank",
    patterns: [/did you (?:attempt|make|authori[sz]e|try|send|request)/],
  },

  // Money offers
  {
    id: "text.pay_to_get",
    title: "Pay a little to get a lot",
    detail: "Real offers never ask you to send money first to get more money back.",
    weight: 50,
    scamType: "prize",
    patterns: [
      new RegExp(String.raw`(?:deposit|send|pay|invest|transfer)\s+${MONEY}.{0,40}?(?:get|receive|earn|make|win|back|return)\s+(?:up to\s+)?${MONEY}`),
      new RegExp(String.raw`${MONEY}\s+(?:to|and)\s+(?:get|receive|make|earn)\s+${MONEY}`),
      /(?:double|triple) your (?:money|investment|deposit)/,
      /guaranteed (?:return|profit|income|payout|earnings)/,
    ],
  },
  {
    id: "text.you_won",
    title: "Says you won something",
    detail: "Surprise prizes you never entered for are a classic trick to get your money or details.",
    weight: 25,
    scamType: "prize",
    patterns: [
      /you(?:'ve| have)? (?:won|been selected|been chosen)/,
      /congratulations/,
      /(?:lucky|selected) winner/,
      /claim (?:your )?(?:prize|reward|gift|funds|money|winnings|refund|cash)/,
    ],
  },
  {
    id: "text.upfront_fee",
    title: "Asks for a fee to release money",
    detail: "Paying a \"processing\" or \"release\" fee to get money is a common scam.",
    weight: 15,
    scamType: "prize",
    patterns: [/(?:processing|release|clearance|transfer|activation|unlock(?:ing)?) fee/],
  },

  // Delivery and tolls
  {
    id: "text.delivery_problem",
    title: "Says a package can't be delivered",
    detail: "Fake delivery texts send you to a look-alike site to steal card details. Real carriers don't charge surprise fees by text.",
    weight: 25,
    scamType: "delivery",
    patterns: [
      /(?:package|parcel|shipment|delivery|item|order).{0,60}?(?:could not|couldn'?t|unable to|failed to|cannot|can'?t|was not|wasn'?t) (?:be )?(?:delivered|deliver|shipped|ship|completed)/,
      /re-?deliver/,
      /(?:incomplete|incorrect|invalid|missing|wrong) (?:address|zip|house number|street)/,
      /(?:customs|shipping|delivery|redelivery|re-delivery) (?:fee|charge|payment)/,
      /(?:held|on hold|waiting) at (?:the |our )?(?:warehouse|facility|customs|depot)/,
    ],
  },
  {
    id: "text.unpaid_toll",
    title: "Says you owe a toll",
    detail: "Fake toll bills are one of the most common scam texts right now. Toll agencies don't ask you to pay through a text link.",
    weight: 30,
    scamType: "toll",
    patterns: [
      /(?:unpaid|outstanding|overdue|pending) toll/,
      /toll (?:balance|charges?|bill|violation|payment|fee|invoice)/,
      /(?:e-?z ?pass|sun ?pass|fastrak|txtag|peach ?pass|i-?pass).{0,80}?(?:unpaid|due|pay|balance|fee|owe)/,
    ],
  },

  // Government
  {
    id: "text.gov_threat",
    title: "Threatens arrest or legal trouble",
    detail: "The IRS, Social Security, and police don't call or text to threaten arrest or demand payment.",
    weight: 35,
    scamType: "government",
    patterns: [
      /(?:irs|internal revenue|social security|\bssa\b|medicare|federal|marshal|sheriff|homeland security|\bfbi\b|\bdea\b|police|government)[^.!?]{0,120}?(?:arrest|warrant|lawsuit|legal action|court|jail|prison|deport|suspend|penalt|seize|freeze)/,
      /(?:arrest|warrant|lawsuit|legal action|deport)[^.!?]{0,120}?(?:irs|internal revenue|social security|\bssa\b|federal|marshal|sheriff|police)/,
      /(?:ssn|social security number) (?:has been |is |was |will be )?(?:suspended|compromised|blocked|frozen|used)/,
    ],
  },
  {
    id: "text.you_owe",
    title: "Says you owe money or taxes",
    detail: "Real tax or benefit problems come by mail first, not by a surprise call or text.",
    weight: 15,
    scamType: "government",
    patterns: [/(?:you owe|back taxes|unpaid tax|tax (?:debt|bill|due)|owe the (?:irs|government))/],
  },

  // Tech support
  {
    id: "text.tech_support",
    title: "Fake computer-problem warning",
    detail: "Microsoft, Apple, and others don't contact you about viruses. Scammers want remote access or payment.",
    weight: 30,
    scamType: "tech",
    patterns: [
      /(?:virus|malware|hacked|infected|compromised|spyware)[^.!?]{0,40}?(?:computer|device|phone|pc|laptop|system)/,
      /(?:computer|device|pc|laptop|system) (?:has|is|was) (?:been )?(?:infected|hacked|locked|compromised|blocked)/,
      /(?:microsoft|apple|windows|geek squad|norton|mcafee|amazon) (?:support|security|technician|help desk|tech|refund department)/,
      /do not (?:turn off|shut down|restart|close) (?:your )?(?:computer|pc|device|browser)/,
    ],
  },
  {
    id: "text.renewal",
    title: "Surprise subscription charge",
    detail: "Fake \"your subscription renewed\" messages try to get you to call so they can \"refund\" you.",
    weight: 20,
    scamType: "tech",
    patterns: [
      new RegExp(String.raw`(?:auto-?renew(?:al|ed)?|subscription|membership|order)[^.!?]{0,60}?(?:renewed|charged|been charged|will be charged|debited)[^.!?]{0,30}?${MONEY}`),
      /(?:to cancel|if you did not (?:authori[sz]e|make|order) this)[^.!?]{0,40}?call/,
    ],
  },

  // Jobs / investments
  {
    id: "text.easy_money",
    title: "Easy-money job or investment",
    detail: "Jobs that pay a lot for little work, or \"can't lose\" investments, are usually scams.",
    weight: 25,
    scamType: "job",
    patterns: [
      new RegExp(String.raw`earn\s+${MONEY}\s*(?:per|a|each|every)\s*(?:day|hour|week)`),
      /(?:work from home|no experience (?:needed|required)|easy money|part-?time (?:job|position|opportunity))/,
      /(?:crypto|bitcoin|btc|usdt|forex|trading platform)[^.!?]{0,60}?(?:profit|return|guarantee|earn|invest)/,
      /investment opportunity/,
    ],
  },
  {
    id: "text.other_app",
    title: "Wants to move to another chat app",
    detail: "Scammers move you to WhatsApp or Telegram where it's harder to report them.",
    weight: 10,
    patterns: [/\b(?:whatsapp|telegram|signal app|wechat)\b/],
  },

  // Tactics (no scam type of their own)
  {
    id: "text.gift_cards",
    title: "Asks for gift cards",
    detail: "No real company, bank, or government agency asks you to pay with gift cards.",
    weight: 35,
    patterns: [
      /(?:pay|send|buy|purchase|get|pick up|read me|scratch|go to)[^.!?]{0,40}?(?:gift ?cards?|itunes|google play|steam card|vanilla (?:visa|card))/,
      /gift ?cards?[^.!?]{0,40}?(?:pay|payment|send|codes?|numbers? on the back|photo|picture)/,
    ],
  },
  {
    id: "text.wire_crypto",
    title: "Asks for wire, crypto, or payment-app money",
    detail: "Money sent by wire, crypto, or apps like Zelle is almost impossible to get back. Scammers love these.",
    weight: 35,
    patterns: [
      /wire (?:transfer|the money|money)|western union|moneygram|(?:bitcoin|crypto) (?:atm|machine|kiosk)/,
      /(?:send|pay|transfer|deposit)[^.!?]{0,30}?(?:bitcoin|crypto|btc|usdt)/,
      /(?:send|pay|transfer)[^.!?]{0,30}?(?:zelle|venmo|cash ?app)/,
      /(?:zelle|venmo|cash ?app)[^.!?]{0,40}?(?:to yourself|refund|reverse|send (?:it )?back)/,
    ],
  },
  {
    id: "text.cash_courier",
    title: "Wants cash picked up or mailed",
    detail: "A courier picking up cash, or mailing cash, is a sign of a scam.",
    weight: 35,
    patterns: [
      /(?:courier|driver|someone|agent) (?:will|to|is going to) (?:pick up|collect|come (?:get|by)|come to your)/,
      /(?:put|mail|send|ship) (?:the )?cash|cash in (?:a|an) (?:box|envelope)/,
    ],
  },
  {
    id: "text.asks_code",
    title: "Asks for a code or password",
    detail: "Never share a one-time code or password. Anyone who asks for one is trying to get into your account.",
    weight: 35,
    scamType: "account",
    skipNegated: true,
    patterns: [
      /(?:share|send|give|tell|read|forward|reply with|text|provide|confirm) (?:me |us )?(?:the |your |that |this )?(?:\d-digit )?(?:code|otp|one-?time (?:pass)?code|verification code|security code|pin|passcode|password)/,
    ],
  },
  {
    id: "text.asks_personal",
    title: "Asks for personal information",
    detail: "Don't give your Social Security number, bank details, or birth date to someone who contacted you.",
    weight: 30,
    skipNegated: true,
    patterns: [
      /(?:confirm|provide|send|verify|update|enter|need|give|tell)[^.!?]{0,30}?(?:social security number|\bssn\b|date of birth|bank account number|routing number|card number|cvv|mother'?s maiden name)/,
    ],
  },
  {
    id: "text.remote_access",
    title: "Wants control of your computer",
    detail: "Never let someone who contacted you install remote-access apps. They can take your money.",
    weight: 35,
    scamType: "tech",
    patterns: [/\b(?:anydesk|teamviewer|ultraviewer|logmein|remote access|screen ?share|zoho assist|quick ?assist)\b/],
  },
  {
    id: "text.secrecy",
    title: "Asks you to keep it secret",
    detail: "Scammers tell you to keep secrets so no one can warn you. Real family and real companies don't.",
    weight: 25,
    patterns: [
      /(?:don'?t|do not) tell (?:anyone|anybody|mom|dad|my (?:mom|dad|parents)|your (?:family|bank|kids|children)|the bank|them)/,
      /keep (?:this|it) (?:a )?(?:secret|between us|confidential|quiet|to yourself)/,
      /(?:don'?t|do not) (?:hang up|talk to anyone|contact your bank)/,
    ],
  },
  {
    id: "text.tap_link",
    title: "Pushes you to tap a link",
    detail: "Scam texts want you to tap fast before you think.",
    weight: 10,
    patterns: [/(?:click|tap|visit|go to|open) (?:the |this |our )?(?:link|url|here|below)|log ?in (?:here|now|below)/],
  },
];

const URGENCY: RegExp[] = [
  /\b(?:immediately|right away|right now|urgent(?:ly)?|asap|act now)\b/,
  /\b(?:final|last) (?:notice|warning|reminder|chance)\b/,
  /\bwithin \d+ (?:minutes?|hours?|hrs?|days?)\b/,
  /\bin the next \d+ (?:minutes?|hours?)\b/,
  /\b(?:expires?|expiring|suspended|deleted|closed|cancell?ed) (?:today|tonight|soon|in \d+)/,
  /\btoday only\b/,
  /\bavoid (?:late fees?|penalt(?:y|ies)|suspension|legal action|additional (?:charges|fees)|arrest)/,
];

const FAMILY_WHO =
  /\b(?:grandma|grandpa|grandmother|grandfather|granny|nana|grandson|granddaughter|nephew|niece)\b|\bit'?s me\b|\bthis is your (?:grandson|granddaughter|nephew|niece|son|daughter)\b|\b(?:hi|hey) (?:mom|mum|dad)\b/;
const FAMILY_TROUBLE =
  /\b(?:jail|arrested|bail|accident|hospital|lawyer|attorney|in trouble|stuck|stranded|lost my (?:phone|wallet)|need (?:money|help) (?:fast|now|urgently))\b/;
const NEW_NUMBER = /\b(?:new (?:phone|number)|lost my phone|this is my new number|broke my phone)\b/;
const NEGATION = /\b(?:never|don'?t|do not|won'?t|will not|not)\b[^.!?]{0,40}?\b(?:ask|share|call|text|email|request|give)/;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function sentences(t: string): string[] {
  return t.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
}

export function analyzeText(text: string): Evidence[] {
  const t = normalizeText(text);
  const out: Evidence[] = [];

  for (const rule of RULES) {
    const scopes = rule.skipNegated ? sentences(t).filter((s) => !NEGATION.test(s)) : [t];
    let quote: string | undefined;
    for (const scope of scopes) {
      for (const re of rule.patterns) {
        const m = scope.match(re);
        if (m) {
          quote = m[0];
          break;
        }
      }
      if (quote) break;
    }
    if (quote) {
      out.push({
        id: rule.id,
        source: "wording",
        title: rule.title,
        detail: rule.detail,
        weight: rule.weight,
        scamType: rule.scamType,
        quote,
      });
    }
  }

  // Family emergency: needs BOTH "it's family" and "in trouble". "Hi Grandma" alone is fine.
  const who = t.match(FAMILY_WHO);
  const trouble = t.match(FAMILY_TROUBLE);
  if (who && trouble) {
    out.push({
      id: "text.family_emergency",
      source: "wording",
      title: "Says a family member is in trouble",
      detail: "Scammers pretend to be a grandchild or relative in an emergency. Hang up and call your family member at the number you already know.",
      weight: 35,
      scamType: "family",
      quote: `${who[0]} … ${trouble[0]}`,
    });
  } else {
    const nn = t.match(NEW_NUMBER);
    if (nn) {
      out.push({
        id: "text.new_number",
        source: "wording",
        title: "Says this is a new phone number",
        detail: "\"I have a new number\" is how many family-emergency scams start. Call the old number to check.",
        weight: 15,
        scamType: "family",
        quote: nn[0],
      });
    }
  }

  // Urgency: 10 points per distinct pressure phrase, max 20.
  const urgent = URGENCY.map((re) => t.match(re)?.[0]).filter((x): x is string => Boolean(x));
  if (urgent.length) {
    out.push({
      id: "text.urgency",
      source: "wording",
      title: "Rushes you to act fast",
      detail: "Pressure to act right now is a top scam sign. Real companies give you time.",
      weight: Math.min(20, urgent.length * 10),
      quote: urgent.slice(0, 2).join(" … "),
    });
  }

  return out;
}
