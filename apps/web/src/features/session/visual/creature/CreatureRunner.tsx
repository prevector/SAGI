// Moves the champion creature along the GA's current best path: interpolates
// world position cell-to-cell, turns smoothly to face travel, and lets the
// Creature animate its gait. When it reaches the end it notifies the parent
// (which advances a generation) — unless the maze is solved, in which case it
// loops the winning route.

import { type RefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { type Grid, worldPos } from "../maze/generate";
import { clamp, dampAngle } from "../scene/anim";
import type { QualitySettings } from "../config";
import type { CellPath } from "../scene/PathLine";
import type { CreatureRig } from "./assemble";
import { Creature } from "./Creature";

const CELLS_PER_SEC = 4.5;

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
  quality: QualitySettings;
  /** 0..1 GA progress — forwarded to the creature's energy glow. */
  fitness: number;
  /** Written each frame with the creature's ground position (for the footprints). */
  posRef?: RefObject<THREE.Vector3>;
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
  quality,
  fitness,
  posRef,
}: CreatureRunnerProps) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null); // banks (rolls) into turns
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
    posRef?.current?.set(x, 0, z);

    const dx = bx - ax;
    const dz = bz - az;
    if (dx !== 0 || dz !== 0) {
      const yaw = Math.atan2(dx, dz); // creature faces +Z
      const next = dampAngle(g.rotation.y, yaw, 9, dt);
      // Bank: lean into the turn proportionally to angular velocity.
      const turnRate = (next - g.rotation.y) / Math.max(dt, 1e-3);
      if (inner.current) {
        inner.current.rotation.z = dampAngle(
          inner.current.rotation.z,
          clamp(-turnRate * 0.12, -0.5, 0.5),
          8,
          dt
        );
      }
      g.rotation.y = next;
    }

    if (evolve && prog.current >= maxU - 1e-3) {
      if (solved) prog.current = 0; // loop the winning route
      else onArrive(); // ask parent to advance a generation (it throttles)
    }
  });

  return (
    <group ref={group} scale={scale}>
      <group ref={inner}>
        <Creature rig={rig} walk={evolve && path.length >= 2} quality={quality} fitness={fitness} />
      </group>
    </group>
  );
}
