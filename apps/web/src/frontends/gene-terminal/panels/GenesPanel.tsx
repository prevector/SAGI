import type { IDockviewPanelProps } from "dockview";
import { formatInt } from "../../../lib/format";
import { useGeneTerminal } from "../state";
import { NumberField, Readout, shortId } from "../components";
import styles from "../GeneTerminal.module.css";

export function GenesPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const gene = terminal.selectedGene;

  return (
    <section className={styles.panel}>
      <div className={styles.panelTools}>
        <button onClick={terminal.createGene}>NEW</button>
        <button onClick={terminal.duplicateGene}>DUPLICATE</button>
      </div>

      <div className={styles.sectionLabel}>library</div>
      <div className={styles.geneList}>
        {terminal.genes.map((item) => (
          <button
            key={item.id}
            className={item.id === terminal.selectedId ? styles.selectedGene : ""}
            onClick={() => terminal.selectGene(item.id)}
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
        <Readout label="weights" value={formatInt(terminal.weightCount)} />
        <Readout label="updated" value={new Date(gene.updatedAt).toLocaleTimeString()} />
      </div>

      <div className={styles.formGrid}>
        <NumberField
          label="neuron states"
          min={1}
          max={64}
          value={gene.architecture.neuronStateSize}
          onChange={(value) => terminal.updateArchitecture("neuronStateSize", value)}
        />
        <NumberField
          label="synapse states"
          min={0}
          max={64}
          value={gene.architecture.synapseStateSize}
          onChange={(value) => terminal.updateArchitecture("synapseStateSize", value)}
        />
        <NumberField
          label="output gain"
          min={0.1}
          max={2000}
          step={0.1}
          value={gene.architecture.outputGain}
          onChange={(value) => terminal.updateArchitecture("outputGain", value)}
        />
      </div>

      <div className={styles.note}>
        Shared client state is real. Optimizer execution is not connected yet.
      </div>
    </section>
  );
}
