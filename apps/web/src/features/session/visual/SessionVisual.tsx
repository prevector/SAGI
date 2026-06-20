// SessionVisual — the single component SessionPage lazy-imports. Renders the
// seeded maze and the procedural creature on a dark, bloomed stage. The GA and
// gait animation arrive in C4–C6; for now the creature stands at the start.

import { useMemo } from "react";
import { VISUAL_CONFIG } from "./config";
import { subRng } from "./rng";
import { generateMaze, worldPos } from "./maze/generate";
import { Maze } from "./maze/Maze";
import { Creature } from "./creature/Creature";
import { assemble } from "./creature/assemble";
import { genomeFromSeed } from "./creature/genome";
import { Stage } from "./scene/Stage";
import { usePerf } from "./scene/usePerf";
import { useReducedMotion } from "./scene/useReducedMotion";
import styles from "./SessionVisual.module.css";

export type SessionVisualStatus = "queued" | "running" | "completed" | "failed";

export interface SessionVisualProps {
  /** = session.id. All randomness derives from this. */
  seed: string;
  status: SessionVisualStatus;
  /** 0..1 — phase gate only; the GA drives the actual generations. */
  progress: number;
}

export default function SessionVisual({ seed, status, progress }: SessionVisualProps) {
  const reducedMotion = useReducedMotion();
  const perf = usePerf();

  const { cols, rows, cellSize, wallHeight } = VISUAL_CONFIG.maze;

  // Maze + creature are both fixed per session: derive once from the seed.
  const grid = useMemo(
    () => generateMaze(subRng(seed, "maze"), cols, rows),
    [seed, cols, rows]
  );
  const rig = useMemo(() => assemble(genomeFromSeed(subRng(seed, "morph"))), [seed]);

  // Sit the creature on the start cell, scaled to fit comfortably in a cell.
  const creatureScale = cellSize * 0.42;
  const creaturePos = useMemo(() => {
    const [wx, wz] = worldPos(grid, grid.start[0], grid.start[1], cellSize);
    return [wx, 0, wz] as [number, number, number];
  }, [grid, cellSize]);

  const isDev = import.meta.env.DEV;
  // The stage keeps rendering (damping/idle motion) while running; otherwise
  // a single frame is enough.
  const animate = !reducedMotion && status === "running";
  const frameloop = animate ? "always" : "demand";

  const statusLabel = useMemo(() => {
    switch (status) {
      case "queued":
        return "Idle · awaiting compute";
      case "running":
        return `Evolving · ${Math.round(progress * 100)}%`;
      case "completed":
        return "Solved";
      case "failed":
        return "Reset";
    }
  }, [status, progress]);

  return (
    <div className={styles.root} aria-hidden="true">
      <Stage frameloop={frameloop} lowPower={reducedMotion} perf={perf}>
        <Maze grid={grid} cellSize={cellSize} wallHeight={wallHeight} />
        <group position={creaturePos} scale={creatureScale}>
          <Creature rig={rig} />
        </group>
      </Stage>

      {/* DOM HUD overlay — inherits Geist from the page (colorblind-safe text). */}
      <div className={styles.hud}>
        <span className={styles.hudStatus}>{statusLabel}</span>
        {isDev ? <span className={styles.hudPerf}>{perf.fps} fps</span> : null}
      </div>
    </div>
  );
}
