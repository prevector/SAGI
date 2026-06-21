import type { IDockviewPanelProps } from "dockview";
import { formatInt } from "../../../lib/format";
import { MockChart } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function TrainingGraphPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const footballMode = terminal.trainingMode === "football";
  const progress = clamp(terminal.generation / Math.max(terminal.es.generations, 1), 0, 1);

  return (
    <section className={`${styles.panel} ${styles.panelGraph}`}>
      <div className={styles.chartPane}>
        <div className={styles.chartOverlay}>
          <span>{footballMode ? terminal.score.toFixed(2) : `${(terminal.accuracy * 100).toFixed(0)}%`}</span>
          <span>{footballMode ? terminal.bestScore.toFixed(2) : `${(terminal.bestAccuracy * 100).toFixed(0)}%`}</span>
          <span>{formatInt(terminal.generation)} / {formatInt(terminal.es.generations)}</span>
        </div>
        <div className={styles.chartProgress}>
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <MockChart history={terminal.history} mode={terminal.trainingMode} />
      </div>
    </section>
  );
}
