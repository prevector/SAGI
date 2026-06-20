import { type Grid, idx, openNeighbors } from "../maze/generate.js";
import {
  type AgentState,
  atExit,
  canMoveAhead,
  cellAhead,
  sense,
  turnLeft,
  turnRight
} from "../maze/sensors.js";
import { DIR } from "../maze/generate.js";
import type { Policy } from "./types.js";

const UNREACHABLE = 1 << 29;

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

export function maxFiniteDistance(dist: Int32Array): number {
  let m = 0;
  for (const d of dist) {
    if (d < UNREACHABLE && d > m) {
      m = d;
    }
  }
  return m || 1;
}

export interface RolloutResult {
  reached: boolean;
  steps: number;
  bestDist: number;
  bumps: number;
  unique: number;
  path: Array<[number, number]>;
}

export function rollout(grid: Grid, dist: Int32Array, policy: Policy, maxSteps: number): RolloutResult {
  const state: AgentState = { x: grid.start[0], y: grid.start[1], dir: DIR.E };
  const visited = new Set<number>([idx(grid, state.x, state.y)]);
  const path: Array<[number, number]> = [[state.x, state.y]];
  let bestDist = dist[idx(grid, state.x, state.y)];
  let bumps = 0;
  let steps = 0;

  for (let s = 0; s < maxSteps; s++) {
    if (atExit(grid, state)) {
      break;
    }
    const obs = sense(grid, state, dist);
    const a = policy.act(obs);

    if (a[0] > 0.33) {
      state.dir = turnRight(state.dir);
    } else if (a[0] < -0.33) {
      state.dir = turnLeft(state.dir);
    }

    if (a[1] > 0) {
      if (canMoveAhead(grid, state)) {
        const [nx, ny] = cellAhead(state);
        state.x = nx;
        state.y = ny;
        const ci = idx(grid, nx, ny);
        visited.add(ci);
        path.push([nx, ny]);
        if (dist[ci] < bestDist) {
          bestDist = dist[ci];
        }
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
    path
  };
}

export function fitnessOf(result: RolloutResult, maxDist: number, maxSteps: number): number {
  const progress = 1 - result.bestDist / maxDist;
  let fit = progress * 100;
  if (result.reached) {
    fit += 100 + (1 - result.steps / maxSteps) * 100;
  }
  fit += result.unique * 0.25;
  fit -= result.bumps * 0.15;
  return fit;
}
