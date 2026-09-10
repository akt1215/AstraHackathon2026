import type { ActivityKind, LifeObject, LifeProvider, LifeResident, LifeState, NeedKey, ObjectKind } from '../life-types';

export const NEEDS: NeedKey[] = ['hunger', 'energy', 'social', 'fun'];
export const DURATIONS: Record<ActivityKind, number> = { walk: 0, eat: 12, sleep: 28, relax: 12, read: 14, paint: 16, water: 6, coffee: 8, chat: 7, share: 9, compliment: 5, apologize: 5, insult: 4 };
export const LABELS: Record<ActivityKind, string> = { walk: 'Walking', eat: 'Making a meal', sleep: 'Sleeping', relax: 'Unwinding', read: 'Reading', paint: 'Painting', water: 'Watering plants', coffee: 'Making coffee', chat: 'Chatting', share: 'Sharing a meal', compliment: 'Giving a compliment', apologize: 'Apologizing', insult: 'Being unkind' };
export const SOCIAL = new Set<ActivityKind>(['chat', 'share', 'compliment', 'apologize', 'insult']);
export const OFFLINE_PROVIDER: LifeProvider = { name: 'Local routines', model: 'offline', available: false, busy: false, error: null, lastLatencyMs: null, calls: 0 };
function object(id: ObjectKind, name: string, x: number, z: number, width: number, depth: number, ax: number, az: number, actions: ActivityKind[]): LifeObject {
  return { id, name, kind: id, x, z, width, depth, approach: { x: ax, z: az }, actions, occupiedBy: null };
}
function resident(id: string, name: string, x: number, z: number, color: string, traits: string[], needs: LifeResident['needs']): LifeResident {
  return { id, name, x, z, role: id === 'player' ? 'player' : 'npc', color, skin: id === 'leo' ? '#b77d59' : '#e8b58c', hair: id === 'june' ? '#783f2b' : '#252638', traits, aspiration: id === 'june' ? 'Make a home where everyone belongs' : id === 'leo' ? 'Find inspiration in everyday life' : 'Build a life worth coming home to', mood: 'Comfortable', needs, relationships: id === 'player' ? { june: 12, leo: 5 } : { player: id === 'june' ? 12 : 5, [id === 'june' ? 'leo' : 'june']: 20 }, memories: [], activity: null, queue: [], facing: 0, speech: null, speechUntil: 0 };
}
export function createLifeWorld(): LifeState {
  return { id: crypto.randomUUID(), version: 0, elapsed: 0, day: 1, hour: 16, minute: 20, speed: 1, theme: 'loft', title: 'A little life', width: 12, depth: 10, provider: { ...OFFLINE_PROVIDER }, events: [],
    residents: [resident('player', 'Alex', 5, 6, '#4cb4a4', ['Curious', 'Kind'], { hunger: 62, energy: 58, social: 55, fun: 48 }), resident('june', 'June', 3.6, 3.5, '#db895c', ['Warm', 'Food lover'], { hunger: 32, energy: 70, social: 55, fun: 66 }), resident('leo', 'Leo', 8.3, 7.5, '#7f91df', ['Creative', 'Independent'], { hunger: 72, energy: 62, social: 64, fun: 29 })],
    objects: [object('fridge', 'Kitchen', 1, 1.1, .9, .9, 1, 2.05, ['eat']), object('coffee', 'Coffee station', 2.6, 1.1, .8, .8, 2.6, 2, ['coffee']), object('table', 'Dining table', 5.7, 2, 1.9, 1.2, 6.4, 3, ['eat']), object('bed', 'Cozy bed', 10.3, 1.6, 2.1, 2.2, 8.8, 1.6, ['sleep']), object('sofa', 'Cloud sofa', 2, 7.9, 2.8, 1.1, 2, 6.8, ['relax']), object('bookshelf', 'Bookshelf', .8, 5, .7, 1.8, 1.7, 5, ['read']), object('plant', 'Window garden', 10.9, 8.7, .7, .7, 10.2, 8.7, ['water']), object('easel', 'Studio easel', 9.8, 5.6, .9, .8, 9.8, 6.55, ['paint'])] };
}
