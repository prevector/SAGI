import { useEffect, useRef, type CSSProperties } from "react";
import { useInView } from "../lib/useInView";

interface EmergenceFieldProps {
  density?: number;
  speed?: number;
  noiseColor?: string;
  organismColor?: string;
  glowColor?: string;
  focusX?: number;
  scale?: number;
  glyphChars?: string;
  transparentBg?: boolean;
  bgColor?: string;
  style?: CSSProperties;
}
interface Cell {
  x: number;
  y: number;
  ch: string;
  flip: number;
  base: number;
  bright: number;
  fade: number;
}

const DEFAULT_GLYPHS = "0123456789ABCDEFGHJKLMNPRSTXZ<>[]{}/\\=+*-·#%?:;";

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax,
    dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * EmergenceField — a full-bleed field of flickering code glyphs out of which a
 * pale organism resolves and evolves (cell → worm → fish → reptile → raptor →
 * eagle that flies off). Ported from the SAGI Framer project; the hero signature
 * visual (DESIGN.md §1 / §5 / STRUCTURE.md S02). Decorative → aria-hidden.
 * Defaults match the DESIGN §5 hero config (warm noise + white organism over the
 * pink→blue gradient); canvas needs colour literals, so these mirror the tokens.
 */
export default function EmergenceField({
  density = 1,
  speed = 1,
  noiseColor = "rgba(46,33,24,0.18)",
  organismColor = "rgba(255,255,255,0.95)",
  glowColor = "rgba(255,255,255,0.4)",
  focusX = 0.66,
  scale = 1,
  glyphChars = DEFAULT_GLYPHS,
  transparentBg = true,
  bgColor = "#2E2118",
  style,
}: EmergenceFieldProps) {
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
    const glyphs = (glyphChars && glyphChars.length ? glyphChars : DEFAULT_GLYPHS).split("");
    const rnd = () => glyphs[(Math.random() * glyphs.length) | 0];

    let W = 0,
      H = 0,
      dpr = 1,
      cs = 10,
      font = 8,
      ox = 0,
      oy = 0,
      R = 1;
    let cells: Cell[] = [];

    function rebuild() {
      const rect = cnv.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cnv.width = Math.floor(W * dpr);
      cnv.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const small = Math.min(W, H) < 520;
      const maxCells = small ? 3500 : 11000;
      cs = Math.max(8, Math.round(10 / density));
      while (Math.ceil(W / cs) * Math.ceil(H / cs) > maxCells) cs += 1;
      font = Math.max(7, Math.round(cs * 0.82));
      ox = W * focusX;
      oy = H * 0.5;
      R = Math.min(W, H) * 0.3 * scale;
      const cols = Math.ceil(W / cs),
        rows = Math.ceil(H / cs);
      cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cs + cs / 2,
            y = r * cs + cs / 2;
          cells.push({
            x,
            y,
            ch: rnd(),
            flip: Math.random() * 1500,
            base: 0.2 + Math.random() * 0.22,
            bright: 0,
            fade: 0.5 + 0.5 * smoothstep(0, 0.4 * W, x),
          });
        }
      }
    }

    // organism shapes (local coords) -> inside-ness 0..1
    const disc = (lx: number, ly: number, cx: number, cy: number, r: number) =>
      smoothstep(r + 0.07, r - 0.07, Math.hypot(lx - cx, ly - cy));
    const ell = (lx: number, ly: number, cx: number, cy: number, a: number, b: number) =>
      smoothstep(1.12, 0.86, ((lx - cx) / a) ** 2 + ((ly - cy) / b) ** 2);
    const cap = (lx: number, ly: number, ax: number, ay: number, bx: number, by: number, r: number) =>
      smoothstep(r + 0.06, r - 0.06, segDist(lx, ly, ax, ay, bx, by));
    function worm(lx: number, ly: number, t: number) {
      let best = 9;
      for (let i = 0; i < 14; i++) {
        const x0 = lerp(-0.95, 0.95, i / 14),
          x1 = lerp(-0.95, 0.95, (i + 1) / 14);
        best = Math.min(
          best,
          segDist(lx, ly, x0, 0.24 * Math.sin(x0 * 4 + t * 2.4), x1, 0.24 * Math.sin(x1 * 4 + t * 2.4))
        );
      }
      const th = 0.2 * smoothstep(-1, -0.8, lx) * smoothstep(0.98, 0.78, lx);
      return smoothstep(th + 0.06, th - 0.06, best);
    }
    function fish(lx: number, ly: number, t: number) {
      const wag = 0.06 * Math.sin(t * 3);
      const body = ell(lx, ly, 0.05, 0, 0.72, 0.34);
      const tw = 0.34 * Math.max(0, Math.min(1, (-0.5 - lx) / 0.5));
      const tail = lx < -0.46 && lx > -1.05 ? smoothstep(tw + 0.05, tw - 0.05, Math.abs(ly - wag)) : 0;
      return Math.max(body, Math.max(tail, cap(lx, ly, 0.05, -0.32, -0.15, -0.55, 0.07)));
    }
    function reptile(lx: number, ly: number, t: number) {
      const sw = 0.18 * Math.sin(t * 4);
      return Math.max(
        Math.max(ell(lx, ly, 0, 0, 0.66, 0.2), disc(lx, ly, 0.74, 0, 0.19)),
        Math.max(
          Math.max(cap(lx, ly, -0.6, 0, -1.2, 0.12 * Math.sin(t * 2), 0.07), cap(lx, ly, 0.34, 0.12, 0.5 + sw, 0.42, 0.06)),
          Math.max(
            Math.max(cap(lx, ly, 0.34, -0.12, 0.5 - sw, -0.42, 0.06), cap(lx, ly, -0.34, 0.12, -0.5 - sw, 0.42, 0.06)),
            cap(lx, ly, -0.34, -0.12, -0.5 + sw, -0.42, 0.06)
          )
        )
      );
    }
    function raptor(lx: number, ly: number, t: number) {
      const step = 0.1 * Math.sin(t * 4);
      const body = ell(lx, ly, -0.05, 0.05, 0.4, 0.24);
      const neck = cap(lx, ly, 0.2, -0.05, 0.46, -0.32, 0.09);
      const head = disc(lx, ly, 0.54, -0.36, 0.13);
      const snout = cap(lx, ly, 0.54, -0.34, 0.72, -0.3, 0.05);
      const tail = cap(lx, ly, -0.35, 0.0, -1.0, -0.32, 0.09);
      const arm = cap(lx, ly, 0.22, 0.12, 0.42, 0.3, 0.05);
      const legA = Math.max(cap(lx, ly, 0.02, 0.22, 0.12 + step, 0.55, 0.08), cap(lx, ly, 0.12 + step, 0.55, 0.3 + step, 0.72, 0.06));
      const legB = Math.max(cap(lx, ly, -0.04, 0.22, -0.08 - step, 0.55, 0.08), cap(lx, ly, -0.08 - step, 0.55, 0.12 - step, 0.74, 0.06));
      return Math.max(Math.max(Math.max(body, neck), Math.max(head, snout)), Math.max(Math.max(tail, arm), Math.max(legA, legB)));
    }
    function eagle(lx: number, ly: number, t: number, flap: number) {
      const body = ell(lx, ly, 0, 0.05, 0.26, 0.17);
      const head = disc(lx, ly, 0.3, -0.05, 0.11);
      const beak = cap(lx, ly, 0.38, -0.04, 0.5, 0.0, 0.04);
      const tail = cap(lx, ly, -0.2, 0.08, -0.52, 0.18, 0.09);
      const wL1 = cap(lx, ly, -0.04, -0.03, -0.55, -0.2 + flap, 0.13);
      const wL2 = cap(lx, ly, -0.5, -0.2 + flap, -0.92, -0.05 + flap * 1.4, 0.08);
      const wR1 = cap(lx, ly, 0.04, -0.03, 0.55, -0.2 + flap, 0.13);
      const wR2 = cap(lx, ly, 0.5, -0.2 + flap, 0.92, -0.05 + flap * 1.4, 0.08);
      return Math.max(Math.max(Math.max(body, head), Math.max(beak, tail)), Math.max(Math.max(wL1, wL2), Math.max(wR1, wR2)));
    }
    function shape(s: string, lx: number, ly: number, t: number, flap: number): number {
      if (s === "cell1") return disc(lx, ly, 0, 0, 0.36);
      if (s === "cell2") return Math.max(disc(lx, ly, -0.4, 0, 0.3), disc(lx, ly, 0.4, 0, 0.3));
      if (s === "cell3") return Math.max(disc(lx, ly, 0, -0.4, 0.27), Math.max(disc(lx, ly, -0.42, 0.26, 0.27), disc(lx, ly, 0.42, 0.26, 0.27)));
      if (s === "worm") return worm(lx, ly, t);
      if (s === "fish") return fish(lx, ly, t);
      if (s === "reptile") return reptile(lx, ly, t);
      if (s === "raptor") return raptor(lx, ly, t);
      if (s === "eagle") return eagle(lx, ly, t, flap);
      return 0;
    }
    // morph-in then HOLD each stage; the eagle flies off at the end
    const SEG: Array<[number, number, string, string]> = [
      [0.0, 0.05, "none", "none"],
      [0.05, 0.1, "none", "cell1"],
      [0.1, 0.14, "cell1", "cell1"],
      [0.14, 0.19, "cell1", "cell2"],
      [0.19, 0.22, "cell2", "cell2"],
      [0.22, 0.27, "cell2", "cell3"],
      [0.27, 0.31, "cell3", "cell3"],
      [0.31, 0.37, "cell3", "worm"],
      [0.37, 0.42, "worm", "worm"],
      [0.42, 0.48, "worm", "fish"],
      [0.48, 0.53, "fish", "fish"],
      [0.53, 0.59, "fish", "reptile"],
      [0.59, 0.64, "reptile", "reptile"],
      [0.64, 0.7, "reptile", "raptor"],
      [0.7, 0.75, "raptor", "raptor"],
      [0.75, 0.81, "raptor", "eagle"],
      [0.81, 0.87, "eagle", "eagle"],
      [0.87, 0.96, "eagle", "none"],
      [0.96, 1.0, "none", "none"],
    ];

    function draw(now: number, frozen: boolean) {
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.font = `${font}px "Geist Mono Variable", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const t = now * 0.001 * speed;
      const cyc = 26000 / Math.max(0.2, speed);
      const u = frozen ? 0.84 : (now % cyc) / cyc;
      let sa = "none",
        sb = "none",
        blend = 0;
      for (const [t0, t1, a, b] of SEG) {
        if (u >= t0 && u <= t1) {
          sa = a;
          sb = b;
          blend = smoothstep(0, 1, (u - t0) / (t1 - t0));
          break;
        }
      }

      const flyOff = sa === "eagle" && sb === "none";
      const fp = flyOff ? blend : 0;
      const cx = ox + fp * W * 0.6,
        cy = oy - fp * H * 0.5;
      const flap = sa === "eagle" || sb === "eagle" ? 0.34 * Math.sin(t * (flyOff ? 9 : 6)) : 0;
      let glow = 0;
      if (sa !== "none" && sb !== "none") glow = 1;
      else if (sa === "none") glow = blend;
      else glow = 1 - blend;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const lx = (cell.x - cx) / R,
          ly = (cell.y - cy) / R;
        let bright = 0;
        if (lx > -1.7 && lx < 1.7 && ly > -1.7 && ly < 1.7) {
          const ia = sa === "none" ? 0 : shape(sa, lx, ly, t, flap);
          const ib = sb === "none" ? 0 : shape(sb, lx, ly, t, flap);
          bright = lerp(ia, ib, blend);
        }
        cell.bright = bright;
        if (!frozen && now > cell.flip) {
          cell.ch = rnd();
          cell.flip = now + (bright > 0.4 ? 70 + Math.random() * 150 : 360 + Math.random() * 1500);
        }
      }
      // pass 1: grey code field
      ctx.shadowBlur = 0;
      ctx.fillStyle = noiseColor;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.bright > 0.08) continue;
        ctx.globalAlpha = cell.base * cell.fade;
        ctx.fillText(cell.ch, cell.x, cell.y);
      }
      // soft teal glow blob behind the organism
      if (glow > 0.01) {
        const rad = R * 1.9;
        const g = ctx.createRadialGradient(cx, cy - R * 0.1, 0, cx, cy - R * 0.1, rad);
        g.addColorStop(0, glowColor);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.28 * glow;
        ctx.fillStyle = g;
        ctx.fillRect(cx - rad, cy - R * 0.1 - rad, rad * 2, rad * 2);
      }
      // pass 2: white organism glyphs
      ctx.fillStyle = organismColor;
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (cell.bright <= 0.08) continue;
        ctx.globalAlpha = 0.45 + 0.55 * cell.bright;
        ctx.fillText(cell.ch, cell.x, cell.y);
      }
      ctx.globalAlpha = 1;
    }

    rebuild();
    if (prefersReduced) {
      draw(0, true);
      const r1 = requestAnimationFrame(() => {
        rebuild();
        draw(0, true);
      });
      return () => cancelAnimationFrame(r1);
    }
    let raf = 0,
      last = 0;
    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!inView || now - last < 50) return; // throttle ~20fps (dense field)
      last = now;
      draw(now, false);
    }
    raf = requestAnimationFrame(frame);
    let rRaf = 0;
    function onResize() {
      cancelAnimationFrame(rRaf);
      rRaf = requestAnimationFrame(rebuild);
    }
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rRaf);
      window.removeEventListener("resize", onResize);
    };
  }, [density, speed, noiseColor, organismColor, glowColor, focusX, scale, glyphChars, transparentBg, bgColor, prefersReduced, inView]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: transparentBg ? "transparent" : bgColor,
        ...style,
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
