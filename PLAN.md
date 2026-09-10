# The DM Is Real — grounded play, a character that develops through choices

Status: revised design proposal. Akito requested design revision first; implementation
is not authorized by this document. Date: 2026-09-10.

## 1. Ownership, scope and promise

**The whole game concept and the gameplay ideas in the supplied September 10 notes
are Akito's. Austin typed those notes.** The specific scenario, thresholds and rule
choices below are recommendations for Akito's review, not claims about what he approved.

**Promise:** Explore a world with understandable rules. Solve its problems in your own
way: describe any action in your own words, and the AI selects or composes the closest
fitting engine actions. What you actually do shapes your character and its consequences.

Preserve free-text intent, generated art and dialogue, persistent consequences, and
character development through play. Add direct interaction, authoritative internal
primitives, explicit object/character state, and one goal visible from the beginning.
**There is no fixed player verb list.** The bounded vocabulary is an implementation
contract for the AI and engine, never a grammar the player must learn or a menu that
defines everything they can attempt. This is Akito’s explicit correction to the prior draft.
Remove unrestricted conjuring and automatic quest proliferation from the first version.

The model interprets arbitrary intent, maps it to internal primitives, writes narration
and character responses, and creates visual assets. The engine owns legality, costs,
outcomes and persistence.
Player creativity operates through the world's rules; typing a desired outcome cannot
make it true. Determinism means the same state, accepted commands and random seed produce
the same state changes. Model wording and interpretation need not be identical.

**Design work in this revision:** revise PLAN.md only; leave README.md, SPEC.md,
IMPLEMENTED.md and HANDOFF.md as reference-build documents until implementation changes
what exists. No game code, dependency changes or runtime claims are part of this revision.

## 2. What the source review established

This checkout contains PLAN.md, the six supplied documents/manifests, and no shared,
server or client source. Package manifests alone cannot run the game. Source was read
in the adjacent `../ai-game-engine-plan` reference repository during this conversation;
its reported test results and provider performance were not independently re-run.

The observed path is client input → client API → server movement/model turn → schema
validation → session reducer → saved session → client animation and reconciliation.

| Area | Existing reference mechanism | Change needed |
| --- | --- | --- |
| Commands | Nine visual verbs; model supplies effects | AI maps unrestricted player intent to internal primitives; engine validates their consequences |
| Objects | Room tokens plus a separate inventory array | One identity and one location/owner for each object |
| Persistence | Scene and Evolve can replace room tokens | Commands change entities; omitted entities remain unchanged |
| Direct controls | Walking bypasses the model; token clicks draft text | Click/keyboard pickup, use and unlock through the same resolver as text |
| Character | Stats, learned moves, conditions and reputation | Structured behavioral evidence and visible eligibility rules |
| Goals | Opening quests; Chronicle/Evolve add quests | One engine-checked objective with multiple solutions |
| Presentation | Overworld, battle stage, audio manifest and fallback | One overworld surface for this demo; contextual controls and event-linked feedback |

Source anchors in the adjacent reference: `shared/schema.ts:4`, `:20`, `:54`, `:216`;
`shared/session.ts:208`, `:233`, `:250`, `:287`; `server/index.ts:52`, `:199`;
`client/src/main.ts:143`, `:215`. These are source observations, not runtime verification.

## 3. The first playable experience

### One goal, two solutions

Proposed setting: a drowned cathedral, two connected rooms and an exit threshold.
Opening objective, visible before the first action: **Rescue Edda and leave the cathedral.**
No countdown in this demo. Exploration should not silently consume a rescue deadline.

| Place | Objects and people | Purpose |
| --- | --- | --- |
| Entrance hall | Visible cell key, potion, keeper's charm, portable vase, keeper, wounded scout | Direct object interaction, creative manipulation and optional acts of help |
| Crypt | Edda's locked cell, exit gate, manual winch, speaking tube to gatekeeper | Rescue; choose a physical or social exit |
| Outside threshold | Arrival marker | Check that player and Edda have both escaped |

Every fixture and item has typed physical properties and interaction rules. These
support combinations; they are not a list of phrases the player must use. Decorative
scenery is visually quieter than manipulable entities. Seed uses
this validated layout and interaction graph; generated names/art/dialogue can vary.
For this first scenario, generation cannot remove the key or invent an unsolvable lock.

Two routes share the rescue but diverge at the exit:

