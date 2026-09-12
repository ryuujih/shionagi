# Phase 2 — avatar arming

Visual-only arming on `rebuild/unarmed-equip`. EMP uses a local grip pivot with barrel along -Z. Initial pose is left bag/hip at (-0.52, 1.0, -0.12), pitched -1.85 radians so the muzzle points down/back. Right hand is empty in peacetime (optional chest terminal deferred). Aim arm raise uses negative X rotation (same sign as legacy lock pose). Weapon and arms interpolate together over 0.4 seconds; reversing mid-transition preserves continuity. Lock state no longer snaps the arms. Recoil is a separate visual offset triggered only above 0.8 aim blend.

## QA gates 1–5

1. **Title / free explore start:** construction initializes the weapon holstered, before the first update. Disabled/explore and non-playing states target holster. Unit tests verify the disabled gate and down/back muzzle direction. Browser check pending: inspect left bag and empty right hand from front/side/rear at start.
2. **Talk / dialogue:** dialogue targets holster; animation runs before the dialogue early return. From armed, lowering completes in 0.4 seconds rather than snapping. Unit tests verify the dialogue gate. Browser check pending: enter conversation and confirm the avatar does not remain aimed.
3. **Enter stage 3 combat zone on foot:** target aim requires enabled, stage 3, on foot, nearby via existing `near(pos)`, no dialogue, and not down; non-playing also suppresses aim. Tests verify gates and 0.4-second draw at 30/60/120 fps. Browser check pending: cross the zone boundary and inspect weapon/hand alignment during draw.
4. **Leave zone / clear / board:** range exit, stage advance, boarding, down, dialogue, and explore target holster through the same blend. Updates continue while the boarded avatar is hidden, so equip state is not teleported. Tests verify exit gates, lowering duration, and mid-blend reversal. Browser check pending: leave/re-enter, clear stage 3, board/disembark, and inspect transition continuity.
5. **No damage / sim / HUD / look / campaign regressions:** diff review confirms no damage, hit, ammo, reload, lock targeting, simulation, HUD, palette, campaign, decode-script, or `_upload` edits. Only the visual recoil assignment inside `fire` changed. Existing regression tests pass. Browser combat/HUD smoke check pending.

## Verification

- `npm test`: **29/29 pass**
- `npm run build`: **pass**, with Vite's large-chunk warning.
- The existing pretest/prebuild decoder ran unchanged and regenerated its ignored output; `_upload` was only read by that existing script.
- Manual browser visual QA was not performed; the gates above distinguish automated evidence from remaining visual checks.
