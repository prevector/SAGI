// Moves the champion creature along the GA's current best path: interpolates
// world position cell-to-cell, turns smoothly to face travel, and lets the
// Creature animate its gait. When it reaches the end it notifies the parent
// (which advances a generation) — unless the maze is solved, in which case it
// loops the winning route.

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type Grid, worldPos } from "../maze/generate";
import type { CellPath } from "../scene/PathLine";
import type { CreatureRig } from "./assemble";
import { Creature } from "./Creature";

const CELLS_PER_SEC = 4.5;

/** Shortest-arc angular lerp. */
function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

interface CreatureRunnerProps {
  rig: CreatureRig;
  grid: Grid;
  cellSize: number;
  path: CellPath;
  /** Restart traversal when this changes (new generation). */
  runKey: number;
  solved: boolean;
  /** Animate (false => paused/idle, e.g. queued/reduced-motion). */
  evolve: boolean;
  /** Called each frame once the creature reaches the path end (parent throttles). */
  onArrive: () => void;
  scale: number;
}

export function CreatureRunner({
  rig,
  grid,
  cellSize,
  path,
  runKey,
  solved,
  evolve,
  onArrive,
  scale,
}: CreatureRunnerProps) {
  const group = useRef<THREE.Group>(null);
  const prog = useRef(0); // progress in cell-units along the path

  // Restart traversal on a new champion path.
  useEffect(() => {
    prog.current = 0;
  }, [runKey]);

  // Place at the start cell immediately (covers idle / first frame).
  useEffect(() => {
    if (!group.current) return;
    const [sx, sz] = worldPos(grid, grid.start[0], grid.start[1], cellSize);
    group.current.position.set(sx, 0, sz);
  }, [grid, cellSize]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g || path.length === 0) return;
    const maxU = path.length - 1;

    if (evolve && path.length >= 2) {
      prog.current = Math.min(maxU, prog.current + dt * CELLS_PER_SEC);
    }

    const u = prog.current;
    const i = Math.min(Math.floor(u), maxU);
    const f = u - i;
    const a = path[i];
    const b = path[Math.min(i + 1, maxU)];
    const [ax, az] = worldPos(grid, a[0], a[1], cellSize);
    const [bx, bz] = worldPos(grid, b[0], b[1], cellSize);
    const x = ax + (bx - ax) * f;
    const z = az + (bz - az) * f;
    g.position.set(x, 0, z);

    const dx = bx - ax;
    const dz = bz - az;
    if (dx !== 0 || dz !== 0) {
      const yaw = Math.atan2(dx, dz); // creature faces +Z
      g.rotation.y = lerpAngle(g.rotation.y, yaw, 0.18);
    }

    if (evolve && prog.current >= maxU - 1e-3) {
      if (solved) prog.current = 0; // loop the winning route
      else onArrive(); // ask parent to advance a generation (it throttles)
    }
  });

  return (
    <group ref={group} scale={scale}>
      <Creature rig={rig} walk={evolve && path.length >= 2} />
    </group>
  );
}
