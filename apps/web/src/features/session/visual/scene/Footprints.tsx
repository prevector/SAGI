// Fading footprints the champion stamps as it walks. A fixed pool of flat teal
// discs (one InstancedMesh, recycled as a ring buffer) is updated imperatively
// from the creature's live ground position (`posRef`, written by CreatureRunner)
// — no per-frame React churn. Each stamp shrinks and clears as it ages, leaving
// a readable breadcrumb trail behind the creature on the white floor.

import { type RefObject, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface FootprintsProps {
  posRef: RefObject<THREE.Vector3>;
  color: string;
  cellSize: number;
}

const N = 24; // pool size (oldest recycled)
const MAX_AGE = 2.4; // seconds a print lingers
const INTERVAL = 0.16; // min seconds between stamps
const MIN_DIST = 0.13; // min travel between stamps (world units)

export function Footprints({ posRef, color, cellSize }: FootprintsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new THREE.CircleGeometry(1, 16), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, depthWrite: false }),
    [color]
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseR = 0.16 * cellSize;

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat]
  );

  const state = useRef({
    prints: Array.from({ length: N }, () => ({ x: 0, z: 0, age: Infinity })),
    cursor: 0,
    sinceDrop: 0,
    lastX: 0,
    lastZ: 0,
  });

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const s = state.current;
    s.sinceDrop += dt;

    const p = posRef.current;
    if (p) {
      const dx = p.x - s.lastX;
      const dz = p.z - s.lastZ;
      if (s.sinceDrop >= INTERVAL && dx * dx + dz * dz >= MIN_DIST * MIN_DIST) {
        const slot = s.prints[s.cursor];
        slot.x = p.x;
        slot.z = p.z;
        slot.age = 0;
        s.cursor = (s.cursor + 1) % N;
        s.sinceDrop = 0;
        s.lastX = p.x;
        s.lastZ = p.z;
      }
    }

    for (let i = 0; i < N; i++) {
      const pr = s.prints[i];
      pr.age += dt;
      const t = pr.age / MAX_AGE;
      if (t >= 1) {
        dummy.scale.setScalar(0);
      } else {
        // Grow in fast, then shrink away — reads as a soft stamp.
        const grow = Math.min(1, pr.age / 0.12);
        const r = baseR * grow * (1 - t * 0.85);
        dummy.position.set(pr.x, 0.025, pr.z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.setScalar(Math.max(0, r));
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, N]} frustumCulled={false} />;
}
