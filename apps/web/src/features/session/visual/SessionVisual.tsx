// SessionVisual — the single component SessionPage lazy-imports. For C1 this
// renders a glowing placeholder mesh to validate the render pipeline (theme,
// bloom, mount/unmount, perf). Later sub-phases replace the placeholder with
// the maze + creature + GA.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { PALETTE, glow } from "./palette";
import { Stage } from "./scene/Stage";
import { usePerf } from "./scene/usePerf";
import { useReducedMotion } from "./scene/useReducedMotion";
import styles from "./SessionVisual.module.css";

export type SessionVisualStatus = "queued" | "running" | "completed" | "failed";

export interface SessionVisualProps {
  /** = session.id. All randomness derives from this. */
  seed: string;
  status: SessionVisualStatus;
  /** 0..1 — phase gate only; the GA drives the actual generations. */
  progress: number;
}

/** Placeholder hero mesh — a slowly turning glowing icosahedron. */
function Placeholder({ animate }: { animate: boolean }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (animate && ref.current) {
      ref.current.rotation.y += dt * 0.4;
      ref.current.rotation.x += dt * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={[0, 1.5, 0]}>
      <icosahedronGeometry args={[1.4, 1]} />
      <meshStandardMaterial
        color={PALETTE.teal}
        emissive={PALETTE.teal}
        emissiveIntensity={glow(1.6)}
        roughness={0.35}
        metalness={0.1}
        flatShading
      />
    </mesh>
  );
}

/** Matte ground plane so the stage reads as a 3D space. */
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={PALETTE.surface} roughness={1} metalness={0} />
    </mesh>
  );
}

export default function SessionVisual({ status, progress }: SessionVisualProps) {
  const reducedMotion = useReducedMotion();
  const perf = usePerf();

  const isDev = import.meta.env.DEV;
  const animate = !reducedMotion && status === "running";
  const frameloop = animate ? "always" : "demand";

  const statusLabel = useMemo(() => {
    switch (status) {
      case "queued":
        return "Idle · awaiting compute";
      case "running":
        return `Evolving · ${Math.round(progress * 100)}%`;
      case "completed":
        return "Solved";
      case "failed":
        return "Reset";
    }
  }, [status, progress]);

  return (
    <div className={styles.root} aria-hidden="true">
      <Stage frameloop={frameloop} lowPower={reducedMotion} perf={perf}>
        <Ground />
        <Placeholder animate={animate} />
      </Stage>

      {/* DOM HUD overlay — inherits Geist from the page (colorblind-safe text). */}
      <div className={styles.hud}>
        <span className={styles.hudStatus}>{statusLabel}</span>
        {isDev ? <span className={styles.hudPerf}>{perf.fps} fps</span> : null}
      </div>
    </div>
  );
}
