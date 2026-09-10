# Life-sim proof — implementation scope

Approved by Akito September10: proceed with The Sims4-inspired life-sim proof, browser3D initially; flag Unity/Blender if necessary. Direct control of one resident is the last explicit control choice; retain it and add click-to-command plus orbit/follow camera. Control clarification may still steer implementation.

Isolated worktree: `astra-life-sim-proof`, branch `codex/life-sim-proof`, separate save `data/life-session.json`, server8791, Vite5175. Existing game source/main checkout remains intact.

Implement a furnished loft with one controlled resident and two autonomous residents, four needs, time/pause/speed, object activities/queue, social relationships/memories, durable saves, and model-backed contextual reactions. World presets are visibly authored presets; they are not arbitrary generated franchise worlds. Model identity and availability must be explicit. Astra key currently missing; prepare live integration and verify available fallback separately.

Shared contract: `shared/life-types.ts`. Backend lane owns new `shared/life/`, `server/life-*`, and its tests. Renderer lane owns `client/src/life-scene.ts` and renderer-specific files. Root owns client UI, build/config/integration and verification. Asset lane may supply rights-cleared GLBs under `client/public/life-assets/` with credits. No lane modifies another lane's files without coordination.

Simulation owns authority: clock, needs, reservations, activity queues, movement validity, social effects, relationships, memory and persistence. Renderer interpolates authoritative positions and animates activities; NPC decisions are asynchronous and revalidated. One failed or slow model must not freeze routines or player controls. A model's speech is not evidence of an executed action.

Verification: write meaningful failing simulation tests first, then implement; exercise autonomous activity without chat, need changes, reservations/cancel/reset/reload/idempotence, social history changing cooperation, invalid/stale model outputs and offline state. Build/typecheck/existing tests. Open the production game in browser, inspect every prop/character, both UI themes, camera, controls, social interactions, reload, and actual backend identity. Rehearse the actual gameplay before claiming a successful proof. Incremental commits, independent review before integration; no public posting or submission without authorization.
