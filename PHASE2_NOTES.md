# Phase 2 QA — Characters / NPCs

Branch `feat/phase2-characters` · base `feat/phase1-harbor-look` @ a224185

## Gates
1. **Ren from behind** — courier side bag + thin teal rim strips on suit (story-world `makeAvatar`).
2. **Dialog face panel** — left portrait + one-line `roleTitle` (e.g. 港湾システム技師・ミオ) via `mission.portrait` / `mission.roleTitle`.
3. **Distinct NPC stations** — Nagi (stocky rust amber), Mio (lean teal + tablet), scan terminals, combat beacon; combat drone meshes untouched; no move/shoot/EMP/HP/ammo/sim/campaign progression logic changes.
4. **look.ts tone** — untouched; materials stay harbor rust/teal/wet gray.

## Auto
- `npm test` 21/21
- `npm run build` green
