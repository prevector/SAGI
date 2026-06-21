import type { IDockviewPanelProps } from "dockview";
import { NumberField } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function TrainingPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();

  return (
    <section className={`${styles.panel} ${styles.panelTraining}`}>
      <div className={styles.trainingToolbar}>
        <label className={styles.field}>
          <span>mode</span>
          <select
            value={terminal.trainingMode}
            onChange={(event) => terminal.setTrainingMode(event.target.value as typeof terminal.trainingMode)}
            className={styles.selectField}
          >
            <option value="language">fake language</option>
            <option value="football">football</option>
          </select>
        </label>
        <NumberField
          label="iterations"
          min={1}
          max={10000}
          value={terminal.es.generations}
          onChange={(value) => terminal.updateEs("generations", value)}
        />
        <div className={styles.trainingActions}>
          {terminal.status === "running" ? (
            <button className={styles.iconButton} onClick={terminal.pause} aria-label="Pause training" title="Pause training">
              II
            </button>
          ) : (
            <button className={styles.iconButton} onClick={terminal.start} aria-label="Start training" title="Start training">
              {"\u25B6"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
