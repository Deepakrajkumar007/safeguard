import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { guard, isAllowedClient } from "../guard";

const req = (headers: Record<string, string>) => new Request("http://x/api/check", { method: "POST", headers });

describe("app key", () => {
  beforeEach(() => {
    process.env.LINKGUARD_APP_KEY = "test-key-123";
  });
  afterEach(() => {
    delete process.env.LINKGUARD_APP_KEY;
  });
  it("lets the app (with key) and our own web page (same-origin) through", () => {
    expect(isAllowedClient(req({ "x-linkguard-key": "test-key-123" }))).toBe(true);
    expect(isAllowedClient(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });
  it("blocks other callers", () => {
    expect(isAllowedClient(req({}))).toBe(false);
    expect(isAllowedClient(req({ "x-linkguard-key": "wrong" }))).toBe(false);
    expect(isAllowedClient(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(guard(req({}), "t", 10)?.status).toBe(401);
  });
});

describe("rate limit", () => {
  it("allows a burst up to the limit, then answers 429", () => {
    const r = () => guard(req({ "x-forwarded-for": "203.0.113.9" }), "burst", 3);
    expect([r(), r(), r()].every((x) => x === null)).toBe(true);
    expect(r()?.status).toBe(429);
  });
  it("skips the key check when no key is configured (local development)", () => {
    expect(isAllowedClient(req({}))).toBe(true);
  });
});
