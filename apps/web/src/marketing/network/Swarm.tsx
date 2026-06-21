// 3D swarm canvas for the marketing "SAGI network" section — the network as a
// living graphic, in the warm editorial brand. Brand-coloured matte nodes drift
// on a warm cream backdrop, connected by thin brown spokes. No bloom/vignette:
// glow reads as washed-out haze on a light background, so we render crisp flat
// dots instead (also cheaper — no postprocessing pass).
//   • `active` — when false (offscreen / reduced motion) the render loop is parked
//     (`frameloop="never"`) so an idle canvas never taxes the homepage.
//   • `humanPulseIds` — nodes that flare to deep pink and swell, marking a real
//     human contribution distinctly from the quiet ambient pulses.

import { useEffect, useRef, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import type { NetworkNode } from "./swarmClient";

// Warm editorial palette — mirrors tokens.css. Canvas needs literals (CSS vars
// don't apply to materials); keep these in sync with the design tokens.
const BG = "#F5F0EA"; // --brown-50, the warm band
const CORE = "#2E2118"; // --brown-900, the dark network anchor
const BLUE = "#3C7FA8"; // --blue-500, passive (compute) nodes
const PINK = "#E07A97"; // --pink-500, active (signal) nodes
const SPOKE = "#A8886A"; // --brown-300, connections
const HUMAN = "#C04B6E"; // --pink-700, the loud human-signal flare

const noise3D = createNoise3D();
const HUMAN_COLOR = new THREE.Color(HUMAN);

function nodeColor(node: NetworkNode): string {
  if (node.id === "core") return CORE;
  return node.type === "passive" ? BLUE : PINK;
}

function NodeDot({
  node,
  index,
  isPulsing,
  isHumanPulsing,
}: {
  node: NetworkNode;
  index: number;
  isPulsing: boolean;
  isHumanPulsing: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const isCore = node.id === "core";
  const base = nodeColor(node);
  const baseColorObj = useRef(new THREE.Color(base));
  const baseRadius = isCore ? 0.42 : node.type === "passive" ? 0.13 : 0.1;
  const pulseRef = useRef(0); // quiet ambient flare (a small swell)
  const humanRef = useRef(0); // human burst — turns deep pink, swells, slow decay

  useEffect(() => { if (isPulsing) pulseRef.current = 1; }, [isPulsing]);
  useEffect(() => { if (isHumanPulsing) humanRef.current = 1; }, [isHumanPulsing]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    if (!isCore) {
      const t = clock.elapsedTime;
      const amp = 0.28, speed = 0.025;
      mesh.position.set(
        node.x + noise3D(node.x * 0.08 + index * 13.7, node.y * 0.08, t * speed) * amp,
        node.y + noise3D(node.x * 0.08, node.y * 0.08 + index * 7.3, t * speed + 5) * amp,
        node.z + noise3D(node.x * 0.08, node.y * 0.08 + index * 19.1, t * speed + 10) * amp,
      );
    }
    if (pulseRef.current > 0) pulseRef.current = Math.max(0, pulseRef.current - 0.04);
    if (humanRef.current > 0) humanRef.current = Math.max(0, humanRef.current - 0.018);

    const human = humanRef.current;
    mat.color.copy(human > 0.01 ? HUMAN_COLOR : baseColorObj.current);
    mesh.scale.setScalar(1 + pulseRef.current * 1.1 + human * 3.2);
  });

  return (
    <mesh ref={meshRef} position={isCore ? [0, 0, 0] : [node.x, node.y, node.z]}>
      <sphereGeometry args={[baseRadius, isCore ? 24 : 12, isCore ? 18 : 10]} />
      <meshBasicMaterial ref={matRef} color={base} toneMapped={false} />
    </mesh>
  );
}

function Spokes({ nodes }: { nodes: NetworkNode[] }) {
  return (
    <>
      {nodes.filter((n, i) => n.id !== "core" && i % 3 === 0).map((node) => (
        <Line
          key={`spoke-${node.id}`}
          points={[[node.x, node.y, node.z], [0, 0, 0]]}
          color={SPOKE}
          lineWidth={0.5}
          transparent
          opacity={0.22}
        />
      ))}
    </>
  );
}

function SwarmScene({
  nodes,
  pulsingIds,
  humanPulseIds,
  active,
}: {
  nodes: NetworkNode[];
  pulsingIds: Set<string>;
  humanPulseIds: Set<string>;
  active: boolean;
}) {
  return (
    <>
      <Spokes nodes={nodes} />
      {nodes.map((node, i) => (
        <NodeDot
          key={node.id}
          node={node}
          index={i}
          isPulsing={pulsingIds.has(node.id)}
          isHumanPulsing={humanPulseIds.has(node.id)}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.05}
        autoRotate={active}
        autoRotateSpeed={0.25}
      />
    </>
  );
}

export function Swarm({
  nodes,
  pulsingIds,
  humanPulseIds,
  active = true,
  style,
}: {
  nodes: NetworkNode[];
  pulsingIds: Set<string>;
  humanPulseIds: Set<string>;
  /** When false the render loop is parked so an offscreen section costs nothing. */
  active?: boolean;
  style?: CSSProperties;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [14, 8, 18], fov: 50, near: 0.1, far: 200 }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(BG), 1)}
      style={style}
    >
      <SwarmScene nodes={nodes} pulsingIds={pulsingIds} humanPulseIds={humanPulseIds} active={active} />
    </Canvas>
  );
}
