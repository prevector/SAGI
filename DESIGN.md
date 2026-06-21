# DESIGN.md — SAGI Design System

**Project:** SAGI — a distributed search for artificial general intelligence
**Surface:** single-page marketing landing site (React + Vite + CSS Modules)
**Status:** active. This file is the single source of truth for all visual tokens and brand conventions. Never hardcode hex values or invent new type sizes — reference the tokens below.

---

## 1. Brand essence & principles

SAGI is a worldwide, living laboratory where candidate minds are grown, observed, and selected. The site feels **warm and editorial** — precise and intelligent, not a generic crypto or SaaS page.

Three principles drive every decision:

1. **Warm emergence.** The hero gradient (soft pink dissolving into deep blue) is the emotional centre. Sections with gradient backgrounds carry significance: hero, "Why contribute".
2. **Editorial calm.** Cormorant serif for body and eyebrow text gives a thoughtful, scientific-journal quality. Gothic A1 handles headings with clean weight.
3. **Two fonts, one palette.** Cormorant for everything readers absorb (eyebrows, body, captions). Gothic A1 for everything that commands (headings, nav labels). Never mix roles.

**Signature element:** the hero *EmergenceField* canvas animation — noise glyphs crystallising into a living organism — layered over the pink→blue gradient. Spend boldness here; keep everything else restrained.

---

## 2. Color

All values are defined as CSS custom properties in `apps/web/src/styles/tokens.css`. Reference variables — never hardcode hex.

### Brand palette

| Token | Hex | Use |
|---|---|---|
| `--pink-50` | `#FDF0F3` | Faint pink tint |
| `--pink-100` | `#FAD9E2` | Gradient start |
| `--pink-300` | `#F5C5CE` | Primary accent, buttons |
| `--pink-500` | `#E07A97` | Mid pink |
| `--pink-700` | `#C04B6E` | Accent dark / hover |
| `--pink-900` | `#7A1F3D` | Deep pink |
| `--brown-50` | `#F5F0EA` | Warm off-white |
| `--brown-100` | `#E4D8C8` | Warm tint |
| `--brown-300` | `#A8886A` | Muted brown |
| `--brown-500` | `#6B4F35` | Secondary text |
| `--brown-700` | `#3E2A18` | Body text |
| `--brown-900` | `#2E2118` | Primary text, footer bg |
| `--blue-50` | `#EDF4F9` | Faint blue |
| `--blue-100` | `#C8DFF0` | Gradient mid |
| `--blue-300` | `#6BADD4` | Gradient accent |
| `--blue-500` | `#3C7FA8` | Secondary accent |
| `--blue-700` | `#2A5F7D` | Blue hover |
| `--blue-900` | `#1A3A4E` | Deep blue |

### Semantic tokens

| Token | Resolves to | Use |
|---|---|---|
| `--bg` | white | Page background |
| `--bg-muted` | `--gray-50` | Subtle section bg |
| `--text` | `--brown-900` | Primary body text |
| `--text-muted` | `--gray-500` | Captions, metadata |
| `--accent` | `--pink-300` | Primary accent |
| `--accent-2` | `--blue-500` | Secondary accent |
| `--hero-gradient` | `135deg, --pink-100 → --blue-300 → --blue-500` | Hero + "Why contribute" bg |

### Color rules

- **Never hardcode hex.** Always `var(--token-name)`.
- **`--hero-gradient`** is used for two sections: the hero and the TokenEconomy ("Why contribute") section. These are the only gradient backgrounds.
- The footer uses `--brown-900` as its background with white text.
- Primary buttons use `--pink-300` fill with `--brown-900` text — warm pink, not blue.

---

## 3. Typography

**Two families only:**
- `Cormorant` — eyebrows, body large, body, captions. The editorial voice.
- `Gothic A1` — headings (H1/H2/H3) and UI labels. The structural voice.

Both are self-hosted (fonts in the Claude Design project) and also loaded via Google Fonts as a fallback in `apps/web/src/styles/globals.css`.

### Type scale

| Style | Family | Size | Weight | Line-height | Notes |
|---|---|---|---|---|---|
| H1 | Gothic A1 (`--font-sans`) | 56px | 700 | 1.05 | `letter-spacing: -0.01em` |
| H2 | Gothic A1 (`--font-sans`) | 40px | 600 | 1.1 | `letter-spacing: -0.01em` |
| H3 | Gothic A1 (`--font-sans`) | 24px | 600 | 1.2 | |
| Eyebrow | Cormorant (`--font-display`) | 22px | 500 | 1.3 | **Not italic.** `letter-spacing: 0.01em` |
| Body Large | Cormorant (`--font-display`) | 18px | 400 | 1.4 | Section intros, hero subhead |
| Body | Cormorant (`--font-display`) | 16px | 400 | 1.4 | Default copy |
| Small / Label | Gothic A1 (`--font-ui`) | 12px | 500 | 1.4 | UI chrome, metadata |

