# Archive inventory

Collected on 2026-09-14 for publication in [akt1215/AstraHackathon2026](https://github.com/akt1215/AstraHackathon2026). Original checkouts, credentials and local game saves are not modified by this collection.

## Source versions

| Location | Original source | Preserved revision |
| --- | --- | --- |
| Repository root: Elsewhere and original world | `akt1215/AstraHackathon2026`, `codex/life-sim-proof` | `5642e10` |
| Original deterministic-world milestone, retained in history | `akt1215/AstraHackathon2026`, local `main` | `09489ce` |
| `experiments/tilth/` | [shresthkapoor7/tilth](https://github.com/shresthkapoor7/tilth), `codex/tilth-gameplay-improvements` | `2a23f44` |
| `references/austin-astra/` | [Austin-Senna/astra-hackathon](https://github.com/Austin-Senna/astra-hackathon) | `f4d392c` |
| `experiments/tilth-recovered/` | Recovered Sep. 10 working tree | See its `RECOVERY.md` |

The two imported directories are Git subtrees with their original histories retained. Their files match the source trees at the revisions above. They are independent programs, not dependencies of the root application. The recovered Tilth experiment is a separate source snapshot reconstructed from recorded file writes after its temporary worktree was lost; its recovery record names the evidence and retains its unfinished status.

## Included artifacts

Source code, tests, lockfiles, configuration examples, plans, red teams, implementation notes, runbooks and dated verification reports are included. The life simulator also includes its generated concept image, eleven Blender furniture sources and exported models, studio preview images, character models, scanned material maps and environment lighting. Their attribution and licenses remain alongside the files and in `LIFE_ASSET_CREDITS.md`.

Runtime saves and private conversation transcripts are not source artifacts. `.env`, credentials, `node_modules`, `dist`, `dist-life`, game data and machine-local logs remain excluded. Configuration examples contain placeholders, not credentials.

## Collection checks

- Root application: 150 tests; TypeScript check; original-world and life-simulator production builds.
- Tilth: 98 Node tests and 5 Vitest tests pass; typecheck and production build pass.
- Recovered Tilth experiment: 171 tests pass; typecheck and production build pass. It was never committed or published as a working game before its temporary worktree disappeared.
- Austin reference: 78 tests pass; full and backend typechecks pass. The frontend build cannot resolve `/apps/client/main.tsx`, which is absent in the original public `f4d392c` snapshot and documented in its README. This limitation is preserved, not introduced by collection.
- Imported source trees checked against the exact source revisions, preserving original modes and binary assets.
- Reachable Git history scanned for known local configured credentials and common credential/private-key patterns without printing credential values; no matches found in the public payload inspected.

These are archive collection checks. They do not constitute a new live-model demonstration or claim that every historical screenshot describes the latest runtime. Original verification documents retain their dates and limitations.
