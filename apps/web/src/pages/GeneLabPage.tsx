import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Dna, Pause, Play, Save, Sparkles, StepForward, Trash2 } from "lucide-react";
import {
  createRandomGene,
  createIafTrainingSession,
  iafGenomeLength,
  makeRng,
  resizeGeneArchitecture,
  runGeneOnIaf,
  type EsHyperparams,
  type EvolutionGene,
  type IafEvaluation,
  type IafRunConfig,
  type IafTask,
  type IafTrainingSession,
  type TrainingGeneration
} from "@sagi/evolution";
import { Button, Card, PageHeader, Tag } from "../components/ui";
import { formatInt } from "../lib/format";
import { GeneTrainingChart } from "../features/genes/GeneTrainingChart";
import { GeneTrace } from "../features/genes/GeneTrace";
import { createSeedGene, loadGenes, saveGenes, upsertGene } from "../features/genes/geneStorage";
import styles from "./GeneLabPage.module.css";

const DEFAULT_RUN: IafRunConfig = {
  seed: "local-lab",
  task: "potential",
  sequenceLength: 100,
  environments: 8
};

const DEFAULT_ES: EsHyperparams = {
  generations: 40,
  populationPairs: 24,
  sigma: 0.03,
  learningRate: 1,
  momentum: 0.9
};

function shortId(id: string): string {
  return id.slice(0, 10);
}

