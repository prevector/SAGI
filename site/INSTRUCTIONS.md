# INSTRUCTIONS.md — Claude Code Build Runbook (SAGI)

**Goal:** in one structured session, build the complete SAGI landing page inside the connected Framer project, cleanly enough that a human can finetune and finalize it in Framer Designer afterwards.

**The three docs work together:**
- `DESIGN.md` — the design system (tokens, type, spacing, components, motion, a11y). **Pull all visual values from here by name. Never hardcode.**
- `STRUCTURE.md` — the page blueprint and final copy, section by section (`S00`–`S10`).
- `INSTRUCTIONS.md` — this file: the process, conventions, task list, custom-code specs, and end review.

Read `DESIGN.md` and `STRUCTURE.md` **in full before doing anything.**

---

## 0. Preconditions & connection

- This session is connected to the **SAGI** Framer project through Framer's external-agent bridge (`npx @framer/agent setup`, then the `/framer` skill). If the connection is not active, stop and report.
- The project is on Framer's **Basic paid plan**.
- **Work on a dedicated branch** (e.g. `agent/landing-build`). Never edit `main` directly.
- **Never publish.** Changes stay on the branch for human review and merge.
- Use the operations exposed by the Framer agent skills to create fonts, color/text styles, components, frames/sections, breakpoints, semantic tags, SEO metadata, and code components. Specify intent clearly; let the skills handle the mechanics.

---

## 1. Operating principles

1. **Maintain a live task list.** Start from the task list in §4, keep it in the session, and tick items as you complete them. Don't batch silently — work phase by phase.
2. **Build the design system before the page.** Styles and components first, then assemble sections from them. This is what keeps the output clean and editable.
3. **Reuse, never duplicate.** Every button, card, eyebrow, etc. is an instance of a component. Every color and text treatment is a named style.
4. **Review after every phase**, and run a full **end review** at the end (§7).
5. **Smallest reasonable choice + flag it.** If the spec is ambiguous or missing a detail, make the minimal sensible decision, record it in the build summary, and flag it. Do not invent new scope.
6. **Stay in scope / respect IP.** Mirror the inceptionlabs.ai *system and technique* only. Do not reuse its fonts, assets, code, or copy.

---

## 2. Build conventions (the cleanliness contract)

These are the rules that make the result pleasant to finish in Designer. Treat them as mandatory.

- **Styles, not hardcoded values.** All colors come from the `DESIGN.md §2` color styles; all text from the `DESIGN.md §3` text styles. No raw hex or one-off font sizes on layers.
- **Components with variants.** Build the `DESIGN.md §5` components once, with variants, and place instances. Don't copy-paste frames.
- **Auto-layout (stacks) everywhere.** Use stacks with the spacing scale (`space/*`) for all layout and gaps. No absolute positioning except where genuinely required (e.g. a decorative layer behind the hero) — and document any exception.
- **Semantic tags.** Set frame tags: `header` (S00+S01), `nav` (S01), `section` (S02–S09), `footer` (S10). Headings: exactly one `h1` (in S02), logical `h2`/`h3` after.
- **Breakpoints.** Define desktop (1320 container), tablet (~810), mobile (~390). Build desktop first, then adapt.
- **Naming.** Name layers, components, and code components meaningfully (use the names from `DESIGN.md`/`STRUCTURE.md`, e.g. `Button/Primary`, `Card/Bounty`, `S05 — How it works`). A human should be able to scan the layer tree.
- **No drop shadows / gradients** (except the hero canvas). Elevation via surface color only.

---

## 3. Assets

- **Fonts:** add `Geist` and `Geist Mono` as project fonts (weights 300/400/500/600). All text styles reference these.
- **Sponsor marks (S08):** create 6–8 simple, monochrome fictional wordmarks/logos (names in `STRUCTURE.md S08`). Plain Geist wordmarks or minimal SVG glyphs are fine; keep them uniform in height.
- **Wordmark:** `SAGI` in Geist (or Geist Mono for an instrument feel) — pick one and use it in nav + footer consistently.
- **Favicon + OG image:** a simple `SAGI` wordmark on `bg/dark` is sufficient.
- **Icons:** one thin outline set (e.g. Lucide), used in S05 steps and S06 reward rails.

---

## 4. Task list (execute in order)

### Phase 0 — Orientation
- [ ] Read `DESIGN.md` and `STRUCTURE.md` fully.
- [ ] Confirm bridge connection; create/switch to branch `agent/landing-build`.
- [ ] Initialize the working task list in this session.

