/**
 * SHIONAGI rebuild Phase 3 — character / NPC / crowd silhouettes (procedural boxes only).
 * Visual only; no combat/move/simulation logic. No glTF.
 */
import * as THREE from 'three';
import { sampleArmingPose } from './avatar-arming.ts';
import { SURFACE, ACCENT } from './look.ts';

type BoxFn = (
  parent: THREE.Object3D,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: string, glow?: boolean,
) => THREE.Mesh;
type MatFn = (color: string, glow?: boolean) => THREE.MeshStandardMaterial;

export const CROWD_KINDS = ['fisher', 'shopkeeper', 'passerby'] as const;
export type CrowdKind = (typeof CROWD_KINDS)[number];

export function crowdKindForIndex(index: number): CrowdKind {
  return CROWD_KINDS[((index % 3) + 3) % 3];
}

/** Build Ren courier avatar into `g` — taller, hood, side bag, articulated torso (no single box body). */
export function buildRenAvatar(
  g: THREE.Group,
  box: BoxFn,
  mat: MatFn,
  legs: THREE.Group[],
  arms: THREE.Group[],
  weapon: THREE.Group,
) {
  // Articulated torso: shoulders / chest / waist (readable from behind, not one box).
  box(g, .56, .22, .34, 0, 1.42, 0, '#2a4a54'); // shoulders
  box(g, .48, .36, .30, 0, 1.18, 0, '#2f5560'); // chest
  box(g, .42, .28, .28, 0, .92, 0, '#243847'); // waist
  box(g, .50, .10, .32, 0, .76, 0, '#1e3440'); // belt
  // Thin teal rim accents only (ACCENT).
  box(g, .40, .05, .035, 0, 1.34, -.17, ACCENT.teal, true);
  box(g, .36, .04, .03, 0, 1.08, -.16, ACCENT.teal, true);
  box(g, .05, .42, .04, -.26, 1.18, -.02, ACCENT.teal, true);
  // Chest terminal plate (slim).
  box(g, .28, .18, .08, 0, 1.22, .18, SURFACE.wetGray);
  box(g, .18, .08, .04, 0, 1.22, .24, ACCENT.teal, true);
  // Courier side bag (left hip/back).
  box(g, .26, .32, .20, -.40, 1.02, -.10, SURFACE.wetGray);
  box(g, .20, .07, .16, -.40, 1.20, -.10, SURFACE.rustAmber);
  box(g, .05, .26, .04, -.26, 1.14, -.02, SURFACE.rustAmberDeep);
  box(g, .08, .06, .06, -.46, .96, -.16, ACCENT.teal, true);
  // Head + hood (taller silhouette).
  const head = new THREE.Mesh(new THREE.SphereGeometry(.20, 12, 10), mat('#c7a58a'));
  head.position.y = 1.86; g.add(head);
  box(g, .36, .16, .30, 0, 1.98, .02, '#1a2c38'); // hood crown
  box(g, .38, .12, .10, 0, 1.88, -.16, '#243847'); // hood brim back
  box(g, .30, .05, .05, 0, 1.90, -.20, ACCENT.teal, true); // hood rim
  // Longer legs / arms for taller read.
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Group(); leg.position.set(side * .16, .74, 0);
    box(leg, .17, .62, .20, 0, -.30, 0, '#243847');
    box(leg, .20, .12, .34, 0, -.66, -.05, '#1a2c38');
    g.add(leg); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .34, 1.48, 0);
    box(arm, .15, .26, .16, 0, -.12, 0, '#3a6570');
    box(arm, .13, .28, .14, 0, -.40, -.04, '#2f5560');
    box(arm, .14, .10, .14, 0, -.56, -.04, '#1e3440');
    g.add(arm); arms.push(arm);
  }
  // Grip at origin, barrel along local -Z; initialize holstered before any update.
  box(weapon, .18, .2, .7, 0, 0, -.15, '#718c9c');
  box(weapon, .12, .1, .11, 0, .02, -.57, ACCENT.teal, true);
  const holster = sampleArmingPose(0);
  weapon.position.set(holster.x, holster.y, holster.z);
  weapon.rotation.x = holster.pitch;
  g.add(weapon);
}

