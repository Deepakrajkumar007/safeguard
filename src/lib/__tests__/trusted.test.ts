import { describe, expect, it } from "vitest";
import { deserializeTrusted, formatTrusted, isTrustedSender, parseTrusted, serializeTrusted } from "../trusted";

describe("trusted sender entries", () => {
  it.each([
    ["(716) 555-0123", { kind: "phone", value: "+17165550123" }],
    ["716-555-0123", { kind: "phone", value: "+17165550123" }],
    ["+1 716 555 0123", { kind: "phone", value: "+17165550123" }],
    ["17165550123", { kind: "phone", value: "+17165550123" }],
    ["+44 20 7946 0958", { kind: "phone", value: "+442079460958" }],
    ["Mom@iCloud.com", { kind: "email", value: "mom@icloud.com" }],
    ["Grandma Linda", { kind: "name", value: "grandma linda" }],
  ])("%s", (raw, expected) => {
    expect(parseTrusted(raw)).toEqual(expected);
  });

  it.each(["", "12", "hello@", "https://evil.example", "<script>"])("rejects %s", (raw) => {
    expect(parseTrusted(raw)).toBeNull();
  });

  it("formats US numbers for display", () => {
    expect(formatTrusted({ kind: "phone", value: "+17165550123" })).toBe("(716) 555-0123");
  });
});

describe("matching a sender from Shortcuts", () => {
  const list = deserializeTrusted(serializeTrusted([
    { kind: "phone", value: "+17165550123" },
    { kind: "email", value: "mom@icloud.com" },
    { kind: "name", value: "grandma linda" },
  ]));

  it.each(["+1 (716) 555-0123", "7165550123", "MOM@icloud.com", "Grandma  Linda"])("trusts %s", (sender) => {
    expect(isTrustedSender(sender, list)).toBe(true);
  });

  it.each(["+1 (888) 555-0199", "scammer@gmail.com", "USPS", ""])("does not trust %s", (sender) => {
    expect(isTrustedSender(sender, list)).toBe(false);
  });

  it("ignores junk in a pasted list", () => {
    expect(deserializeTrusted("7165550123, not a number!!, mom@icloud.com").length).toBe(2);
  });
});
