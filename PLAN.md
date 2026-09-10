# The DM Is Real — a shared world of developing characters

Date: 2026-09-10.
Status: design updated after Akito accepted the red-team direction and the recommendation
to prove the core in one room. This document describes the design and next proof milestone;
no prototype, model measurement or playtest has been completed in this checkout.

## 1. Settled direction and ownership

**The whole game concept and the supplied gameplay ideas are Akito's. Austin typed the
original notes.** Akito subsequently clarified unrestricted player input and added agent
control of NPCs with the same kinds of state and character development as the player.
The concrete room, parameter values and mechanisms below are proposed implementation
choices within that accepted direction, not quotations of his requirements.

The player describes any action. The AI interprets the intended interaction and selects
or composes internal primitives. There is no player verb allowlist. Throwing can use
move; the player need not know that or invoke a named ability to use an earned capability.
Direct clicking, walking and contextual shortcuts remain conveniences.

**Every character has a state, a history and reasons to act.** The player controls their
character's intent. An NPC controller chooses the other characters' intents from their
conditions, perceptions, goals and histories. Reusable world rules produce consequences;
those consequences alter what characters perceive, how they act and who they become.

**Past conduct can create future situations.** Akito specifies that repeated witnessed
cheating can later lead to accusations or disadvantages toward the goal. His experiential
references are Undertale and Detroit: Become Human; the intended extension is character,
consequence and scenario variation across runs. This is a design ambition, not a verified
claim of novelty, infinite content or implemented replayability.

Akito accepted these responses to the red team:

- Reusable interaction rules must preserve intended effects, not just animate motion.
- Development must recognize contextual conduct beyond a fixed list of errands.
- Observed tendencies, capabilities and binding commitments must be distinguished.
- Different approaches need meaningful consequences; remove the redundant free-winch payoff.
- Interpretation quality must be tested separately from deterministic execution.
- Prove novel intent, development and different histories in one room before expanding.

Unrestricted intent is not guaranteed success. World and character constraints apply to
outcomes, not permissible wording. A deterministic engine does not make the model's
interpretation or NPC decision deterministic: replay stores those decisions explicitly.

## 2. What exists and what this revision supersedes

This checkout has design/reference documents and package manifests, but no game source.
Earlier source inspection covered adjacent `../ai-game-engine-plan`: client input → API
→ server model/movement route → schema validation → session reducer → persistence → render.
Observed gaps include disconnected inventory/tokens, room-token replacement, model-chosen
effects, and direct token clicks that draft text. No reference runtime claims were rerun.

Source anchors there: `shared/schema.ts:20`, `:54`, `:216`; `shared/session.ts:208`,
`:233`, `:250`, `:287`; `server/index.ts:52`, `:199`; `client/src/main.ts:143`, `:215`.

RED_TEAM.md at 3ba7352 reviews the previous PLAN.md at a030b61. Keep it as the historical
critique, not as an assertion that the following old mechanics remain current:

| Previous proposal | Revised design |
| --- | --- |
| Exactly charm + potion + release grants Mercy/Reassure | Contextual, evidence-backed development across different acts |
| Inferred kindness automatically creates a permanent prohibition | Tendencies influence behavior; specific commitments have explicit scope and a consequential change path |
| Noncombatants always flee one step when attacked | Controller selects NPC behavior from shared state, perceptions and goals |
| Earned social route opens the same free winch gate | Approaches differ in observable cost, alarm, permission or relationships |
| Model integration follows most of the ordinary game build | Actual-model intent and NPC decision loop are the first proof |
| Two-room cathedral rescue first | One-room interaction/development proof first; larger rescue is deferred |

README.md, SPEC.md, IMPLEMENTED.md and HANDOFF.md remain reference-build documents.
Only this current design changes here; their historical implementation inventory is
not rewritten to imply these new systems exist.

## 3. Shared actor model

Player and NPCs use the same actor schema and world rules. `controller: player | npc`
selects who proposes intent; it does not grant extra physics permissions.

