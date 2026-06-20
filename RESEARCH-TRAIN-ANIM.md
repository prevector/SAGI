# RESEARCH-TRAIN-ANIM.md — Compute/Train Session Animation ("genome strings evolving")

Phase A research (read-only) for the **compute/train session animation** — option B, *genome strings evolving*. Outputs: a codebase map, the **hero teardown** (renderer/glyph set/motion/metrics/colour), the real-telemetry seam, and **open questions** to resolve before `PLAN-TRAIN-ANIM.md`.

**Headline finding:** the hero animation is **not** a Framer black box — it was already reimplemented natively in `apps/web` as **`src/marketing/visuals/EmergenceField.tsx`** (and `TokenResolution.tsx`). These are real, readable React + **canvas-2D** source in our stack. The renderer question the runbook flagged is therefore **settled: canvas-2D, Geist Mono glyph field.** We match this exact technique; we do **not** need to observe/scrape the live Framer site or lift its bundle.

---

## A1 — Codebase map

### Stack & build
- `apps/web` = **Vite 7 + React 19.2 + TypeScript** (ES2022, `jsx: react-jsx`). Vitest for unit tests.
- Monorepo packages: `@sagi/shared` (domain types), `@sagi/evolution` (GA trainer + maze + seeded RNG), `@sagi/ledger`.
- Path of interest: `apps/web/src/`.

### Where the session view lives
- **`src/pages/SessionPage.tsx`** — the `/session` route. Renders a **hero `<Canvas>` visual** at the top (the 3D maze) above a "start session" form, bound to the latest session (running → most recent). Gated by `config.features.session3dVisual`, lazy-loaded so three.js stays out of the main chunk.
- **`src/features/session/SessionWidget.tsx`** — compact dashboard widget.
- **The existing 3D maze visual** lives in **`src/features/session/visual/`** — this is the *inference/learning* session visual (PLAN-3D.md): a Spore-like creature evolved by a headless GA to solve a seeded maze. Structure to mirror for our module:
  - `SessionVisual.tsx` (default export, the only thing the page imports, lazily), `index.ts`, `palette.ts`, `config.ts`, `ErrorBoundary.tsx`.
  - `scene/` — `Stage.tsx` (Canvas/camera/lights/frameloop), `useReducedMotion.ts`, `usePerf.ts` (FPS EMA), `anim.ts` (damp/spring), `Hud.tsx`.
  - `learning/` — `localSource.ts`, `remoteSource.ts` (the seam, see below).
  - `maze/`, `creature/` — domain-specific.

### The `Session` type (`packages/shared/src/domain.ts`, re-exported via `src/lib/types.ts`)
```ts
export type SessionStatus = "queued" | "running" | "completed" | "failed";
export interface Session {
  id: ID;                    // == seed for the visual
  userId: ID; bountyId?: ID; startedAt: ISODate;
  status: SessionStatus;     // drives the visual phase
  computeAllocated: number;  // GFLOPS
  durationMin?: number;
  progress: number;          // 0..1 (nominal; the sim drives the real trajectory)
  tokensEarned?: number; result?: string;
}
```
`SessionVisualProps` for the existing 3D visual is exactly `{ seed: string; status; progress }` — **we reuse this prop contract verbatim**.

### Design tokens & fonts
- **`src/styles/tokens.css`** — CSS variables, source of truth. Relevant:
  - `--sagi-teal:#17C4C4` · `--sagi-teal-deep:#159999` · `--sagi-teal-pale:#EFF9F9`
  - `--sagi-orange:#F0783D` · `--sagi-orange-deep:#C85E2A`
  - `--sagi-dark:#041414` · `--sagi-dark-raised:#0b1e1e` · `--surface-2:#0e2626` · `--sagi-black:#000000`
  - `--text:#faf8f0` · `--text-muted:#9fb6b6` · `--text-faint:#759090`
  - `--accent:var(--sagi-teal)` (intelligence axis) · `--accent-2:var(--sagi-orange)` (economy axis)
  - `--font-mono:"Geist Mono Variable", ui-monospace, monospace` · `--font-sans:"Geist Variable", …`
  - motion: `--motion-fast:150ms` `--motion-base:300ms` `--motion-slow:600ms` · `--ease-out:cubic-bezier(0.22,1,0.36,1)`
