# Phase 3 — code silhouettes + harbor materials

Branch `rebuild/look-silhouettes` · tip `956beb0` · base `rebuild/unarmed-equip` @ a04df28

Visual-only rebuild: procedural box silhouettes and look.ts materials. No glTF. Does not touch `_upload`, simulation/phase1 controls, campaign progression, HUD wiring, or arming blend math.

## QA gates 1–5

1. **Ren silhouette:** taller courier read with articulated shoulders/chest/waist (no single box torso), side bag, hood, thin teal rim accents. EMP still initializes holstered via `sampleArmingPose(0)`. Unit tests assert child count, limbs, and holster X. Browser check pending: inspect from behind/side on foot.
2. **Nagi / Mio stations:** Nagi (stages 0/5) sturdy rust-amber coat + tool pouch; Mio (stage 4) slim body + handheld terminal + teal rim. Distinct from scan terminals / combat beacon. Browser check pending: mission markers.
3. **Crowd ≥3 kinds:** `fisher` / `shopkeeper` / `passerby` via `buildCrowdPerson` + `crowdKindForIndex` in city-life actors — not identical boxes. Unit tests cover kind cycle and distinct mesh counts. Browser check pending: pier walkers.
4. **Buildings:** pier/warehouse wet concrete + rust steel eaves (chamfered steps) in city-life + expansion; market stalls canvas+wood with thin ACCENT holo only; dark glass bands + harbor `PointLight`s; no full-surface window blast. Unit tests cover warehouse/market part colors and glow budget.
5. **look.ts materials / regressions:** story-world + expansion use `harborCachedMat` (high roughness, low metalness). Harbor PointLights reinforced near water/pier/market. Diff review: no simulation, campaign, HUD, avatar-arming math, decode script, or `_upload` edits.

## Verification

- `npm test`: **32/32 pass** (local /workspace/shionagi)
- `npm run build`: **pass** (Vite large-chunk warning only)
- Manual browser visual QA pending for gates 1–4 camera reads.
