# Notebook World integration into Tilth

10 September 2026. Based on shresthkapoor7/tilth commit `d40bf09`; Notebook World checkpoint `dc6eee2`. All of Tilth's existing history is retained. This branch is a proposed team integration, not a change to the teammate's main branch.

## Foundation decision

Use Tilth's existing Canvas world, authored pixel art, character creation, weapon-specific animations, interiors, collision, action animation, sound, event ledger, quests, local save and generation queue as the foundation for the immediate demo. Preserve its coherent visual language while integrating gameplay strengths. The requested hand-drawn art direction remains a later product decision; it is not achieved by this branch. Do not mix isolated Notebook World furniture or sprites into this pixel world.

Tilth currently offers action and combat previews, not a complete damage/combat simulation. Its awakening definitions produce validated visual skills, not arbitrary physical powers. Notebook World has executable object/law effects and a witnessed rescue that changes an NPC's behavior, but its visual presentation is less mature. Neither branch should claim the other's features until an adapter is implemented and tested.

## First integrated feature

- A large bottom dialogue panel with a character portrait, gradual reveal, keyboard/touch advancement and thoughts that introduce the situation indirectly. It reuses Tilth's portrait rendering and sound. No generation request runs in the dialogue path.
- First visits to the inn, forge and cottage create authored thoughts grounded in the existing room-entry ledger events.
- Rowan witnesses a successfully started combo only when performed within 72 world pixels, outdoors in his current scene. The memory cites that precise existing event. It does not claim an enemy was hit or anyone was injured.
- A first witnessed combo makes Rowan step back along collision-checked movement. His later conversation references the witnessed event. Repeated instances of the same combo do not keep replaying the initial reaction.
- Memory is stored within Tilth's existing save, and restored facts require matching ledger evidence. Existing saves receive defaults. There is no second world state or provider.
- Player dialogue names and portraits follow the saved character customization; initial thoughts wait until character creation closes. Talking still flows into Tilth's quest request and acceptance UI after the conversation. The existing quest tracker and explicit guidance remain in this first integration.

`engine/character-memory.js` adapts Notebook World's fact/witness/director pattern to Tilth events. `engine/dialogue-ui.js` adapts the bottom-panel interaction. These are selective ports rather than copies of Notebook World's bedroom simulation. Original Notebook World implementation: https://github.com/hayden1126/notebook-world . Tilth foundation: https://github.com/shresthkapoor7/tilth . Existing source authorship/history is preserved; this document does not grant a new license for teammate code.

## Next integration: real object and law effects

This is the highest-value next mechanical step, but it is **not implemented in this branch**. Start with one small interaction in one Tilth interior:

1. Give selected furniture and a few portable props stable entity IDs, tags, statuses and footprints. Tilth's room/collision data remains authoritative.
2. Extract Notebook World's object/law validators and bounded effect interpreter. Adapt selection and effects to those Tilth entities; do not import `initialWorld`, bedroom locomotion, or a second renderer.
3. Put a discoverable notebook into that room. Demonstrate two supported definitions and a law with an actual visible consequence, such as water extinguishing a tagged burning object. Emit factual events through Tilth's ledger.
4. Keep existing static furniture drawing out of a mutable object's background layer. Removing/extinguishing it must affect its collision, appearance and events together.
5. Keep the existing server credential/queue owner. Port needed object/law schemas and failure handling behind it; do not create a competing AI service. Label any authored demo definitions honestly.
6. Verify deterministic application, stale target rejection, cascade budgets, visual/collision agreement and persistence before extending supported effects.

Do not expand the battle system, regenerate the world, migrate to 3D, or merge both entire engines during this integration. Those changes consume time without proving the creative rule mechanic.

## How the team can take this change

This branch descends directly from Tilth's `d40bf09`. The teammate can fetch the branch from the public Notebook World remote and cherry-pick the integration commit onto their current Tilth branch. This imports only the integration diff. If main has advanced, resolve the small adapter changes in `main.js`, `engine/runtime.js`, and `index.html`; the new modules are separate files. Do not merge unrelated Notebook World main history with `--allow-unrelated-histories`.

Keep the Notebook World implementation checkpoint available until all desired features are ported. Teammate main has not been pushed to or modified by this task.

## Validation and local preview

All 41 tests pass: the 35 existing Tilth tests plus six integration tests covering witnessed/distant/indoor actions, causal references, deduplication, saved memories, and Rowan's route through the actual rendered fence geometry. The quest marker follows Rowan's current position.

Browser checks passed on the local game: fresh-start thought; reveal/advance/focus; walk to Rowan; execute Slash → Slash → Heavy through the normal controls; observe his completed retreat and reaction; reopen conversation and see the memory callback; reload and retain the changed behavior; continue into Tilth's existing quest UI. No browser errors were recorded. The provider correctly reports that AI generation is not connected. Mobile-specific visual verification has not been performed on this integration.

Normal setup remains `npm ci`, `npm test`, `npm run dev`, `npm run build`.

On the current Windows host, the esbuild subprocess fails with `spawn UNKNOWN`. Vite's native config loader works, and the unminified modern-browser build succeeds:

    node node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1 --port 5174 --strictPort
    node node_modules/vite/bin/vite.js build --configLoader native --minify false --target esnext

The development dependency scan reports the same esbuild limitation; this project has no client package imports that need prebundling. This is a host workaround, not a claim that the default build command passed. No live provider calls or public deployment have been validated.