- **Fonts loaded** in `src/styles/globals.css` via `@import "@fontsource-variable/geist"` + `@import "@fontsource-variable/geist-mono"`. The canvas font string used by the hero is **`'Geist Mono Variable', monospace`** — we use the same.
- The existing 3D visual mirrors tokens into a typed `palette.ts` so no hex is hardcoded in scene code. **We do the same** (a local `palette.ts`).

### Config / feature-flag pattern (`src/lib/config.ts`)
```ts
export const config = {
  brand: { name: "SAGI", tagline: "A distributed, open search for AGI" },
  useMock: import.meta.env.VITE_USE_MOCK === "1",
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "",
  features: { realtimeNetwork: true, sessions: true, session3dVisual: true, ledgerExplorer: true },
} as const;
```
→ We add a sibling flag, e.g. `features.sessionTrainVisual`.

### The mock-first → real-telemetry seam (this is the model for `PopulationSource`)
The runbook's `PopulationSource` is a direct analogue of an **existing, working pattern**: `TrainingSource` in `@sagi/evolution` (`packages/evolution/src/learning/types.ts`):
```ts
export type TrainingSource =
  | { kind: "local"; trainer: Trainer }
  | { kind: "remote"; subscribe(seed: Seed, cb: (u: TrainingUpdate) => void): () => void };
```
- `localSource.ts` wraps a headless `GaTrainer`; `remoteSource.ts` is a typed **stub** (`subscribe` returns a no-op cleanup, "engine telemetry not wired yet").
- A module-local switch selects it: `VISUAL_CONFIG.trainingSource: "local" | "remote"`. Swapping to real engine telemetry is intended to need **zero scene changes**.
- **We replicate this exactly** for `PopulationSource` (`local` GA-string sim now, `remote` stub later).

### Real ES population / fitness available later?
- `packages/evolution` exposes a **real headless GA** (`GaTrainer`, `MLP` policy, `fitnessOf`, seeded `makeRng`) — but it is **maze-policy** shaped (`championPath`, `attemptsPaths`), not genome-string shaped. Not a drop-in for genome rows.
- `src/frontends/gene-terminal/` (a separate Dockview "gene lab" frontend, **not** the session page) has an **ES-flavoured mock state**: `terminal.es = { generations, populationPairs, sigma }`, plus `generation`, `bestLoss`, `sampledLoss`, `history` (`TrainingPanel.tsx`). This confirms the product's mental model is **ES/evolution-strategy with a fitness/loss trajectory and a generation counter** — exactly our HUD vocabulary. It is a mock today.
- **Conclusion:** *no* real genome-string ES stream exists yet → **local seeded sim now**, `PopulationSource = remote` is a typed stub. The engine (built by the co-founder) is the eventual source; our `PopulationUpdate` contract documents what it must emit.

### Animation / perf conventions (reuse, don't reinvent)
- **`prefers-reduced-motion`**: `scene/useReducedMotion.ts` (matchMedia hook, listens for changes). Marketing visuals also check `matchMedia` inline. JS animation is **not** covered by the CSS rule, so this hook is mandatory.
- **Pause when hidden**: two mechanisms in the codebase —
  - 3D: `Stage.tsx` uses `IntersectionObserver` (on-screen) **+** `document.visibilitychange` (tab) → switches `frameloop` to `"demand"`.
  - Marketing canvas: `useInView` hook (IntersectionObserver, dependency-free) gates the RAF body (`if (!inView) return`).
