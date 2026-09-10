# Red team — unrestricted intent and behavior-shaped characters

Date: 2026-09-10. Reviewed design: PLAN.md at commit a030b61.
Status: adversarial design review; proposed tests have not been run. No changes to the
game design or implementation are authorized or applied by this report.

The game concept and the supplied gameplay ideas belong to Akito; Austin typed the
notes. The rescue scenario, three-care threshold, Mercy rule and winch alternative were
recommendations added during design work. Criticism of those choices is not criticism
of a requirement Akito accepted.

## Verdict

**The largest risk is a mismatch between the freedom the interface promises and the
freedom the simulation actually delivers.** It can accept every sentence while still
routing almost everything to an authored interaction or a narrated failure. A second
risk is character development that feels like the system taking control of the player.
Neither is settled by having reliable animation, valid JSON or persistent coordinates.

Counter-perspective: a small world can support creative play through combinations, and
constraints can make a character feel coherent. The issue is whether players experience
those benefits. The current proposal does not yet demonstrate that, and several specific
mechanics work against it. These are design hypotheses and counterexamples, not observed
playtest results, competitor research or claims about the actual provider's performance.

## 1. Critical: a fitting motion can be the wrong action

**Claim being challenged:** arbitrary intentions can be handled by choosing/composing
simple internal primitives. Evidence: PLAN.md §4, especially the move/throw example and
“juggle to distract.”

**Counter-perspective:** sharing animation and state operations is sound. But “move”
does not contain the meaning of throw, give, distract or rescue. Reusing motion reduces
renderer work; it does not automatically supply rules for attention, consent, support,
noise, catching or leverage.

**Concrete attack:** “I smash the vase behind the guard so he turns away while Edda
passes.” A perfect vase arc, breakage and narration still fail the player's objective
if guard attention and passage opportunity never change. Conversely, allowing the model
to invent those changes freely restores the arbitrary outcomes we wanted to constrain.
“I slide the key under the locked gate” also requires the gate to block people but pass
small objects; changing a trajectory alone does not establish that affordance.

**Minimum response:** keep unrestricted input, but model intent as desired interaction
plus physical proposal. Define a few reusable world relationships that support actual
combinations: size/passability, impact/noise/attention, ownership, and support/obstruction.
These are candidate rules for a tiny scenario, not a proposal to build universal physics.
Do not silently replace a distraction with damage or an animation-only flourish.

**Falsifier:** someone who did not author the room proposes an unlisted combination
using properties already established in that room. It achieves the intended state
change without a special-case handler added for that sentence. If only paraphrases of
already named actions succeed, we have demonstrated language flexibility, not creative
problem solving. If the attempt cannot be represented, say so; do not count pretty
narration as success.

## 2. Critical: the character currently follows a checklist

**Claim being challenged:** the character develops from what the player does, rather
than a skill tree. Evidence: PLAN.md §6 counts exactly charm return, potion healing and
cell release, then grants exactly Merciful/Reassure.

**Counter-perspective:** a bounded capability catalog is compatible with a character
that adapts. But a fixed three-event recipe is a scripted unlock even if its UI has no
skill-tree nodes. It can be a technical fixture; it cannot alone establish the stronger
product claim.

**Concrete attack:** one player protects the scout by drawing danger away, another
bargains away valuable equipment to secure Edda's freedom. Under the current whitelist,
neither novel act earns the same credit as the prescribed potion/charm errands. Players
who explore more creatively can receive less character development.

**Minimum response:** recognize evidence at the level of supported consequences and
context, such as voluntarily helping another at a cost, rather than object-specific
quest IDs. Let the model propose a contextual interpretation citing resolved event IDs;
keep capability changes bounded and evidence inspectable. Ambiguous motivation should
not silently cause a permanent restriction. Do not claim that a generated trait name
makes a hardcoded unlock emergent.

**Falsifier:** two different sequences with comparable supported consequences develop
a comparable tendency without sharing the exact event recipe. The same surface act in
a different context does not automatically earn the same judgment. Replay raw outcomes
and inspect the cited evidence; prose alone is not the acceptance criterion.

## 3. High: development can punish the player for roleplaying

**Claim being challenged:** repeated kind conduct justifies automatically restricting
future harmful conduct. Evidence: PLAN.md §6 makes Mercy permanent for the run; one
prior deliberate attack also prevents acquiring it.

**Counter-perspective:** a character with commitments can be more interesting than a
character who can switch personalities without friction. However, an inferred tendency
is not necessarily a promise. Healing an ally can be loyalty, self-interest or strategy;
it does not establish an oath about every stranger the character will later meet.

**Concrete attack:** the player helps people, then learns that a currently nonhostile
NPC is keeping prisoners. The player wants to threaten or hurt that NPC to rescue them.
A flat nonhostile/hostile classification cannot settle that conflict. “You are Merciful
now” may feel like an imposed interpretation, even when the player saw a warning.

**Minimum response:** distinguish observed tendency, learned capability and binding
commitment. Two alternatives for review: reserve hard refusal for a specific established
commitment; or preserve automatic restrictions but show their exact scope and provide
an intentional, consequential way for character change to occur. Neither requires a
player-facing verb list. The current permanent three-errand lock is the weakest version.

**Falsifier:** before seeing the system's response, ask the player whether the action is
consistent with the character they believe they have developed and why. Then show the
restriction and evidence. If the system repeatedly surprises the player with an identity
they do not recognize, the mechanic is authoring against them, not learning with them.
An isolated disagreement is not proof of failure; repeated unrecognized commitments are.

## 4. High: the winch undermines the character-development payoff

