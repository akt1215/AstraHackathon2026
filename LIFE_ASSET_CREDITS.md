# Character asset credits

Three models by **Quaternius**, distributed under **CC0 1.0 Universal**. Retrieved directly from the creator-linked public download folders on 2026-09-10.

CC0 permits copying, modification, and redistribution, including serving the raw model files publicly and commercial use. Attribution is voluntary; these credits retain provenance and do not imply endorsement. [CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/) · [legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode).

| Local file | Original file | Creator's source |
| --- | --- | --- |
| `client/public/life-assets/casual-man.glb` | `Casual_2.gltf` | [Download source](https://drive.google.com/file/d/1Jn7kULNmrtqP8BUUL19h8MhbdOnwPFhv/view) |
| `client/public/life-assets/hoodie-man.glb` | `Casual_Hoodie.gltf` | [Download source](https://drive.google.com/file/d/1em1So1xwwQNfHJYMvzKcXkZllvtxpKP5/view) |
| `client/public/life-assets/casual-woman.glb` | `Casual.gltf` | [Download source](https://drive.google.com/file/d/18b3WwlrwrFYWAM7BcnjWeIxKJyxAQiGh/view) |

- Men: [Ultimate Modular Men Pack](https://quaternius.com/packs/ultimatemodularcharacters.html), [official download folder](https://drive.google.com/drive/folders/1USAAquX2JJWuA2m6zol0KUkFe3UkZ8zX). Bundled license preserved at `client/public/life-assets/QUATERNIUS_MEN_LICENSE.txt`.
- Woman: [Ultimate Modular Women Pack](https://quaternius.com/packs/ultimatemodularwomen.html), [official download folder](https://drive.google.com/drive/folders/1720N9IGyQHXYvtvZJzazhxtTTlz-y2Vf). Bundled license preserved at `client/public/life-assets/QUATERNIUS_WOMEN_LICENSE.txt`.

The source glTF files use embedded binary data and material colors. They were losslessly repacked as self-contained GLB files; geometry, colors, 62-bone rigs, and 24 source animations are unchanged. No external textures or decoder dependencies are required. Exact hashes, sizes, animation names, and source bounds are recorded in `client/public/life-assets/manifest.json`.

All three import successfully using Babylon.js 9.26.0, each with one 62-bone skeleton. `Idle`, `Walk`, `Interact`, and `Wave` were each started and sampled through Babylon's NullEngine. This checks import and clip execution, not rendered appearance. Characters are roughly 1.85 units tall, Y-up, with feet near zero. Source-facing direction is +Z; Babylon's handedness conversion root must be considered when rotating them. There is no source `Sit` animation.


## Interface fonts

DM Sans and Manrope are bundled locally through Fontsource under the SIL Open Font License. License copies are in `client/public/life-assets/licenses/`. Only Latin styles used by the interface are imported; other text uses the system fallback.

- https://fontsource.org/fonts/dm-sans
- https://fontsource.org/fonts/manrope

The life client does not load fonts from a third-party server at runtime.

## Original cinematic furniture

The six models under `client/public/life-assets/cinematic/` are original procedural geometry created for this project, with reproducible source scripts and `.blend` files in `art/blender/`. No third-party meshes, image maps, characters, paid libraries, or Blender add-ons are embedded in these GLBs. Runtime scanned textures retain their separate Poly Haven source and license records.

The kit includes a piped upholstered sofa, layered bed and duvet, planked dining table, curved-back chair, shaker kitchen cabinetry with an open sink, and a steel/wood window frame. Source material colors, roughness, and metalness are authored directly. Source, exact bounds, pivots, material names, hashes, and verification commands are documented in `art/blender/README.md` and `client/public/life-assets/cinematic/manifest.json`. Studio preview images in `art/blender/previews/` are renders of the exported GLBs, not gameplay captures.
