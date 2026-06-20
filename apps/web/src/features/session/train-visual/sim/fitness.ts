// Fitness for the genome-string sim: similarity to a hidden per-seed target.
// The target is the "signal" the noise resolves toward — the string analogue of
// the hero's organism shape. It is never shown as text; only the resolving rows
// and the per-position match mask (the "locked" cue) are.

/** Fraction of positions where chars matches target (0..1). */
export function similarity(chars: string, target: string): number {
  const n = target.length;
  if (n === 0) return 0;
  let m = 0;
  for (let i = 0; i < n; i++) if (chars[i] === target[i]) m++;
  return m / n;
}

/** Per-position match mask (1 = locked to target, 0 = not). */
export function lockedMask(chars: string, target: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < target.length; i++) out.push(chars[i] === target[i] ? 1 : 0);
  return out;
}
