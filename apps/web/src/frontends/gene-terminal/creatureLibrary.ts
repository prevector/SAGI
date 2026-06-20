import { normalizeGene, type EvolutionGene } from "@sagi/evolution";
import { createSeedGene, loadGenes } from "../../features/genes/geneStorage";

const STORAGE_KEY = "sagi.creatures.v1";
const MAX_STORED_CREATURES = 32;
const MAX_NAME_LENGTH = 24;

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

export interface StoredCreature {
  id: string;
  name: string;
  gene: EvolutionGene;
  phenotype: CreaturePhenotype;
  createdAt: string;
  updatedAt: string;
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

const ADJECTIVES: Record<CreaturePaletteKey, readonly string[]> = {
  verdant: ["Moss", "Fern", "Verdant", "Lime", "Grove", "Cedar"],
  ember: ["Ember", "Cinder", "Ochre", "Sienna", "Copper", "Rook"],
  violet: ["Iris", "Plum", "Violet", "Aster", "Velvet", "Nova"]
};

const NOUNS = ["Runner", "Mantis", "Drake", "Crawler", "Wisp", "Stag", "Heron", "Hopper"] as const;

function trimCreatures(creatures: StoredCreature[], limit = MAX_STORED_CREATURES): StoredCreature[] {
  if (creatures.length <= limit) return creatures;
  return [...creatures]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, limit);
}

function writePayload(creatures: StoredCreature[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(creatures));
}

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

function hexToHsl(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return [h, s, l];
}

function shiftHexHue(hex: string, degrees: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + degrees, s, l);
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

export function mutatePhenotype(parent: CreaturePhenotype, seed: string): CreaturePhenotype {
  const hash = hashSeed(seed);
  const palette = PALETTES.find((item) => item.key === parent.paletteKey) ?? PALETTES[0];
  const hueShift = ((hash & 1023) / 1023) * 18 - 9;
  const hueFrom = parent.hueFrom + hueShift;
  const hueTo = parent.hueTo + hueShift * 0.72;
  const accentShift = ((hash >> 10) & 255) / 255 * 8 - 4;
  const detailShift = ((hash >> 18) & 255) / 255 * 6 - 3;
  return buildPhenotype(
    seed,
    palette,
    hueFrom,
    hueTo,
    shiftHexHue(parent.accent, accentShift),
    shiftHexHue(parent.limb, detailShift),
    shiftHexHue(parent.crest, detailShift * 0.8),
    shiftHexHue(parent.cool, accentShift * 0.6)
  );
}

export function clonePhenotype(parent: CreaturePhenotype, seed: string): CreaturePhenotype {
  const palette = PALETTES.find((item) => item.key === parent.paletteKey) ?? PALETTES[0];
  return buildPhenotype(
    seed,
    palette,
    parent.hueFrom,
    parent.hueTo,
    parent.accent,
    parent.limb,
    parent.crest,
    parent.cool
  );
}

export function sanitizeCreatureName(name: string, fallback = "Creature"): string {
  const collapsed = name.replace(/\s+/g, " ").replace(/[^a-zA-Z0-9 ]/g, "").trim();
  return (collapsed || fallback).slice(0, MAX_NAME_LENGTH);
}

export function makeCreatureName(
  phenotype: CreaturePhenotype,
  existingNames: string[],
  seed: string
): string {
  const hash = hashSeed(seed);
  const adjectives = ADJECTIVES[phenotype.paletteKey];
  const base = `${adjectives[hash % adjectives.length]} ${NOUNS[(hash >> 3) % NOUNS.length]}`;
  const taken = new Set(existingNames.map((item) => item.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  const suffixes = ["II", "III", "IV", "V", "VI", "VII"];
  for (const suffix of suffixes) {
    const candidate = `${base} ${suffix}`.slice(0, MAX_NAME_LENGTH);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = `${adjectives[(hash >> (6 + attempt)) % adjectives.length]} ${NOUNS[(hash >> (9 + attempt * 2)) % NOUNS.length]}`.slice(0, MAX_NAME_LENGTH);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${hash.toString(36).slice(0, 4)}`.slice(0, MAX_NAME_LENGTH);
}

function normalizeCreature(raw: StoredCreature): StoredCreature {
  const gene = normalizeGene(raw.gene);
  const name = sanitizeCreatureName(raw.name || gene.name, gene.name);
  return {
    ...raw,
    name,
    gene: { ...gene, name },
    phenotype: raw.phenotype ?? createCreaturePhenotype(raw.id),
    updatedAt: raw.updatedAt || gene.updatedAt || new Date().toISOString(),
    createdAt: raw.createdAt || gene.createdAt || new Date().toISOString()
  };
}

function migrateLegacyGenes(): StoredCreature[] {
  const genes = loadGenes();
  return genes.map((gene, index) => {
    const id = `creature-${gene.id}`;
    const phenotype = createCreaturePhenotype(`${gene.id}:${index}`);
    const name = sanitizeCreatureName(gene.name || makeCreatureName(phenotype, [], id), `Creature ${index + 1}`);
    return {
      id,
      name,
      gene: { ...normalizeGene(gene), name },
      phenotype,
      createdAt: gene.createdAt,
      updatedAt: gene.updatedAt
    };
  });
}

export function createSeedCreature(): StoredCreature {
  const gene = createSeedGene();
  const id = `creature-${gene.id}`;
  const phenotype = createCreaturePhenotype(id);
  const name = "Verdant Seed";
  return {
    id,
    name,
    gene: { ...gene, name },
    phenotype,
    createdAt: gene.createdAt,
    updatedAt: gene.updatedAt
  };
}

export function loadCreatures(): StoredCreature[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacyGenes();
      return migrated.length > 0 ? migrated : [createSeedCreature()];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [createSeedCreature()];
    }
    const creatures = parsed.map((item) => normalizeCreature(item as StoredCreature));
    return creatures.length > 0 ? creatures : [createSeedCreature()];
  } catch {
    return [createSeedCreature()];
  }
}

export function saveCreatures(creatures: StoredCreature[]): void {
  const trimmed = trimCreatures(creatures);
  try {
    writePayload(trimmed);
    return;
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "QuotaExceededError") {
      throw error;
    }
  }

  for (const limit of [16, 8, 4, 2, 1]) {
    try {
      writePayload(trimCreatures(creatures, limit));
      return;
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "QuotaExceededError") {
        throw error;
      }
    }
  }

  throw new Error("Failed to persist creatures to local storage after quota trimming.");
}

export function upsertCreature(creatures: StoredCreature[], creature: StoredCreature): StoredCreature[] {
  const index = creatures.findIndex((item) => item.id === creature.id);
  if (index === -1) return [creature, ...creatures];
  const next = creatures.slice();
  next[index] = creature;
  return next;
}