**Critical rule:** eyebrows and body copy are Cormorant — not Gothic A1. Cormorant should not be italic in UI contexts (the old spec used italic; the current brand does not).

Mobile breakpoint (≤810px): H1 → 36px, H2 → 28px, H3 → 20px, Eyebrow → 16–17px.

---

## 4. Spacing & layout

Spacing scale (`--s1` through `--s8`): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64

- **Container:** `max-width: 1320px` (`--container`), centered. Side padding `--s7` (48px) desktop, `--s5` (24px) mobile.
- **Section vertical padding:** 128px desktop · 88px tablet · 56px mobile.
- **Radius:** `--radius-sm`=4px · `--radius`=8px · `--radius-lg`=16px · `--radius-pill`=9999px (buttons).
- **No drop shadows.** Elevation is expressed through surface color only.

---

## 5. Components

### `Button`
Pill (`--radius-pill`), padding `12px 20px`. Variants:
- **Primary** — `background: --pink-300`, `color: --brown-900`. The default CTA.
- **Ghost** — transparent, `color: --brown-900`, `border: 1px solid rgba(46,33,24,0.3)`.

### `Eyebrow`
Cormorant 22px, weight 500, non-italic, `--brown-700`. Optional 5px dot prefix in `--pink-700`. Used to label every section.

### `Nav`
Sticky top. Transparent over hero; on scroll: `background: rgba(253,240,243,0.85)` with `backdrop-filter: blur(12px)`. Left: SAGI logo SVG (`currentColor` → `--brown-900`). Right: Ghost button + Primary button.

### `Footer`
`background: --brown-900`. SAGI logo SVG in white. 4-column link grid. Copyright + disclaimer in `--brown-500`.

### Code components
- `EmergenceField` — hero canvas animation. Configured with `transparentBg: true` over the gradient; `noiseColor: rgba(46,33,24,0.18)`, `organismColor: rgba(255,255,255,0.95)`.
- `OrganismVignette` — small looping creature (per-section).

---

## 6. Motion

**Timing:** `--motion-fast`=150ms · `--motion-base`=300ms · `--motion-slow`=600ms
**Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` for all entrances.

- `diffuse-in` — scroll reveal: opacity 0→1, translateY 16px→0, blur 6px→0. `motion/slow`.
- `emergence` — hero EmergenceField loop (continuous, ambient).
- `stagger` — cards/rows enter with `diffuse-in` + 80ms increments.

`prefers-reduced-motion`: all transitions instant, canvas shows a static frame.

---

## 7. Accessibility

- Body text contrast meets WCAG AA.
- One `h1` per page; logical heading hierarchy.
- Visible keyboard focus on all interactive elements.
- Canvas animations are `aria-hidden`.
- Minimum font size 14px; body is 16px.
- `prefers-reduced-motion` honoured everywhere.

---

## 8. Token reference (quick lookup)

```css
/* Fonts */
--font-display: "Cormorant", Georgia, serif;   /* eyebrow, body */
--font-sans:    "Gothic A1", system-ui, sans-serif; /* headings */
--font-ui:      "Gothic A1", system-ui, sans-serif; /* labels */

