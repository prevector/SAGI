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
    return ensurePaperSeed(parsed.map((gene) => normalizeGene(gene as EvolutionGene)));
  } catch {
    return [createSeedGene()];
  }
}

export function saveGenes(genes: EvolutionGene[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(genes, null, 2));
}

export function createSeedGene(): EvolutionGene {
  return createRandomGene(makeRng("initial-gene"), {
    name: "Paper IAF seed gene",
    notes: "Single-ENU IAF starter matching the paper preset: 32 neuron states, no synapse compartment, spike output gain 1000.",
    architecture: {
      neuronStateSize: 32,
      synapseStateSize: 0,
      outputGain: 1000
    }
  });
}

function ensurePaperSeed(genes: EvolutionGene[]): EvolutionGene[] {
  const hasPaperSeed = genes.some((gene) =>
    gene.architecture.neuronStateSize === 32 &&
    gene.architecture.synapseStateSize === 0 &&
    gene.architecture.outputGain === 1000
  );
  return hasPaperSeed ? genes : [createSeedGene(), ...genes];
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
