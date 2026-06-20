# SAGI Session Page — 3D "Creature Solving a Maze" Visual: Research & Build Recipe

Research into how to build the compute/training-session visual — a procedurally generated **creature** finding the exit of a procedurally generated **maze**, as the metaphor for a model **learning / training / evolving** — and a survey of existing GitHub codebases we can reuse. Stack assumes the SAGI app (React + TypeScript, three.js) and the `DESIGN.md` system.

---

## 0. The concept and how the metaphor maps

| Visual element | What it represents |
|---|---|
| The creature (a random "genome" → body + limbs) | The evolving model / candidate algorithm |
| Each session = new random creature + maze (seeded) | A fresh training run / a new individual in the search |
| The maze | The problem / task / loss landscape |
| The creature **exploring** (frontier lighting up, dead-ends) | The search — i.e. training/learning |
| Reaching the exit | Convergence / a solution found |
| (Optional) successive **generations** getting faster | Evolution improving over time — SAGI's actual thesis |

**Two honesty levels** (pick one; the architecture supports both):
- **A. Art-directed visualization (recommended).** The "learning" is driven by a deterministic pathfinder + scripted improvement. Reliable, performant, looks identical every replay of a given session. This is what a session widget needs.
- **B. Real simulation (optional / stretch).** A tiny neuroevolution/GA agent *actually* learns the maze (sensors → net → moves; fitness = progress). More authentic to "evolving," but heavier, non-deterministic, and harder to art-direct. Keep as an upgrade behind the same interface.

---

## 1. Rendering stack (what's needed)

The app is React + TS, so use the pmndrs stack (this is the mainstream, well-supported path):

| Package | Role | Notes |
|---|---|---|
| `three` | 3D engine | r17x; WebGPU is production-ready since r171 with automatic WebGL2 fallback — but **WebGL2 is fine**; don't block on WebGPU. |
| `@react-three/fiber` | React renderer for three.js | **v9 pairs with React 19** (v8 ↔ React 18); declarative scene = clean, customizable components. |
| `@react-three/drei` | Helpers | `OrbitControls`, `Instances/Instance` (instanced walls), `Line`, `Trail`, `Text`/`Html`, `Environment`, `AdaptiveDpr`. |
| `@react-three/postprocessing` | Post FX | **Selective `Bloom`** (the neon glow), `Vignette`, `Noise`. Bloom is selective by default — you make a material glow by pushing its emissive color above the 0–1 range and setting `luminanceThreshold`. |
| `simplex-noise` | Noise | Seedable; for organic body deformation, terrain-y floor, ambient motion. |
| `seedrandom` (or `alea`) | Deterministic RNG | One seed → the whole creature + maze. The key to "every session different but reproducible." |
| *(dev)* `leva` | Debug knobs | Tune genome/maze/FX live during build; strip from prod. |

Built-ins worth knowing (no extra dep): `three/examples/jsm/animation/CCDIKSolver` (IK for legs), `three/examples/jsm/objects/MarchingCubes` (metaball bodies).

TypeScript boilerplate reference: **Sean-Bradley/React-Three-Fiber-Boilerplate** (sbcode) if a clean TS starter helps.

---

## 2. Subsystem A — the random creature

Two viable directions:

