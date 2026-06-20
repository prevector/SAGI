import { Canvas } from "@react-three/fiber";
import { ArenaScene } from "./ArenaScene";
import type { Phase, Visuals } from "./useGameSession";

export function Arena({ visuals, phase, winner }: {
  visuals: Visuals | null;
  phase: Phase;
  winner: "a" | "b" | null;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.4, 7], fov: 38 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={({ gl }) => gl.setClearColor("#041414")}
    >
      {visuals && <ArenaScene visuals={visuals} phase={phase} winner={winner} />}
    </Canvas>
  );
}
