// The rollout + fitness function — what makes the maze read as *training*. An
// agent (discrete grid walker) drives a Policy through the maze; fitness rewards
// getting closer to the exit (true maze distance, so the gradient respects
// walls), reaching it, doing so quickly, and exploring — and lightly penalises
// flailing into walls. A smooth landscape is what lets the GA climb.

import { type Grid, idx, openNeighbors } from "../maze/generate";
import {
  type AgentState,
  atExit,
  canMoveAhead,
  cellAhead,
  sense,
  turnLeft,
  turnRight,
} from "../maze/sensors";
import { DIR } from "../maze/generate";
import type { Policy } from "./types";

const UNREACHABLE = 1 << 29;

/** BFS distance-to-exit for every cell (over open passages). */
export function distanceField(grid: Grid): Int32Array {
  const dist = new Int32Array(grid.cols * grid.rows).fill(UNREACHABLE);
  const [ex, ey] = grid.exit;
  const start = idx(grid, ex, ey);
  dist[start] = 0;
  const queue: number[] = [start];
  let head = 0;
  while (head < queue.length) {
    const ci = queue[head++];
    const cx = ci % grid.cols;
    const cy = Math.floor(ci / grid.cols);
    for (const [nx, ny] of openNeighbors(grid, cx, cy)) {
      const ni = idx(grid, nx, ny);
      if (dist[ni] === UNREACHABLE) {
        dist[ni] = dist[ci] + 1;
        queue.push(ni);
      }
    }
  }
  return dist;
}

/** Largest finite distance in the field (normaliser). */
export function maxFiniteDistance(dist: Int32Array): number {
  let m = 0;
  for (const d of dist) if (d < UNREACHABLE && d > m) m = d;
  return m || 1;
}

export interface RolloutResult {
  reached: boolean;
  steps: number; // steps taken (to reach the exit, or maxSteps)
  bestDist: number; // closest distance-to-exit ever achieved
  bumps: number;
  unique: number; // distinct cells visited
  path: Array<[number, number]>;
}

/** Run a policy through the maze and record what happened. */
export function rollout(
  grid: Grid,
  dist: Int32Array,
  policy: Policy,
  maxSteps: number
): RolloutResult {
  const state: AgentState = { x: grid.start[0], y: grid.start[1], dir: DIR.E };
  const visited = new Set<number>([idx(grid, state.x, state.y)]);
  const path: Array<[number, number]> = [[state.x, state.y]];
  let bestDist = dist[idx(grid, state.x, state.y)];
  let bumps = 0;
  let steps = 0;

  for (let s = 0; s < maxSteps; s++) {
    if (atExit(grid, state)) break;
    const obs = sense(grid, state, dist);
    const a = policy.act(obs);

    // Turn (one quarter-turn per step).
    if (a[0] > 0.33) state.dir = turnRight(state.dir);
    else if (a[0] < -0.33) state.dir = turnLeft(state.dir);

    // Move forward if commanded and possible.
    if (a[1] > 0) {
      if (canMoveAhead(grid, state)) {
        const [nx, ny] = cellAhead(state);
        state.x = nx;
        state.y = ny;
        const ci = idx(grid, nx, ny);
        visited.add(ci);
        path.push([nx, ny]);
        if (dist[ci] < bestDist) bestDist = dist[ci];
      } else {
        bumps++;
      }
    }
    steps = s + 1;
  }

  return {
    reached: atExit(grid, state),
    steps,
    bestDist,
    bumps,
    unique: visited.size,
    path,
  };
}

/** Scalar fitness from a rollout (higher is better). */
export function fitnessOf(result: RolloutResult, maxDist: number, maxSteps: number): number {
  // Progress dominates: 0 at start distance, 1 at the exit.
  const progress = 1 - result.bestDist / maxDist;
  let fit = progress * 100;
  if (result.reached) {
    // Solved bonus + a speed bonus for fewer steps.
    fit += 100 + (1 - result.steps / maxSteps) * 100;
  }
  fit += result.unique * 0.25; // gentle exploration incentive
  fit -= result.bumps * 0.15; // discourage flailing into walls
  return fit;
}
