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
  creature/             # genome, assemble (2-bone IK), gaits, materials, Creature, CreatureRunner
  learning/             # types, mlp, placeholderAlgorithm, fitness, trainer, sources
  scene/                # Stage (Canvas), PathLine, Footprints, GhostTrails, anim, hooks
```

## Look & the quality ladder

The stage is a **clean white "studio"**: bright simple lighting, regular
real-time shadows, neutral slate maze walls with a quiet static teal top-edge
accent, and a vivid teal hero creature that pops against the neutral maze. The
champion's current route is drawn as a teal floor line, and it leaves fading
footprints as it walks (`scene/Footprints.tsx`). No post-processing chain — the
look comes from lighting + materials, which is both simpler and far more robust.

Fidelity is gated through one resolved `QualitySettings` object
(`config.ts` → `useQuality`), never by `isMobile`/`reducedMotion` directly. The
base tier comes from the device (reduced-motion → `low`, mobile → `medium`, else
`high`); a one-way perf governor drops a tier if FPS stays under
`perf.downgradeFps`. Today the live tier mainly drives shadow map size +
creature/maze geometry density (`bodySegments`, `limbRadial`, `wallBevel`,
`circuitTraces`).

The **living creature** (`creature/`) is the detail showcase: per-segment
materials with a subtle fitness-driven emissive energy wave (`materials.ts`),
breathing, a flexing/swaying spine, a nodding head + blinking layered eyes, a
trailing tail, knee knuckles, dorsal spines, banking into turns
(`CreatureRunner`), and tier-scaled geometry density.

Determinism holds: morphology, maze, and evolution derive only from
`seed = session.id`. Colorblind cues are intact (start/exit rings + flag shape +
path line styles carry meaning without relying on colour).

> ⚠️ **Do not add drei `<SoftShadows>` on three 0.184.** Its PCSS patch rewrites
> the global shadow shader chunk in a way that fails to compile, which silently
> breaks *every* lit (`MeshStandard`/`MeshPhysical`) material — the whole maze
> and creature vanish while only line/point/shader materials still draw. Regular
> shadows (`shadows={{ type: PCFSoftShadowMap }}`) work fine.

(`scene/Effects.tsx` — the original dark-stage selective-bloom pass — is no
longer wired into the white theme; left in place but unused.)

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
