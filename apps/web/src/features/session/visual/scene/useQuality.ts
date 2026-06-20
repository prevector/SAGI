// Resolves the live QualitySettings the whole visual renders against. The base
// tier comes from device signals (reduced-motion → low, mobile → medium, else
// high); on top of that a *one-way* perf governor downgrades the tier if the
// measured FPS stays under budget, so a weak GPU degrades gracefully instead of
// stuttering. It never upgrades back automatically (that would oscillate).

import { useEffect, useRef, useState } from "react";
import {
  QUALITY_ORDER,
  QUALITY_PRESETS,
  VISUAL_CONFIG,
  type QualitySettings,
  type QualityTier,
} from "../config";
import type { PerfMeter } from "./usePerf";

function baseTier(mobile: boolean, reducedMotion: boolean): QualityTier {
  if (reducedMotion) return "low";
  if (mobile) return "medium";
  return "high";
}

interface UseQualityArgs {
  mobile: boolean;
  reducedMotion: boolean;
  perf: PerfMeter;
  /** When false (idle/queued) the perf governor is paused. */
  active: boolean;
}

export function useQuality({
  mobile,
  reducedMotion,
  perf,
  active,
}: UseQualityArgs): QualitySettings {
  const base = baseTier(mobile, reducedMotion);
  const [drops, setDrops] = useState(0);
  const lowFrames = useRef(0);

  useEffect(() => {
    setDrops(0);
    lowFrames.current = 0;
  }, [base]);

  useEffect(() => {
    if (!active) return;
    const { downgradeFps, downgradeAfterFrames } = VISUAL_CONFIG.perf;
    const id = window.setInterval(() => {
      const baseIdx = QUALITY_ORDER.indexOf(base);
      if (baseIdx + drops >= QUALITY_ORDER.length - 1) return;
      if (perf.fps > 0 && perf.fps < downgradeFps) {
        lowFrames.current += 15;
        if (lowFrames.current >= downgradeAfterFrames) {
          setDrops((d) => d + 1);
          lowFrames.current = 0;
        }
      } else {
        lowFrames.current = Math.max(0, lowFrames.current - 15);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [active, base, drops, perf]);

  const idx = Math.min(QUALITY_ORDER.indexOf(base) + drops, QUALITY_ORDER.length - 1);
  return QUALITY_PRESETS[QUALITY_ORDER[idx]];
}
