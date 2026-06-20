# RESEARCH-3D.md — Phase A findings (read-only codebase research)

Research for the **SAGI Session 3D Visual** (creature evolving to solve a maze). This documents the real repo as it stands today, the integration points, and the open questions to resolve before `PLAN-3D.md`. Sources of truth read: `SAGI-session-3d-visual-research.md`, `DESIGN.md`, `SAGI-frontend-build-plan.md`, and the live `apps/web` / `apps/api` / `packages/shared` source.

---

## 1. Stack & build (what we're actually mounting into)

| Concern | Reality in repo | Implication for the visual |
|---|---|---|
| Monorepo | npm workspaces: `apps/web`, `apps/api`, `packages/shared`. Root `package.json` orchestrates builds. | The visual lives entirely inside `apps/web`. New deps go in `apps/web/package.json`. |
| Web build | **Vite 7** + `@vitejs/plugin-react` 4. `npm run dev -w @sagi/web` (port 5173). | Lazy `import()` → Vite auto-splits into a separate chunk. No `manualChunks` config today; the lazy boundary alone keeps three.js out of the main bundle. |
| **React** | **18.3.1** (`react`, `react-dom`, `@types/react` all 18.x). | ⚠️ **Critical correction to the plan doc.** R3F **v9 requires React 19**; we are on React 18 → must pin **`@react-three/fiber` v8**, **`@react-three/drei` v9**, **`@react-three/postprocessing` v2** (the React-18 line). Do **not** install the v9/React-19 generation. Alternative (not recommended): bump the whole app to React 19. |
| Language | TypeScript 5.9, `strict: true`, `noEmit` typecheck in CI (`tsc --noEmit -p tsconfig.json` runs before `vite build`). Bundler module resolution. | The whole module must typecheck under `strict`. The build will fail on any type error — good guardrail. |
| Styling | **CSS Modules + `styles/tokens.css`** (CSS custom properties). **No Tailwind** despite the build-plan mentioning it as optional. | In-canvas colors read from `DESIGN.md` hexes (three.js needs real color values, not CSS vars); any DOM chrome (HUD overlay, buttons) uses CSS Modules + the existing token vars. Define a small typed palette constant mirroring the tokens so colors are never hardcoded ad-hoc. |
| Fonts | `@fontsource-variable/geist` + `geist-mono`, imported in `styles/globals.css`. | In-canvas labels via drei `<Text>` need a font file URL or `<Html>` (which inherits Geist from the page). `<Html>` overlay is the lowest-friction way to get Geist + Geist Mono and is colorblind-label friendly. |
| Reduced motion | Global rule already in `globals.css` (`@media (prefers-reduced-motion: reduce)` kills CSS animation). | three.js animation is JS-driven and **not** covered by that CSS rule — the visual must check `window.matchMedia("(prefers-reduced-motion: reduce)")` itself and render a static/minimal frame. |
| Existing 3D deps | **None.** No `three`, R3F, drei, postprocessing, seedrandom, simplex-noise, or leva installed. | All new. Pin versions in Phase B against React 18. |

### Code-splitting pattern already in use
`apps/web/src/routes.tsx` lazy-loads every authenticated page:
```ts
const SessionPage = lazy(() => import("./pages/SessionPage"));
```
and `components/layout/AppShell.tsx` wraps the router `<Outlet/>` in a single `<Suspense fallback={<SkeletonLines/>}>`. **Pattern to mirror:** the visual is a default-exported component lazy-loaded *inside* `SessionPage`, behind its own `<Suspense>` + an error boundary, so three.js never enters the page chunk until the visual is actually shown.

---

## 2. Session integration points

