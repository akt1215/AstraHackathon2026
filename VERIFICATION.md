# Verification — September 10, 2026

Verified artifact: the new one-room implementation, built on `codex/one-room-proof`.
The earlier reference build was not used as evidence of correctness.

## Automated checks

48 tests pass across shared rules, model boundaries, persistence/recovery, event privacy,
and client retry integration. TypeScript and the Vite production build pass.
Meaningful failing cases were observed before fixes, including atomic rejection, ownership,
witness-only claims, unseen settlement, anonymous impacts, speech occlusion, waking cadence,
incapacitated guards, pre-slot decision persistence, crash recovery, request deduplication,
cross-story requests, lost-response retries, and response-event redaction.

The goal test requires both travelers beyond the gate; reaching it alone is not completion.
Recovery tests interrupt after the first NPC slot and before finalization, then assert no
extra decisions, duplicate action, or repeated finalization on resume.

## Actual Claude CLI checks

Structured player pickup: 3,548 ms. Structured guard investigation: 10,539 ms.
The installed CLI rejected JSON Schema draft-2020-12; emitting draft-07 fixed that actual
failure. The OpenAI adapter remains untested against a live account.

The bounded acceptance run made **8 real calls**, totaling **69,066 ms**, and passed
**14 scripted checks**. Individual calls ranged from **5,562 to 15,360 ms**.

| Controlled case | Observed outcome |
| --- | --- |
| “Toss … gently into Ivo’s waiting hands” and another helpful paraphrase | Same key transferred to Ivo; no injury |
| Deliberately hurl key into Ivo’s face | Collision caused 2 HP damage |
| Same quiet sound, awake guard | Heard anonymous sound and looked toward its origin |
| Same quiet sound, tired guard | Did not hear the weak sound; chose rest |
| Same quiet sound, sleeping guard | Remained asleep; no decision slot |
| Same request for passage, no taking history | Guard opened gate and granted permission |
| Same request after two witnessed takings and a delivered report | Guard kept gate closed and requested 9 coins or collateral |
| Identical debts/inventory, report withheld | Stored permission proposal succeeded; no known issue blocked it |

The withheld-report comparison replays a previously produced action, isolating the
engine's knowledge gate. It is **not** a fresh-model measurement. Initial history fixtures
also differ in inventory. These controls establish bounded effects, not a general claim
that every future model decision will preserve semantics or react to history correctly.
The exact outputs are retained locally in ignored `artifacts/live-acceptance.json`;
`server/acceptance.ts` can repeat the test with new live calls.

A browser-driven fresh turn, “Ivo, come with me. I will help us both reach the refuge,”
completed through the production server in **24.3 seconds** (interpretation 9.5 s,
NPC responses 14.7 s), without fallback. Ivo replied that he would accompany the player.
The earlier 19.1-second turn used fallback and is not counted as a clean integration pass.

## Browser checks

Inspected the actual built app on localhost, including desktop and 390px phone layouts,
light/dark rendering, selected-object description, prominent free text, and committed
narration. Corrected overlapping object labels and moved the text panel ahead of the
character cards on phones. The document width stayed at 390px with no horizontal overflow.

With the provider explicitly offline, two approach clicks advanced two separate turns,
then pickup moved the single vase from the map to inventory. The UI explicitly reported
basic NPC fallback. Save displayed success; reload preserved inventory. Mute toggled and
persisted. Sound playback was exercised by committed interactions; its audible quality
has not been independently listened to in this test environment.

## Remaining proof limits

This is an initial playable prototype. CLI latency is still substantial for individual
turns; model quality, broader character development, and player-perceived replay value
need tuning and an uncoached playtest. Evidence rules are a small, explicit care/restitution/
investigation subset. Binding commitments, general misconduct arbitration, autonomous
multi-room scenarios, portraits and voice narration are outside this build.

No public deployment was requested. Production verification means the actual built local
server, not a hosted URL. No exported document/file flow is part of the game, so external
export round-trip testing is not applicable.
