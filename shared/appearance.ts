import { z } from 'zod';

// Manual cosmetic drafts, adapted from Tilth's character creator. These choices
// never grant abilities or constrain how a player can describe an action.
export const APPEARANCE_OPTIONS = {
  skin: { sand: { label: 'Sand', color: '#dfb58f' }, bronze: { label: 'Bronze', color: '#ad7653' }, umber: { label: 'Umber', color: '#734b3b' }, porcelain: { label: 'Porcelain', color: '#f0d4bf' } },
  hair: { midnight: { label: 'Midnight', color: '#282735' }, chestnut: { label: 'Chestnut', color: '#70462f' }, silver: { label: 'Silver', color: '#c4c8cf' }, gold: { label: 'Gold', color: '#d6aa52' }, plum: { label: 'Plum', color: '#795a86' } },
  clothing: { teal: { label: 'Teal', color: '#459aa1' }, moss: { label: 'Moss', color: '#7a9563' }, rust: { label: 'Rust', color: '#b46f52' }, violet: { label: 'Violet', color: '#8c76b1' }, blue: { label: 'Blue', color: '#577ca9' } },
  hairStyle: { short: { label: 'Short' }, long: { label: 'Long' }, crest: { label: 'Crest' } },
  outfit: { cloak: { label: 'Cloak' }, tunic: { label: 'Tunic' } },
} as const;

export const appearanceSchema = z.object({
  skin: z.enum(['sand', 'bronze', 'umber', 'porcelain']),
  hair: z.enum(['midnight', 'chestnut', 'silver', 'gold', 'plum']),
  clothing: z.enum(['teal', 'moss', 'rust', 'violet', 'blue']),
  hairStyle: z.enum(['short', 'long', 'crest']),
  outfit: z.enum(['cloak', 'tunic']),
}).strict();
export type Appearance = z.infer<typeof appearanceSchema>;
export const DEFAULT_APPEARANCE: Appearance = { skin: 'sand', hair: 'midnight', clothing: 'teal', hairStyle: 'short', outfit: 'cloak' };
export const characterSchema = z.object({
  worldId: z.string().min(1).max(100), version: z.number().int().min(0),
  name: z.string().trim().min(1).max(24).refine(value => !/[\u0000-\u001f\u007f]/.test(value), 'Choose a name without control characters.'),
  appearance: appearanceSchema,
}).strict();
export type CharacterRequest = z.infer<typeof characterSchema>;
