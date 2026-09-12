# Phase 4 — combat-mode unify (final integration)

Branch `rebuild/combat-mode-unify` · base `rebuild/look-silhouettes` PR#8 tip `3a390ef`

One condition drives EMP + HUD density + camera together:
**stage3 ∧ onFoot ∧ near ∧ !dialogue** (plus `enabled` and `!down`).

No new state machine — `wantArmed` / `isCombatMode` in `avatar-arming.ts` is the shared gate.
`StoryWorld` publishes `combatMode` + `aimBlend` on the existing snapshot.

## Touch
- `src/avatar-arming.ts` — shared gate + `sampleCombatCamera`
- `src/story-world.ts` — snapshot `combatMode` / `aimBlend`; track last onFoot/playing
- `src/components/mission-ui.tsx` — dense HUD from `s.combatMode` (not parallel `kind==='combat'&&active`)
- `scripts/decode-world-impl.mjs` — foot camera eases via `sampleCombatCamera(story.aimBlend)` (does **not** edit `_upload`)
- `src/world.test.ts` — gate + camera continuity tests
- notes

## Do not touch
sim core, campaign/short-cycle logic, silhouettes/look mats, damage math, `_upload`.

## Bans checked
| Ban | Mitigation |
| --- | --- |
| Arming without dense HUD or vice versa | Both use `wantArmed` / published `combatMode` (includes `near`) |
| Camera teleport | `aimBlend` 0.4s lerp + existing `applyCamera` smooth follow |
| Killing objective chip during short-cycle | Explore chip still `mission && !down` always |

## Exit → explore together
Dialogue / leave zone (`!near`) / clear (stage≠3) / board (`!onFoot`) / down / explore-off → `wantArmed` false → EMP holsters, HUD thins, camera eases back.

## QA gates 1–5

1. **Explore peacetime (story on, not stage3 / not near):** EMP holstered, chip-only HUD (task+distance+tiny crosshair), normal TPS camera. No suit panel.
2. **Enter stage3 zone on foot:** EMP draw 0.3–0.5s, dense suit/reticle, over-shoulder ease-in (same blend). Objective chip remains visible.
3. **Dialogue / leave zone / clear / board:** all three return to explore together (holster + thin HUD + TPS) without camera snap.
4. **No arming↔HUD desync:** far from zone while stage3 → holstered + thin HUD; near → armed + dense. Never one without the other.
5. **Short-cycle still completable:** stages 0–5 dialogue/scan/choice/homecoming unchanged; chip/heading wiring intact; damage/sim/campaign untouched.

## Verification
- `npm test`: **34/34 pass**
- `npm run build`: **pass** (Vite large-chunk warning only)
- `_upload` untouched; camera hook applied in `scripts/decode-world-impl.mjs` post-patch