| Layer | Fields and role | Update authority |
| --- | --- | --- |
| Physical state | Entity ID/location, HP/resources, posture, awake/asleep, fatigue, held objects | Engine rules from accepted actions and simulation ticks |
| Attention and condition | Focus target/location, facing, alertness, temporary distraction, fear and other typed conditions with expiry | Validated perception rules and accepted choices; no arbitrary free-text mechanical flags |
| Knowledge and beliefs | Perceived events, known locations, belief with evidence/source and uncertainty | Server-filtered observations; grounded controller interpretations |
| Goals | Current task, priorities, intended action/plan | NPC controller; player supplies their own goals/intent |
| Relationships | Trust/fear/gratitude, obligations and disputed claims toward identified actors with evidence | Grounded proposals from events known to that actor, validated and bounded |
| Development | Behavioral evidence, tendencies, practiced capabilities, commitments and revisions | Shared development pipeline for both player and NPC |

Sleeping is a physical condition; being tired can make rest more attractive and alter
explicitly defined perception/action limits. Distracted is temporary attention directed
away from a task, not permanent stupidity. Distrust is a relationship; vigilance can
be a learned tendency. None should overwrite the others as one generic mood string.
States expire or change on simulation ticks/events, not elapsed API response time.

Shared state does not mean shared knowledge. The player sees observable cues (a guard
yawns, faces a sound, shuts their eyes), not every numeric condition or private memory.
NPCs do not read the player's thoughts, private character sheet or unwitnessed events.
A noise heard from behind a wall reveals a location/intensity, not automatically who
made it. An NPC who hears a report remembers it as a report, not direct observation.

Example actor view for the NPC controller:

```json
{
  "actor_id": "guard",
  "state_version": 18,
  "self": {"wakefulness":"awake", "fatigue":70, "focus":"gate"},
  "goal": {"task":"watch_gate"},
  "observations": [
    {"id":"obs_42", "kind":"noise_heard", "location":{"x":7,"y":2}, "intensity":"loud"}
  ],
  "relationships": [],
  "memories": [],
  "available_entities": ["gate", "bench"],
  "constraints": {"max_actions":1}
}
```

The example's fatigue value is illustrative tuning. The controller may investigate
the noise location without knowing the hidden vase ID or perpetrator. The server still
checks path, reach, capacity and whether the selected target is knowable.

## 4. Intent, primitives and reusable interaction rules

### Internal operations

The AI first represents desired interaction, targets and constraints, then proposes
an internal composition. Names are an engine contract, never a fixed player menu.

| Primitive | Meaning | Possible uses |
| --- | --- | --- |
| `move` | Change an existing entity's position along a validated trajectory | Walk, toss, slide, shove, lunge |
| `transfer` | Change holder/container/ground location | Pick up, give, catch, drop |
| `spawn` | Create a permitted entity with a stable ID | Scenario setup, authorized conjuring, debris |
| `destroy` | Remove an entity under a valid lifecycle rule | Consume, break, extinguish a represented flame |
| `transform` | Apply a permitted typed transition | Heal, unlock, wake, change posture |
| `emote` | Speech/expression/gesture, emitting perceivable signals | Plead, bluff, reassure, threaten, joke |

`transform` and `destroy` cannot directly grant success, change a target's morality or
bypass HP/ownership. The engine derives side effects from properties and registered rules.
Creating an image does not create a gameplay entity or invent mechanics.

### Rule families for the one-room proof

| Rule | Reusable inputs | Consequences |
| --- | --- | --- |
| Movement and passage | Entity size, terrain, opening clearance, path, reach | Position/landing; small objects can pass a gap that blocks actors |
| Possession and contact | Holder, portability, reach, recipient consent/readiness | Same entity transfers; handoff is not automatically an impact attack |
| Impact and material | Trajectory, collision, fragility, contact type | Breakage, bounded injury if applicable, noise event |
| Perception | Event intensity/location, hearing threshold, occlusion, wakefulness, facing | Actor-specific observation; loud enough sound can wake a sleeper |
| Attention and access | Focus/facing, physical occupancy, perception, task | Looking elsewhere changes what is seen; leaving a post changes access |
| Rest and exertion | Posture, rest/exertion action, fatigue, wakefulness | Fatigue change, rest priority/perception constraints |
| Social exchange | Heard content, relationship, own goal and memory | Controller chooses response; resulting permission/movement is an accepted NPC action |
| Support and obstruction | Object dimensions, placement, fixture geometry | Brace a gate or obstruct passage; affect actual traversal, not decorative pose |