- **Page:** `apps/web/src/pages/SessionPage.tsx` (route `/session`, lazy). Form (target bounty / compute slider / duration) on the left, a list of `Session` cards on the right. Polls `api.getSessions` every 800ms while any session is `running`.
- **Feature folder:** `apps/web/src/features/session/` — currently only `SessionWidget.tsx`. **This is where `visual/` goes** (matches the plan: `features/session/visual/`).
- **`Session` type** (`packages/shared/src/domain.ts`, re-aliased in `apps/web/src/lib/types.ts`):
  ```ts
  type SessionStatus = "queued" | "running" | "completed" | "failed";
  interface Session {
    id: ID; userId: ID; bountyId?: ID; startedAt: ISODate;
    status: SessionStatus; computeAllocated: number; durationMin?: number;
    progress: number; /* 0..1 */ tokensEarned?: number; result?: string;
  }
  ```
  → `SessionVisual` props map cleanly: `seed = session.id`, `status = session.status`, `progress = session.progress`. **There is no `seed` field** — `session.id` is the seed (see §5).
- **Seed quality:** mock ids are `s-<timestamp>-<counter>` (new) and `s-seed-<user>-<i>` (seeded history). Both are stable strings → fine for `seedrandom`. Same id ⇒ same creature + maze (the determinism guarantee).
- **Lifecycle the visual must bind to** (driven by `SessionPage` polling): `queued` → idle creature; `running` → evolving/solving with `progress` 0→1; `completed` → at exit + celebrate; `failed` → reset/stuck. Mock sessions demo-compress to ~7–15s, so the visual should look good at fast progress as well as slow.
- **Where to mount it** is an open question (see §6) — `SessionPage` today renders only the form + card list; there's no obvious slot, and no notion of a "selected/active" session. This needs a product decision.

---

## 3. Engine telemetry — the `remote` TrainingSource seam

**Finding: there is no training telemetry today, and no streaming transport of any kind.**

