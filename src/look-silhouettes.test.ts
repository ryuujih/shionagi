import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SURFACE, ACCENT } from './look.ts';
import * as THREE from 'three';
import { CROWD_KINDS, crowdKindForIndex, buildRenAvatar, buildStationVisual, buildCrowdPerson } from './characters-look.ts';
import { buildWarehouseSilhouette, buildMarketStallSilhouette, darkGlassMat, harborLampMat } from './buildings-look.ts';

test('crowd kinds cover fisher / shopkeeper / passerby (3+ distinct)', () => {
  assert.deepEqual([...CROWD_KINDS], ['fisher', 'shopkeeper', 'passerby']);
  assert.equal(crowdKindForIndex(0), 'fisher');
  assert.equal(crowdKindForIndex(1), 'shopkeeper');
  assert.equal(crowdKindForIndex(2), 'passerby');
  assert.equal(crowdKindForIndex(5), 'passerby');
});

test('Ren / Nagi / Mio / crowd silhouettes build without a single-box torso monopoly', () => {
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, glow = false) => {
    const key = color + glow;
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        roughness: glow ? 0.48 : 0.82,
        metalness: glow ? 0.05 : 0.04,
        emissive: glow ? color : '#000000',
        emissiveIntensity: glow ? 1.4 : 0,
      });
      mats.set(key, m);
    }
    return m;
  };
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string, glow = false) => {
    const mesh = new THREE.Mesh(unit, mat(color, glow));
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const ren = new THREE.Group();
  const legs: THREE.Group[] = [];
  const arms: THREE.Group[] = [];
  const weapon = new THREE.Group();
  buildRenAvatar(ren, box, mat, legs, arms, weapon);
  assert.ok(ren.children.length >= 12, 'Ren uses articulated pieces, not one torso');
  assert.equal(legs.length, 2);
  assert.equal(arms.length, 2);
  assert.ok(weapon.parent === ren);
  assert.ok(weapon.position.x < -0.4, 'EMP starts holstered on left bag/hip');

  const nagi = new THREE.Group();
  buildStationVisual(0, nagi, box);
  assert.ok(nagi.children.length >= 8, 'Nagi sturdy coat + pouch pieces');
  const mio = new THREE.Group();
  buildStationVisual(4, mio, box);
  assert.ok(mio.children.length >= 8, 'Mio slim + terminal pieces');
  assert.notEqual(nagi.children.length, mio.children.length);

  const counts: number[] = [];
  for (const kind of CROWD_KINDS) {
    const g = new THREE.Group();
    const limbs = buildCrowdPerson(kind, g, box, false);
    assert.equal(limbs.length, 4);
    assert.equal(g.userData.crowdKind, kind);
    counts.push(g.children.length);
  }
  assert.equal(new Set(counts).size, 3, 'crowd kinds use distinct mesh budgets');
});

test('building helpers use wet concrete / rust eaves and dark glass without blast emissive', () => {
  const parts: { color: string; glow: boolean }[] = [];
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, glow = false) => {
    parts.push({ color, glow });
  };
  buildWarehouseSilhouette(box, 0, 0, 0);
  assert.ok(parts.some(p => p.color === SURFACE.wetGray));
  assert.ok(parts.some(p => p.color === SURFACE.rustAmber || p.color === SURFACE.rustAmberDeep));
  assert.ok(parts.some(p => p.color === SURFACE.baseDeep && !p.glow), 'dark glass non-emissive');
  assert.ok(parts.filter(p => p.glow).length <= 2, 'warehouse accent glow is thin only');

  parts.length = 0;
  buildMarketStallSilhouette(box, 0, 0, 0);
  assert.ok(parts.some(p => p.glow && (p.color === ACCENT.amber || p.color === ACCENT.teal)));
  assert.ok(parts.filter(p => p.glow).length <= 2, 'market holo is ACCENT-only');

  const glass = darkGlassMat();
  assert.ok(glass.roughness >= 0.3);
  assert.ok(glass.metalness <= 0.2);
  assert.equal(glass.emissive.getHex(), 0);
  glass.dispose();
  const lamp = harborLampMat(ACCENT.amber);
  assert.ok(lamp.emissiveIntensity > 0 && lamp.emissiveIntensity < 3);
  lamp.dispose();
});
