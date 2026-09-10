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

## Cinematic lighting and furnishing pass (September 10, follow-up)

Measured in Chrome at 1440×900 on the isolated offline fixture (port 8795), reading `canvas[data-scene-performance]` after warmup:

| Preset | FPS | median | p95 | max | stalls >50ms |
| --- | --- | --- | --- | --- | --- |
| City loft | 112.4 | 8.4ms | 11.6ms | 16.7ms | 0 |
| Lantern house | 120 | 8.3ms | 9.1ms | 11.3ms | 0 |
| Skyline studio | 120 | 8.3ms | 9.3ms | 11.6ms | 0 |
| City loft, 390×844 portrait | 120 | 8.3ms | 9.2ms | 9.7ms | 0 |

These are single samples on one machine, not a cross-device guarantee. The pre-pass baseline on the same machine was 117.5 FPS with one stall and a 121.9ms max, so the added lighting cost is visible in the average but removed the stall.

**What changed and why.** The room was lit by a steep, weak, cool key with almost no falloff, which is what made it read as a stylized dollhouse; the geometry was not the main gap. Replaced with a low raking warm key against a cool skylight and a warm floor bounce, contact-hardening shadows, practical lamp pools with visible falloff, a sealed floor finish carrying a specular streak, stronger SSAO, and a filmic grade (ACES, cool shadows, warm highlights, held-back saturation, vignette, grain, shallow focus falling off into the city). Three new Blender assets — open wall shelving, a coffee table and an armchair — plus a third rug closed the density gap against the concept.

**Honest fidelity statement.** This does not reach the photorealism of the Afterlight reference frame, and no claim of UE5-class or photoreal parity is made. The reference's own author describes it as "voxel-ish art style, and lighting that feels real and physical"; this pass targets that lighting axis, in a browser, on a night interior. Character models remain low-detail and are still the largest visible fidelity gap. Volumetric light shafts were considered and not implemented: the key light sits outside the camera frustum at this framing, so Babylon's volumetric scattering would render nothing without changing the scene's time of day.

**Checked after the pass.** Typecheck clean; 116 tests across 16 files pass. All three presets inspected in the production build; light and dark interface themes inspected; 390×844 portrait inspected with document scroll width exactly 390 and no horizontal overflow. The sofa interaction was driven end to end through the interface — the resident routed to the sofa approach at (2.00, 6.80) and completed Unwinding — confirming the new coffee-table footprint does not swallow that approach. `art/blender/validate_kit.mjs` verifies all eleven GLBs through Babylon's importer independently of Blender.

**Two defects found and fixed during the pass.** Rug fringe meshes were pickable but carried no metadata, so a click landing on one resolved to nothing and click-to-walk silently died along every rug border. The wall-shelf asset's first export placed geometry below its origin, which the kit validator rejected; the origin was moved to the lowest bracket rather than relaxing the invariant. A new test asserts every furniture approach point and resident start position stays walkable as static decor is added; it was observed failing against a deliberately blocking fixture before being trusted.

## Resident movement (September 10, follow-up)

The user reported residents moving ガタガタ — in visible steps. Three defects in one code path, each fixed and each covered by a test in `client/src/locomotion.test.ts` (8 tests):

1. **The body arrived early and waited.** Positions arrive from the server about every 250ms while frames run at ~8ms. The renderer eased toward each new position with `1 - exp(-dt * 12)`, an 83ms time constant, so it converged well inside a poll window and then stalled until the next one landed. No easing constant fixes this; the fix is to keep a short position history and play it back slightly delayed so every frame falls *between* two reported positions.
2. **Keying the history to arrival time reproduced the pulse.** A 250ms poll catches two or three ~100ms server ticks, so consecutive reports land 0.51m, 0.51m, 0.34m apart in wall-clock terms — measured live, not assumed. Position is exactly linear in *simulation* time, so the trail is keyed to `state.elapsed`, carried forward between polls by the client at the current game speed. This also makes pause stop the body for free.
3. **The stride ran on a timer, so the feet skated.** The walk cycle advanced at `dt * 8.5` regardless of ground speed. It now advances with distance actually travelled, and the imported walk clip is scaled to the same pace.

