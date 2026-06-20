# PLAN-3D.md — SAGI Session 3D Visual (approval gate)

Implementation plan for the **creature-evolving-to-solve-a-maze** visual on the session page. Adapts the runbook and `RESEARCH-3D.md` to the real repo. **Approve this before any Phase C coding.**

**Locked decisions (this session):**
- **Mount:** one **hero `<Canvas>` at the top of `/session`**, bound to the **latest session** (running → most recent). Single WebGL context.
- **React:** **upgrade `apps/web` to React 19 + R3F v9** (a dedicated sub-phase C0, with re-verification of every existing page).
- Creature = Spore-like procedural (fixed per session); brain = real headless GA placeholder (evolves over generations); determinism from `seed = session.id`; `TrainingSource = local` default, `remote` a typed stub inside the module; feature-flag gated; lazy + error-boundary isolated.

---

## 1. Module placement & boundary

```
apps/web/src/features/session/visual/
  SessionVisual.tsx          # default export — the ONLY thing SessionPage imports (lazily)
  index.ts                   # re-exports SessionVisual + public types
  palette.ts                 # typed constants mirroring DESIGN.md hexes (no hardcoded colors elsewhere)
  rng.ts                     # seedrandom wrapper: RNG type + makeRng(seed)
  config.ts                  # module-local tunables (GA params, perf budget, LOD thresholds)
  ErrorBoundary.tsx          # local class error boundary (the app has none reusable)

  maze/
    generate.ts              # seeded recursive-backtracker -> Grid (cells + walls)
    sensors.ts               # ray/grid sensor API: Grid + pose -> Float32Array obs
    Maze.tsx                 # instanced walls + floor + start/exit markers (R3F)
    maze.test.ts             # determinism + connectivity

  creature/
    genome.ts                # MorphologyGenome + genomeFromSeed(rng)
    parts.ts                 # primitive parts library (bodies/heads/limbs/feet/tails/eyes)
    assemble.ts              # genome -> part transforms + 2-bone IK rig description
    gaits.ts                 # Gait strategies per leg count (2/4/6/8)
    Creature.tsx             # R3F component: rig + gait animation + LOD
    creature.test.ts         # all leg counts assemble; diversity across seeds

  learning/
    types.ts                 # Policy, Algorithm, Trainer, TrainingSource, TrainingUpdate, Seed
    mlp.ts                   # tiny fixed-topology MLP (Policy impl)
    placeholderAlgorithm.ts  # PlaceholderAlgorithm: random/build/mutate/crossover over MLP genome
    fitness.ts               # fitness fn (distance reduction + reach + efficiency + steps)
    trainer.ts               # GA/ES loop: reset/step/champion/stats (HEADLESS)
    localSource.ts           # TrainingSource = local (wraps Trainer)
    remoteSource.ts          # TrainingSource = remote (typed STUB; "waiting for engine")
    trainer.test.ts          # *** headless: fixed seed -> fitness improves & maze solved ***

  scene/
    Stage.tsx                # <Canvas>, camera, fog, lights, OrbitControls, frameloop control
    Effects.tsx              # selective Bloom + Vignette (+ faint Noise)
    Hud.tsx                  # <Html> overlay in Geist: gen / fitness / steps / "Solved"
    GhostTrails.tsx          # faint poly-lines for non-champion attempts
    useReducedMotion.ts      # matchMedia hook (JS animation isn't covered by the CSS rule)
    usePerf.ts               # tiny FPS sampler (dev HUD)
```

**Boundary rules:** `SessionPage` imports **only** `lazy(() => import("../features/session/visual"))`, rendered inside `<Suspense>` + the module's `<ErrorBoundary>`. The module imports *up* only typed seams (`Session` shape via props, `config` flag) — never reaches into other features. three.js stays out of the page chunk until the visual mounts.

---

## 2. Dependencies (pinned for React 19 / R3F v9)

Add to `apps/web/package.json`:

