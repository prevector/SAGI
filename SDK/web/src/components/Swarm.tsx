// Reusable 3D swarm canvas — the network as a living graphic.
// Pure visual: data (nodes + which to pulse) is passed in, so the same scene
// can be a fullscreen view or an embedded dashboard backdrop.

import { useEffect, useRef, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import type { NetworkNode } from "../sdk/index";

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
  const color = node.type === "passive" ? TEAL : ORANGE;
  const baseColor = useRef(new THREE.Color(isCore ? PAPER : color));
  const baseRadius = isCore ? 0.45 : node.type === "passive" ? 0.12 : 0.09;
  const baseIntensity = isCore ? 3.5 : 1.6;
  const pulseRef = useRef(0);
  const humanRef = useRef(0);

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
    // The human burst is bigger, brighter and decays slower so it really lands.
    if (humanRef.current > 0) humanRef.current = Math.max(0, humanRef.current - 0.018);

    const h = humanRef.current;
    mat.emissiveIntensity = baseIntensity + pulseRef.current * 4 + h * 9;
    mesh.scale.setScalar(1 + pulseRef.current * 1.5 + h * 3.5);
    // Bleed toward orange while a human signal is firing.
    mat.color.copy(baseColor.current).lerp(ORANGE_COLOR, h);
    mat.emissive.copy(baseColor.current).lerp(ORANGE_COLOR, h);
  });

  return (
    <mesh ref={meshRef} position={isCore ? [0, 0, 0] : [node.x, node.y, node.z]}>
      <sphereGeometry args={[baseRadius, isCore ? 20 : 10, isCore ? 16 : 8]} />
      <meshStandardMaterial
        ref={matRef}
        color={isCore ? PAPER : color}
        emissive={new THREE.Color(isCore ? PAPER : color)}
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
}: {
  nodes: NetworkNode[];
  pulsingIds: Set<string>;
  humanPulseIds: Set<string>;
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
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.05} minDistance={8} maxDistance={40} autoRotate autoRotateSpeed={0.25} />
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={1.2} luminanceThreshold={1.0} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.3} darkness={0.9} />
      </EffectComposer>
    </>
  );
}

const EMPTY: Set<string> = new Set();

export function Swarm({
  nodes,
  pulsingIds,
  humanPulseIds = EMPTY,
  style,
}: {
  nodes: NetworkNode[];
  pulsingIds: Set<string>;
  humanPulseIds?: Set<string>;
  style?: CSSProperties;
}) {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [14, 8, 18], fov: 50, near: 0.1, far: 200 }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(BG), 1)}
      style={style}
    >
      <SwarmScene nodes={nodes} pulsingIds={pulsingIds} humanPulseIds={humanPulseIds} />
    </Canvas>
  );
}
