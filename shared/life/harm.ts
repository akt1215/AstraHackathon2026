/**
 * Consequences for harming a housemate.
 *
 * The model only ever classifies what the player did; every number here is applied by the engine,
 * so a resident cannot be talked into being unharmed and the player cannot be talked out of the
 * reputation they earn. Saying "I punched her" has to leave her hurt, the relationship wrecked and
 * a mark on the player, or the world is not simulating anything.
 */
export type HarmLevel = 'none' | 'threat' | 'physical';

export interface HarmRule {
  /** Relationship damage between the two of them, applied to both directions. */
  relationship: number;
  /** Injury added to the target, 0-100, which recovers over simulated time. */
  hurt: number;
  needs: { energy: number; fun: number; social: number };
  /** Relationship damage to anyone else who saw it happen. */
  witness: number;
  mood: string;
  verb: string;
}

export const HARM: Record<Exclude<HarmLevel, 'none'>, HarmRule> = {
  threat: { relationship: -24, hurt: 12, needs: { energy: -4, fun: -18, social: -10 }, witness: -8, mood: 'Shaken', verb: 'threatened' },
  physical: { relationship: -58, hurt: 46, needs: { energy: -22, fun: -34, social: -26 }, witness: -20, mood: 'Hurt', verb: 'hurt' },
};

/** Injury recovers over simulated seconds; a punch stays visible for several in-game hours. */
export const RECOVERY_PER_SECOND = .085;
export const hurtAfterRecovery = (hurt: number, dt: number): number => Math.max(0, hurt - dt * RECOVERY_PER_SECOND);

/** Above this a resident is visibly injured and will not willingly be near whoever did it. */
export const HURT_THRESHOLD = 20;

const ESCALATION: { at: number; trait: string; replaces?: string }[] = [
  { at: 1, trait: 'Callous' },
  { at: 3, trait: 'Violent', replaces: 'Callous' },
];

/**
 * Traits the player has earned by their own conduct. These are not offered as a choice: a
 * reputation is something the world assigns, and it persists in the save like any other trait.
 */
export function traitsAfterHarm(traits: string[], harmDone: number): string[] {
  let next = [...traits];
  for (const step of ESCALATION) {
    if (harmDone < step.at) continue;
    if (step.replaces) next = next.filter(trait => trait !== step.replaces);
    if (!next.includes(step.trait)) next.push(step.trait);
  }
  return next;
}

/** Whether a resident refuses to be approached, either from injury or from what they remember. */
export const refusesContact = (hurt: number, relationship: number): boolean =>
  hurt > HURT_THRESHOLD || relationship < -20;
