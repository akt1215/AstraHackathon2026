# Elsewhere proof verification — 2026-09-10

Tested the production build at `http://127.0.0.1:8791/` in the Codex browser. This is a local single-player proof, not a finished Sims replacement or an AAA production.

## Automated checks

- `npm test`: **115 tests passed across 16 files**, including 27 life backend tests. Local HTTP tests ran with permission to bind sockets.
- `npm run typecheck`: passed.
- `npm run build:life`: passed. Vite warns about the large Babylon bundle; no sustained frame-rate or slow-network benchmark was performed.
- `git diff --check`: passed. No `TODO`, `FIXME`, `SOON` or `comingSoon` markers in the life client, server or shared simulation files.

## Actual play and persistence

- Selected the dining table through the UI, walked there, ate and completed the activity: hunger rose from 38 to 92.
- Selected sleep through the keyboard-accessible home menu: walked to bed, visibly lay down, and energy rose from 15 to 82 before pausing.
- Sent a real free-text invitation to June. She replied in about **3.5 seconds**, accepted a shared meal, and the engine applied the activity and need/relationship consequences. This used **Claude CLI fallback / Sonnet**, not Astra. A separate isolated provider probe returned a valid applied `share` decision in 2,763 ms.
- Paused and reloaded the production browser. The complete simulation payload, excluding runtime provider telemetry, was byte-equivalent under JSON serialization: identity, version, clock, residents, needs, activities, objects, events and theme all persisted.
- A real W keypress focused on the canvas initiated walking and completed to idle. The renderer maps movement through the camera's horizontal basis. Continuous held-key movement and every camera angle were not exhaustively benchmarked.
- Exercised the two-step fresh-life reset. Handoff save is a new day-one life, paused after the movement check; previous conversation-test history is cleared.

## All object paths

Each activity below was separately run through actual simulation commands in an isolated controlled fixture, from movement through activity completion and reservation release. The relevant starting need was 25. Every movement step remained collision-free. These checks did not alter the live save.

| Object | Final relevant need | Simulated seconds |
|---|---:|---:|
| Fridge | Hunger 83.48 | 15.5 |
| Coffee station | Energy 48.43 | 10.9 |
| Dining table | Hunger 83.67 | 14.1 |
| Bed | Energy 100.00 | 31.5 |
| Sofa | Fun 47.80 | 14.0 |
| Bookshelf | Fun 72.73 | 16.2 |
| Plant | Fun 36.24 | 9.6 |
| Easel | Fun 87.50 | 19.0 |

## Failure and interruption checks

Independent review found and fixed three defects: another conversation could interrupt a pending reply target; retrying an accepted talk request could incorrectly return busy; and reply cleanup erased a queued player activity. Regression tests cover the fixes. Five queue cases were observed failing before the fix and passing afterward: accepted reply, declined reply, provider failure, server restart and stale recipient. They assert that queued sleep actually starts and reserves the bed, not merely that the queue array remains present.

A separate production fixture on port 8794 ran with `LIFE_PROVIDER=offline`. Housemates continued their routines, menu-driven Catch up applied social gain, and nearby free-text Send was disabled with “Connect a model for free-text reactions.” Its server was stopped and its browser tab closed after verification. Provider failure/restart handling is also covered by backend tests.

## Visual checks

- City loft, Lantern house and Skyline studio rendered with all eight objects and the three imported residents.
- Light and dark interface controls were inspected in the production build. Lantern title/brand contrast was corrected against its darker background.
- 390×844 portrait camera fit was inspected; the room fits with approximately 30-pixel horizontal margins. At 320×740, the complete room and both lower panels fit; DOM scroll width was exactly 320. The top controls occupy two rows without covering the caption.
- Final normal-viewport production screenshot was inspected after restoring light mode. Browser console returned no errors or warnings.
- Character assets import and animate; sitting/sleeping use procedural poses where the source pack lacks specific clips. Other interactions use generic supplied clips. There is no claim of bespoke animation quality.
- Fonts are bundled locally with their OFL licenses; the client no longer depends on a remote font request.

## Remaining limits and adoption gate

**Astra verified September 10 after the key was configured.** The isolated `life-probe.ts` request used `gpt-6-astra`, returned a valid `share` decision in **4,149 ms**, and `applyReaction` returned true with June entering Sharing a meal and emitting the cooperation event. The production server was gracefully restarted with the same world identity, its health endpoint reports Astra / gpt-6-astra, and the browser badge agrees. The probe did not modify the live save. This verifies the model/engine path; a production-browser Astra conversation was not sent during this follow-up.

The three worlds are authored visual presets using the same home and rules. Arbitrary fictional-world generation, build/buy, careers, character creation, household switching, multiplayer, voice and production-scale asset fidelity remain outside this proof. This branch has not replaced or been merged into the existing submission, and no public deployment or submission was made.
