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
import { createSeedGene, loadGenes, saveGenes, upsertGene } from "../../features/genes/geneStorage";

export type TrainingStatus = "idle" | "running" | "paused";

export interface MockPoint {
  generation: number;
  selectedLoss: number;
  sampledLoss: number;
}

export interface GeneTerminalState {
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
  createGene: () => void;
  generateCreature: () => void;
  duplicateGene: () => void;
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

function getInitialGeneState(): { genes: EvolutionGene[]; selectedId: string } {
  const genes = loadGenes();
  const fallback = genes[0] ?? createSeedGene();
  return {
    genes: genes.length > 0 ? genes : [fallback],
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

function createPaperGene(index: number): EvolutionGene {
  return createRandomGene(makeRng(`paper-gene:${Date.now()}:${index}`), {
    id: makeGeneId("gene"),
    name: `Paper IAF ${index}`,
    notes: "Mock client gene. Real ES execution is intentionally not wired into this redesign yet.",
    architecture: {
      neuronStateSize: 32,
      synapseStateSize: 0,
      outputGain: 1000
    }
  });
}

function createCreatureGene(source: EvolutionGene, index: number): EvolutionGene {
  return createRandomGene(makeRng(`creature-gene:${Date.now()}:${index}`), {
    id: makeGeneId("creature"),
    name: `Creature ${index}`,
    notes: "Morphology test gene for the local creature viewport.",
    architecture: {
      neuronStateSize: source.architecture.neuronStateSize,
      synapseStateSize: source.architecture.synapseStateSize,
      outputGain: source.architecture.outputGain
    }
  });
}

export function GeneTerminalProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState(getInitialGeneState);
  const [genes, setGenes] = useState<EvolutionGene[]>(initialState.genes);
  const [selectedId, setSelectedId] = useState(initialState.selectedId);
  const selectedGene = genes.find((gene) => gene.id === selectedId) ?? genes[0] ?? createSeedGene();
  const [runConfig] = useState<IafRunConfig>(PAPER_IAF_RUN);
  const [es, setEs] = useState<EsHyperparams>(PAPER_IAF_ES);
  const [status, setStatus] = useState<TrainingStatus>("idle");
  const [history, setHistory] = useState<MockPoint[]>(() => {
    const loss = initialLoss(selectedGene);
    return [{ generation: 0, selectedLoss: loss, sampledLoss: loss }];
  });

  useEffect(() => {
    try {
      saveGenes(genes);
    } catch (error) {
      console.warn("Failed to persist genes to local storage.", error);
    }
  }, [genes]);

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
    genes,
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
    createGene: () => {
      const gene = createPaperGene(genes.length + 1);
      setGenes((items) => [gene, ...items]);
      setSelectedId(gene.id);
    },
    generateCreature: () => {
      const gene = createCreatureGene(selectedGene, genes.length + 1);
      setGenes((items) => [gene, ...items]);
      setSelectedId(gene.id);
    },
    duplicateGene: () => {
      const now = new Date().toISOString();
      const copy = {
        ...selectedGene,
        id: makeGeneId("gene"),
        name: `${selectedGene.name} copy`,
        createdAt: now,
        updatedAt: now
      };
      setGenes((items) => [copy, ...items]);
      setSelectedId(copy.id);
    },
    updateArchitecture: (key, value) => {
      const resized = resizeGeneArchitecture(
        selectedGene,
        { [key]: value },
        makeRng(`${selectedGene.id}:${key}:${value}`)
      );
      setGenes((items) => upsertGene(items, resized));
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
  }), [es, genes, history, latest, runConfig, selectedGene, selectedId, status]);

  return <GeneTerminalContext.Provider value={value}>{children}</GeneTerminalContext.Provider>;
}

export function useGeneTerminal() {
  const value = useContext(GeneTerminalContext);
  if (!value) {
    throw new Error("Gene terminal context is unavailable");
  }
  return value;
}
