# Glyph RPG — visual prototype

Run `npm install` and `npm run dev`, then open http://localhost:5173.

A responsive pixel village with keyboard and touch movement, sample character classes, equipment previews, a quest journal, and a staged boss encounter. All art is drawn in Canvas. UI fonts load from Google Fonts with local fallbacks.

This stops at the visual prototype. There is no multiplayer, persistence, production combat, or complete progression system. Refreshing resets the preview.

Validation: `npm run build`. Browser checks covered inventory selection, equipment changes, battle feedback, and desktop/mobile overflow.

## Immersive layout

The game fills the viewport. All panels open over the world in pixel-bordered menus.

- WASD / arrow keys: move
- Esc: open menu, return to menu, or resume
- I: bag; C: character; J: journal; P: party; B: battle preview
- 1–4: skill previews
- Arrow keys + Enter: navigate the main menu
- Mobile: on-screen movement pad and Menu button

The map crops to fill the screen without stretching its pixel art and follows the character within the village bounds.

## Volcanic visual study

Cinderwatch replaces the green village with detailed basalt masonry, magma flows, a stone bridge, forge lighting, armored sprites, and drifting embers. The charcoal-and-brass menus stay inside the game. Original procedural art lives in `volcanic.js`.

“32-bit” describes the richer era-inspired art direction, not a hardware bit-depth switch. Ambient effects run at a capped rate and respect reduced-motion preferences. This remains a visual prototype; the earlier green version is preserved in commit `7e863b4`.

Sword swings: press Space or 1, or tap the sword skill. A directional 420 ms wind-up/cut/recovery animation briefly plants the character's feet, with a 500 ms cooldown and a pixel slash trail. This is a visual attack; enemy hit detection and damage are not implemented.

Additional action previews:
- Shift: dodge roll (movement respects world and furniture collision)
- Q: heavy strike
- E: whirlwind
- R: shield bash

Each has a touch button, its own sound, and a visible cooldown. Actions cannot interrupt one another. These are movement and combat animations; enemy damage remains outside the prototype.

Combos (K opens the in-game guide):
- Cinder Cleave: Slash → Slash → Heavy (Space, Space, Q)
- Ash Cyclone: Dodge → Slash → Spin (Shift, Space, E)
- Forge Breaker: Bash → Heavy → Slash (R, Q, Space)

Let each action finish and start the next within 1.6 seconds of its end. Only successfully started skills count; cooldown-blocked inputs are ignored. A correct final skill becomes a special animated finisher. The HUD shows sequence progress. Touch controls use the same recipes.

## Event-driven engine and awakening offers

See [engine design and API timing](docs/ENGINE.md). Authored content is extracted into `content/game-config.js`; the runtime records discoveries and learned combos, saves a factual journal, tracks quests, and queues milestone generation.

- U / Awakenings: inspect pending offers, accept, decline, or decide later.
- F / Talk: ask Rowan near the inn for a quest.
- T: quests. J: recorded journal.
- 5: use the accepted awakening's generated visual skill.

AI requires server-only `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env` (see `.env.example`) and a dev-server restart. Without configuration, progress is saved but generation remains disconnected. Once configured, queued work runs automatically. No API key or generated executable code is sent to the browser. This is a local engine foundation, not a production multiplayer backend.
