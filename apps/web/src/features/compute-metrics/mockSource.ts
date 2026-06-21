// MockSource — best-effort real specs + a smooth fabricated %. The default and
// only implemented tier. Specs are read once, error-safe, with plausible
// fallbacks; the % comes from the seeded signal, with the busy level eased so
// idle<->running reads as a ramp. Emits ~1 Hz; the caller pauses/stops it.

import type { ComputeMetrics, ComputeMetricsSource } from "./types";
import { createSignal, type Signal } from "./signal";

const EMIT_MS = 900; // ~1 Hz
const RAMP_PER_SEC = 0.7; // busy level eases ~1.4 s across a full 0->1 transition

/** Logical core count, or null when the browser withholds it. */
function readCores(): number | null {
  const n = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined;
  return typeof n === "number" && n > 0 ? n : null;
}

/** Best-effort GPU model via WebGL's unmasked renderer; "" when blocked. */
function readGpuLabel(): string {
  if (typeof document === "undefined") return "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    if (!gl || !ext) return "";
    const raw = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "");
    // Chrome wraps the model in "ANGLE (vendor, MODEL Direct3D11 ..., ...)".
    const angle = raw.match(/ANGLE \([^,]+,\s*([^,]+?)(?:\s+Direct3D| \(0x| vs_|,).*\)/);
    const cleaned = (angle ? angle[1] : raw).replace(/\s+/g, " ").trim();
    return cleaned.length > 40 ? cleaned.slice(0, 40).trim() : cleaned;
  } catch {
    return "";
  }
}

/** A plausible CPU label — there is no CPU-model web API, so derive from cores. */
function cpuLabel(cores: number | null): string {
  return cores ? `${cores}-core CPU` : "CPU";
}

export interface MockSourceOptions {
  /** Stable seed for the signal (deterministic demo). Defaults to "sagi". */
  seed?: string;
  /** Start busy (a session already running)? Defaults to false. */
  busy?: boolean;
}

export function createMockSource(opts: MockSourceOptions = {}): ComputeMetricsSource {
  const seed = opts.seed ?? "sagi";
  const signal: Signal = createSignal(seed);

  const cores = readCores();
  const cpu = cpuLabel(cores);
  const gpu = readGpuLabel() || "Integrated GPU";

  let target = opts.busy ? 1 : 0; // where intensity is heading
  let intensity = target; // current eased busy level (0..1)
  let timer: ReturnType<typeof setInterval> | null = null;
  let last = 0; // perf clock of the previous tick (0 = first)

  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);

  function build(t: number): ComputeMetrics {
    const { cpuPct, gpuPct, throughput } = signal.sample(t, intensity);
    return {
      cpu: { label: cpu, cores, usagePct: cpuPct },
      gpu: { label: gpu, usagePct: gpuPct },
      throughput,
      source: "mock",
    };
  }

  return {
    kind: "mock",

    start(emit) {
      if (timer) return;
      last = 0;
      const tick = () => {
        const t = now();
        if (last) {
          const dt = (t - last) / 1000;
          // Ease the busy level toward its target so transitions ramp smoothly.
          const step = RAMP_PER_SEC * dt;
          if (intensity < target) intensity = Math.min(target, intensity + step);
          else if (intensity > target) intensity = Math.max(target, intensity - step);
        }
        last = t;
        emit(build(t));
      };
      tick(); // emit immediately so the widget isn't blank for a second
      timer = setInterval(tick, EMIT_MS);
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      last = 0;
    },

    setBusy(busy) {
      target = busy ? 1 : 0;
    },
  };
}

/** A single static frame for the reduced-motion fallback (no animation). */
export function mockStaticFrame(opts: MockSourceOptions = {}): ComputeMetrics {
  const src = createMockSource(opts);
  let frame: ComputeMetrics | null = null;
  src.start((m) => {
    frame ??= m;
  });
  src.stop();
  return frame!; // start() emits synchronously, so frame is always set

}
