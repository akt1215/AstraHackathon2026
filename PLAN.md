# Grounded actions and characters shaped by play

Status: proposal for review; no implementation approved or performed.
Date: 2026-09-10.

## Context and verified baseline

Austin's feedback asks for deterministic commands, richer world and character state,
direct interaction, a clear initial goal, better presentation, and actions constrained
by the character's history. This changes the current promise that any invented action
or object is legal. The proposed promise is: **your choices shape who you become,
and that changes how you can solve a persistent world.**

The supplied checkout contains only HANDOFF.md, IMPLEMENTED.md, README.md, SPEC.md,
package.json, and package-lock.json. It has no server, client, shared code, or tests.
The package files describe a TypeScript/Vite/Node/Zod stack but cannot run a game alone.
The matching reference source is in ../ai-game-engine-plan, inspected at HEAD
61fddc46e9a4465f4537bf5d5c0c833adcdb9fb6. Its six corresponding root files are locally
deleted; this checkout's README is modified and the other five files are untracked.
These changes predate this review and must be preserved. Source inspection is not
runtime verification; the supplied claim of 28 passing tests was not re-run.

Verified reference execution path: client/src/main.ts dispatches movement directly
or free text through client/src/api.ts; server/index.ts routes movement or a model
turn through server/astra.ts; shared/schema.ts validates the scene; shared/session.ts
applies it; server/store.ts saves it; the client animates and reconciles its snapshot.

| Feedback | Existing mechanism | Actual gap |
| --- | --- | --- |
| Deterministic commands | Nine animation verbs and a reducer | No gameplay legality/cost resolver; the model chooses effects |
| More world state | Coordinates, tiles, tokens, conditions, inventory | No unified object location/ownership or interaction contract; scene tokens replace room contents |
| Character development | Stats, moves, conditions, reputation, transcript | No structured behavioral evidence or history-shaped eligibility |
| Direct interaction | Walking bypasses the model; clicking a token drafts text | Picking up, using, dropping and opening lack deterministic routes |
| Clear goal | Several opening quests; Chronicle/Evolve add more | No primary objective or engine-checked victory condition |
| Sound and UI | Audio manifest, file playback, procedural fallback, panels | Assess presentation and feedback quality before replacing these systems |

Reference anchors: shared/schema.ts:4, :54, :137, :151, :216;
shared/session.ts:27, :145, :208, :220, :234; shared/prompts.ts:9, :52;
server/index.ts:52, :199; client/src/main.ts:143, :226.

## Proposed scope and rules

Keep free text for intent, conversation and creative combinations. Both text and
direct controls resolve through the same gameplay commands and permission checks.
The model proposes supported actions and dialogue; the engine owns state transitions.
Deterministic means identical state, accepted command and random seed yield identical
results. It does not require identical model prose or guaranteed success on every action.

### Command vocabulary

| Layer | Commands | Authority and checks |
| --- | --- | --- |
| Player movement | move | Reachable path, bounds, collision, movement budget |
| Observation/social | inspect, talk | Visibility, reachable/valid target; model supplies dialogue |
| Inventory | pick_up, drop, use, equip | Object exists, one owner/location, range, capacity, compatible use |
| Fixtures | open, close, unlock | Reach, fixture state, matching key or learned capability |
| Conflict | attack, defend, flee | Target, range, resources, character commitments; engine resolves outcome |
| Learned abilities | ability | Registered ability ID with validated target, cost and effects |
| World authoring | spawn, destroy, transform, set_state | Model proposals restricted to allowed templates and typed transitions |

Spawn and destroy are privileged world operations, not unrestricted player powers.
A player can destroy a destructible object through a permitted attack or tool action.
Conjuring requires an earned ability, approved template, valid location and resource cost.
No arbitrary property patch or model-supplied damage bypasses the resolver.
The existing nine verbs remain visual output generated from accepted events.
For the first demo, implement only move, inspect, pick_up, drop, use, talk and unlock;
add conflict commands only if the agreed demonstration needs them. The first earned
capability extends a registered talk interaction, so it needs no separate ability command.

### Authoritative state

- Entity: stable ID, kind, template/art ID, typed state, supported interactions,
  and exactly one location: room/cell, owner/container, or destroyed.
- World: version, current room, entity registry, room terrain/connectivity,
  objective, event sequence and saved random state. Persist unvisited-room entities.
- Character: existing health/resources/stats plus equipment, registered abilities,
  commitments, structured behavioral evidence and derived tendencies.
- NPCs: the same entity identity, health and location model, plus relationships,
  relevant witnessed event IDs and dialogue state. No second independent HP copy.
- Objective: one primary goal, visible next step, explicit completion predicate,
  and active/completed/failed state. First-demo candidate: rescue a captive and leave.

Transfer the same key entity from cell to inventory on pickup; never create an
inventory copy while leaving its world counterpart. Omitted entities stay present.
Apply validated commands against a draft, then commit the full transaction. A failed
batch changes neither entities nor resources. Requests carry an ID and expected state
version: retrying a pickup must not duplicate it, and stale turns cannot undo walking.
Serialize direct commands, model turns and evolution through the same session boundary.
Evolution cannot replace room tokens or bypass these rules.

### Interaction and feedback

Click/tap a key to walk into reach and pick it up; show the action before committing.
Keyboard interaction uses a nearby-object prompt. Clicking a locked door uses a held
matching key, or explains the missing requirement. No typing is necessary for these.
Automatic pickup on walking over an item is an alternative to confirm, not assumed.

Show the primary goal immediately, contextual actions near the selected object,
inventory, and short action receipts. No automatic new side quests in the first demo;
Chronicle summarizes and Evolve updates consequences without adding objectives.
Tie pickup/unlock/success sounds to accepted events, never speculative model prose.
Polish contrast, selection, motion and audio levels before optional new art.

