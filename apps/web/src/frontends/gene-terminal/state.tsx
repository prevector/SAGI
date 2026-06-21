import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FootballEsTrainingSession,
  type FootballMatchResult,
  footballGenomeLength,
  GruModel,
  gruGenomeLength,
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
  type StoredFootballBrain,
  type StoredTokenBrain,
  type StoredCreature,
  upsertCreature
} from "./creatureLibrary";
import type { FootballTeamSubmissionPayload } from "@sagi/shared";
import { apiUrl } from "../../lib/request";

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
  footballIterations: number;
  languageIterations: number;
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
  tokenBest: StoredTokenBrain | null;
  footballBest: StoredFootballBrain | null;
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
  updateStageIterations: (mode: TrainingMode, value: number) => void;
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

function stageIterations(mode: TrainingMode, footballIterations: number, languageIterations: number): number {
  return mode === "football" ? footballIterations : languageIterations;
}

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

function createTrainingSession(creatureId: string, hiddenSize: number, es: EsHyperparams, initial?: Float32Array): GruEsTrainingSession {
  return new GruEsTrainingSession(
    buildFakeLanguageDataset({ seed: `token-task:${creatureId}`, sampleCount: 32 }),
    {
      hiddenSize,
      es: {
        seed: `gru-es:${creatureId}:${hiddenSize}:${es.populationPairs}:${es.sigma}:${es.learningRate}:${es.momentum}`,
        sigma: es.sigma,
        learningRate: es.learningRate,
        populationPairs: es.populationPairs,
        momentum: es.momentum,
        initial
      }
    },
    es.generations
  );
}

function createFootballTrainingSession(
  creatureId: string,
  hiddenSize: number,
  es: EsHyperparams,
  football: { teamSize: number; matchTicks: number },
  initial?: Float32Array
): FootballEsTrainingSession {
  return new FootballEsTrainingSession(
    {
      seed: `football-es:${creatureId}:${hiddenSize}:${es.populationPairs}:${es.sigma}:${es.learningRate}:${es.momentum}:${football.teamSize}:${football.matchTicks}`,
      hiddenSize,
      sigma: es.sigma,
      learningRate: es.learningRate,
      populationPairs: es.populationPairs,
      momentum: es.momentum,
      initial,
      football: {
        seed: `football-task:${creatureId}`,
        teamSize: football.teamSize,
        maxTicks: football.matchTicks
      }
    },
    es.generations
  );
}

function compatibleFootballBrain(creature: StoredCreature, hiddenSize: number): StoredFootballBrain | null {
  const stored = creature.bestFootball;
  if (!stored || stored.hiddenSize !== hiddenSize) return null;
  if (stored.genome.length !== footballGenomeLength(hiddenSize)) return null;
  return stored;
}

