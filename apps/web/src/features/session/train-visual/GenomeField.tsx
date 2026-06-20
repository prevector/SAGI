// GenomeField — the compute/train session visual: rows of Geist Mono genome
// strings that mutate, where fitter genomes highlight and propagate generation
// over generation, using the hero's canvas-2D glyph-noise → highlight technique
// (PLAN-TRAIN-ANIM). Self-contained: the page imports only this (lazily).

import { useEffect, useRef, type CSSProperties } from "react";
import { GlyphGrid, type RowState } from "./render/GlyphGrid";
import { Hud } from "./render/Hud";
import { usePopulation } from "./usePopulation";
import { usePerf } from "./render/usePerf";
import { useVisible } from "./render/useVisible";
import { useReducedMotion } from "./render/useReducedMotion";
import { useBreakthrough } from "./render/useBreakthrough";
import { TRAIN_CONFIG, type SessionStatus } from "./config";
import { PALETTE } from "./palette";

export interface GenomeFieldProps {
  seed: string; // session.id
  status: SessionStatus;
  progress: number; // 0..1
  /** Show the dev FPS readout (off by default). */
  debug?: boolean;
}

const wrapStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 280,
  overflow: "hidden",
  background: PALETTE.bg,
  borderRadius: "var(--radius-lg, 16px)",
};

export default function GenomeField({ seed, status, progress, debug = false }: GenomeFieldProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<GlyphGrid | null>(null);

  const visible = useVisible(wrapRef);
  const reduced = useReducedMotion();
  const perf = usePerf();
  const breakthrough = useBreakthrough(status, reduced);

  const { rows, stats } = usePopulation(seed, status, progress);

  // Latest data read by the RAF loop without re-subscribing it.
  const rowsRef = useRef<RowState[]>(rows);
  rowsRef.current = rows;
  const perfRef = useRef(perf);
  perfRef.current = perf;
  const breakthroughRef = useRef(breakthrough);
  breakthroughRef.current = breakthrough;

  // Build the grid + size to the container. ResizeObserver keeps it crisp.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = TRAIN_CONFIG.charset;
    const grid = new GlyphGrid(ctx, () => chars[(Math.random() * chars.length) | 0]);
    gridRef.current = grid;

    const apply = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      grid.resize(rect.width, rect.height, dpr, TRAIN_CONFIG.sim.populationSize);
      // Static repaint so resizes look instant even when the loop is paused.
      grid.draw(performance.now(), rowsRef.current, { frozen: true, breakthrough: breakthroughRef.current });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      gridRef.current = null;
    };
  }, []);

  // Reduced motion: a single settled frame, no loop (PLAN-TRAIN-ANIM §6).
  useEffect(() => {
    if (!reduced) return;
    const grid = gridRef.current;
    if (grid) grid.draw(performance.now(), rowsRef.current, { frozen: true, breakthrough: breakthroughRef.current });
  }, [reduced, rows, breakthrough]);

  // The animation loop: throttled to ~25fps, paused when off-screen / tab hidden.
  useEffect(() => {
    if (reduced || !visible) return;
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < TRAIN_CONFIG.render.frameIntervalMs) return;
      last = now;
      const grid = gridRef.current;
      if (!grid) return;
      grid.draw(now, rowsRef.current, { breakthrough: breakthroughRef.current });
      perfRef.current.sample();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduced, visible]);

  return (
    <div ref={wrapRef} style={wrapStyle} aria-hidden="true">
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <Hud stats={stats} status={status} fps={perf.fps} showFps={debug} breakthrough={breakthrough} />
    </div>
  );
}
