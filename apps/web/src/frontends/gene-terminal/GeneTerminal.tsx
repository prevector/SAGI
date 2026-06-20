import { useEffect } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { formatInt } from "../../lib/format";
import { shortId } from "./components";
import { GeneTerminalProvider, useGeneTerminal } from "./state";
import { CreaturePanel } from "./panels/CreaturePanel";
import { GenesPanel } from "./panels/GenesPanel";
import { TrainingPanel } from "./panels/TrainingPanel";
import styles from "./GeneTerminal.module.css";

const dockComponents = {
  creature: CreaturePanel,
  genes: GenesPanel,
  training: TrainingPanel
};

function Workspace() {
  const terminal = useGeneTerminal();

  function onReady(event: DockviewReadyEvent) {
    event.api.addPanel({
      id: "genes",
      component: "genes",
      title: "GENES",
      initialWidth: 420
    });
    event.api.addPanel({
      id: "training",
      component: "training",
      title: "TRAINING",
      position: { direction: "right" },
      initialWidth: 860
    });
    event.api.addPanel({
      id: "creature",
      component: "creature",
      title: "CREATURE",
      position: { referencePanel: "training", direction: "below" }
    });
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.workspaceStrip}>
        <span>SAGI TERMINAL</span>
        <span>{shortId(terminal.selectedGene.id)}</span>
        <span>{terminal.status.toUpperCase()}</span>
        <span>GEN {formatInt(terminal.generation)}</span>
      </div>
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
  );
}

export function GeneTerminal() {
  useEffect(() => {
    document.title = "SAGI Terminal";
  }, []);

  return (
    <GeneTerminalProvider>
      <Workspace />
    </GeneTerminalProvider>
  );
}
