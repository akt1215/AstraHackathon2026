# Tilth

Tilth is the active game base. This integration adds unrestricted action text, deterministic objects and consequences, and stateful NPC decisions to its pixel world, continuous movement, combat and character creator. See [the integration design](docs/WORLD_INTEGRATION_PLAN.md). The game concept is Akito Yamauchi’s; teammate code and art retain their source attribution.

A 2D pixel-art RPG prototype where exploration and learned techniques can lead to AI-generated quests, character changes, and optional awakenings.

The current build takes place in **Cinderwatch**, a volcanic outpost with magma rivers, stone buildings, a forge, and furnished interiors. It runs in the browser with keyboard and touch controls. The full-screen world, menus, and character art use a retro pixel style with richer shading and lighting.

## What you can do now

### Create your character

- Choose a name and class: Warrior, Mage, Rogue, or Healer.
- Pick from five hairstyles, hair colors, skin tones, four clothing styles, and outfit colors.
- Choose a sword, spear, bow, or staff independently of class.
- Preview your appearance and weapon move set before entering the world.
- Ask AI for a name, describe a new character, or generate a random character with custom pixel details.
- Edit any generated draft before saving. Typed names are preserved unless you explicitly generate a new name.
- Reopen the creator later without resetting your quest or journal history.

### Explore the outpost

- Walk and dodge through a world with collision for buildings, rocks, fences, furniture, and magma.
- Cross the stone bridge and enter three furnished buildings: the Ember Rest, Cinderwatch Smithy, and Watchkeeper’s House.
- Follow the quest tracker’s compass directions and destination markers.
- Use the in-game inventory, party preview, journal, quest panel, and awakening menu.
- Hear footsteps, menu interactions, equipment sounds, attacks, casting, and combo finishers. The sound toggle remembers your preference.

### Try weapon moves and combos

Each weapon has distinct held art, action poses, effects, timings, and sounds. Animations include directional strikes, bowstring draw/release, staff casting, and a collision-aware dodge roll.

| Weapon | Space / 1 | Q | E | R |
| --- | --- | --- | --- | --- |
| Sword | Quick cut | Heavy cleave | Whirlwind | Shield bash |
| Spear | Jab | Piercing thrust | Sweeping pole | Shaft parry |
| Bow | Quick shot | Charged arrow | Fan volley | Bow strike |
| Staff | Spark bolt | Arcane nova | Orbiting sparks | Runic ward |

Three sequences trigger special finishers:

| Combo | Inputs |
| --- | --- |
| Cinder Cleave | Space → Space → Q |
| Ash Cyclone | Shift → Space → E |
| Forge Breaker | R → Q → Space |

Let each action finish, then start the next within **1.6 seconds**. Cooldown-blocked inputs do not count. The combo guide displays the selected weapon’s move names, and the HUD tracks sequence progress.

A staged boss battle also previews the customized player attacking and a healer casting, with floating combat indicators. Overworld attacks now deal damage using facing, weapon range, and wall checks. Real multiplayer PvP, simulated projectile travel, and generated skill damage are still not implemented.

### Act in a persistent world

Your first goal is to help Clover recover and earn Rowan’s support. Click nearby objects to inspect, pick up, open, give or drop them, or describe an action in your own words. The model proposes bounded effects; local rules validate reach, collision, ownership and resources before applying anything. Throwing, care, reports and repayment can leave memories with the characters who actually observe them. Closed containers and privately held items do not reveal their clues.

NPCs have fatigue, attention and persistent memories. Friendly replies run in the background on new observations; walking stays local and does not ask the model for every step. Hostile pursuit and damage remain under Tilth’s combat rules. The action panel shows real possessions, coins, obligations and your current goal. The existing equipment menu remains a visual customization preview.

### Receive AI-generated content

World actions and NPC decisions use the logged-in Claude CLI by default for local testing. Optional character, quest and awakening generation retains Tilth’s OpenAI adapter. Results are validated as data; generated JavaScript is never executed.