- **Physical route, always available to a living rescued Edda:** pick up the key,
  unlock her cell, use the winch to latch the exit gate open, and walk out with her.
  No trait, potion, charm return or model call is required. The winch stays latched.
- **Social route, earned through conduct:** return the keeper's charm, heal the scout,
  and release Edda. These distinct choices develop a compassionate commitment and
  a reassuring presence. Speak to the gatekeeper in any natural phrasing that
  conveys a compassionate appeal; the AI maps that intent to the earned Reassure rule.
  The player need not type “Reassure” or choose an ability button. The engine checks
  eligibility and opens the gate; the model voices the exchange.

The physical route is the guaranteed mechanical solution. The social route demonstrates
that behavior creates a new option; it is not a required kindness checklist. Optional
help never appears as three new quests. Hints explain nearby affordances without
spoiling the social ability before it emerges.

Edda follows deterministically after release: follow the player's accepted path through
open passages, stop at blocked passages, and use the same room-transition checks.
If attacked while alive, Edda flees one reachable step, becomes afraid and pauses
following; fear takes precedence over following. After release, the ordinary registered
escort interaction restores following when adjacent, inferred from an offer to help
or available as a contextual shortcut. Its direct shortcut works without a model,
grants no care evidence and does not erase the attack from history. This also handles
a frightened captive released later. The exit crossing places both outside when she
is alive, released and following within one cell. Otherwise show “Edda is not with you yet.” Completion requires both outside.
Dead Edda is an explicit failed objective with restart available, never a silent softlock.

### A normal interaction

Hover/focus on the key shows “Pick up.” Click/tap it or press E while it is the selected
nearby target: walk to a reachable adjacent cell, then transfer it to inventory. The key
vanishes from the floor, appears in the pack, and a short pickup sound plays.
Click the cell lock: use the matching carried key, open the cell and update the objective
to “Leave with Edda.” The key is not consumed. Neither action needs typed narration.

The approach and interaction are separate commands. If the target changes while walking,
arrival rechecks it; a failed interaction keeps the completed walk but consumes no item.
Walking over an item does not automatically collect it. Destructive or hostile actions
require explicit harmful intent, such as typing an action or deliberately selecting a
contextual shortcut; they are never the default click on a person.

## 4. Free-form player intent → internal engine primitives

The player can type anything: “hurl the vase,” “slide the key under the gate,” “distract
him by juggling,” or “tell her we can still get out together.” The AI identifies the
intended entities, motion and interaction, then selects or composes the best fitting
primitives. An unfamiliar verb is never itself a reason to reject an action.

Direct manipulation remains a convenience: clicking a key can collect it immediately.
It does not define the limits of free-text play. Both paths reach the same world rules.
Character history, actual possessions, reach and physical properties constrain the
outcome; wording is unrestricted. Accepting an attempt does not guarantee its success.

### Proposed internal vocabulary — never a player command list

| Internal primitive | Engine meaning | Different player intentions it can represent |
| --- | --- | --- |
| `move` | Move an existing entity along a validated path/trajectory | Walk, throw, slide, shove, carry along, lunge |
| `transfer` | Change an object's holder/container or ground location | Pick up, hand over, drop, take out, put away |
| `spawn` | Create an allowed entity with a new ID and valid location | An authorized conjuration, a newly revealed object, debris from breakage |
| `destroy` | Remove an entity from active play under a valid rule | Consume a potion, break a fragile prop, extinguish a represented flame |
| `transform` | Apply a permitted state/form transition | Open a lock, heal someone, change stance, alter appearance |
| `emote` | Speech, expression or a gesture without invented physical consequences | Plead, bluff, joke, reassure, mime, sing |

Names and parameter shapes are an internal design proposal. `move` is deliberately
general: a thrown vase and a walking character use different motion parameters rather
than requiring “throw” to be a new player command. Composed actions can use several
primitives. Existing animation presets may implement these trajectories; their names
are not an additional player vocabulary.

Every proposal carries actor/target IDs, relevant intent, primitive parameters and the
world rule it relies on. The resolver checks the composition against current state.
`transform` is not an arbitrary property patch, and `destroy` cannot bypass ownership,
HP or character restrictions. The model cannot submit a desired damage number, declare
a target hostile, grant an ability or complete a quest as an unchecked effect.

