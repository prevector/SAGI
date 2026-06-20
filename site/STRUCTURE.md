# STRUCTURE.md — SAGI Landing Page Blueprint

**Project:** SAGI — a distributed search for artificial general intelligence
**Type:** single page, 11 blocks (`S00`–`S10`), top to bottom.
**Reads with:** `DESIGN.md` (tokens, type styles, components, motion — referenced by name here; do not redefine them).

**Global rules**
- Background alternates dark/light from `S03` onward. The intro cluster (`S00`–`S02`) and closing cluster (`S08`–`S10`) are intentionally dark.
- Every section: wrap content in the `1320px` container; apply section vertical padding per `DESIGN.md §4`; reveal content with `diffuse-in` (`stagger` for card/row groups).
- Every section opens with an `Eyebrow` label except `S00`/`S01`/`S10`.
- On-page numbered markers appear **only** in `S05` (a real sequence). Section IDs below are for the build, not page decoration.
- Copy is final. Sentence case throughout. Use it verbatim unless it breaks layout, in which case keep meaning and tone.

**Token economy note:** tokens are framed as **utility + earned rewards** only. Never imply price appreciation or investment return anywhere. Sample token amounts use the unit "SAGI" (e.g., `50,000 SAGI`).

---

## S00 — Announcement bar
- **Component:** `AnnouncementBar` · **Background:** `bg/deep` · **Tag:** top of `header`
- **Behavior:** sticky, sits above `Nav`. Single line, centered. The whole bar is a link to the thesis.
- **Copy:** `SAGI is live — contribute compute to the search for AGI and earn network tokens. →`
  - Emphasis: "earn network tokens" in `accent/orange`; trailing `→` in `accent/teal`.
- **Responsive:** truncate gracefully on mobile to `SAGI is live — earn tokens for the search. →`

## S01 — Nav
- **Component:** `Nav` · **Background:** transparent over hero → `bg/dark` on scroll · **Tag:** `nav` inside `header`
- **Left:** `SAGI` wordmark (links to top).
- **Links** (`Small`, `text/on-dark-2`): `How it works` (→S05) · `Tokens` (→S06) · `Bounties` (→S07) · `Backers` (→S08).
- **Right cluster:** `Button/Ghost-dark` "Read the thesis" + `Button/Primary` "Join the network".
- **Responsive:** links collapse to a hamburger on tablet/mobile; keep `Button/Primary` visible.

## S02 — Hero
- **Background:** `bg/dark` · **Tag:** `section` (contains the page `h1`)
- **Visual:** `EmergenceField` code component as the section background/right visual (noise glyphs resolving into a teal organism). `aria-hidden`, with a static poster under reduced motion.
- **Layout:** left-weighted text column over/in front of the field; min-height ~90vh on desktop.
- **Content:**
  - `Eyebrow`: `A distributed search for general intelligence`
  - `Display/H1`: `We don't know what AGI looks like. So let's search for it — together.`
  - `Body-L` (`text/on-dark-2`): `SAGI is a worldwide evolutionary laboratory. Candidate minds are grown as living organisms, evolved on your hardware, and selected for one thing: the ability to learn. Contribute compute, earn tokens, and help find the algorithms behind general intelligence.`
  - Buttons: `Button/Primary` "Join the network" · `Button/Ghost-dark` "Read the thesis"
- **Optional:** a faint, low-opacity hint of the `LogoTicker` pinned near the bottom ("Backed by leading labs"), full version lives in `S08`.
- **Responsive:** field becomes a top/background layer; H1 → 40px; buttons stack full-width.

## S03 — The premise
- **Background:** `bg/paper` (light) · **Tag:** `section` · **Reveal:** `diffuse-in`
- **Layout:** centered, single column, generous whitespace — the dark→light jump is the drama. Max text width ~760px.
- **Content:**
  - `Eyebrow` (`text/on-light-2`): `The premise`
  - `Heading/H2` (`text/on-light`): `Intelligence has more than one path. We're searching all of them.`
  - `Body-L` (`text/on-light`): `AI has converged on a single bet — scale transformers with backpropagation on ever-larger data. It works, but it treats one path as the only one. SAGI starts from what we don't know: the architecture of general intelligence is still an `**open question**`. So instead of scaling one design, we search the space of possible learning systems — their architecture, their memory, and the rules by which a mind changes as it learns.`
  - Highlight "open question" in `accent/teal-deep` (allowed on light; keep short).

