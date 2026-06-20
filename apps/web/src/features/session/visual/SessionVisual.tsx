// SessionVisual — the single component SessionPage lazy-imports. A creature
// whose brain is evolved by a real (headless) GA learns to solve a seeded maze
// on a dark, bloomed stage. Phases bind to session.status; the GA drives the
// generations. Everything derives from `seed = session.id`.

import { useMemo } from "react";
import { VISUAL_CONFIG } from "./config";
import { subRng } from "./rng";
import { Maze } from "./maze/Maze";
import { Creature } from "./creature/Creature";
import { CreatureRunner } from "./creature/CreatureRunner";
import { assemble } from "./creature/assemble";
import { genomeFromSeed } from "./creature/genome";
import { useGaRun } from "./learning/useGaRun";
import { PALETTE } from "./palette";
import { GhostTrails } from "./scene/GhostTrails";
import { PathLine } from "./scene/PathLine";
import { Stage } from "./scene/Stage";
import { usePerf } from "./scene/usePerf";
import { useReducedMotion } from "./scene/useReducedMotion";
import { worldPos } from "./maze/generate";
import styles from "./SessionVisual.module.css";

export type SessionVisualStatus = "queued" | "running" | "completed" | "failed";

export interface SessionVisualProps {
  /** = session.id. All randomness derives from this. */
  seed: string;
  status: SessionVisualStatus;
  /** 0..1 — phase gate only; the GA drives the actual generations. */
  progress: number;
}

export default function SessionVisual({ seed, status }: SessionVisualProps) {
  const reducedMotion = useReducedMotion();
  const perf = usePerf();
  const { cellSize, wallHeight } = VISUAL_CONFIG.maze;

  const run = useGaRun(seed);
  const { grid, snap } = run;

  // Creature morphology is fixed per session.
  const rig = useMemo(() => assemble(genomeFromSeed(subRng(seed, "morph"))), [seed]);
  const creatureScale = cellSize * 0.42;

  // Evolve while the session is running or completed; idle when queued/failed.
  const evolve = !reducedMotion && (status === "running" || status === "completed");
  const frameloop = evolve ? "always" : "demand";

  const startPos = useMemo(() => {
    const [wx, wz] = worldPos(grid, grid.start[0], grid.start[1], cellSize);
    return [wx, 0, wz] as [number, number, number];
  }, [grid, cellSize]);

  const phaseLabel = useMemo(() => {
    if (status === "queued") return "Idle · awaiting compute";
    if (status === "failed") return "Reset";
    return snap.solved ? "Solved" : "Evolving";
  }, [status, snap.solved]);

  return (
    <div className={styles.root} aria-hidden="true">
      <Stage frameloop={frameloop} lowPower={reducedMotion} perf={perf}>
        <Maze grid={grid} cellSize={cellSize} wallHeight={wallHeight} celebrate={snap.solved} />

        {/* Exploration attempts (dim dashed) while still searching. */}
        {evolve && !snap.solved ? (
          <GhostTrails grid={grid} cellSize={cellSize} attempts={snap.attempts} />
        ) : null}

        {/* Solved route ignites as a solid bright line (colorblind cue). */}
        {snap.solved ? (
          <PathLine
            grid={grid}
            cellSize={cellSize}
            path={snap.path}
            color={PALETTE.teal}
            y={0.06}
            lineWidth={3}
          />
        ) : null}

        {/* The champion creature. When idle, stand at the start. */}
        {evolve ? (
          <CreatureRunner
            rig={rig}
            grid={grid}
            cellSize={cellSize}
            path={snap.path}
            runKey={run.runKey}
            solved={snap.solved}
            evolve={evolve}
            onArrive={run.advance}
            scale={creatureScale}
          />
        ) : (
          <group position={startPos} scale={creatureScale}>
            <Creature rig={rig} walk={false} />
          </group>
        )}
      </Stage>

      {/* DOM HUD overlay — inherits Geist from the page (colorblind-safe text). */}
      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={`${styles.hudStatus} ${snap.solved ? styles.hudSolved : ""}`}>
            {phaseLabel}
          </span>
          {status !== "queued" ? (
            <span className={styles.hudStats}>
              Gen {String(snap.generation).padStart(2, "0")} · fitness {snap.bestFitness.toFixed(0)}
              {snap.solved ? ` · ${snap.bestSteps} steps` : ""}
            </span>
          ) : null}
        </div>
        {isDevFps ? <span className={styles.hudPerf}>{perf.fps} fps</span> : null}
      </div>
    </div>
  );
}

const isDevFps = import.meta.env.DEV;
