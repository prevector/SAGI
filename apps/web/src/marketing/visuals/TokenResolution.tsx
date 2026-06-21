import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useInView } from "../lib/useInView";

interface TokenResolutionProps {
  leftWords?: string[];
  rightWords?: string[];
  cycleMs?: number;
  tealColor?: string;
  neutralColor?: string;
  fontSize?: number;
  style?: CSSProperties;
}

const SCRAMBLE = "abcdefghijklmnopqrstuvwxyz0123456789-".split("");

function scramble(len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
  return s;
}

/**
 * TokenResolution — left column types neutral tokens one-by-one (sequential);
 * right column resolves accent tokens together from a brief scramble (parallel).
 * Loops with a pause. Ported from the SAGI Framer project.
 */
export default function TokenResolution({
  leftWords = ["7B", "70B", "700B", "7T"],
  rightWords = ["meridian", "helix-2f", "aleph-knot", "corabel-x", "northwind-7"],
  cycleMs = 5200,
  // Right column = the "resolved" population, in the blue secondary accent;
  // left column = the single neutral model, in primary text. (Tokens, not the
  // old teal/sagi-dark vars which no longer exist.)
  tealColor = "var(--accent-2)",
  neutralColor = "var(--text)",
  fontSize = 16,
  style,
}: TokenResolutionProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { amount: 0 });
  const [, setFrame] = useState(0);
  const lastRef = useRef(0);
  const startRef = useRef(0);

  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const animate = !prefersReduced;

  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    function loop(now: number) {
      if (!startRef.current) startRef.current = now;
      if (inView && now - lastRef.current > 55) {
        lastRef.current = now;
        setFrame((f) => (f + 1) % 1000000);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [animate, inView]);

  // Compute phase
  let u = 1; // fully resolved by default (reduced motion)
  if (animate && typeof performance !== "undefined") {
    const elapsed = performance.now() - startRef.current;
    u = (elapsed % cycleMs) / cycleMs;
  }
  const typing = u < 0.45;
  const leftCount = animate
    ? Math.min(leftWords.length, Math.floor((u / 0.45) * (leftWords.length + 0.001)))
    : leftWords.length;
  const resolved = !animate || u >= 0.45;

  const colStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
    minWidth: 0,
  };
  const tokenStyle: CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontWeight: 500,
    fontSize,
    lineHeight: 1.2,
    letterSpacing: "0.01em",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        gap: 32,
        ...style,
      }}
    >
      <div style={colStyle} aria-label="One model, scaled">
        {leftWords.map((w, i) => {
          const visible = i < leftCount;
          const isLast = i === leftCount - 1;
          return (
            <span
              key={i}
              style={{ ...tokenStyle, color: neutralColor, opacity: visible ? 1 : 0, transition: "opacity 120ms ease" }}
            >
              {w}
              {animate && typing && isLast ? <span style={{ opacity: 0.5 }}>▌</span> : null}
            </span>
          );
        })}
      </div>
      <div style={colStyle} aria-label="A population, evolving">
        {rightWords.map((w, i) => (
          <span key={i} style={{ ...tokenStyle, color: tealColor, opacity: resolved ? 1 : 0.55 }}>
            {resolved ? w : scramble(w.length)}
          </span>
        ))}
      </div>
    </div>
  );
}
