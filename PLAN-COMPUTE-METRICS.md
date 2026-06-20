# PLAN — Compute Metrics Widget (mockup)

A small top-right bar widget showing **CPU + GPU specs and animated (fake) realtime %**, behind a swappable `ComputeMetricsSource` seam (only `mock` implemented). Mirrors the existing `train-visual` `PopulationSource` seam pattern. See `SAGI-compute-metrics-feasibility.md` for why % is mocked.

## Placement
- New feature folder: `apps/web/src/features/compute-metrics/`.
- Widget mounts in `components/layout/TopBar.tsx`, inserted between the `modeTag` (left) and the `user` cluster (right) — it sits in the existing flex row, so it reads as a centre/right HUD readout. Hidden under `~860px` (same breakpoint the topbar already uses to drop the username).

## Contracts — `features/compute-metrics/types.ts`
```ts
export interface ComputeMetrics {
  cpu: { label: string; cores: number | null; usagePct: number };  // 0..100 (mocked)
  gpu: { label: string; usagePct: number };                        // mocked
  throughput?: number;                                             // optional evals/sec (mocked)
  source: "mock" | "browser" | "agent";
}
export interface ComputeMetricsSource {
  kind: "mock" | "browser" | "agent";
  start(emit: (m: ComputeMetrics) => void): void;   // mock: timer emitting smoothed values
  stop(): void;
}
```

## config — `lib/config.ts`
Add a `computeMetrics` block alongside the existing flags:
```ts
computeMetrics: { source: "mock" as "mock" | "browser" | "agent" }
```

## MockSource — `features/compute-metrics/mockSource.ts`
A factory `createMockSource(opts): ComputeMetricsSource` with `kind: "mock"`.

1. **Specs (best-effort real, with fallbacks).** Read once at `start()`:
   - cores: `navigator.hardwareConcurrency ?? null`.
   - GPU label: WebGL `WEBGL_debug_renderer_info` → `UNMASKED_RENDERER_WEBGL`; trimmed/cleaned. Wrapped in try/catch; on throw or "blocked" → fallback `"Integrated GPU"`.
   - CPU label: there is no CPU-model web API, so synthesize a plausible label from cores (e.g. `"8-core CPU"`), or `"Apple M-series"` fallback. Cheap, believable, no fingerprinting/persistence.
2. **The % generator — `signal.ts` (pure, deterministic, unit-tested).**
   - `computeUsage(t, seed, busy)` → `{ cpuPct, gpuPct, throughput }`, all `0..100`.
   - Built from `simplex-noise` (already a dep) seeded by `seed` + a per-channel offset, plus a slow sine drift and small jitter. Pure function of `(t, seed, busy)` — no `Date.now()` inside; the caller passes the clock.
   - **Session bias:** `busy` selects the band — idle ≈ 4–18 % with gentle drift; busy ≈ 55–92 % with livelier movement. GPU slightly lags CPU. `throughput` ≈ 0 idle, ramps to a plausible evals/sec when busy.
   - **Smooth ramps on transition:** the source eases the current band toward the target band over ~1.5 s when `busy` flips, so idle↔busy reads as a ramp, not a jump.
3. **Cadence:** `start()` runs a `setInterval` ~1 Hz (≈900 ms) calling `emit()`. `stop()` clears it. The generator is sampled at a monotonic `performance.now()`; values stay continuous across ticks because they derive from `t`.

## Session-activity signal — `features/compute-metrics/useSessionActivity.ts`
Returns `boolean busy`. Polls `api.getSessions(username)` at a low rate (~3 s, the same call `SessionPage` uses) and returns `sessions.some(s => s.status === "running")`. Falls back to `false` (plausible idle) if the call fails or there's no username. This is the only app coupling; the widget passes `busy` into the source. (Deliberately decoupled so the `browser`/`agent` tiers can ignore it later.)

## The widget — `features/compute-metrics/ComputeMetricsWidget.tsx` (+ `.module.css`)
- Subscribes to the source selected by `config.computeMetrics.source` (only `mock` wired; `browser`/`agent` → render nothing / a quiet `"metrics unavailable"` placeholder so the seam is visibly swappable).
- Small Geist Mono, two rows + optional third:
  - `CPU  <label> · <cores>c  [▮▮▮▯▯▯] 34%`
  - `GPU  <label>            [▮▮▯▯▯▯] 22%`
  - `▲ <n>/s` (throughput) — only when `busy`/non-zero.
- **The bar** is a fixed set of segments (filled count = `round(pct/100 * N)`), so length encodes the value. A **threshold marker** (small tick at ~80 %) flags high load. Numeric `%` always shown. → Colour is never the only signal (DESIGN.md): bar length + number + threshold tick all carry it. Teal for CPU, a second hue for GPU, but both differ in lightness and never stand alone.
- Reads `useReducedMotion()` (reuse `train-visual/render/useReducedMotion.ts` or a local copy): when reduced, **don't start the interval** — render a single static plausible frame (numbers + bars, no animation).
- **Pause when hidden:** a `visibilitychange` listener stops the source while `document.hidden`, restarts on return. Source is also `stop()`-ed and the interval cleared on unmount (no leak).

## Files
```
apps/web/src/features/compute-metrics/
  types.ts                      # ComputeMetrics + ComputeMetricsSource
  signal.ts                     # pure deterministic % generator
  signal.test.ts                # vitest: deterministic given seed; 0..100; idle<busy
  mockSource.ts                 # best-effort specs + smooth fake % + ramps
  useSessionActivity.ts         # busy = user has a running session
  useComputeMetrics.ts          # subscribe to configured source, pause-on-hidden, dispose
  ComputeMetricsWidget.tsx
  ComputeMetricsWidget.module.css
  index.ts
apps/web/src/lib/config.ts                     # + computeMetrics.source
apps/web/src/components/layout/TopBar.tsx       # mount the widget
```

## Verify
- `npm run build` (tsc + vite) and `npm test` (the signal unit test) green.
- Widget renders in the top bar in small on-brand Geist Mono; %s animate plausibly; visibly **idle-low / busy-high** when a session starts/stops on `/app/session`.
- Specs show real-ish values (real cores + real GPU string on the presenter's Chrome) with graceful fallback labels.
- Colourblind: legible with hue removed (bar length + number + tick). Reduced-motion: static numbers. Tab-hidden: animation pauses. Unmount: no interval leak.

## Out of scope (deferred)
`browser` and `agent` tiers; any real % ; Compute Pressure API; persistence/fingerprinting of hardware. No claim the metrics are real.

## PR
`feat/compute-metrics-mock → main`, short clip, note the seam lets `browser`/`agent` replace `mock` later (point to the feasibility doc). Squash-merge when green.
