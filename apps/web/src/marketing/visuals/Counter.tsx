import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useInView } from "../lib/useInView";

interface CounterProps {
  to?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  color?: string;
  fontSize?: number;
  style?: CSSProperties;
}

/**
 * Counter — count-up to a target when scrolled into view.
 * Ported from the SAGI Framer project (DESIGN.md §5 / INSTRUCTIONS.md §6).
 */
export default function Counter({
  to = 11800,
  prefix = "",
  suffix = "",
  durationMs = 1800,
  color = "var(--accent-2)",
  fontSize = 34,
  style,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(0);

  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced) {
      setValue(to);
      return;
    }
    if (!inView) return;
    let raf = 0;
    let start = 0;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    function tick(now: number) {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / Math.max(1, durationMs));
      setValue(Math.round(to * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, prefersReduced, to, durationMs]);

  const shown = prefersReduced ? to : value;
  const formatted = new Intl.NumberFormat("en-US").format(shown);

  return (
    <span
      ref={ref}
      style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        fontSize,
        lineHeight: 1.1,
        color,
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        minWidth: "max-content",
        display: "inline-block",
        ...style,
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
