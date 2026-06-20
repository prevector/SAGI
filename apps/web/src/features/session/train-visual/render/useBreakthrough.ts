// useBreakthrough — a 0..1 value that pulses to 1 when a session enters the
// "completed" state and decays to 0 over ~1.6s, driving the brief orange
// "new best / breakthrough" moment (PLAN-TRAIN-ANIM §4/§6). The HUD's "▲
// breakthrough" label is the non-colour cue that rides alongside it.

import { useEffect, useRef, useState } from "react";
import type { SessionStatus } from "../config";

const PULSE_MS = 1600;

export function useBreakthrough(status: SessionStatus, reduced: boolean): number {
  const [value, setValue] = useState(0);
  const prev = useRef<SessionStatus>(status);

  useEffect(() => {
    const was = prev.current;
    prev.current = status;
    const entered = status === "completed" && was !== "completed";

    if (status !== "completed") {
      setValue(0);
      return;
    }
    if (reduced) {
      // Static badge + tint, no animation.
      setValue(1);
      return;
    }
    if (!entered) return; // already completed and animated; leave it settled

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const e = (now - start) / PULSE_MS;
      if (e >= 1) {
        setValue(0);
        return;
      }
      // Ease-out decay so the flash is bright then fades.
      setValue((1 - e) * (1 - e));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, reduced]);

  return value;
}
