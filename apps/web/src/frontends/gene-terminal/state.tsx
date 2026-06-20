import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  createRandomGene,
  iafGenomeLength,
  makeRng,
  resizeGeneArchitecture,
  type EsHyperparams,
  type EvolutionGene,
  type IafRunConfig
} from "@sagi/evolution";
import { createSeedGene } from "../../features/genes/geneStorage";
import {
  clonePhenotype,
  createCreaturePhenotype,
  createSeedCreature,
  loadCreatures,
  makeCreatureName,
  mutatePhenotype,
  sanitizeCreatureName,
  saveCreatures,
  summarizeCreatureGene,
  type CreatureMorphologySummary,
  type CreaturePhenotype,
  type StoredCreature,
  upsertCreature
} from "./creatureLibrary";

export type TrainingStatus = "idle" | "running" | "paused";

export interface MockPoint {
  generation: number;
  selectedLoss: number;
  sampledLoss: number;
}

export interface GeneTerminalState {
  creatures: StoredCreature[];
  selectedCreature: StoredCreature;
  selectedMorphology: CreatureMorphologySummary;
  genes: EvolutionGene[];
  selectedGene: EvolutionGene;
  selectedId: string;
  runConfig: IafRunConfig;
  es: EsHyperparams;
  status: TrainingStatus;
  generation: number;
  bestLoss: number;
  sampledLoss: number;
  history: MockPoint[];
  weightCount: number;
  selectGene: (id: string) => void;
  renameCreature: (name: string) => void;
  saveCreature: () => void;
  createGene: () => void;
  generateCreature: () => void;
  mutateGene: () => void;
  duplicateGene: () => void;
  deleteAllCreatures: () => void;
  updateArchitecture: (key: keyof EvolutionGene["architecture"], value: number) => void;
  updateEs: (key: keyof EsHyperparams, value: number) => void;
  start: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
}

const PAPER_IAF_RUN: IafRunConfig = {
  seed: "paper-iaf",
  task: "iaf",
  sequenceLength: 100,
  environments: 32
};

const PAPER_IAF_ES: EsHyperparams = {
  generations: 10000,
  populationPairs: 256,
  sigma: 0.01,
  learningRate: 1,
  momentum: 0.9
};

const GeneTerminalContext = createContext<GeneTerminalState | null>(null);

function makeGeneId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function syncCreatureName(creature: StoredCreature, name: string): StoredCreature {
  const normalizedName = sanitizeCreatureName(name, creature.name);
  return {
    ...creature,
    name: normalizedName,
    updatedAt: new Date().toISOString(),
    gene: {
      ...creature.gene,
      name: normalizedName,
      updatedAt: new Date().toISOString()
    }
  };
}

function getInitialGeneState(): { creatures: StoredCreature[]; selectedId: string } {
  const creatures = loadCreatures();
  const fallback = creatures[0] ?? createSeedCreature();
  return {
    creatures: creatures.length > 0 ? creatures : [fallback],
    selectedId: fallback.id
  };
}

function initialLoss(gene: EvolutionGene): number {
  return 88 + (gene.weights.length % 47) * 0.73;
}

function nextMockPoint(previous: MockPoint, gene: EvolutionGene): MockPoint {
  const generation = previous.generation + 1;
  const wobble = Math.abs(Math.sin(generation * 0.41 + gene.weights.length * 0.001));
  const sampledLoss = previous.selectedLoss + wobble * 12 + (generation % 9 === 0 ? 28 : 0);
  const improvement = generation % 5 === 0 ? 0.18 + wobble * 0.45 : 0;
  const selectedLoss = Math.max(0.01, previous.selectedLoss - improvement);
  return { generation, sampledLoss, selectedLoss };
}

function createPaperGene(index: number, existingNames: string[]): { gene: EvolutionGene; phenotype: CreaturePhenotype } {
  const seed = `paper-gene:${Date.now()}:${index}`;
  const phenotype = createCreaturePhenotype(seed);
  const gene = createRandomGene(makeRng(seed), {
    id: makeGeneId("gene"),
    name: makeCreatureName(phenotype, existingNames, seed),
    notes: "Mock client gene. Real ES execution is intentionally not wired into this redesign yet.",
    architecture: {
      neuronStateSize: 32,
      synapseStateSize: 0,
      outputGain: 1000
    }
  });
  return { gene, phenotype };
}

