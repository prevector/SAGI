import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CombatantVisual } from "./combatantFromCandidate";

export type Outcome = "idle" | "fighting" | "win" | "lose";

// PLACEHOLDER creature. A teammate is building the real <Creature>; when it lands,
// swap this component out and feed it the same candidate params. The game loop and
// the surrounding choreography stay unchanged.
//
// Warm editorial restyle: flat brand-coloured shapes (meshBasicMaterial, no glow),
// so they read cleanly on the light background. Outcome feedback comes from scale +
// opacity instead of emissive bloom — win swells & solidifies, lose shrinks & fades.
export function Combatant({ visual, outcome }: { visual: CombatantVisual; outcome: Outcome }) {
  const root = useRef<THREE.Group>(null);
  const coreMat = useRef<THREE.MeshBasicMaterial>(null);
  const orbitGroup = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(visual.color), [visual.color]);

  const orbiterPos = useMemo(
    () =>
      visual.orbiters.map((o) =>
        new THREE.Vector3(
          Math.cos(o.angle) * o.radius,
          Math.sin(o.angle) * o.radius * 0.6,
          Math.sin(o.angle * 1.3) * o.radius * 0.6,
        ),
      ),
    [visual.orbiters],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (orbitGroup.current) {
      orbitGroup.current.rotation.y = t * 0.4;
      orbitGroup.current.rotation.x = Math.sin(t * 0.3) * 0.2;
    }
    // Outcome feedback without glow: ease scale + core opacity toward a target.
    let scale = 1;
    let opacity = 1;
    if (outcome === "win") scale = 1.12;
    else if (outcome === "lose") { scale = 0.9; opacity = 0.45; }
    else if (outcome === "fighting") scale = 1 + Math.sin(t * 8) * 0.04;
    if (root.current) {
      const s = THREE.MathUtils.damp(root.current.scale.x, scale, 6, dt);
      root.current.scale.setScalar(s);
    }
    if (coreMat.current) {
      coreMat.current.opacity = THREE.MathUtils.damp(coreMat.current.opacity, opacity, 6, dt);
    }
  });

  return (
    <group ref={root}>
      <mesh>
        <icosahedronGeometry args={[visual.coreScale, 1]} />
        <meshBasicMaterial ref={coreMat} color={color} transparent toneMapped={false} />
      </mesh>
      <group ref={orbitGroup}>
        {orbiterPos.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[visual.orbiters[i].size, 12, 12]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
