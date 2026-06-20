// JS-driven canvas animation is NOT covered by the global CSS
// `prefers-reduced-motion` rule, so the visual checks the preference itself and
// falls back to a single calm static frame (PLAN-TRAIN-ANIM §6).

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined" && "matchMedia" in window ? window.matchMedia(QUERY).matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