/* Key colors */
--pink-300:   #F5C5CE;  /* primary accent / button fill */
--brown-900:  #2E2118;  /* primary text / footer bg */
--brown-700:  #3E2A18;  /* body / eyebrow text */
--blue-500:   #3C7FA8;  /* secondary accent */
--hero-gradient: linear-gradient(135deg, #FAD9E2 0%, #6BADD4 60%, #3C7FA8 100%);
```

---

## 9. Dashboard — "SAGI Terminal" (authenticated workspace, `/app`)

The dashboard is a **dock-panel workspace** (an IDE-style instrument), rebranded from the old dark terminal to the warm editorial system. Same tokens as the marketing site — never hardcode hex.

### Shell & layout
- **Frame:** full-viewport app. Vertical stack: **menu bar (46px, fixed)** above a **dock area (fills remaining)**.
- **Dock area:** horizontal, 12px gutter + 12px padding. **Left column** `320px` fixed (Network / Library / Leaderboard) · **right area** fills, containing a `380px` **sub-column** (Training / Graph / Creature) beside a flexible **Inference** panel.
- **Background:** `--bg-warm` (`--brown-50`) warm paper. Optional faint scanline/grid overlay at very low opacity is allowed but never dark.

### Menu bar
- Background `--white` @ ~85%, bottom `1px --border`. Left cluster + right cluster, space-between, 20px side padding.
- **Mark:** `SAGI` in `--font-display` (Cormorant) SemiBold 18 + `TERMINAL` in `--font-ui` (Gothic A1) Medium 11, uppercase, tracked `+0.08em`, color `--pink-700`.
- **Menu items / info cluster:** `--font-ui` 11px, uppercase, tracked, `--brown-500`; pipe-separated.

### Panel pattern (every dock panel)
- Card: `--surface` (white) fill, `1px --border`, `--radius` (8px), clipped. **No drop shadows** — elevation via border + surface only.
- **Header bar:** `--bg-muted` (`--gray-50`) fill, `1px --border` bottom. Title `--font-ui` Medium 11, uppercase, tracked `+0.07em`, `--brown-700`. Optional right-aligned meta `--font-ui` 10, `--brown-500`.
- **Body:** 12px padding, 10–12px item spacing.

### Panel inventory
| Panel | Contents |
|---|---|
| Network | Auto-laid node cloud on `--brown-50`; self/online node `--status-success`, peers in `--pink-300` / `--blue-500` / `--brown-300` |
| Library | `NAME` field (muted input) · `NEW CREATURE` (pink-300) + `SAVE` (ghost) buttons · creature list, **selected row** `--pink-300` tint + border |
| Leaderboard | rank (`--brown-300`) · name/creature (`--brown-700`) · score (`--pink-700`) rows |
| Training | mode rows (active row pink-tinted) with `iterations` value · `▶ RUN` button (`--pink-300`) |
| Graph | training curve in a `--gray-50` plot: **current** line `--brown-700` solid, **best** line `--blue-500` dashed |
| Creature | warm radial viewport (`--brown-50→--brown-100`) with an abstract morphology |
| Inference | token glyph chips 44×44: **active** `--blue-500` tint, **predicted** `--pink-300` tint, idle `--gray-50` + border |

### Type & accent rules
- **`--font-ui` (Gothic A1) for all UI** — labels, values, micro-labels. `--font-display` (Cormorant) is reserved for the wordmark only; **never** use Cormorant in dense data UI.
- Accent semantics: **brown** = primary/current, **blue-500** = secondary/best, **pink** = selection/highlight, **success** = self/online.

---

## 10. Bounty posting (`/app/launch-bounty`)

A centered **form**, rebranded to the warm editorial system (replaces the repo's hardcoded warm-paper hex with brand variables).

### Shell
- Page background `--bg-warm` (`--brown-50`). Centered **shell** `max-width: 720px`, 20px gap. Back link (`← Back`) top-left, `--font-ui` 13, `--brown-500`.
- **Header:** H1 `Launch a bounty` — `--font-sans` SemiBold 32, `--brown-900`. Lede in `--font-display` (Cormorant) 18, `--brown-700`.

### Section cards
- `--surface` @ ~70%, `1px --border`, `--radius-lg`, 24px padding, 16px gap. **No shadows.**
- **Section title:** `--font-ui` Medium 12, uppercase, tracked `+0.06em`, `--pink-700` (e.g. `BOUNTY SPECIFICATION`, `REWARD & CONTRIBUTION`).

### Fields
- Label `--font-ui` Medium 12, `--brown-500`, above the input.
- Input: `--bg-muted` fill, `1px --border`, `--radius` (8px), 10–12px padding. Value `--font-ui` Regular 13 `--brown-900`; placeholder `--brown-500`. Selects show `▾`; paired fields use 2-col rows (collapse to 1-col on narrow).
- **Bounty specification:** Title · Type of algorithm (select) · Sponsor category (select) · Estimated compute (GFLOP-hours) · Start/End date · Target metric · Target value (optional) · Description (textarea).
- **Reward & contribution:** Your contribution (EUR, `€` prefix) · Reward (tokens, read-only, `⬡` prefix) + rate hint + utility note.

### Reward parameters (constants)
- `1 token = €10` · minimum **€100 / 10 tokens** · `tokens = floor(EUR / 10)` (read-only, derived).
- Currency **EUR (€)**, token glyph **⬡**. Payment via **Mollie**. Submit CTA: `Continue to payment · €{amount}` (pink/gradient).

### Copy constraints (binding)
- The token is a **utility / work token** — never describe contributions or credits as **shares, equity, or a financial stake**, and never imply **proportional IP / licensing payouts**. The footer utility-disclaimer stays exactly as written.

