// The R3F <Canvas> stage: dark background, exponential fog, low-key lighting,
// OrbitControls, and the post-processing stack. Owns the performance levers
// (capped DPR, demand frameloop, off-screen pause) from PLAN-3D.md §6.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { FOG_COLOR, PALETTE } from "../palette";
import { VISUAL_CONFIG } from "../config";
import { Effects } from "./Effects";
import type { PerfMeter } from "./usePerf";

interface StageProps {
  children: ReactNode;
  /** "always" while actively animating; "demand" when idle to save battery. */
  frameloop?: "always" | "demand";
  /** Reduced-motion / low-power: drop post FX and pin DPR low. */
  lowPower?: boolean;
  mobile?: boolean;
  /** Optional per-frame perf sampler (dev HUD). */
  perf?: PerfMeter;
}

/** Feeds the FPS sampler once per frame from inside the Canvas. */
function PerfSampler({ perf }: { perf: PerfMeter }) {
  useFrame(() => perf.sample());
  return null;
}

/** Applies scene-level fog once the scene exists. */
function SceneFog() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.FogExp2(new THREE.Color(FOG_COLOR).getHex(), 0.06);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

export function Stage({
  children,
  frameloop = "demand",
  lowPower = false,
  mobile = false,
  perf,
}: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pause rendering when the canvas scrolls off-screen (perf budget).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const dpr = mobile ? VISUAL_CONFIG.perf.dprMobile : VISUAL_CONFIG.perf.dprDesktop;
  // Off-screen → force demand so nothing renders until visible again.
  const effectiveLoop = !visible ? "demand" : frameloop;

  return (
    <div ref={hostRef} style={{ width: "100%", height: "100%" }}>
      <Canvas
        frameloop={effectiveLoop}
        dpr={dpr}
        gl={{ antialias: !mobile, powerPreference: "high-performance" }}
        camera={{ position: [6, 7, 9], fov: 42, near: 0.1, far: 100 }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(PALETTE.bg), 1)}
      >
        <SceneFog />
        <ambientLight intensity={0.25} color={PALETTE.tealPale} />
        <directionalLight position={[5, 10, 6]} intensity={0.7} color={PALETTE.paper} />
        <hemisphereLight args={[PALETTE.tealPale, PALETTE.bgDeep, 0.15]} />

        {children}

        <OrbitControls
          enablePan={false}
          enableDamping
          minDistance={5}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={!lowPower && frameloop === "always"}
          autoRotateSpeed={0.4}
        />
        <AdaptiveDpr pixelated />
        <Effects enabled={!lowPower} />
        {perf ? <PerfSampler perf={perf} /> : null}
      </Canvas>
    </div>
  );
}
