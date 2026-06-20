// Local TrainingSource — the default: an in-browser GA trainer reset on the
// session seed. Swapping to engine telemetry later means returning a
// `{ kind: "remote", subscribe }` source instead, with no scene changes.

import { VISUAL_CONFIG } from "../config";
import { GaTrainer } from "./trainer";
import type { Seed, TrainingSource } from "./types";

export interface LocalSource extends Extract<TrainingSource, { kind: "local" }> {
  trainer: GaTrainer;
}

export function createLocalSource(
  seed: Seed,
  cols: number = VISUAL_CONFIG.maze.cols,
  rows: number = VISUAL_CONFIG.maze.rows
): LocalSource {
  const trainer = new GaTrainer({ cols, rows });
  trainer.reset(seed);
  return { kind: "local", trainer };
}
