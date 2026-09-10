# Visible world and character development corrections

User feedback: the In view list must match the visible page, imported objects look out of place, and traits are hard to find. Source inspection found room-wide nearest-seven selection, uniformly enlarged32px icons, and development hidden in an evidence-only disclosure.

Use one tested camera transform for the800×600 canvas's cover crop, player-anchored object position and screen intersection. List rendered ground objects/characters within that view, preserving distance checks for interaction. Closed/held contents remain private; open-container contents belong in the selected container's controls rather than appearing as free ground objects.

Draw small authored pixel props with Tilth's stone/wood/metal palette and ground shadows. Preserve IDs, ownership, coordinates and saves. Add a visible Traits entry using actual player conditions, evidence-backed tendencies/capabilities and recorded relationships; an empty history must say so rather than invent traits.

Verify crop edges/mobile/resize/hit transforms and container projection with regressions; run existing tests/build and inspect desktop+390px production UI. Keep API configuration in ignored Tilth .env, preserve existing credentials, explain provider switch/restart without printing keys.

## Verified result

103 tests pass (98 Node +5 Vitest), typecheck/build and diff checks pass. Actual production preview checked at desktop and390×844: cropped Foxglove disappears from In view; remaining partial/on-screen characters stay listed; Traits opens with readable condition grid and honest empty history; chest opens, contained ledger is selected and examined via contents controls without becoming a loose ground sprite. All eight native prop silhouettes visually inspected. User's localhost8788 save was not used for these checks. No model calls needed for this presentation change.
