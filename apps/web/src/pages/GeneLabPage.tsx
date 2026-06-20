import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps
} from "dockview";
import "dockview/dist/styles/dockview.css";
import {
  createRandomGene,
  iafGenomeLength,
  makeRng,
  resizeGeneArchitecture,
  type EsHyperparams,
  type EvolutionGene,
  type IafRunConfig
} from "@sagi/evolution";
import { formatInt } from "../lib/format";
import { createSeedGene, loadGenes, saveGenes, upsertGene } from "../features/genes/geneStorage";
import styles from "./GeneLabPage.module.css";

type TrainingStatus = "idle" | "running" | "paused";

interface MockPoint {
  generation: number;
  selectedLoss: number;
  sampledLoss: number;
}

interface LabContextValue {
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
  selectGene: (id: string) => void;
  createGene: () => void;
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

const LabContext = createContext<LabContextValue | null>(null);

function useLab() {
  const value = useContext(LabContext);
  if (!value) {
    throw new Error("Gene lab context is unavailable");
  }
  return value;
}

function numberInput(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function shortId(id: string): string {
  return id.slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
    name: `Paper IAF ${index}`,
    notes: "Mock client gene. Real ES execution is intentionally not wired into this redesign yet.",
    architecture: {
      neuronStateSize: 32,
      synapseStateSize: 0,
      outputGain: 1000
    }
  });
}

const dockComponents = {
  genes: GenesPanel,
  training: TrainingPanel
};

