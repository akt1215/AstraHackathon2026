# Bring the world simulation into Tilth

Base: `shresthkapoor7/tilth` at `7991a5d` (includes roaming combat, Rowan protection,
dialogue memory and the production server). Source: the Astra implementation at
`09489ce`. The game concept is Akito Yamauchi's; each teammate implementation retains
its code/art attribution.

## Approach

Keep Tilth's canvas, pixel coordinates, continuous controls, furnished interiors,
character creator, combat and browser save. Adapt the useful Astra mechanics to that
world rather than making Tilth display the former gatehouse grid.

- `engine/world-simulation.js`: deterministic portable-object, container, consumption,
  inspection, restitution and permission rules; stable item ownership; common character
  condition/development; witness-filtered memories; persistent first-sighting/event cursors.
- `engine/world-controller.js` and `main.js`: unrestricted action text, nearby direct
  controls, actual possessions, observed history and one initial objective. Apply proposals
  against current physical state. Movement remains local and never waits for narration.
- `server/world-api.ts`, `server/model.ts`: bounded validated actor-view requests through
  the existing Claude CLI adapter, with OpenAI opt-in later. Both dev and production serve
  the same routes; credentials remain server-side.
- `engine/runtime.js`: preserve old Tilth saves and add simulation state, including
  committed item positions, conditions and obligations. Existing creator/customization
  remains available; procedural combat remains intact and Rowan stays protected.

Tilth currently owns a single-player browser save. The deterministic simulation remains
in that runtime in this integration. This is not a claim of server-authoritative multiplayer
or cloud saves; that requires a separate storage/session migration.

## Verification

Run existing Tilth collision/combat/generation tests plus new rule, witness, persistence,
queue and request-boundary regressions. Observe meaningful failures before implementation.
Build and inspect the actual production URL, including mobile controls, text focus,
onboarding/reload, direct pickup/drop, private histories and ordinary movement with the
narrator disabled. Then verify bounded free-text interpretation using the local Claude CLI.

## Adversarial checkpoints

Two owners of actor HP/position would cause invisible rollbacks: synchronize live combat
bindings and commit validated effects atomically. Delayed proposals must not apply to a
replaced save. Do not let rendering create game effects or repeat sightings each frame.
Do not turn a reported claim into a witnessed fact, erase an obligation by consuming an
item, or leak privately held/container contents. Freeze hostile combat control under the
existing encounter rules while allowing stateful friendly decisions. Any unable-to-fit
action should receive an honest clarification rather than fabricated success.