/** Build mission-station NPC / terminal into `g` by stage index. */
export function buildStationVisual(i: number, g: THREE.Group, box: BoxFn) {
  if (i === 0 || i === 5) {
    // Nagi — sturdy rust-amber coat + tool pouch.
    box(g, .70, .55, .42, 0, 1.20, 0, SURFACE.rustAmber); // coat body
    box(g, .76, .22, .46, 0, 1.52, 0, SURFACE.rustAmberDeep); // shoulders
    box(g, .62, .28, .38, 0, .88, 0, '#8a6248'); // lower coat
    box(g, .42, .36, .36, 0, 1.86, 0, '#c7a58a'); // head
    box(g, .48, .10, .42, 0, 2.08, 0, '#6a4a38'); // cap
    for (const x of [-.22, .22]) box(g, .22, .70, .26, x, .38, 0, '#34495a');
    // Tool pouch + wrench accent.
    box(g, .28, .24, .18, .44, 1.02, .06, SURFACE.wetGray);
    box(g, .10, .20, .08, .52, 1.18, .12, SURFACE.rustAmberDeep);
    box(g, .06, .16, .06, .56, 1.28, .14, ACCENT.amber, true);
  } else if (i === 4) {
    // Mio — slim + handheld terminal + teal rim.
    box(g, .38, .70, .26, 0, 1.22, 0, '#3a5560');
    box(g, .42, .14, .28, 0, .84, 0, SURFACE.ground);
    box(g, .30, .34, .30, 0, 1.86, 0, '#d2b49a');
    box(g, .32, .10, .32, 0, 2.08, .02, SURFACE.baseMid); // bob cut
    for (const x of [-.12, .12]) box(g, .13, .78, .16, x, .40, 0, '#243847');
    box(g, .26, .20, .04, .34, 1.32, .16, ACCENT.teal, true); // terminal screen
    box(g, .28, .04, .06, .34, 1.18, .14, SURFACE.wetGray); // terminal body
    box(g, .34, .04, .03, 0, 1.42, -.14, ACCENT.teal, true); // slim rim strip
    box(g, .04, .36, .03, -.20, 1.28, -.02, ACCENT.teal, true);
    box(g, .10, .08, .08, -.30, 1.55, .10, SURFACE.wetGray); // shoulder pack
  } else if (i === 1 || i === 2) {
    // Scan terminals — dark glass panels, thin ACCENT rim (not full-surface blast).
    box(g, 1.05, 1.55, .55, 0, .78, 0, SURFACE.ground);
    box(g, .85, .70, .04, 0, 1.15, .30, SURFACE.baseDeep); // dark glass
    box(g, .70, .06, .05, 0, 1.52, .32, ACCENT.teal, true); // thin top rim
    box(g, .70, .06, .05, 0, .78, .32, ACCENT.amber, true);
    box(g, .20, .35, .20, 0, 1.75, 0, SURFACE.wetGray);
  } else {
    // Combat beacon — compact marker, modest glow accents only.
    box(g, .55, 1.20, .55, 0, .60, 0, '#345268');
    box(g, .28, .28, .28, 0, 1.35, 0, ACCENT.amber, true);
    box(g, .90, .05, .90, 0, .05, 0, SURFACE.wetGray);
  }
}