| Package | Target | Notes |
|---|---|---|
| `three` | `^0.171` | WebGL2; latest stable at plan time — confirm exact at install. |
| `@react-three/fiber` | `^9` | React 19 line. |
| `@react-three/drei` | `^10` | drei v10 pairs with R3F v9 / React 19 (`OrbitControls`, `Instances/Instance`, `Line`, `Trail`, `Html`, `Text`, `AdaptiveDpr`). |
| `@react-three/postprocessing` | `^3` | R3F v9 line (selective `Bloom`, `Vignette`, `Noise`). |
| `seedrandom` | `^3` | + `@types/seedrandom` (dev). |
| `simplex-noise` | `^4` | organic deformation / ambient motion. |
| `leva` | `^0.10` (dev) | live tuning; stripped from prod (dynamic-import or flag-gated, never in the prod path). |

**React 19 upgrade (C0):** bump `react`, `react-dom` → `^19`; `@types/react`, `@types/react-dom` → `^19`. Verify peers: `react-router-dom@^6.28` (supports React 19), `recharts` (bump to `^2.15` for React 19 peer compat), `lucide-react`, `@fontsource-variable/*` (fine). **Exact resolved versions are confirmed at install in C0**, not guessed here.

---

## 3. Interfaces (finalized contracts)

```ts
// learning/types.ts
export type Seed = string;                 // = session.id
export interface RNG { (): number; }       // seedrandom PRNG

export interface Policy { act(obs: Float32Array): Float32Array; }   // sensors -> [turn, move]
export interface Algorithm<G = unknown> {
  random(rng: RNG): G;
  build(genome: G): Policy;
  mutate(genome: G, rng: RNG): G;
  crossover(a: G, b: G, rng: RNG): G;
}
export interface TrainerStats {
  generation: number; bestFitness: number; bestSteps: number; solved: boolean;
}
export interface Trainer {
  reset(seed: Seed): void;
  step(): void;                            // advance one generation (headless)
  champion(): Policy;
  championPath(): ReadonlyArray<[number, number]>;  // champion's cell path this gen (for the visual)
  attemptsPaths(): ReadonlyArray<ReadonlyArray<[number, number]>>; // for ghost trails (capped)
  stats(): TrainerStats;
}
export interface TrainingUpdate extends TrainerStats { bestGenome?: unknown; }
export type TrainingSource =
  | { kind: "local"; trainer: Trainer }
  | { kind: "remote"; subscribe(seed: Seed, cb: (u: TrainingUpdate) => void): () => void };

// SessionVisual.tsx
export interface SessionVisualProps {
  seed: Seed;                              // session.id
  status: "queued" | "running" | "completed" | "failed";
  progress: number;                        // 0..1 (phase gate only; GA drives generations)
}
```

```ts
// creature/genome.ts
export interface MorphologyGenome {
  bodySegments: number; bodyShape: "round"|"long"|"flat"|"tall"; size: number;
  legPairs: 1|2|3|4;                       // => 2/4/6/8 legs
  legSegments: number; legLength: number; legSpread: number; feet: "point"|"pad"|"claw";
  arms?: { pairs: number; segments: number };
  head: "snout"|"orb"|"crest"; eyes: number; tail?: { segments: number; length: number };
  accentHue: number;                       // constrained to teal↔orange band
  surface: "solid"|"faceted"|"wire";
}
export interface Gait { footPhase(legIndex: number, legCount: 2|4|6|8): number; }
export function gaitFor(legCount: 2|4|6|8): Gait;
```

---

## 4. Placeholder algorithm spec (the real, headless GA)

- **Policy = MLP** (`learning/mlp.ts`): fixed topology `obs(N) → hidden(8, tanh) → out(2, tanh)` where out = `[turnΔ, moveΔ]`. Genome = flat `Float32Array` of all weights+biases. `obs` from the sensor API.
- **Sensors** (`maze/sensors.ts`): 5 forward-ish ray distances to walls (normalized) + 2 components of the normalized vector toward the exit + 1 bias = `N=8` inputs. Deterministic given grid + pose.
- **GA/ES loop** (`learning/trainer.ts`):
  - population **64**, elitism **top 4**, tournament selection (size 3), crossover rate **0.6**, mutation: Gaussian σ **0.15** per-weight at rate **0.1**.
  - each individual simulated headless for ≤ **K steps** (K ~ `4 × cells`) on the maze; **fitness** = `w1·(1 − normDistToExit) + w2·reachedExit + w3·(1/steps when reached) − w4·wallBumps` (weights in `learning/config.ts`).
  - `step()` = one generation; `stats()` exposes generation/bestFitness/bestSteps/solved; `champion()` returns best policy; `championPath()`/`attemptsPaths()` provide rollout cell-paths for rendering.
