// SessionVisual — the single component SessionPage lazy-imports. A creature
// whose brain is evolved by a real (headless) GA learns to solve a seeded maze
// on a dark, bloomed stage. Phases bind to session.status; the GA drives the
// generations. Everything derives from `seed = session.id`.
//
// Accessibility/perf: honours prefers-reduced-motion (static solved frame),
// shrinks on mobile, and pauses off-screen / when backgrounded (see Stage).

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { VISUAL_CONFIG } from "./config";
import { subRng } from "./rng";
import { Maze } from "./maze/Maze";
import { worldPos } from "./maze/generate";
import { Creature } from "./creature/Creature";
import { CreatureRunner } from "./creature/CreatureRunner";
import { assemble } from "./creature/assemble";
import { genomeFromSeed } from "./creature/genome";
import { useGaRun } from "./learning/useGaRun";
import { createRemoteSource } from "./learning/remoteSource";
import { PALETTE } from "./palette";
import { GhostTrails } from "./scene/GhostTrails";
import { PathLine } from "./scene/PathLine";
import { Footprints } from "./scene/Footprints";
import { Stage } from "./scene/Stage";
import { usePerf } from "./scene/usePerf";
import { useReducedMotion } from "./scene/useReducedMotion";
import { useIsMobile } from "./scene/useIsMobile";
import { useQuality } from "./scene/useQuality";
import styles from "./SessionVisual.module.css";

export type SessionVisualStatus = "queued" | "running" | "completed" | "failed";

export interface SessionVisualProps {
  /** = session.id. All randomness derives from this. */
  seed: string;
  status: SessionVisualStatus;
  /** 0..1 — phase gate only; the GA drives the actual generations. */
  progress: number;
}

const isDevFps = import.meta.env.DEV;

export default function SessionVisual({ seed, status }: SessionVisualProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const perf = usePerf();

  const { cellSize, wallHeight } = VISUAL_CONFIG.maze;
  const cols = isMobile ? VISUAL_CONFIG.maze.mobileCols : VISUAL_CONFIG.maze.cols;
  const rows = isMobile ? VISUAL_CONFIG.maze.mobileRows : VISUAL_CONFIG.maze.rows;

  const remote = VISUAL_CONFIG.trainingSource === "remote";

  // Demonstrate the engine seam: subscribe to the (stub) remote source.
  useEffect(() => {
    if (!remote) return;
    const src = createRemoteSource();
    return src.subscribe(seed, () => {
      /* engine telemetry not wired yet */
    });
  }, [remote, seed]);

  // Reduced motion: solve synchronously and show a single static frame.
  const run = useGaRun(seed, { cols, rows, autoSolve: reducedMotion && !remote });
  const { grid, snap } = run;

  // Creature morphology is fixed per session.
  const rig = useMemo(() => assemble(genomeFromSeed(subRng(seed, "morph"))), [seed]);
  // Sized to sit comfortably inside a 1-cell corridor (avoids wall clipping).
  const creatureScale = cellSize * 0.5;

  // Live ground position of the champion, written by CreatureRunner each frame
  // and read by the footprint trail.
  const creaturePos = useRef(new THREE.Vector3());

  // Evolve (animate) only when the session is active and motion is allowed.
  const evolve = !reducedMotion && !remote && (status === "running" || status === "completed");

  const frameloop = evolve ? "always" : "demand";

  // Resolve the live fidelity tier (device base + one-way perf governor). Every
  // heavy effect in the scene/creature/maze reads this — never isMobile directly.
  const quality = useQuality({ mobile: isMobile, reducedMotion, perf, active: evolve });

  const startPos = useMemo(
    () => cellWorld(grid.start, grid, cellSize),
    [grid, cellSize]
  );
  const exitPos = useMemo(() => cellWorld(grid.exit, grid, cellSize), [grid, cellSize]);
  // Reduced-motion: park the creature at the exit of its solved route.
  const staticPos = reducedMotion && snap.solved ? exitPos : startPos;

  const phaseLabel = useMemo(() => {
    if (remote) return "Waiting for engine telemetry…";
    if (status === "queued") return "Idle · awaiting compute";
    if (status === "failed") return "Reset";
    return snap.solved ? "Solved" : "Evolving";
  }, [remote, status, snap.solved]);

  return (
    <div className={styles.root} aria-hidden="true">
      <Stage
        frameloop={frameloop}
        lowPower={reducedMotion}
        mobile={isMobile}
        perf={perf}
        quality={quality}
      >
        <Maze
          grid={grid}
          cellSize={cellSize}
          wallHeight={wallHeight}
          celebrate={snap.solved}
          quality={quality}
        />

        {/* Exploration attempts (dim dashed) while still searching (desktop). */}
        {evolve && !snap.solved && !isMobile ? (
          <GhostTrails grid={grid} cellSize={cellSize} attempts={snap.attempts} />
        ) : null}

        {/* The champion's route, always drawn while it moves — solid teal when
            solved, a quieter line while still evolving (its visible trail). */}
        {(evolve || reducedMotion) && snap.path.length >= 2 ? (
          <PathLine
            grid={grid}
            cellSize={cellSize}
            path={snap.path}
            color={PALETTE.teal}
            y={0.05}
            lineWidth={snap.solved ? 5 : 3.5}
            opacity={snap.solved ? 1 : 0.7}
          />
        ) : null}

        {/* Fading footprints the creature stamps as it walks. */}
        {evolve ? <Footprints posRef={creaturePos} color={PALETTE.teal} cellSize={cellSize} /> : null}

        {/* The champion creature: follows the path when evolving, else static. */}
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
            quality={quality}
            fitness={Math.min(1, snap.bestFitness / 100)}
            posRef={creaturePos}
          />
        ) : (
          <group position={staticPos} scale={creatureScale}>
            <Creature rig={rig} walk={false} quality={quality} fitness={snap.solved ? 1 : 0.3} />
          </group>
        )}
      </Stage>

      {/* DOM HUD overlay — inherits Geist from the page (colorblind-safe text). */}
      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={`${styles.hudStatus} ${snap.solved && !remote ? styles.hudSolved : ""}`}>
            {phaseLabel}
          </span>
          {!remote && status !== "queued" ? (
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

function cellWorld(
  cell: readonly [number, number],
  grid: Parameters<typeof worldPos>[0],
  cellSize: number
): [number, number, number] {
  const [wx, wz] = worldPos(grid, cell[0], cell[1], cellSize);
  return [wx, 0, wz];
}
