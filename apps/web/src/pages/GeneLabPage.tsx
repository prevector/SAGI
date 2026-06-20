import { useEffect, useMemo, useState } from "react";
import { Copy, Dna, Play, Save, Sparkles, Trash2 } from "lucide-react";
import {
  createRandomGene,
  iafGenomeLength,
  makeRng,
  resizeGeneArchitecture,
  runGeneOnIaf,
  trainGeneOnIaf,
  type EsHyperparams,
  type EvolutionGene,
  type IafEvaluation,
  type IafRunConfig,
  type IafTask,
  type TrainingGeneration
} from "@sagi/evolution";
import { Button, Card, PageHeader, Tag } from "../components/ui";
import { formatInt } from "../lib/format";
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

export default function GeneLabPage() {
  const [genes, setGenes] = useState<EvolutionGene[]>(() => loadGenes());
  const [selectedId, setSelectedId] = useState(() => genes[0]?.id ?? "");
  const [draft, setDraft] = useState<EvolutionGene>(() => genes[0] ?? createSeedGene());
  const [runConfig, setRunConfig] = useState<IafRunConfig>(DEFAULT_RUN);
  const [es, setEs] = useState<EsHyperparams>(DEFAULT_ES);
  const [evaluation, setEvaluation] = useState<IafEvaluation | null>(null);
  const [history, setHistory] = useState<TrainingGeneration[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    saveGenes(genes);
  }, [genes]);

  useEffect(() => {
    const next = genes.find((gene) => gene.id === selectedId);
    if (next) {
      setDraft(next);
      setEvaluation(null);
      setHistory([]);
    }
  }, [genes, selectedId]);

  const expectedLength = useMemo(() => iafGenomeLength(draft.architecture), [draft]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(genes.find((gene) => gene.id === draft.id));
  const historyBest = history.reduce<IafEvaluation | null>((best, item) => {
    if (!best || item.fitness > best.fitness) return item;
    return best;
  }, null);

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
        synapseStateSize: draft.architecture.synapseStateSize
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
    const resized = resizeGeneArchitecture(draft, { [key]: value }, makeRng(`${draft.id}:${key}:${value}`));
    setDraft(resized);
    setEvaluation(null);
  }

  function run() {
    const result = runGeneOnIaf(draft, runConfig);
    setEvaluation(result);
    setHistory([]);
    setMessage("Run complete");
  }

  function train() {
    const result = trainGeneOnIaf(draft, runConfig, es);
    persist({ ...result.gene, name: draft.name, notes: draft.notes });
    setEvaluation(result.best);
    setHistory(result.history);
    setMessage(`Training complete, best loss ${result.best.loss.toFixed(4)}`);
  }

  function updateWeight(index: number, value: number) {
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
        <Button variant="primary" icon={<Sparkles size={16} />} onClick={createNewGene}>New gene</Button>
        <Button variant="ghost" icon={<Copy size={16} />} onClick={duplicateGene}>Duplicate</Button>
        <Button variant="ghost" icon={<Save size={16} />} onClick={() => persist()} disabled={!dirty}>Save</Button>
        <Button variant="ghost" icon={<Trash2 size={16} />} onClick={deleteGene}>Delete</Button>
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
              <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
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
                  onChange={(event) => updateArchitecture("outputGain", numberInput(Number(event.target.value), 1000))}
                />
              </label>
              <label className={styles.field}>
                <span>Weights</span>
                <input value={`${draft.weights.length} / ${expectedLength}`} readOnly />
              </label>
            </div>

            <label className={styles.field}>
              <span>Notes</span>
              <textarea value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </label>
          </Card>

          <Card as="section" className={styles.controls}>
            <div className={styles.sectionHead}>
              <div>
                <h2>Run</h2>
                <p>Use potential to check memory. Use IAF to test hard spike timing.</p>
              </div>
              <div className={styles.runButtons}>
                <Button variant="ghost" icon={<Play size={16} />} onClick={run}>Run</Button>
                <Button variant="reward" icon={<Sparkles size={16} />} onClick={train}>Train</Button>
              </div>
            </div>

            <div className={styles.grid4}>
              <label className={styles.field}>
                <span>Task</span>
                <select value={runConfig.task} onChange={(event) => setRunConfig({ ...runConfig, task: event.target.value as IafTask })}>
                  <option value="potential">Potential</option>
                  <option value="iaf">IAF spikes</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Seed</span>
                <input value={runConfig.seed} onChange={(event) => setRunConfig({ ...runConfig, seed: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Sequence</span>
                <input type="number" min={20} max={400} value={runConfig.sequenceLength} onChange={(event) => setRunConfig({ ...runConfig, sequenceLength: numberInput(Number(event.target.value), 100) })} />
              </label>
              <label className={styles.field}>
                <span>Environments</span>
                <input type="number" min={1} max={64} value={runConfig.environments} onChange={(event) => setRunConfig({ ...runConfig, environments: numberInput(Number(event.target.value), 8) })} />
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
