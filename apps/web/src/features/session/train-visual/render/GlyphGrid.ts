// GlyphGrid — the canvas-2D draw core for the genome field.
//
// Reproduces the hero's EmergenceField technique applied to discrete genome
// rows (PLAN-TRAIN-ANIM §5): every cell holds a glyph and a flip timestamp;
// a per-cell `bright` value (= its genome's fitness, weighted toward locked
// positions) drives (1) a brightness-dependent flip cadence — resolved cells
// shimmer fast & alive, noise cells barely twitch; (2) a two-pass draw — grey
// noise glyphs first, then white→teal resolved glyphs; (3) a soft teal glow
// behind resolved rows. Hue is one of four cues (brightness, motion, position,
// hue), so the state is legible without colour.

import { PALETTE } from "../palette";
import { TRAIN_CONFIG } from "../config";

const R = TRAIN_CONFIG.render;

/** One genome's display state, fed in each frame by the sim (or noise). */
export interface RowState {
  /** The genome's actual chars — shown once the row resolves. */
  chars: string;
  /** 0..1 fitness; drives brightness, flip speed and colour. */
  fitness: number;
  /** Per-position 0..1 "locked" weight (1 = matches target). Optional. */
  locked?: readonly number[];
}

interface Cell {
  ch: string; // currently displayed glyph
  flip: number; // next time (ms) this cell rerolls its glyph
}

