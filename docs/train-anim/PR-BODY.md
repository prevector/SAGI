# feat: compute/train session animation — genome strings evolving

## What

Adds the **compute/train session animation** (option B, *genome strings evolving*) at a new **`/app/session/train`** route: rows of Geist Mono genome strings that mutate, where fitter genomes highlight and propagate generation over generation — noise resolving into signal, best fitness climbing.

It reuses the **same canvas-2D glyph-noise → highlight technique as the site hero** (`marketing/visuals/EmergenceField`), reimplemented as a self-contained module — no Framer code lifted, colours/fonts sourced from `tokens.css`. Deterministic per `session.id`, colour-blind-safe, reduced-motion-aware, bound to live session state, and clearly distinct from both the 3D maze (`/app/session`) and the network graph.

Built per `RESEARCH-TRAIN-ANIM.md` → `PLAN-TRAIN-ANIM.md` (approved).

## Technique match (hero)

The in-repo hero is canvas-2D: a Geist Mono glyph field where a per-cell brightness drives a two-pass draw (grey noise → white/teal resolved) + a soft teal glow + a brightness-dependent flip cadence (resolved cells shimmer fast, noise cells barely twitch). This module applies that exact mechanic to discrete genome rows, with brightness = genome fitness (locked positions read brightest, like the hero's `TokenResolution` scramble→resolve).

## How it works

- **`features/session/train-visual/`** — self-contained, lazy-loaded, error-boundary-isolated, flag-gated (`features.sessionTrainVisual`).
  - `render/GlyphGrid.ts` — the hero-matched canvas draw core.
  - `sim/PopulationSim.ts` — a deterministic **(μ+λ) ES-like string-evolution sim** (tournament selection + segment crossover = propagation + fitness-scaled mutation) toward a hidden per-seed target. `bestFitness` is monotonic and converges to ≥0.95 within the 60-gen cap.
  - `usePopulation.ts` — drives the sim at a rate bound to `status`/`progress`; maps genomes → renderer rows + HUD stats.
  - `sim/{types,localSource,remoteSource}.ts` — the `PopulationSource` seam (local now, typed `remote` stub for engine telemetry later — same pattern as `TrainingSource`).
- **Session-state moments:** queued → idle noise; running → evolving; completed → snap-resolve + a brief orange **breakthrough** pulse (`▲ breakthrough` label, non-colour cue); failed → scramble-back.
- New `/app/session/train` route + thin `TrainSessionPage` + a link from `/app/session`.

## Verification (Phase D) — all green

- `tsc --noEmit` + `vite build` clean; lazy chunk split confirmed.
- Headless sim test (`sim/PopulationSim.test.ts`): monotonic improvement, solve-within-cap, **determinism** (same `session.id` → identical population), reset reproducibility; convergence ≥0.95 confirmed across 10 arbitrary seeds.
- Browser (Playwright, mock): live binding — `gen 2→13→60`, `best 0.25→0.75→1.00`, `eval/s 314→528`, then completed; breakthrough label fires; canvas paints; **no console errors**.
- **Colour-blind:** greyscale-desaturated frame stays legible (brightness + position + text HUD carry state, hue redundant) — see `docs/train-anim/03-colourblind-greyscale.png`.
- Reduced-motion: static frame reflecting session state, no loop.
- Distinct medium from the maze; distinct form from the network table.

Stills + the `PopulationSource = remote` seam docs are in **`docs/train-anim/`**.

## Notes
- No new npm dependencies (`simplex-noise` already present; seeded RNG via `@sagi/evolution`).
- The 3D maze visual, the engine (`apps/api`), and all existing pages are untouched (full monorepo suite: 78/78).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