### Character development through behavior

Do not infer permanent morality from one kind action. Protecting someone and attacking
an aggressor can be consistent. Recommended rule: repeated, distinct resolved choices
develop a named trait or commitment; the engine then checks its specific restriction.
Example: Mercy prevents executing a surrendered person, while allowing defense.
Display its evidence and restriction. Offer an intentional story event for changing a
commitment if character change is part of the approved design.

For the first demo, use three distinct engine-recorded qualifying choices to reveal
one trait and one ability. This threshold is a proposed tuning value. Count each
resolved event once; repeated talk, failed commands, and the same reversible pickup/drop
must not farm progression. A model may name/describe a trait or suggest an ability;
it cannot grant arbitrary effect code or directly overwrite the character profile.
Novel narrative choices without a supported structured event have no automatic score
in this first version. This limits emergence but makes the demonstrated rule testable.

Proposed qualifying choices for the rescue scenario: return the keeper's stolen charm
with use (item_transferred to its recorded owner), give a carried potion to a wounded
scout with use (aid_given after health actually increases), and release the captive
with unlock (captive_released after the matching lock opens). Each event records actor,
beneficiary, object and originating command IDs and qualifies only once. Together these
reveal Merciful and enable Reassure, a talk option that lets the rescued guide lead the
group through a guarded exit. Its permission and resulting exit state are engine-owned;
the model writes the exchange. Verify the rescue-and-exit objective through these flags.
These choices and the capability are proposed content requiring scenario approval.

## Implementation sequence after approval

Paths below are proposed target paths in this checkout; the source is currently absent.
Confirm event-day rebuild versus an authorized source transfer before implementation.
The reference HANDOFF says pre-event product code cannot be the event submission;
this review does not independently verify competition rules.

1. Freeze the opening goal, interaction behavior and commitment policy. Write failing
   command/state tests. Files: shared/schema.ts, shared/commands.test.ts,
   shared/session.test.ts. Existing reference tests inform cases, not assumed permission
   to copy pre-event code.
2. Build the entity registry and command resolver; connect request validation,
   persistence, atomic transitions and direct interaction. Files: shared/commands.ts,
   shared/session.ts, server/index.ts, server/store.ts, client/src/api.ts.
3. Feed legal actions, relevant state and rejection reasons to the model; validate
   proposals and narrate committed outcomes. Files: shared/prompts.ts, server/astra.ts,
   shared/fake.ts. Buffer outcome narration until commit; use UI feedback while waiting.
   Include state and contract versions in cache keys so cached scenes cannot restore
   stale entities. Inject deterministic random seeds on the server for replay only.
4. Add the one goal, direct-object UI and one behavior-to-ability path. Files:
   shared/character-development.ts, client/src/main.ts, client/src/overworld.ts,
   client/src/ui.ts and the client stylesheet. Keep both text and buttons on the resolver.
5. Exercise the demo, polish existing audio and update README.md, SPEC.md,
   IMPLEMENTED.md and HANDOFF.md to describe observed behavior. Do not redesign art
   or add a general physics engine before the core loop passes.

Working chunks are committed separately after validation and approval of implementation;
pre-existing changes are excluded. Any new branch gets its own worktree immediately.

## Verification and adversarial cases

Success: the initial goal is visible; the player clicks a key, sees it leave the floor
and enter inventory, unlocks a door, makes qualifying choices, gains an explained
capability, completes the goal, and reloads into exactly that persisted state.

- Observe each behavior test fail before implementing its rule. Exercise unreachable
  movement, wrong keys, duplicate pickup, stale state versions, insufficient resources,
  unknown IDs, invalid spawn locations and partial-batch failure.
- Same starting state, commands and random seed reproduce state and event results.
  Save/load preserves entity locations, objective progress and behavioral evidence.
- For the limited demo, all three named choices emit their qualifying events exactly
  once; Reassure is unavailable before the threshold, works afterward, and persists.
  If combat is included, a kind act alone does not ban attacks; defense remains legal
  under Mercy; execution of a surrendered target is blocked through text and controls.
- Dropping/picking up repeatedly does not develop a trait. A denied action cannot earn
  progress, consume inventory, or trigger a success sound or narration.
- Attempt bypasses through model effects, raw scene token replacement, cached output,
  Chronicle and Evolve. Reject all authoritative mutations outside the command resolver.
- Test fresh save, empty inventory and unavailable model. Walking/pickup/unlock still
  work without a model; model-dependent dialogue fails visibly or uses marked fixtures.
- Once implemented, run focused tests, npm run typecheck, npm test, npm run build;
  exercise the built app on its actual serving URL. Inspect all changed screens in
  supported themes and at desktop and <=480px widths. Listen to sounds and mute behavior.
- Audit nearby TODO/FIXME/SOON placeholders; verify generated SVGs render as well as
  parse. No export round-trip is needed unless this work adds an export.

## Decisions needing review

1. Scope: design only, or implementation following approval?
2. Character constraints: scoped commitments with an explicit change path (recommended),
   or strict history-driven locks? Strict locks need named conditions and exceptions.
3. First goal and scenario: captive rescue is a proposal, not an accepted requirement.
4. Interaction: click-to-approach-and-pick-up (recommended), or pickup on walking over it?
5. Build location and source policy: rebuild in this checkout, or a permitted transfer
   from the reference repository?

Self-review: a bigger verb list alone would preserve arbitrary outcomes; a kindness
score alone would hide arbitrary restrictions; a state registry alone would still be
overwritten by scene/Evolve patches. The proposal therefore requires one resolver for
all mutations, visible commitment rules, and a small opening scenario. The bounded
first version intentionally cannot implement every imaginable object interaction.
