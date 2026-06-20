import {
  createRandomGene,
  makeRng,
  normalizeGene,
  type EvolutionGene
} from "@sagi/evolution";

const STORAGE_KEY = "sagi.genes.v1";

export function loadGenes(): EvolutionGene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [createSeedGene()];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [createSeedGene()];
    }
    return parsed.map((gene) => normalizeGene(gene as EvolutionGene));
  } catch {
    return [createSeedGene()];
  }
}

export function saveGenes(genes: EvolutionGene[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(genes, null, 2));
}

export function createSeedGene(): EvolutionGene {
  return createRandomGene(makeRng("initial-gene"), {
    name: "IAF seed gene",
    notes: "Local starter gene for the IAF spike task."
  });
}

export function upsertGene(genes: EvolutionGene[], gene: EvolutionGene): EvolutionGene[] {
  const index = genes.findIndex((item) => item.id === gene.id);
  if (index === -1) {
    return [gene, ...genes];
  }
  const next = genes.slice();
  next[index] = gene;
  return next;
}
