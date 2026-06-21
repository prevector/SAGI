// Demo driver for the mock HUD: toggles the "busy" bias on a randomized timer so
// the fabricated %s drift between idle and load even when no real session is
// running — i.e. the bars look like a machine that picks up and finishes work,
// not a flat line. The eased ramp lives in the MockSource; here we only flip the
// target. Paused while the tab is hidden so a backgrounded terminal stays calm.
// Real session activity (useSessionActivity) is OR-ed in by the widget, so a
// genuine running session always reads as busy regardless of this oscillator.

import { useEffect, useState } from "react";

const MIN_PHASE_MS = 7000; // shortest a load/idle phase lasts
const MAX_PHASE_MS = 17000; // longest, so cycles don't feel metronomic

const phaseMs = () => MIN_PHASE_MS + Math.random() * (MAX_PHASE_MS - MIN_PHASE_MS);

export function useDemoBusy(): boolean {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      timer = setTimeout(() => {
        // Don't churn the state machine while hidden; resume on the next tick.
        if (typeof document === "undefined" || !document.hidden) {
          setBusy((b) => !b);
        }
        schedule();
      }, phaseMs());
    };

    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return busy;
}
