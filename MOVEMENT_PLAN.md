# Movement responsiveness correction

User feedback, September 10: per-tile model waits are painfully slow. Spotting is a change
of awareness, not a new decision for every tile while the same person remains in view.

Approach: preserve engine ticks/physics and serial durable commits; choose NPC model
slots on walks from newly perceived significant events, first sighting, and meaningful
condition/access changes. Persist consumed observations and noticed characters across
reload. Familiar companions are already recognized. Continue an accepted follow decision
locally with one validated step; do not infer permission or invent new NPC choices.
Explicit speech/interactions/waits retain deliberate NPC decision opportunities.

Files: new server/reactions.ts plus regression tests; coordinator integration; shared types;
client pending labels; run/verification notes. No dependency change.

Verification: quiet walks cause zero calls; first sighting exactly one; continuing/re-entering
view and reload don't repeat recognition; meaningful noise/report remains eligible; sleepers
are excluded; follower steps obey walls/knowledge and survive reload; retries and crash
recovery remain intact. Built browser and HTTP latency check with a slow/real provider.

Self-review: merely hiding the spinner would leave the delay. Skipping all reactions would
freeze NPCs and miss reports. Record a per-NPC observation cursor at decision scheduling,
then process later NPC reports on the next turn. Use actual filtered observations rather
than global event contents. Keep current save readable with a one-time observation baseline.