Typed world rules derive allowed consequences from properties and context: portable,
fragile, solid, locked, opens-lock-ID, healing amount, surrendered, hostile, and so on.
For the initial demo, implement a small set of such rules with reusable combinations:
movement and landing, possession transfer, fragile collision, key/lock, healing,
fixture activation, basic harm, following, and conversation eligibility. This is a
bounded simulation, not a finite list of player utterances.

### Example: “I throw the vase against the wall”

1. AI resolves the existing vase and wall; if the vase is within reach, it can compose
   taking hold and launching it. It never silently creates another vase.
2. AI proposes `move(vase, destination, trajectory: arc)` with a launch context. Engine
   verifies possession/reach, throw range, collision, and character constraints.
3. At the first collision or legal landing cell, the engine resolves the vase's fragile
   property: break it through `destroy` (and permitted debris if included), or keep the
   same entity on legal ground if it survives. On obstruction, a surviving object lands
   in the last reachable ground cell before the obstruction, never inside a solid wall.
   If no legal landing exists, reject the whole composition before launch. Inventory
   loses that same vase ID only when the action commits.
4. Animation moves the vase along the accepted arc. Narration describes the resolved result.

**Throwing is a use of move.** It still needs collision/landing and possession semantics;
a visual arc alone would leave the vase in inventory or let it pass through the wall.
There is no need to register every synonym: hurl, toss, lob and fling can map to this
same operation. Sliding changes the trajectory; giving changes the destination/ownership.

Proposed demo tuning: normal reach is one orthogonal cell; throw range is three cells
with a grid-checked trajectory stopping at the first solid obstruction. The renderer's
arc is visual, not an exemption from collision. A basic impact deals 2 HP under the
registered harm rule, noncombatants have maximum 6 HP, the scout starts at 2 HP, and a
potion heals 4 HP up to the maximum and is consumed only when healing succeeds. The
portable vase is fragile and breaks on a solid collision. Required puzzle fixtures
are protected; the key is reusable and cannot land in an unreachable cell. Inventory
has no capacity limit. Characters at zero HP cannot act or follow. These are proposed
fixture values, not model decisions or a claim of a general physics engine.

Basic harm is resolved on the overworld; no separate battle screen or initiative
system. Noncombatants flee one reachable step if able and become afraid. The engine
applies that rule rather than accepting model-supplied retaliatory damage. Ordinary
walking, pickup, valid key use and the winch succeed when their checks pass. If chance
is later added, only the engine supplies seeded rolls and records them in events.

### Best-fit interpretation, ambiguity and limits

- Preserve what the player is trying to accomplish. Interpret “juggle to distract” as
  a bounded object-motion sequence plus an expressive/social interaction; do not
  silently turn it into an attack because both involve moving an object.
- Compose existing primitives for a new combination before concluding it is unsupported.
  The two written rescue routes are guaranteed examples, not an exhaustive solution list.
  Any other valid composition satisfying the same objective predicates also counts.
- If target or intent is materially ambiguous, ask a short in-world question before
  changing state. An approximation that would change the goal or cause unexpected harm
  also needs clarification; choosing an equivalent animation does not.
- If a desired physical effect has no rule, the AI can narrate the supported attempt
  without fabricating that effect. Explain the limit in-world, such as a gate being
  too heavy to lift; do not answer with a programming error or a list of legal verbs.
- “I summon the exit key” remains valid input. Without a conjuring capability the
  character may attempt it and fail; no key is spawned. Unlimited input is not god mode.
- A reassuring appeal maps to the earned social rule regardless of exact phrasing.
  Before the capability develops, the model can still voice the conversation without
  automatically granting its gate-opening effect.

All primitives within one composed action validate against a draft and commit together.
If a proposed destructive consequence conflicts with Mercy, reject the harmful
composition before applying any part; do not drop the item or spend resources first.
Already completed approach-walking is separate, as described in §3. Successful outcomes
emit state-derived events that drive character evidence, audio and narration.

## 5. State the engine remembers

| Record | Minimum authoritative fields |
| --- | --- |
| World | ID, schema/state version, current room, terrain/connections, entity registry, objective, event sequence, random state if used |
| Entity | Stable ID, template/kind, art ID, typed properties/state, physical affordances, exactly one location; optional immutable rightful-owner ID |
| Location | Room and cell, or owner/container ID, or destroyed; never two simultaneously |
| Person | Entity ID, HP/max HP, stance, conditions, capabilities, relationships, relevant witnessed event IDs |
| Player development | Qualifying evidence IDs, derived tendencies, active commitment IDs, earned ability IDs and provenance |
| Objective | Primary goal, next-step ID, active/completed/failed, explicit predicates |
| Event | Sequence and command ID, actor/targets, before/after facts, semantic tags, witnesses, random result if any |