Use the smallest subset needed by the test room; every included relationship must have
at least two uses or contexts. Do not write a handler for “throw vase to distract guard.”
Impact can make noise for any appropriate object; hearing creates observations for any
actor in range; the controller chooses a response; the same access rules apply afterward.

A toss toward a ready recipient uses a validated catch/transfer rule. A collision with
an unready person is a different physical outcome, not something decided by whether the
player happened to say “throw” or “give.” Clarify if an approximation changes the goal
or adds unexpected harm. Different animation parameters alone need no clarification.

Surviving thrown objects land on legal ground, before a blocking surface. If no legal
landing exists, reject before launch. All successful transfers preserve one entity ID.
Required test items remain retrievable; any fixture protection is visible and declared,
not introduced retroactively because a creative solution would spoil the scripted route.

### Example: distract the guard

“I smash the vase behind the guard so we can pass” has two stages, not one magic effect:

1. Interpret a launch/breakage attempt and the intended distraction. Resolve ownership,
   trajectory and collision; commit the vase's actual location/breakage and noise.
2. Determine which actors perceive that noise. The guard receives a heard-location
   observation if audible; a sleeping guard may instead wake if the threshold is met.
3. The NPC controller chooses a response using condition, duty, curiosity, relationship
   and relevant memories. It might look toward the sound, investigate, stay at the gate
   and call out, or ask another present actor to check. No nonexistent helper is spawned.
4. Resolve that NPC choice. Looking away changes facing; walking away changes occupancy;
   both have defined effects on observation/access. “Distracted” in narration alone does
   not open a gate or let someone walk through the guard's occupied cell.
5. The player can exploit the resulting state on the next action. Success is possible,
   not guaranteed; a vigilant guard may recognize a repeated diversion and stay put.

A multi-step sentence becomes a bounded plan with reaction opportunities between
meaningful actions. It must not give the player unlimited turns before NPCs can react.
If passage becomes invalid, pause the remaining plan rather than force its success.

## 5. NPC control and simulation order

“NPC agent” is a logical controller, not a separate unbounded autonomous process for
every inhabitant. For the proof, activate at most two NPCs in the room and give each
an actor-specific view. The controller chooses intentions; the engine executes them.
Player actions and NPC actions use the same primitives, costs and constraints.

Proposed turn schedule:

1. Interpret the player's intent against the current version. Inspection/UI selection
   is free; an action that changes the world or intentionally waits consumes one tick.
2. Resolve one bounded player action atomically. Taking hold and throwing an adjacent
   object can be one composition; walking across the room first is a separate action.
   Apply environmental consequences and publish observable events.
3. Build each eligible NPC's observation view from the resulting state. A sleeper who
   was not awakened has no active action; waking uses this reaction slot, so investigation
   cannot also occur in the same slot. Temporary states expose their remaining duration.
4. Request one bounded NPC intention per eligible actor. Actor-specific model contexts
   exclude other actors' private state; independent requests can run in parallel. Each
   output cites observations/memories it relies on and carries its snapshot version.
5. Validate and resolve those proposals in a stable actor order. Each belongs to a
   reaction-batch ID as well as its observation snapshot. An earlier NPC action changing
   the world version does not automatically invalidate the next proposal in that same
   batch; revalidate its preconditions against current state. No two actors occupy an
   exclusive cell, take the same item or use a removed target. An obsolete batch or
   failed precondition makes the proposal a no-op for its slot, without unlimited retries.
   Physical revalidation does not give the actor new hidden knowledge or retarget an
   action to an unseen location. Recompute observations from accepted effects.
6. Update tick-based durations, rest/exertion and the next decision inputs; record the
   full sequence. Commit objective checks, grounded development proposals and display
   narration only for accepted outcomes. Await the player's next intention.

Each action is atomic, not the entire tick including remote calls. If an NPC request
fails after the player acts, the player's committed action remains. Never roll back a
throw because dialogue timed out. A failed NPC call uses a marked deterministic hold/rest
fallback if legal; it does not claim to demonstrate adaptive NPC behavior. Narrative
receipts can display while later controller/narration work is pending.

