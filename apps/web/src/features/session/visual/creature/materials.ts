// Creature materials. The body uses MeshPhysicalMaterial (clearcoat + sheen +
// a touch of iridescence on the high tier) so the "intelligence" hero reads as
// a polished, living surface. Each body segment gets its OWN material instance
// so the animator can run a subtle emissive energy wave head→tail (per-segment
// emissiveIntensity), brightening with fitness. Everything degrades to a plain
// standard material on the low tier. Emissive is kept gentle so the creature
// reads as a solid, lit teal form on the white studio stage.

import * as THREE from "three";
import type { QualitySettings } from "../config";
import type { SurfaceStyle } from "./genome";

export interface CreatureMaterials {
  /** One per body segment + head (last), so each can pulse independently. */
  body: THREE.MeshStandardMaterial[];
  limb: THREE.MeshStandardMaterial;
  sclera: THREE.MeshStandardMaterial;
  iris: THREE.MeshStandardMaterial;
  pupil: THREE.MeshStandardMaterial;
  dispose(): void;
}

function makeBody(
  color: string,
  surface: SurfaceStyle,
  quality: QualitySettings
): THREE.MeshStandardMaterial {
  const common = {
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.3, // gentle — the animator drives a subtle pulse
    roughness: 0.32,
    metalness: 0.18,
    flatShading: surface === "faceted",
    wireframe: surface === "wire",
  };
  if (quality.tier === "low") {
    return new THREE.MeshStandardMaterial(common);
  }
  const mat = new THREE.MeshPhysicalMaterial(common);
  mat.clearcoat = 0.7;
  mat.clearcoatRoughness = 0.35;
  mat.sheen = 0.6;
  mat.sheenColor = new THREE.Color(color);
  if (quality.tier === "high") {
    mat.iridescence = 0.35;
    mat.iridescenceIOR = 1.3;
  }
  return mat;
}

export function createCreatureMaterials(
  color: string,
  surface: SurfaceStyle,
  segmentCount: number,
  quality: QualitySettings
): CreatureMaterials {
  const body = Array.from({ length: segmentCount + 1 }, () => makeBody(color, surface, quality));

  const limb = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.18,
    roughness: 0.5,
    metalness: 0.15,
    flatShading: surface === "faceted",
    wireframe: surface === "wire",
  });

  const sclera = new THREE.MeshStandardMaterial({
    color: "#FAFCFC",
    roughness: 0.25,
    metalness: 0,
  });
  const iris = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.5,
    roughness: 0.15,
  });
  const pupil = new THREE.MeshStandardMaterial({ color: "#0A1A1A", roughness: 0.3 });

  return {
    body,
    limb,
    sclera,
    iris,
    pupil,
    dispose() {
      body.forEach((m) => m.dispose());
      limb.dispose();
      sclera.dispose();
      iris.dispose();
      pupil.dispose();
    },
  };
}