## S04 — The organisms
- **Background:** `bg/dark` · **Tag:** `section` · **Reveal:** `diffuse-in` then `stagger` on cards
- **Layout:** intro text, then a row of three `Card/Organism` (auto-fit; 3 across desktop → 1 on mobile).
- **Content:**
  - `Eyebrow`: `Living candidates`
  - `Heading/H2`: `Every algorithm is an organism you can watch learn.`
  - `Body-L` (`text/on-dark-2`): `Each candidate learning system is described by a genome — its architecture, memory, plasticity, and update rules — and grown into a small living organism. You can watch it remember, adapt, recover from mistakes, and respond when the rules of its world change. An abstract learning rule becomes something you can see, cultivate, and care about.`
  - Three `Card/Organism`, each hosting an `OrganismVignette` and a `Mono-Token` status label:
    1. `behavior="adapts"` — label `ADAPTS` — caption: `Learns a new rule from a single experience.`
    2. `behavior="remembers"` — label `REMEMBERS` — caption: `Holds onto what mattered across its life.`
    3. `behavior="recovers"` — label `RECOVERS` — caption: `Turns around when the world flips on it.`

## S05 — How it works
- **Background:** `bg/light` (clean white) · **Tag:** `section` · **Reveal:** `diffuse-in`, steps `stagger`
- **Content:**
  - `Eyebrow` (`text/on-light-2`): `How it works`
  - `Heading/H2` (`text/on-light`): `A distributed search, running on everyone's hardware.`
  - `Body-L` (`text/on-light`): `SAGI launches with Evolvable Neural Units evolved by Evolution Strategies — a method that's naturally distributable, because each machine only exchanges random seeds and a single fitness score. That makes a worldwide, heterogeneous network of laptops, GPUs, and cloud nodes not just possible, but efficient.`
- **Numbered steps (1–4)** — the only on-page numbering. Each: number marker, thin outline icon, `Subheading/H3`, `Body`:
  1. `Genome` — `A candidate mind is described as a compact genome.`
  2. `Organism` — `The genome is grown into an organism and placed in many environments.`
  3. `Your hardware` — `Your machine evaluates mutated offspring and returns their fitness.`
  4. `Selection` — `Evolution Strategies selects and mutates the population. Discoveries propagate.`
- **`TokenResolution` module** (below the steps): two columns.
  - Left header `Mono-Token`: `One model, scaled` — neutral tokens (`text/on-light`) appear one by one.
  - Right header `Mono-Token`: `A population, evolving` — teal tokens (`accent/teal-deep`) resolve together from a brief scramble.
  - Caption (`Small`, `text/on-light-2`): `Brute force scales one design. Evolution searches many — in parallel.`

## S06 — Token economy
- **Background:** `bg/dark` · **Tag:** `section` · **Accent lead:** `accent/orange`
- **Content:**
  - `Eyebrow`: `Why contribute`
  - `Heading/H2`: `Two ways to earn from the search.`
  - Two `Card/RewardRail` (2 across desktop → stack mobile):
    1. Icon + `Subheading/H3` `Compute rewards` + `Body`: `Earn tokens for every cycle of search your hardware contributes — idle laptop, GPU rig, or cloud node.`
    2. Icon + `Subheading/H3` `Bounties` + `Body`: `Earn larger rewards for a verified breakthrough that significantly improves an organism or algorithm — plus rewards for building hard environments, reproducing results, and finding benchmark exploits.`
  - **Utility row** (`Body`, with `accent/orange` emphasis): `Tokens fund more search capacity, govern the network, and reward the work that moves it forward.`
  - **Stat strip** (three `Counter` in `Mono-Token`, `accent/orange`), illustrative:
    - `Counter to=2,400,000 suffix=" SAGI"` — caption `paid to contributors`
    - `Counter to=11,800` — caption `nodes in the network`
    - `Counter to=63` — caption `open bounties`
  - **Sample `Card/Bounty`:** title `First to 0.80 transfer under a fixed compute budget` · reward `50,000 SAGI` (`accent/orange`) · tag `Open` · helper `Verified on hidden tasks.`

