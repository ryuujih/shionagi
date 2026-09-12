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
