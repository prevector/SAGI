// SAGI Swarm Dashboard — fullscreen 3D network visualization.
// Shows connected nodes as a glowing 3D cloud with live stats.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import { getNodes, getStats } from "../sdk/index";
import type { NetworkNode, Stats } from "../sdk/index";

const TEAL = "#17C4C4";
const ORANGE = "#F0783D";
const PAPER = "#FAF8F0";
const BG = "#041414";

const noise3D = createNoise3D();

// ─── Individual node sphere ───────────────────────────────────────────────────

function NodeDot({ node, index, isPulsing }: { node: NetworkNode; index: number; isPulsing: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const isCore = node.id === "core";
  const color = node.type === "passive" ? TEAL : ORANGE;
  const baseRadius = isCore ? 0.45 : node.type === "passive" ? 0.12 : 0.09;
  const baseIntensity = isCore ? 3.5 : 1.6;
  const pulseRef = useRef(0);

  useEffect(() => { if (isPulsing) pulseRef.current = 1; }, [isPulsing]);

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
    mat.emissiveIntensity = baseIntensity + pulseRef.current * 4;
    mesh.scale.setScalar(1 + pulseRef.current * 1.5);
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

// ─── Spoke lines node → core ─────────────────────────────────────────────────

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

// ─── Three.js scene (inside Canvas) ──────────────────────────────────────────

function SwarmScene({ nodes, pulsingIds }: { nodes: NetworkNode[]; pulsingIds: Set<string> }) {
  return (
    <>
      <ambientLight intensity={0.15} color={TEAL} />
      <pointLight position={[0, 0, 0]} intensity={4} color={PAPER} distance={30} decay={2} />
      <directionalLight position={[10, 15, 10]} intensity={0.4} color={PAPER} />
      <Spokes nodes={nodes} />
      {nodes.map((node, i) => (
        <NodeDot key={node.id} node={node} index={i} isPulsing={pulsingIds.has(node.id)} />
      ))}
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.05} minDistance={8} maxDistance={40} autoRotate autoRotateSpeed={0.25} />
      <EffectComposer enableNormalPass={false}>
        <Bloom intensity={1.2} luminanceThreshold={1.0} luminanceSmoothing={0.25} mipmapBlur />
        <Vignette eskil={false} offset={0.3} darkness={0.9} />
      </EffectComposer>
    </>
  );
}

// ─── HUD overlay ─────────────────────────────────────────────────────────────

function Hud({ stats, nodeCount }: { stats: Stats; nodeCount: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: "var(--font-mono, monospace)", color: PAPER }}>
      {/* Top */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(180deg,rgba(4,20,20,0.85) 0%,transparent 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.14em", fontFamily: "var(--font-sans, sans-serif)" }}>SAGI</span>
          <span style={{ fontSize: 11, letterSpacing: "0.2em", color: TEAL, textTransform: "uppercase" }}>SWARM</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, letterSpacing: "0.16em", color: "#6E8585", border: "1px solid rgba(23,196,196,0.2)", borderRadius: 999, padding: "3px 9px" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: TEAL, boxShadow: `0 0 6px ${TEAL}`, display: "inline-block", animation: "sagi-pulse 2s ease-out infinite" }} />
            LIVE
          </span>
        </div>
        <div style={{ fontSize: 13, letterSpacing: "0.08em", color: "#9FB6B6" }}>
          <span style={{ color: PAPER, fontWeight: 600 }}>{nodeCount}</span> nodes
        </div>
      </div>

      {/* Bottom */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 28px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", background: "linear-gradient(0deg,rgba(4,20,20,0.92) 0%,transparent 100%)" }}>
        <div style={{ display: "flex", gap: 40 }}>
          <Stat label="devices" value={stats.players} accent={TEAL} />
          <Stat label="scouts" value={stats.votes} accent={TEAL} />
          <Stat label="tokens awarded" value={stats.tokens_awarded} accent={ORANGE} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <LegendDot color={TEAL} label="passive node" />
          <LegendDot color={ORANGE} label="active node" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6E8585", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: "0.1em", color: "#9FB6B6" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, display: "inline-block" }} />
      {label}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SwarmPage() {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [stats, setStats] = useState<Stats>({ players: 0, votes: 0, tokens_awarded: 0 });
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const lastTokens = useRef(0);

  useEffect(() => {
    getNodes().then(setNodes).catch(console.error);
    const id = setInterval(() => getNodes().then(setNodes).catch(console.error), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = async () => {
      try {
        const s = await getStats();
        setStats(s);
        const delta = s.tokens_awarded - lastTokens.current;
        if (delta > 0 && nodes.length > 0) {
          const actives = nodes.filter((n) => n.type === "active" && n.id !== "core");
          if (actives.length > 0) {
            const target = actives[Math.floor(Math.random() * actives.length)];
            setPulsingIds((prev) => new Set([...prev, target.id]));
            setTimeout(() => setPulsingIds((prev) => { const next = new Set(prev); next.delete(target.id); return next; }), 600);
          }
        }
        lastTokens.current = s.tokens_awarded;
      } catch { /* network not ready yet */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [nodes]);

  return (
    <div style={{ position: "fixed", inset: 0, background: BG }}>
      <style>{`@keyframes sagi-pulse { 0%{box-shadow:0 0 0 0 rgba(23,196,196,0.6)} 70%{box-shadow:0 0 0 8px rgba(23,196,196,0)} 100%{box-shadow:0 0 0 0 rgba(23,196,196,0)} }`}</style>
      <Canvas frameloop="always" dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={{ position: [14, 8, 18], fov: 50, near: 0.1, far: 200 }} onCreated={({ gl }) => gl.setClearColor(new THREE.Color(BG), 1)}>
        <SwarmScene nodes={nodes} pulsingIds={pulsingIds} />
      </Canvas>
      <Hud stats={stats} nodeCount={nodes.filter((n) => n.id !== "core").length} />
    </div>
  );
}