No fatigue or alarm penalties accrue while waiting for the provider. Long walking uses
engine steps with the same reaction cadence as typed movement, so clicks cannot bypass
NPCs. A focus change made during the guard’s reaction at tick t persists through the
player’s next action at t+1; the guard can reconsider it during its next reaction. A
new temporary condition is not decremented in the slot that creates it. Expiry records
the owning actor and phase, so the distraction cannot disappear before the player can
act on it. Rest/waking thresholds and action budgets are proposed tuning constants to
freeze with the proof fixtures and their tests.

NPC intention is a proposal, not an omniscient adjudication. A guard can suspect a ruse
from memories of earlier noises, but cannot identify an unseen thrower as fact. An NPC
can choose aggression within its goals and commitments; the engine checks the action's
actual effects. Physical/legal validity and whether the choice is plausible for that
character are separate verification targets.

## 6. Development for every character

The shared development pipeline reads resolved events. It does not depend on three
specific item/quest IDs and does not train model weights during play. Persistent memory,
evidence and bounded capability/state updates are what “develops” means here.

Separate four effects:

- **Temporary state:** tired, asleep, attentive to a sound, afraid. Changes immediate action.
- **Relationship:** trust or fear toward a known person. Changes how that person is treated.
- **Tendency/capability:** recurring patterns and practiced approaches that generalize.
- **Commitment:** a specific established promise with a stated scope, not an inferred oath
  automatically attached to every helpful character.

The model proposes an interpretation citing event IDs, observed context, beneficiaries,
costs, repeated behavior and counterevidence. The engine validates that the events exist,
are available to that actor and have not already been counted; bounds changes and permits
only registered capabilities. Valid IDs establish grounding, not correctness of the
interpretation. Test the judgment separately, and show uncertainty when motive is unclear.

Examples of reusable evidence include reducing another person's danger, returning their
property, sacrificing a resource to help, practicing a successful technique, repeatedly
investigating false alarms, or responding to a witnessed betrayal. A failed attempt may
inform intent if clearly recorded, but cannot claim a benefit that never occurred or earn
an outcome-gated capability. Self-created harm followed by repair does not farm benevolence;
repeating a reversible action or the same event ID cannot farm growth.

Player example: healing someone and shielding someone from a supported hazard can both
provide evidence of care. A more trusted/reassuring manner may become available without
forcing the player to type a move name. Neither action proves a universal moral identity.
NPC example: a guard who repeatedly investigates noises and finds no threat can become
more cautious about leaving the post. A guard who is helped may trust the helper if the
act was perceived; an unwitnessed act cannot silently change that personal relationship.
Changes can come from both an actor's own conduct and what they experience from others.

For the proof, use a small capability catalog and bounded evidence updates, with explicit
fixture thresholds rather than unrestricted model-authored powers. The catalog is not
an item-specific progression recipe. Demonstrate two materially different supported acts
contributing to a comparable tendency, and one context counterexample that should not.
Exact thresholds are tuning decisions; no numerical threshold is claimed as validated.

### Coherence without a permanent imposed identity

A tendency changes likely responses, costs or eligibility under an explained rule;
it does not silently turn one act of help into a lifetime prohibition. A particular
commitment can constrain conflicting conduct. Proposed change path: a deliberate choice
to break that established promise first makes the conflict and consequences explicit,
then records the breach, revises the commitment/capability and applies consequences to
witnessed relationships. It is not an invisible “ignore character” switch.

The player supplies that deliberate choice in ordinary language. NPC controllers can
also face and choose between conflicting goals/commitments; their breach is recorded
under the same rules, rather than requiring the human to authorize NPC decisions.
Supported indirect harm is checked across the composition; calling an attack “move”
cannot bypass a commitment. Newly inferred tendencies should not cause irreversible
restrictions while their interpretation is still uncertain.

### Witnessed conduct → delayed consequences → new situations

