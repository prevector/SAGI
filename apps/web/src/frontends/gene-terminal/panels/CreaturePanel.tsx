import type { IDockviewPanelProps } from "dockview";
import { formatInt } from "../../../lib/format";
import { CreatureGlyph, Readout } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function CreaturePanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();

  return (
    <section className={styles.panel}>
      <div className={styles.sectionLabel}>creature</div>
      <CreatureGlyph
        gene={terminal.selectedGene}
        status={terminal.status}
        generation={terminal.generation}
      />
      <div className={styles.matrix}>
        <Readout label="status" value={terminal.status.toUpperCase()} />
        <Readout label="generation" value={formatInt(terminal.generation)} />
        <Readout label="neuron states" value={formatInt(terminal.selectedGene.architecture.neuronStateSize)} />
        <Readout label="synapse states" value={formatInt(terminal.selectedGene.architecture.synapseStateSize)} />
      </div>
      <div className={styles.note}>
        Creature view is a placeholder morphology. Later this panel should replay the actual phenotype under the current training task.
      </div>
    </section>
  );
}
