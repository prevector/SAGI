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
          <div className={styles.trainingStatusBlock}>
            <strong>{running ? "running" : terminal.status}</strong>
            <span>current stage: {terminal.trainingMode === "football" ? "football" : "fake language"}</span>
          </div>
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
          <div className={styles.trainingStageMeta}>
            <strong>football</strong>
            <span>{terminal.trainingMode === "football" ? "active stage" : "queued next or selectable"}</span>
          </div>
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
          <div className={styles.trainingStageMeta}>
            <strong>fake language</strong>
            <span>{terminal.trainingMode === "language" ? "active stage" : "queued next or selectable"}</span>
          </div>
          <NumberField
            label="iterations"
            min={1}
            max={10000}
            value={terminal.languageIterations}
            onChange={(value) => terminal.updateStageIterations("language", value)}
          />
        </div>

        <div className={styles.trainingSubgrid}>
          <NumberField
            label="population pairs"
            min={1}
            max={512}
            value={terminal.es.populationPairs}
            onChange={(value) => terminal.updateEs("populationPairs", value)}
          />
          <NumberField
            label="match seconds"
            min={2}
            max={120}
            value={terminal.footballMatchTicks / 24}
            onChange={(value) => terminal.updateFootball("matchSeconds", value)}
          />
          <NumberField
            label="hidden size"
            min={2}
            max={64}
            value={terminal.hiddenSize}
            onChange={(value) => terminal.updateHiddenSize(value)}
          />
        </div>
      </div>
    </section>
  );
}
