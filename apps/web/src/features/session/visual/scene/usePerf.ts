// Tiny FPS sampler for the dev HUD. Logic-only (no rendering): a component
// inside the Canvas calls `sample()` every frame via useFrame; the returned
// `fps` is a smoothed estimate read by the overlay.

import { useCallback, useRef, useState } from "react";

export interface PerfMeter {
  /** Call once per rendered frame (from useFrame). */
  sample: () => void;
  /** Smoothed frames-per-second estimate. */
  fps: number;
}

export function usePerf(): PerfMeter {
  const last = useRef<number>(0);
  const ema = useRef<number>(60);
  const frames = useRef<number>(0);
  const [fps, setFps] = useState(60);

  const sample = useCallback(() => {
    const now = performance.now();
    if (last.current !== 0) {
      const dt = now - last.current;
      if (dt > 0) {
        const inst = 1000 / dt;
        // Exponential moving average smooths spikes.
        ema.current = ema.current * 0.9 + inst * 0.1;
      }
    }
    last.current = now;
    // Throttle React state updates to ~4Hz to avoid re-render churn.
    frames.current += 1;
    if (frames.current % 15 === 0) setFps(Math.round(ema.current));
  }, []);

  return { sample, fps };
}
