# Integration sources

The game concept and design are Akito Yamauchi’s. Austin Senna transcribed the original design notes.

- Tilth foundation: https://github.com/shresthkapoor7/tilth at 7991a5d, including its pixel scenery, character creator, combat, interiors, sound and original contribution history.
- World rules and narrator adapter adapted from Astra_Hackathon_2026 at 09489ce.
- Current world props are drawn by `engine/world-object-renderer.js` in Tilth’s native pixel scale and material palette. The earlier imported six object sprites retained in `art/objects/` originate from https://github.com/Austin-Senna/astra-hackathon at f4d392c5ace99a01ce928cb059b0960e1a00fe59, `public/art/hero/`, generated there by `scripts/build-assets.ts`. Container, consumption, inspection and mechanism patterns also draw on that implementation.
- Earlier Notebook World dialogue integration provenance remains recorded in `docs/INTEGRATION.md`.

These are teammate integration credits, not a new license grant.
