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
