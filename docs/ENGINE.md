# Event-driven engine foundation

The current milestone extracts content and introduces persistent evolution. Existing world art, collision, animation, sound, and the staged battle are adapters around the engine; this is not yet a multiplayer authority or a full combat simulation.

## Ownership

- `content/game-config.js`: authored class colors, items, locations, skill timings, combo recipes, and generation policy.
- `engine/runtime.js`: saved event ledger, factual journal, quest lifecycle, generation jobs, optional awakening decisions, and player profile. No DOM or API calls.
- `engine/contracts.js`: shared JSON schemas and runtime validation. Arbitrary JavaScript is never accepted.
- `engine/generation.js`: sequential asynchronous provider queue. Failure is explicit and retry is user initiated.
- `engine/generated-renderer.js`: executes bounded pixel attachments and skill-effect data. The first generated skills are visual only.
- `engine/game-ui.js`: journal, quests, and accept/decline/defer presentation.
- `server/generation-api.js`: server-only Responses API adapter, structured output request, validation, limits, and request cache.
- `main.js`: existing game adapter; records discoveries/combos and renders accepted content. Further extraction of input, battle, and scene rendering can follow without changing the content contract.

## When the API is called

| Content | Implemented trigger | No-call cases |
| --- | --- | --- |
| Awakening offer | Three distinct meaningful events since the previous evaluation; never while another offer or unresolved awakening job exists | Movement, repeated discoveries, ordinary swings, declined/reopened offers |
| Quest | Player first speaks to Rowan; thereafter quest completion automatically queues one follow-up. Replacing an offered/active quest explicitly requests a new task. | Opening quest UI, repeatedly asking Rowan while a job/quest exists |
| Journal reflection | Six new meaningful events, summarized as one evidence-backed batch | Opening the journal; each factual journal update |
| Generated skill/appearance | Generated together in the awakening response | Accepting, using, rendering, or reloading existing content |

Current meaningful evidence: first visit to each house, first execution of each combo, and quest completion. These events show exploration/practice, not morality. There is no real PvP or aid encounter yet. Future server-confirmed encounter outcomes can provide intent, consent, assistance, and consequences before moral tendencies are considered.

Suggested next triggers, not implemented: new-region quest prefetch when no cached content exists; dialogue generation at a conversation boundary; awakening evaluation after a consequential encounter. Do not have journal writes enqueue more journal writes. No API call runs in the render/movement loop.

## Offers and persistence

Generate → validate → save pending offer → player previews → accept / decline / decide later. Acceptance replaces the active awakening and visual skill. Decline retains the existing active awakening. Decide later keeps the proposal pending. Generated quests must be explicitly accepted, and objectives count subsequent visits or combo executions. Completed quests emit an event once.

State is versioned and saved to `localStorage` under `glyph-engine-v1`. It includes the profile, ledger, learned/discovered markers, jobs, proposals, active awakening, quests, and journal. Positions are intentionally reset to the outpost on reload to avoid restoring into invalid geometry. Restored generated content is validated. Interrupted jobs are marked retryable failures. Keep generated definitions stable rather than regenerating on login.

## Local API setup

Copy `.env.example` to `.env`, set `OPENAI_API_KEY` and `OPENAI_MODEL` for an account-accessible Responses API model that supports Structured Outputs, then restart `npm run dev`. Do not use `VITE_` for the key. The browser sees only `/api/generation/status` and `/api/generation`; no credential is bundled.

Once configured, queued milestone jobs run automatically and can incur API charges. With either setting absent, no OpenAI request is made. There are no canned generation responses in the game. Test-only fixtures live in the test suite.

Limits: one upstream call at a time; 20 attempts per server process by default (`OPENAI_MAX_GENERATIONS`, capped at 100), at most 30 persistent jobs per save, a 24 KB request envelope, up to 20 evidence events per job, a 40-second upstream timeout, and a 45-second client timeout. Requests are cached by ID and context hash for the server lifetime. Failed/incomplete/refused/invalid responses do not alter active content. Retrying a failed call can cost another request. The server cache is not durable across restarts; exactly-once billing is not guaranteed.

This endpoint is local development middleware, not part of `dist` or a production backend. The local client supplies events, so they are not cheat-proof. Before multiplayer/public deployment: move the ledger, generation authorization, budgets, cache, and content acceptance to an authenticated authoritative server with durable storage. Keep OpenAI credentials there. Do not expose this development server publicly as a game service.

Structured Outputs establishes shape, not balance or truth. We additionally check event references, executable objective IDs, coordinate/count/time budgets, colors, and unknown fields. Narrative factuality still needs evaluation. Only visual effects are implemented; descriptions are instructed not to promise damage, healing, flight, or stat changes.

Official API reference: https://developers.openai.com/api/docs/guides/structured-outputs

## Verification

`npm test` covers world collision, combos, meaningful-event deduplication, offer decisions, persistence, quest progress, evidence snapshots, invalid content, unconfigured providers, failed requests, server caching, refusals, and incomplete responses. Server tests stub the upstream request; no paid API calls are made.

## Quest progression and diversity

Quest requests now snapshot the last eight quest titles, statuses, and objective targets. The immediately previous objectives are excluded; each new task must include an activity among the least used remaining targets. Both server and client reject repetition, duplicate objectives, and repeated recent titles. A new title alone does not make a new quest. Invalid API output produces a visible retryable error, never a canned replacement.

Completing a quest automatically queues exactly one follow-up. New quests remain offers until accepted. Active/offered quests sort before history. A live tracker shows the current objective, compass bearing to its doorway, or exact combo keys. A marker identifies the destination; bearings are guidance, not pathfinding through obstacles. Players with an existing repetitive quest can choose “Request a different task”; their old quest is retained as replaced history.

The current world still has three room targets and three combo targets. This prevents immediate repetition but is not an unlimited quest vocabulary. More mechanics and locations must be added to expand actual gameplay variety.