- **Determinism:** the trainer's RNG is seeded from `session.id` (population init, mutation, crossover, tournament all draw from it). Same seed ⇒ identical trajectory.

---

## 5. Determinism plan

`seed = session.id` → `makeRng(seed)` (seedrandom) → **separate, derived sub-RNGs** for morphology, maze, and GA (e.g. `makeRng(seed + ":morph")`, `":maze"`, `":ga"`) so adding/removing one subsystem's draws doesn't shift the others. Phase D gate: same `session.id` ⇒ identical creature + maze + evolution trajectory (assert in tests via hashing genome + grid + first-N gen stats).

---

## 6. Performance budget & LOD

- **Champion creature:** detailed (full rig + IK + gait). **One.**
- **Population:** logic-only (headless rollouts); on-screen, render at most **~8 ghost trails** (thin `Line`s, low opacity) — no extra creature meshes. Log if attempts are capped (no silent truncation).
- **Walls:** single `InstancedMesh` via drei `Instances`. Floor = one plane. Markers = a few meshes.
- **Canvas:** `dpr={[1, 1.5]}` + `AdaptiveDpr`; `frameloop="demand"` when idle/queued/completed, `"always"` only while actively evolving; **pause when off-screen** (IntersectionObserver) and on tab blur. Bloom at reduced resolution.
- **Targets:** ≥ 50 fps mid-range laptop; graceful mobile (smaller maze, `dpr` capped at 1, ghost trails off). Dispose all geometries/materials on unmount (verify no leak).

---

## 7. Colorblind cue set (hard constraint — never color alone)

| Meaning | Color | **Non-color cue(s)** |
|---|---|---|
| Creature / intelligence | teal `#17C4C4` | the only animated organic shape; brightness |
| Exit / goal | orange `#F0783D` | **ring + flag** shape; pulsing scale |
| Frontier / explored | dim teal | **wireframe** cells, low brightness |
| Solved path | bright teal | **solid thick line** (vs dashed attempts) |
| Dead-ends / failed attempts | — | **fade out** + thin dashed trails |
| Success | orange→teal | **scale pulse + "Solved" label** (Geist, `<Html>`) |
| HUD status | — | text labels: `Gen NN · fitness 0.00 · steps NN` in Geist Mono |

Lightness contrast does the heavy lifting; hue is secondary. Audited in Phase D.

---

## 8. Phase C — file-by-file task list (each sub-phase ends green: typecheck + lint + its test)

**C0 — React 19 upgrade.** Bump react/react-dom/@types to 19; bump recharts to ^2.15; `npm install`; resolve peer warnings. *Gate:* `tsc --noEmit` clean; `vite build` clean; manual smoke of every existing page (login → dashboard → all 8 features) — no regressions. Commit before touching the visual.

**C1 — Scaffold + render pipeline.** `palette.ts`, `rng.ts`, `config.ts`, `ErrorBoundary.tsx`, `scene/Stage.tsx` (Canvas/camera/fog/lights/OrbitControls), `scene/Effects.tsx` (Bloom+Vignette), `scene/useReducedMotion.ts`, `scene/usePerf.ts`, `SessionVisual.tsx` (renders a single glowing placeholder mesh), `index.ts`. Add `features.session3dVisual` flag to `lib/config.ts`. Mount lazily in `SessionPage` behind the flag. *Gate:* canvas mounts/unmounts cleanly; bloom/theme correct; FPS HUD shows; flag off ⇒ zero three.js in page chunk (inspect build output).

**C2 — Maze.** `maze/generate.ts` (recursive-backtracker → Grid), `maze/sensors.ts`, `maze/Maze.tsx` (instanced walls, floor, start/exit markers with ring/flag shape), `maze.test.ts`. *Gate:* same seed ⇒ identical maze; maze fully connected; test green.

**C3 — Creature morphology & rig.** `creature/genome.ts`, `creature/parts.ts`, `creature/assemble.ts` (2-bone IK rig), `creature/Creature.tsx` (static pose), `creature.test.ts`. *Gate:* 2/4/6/8-leg bodies all assemble; visible diversity across seeds; test green.

**C4 — Gaits.** `creature/gaits.ts` (biped / quadruped trot / hexapod tripod / octopod tetrapod), wire foot-target stepping + sine-arc lift + body bob/lean + idle into `Creature.tsx`. *Gate:* each leg count walks believably (visual check at 4 seeds, one per leg count).

