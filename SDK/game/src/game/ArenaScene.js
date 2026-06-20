import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { Combatant } from "./Combatant";
const REST_X = 2.2;
// Owns the fight choreography. Because the winner isn't known until settlement
// returns, the FIGHTING loop is symmetric and reveals nothing — it just covers the
// 3-5s wait. Once `winner` arrives, REVEAL resolves deterministically.
export function ArenaScene({ visuals, phase, winner }) {
    const groupA = useRef(null);
    const groupB = useRef(null);
    const lightA = useRef(null);
    const lightB = useRef(null);
    useFrame((state, dt) => {
        const t = state.clock.elapsedTime;
        const gA = groupA.current;
        const gB = groupB.current;
        if (!gA || !gB)
            return;
        let xA = -REST_X, xB = REST_X;
        let yA = 0, yB = 0;
        let rotZA = 0, rotZB = 0;
        let scaleA = 1, scaleB = 1;
        let liA = 0, liB = 0;
        if (phase === "fighting") {
            const lunge = (Math.sin(t * 3) * 0.5 + 0.5) * 1.5; // 0..1.5 toward center
            xA = -REST_X + lunge;
            xB = REST_X - lunge;
            const clash = Math.max(0, Math.sin(t * 3)) ** 6; // sharp spike at full lunge
            const shake = clash * 0.12 * Math.sin(t * 40);
            yA = shake;
            yB = -shake;
            liA = 0.3;
            liB = 0.3;
        }
        else if (phase === "reveal" && winner) {
            const winA = winner === "a";
            xA = winA ? -1.4 : -REST_X - 0.5;
            xB = winA ? REST_X + 0.5 : 1.4;
            yA = winA ? 0.35 : -0.25;
            yB = winA ? -0.25 : 0.35;
            rotZA = winA ? 0 : 0.5;
            rotZB = winA ? -0.5 : 0;
            scaleA = winA ? 1.25 : 0.7;
            scaleB = winA ? 0.7 : 1.25;
            liA = winA ? 2.5 : 0;
            liB = winA ? 0 : 2.5;
        }
        else {
            // idle / betting / loading
            yA = Math.sin(t * 1.5) * 0.06;
            yB = Math.sin(t * 1.5 + 1) * 0.06;
        }
        const L = 4;
        gA.position.x = THREE.MathUtils.damp(gA.position.x, xA, L, dt);
        gA.position.y = THREE.MathUtils.damp(gA.position.y, yA, L, dt);
        gA.rotation.z = THREE.MathUtils.damp(gA.rotation.z, rotZA, L, dt);
        gA.scale.setScalar(THREE.MathUtils.damp(gA.scale.x, scaleA, L, dt));
        gB.position.x = THREE.MathUtils.damp(gB.position.x, xB, L, dt);
        gB.position.y = THREE.MathUtils.damp(gB.position.y, yB, L, dt);
        gB.rotation.z = THREE.MathUtils.damp(gB.rotation.z, rotZB, L, dt);
        gB.scale.setScalar(THREE.MathUtils.damp(gB.scale.x, scaleB, L, dt));
        if (lightA.current)
            lightA.current.intensity = THREE.MathUtils.damp(lightA.current.intensity, liA, L, dt);
        if (lightB.current)
            lightB.current.intensity = THREE.MathUtils.damp(lightB.current.intensity, liB, L, dt);
    });
    const outcomeA = phase === "reveal" && winner ? (winner === "a" ? "win" : "lose") : phase === "fighting" ? "fighting" : "idle";
    const outcomeB = phase === "reveal" && winner ? (winner === "b" ? "win" : "lose") : phase === "fighting" ? "fighting" : "idle";
    return (_jsxs(_Fragment, { children: [_jsx("ambientLight", { intensity: 0.3, color: "#17c4c4" }), _jsx("directionalLight", { position: [0, 6, 5], intensity: 0.6, color: "#faf8f0" }), _jsx("pointLight", { ref: lightA, position: [-2.2, 1, 2], color: "#17c4c4", intensity: 0, distance: 14 }), _jsx("pointLight", { ref: lightB, position: [2.2, 1, 2], color: "#f0783d", intensity: 0, distance: 14 }), _jsx("group", { ref: groupA, position: [-REST_X, 0, 0], children: _jsx(Combatant, { visual: visuals.a, outcome: outcomeA }) }), _jsx("group", { ref: groupB, position: [REST_X, 0, 0], children: _jsx(Combatant, { visual: visuals.b, outcome: outcomeB }) }), _jsxs(EffectComposer, { children: [_jsx(Bloom, { luminanceThreshold: 1.0, mipmapBlur: true, intensity: 0.9 }), _jsx(Vignette, { offset: 0.2, darkness: 0.85 })] })] }));
}
