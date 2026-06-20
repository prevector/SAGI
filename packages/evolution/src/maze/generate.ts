import type { RNG } from "../rng.js";

export const DIR = { N: 0, E: 1, S: 2, W: 3 } as const;
export type Dir = (typeof DIR)[keyof typeof DIR];

export const DIR_DELTA: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0]
];

export const OPPOSITE: ReadonlyArray<Dir> = [DIR.S, DIR.W, DIR.N, DIR.E];

export interface Cell {
  x: number;
  y: number;
  walls: [boolean, boolean, boolean, boolean];
}

export interface Grid {
  cols: number;
  rows: number;
  cells: Cell[];
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

export function isOpen(grid: Grid, x: number, y: number, dir: Dir): boolean {
  if (!inBounds(grid, x, y)) {
    return false;
  }
  if (cellAt(grid, x, y).walls[dir]) {
    return false;
  }
  const [dx, dy] = DIR_DELTA[dir];
  return inBounds(grid, x + dx, y + dy);
}

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
    const candidates: Dir[] = [];
    for (let d = 0 as Dir; d < 4; d++) {
      const [dx, dy] = DIR_DELTA[d];
      const nx = cx + dx;
      const ny = cy + dy;
      if (inBounds(grid, nx, ny) && !visited[ny * cols + nx]) {
        candidates.push(d);
      }
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const d = candidates[Math.floor(rng() * candidates.length)];
    const [dx, dy] = DIR_DELTA[d];
    const nx = cx + dx;
    const ny = cy + dy;
    cellAt(grid, cx, cy).walls[d] = false;
    cellAt(grid, nx, ny).walls[OPPOSITE[d]] = false;
    visited[ny * cols + nx] = 1;
    stack.push([nx, ny]);
  }

  return grid;
}

export function solve(grid: Grid): Array<[number, number]> | null {
  const [sx, sy] = grid.start;
  const [ex, ey] = grid.exit;
  const prev = new Int32Array(grid.cols * grid.rows).fill(-1);
  const seen = new Uint8Array(grid.cols * grid.rows);
  const queue: Array<[number, number]> = [[sx, sy]];
  seen[idx(grid, sx, sy)] = 1;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    if (cx === ex && cy === ey) {
      break;
    }
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
  if (!seen[exitI]) {
    return null;
  }
  const path: Array<[number, number]> = [];
  let cur = exitI;
  while (cur !== -1) {
    path.push([cur % grid.cols, Math.floor(cur / grid.cols)]);
    cur = prev[cur];
  }
  return path.reverse();
}

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

export function worldPos(grid: Grid, cx: number, cy: number, cellSize: number): [number, number] {
  const wx = (cx - (grid.cols - 1) / 2) * cellSize;
  const wz = (cy - (grid.rows - 1) / 2) * cellSize;
  return [wx, wz];
}
