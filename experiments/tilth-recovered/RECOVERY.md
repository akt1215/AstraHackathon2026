# Tilth recovery audit — 2026-09-14

The source repository and its worktree metadata were read without mutation.

- Durable repository: `/Users/akt/Desktop/Code/Independent_Project/hackathon/tilth`
- Latest branch commit: `2a23f444b3a0e8d7a0d007d10c0ecf05eb7dbac1`
- Both `/private/tmp/tilth-gameplay-publish` and `/private/tmp/tilth-world-integration` are missing.
- The former's index retains the unresolved automatic merge of `6f2e8fcc5513d42f072a091ff3270e1e863e90a9`; index metadata dates to Sep 10 15:05.
- The exact AUTO_MERGE tree `cba7ec02d25cfdab1e5d011e4e02c1f1ed4a8b2b` is extracted under `git-auto-merge/`. This is an incomplete merge, **not the later implemented integration**.
- `git fsck --no-reflogs --unreachable` found only this automatic merge's two trees and six conflict blobs, and no dangling commits.
- Neither index nor automatic merge includes `engine/region-world.js`, `engine/main-regions.test.js`, or the later scene/behavior changes.
- The relevant local Claude project directory contains one transcript, `064d0121-b621-4b3c-9239-04a763085569.jsonl`: 33 metadata/user rows, no assistant or tool-use rows, and empty tracked-file backups. No private transcript content was copied into this recovery folder.
- No filename matching `c7bdf85e-a59b-41d2-ad44-351601e4d9a3` was found under `~/.claude/projects`. Its location remains to be established.

Conflict-bearing recovered files: README.md, engine/encounters.js, engine/game-ui.js, engine/runtime.js, main.js, style.css.
