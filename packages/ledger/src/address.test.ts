import { describe, expect, it } from "vitest";
import { deriveAddress, isAddress } from "./address.js";

describe("deriveAddress", () => {
  it("is deterministic per username", () => {
    expect(deriveAddress("alice")).toBe(deriveAddress("alice"));
  });

  it("ignores surrounding whitespace", () => {
    expect(deriveAddress("  alice ")).toBe(deriveAddress("alice"));
  });

  it("differs across usernames", () => {
    expect(deriveAddress("alice")).not.toBe(deriveAddress("bob"));
  });

  it("produces a valid sagi1 address", () => {
    const a = deriveAddress("Local developer");
    expect(isAddress(a)).toBe(true);
    expect(a.startsWith("sagi1")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isAddress("nope")).toBe(false);
    expect(isAddress("sagi1XYZ")).toBe(false);
  });
});
