// Typed color constants for the 3D session visual.
//
// three.js needs concrete color values (not CSS custom properties), so this
// file mirrors the authoritative DESIGN.md / tokens.css palette in one place.
// Nothing in the visual module hardcodes a hex literal — import from here.
//
// Bloom note: to make a material *glow* under selective Bloom, its emissive
// color is pushed above the 0..1 range (see `glow()`), so the bloom pass picks
// it out while everything else stays matte. Keep base surfaces near-black.

/** Brand hexes, straight from DESIGN.md §2 (and apps/web tokens.css). */
export const PALETTE = {
  // Surfaces — the dark stage
  bgDeep: "#000000",
  bg: "#041414", // primary dark stage
  surface: "#0B1E1E",
  surface2: "#0E2626",

  // Intelligence axis (creature / search / solved path)
  teal: "#17C4C4",
  tealDeep: "#159999",
  tealPale: "#EFF9F9",

  // Economy axis (goal / exit / reward / success)
  orange: "#F0783D",
  orangeDeep: "#C85E2A",

  // Text / neutral
  paper: "#FAF8F0",
  textMuted: "#9FB6B6",
  textFaint: "#6E8585",
} as const;

export type PaletteKey = keyof typeof PALETTE;

/**
 * Returns an emissive-intensity multiplier that pushes a color past 1.0 so the
 * selective Bloom pass treats it as a light source. Use on hero elements only
 * (creature, solved path, exit, success) — never on the matte stage.
 */
export function glow(intensity = 1.6): number {
  return intensity;
}

/** Fog color for the stage — slightly lifted from pure bg so depth reads. */
export const FOG_COLOR = PALETTE.bg;

/** Light "studio" stage background + fog (clean white look). */
export const STAGE_BG = "#FFFFFF";
export const STAGE_FOG = "#EEF3F3";
