// Formatting helpers. Numbers/tokens/compute render in Geist Mono at call sites.

/** Compact token amount, e.g. 1_240_000 -> "1.24M". */
export function formatTokens(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Full grouped integer, e.g. "1,240,000". */
export function formatInt(n: number): string {
  return Math.round(n).toLocaleString();
}

/** GFLOPS / GFLOP-hours with a unit suffix. */
export function formatCompute(gflops: number, unit = "GFLOPS"): string {
  if (gflops >= 1000) return `${(gflops / 1000).toFixed(2)} T${unit.slice(1)}`;
  return `${formatInt(gflops)} ${unit}`;
}

/** 0..1 -> "61%". */
export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** Score-like fixed decimals, e.g. 0.812. */
export function formatScore(n: number, digits = 3): string {
  return n.toFixed(digits);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** Relative time, e.g. "3h ago", "just now". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}

/** Short clock for activity logs, e.g. "02:14". */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
