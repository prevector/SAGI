import { useEffect, useMemo, useRef, useState } from "react";
import {
  DockviewReact,
  Orientation,
  type SerializedDockview,
  type DockviewApi,
  type DockviewReadyEvent
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { formatInt } from "../../lib/format";
import { shortId } from "./components";
import { GeneTerminalProvider, useGeneTerminal } from "./state";
import { CreatureLibraryPanel } from "./panels/CreatureLibraryPanel";
import { CreaturePanel } from "./panels/CreaturePanel";
import { InferencePanel } from "./panels/InferencePanel";
import { NetworkPanel } from "./panels/NetworkPanel";
import { TrainingGraphPanel } from "./panels/TrainingGraphPanel";
import { TrainingPanel } from "./panels/TrainingPanel";
import styles from "./GeneTerminal.module.css";

const dockComponents = {
  creature: CreaturePanel,
  graph: TrainingGraphPanel,
  inference: InferencePanel,
  library: CreatureLibraryPanel,
  network: NetworkPanel,
  training: TrainingPanel
};

const panelSpecs = {
  network: {
    id: "network",
    component: "network",
    title: "NETWORK",
    initialWidth: 280,
    initialHeight: 250
  },
  library: {
    id: "library",
    component: "library",
    title: "LIBRARY",
    position: { referencePanel: "network", direction: "below" as const },
    initialHeight: 470
  },
  training: {
    id: "training",
    component: "training",
    title: "TRAINING",
    position: { referencePanel: "network", direction: "right" as const },
    initialWidth: 360,
    initialHeight: 220
  },
  graph: {
    id: "graph",
    component: "graph",
    title: "GRAPH",
    position: { referencePanel: "training", direction: "right" as const },
    initialWidth: 520,
    initialHeight: 220
  },
  inference: {
    id: "inference",
    component: "inference",
    title: "INFERENCE",
    position: { referencePanel: "graph", direction: "below" as const },
    initialHeight: 640
  },
  creature: {
    id: "creature",
    component: "creature",
    title: "CREATURE",
    position: { referencePanel: "graph", direction: "right" as const },
    initialWidth: 280,
    initialHeight: 250
  }
} as const;

type PanelId = keyof typeof panelSpecs;
const DEFAULT_LAYOUT_WIDTH = 1600;
const DEFAULT_LAYOUT_HEIGHT = 920;

function buildDefaultLayout(): SerializedDockview {
  return {
    activeGroup: "group-inference",
    panels: {
      network: {
        id: "network",
        contentComponent: "network",
        title: "NETWORK"
      },
      library: {
        id: "library",
        contentComponent: "library",
        title: "LIBRARY"
      },
      training: {
        id: "training",
        contentComponent: "training",
        title: "TRAINING"
      },
      graph: {
        id: "graph",
        contentComponent: "graph",
        title: "GRAPH"
      },
      creature: {
        id: "creature",
        contentComponent: "creature",
        title: "CREATURE"
      },
      inference: {
        id: "inference",
        contentComponent: "inference",
        title: "INFERENCE"
      }
    },
    grid: {
      width: DEFAULT_LAYOUT_WIDTH,
      height: DEFAULT_LAYOUT_HEIGHT,
      orientation: Orientation.HORIZONTAL,
      root: {
        type: "branch",
        size: DEFAULT_LAYOUT_WIDTH,
        data: [
          {
            type: "branch",
            size: 300,
            data: [
              {
                type: "leaf",
                size: 240,
                data: {
                  id: "group-network",
                  views: ["network"],
                  activeView: "network"
                }
              },
              {
                type: "leaf",
                size: 680,
                data: {
                  id: "group-library",
                  views: ["library"],
                  activeView: "library"
                }
              }
            ]
          },
          {
            type: "branch",
            size: 1300,
            data: [
              {
                type: "branch",
                size: 260,
                data: [
                  {
                    type: "leaf",
                    size: 360,
                    data: {
                      id: "group-training",
                      views: ["training"],
                      activeView: "training"
                    }
                  },
                  {
                    type: "leaf",
                    size: 620,
                    data: {
                      id: "group-graph",
                      views: ["graph"],
                      activeView: "graph"
                    }
                  },
                  {
                    type: "leaf",
                    size: 320,
                    data: {
                      id: "group-creature",
                      views: ["creature"],
                      activeView: "creature"
                    }
                  }
                ]
              },
              {
                type: "leaf",
                size: 660,
                data: {
                  id: "group-inference",
                  views: ["inference"],
                  activeView: "inference"
                }
              }
            ]
          }
        ]
      }
    }
  };
}

function Workspace() {
  const terminal = useGeneTerminal();
  const dockApiRef = useRef<DockviewApi | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"window" | null>(null);
  const [layoutNonce, setLayoutNonce] = useState(0);

  function onReady(event: DockviewReadyEvent) {
    dockApiRef.current = event.api;
    event.api.fromJSON(buildDefaultLayout());
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
      `${formatInt(terminal.selectedMorphology.legPairs * 2)} legs`,
      terminal.status.toUpperCase(),
      `GEN ${formatInt(terminal.generation)}`
    ];
  }, [terminal.generation, terminal.selectedCreature.name, terminal.selectedMorphology.legPairs, terminal.status]);

  return (
    <div className={styles.terminal}>
      <div className={styles.menuBar} ref={menuRef}>
        <div className={styles.menuCluster}>
          <span className={styles.workspaceMark}>SAGI TERMINAL</span>
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
