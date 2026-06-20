import type { IDockviewPanelProps } from "dockview";
import { CreatureViewport } from "../CreatureViewport";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function CreaturePanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();

  return (
    <section className={`${styles.panel} ${styles.creaturePanel}`}>
      <CreatureViewport
        gene={terminal.selectedGene}
        status={terminal.status}
        generation={terminal.generation}
      />
    </section>
  );
}
