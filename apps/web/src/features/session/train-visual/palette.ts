// Typed colour constants for the compute/train genome-field visual.
//
// Canvas-2D needs concrete colour strings (not CSS custom properties), so this
// file mirrors the authoritative DESIGN.md / tokens.css palette in one place.
// Nothing in the train-visual module hardcodes a hex literal — import from here.
//
// The visual lives on the near-black "instrument" surface (the hero register),
// NOT the white studio stage the 3D maze uses. Teal = intelligence/resolved;
// orange = economy/breakthrough (DESIGN.md §1 axis rule); grey = noise.

export const PALETTE = {
  // Surfaces — the dark instrument field
  bgDeep: "#000000",
  bg: "#041414", // primary dark stage (tokens: --sagi-dark)
  surface: "#0B1E1E",

  // Noise / unresolved glyphs (tokens: --text-faint family)
  noise: "#6E8080",

  // Resolved organism glyphs
  resolved: "#FFFFFF",

  // Intelligence axis (highlighted / fittest genomes, glow)
  teal: "#17C4C4",
  tealDeep: "#159999",
  tealPale: "#EFF9F9",

  // Economy axis (breakthrough / new-best pulse — used sparingly)
  orange: "#F0783D",
  orangeDeep: "#C85E2A",

  // Text / neutral (HUD)
  paper: "#FAF8F0",
  textMuted: "#9FB6B6",
  textFaint: "#6E8585",
} as const;

export type PaletteKey = keyof typeof PALETTE;