## S07 — Bounties + leaderboard
- **Background:** `bg/light-muted` · **Tag:** `section` · **Reveal:** rows `stagger`
- **Content:**
  - `Eyebrow` (`text/on-light-2`): `Open problems`
  - `Heading/H2` (`text/on-light`): `Open bounties and live leaderboards.`
  - `Body-L` (`text/on-light`): `Intelligence isn't one score. SAGI measures transfer to unseen tasks, adaptation speed, memory efficiency, and compute cost — each with its own leaderboard. Anyone can post a bounty to point the network at an unsolved problem.`
  - **Leaderboard** (`LeaderboardRow` ×5; header row in `text/on-light-2`). Columns: Rank · Organism · Transfer score · Status · Reward. Sample rows:
    - `01` · `meridian-04` · `0.812` · `Verified` (teal) · `50,000 SAGI` (orange)
    - `02` · `helix-2f` · `0.799` · `Verified` · `—`
    - `03` · `aleph-knot` · `0.781` · `Pending` · `—`
    - `04` · `northwind-7` · `0.774` · `Verified` · `—`
    - `05` · `corabel-x` · `0.769` · `Pending` · `—`
  - **Open bounties list** (3× short `Card/Bounty` or list rows), e.g.:
    - `One-shot rule learning under 1k interactions` — `35,000 SAGI`
    - `Memory-efficient organism < 50MB state` — `20,000 SAGI`
    - `Hardest transfer environment (community-judged)` — `15,000 SAGI`

## S08 — Backers
- **Component:** `LogoTicker` · **Background:** `bg/deep` · **Tag:** `section`
- **Content:**
  - Label (`Small`, `text/on-dark-2`, centered above the ticker): `Backed by the labs pushing the frontier`
  - **Fictional marks (6–8), monochrome:** `Helix Research` · `Praxis AI` · `Meridian Labs` · `Aleph Compute` · `Northwind Intelligence` · `Vantage AI` · `Corabel` · `Synthex`.
  - These are invented for the hackathon demo; the footer disclaimer states sponsor logos are illustrative.
- **Motion:** `marquee` (pause on hover); reduced motion → static row.

## S09 — Final CTA
- **Background:** `bg/dark`, teal-forward (a large `accent/teal`-tinted panel or a strong `Button/Primary`) · **Tag:** `section`
- **Content:**
  - `Heading/H2`: `Join the search for AGI.`
  - `Body-L` (`text/on-dark-2`): `Contribute compute. Earn tokens. Help discover the algorithms behind general intelligence.`
  - Small `accent/orange` emphasis on "Earn tokens".
  - Buttons: `Button/Primary` "Join the network" · `Button/Ghost-dark` "Read the thesis".

## S10 — Footer
- **Component:** `Footer` · **Background:** `bg/deep` · **Tag:** `footer`
- **Top:** `SAGI` wordmark + tagline `A distributed search for artificial general intelligence.`
- **Columns** (`Small`, `text/on-dark-2`):
  - **Project:** Thesis · Paper · GitHub
  - **Network:** How it works · Tokens · Bounties · Leaderboard
  - **Community:** Discord · X
  - **Legal:** Terms · Privacy
- **Disclaimer** (`text/on-dark-3`, small): `SAGI is a research project. Network tokens are utility rewards for contributed compute and verified contributions — not an investment or a promise of financial return. Sponsor logos shown are illustrative.`
- **Bottom:** `© 2026 SAGI`

---

## Section order & background rhythm (quick reference)

| ID | Section | Background | Accent lead | Custom code |
|---|---|---|---|---|
| S00 | Announcement bar | `bg/deep` | orange word | — |
| S01 | Nav | transparent → `bg/dark` | teal CTA | — |
| S02 | Hero | `bg/dark` | teal | `EmergenceField` |
| S03 | Premise | `bg/paper` | teal keyword | — |
| S04 | Organisms | `bg/dark` | teal | `OrganismVignette` ×3 |
| S05 | How it works | `bg/light` | teal | `TokenResolution` |
| S06 | Token economy | `bg/dark` | orange | `Counter` ×3 |
| S07 | Bounties + leaderboard | `bg/light-muted` | orange/teal | — |
| S08 | Backers | `bg/deep` | neutral | `LogoTicker` (or native marquee) |
| S09 | Final CTA | `bg/dark` | teal | — |
| S10 | Footer | `bg/deep` | neutral | — |
