// Renders a maze cell path as a 3D line. The solved route uses a solid bright
// line; exploration attempts use dim dashed lines — a NON-COLOUR cue (line
// style + brightness) so the meaning survives colour-blindness (PLAN-3D.md §7).

import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { type Grid, worldPos } from "../maze/generate";

export type CellPath = ReadonlyArray<readonly [number, number]>;

interface PathLineProps {
  grid: Grid;
  cellSize: number;
  path: CellPath;
  color: string;
  y: number;
  lineWidth?: number;
  dashed?: boolean;
  opacity?: number;
}

export function PathLine({
  grid,
  cellSize,
  path,
  color,
  y,
  lineWidth = 2,
  dashed = false,
  opacity = 1,
}: PathLineProps) {
  const points = useMemo<[number, number, number][]>(() => {
    if (path.length < 2) return [];
    return path.map(([cx, cy]) => {
      const [wx, wz] = worldPos(grid, cx, cy, cellSize);
      return [wx, y, wz];
    });
  }, [grid, cellSize, path, y]);

  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      dashed={dashed}
      dashSize={dashed ? 0.18 : undefined}
      gapSize={dashed ? 0.12 : undefined}
      transparent={opacity < 1}
      opacity={opacity}
    />
  );
}
