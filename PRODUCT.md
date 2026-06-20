# Product

## Register

product

## Users

Contributors to SAGI — a distributed, open search for AGI. They are technically
literate people (researchers, engineers, compute donors, bounty sponsors) who
lend compute to an evolving population of candidate "minds" and track the
search. Their context is a dark dashboard they check between other work: to see
their standing (tokens, rank), the live state of the network, open bounties, and
to start and watch training sessions. The primary job on any screen is
*situational awareness of the search* and, on the session screen, *running and
watching a training run*.

One stakeholder is colorblind — this is a hard, non-negotiable constraint, not a
nice-to-have.

## Product Purpose

SAGI is a worldwide living laboratory where candidate algorithms are grown,
observed, and selected. The web app is the contributor-facing instrument for
that lab: it makes an abstract, distributed evolutionary search legible and
participable — standing, economy (tokens/bounties), collective progress toward
AGI, the live network, and per-session training. Success is a contributor
trusting the numbers, understanding the state of the search at a glance, and
being drawn to start a session and watch their creature learn.

It is mock-first today (one typed `Api`), so the engine swaps in behind the same
contract with no UI change.

## Brand Personality

**Precise · deep-tech · alive.** A lab instrument watching intelligence emerge
from noise. Voice is calm, exact, and active ("Run the search", "Start a
session") — never hype, never cute. Numbers and IDs are set in mono like
readouts. The one place the instrument comes alive is the signature moment (the
hero emergence on the site; the creature evolving to solve its maze in the app);
everything around it stays quiet and disciplined.

## Anti-references

- **Generic crypto / token dashboard** — no neon-on-black "web3" clichés,
  speculative-finance hype, gradient-pumped numbers, or "to the moon" energy.
  The orange economy axis is accounting, not gambling.
- **Templated SaaS admin** — no identical icon+heading+text card grids, no
  hero-metric template, no tiny uppercase eyebrow over every section as
  scaffolding, no numbered 01/02/03 markers unless the content is a real
  sequence.
- **Gamified / consumer-playful** — no mascots, confetti, badges, toy-rounded
  shapes, or playful illustration. The creature is procedural and serious, not a
  cartoon.
- **Dense enterprise console** — no cramped Bloomberg-terminal data walls; keep
  generous breathing room and a clear hierarchy.

## Design Principles

1. **Show the search, don't describe it.** The interface itself should behave
   like the thing it represents — emergence, evolution, selection — most of all
   on the session visual. Prefer a living readout over a static stat.
2. **Spend boldness once.** One signature moment per surface (the hero, the
   evolving creature). Everything else is calm, hairline-precise, and gets out
   of the way.
3. **Instrument honesty.** Data reads like instrument output: mono numerals,
   real units, deltas with direction. Never dramatize a number; let precision
   carry the credibility.
4. **Two axes, never mixed.** Teal = intelligence/selection; orange =
   economy/reward. Every accent means one of the two — never decoration.
5. **Legible to everyone, always.** Color is never the only signal. Every status,
   delta, series, and state also carries shape, icon, label, or position.

## Accessibility & Inclusion

Target **WCAG 2.1 AA**, with two standing rules above the baseline:

- **Color is never the only signal** (a primary stakeholder is colorblind):
  pair every teal/orange meaning with a label, icon, shape, or position.
- **Honor `prefers-reduced-motion`** everywhere, including JS/Canvas animation
  (the 3D session visual must fall back to a static frame).

Also: visible keyboard focus on every interactive element (2px teal ring),
semantic landmarks/headings, ≥16px body text, and AA contrast for all body copy
(accents reserved for large text/graphics, never body).