Character development has an inward path (what habits/capabilities/commitments form)
and an outward path (what others know, believe, want and do about the character).
The outward path can create a later obstacle even when no action is forbidden now.
“In-world cheating” here means dishonesty, broken agreements or similar conduct under
established fictional rules; it is not an instruction to penalize creative solutions.
An unusual solution alone is not misconduct.

The proposed causal chain is:

**Resolved act → actual observation → witness memory → communication or evidence →
recipient belief → opportunity to act → consequence affecting the current goal.**

| Record | Required distinction |
| --- | --- |
| Event | What actually happened, who acted, when/where, objects/agreements affected |
| Observation | What a particular witness could perceive; source event, identity certainty and limits |
| Claim/report | What someone says happened, speaker/recipient, supporting observations or hearsay lineage; never silently promoted to world truth |
| Unresolved issue | Debt, distrust, grievance or allegation; affected actors, evidence known to each, current status |
| Consequence | Acting NPC, known grounds, present trigger/opportunity, accepted action and material effect; pending/activated/addressed status |

Witnessing does not automatically broadcast a global reputation penalty. A loyal
companion may stay silent, confront the player privately, or report later. That choice
comes from the witness's own character, goals, relationship and risk. Repeated separate
incidents can strengthen a pattern; repeated retellings of one incident are not multiple
independent witnesses or fresh misconduct. Sleeping, distance and blocked sight matter.
Identity uncertainty stays uncertainty: seeing someone take an item is not always knowing
who they were, whether they owned it, or whether an agreement was violated.

An accusation is not proof. The recipient may believe, doubt, investigate or exploit it
according to their own knowledge and motivations. Record a mistaken or dishonest claim
as a claim with its real source, not an invented historical event. The system does not
need to reveal every hidden motive, but it must preserve the actual provenance internally.
Delivery creates a perception observation, not a second autonomous receiving action.
A recipient can choose a report-dependent response only at its next decision slot
after delivery; an already-planned same-batch action cannot use the new report. There
is no extra reaction outside the tick budget. Recipients may act separately on their
own observations or other evidence.

**Example, not a fixed authored branch:** the player repeatedly takes supplies after
agreeing to pay; a companion perceives the agreement and the unpaid taking. The player
benefits immediately. At the later passage negotiation, that companion might warn the
guard. The guard now has a reason to doubt another promise and could demand collateral,
refuse informal permission, or ask for restitution before offering help. The player can
explain, dispute, repay, bargain, deceive again or seek another feasible approach in
ordinary language. These are examples of intent, not a new restricted response menu.
The resolver checks any actual transfer, permission or obstruction under existing rules.

An unheard agreement or missing payment information changes what the companion can
claim. If nothing establishes nonpayment, their belief is suspicion, not recorded fact.
If no report or other evidence reaches the guard, this particular accusation cannot be
justified by the guard secretly reading the full event log. Material traces or later
discovery may still produce a separate, grounded consequence; unwitnessed does not mean
permanently consequence-free.

### Generating situations from history

At a natural opportunity, the controller/narrative layer can compose an encounter from
unresolved issues, available actors, their current goals and the primary objective.
Each NPC proposes only its own contribution from its filtered view: intended counterpart,
known issue/evidence, goal, trigger and permitted operations. No controller receives a
combined packet of every participant’s private knowledge. The server associates accepted
contributions with an encounter record, and narration describes committed visible events.
The engine validates availability, knowledge boundaries and effects; it does not accept “the player is guilty, close all
routes” as an arbitrary patch. A report, accusation, negotiation or refusal can form a
new situation using existing mechanics instead of requiring a prewritten branch for
every possible sequence of behavior.

For the proof, this is an extension of the existing NPC controller using unresolved
issues, not a separate omniscient director allowed to force all characters' decisions.
It cannot spawn a witness retroactively, erase contrary evidence or change the objective
just to punish the player. The player should be able to understand the connection when
a consequence becomes visible: who accuses them, what incident is alleged and what now
changes. No mandatory hidden numeric “morality score” governs every NPC.