function createCreatureGene(source: EvolutionGene, index: number, existingNames: string[]): { gene: EvolutionGene; phenotype: CreaturePhenotype } {
  const seed = `creature-gene:${Date.now()}:${index}`;
  const phenotype = createCreaturePhenotype(seed);
  const gene = createRandomGene(makeRng(seed), {
    id: makeGeneId("creature"),
    name: makeCreatureName(phenotype, existingNames, seed),
    notes: "Morphology test gene for the local creature viewport.",
    architecture: {
      neuronStateSize: source.architecture.neuronStateSize,
      synapseStateSize: source.architecture.synapseStateSize,
      outputGain: source.architecture.outputGain
    }
  });
  return { gene, phenotype };
}

function mutateCreatureGene(
  source: EvolutionGene,
  parentPhenotype: CreaturePhenotype,
  index: number,
  existingNames: string[]
): { gene: EvolutionGene; phenotype: CreaturePhenotype } {
  const seed = `mutate-creature:${source.id}:${Date.now()}:${index}`;
  const rng = makeRng(seed);
  const phenotype = mutatePhenotype(parentPhenotype, seed);
  const now = new Date().toISOString();
  const weights = source.weights.map((weight, weightIndex) => {
    const influence =
      weightIndex < 128 ? 0.12 :
      weightIndex < 256 ? 0.08 :
      0.03;
    const shouldMutate = rng() < 0.78;
    if (!shouldMutate) {
      return weight;
    }

    const delta = (rng() * 2 - 1) * influence;
    return weight + delta;
  });

  const gene = {
    ...source,
    id: makeGeneId("creature"),
    name: makeCreatureName(phenotype, existingNames, seed),
    createdAt: now,
    updatedAt: now,
    notes: "Local morphology mutation derived from the current creature gene.",
    weights
  };
  return { gene, phenotype };
}

function geneToCreature(gene: EvolutionGene, phenotype: CreaturePhenotype, existingNames: string[]): StoredCreature {
  const id = `creature-${gene.id}`;
  const name = sanitizeCreatureName(gene.name || makeCreatureName(phenotype, existingNames, id), gene.name || "Creature");
  return {
    id,
    name,
    gene: { ...gene, name, updatedAt: new Date().toISOString() },
    phenotype,
    createdAt: gene.createdAt,
    updatedAt: new Date().toISOString()
  };
}

