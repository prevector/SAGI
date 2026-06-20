import { useEffect, useMemo, useRef, useState } from "react";
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { formatInt } from "../../lib/format";
import { shortId } from "./components";
import { GeneTerminalProvider, useGeneTerminal } from "./state";
import { CreatureLibraryPanel } from "./panels/CreatureLibraryPanel";
import { CreaturePanel } from "./panels/CreaturePanel";
import { GenesPanel } from "./panels/GenesPanel";
import { NetworkPanel } from "./panels/NetworkPanel";
import { TrainingPanel } from "./panels/TrainingPanel";
import styles from "./GeneTerminal.module.css";

const dockComponents = {
  creature: CreaturePanel,
  genes: GenesPanel,
  library: CreatureLibraryPanel,
  network: NetworkPanel,
  training: TrainingPanel
};

const panelSpecs = {
  genes: {
    id: "genes",
    component: "genes",
    title: "GENES",
    initialWidth: 420
  },
  library: {
    id: "library",
    component: "library",
    title: "LIBRARY",
    position: { referencePanel: "genes", direction: "below" as const },
    initialHeight: 320
  },
  training: {
    id: "training",
    component: "training",
    title: "TRAINING",
    position: { direction: "right" as const },
    initialWidth: 860
  },
  creature: {
    id: "creature",
    component: "creature",
    title: "CREATURE",
    position: { referencePanel: "training", direction: "below" as const }
  },
  network: {
    id: "network",
    component: "network",
    title: "NETWORK",
    position: { referencePanel: "creature", direction: "right" as const },
    initialWidth: 520
  }
} as const;

type PanelId = keyof typeof panelSpecs;

function Workspace() {
  const terminal = useGeneTerminal();
  const dockApiRef = useRef<DockviewApi | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"file" | "window" | null>(null);
  const [layoutNonce, setLayoutNonce] = useState(0);

  function onReady(event: DockviewReadyEvent) {
    dockApiRef.current = event.api;
    (Object.keys(panelSpecs) as PanelId[]).forEach((panelId) => {
      event.api.addPanel(panelSpecs[panelId]);
    });
    event.api.onDidAddPanel(() => setLayoutNonce((value) => value + 1));
    event.api.onDidRemovePanel(() => setLayoutNonce((value) => value + 1));
    event.api.onDidActivePanelChange(() => setLayoutNonce((value) => value + 1));
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpenMenu(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function togglePanel(panelId: PanelId) {
    const api = dockApiRef.current;
    if (!api) return;
    const panel = api.getPanel(panelId);
    if (panel) {
      panel.api.close();
      return;
    }
    api.addPanel(panelSpecs[panelId]);
  }

  const visiblePanels = useMemo(() => {
    const api = dockApiRef.current;
    return (Object.keys(panelSpecs) as PanelId[]).map((panelId) => ({
      id: panelId,
      title: panelSpecs[panelId].title,
      visible: Boolean(api?.getPanel(panelId))
    }));
  }, [layoutNonce]);

  const summary = useMemo(() => {
    return [
      terminal.selectedCreature.name,
      terminal.selectedCreature.phenotype.paletteName,
      `${formatInt(terminal.selectedMorphology.legPairs * 2)} legs`,
      terminal.status.toUpperCase(),
      `GEN ${formatInt(terminal.generation)}`
    ];
  }, [terminal.generation, terminal.selectedCreature.name, terminal.selectedCreature.phenotype.paletteName, terminal.selectedMorphology.legPairs, terminal.status]);

  function runFileAction(action: "new" | "mutate" | "save") {
    setOpenMenu(null);
    if (action === "new") terminal.generateCreature();
    if (action === "mutate") terminal.mutateGene();
    if (action === "save") terminal.saveCreature();
  }

  return (
    <div className={styles.terminal}>
      <div className={styles.menuBar} ref={menuRef}>
        <div className={styles.menuCluster}>
          <span className={styles.workspaceMark}>SAGI TERMINAL</span>
          <div className={styles.menuWrap}>
            <button className={styles.menuButton} onClick={() => setOpenMenu((value) => (value === "file" ? null : "file"))}>
              File
            </button>
            {openMenu === "file" ? (
              <div className={styles.menuPopover}>
                <button className={styles.menuItem} onClick={() => runFileAction("new")}>New creature</button>
                <button className={styles.menuItem} onClick={() => runFileAction("mutate")}>Mutate creature</button>
                <button className={styles.menuItem} onClick={() => runFileAction("save")}>Save creature</button>
              </div>
            ) : null}
          </div>
          <div className={styles.menuWrap}>
            <button className={styles.menuButton} onClick={() => setOpenMenu((value) => (value === "window" ? null : "window"))}>
              Window
            </button>
            {openMenu === "window" ? (
              <div className={styles.menuPopover}>
                {visiblePanels.map((panel) => (
                  <button key={panel.id} className={styles.menuItem} onClick={() => togglePanel(panel.id)}>
                    <span className={styles.menuCheck}>{panel.visible ? "✓" : ""}</span>
                    {panel.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className={styles.infoCluster}>
          {summary.map((item) => (
            <span key={item}>{item}</span>
          ))}
          <span>{shortId(terminal.selectedGene.id)}</span>
        </div>
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
