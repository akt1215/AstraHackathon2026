import { z } from 'zod';
export const activityKind = z.enum(['walk', 'eat', 'sleep', 'relax', 'read', 'paint', 'water', 'coffee', 'chat', 'share', 'compliment', 'apologize', 'insult']);
const id = z.string().min(1).max(100);
const point = { x: z.number().finite().min(0).max(12), z: z.number().finite().min(0).max(10) };
const command = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('walk'), ...point }),
  z.strictObject({ kind: z.literal('use'), objectId: id, action: activityKind, queue: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('social'), targetId: id, action: z.enum(['chat', 'share', 'compliment', 'apologize', 'insult']), queue: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('cancel') }), z.strictObject({ kind: z.literal('reset') }),
  z.strictObject({ kind: z.literal('speed'), speed: z.union([z.literal(0), z.literal(1), z.literal(3)]) }),
  z.strictObject({ kind: z.literal('theme'), theme: z.enum(['loft', 'lantern', 'comic']) }),
  z.strictObject({ kind: z.literal('talk'), targetId: id, text: z.string().trim().min(1).max(800) }),
]);
export const envelopeSchema = z.strictObject({ worldId: id, requestId: id, command });
const activity = z.object({ id, kind: activityKind, label: z.string().max(200), targetId: id.nullable(), destination: z.object(point).nullable(), phase: z.enum(['walking', 'doing']), elapsed: z.number().finite().nonnegative(), duration: z.number().finite().nonnegative(), autonomous: z.boolean() });
const event = z.object({ id, at: z.number().finite().nonnegative(), actor: id, targetId: id.nullable(), text: z.string().max(2000), kind: z.string().max(100) });
const need = z.number().finite().min(0).max(100);
const resident = z.object({ id, name: z.string().max(100), ...point, role: z.enum(['player', 'npc']), color: z.string(), skin: z.string(), hair: z.string(), traits: z.array(z.string()).max(10), aspiration: z.string(), mood: z.string(), needs: z.object({ hunger: need, energy: need, social: need, fun: need }), relationships: z.record(z.string(), z.number().finite().min(-100).max(100)), memories: z.array(event).max(32), activity: activity.nullable(), queue: z.array(activity).max(5), facing: z.number().finite(), speech: z.string().nullable(), speechUntil: z.number().finite() });
const object = z.object({ id, name: z.string(), kind: z.enum(['fridge', 'bed', 'sofa', 'table', 'bookshelf', 'plant', 'easel', 'coffee']), ...point, width: z.number().positive(), depth: z.number().positive(), approach: z.object(point), actions: z.array(activityKind), occupiedBy: id.nullable() });
export const snapshotSchema = z.object({ format: z.literal(1), state: z.object({ id, version: z.number().int().nonnegative(), elapsed: z.number().finite().nonnegative(), day: z.number().int().positive(), hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59), speed: z.union([z.literal(0), z.literal(1), z.literal(3)]), theme: z.enum(['loft', 'lantern', 'comic']), title: z.string(), width: z.literal(12), depth: z.literal(10), residents: z.array(resident).length(3), objects: z.array(object).length(8), events: z.array(event).max(80), provider: z.object({ name: z.string(), model: z.string(), available: z.boolean(), busy: z.boolean(), error: z.string().nullable(), lastLatencyMs: z.number().nonnegative().nullable(), calls: z.number().int().nonnegative() }) }), receipts: z.array(z.tuple([id, z.object({ worldId: id, fingerprint: z.string(), message: z.string() })])).max(256) }).superRefine((value, ctx) => {
  const ids = new Set(value.state.residents.map(r => r.id));
  if (ids.size !== 3 || !['player', 'june', 'leo'].every(id => ids.has(id))) ctx.addIssue({ code: 'custom', message: 'The saved home has unsupported residents.' });
  if (new Set(value.state.objects.map(o => o.id)).size !== 8) ctx.addIssue({ code: 'custom', message: 'The saved home has duplicate objects.' });
  for (const object of value.state.objects) if (object.occupiedBy && !value.state.residents.some(r => r.id === object.occupiedBy && r.activity?.targetId === object.id)) ctx.addIssue({ code: 'custom', message: 'The saved reservation has no corresponding activity.' });
});
