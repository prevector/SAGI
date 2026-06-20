// Seeded maze generation — a recursive-backtracker (DFS) "perfect" maze: every
// cell reachable from every other, exactly one path between any two cells (no
// loops). Pure and headless: the same RNG state always yields the same maze, so
// `session.id` => one fixed maze. The cell graph it returns drives rendering,
// the sensor API, and the GA rollout.

import type { RNG } from "../rng";

/** Cardinal directions, indexed: 0=N, 1=E, 2=S, 3=W. */
export const DIR = { N: 0, E: 1, S: 2, W: 3 } as const;
export type Dir = (typeof DIR)[keyof typeof DIR];

/** Delta (dx, dy) per direction. +y is "south" (row index grows downward). */
export const DIR_DELTA: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // N
  [1, 0], // E
  [0, 1], // S
  [-1, 0], // W
];

export const OPPOSITE: ReadonlyArray<Dir> = [DIR.S, DIR.W, DIR.N, DIR.E];

export interface Cell {
  x: number;
  y: number;
  /** walls[dir] = true means a wall stands on that side (no passage). */
  walls: [boolean, boolean, boolean, boolean];
}

export interface Grid {
  cols: number;
  rows: number;
  cells: Cell[]; // row-major: index = y * cols + x
  start: readonly [number, number];
  exit: readonly [number, number];
}

export function idx(grid: Grid, x: number, y: number): number {
  return y * grid.cols + x;
}

export function inBounds(grid: Grid, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;
}

export function cellAt(grid: Grid, x: number, y: number): Cell {
  return grid.cells[idx(grid, x, y)];
}

/** Is there an open passage from (x,y) in direction `dir`? */
export function isOpen(grid: Grid, x: number, y: number, dir: Dir): boolean {
  if (!inBounds(grid, x, y)) return false;
  if (cellAt(grid, x, y).walls[dir]) return false;
  const [dx, dy] = DIR_DELTA[dir];
  return inBounds(grid, x + dx, y + dy);
}

/** Open (reachable) neighbours of a cell. */
export function openNeighbors(grid: Grid, x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let d = 0 as Dir; d < 4; d++) {
    if (isOpen(grid, x, y, d)) {
      const [dx, dy] = DIR_DELTA[d];
      out.push([x + dx, y + dy]);
    }
  }
  return out;
}

/**
 * Generate a perfect maze via iterative recursive-backtracker. Start at (0,0),
 * exit at the opposite corner. Iterative (explicit stack) to avoid call-stack
 * limits on larger mazes.
 */
export function generateMaze(rng: RNG, cols: number, rows: number): Grid {
  const cells: Cell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({ x, y, walls: [true, true, true, true] });
    }
  }
  const grid: Grid = { cols, rows, cells, start: [0, 0], exit: [cols - 1, rows - 1] };

  const visited = new Uint8Array(cols * rows);
  const stack: Array<[number, number]> = [[0, 0]];
  visited[0] = 1;

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    // Gather unvisited neighbours.
    const candidates: Dir[] = [];
    for (let d = 0 as Dir; d < 4; d++) {
      const [dx, dy] = DIR_DELTA[d];
      const nx = cx + dx;
      const ny = cy + dy;
      if (inBounds(grid, nx, ny) && !visited[ny * cols + nx]) candidates.push(d);
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    // Pick one at random (this is the only randomness — fully seed-determined).
    const d = candidates[Math.floor(rng() * candidates.length)];
    const [dx, dy] = DIR_DELTA[d];
    const nx = cx + dx;
    const ny = cy + dy;
    // Knock down the wall between current and chosen neighbour, both sides.
    cellAt(grid, cx, cy).walls[d] = false;
    cellAt(grid, nx, ny).walls[OPPOSITE[d]] = false;
    visited[ny * cols + nx] = 1;
    stack.push([nx, ny]);
  }

  return grid;
}

/** BFS shortest path (cell list) from start to exit, or null if unreachable. */
export function solve(grid: Grid): Array<[number, number]> | null {
  const [sx, sy] = grid.start;
  const [ex, ey] = grid.exit;
  const prev = new Int32Array(grid.cols * grid.rows).fill(-1);
  const seen = new Uint8Array(grid.cols * grid.rows);
  const queue: Array<[number, number]> = [[sx, sy]];
  seen[idx(grid, sx, sy)] = 1;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    if (cx === ex && cy === ey) break;
    for (const [nx, ny] of openNeighbors(grid, cx, cy)) {
      const ni = idx(grid, nx, ny);
      if (!seen[ni]) {
        seen[ni] = 1;
        prev[ni] = idx(grid, cx, cy);
        queue.push([nx, ny]);
      }
    }
  }

  const exitI = idx(grid, ex, ey);
  if (!seen[exitI]) return null;
  const path: Array<[number, number]> = [];
  let cur = exitI;
  while (cur !== -1) {
    path.push([cur % grid.cols, Math.floor(cur / grid.cols)]);
    cur = prev[cur];
  }
  return path.reverse();
}

/** Count cells reachable from start (perfect maze => all of them). */
export function reachableCount(grid: Grid): number {
  const seen = new Uint8Array(grid.cols * grid.rows);
  const [sx, sy] = grid.start;
  const stack: Array<[number, number]> = [[sx, sy]];
  seen[idx(grid, sx, sy)] = 1;
  let count = 0;
  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    count++;
    for (const [nx, ny] of openNeighbors(grid, cx, cy)) {
      const ni = idx(grid, nx, ny);
      if (!seen[ni]) {
        seen[ni] = 1;
        stack.push([nx, ny]);
      }
    }
  }
  return count;
}

/**
 * World position (x, z) of a cell centre on the floor plane, centred on the
 * origin. y in grid space maps to z in world space.
 */
export function worldPos(
  grid: Grid,
  cx: number,
  cy: number,
  cellSize: number
): [number, number] {
  const wx = (cx - (grid.cols - 1) / 2) * cellSize;
  const wz = (cy - (grid.rows - 1) / 2) * cellSize;
  return [wx, wz];
}
