# Phase 3 QA — HUD

Branch `feat/phase3-hud` · base `feat/phase2-characters` @ fc82552

## Gates
1. **Explore** — objective chip (task + distance + heading arrow) + tiny crosshair; function button row hidden while playing (Esc pause reveals).
2. **Combat** — denser suit/ammo/feedback reticle only on combat stage; explore chip not blocked.
3. **Conversation** — face panel + body + choices; other HUD dimmed (`opacity-25`).
4. **Mission log** — book tone (CHAPTER labels, whitespace, serif header).
5. **PR#1 wiring** — heading/bearing chip, combat feedback flash/reticle, map pins unchanged in logic.

## Auto
- `npm test` 21/21
- `npm run build` green
