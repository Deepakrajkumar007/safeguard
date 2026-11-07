/** Optimal string alignment distance (Levenshtein + adjacent swaps). Small inputs only. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/**
 * Collapse characters scammers swap to fool the eye: 0/o, 1/l/i, rn/m, vv/w, 5/s, 3/e.
 * Two strings with the same skeleton look alike at a glance.
 */
export function skeleton(s: string): string {
  return s
    .toLowerCase()
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/0/g, "o")
    .replace(/[1i|!]/g, "l")
    .replace(/3/g, "e")
    .replace(/[5$]/g, "s")
    .replace(/4/g, "a")
    .replace(/7/g, "t");
}

/** Letters from other alphabets that look like Latin letters (Cyrillic, Greek, Armenian). */
const CONFUSABLES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i", "ј": "j",
  "ѕ": "s", "ԁ": "d", "ɡ": "g", "һ": "h", "ӏ": "l", "ԛ": "q", "ԝ": "w", "ь": "b", "т": "t",
  "к": "k", "м": "m", "н": "h", "в": "b",
  "α": "a", "ο": "o", "ν": "v", "ρ": "p", "τ": "t", "κ": "k", "ι": "i", "ε": "e", "υ": "u",
  "ս": "u", "ո": "n", "օ": "o", "ց": "g",
};

export function mapConfusables(s: string): string {
  let src = s;
  try {
    src = s.normalize("NFKC");
  } catch {
    /* some JS engines lack full Unicode normalization; the table below still applies */
  }
  let out = "";
  for (const ch of src) out += CONFUSABLES[ch] ?? ch;
  return out;
}

// Punycode decoder (RFC 3492), so the checker runs on servers and phones without Node's "url" module.
const PC = { base: 36, tMin: 1, tMax: 26, skew: 38, damp: 700, bias: 72, n: 128, maxInt: 0x7fffffff };

function basicToDigit(cp: number): number {
  if (cp >= 0x30 && cp < 0x3a) return 26 + (cp - 0x30);
  if (cp >= 0x41 && cp < 0x5b) return cp - 0x41;
  if (cp >= 0x61 && cp < 0x7b) return cp - 0x61;
  return PC.base;
}

function adapt(delta: number, numPoints: number, firstTime: boolean): number {
  let k = 0;
  delta = firstTime ? Math.floor(delta / PC.damp) : delta >> 1;
  delta += Math.floor(delta / numPoints);
  const baseMinusTMin = PC.base - PC.tMin;
  for (; delta > (baseMinusTMin * PC.tMax) >> 1; k += PC.base) delta = Math.floor(delta / baseMinusTMin);
  return Math.floor(k + ((baseMinusTMin + 1) * delta) / (delta + PC.skew));
}

function decodePunycodeLabel(input: string): string {
  const output: number[] = [];
  let n = PC.n;
  let i = 0;
  let bias = PC.bias;
  let basic = input.lastIndexOf("-");
  if (basic < 0) basic = 0;
  for (let j = 0; j < basic; j++) output.push(input.charCodeAt(j));
  for (let index = basic > 0 ? basic + 1 : 0; index < input.length; ) {
    const oldi = i;
    for (let w = 1, k = PC.base; ; k += PC.base) {
      if (index >= input.length) throw new Error("invalid punycode");
      const digit = basicToDigit(input.charCodeAt(index++));
      if (digit >= PC.base || digit > Math.floor((PC.maxInt - i) / w)) throw new Error("invalid punycode");
      i += digit * w;
      const t = k <= bias ? PC.tMin : k >= bias + PC.tMax ? PC.tMax : k - bias;
      if (digit < t) break;
      if (w > Math.floor(PC.maxInt / (PC.base - t))) throw new Error("invalid punycode");
      w *= PC.base - t;
    }
    const out = output.length + 1;
    bias = adapt(i - oldi, out, oldi === 0);
    if (Math.floor(i / out) > PC.maxInt - n) throw new Error("invalid punycode");
    n += Math.floor(i / out);
    i %= out;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

/** "xn--pple-43d.com" -> "аpple.com". Labels that fail to decode are left as-is. */
export function hostToUnicode(host: string): string {
  return host
    .split(".")
    .map((label) => {
      if (!label.toLowerCase().startsWith("xn--")) return label;
      try {
        return decodePunycodeLabel(label.slice(4).toLowerCase());
      } catch {
        return label;
      }
    })
    .join(".");
}

export function hasNonAscii(s: string): boolean {
  return /[^\x00-\x7f]/.test(s);
}
