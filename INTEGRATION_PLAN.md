# Teammate integration

Akito originated the game concept. Teammate code is being adapted into the existing deterministic simulation, not substituted for it.

## Source snapshots
- Austin-Senna/astra-hackathon: `f4d392c5ace99a01ce928cb059b0960e1a00fe59`.
- shresthkapoor7/tilth: `d40bf097728a8a1f6f04b18d4486f664f9f123ce`.

## Implementation
1. Adapt Austin's containers, inspection/clues, linked mechanisms, lever tools, and consumable food into `shared/engine.ts`, `perception.ts`, `scenario.ts`, and the model contract. Single authoritative locations, hidden contents, physical reach, witnessed events, and current gatekeeper rules remain mandatory.
2. Adapt Tilth's pixel characters, bounded manual appearance drafts, layered sound, objective directions, and journal presentation into `client/src`. Reuse Austin's attributed original object sprites and Kenney CC0 audio. Persist name/appearance through a validated coordinator endpoint; cosmetic editing consumes no turn and no model call.
3. Adapt Austin's request-content fingerprints and bounded provider concurrency into the existing durable coordinator/model boundary. Keep original retry identity and interrupted-turn recovery.
4. Validate new interactions, privacy boundaries, saves, customization, request conflicts, and concurrency with failing-then-passing tests. Run the full regression suite, typecheck/build, actual built browser in both themes and mobile width, and a live Claude intent check against the new rules. Check ordinary movement still avoids model calls.

## Review boundaries
- Neither teammate's NPC implementation replaces our filtered perception, decisions, history, or consequences. Austin's client entry point is absent from its tracked source; assets/backend are real, but its UI handoff is a specification.
- Tilth's combat, equipment, and awakening effects are visual previews, not validated gameplay powers. Import the presentation ideas without promising unsupported effects or restoring a player verb menu.
- Keep one clear objective. Do not import Tilth's repeating quest pool.
- Fire/water, multi-room chapters, generated worlds, optional generated development offers, checkpoint replay, and multiplayer storage require additional authoritative state/recovery work. Record them as follow-up candidates rather than importing incompatible shortcuts. Fire in particular needs material rules, charges, expiry, and causal property/injury consequences.
- Do not alter the user's current save or preexisting reference-document edits. New interactibles appear in newly created runs; existing runs retain their state and gain presentation/customization.

## Self-review before implementation
The biggest integration risks are leaking container contents or private clues, turning an innocuous cosmetic edit into another narrative turn, resetting a live save, and accidentally putting generation back on the movement path. Tests must directly refute each failure mode. Rendering remains a consumer of committed state; it cannot decide collision or damage.
