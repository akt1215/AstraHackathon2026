/** Wire contract shared by the life simulation, local server and 3D client. */
export type LifeTheme = 'loft' | 'lantern' | 'comic';
export type NeedKey = 'hunger' | 'energy' | 'social' | 'fun';
export type ObjectKind = 'fridge' | 'bed' | 'sofa' | 'table' | 'bookshelf' | 'plant' | 'easel' | 'coffee';
export type ActivityKind = 'walk' | 'eat' | 'sleep' | 'relax' | 'read' | 'paint' | 'water' | 'coffee' | 'chat' | 'share' | 'compliment' | 'apologize' | 'insult';
export interface LifePoint { x: number; z: number }
export interface LifeObject extends LifePoint {
  id: string; name: string; kind: ObjectKind; width: number; depth: number;
  approach: LifePoint; actions: ActivityKind[]; occupiedBy: string | null;
}
export interface LifeActivity {
  id: string; kind: ActivityKind; label: string; targetId: string | null;
  destination: LifePoint | null; phase: 'walking' | 'doing'; elapsed: number;
  duration: number; autonomous: boolean;
}
export interface LifeMemory { id: string; at: number; actor: string; text: string; kind: string; targetId: string | null }
export interface LifeResident extends LifePoint {
  id: string; name: string; role: 'player' | 'npc'; color: string; skin: string; hair: string;
  traits: string[]; aspiration: string; mood: string;
  needs: Record<NeedKey, number>; relationships: Record<string, number>;
  memories: LifeMemory[]; activity: LifeActivity | null; queue: LifeActivity[];
  facing: number; speech: string | null; speechUntil: number;
}
export interface LifeEvent { id: string; at: number; text: string; kind: string; actor: string; targetId: string | null }
export interface LifeProvider { name: string; model: string; available: boolean; busy: boolean; error: string | null; lastLatencyMs: number | null; calls: number }
export interface LifeState {
  id: string; version: number; elapsed: number; day: number; hour: number; minute: number;
  speed: 0 | 1 | 3; theme: LifeTheme; title: string;
  residents: LifeResident[]; objects: LifeObject[]; events: LifeEvent[];
  provider: LifeProvider; width: number; depth: number;
}
export type LifeCommand =
  | { kind: 'walk'; x: number; z: number }
  | { kind: 'use'; objectId: string; action: ActivityKind; queue?: boolean }
  | { kind: 'social'; targetId: string; action: 'chat' | 'share' | 'compliment' | 'apologize' | 'insult'; queue?: boolean }
  | { kind: 'cancel' }
  | { kind: 'speed'; speed: 0 | 1 | 3 }
  | { kind: 'theme'; theme: LifeTheme }
  | { kind: 'reset' }
  | { kind: 'talk'; targetId: string; text: string };
export interface LifeCommandEnvelope { worldId: string; requestId: string; command: LifeCommand }
export interface LifeResponse { state: LifeState; message: string }
export interface LifeSceneHooks { onObject(id: string, screen: { x: number; y: number }): void; onResident(id: string, screen: { x: number; y: number }): void; onGround(point: LifePoint): void }
export interface LifeScene {
  update(state: LifeState): void; dispose(): void; focusResident(id: string): void;
  setCamera(mode: 'orbit' | 'follow'): void;
  movementDirection(horizontal: number, vertical: number): LifePoint;
  projectResident(id: string): { x: number; y: number; visible: boolean } | null;
}
