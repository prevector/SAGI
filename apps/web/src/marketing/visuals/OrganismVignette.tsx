import { useEffect, useRef, type CSSProperties } from "react";
import { useInView } from "../lib/useInView";

interface OrganismVignetteProps {
  behavior?: "adapts" | "remembers" | "recovers";
  /** Canvas stroke/fill colour — must be a literal colour, not a CSS var. */
  accent?: string;
  style?: CSSProperties;
}
interface Pt {
  x: number;
  y: number;
}

const LABELS: Record<string, string> = {
  adapts: "An agent in a T-maze that takes a wrong turn once, then learns the rewarded path",
  remembers: "An agent crossing nodes, lighting one memory that stays lit while its trail fades",
  recovers: "An agent on a baseline knocked off balance and springing back upright as the ground tilts",
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * OrganismVignette — a small looping "lab observation": a distinct animation per
 * behavior. Ported from the SAGI Framer project (STRUCTURE.md S04).
 */
export default function OrganismVignette({
  behavior = "adapts",
  // Brand secondary accent (--blue-500). Canvas needs a literal — vars don't
  // apply to 2D context fillStyle. Keep in sync with tokens.css.
  accent = "#3C7FA8",
  style,
}: OrganismVignetteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { amount: 0 });
  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const cnv: HTMLCanvasElement = canvas;
    const ctx: CanvasRenderingContext2D = context;

    let W = 0,
      H = 0,
      dpr = 1;
    let trail: Pt[] = [];
    const pend = { th: 0, v: 0 };
    let world = 0;

    function resize() {
      const rect = cnv.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cnv.width = Math.floor(W * dpr);
      cnv.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const A = (a: number) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
    };
    function dot(x: number, y: number, r: number, a: number, glow = 0) {
      if (glow) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = glow;
      } else ctx.shadowBlur = 0;
      A(a);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    function line(a: Pt, b: Pt, w: number, al: number) {
      A(al);
      ctx.strokeStyle = accent;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    function path(pts: Pt[], w: number, al: number) {
      A(al);
      ctx.strokeStyle = accent;
      ctx.lineWidth = w;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    }

    // ---- ADAPTS: one-shot T-maze ----
    function adapts(t: number, frozen: boolean) {
      const cx = W / 2;
      const base: Pt = { x: cx, y: H * 0.86 };
      const junc: Pt = { x: cx, y: H * 0.42 };
      const armL: Pt = { x: W * 0.24, y: H * 0.42 };
      const armR: Pt = { x: W * 0.76, y: H * 0.42 };
      path([base, junc], 1, 0.22);
      path([armL, armR], 1, 0.22);
      const cyc = 8000;
      const u = frozen ? 0.78 : ((t * 1000) % cyc) / cyc;
      const seg: Array<[number, number, Pt, Pt]> = [
        [0.0, 0.12, base, junc],
        [0.12, 0.22, junc, armL],
        [0.22, 0.3, armL, armL],
        [0.3, 0.4, armL, junc],
        [0.4, 0.5, junc, armR],
        [0.5, 0.56, armR, armR],
        [0.56, 0.56, base, base],
        [0.56, 0.7, base, junc],
        [0.7, 0.84, junc, armR],
        [0.84, 1.0, armR, armR],
      ];
      let pos = base,
        wrong = false;
      for (const [t0, t1, from, to] of seg) {
        if (u >= t0 && u <= t1) {
          const k = t1 > t0 ? (u - t0) / (t1 - t0) : 1;
          pos = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
          if (from === armL && to === armL) wrong = true;
          break;
        }
      }
      const rewardLit = frozen || u >= 0.46;
      dot(armR.x, armR.y, 7, rewardLit ? 0.9 : 0.25, rewardLit ? 12 : 0);
      A(rewardLit ? 1 : 0.4);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(armR.x, armR.y, 11, 0, Math.PI * 2);
      ctx.stroke();
      if (wrong && !frozen) {
        A(0.8);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        const d = 5;
        const x = armL.x,
          y = armL.y - 18;
        ctx.beginPath();
        ctx.moveTo(x - d, y - d);
        ctx.lineTo(x + d, y + d);
        ctx.moveTo(x + d, y - d);
        ctx.lineTo(x - d, y + d);
        ctx.stroke();
      }
      dot(pos.x, pos.y, 5, 1, 10);
    }

    // ---- REMEMBERS: persistent engram + fading trail ----
    function remembers(t: number, frozen: boolean) {
      const y = H * 0.56;
      const x0 = W * 0.16,
        x1 = W * 0.84;
      const N = 5,
        memIdx = 2;
      line({ x: x0, y }, { x: x1, y }, 1, 0.22);
      const nodes: Pt[] = [];
      for (let i = 0; i < N; i++) nodes.push({ x: lerp(x0, x1, i / (N - 1)), y });
      const ax = frozen ? lerp(x0, x1, 0.62) : x0 + (x1 - x0) * (0.5 + 0.5 * Math.sin(t * 1.1));
      if (!frozen) {
        trail.push({ x: ax, y });
        if (trail.length > 22) trail.shift();
      }
      for (let i = 0; i < trail.length; i++) {
        const a = (i / trail.length) * 0.5;
        dot(trail[i].x, trail[i].y, 2.5, a);
      }
      for (let i = 0; i < N; i++) {
        if (i === memIdx) {
          const pulse = frozen ? 0 : Math.max(0, Math.sin(t * 1.1)) * (Math.abs(ax - nodes[i].x) < 30 ? 1 : 0);
          dot(nodes[i].x, nodes[i].y, 5.5, 0.95, 12);
          if (pulse > 0.1) {
            A(pulse * 0.5);
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(nodes[i].x, nodes[i].y, 10 + pulse * 8, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else dot(nodes[i].x, nodes[i].y, 3, 0.3);
      }
      dot(ax, y, 5, 1, 10);
    }

    // ---- RECOVERS: kicked inverted pendulum that re-rights as the ground tilts ----
    let lastKick = 0;
    function recovers(t: number, dt: number, frozen: boolean) {
      const pivot: Pt = { x: W / 2, y: H * 0.72 };
      const len = Math.min(W, H) * 0.34;
      const target = frozen ? 0 : 0.42 * Math.sin(t * 0.45) * (Math.abs(Math.sin(t * 0.22)) > 0.7 ? 1 : 0.15);
      world = lerp(world, target, Math.min(1, dt * 2));
      if (frozen) {
        pend.th = 0.22;
        pend.v = 0;
      } else {
        if (t - lastKick > 2.6) {
          lastKick = t;
          pend.v += (Math.random() < 0.5 ? -1 : 1) * 3.4;
        }
        const k = 26,
          c = 4.5;
        pend.v += (-k * (pend.th - world) - c * pend.v) * Math.min(0.05, dt);
        pend.th += pend.v * Math.min(0.05, dt);
      }
      const bl = len * 1.05;
      const gA: Pt = { x: pivot.x - Math.cos(world) * bl, y: pivot.y - Math.sin(world) * bl };
      const gB: Pt = { x: pivot.x + Math.cos(world) * bl, y: pivot.y + Math.sin(world) * bl };
      line(gA, gB, 1, 0.25);
      const head: Pt = { x: pivot.x + Math.sin(pend.th) * len, y: pivot.y - Math.cos(pend.th) * len };
      line(pivot, head, 2, 0.8);
      dot(pivot.x, pivot.y, 3.5, 0.7);
      dot(head.x, head.y, 6.5, 1, 11);
    }

    let t0 = 0,
      last = 0;
    function render(now: number, frozen: boolean) {
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      if (!t0) {
        t0 = now;
        last = now;
      }
      const t = (now - t0) * 0.001;
      const dt = Math.min(0.05, (now - last) * 0.001);
      last = now;
      const b = String(behavior).toLowerCase();
      if (b === "remembers") remembers(t, frozen);
      else if (b === "recovers") recovers(t, dt, frozen);
      else adapts(t, frozen);
      ctx.globalAlpha = 1;
    }

    resize();
    if (prefersReduced) {
      render(0, true);
      const r1 = requestAnimationFrame(() => {
        resize();
        render(16, true);
      });
      return () => cancelAnimationFrame(r1);
    }
    let raf = 0;
    function frame(now: number) {
      if (inView) render(now, false);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    let rRaf = 0;
    function onResize() {
      cancelAnimationFrame(rRaf);
      rRaf = requestAnimationFrame(resize);
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rRaf);
      window.removeEventListener("resize", onResize);
    };
  }, [behavior, accent, prefersReduced, inView]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={LABELS[String(behavior).toLowerCase()] || "Organism"}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", ...style }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
