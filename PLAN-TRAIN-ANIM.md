# PLAN-TRAIN-ANIM.md — Compute/Train Session Animation ("genome strings evolving")

Implementation plan for the **compute/train session animation** — option B, *genome strings evolving*: rows of Geist Mono genome/seed strings that mutate, where **fitter genomes highlight and propagate** generation over generation, using the **same canvas-2D glyph-noise → highlight technique as the hero** (`EmergenceField` / `TokenResolution`), reimplemented as a self-contained module. Built on `RESEARCH-TRAIN-ANIM.md`. **Approve this before any Phase C coding.**

## Locked decisions (this session)
- **Renderer: canvas-2D**, Geist Mono glyph rows. (Resolved in A2 — the in-repo hero is canvas-2D; no WebGL/shaders.)
- **Mount: a new dedicated section/route** — `/session/train`, a thin page that reuses session-fetch logic and lazily mounts the visual; a link to it from `/session`. Flag-gated by `features.sessionTrainVisual`. Distinct from the maze's `/session` hero. *(User decision.)*
- **RNG: `@sagi/evolution`** (`makeRng`/`subRng`/`gaussian`) — zero new dependencies. *(User decision.)*
- **Data: deterministic local `PopulationSim` now; `PopulationSource = remote` a typed stub** mirroring the existing `TrainingSource` seam.
- **Determinism from `seed = session.id`.**
- **No new npm dependencies** (`simplex-noise` already installed; RNG via `@sagi/evolution`).

---

## 1. Module placement & boundary

```
apps/web/src/features/session/train-visual/        # self-contained; sibling of visual/ (the maze)
  GenomeField.tsx        # default export — the ONLY thing the page imports (lazily). Owns the canvas + RAF loop.
  index.ts               # re-exports GenomeField + public types
  palette.ts             # typed colour constants mirroring tokens.css (no hardcoded hex elsewhere)
  config.ts              # module-local tunables (sim params, glyph metrics, perf budget, status mapping)
  ErrorBoundary.tsx      # local class error boundary (reuse the pattern from visual/ErrorBoundary.tsx)
  rng.ts                 # thin re-export of makeRng/subRng/gaussian from @sagi/evolution (single import site)

  sim/
    types.ts             # Seed, Genome, PopulationSim, PopulationSource, PopulationUpdate, PopulationStats
    PopulationSim.ts      # deterministic ES-like sim: reset/step/population/stats (HEADLESS)
    fitness.ts           # fitness function shape (target-string distance; see §4)
    localSource.ts       # PopulationSource = local (wraps PopulationSim)
    remoteSource.ts      # PopulationSource = remote (typed STUB; "waiting for engine")
    PopulationSim.test.ts # *** headless: fixed seed -> bestFitness improves & run is deterministic ***

  render/
    GlyphGrid.ts         # canvas-2D draw core: rows of cells, two-pass (noise grey / resolved white+teal), flip cadence
    useReducedMotion.ts  # matchMedia hook (reuse the shape from scene/useReducedMotion.ts)
    useInView.ts         # IntersectionObserver gate (reuse marketing/lib/useInView pattern) + tab-visibility
    usePerf.ts           # tiny FPS EMA sampler (dev readout)
    Hud.tsx              # DOM overlay (Geist Mono): generation / best fitness / population / evals/sec / status
```

**Boundary rules:** the page imports **only** `lazy(() => import("../features/session/train-visual"))`, inside `<Suspense>` + the module's `<ErrorBoundary>`. The module imports *up* only typed seams (`Session` shape via props `{ seed, status, progress }`, the `config` flag) and `@sagi/evolution` RNG — never reaches into other features. Canvas-2D only; no three.js in this path.

---

## 2. Dependencies
**None added.** `simplex-noise@^4` (installed) for the spatiotemporal scramble field; seeded RNG via `@sagi/evolution`. (If, in C2, importing RNG from `@sagi/evolution` proves awkward for the headless test runner, fall back to a direct `seedrandom@^3` + `@types/seedrandom` dev pin — flagged here, decided only if needed.)

---

## 3. Finalized contracts (`sim/types.ts`)

