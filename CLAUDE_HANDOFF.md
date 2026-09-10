# Elsewhere — Claude Code continuation

Prepared 2026-09-10. User explicitly requests switching to Claude Code because Codex usage is running out. Continue the already-approved implementation; do not re-plan from scratch.

## User goal and approval

A Sims4-style browser life simulation, direct control of one character, with Astra-backed traits, social responses and consequences. Candidate replacement for today's hackathon submission (17:30 EDT deadline per participant guide; check current time). User rejected the first prototype's fidelity, approved the generated cinematic loft target, and installed Blender. Their requested quality is cinematic/realistic, with art direction matching the chosen world. Arbitrary generated fictional worlds remain future scope.

Reference: https://x.com/anshuc/status/2096008083826725132 . Read docs/reference-notes.md for actual observations. Approved target: docs/visual-targets/cinematic-loft-v1.png. It is concept art, not gameplay or a promise of achieved fidelity. Read docs/CINEMATIC_VISUAL_PLAN.md.

## Work location and safety

Work ONLY in /Users/akt/Desktop/Code/Independent_Project/hackathon/astra-life-sim-proof, branch codex/life-sim-proof. This is already an isolated worktree. Original Astra_Hackathon_2026 checkout and parallel Tilth project must remain untouched. No merge, push, deployment or submission has been requested. Preserve user saves and ignored .env; never print credentials.

Blender is already usable at /Applications/Blender.app/Contents/MacOS/Blender (5.2.1). No plugin/MCP/add-on needed. art/blender/README.md has reproducible generation and exported-GLB preview instructions. Eight original GLBs and their Blender sources are committed.

## Current implementation

- Babylon PBR renderer: scanned CC0 wood/linen/plaster/brick maps and city HDR, practical lights, SSAO, FXAA/bloom, modeled city depth and haze.
- Eight Blender models: sofa, bed, dining table/chair, kitchen, window frame, fridge and bookshelf. client/public/life-assets/cinematic/manifest.json; art/blender/ sources/previews. Asset worker reports 7.06 MB,169448 triangles,47 material batches before repeated instances; all eight imported/hash/bounds/UV/normal/material checked and exported-GLB previews inspected.
- Smaller HUD, Hide interface / H shortcut, Escape restores, selecting a resident/object restores controls. Loading blocks keyboard and pointer input via inert until state and scene readiness. Texture/HDR errors produce degraded readiness; timeout starts on first state.
- Fixed furniture signature axis mismatch causing bed/bookcase rebuilds every poll; corrected frame metrics to include stalls and compute actual average FPS with warmup/visibility handling.

Key files: client/src/life-scene.ts, life-materials.ts, life-main.ts, life-style.css. Follow imports and read source before further changes. Core commits 305a69c, be7cbd3,5cdc3f4,cfe3fbd,059859a,3ccfb82. Latest renderer integration is 3ccfb82.

## Runtime / API

Production URL http://127.0.0.1:8791/ . npm run play:life starts it with ignored .env. It was running in Codex shell session7635; check listener before starting another. User save world ID was95b0b619-0e1d-4f44-af87-bddaf906ad8e; do not reset it for QA. Live gpt-6-astra probe returned a valid applied meal-sharing decision in4149ms; production restarted with same world identity and Astra health/badge. No new production-browser conversation was sent in the cinematic follow-up.

Isolated test instance was8795, data/private/tmp/life-cinematic-fixture.json, offline. Safe command if stopped:
LIFE_PROVIDER=offline LIFE_PORT=8795 LIFE_DATA_FILE=/private/tmp/life-cinematic-fixture.json NODE_ENV=production node --import tsx server/life-server.ts
Dev Vite was5175/life.html and proxies production8791; avoid mutating user save from dev. Renderer asked to stop dev/fixture proxies during handoff.

IMPORTANT: dist-life predates final fridge/bookshelf integration and latest loading guards. Rebuild before judging production. Existing tabs may hold old JS; reload after build. Do not assume current localhost appearance is HEAD.

## Evidence and outstanding work

Root directly observed better modeled furniture/materials/city/lighting and working H/Escape, plus a real focus regression failing then passing. 115 tests across16files passed before the last asset integration; typecheck passed afterward. Last production build passed before final changes (large-bundle warning remains).

Renderer reports final Chrome1414x945 dev sample:600 visible intervals /8.8088s,68.1 average FPS,median14.5ms,p9519.3ms,max34.4ms,0 stalls>50ms with3residents. This is one dev sample, not a cross-device or final production guarantee. Read canvas data-scene-performance. Renderer also reports real browser fixtures: first backend state delayed35s did not prematurely timeout; failed wood_floor/arm.jpg settled degraded with exact failed path. These are secondhand reports to verify if relied upon.

Independent source review found no remaining actionable defects after loading inert/keyboard guards and readiness fixes. This does NOT replace final rendered QA.

Next, in order:
1. Inspect latest git status/source/target and actual scene. Major remaining aesthetic gap is character detail/natural animation; room still below concept density. Do not claim AAA or photoreal parity. Portrait camera leaves excessive city above room; proposed higher overhead angle was NOT implemented.
2. Run npm run typecheck, npm test, npm run build:life after final source changes. Use isolated8795 for actual production QA. Check all8 object interactions, floor picking/WASD, social selection, queue, pause/speed, save/reload, no-provider behavior, hide/restore and loading controls. Check all presets/light+dark and390px portrait. Avoid duplicate costly live calls unless needed.
3. Compare rendered gameplay against concept, fix largest remaining concrete issues within deadline. Natural human models/animation are unresolved scope, not solved by furniture. Preserve working save/collision coordinates.
4. Close temporary WebGL tabs before final frame sampling; report frame-time tails, not just median. Refresh user8791 only after final built QA, show result, update LIFE_VERIFICATION.md/RUN_LIFE.md/plan status truthfully, commit scoped changes.

Do not lose the result in planning: user already approved this visual pass. They now want Claude Code to continue it. No need to install Blender extras.
