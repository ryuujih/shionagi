# SHIONAGI rebuild Phase 1 — controls

Branch: `rebuild/controls` (from `main` @ 44337aa). Does **not** commit to main.

## QA gates → fixes

### 1 Walk
| NG | Fix |
| --- | --- |
| Wall stick/slide after hit with lingering input | `resolveFootStep` zeros the blocked axis; no frictional slide into the wall. Free-axis motion only when that axis is walkable. |
| >1 beat mismatch between push and motion | `stepFoot` uses faster blend on input (rate ~32) so direction matches push within ~1 beat; body heading follows input-relative intent in `world-impl`. |
| Stuck on steps/corners after releasing keys | On corner jam, micro-nudge or clear velocity; **`hasInput=false` clears residual vx/vz** so release recovers. |

### 2 Vehicle
| NG | Fix |
| --- | --- |
| Accel/cruise/brake slower than expected / won't stop | Higher accel & brake multipliers; snap-to-zero near stop; cruise ~0.38 hold cancelled instantly by brake/reverse. |
| Exit fails (leftover speed / shore) leaving controls dead | `exitSpeedOk` (~2.2) soft gate; wider/denser `findExit` radii; on exit clear speed+steering, face exit, `cameraSnap`. |
| Steering stuck after wall hit | On blocked drive step: **`speed=0` and `steering=0`** (no leftover steer decay). |

### 3 Camera
| NG | Fix |
| --- | --- |
| Stays facing opposite to travel | On vehicle, yaw/body/camera follow **`drive.heading`** (behind travel), not drifted mouse yaw. |
| Jump/desync after dodge/board-exit | `applyCamera` smooth follow (rate ~18); **`cameraSnap`** once on board/exit/reset/travel then resume lerp. |
| Keeps sucking to enemy after lock-off | `lockAiming` flag: while locked soft-aim; on lock-off **freeze yaw/pitch** and stop pulling. |

### 4 No breakage
- Short-cycle / choice results / Phase4a campaign text: untouched.
- Objective chip heading still from `WorldStatus.heading` (`drive.heading` / `yaw`).
- Not touched: `look.ts` palette, avatar arming visuals, campaign story copy, HUD chrome, mission short-cycle logic.
- Peacetime unarmed deferred to Phase 2.

## Files touched
- `src/simulation.ts` — predictive foot/drive, `resolveFootStep`, `exitSpeedOk`, wider `findExit`
- `src/world-impl.ts` — thin re-export; full loop via generated patch apply
- `src/world.test.ts` — Phase 1 control regression tests
- `_upload/controls.patch.gz.b64.p00`…`p03` — gzipped unified diff vs main world-impl
- `scripts/decode-world-impl.mjs` — assemble on prepare/pretest/prebuild/predev
- `REBUILD_CONTROLS_NOTES.md` — this file

## Verification
- `npm test` — 26/26 pass
- `npm run build` — green

## Playtest checklist (QA)

### Walk
- [ ] Walk into a wall while holding W: stop cleanly, no sticky slide; strafe along free axis still works
- [ ] Flick W→S (or strafe reverse): motion matches new push within ~1 beat
- [ ] Jam into a corner/step, release keys: recover immediately (not stuck)

### Vehicle (bike / truck / boat / air)
- [ ] Accel to cruise feels prompt; Space brake stops predictably; C cruise holds and yields to brake/S
- [ ] Boat: approach pier with slight leftover crawl / short shore gap — E still exits; controls live after exit
- [ ] Hit a wall while steering: steering does not stay stuck; can turn away and continue

### Camera
- [ ] Driving forward: camera stays behind travel (not 180° flipped)
- [ ] Dodge (Space), board (E), exit (E): camera does not hard-jump
- [ ] Lock (Q) then unlock (Q): view freezes at unlock aim — does not keep sucking to the drone

### Regression
- [ ] Mission objective chip / heading arrow still tracks facing
- [ ] Short-cycle choice confirm + homecoming branches unchanged
- [ ] Harbor look / HUD visuals unchanged

## Packaging note
`src/world-impl.ts` is a thin re-export. Full controls loop is rebuilt at
`npm prepare` / `pretest` / `prebuild` / `predev` by `scripts/decode-world-impl.mjs`:
fetch `main`'s `src/world-impl.ts`, apply `_upload/controls.patch.gz.b64.p00`…`p03`
(gunzip + `patch`), write `src/world-impl.generated.ts` (gitignored).
