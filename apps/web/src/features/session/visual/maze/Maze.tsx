// Renders the maze: instanced wall bodies (deduped), glowing beveled wall-top
// seams that pulse a "data flow" toward the exit, a reflective floor, and
// start/exit markers. Wall bodies stay matte near-black so only the hero
// elements glow under Bloom; the seams + markers carry the light. Markers keep
// NON-COLOUR cues per the colorblind rule (PLAN-3D.md §7): start = teal ring;
// exit = orange ring + flag shape + light beam.
//
// Fidelity is gated by QualitySettings: reflective floor / capstone bevels /
// circuit traces / exit beam all degrade cleanly on the low tier.

import { useMemo, useRef } from "react";
import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { DIR, type Grid, cellAt, worldPos } from "./generate";
import { PALETTE } from "../palette";
import type { QualitySettings } from "../config";

const WALL_THICKNESS = 0.12;
const SEAM_H = 0.07;

interface WallSpec {
  key: string;
  pos: [number, number, number];
  horizontal: boolean; // true = runs along x (a N/S edge); false = along z (E/W edge)
}

/** Build a deduped list of wall segments from the grid. */
function buildWalls(grid: Grid, cellSize: number, wallHeight: number): WallSpec[] {
  const walls: WallSpec[] = [];
  const yMid = wallHeight / 2;
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      const cell = cellAt(grid, x, y);
      const [wx, wz] = worldPos(grid, x, y, cellSize);
      if (cell.walls[DIR.W]) {
        walls.push({ key: `w-${x}-${y}`, pos: [wx - cellSize / 2, yMid, wz], horizontal: false });
      }
      if (cell.walls[DIR.N]) {
        walls.push({ key: `n-${x}-${y}`, pos: [wx, yMid, wz - cellSize / 2], horizontal: true });
      }
      if (x === grid.cols - 1 && cell.walls[DIR.E]) {
        walls.push({ key: `e-${x}-${y}`, pos: [wx + cellSize / 2, yMid, wz], horizontal: false });
      }
      if (y === grid.rows - 1 && cell.walls[DIR.S]) {
        walls.push({ key: `s-${x}-${y}`, pos: [wx, yMid, wz + cellSize / 2], horizontal: true });
      }
    }
  }
  return walls;
}

interface MazeProps {
  grid: Grid;
  cellSize: number;
  wallHeight: number;
  /** Pulse the exit marker on success. */
  celebrate?: boolean;
  quality: QualitySettings;
}

/** Exit marker — orange ring + flag (colorblind shape cue) with a success pulse. */
function Exit({
  pos,
  cellSize,
  wallHeight,
  celebrate,
}: {
  pos: [number, number, number];
  cellSize: number;
  wallHeight: number;
  celebrate: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = celebrate ? 1 + Math.sin(state.clock.elapsedTime * 5) * 0.12 : 1;
    ref.current.scale.setScalar(s);
  });

  return (
    <group ref={ref} position={pos}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[cellSize * 0.3, cellSize * 0.42, 48]} />
        <meshStandardMaterial color={PALETTE.orange} emissive={PALETTE.orange} emissiveIntensity={0.4} />
      </mesh>

      {/* Flag pole + pennant (colorblind shape cue). */}
      <mesh position={[0, wallHeight * 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, wallHeight * 1.8, 10]} />
        <meshStandardMaterial color="#3A4A4A" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0.2, wallHeight * 1.55, 0]} castShadow>
        <coneGeometry args={[0.2, 0.4, 3]} />
        <meshStandardMaterial color={PALETTE.orange} roughness={0.5} />
      </mesh>
    </group>
  );
}

export function Maze({ grid, cellSize, wallHeight, celebrate = false, quality }: MazeProps) {
  const walls = useMemo(() => buildWalls(grid, cellSize, wallHeight), [grid, cellSize, wallHeight]);
  const vertical = walls.filter((w) => !w.horizontal);
  const horizontal = walls.filter((w) => w.horizontal);

  const floorW = grid.cols * cellSize;
  const floorH = grid.rows * cellSize;

  const [sx, sz] = worldPos(grid, grid.start[0], grid.start[1], cellSize);
  const [ex, ez] = worldPos(grid, grid.exit[0], grid.exit[1], cellSize);

  const showSeams = quality.wallBevel || quality.circuitTraces;
  const seamY = wallHeight + SEAM_H / 2;

  return (
    <group>
      {/* Floor — clean light matte that catches the soft shadows. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorW + cellSize, floorH + cellSize]} />
        <meshStandardMaterial color="#E9EFEF" roughness={0.95} metalness={0} />
      </mesh>

      {/* Vertical wall bodies (run along z). */}
      <Instances limit={vertical.length || 1} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, wallHeight, cellSize]} />
        <meshStandardMaterial color="#5E7170" roughness={0.7} metalness={0.05} />
        {vertical.map((w) => (
          <Instance key={w.key} position={w.pos} />
        ))}
      </Instances>

      {/* Horizontal wall bodies (run along x). */}
      <Instances limit={horizontal.length || 1} castShadow receiveShadow>
        <boxGeometry args={[cellSize, wallHeight, WALL_THICKNESS]} />
        <meshStandardMaterial color="#5E7170" roughness={0.7} metalness={0.05} />
        {horizontal.map((w) => (
          <Instance key={w.key} position={w.pos} />
        ))}
      </Instances>

      {/* Static teal wall-top edge accent (no animation — a quiet highlight). */}
      {showSeams ? (
        <>
          <Instances limit={vertical.length || 1}>
            <boxGeometry args={[WALL_THICKNESS * 1.5, SEAM_H, cellSize]} />
            <meshStandardMaterial color={PALETTE.tealDeep} emissive={PALETTE.teal} emissiveIntensity={0.25} roughness={0.5} />
            {vertical.map((w) => (
              <Instance key={w.key} position={[w.pos[0], seamY, w.pos[2]]} />
            ))}
          </Instances>
          <Instances limit={horizontal.length || 1}>
            <boxGeometry args={[cellSize, SEAM_H, WALL_THICKNESS * 1.5]} />
            <meshStandardMaterial color={PALETTE.tealDeep} emissive={PALETTE.teal} emissiveIntensity={0.25} roughness={0.5} />
            {horizontal.map((w) => (
              <Instance key={w.key} position={[w.pos[0], seamY, w.pos[2]]} />
            ))}
          </Instances>
        </>
      ) : null}

      {/* Start marker — teal ring (intelligence axis). */}
      <mesh position={[sx, 0.02, sz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[cellSize * 0.28, cellSize * 0.36, 48]} />
        <meshStandardMaterial color={PALETTE.teal} emissive={PALETTE.teal} emissiveIntensity={0.35} />
      </mesh>

      {/* Exit marker — orange ring + flag SHAPE (colorblind-safe). */}
      <Exit pos={[ex, 0, ez]} cellSize={cellSize} wallHeight={wallHeight} celebrate={celebrate} />
    </group>
  );
}
