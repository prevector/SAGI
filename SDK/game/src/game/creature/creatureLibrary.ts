// Trimmed copy of apps/web/src/frontends/gene-terminal/creatureLibrary.ts.
// The SDK game is a self-contained mini-project (own package.json/lockfile) and
// cannot import @sagi/evolution or apps/web code, so the genome-driven creature
// renderer is COPIED in. Only the pure morphology/phenotype helpers the renderer
// needs are kept here — all localStorage/persistence/naming helpers are dropped.

// Minimal EvolutionGene shape. The renderer only ever reads `weights` positionally
// (via sampleWeight, modulo length) plus three architecture numbers used solely in a
// useMemo dependency array — semantic meaning of the genome is irrelevant.
export interface EvolutionGene {
  weights: number[];
  architecture: {
    neuronStateSize: number;
    synapseStateSize: number;
    outputGain: number;
  };
}

export type CreaturePaletteKey = "verdant" | "ember" | "violet";
export type CreatureArchetype = "biped" | "quadruped" | "hexapod" | "longneck" | "crawler";

export interface CreaturePhenotype {
  id: string;
  paletteKey: CreaturePaletteKey;
  paletteName: string;
  hueFrom: number;
  hueTo: number;
  bodyFrom: string;
  bodyTo: string;
  accent: string;
  limb: string;
  crest: string;
  cool: string;
  eye: string;
}

export interface CreatureMorphologySummary {
  archetype: CreatureArchetype;
  legPairs: number;
  armPairs: number;
  spineSegments: number;
}

interface PaletteSpec {
  key: CreaturePaletteKey;
  name: string;
  hueFrom: [number, number];
  hueTo: [number, number];
  accent: [number, number, number];
  limb: [number, number, number];
  crest: [number, number, number];
  cool: [number, number, number];
}

const PALETTES: readonly PaletteSpec[] = [
  {
    key: "verdant",
    name: "Verdant",
    hueFrom: [108, 126],
    hueTo: [142, 164],
    accent: [132, 0.56, 0.52],
    limb: [84, 0.2, 0.42],
    crest: [96, 0.36, 0.34],
    cool: [176, 0.42, 0.48]
  },
  {
    key: "ember",
    name: "Ember",
    hueFrom: [4, 16],
    hueTo: [26, 38],
    accent: [18, 0.72, 0.54],
    limb: [24, 0.24, 0.42],
    crest: [2, 0.4, 0.36],
    cool: [40, 0.42, 0.56]
  },
  {
    key: "violet",
    name: "Violet",
    hueFrom: [264, 280],
    hueTo: [300, 322],
    accent: [284, 0.58, 0.56],
    limb: [252, 0.22, 0.42],
    crest: [312, 0.36, 0.36],
    cool: [226, 0.44, 0.54]
  }
] as const;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    h ^= seed.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickRange(seed: number, [from, to]: [number, number], shift: number): number {
  const fraction = ((seed >> shift) & 1023) / 1023;
  return from + (to - from) * fraction;
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sampleWeight(gene: EvolutionGene, index: number): number {
  return gene.weights[index % Math.max(1, gene.weights.length)] ?? 0;
}

export function sampleMorph(gene: EvolutionGene, index: number, gain = 2): number {
  return clamp01(1 / (1 + Math.exp(-sampleWeight(gene, index) * gain)));
}

export function summarizeCreatureGene(gene: EvolutionGene): CreatureMorphologySummary {
  const uprightness = 0.06 + sampleMorph(gene, 41, 1.8) * 0.9;
  const archetype =
    uprightness > 0.72 ? "biped" :
    uprightness > 0.52 ? "longneck" :
    uprightness < 0.18 ? "crawler" :
    sampleMorph(gene, 42, 1.4) > 0.58 ? "hexapod" :
    "quadruped";
  const rawLegPairs = 1 + Math.floor(sampleMorph(gene, 43, 1.8) * 3.999);
  const legPairs =
    archetype === "biped" ? 1 :
    archetype === "hexapod" ? Math.max(3, rawLegPairs) :
    archetype === "crawler" ? Math.max(2, rawLegPairs) :
    rawLegPairs;
  const armPairs =
    archetype === "biped" ? 1 + Math.floor(sampleMorph(gene, 44, 1.5) * 1.999) :
    archetype === "longneck" && sampleMorph(gene, 45, 1.5) > 0.62 ? 1 :
    0;
  const spineSegments = 4 + Math.floor(sampleMorph(gene, 46, 1.6) * 3.999);
  return { archetype, legPairs, armPairs, spineSegments };
}

function buildPhenotype(
  seed: string,
  palette: PaletteSpec,
  hueFrom: number,
  hueTo: number,
  accent: string,
  limb: string,
  crest: string,
  cool: string
): CreaturePhenotype {
  const hash = hashSeed(seed);
  return {
    id: `ph-${seed.slice(0, 8)}-${hash.toString(36).slice(0, 4)}`,
    paletteKey: palette.key,
    paletteName: palette.name,
    hueFrom,
    hueTo,
    bodyFrom: hslToHex(hueFrom, 0.58, 0.58),
    bodyTo: hslToHex(hueTo, 0.62, 0.5),
    accent,
    limb,
    crest,
    cool,
    eye: "#f7f0e6"
  };
}

export function createCreaturePhenotype(seed: string): CreaturePhenotype {
  const hash = hashSeed(seed);
  const palette = PALETTES[hash % PALETTES.length];
  const hueFrom = pickRange(hash, palette.hueFrom, 0);
  const hueTo = pickRange(hash, palette.hueTo, 10);
  return buildPhenotype(
    seed,
    palette,
    hueFrom,
    hueTo,
    hslToHex(...palette.accent),
    hslToHex(...palette.limb),
    hslToHex(...palette.crest),
    hslToHex(...palette.cool)
  );
}
