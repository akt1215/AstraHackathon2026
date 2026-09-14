# World integration verification — 2026-09-10

Base: Tilth 7991a5d. Implementation commits: 49ffd4c, 7b72fef, cd37f9c, 3b4bad9, bf2837c.

- `npm test`: 87 Node tests and 5 Vitest tests pass. No upstream service is called by the suite.
- `npm run typecheck`, `npm run build`, `git diff --check`: pass.
- The opening-goal regression initializes the rendered volcano collision geometry, starts at fresh positions and walks through reachable paths to take supplies, pay Rowan, heal Clover and obtain support. It asserts 2 remaining coins, Clover fatigue 55, causal care evidence and completed objective.
- Review reproduced and corrected: unbounded actor-view history, ignored placement coordinates, late cross-room actions, late friendly responses after combat starts, thrown injury bypassing defeat/recovery, lost interaction focus, failed-provider retry latch, concealed inn furniture interaction, and direct receipts missed while facing away.
- Browser checks on the production build at `http://127.0.0.1:8788/`: manual onboarding, actual phone-width (390 × 844) movement controls, pickup/drop, typed action retention without gameplay shortcuts, observed journal entries, and reload preserving profile/position/world history. Canvas and new controls were visually inspected in Tilth's authored dark palette; this game has no light-theme toggle.
- Final durable-checkout browser round-trip with Claude enabled: unrestricted pickup committed, carrying list gained the stone, input cleared only after success, and movement remained available during background NPC inference. This caught and fixed native browser fetch receiver binding (bf2837c); a failing regression became green.
- Local logged-in Claude CLI: “Pick up that smooth stone gently” yielded a valid transfer and a held stone (4.291 s); fatigued Clover chose a valid rest based on her own view (7.683 s). These were isolated in-memory worlds, not player-save mutations. Probe script removed afterward.

The original Astra server on 8787 remains separate. This remains single-player, browser-owned state. Model requests are proposals revalidated against the current world. Hosted OpenAI inference, multiplayer, cloud-save migration and the existing staged boss preview are not claimed as complete or tested by this integration. Optional creator/quest generation continues to require Tilth's OpenAI configuration.
