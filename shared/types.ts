import type { Appearance } from './appearance';
export type Point = { x: number; y: number };
export type Location = { kind: 'ground'; x: number; y: number } | { kind: 'held'; actor: string } | { kind: 'contained'; container: string } | { kind: 'removed' };
export interface Entity {
  id: string; name: string; kind: 'actor' | 'item' | 'fixture'; location: Location;
  description: string; icon: string;
  props: { portable?: boolean; fragile?: boolean; solid?: boolean; size?: number; gap?: number; locked?: boolean; open?: boolean; key?: string; heal?: number; price?: number; owner?: string; noise?: number; color?: string; container?: boolean; clue?: string; mechanism?: string; lever?: boolean; leverable?: boolean; broken?: boolean; food?: number };
}
export interface Observation { id: string; eventId: string; tick: number; kind: string; text: string; location: Point; actor?: string; subject?: string; source?: string; lineage: string[]; }
export interface Evidence { id: string; category: 'care' | 'honesty' | 'deception' | 'vigilance'; eventIds: string[]; text: string; }
export interface Actor {
  id: string; appearance?: Appearance; role: 'player' | 'npc'; hp: number; maxHp: number; fatigue: number;
  wakefulness: 'awake' | 'asleep'; awakenedTick?: number;
  attention: { x: number; y: number; until: number } | null;
  facing: 'north' | 'south' | 'east' | 'west'; mood: string; goal: string;
  memories: Observation[]; evidence: Evidence[]; tendencies: Record<string, number>;
  capabilities: string[]; relationships: Record<string, { trust: number; fear: number }>;
  coins: number; following?: string; permission: boolean;
}
export interface WorldEvent { id: string; tick: number; kind: string; actor: string; subject?: string; target?: string; text: string; location: Point; noise: number; witnesses: string[]; data?: Record<string, string | number | boolean>; }
export interface Issue { id: string; actor: string; owner: string; entity: string; amount: number; status: 'open' | 'settled'; eventId: string; reportedTo: string[]; applied: string[]; }
export type MoveOp = { kind: 'move'; entity: string; x: number; y: number; style: 'walk' | 'throw' | 'slide' | 'approach' };
export type TransferOp = { kind: 'transfer'; entity: string; to: string; x?: number; y?: number };
export type TransformOp = { kind: 'transform'; entity: string; rule: 'heal' | 'rest' | 'wake' | 'open' | 'close' | 'permit' | 'settle' | 'look' | 'inspect' | 'activate' | 'pry' | 'eat'; target?: string; x?: number; y?: number };
export type EmoteOp = { kind: 'emote'; text: string; target?: string; topic: 'talk' | 'offer' | 'promise' | 'report' | 'vouch' | 'accuse' | 'appeal'; evidence?: string[] };
export type Primitive = MoveOp | TransferOp | TransformOp | EmoteOp;
export interface Action { actor: string; intent: string; ops: Primitive[]; }
export interface Resolution { ok: boolean; world: World; events: WorldEvent[]; reason?: string; }
export interface ReactionPhase { batch: string; tick: number; slots: string[]; completed: string[]; finalized: boolean; plans?: Record<string, { action: Action; fallback: boolean }>; }
export interface NpcAwareness { noticed: string[]; cursor: number; hp: number; tired: boolean; wakefulness: Actor['wakefulness']; atGate: boolean; }
export interface World {
  awareness?: Record<string, NpcAwareness>;
  id: string; version: number; tick: number; seed: number; width: number; height: number;
  walls: Point[]; entities: Record<string, Entity>; actors: Record<string, Actor>;
  events: WorldEvent[]; issues: Issue[];
  objective: { title: string; step: string; status: 'active' | 'complete' | 'failed' };
  phase: ReactionPhase | null; receipts: Record<string, { version: number; ok: boolean; reason?: string; fingerprint?: string }>;
}
export interface ActorView { actor: Actor; self: Entity; entities: Entity[]; observations: Observation[]; width: number; height: number; walls: Point[]; tick: number; version: number; knownIssues: Issue[]; }
export interface PublicActor { id: string; appearance?: Appearance; hp: number; maxHp: number; fatigue: number; wakefulness: 'awake' | 'asleep'; attention: Actor['attention']; facing: Actor['facing']; mood: string; }
export interface PublicState {
  id: string; version: number; tick: number; width: number; height: number; walls: Point[];
  entities: Entity[]; actors: PublicActor[]; player: { hp: number; maxHp: number; coins: number; fatigue: number; evidence: Evidence[]; capabilities: string[]; tendencies: Record<string, number> };
  objective: World['objective']; events: WorldEvent[]; journal: WorldEvent[]; issues: Issue[]; busy: boolean;
}
export interface ProviderInfo { provider: 'openai' | 'claude-cli' | 'offline'; model: string; available: boolean; label: string; }
export interface Decision { action: Action; explanation: string; }
export interface ModelResult { decision: Decision; latencyMs: number; provider: string; }
export type DirectIntent = { kind: 'move'; x: number; y: number } | { kind: 'interact' | 'drop' | 'inspect'; entity: string } | { kind: 'wait' | 'rest' };
export interface Timing { interpretationMs: number; reactionMs: number; totalMs: number; }
export interface ActionResponse { state: PublicState; ok: boolean; message: string; source: string; timing: Timing; events: WorldEvent[]; }
