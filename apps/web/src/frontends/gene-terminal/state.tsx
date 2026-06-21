import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FootballEsTrainingSession,
  type FootballMatchResult,
  GruModel,
  type GruSequenceTrace,
  type TokenTaskDataset,
  GruEsTrainingSession,
  buildFakeLanguageDataset,
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
export type TrainingMode = "language" | "football";
export const FOOTBALL_TICKS_PER_SECOND = 24;

export interface MockPoint {
  generation: number;
  loss: number;
  accuracy: number;
  bestLoss: number;
  bestAccuracy: number;
  score: number;
  bestScore: number;
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
  hiddenSize: number;
  trainingMode: TrainingMode;
  status: TrainingStatus;
  generation: number;
  bestLoss: number;
  accuracy: number;
  bestAccuracy: number;
  score: number;
  bestScore: number;
  history: MockPoint[];
  tokenDataset: TokenTaskDataset;
  trainingGenome: Float32Array | null;
  footballTeamSize: number;
  footballMatchTicks: number;
  footballPreview: FootballMatchResult | null;
  selectedSampleIndex: number;
  inferenceStepIndex: number;
  inferenceTrace: GruSequenceTrace | null;
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
  updateHiddenSize: (value: number) => void;
  setTrainingMode: (mode: TrainingMode) => void;
  updateEs: (key: keyof EsHyperparams, value: number) => void;
  updateFootball: (key: "teamSize" | "matchTicks" | "matchSeconds", value: number) => void;
  selectSample: (index: number) => void;
  resetInference: () => void;
  stepInference: () => void;
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
  generations: 120,
  populationPairs: 32,
  sigma: 0.08,
  learningRate: 0.06,
  momentum: 0.8
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
    updatedAt: new Date().toISOString()
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

function createTrainingSession(creatureId: string, hiddenSize: number, es: EsHyperparams): GruEsTrainingSession {
  return new GruEsTrainingSession(
    buildFakeLanguageDataset({ seed: `token-task:${creatureId}`, sampleCount: 32 }),
    {
      hiddenSize,
      es: {
        seed: `gru-es:${creatureId}:${hiddenSize}:${es.populationPairs}:${es.sigma}:${es.learningRate}:${es.momentum}`,
        sigma: es.sigma,
        learningRate: es.learningRate,
        populationPairs: es.populationPairs,
        momentum: es.momentum
      }
    },
    es.generations
  );
}

function createFootballTrainingSession(
  creatureId: string,
  hiddenSize: number,
  es: EsHyperparams,
  football: { teamSize: number; matchTicks: number }
): FootballEsTrainingSession {
  return new FootballEsTrainingSession(
    {
      seed: `football-es:${creatureId}:${hiddenSize}:${es.populationPairs}:${es.sigma}:${es.learningRate}:${es.momentum}:${football.teamSize}:${football.matchTicks}`,
      hiddenSize,
      sigma: es.sigma,
      learningRate: es.learningRate,
      populationPairs: es.populationPairs,
      momentum: es.momentum,
      football: {
        seed: `football-task:${creatureId}`,
        teamSize: football.teamSize,
        maxTicks: football.matchTicks
      }
    },
    es.generations
  );
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
  const [hiddenSize, setHiddenSize] = useState(8);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("language");
  const [status, setStatus] = useState<TrainingStatus>("idle");
  const sessionRef = useRef<GruEsTrainingSession | FootballEsTrainingSession | null>(null);
  const [history, setHistory] = useState<MockPoint[]>([]);
  const [tokenDataset, setTokenDataset] = useState<TokenTaskDataset>(() =>
    buildFakeLanguageDataset({ seed: `token-task:${selectedCreature.id}`, sampleCount: 32 })
  );
  const [trainingGenome, setTrainingGenome] = useState<Float32Array | null>(null);
  const [footballTeamSize, setFootballTeamSize] = useState(4);
  const [footballMatchTicks, setFootballMatchTicks] = useState(360);
  const [footballPreview, setFootballPreview] = useState<FootballMatchResult | null>(null);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [inferenceStepIndex, setInferenceStepIndex] = useState(0);

  function resetTrainingSession() {
    if (trainingMode === "language") {
      const dataset = buildFakeLanguageDataset({ seed: `token-task:${selectedCreature.id}`, sampleCount: 32 });
      setTokenDataset(dataset);
      setSelectedSampleIndex(0);
      setInferenceStepIndex(0);
      const session = createTrainingSession(selectedCreature.id, hiddenSize, es);
      sessionRef.current = session;
      const initial = session.initial();
      setTrainingGenome(initial.genome);
      setFootballPreview(null);
      setHistory([{
        generation: initial.iteration,
        loss: initial.loss,
        accuracy: initial.accuracy,
        bestLoss: initial.bestLoss,
        bestAccuracy: initial.bestAccuracy,
        score: initial.accuracy,
        bestScore: initial.bestAccuracy
      }]);
    } else {
      const session = createFootballTrainingSession(selectedCreature.id, hiddenSize, es, {
        teamSize: footballTeamSize,
        matchTicks: footballMatchTicks
      });
      sessionRef.current = session;
      const initial = session.initial();
      setTrainingGenome(initial.genome);
      setFootballPreview(initial.preview);
      setHistory([{
        generation: initial.iteration,
        loss: 0,
        accuracy: 0,
        bestLoss: 0,
        bestAccuracy: 0,
        score: initial.score,
        bestScore: initial.bestScore
      }]);
    }
    setStatus("idle");
  }

  useEffect(() => {
    try {
      saveCreatures(creatures);
    } catch (error) {
      console.warn("Failed to persist creatures to local storage.", error);
    }
  }, [creatures]);

  useEffect(() => {
    resetTrainingSession();
  }, [selectedCreature.id, hiddenSize, trainingMode, es.learningRate, es.momentum, es.populationPairs, es.sigma, footballTeamSize, footballMatchTicks]);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;
      const next = session.step();
      setTrainingGenome(next.genome);
      if (trainingMode === "language") {
        const languageStep = next as ReturnType<GruEsTrainingSession["step"]>;
        setHistory((items) => [
          ...items,
          {
            generation: languageStep.iteration,
            loss: languageStep.loss,
            accuracy: languageStep.accuracy,
            bestLoss: languageStep.bestLoss,
            bestAccuracy: languageStep.bestAccuracy,
            score: languageStep.accuracy,
            bestScore: languageStep.bestAccuracy
          }
        ]);
      } else {
        const footballStep = next as ReturnType<FootballEsTrainingSession["step"]>;
        setFootballPreview(footballStep.preview);
        setHistory((items) => [
          ...items,
          {
            generation: footballStep.iteration,
            loss: 0,
            accuracy: 0,
            bestLoss: 0,
            bestAccuracy: 0,
            score: footballStep.score,
            bestScore: footballStep.bestScore
          }
        ]);
      }
      if (next.done) {
        setStatus("paused");
      }
    }, 220);
    return () => window.clearInterval(timer);
  }, [status, trainingMode]);

  const latest = history[history.length - 1];
  const selectedSample = tokenDataset.samples[Math.min(selectedSampleIndex, Math.max(0, tokenDataset.samples.length - 1))];
  const inferenceTrace = useMemo(() => {
    if (trainingMode !== "language" || !trainingGenome || !selectedSample) return null;
    const model = new GruModel({ vocabSize: tokenDataset.vocab.length, hiddenSize });
    return model.traceSequence(trainingGenome, selectedSample.tokens);
  }, [hiddenSize, selectedSample, tokenDataset.vocab.length, trainingGenome, trainingMode]);
  const value = useMemo<GeneTerminalState>(() => ({
    creatures,
    selectedCreature,
    selectedMorphology: summarizeCreatureGene(selectedGene),
    genes: creatures.map((item) => item.gene),
    selectedGene,
    selectedId,
    runConfig,
    es,
    hiddenSize,
    trainingMode,
    status,
    generation: latest?.generation ?? 0,
    bestLoss: latest?.bestLoss ?? 0,
    accuracy: latest?.accuracy ?? 0,
    bestAccuracy: latest?.bestAccuracy ?? 0,
    score: latest?.score ?? 0,
    bestScore: latest?.bestScore ?? 0,
    history,
    tokenDataset,
    trainingGenome,
    footballTeamSize,
    footballMatchTicks,
    footballPreview,
    selectedSampleIndex,
    inferenceStepIndex,
    inferenceTrace,
    weightCount: iafGenomeLength(selectedGene.architecture),
    selectGene: setSelectedId,
    renameCreature: (name) => {
      const renamed = syncCreatureName(selectedCreature, name);
      setCreatures((items) => upsertCreature(items, renamed));
    },
    saveCreature: () => {
      const saved = {
        ...selectedCreature,
        updatedAt: new Date().toISOString()
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
    updateHiddenSize: (value) => setHiddenSize(Math.max(2, Math.min(64, Math.round(value)))),
    setTrainingMode: (mode) => setTrainingMode(mode),
    updateEs: (key, value) => {
      if (key === "generations") {
        const nextValue = Math.max(1, Math.round(value));
        setEs((current) => ({ ...current, generations: nextValue }));
        sessionRef.current?.setMaxIterations(nextValue);
        return;
      }
      setEs((current) => ({ ...current, [key]: value }));
    },
    updateFootball: (key, value) => {
      if (key === "teamSize") {
        setFootballTeamSize(Math.max(2, Math.min(11, Math.round(value))));
        return;
      }
      if (key === "matchSeconds") {
        const seconds = Math.max(2, Math.min(120, value));
        setFootballMatchTicks(Math.max(24, Math.min(2400, Math.round(seconds * FOOTBALL_TICKS_PER_SECOND))));
        return;
      }
      setFootballMatchTicks(Math.max(120, Math.min(2400, Math.round(value))));
    },
    selectSample: (index) => {
      setSelectedSampleIndex(Math.max(0, Math.min(index, tokenDataset.samples.length - 1)));
      setInferenceStepIndex(0);
    },
    resetInference: () => setInferenceStepIndex(0),
    stepInference: () => {
      if (!inferenceTrace) return;
      setInferenceStepIndex((value) => Math.min(value + 1, Math.max(0, inferenceTrace.steps.length - 1)));
    },
    start: () => {
      const latestGeneration = latest?.generation ?? 0;
      if (latestGeneration >= es.generations) {
        const extended = es.generations + Math.max(20, Math.round(es.generations * 0.5));
        setEs((current) => ({ ...current, generations: extended }));
        sessionRef.current?.setMaxIterations(extended);
      }
      setStatus("running");
    },
    pause: () => setStatus("paused"),
    step: () => {
      setStatus("paused");
      const session = sessionRef.current;
      if (!session) return;
      const next = session.step();
      setTrainingGenome(next.genome);
      if (trainingMode === "language") {
        const languageStep = next as ReturnType<GruEsTrainingSession["step"]>;
        setHistory((items) => [
          ...items,
          {
            generation: languageStep.iteration,
            loss: languageStep.loss,
            accuracy: languageStep.accuracy,
            bestLoss: languageStep.bestLoss,
            bestAccuracy: languageStep.bestAccuracy,
            score: languageStep.accuracy,
            bestScore: languageStep.bestAccuracy
          }
        ]);
      } else {
        const footballStep = next as ReturnType<FootballEsTrainingSession["step"]>;
        setFootballPreview(footballStep.preview);
        setHistory((items) => [
          ...items,
          {
            generation: footballStep.iteration,
            loss: 0,
            accuracy: 0,
            bestLoss: 0,
            bestAccuracy: 0,
            score: footballStep.score,
            bestScore: footballStep.bestScore
          }
        ]);
      }
    },
    reset: () => resetTrainingSession()
  }), [creatures, es, footballMatchTicks, footballPreview, footballTeamSize, hiddenSize, history, inferenceStepIndex, inferenceTrace, latest, runConfig, selectedCreature, selectedGene, selectedId, selectedSampleIndex, status, tokenDataset, trainingGenome, trainingMode]);

  return <GeneTerminalContext.Provider value={value}>{children}</GeneTerminalContext.Provider>;
}

export function useGeneTerminal() {
  const value = useContext(GeneTerminalContext);
  if (!value) {
    throw new Error("Gene terminal context is unavailable");
  }
  return value;
}
