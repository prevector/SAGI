// Detects small viewports so the visual can shrink the maze, cap DPR, and skip
// ghost trails (PLAN-3D.md §6 mobile path).

import { useEffect, useState } from "react";

const QUERY = "(max-width: 720px)";

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && "matchMedia" in window
      ? window.matchMedia(QUERY).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
