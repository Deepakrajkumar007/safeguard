import { parse } from "tldts";
import { describe, expect, it } from "vitest";
import { BRANDS } from "../brands";
import { matchSpoken, normalizeSpoken, POPULAR, spokenAddress } from "../launcher";

describe("verified list is consistent", () => {
  it.each(BRANDS.map((b) => [b.id, b]))("%s launch URL is https and on its own verified domain", (_id, b) => {
    expect(b.launchUrl.startsWith("https://")).toBe(true);
    const domain = parse(b.launchUrl).domain;
    expect(b.domains).toContain(domain);
  });
  it("popular list resolves", () => {
    expect(POPULAR.length).toBe(10);
  });
});

describe("speech picks a brand, never a URL", () => {
  it.each([
    ["Open Chase", "chase"],
    ["open chase dot com", "chase"],
    ["Bank of America", "bankofamerica"],
    ["b of a", "bankofamerica"],
    ["pay pal", "paypal"],
    ["Please go to the Social Security website", "ssa"],
    ["medicare please", "medicare"],
    ["open up amazon prime", "amazon"],
    ["take me to the post office", "usps"],
    ["Wells Fargo", "wellsfargo"],
    ["open my gmail", "gmail"],
    ["AT&T", "att"],
    ["Open Chase.", "chase"],
    ["Chase?", "chase"],
    ["T-Mobile", "tmobile"],
  ])("%s -> %s", (said, id) => {
    const m = matchSpoken(said);
    expect(m.brand?.id).toBe(id);
    expect(m.unknownAddress).toBe(false);
  });

  it("suggests instead of guessing on a mishearing", () => {
    const m = matchSpoken("amazn");
    expect(m.brand).toBeNull();
    expect(m.suggestions.map((b) => b.id)).toContain("amazon");
  });

  it("returns nothing for gibberish", () => {
    const m = matchSpoken("purple elephant");
    expect(m.brand).toBeNull();
    expect(m.suggestions).toEqual([]);
  });
});

describe("typed addresses use EXACT hostname matching", () => {
  it.each([
    ["chase.com", "chase"],
    ["www.chase.com", "chase"],
    ["https://www.chase.com/personal", "chase"],
    ["paypal.com", "paypal"],
  ])("%s -> %s", (typed, id) => {
    expect(matchSpoken(typed).brand?.id).toBe(id);
  });

  it.each(["chase-secure-login.top", "chase.com.verify-acct.top", "secure.chase.com.evil.top", "paypa1.com", "amazon-refunds.shop/login"])(
    "refuses look-alike or unknown address %s",
    (typed) => {
      const m = matchSpoken(typed);
      expect(m.brand).toBeNull();
      expect(m.unknownAddress).toBe(true);
    },
  );
});

describe("helpers", () => {
  it("strips filler words", () => {
    expect(normalizeSpoken("Could you please open up the Chase website for me?")).toBe("chase");
  });
  it("reads addresses aloud clearly", () => {
    expect(spokenAddress("https://www.chase.com")).toBe("www dot chase dot com");
    expect(spokenAddress("https://www.t-mobile.com")).toBe("www dot t dash mobile dot com");
  });
});
