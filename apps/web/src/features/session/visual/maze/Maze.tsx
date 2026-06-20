// Renders the maze: instanced walls (deduped), a matte floor, and start/exit
// markers. Walls/floor are matte near-black so only the hero elements glow
// under Bloom. Markers carry NON-COLOUR cues per the colorblind rule
// (PLAN-3D.md §7): start = teal ring; exit = orange ring + a flag shape.

import { useMemo, useRef } from "react";
import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { DIR, type Grid, cellAt, worldPos } from "./generate";
import { PALETTE, glow } from "../palette";

const WALL_THICKNESS = 0.12;

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
      // West wall for every cell => all internal vertical walls + left boundary.
      if (cell.walls[DIR.W]) {
        walls.push({ key: `w-${x}-${y}`, pos: [wx - cellSize / 2, yMid, wz], horizontal: false });
      }
      // North wall for every cell => all internal horizontal walls + top boundary.
      if (cell.walls[DIR.N]) {
        walls.push({ key: `n-${x}-${y}`, pos: [wx, yMid, wz - cellSize / 2], horizontal: true });
      }
      // East/South only on the far boundary (their twins are covered above).
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
}

/** Exit marker (orange ring + flag) with an optional success pulse. */
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
        <ringGeometry args={[cellSize * 0.3, cellSize * 0.42, 32]} />
        <meshStandardMaterial color={PALETTE.orange} emissive={PALETTE.orange} emissiveIntensity={glow(1.5)} />
      </mesh>
      <mesh position={[0, wallHeight * 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, wallHeight * 1.8, 8]} />
        <meshStandardMaterial color={PALETTE.paper} roughness={0.6} />
      </mesh>
      <mesh position={[0.18, wallHeight * 1.55, 0]}>
        <coneGeometry args={[0.18, 0.36, 3]} />
        <meshStandardMaterial color={PALETTE.orange} emissive={PALETTE.orange} emissiveIntensity={glow(1.4)} />
      </mesh>
    </group>
  );
}

export function Maze({ grid, cellSize, wallHeight, celebrate = false }: MazeProps) {
  const walls = useMemo(
    () => buildWalls(grid, cellSize, wallHeight),
    [grid, cellSize, wallHeight]
  );
  const vertical = walls.filter((w) => !w.horizontal);
  const horizontal = walls.filter((w) => w.horizontal);

  const floorW = grid.cols * cellSize;
  const floorH = grid.rows * cellSize;

  const [sx, sz] = worldPos(grid, grid.start[0], grid.start[1], cellSize);
  const [ex, ez] = worldPos(grid, grid.exit[0], grid.exit[1], cellSize);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[floorW + cellSize, floorH + cellSize]} />
        <meshStandardMaterial color={PALETTE.surface} roughness={1} metalness={0} />
      </mesh>

      {/* Vertical walls (run along z). Faint teal emissive (below the Bloom
          threshold) lifts them off the near-black stage so the maze reads,
          while the hero elements still own the actual glow. */}
      <Instances limit={vertical.length || 1} castShadow>
        <boxGeometry args={[WALL_THICKNESS, wallHeight, cellSize]} />
        <meshStandardMaterial
          color={PALETTE.surface2}
          emissive={PALETTE.tealDeep}
          emissiveIntensity={0.18}
          roughness={0.9}
          metalness={0.05}
        />
        {vertical.map((w) => (
          <Instance key={w.key} position={w.pos} />
        ))}
      </Instances>

      {/* Horizontal walls (run along x) */}
      <Instances limit={horizontal.length || 1} castShadow>
        <boxGeometry args={[cellSize, wallHeight, WALL_THICKNESS]} />
        <meshStandardMaterial
          color={PALETTE.surface2}
          emissive={PALETTE.tealDeep}
          emissiveIntensity={0.18}
          roughness={0.9}
          metalness={0.05}
        />
        {horizontal.map((w) => (
          <Instance key={w.key} position={w.pos} />
        ))}
      </Instances>

      {/* Start marker — teal ring (intelligence axis). */}
      <mesh position={[sx, 0.02, sz]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[cellSize * 0.28, cellSize * 0.36, 32]} />
        <meshStandardMaterial
          color={PALETTE.teal}
          emissive={PALETTE.teal}
          emissiveIntensity={glow(1.3)}
        />
      </mesh>

      {/* Exit marker — orange ring + flag SHAPE (colorblind cue, not colour alone). */}
      <Exit pos={[ex, 0, ez]} cellSize={cellSize} wallHeight={wallHeight} celebrate={celebrate} />
    </group>
  );
}