```ts
export type Seed = string;                            // == session.id; all RNG derives from makeRng(seed)

export interface Genome {
  id: string;
  chars: string;                                       // the visible genome row (fixed length L)
  fitness: number;                                     // 0..1; drives highlight + propagation
  highlighted: boolean;                                // resolved/stable (teal) vs noisy — derived: fitness >= HIGHLIGHT_T
  age: number;                                         // generations survived
}

export interface PopulationStats {
  generation: number;
  bestFitness: number;          // 0..1
  populationSize: number;
  evaluationsPerSec: number;    // = populationSize * generationsPerSec (display)
  highlightedFraction: number;  // 0..1 — fraction of rows resolved (a non-colour progress read)
}

export interface PopulationSim {                       // deterministic ES-like sim (local default)
  reset(seed: Seed): void;
  step(): void;                                         // one generation: mutate -> evaluate -> select -> propagate
  population(): readonly Genome[];
  stats(): PopulationStats;
}

export interface PopulationUpdate extends PopulationStats {
  genomes?: ReadonlyArray<Pick<Genome, "id" | "chars" | "fitness">>;  // optional; remote may stream rows or only stats
}

export type PopulationSource =
  | { kind: "local"; sim: PopulationSim }
  | { kind: "remote"; subscribe(seed: Seed, cb: (u: PopulationUpdate) => void): () => void };

// GenomeField.tsx
export interface GenomeFieldProps {
  seed: Seed;                                           // session.id
  status: "queued" | "running" | "completed" | "failed";
  progress: number;                                     // 0..1 (phase gate; the sim drives the real trajectory)
}
```

This mirrors the runbook's architecture and the existing `TrainingSource` shape, so the engine swap is a one-file change (`config.populationSource: "local" | "remote"`).

---

## 4. The simulation spec (`sim/PopulationSim.ts`, headless-first)

A deterministic, ES-like **string-evolution** sim — real selection/mutation/crossover over glyph strings (not faked).

- **Charset:** `"abcdefghijklmnopqrstuvwxyz0123456789-"` (the seed/genome register from `TokenResolution`).
- **Genome:** fixed length `L = 24` chars. Population `N = 28` rows (one screen of rows; tune in `config.ts`).
- **Hidden target:** a per-seed **target string** `T` of length `L`, drawn from `subRng(seed, "target")`. Fitness = fraction of positions where `genome.chars[i] === T[i]` (Hamming similarity, 0..1). The target is the "signal" the noise resolves toward — the visible analogue of the hero's organism SDF. (Target is never shown as text; only the resolving rows are.)
- **Init:** each genome random from `subRng(seed, "init:"+i)`.
- **Generation `step()`** (deterministic, RNG from `subRng(seed, "ga")` advanced each gen):
  1. **Evaluate** fitness of every genome vs `T`.
  2. **Select**: sort by fitness; keep **elite** top `E = 3` unchanged.
  3. **Propagate (crossover/selection)**: each non-elite row is rebuilt by **tournament-picking** a fitter neighbour and **copying a contiguous run** of its correct/locked positions into the weaker row (selection + crossover = "fitter genomes propagate their characters into weaker neighbours"). Positions already matching `T` in a high-fitness parent are the ones that "lock".
  4. **Mutate**: with per-position rate `μ = 0.08`, replace a char with a random charset char (weak rows scramble more; elites barely mutate). Mutation pressure scales **down** as a row's fitness rises (resolved rows stop scrambling — the hero's fast-but-stable cadence).
  5. Increment `age` for survivors; recompute `highlighted = fitness >= HIGHLIGHT_T` (`0.7`).
- **Trajectory:** bestFitness is **monotonic non-decreasing** (elitism guarantees it) and reaches ~1.0 within a generation cap (`maxGenerations = 60`). The field visibly resolves noise → signal over generations.
- **Determinism:** derived sub-RNGs per concern (`target`, `init:i`, `ga`) so adding/removing a draw in one place doesn't shift the others (same discipline as PLAN-3D §5).

**Mapping session `status`/`progress` → behaviour** (`config.ts`):
| status | field behaviour | generation rate | HUD |
|---|---|---|---|
| `queued` | **idle**: pure glyph noise, slow flips, no highlights, gen 0 | 0 gen/s (no `step()`) | "queued · 0 gen" |
| `running` | **evolving**: `step()` on a throttle; rows highlight & propagate; bestFitness climbs | `genPerSec` eased by `progress` (e.g. `1 + 5*progress` gen/s) | live gen / fitness / evals/sec |
| `completed` | **resolved**: field mostly highlighted; a **breakthrough pulse** on entry (see §6) | 0 (frozen at final gen) | "completed · best 0.9x" |
| `failed` | **reset**: field scrambles back toward noise, dim; gen frozen | 0 | "failed" + label |

`progress` eases the generation rate and the highlighted-fraction target so the visual **reads as the session's compute doing work**, not a decorative loop.

---

## 5. Hero-matched render spec (`render/GlyphGrid.ts` + `GenomeField.tsx`)

Reproduces the **exact `EmergenceField` mechanics**, applied to discrete rows:

- **Canvas-2D**, DPR-aware (`min(devicePixelRatio, 2)`, `setTransform`). Font `'Geist Mono Variable', monospace`, `textAlign:left`, `textBaseline:middle`. Cell metrics from `config` (monospace advance ≈ `fontSize*0.6`; row height ≈ `fontSize*1.6`).
- **Layout:** `N` rows, each `L` glyph cells, centred; a left-edge `fade` ramp (smoothstep) as in the hero. Each cell carries `{ ch, flip, base, bright }`.
- **Per-cell `bright`** = its genome's fitness, optionally weighted so **locked (target-matching) positions** read brightest (per-position resolve, like `TokenResolution`'s word snapping). 
- **Flip cadence (brightness-dependent, from the hero):** bright cells reflip every **70–220ms** (alive shimmer); dim cells every **360–1860ms** (barely twitch). Resolved rows show their **stable** chars (the genome's actual chars), noise rows show random charset chars — so resolution is legible as *motion settling*, a non-colour cue.
- **Two-pass draw (from the hero):**
  1. Pass 1 — `bright ≤ 0.08`: grey `noiseColor` (`--text-faint` family) at alpha `base*fade` (~0.2–0.42).
  2. Soft **teal radial-gradient glow** behind high-fitness rows (alpha ~`0.28*highlightedFraction`).
  3. Pass 2 — `bright > 0.08`: `organismColor` white→teal at alpha `0.45 + 0.55*bright`; the brightest/locked cells tinted toward `--sagi-teal`.
- **Throttle ~20–30 fps** (`now - last < 33–50` skip) — the field is text-dense; matches the hero's deliberate `~20fps`.
- **HUD (`Hud.tsx`, DOM overlay, Geist Mono):** `generation NN · best 0.00 · pop NN · NN eval/s` + a status chip (icon + label + colour, never colour alone), and a small dev FPS readout. Numbers are tabular-nums.

---

## 6. Colourblind cue set (hard constraint — never colour alone)

| Meaning | Colour | Non-colour cue(s) |
|---|---|---|
| Noise / unresolved genome | grey `--text-faint` | **slow flicker**, low brightness, scrambling chars |
| Resolving / highlighted genome | teal `#17C4C4` | **fast shimmer → settled stable chars**, high brightness, top row position (sorted by fitness) |
| Best fitness | teal | **numeric readout climbing** (Geist Mono), brightest row |
| Breakthrough / new best (on `completed`) | brief orange `#F0783D` pulse | **scale/opacity pulse + "breakthrough" label** (Geist Mono) + a `▲` marker — colour is redundant |
| Status (queued/running/completed/failed) | teal/orange/grey | **icon + text chip** (●/▶/✓/✕ + word) |

Lightness + motion (scramble→settle) + position (fitness-sorted rows) + numerals carry the state; hue is redundant. Orange appears **only** for the economy/breakthrough moment (DESIGN.md axis rule). Audited in Phase D.

**Reduced motion (`prefers-reduced-motion`):** no RAF loop. Render **one calm, mostly-resolved static frame** (rows at their final/current fitness, stable chars, no flicker) + the live numeric HUD. Mirrors `EmergenceField`'s frozen-frame fallback.

---

## 7. Performance budget
- Canvas capped to the container; `N*L ≈ 28*24 ≈ 672` cells (« the hero's up-to-11k). Trivially cheap.
- **Pause when hidden:** `useInView` (IntersectionObserver) **+** `document.visibilitychange` gate the RAF body (`if (!visible) return`). 
- Throttled draw (~20–30fps). RAF + listeners + observer disposed on unmount. No GPU resources to free (canvas-2D).
- Sim `step()` is O(N·L) per generation, throttled to ≤ ~6 gen/s — negligible.

---

## 8. Phase C — file-by-file task list (each sub-phase ends green: `tsc --noEmit` + lint + its test)

**C1 — Scaffold + hero-matched idle field.** `palette.ts`, `rng.ts`, `config.ts`, `ErrorBoundary.tsx`, `render/useReducedMotion.ts`, `render/useInView.ts`, `render/usePerf.ts`, `render/GlyphGrid.ts` (canvas core, idle noise only), `GenomeField.tsx` (mounts canvas, RAF loop, pause-when-hidden), `index.ts`. Add `features.sessionTrainVisual` to `lib/config.ts`. Add route `/session/train` + thin `TrainSessionPage.tsx` (reuses session fetch; lazy + Suspense + ErrorBoundary) and a link from `/session`. *Gate:* canvas mounts/unmounts cleanly; pure glyph noise renders on near-black at ~20fps; pauses off-screen; flag off ⇒ route renders nothing/redirect and zero canvas work; FPS readout shows.

**C2 — Population sim (headless-first).** `sim/types.ts`, `sim/fitness.ts`, `sim/PopulationSim.ts`, `sim/localSource.ts`, `sim/PopulationSim.test.ts`. *Gate (key):* **headless** — fixed seed ⇒ `bestFitness` strictly non-decreasing and reaches ≥0.95 within `maxGenerations`; two runs with the same seed produce identical population/stats (deep-equal); no rendering imported in the test.

**C3 — Wire sim → field (the evolution read).** Map genomes to rows; per-cell `bright` from fitness; fitter rows highlight (stable chars, teal, fast shimmer) and propagate; weak rows scramble/fade; field sorts/stabilises over generations. Add `Hud.tsx` (gen / best fitness climbing / pop / evals/sec). Bind generation rate / highlighted fraction to `status`/`progress` per §4. `populationSource = local`. *Gate:* on a running session the field visibly resolves noise→signal, bestFitness climbs in the HUD, feel matches the hero (scramble→settle + teal highlight + glow).

**C4 — Session-state moments + remote seam.** Idle on `queued`; evolving on `running`; **breakthrough pulse** on `completed` (brief orange scale/opacity pulse + "breakthrough" label + `▲`, with non-colour cue); scramble-back on `failed`. Add `sim/remoteSource.ts` (typed stub; compiles; "waiting for engine") + `config.populationSource` switch. *Gate:* all four status states behave; breakthrough fires once on completion; remote stub typechecks and is a no-op.

**C5 — Polish.** Colourblind audit (state legible greyscale); `prefers-reduced-motion` static frame + live HUD; perf (cap density, throttle, pause-when-hidden, dispose-on-unmount verified); error boundary smoke (force a throw → fallback, page survives); final feel-match pass vs the hero (`EmergenceField`). *Gate:* Phase D below.

---

## 9. Phase D — verification gates (before PR)
- Build / `tsc --noEmit` / lint clean; module isolated; **the maze visual, `/session`, and the rest of the app unaffected**; canvas pauses when hidden.
- **Headless sim test passes:** fixed seed ⇒ bestFitness improves over generations and the trajectory is deterministic.
- **Determinism:** same `session.id` ⇒ identical genomes, mutations, and fitness curve (hash/deep-equal assertion).
- **Feel-match:** side-by-side with `EmergenceField` — scramble/noise + highlight/resolve read as the **same technique**; colours/fonts from tokens.
- **Distinctness:** clearly different medium from the 3D maze and a different form from the network table (genome rows, not a node graph).
- **Live binding:** generation rate / highlighted fraction / fitness track `status`/`progress`; queued/running/completed/failed behave; breakthrough fires.
- **Colourblind pass** (legible without hue) and **reduced-motion** fallback work.

---

## 10. Branch, commits, PR
- **Branch:** `feat/train-session-animation` off `main` (never commit to `main`).
- **Commits:** Conventional Commits, small & green, ~one sub-phase each (`feat(train-visual): hero-matched glyph noise field`, `feat(train-visual): headless ES-string sim + tests`, `feat(train-visual): wire sim to field + HUD`, …). Co-author trailer per repo convention.
- **PR `feat/train-session-animation → main`:** summary; **screen recording of 2+ seeds** (genomes evolving, fitness climbing, breakthrough) **next to the hero capture** to show the technique match; Phase D checklist ticked; docs for the **`PopulationSource = remote`** seam (the `PopulationUpdate` contract the engine must emit, and how to flip `config.populationSource`). Request review; **squash-merge** when green; delete the branch.

---

## 11. Risks & mitigations
- **Reads "decorative" not "live"** → bind generation rate + highlighted fraction + fitness to `status`/`progress`; idle when queued; breakthrough on completion.
- **Reads like the maze / network graph** → different medium (2D glyph rows) and form (no nodes/edges); A2 feel-match is vs the hero, not the maze.
- **Sim doesn't actually learn** → headless test is the gate (monotonic bestFitness + solved within cap); elitism guarantees monotonicity; tune μ/E/tournament in `config.ts`.
- **Over-animation** → single signature (scramble→settle + one breakthrough pulse) + reduced-motion frozen frame; throttled fps.
- **RNG import friction in test runner** → fallback to a direct `seedrandom` pin (noted in §2), decided only if it bites.

---

## 12. Definition of done
A self-contained compute/train session animation at **`/session/train`** — rows of genome/seed strings that mutate, with **fitter genomes highlighting and propagating** generation over generation (best fitness climbing) — using the **same canvas-2D glyph-noise → highlight technique as the hero**, reimplemented in our stack and sourced from `tokens.css`. Deterministic per `session.id`, colourblind-safe, reduced-motion-aware, performant, bound to real session state, and clearly distinct from both the 3D maze and the network page. The sim is tested headless; a `PopulationSource = remote` seam allows real engine telemetry later. Merged via a reviewed, squash-merged PR; maze and engine untouched.
</content>