Consequences can be helpful as well as adverse: witnessed reliability can earn someone
willing to vouch for the player. Their weight follows available evidence, severity,
repetition and the acting NPC's interests; context is not reduced to a universal good/bad
classification. Restitution can settle a specific debt without erasing memory. Further
consequences require a distinct supported transition or new event, not merely that an
issue remains unresolved. The server keys application by canonical issue ID, acting NPC
and effect type/stage; a fresh model-generated proposal ID cannot charge the same penalty
again. Existing payments/collateral are accounted for. An escalation records its new
grounds and applies only the additional effect, rather than replaying the original cost. Keep room for disagreement and intentional character
change rather than forcing every dishonest player into a predetermined villain ending.

A new run resets its actors and consequence history unless cross-run continuity is an
explicit mode. Resuming a save preserves it. Within a run, different behavior histories
should change real permission, resources, relationships, actors' behavior or available
approaches. Different wording, randomized names or a different trait label alone do not
establish the intended replayability. A fixed seed with divergent choices is the clean
first demonstration; procedural world variation can come after it.

## 7. The one-room proof

The cathedral rescue remains possible later content. First prove the differentiator
with one guard, one other character and a small set of reusable objects/fixtures.
Suggested objective: **Get yourself and your companion through the guarded passage.**
This is a scenario proposal. A guard, fatigue/sleep conditions, agent behavior and
reusable interaction rules are accepted design requirements, not a prescribed script.

Candidate objects: a fragile vase, a small key, a movable crate, a resting place, and
an aid item; fixtures: a guarded gate with explicit clearance and a reachable side
area. Freeze exact layout, properties and initial state in a test fixture. Do not
add a special distraction command or encode success as “vase was thrown.”

Potential approaches test the same rules:

- Create a perceivable diversion and exploit the NPC's actual attention/movement.
- Earn cooperation through supported conduct, then make a natural-language appeal.
- Arrange a physically valid passage/support alternative with an observable tradeoff.

These are candidate strategies, not exhaustive solutions or guaranteed NPC responses.
Every route that satisfies actor-location/alive/passability predicates can complete the
goal. A protected lock or heavy gate must be legible before an attempted alternative.

Remove the old free-winch-versus-extra-errands comparison. In the proof, the payoff is
observable here: trusted cooperation can preserve gate control and avoid alarm, while
a noisy/forced approach can change suspicion, companion safety or permission. Any such
tradeoff must affect an actual subsequent NPC action or traversal in the room. A changed
label without an effect does not count. Avoid creating a new room just to justify a reward.

### Required evidence before expansion

| Check | Procedure | Actual success, not proxy |
| --- | --- | --- |
| Novel intent | Uncoached tester proposes an unlisted combination using established properties | Intended physical/social effect occurs without a phrase-specific handler |
| NPC state matters | Clone encounter with guard awake/attentive, tired and asleep; make the same sound | Appropriate perception/waking limits and state-grounded choices; not identical forced reactions |
| NPC history matters | Reach encounter after baseline versus repeated, perceived false alarms | Explainable behavioral difference grounded in the guard's own memory; no knowledge leak |
| NPC development generalizes | Two different supported patterns of conduct/exposure, followed by a different supported situation in the same room | A shared-pipeline tendency/capability update influences new behavior; a one-off false-alarm memory branch alone does not pass |
| Player development generalizes | Two different supported choice sequences, plus a context-changing counterexample | Comparable evidence-backed development where warranted, not matching trait names or fixed errands |
| Witnessed delayed consequence | Compare the same repeated in-world misconduct with a witness, without that observation, and with observation but no report; later negotiate with the guard | Report-linked accusation occurs only when grounds reach that guard; permitted consequences affect the goal and cite the actual history |
| History changes play | Return two behavior histories to the same encounter, with temporary states controlled, and use the same sentence | Meaningful difference attributable to history, with viable alternatives |
| Semantic reliability | Paraphrase helpful toss, distraction and aggression against cloned state | Correct target/intent/effects; no accidental harm disguised as valid JSON |
| Play value | Someone plays without the script or instruction to “show the trait” | They find text useful, understand the resulting character and can name a consequence of their approach |

Generated output can vary. Deterministic checks assert physical invariants; live-model
checks assess plausible decisions and intention fidelity against allowed outcomes,
not exact prose or one mandated guard action. Record surprising outcomes and ask players
what they meant before judging the model's interpretation. A cached or keyword-based
fixture is useful for replay, but cannot verify these live-model claims.