**A1 — Parametric low-poly creature (recommended).** A seeded "genome" assembles a body and limbs from primitives (capsules/spheres/boxes), then procedural locomotion animates it. Light, instancing-friendly, trivially stylable to the brand, and the "genome" framing reinforces *evolution*.
- *Genome schema to randomize:* body length/segments/girth, symmetry, number of leg pairs (1–4) and/or arms, limb length + joint count, head/eye style, accent hue (within the teal↔orange band), surface style (solid / wireframe / faceted), gait speed & amplitude.
- *Locomotion (the part that sells it):* place foot targets in the body frame; when a foot drifts too far from its anchor, step it to a new ground point and lift it along a **sine arc**; sequence feet in an **alternating gait**; solve each leg with **2-bone analytic IK** (or three's `CCDIKSolver`/FABRIK). Add body bob/lean. This is a few hundred lines and is the standard technique behind every "procedural spider" demo.

**A2 — Organic metaball creature (alt / "wow").** Build the body from **metaballs via `MarchingCubes`** (or a raymarched SDF) for a blobby "organism" that ties to the website's *organisms* section, then attach jointed limbs. More striking, heavier, harder to keep crisp on the brand. The **Pudgy-Pals** repo below does exactly this (metaball body + procedurally jointed limbs in WebGL) and is the best technique reference.

**Recommendation:** build **A1 from scratch** (full control, brand fit, license-clean — it's not much code), mining the repos below for technique; keep A2 as an optional "organic" genome variant.

**Creature repos / references**

| Repo / source | What it gives you | Stack | Reuse |
|---|---|---|---|
| [nmagarino/Pudgy-Pals](https://github.com/nmagarino/Pudgy-Pals-Procedural-Creature-Generator) | Metaball body + randomized jointed limbs, live demo | WebGL/glMatrix | **High** (technique for A2 + limb joints) |
| [OnlyShoky/Procedural-Animation](https://github.com/OnlyShoky/Procedural-Animation) | FABRIK IK locomotion (lizard/snake/fish) | **TypeScript** (Angular) | **High** (portable IK/gait code) |
| three.js `CCDIKSolver` | Built-in IK solver | three core | Med (drop-in IK) |
| [Bournemouth MSc thesis (Christo)](https://nccastaff.bournemouth.ac.uk/jmacey/MastersProject/MSc22/01/ProceduralCreatureGenerationandAnimationforGames.pdf) | "Assemble base bodies + attach limbs/wings + walk/idle/turn" method | Unity (concept) | Med (design of the genome→mesh pipeline) |
| [PhilS94 Wall-Walking Spider](https://github.com/PhilS94/Unity-Procedural-IK-Wall-Walking-Spider), [jerejoensuu](https://github.com/jerejoensuu/procedural-animation), [Ruadhan2301/Spiderbot](https://github.com/Ruadhan2301/Spiderbot-Procedural-Animation-Rig) | Alternating-tetrapod gait, raycast foot targets, sine-arc steps | Unity/C# (concept only) | Low-Med (port the gait logic, not the code) |

---

## 3. Subsystem B — the random maze

A **seeded recursive-backtracker** (DFS) or **Prim's** on a grid is ~40 lines and gives you the cell graph you need for both rendering *and* pathfinding/frontier. Prim's/"frontier" growth produces more branching (harder, prettier) than backtracker. Render walls as a single **`InstancedMesh`** for performance; add floor, start, and exit markers; extrude walls in 3D and pick a camera (isometric / over-the-shoulder / hybrid top-down).

Alternatively, **lotsacode/Maze** generates the three.js wall geometry directly and accepts a **custom RNG sampler** (`rnd`), which fits seeding perfectly — but generating the grid yourself keeps the cell data you need for the search visual.

**Maze repos / references**

| Repo | What it gives you | Reuse |
|---|---|---|
| [lotsacode/Maze](https://github.com/lotsacode/Maze) | three.js 3D-maze geometry generator; **custom `rnd` sampler**; returns geometry + `cells` | **High** (seeded geometry, or as reference) |
| [wwwtyro/Astray](https://github.com/wwwtyro/Astray) | Polished three.js marble-in-maze game (lighting/shadows look great) | High (visual/UX reference) |
| [michaelnicol/maze3d](https://github.com/michaelnicol/maze3d) (npm `maze3d.js`) | 3D-matrix maze + **BFS solver** + three model + animation | Med (gen+solve+animate in one) |
| [johansatge/three-maze](https://github.com/johansatge/three-maze) | Random 3D mazes + tween animation | Med |
| [Zain-Fatima/MazeNavigationGame](https://github.com/Zain-Fatima/MazeNavigationGame) | End-to-end three.js maze (backtracker, collision, exit logic) | Med (full working example) |
| [joeiddon: maze generation](https://joeiddon.github.io/projects/javascript/maze_generation.html) | Backtracker vs Prim's + the **frontier** concept | Reference (algorithms) |

---

## 4. Subsystem C — navigation = "learning" (the heart of it)

This is what makes the maze read as *training*, not just a screensaver.

- Run **grid A\*** (or BFS) over the maze cells to get the **solution path** *and* the **explored set / frontier**. Visualize the frontier expanding (cells lighting up as the creature "thinks"), dead-ends fading, and the optimal route **igniting** once found. Bind the reveal to `session.progress` (0→1).
- **Creature follows the discovered route** with its procedural gait; speed/感 confidence can ramp with progress.
- **Optional "generations"** (recommended for the evolution story): show a few attempts, each shorter/faster — either *scripted* (interpolate from a wandering path toward the optimal one) or *real* (GA below). A small `Gen 03` counter + a shrinking step-count sells "evolving."

**Pathfinding options**

| Option | Notes |
|---|---|
| **Hand-rolled grid A\*** (~50 lines) | Best fit; gives you the frontier set for the visual. **Recommended.** |
| [qiao/PathFinding.js](https://github.com/qiao/PathFinding.js) | Grid A*/Dijkstra/JPS, battle-tested (older) |
| `astar-typescript` (digitsensitive, MIT) | A* in TypeScript |
| [donmccurdy/three-pathfinding](https://github.com/donmccurdy/three-pathfinding) (MIT) | **Navmesh** pathfinding — needs a prebaked mesh; **overkill for a grid maze** |

**Real-simulation option (stretch, for level B)**

| Repo | What it is | Reuse |
|---|---|---|
| [flesler/genetic-maze](https://github.com/flesler/genetic-maze) (MIT) | **Build a maze, GA solves it** — JS, live demo. Closest whole-concept match. | High (logic for a real evolving solver) |
| [apssouza22/neuroevolution](https://github.com/apssouza22/neuroevolution) | JS NN + GA library (self-driving cars, flappy) | Med (agent brain) |
| NEAT "self-driving cars evolve" demos / [Nature of Code: Neuroevolution](https://natureofcode.com/neuroevolution/) | Canonical agent-learns-environment patterns | Reference |
| [umu1729: Neural Cellular Maze Solver](https://umu1729.github.io/pages-neural-cellular-maze-solver/) | NCA learns to solve mazes (gorgeous) | Visual inspiration |
| [jjuiddong/KarlSims](https://github.com/jjuiddong/KarlSims), [hanzholahs/evolving-creatures](https://github.com/hanzholahs/evolving-creatures), Evolve-a-Robot | Karl Sims-style **evolving virtual creatures** (physics GA) | Lineage only — too heavy for a widget |

> Karl Sims' *Evolving Virtual Creatures* (1994) is the spiritual ancestor of this whole visual and a great story to reference in copy — but the real physics-GA implementations are far too heavy to run in a dashboard. Evoke it; don't simulate it.

---

## 5. Aesthetic — matching `DESIGN.md` (stunning, on-brand, colorblind-safe)

- **Dark stage:** `#041414` background, subtle exponential fog, a low-key key light. Surfaces near-black; the creature, the solved path, the frontier, and the exit are the only bright things.
- **Selective bloom for the neon:** push emissive colors of the hero elements above 1.0 so only they glow — teal `#17C4C4` for the creature/search/intelligence, orange `#F0783D` for the goal/reward (exit, success). Add `Vignette` + faint `Noise` grain for a filmic, branded feel.
- **One signature moment** (per the design system's "spend boldness once"): the creature **emerging** at start, and the optimal path **igniting** on solve. Keep everything else quiet.
- **Colorblind rule (hard constraint): never rely on teal-vs-orange alone.** Pair every meaning with a non-color cue: exit = a **ring/flag** shape; frontier = **dim wireframe** cells; solved path = a **solid bright line**; dead-ends = **fade out**; success = a **scale pulse + label "Solved"** (drei `Text`/`Html` in Geist). Lightness contrast does the heavy lifting; hue is secondary.
- **Type in-canvas:** use Geist via drei `Text`/`Html` sparingly (gen counter, step count, "Solved").

---

## 6. Determinism & integration into the app

- **Seed = `session.id`** (or an explicit `seed` field) → `seedrandom` → every random draw (genome + maze + start/exit) derives from it. Result: *"every session a different creature and maze"* automatically, yet any session is **reproducible and shareable**.
- **Mount on the session page** (from the frontend build plan): wrap the `<Canvas>` in `React.lazy` + `Suspense` so the 3D bundle never bloats the rest of the dashboard. Drive the animation phase from session state: `queued` = idle creature; `running` = exploring/solving with progress; `completed` = at exit + celebrate; `failed` = stuck/reset. **Dispose** geometries/materials on unmount; use `frameloop="demand"` or pause when the canvas is off-screen.
- **Performance / mobile:** cap `dpr={[1, 1.5]}`, use `AdaptiveDpr`, instance the walls, keep the creature low-poly, limit Bloom resolution, and shrink the maze on small screens. Provide a **`prefers-reduced-motion`** fallback (a static "hero" render or minimal motion).

---

## 7. Build-vs-reuse & licensing

- The **JS/TS references are mostly MIT** (three-pathfinding, astar-typescript, flesler/genetic-maze, the pmndrs stack), but **verify each repo's license before copying code**.
- The strongest **locomotion/gait references are Unity/C#** — port the *ideas* (alternating gait, raycast foot targets, sine-arc steps), not the code.
- **Recommendation: build the three subsystems bespoke.** The maze (~40 lines), A* + frontier (~50 lines), and a 2-bone-IK creature (a few hundred lines) are small, and bespoke code gives full control over the brand look, the metaphor, and performance — while avoiding license/stack mismatch. Mine the repos for technique and visual targets.
- **Main risks:** (1) procedural-locomotion polish (mitigate with simple analytic IK + a known gait pattern), (2) performance/jank inside a busy dashboard (mitigate with instancing, lazy-load, demand frameloop, capped DPR), (3) over-animation that reads "AI-generated" (mitigate with the single-signature-moment rule + reduced-motion).

---

## 8. Recommendation & next step

**Recommended build:** Level **A** (art-directed, deterministic) — a **parametric low-poly creature** with 2-bone-IK gait, a **seeded recursive-backtracker maze** rendered with instanced walls, **grid A\* with a visible exploration frontier** as the "learning," and **selective bloom** in teal/orange over a dark stage. Add **scripted "generations"** for the evolution beat; leave a hook to swap in a **real GA agent** (flesler/genetic-maze-style) later.

**Two decisions for you:**
1. **Creature style** — parametric low-poly (lighter, crisp, on-brand) vs metaball "organism" (heavier, more striking, ties to the website organisms)?
2. **Learning depth** — scripted pathfinding (deterministic, reliable) vs a real evolving agent (authentic, heavier)?

Once you pick, I can write the **Claude Code implementation plan** for this (research → plan → build → merge, like `IMPLEMENTATION_PLAN.md`) and/or a **standalone runnable prototype** of the creature + maze + solve loop to drop into the session page.

---

## References (links)

**Stack:** react-three-fiber `github.com/pmndrs/react-three-fiber` · react-postprocessing `github.com/pmndrs/react-postprocessing` · drei `github.com/pmndrs/drei` · sbcode R3F+TS boilerplate `github.com/Sean-Bradley/React-Three-Fiber-Boilerplate`
**Maze:** lotsacode/Maze · wwwtyro/Astray · michaelnicol/maze3d · johansatge/three-maze · Zain-Fatima/MazeNavigationGame · joeiddon maze-generation writeup
**Creature & locomotion:** nmagarino/Pudgy-Pals · OnlyShoky/Procedural-Animation (TS FABRIK) · PhilS94 / jerejoensuu / Ruadhan2301 spider IK (Unity) · Bournemouth MSc procedural-creature thesis
**Pathfinding:** qiao/PathFinding.js · donmccurdy/three-pathfinding · astar-typescript
**Learning / evolution:** flesler/genetic-maze · apssouza22/neuroevolution · umu1729 Neural Cellular Maze Solver · jjuiddong/KarlSims · hanzholahs/evolving-creatures · Nature of Code (Neuroevolution) · Karl Sims, *Evolving Virtual Creatures* (SIGGRAPH '94)
