# Play the one-room prototype

The game concept is Akito Yamauchi's. Austin typed the original notes.

This is the new implementation of the September 10 design. `PLAN.md` records the design;
`RED_TEAM.md` and the supplied `README.md`, `SPEC.md`, `HANDOFF.md`, and `IMPLEMENTED.md`
are historical reference documents, not inventories of this implementation.

## Run locally

Requires Node 22.12 or newer and npm. The tested environment uses Node 26.5.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:8787**. For client hot reload, use `npm run dev` and open
http://127.0.0.1:5173. Saves are atomic snapshots in `data/session.json`; restarting
resumes unfinished NPC slots from saved decisions. New story deliberately replaces the run.

Claude CLI is the initial local provider, as requested. Install/sign in through the normal
Claude CLI flow, then run `npm run probe` to check structured player interpretation and
`npm run probe -- --npc` to check an NPC decision. The subprocess has no tools, uses no
project settings, and receives only the relevant character view and game request.
This desktop sandbox required the server to run with access to the existing local login;
a normal terminal uses its existing login directly. Never paste credentials into the game.

Copy `.env.example` to `.env` to change the provider, port or save path. To switch after
local testing, set `ASTRA_PROVIDER=openai`, `ASTRA_MODEL=gpt-6-astra`, and an
`OPENAI_API_KEY` in that ignored local file. The OpenAI adapter is implemented, but live
OpenAI access has not been verified. The adapter uses the
[Responses structured-output API](https://developers.openai.com/api/docs/guides/structured-outputs).
`ASTRA_PROVIDER=offline` permits direct exploration with visibly basic NPC rest fallback;
it does not simulate free-text understanding or adaptive NPC decisions.

## Play

Reach the refuge beyond the gate **with Ivo**. Click a floor tile or use WASD/arrows for
one step; click an object to inspect it, then use its contextual action or E. Use the
prominent text field for your own phrasing and combinations. There is no player verb list.
Walking advances locally without a model call unless an NPC first notices someone, receives a meaningful observation, changes condition, or sees you enter the guarded threshold. Recognition persists across reloads and leaving view. An agreed follower continues through local movement rules. Dialogue, actual object interactions and intentional waits still offer NPC decision turns.

The teammate integration adds a chest, a readable note, food, a crowbar and a linked
shutter release to **new stories**. Open the chest to reveal its contents; “Also here”
buttons let you select each item separately. Examine reads the note, and its discovered
text stays in the journal. Inspection uses the same selective reaction policy as walking.
Food is consumed to reduce fatigue. A crowbar can force a leverable latch with noise and
20 fatigue, leaving it permanently damaged; a watching keeper still blocks forced entry.
The new rules also support putting held items back into open containers through free text.
Existing saves keep their objects and progress; they are not silently reset or repopulated.

Objects have actual positions, holders and properties: a fragile thrown object breaks
and makes noise, a small object fits the gate gap, a crate obstructs a cell, and medicine
is consumed when used. A gentle handoff and an intentional impact have different effects.
You cannot invent successful outcomes by typing them.

Mara guards the passage and owns the priced supplies. Taking them creates an obligation;
what another character knows depends on what they actually observed or were told. Ivo
can witness and later report a taking. A known unpaid obligation can block permission;
returning supplies, paying, or offering sufficient collateral can settle it. Unobserved
settlement does not magically update a distant observer's beliefs.

Both NPCs have fatigue, wakefulness, attention, memories, relationships and development.
New story offers awake/tired/asleep guard variants. A loud enough noise can wake a sleeper,
with no extra immediate reaction. Care, restitution and investigation create deduplicated
evidence that feeds later decisions. These are bounded proof mechanisms, not a finished
personality model, commitment system, universal physics or campaign generator.

The UI displays committed effects, inventory, character evidence and the objective.
Edit appearance changes a saved name and bounded pixel appearance without spending a
turn or changing capabilities. Cancel keeps the current character; a new story keeps the
chosen appearance. The journal contains your observed events and discoveries, with no
extra inference calls. Object art and recorded sound come from the teammate builds;
see `client/public/CREDITS.md` and `INTEGRATION_PLAN.md` for provenance and integration scope.
Color theme and sound mute persist locally. Device mute does not change world hearing.
The receipt displays actual source and timing; basic fallback is explicit. Typed input
survives provider errors so it can be retried.

## Verify and extend

```sh
npm test
npm run typecheck
npm run build
```

`shared/engine.ts` owns validated effects; `perception.ts` owns private views;
`development.ts` owns evidence updates; `scenario.ts` defines the room.
`server/model.ts` interprets intent and proposes NPC decisions, `coordinator.ts` serializes
turns and persists reaction batches, and `client/src/main.ts` renders public state.

Run `node --env-file-if-exists=.env --import tsx server/acceptance.ts` for the bounded live
Claude comparison suite. It writes the actual outcomes to ignored
`artifacts/live-acceptance.json`; it is separate from deterministic unit tests and uses
real model calls. The interpretation and NPC outputs can vary between runs.

Run `node --env-file-if-exists=.env --import tsx server/teammate-probe.ts` for four live
checks of the new container, reading, storage and lever rules. It uses disposable in-memory
worlds and writes `artifacts/teammate-probe.json`, without touching your active save.

Before expanding to more rooms, conduct an uncoached playtest and broader history tests.
The existing proof does not establish unlimited replayability or generalized moral
reasoning. Measured live-provider outcomes and known limitations are recorded in
`VERIFICATION.md`.
