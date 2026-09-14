# Generated regions and behavioral consequences

Context: combine main’s boundary witch, generated terrain, residents, regional quests, and earned combat awakenings with the existing persistent simulation and freeform interactions.

1. Preserve both sides of the merge: optional requests, fast local movement, world interaction panel and traits, alongside generated regions and executable awakened moves.
2. Give each region and house an independent scene identity. Register real residents and enemies, persist position and conditions, restore the correct terrain and room, and reject replies from previous scenes.
3. Record authoritative combat facts before hostility changes. Deduplicate fight milestones and distinct victims. Separate peaceful aggression from enemy combat and defeat from confirmed death. Existing townspeople recover unless permanent death is explicitly chosen.
4. Derive named traits from retained evidence. NPC consequences use only firsthand or sourced reported evidence, preserving uncertainty and preventing omniscient reputation.
5. Expose these traits and their reasons in the character panel and bounded model views. Preserve the existing care/honesty development.

Files: main.js; encounters, runtime, game-ui, region-world, world-simulation, world-controller, behavior-traits, world-traits and tests under engine/; shared types; world API schemas/prompts; README and styles.

Verification: region save/reload and house isolation; hit/defeat/death, retaliation, duplicate impacts and multiple victims; witness and report filtering; stale reply rejection; full existing test suite, type checking and production build. Exercise a separate browser save through generated region entry, house interactions, traits and reload, then publish incremental commits on the gameplay branch and update the local running build.

Review risks: do not classify recovery as murder; do not leak unseen violence to every NPC; do not reset NPC conditions on travel; do not trigger generation on ordinary movement; do not reintroduce automatic quest flooding or preview-only awakenings.
