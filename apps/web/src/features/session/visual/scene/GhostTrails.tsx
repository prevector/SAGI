// Faint dashed trails for non-champion attempts — the "other candidates
// exploring" beat. Dim + dashed so they stay quiet behind the champion and the
// solved route, and read as exploration without relying on colour.

import type { Grid } from "../maze/generate";
import { PALETTE } from "../palette";
import { PathLine, type CellPath } from "./PathLine";

interface GhostTrailsProps {
  grid: Grid;
  cellSize: number;
  attempts: ReadonlyArray<CellPath>;
}

export function GhostTrails({ grid, cellSize, attempts }: GhostTrailsProps) {
  return (
    <group>
      {attempts.map((path, i) => (
        <PathLine
          key={i}
          grid={grid}
          cellSize={cellSize}
          path={path}
          color={PALETTE.tealDeep}
          y={0.04}
          lineWidth={1}
          dashed
          opacity={0.22}
        />
      ))}
    </group>
  );
}
