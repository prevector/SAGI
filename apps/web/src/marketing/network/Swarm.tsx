// 3D swarm canvas for the marketing "SAGI network" section — the network as a
// living graphic. Ported from the SDK demo (SDK/web/src/components/Swarm.tsx) with
// two additions for this context:
//   • `active` — when false (section offscreen / reduced motion) the render loop is
//     parked (`frameloop="never"`) so the homepage isn't taxed by an idle canvas.
//   • `humanPulseIds` — nodes that should flare ORANGE and large, marking a real
//     human contribution distinctly from the quiet teal ambient pulses.

import { useEffect, useRef, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import type { NetworkNode } from "./swarmClient";

const TEAL = "#17C4C4";
const ORANGE = "#F0783D";
const PAPER = "#FAF8F0";
const BG = "#041414";

const noise3D = createNoise3D();
const ORANGE_COLOR = new THREE.Color(ORANGE);

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
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const isCore = node.id === "core";
  const baseColor = isCore ? PAPER : node.type === "passive" ? TEAL : ORANGE;
  const baseColorObj = useRef(new THREE.Color(baseColor));
  const baseRadius = isCore ? 0.45 : node.type === "passive" ? 0.12 : 0.09;
  const baseIntensity = isCore ? 3.5 : 1.6;
  const pulseRef = useRef(0); // teal/ambient brightness flare
  const humanRef = useRef(0); // orange human burst — bigger, slower decay

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
    // During a human burst the node turns hot orange and swells dramatically.
    mat.emissive.copy(human > 0.01 ? ORANGE_COLOR : baseColorObj.current);
    mat.color.copy(human > 0.01 ? ORANGE_COLOR : baseColorObj.current);
    mat.emissiveIntensity = baseIntensity + pulseRef.current * 4 + human * 9;
    mesh.scale.setScalar(1 + pulseRef.current * 1.5 + human * 3.5);
  });

  return (
    <mesh ref={meshRef} position={isCore ? [0, 0, 0] : [node.x, node.y, node.z]}>
      <sphereGeometry args={[baseRadius, isCore ? 20 : 10, isCore ? 16 : 8]} />
      <meshStandardMaterial
        ref={matRef}
        color={baseColor}
        emissive={new THREE.Color(baseColor)}
        emissiveIntensity={baseIntensity}
        roughness={0.3}
        metalness={0.1}
      />
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
          color={node.type === "passive" ? TEAL : ORANGE}
          lineWidth={0.4}
          transparent
          opacity={0.12}
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
      <ambientLight intensity={0.15} color={TEAL} />
      <pointLight position={[0, 0, 0]} intensity={4} color={PAPER} distance={30} decay={2} />
      <directionalLight position={[10, 15, 10]} intensity={0.4} color={PAPER} />
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
        enableDamping
        dampingFactor={0.05}
        minDistance={8}
        maxDistance={40}
        autoRotate={active}
        autoRotateSpeed={0.25}
      />
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={1.2} luminanceThreshold={1.0} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.3} darkness={0.9} />
      </EffectComposer>
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
