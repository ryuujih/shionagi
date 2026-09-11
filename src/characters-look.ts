/**
 * SHIONAGI Phase 2 character look helpers — Ren courier silhouette + role NPC stations.
 * Visual only; no combat/move/simulation logic.
 */
import * as THREE from 'three';

type BoxFn = (
  parent: THREE.Object3D,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  color: string, glow?: boolean,
) => THREE.Mesh;
type MatFn = (color: string, glow?: boolean) => THREE.MeshStandardMaterial;

/** Build Ren courier avatar into `g` (side bag + teal rim; readable from behind). */
export function buildRenAvatar(
  g: THREE.Group,
  box: BoxFn,
  mat: MatFn,
  legs: THREE.Group[],
  arms: THREE.Group[],
  weapon: THREE.Group,
) {
  box(g,.52,.78,.34,0,1.14,0,'#2f5560'); box(g,.58,.18,.38,0,.78,0,'#1e3440');
  box(g,.32,.5,.2,0,1.22,.26,'#a58861');
  box(g,.42,.08,.04,0,1.35,-.19,'#8dffee',true);
  box(g,.46,.06,.035,0,1.05,-.2,'#8dffee',true);
  box(g,.2,.55,.06,-.3,1.15,-.02,'#8dffee',true);
  box(g,.28,.34,.22,-.42,1.05,-.12,'#5d7470'); box(g,.22,.08,.18,-.42,1.24,-.12,'#c99568');
  box(g,.06,.28,.04,-.28,1.2,-.02,'#b88353');
  box(g,.1,.08,.08,-.48,1.0,-.18,'#8dffee',true);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22,12,10), mat('#c7a58a'));
  head.position.y = 1.74; g.add(head);
  box(g,.38,.14,.28,0,1.86,.02,'#243847'); box(g,.34,.07,.06,0,1.8,-.18,'#9affea',true);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Group(); leg.position.set(side*.17,.74,0);
    box(leg,.18,.56,.22,0,-.28,0,'#243847'); box(leg,.22,.14,.38,0,-.62,-.06,'#1a2c38');
    g.add(leg); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(side*.34,1.44,0);
    box(arm,.16,.28,.18,0,-.14,0,'#3a6570'); box(arm,.14,.26,.16,0,-.4,-.05,'#2f5560'); box(arm,.15,.11,.16,0,-.56,-.05,'#1e3440');
    g.add(arm); arms.push(arm);
  }
  box(weapon,.18,.2,.7,.35,1.04,-.48,'#718c9c'); box(weapon,.12,.1,.11,.35,1.06,-.9,'#8bfff0',true);
  g.add(weapon);
}

/** Build mission-station NPC / terminal into `g` by stage index. */
export function buildStationVisual(i: number, g: THREE.Group, box: BoxFn) {
  if (i === 0 || i === 5) {
    box(g,.62,.85,.4,0,1.12,0,'#c99568'); box(g,.7,.22,.42,0,.72,0,'#b88353');
    box(g,.42,.42,.4,0,1.78,0,'#c7a58a'); box(g,.5,.1,.45,0,2.02,0,'#8a6248');
    for (const x of [-.2, .2]) box(g,.2,.72,.24,x,.36,0,'#34495a');
    box(g,.28,.22,.18,.42,1.0,.05,'#5d7470');
    box(g,.08,.18,.08,.5,1.15,.12,'#f5ca7f',true);
  } else if (i === 4) {
    box(g,.42,.88,.3,0,1.18,0,'#3a5560'); box(g,.46,.16,.32,0,.76,0,'#2b494b');
    box(g,.34,.38,.34,0,1.82,0,'#d2b49a'); box(g,.36,.12,.36,0,2.05,.02,'#1a3a40');
    for (const x of [-.14, .14]) box(g,.15,.78,.18,x,.38,0,'#243847');
    box(g,.28,.22,.04,.36,1.35,.18,'#8dffee',true);
    box(g,.38,.05,.03,0,1.4,-.16,'#8dffee',true);
  } else if (i === 1 || i === 2) {
    box(g,1.05,1.55,.55,0,.78,0,'#2b494b'); box(g,.85,.7,.05,0,1.15,.3,'#8dffee',true);
    box(g,.7,.08,.1,0,.55,.32,'#f5ca7f',true); box(g,.2,.35,.2,0,1.75,0,'#5d7470');
  } else {
    box(g,.55,1.2,.55,0,.6,0,'#345268'); box(g,.35,.35,.35,0,1.35,0,'#f5ca7f',true);
    box(g,.9,.05,.9,0,.05,0,'#5d7470');
  }
}
