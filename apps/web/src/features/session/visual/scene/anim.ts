// Dependency-free, frame-rate-independent animation helpers used across the
// creature secondary-motion and locomotion. We deliberately avoid pulling in a
// physics/easing lib: a critically-damped spring + an exponential smoother are
// all the imperative animators need, and keeping the math here means the visual
// stays fully deterministic and tree-shakeable.

/**
 * Exponential smoothing toward a target, independent of frame rate. `lambda` is
 * the decay rate (larger = snappier).
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return target + (current - target) * Math.exp(-lambda * dt);
}

/** Shortest-arc angular damp (handles wrap at ±π). */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let d = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return current + d * (1 - Math.exp(-lambda * dt));
}

/**
 * One step of a critically-damped spring (no overshoot). Returns the new
 * [value, velocity]. Used for tail/antennae/head follow-through.
 */
export function spring(
  value: number,
  velocity: number,
  target: number,
  stiffness: number,
  dt: number
): [number, number] {
  const h = Math.min(dt, 1 / 30);
  const damping = 2 * Math.sqrt(stiffness);
  const a = -stiffness * (value - target) - damping * velocity;
  const v = velocity + a * h;
  return [value + v * h, v];
}

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** Smoothstep in [0,1]. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}