- The engine (`apps/api/src/server.ts`, Express) exposes only: `GET /health`, `GET /api/session` (auth info), `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/dashboard`, and a static-file catch-all. No sessions endpoints, no WebSocket, no SSE.
- `apps/web/src/lib/http.ts` (the real-engine stub) documents *planned* routes incl. `subscribeNetwork -> WS or SSE at /api/network/stream`, but every method is a `notWired` throw. So even the network realtime channel is aspirational.
- `experiments/enu_iaf_benchmark.ts` exists (the ENU + IAF benchmark — the real substrate's lineage) but is a one-shot CLI experiment (`npm run experiment:iaf`), not a live stream.

**Conclusion:** default `TrainingSource = local` (in-browser GA placeholder). The `remote` seam is a **typed compile-only stub** for now. Proposed future contract to document in the plan (mirrors `subscribeNetwork`'s shape so the engine team has a familiar target):
```ts
interface TrainingUpdate {
  generation: number; bestFitness: number; bestSteps: number; solved: boolean;
  bestGenome?: unknown;        // opaque policy genome for replay
}
type TrainingSource =
  | { kind: "local"; trainer: Trainer }
  | { kind: "remote"; subscribe(seed: Seed, cb: (u: TrainingUpdate) => void): () => void };
```
Recommendation: keep `TrainingSource` **inside the visual module**, not in the app's `Api` interface, until the engine actually streams — so the visual stays self-contained and the `Api` contract isn't widened speculatively.

---

## 4. Design system confirmation

- `DESIGN.md` tokens confirmed; the dashboard variant lives in `apps/web/src/styles/tokens.css`:
  - `--bg: #041414` (dark stage ✓), `--surface: #0B1E1E`, `--surface-2: #0E2626`.
  - `--accent: #17C4C4` (teal = intelligence/search/creature), `--accent-2: #F0783D` (orange = goal/reward/exit). `--accent-2-ink: #C85E2A`.
  - `--font-sans: "Geist"`, `--font-mono: "Geist Mono"`.
- **Colorblind rule is a hard constraint** (DESIGN.md §2/§8, build-plan §3): color never carries meaning alone — the stakeholder is colorblind. The visual's cue set must pair every meaning with shape/label/brightness:
  - exit = ring/flag shape (not just orange); frontier = dim wireframe cells; solved path = solid bright line; dead-ends = fade; success = scale pulse + "Solved" label.
- Restraint: one signature moment (creature emerging at start; optimal path igniting on solve); everything else quiet (matches DESIGN.md §1 "spend boldness once").

---

## 5. Determinism — how seeding will plumb

- The mock already ships a tiny deterministic RNG (`hashSeed` + `rngFor` xorshift in `lib/mock/generators.ts`) used for profiles/bounties/sessions — precedent that seeded determinism is an established pattern here, but it's mock-private.
- For the visual we'll add `seedrandom` (per the research) and derive **everything** from `seed = session.id`: morphology genome, maze, initial GA population, start/exit. Same `session.id` ⇒ identical creature + maze + evolution trajectory (the Phase D determinism gate).
- Per the locked decision: **morphology is fixed for a session** (random creature for that seed), **brain evolves over generations**.

---

## 6. Open questions (resolve before Phase B plan is finalized)

1. **React 18 vs 19.** Recommend **stay on React 18 + R3F v8** (zero app-wide churn). Upgrading to React 19 for R3F v9 would touch the whole app and isn't justified by this feature. Confirm we lock to the v8/React-18 generation. *(My default: yes, stay on 18.)*

2. **Where does the visual mount on `SessionPage`?** Today the page has no "active/selected session" concept and no slot for a hero canvas. Options:
   (a) a **hero canvas at the top of `SessionPage`** that visualizes the latest `running` session (or the most recent session), updating as you start new ones;
   (b) a canvas **per running session card** (heavier, multiple canvases);
   (c) a dedicated **`/session/:id`-style detail view**.
   *My default: (a)* — one hero canvas bound to the latest running (else most recent) session; simplest, one Canvas, clearest metaphor.

3. **Feature flag.** Add `features.session3dVisual: boolean` (default `false`) to `apps/web/src/lib/config.ts`, gating the lazy mount. Confirm the name and default. *(My default: add it, default `false` until merged & verified, then flip.)*

4. **Seed source.** Use `session.id` directly (no schema change, no engine change), rather than adding a `seed` field to the shared `Session` type. *(My default: use `session.id`.)*

5. **`TrainingSource` placement.** Keep the `local`/`remote` seam **inside the visual module** (not in the app `Api`) until the engine streams training. *(My default: inside the module.)*

6. **Scope of "generations" pacing vs `session.progress`.** The GA runs its own generation clock; `session.progress` (0→1) is independent and demo-compressed (~7–15s). Proposal: let the **GA drive the visible evolution** (real headless loop), and use `session.status`/`progress` only to gate phases (idle → evolving → celebrate). Confirm we don't try to hard-sync GA generations to the progress bar. *(My default: GA-driven, status-gated.)*

---

## 7. Integration map (file-level, for Phase B)

```
apps/web/
  package.json                         # + three, @react-three/fiber@8, @react-three/drei@9,
                                       #   @react-three/postprocessing@2, seedrandom, simplex-noise; dev: leva
  src/
    lib/config.ts                      # + features.session3dVisual flag
    features/session/
      SessionWidget.tsx                # (unchanged)
      visual/                          # NEW — the whole self-contained module
        SessionVisual.tsx             # default export; lazy boundary target
        index.ts
        maze/  creature/  learning/  scene/   # per the plan's sub-folders
    pages/SessionPage.tsx              # mount point: lazy(<SessionVisual>) behind flag + Suspense + ErrorBoundary
```
No engine (`apps/api`) or shared (`packages/shared`) changes required for Phase C. The `remote` seam is documented for the engine team but not wired.

---

## 8. Summary of corrections vs the runbook / research doc

- **R3F version:** runbook says "R3F v9 ↔ React 19" — repo is **React 18**, so we target **R3F v8 / drei v9 / postprocessing v2**. (Biggest correction.)
- **Styling:** no Tailwind in the actual app; it's **CSS Modules + tokens.css**. DOM chrome uses CSS Modules; canvas uses a typed palette mirroring tokens.
- **Mount slot:** `SessionPage` has no existing hero/active-session slot — needs the product decision in §6.2.
- **Telemetry:** confirmed **none exists** (not even the network stream) → in-browser GA is the real default; remote is a typed stub.
- Everything else in the runbook (Spore-like creature, real headless GA placeholder, determinism from `session.id`, lazy/error-boundary isolation, colorblind cue set) maps cleanly onto the repo as-is.
```