/** Crowd silhouette into `g`; returns limb groups for walk cycle. */
export function buildCrowdPerson(kind: CrowdKind, g: THREE.Group, box: BoxFn, robot = false) {
  const limbs: THREE.Object3D[] = [];
  g.userData.crowdKind = robot ? 'robot' : kind;
  if (robot) {
    const color = '#b8c9c0';
    box(g, .55, .55, .45, 0, .95, 0, color);
    box(g, .48, .36, .40, 0, 1.48, 0, '#263a50');
    box(g, .32, .07, .04, 0, 1.50, -.22, ACCENT.teal, true);
    box(g, .10, .36, .10, 0, 1.86, 0, color);
    box(g, .12, .12, .12, 0, 2.08, 0, ACCENT.amber, true);
    box(g, .32, .28, .30, 0, .86, -.36, '#bc9870');
    for (const side of [-1, 1] as const) {
      const leg = new THREE.Group(); leg.position.set(side * .17, .68, 0);
      box(leg, .16, .55, .16, 0, -.28, 0, '#283548');
      box(leg, .18, .12, .30, 0, -.56, -.05, '#1a2431');
      g.add(leg); limbs.push(leg);
      const arm = new THREE.Group(); arm.position.set(side * .40, 1.32, 0);
      box(arm, .13, .58, .16, 0, -.28, 0, color);
      g.add(arm); limbs.push(arm);
    }
    return limbs;
  }

  if (kind === 'fisher') {
    // Oilskin apron + bucket silhouette.
    box(g, .46, .55, .30, 0, 1.15, 0, '#3d6a72');
    box(g, .50, .22, .34, 0, 1.48, 0, SURFACE.wetGray);
    box(g, .42, .34, .10, 0, 1.05, .20, SURFACE.rustAmberDeep); // apron
    box(g, .22, .22, .22, 0, 1.72, 0, '#b99985');
    box(g, .28, .10, .28, 0, 1.88, .02, '#243847'); // beanie
    box(g, .22, .18, .18, .36, .95, .08, SURFACE.ground); // bucket
    box(g, .08, .20, .08, .36, 1.12, .08, ACCENT.teal, true);
    box(g, .34, .12, .22, -.34, .92, .10, SURFACE.wetGray); // net crate
    box(g, .30, .08, .18, -.34, 1.02, .10, SURFACE.rustAmberDeep);
  } else if (kind === 'shopkeeper') {
    // Wide apron + crate / sign tablet.
    box(g, .50, .58, .32, 0, 1.12, 0, SURFACE.rustAmber);
    box(g, .54, .18, .36, 0, 1.48, 0, '#8a6248');
    box(g, .46, .36, .08, 0, 1.05, .20, '#e8d2a8'); // apron
    box(g, .22, .24, .22, 0, 1.72, 0, '#c7a58a');
    box(g, .30, .08, .28, 0, 1.88, 0, '#5a4030');
    box(g, .24, .18, .04, .38, 1.25, .14, ACCENT.amber, true); // price tablet
    box(g, .26, .06, .06, .38, 1.12, .12, SURFACE.wetGray);
    box(g, .40, .08, .40, 0, 1.68, 0, '#c4a078'); // cloth canopy brim
  } else {
    // Passerby — slim coat + umbrella / bag.
    box(g, .40, .62, .26, 0, 1.16, 0, '#486878');
    box(g, .44, .14, .28, 0, 1.52, 0, SURFACE.baseMid);
    box(g, .20, .22, .20, 0, 1.76, 0, '#b99985');
    box(g, .26, .12, .24, 0, 1.92, .02, '#29303e'); // soft hat
    box(g, .18, .28, .14, -.34, 1.05, -.04, SURFACE.ground); // shoulder bag
    box(g, .04, .36, .04, .28, 1.55, .02, SURFACE.wetGray); // umbrella shaft
    box(g, .28, .04, .28, .28, 1.74, .02, ACCENT.teal, true); // umbrella canopy accent
  }

  for (const side of [-1, 1] as const) {
    const leg = new THREE.Group(); leg.position.set(side * .15, .68, 0);
    box(leg, .15, .55, .16, 0, -.28, 0, '#283548');
    box(leg, .18, .11, .30, 0, -.56, -.05, '#1a2431');
    g.add(leg); limbs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side * .30, 1.38, 0);
    const sleeve = kind === 'shopkeeper' ? SURFACE.rustAmber : kind === 'fisher' ? '#3d6a72' : '#486878';
    box(arm, .12, .55, .15, 0, -.26, 0, sleeve);
    g.add(arm); limbs.push(arm);
  }
  return limbs;
}