- **FPS sampling**: `usePerf.ts` — EMA-smoothed FPS, throttled state updates; quality ladder downgrades one-way under sustained < 42 fps.
- **Dispose on unmount**: `useEffect` cleanups cancel RAF, remove listeners, disconnect observers. Canvas-2D needs only RAF/listener cleanup (no GPU buffers to free).

### Dependencies (`apps/web/package.json`) — what's already available
- `simplex-noise@^4.0.3` — **already installed** (declared dep; not yet used elsewhere). ✅ no new dep needed for noise.
- `seedrandom@^3.0.5` — present **transitively** via `@sagi/evolution` (which also re-exports `makeRng`/`subRng`/`gaussian`). We can import seeded RNG from `@sagi/evolution` (preferred — no new dep) **or** pin `seedrandom` directly.
- `@fontsource-variable/geist`, `@fontsource-variable/geist-mono`, `react@19`, `lucide-react`, `recharts`, `three`/R3F (only the 3D path).
- **Net new deps for this work: likely zero.** (simplex-noise present; RNG via `@sagi/evolution`.)

---

## A2 — Hero teardown (the style + technique to match)

Source of truth: **`src/marketing/visuals/EmergenceField.tsx`** (hero background) and **`src/marketing/visuals/TokenResolution.tsx`** (the "one model scaled / a population evolving" seed-glyph resolve). Both are ported-from-Framer **reimplementations already in our stack**.

### Renderer
- **Canvas-2D.** `<canvas>` with `getContext("2d")`, full-bleed inside an `aria-hidden` wrapper. DPR-aware (`Math.min(devicePixelRatio, 2)`, `setTransform(dpr,…)`). No WebGL, no shaders, no DOM glyph spans. **→ Our renderer = canvas-2D. The runbook's open "renderer choice" is resolved.**

### Glyph set
- EmergenceField default: `"0123456789ABCDEFGHJKLMNPRSTXZ<>[]{}/\\=+*-·#%?:;"` — hex-ish uppercase alphanumerics + code symbols.
- TokenResolution scramble charset: `"abcdefghijklmnopqrstuvwxyz0123456789-"` — **lowercase alphanumeric**, matching the seed strings (`fc3fne8s8cwr…`, `helix-2f`, `aleph-knot`).
- **For genome rows we use the lowercase-alphanumeric set** (the seed/genome register), Geist Mono.

### Motion — the two mechanics we must reproduce
1. **Glyph noise / scramble (the idle field).** Every cell holds a char and a `flip` timestamp. When `now > cell.flip`, it picks a new random glyph and reschedules. **Flip cadence is brightness-dependent:** bright (resolved) cells reflip fast (`70 + rand*150` ms ≈ 70–220ms); dim (noise) cells reflip slowly (`360 + rand*1500` ms ≈ 0.36–1.86s). This *is* the "noise → signal" cue: **resolved regions shimmer alive; noise regions barely twitch.** Throttled to **~20 fps** (`now - last < 50` skip) because the field is dense.
2. **Highlight / resolve (the signal).** A scalar **`bright` field** per cell (in the hero, computed from an organism SDF; **for us, from genome fitness**) drives three coupled things: (a) **two-pass colour** — pass 1 draws `bright ≤ 0.08` cells in grey `noiseColor` at low alpha (`base*fade`, ~0.2–0.42); pass 2 draws `bright > 0.08` cells in `organismColor` (white) at alpha `0.45 + 0.55*bright`; (b) a **soft teal radial-gradient glow** blob behind the high-bright region (`glowColor`, alpha ~`0.28*glow`); (c) the **fast flip cadence** above. So "resolved" = brighter + whiter + teal-glowing + livelier — **four signals, only one of which is hue** (good for colourblind).
3. **TokenResolution scramble→resolve.** Right column renders `scramble(len)` (random charset chars) while `u < 0.45`, then snaps to the **stable target word** in teal once `u ≥ 0.45`; left column types tokens sequentially with a `▌` caret. Loops `cycleMs≈5200` with a pause. **This is the literal "seed string resolves" motion** — our per-genome "resolve to a stable highlighted string" is this mechanic, per-row, driven by fitness instead of a clock.

