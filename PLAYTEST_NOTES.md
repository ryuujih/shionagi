# 汐凪 game-feel QA

Implemented on `improve/game-performance-feel`; no commit or push.

## Feel — combat
- [ ] Hit a drone: teal screen pulse, center hit mark, 0.18 s EMP trace and stronger weapon recoil.
- [ ] Take damage: rose vignette and rose reticle; dodge: cyan/white edges and curved reticle.
- [ ] Toggle Q: amber/teal brackets and diamond crosshair while locked; unlock removes brackets after the short cue.
- [ ] Reload or empty the magazine: prominent amber center text and ammo badge; reload completes normally.
- [ ] Pause, retry, and leave story mode: transient feedback clears, controls remain usable.

Feedback expires independently of paused combat simulation (including dialogue/down state). Effects last 0.35–0.5 s to survive the 150 ms HUD sampling interval. Reduced-motion mode disables the entrance animation.

## Next — objective clarity
- [ ] Stages 0–5 always show the compact top-center title/task, distance and heading-relative arrow, including while riding.
- [ ] Turn around the objective: arrow points ahead when facing it and behind when facing away.
- [ ] Small and expanded maps show the filled amber diamond with pulsing halo. Campaign map uses the wide view to retain distant objectives.
- [ ] World objective has a larger luminous diamond and ground ring; chip and pin disappear at stage 6.
- [ ] Check narrow mobile screens for overlap with mission panel, vehicle controls and dialogue.

## Move — vehicles
- [ ] All four vehicles stop firmly with Space (4.5× acceleration braking).
- [ ] Release throttle: bike stops promptly; truck sheds speed; boat/air retain gentler coast.
- [ ] Hit a wall while steering, release input, then reverse: speed stops and steering settles without sticky exit.
- [ ] C cruises at 22% throttle; S/ArrowDown/Space cancels cruise.
- [ ] Board, exit, fast travel and reset: speed and steering reset explicitly.

Existing city-life actor culling, traffic list and cached route lengths are preserved, as is the enlarged mission interaction range.

## Tempo — mission flow
- [ ] Both scans complete after 1.8 s; progress reaches full at completion; leaving range cancels scanning.
- [ ] First entry into each stage's range shows a short action notice; leaving/re-entering does not spam it.
- [ ] Drone kills report 1/3, 2/3, 3/3; final kill also shows the completion message.
- [ ] Start notice lasts 3 s, completion notices 5 s, arrival notices 2.2 s. Mission story text bodies are unchanged.
- [ ] Complete both ending choices, reload the save, and retry combat.

## Verification and risks
- Automated: `npm test` passed all 20 tests, including 30/120 fps straight-line independence; `npm run build` passed with Node 24.
- `git diff --check` passed.
- Browser/manual playtesting has not been performed; unchecked items above remain visual/feel QA, not claimed passes.
- One feedback channel means the latest combat event replaces an earlier cue. HUD sampling can delay display by up to 150 ms.
- Firmer truck/bike coast and lower cruise speed are intentional tuning changes requiring subjective playtesting. Existing fps test covers straight-line motion, not identical turning trajectories.
- Build retains Vite's advisory for a bundle over 500 kB; no bundle-splitting changes were made.
