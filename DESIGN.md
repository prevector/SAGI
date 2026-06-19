# DESIGN.md — SAGI Design System

**Project:** SAGI — a distributed search for artificial general intelligence
**Surface:** single-page marketing landing site, built in Framer (Basic paid plan)
**Status:** frozen. This file is the single source of truth for all visual tokens. `STRUCTURE.md` references these tokens by name; do not invent new colors, type sizes, or spacing values.

---

## 1. Brand essence & principles

SAGI is a worldwide, living laboratory where candidate minds are grown, observed, and selected. The site should feel like a **lab instrument watching intelligence emerge from noise** — deep-tech, precise, and distinctive, not a generic crypto or SaaS page.

Three principles drive every decision:

1. **Emergence from noise.** Random genomes resolve into a living organism. This is the motif behind the hero animation, the scroll reveals, and the accent logic.
2. **Dark lab, lit field notes.** Dark sections are the instrument/void where organisms and data glow; warm off-white sections are the human "field-note" moments. Sections alternate.
3. **Two axes, two accents.** Teal = the *intelligence* axis (evolution, selection, the resolved organism). Orange = the *economy* axis (tokens, rewards, bounties). Every accent use means one of these two things — never decoration.

**Signature element (spend boldness here):** the hero *emergence field* — a field of noise glyphs crystallising into a coherent teal organism and dissolving again — paired with the two-column "one scaled model vs an evolving population" token resolution. Everything else stays quiet and disciplined.

**Restraint rule:** one bold moment (the signature), everything around it precise and calm. Cut decoration that doesn't serve the brief.

---

## 2. Color

All hex values are authoritative. In Framer, create each as a **named color style** (group → name as below) and reference styles everywhere — never hardcode a hex on a layer.

### Surfaces — dark

| Token | Hex | Use |
|---|---|---|
| `bg/deep` | `#000000` | Announcement bar, backers row, footer |
| `bg/dark` | `#041414` | Primary dark sections, hero (teal-tinted near-black) |
| `bg/dark-raised` | `#0B1E1E` | Cards/surfaces on dark |

### Surfaces — light

| Token | Hex | Use |
|---|---|---|
| `bg/paper` | `#FAF8F0` | Primary light sections (warm off-white) |
| `bg/light` | `#FFFFFF` | Clean light sections (steps/diagram) |
| `bg/light-muted` | `#F7F7F7` | Subtle light sections (leaderboard/data) |

### Text

| Token | Value | Use |
|---|---|---|
| `text/on-dark` | `#FAF8F0` | Primary text on dark |
| `text/on-dark-2` | `rgba(250,248,240,0.66)` | Secondary text on dark |
| `text/on-dark-3` | `rgba(250,248,240,0.42)` | Captions / fine print on dark |
| `text/on-light` | `#2B2A29` | Primary text on light |
| `text/on-light-2` | `rgba(43,42,41,0.64)` | Secondary text on light |

### Accents

| Token | Hex | Meaning / use |
|---|---|---|
| `accent/teal` | `#17C4C4` | Intelligence axis: resolved/selected, primary CTA, links, focus, "verified" |
| `accent/teal-deep` | `#159999` | Teal hover/pressed; teal text on light (minimum contrast) |
| `accent/teal-pale` | `#EFF9F9` | Teal tint highlights on dark |
| `accent/orange` | `#F0783D` | Economy axis: tokens, rewards, bounties, earnings |
| `accent/orange-deep` | `#C85E2A` | Orange hover/pressed |

### Borders & ink-on-accent

| Token | Value | Use |
|---|---|---|
| `border/on-dark` | `rgba(250,248,240,0.12)` | Hairline on dark |
| `border/on-dark-strong` | `rgba(250,248,240,0.24)` | Hover/emphasis on dark; ghost button border |
| `border/on-light` | `rgba(43,42,41,0.12)` | Hairline on light |
| `ink/on-teal` | `#041414` | Text on a teal fill |
| `ink/on-orange` | `#2B1206` | Text on an orange fill (deep brown) |

### Color rules (hard requirements)

- **Color never carries meaning alone.** The stakeholder is colorblind. Every teal/orange state must also be signalled by a label, icon, mono tag, or position. Teal-vs-orange is distinguishable for the common CVD types, but we never rely on it.
- **Teal = intelligence/selection; orange = economy/reward.** Don't mix the meanings. Orange is concentrated in sections S06–S07 and the "earn" phrase in the announcement bar; teal carries everything else (links, primary CTA, "verified", focus).
- **Contrast:** `text/on-dark` on `bg/dark` ≈ 16:1 (excellent). Use teal and orange for large text, UI accents, and graphics **only — never body copy.** Teal on white is low-contrast; if teal text must sit on light, use `accent/teal-deep` and keep it short.

