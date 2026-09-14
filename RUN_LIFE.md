# Elsewhere — life-simulation proof

A furnished 3D home with one controlled resident, two autonomous housemates, needs, object activities, relationships, memories and asynchronous model-backed conversations. This is the small Sims-inspired proof. Full build/buy, careers, household switching, custom character creation and arbitrary generated fictional worlds are not implemented.

## Run

```sh
cd /path/to/AstraHackathon2026
npm ci
npm run build:life
npm run play:life
```

Open **http://127.0.0.1:8791/**. Stop the previous life server before starting another on that port. The save is `data/life-session.json`, written atomically and ignored by git. The original world uses the same repository but a separate production command and port.

For development, `npm run dev:life` starts the life server on8791 and Vite on5175; open **http://127.0.0.1:5175/life.html**. The proxy and allowed browser origin match this pair. The production entry does not watch source files: rebuild client changes; restart the server for backend or environment changes.

## Play

- Click open floor or use WASD/arrow keys to move. Keys follow the current camera. Drag to orbit and scroll/pinch to zoom; the camera button switches to follow view.
- Click an object to eat, sleep, unwind, read, paint, water plants or make coffee. The home button in the resident panel opens a keyboard-accessible object list.
- Hold Shift while choosing an activity to queue it. The cancel button clears your current activity and queue. Housemates make their own choices; player commands retain priority.
- Click June or Leo, or their portrait, for social actions. Free-text conversation requires a connected provider; the simulation continues while a reply is pending.
- Pause/1×/3× controls game time. Needs, activities and relationships persist after reload. The help panel has a two-step fresh-life reset that replaces only this proof's save.
- City loft, Lantern house and Skyline studio are **authored visual presets** over the same home and mechanics. Theme switching preserves your life. They do not reproduce licensed fictional universes or generate arbitrary worlds.

## Connect Astra

Use [life.env.example](life.env.example) as a settings reference. Put `OPENAI_API_KEY` in the local ignored `.env`, set `LIFE_PROVIDER=openai` and `ASTRA_MODEL=gpt-6-astra`, then restart the life server. Do not commit or paste the key into chat. `LIFE_PROVIDER` overrides any existing `ASTRA_PROVIDER` setting.

Without a key, the default uses an available logged-in Claude CLI and labels it **Claude CLI fallback**. `LIFE_PROVIDER=offline` uses only local routines. No provider credentials are read from the CLI's files. A missing key or unavailable CLI does not stop the simulation.

The provider badge identifies the runtime, pending work and the last error. Its tooltip includes call count and response latency. A configured key alone is not proof of working Astra access; confirm an actual free-text reply and resulting action.

Model output proposes one of four bounded responses: accept conversation, share a meal, decline, or walk away. The engine validates the pending request, world identity and bounded decision before applying it. Routine need fulfillment and menu-driven social rules are deterministic; the model is used for contextual free-text reactions. There is no automated billing cap; call counts are per server process, not token-cost accounting.

## Verification and assets

```sh
npm test
npm run typecheck
npm run build:life
node --env-file-if-exists=.env --import tsx server/life-probe.ts
```

The last command makes one real model request using an isolated fictional fixture; it does not modify the running game's save. HTTP integration tests require permission to bind local sockets. See [LIFE_VERIFICATION.md](LIFE_VERIFICATION.md) for measured results and limitations, and [LIFE_ASSET_CREDITS.md](LIFE_ASSET_CREDITS.md) for character and font licenses.

The renderer uses authored procedural furniture and CC0 Quaternius characters. Character-specific cooking and other interaction animations are approximated using supplied clips and procedural poses. Visual fidelity is that of a polished prototype, not an AAA production. Unity and Blender are not required to run this proof.