| Content | Trigger |
| --- | --- |
| NPC decision | A first sighting or meaningful new observation; bounded actor view, background reply |
| Character or name | Explicit creator button: description, random character, or name |
| Optional quest | Explicitly ask for an optional task in the quest panel |
| Follow-up quest | Optional quest runs can queue one follow-up; the main goal does not start an endless quest chain |
| Replacement quest | Choose “Request a different task” on an offered or active quest |
| Awakening offer | Three distinct meaningful events since the previous evaluation, with no unresolved offer/job |
| Journal reflection | Six new meaningful events, summarized in a batch |

Meaningful events currently include first house discoveries, first combo achievements, and quest completion. Ordinary movement and opening the journal do not call the API. Repeated discoveries do not farm awakening progress.

Quests use supported room visits and combo objectives. The generator receives recent objective history, excludes the immediately previous objectives, and prioritizes less-used activities. Repeated objectives are rejected even when the title changes. New quests must be accepted before their objectives count.

Awakenings are **offers**: preview the appearance and skill, then accept, decline, or decide later. Accepting replaces the active awakening; declining preserves it. Generated appearance and skill definitions are saved and reused without another API call each time they render or activate.

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open **http://localhost:5173/**. Direct interactions, the manual creator and combat work without an API key. World narration uses a locally installed, logged-in `claude` executable; `CLAUDE_BIN` can select its absolute path.

Set `ASTRA_PROVIDER=offline` for direct play only. Once ready to switch, set `ASTRA_PROVIDER=openai`, `ASTRA_MODEL` to an available model, and `OPENAI_API_KEY` in the ignored `.env`. World narration has a bounded queue of two active and eight waiting requests; it does not share the optional-content generation budget. Claude CLI requests are restricted to loopback clients. Hosted narration requires the OpenAI provider.

For AI generation, copy `.env.example` to `.env` if you do not already have one:

```sh
cp .env.example .env
```

