import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Vector3
} from "three";
import type { NetworkNode } from "../../lib/types";
import styles from "./GeneTerminal.module.css";

interface NetworkGraphViewportProps {
  users: NetworkNode[];
  currentUser: string | null;
}

interface NodeLayout {
  id: string;
  user: NetworkNode;
  position: Vector3;
  color: string;
  isSelf: boolean;
}

interface HoverLabel {
  text: string;
  x: number;
  y: number;
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colorForNode(node: NetworkNode, isSelf: boolean): string {
  if (!node.online) {
    return isSelf ? "#7f857d" : "#90958c";
  }
  if (isSelf) {
    return "#6da459";
  }
  return "#7ba76b";
}

function fibonacciSphere(count: number, radius: number): Vector3[] {
  if (count === 0) return [];
  if (count === 1) return [new Vector3(0, 0, 0)];

  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(1, count - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * index;
    return new Vector3(Math.cos(theta) * ring * radius, y * radius * 0.48, Math.sin(theta) * ring * radius);
  });
}

function buildLayout(users: NetworkNode[], currentUser: string | null): NodeLayout[] {
  const positions = fibonacciSphere(users.length, 2.8);
  return users.map((user, index) => {
    const isSelf = user.username === currentUser;
    return {
      id: user.id,
      user,
      position: positions[index] ?? new Vector3(0, 0, 0),
      color: colorForNode(user, isSelf),
      isSelf
    };
  });
}

function buildNearestNeighborPairs(nodes: NodeLayout[], count: number): Array<[NodeLayout, NodeLayout]> {
  const seen = new Set<string>();
  const pairs: Array<[NodeLayout, NodeLayout]> = [];

  for (let i = 0; i < nodes.length; i += 1) {
    const distances = nodes
      .map((other, j) => ({ other, j, d: i === j ? Number.POSITIVE_INFINITY : nodes[i].position.distanceTo(other.position) }))
      .sort((left, right) => left.d - right.d)
      .slice(0, count);

    for (const { other, j } of distances) {
      const key = i < j ? `${i}:${j}` : `${j}:${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([nodes[i], other]);
    }
  }

  return pairs;
}

function MeshLinks({ nodes }: { nodes: NodeLayout[] }) {
  const linesRef = useRef<LineSegments>(null);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const pairs = buildNearestNeighborPairs(nodes, Math.min(3, Math.max(1, nodes.length - 1)));
    for (const [a, b] of pairs) {
      positions.push(a.position.x, a.position.y, a.position.z, b.position.x, b.position.y, b.position.z);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    return geo;
  }, [nodes]);

  useFrame(({ clock }) => {
    const material = linesRef.current?.material;
    if (!(material instanceof LineBasicMaterial)) return;
    material.opacity = 0.12 + Math.sin(clock.elapsedTime * 1.2) * 0.035;
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial color="#7c8f9d" transparent opacity={0.14} blending={AdditiveBlending} />
    </lineSegments>
  );
}

function MeshCloud({
  nodes,
  onHover
}: {
  nodes: NodeLayout[];
  onHover: (value: HoverLabel | null) => void;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.elapsedTime * 0.08;
  });

  return (
    <group ref={groupRef}>
      <MeshLinks nodes={nodes} />
      {nodes.map((layout) => (
        <PeerNode key={layout.id} layout={layout} onHover={onHover} />
      ))}
    </group>
  );
}

function PeerNode({
  layout,
  onHover
}: {
  layout: NodeLayout;
  onHover: (value: HoverLabel | null) => void;
}) {
  const groupRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);
  const scale = layout.isSelf ? 1.2 : 1;

  function showLabel(event: any) {
    event.stopPropagation();
    onHover({
      text: layout.isSelf ? `${layout.user.username} you` : layout.user.username,
      x: event.nativeEvent.offsetX + 8,
      y: event.nativeEvent.offsetY - 10
    });
  }

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const phase = hashSeed(layout.id) * 0.001;
    groupRef.current.position.y = layout.position.y + Math.sin(clock.elapsedTime * 1.4 + phase) * 0.035;
    if (glowRef.current?.material instanceof MeshBasicMaterial) {
      glowRef.current.material.opacity = layout.isSelf ? 0.28 + Math.sin(clock.elapsedTime * 1.8 + phase) * 0.08 : 0.1;
    }
  });

  return (
    <group ref={groupRef} position={layout.position}>
      <mesh
        scale={scale}
        onPointerOver={showLabel}
        onPointerMove={showLabel}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(null);
        }}
      >
        <sphereGeometry args={[0.062, 14, 14]} />
        <meshBasicMaterial color={layout.color} />
      </mesh>
      <mesh ref={glowRef} scale={scale * (layout.isSelf ? 2.6 : 1.8)}>
        <sphereGeometry args={[0.062, 12, 12]} />
        <meshBasicMaterial color={layout.color} transparent opacity={layout.isSelf ? 0.28 : 0.1} blending={AdditiveBlending} />
      </mesh>
      <mesh
        scale={scale * 3}
        onPointerOver={showLabel}
        onPointerMove={showLabel}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(null);
        }}
      >
        <sphereGeometry args={[0.062, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function NetworkScene({
  users,
  currentUser,
  onHover
}: NetworkGraphViewportProps & {
  onHover: (value: HoverLabel | null) => void;
}) {
  const nodes = useMemo(() => buildLayout(users, currentUser), [users, currentUser]);

  return (
    <>
      <color attach="background" args={["#e9e2d6"]} />
      <fog attach="fog" args={["#e9e2d6", 6, 14]} />
      <ambientLight intensity={0.6} color="#f6eee2" />
      <pointLight position={[0, 0, 4]} intensity={0.28} color="#c8d8e3" />
      {nodes.length > 0 ? <MeshCloud nodes={nodes} onHover={onHover} /> : null}
    </>
  );
}

export function NetworkGraphViewport({ users, currentUser }: NetworkGraphViewportProps) {
  const [hoveredLabel, setHoveredLabel] = useState<HoverLabel | null>(null);

  return (
    <div className={styles.networkCanvas}>
      <Canvas
        camera={{ position: [0, 0.4, 5.4], fov: 34 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => setHoveredLabel(null)}
      >
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          autoRotate={users.length > 1}
          autoRotateSpeed={0.18}
          minDistance={2.8}
          maxDistance={8}
          target={[0, 0, 0]}
        />
        <NetworkScene users={users} currentUser={currentUser} onHover={setHoveredLabel} />
      </Canvas>
      {hoveredLabel ? (
        <div
          className={`${styles.networkNodeLabel} ${styles.networkNodeLabelVisible}`}
          style={{ left: hoveredLabel.x, top: hoveredLabel.y }}
        >
          {hoveredLabel.text}
        </div>
      ) : null}
      {users.length === 0 ? (
        <div className={styles.networkEmpty}>
          <strong>No known users yet</strong>
          <span>Everyone who has logged in will appear here. Online users glow green.</span>
        </div>
      ) : null}
    </div>
  );
}
