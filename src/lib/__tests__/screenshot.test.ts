import { describe, expect, it } from "vitest";
import { decodeDataUrl, parseExtraction, sniffImageType, textForChecker } from "../screenshot";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

describe("screenshot input checks", () => {
  it("identifies images by their bytes, not their claimed type", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
  });
  it("decodes data URLs and rejects anything else", () => {
    const url = `data:image/png;base64,${Buffer.from(PNG).toString("base64")}`;
    expect(Array.from(decodeDataUrl(url) ?? [])).toEqual(Array.from(PNG));
    expect(decodeDataUrl("https://evil.example/x.png")).toBeNull();
    expect(decodeDataUrl("data:text/html;base64,PGh0bWw+")).toBeNull();
  });
});

describe("transcript validation", () => {
  const good = { message_text: "USPS: package held", sender: "+1 555", links: ["https://usps.com-x.info"], phone_numbers: [] };
  it("accepts a valid transcript and adds links missing from the text", () => {
    const e = parseExtraction(JSON.stringify(good));
    expect(e).not.toBeNull();
    expect(textForChecker(e!)).toBe("USPS: package held\nhttps://usps.com-x.info");
  });
  it("rejects bad shapes", () => {
    expect(parseExtraction("{nope")).toBeNull();
    expect(parseExtraction(JSON.stringify({ ...good, links: "not a list" }))).toBeNull();
    expect(parseExtraction(JSON.stringify({ message_text: "x" }))).toBeNull();
  });
});