Extend the same-room history comparison with a later negotiation phase: the companion
can be the witness and the guard the recipient, so this proof needs no third NPC or
second room. Use witnessed misconduct and witnessed reliability as contrasting histories.
For the causal control, replay a stored reporting choice as well as testing fresh NPC
decisions; do not mistake a discretionary choice to stay silent for broken transmission.
Successful accusation changes an actual permission/obligation/relationship or guard action
in the room. A line saying “I heard about you” without consequence does not pass.

## 8. Persistence, visibility and direct interaction

Entities have stable IDs and exactly one location: room/cell, holder/container, or
removed. The same key transfers, never duplicates. Rightful ownership is separate from
current possession. One actor record owns HP/state; portrait/map/dialogue read that truth.
Each entity has typed physical properties and allowed transitions. Display text cannot
invent an unsupported mechanical condition.

Session storage includes world version/tick, object registry, actor states, per-actor
knowledge/memories, claims with source lineage and delivery status, unresolved issues,
consequence lifecycle/deduplication IDs, development evidence, pending multi-step intent,
objective and event sequence. Persist a tick/phase cursor, reaction-batch ID, per-NPC
slot completion,
observation-delivery cursor and finalization marker atomically with each action. After
reload, resume only unfinished slots, deliver each observation once and run end-of-tick
updates once. Late responses carry the batch/slot identity and cannot replay a completed
action. Commands include IDs and expected versions. Deduplicate requests, validate
compositions against a draft, persist committed outcomes and cache NPC/model decisions
with state/contract version. Save/load must preserve fatigue, sleep, attention duration,
relationships and learned behavior as well as geometry. Expired model plans never overwrite
newer state. Chronicle/Evolve use the same rules, not wholesale token replacement.

Click/tap or E near an object performs its obvious nonharmful interaction; targets must
be selected when ambiguous. Walk into range, then recheck the object. A failed interaction
keeps the completed approach but consumes no item. Text remains prominent and unrestricted;
no fixed verb bar. Harmful actions require deliberate intent, not an accidental person click.

UI shows the goal, selected objects, concise narration, inventory, observable NPC behavior
and the player's developing character with evidence. Tiredness should be readable in a
yawn/posture; attention in facing/look/movement; private beliefs are not exposed as truth.
Sounds signal committed impacts and reactions. Separate world-audible noise (a gameplay
event heard by actors) from device audio (muting speakers does not deafen NPCs).

If the provider fails, direct interactions still run with the local server; typed intent
is preserved for retry and NPC fallback is visibly degraded. Do not certify adaptive NPC
play as working without the model. Browser/server disconnection stops authoritative
interaction and shows reconnect status. Waiting for responses never advances game time.

## 9. Next milestone and verification order

**First milestone: the one-room proof with the actual model**, a minimal renderer and
bounded rules. Persistence and direct controls support that proof rather than postponing
it behind a full game. This revision records the accepted priority, not completed work.

| Step | Target files when implemented | Verification |
| --- | --- | --- |
| Shared actors, entities, events and room fixture | `shared/schema.ts`, `shared/scenario.ts`, focused tests | State invariants and controlled awake/tired/asleep fixtures |
| Intent composition and reusable rules | `shared/commands.ts`, `shared/rules.ts`, tests | Throw/contact/noise/passability/ownership, including rejected compositions |
| Perception, bounded NPC controller and tick loop | `shared/perception.ts`, `server/npc-controller.ts`, `server/index.ts` | Guard receives only its observations; legal reaction windows; conflicting/stale plans |
| Development and history experiments | `shared/development.ts`, controller prompts, fixtures/tests | Generalized evidence, NPC adaptation, player-history comparison |
| Minimal play surface and persistence | `client/src/main.ts`, `overworld.ts`, `ui.ts`, `api.ts`, `server/store.ts` | Observe actual consequences and restore each branch of the experiment |
| Live play and latency readout | provider integration, test harness, timing instrumentation | Unfamiliar input and NPC behavior, time to commit/reaction/narration, uncoached play |