### Phase 1 — Foundations (design system)
- [ ] Add fonts: Geist, Geist Mono.
- [ ] Create every color style in `DESIGN.md §2`.
- [ ] Create every text style in `DESIGN.md §3`.
- [ ] Set up breakpoints (desktop/tablet/mobile) and the `space/*` spacing values.
- [ ] Build components (`DESIGN.md §5`): `Button` (Primary, Reward, Ghost-dark, Ghost-light), `Eyebrow`, `Nav`, `AnnouncementBar`, `Card` (Base, Organism, RewardRail, Bounty), `LeaderboardRow`, `LogoTicker`, `Footer`.
- [ ] Review: confirm components/styles exist and are reused; no hardcoded values.

### Phase 2 — Page scaffold (chrome + shells)
- [ ] Create the home page; set SEO title + meta description + OG image.
- [ ] Build chrome: `S00` AnnouncementBar, `S01` Nav, `S10` Footer.
- [ ] Lay out empty shells `S02`–`S09` with correct background, container (1320), section padding, semantic tag, and `Eyebrow` label per `STRUCTURE.md`.
- [ ] Wire nav + footer anchor links to the section IDs.

### Phase 3 — Content sections (top → bottom, copy from STRUCTURE.md)
- [ ] `S02` Hero — text + buttons; insert a static placeholder where `EmergenceField` will go.
- [ ] `S03` Premise.
- [ ] `S04` Organisms — 3× `Card/Organism` with `OrganismVignette` placeholders.
- [ ] `S05` How it works — numbered steps 1–4 + `TokenResolution` placeholder.
- [ ] `S06` Token economy — 2× `Card/RewardRail`, utility row, 3× `Counter` placeholders, sample `Card/Bounty`.
- [ ] `S07` Bounties + leaderboard — `LeaderboardRow` ×5 + open-bounties list.
- [ ] `S08` Backers — `LogoTicker` + fictional marks.
- [ ] `S09` Final CTA.
- [ ] Review each section against `STRUCTURE.md` as completed.

### Phase 4 — Custom code components (see §6)
- [ ] Build `EmergenceField`; place in `S02`; verify performance + reduced-motion poster.
- [ ] Build `OrganismVignette`; place 3 instances in `S04` (behaviors: adapts / remembers / recovers).
- [ ] Build `TokenResolution`; place in `S05` (words from `STRUCTURE.md S05`).
- [ ] Build `Counter`; place 3 in `S06`.
- [ ] Install packages only if justified (default: none).

### Phase 5 — Motion + responsive
- [ ] Apply `diffuse-in` reveals (and `stagger` on card/row groups) per `DESIGN.md §6`.
- [ ] Enable `marquee` (S08), `count-up` (S06), `token-resolve` (S05).
- [ ] Build tablet + mobile: stack columns, collapse nav to hamburger, resize type to mobile scale, fix overlaps/spacing.
- [ ] Verify `prefers-reduced-motion` fallbacks everywhere.

### Phase 6 — End review & handoff
- [ ] Run the full end-review checklist (§7).
- [ ] Write the build summary (§8).
- [ ] Leave everything on the branch. Do not merge or publish.

---

## 5. Per-section build pattern

Apply the same loop to every section `S0X` so the output stays uniform:

1. Create the section frame; set its background style, semantic tag, the `1320` container, and section padding (`DESIGN.md §4`).
2. Add the `Eyebrow` + heading + intro using the named text styles, with copy taken verbatim from `STRUCTURE.md`.
3. Place **component instances** for buttons, cards, rows, etc. — never raw duplicated frames.
4. Lay everything out with auto-layout stacks and `space/*` gaps.
5. Where a code component belongs, drop a static placeholder now; wire the real one in Phase 4.
6. Defer scroll reveals (`diffuse-in`/`stagger`) to Phase 5.
7. Review the finished section against `STRUCTURE.md` before moving to the next.

---

## 6. Custom code components

Build these as Framer **code components** (React `.tsx`, default export, `addPropertyControls`, appropriate auto-sizing). Expose colors as props with defaults matching `DESIGN.md` tokens so they stay editable in Designer. Every animated component must respect `prefers-reduced-motion` and pause when offscreen (IntersectionObserver).

**Dependency policy:** default to **no external packages** — use Canvas 2D, SVG, and React. Only if a richer look is justified *and* performance is verified, you may add a **small** library (`ogl` for WebGL, `simplex-noise` for a noise field). Do **not** add heavy libraries (e.g. three.js) unless there is no alternative; prefer `ogl`. Keep the shipped default lightweight.

