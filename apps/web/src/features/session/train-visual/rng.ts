// Single import site for seeded RNG, so the rest of the train-visual module
// never reaches into @sagi/evolution directly. Determinism: every random draw
// in the sim derives from session.id via makeRng / subRng (PLAN-TRAIN-ANIM §3).

export { makeRng, subRng, pick, rangeInt, gaussian, type RNG } from "@sagi/evolution";
