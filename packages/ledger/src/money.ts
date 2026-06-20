// Base-unit money. ALL token amounts and balances are `Base` (bigint base
// units) — never a float. 1 SAGI = 10^DECIMALS base units. Over the wire,
// amounts travel as decimal base-unit strings (JSON can't carry BigInt).

export const DECIMALS = 9n;
export const ONE = 10n ** DECIMALS; // base units per 1 SAGI = 1_000_000_000
export type Base = bigint;

const DEC = Number(DECIMALS);

/**
 * Parse a human SAGI amount (e.g. 1_050_000 or "1234.5") into base units.
 * Used for config (E0) and fixtures — not on the hot path. Fractional digits
 * beyond DECIMALS are truncated (toward zero), matching integer base units.
 */
export function toBase(amount: number | string): Base {
  const s = (typeof amount === "number" ? String(amount) : amount).trim();
  if (s === "" || /[eE]/.test(s)) {
    // Reject scientific notation: it would silently lose precision.
    if (/[eE]/.test(s)) throw new Error(`toBase: scientific notation unsupported: "${s}"`);
    return 0n;
  }
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const [intPart = "0", fracRaw = ""] = body.split(".");
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracRaw)) {
    throw new Error(`toBase: not a decimal number: "${s}"`);
  }
  const frac = (fracRaw + "0".repeat(DEC)).slice(0, DEC);
  const base = BigInt(intPart || "0") * ONE + BigInt(frac || "0");
  return neg ? -base : base;
}

/** Render base units as a fixed-decimal string, e.g. ONE -> "1.000000000". */
export function fmt(x: Base): string {
  const neg = x < 0n;
  const a = neg ? -x : x;
  const whole = a / ONE;
  const frac = (a % ONE).toString().padStart(DEC, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

/** JSON-safe serialization: base units as a plain decimal string. */
export const toWire = (x: Base): string => x.toString();

/** Inverse of toWire. */
export const fromWire = (s: string): Base => BigInt(s);

/** Sum an iterable of base-unit amounts. */
export function sum(xs: Iterable<Base>): Base {
  let total = 0n;
  for (const x of xs) total += x;
  return total;
}

/**
 * DISPLAY ONLY: base units -> a SAGI float for the existing number-typed UI
 * (formatTokens). Never use this for ledger math — the economic core stays
 * BigInt. Exact-token amounts in the explorer travel as strings (toWire).
 */
export function toSagiNumber(x: Base): number {
  return Number(x) / Number(ONE);
}
