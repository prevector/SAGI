// Tiny FPS sampler for the dev readout. Call `sample()` once per drawn frame
// from the RAF loop; `fps` is an EMA-smoothed estimate, throttled to ~4Hz so it
// doesn't churn React renders.

import { useCallback, useRef, useState } from "react";

export interface PerfMeter {
  sample: () => void;
  fps: number;
}

export function usePerf(): PerfMeter {
  const last = useRef(0);
  const ema = useRef(60);
  const frames = useRef(0);
  const [fps, setFps] = useState(60);

  const sample = useCallback(() => {
    const now = performance.now();
    if (last.current !== 0) {
      const dt = now - last.current;
      if (dt > 0) ema.current = ema.current * 0.9 + (1000 / dt) * 0.1;
    }
    last.current = now;
    frames.current += 1;
    if (frames.current % 12 === 0) setFps(Math.round(ema.current));
  }, []);

  return { sample, fps };
}