---

## 3. Typography

**Families (only these two):**
- `Geist` — display, headings, UI, and body. (Vercel Geist, SIL OFL; add as a Framer font.)
- `Geist Mono` — eyebrows/kickers, tokens, data, code, numbers.

Geist's lighter weights echo the reference's light display feel; Geist Mono does the distinctive "genome/token" work. Create each row below as a **named text style** in Framer.

| Style name | Font | Desktop | Mobile | Weight | Line-height | Notes |
|---|---|---|---|---|---|---|
| `Display/H1` | Geist | 64px | 40px | 400 | 1.0 | tracking −0.02em, sentence case |
| `Heading/H2` | Geist | 48px | 32px | 400 | 1.1 | sentence case |
| `Subheading/H3` | Geist | 30px | 24px | 500 | 1.2 | feature/step titles |
| `Body-L` | Geist | 18px | 17px | 400 | 1.5 | hero subhead, section intros |
| `Body` | Geist | 16px | 16px | 400 | 1.55 | default copy |
| `Small` | Geist | 14px | 14px | 500 | 1.4 | meta, captions, footer links |
| `Eyebrow` | Geist Mono | 13px | 13px | 500 | 1.3 | letter-spacing 0.08em; `accent/teal` or `text/*-2` |
| `Mono-Token` | Geist Mono | 16–28px | 14–22px | 400–500 | 1.2 | animation chips, counters, IDs, pricing |

**Case:** sentence case everywhere. The only uppercase permitted is the `Eyebrow` style (with letter-spacing). Never Title Case, never ALL CAPS elsewhere.

---

## 4. Spacing & layout

**Spacing scale (8pt-based)** — create as the only spacing values used:
`space/1`=4 · `space/2`=8 · `space/3`=12 · `space/4`=16 · `space/5`=24 · `space/6`=32 · `space/7`=48 · `space/8`=64 · `space/9`=96 · `space/10`=128

- **Container:** max-width `1320px`, centered. Side gutter `space/5` (24) on mobile, `space/7` (48) on desktop.
- **Section vertical padding:** desktop `space/10` (128) top & bottom; tablet `space/9`→`88`; mobile `space/8` (64)→`56`.
- **Grid:** 12-column mental model; card grids use auto-fit (`minmax(280px, 1fr)`).
- **Radius:** buttons = pill (`9999px`); cards = `16px`; chips/tags = `8px`. Never round a single-sided border.
- **Elevation:** from surface color only. **No drop shadows, no gradients** (except the hero canvas), no glow.
- **Borders:** 1px hairlines using the border tokens.

---

## 5. Components

Build each as a real Framer **component with variants** (not repeated raw frames). Names below are used verbatim in `STRUCTURE.md`.

### `Button`
Pill, padding `12px 20px`, `Small` weight 500, all-sides border only where noted. Variants:
- `Primary` — fill `accent/teal`, text `ink/on-teal`, no border. Hover fill `accent/teal-deep`.
- `Reward` — fill `accent/orange`, text `ink/on-orange`, no border. Hover fill `accent/orange-deep`.
- `Ghost-dark` — transparent, text `text/on-dark`, 1px `border/on-dark-strong`. Hover: fill `rgba(250,248,240,0.08)`.
- `Ghost-light` — transparent, text `text/on-light`, 1px `border/on-light`. Hover: fill `rgba(43,42,41,0.06)`.
Focus state (all): 2px `accent/teal` ring, 2px offset.

### `Eyebrow`
`Eyebrow` text style + optional 6px leading dot in `accent/teal`. Used to label every section.

### `Nav`
Sticky top. Transparent over the hero; on scroll, fill `bg/dark` with a 1px bottom `border/on-dark`. Left: `SAGI` wordmark. Center/right: text links (`Small`, `text/on-dark-2`, hover `text/on-dark`). Right cluster: `Button/Ghost-dark` ("Read the thesis") + `Button/Primary` ("Join the network"). Mobile: collapse links into a hamburger; keep the primary button visible.

### `AnnouncementBar`
Full-width, `bg/deep`, height ~40px, single centered line, `Small` `text/on-dark`. Emphasis word in `accent/orange`; trailing `→` in `accent/teal`. Sticky above `Nav`.

