// PopulationSource = remote — a typed STUB for engine telemetry.
//
// When the engine streams a real ES population/fitness for a session, implement
// `subscribe` to open an SSE/WS channel (e.g. GET /api/sessions/:id/training),
// parse each message into a PopulationUpdate, and invoke `cb`. No renderer
// changes are needed — flip TRAIN_CONFIG.populationSource to "remote".
//
// The contract the engine must emit (PLAN-TRAIN-ANIM §3, PopulationUpdate):
//   { generation, bestFitness, populationSize, evaluationsPerSec,
//     highlightedFraction, genomes?: [{ id, chars, fitness }] }
// If `genomes` is omitted, the view falls back to stats-only readouts.

import type { PopulationSource, PopulationUpdate, Seed } from "./types";

export function createRemoteSource(): Extract<PopulationSource, { kind: "remote" }> {
  return {
    kind: "remote",
    subscribe(_seed: Seed, _cb: (u: PopulationUpdate) => void): () => void {
      // Engine telemetry not wired yet. Returns a no-op unsubscribe so the
      // field stays in its idle/"waiting for engine" state.
      return () => {};
    },
  };
}