export function GeneTerminalProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(getInitialGeneState);
  const [creatures, setCreatures] = useState<StoredCreature[]>(initialState.creatures);
  const [selectedId, setSelectedId] = useState(initialState.selectedId);
  const selectedCreature = creatures.find((creature) => creature.id === selectedId) ?? creatures[0] ?? createSeedCreature();
  const selectedGene = selectedCreature.gene ?? createSeedGene();
  const [runConfig] = useState<IafRunConfig>(PAPER_IAF_RUN);
  const [es, setEs] = useState<EsHyperparams>(PAPER_IAF_ES);
  const [status, setStatus] = useState<TrainingStatus>("idle");
  const [history, setHistory] = useState<MockPoint[]>(() => {
    const loss = initialLoss(selectedGene);
    return [{ generation: 0, selectedLoss: loss, sampledLoss: loss }];
  });

  useEffect(() => {
    try {
      saveCreatures(creatures);
    } catch (error) {
      console.warn("Failed to persist creatures to local storage.", error);
    }
  }, [creatures]);

  useEffect(() => {
    const loss = initialLoss(selectedGene);
    setHistory([{ generation: 0, selectedLoss: loss, sampledLoss: loss }]);
    setStatus("idle");
  }, [selectedGene.id]);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => {
      setHistory((items) => {
        const last = items[items.length - 1];
        if (!last || last.generation >= es.generations) {
          setStatus("paused");
          return items;
        }
        return [...items, nextMockPoint(last, selectedGene)];
      });
    }, 220);
    return () => window.clearInterval(timer);
  }, [es.generations, selectedGene, status]);

  const latest = history[history.length - 1];
  const value = useMemo<GeneTerminalState>(() => ({
    creatures,
    selectedCreature,
    selectedMorphology: summarizeCreatureGene(selectedGene),
    genes: creatures.map((item) => item.gene),
    selectedGene,
    selectedId,
    runConfig,
    es,
    status,
    generation: latest?.generation ?? 0,
    bestLoss: latest?.selectedLoss ?? 0,
    sampledLoss: latest?.sampledLoss ?? 0,
    history,
    weightCount: iafGenomeLength(selectedGene.architecture),
    selectGene: setSelectedId,
    renameCreature: (name) => {
      const renamed = syncCreatureName(selectedCreature, name);
      setCreatures((items) => upsertCreature(items, renamed));
    },
    saveCreature: () => {
      const saved = {
        ...selectedCreature,
        updatedAt: new Date().toISOString(),
        gene: {
          ...selectedGene,
          name: selectedCreature.name,
          updatedAt: new Date().toISOString()
        }
      };
      setCreatures((items) => upsertCreature(items, saved));
    },
    createGene: () => {
      const existingNames = creatures.map((item) => item.name);
      const { gene, phenotype } = createPaperGene(creatures.length + 1, existingNames);
      const creature = geneToCreature(gene, phenotype, existingNames);
      setCreatures((items) => [creature, ...items]);
      setSelectedId(creature.id);
    },
    generateCreature: () => {
      const existingNames = creatures.map((item) => item.name);
      const { gene, phenotype } = createCreatureGene(selectedGene, creatures.length + 1, existingNames);
      const creature = geneToCreature(gene, phenotype, existingNames);
      setCreatures((items) => [creature, ...items]);
      setSelectedId(creature.id);
    },
    mutateGene: () => {
      const existingNames = creatures.map((item) => item.name);
      const { gene, phenotype } = mutateCreatureGene(
        selectedGene,
        selectedCreature.phenotype,
        creatures.length + 1,
        existingNames
      );
      const creature = geneToCreature(gene, phenotype, existingNames);
      setCreatures((items) => [creature, ...items]);
      setSelectedId(creature.id);
    },
    duplicateGene: () => {
      const existingNames = creatures.map((item) => item.name);
      const copiedGene = {
        ...selectedGene,
        id: makeGeneId("gene"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const phenotype = clonePhenotype(selectedCreature.phenotype, `duplicate:${copiedGene.id}`);
      const creature = geneToCreature(copiedGene, phenotype, existingNames);
      setCreatures((items) => [creature, ...items]);
      setSelectedId(creature.id);
    },
    deleteAllCreatures: () => {
      const seed = createSeedCreature();
      setCreatures([seed]);
      setSelectedId(seed.id);
    },
    updateArchitecture: (key, value) => {
      const resized = resizeGeneArchitecture(
        selectedGene,
        { [key]: value },
        makeRng(`${selectedGene.id}:${key}:${value}`)
      );
      const updated = {
        ...selectedCreature,
        updatedAt: new Date().toISOString(),
        gene: {
          ...resized,
          name: selectedCreature.name
        }
      };
      setCreatures((items) => upsertCreature(items, updated));
    },
    updateEs: (key, value) => setEs((current) => ({ ...current, [key]: value })),
    start: () => setStatus("running"),
    pause: () => setStatus("paused"),
    step: () => {
      setStatus("paused");
      setHistory((items) => {
        const last = items[items.length - 1];
        return last ? [...items, nextMockPoint(last, selectedGene)] : items;
      });
    },
    reset: () => {
      const loss = initialLoss(selectedGene);
      setHistory([{ generation: 0, selectedLoss: loss, sampledLoss: loss }]);
      setStatus("idle");
    }
  }), [creatures, es, history, latest, runConfig, selectedCreature, selectedGene, selectedId, status]);

  return <GeneTerminalContext.Provider value={value}>{children}</GeneTerminalContext.Provider>;
}

export function useGeneTerminal() {
  const value = useContext(GeneTerminalContext);
  if (!value) {
    throw new Error("Gene terminal context is unavailable");
  }
  return value;
}
