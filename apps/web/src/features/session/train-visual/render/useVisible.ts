// Pause-when-hidden gate: true only when the canvas is both on-screen
// (IntersectionObserver) and the tab is foregrounded (visibilitychange). The
// RAF loop early-returns when this is false, so an off-screen field costs
// nothing (PLAN-TRAIN-ANIM §7).

import { useEffect, useState, type RefObject } from "react";

export function useVisible<T extends Element>(ref: RefObject<T | null>): boolean {
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setOnScreen(true); // no observer support → assume visible
      return;
    }
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return onScreen && tabVisible;
}
