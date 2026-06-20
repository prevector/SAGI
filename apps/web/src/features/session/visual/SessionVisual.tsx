// SessionVisual — the single component SessionPage lazy-imports. For C1 this
// renders a glowing placeholder mesh to validate the render pipeline (theme,
// bloom, mount/unmount, perf). Later sub-phases replace the placeholder with
// the maze + creature + GA.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { PALETTE, glow } from "./palette";
import { VISUAL_CONFIG } from "./config";
import { subRng } from "./rng";
import { generateMaze, worldPos } from "./maze/generate";
import { Maze } from "./maze/Maze";
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

/** Placeholder creature — a glowing icosahedron at the start cell (stand-in
 * until C3/C4 add the procedural creature). */
function Placeholder({
  animate,
  position,
}: {
  animate: boolean;
  position: [number, number, number];
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (animate && ref.current) {
      ref.current.rotation.y += dt * 0.6;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <icosahedronGeometry args={[0.32, 1]} />
      <meshStandardMaterial
        color={PALETTE.teal}
        emissive={PALETTE.teal}
        emissiveIntensity={glow(1.6)}
        roughness={0.35}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}

export default function SessionVisual({ seed, status, progress }: SessionVisualProps) {
  const reducedMotion = useReducedMotion();
  const perf = usePerf();

  const { cols, rows, cellSize, wallHeight } = VISUAL_CONFIG.maze;

  // The maze is fixed per session: derive it once from the seed.
  const grid = useMemo(
    () => generateMaze(subRng(seed, "maze"), cols, rows),
    [seed, cols, rows]
  );

  // Placeholder creature sits on the start cell until C3/C4 replace it.
  const startWorld = useMemo(() => {
    const [wx, wz] = worldPos(grid, grid.start[0], grid.start[1], cellSize);
    return [wx, wallHeight + 0.4, wz] as [number, number, number];
  }, [grid, cellSize, wallHeight]);

  const isDev = import.meta.env.DEV;
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
        <Placeholder animate={animate} position={startWorld} />
      </Stage>

      {/* DOM HUD overlay — inherits Geist from the page (colorblind-safe text). */}
      <div className={styles.hud}>
        <span className={styles.hudStatus}>{statusLabel}</span>
        {isDev ? <span className={styles.hudPerf}>{perf.fps} fps</span> : null}
      </div>
    </div>
  );
}
