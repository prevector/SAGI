import { useEffect, useMemo, useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { SagiLogo } from "../../lib/SagiLogo";
import {
  DockviewReact,
  Orientation,
  type SerializedDockview,
  type DockviewApi,
  type DockviewReadyEvent
} from "dockview";
import "dockview/dist/styles/dockview.css";
import { useAuth } from "../../auth/AuthContext";
import { ComputeMetricsWidget } from "../../features/compute-metrics";
import { formatInt } from "../../lib/format";
import { shortId } from "./components";
import { GeneTerminalProvider, useGeneTerminal } from "./state";
import { AccountModal } from "./AccountModal";
import { CreatureLibraryPanel } from "./panels/CreatureLibraryPanel";
import { CreaturePanel } from "./panels/CreaturePanel";
import { InferencePanel } from "./panels/InferencePanel";
import { LeaderboardPanel } from "./panels/LeaderboardPanel";
import { NetworkPanel } from "./panels/NetworkPanel";
import { TrainingGraphPanel } from "./panels/TrainingGraphPanel";
import { TrainingPanel } from "./panels/TrainingPanel";
import styles from "./GeneTerminal.module.css";

const dockComponents = {
  creature: CreaturePanel,
  graph: TrainingGraphPanel,
  inference: InferencePanel,
  leaderboard: LeaderboardPanel,
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
    initialHeight: 360
  },
  leaderboard: {
    id: "leaderboard",
    component: "leaderboard",
    title: "LEADERBOARD",
    position: { referencePanel: "library", direction: "below" as const },
    initialHeight: 220
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
const ONBOARDING_STORAGE_KEY = "sagi-terminal-onboarding-v1";
const onboardingSteps = [
  {
    title: "Grow, train, verify",
    body: "SAGI evolves creatures, runs tasks, and keeps the best candidates."
  },
  {
    title: "Pick what evolves",
    body: "Library stores genes. Creature shows the selected phenotype."
  },
  {
    title: "Press play",
    body: "Training starts here. Choose a task, set iterations, then hit ▶."
  },
  {
    title: "Watch evidence",
    body: "Graph shows progress. Inference shows what the current best actually does."
  },
  {
    title: "Network decides",
    body: "Network and Leaderboard show submitted candidates and server-validated winners."
  }
] as const;

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
      leaderboard: {
        id: "leaderboard",
        contentComponent: "leaderboard",
        title: "LEADERBOARD"
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
                size: 430,
                data: {
                  id: "group-library",
                  views: ["library"],
                  activeView: "library"
                }
              },
              {
                type: "leaf",
                size: 250,
                data: {
                  id: "group-leaderboard",
                  views: ["leaderboard"],
                  activeView: "leaderboard"
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
  const { username, logout } = useAuth();
  const dockApiRef = useRef<DockviewApi | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"window" | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
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

  useEffect(() => {
    if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;
    setOnboardingOpen(true);
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

  const currentOnboardingStep = onboardingSteps[onboardingStep];

  function openOnboarding() {
    setOpenMenu(null);
    setOnboardingStep(0);
    setOnboardingOpen(true);
  }

  function closeOnboarding() {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
    setOnboardingOpen(false);
  }

  function nextOnboardingStep() {
    if (onboardingStep >= onboardingSteps.length - 1) {
      closeOnboarding();
      return;
    }
    setOnboardingStep((value) => value + 1);
  }

  const onboardingClass =
    onboardingOpen && onboardingStep === 1 ? styles.tourLibrary :
    onboardingOpen && onboardingStep === 2 ? styles.tourTraining :
    onboardingOpen && onboardingStep === 3 ? styles.tourEvidence :
    onboardingOpen && onboardingStep === 4 ? styles.tourNetwork :
    "";

  return (
    <div className={`${styles.terminal} ${onboardingClass}`}>
      <div className={styles.menuBar} ref={menuRef}>
        <div className={styles.menuCluster}>
          <SagiLogo height={18} className={styles.workspaceMark} />
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
          <button className={styles.menuButton} onClick={openOnboarding}>
            Tour
          </button>
        </div>
        <div className={styles.centerCluster}>
          <ComputeMetricsWidget />
        </div>
        <div className={styles.infoCluster}>
          {summary.map((item) => (
            <span key={item}>{item}</span>
          ))}
          {username ? <span>{username}</span> : null}
          <span>{shortId(terminal.selectedGene.id)}</span>
          <button
            className={styles.menuButton}
            onClick={() => setAccountOpen(true)}
            title="Account"
            aria-label="Account"
            aria-haspopup="dialog"
          >
            <UserRound size={12} />
          </button>
        </div>
      </div>
      {accountOpen && username ? (
        <AccountModal username={username} onClose={() => setAccountOpen(false)} onLogout={() => void logout()} />
      ) : null}
      <div className={styles.dockShell}>
        <DockviewReact
          className="dockview-theme-abyss"
          components={dockComponents}
          onReady={onReady}
          disableFloatingGroups
          disableTabsOverflowList
        />
      </div>
      {onboardingOpen ? (
        <div className={styles.onboardingLayer} role="dialog" aria-labelledby="sagi-onboarding-title">
          <div className={styles.onboardingCard}>
            <div className={styles.onboardingKicker}>
              <span>{onboardingStep + 1}/{onboardingSteps.length}</span>
              <button type="button" onClick={closeOnboarding} aria-label="Close onboarding">Skip</button>
            </div>
            <h1 id="sagi-onboarding-title">{currentOnboardingStep.title}</h1>
            <p>{currentOnboardingStep.body}</p>
            <div className={styles.onboardingActions}>
              <button
                type="button"
                onClick={() => setOnboardingStep((value) => Math.max(0, value - 1))}
                disabled={onboardingStep === 0}
              >
                Back
              </button>
              <button type="button" onClick={nextOnboardingStep}>
                {onboardingStep === onboardingSteps.length - 1 ? "Enter terminal" : "Next"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
