# Session 3D Visual

A self-contained, lazy-loaded hero visual for `/session`: a procedurally
generated **creature** whose brain is evolved by a **real (headless) genetic
algorithm** to solve a procedurally generated **maze** — the metaphor for a
model *training*. Everything derives deterministically from `seed = session.id`,
so a session always replays the same creature, maze, and evolution.

On-brand (dark stage, selective teal/orange Bloom, Geist HUD), colorblind-safe
(every meaning carries a non-colour cue), performant (one detailed champion;
instanced walls; logic-only population; `frameloop="demand"`, off-screen/tab
pause; capped DPR), and isolated (lazy + error boundary; three.js never enters
the main bundle).

## Layout

```
visual/
  SessionVisual.tsx     # default export; the only thing SessionPage imports (lazily)
  palette.ts rng.ts config.ts ErrorBoundary.tsx
  maze/                 # generate (recursive-backtracker), sensors, Maze (R3F)
  creature/             # genome, assemble (2-bone IK), gaits, Creature, CreatureRunner
  learning/             # types, mlp, placeholderAlgorithm, fitness, trainer, sources
  scene/                # Stage (Canvas), Effects (Bloom), PathLine, GhostTrails, hooks
```

Mounted in `SessionPage` behind `config.features.session3dVisual`, a `<Suspense>`,
and the module's `VisualErrorBoundary`. Bound to the latest session:
`seed = session.id`, `status`, `progress`.

## Seam 1 — drop in the real model (`Algorithm`)

The "brain" is a pluggable `Algorithm<G>` (`learning/types.ts`). Today it's
`PlaceholderAlgorithm` (a fixed-topology MLP evolved by the GA). To use a real
model, implement the same interface and pass it to the trainer:

```ts
class RealAlgorithm implements Algorithm<MyGenome> {
  random(rng) { /* sample a genome */ }
  build(genome): Policy { return { act(obs) { /* real model forward pass */ } }; }
  mutate(genome, rng) { /* ... */ }
  crossover(a, b, rng) { /* ... */ }
}

// learning/localSource.ts → new GaTrainer({ cols, rows, algorithm: new RealAlgorithm() })
```

`Policy.act(obs: Float32Array): Float32Array` maps a sensor observation
(`OBS_SIZE = 8`, see `maze/sensors.ts`) to `[turn, move]`. Nothing in `scene/`
or `SessionVisual` changes.

## Seam 2 — drive it from the engine (`TrainingSource = remote`)

`TrainingSource` (`learning/types.ts`) is `local` (in-browser GA, default) or
`remote` (engine telemetry). The engine does not stream training yet
(`RESEARCH-3D.md` §3), so `learning/remoteSource.ts` is a typed stub that emits
nothing — selecting it shows a "waiting for engine" state.

To go live: set `VISUAL_CONFIG.trainingSource = "remote"` and implement
`subscribe(seed, cb)` against a WS/SSE channel that emits `TrainingUpdate`
(`{ generation, bestFitness, bestSteps, solved, bestGenome? }`), returning a
cleanup that closes the channel. Suggested endpoint: a WS/SSE at
`/api/sessions/:id/training` (mirrors the planned `subscribeNetwork` shape in
`lib/http.ts`).

## Tests

`npm test -w @sagi/web` (Vitest). Headless, no rendering:
- `maze/maze.test.ts` — determinism, connectivity, solvability, sensors.
- `creature/creature.test.ts` — genome diversity, 2/4/6/8-leg assembly, 2-bone IK.
- `creature/gaits.test.ts` — per-leg-count gait patterns, foot cycle, bob.
- `learning/trainer.test.ts` — **fitness improves over generations and the maze
  is solved on a fixed seed and across seeds; runs are deterministic.**
