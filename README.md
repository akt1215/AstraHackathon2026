# Astra Hackathon 2026

Akito Yamauchi’s game experiments from the September 2026 Astra hackathon: free-text actions, deterministic world rules, characters shaped by their actions, and consequences grounded in what other characters actually witnessed.

This repository collects the different prototypes and their development history. It is an archive of the work, including experiments and teammate references, rather than a claim that every version was the final submission.

| Project | Where to start | What it contains |
| --- | --- | --- |
| **Elsewhere** | [Life simulator](RUN_LIFE.md) | A 3D home, autonomous housemates, needs, activities, conversations, traits and lasting consequences. The latest life-simulation work is at the repository root. |
| **The DM Is Real** | [Original world engine](RUNNING.md) | The earlier deterministic world, free-text intentions, local movement, character state, perception and witnessed consequences. Its client, server and shared engine remain alongside the life simulator. |
| **Tilth integration** | [Pixel RPG](experiments/tilth/README.md) | Our integration of the pixel world, movement and combat with deterministic interactions, persistent NPC observations and a traits panel. |
| **Austin’s reference implementation** | [The House Remembers](references/austin-astra/README.md) | The public teammate backend/engine reference used during integration, preserved with its source history and asset credits. Its upstream snapshot has no runnable frontend entry point. |

## Run Elsewhere

Use Node.js 24.12 or newer. From the repository root:

```sh
npm ci
npm run build:life
npm run play:life
```

Open **http://127.0.0.1:8791/**. For development, run `npm run dev:life` and open **http://127.0.0.1:5175/life.html**.

See [RUN_LIFE.md](RUN_LIFE.md) for controls and [life.env.example](life.env.example) for configuration. Use a local `.env` for credentials. Offline routines and the available logged-in Claude CLI fallback let you explore without an OpenAI key; provider status is shown in the game.

The original world runs separately:

```sh
npm run build
npm start
```

Open **http://127.0.0.1:8787/**. The [original runbook](RUNNING.md) describes its goal and interactions. Imported prototypes have their own `package.json`, dependencies and launch commands; run those commands from the corresponding folder.

## Art, design and provenance

- [Life implementation](LIFE_SIM_IMPLEMENTATION.md), [visual plan](docs/CINEMATIC_VISUAL_PLAN.md), and [concept image](docs/visual-targets/cinematic-loft-v1.png).
- [Blender sources and previews](art/blender/README.md), exported models and material manifests under [life assets](client/public/life-assets/).
- [Original design](PLAN.md), [red team](RED_TEAM.md), [engine implementation](IMPLEMENTATION.md), and [teammate integration plan](INTEGRATION_PLAN.md).
- [Archive inventory](ARCHIVE.md) identifies source revisions, checks and any incomplete work.

The game concept and design direction are **Akito Yamauchi’s**. Austin transcribed the design notes discussed during the event. Austin Senna and Shresth Kapoor contributed separate implementations and assets; their original histories and attribution are retained. The Tilth source is from [shresthkapoor7/tilth](https://github.com/shresthkapoor7/tilth), and the reference implementation is from [Austin-Senna/astra-hackathon](https://github.com/Austin-Senna/astra-hackathon).

Third-party asset terms remain in [life asset credits](LIFE_ASSET_CREDITS.md), [reference asset credits](references/austin-astra/public/CREDITS.md), and the bundled license files. This archive does not replace those licenses or grant a new blanket source-code license.

Credentials, machine-local saves, dependencies and generated build output are intentionally excluded. Historical handoff and verification documents describe their dated checkout; this README is the archive’s entry point. The recovered unfinished Tilth experiment lives in `experiments/tilth-recovered/`; it is source-verified and testable, but is explicitly not presented as a completed publication.

## Check the code

```sh
npm test
npm run typecheck
npm run build
npm run build:life
```

These commands check the root world and life simulator. Run the independent prototype suites in their own directories.
