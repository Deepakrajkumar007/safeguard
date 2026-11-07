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
  let out = "";
  for (const ch of s.normalize("NFKC")) out += CONFUSABLES[ch] ?? ch;
  return out;
}

export function hasNonAscii(s: string): boolean {
  return /[^\x00-\x7f]/.test(s);
}
