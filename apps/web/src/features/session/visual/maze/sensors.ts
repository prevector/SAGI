// Sensor API: turns an agent's pose into a fixed-length observation for the
// policy (MLP). The agent is a discrete grid walker (cell + facing) — cheap,
// deterministic, learnable — and the visual interpolates the resulting cell
// path into smooth creature motion.
//
// Channels (OBS_SIZE = 8), all in [-1, 1]:
//   0  wall ahead          (1 blocked, 0 open)
//   1  wall to the left
//   2  wall to the right
//   3  scent ahead         (+1 if stepping ahead gets closer to the exit, -1 if
//   4  scent left           farther, 0 if blocked) — a "smell the goal" gradient
//   5  scent right          from the maze distance field; absent => 0
//   6  heading alignment to the exit (straight-line cos angle)
//   7  bias (constant 1)
//
// The scent channels are what make the maze solvable by a memoryless reactive
// policy; the GA must still *learn* to weight and combine them.

import {
  DIR_DELTA,
  type Dir,
  type Grid,
  cellAt,
  idx,
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

/** Unit-ish heading vector in grid space for a direction. */
function headingVec(dir: Dir): [number, number] {
  return [DIR_DELTA[dir][0], DIR_DELTA[dir][1]];
}

/**
 * Scent for one relative direction: +1 if the open neighbour there is one step
 * closer to the exit, -1 if farther, 0 if blocked or no field provided.
 */
function scent(grid: Grid, x: number, y: number, dir: Dir, dist?: Int32Array): number {
  if (!dist || !isOpen(grid, x, y, dir)) return 0;
  const [dx, dy] = DIR_DELTA[dir];
  const here = dist[idx(grid, x, y)];
  const there = dist[idx(grid, x + dx, y + dy)];
  const d = here - there;
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/** Build the observation vector. Pass `dist` (distance field) for scent. */
export function sense(
  grid: Grid,
  state: AgentState,
  dist?: Int32Array,
  out?: Float32Array
): Float32Array {
  const o = out ?? new Float32Array(OBS_SIZE);
  const { x, y, dir } = state;
  const left = turnLeft(dir);
  const right = turnRight(dir);

  o[0] = isOpen(grid, x, y, dir) ? 0 : 1;
  o[1] = isOpen(grid, x, y, left) ? 0 : 1;
  o[2] = isOpen(grid, x, y, right) ? 0 : 1;

  o[3] = scent(grid, x, y, dir, dist);
  o[4] = scent(grid, x, y, left, dist);
  o[5] = scent(grid, x, y, right, dist);

  const [ex, ey] = grid.exit;
  const dxe = ex - x;
  const dye = ey - y;
  const [hx, hy] = headingVec(dir);
  const len = Math.hypot(dxe, dye) || 1;
  o[6] = (hx * dxe + hy * dye) / len;

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
