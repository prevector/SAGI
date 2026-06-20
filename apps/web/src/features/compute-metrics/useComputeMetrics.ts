// Drives the widget: builds the source selected by config, applies the busy
// bias, pauses the emitter while the tab is hidden, and disposes on unmount.
// Under prefers-reduced-motion it renders a single static frame instead of
// animating. Only the `mock` tier is wired; other kinds yield null so the
// widget can show a quiet "unavailable" placeholder (the seam stays visible).

import { useEffect, useRef, useState } from "react";
import { config } from "../../lib/config";
import type { ComputeMetrics, ComputeMetricsSource } from "./types";
import { createMockSource, mockStaticFrame } from "./mockSource";

const SOURCE = config.computeMetrics.source;

const QUERY = "(prefers-reduced-motion: reduce)";
function useReducedMotion(): boolean {
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

function createSource(busy: boolean): ComputeMetricsSource | null {
  // Only the mock tier exists today; browser/agent are deferred.
  return SOURCE === "mock" ? createMockSource({ busy }) : null;
}

export function useComputeMetrics(busy: boolean): ComputeMetrics | null {
  const reduced = useReducedMotion();
  const [metrics, setMetrics] = useState<ComputeMetrics | null>(null);
  const sourceRef = useRef<ComputeMetricsSource | null>(null);

  // Reduced motion: no emitter — one static frame, recomputed when busy flips.
  useEffect(() => {
    if (!reduced) return;
    setMetrics(SOURCE === "mock" ? mockStaticFrame({ busy }) : null);
  }, [reduced, busy]);

  // Animated path: start the source once, pause while hidden, dispose on unmount.
  useEffect(() => {
    if (reduced) return;
    const source = createSource(busy);
    sourceRef.current = source;
    if (!source) {
      setMetrics(null);
      return;
    }

    const run = () => source.start((m) => setMetrics(m));
    const onVisibility = () => {
      if (document.hidden) source.stop();
      else run();
    };

    if (typeof document === "undefined" || !document.hidden) run();
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
      source.stop();
      sourceRef.current = null;
    };
    // Created once per reduced-motion mode; busy updates flow through setBusy below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Push busy changes into the live source without re-creating it.
  useEffect(() => {
    sourceRef.current?.setBusy?.(busy);
  }, [busy]);

  return metrics;
}
