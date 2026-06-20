import { jsx as _jsx } from "react/jsx-runtime";
import { Canvas } from "@react-three/fiber";
import { ArenaScene } from "./ArenaScene";
export function Arena({ visuals, phase, winner }) {
    return (_jsx(Canvas, { dpr: [1, 1.5], camera: { position: [0, 1.4, 7], fov: 38 }, gl: { antialias: true, powerPreference: "high-performance" }, style: { position: "absolute", inset: 0 }, onCreated: ({ gl }) => gl.setClearColor("#041414"), children: visuals && _jsx(ArenaScene, { visuals: visuals, phase: phase, winner: winner }) }));
}
