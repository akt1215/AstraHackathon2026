import type { NeedKey } from '../life-types';

/**
 * What the player did to a housemate, and what the world does about it.
 *
 * The model only ever classifies the act; every number here is applied by the engine. That split is
 * the whole point: a resident cannot be talked out of an injury, and a player cannot be talked out
 * of the reputation they earn. Kindness is on the same footing as harm — an act of either kind has
 * to move the world, or free text is just decoration over a chat window.
 */
export type ActKind =
  | 'none' | 'affection' | 'gift' | 'help' | 'praise'
  | 'insult' | 'threat' | 'theft' | 'physical';

export const ACT_KINDS: ActKind[] = ['none', 'affection', 'gift', 'help', 'praise', 'insult', 'threat', 'theft', 'physical'];

export type Reputation = 'kind' | 'cruel';

export interface ActRule {
  /** Relationship change between the two of them, applied in both directions. */
  relationship: number;
  /** Injury added to the target, 0-100, recovering over simulated time. */
  hurt: number;
  /** Fear of the actor, 0-100. High fear makes a resident leave rather than be approached. */
  fear: number;
  needs: Partial<Record<NeedKey, number>>;
  /** Relationship change for anyone else in the home who saw it. */
  witness: number;
  mood: string;
  /** Past tense, used in the event log: "Alex hugged June." */
  verb: string;
  /** Whether the target ends the encounter and moves away. */
  leaves: boolean;
  reputation: Reputation | null;
}

export const ACTS: Record<Exclude<ActKind, 'none'>, ActRule> = {
  affection: { relationship: 13, hurt: -6, fear: -10, needs: { social: 18, fun: 6 }, witness: 1, mood: 'Close', verb: 'showed affection to', leaves: false, reputation: 'kind' },
  gift: { relationship: 15, hurt: 0, fear: -6, needs: { fun: 15, social: 7 }, witness: 2, mood: 'Touched', verb: 'gave something to', leaves: false, reputation: 'kind' },
  help: { relationship: 11, hurt: -4, fear: -5, needs: { energy: 11, hunger: 9, social: 5 }, witness: 2, mood: 'Cared for', verb: 'helped', leaves: false, reputation: 'kind' },
  praise: { relationship: 9, hurt: 0, fear: -4, needs: { social: 11, fun: 6 }, witness: 1, mood: 'Encouraged', verb: 'praised', leaves: false, reputation: 'kind' },
  insult: { relationship: -21, hurt: 7, fear: 10, needs: { social: -12, fun: -14 }, witness: -6, mood: 'Stung', verb: 'was cruel to', leaves: true, reputation: 'cruel' },
  threat: { relationship: -26, hurt: 12, fear: 42, needs: { energy: -4, fun: -18, social: -10 }, witness: -9, mood: 'Shaken', verb: 'threatened', leaves: true, reputation: 'cruel' },
  theft: { relationship: -28, hurt: 4, fear: 16, needs: { fun: -16, social: -8 }, witness: -12, mood: 'Betrayed', verb: 'stole from', leaves: true, reputation: 'cruel' },
  physical: { relationship: -58, hurt: 46, fear: 66, needs: { energy: -22, fun: -34, social: -26 }, witness: -20, mood: 'Hurt', verb: 'hurt', leaves: true, reputation: 'cruel' },
};

/** Injury recovers over simulated seconds; a punch stays visible for several in-game hours. */
export const RECOVERY_PER_SECOND = .085;
export const hurtAfterRecovery = (hurt: number, dt: number): number => Math.max(0, hurt - dt * RECOVERY_PER_SECOND);
/** Fear fades more slowly than a bruise. Being frightened of someone outlasts the mark they left. */
export const FEAR_FADE_PER_SECOND = .05;
export const fearAfterFade = (fear: number, dt: number): number => Math.max(0, fear - dt * FEAR_FADE_PER_SECOND);

/** Above this a resident is visibly injured and will not willingly be near whoever did it. */
export const HURT_THRESHOLD = 20;
/** Above this a resident actively keeps their distance rather than merely declining. */
export const FEAR_THRESHOLD = 30;
/** How close the feared person may get before the resident leaves the room. */
export const FLEE_RANGE = 3.4;

const ESCALATION: Record<Reputation, { at: number; trait: string; replaces?: string }[]> = {
  cruel: [{ at: 1, trait: 'Callous' }, { at: 3, trait: 'Violent', replaces: 'Callous' }],
  kind: [{ at: 3, trait: 'Thoughtful' }, { at: 7, trait: 'Beloved', replaces: 'Thoughtful' }],
};

export const EARNED_TRAITS = ['Callous', 'Violent', 'Thoughtful', 'Beloved'];

/**
 * Traits the player has earned by their own conduct. Not offered as a choice: a reputation is
 * something the world assigns, and it persists in the save like any other trait.
 */
export function traitsAfterActs(traits: string[], tally: Record<Reputation, number>): string[] {
  let next = [...traits];
  for (const reputation of ['cruel', 'kind'] as Reputation[]) {
    for (const step of ESCALATION[reputation]) {
      if ((tally[reputation] ?? 0) < step.at) continue;
      if (step.replaces) next = next.filter(trait => trait !== step.replaces);
      if (!next.includes(step.trait)) next.push(step.trait);
    }
  }
  return next;
}

/** Whether a resident refuses to be approached, from injury, fear, or what they remember. */
export const refusesContact = (hurt: number, fear: number, relationship: number): boolean =>
  hurt > HURT_THRESHOLD || fear > FEAR_THRESHOLD || relationship < -20;

/** Whether a resident should get up and leave because the person they fear is close. */
export const fleesFrom = (fear: number, distance: number): boolean =>
  fear > FEAR_THRESHOLD && distance < FLEE_RANGE;