Example serialized entity before pickup:

```json
{"id":"cell_key","kind":"item","template":"iron_key","art_id":"key_iron",
 "location":{"room":"hall","x":3,"y":4},
 "state":{"opens":"edda_cell"},"properties":{"portable":true,"fragile":false}}
```

Coordinates are zero-based grid cells; fixture bounds and reachable placements are
validated at setup. Example: `cell_key` starts at that hall cell. After pickup its location is
`owner: player`; its former cell has no key. After drop it is back in a room/cell.
After reload it has the same identity and location. An omitted entity in model output
stays where it is. Rooms outside the current view retain their state.

One entity record owns an NPC's HP; portraits, map tokens and dialogue read it. Inventory
and equipment views are derived from current possession, not independently mutable copies.
The charm's `rightful_owner_id` identifies the keeper independently of `location.owner`;
pickup changes possession but never the fact used to validate its return. Mechanical
conditions are typed; evocative labels can be display text without inventing mechanics.
A saved event log is not a substitute for the current structured world state.

All mutations, including world evolution, use the same session boundary. Validate a
command against a draft, then commit its entire state change and events together. Denial
changes neither resources nor developmental evidence. Requests carry a command ID and
expected state version: duplicates return the original result; stale requests revalidate
or reject, never overwrite newer walking or inventory changes.

Persist the committed state before reporting durable success. Model responses and caches
carry the relevant state/contract version and are revalidated before use. Reload preserves
ownership, goal progress, follower state, commitments and ability provenance. Chronicle
summarizes; Evolve proposes supported consequences. Neither replaces whole room contents,
resurrects removed objects, grants unrestricted abilities, or adds primary objectives.

## 6. How actions develop the character

### Evidence → tendency → commitment and capability

Development follows resolved choices, not a selected class or spendable skill points.
The model explains the emerging character using actual evidence; mechanical changes come
from a bounded, inspectable rule catalog. This first version does not promise that the
model can invent arbitrary new mechanics safely.

Proposed demonstration rule: **three distinct acts of care** reveal a commitment called
Merciful and the ability Reassure. Count only these scenario events, each once:

1. Return the unique charm to its recorded owner (`property_returned`).
2. Give the potion to the wounded scout and actually increase HP (`aid_given`).
3. Open Edda's cell and release her (`captive_released`).

The first two choices are optional; completion by the physical route needs no commitment.
A single action never determines the character's entire morality. Repeated talk, refused
commands, repeated pickup/drop and healing injury inflicted by the player cannot farm
care evidence. A prior deliberate attack on a nonhostile person prevents this demo's
care commitment from forming; show that fact rather than letting three errands erase it.
Redemption requires a designed story rule and is deferred, not silently invented by prose.

Reveal: “You returned what was stolen, tended the injured, and freed a prisoner.”
Then show both consequences together:

- **Developed capability — Reassure:** persuade the gatekeeper to open the exit through a registered
  compassionate appeal. One application; repeating it cannot grant rewards again.
- **Commitment — Mercy:** you cannot deliberately harm a nonhostile or surrendered person.
  Defense against a hostile attacker remains allowed. “Kind” does not mean “incapable of combat.”

The restriction is a recommendation for review. It is narrower than a blanket kindness
score disabling all violence. Display the forming commitment and its rule before the
third qualifying choice; after it forms, an attempted harmful action receives an
in-character explanation. It never disables free-text input or requires choosing
from a legal-verb list. The player does not choose a skill-tree node or buy a trait.

Apply commitments to the composition’s resolved effects, not the player’s wording:
a thrown object, a shove, a harmful item or a destroy request cannot bypass Mercy by
being called “move.” The engine derives affected targets and harm from the proposed
trajectory/rules and current world state. It does not trust a harmless label supplied
by the model. Narrative intent comes from AI interpretation; materially ambiguous harm
is clarified before execution, not certified as safe by an unverified model label.

