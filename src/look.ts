/**
 * SHIONAGI Phase 1 look layer — locked harbor palette.
 * Swap points for world / city-life lighting + materials only.
 * Neon (teal/amber) is night accent for lights/signs/thin holo — not the base read.
 */
import * as THREE from 'three';

/** Locked accents: harbor lights, signs, thin holograms only. */
export const ACCENT = {
  teal: '#8dffee',
  amber: '#f5ca7f',
} as const;

/** Surfaces: base range, ground, rust amber, wet gray. */
export const SURFACE = {
  baseDeep: '#0c252e',
  baseMid: '#1a3a40',
  ground: '#2b494b',
  rustAmber: '#c99568',
  rustAmberDeep: '#b88353',
  wetGray: '#5d7470',
  labelFill: 'rgba(12,37,46,.86)',
  labelFillWorld: '#0c252e',
} as const;

export const HOUSE_PALETTE = [
  SURFACE.wetGray,
  SURFACE.ground,
  SURFACE.rustAmberDeep,
  '#4a6060',
  SURFACE.rustAmber,
  '#556866',
] as const;

export type HarborLook = {
  skyTop: string;
  skyBottom: string;
  ambientSky: string;
  ambientGround: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  fog: string;
  fogDensity: number;
  water: string;
  exposure: number;
};

/** Night: wet blue-green fog, warm harbor lights hero, teal/amber accents only. */
export const harborNight: HarborLook = {
  skyTop: SURFACE.baseDeep,
  skyBottom: '#3d4a42',
  ambientSky: '#7a9a92',
  ambientGround: '#243230',
  ambientIntensity: 1.2,
  sunColor: '#c4b59a',
  sunIntensity: 0.9,
  fog: '#1a3a40',
  fogDensity: 0.0020,
  water: '#0f2f34',
  exposure: 1.1,
};

/** Day: sunset amber-leaning — not blown-out white. */
export const harborDay: HarborLook = {
  skyTop: '#4a7078',
  skyBottom: '#d4b890',
  ambientSky: '#c5d4c8',
  ambientGround: '#3a3830',
  ambientIntensity: 2.7,
  sunColor: '#f0c894',
  sunIntensity: 2.55,
  fog: '#6a8a82',
  fogDensity: 0.0016,
  water: '#1a3a40',
  exposure: 1.15,
};

/** Painted wet surface — not shiny-metal-only. */
export function harborMat(color: string | number, roughness = 0.82, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/** Modest emissive for lanterns/signs — never full-surface blast. */
export function harborGlow(color: string, strength = 1.35, roughness = 0.48) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: strength,
    roughness,
    metalness: 0.05,
  });
}

export function harborCachedMat(
  cache: Map<string, THREE.Material>,
  color: string,
  glow = false,
  opts?: { roughness?: number; metalness?: number; glowStrength?: number },
) {
  const roughness = opts?.roughness ?? (glow ? 0.48 : 0.78);
  const metalness = opts?.metalness ?? (glow ? 0.05 : 0.04);
  const glowStrength = opts?.glowStrength ?? 1.8;
  const key = `${color}|${glow}|${roughness}|${metalness}|${glowStrength}`;
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive: glow ? color : '#000000',
      emissiveIntensity: glow ? glowStrength : 0,
    });
    cache.set(key, m);
  }
  return m;
}

export function applyTimeLook(
  night: boolean,
  targets: {
    sky: THREE.ShaderMaterial;
    ambient: THREE.HemisphereLight;
    sun: THREE.DirectionalLight;
    scene: THREE.Scene;
    water: THREE.ShaderMaterial;
    renderer: THREE.WebGLRenderer;
  },
) {
  const look = night ? harborNight : harborDay;
  targets.sky.uniforms.top.value.set(look.skyTop);
  targets.sky.uniforms.bottom.value.set(look.skyBottom);
  targets.ambient.color.set(look.ambientSky);
  targets.ambient.groundColor.set(look.ambientGround);
  targets.ambient.intensity = look.ambientIntensity;
  targets.sun.color.set(look.sunColor);
  targets.sun.intensity = look.sunIntensity;
  targets.scene.fog = new THREE.FogExp2(look.fog, look.fogDensity);
  targets.water.uniforms.waterColor.value.set(look.water);
  targets.renderer.toneMappingExposure = look.exposure;
}

export const NEON = {
  teal: ACCENT.teal,
  amber: ACCENT.amber,
  pair: (i: number) => (i % 2 ? ACCENT.amber : ACCENT.teal),
} as const;