### `Card`
Base: radius 16, 1px hairline, padding `space/5` (24). Variants:
- `Base` — on light: `bg/light` + `border/on-light`; on dark: `bg/dark-raised` + `border/on-dark`.
- `Organism` — dark, hosts an `OrganismVignette`, with a `Mono-Token` status label.
- `RewardRail` — dark, icon + `Subheading/H3` + `Body`, optional `accent/orange` stat.
- `Bounty` — dark, `Mono-Token` reward in `accent/orange`, `accent/teal` "verified" tag, hairline divider.

### `LeaderboardRow`
Grid row: rank (`Mono-Token`), organism name (`Body`), score (`Mono-Token`), status pill (teal "Verified"), reward (`Mono-Token`, `accent/orange`). Header row in `text/*-2`.

### `LogoTicker`
Continuous horizontal marquee of monochrome sponsor marks at ~65% opacity, equal optical height 24–28px, on `bg/deep`. Pause on hover. Duplicate the set for a seamless loop.

### `Footer`
`bg/deep`. Wordmark + tagline; 3–4 link columns (`Small`, `text/on-dark-2`); social row; disclaimer in `text/on-dark-3`; © line.

### Code components (see INSTRUCTIONS.md §6 for build approach)
- `EmergenceField` — hero canvas animation (noise → organism, teal accents).
- `OrganismVignette` — small looping creature/agent (props: `behavior` = adapts | remembers | recovers).
- `TokenResolution` — two-column mono-token resolve animation.
- `Counter` — count-up number in `Mono-Token` (props: `to`, `suffix`, `duration`).

---

## 6. Motion

**Principle:** one orchestrated "emergence" moment carries the page; everything else is restrained. Scattered effects read as AI-generated — avoid them.

**Timing tokens:** `motion/fast`=150ms · `motion/base`=300ms · `motion/slow`=600ms.
**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out) for all entrances.

**Named animations:**
- `diffuse-in` — scroll reveal: opacity 0→1, translateY 16px→0, slight blur 6px→0. `motion/slow`, once per element, triggered ~15% into viewport. The default reveal for section content.
- `emergence` — hero `EmergenceField` loop (continuous, ambient, slow).
- `token-resolve` — `TokenResolution`: left column types tokens sequentially; right column resolves teal tokens together from a brief scramble; loops with a pause.
- `stagger` — cards/rows enter with `diffuse-in` + 80ms increments.
- `count-up` — `Counter` animates on reveal.
- `marquee` — `LogoTicker`, ~35s linear loop, pause on hover.

**Reduced motion (required):** honor `prefers-reduced-motion`. Canvas animations render a single static frame/poster; `diffuse-in`/`stagger` become instant; `marquee` and `token-resolve` freeze on a legible state.

---

## 7. Iconography & imagery

- **Icons:** one thin outline set only (e.g., Lucide). 1.5px stroke, sized 20–24px. Used in steps (S05) and reward rails (S06).
- **Imagery:** minimal. The organisms and the canvas field are the visual interest, not stock photography. Sponsor marks are simple monochrome wordmarks/logos (fictional — see STRUCTURE.md S08).
- **Wordmark:** `SAGI` set in Geist (or Geist Mono for a more instrument-like feel); decide during build and keep consistent in nav and footer.

---

## 8. Accessibility (quality floor — non-negotiable)

- Contrast: body text meets WCAG AA. Accents are for large text/graphics only.
- Color is never the only signal (see §2 rules) — pair with label/icon/position.
- Visible keyboard focus on every interactive element (2px `accent/teal` ring).
- Semantic structure: one `h1`; logical `h2`/`h3`; semantic tags on frames (`header`, `nav`, `section`, `article`, `footer`).
- All images have alt text; decorative canvases are `aria-hidden`.
- `prefers-reduced-motion` respected everywhere (see §6).
- Minimum font size 14px; body is 16px.

---

## 9. Assets / fonts checklist

- [ ] `Geist` + `Geist Mono` added as Framer fonts (weights 300/400/500/600 as needed).
- [ ] Color styles created for every token in §2.
- [ ] Text styles created for every style in §3.
- [ ] Components built per §5 before sections are assembled.
- [ ] Fictional sponsor marks (6–8) created for the `LogoTicker`.
- [ ] Favicon + OG/social image (can be a simple wordmark on `bg/dark`).