### `EmergenceField` (hero, S02) — the signature
- **Effect:** a field of faint noise glyphs/particles that periodically crystallises into a coherent teal organism form, then dissolves back to noise, on a slow ambient loop ("emergence from noise").
- **Default tech:** Canvas 2D, devicePixelRatio-aware, `requestAnimationFrame`, particle count capped and reduced on small screens.
- **Props:** `density` (number), `speed` (number), `glyphColor` (default `#17C4C4`), `mono` (bool — use monospace glyph characters), `transparentBg` (bool, default true so `bg/dark` shows through).
- **Reduced motion / offscreen:** render a single resolved frame (poster) and stop the loop.
- **a11y:** wrapper `aria-hidden="true"`.
- **Optional upgrade:** GLSL shader via `ogl` if perf allows — keep Canvas 2D as the default deliverable.

### `OrganismVignette` (organisms, S04)
- **Effect:** a small looping abstract creature/agent illustrating one behavior. Acceptable forms: a node-creature that morphs/pulses, or a tiny agent tracing a T-maze path that stabilises after a "mistake."
- **Default tech:** SVG + CSS/JS animation (preferred) or Canvas. Lightweight, no deps.
- **Props:** `behavior` ("adapts" | "remembers" | "recovers") switching the loop; `accent` (default `#17C4C4`).
- **Reduced motion:** static representative pose.
- **a11y:** `role="img"` with an `aria-label` describing the behavior.

### `TokenResolution` (how it works, S05)
- **Effect:** two columns of Geist Mono tokens. Left ("One model, scaled") types neutral tokens one-by-one (sequential). Right ("A population, evolving") resolves teal tokens together from a brief scramble (parallel). Loops with a pause. (Column headers and caption are normal Framer text outside the component — see `STRUCTURE.md S05`.)
- **Tech:** React + Geist Mono, no deps.
- **Props:** `leftWords` (string[]), `rightWords` (string[]), `cycleMs` (number), `tealColor` (default `#159999` for the on-light context).
- **Reduced motion:** show both columns fully resolved (static).

### `Counter` (token economy, S06)
- **Effect:** count-up to a target when scrolled into view.
- **Tech:** React, IntersectionObserver to trigger; `Intl.NumberFormat` for thousands separators; round all displayed values.
- **Props:** `to` (number), `prefix` (string), `suffix` (string, e.g. `" SAGI"`), `durationMs` (number).
- **Reduced motion / SR:** render the final value immediately.

---

## 7. End-review checklist (mandatory)

- **Visual fidelity:** every section matches `STRUCTURE.md`; spot-check that colors/type/spacing resolve to `DESIGN.md` styles (no stray hardcoded values).
- **Cleanliness:** components reused (not duplicated frames); auto-layout stacks (no stray absolute positioning); meaningful layer names; semantic tags set; exactly one `h1`.
- **Responsive:** desktop, tablet, and mobile all hold — no overflow, truncation, or overlap; nav hamburger works; type uses the mobile scale.
- **Accessibility:** AA contrast on text; visible keyboard focus (teal ring); alt text on images; decorative canvases `aria-hidden`; reduced-motion fallbacks confirmed; min 14px text (body 16px).
- **Colorblind:** no meaning carried by color alone — every teal/orange state is also labelled, iconed, or positioned.
- **Motion:** one signature moment (hero) plus restrained reveals; nothing janky; offscreen canvases paused.
- **Copy:** matches `STRUCTURE.md` exactly; sentence case; token language is utility/reward only (no investment or price-appreciation wording anywhere); footer disclaimer present.
- **Performance:** canvas capped and paused offscreen; no heavy dependencies; images optimized.
- **Links/anchors:** nav + footer anchors jump to the correct sections; CTAs point to their targets/placeholders.

---

## 8. Handoff / build summary

When the checklist passes, write a short summary in the session covering:
- What was built (sections, components, code components), all on branch `agent/landing-build`.
- Any decisions or assumptions made where the spec was ambiguous (and why).
- A short list of manual-polish TODOs best done by hand in Framer Designer (e.g. fine spacing, motion timing, exact hover nuance, real CTA destinations, swapping placeholder content).
- Confirmation that nothing was published and the work is ready for human review and merge.

---

## 9. Guardrails (summary)

- Branch only. Never publish. Never edit the live site.
- Never hardcode colors/sizes — use named styles.
- No heavy dependencies; prefer dependency-free Canvas/SVG/React.
- Keep strictly to the spec; flag ambiguities in the summary rather than inventing scope.
- Do not reuse inceptionlabs.ai assets, fonts, code, or copy.
