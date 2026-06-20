// Sensor API: turns an agent's pose in the maze into a fixed-length observation
// vector for the policy (MLP). The agent is a discrete grid walker (cell +
// facing) — cheap, fully deterministic, and learnable — and the visual later
// interpolates the resulting cell path into smooth creature motion.
//
// Observation layout (OBS_SIZE = 8), all roughly in [-1, 1]:
//   0  wall ahead        (1 blocked, 0 open)
//   1  wall to the left
//   2  wall to the right
//   3  open distance ahead, normalized (cells until a wall / maxDim)
//   4  exit offset x, normalized (signed)
//   5  exit offset y, normalized (signed)
//   6  heading alignment to exit (cos of angle; 1 = facing straight at exit)
//   7  bias (constant 1)

import {
  DIR,
  DIR_DELTA,
  type Dir,
  type Grid,
  cellAt,
  inBounds,
  isOpen,
} from "./generate";

export const OBS_SIZE = 8;

export interface AgentState {
  x: number;
  y: number;
  dir: Dir;
}

export function turnLeft(dir: Dir): Dir {
  return ((dir + 3) % 4) as Dir;
}

export function turnRight(dir: Dir): Dir {
  return ((dir + 1) % 4) as Dir;
}

/** The cell directly ahead of the agent (may be out of bounds). */
export function cellAhead(state: AgentState): [number, number] {
  const [dx, dy] = DIR_DELTA[state.dir];
  return [state.x + dx, state.y + dy];
}

/** Count open cells in a straight line from (x,y) facing `dir`, capped. */
function openDistance(grid: Grid, x: number, y: number, dir: Dir, cap: number): number {
  let count = 0;
  let cx = x;
  let cy = y;
  while (count < cap && isOpen(grid, cx, cy, dir)) {
    const [dx, dy] = DIR_DELTA[dir];
    cx += dx;
    cy += dy;
    count++;
  }
  return count;
}

/** Unit-ish heading vector in grid space for a direction. */
function headingVec(dir: Dir): [number, number] {
  return [DIR_DELTA[dir][0], DIR_DELTA[dir][1]];
}

/** Build the observation vector for the policy. Reuses `out` if provided. */
export function sense(grid: Grid, state: AgentState, out?: Float32Array): Float32Array {
  const o = out ?? new Float32Array(OBS_SIZE);
  const { x, y, dir } = state;

  const blocked = (d: Dir): number => (isOpen(grid, x, y, d) ? 0 : 1);
  o[0] = blocked(dir);
  o[1] = blocked(turnLeft(dir));
  o[2] = blocked(turnRight(dir));

  const maxDim = Math.max(grid.cols, grid.rows);
  o[3] = openDistance(grid, x, y, dir, maxDim) / maxDim;

  const [ex, ey] = grid.exit;
  const dx = ex - x;
  const dy = ey - y;
  o[4] = dx / grid.cols;
  o[5] = dy / grid.rows;

  // Heading alignment: cos of angle between facing and the exit direction.
  const [hx, hy] = headingVec(dir);
  const len = Math.hypot(dx, dy) || 1;
  o[6] = (hx * dx + hy * dy) / len;

  o[7] = 1; // bias
  return o;
}

/** Convenience: is this pose on the exit cell? */
export function atExit(grid: Grid, state: AgentState): boolean {
  return state.x === grid.exit[0] && state.y === grid.exit[1];
}

/** Bounds-aware "can the agent step into the cell ahead?" */
export function canMoveAhead(grid: Grid, state: AgentState): boolean {
  if (!isOpen(grid, state.x, state.y, state.dir)) return false;
  const [nx, ny] = cellAhead(state);
  return inBounds(grid, nx, ny) && !!cellAt(grid, nx, ny);
}
