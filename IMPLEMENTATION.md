# One-room proof implementation

Authorized by Akito: “Start building it.” New product code is written in isolated worktree
/private/tmp/astra-one-room-proof, branch codex/one-room-proof. Existing reference code is
not copied. Prior modified/untracked files in the main checkout are preserved.

Shared contract: shared/types.ts. Actor IDs player, guard, companion. One grid room,
width/height provided by state. Local Node API, vanilla TypeScript/Vite client, Zod input
validation. Server is authoritative; UI never sends arbitrary NPC actions.

API: GET /api/state -> {state: PublicState, provider: ProviderInfo}; POST /api/action ->
body {requestId:string,version:number,input?:string,direct?:DirectIntent}; response
ActionResponse, or {error:string,state?:PublicState}. POST /api/new -> {variant?:
'baseline'|'tired'|'asleep'} -> {state,provider}. POST /api/save -> {ok:true}.
Direct and text intents run identical engine actions and NPC cadence. No text keyword
fallback is presented as AI. Provider error retains input and reports it honestly.

Work lanes: shared engine/scenario/perception/development and tests; provider adapter and
its tests; client rendering/interaction; main integrator owns server persistence, endpoints,
bootstrap, acceptance tests and documentation. Do not edit another lane without coordination.

Engine exports expected from shared/engine.ts: createWorld(variant?), resolveAction(world,
action) -> Resolution (pure, increments world version on success, does not advance tick),
beginTick(world) -> World, finishTick(world) -> World, actorView(world,actorId)->ActorView,
publicState(world,busy?)->PublicState, directAction(world,intent)->Action,
fallbackAction(world,actorId)->Action. Main owns phase persistence/NPC request loop.

Provider exports expected from server/model.ts: providerInfo()->ProviderInfo,
interpret(view,input)->Promise<ModelResult>, decideNpc(view)->Promise<ModelResult>.
Action output is validated; actor is locked to requesting view. Model cannot observe
other actors' memories. Read local types before implementing; notify main for contract changes.

Verification: failing rule tests first; no duplication, state-aware perception, sleeping,
report delivery/accusation/settlement, action rejection atomicity and history effects. Run
actual-model probe as soon as available. Then built UI at desktop/mobile, supported themes,
provider-offline interaction, persistence/reload, TypeScript and full tests. Runtime model
availability is not presumed. Save evidence of what's actually exercised.