function compatibleTokenBrain(creature: StoredCreature, hiddenSize: number, vocabSize: number): StoredTokenBrain | null {
  const stored = creature.bestToken;
  if (!stored || stored.hiddenSize !== hiddenSize) return null;
  if (stored.genome.length !== gruGenomeLength({ vocabSize, hiddenSize })) return null;
  return stored;
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

function pickBestFootballCreature(creatures: StoredCreature[]): StoredCreature | null {
  return [...creatures]
    .filter((creature) => creature.bestFootball)
    .sort((left, right) => {
      const leftBest = left.bestFootball?.bestScore ?? Number.NEGATIVE_INFINITY;
      const rightBest = right.bestFootball?.bestScore ?? Number.NEGATIVE_INFINITY;
      return (
        rightBest - leftBest ||
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
    })[0] ?? null;
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
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("football");
  const [footballIterations, setFootballIterations] = useState(30);
  const [languageIterations, setLanguageIterations] = useState(60);
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
  const lastFootballSubmissionRef = useRef("");
  const tokenBest = compatibleTokenBrain(selectedCreature, hiddenSize, tokenDataset.vocab.length);
  const footballBest = compatibleFootballBrain(selectedCreature, hiddenSize);
  const bestFootballCreature = useMemo(() => pickBestFootballCreature(creatures), [creatures]);

  function persistTokenBest(step: ReturnType<GruEsTrainingSession["step"]>) {
    setCreatures((items) => {
      const creature = items.find((item) => item.id === selectedId);
      if (!creature) return items;
      const existing = compatibleTokenBrain(creature, hiddenSize, tokenDataset.vocab.length);
      if (existing && existing.bestAccuracy > step.bestAccuracy && existing.bestLoss < step.bestLoss) return items;
      const updated: StoredCreature = {
        ...creature,
        bestToken: {
          hiddenSize,
          loss: step.loss,
          accuracy: step.accuracy,
          bestLoss: step.bestLoss,
          bestAccuracy: step.bestAccuracy,
          genome: Array.from(step.genome),
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      return upsertCreature(items, updated);
    });
  }

  function persistFootballBest(step: ReturnType<FootballEsTrainingSession["step"]>) {
    setCreatures((items) => {
      const creature = items.find((item) => item.id === selectedId);
      if (!creature) return items;
      const existing = compatibleFootballBrain(creature, hiddenSize);
      if (existing && existing.bestScore >= step.bestScore) return items;
      const updated: StoredCreature = {
        ...creature,
        bestFootball: {
          hiddenSize,
          teamSize: footballTeamSize,
          matchTicks: footballMatchTicks,
          score: step.score,
          bestScore: step.bestScore,
          genome: Array.from(step.genome),
          updatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      return upsertCreature(items, updated);
    });
  }

  function resetTrainingSession(options?: { preserveStatus?: boolean }) {
    if (trainingMode === "language") {
      const dataset = buildFakeLanguageDataset({ seed: `token-task:${selectedCreature.id}`, sampleCount: 32 });
      setTokenDataset(dataset);
      setSelectedSampleIndex(0);
      setInferenceStepIndex(0);
      const stored = compatibleTokenBrain(selectedCreature, hiddenSize, dataset.vocab.length);
      const session = createTrainingSession(
        selectedCreature.id,
        hiddenSize,
        { ...es, generations: languageIterations },
        stored ? Float32Array.from(stored.genome) : undefined
      );
      sessionRef.current = session;
      const initial = session.initial();
      setTrainingGenome(stored ? Float32Array.from(stored.genome) : initial.genome);
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
      if (!stored) {
        persistTokenBest(initial);
      }
    } else {
      const stored = compatibleFootballBrain(selectedCreature, hiddenSize);
      const session = createFootballTrainingSession(selectedCreature.id, hiddenSize, { ...es, generations: footballIterations }, {
        teamSize: footballTeamSize,
        matchTicks: footballMatchTicks
      }, stored ? Float32Array.from(stored.genome) : undefined);
      sessionRef.current = session;
      const initial = session.initial();
      setTrainingGenome(stored ? Float32Array.from(stored.genome) : initial.genome);
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
      if (!stored) {
        persistFootballBest(initial);
      }
    }
    if (!options?.preserveStatus) {
      setStatus("idle");
    }
  }

  useEffect(() => {
    try {
      saveCreatures(creatures);
    } catch (error) {
      console.warn("Failed to persist creatures to local storage.", error);
    }
  }, [creatures]);

  useEffect(() => {
    const creature = bestFootballCreature;
    const football = creature?.bestFootball;
    if (!creature || !football) {
      return;
    }

    const signature = [
      creature.id,
      creature.gene.updatedAt,
      football.updatedAt,
      creature.bestToken?.updatedAt ?? "no-token"
    ].join(":");

    if (lastFootballSubmissionRef.current === signature) {
      return;
    }

    const payload: FootballTeamSubmissionPayload = {
      creatureId: creature.id,
      creatureName: creature.name,
      gene: creature.gene,
      phenotype: creature.phenotype,
      bestToken: creature.bestToken ?? null,
      bestFootball: football
    };

    let cancelled = false;
    void fetch(apiUrl("/api/football/submissions"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        if (!cancelled) {
          lastFootballSubmissionRef.current = signature;
        }
      })
      .catch((error) => {
        console.warn("Failed to submit best football creature to server.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [bestFootballCreature]);

  useEffect(() => {
    resetTrainingSession({ preserveStatus: status === "running" });
  }, [selectedCreature.id, hiddenSize, trainingMode, es.learningRate, es.momentum, es.populationPairs, es.sigma, footballTeamSize, footballMatchTicks, footballIterations, languageIterations]);

  useEffect(() => {
    if (status !== "running") return;
    const timer = window.setInterval(() => {
      const session = sessionRef.current;
      if (!session) return;
      const next = session.step();
      setTrainingGenome(next.genome);
      if (trainingMode === "language") {
        const languageStep = next as ReturnType<GruEsTrainingSession["step"]>;
        persistTokenBest(languageStep);
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
        persistFootballBest(footballStep);
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
        setTrainingMode((current) => current === "football" ? "language" : "football");
      }
    }, 220);
    return () => window.clearInterval(timer);
  }, [status, trainingMode]);

  const latest = history[history.length - 1];
  const selectedSample = tokenDataset.samples[Math.min(selectedSampleIndex, Math.max(0, tokenDataset.samples.length - 1))];
  const tokenInferenceGenome = useMemo(
    () => tokenBest ? Float32Array.from(tokenBest.genome) : trainingGenome,
    [tokenBest, trainingGenome]
  );
  const inferenceTrace = useMemo(() => {
    if (trainingMode !== "language" || !tokenInferenceGenome || !selectedSample) return null;
    const model = new GruModel({ vocabSize: tokenDataset.vocab.length, hiddenSize });
    return model.traceSequence(tokenInferenceGenome, selectedSample.tokens);
  }, [hiddenSize, selectedSample, tokenDataset.vocab.length, tokenInferenceGenome, trainingMode]);
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
    footballIterations,
    languageIterations,
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
    tokenBest,
    footballBest,
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
    updateStageIterations: (mode, value) => {
      const nextValue = Math.max(1, Math.min(10000, Math.round(value)));
      if (mode === "football") {
        setFootballIterations(nextValue);
        if (trainingMode === "football") {
          sessionRef.current?.setMaxIterations(nextValue);
        }
        return;
      }
      setLanguageIterations(nextValue);
      if (trainingMode === "language") {
        sessionRef.current?.setMaxIterations(nextValue);
      }
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
      const currentStageLimit = stageIterations(trainingMode, footballIterations, languageIterations);
      if (latestGeneration >= currentStageLimit) {
        setTrainingMode((current) => current === "football" ? "language" : "football");
        setStatus("running");
        return;
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
        persistTokenBest(languageStep);
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
        persistFootballBest(footballStep);
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
  }), [creatures, es, footballBest, footballIterations, footballMatchTicks, footballPreview, footballTeamSize, hiddenSize, history, inferenceStepIndex, inferenceTrace, languageIterations, latest, runConfig, selectedCreature, selectedGene, selectedId, selectedSampleIndex, status, tokenBest, tokenDataset, trainingGenome, trainingMode]);

  return <GeneTerminalContext.Provider value={value}>{children}</GeneTerminalContext.Provider>;
}

export function useGeneTerminal() {
  const value = useContext(GeneTerminalContext);
  if (!value) {
    throw new Error("Gene terminal context is unavailable");
  }
  return value;
}
