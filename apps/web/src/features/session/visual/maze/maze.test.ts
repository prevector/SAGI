import { describe, expect, it } from "vitest";
import { subRng } from "../rng";
import {
  cellAt,
  generateMaze,
  reachableCount,
  solve,
  worldPos,
} from "./generate";
import { OBS_SIZE, sense, type AgentState } from "./sensors";
import { DIR } from "./generate";

const SEED = "s-1718800000000-1";
const COLS = 11;
const ROWS = 11;

function build(seed: string) {
  return generateMaze(subRng(seed, "maze"), COLS, ROWS);
}

describe("maze generation", () => {
  it("is deterministic: same seed => identical wall layout", () => {
    const a = build(SEED);
    const b = build(SEED);
    const wallsA = a.cells.map((c) => c.walls.map(Number).join("")).join("|");
    const wallsB = b.cells.map((c) => c.walls.map(Number).join("")).join("|");
    expect(wallsA).toBe(wallsB);
  });

  it("differs across seeds", () => {
    const a = build("seed-A");
    const b = build("seed-B");
    const wallsA = a.cells.map((c) => c.walls.map(Number).join("")).join("|");
    const wallsB = b.cells.map((c) => c.walls.map(Number).join("")).join("|");
    expect(wallsA).not.toBe(wallsB);
  });

  it("is a perfect maze: every cell reachable from start", () => {
    const grid = build(SEED);
    expect(reachableCount(grid)).toBe(COLS * ROWS);
  });

  it("is solvable start -> exit with a contiguous path", () => {
    const grid = build(SEED);
    const path = solve(grid);
    expect(path).not.toBeNull();
    const p = path!;
    expect(p[0]).toEqual([grid.start[0], grid.start[1]]);
    expect(p[p.length - 1]).toEqual([grid.exit[0], grid.exit[1]]);
    // each step moves to an orthogonally adjacent cell
    for (let i = 1; i < p.length; i++) {
      const d = Math.abs(p[i][0] - p[i - 1][0]) + Math.abs(p[i][1] - p[i - 1][1]);
      expect(d).toBe(1);
    }
  });

  it("centres world positions on the origin", () => {
    const grid = build(SEED);
    const mid = (COLS - 1) / 2;
    const [wx, wz] = worldPos(grid, mid, mid, 1);
    expect(wx).toBeCloseTo(0);
    expect(wz).toBeCloseTo(0);
  });
});

describe("sensors", () => {
  it("returns a fixed-length, finite observation with bias", () => {
    const grid = build(SEED);
    const state: AgentState = { x: 0, y: 0, dir: DIR.E };
    const obs = sense(grid, state);
    expect(obs).toHaveLength(OBS_SIZE);
    expect(obs.every((v) => Number.isFinite(v))).toBe(true);
    expect(obs[OBS_SIZE - 1]).toBe(1); // bias
  });

  it("flags a wall ahead when facing a maze boundary", () => {
    const grid = build(SEED);
    // At top-left corner facing North is always a boundary wall.
    const obs = sense(grid, { x: 0, y: 0, dir: DIR.N });
    expect(obs[0]).toBe(1);
  });

  it("is deterministic for a given pose", () => {
    const grid = build(SEED);
    const a = sense(grid, { x: 3, y: 4, dir: DIR.S });
    const b = sense(grid, { x: 3, y: 4, dir: DIR.S });
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("cell at start exists and has expected coords", () => {
    const grid = build(SEED);
    const c = cellAt(grid, 0, 0);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });
});