export default function GeneLabPage() {
  const [genes, setGenes] = useState<EvolutionGene[]>(() => loadGenes());
  const [selectedId, setSelectedId] = useState(() => loadGenes()[0]?.id ?? createSeedGene().id);
  const selectedGene = genes.find((gene) => gene.id === selectedId) ?? genes[0] ?? createSeedGene();
  const [runConfig] = useState<IafRunConfig>(PAPER_IAF_RUN);
  const [es, setEs] = useState<EsHyperparams>(PAPER_IAF_ES);
  const [status, setStatus] = useState<TrainingStatus>("idle");
  const [history, setHistory] = useState<MockPoint[]>(() => {
    const loss = initialLoss(selectedGene);
    return [{ generation: 0, selectedLoss: loss, sampledLoss: loss }];
  });

  useEffect(() => {
    saveGenes(genes);
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
  const contextValue = useMemo<LabContextValue>(() => ({
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
    selectGene: setSelectedId,
    createGene: () => {
      const gene = createPaperGene(genes.length + 1);
      setGenes((items) => [gene, ...items]);
      setSelectedId(gene.id);
    },
    duplicateGene: () => {
      const now = new Date().toISOString();
      const copy = {
        ...selectedGene,
        id: `gene-${Date.now().toString(36)}`,
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

  function onReady(event: DockviewReadyEvent) {
    event.api.addPanel({
      id: "genes",
      component: "genes",
      title: "GENES",
      initialWidth: 440
    });
    event.api.addPanel({
      id: "training",
      component: "training",
      title: "TRAINING",
      position: { direction: "right" },
      initialWidth: 920
    });
  }

  return (
    <LabContext.Provider value={contextValue}>
      <div className={styles.terminal}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.brand}>SAGI // GENE TERMINAL</span>
            <span className={styles.muted}>mock client</span>
          </div>
          <div className={styles.readout}>
            <span>SELECTED {shortId(selectedGene.id)}</span>
            <span>STATE {status.toUpperCase()}</span>
            <span>GEN {formatInt(latest?.generation ?? 0)}</span>
          </div>
        </header>
        <div className={styles.dockShell}>
          <DockviewReact
            className="dockview-theme-abyss"
            components={dockComponents}
            onReady={onReady}
            disableFloatingGroups
            disableTabsOverflowList
          />
        </div>
      </div>
    </LabContext.Provider>
  );
}

function GenesPanel(_: IDockviewPanelProps) {
  const lab = useLab();
  const gene = lab.selectedGene;
  const weightCount = iafGenomeLength(gene.architecture);

  return (
    <section className={styles.panel}>
      <div className={styles.panelTools}>
        <button onClick={lab.createGene}>NEW</button>
        <button onClick={lab.duplicateGene}>DUPLICATE</button>
      </div>

      <div className={styles.sectionLabel}>library</div>
      <div className={styles.geneList}>
        {lab.genes.map((item) => (
          <button
            key={item.id}
            className={item.id === lab.selectedId ? styles.selectedGene : ""}
            onClick={() => lab.selectGene(item.id)}
          >
            <span>{item.name}</span>
            <small>{shortId(item.id)} · {formatInt(item.weights.length)} weights</small>
          </button>
        ))}
      </div>

      <div className={styles.sectionLabel}>selected gene</div>
      <div className={styles.matrix}>
        <Readout label="id" value={shortId(gene.id)} />
        <Readout label="schema" value={`v${gene.schemaVersion}`} />
        <Readout label="weights" value={formatInt(weightCount)} />
        <Readout label="updated" value={new Date(gene.updatedAt).toLocaleTimeString()} />
      </div>

      <div className={styles.formGrid}>
        <NumberField
          label="neuron states"
          min={1}
          max={64}
          value={gene.architecture.neuronStateSize}
          onChange={(value) => lab.updateArchitecture("neuronStateSize", value)}
        />
        <NumberField
          label="synapse states"
          min={0}
          max={64}
          value={gene.architecture.synapseStateSize}
          onChange={(value) => lab.updateArchitecture("synapseStateSize", value)}
        />
        <NumberField
          label="output gain"
          min={0.1}
          max={2000}
          step={0.1}
          value={gene.architecture.outputGain}
          onChange={(value) => lab.updateArchitecture("outputGain", value)}
        />
      </div>

      <div className={styles.note}>
        The redesign is mock-only. Gene selection and configuration state are real client state; ES execution is not wired yet.
      </div>
    </section>
  );
}

function TrainingPanel(_: IDockviewPanelProps) {
  const lab = useLab();
  const progress = clamp(lab.generation / Math.max(lab.es.generations, 1), 0, 1);

  return (
    <section className={styles.panel}>
      <div className={styles.trainingHeader}>
        <div>
          <div className={styles.sectionLabel}>current state</div>
          <h2>{lab.selectedGene.name}</h2>
        </div>
        <div className={styles.panelTools}>
          {lab.status === "running" ? (
            <button onClick={lab.pause}>PAUSE</button>
          ) : (
            <button onClick={lab.start}>START</button>
          )}
          <button onClick={lab.step}>STEP</button>
          <button onClick={lab.reset}>RESET</button>
        </div>
      </div>

      <div className={styles.marketGrid}>
        <Readout label="selected loss" value={lab.bestLoss.toFixed(4)} tone="good" />
        <Readout label="sampled loss" value={lab.sampledLoss.toFixed(4)} tone="warn" />
        <Readout label="generation" value={`${formatInt(lab.generation)} / ${formatInt(lab.es.generations)}`} />
        <Readout label="population pairs" value={formatInt(lab.es.populationPairs)} />
        <Readout label="sigma" value={lab.es.sigma.toFixed(3)} />
        <Readout label="envs" value={formatInt(lab.runConfig.environments)} />
      </div>

      <div className={styles.progressRail}>
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={styles.mainStage}>
        <div className={styles.creaturePane}>
          <div className={styles.sectionLabel}>creature mock</div>
          <Creature gene={lab.selectedGene} status={lab.status} generation={lab.generation} />
        </div>
        <div className={styles.chartPane}>
          <div className={styles.sectionLabel}>mock telemetry</div>
          <MockChart history={lab.history} />
        </div>
      </div>

      <div className={styles.formGrid}>
        <NumberField
          label="generations"
          min={1}
          max={10000}
          value={lab.es.generations}
          onChange={(value) => lab.updateEs("generations", value)}
        />
        <NumberField
          label="population pairs"
          min={2}
          max={512}
          value={lab.es.populationPairs}
          onChange={(value) => lab.updateEs("populationPairs", value)}
        />
        <NumberField
          label="sigma"
          min={0.001}
          max={1}
          step={0.001}
          value={lab.es.sigma}
          onChange={(value) => lab.updateEs("sigma", value)}
        />
        <NumberField
          label="learning rate"
          min={0.01}
          max={5}
          step={0.01}
          value={lab.es.learningRate}
          onChange={(value) => lab.updateEs("learningRate", value)}
        />
        <NumberField
          label="momentum"
          min={0}
          max={0.99}
          step={0.01}
          value={lab.es.momentum}
          onChange={(value) => lab.updateEs("momentum", value)}
        />
      </div>
    </section>
  );
}

function Readout({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className={styles.readoutCell}>
      <b className={tone ? styles[tone] : ""}>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(numberInput(Number(event.target.value), value))}
      />
    </label>
  );
}

function Creature({
  gene,
  status,
  generation
}: {
  gene: EvolutionGene;
  status: TrainingStatus;
  generation: number;
}) {
  const nodes = Array.from({ length: 18 }, (_, index) => {
    const weight = gene.weights[index % gene.weights.length] ?? 0;
    const angle = index * 0.92 + generation * 0.015;
    const radius = 38 + Math.abs(weight) * 40 + (index % 4) * 9;
    return {
      x: 160 + Math.cos(angle) * radius,
      y: 125 + Math.sin(angle * 1.17) * radius * 0.62,
      pulse: Math.abs(Math.sin(angle))
    };
  });

  return (
    <svg className={styles.creature} viewBox="0 0 320 250" role="img" aria-label="Mock creature visualization">
      <rect x="1" y="1" width="318" height="248" rx="2" />
      {nodes.map((node, index) => (
        <line
          key={`l-${index}`}
          x1={160}
          y1={125}
          x2={node.x}
          y2={node.y}
          className={styles.creatureLink}
        />
      ))}
      {nodes.map((node, index) => (
        <circle
          key={index}
          cx={node.x}
          cy={node.y}
          r={3 + node.pulse * 4}
          className={status === "running" ? styles.creatureNodeActive : styles.creatureNode}
        />
      ))}
      <circle cx="160" cy="125" r="13" className={styles.creatureCore} />
    </svg>
  );
}

function MockChart({ history }: { history: MockPoint[] }) {
  const width = 620;
  const height = 220;
  const pad = 20;
  const values = history.flatMap((item) => [item.selectedLoss, item.sampledLoss]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);

  function line(key: "selectedLoss" | "sampledLoss") {
    return history
      .map((item, index) => {
        const x = pad + (index / Math.max(history.length - 1, 1)) * (width - pad * 2);
        const y = height - pad - ((item[key] - min) / span) * (height - pad * 2);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg className={styles.mockChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mock training chart">
      {[0.25, 0.5, 0.75, 1].map((level) => {
        const y = height - pad - level * (height - pad * 2);
        return <line key={level} x1={pad} x2={width - pad} y1={y} y2={y} className={styles.gridLine} />;
      })}
      <path d={line("sampledLoss")} className={styles.sampledLine} />
      <path d={line("selectedLoss")} className={styles.selectedLine} />
    </svg>
  );
}