For the first demo, an acquired commitment remains for that run. Deliberately breaking
or evolving it is later narrative content; until designed, no hidden “break oath” loophole.
Future tendencies can include resourcefulness, intimidation and deception, but are not
advertised as implemented. The compassionate example demonstrates the mechanism, not a
claim that kindness is the only valid way to play.

## 7. Model turn and presentation

### Authoritative turn flow

1. Accept arbitrary free text. The model interprets intent using world state, character
   history, entity properties and internal primitive definitions, then proposes a fitting
   composition. Direct object controls can produce the equivalent proposal immediately.
2. Resolver validates the composition, derives consequences from world rules, records
   evidence, and commits. No extra player-verb allowlist is checked.
3. UI animates committed events and updates the objective/inventory immediately.
4. The model narrates those outcomes and supplies dialogue. World-changing dialogue
   effects must resolve before the narration describes their success.

Outcome narration begins after validation. A loading cue may appear earlier, but the DM
must not announce a pickup, death or opened gate that the engine later rejects. Reject
unsupported world proposals with structured reasons available to the next interpretation.
Use short deterministic action receipts when the model is unavailable; keep supported
movement, direct interactions, commitment rules and both exit routes functional when the model
provider is unavailable, using deterministic dialogue receipts. This requires the local
application server to remain running; browser-to-server disconnection is a separate
unavailable state, with actions disabled and a reconnect message, not local speculative play.
Arbitrary text interpretation requires the model; when it is unavailable, preserve the
input for retry and explain the outage. Do not substitute a keyword matcher and claim
that creative text play has been verified offline.

The model sees current room entities, held items, relevant NPC memories, the objective,
character commitments and a bounded history summary. The server can select referenced
state from other rooms. Do not depend on the model remembering an omitted object's
coordinates from a long transcript, or expose hidden NPC knowledge in player inspection.

### One clear screen

- Top: primary goal and current step, persistent throughout play.
- Center: readable grid, player/NPCs/items, selected target and reachable interaction cue.
- Bottom: prominent unrestricted free-text input, concise narration, and optional
  contextual shortcuts. No fixed verb bar or exhaustive action menu.
- Side panel/drawer: inventory and “Who you are becoming,” with evidence and consequences.

Keyboard: arrows/WASD move when text input is not focused; E uses the selected nearby
interaction. Multiple nearby objects require selection instead of silently choosing one.
Click/tap uses the same semantics. Mobile places panels in drawers and keeps controls
within a <=480px viewport. Focus, target cues and disabled-action reasons must be readable.

Pickup, unlock, rejection, trait reveal and objective completion have distinct short
sounds tied to committed events. Speech takes priority over music; mute covers speech,
SFX and ambience. Optional art polish uses a consistent palette, silhouettes and strong
floor/wall value contrast. Generated art cannot alter collision or item capabilities.
No new art-generation dependency is required to prove the game loop.

## 8. Delivery order after design approval

This is an implementation outline, not authorization to start writing product code.
Target files do not yet exist in this checkout. Before implementation, settle the source
policy: event-day rebuild versus permitted reuse. HANDOFF.md describes restrictions on
pre-event product code; this design review did not independently verify event rules.

| Order | Deliverable | Proposed files | Success case |
| --- | --- | --- | --- |
| 1 | Scenario fixture, entities, internal primitives and composition resolver | `shared/schema.ts`, `shared/scenario.ts`, `shared/commands.ts`, their tests | Physical rescue route works with no model |
| 2 | Persistence and request boundary | `shared/session.ts`, `server/index.ts`, `server/store.ts`, API tests | Retry/reload cannot duplicate or restore picked-up items |
| 3 | Direct play and objective | `client/src/api.ts`, `main.ts`, `overworld.ts`, `ui.ts`, stylesheet | Click key → unlock → follower → winch → both escape |
| 4 | Character development | `shared/character-development.ts`, scenario rules/tests, character panel | Optional care opens social route and enforces Mercy |
| 5 | Free-form interpretation, dialogue and art | `shared/prompts.ts`, `server/astra.ts`, `shared/fake.ts` | Novel phrasing/combinations map to fitting primitives; narration matches committed events |
| 6 | Presentation and observed-behavior docs | Audio/UI files, README/SPEC/IMPLEMENTED/HANDOFF | Built app is readable, audible, playable and accurately described |