**Claim being challenged:** the physical and earned social routes offer meaningful
alternatives. Evidence: PLAN.md §3 gives an always-available, costless winch and a social
route requiring two extra helpful acts plus the shared rescue.

**Counter-perspective:** the unconditional route usefully prevents softlocks and moral
railroading. But the proposed reward opens the same gate that the winch already opens,
while Mercy removes future options. On the stated goal, the social route offers no
specified mechanical advantage. A player can still prefer its fiction, but that should
be an observed attraction rather than an assumed payoff.

**Concrete attack:** “Why should I do two extra errands and accept a restriction when
I can just turn the winch?” Neither a new trait label nor a congratulatory line answers
the gameplay question.

**Minimum response:** give both routes a legible consequence without making compassion
mandatory. For example, the winch requires leaving a useful tool as a brace, while the
gatekeeper can open the gate without that sacrifice. The retained tool must have a real
use later, or this is another cosmetic distinction. Alternatively demonstrate the
new social capability on a subsequent problem where it supplies genuine new agency.
A one-minute showcase can establish one concrete consequence; it need not add a campaign.

**Falsifier:** a player understands the physical route and still chooses the earned
route for a consequence they can name, or later uses the resulting capability in a
meaningful new situation. Do not tell testers that displaying Mercy is the objective.

## 5. High: deterministic execution does not make interpretation reliable

**Claim being challenged:** a deterministic engine makes free-text play predictable.
The plan accurately limits determinism to accepted commands; the player experiences the
entire path from sentence to outcome, including the model's interpretation (PLAN.md §1/§7).

**Counter-perspective:** model phrasing need not be repeatable. But materially equivalent
intent should not alternate between harmless transfer and attack, and character history
should change eligibility deliberately rather than because of a different parse.

**Concrete attack:** “Toss the key to Edda,” “gently lob her the key,” and “throw the key
so she can catch it.” All can animate with move. A generic impact rule could nevertheless
injure her. The command can be structurally valid and legal yet semantically wrong.
Likewise, a model can label an indirect harmful composition harmless; collision and
consequence checks must follow all affected entities rather than trust that label.

**Minimum response:** evaluate interpretation separately from execution. Store accepted
intent/composition for replay, recheck it after state changes, and clarify genuinely
ambiguous target or harm. Clarification is not the default for every new phrase; needing
it continually would destroy the natural interaction the product promises.

**Falsifier:** run paraphrases against cloned state and compare target, intended effect,
actual consequence and resources spent. Repeat with an unavailable target or changed
character constraint: results should change for the stated reason. Any unrequested harm
is a concrete failure, even if the schema validates and the animation looks correct.
Replay proves only execution; fresh model calls are required to evaluate interpretation.

## 6. High: the build order proves the ordinary game before the differentiator

**Claim being challenged:** the current delivery sequence is the right way to retire
risk. Evidence: PLAN.md §8 places model interpretation fifth, after direct play and
character rules. §7 requires interpretation, validation/commit, then outcome narration.

**Counter-perspective:** working direct controls and persistence are valuable foundations.
But these are not the uncertain claim. We could build a polished point-and-click rescue
and still discover that novel input is poorly understood or too slow to be enjoyable.
Post-commit narration is honest, but may require a second model phase; its latency is
not established by the older reference measurements or by a cached demo.

**Minimum response:** make a narrow risk spike the first implementation milestone after
authorization: one room, a few entities, actual model interpretation, committed state,
a basic renderer and history-aware behavior. Measure interpretation delay, time to first
committed visible effect and narration start separately. Keep asset generation and long
speech out of the critical interaction path until measured. No provider timing claim is
made in this review.

**Falsifier:** an uncoached player tries novel actions, sees the intended consequence,
and continues choosing free text because it is useful. If they switch entirely to
clicking because text is slow or cosmetic, the differentiator has not survived contact
with play. A live unfamiliar action matters more here than a flawless cached script.

## Recommended proof before committing to the full plan

This is a proposed protocol, not a completed experiment or authorization to implement.

1. **Preserve intent:** have a tester supply an unfamiliar physical/social combination
   within the room's established properties. Write down intended outcome before running
   it. Check actual state changes, not just narration or primitive selection.
2. **Generalize conduct:** use two different paths of supported choices to develop a
   comparable tendency. Add one context-changing counterexample. Inspect evidence and
   resulting capability rather than matching trait labels alone.
3. **Show a counterfactual:** branch from one save into two behavior histories. Bring
   both to the same encounter and use the same sentence. Demonstrate a meaningful,
   explainable difference attributable to history, with a viable alternative in each.
4. **Prove freedom has value:** let someone play without the demo script. Observe whether
   they invent a useful approach, recognize the resulting character, and willingly
   use text despite the available direct shortcuts. Record delays and clarify counts;
   do not replace observation with an arbitrary pass percentage.

**Decision rule:** if (1) fails, expand or narrow the world's supported relationships
before adding content; do not narrow the player's vocabulary. If (2) fails, describe
progression honestly as authored unlocks until it improves. If (3) fails, the showcase
does not yet prove behavior-shaped play. If (4) fails, revise the interaction or reward
structure before investing in more art, rooms or quests.

## Review of this critique

The recommendations themselves have costs. Generalized behavioral interpretation can
be inconsistent; evidence citations and modest capability boundaries constrain but do
not solve that. A breakable commitment weakens rigid identity unless breaking it matters.
Adding physical properties can expand scope quickly. These are reasons to test a tiny
slice first, not evidence that the original idea is impossible.

The report leaves Akito's settled requirement intact: unrestricted player language,
AI-selected/composed internal primitives. It does not turn the red team into a covert
approval for a new design. No product code, runtime benchmark or playtest was performed.
