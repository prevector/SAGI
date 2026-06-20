// Remote TrainingSource — the seam for driving the visual from the engine's
// REAL training telemetry. The engine does not stream training yet (see
// RESEARCH-3D.md §3), so this is a typed stub: it compiles, satisfies the
// TrainingSource contract, and emits nothing — the visual shows a
// "waiting for engine" state.
//
// To wire it later: open a WS/SSE channel (e.g. /api/sessions/:id/training),
// parse each message into a TrainingUpdate, call `cb(update)`, and return a
// cleanup that closes the channel. No scene changes are required — select this
// source via VISUAL_CONFIG.trainingSource.

import type { Seed, TrainingSource, TrainingUpdate } from "./types";

export function createRemoteSource(): Extract<TrainingSource, { kind: "remote" }> {
  return {
    kind: "remote",
    subscribe(_seed: Seed, _cb: (u: TrainingUpdate) => void): () => void {
      if (import.meta.env.DEV) {
        console.info(
          "[session-visual] remote TrainingSource selected, but engine telemetry is not wired yet — showing waiting state."
        );
      }
      // No telemetry → no updates. Unsubscribe is a no-op.
      return () => {};
    },
  };
}
