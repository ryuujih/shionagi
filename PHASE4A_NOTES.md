# Phase 4a QA — short cycle thickening

Branch `feat/phase4a-cycle` · base `feat/phase3-hud` @ f20cc49

## Scope
Mission loop thickening for 「誰のための航路」→「おかえり、汐凪」 only.
Combat stage3 stays a single key moment (no trash mobs / longer fights).
Optional 4b harbor light tint: skipped (not cheap without touching look/world).

## Gates
1. **Mio meet → decide → visible result** — talk at 潮路ターミナル; binary choice (routes vs free/cut surveillance); confirm line then advance; toast echoes confirm.
2. **Confirm before continue** — after picking a button, short line (e.g. 「航路だけ戻す——監視は残る」) + 選び直す / この方針でつづける before `advanceCampaign`.
3. **Mission log CHAPTER record** — completed network chapter shows `CHOICE_LOG` for free/routes; re-readable after leaving dialogue.
4. **Homecoming branches** — Nagi text differs free vs routes; one result chip (`帰港灯再点灯` / `監視網は残った`); relationship one-liner under title.
5. **Combat untouched** — still 3 EMP drones at stage3 only; no new mobs/stages.

## Untouched (do not regress)
`look.ts`, PR#3 silhouettes, PR#4 HUD modes, PR#1 guidance wiring, simulation, vehicles.

## Auto
- `npm test`
- `npm run build`