Two further problems surfaced only because the tests were written first, and neither would have been obvious by eye:

- Sizing the playback delay from an **average** poll interval lags a slowdown by several polls, during which playback runs past the newest sample and holds — reintroducing the stall. Sizing it from a **decaying peak** oscillates between alternating poll spans, and any movement in the delay is movement in the playback point, which shows up as a speed wobble. The delay is now the widest poll span still in the retained window.
- Changing the delay at all shifts the playback point and jumps the body, so the applied delay is eased toward its target asymmetrically: widened quickly, because too small a delay stalls, and narrowed slowly, because that only trims latency.

**Cost.** The body is rendered roughly 340ms behind the newest report at the normal poll cadence. Combined with the poll itself, a click takes visibly longer to produce movement than before. That latency is the deliberate price of continuous motion, and for a top-down life simulation it is the better trade.

**Verified after the change.** Typecheck clean, 124 tests across 17 files. A commanded walk crossed the room and arrived at the bed approach, transitioning to Sleeping, so the buffer does not break arrival or posed activities. Console clean apart from a pre-existing `/favicon.ico` 404; all eleven GLBs, the HDR environment and the scanned materials return 200. 111 FPS, median 8.4ms, p95 12.6ms, max 18.3ms, 0 stalls.

## Consequences for harm (September 10, follow-up)

The user reported that saying "I punched her" produced disapproval and nothing else: no injury, no relationship damage, no mark on the player. The cause was structural — the bounded reaction contract could only express accept/share/decline/walk_away, so no consequence could ever be applied.

The model now classifies the player's stated act (`none` / `threat` / `physical`); the engine owns every number. A resident cannot be talked out of an injury and a player cannot be talked out of a reputation.

**Verified live against gpt-6-astra** on an isolated instance (port 8796, throwaway save), player saying "I punched you in the face":

| | before | after |
| --- | --- | --- |
| June injury | 0 | 46 (mood `Hurt`) |
| Player↔June relationship | +12 | −43 |
| Player↔Leo (witness, untouched) | +5 | −15 |
| Player traits | Curious, Kind | Curious, Kind, **Callous** |
| `harmDone` | 0 | 1 |

June said "Alex, how could you hit me? I don't want to be near you right now." Events recorded: *Alex hurt June.* / *June is hurt and does not want Alex near them.* / *Alex is now known as Callous.* She then walked away and refused a subsequent meal invitation while still hurt.

Injury decays over simulated time, so the world recovers. A third offence replaces Callous with **Violent**. The menu insult routes through the same path, so consequences exist without a provider. An omitted classification defaults to `none`, so a quiet or older model never implies harm.

**Save compatibility.** Residents saved before this gain `hurt` and `harmDone` by schema default; a test constructs a legacy save without those fields and asserts it still parses and loads. Without that the user's existing save would have been rejected as an unsupported format.

**Interface.** Earned traits are highlighted on the main resident panel, injured housemates carry a Hurt badge in the household list, and the interaction panel states the refusal. Both themes were checked by computed style after the first pass shipped red text on a red wash in light mode: light now renders `#8a3a26` on `#f7e2db`, dark `#f6cfc2` on `#43241b`.

**Movement latency.** Polling moved from 250ms to 150ms and the minimum playback delay from 260ms to 170ms, roughly halving the input latency the interpolation buffer costs while keeping the buffer fed. 138 tests across 18 files pass.

## Remaining limits and adoption gate

**Astra verified September 10 after the key was configured.** The isolated `life-probe.ts` request used `gpt-6-astra`, returned a valid `share` decision in **4,149 ms**, and `applyReaction` returned true with June entering Sharing a meal and emitting the cooperation event. The production server was gracefully restarted with the same world identity, its health endpoint reports Astra / gpt-6-astra, and the browser badge agrees. The probe did not modify the live save. This verifies the model/engine path; a production-browser Astra conversation was not sent during this follow-up.

The three worlds are authored visual presets using the same home and rules. Arbitrary fictional-world generation, build/buy, careers, character creation, household switching, multiplayer, voice and production-scale asset fidelity remain outside this proof. This branch has not replaced or been merged into the existing submission, and no public deployment or submission was made.