Use one overworld renderer. Defer freeform world generation, extra quests, broader combat,
crafting, general physics, companion personalities, commitment reversal and optional new
art. Edda's simple following is necessary rescue behavior, not a general companion system.
Keep implementation chunks separately validated and committed; any newly created branch
gets its own worktree. Preserve the pre-existing changes in this checkout.

## 9. Verification and design challenge

This revision is reviewed for scenario reachability and consistency of the written
rules, including an independent design review. No runtime tests can validate an unbuilt design.
Implementation must first observe the following behavior tests fail, then make them pass:

- **Free-form interpretation:** with the actual model, test held-out phrasings and
  combinations: “hurl the vase,” “slide the key,” “juggle to distract,” and an indirect
  compassionate appeal. Judge intended entities, semantic equivalence, legal effects
  and observed outcomes; keyword fixtures cannot verify this capability. Record the
  model’s accepted composition so replay can test deterministic execution separately.
- **Throwing:** one vase leaves inventory, traverses the accepted path and breaks at
  the first wall collision; throwing at a protected person is stopped by Mercy before
  any transfer or movement. Throw the reusable key at a wall: it survives in the last
  reachable ground cell, remains retrievable, and is not duplicated. “Move” must not
  conceal a harmful impact.
- **Physical route:** fresh character, no kindness evidence, model provider disabled, local server running → pick up key,
  unlock, latch winch, escort Edda outside → objective complete.
- **Social route:** three distinct qualifying choices → named evidence, Reassure and Mercy;
  express a compassionate appeal at tube in arbitrary phrasing → map to Reassure →
  gate opens → both escape without using winch. Its contextual shortcut works without
  the model; arbitrary phrasing is verified only with the model available.
- **Identity boundary:** one kind act does not disable attacks; formed Mercy blocks harm
  to a nonhostile/surrendered person through every supported command, permits attacks
  on hostiles, and survives reload. Player-caused injury cannot generate care evidence.
- **Ownership:** key disappears from floor on pickup; same ID reappears on legal drop;
  duplicate request, room revisit, cached narration and Evolve cannot recreate it.
- **Failure:** wrong key, unreachable object, stale request and unsupported effect produce
  reasons without consuming resources or earning evidence. A completed approach walk
  remains if the interaction subsequently fails. Edda's death visibly fails the goal.
- **Authority:** text cannot conjure the key, relabel a target hostile, grant Reassure,
  complete the goal, or apply damage directly. Failed proposals never receive success audio.
- **Recovery:** drop the key in each permitted location; it remains retrievable. Leave Edda
  behind a closed passage; return and reunite. Attack her without killing her, offer escort,
  and finish via the physical route without receiving care credit. Save/load at each route
  step reproduces it. A disconnected browser shows unavailable status without mutation.

Once built, run focused tests, typecheck, the full suite and production build; exercise
both routes on the built app's actual URL. Inspect every changed screen in supported
themes and at desktop/mobile widths; listen to effects, speech balance and mute. Audit
TODO/FIXME/SOON placeholders and render generated SVGs. Export round-trip is irrelevant
unless an export is added. Provider functionality/latency must be measured on the actual
required runtime before making demo performance claims.

Self-review challenges addressed:

- Restricting players to internal verbs changes Akito’s concept → free-form input;
  the AI selects/composes the best fitting primitives, with no player verb allowlist.
- A longer primitive list can leave outcomes arbitrary → engine rules own every mutation.
- The original rescue example forced kindness to finish → independent winch route added.
- A kindness score can forbid morally consistent defense → scoped, visible commitment.
- Three errands can masquerade as unrestricted emergent character development → explicitly
  bounded evidence catalog for the demo, generated explanation, no arbitrary mechanical invention.
- Prose-first streaming can tell a false outcome → committed receipts before outcome narration.
- Optional model/world generation can remove the only key → validated scenario topology,
  protected essential fixtures and engine-controlled spawning.

## 10. Review points for Akito

Akito has clarified that input is unrestricted and the AI maps it to internal actions.
That boundary is settled; the following recommendations remain open to change:

1. Opening scenario: rescue Edda in the cathedral, physical winch route plus earned social route.
2. Character rule: visible Mercy commitment after three distinct care choices, blocking harm
   to nonhostile/surrendered people while allowing defense; reversal deferred.
3. Interaction: click/E to approach and act, with deliberate targeting for harmful actions.

Approving this proposal would settle the game design. Implementation is a separate next step.