/** Highlight pulse applied during the breakthrough moment (C4). */
export interface DrawOptions {
  /** 0..1 breakthrough intensity; tints the field toward orange briefly. */
  breakthrough?: number;
  /** When true, draw a single settled frame with no flicker (reduced motion). */
  frozen?: boolean;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class GlyphGrid {
  private cols = 0;
  private rows = 0;
  private cells: Cell[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private cellW = 0;
  private rowH = 0;
  private originX = 0;
  private originY = 0;
  private readonly charsArr = TRAIN_CONFIG.charset.split("");

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly randGlyph: () => string
  ) {}

  /** (Re)build the cell grid for the current canvas size + row count. */
  resize(cssW: number, cssH: number, dpr: number, rowCount: number): void {
    this.w = Math.max(1, cssW);
    this.h = Math.max(1, cssH);
    this.dpr = dpr;
    this.rows = rowCount;
    this.cellW = R.fontPx * R.cellAdvance;
    this.rowH = R.fontPx * R.rowHeight;

    // Fit as many glyph columns as the width allows, leaving a gutter.
    const gutter = R.fontPx;
    this.cols = Math.max(1, Math.floor((this.w - gutter * 2) / this.cellW));

    const fieldW = this.cols * this.cellW;
    const fieldH = this.rows * this.rowH;
    this.originX = (this.w - fieldW) / 2;
    this.originY = (this.h - fieldH) / 2 + this.rowH * 0.5;

    this.cells = [];
    for (let i = 0; i < this.cols * this.rows; i++) {
      this.cells.push({ ch: this.randGlyph(), flip: Math.random() * R.flipSlowJitter });
    }

    this.ctx.canvas.width = Math.floor(this.w * dpr);
    this.ctx.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get columns(): number {
    return this.cols;
  }

  /** Brightness for a cell = genome fitness, lifted where the position is locked. */
  private brightAt(row: RowState, col: number): number {
    const f = row.fitness;
    const lock = row.locked && col < row.locked.length ? row.locked[col] : 0;
    // Locked positions read brightest; unlocked track raw fitness.
    return Math.max(0, Math.min(1, f * 0.7 + lock * 0.5));
  }

  /**
   * Draw one frame. `rowStates` is ordered top→bottom (fittest first, by
   * convention from the sim). Cells beyond a row's char length stay noise.
   */
  draw(now: number, rowStates: readonly RowState[], opts: DrawOptions = {}): void {
    const ctx = this.ctx;
    const frozen = opts.frozen ?? false;
    const breakthrough = opts.breakthrough ?? 0;

    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.font = `${R.fontPx}px "Geist Mono Variable", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fadeW = this.w * R.leftFade;

    // Resolved colour shifts white→teal as the field highlights; a breakthrough
    // nudges it toward orange (the economy axis), redundant with the pulse.
    const resolvedColor = breakthrough > 0.01 ? PALETTE.orange : PALETTE.resolved;

    let highlighted = 0;

    // Pass 1: grey noise glyphs (low fitness cells).
    ctx.fillStyle = PALETTE.noise;
    ctx.shadowBlur = 0;
    for (let r = 0; r < this.rows; r++) {
      const state = rowStates[r];
      const y = this.originY + r * this.rowH;
      for (let c = 0; c < this.cols; c++) {
        const idx = r * this.cols + c;
        const cell = this.cells[idx];
        const bright = state ? this.brightAt(state, c) : 0;
        if (bright >= 0.7) {
          highlighted++;
          continue; // drawn in pass 2
        }
        this.reflip(cell, now, bright, frozen);
        const x = this.originX + c * this.cellW + this.cellW / 2;
        const fade = Math.max(0.15, Math.min(1, x / fadeW));
        ctx.globalAlpha = (0.22 + 0.18 * bright) * fade;
        // Below the resolve line a row shows scrambling noise, not its real chars.
        ctx.fillText(cell.ch, x, y);
      }
    }

    // Pass 1.5: soft teal glow behind the resolved band (top of the field).
    const highlightFrac = highlighted / Math.max(1, this.cols * this.rows);
    if (highlightFrac > 0.01) {
      const bandH = this.rowH * this.rows;
      const cx = this.w / 2;
      const cy = this.originY + bandH * 0.25;
      const rad = Math.max(this.w, bandH) * 0.6;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, PALETTE.teal);
      g.addColorStop(1, "transparent");
      ctx.globalAlpha = R.glowAlpha * Math.min(1, highlightFrac * 2.2);
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }

    // Pass 2: resolved glyphs (white→teal), showing the genome's real chars.
    for (let r = 0; r < this.rows; r++) {
      const state = rowStates[r];
      if (!state) continue;
      const y = this.originY + r * this.rowH;
      for (let c = 0; c < this.cols; c++) {
        const bright = this.brightAt(state, c);
        if (bright < 0.7) continue;
        const idx = r * this.cols + c;
        const cell = this.cells[idx];
        this.reflip(cell, now, bright, frozen);
        // Resolved cells lock to the genome's actual character.
        const stable = c < state.chars.length ? state.chars[c] : cell.ch;
        const x = this.originX + c * this.cellW + this.cellW / 2;
        const fade = Math.max(0.15, Math.min(1, x / fadeW));
        // Brightest cells tint toward teal.
        ctx.fillStyle = bright > 0.88 ? lerpColor(resolvedColor, PALETTE.teal, (bright - 0.88) / 0.12) : resolvedColor;
        ctx.globalAlpha = (0.5 + 0.5 * bright) * fade;
        ctx.fillText(stable, x, y);
      }
    }

    ctx.globalAlpha = 1;
  }

  /** Reroll a cell's glyph on its cadence; bright cells flip fast, noise slow. */
  private reflip(cell: Cell, now: number, bright: number, frozen: boolean): void {
    if (frozen) return;
    if (now < cell.flip) return;
    cell.ch = this.randGlyph();
    cell.flip =
      now +
      (bright > 0.4
        ? R.flipFastMin + Math.random() * R.flipFastJitter
        : R.flipSlowMin + Math.random() * R.flipSlowJitter);
  }
}

// Cheap hex lerp for the white→teal tint (both are 6-digit hex).
function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255,
    ag = (ah >> 8) & 255,
    ab = ah & 255;
  const br = (bh >> 16) & 255,
    bg = (bh >> 8) & 255,
    bb = bh & 255;
  const rr = Math.round(lerp(ar, br, t));
  const rg = Math.round(lerp(ag, bg, t));
  const rb = Math.round(lerp(ab, bb, t));
  return `rgb(${rr},${rg},${rb})`;
}