Then configure:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5.6-terra
OPENAI_MAX_GENERATIONS=20
```

Restart the dev server after configuring it. The model must be available to your account and support Responses API Structured Outputs. Reasoning effort is currently left at the model default.

`.env` is Git-ignored. Credentials stay in server-side development middleware; never add a `VITE_` prefix to the API key. Configured milestone jobs run automatically and incur API usage. The default limit is 20 upstream attempts per server process, including failed attempts. Failed generation is shown in the interface and can be retried explicitly.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Space / 1, Q, E, R | Selected weapon’s attacks |
| Shift | Dodge roll |
| 2 / 3 / 4 | Guard, rally effect, and potion |
| 5 | Activate an accepted awakening’s visual skill; keyboard shortcut only |
| Esc | Open the menu, return to it, or resume |
| C | Create/edit character |
| I | Inventory |
| J | Journal |
| P | Party preview |
| B | Staged boss battle |
| K | Combo guide |
| F | Talk to Rowan when nearby |
| T | Quests |
| U | Awakenings |

On mobile, use the movement pad, skill buttons, Talk button, and in-game menu. Movement shortcuts sit at the top-left; the quest tracker sits along the top on desktop. The standalone awakening-skill button has been removed.

## Saved progress

Character choices, gear selection, discoveries, learned combos, journal history, quests, generation jobs, and awakening decisions persist in this browser’s `localStorage`. Sound preference is stored separately.

Player and NPC positions, health, object locations, world conditions, observations and obligations are also saved. Older Tilth profiles and quest histories are preserved when this world state is first added. Active animations and the staged battle reset. Saves are local to this browser and origin; changing host or port does not migrate them, and they are not synced between devices.

## Engine structure

| Path | Responsibility |
| --- | --- |
| `content/` | Authored world, character, weapon, skill, and combo definitions |
| `engine/runtime.js` | Persistent state, factual events, quest progress, and awakening decisions |
| `engine/contracts.js` | Shared generation schemas and validation |
| `engine/generation.js` | Asynchronous generation queue |
| `engine/onboarding.js` | Draft character creator and explicit AI requests |
| `engine/quest-guidance.js` | Quest diversity checks and next-objective guidance |
| `engine/*renderer.js`, `engine/attack-pose.js` | Generated visuals, weapon effects, and body animation |
| `server/generation-api.js` | Server-only OpenAI adapter, validation, caching, and request budgets |
| `world.js`, `interiors.js`, `volcanic.js` | Collision, rooms, and procedural pixel artwork |
| `main.js` | Input, scene, HUD, and battle integration |

See [ENGINE.md](docs/ENGINE.md) for generation timing, persistence, validation, and architectural boundaries.

## Current limits

- No multiplayer, accounts, server-authoritative gameplay, or cloud saves.
- NPC hostility, assistance and witnessed obligations are implemented. Character evidence is modest and bounded by supported rules; arbitrary new mechanics and hard moral skill trees are not implemented.
- Quest variety is bounded by three rooms and three combos; new quest titles do not create new playable locations or mechanics.
- AI character generation selects supported features and may add custom pixel details. Weapon starter moves are authored, not invented by the LLM.
- Appearance attachments use bounded pixel rectangles; generated awakening skills use supported visual primitives.
- Class progression, functional stat effects, a complete equipment system, and full combat remain unfinished.
- Production uses `npm start` to serve `dist` and the generation API together. Serving `dist` alone cannot handle AI requests.
- Request caching and API budgets are process-local. A production multiplayer release needs authentication, authoritative events, and durable server storage.

## Verification

```sh
npm test
npm run typecheck
npm run build
```

The automated tests cover collision, combos, weapon poses, character persistence, generation contracts, quest progression and diversity, awakening decisions, API caching, and error handling. Tests stub OpenAI requests and do not spend API credits. Manual browser checks have also covered onboarding, AI draft review, touch layout, battle animation, and live generation.


## Railway deployment

`railway.json` sets the build command to `npm run build`, start command to `npm start`, and health check to `/api/generation/status`. The Node server binds to `0.0.0.0` on Railway's `PORT`. If you have a custom start command in Railway, use `npm start` rather than a static file server or `vite preview`.

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in the service's Railway Variables. The model must be available to your API project. Local `.env` files are ignored by Git; the local start script loads one when present. Optionally set `OPENAI_MAX_GENERATIONS` (default 20 attempts per server process; shared by all visitors and reset on restart).

Deploy the updated source, then check `/api/generation/status`: it should return JSON `{"configured":true}`, not the game HTML. This confirms configuration is present, not model access or billing validity; test a character name request to verify the provider connection.


## Roaming encounters

Ash Raider and Cinder Sentry patrol the southern road and attack when approached. Lunara, Clover and Foxglove wander near their homes and defend themselves when struck. Rowan is a protected quest giver: attacks cannot damage or provoke him, and he does not retaliate. Face a target and use Space, Q, E or R; combos deal stronger hits. Walls block attacks, including ranged weapon strikes. Orange wind-up rings warn of an incoming strike: move away or roll with Shift. Guard reduces damage briefly, and a potion (4) heals 40 HP with an eight-second cooldown.

Characters pursue using collision-checked paths, calm down after disengagement, and yield when their health reaches zero. They recover after 18 seconds of active outdoor play. Player defeat restores health at the outpost. Menus, dialogue, hidden tabs and interiors pause outdoor combat. Combat health and actor positions now persist with the world save; observations and received dialogue remain in the journal.

A struck character immediately protests using an authored line. Stateful friendly NPC decisions use the world narrator and their filtered observations. Combat continues locally, and delayed responses are discarded when the room or character's combat eligibility changes. Provider failures leave direct gameplay available and can be retried using Reconnect.