**C5 — Learning core (headless-first).** `learning/types.ts`, `learning/mlp.ts`, `learning/placeholderAlgorithm.ts`, `learning/fitness.ts`, `learning/trainer.ts`, `learning/localSource.ts`, `trainer.test.ts`. *Gate (the key one):* **headless** — fixed seed ⇒ best fitness strictly improves over generations and the maze is solved within a generation cap, with **no rendering**.

**C6 — Wire visuals to the GA.** Champion creature follows `championPath()` with its gait each generation; `scene/GhostTrails.tsx` for capped attempts; `scene/Hud.tsx` (gen/fitness/steps/"Solved" in Geist). Bind phases to `status`/`progress`: `queued`→idle, `running`→evolving, `completed`→at exit + celebrate, `failed`→reset. Apply the full colorblind cue set. *Gate:* start a session → creature + maze appear → generations tick → champion visibly improves → reaches exit → success state.

**C7 — Remote seam + polish.** `learning/remoteSource.ts` (typed stub; "waiting for engine" state) + a module config switch (`local` default). Then: colorblind audit, `prefers-reduced-motion` fallback (static hero frame), mobile DPR/instancing path, dispose-on-unmount verified, `frameloop="demand"` + off-screen/tab-blur pause, error boundary smoke (force a throw). *Gate:* all of Phase D below.

---

## 9. Phase D — verification gates (before PR)

- Build/typecheck/lint clean; **engine (`apps/api`) untouched and still runs**; dashboard bundle unaffected when the visual isn't shown (lazy split confirmed in `dist` output).
- **Headless GA test passes:** fixed seed ⇒ fitness improves and maze solved.
- **Determinism:** same `session.id` ⇒ identical creature + maze + evolution trajectory (hash assertion).
- **Lifecycle:** mount/unmount no leaks (geometries/materials disposed); FPS within budget; graceful mobile; `prefers-reduced-motion` respected (JS-level).
- **Colorblind pass:** exit, frontier, solved path, success each carry a non-color cue.
- **Smoke:** full happy path on 2+ seeds (different creatures + leg counts).
- **Regression:** every existing page still works post-React-19 (re-check from C0).

---

## 10. Branch, commits, PR

- **Branch:** `feat/session-3d-visual` off `main` (never commit to `main`).
- **Commits:** Conventional Commits, small & green, one sub-phase-ish each, e.g. `feat(web): React 19 + R3F v9 upgrade`, `feat(session-visual): seeded maze + sensors`, `feat(session-visual): headless GA trainer + tests`. Co-author trailer per repo convention.
- **PR `feat/session-3d-visual → main`:** summary; screen recording/GIF of 2+ seeds (different creatures + leg counts evolving to solve their maze); performance numbers; Phase D checklist ticked; explicit docs for the two seams — **how to drop the real model into `Algorithm`** and **how to switch `TrainingSource` to `remote`** when the engine streams (link the proposed `TrainingUpdate` contract). Request review; **squash-merge** when green; delete the branch.

---

## 11. Risks & mitigations

- **React 19 upgrade regressions** (new this session) → C0 is isolated, committed, and smoke-tested across all pages before any visual work; recharts bumped for peer compat.
- **Procedural locomotion polish** → simple analytic 2-bone IK + known gait patterns; visual check per leg count.
- **Perf/jank in the dashboard** → instancing, lazy split, `frameloop="demand"`, capped DPR, off-screen pause, logic-only population.
- **Over-animation reading "AI-generated"** → single signature moment (emerge / path ignites) + reduced-motion fallback.
- **GA not actually learning** → headless test is the gate; tune params in `learning/config.ts` until fitness reliably improves & solves across seeds.

---

## 12. Definition of done

A self-contained, lazy-loaded hero visual on `/session`: a Spore-like creature (correct 2/4/6/8-leg gaits, fixed per session) whose brain is evolved by a **real headless GA** (placeholder algorithm) to solve a seeded maze — on-brand, colorblind-safe, performant, deterministic per `session.id` — with documented seams to (1) drop in the real algorithm/model and (2) drive it from engine training telemetry later. App upgraded to React 19 + R3F v9 with no page regressions. Merged via reviewed, squash-merged PR; engine untouched.
