# Compute/Train Session Animation — "genome strings evolving"

The visual at **`/app/session/train`** (`apps/web/src/features/session/train-visual/`): rows of Geist Mono genome strings that mutate; fitter genomes highlight and propagate generation over generation, using the same canvas-2D glyph-noise → highlight technique as the site hero (`marketing/visuals/EmergenceField`). See `PLAN-TRAIN-ANIM.md` for the full design.

## Verification stills (Playwright, mock mode)

| | |
|---|---|
| `01-evolving-early.png` | Early generation — mostly grey glyph noise on near-black (the hero idle look). |
| `02-noise-to-signal-gradient.png` | Mid-run — the fittest (top, fitness-sorted) genomes resolve to bright teal/white stable glyphs and propagate across the population; weaker rows still scramble grey. |
| `03-colourblind-greyscale.png` | The gradient frame desaturated — resolved rows stay legibly **brighter** than the noise with all hue removed (the colour-blind hard constraint). |
| `04-breakthrough.png` | Completion — `✓ completed` + `▲ breakthrough` (orange pulse, redundant with the label) as the population converges. |
| `05-completed.png` | Resolved field. |

**Live-binding check (headless):** a started session ran `gen 2 → 13 → 60`, `best 0.25 → 0.75 → 1.00`, `eval/s 314 → 528` (rate eased up by `progress`), then `completed`; canvas paint coverage rose as rows resolved; no console errors. The headless sim test (`sim/PopulationSim.test.ts`) covers monotonic improvement, solve-within-cap, determinism, and reset reproducibility; convergence to ≥0.95 was confirmed across 10 arbitrary seeds.

## Driving it from the real engine later (`PopulationSource = remote`)

The data layer is mock-first with a typed seam, mirroring the existing `TrainingSource` pattern:

- Today: `TRAIN_CONFIG.populationSource = "local"` runs the deterministic in-browser `PopulationSim` (seeded by `session.id`).
- Later: set it to `"remote"` and implement `sim/remoteSource.ts`'s `subscribe()` to open an SSE/WS channel (e.g. `GET /api/sessions/:id/training`), parsing each message into a `PopulationUpdate`:

  ```ts
  interface PopulationUpdate {
    generation: number; bestFitness: number; populationSize: number;
    evaluationsPerSec: number; highlightedFraction: number;
    genomes?: { id: string; chars: string; fitness: number }[]; // optional rows
  }
  ```

  `usePopulation` already branches on `populationSource` and maps updates to the renderer — **no `GenomeField` / renderer changes are needed**. If `genomes` is omitted, the HUD readouts still drive from the stats.