function numberInput(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function diagnosticGain(gain: number, task: IafTask): number {
  if (task !== "potential") return gain;
  return gain > 20 ? 2 : gain;
}

type TrainingState = "idle" | "running" | "paused" | "complete";

export default function GeneLabPage() {
  const [genes, setGenes] = useState<EvolutionGene[]>(() => loadGenes());
  const [selectedId, setSelectedId] = useState(() => genes[0]?.id ?? "");
  const [draft, setDraft] = useState<EvolutionGene>(() => genes[0] ?? createSeedGene());
  const [runConfig, setRunConfig] = useState<IafRunConfig>(DEFAULT_RUN);
  const [es, setEs] = useState<EsHyperparams>(DEFAULT_ES);
  const [evaluation, setEvaluation] = useState<IafEvaluation | null>(null);
  const [history, setHistory] = useState<TrainingGeneration[]>([]);
  const [trainingState, setTrainingState] = useState<TrainingState>("idle");
  const [generation, setGeneration] = useState(0);
  const [message, setMessage] = useState("");
  const trainingSession = useRef<IafTrainingSession | null>(null);
  const esRef = useRef(es);

  useEffect(() => {
    saveGenes(genes);
  }, [genes]);

  useEffect(() => {
    esRef.current = es;
  }, [es]);

  useEffect(() => {
    const next = genes.find((gene) => gene.id === selectedId);
    if (next && next.id !== draft.id) {
      trainingSession.current = null;
      setDraft(next);
      setEvaluation(null);
      setHistory([]);
      setGeneration(0);
      setTrainingState("idle");
    }
  }, [draft.id, genes, selectedId]);

  useEffect(() => {
    if (trainingState !== "running") return;
    let cancelled = false;
    let timer: number | null = null;

    const tick = () => {
      const session = trainingSession.current;
      if (!session || cancelled) return;

      const snapshot = session.step(esRef.current);
      const trainedGene = { ...snapshot.gene, name: draft.name, notes: draft.notes };
      setEvaluation(snapshot.current);
      setHistory(snapshot.history);
      setGeneration(snapshot.generation);
      setDraft(trainedGene);
      setGenes((items) => upsertGene(items, trainedGene));

      if (snapshot.done) {
        setTrainingState("complete");
        setMessage(`Training complete, best loss ${snapshot.best.loss.toFixed(4)}`);
        return;
      }
      timer = window.setTimeout(tick, 25);
    };

    timer = window.setTimeout(tick, 0);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [draft.name, draft.notes, trainingState]);

  const expectedLength = useMemo(() => iafGenomeLength(draft.architecture), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(genes.find((gene) => gene.id === draft.id));
  const historyBest = history.reduce<IafEvaluation | null>((best, item) => {
    if (!best || item.fitness > best.fitness) return item;
    return best;
  }, null);
  const progress = Math.min(1, generation / Math.max(es.generations, 1));
  const isTraining = trainingState === "running";
  const hasActiveTraining = trainingState === "running" || trainingState === "paused";
  const gainIsSaturated = runConfig.task === "potential" && draft.architecture.outputGain > 20;

  function persist(gene: EvolutionGene = draft) {
    const saved = { ...gene, updatedAt: new Date().toISOString() };
    setGenes((items) => upsertGene(items, saved));
    setDraft(saved);
    setSelectedId(saved.id);
    setMessage("Saved locally");
  }

  function createNewGene() {
    const gene = createRandomGene(makeRng(`gene:${Date.now()}`), {
      name: `Gene ${genes.length + 1}`,
      architecture: {
        neuronStateSize: draft.architecture.neuronStateSize,
        synapseStateSize: draft.architecture.synapseStateSize,
        outputGain: diagnosticGain(draft.architecture.outputGain, runConfig.task)
      }
    });
    setGenes((items) => [gene, ...items]);
    setSelectedId(gene.id);
    setMessage("Created gene");
  }

  function duplicateGene() {
    const now = new Date().toISOString();
    const copy = {
      ...draft,
      id: `gene-${Date.now().toString(36)}`,
      name: `${draft.name} copy`,
      createdAt: now,
      updatedAt: now
    };
    setGenes((items) => [copy, ...items]);
    setSelectedId(copy.id);
    setMessage("Duplicated gene");
  }

  function deleteGene() {
    const remaining = genes.filter((gene) => gene.id !== draft.id);
    const next = remaining[0] ?? createSeedGene();
    setGenes(remaining.length === 0 ? [next] : remaining);
    setSelectedId(next.id);
    setMessage("Deleted gene");
  }

  function updateArchitecture(key: keyof EvolutionGene["architecture"], value: number) {
    if (isTraining) return;
    const resized = resizeGeneArchitecture(draft, { [key]: value }, makeRng(`${draft.id}:${key}:${value}`));
    setDraft(resized);
    setEvaluation(null);
  }

  function run() {
    if (isTraining) return;
    const result = runGeneOnIaf(draft, runConfig);
    setEvaluation(result);
    setHistory([]);
    setGeneration(0);
    setTrainingState("idle");
    trainingSession.current = null;
    setMessage("Run complete");
  }

  function startTraining() {
    const session = createIafTrainingSession(draft, runConfig, es);
    const snapshot = session.snapshot(es);
    trainingSession.current = session;
    setEvaluation(snapshot.current);
    setHistory(snapshot.history);
    setGeneration(snapshot.generation);
    setTrainingState("running");
    setMessage("Training started");
  }

  function pauseTraining() {
    setTrainingState("paused");
    setMessage("Training paused");
  }

  function continueTraining() {
    if (!trainingSession.current) {
      startTraining();
      return;
    }
    setTrainingState("running");
    setMessage("Training resumed");
  }

  function stepTraining() {
    const session = trainingSession.current ?? createIafTrainingSession(draft, runConfig, es);
    trainingSession.current = session;
    const snapshot = session.step(es);
    const trainedGene = { ...snapshot.gene, name: draft.name, notes: draft.notes };
    setEvaluation(snapshot.current);
    setHistory(snapshot.history);
    setGeneration(snapshot.generation);
    setDraft(trainedGene);
    setGenes((items) => upsertGene(items, trainedGene));
    setTrainingState(snapshot.done ? "complete" : "paused");
    setMessage(snapshot.done ? `Training complete, best loss ${snapshot.best.loss.toFixed(4)}` : `Stepped to generation ${snapshot.generation}`);
  }

  function updateWeight(index: number, value: number) {
    if (isTraining) return;
    const weights = draft.weights.slice();
    weights[index] = value;
    setDraft({ ...draft, weights, updatedAt: new Date().toISOString() });
  }

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Local gene lab"
        title="Inspect, edit, store, run"
        subtitle="Genes are saved in this browser. The current tasks are IAF spike timing and a smoother membrane-potential diagnostic."
      />

      <div className={styles.actions}>
        <Button variant="primary" icon={<Sparkles size={16} />} onClick={createNewGene} disabled={isTraining}>New gene</Button>
        <Button variant="ghost" icon={<Copy size={16} />} onClick={duplicateGene} disabled={isTraining}>Duplicate</Button>
        <Button variant="ghost" icon={<Save size={16} />} onClick={() => persist()} disabled={!dirty || isTraining}>Save</Button>
        <Button variant="ghost" icon={<Trash2 size={16} />} onClick={deleteGene} disabled={isTraining}>Delete</Button>
        {message ? <span className={styles.message}>{message}</span> : null}
      </div>

      <div className={styles.layout}>
        <aside className={styles.library} aria-label="Stored genes">
          <div className={styles.panelTitle}>
            <Dna size={17} />
            <span>Stored genes</span>
          </div>
          <div className={styles.geneList}>
            {genes.map((gene) => (
              <button
                key={gene.id}
                className={[styles.geneButton, gene.id === draft.id ? styles.activeGene : ""].join(" ")}
                onClick={() => setSelectedId(gene.id)}
                disabled={isTraining}
              >
                <span>{gene.name}</span>
                <small>{shortId(gene.id)} · {formatInt(gene.weights.length)} weights</small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.workspace}>
          <Card as="section" className={styles.editor}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Gene</h2>
                <p>Architecture and weights. Phenotype is decoded only when the task runs.</p>
              </div>
              <Tag tone={dirty ? "orange" : "teal"}>{dirty ? "Unsaved" : "Saved"}</Tag>
            </div>

            <label className={styles.field}>
              <span>Name</span>
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} disabled={isTraining} />
            </label>

            <div className={styles.grid4}>
              <label className={styles.field}>
                <span>Neuron states</span>
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={draft.architecture.neuronStateSize}
                  onChange={(event) => updateArchitecture("neuronStateSize", numberInput(Number(event.target.value), 8))}
                  disabled={isTraining}
                />
              </label>
              <label className={styles.field}>
                <span>Synapse states</span>
                <input
                  type="number"
                  min={0}
                  max={64}
                  value={draft.architecture.synapseStateSize}
                  onChange={(event) => updateArchitecture("synapseStateSize", numberInput(Number(event.target.value), 0))}
                  disabled={isTraining}
                />
              </label>
              <label className={styles.field}>
                <span>Output gain</span>
                <input
                  type="number"
                  min={0.1}
                  max={2000}
                  step={0.1}
                  value={draft.architecture.outputGain}
                  onChange={(event) => updateArchitecture("outputGain", numberInput(Number(event.target.value), 2))}
                  disabled={isTraining}
                />
              </label>
              <label className={styles.field}>
                <span>Weights</span>
                <input value={`${draft.weights.length} / ${expectedLength}`} readOnly />
              </label>
            </div>

            <label className={styles.field}>
              <span>Notes</span>
              <textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} disabled={isTraining} />
            </label>
          </Card>

          <Card as="section" className={styles.controls}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Run</h2>
                <p>Use potential to check memory. Use IAF to test hard spike timing.</p>
              </div>
              <div className={styles.runButtons}>
                <Button variant="ghost" icon={<Play size={16} />} onClick={run} disabled={isTraining}>Run</Button>
                {trainingState === "running" ? (
                  <Button variant="ghost" icon={<Pause size={16} />} onClick={pauseTraining}>Pause</Button>
                ) : trainingSession.current && trainingState !== "complete" ? (
                  <Button variant="reward" icon={<Play size={16} />} onClick={continueTraining}>Continue</Button>
                ) : (
                  <Button variant="reward" icon={<Sparkles size={16} />} onClick={startTraining}>Train</Button>
                )}
                <Button variant="ghost" icon={<StepForward size={16} />} onClick={stepTraining} disabled={isTraining}>Step</Button>
              </div>
            </div>

            <div className={styles.trainingStatus}>
              <div>
                <b>{trainingState}</b>
                <span>generation {formatInt(generation)} / {formatInt(es.generations)}</span>
              </div>
              <div className={styles.progressTrack} aria-label="Training progress">
                <span className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
              </div>
              <small>Current ES params are applied to the next generation, so you can pause or tune while training.</small>
            </div>

            {gainIsSaturated ? (
              <div className={styles.warning}>
                <span>Potential training is saturated at output gain {draft.architecture.outputGain}. Use a small gain to see continuous learning.</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateArchitecture("outputGain", 2)}
                  disabled={hasActiveTraining}
                >
                  Set gain 2
                </Button>
              </div>
            ) : null}

            <div className={styles.grid4}>
              <label className={styles.field}>
                <span>Task</span>
                <select value={runConfig.task} onChange={(event) => setRunConfig({ ...runConfig, task: event.target.value as IafTask })} disabled={hasActiveTraining}>
                  <option value="potential">Potential</option>
                  <option value="iaf">IAF spikes</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Seed</span>
                <input value={runConfig.seed} onChange={(event) => setRunConfig({ ...runConfig, seed: event.target.value })} disabled={hasActiveTraining} />
              </label>
              <label className={styles.field}>
                <span>Sequence</span>
                <input type="number" min={20} max={400} value={runConfig.sequenceLength} onChange={(event) => setRunConfig({ ...runConfig, sequenceLength: numberInput(Number(event.target.value), 100) })} disabled={hasActiveTraining} />
              </label>
              <label className={styles.field}>
                <span>Environments</span>
                <input type="number" min={1} max={64} value={runConfig.environments} onChange={(event) => setRunConfig({ ...runConfig, environments: numberInput(Number(event.target.value), 8) })} disabled={hasActiveTraining} />
              </label>
            </div>

            <div className={styles.grid5}>
              <label className={styles.field}>
                <span>Generations</span>
                <input type="number" min={1} max={2000} value={es.generations} onChange={(event) => setEs({ ...es, generations: numberInput(Number(event.target.value), 40) })} />
              </label>
              <label className={styles.field}>
                <span>Population pairs</span>
                <input type="number" min={2} max={512} value={es.populationPairs} onChange={(event) => setEs({ ...es, populationPairs: numberInput(Number(event.target.value), 24) })} />
              </label>
              <label className={styles.field}>
                <span>Sigma</span>
                <input type="number" min={0.001} max={1} step={0.001} value={es.sigma} onChange={(event) => setEs({ ...es, sigma: numberInput(Number(event.target.value), 0.03) })} />
              </label>
              <label className={styles.field}>
                <span>Learning rate</span>
                <input type="number" min={0.01} max={5} step={0.01} value={es.learningRate} onChange={(event) => setEs({ ...es, learningRate: numberInput(Number(event.target.value), 1) })} />
              </label>
              <label className={styles.field}>
                <span>Momentum</span>
                <input type="number" min={0} max={0.99} step={0.01} value={es.momentum} onChange={(event) => setEs({ ...es, momentum: numberInput(Number(event.target.value), 0.9) })} />
              </label>
            </div>
          </Card>

          <Card as="section" className={styles.visual}>
            <div className={styles.metrics}>
              <span><b>{evaluation ? evaluation.loss.toFixed(4) : "—"}</b><small>loss</small></span>
              <span><b>{evaluation ? evaluation.fitness.toFixed(4) : "—"}</b><small>fitness</small></span>
              <span><b>{evaluation ? formatInt(evaluation.predictedSpikes) : "—"}</b><small>predicted spikes</small></span>
              <span><b>{historyBest ? historyBest.loss.toFixed(4) : "—"}</b><small>best trained loss</small></span>
            </div>
            <GeneTrainingChart history={history} />
            <GeneTrace evaluation={evaluation} task={runConfig.task} />
          </Card>

          <Card as="section" className={styles.weights}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Weights</h2>
                <p>Edit individual genome values. Architecture changes preserve overlapping weights.</p>
              </div>
            </div>
            <div className={styles.weightGrid}>
              {draft.weights.slice(0, 160).map((weight, index) => (
                <label key={index} className={styles.weightCell}>
                  <span>{index}</span>
                  <input
                    type="number"
                    step={0.001}
                    value={Number(weight.toFixed(4))}
                    onChange={(event) => updateWeight(index, numberInput(Number(event.target.value), 0))}
                  />
                </label>
              ))}
            </div>
            {draft.weights.length > 160 ? <p className={styles.moreWeights}>{formatInt(draft.weights.length - 160)} more weights stored in this gene.</p> : null}
          </Card>
        </section>
      </div>
    </div>
  );
}