### Layout metrics
- Cell size `cs = max(8, round(10/density))`, grown until `cols*rows ≤ maxCells` (`3500` small / `11000` large). Font `= max(7, round(cs*0.82))`, `textAlign:center`, `textBaseline:middle`.
- A horizontal `fade` ramp (`smoothstep(0, 0.4*W, x)`) dims the left edge.
- Organism focus at `focusX=0.66`, radius `R = min(W,H)*0.3*scale`.
- For genome rows we adapt: **discrete rows of fixed-width glyph strings** (one genome = one row) rather than a free 2D field — but the per-cell brightness/flip/two-pass-draw model is identical.

### Colour / opacity (reconciled to DESIGN.md)
- `noiseColor "#6E8080"` (≈ `--text-faint` family) grey for noise; `organismColor "#FFFFFF"`; `glowColor "#17C4C4"` = `--sagi-teal`; `bgColor "#041414"` = `--sagi-dark`. All map cleanly to tokens. **We source every colour from a local `palette.ts` mirroring `tokens.css`** — teal `#17C4C4` for resolved/highlighted, orange `#F0783D` reserved for the economy axis / the breakthrough pulse, near-black bg.

### Reduced motion
- EmergenceField draws **one frozen frame** (`draw(0, true)` at `u=0.84`, a fully-emerged pose) and stops — no loop. We mirror: a calm, mostly-resolved static field + live numeric readouts.

### Capture note
- No screen recording was taken: the technique is fully specified by the **in-repo source above** (superior to observing the live Framer site — exact cadences, charsets, alphas, two-pass draw order are all readable). The live `https://sagi.network/` hero is the same visual; `WebFetch` of it returns only static HTML (animation is canvas JS), confirming there is nothing extra to extract there.

---

## Distinctness check (must differ from both neighbours)
- **vs the 3D maze** (`features/session/visual/`): different **medium** — 2D canvas glyph rows vs 3D WebGL creature/maze. ✅
- **vs the network page** (`features/network/`): that's aggregate stats + a node **table** (and the runbook forbids a node-and-edges graph here). Genome **rows of glyphs** are a different form entirely. ✅

---

## Open questions to resolve before/within Phase B

1. **Mount point — the big one.** The runbook frames two distinct session views ("compute/train" vs "inference/learning"), but the app currently has **one `/session` page showing the 3D maze**, and `Session` has **no field distinguishing a train vs inference session**. Where should the genome-strings visual live? Options:
   - (a) A **toggle/segmented control** on `/session` to switch the hero visual between "Maze (learning)" and "Genomes (training)" — both bound to the same session, flag-gated. *Lowest friction; keeps one page.*
   - (b) A **new route/section** (e.g. `/session/train` or a second hero block) dedicated to the compute/train animation.
   - (c) **Replace** the maze as the default session hero (not recommended — the maze is freshly built and is the "learning" visual).
2. **Real telemetry shape.** Confirm the engine will (eventually) emit a genome-string population + fitness (vs only scalar ES stats like the gene-terminal's `bestLoss`/`sigma`/`generation`). This sets the `PopulationUpdate` contract. Default assumption: it emits `{ generation, bestFitness, populationSize, evaluationsPerSec, genomes?: {chars,fitness}[] }`; if genomes aren't streamed, the remote source falls back to deriving display rows from stats.
3. **RNG dependency.** Prefer importing seeded RNG from **`@sagi/evolution`** (`makeRng`/`subRng`/`gaussian`, zero new deps) over a direct `seedrandom` pin — confirm that's acceptable (it couples this module to `@sagi/evolution`, already a dep of `apps/web`).

**Recommendation:** option **(a) toggle on `/session`** — it satisfies "clearly distinct from the maze" (you can A/B them side-by-side), reuses the existing mount/flag/lazy plumbing, and needs no `Session` schema change. Pending user confirmation, Phase B will plan against (a).
</content>
</invoke>
