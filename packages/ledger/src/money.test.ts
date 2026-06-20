import { describe, expect, it } from "vitest";
import { DECIMALS, ONE, fmt, fromWire, sum, toBase, toWire } from "./money.js";

describe("money", () => {
  it("ONE is 10^DECIMALS", () => {
    expect(ONE).toBe(10n ** DECIMALS);
    expect(ONE).toBe(1_000_000_000n);
  });

  it("toBase parses integers and decimals", () => {
    expect(toBase(1)).toBe(ONE);
    expect(toBase("1")).toBe(ONE);
    expect(toBase(1_050_000)).toBe(1_050_000n * ONE);
    expect(toBase("1234.5")).toBe(1234n * ONE + ONE / 2n);
    expect(toBase("0.000000001")).toBe(1n);
    expect(toBase("0")).toBe(0n);
  });

  it("toBase handles negatives and truncates excess precision", () => {
    expect(toBase("-2.5")).toBe(-(2n * ONE + ONE / 2n));
    // 10 fractional digits, DECIMALS=9 -> last digit truncated.
    expect(toBase("0.0000000019")).toBe(1n);
  });

  it("toBase rejects scientific notation and junk", () => {
    expect(() => toBase("1e9")).toThrow();
    expect(() => toBase("abc")).toThrow();
  });

  it("fmt renders fixed decimals, incl. negatives", () => {
    expect(fmt(ONE)).toBe("1.000000000");
    expect(fmt(0n)).toBe("0.000000000");
    expect(fmt(1234n * ONE + ONE / 2n)).toBe("1234.500000000");
    expect(fmt(-ONE)).toBe("-1.000000000");
  });

  it("wire round-trips losslessly", () => {
    for (const x of [0n, 1n, ONE, 21_000_000n * ONE, -ONE, 123456789n]) {
      expect(fromWire(toWire(x))).toBe(x);
    }
  });

  it("sum adds base units", () => {
    expect(sum([1n, 2n, 3n])).toBe(6n);
    expect(sum([])).toBe(0n);
  });
});
