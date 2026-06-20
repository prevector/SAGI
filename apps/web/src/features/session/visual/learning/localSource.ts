// Local TrainingSource — the default: an in-browser GA trainer reset on the
// session seed. Swapping to engine telemetry later means returning a
// `{ kind: "remote", subscribe }` source instead, with no scene changes.

import { GaTrainer, type Seed, type TrainingSource } from "@sagi/evolution";
import { VISUAL_CONFIG } from "../config";

export interface LocalSource extends Extract<TrainingSource, { kind: "local" }> {
  trainer: GaTrainer;
}

export function createLocalSource(
  seed: Seed,
  cols: number = VISUAL_CONFIG.maze.cols,
  rows: number = VISUAL_CONFIG.maze.rows
): LocalSource {
  const trainer = new GaTrainer({ cols, rows, gaConfig: VISUAL_CONFIG.ga });
  trainer.reset(seed);
  return { kind: "local", trainer };
}
