import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
// PLACEHOLDER creature. A teammate is building the real <Creature>; when it lands,
// swap this component out and feed it the same candidate params. The game loop and
// the surrounding choreography (in ArenaScene) stay unchanged.
export function Combatant({ visual, outcome }) {
    const coreMat = useRef(null);
    const orbitGroup = useRef(null);
    const color = useMemo(() => new THREE.Color(visual.color), [visual.color]);
    const orbiterPos = useMemo(() => visual.orbiters.map((o) => new THREE.Vector3(Math.cos(o.angle) * o.radius, Math.sin(o.angle) * o.radius * 0.6, Math.sin(o.angle * 1.3) * o.radius * 0.6)), [visual.orbiters]);
    useFrame((state, dt) => {
        const t = state.clock.elapsedTime;
        if (orbitGroup.current) {
            orbitGroup.current.rotation.y = t * 0.4;
            orbitGroup.current.rotation.x = Math.sin(t * 0.3) * 0.2;
        }
        if (coreMat.current) {
            let target = visual.glow;
            if (outcome === "win")
                target = visual.glow * 2.2;
            else if (outcome === "lose")
                target = visual.glow * 0.2;
            else if (outcome === "fighting")
                target = visual.glow * (1.2 + Math.sin(t * 8) * 0.25);
            coreMat.current.emissiveIntensity = THREE.MathUtils.damp(coreMat.current.emissiveIntensity, target, 4, dt);
        }
    });
    return (_jsxs("group", { children: [_jsxs("mesh", { children: [_jsx("icosahedronGeometry", { args: [visual.coreScale, 1] }), _jsx("meshStandardMaterial", { ref: coreMat, color: color, emissive: color, emissiveIntensity: visual.glow, roughness: 0.35, metalness: 0.1, flatShading: true })] }), _jsx("group", { ref: orbitGroup, children: orbiterPos.map((p, i) => (_jsxs("mesh", { position: p, children: [_jsx("sphereGeometry", { args: [visual.orbiters[i].size, 12, 12] }), _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: 1.4, roughness: 0.4 })] }, i))) })] }));
}
