import type { IDockviewPanelProps } from "dockview";
import { NumberField } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function TrainingPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const running = terminal.status === "running";

  return (
    <section className={`${styles.panel} ${styles.panelTraining}`}>
      <div className={styles.trainingScheduler}>
        <div className={styles.trainingTopbar}>
          <strong className={styles.trainingTopLabel}>{running ? "pause" : "run"}</strong>
          <div className={styles.trainingActions}>
            {running ? (
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

        <div
          className={terminal.trainingMode === "football" ? styles.trainingStageActive : styles.trainingStage}
          onClick={() => terminal.setTrainingMode("football")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              terminal.setTrainingMode("football");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <strong className={styles.trainingStageLabel}>football</strong>
          <NumberField
            label="iterations"
            min={1}
            max={10000}
            value={terminal.footballIterations}
            onChange={(value) => terminal.updateStageIterations("football", value)}
          />
        </div>

        <div
          className={terminal.trainingMode === "language" ? styles.trainingStageActive : styles.trainingStage}
          onClick={() => terminal.setTrainingMode("language")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              terminal.setTrainingMode("language");
            }
          }}
          role="button"
          tabIndex={0}
        >
          <strong className={styles.trainingStageLabel}>fake language</strong>
          <NumberField
            label="iterations"
            min={1}
            max={10000}
            value={terminal.languageIterations}
            onChange={(value) => terminal.updateStageIterations("language", value)}
          />
        </div>
      </div>
    </section>
  );
}
