/**
 * SHIONAGI rebuild Phase 3 — pier / warehouse / market silhouettes + harbor lights.
 * Procedural boxes only; materials via look.ts SURFACE/ACCENT/harbor helpers.
 */
import * as THREE from 'three';
import { SURFACE, ACCENT, harborMat, harborGlow } from './look.ts';

type BoxFn = (
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: string, glow?: boolean,
) => void;

/** Wet-concrete warehouse with rust steel eaves (chamfered via stepped boxes). */
export function buildWarehouseSilhouette(
  box: BoxFn,
  x: number, y: number, z: number,
  opts?: { w?: number; d?: number; h?: number },
) {
  const w = opts?.w ?? 10;
  const d = opts?.d ?? 8;
  const h = opts?.h ?? 6;
  // Body — wet concrete.
  box(w, h, d, x, y + h / 2, z, SURFACE.wetGray);
  // Chamfer steps under eaves.
  box(w + .8, .35, d + .8, x, y + h + .15, z, SURFACE.rustAmberDeep);
  box(w + 1.4, .18, d + 1.2, x, y + h + .42, z, SURFACE.rustAmber); // rust steel eave
  // Dark glass strip (no full-surface emissive).
  box(w * .7, h * .35, .08, x, y + h * .55, z + d / 2 + .05, SURFACE.baseDeep);
  box(w * .55, .06, .06, x, y + h * .75, z + d / 2 + .1, ACCENT.teal, true); // thin accent rim
  // Loading door recess.
  box(w * .35, h * .55, .12, x - w * .2, y + h * .3, z + d / 2 + .08, SURFACE.ground);
}

/** Market stall: wood posts + canvas awning; thin holo/sign ACCENT only. */
export function buildMarketStallSilhouette(
  box: BoxFn,
  x: number, y: number, z: number,
  accent: string = ACCENT.amber,
) {
  // Counter / wood base.
  box(4.8, .85, 2.2, x, y + .42, z, '#8a6a48');
  box(5.0, .12, 2.4, x, y + .95, z, '#6e5538');
  // Wood posts.
  for (const dx of [-2.2, 2.2]) box(.12, 2.8, .12, x + dx, y + 1.4, z, '#5a4a32');
  // Canvas awning (non-emissive cloth).
  box(5.2, .08, 2.6, x, y + 2.85, z, '#c4a078');
  box(5.0, .06, 2.4, x, y + 2.72, z + .1, '#d4b890');
  // Thin ACCENT holo strip only.
  box(3.2, .05, .05, x, y + 2.55, z + 1.25, accent, true);
}

/** Dark glass panel material — low metalness, no emissive blast. */
export function darkGlassMat() {
  return harborMat(SURFACE.baseDeep, 0.35, 0.15);
}

/** Modest harbor lamp glow (accent only). */
export function harborLampMat(color: string = ACCENT.amber) {
  return harborGlow(color, 1.35, 0.5);
}

/** Place a harbor PointLight hero cue near water/pier. */
export function addHarborPointLight(
  scene: THREE.Scene,
  x: number, y: number, z: number,
  color: string = ACCENT.amber,
  intensity = 32,
  distance = 20,
) {
  const light = new THREE.PointLight(color, intensity, distance, 1.6);
  light.position.set(x, y, z);
  scene.add(light);
  return light;
}

/** City-life pier warehouses + water-edge PointLights + dark-glass tower bands. */
export function decorateHarborPierExtras(
  scene: THREE.Scene,
  box: (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string, glow?: boolean) => unknown,
  groundHeight: (z: number, x?: number) => number,
  neonPair: (i: number) => string,
) {
  for (let i = 0; i < 7; i++) {
    const x = -133 + (i % 2) * 17, z = -65 - i * 15, h = 28 + (i % 3) * 12, y = groundHeight(z);
    box(scene, 10, h, 12, x, y + h / 2, z, SURFACE.ground);
    box(scene, .16, h + 5, .16, x + 5, y + h / 2, z + 6, neonPair(i), true);
    for (let f = 0; f < h / 3; f++) {
      box(scene, 8, .7, .07, x, y + 2 + f * 3, z + 6.05, SURFACE.baseDeep);
      box(scene, 7.2, .06, .05, x, y + 2.4 + f * 3, z + 6.12, neonPair(i + f), true);
    }
    addHarborPointLight(scene, x, y + h * .6, z + 8, neonPair(i), 22, 16);
  }
  for (const [wx, wz] of [[-48, 18], [-28, 16], [32, 17]] as const) {
    const wy = groundHeight(wz);
    buildWarehouseSilhouette((w, h, d, x, y, z, c, glow) => { box(scene, w, h, d, x, y, z, c, !!glow); }, wx, wy, wz, { w: 9, d: 7, h: 5.5 });
    addHarborPointLight(scene, wx, wy + 6.2, wz + 4.2, ACCENT.amber, 28, 18);
  }
  for (const [x, z, color] of [[-40, 34, ACCENT.amber], [12, 36, ACCENT.teal], [48, 34, ACCENT.amber], [-8, 38, ACCENT.teal]] as const) {
    addHarborPointLight(scene, x, 4.5 + groundHeight(z), z, color, 34, 20);
  }
}
