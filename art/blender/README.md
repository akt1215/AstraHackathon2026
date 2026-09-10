# Original cinematic furniture

The eleven GLBs in `client/public/life-assets/cinematic/` are original procedural models for the loft. They have no third-party mesh, texture, add-on, or decoder dependency. Scanned PBR textures are supplied separately by the runtime material layer.

## Reproduce

Built with the user's installed **Blender 5.2.1 LTS**. The generation script also ran with official Blender 4.5.9 LTS. No global Blender settings or installed add-ons are required.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python art/blender/build_cinematic_kit.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python art/blender/render_kit.py
node art/blender/validate_kit.mjs
```

The first command generates the compressed `.blend` source files and their GLB exports, then records exact bounds, materials, triangle counts and hashes in the runtime manifest. The second imports the **exported GLBs** and renders each under the same studio lighting. These product previews show asset geometry; they are **not gameplay captures**. The third verifies all eleven with Babylon's glTF importer independently of Blender.

## Coordinate contract

- Meters, Y-up, origin at floor center, local front **−Z**, back/headboard **+Z**.
- Each exported mesh has identity transforms. Keep Babylon's glTF conversion root intact: it mirrors X while preserving front/back Z.
- Sofa: nominal 2.8 × 1.1m, seat approximately 0.57m. The soft throw overhangs the front by about 7cm.
- Bed: local 2.2 × 2.1m; rotate +π/2 to match the existing world footprint. Duvet surface approximately 0.72m, headboard top 1.22m.
- Dining table: 1.9 × 1.2m, tabletop 0.862m; chairs are separate assets so their authoritative collision positions remain unchanged.
- Chair: nominal 0.58 × 0.54m, padded seat 0.547m. Curved back rails extend 5cm beyond the nominal back edge.
- Kitchen: 3 × 0.69m. Rotate π to face world +Z; cabinet pulls extend about 5cm beyond its front edge. Counter 0.90m, highest pantry vessel 2.23m.
- Refrigerator: 0.9 × 0.9m, top 1.87m. Finished French doors, recessed pulls, side service panels and rear cooling coils all fit the nominal footprint.
- Bookcase: local 1.8 × 0.7m, top 2.30m. Cupboards, book groups, ceramics and framed artwork stay inside the existing footprint.
- Wall shelf: local 1.72 × 0.30m. Origin sits **on the wall face at the lowest bracket point**, not on the floor, so the kit's shared "nothing below the origin" invariant still holds; `validate_kit.mjs` rejected the first export for breaking it. Planks project −Z with tops at 0.232 and 0.672; the tallest vessel reaches 0.972.
- Coffee table: local 1.15 × 0.62m, top 0.446m, lower magazine shelf 0.189m. Books, brass tray, candle and shelved magazines all sit inside the nominal footprint.
- Armchair: local 0.86 × 0.88m, seat 0.617m, arm cap 0.818m, back cushion top 1.01m. The wool throw sits over the **back**; draped over an arm it put cloth 17cm outside the nominal footprint, which the exported bounds caught.
- Window frame: 3.02m wide × 2.40m high. Place the origin at the opening's sill. Panes are deliberately open for separately rendered glazing and city depth.

Hard surfaces use dominant-axis planar UV projection in meters; fabric uses explicit continuous surface UVs in meters. **One UV unit corresponds to one meter** before runtime texture repeat. Runtime material names all begin `cinematic.` and are enumerated per asset in the manifest. Material colors are stored in linear space; roughness/metallic values are authored but can be replaced by scanned maps.

Sofa and bed include closed, bulging cushions with modeled perimeter seams, geometric cloth folds and hanging blanket edges. Chairs have tapered/splayed legs and curved back rails. Cabinet doors have actual recessed shaker panels; the sink is an open basin, not a painted top. Soft bevels and joined material batches preserve silhouettes with 3–10 draw batches per asset.

## Tool setup and teardown

The initial portable-tool check used Blender 4.5.9 arm64 from `https://download.blender.org/release/Blender4.5/blender-4.5.9-macos-arm64.dmg`. Its SHA256 matched the official release checksum: `e3a3d7aac381fb4e4d05197f99cd8899484d7e8bc4497c134066e6733f372238`. Once the user's installed Blender was available, the temporary read-only mount was detached and our duplicate temporary installer was deleted. No files in the user's Downloads or Applications were removed.

The complete eight-asset export is **7,064,788 bytes** with **169,448 triangles** and **47 material batches** across one instance of each asset. These are asset statistics, not a runtime frame-rate measurement. Repeated window/chair instances and shadows add runtime work. The fridge has an additional rear-view preview. To regenerate or preview a subset, append `-- bookshelf fridge` (the preview script also accepts `fridge-rear`).
