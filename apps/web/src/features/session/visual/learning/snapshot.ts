// A plain, immutable view of the trainer's current state for rendering. Kept
// separate so both the hook and any consumer share one shape.

import type { CellPath } from "../scene/PathLine";
import type { GaTrainer } from "./trainer";
import type { TrainerStats } from "./types";

export interface CellPathSnapshot extends TrainerStats {
  path: CellPath;
  attempts: ReadonlyArray<CellPath>;
}

export function snapshot(trainer: GaTrainer): CellPathSnapshot {
  return {
    ...trainer.stats(),
    path: trainer.championPath(),
    attempts: trainer.attemptsPaths(),
  };
}
