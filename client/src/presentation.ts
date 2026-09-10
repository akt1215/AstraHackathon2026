import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, type Appearance } from '../../shared/appearance';
import type { PublicState, WorldEvent } from '../../shared/types';

export function guidance(state: PublicState): { text: string; target?: string } {
  if (state.objective.status === 'complete') return { text: 'You reached the refuge together. Open your journal to look back on the choices that brought you here.' };
  if (state.objective.status === 'failed') return { text: state.objective.step };
  const companion = state.entities.find(e => e.id === 'companion');
  const condition = state.actors.find(a => a.id === 'companion');
  if (companion && condition && condition.hp < condition.maxHp) return { target: companion.id, text: `${companion.name} is injured. Speak with them or look for something that could help.` };
  const gate = state.entities.find(e => e.id === 'gate');
  if (gate && !gate.props.open) return { target: gate.id, text: 'The gate stands between you and the refuge. Examine it, explore the room, or speak with its keeper.' };
  if (companion) return { target: companion.id, text: `A path is open. Make sure ${companion.name} is ready to come with you.` };
  return { text: state.objective.step };
}

export function journalEntries(state: PublicState): WorldEvent[] {
  return state.journal.filter(event => !['move', 'wait', 'look', 'rest'].includes(event.kind)).slice().reverse();
}

export type SoundCue = 'step' | 'take' | 'coins' | 'open' | 'close' | 'impact' | 'inspect' | 'activate' | 'heal' | 'success' | 'cloth';
export function soundCue(kind: string): SoundCue | null {
  const map: Record<string, SoundCue> = { move: 'step', take: 'take', give: 'take', place: 'cloth', settle: 'coins', open: 'open', close: 'close', impact: 'impact', injury: 'impact', break: 'impact', pry: 'impact', inspect: 'inspect', discovery: 'inspect', activate: 'activate', heal: 'heal', eat: 'cloth', objective: 'success', permit: 'success' };
  return map[kind] ?? null;
}

// Adapted from Tilth's procedural silhouettes, with a compact SVG palette so
// map hit targets and semantic controls remain separate from decorative pixels.
export function pixelTraveler(appearance: Appearance = DEFAULT_APPEARANCE, facing = 'south'): string {
  const a = appearance;
  const skin = APPEARANCE_OPTIONS.skin[a.skin].color;
  const hair = APPEARANCE_OPTIONS.hair[a.hair].color;
  const cloth = APPEARANCE_OPTIONS.clothing[a.clothing].color;
  const back = facing === 'north', side = facing === 'east' || facing === 'west';
  const colors: Record<string, string> = { o: '#18282d', h: hair, s: skin, c: cloth, g: '#dbb16e', b: '#353a39', e: '#17282f', l: '#c6c0a5' };
  const head = back ? ['..oooo..', '.ohhhho.', 'ohhhhhho', 'ohhhhhho', '.ohhhho.', '..oooo..'] : side ? ['..oooo..', '.ohhhho.', 'ohhhssso', 'ohhsesso', '.ohsssso', '..ossso.'] : ['..oooo..', '.ohhhho.', 'ohhhhhho', 'ohssssho', '.oseseso', '..ossso.'];
  const torso = ['..osso..', '.ollllo.', 'occcccco', 'occcccco', '.occcco.', '.oggggo.', '.occcco.'];
  const rect = (x: number, y: number, w: number, h: number, color: string) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
  const pixels = (rows: string[], x: number, y: number) => rows.map((row, yy) => [...row].map((pixel, xx) => colors[pixel] ? rect(x + xx * 2, y + yy * 2, 2, 2, colors[pixel]) : '').join('')).join('');
  let shape = rect(-6, 9, 5, 11, colors.b) + rect(2, 9, 5, 11, colors.b) + rect(-8, 18, 7, 3, colors.o) + rect(2, 18, 8, 3, colors.o);
  if (a.outfit === 'cloak') shape += `<path d="M-7-10H7L12 15L4 12L0 17L-12 14Z" fill="${colors.o}"/><path d="M-6-10L-3-5L-5 12L-10 13Z" fill="${cloth}"/>`;
  shape += pixels(torso, -8, -9) + rect(-11, -5, 4, 12, cloth) + rect(8, -5, 4, 12, cloth) + rect(-10, 6, 3, 4, skin) + rect(8, 6, 3, 4, skin);
  shape += pixels(head, -8, -22);
  if (a.hairStyle === 'long') shape += rect(-9, -18, 4, 16, hair) + rect(6, -18, 4, 16, hair);
  if (a.hairStyle === 'crest') shape += rect(-3, -27, 6, 8, hair) + rect(-1, -29, 4, 3, hair);
  if (back) shape += `<path d="M-7-9H7L9 13L0 17L-9 13Z" fill="${cloth}"/>`;
  if (a.outfit === 'tunic') shape += rect(-7, 4, 14, 9, cloth) + rect(-7, 7, 14, 2, colors.g);
  return `<g class="pixel-traveler" shape-rendering="crispEdges" transform="${facing === 'west' ? 'scale(-1 1)' : 'scale(1 1)'}">${shape}</g>`;
}

export const objectArt: Record<string, string> = { shutter: 'window', chest: 'chest', ration: 'apple', crowbar: 'crowbar', key: 'key', crate: 'crate', tonic: 'bottle', bench: 'table', letter: 'book' };