These are pieces of one small integrated milestone, not a request to finish a polished
framework before exercising the model. Freeze a small fixture first; add a rule only
when it supplies the intended reusable interaction. Record interpretation time, first
committed visible effect, NPC decision time and narration start separately. Preload art;
keep image generation and long voice playback off the proof's critical path.

Observe meaningful rule tests fail before implementing them. Additional adversarial cases:

- A sleeping actor cannot move/talk before waking; a weak noise cannot identify its maker.
- A guard’s focus change during its reaction persists through the next player action,
  then can be reconsidered; duration finalization cannot erase that opportunity.
- Guard fatigue/attention and actual perceived history change decision inputs; another
  NPC's private memory cannot appear as evidence in that guard's decision.
- Duplicate evidence, self-caused repair, reused commands and absent witnesses cannot
  produce false progress or relationships. An NPC can learn from its own resolved acts.
- Witnessed and unwitnessed variants cannot create the same report-backed knowledge
  without an independent evidence path. Repeating a rumor cannot multiply its evidence;
  a reported allegation is not rewritten as a witnessed fact. Report delivery creates
  an observation; the recipient responds only in its next decision slot, with no
  extra same-tick controller action or private-context sharing.
- A delivered accusation changes real gameplay when accepted; restitution closes the
  specific obligation and suppresses its already-settled penalty without deleting history.
  Save/load, revisiting the gate and regenerating a proposal with a new ID do not
  duplicate the same issue/actor/effect-stage application. New escalation grounds
  permit only the additional cost or state transition.
- A gentle catch is not an impact attack; a harmful trajectory cannot claim to be harmless.
- A multi-step sentence cannot cross the room before giving the guard its reaction;
  click movement follows the same cadence. A rejected player intent does not start a
  tick; an intentional wait does. A rejected NPC proposal consumes its slot within the
  already-started tick, without creating an extra tick.
- Competing NPC plans cannot duplicate an item or occupy the same exclusive cell. A stale
  plan fails safely; an unavailable model cannot undo a prior committed player action.
- Save/load during a pending plan or reaction resumes without replaying actions, inventing
  observations or expiring sleep/attention according to wall-clock time. Interrupt after
  the first of two NPC slots and again before finalization; resume the second slot and
  duration/development updates exactly once. A same-batch world-version change alone
  must not discard the second NPC’s otherwise-valid action.

Once implemented, typecheck/test/build and play the built app on its actual URL. Inspect
every changed screen in supported themes and at <=480px as well as desktop; listen to
muting and committed sound effects. Test provider outage and browser disconnection
separately. No export check is needed unless an export is added. No latency, provider
access, playable outcome or interaction coverage is claimed before those runs.

Expansion is gated on the proof, not on additional polish: novel interaction works;
development generalizes; state/history meaningfully affect play; a tester recognizes
that value. If a gate fails, revise the relevant relationships/controller/progression
before adding rooms, quests or art. Preserve unrestricted player vocabulary throughout.

## 10. Scope and remaining engineering choices

The shared actor model, agent-controlled NPCs, reusable rules, witnessed delayed
consequences, history-shaped scenarios and proof-first priority are accepted direction. The exact room geometry, condition durations, capability catalog,
development thresholds and model-call budgets remain engineering/tuning choices to make
concrete in the proof. No particular Mercy threshold or permanent ban is retained.

Defer multiplayer, a general autonomous population, universal physics, full campaigns,
complex crafting, a second battle renderer and optional art overhaul. Start with at most
two active NPCs; shared state/development does not require implementing every personality.
The source/rebuild policy still follows the event's applicable rules; HANDOFF.md's rule
claims were not independently reverified in this design task.

Self-review: an NPC “agent” that always follows one reaction script would not meet the
new requirement; an unconstrained model rewriting state would lose the rules. This plan
places choice in the controller and consequences in the engine, then tests both. Evidence
IDs alone do not validate psychological inference, and a fatigue label without changed
perception/choice has no gameplay meaning. Both are explicit proof targets. A penalty with no knowledge/evidence path is arbitrary;
a story that changes only its dialogue is not meaningful scenario variation. The
witness/report control tests and actual-goal consequences address those failure modes.
