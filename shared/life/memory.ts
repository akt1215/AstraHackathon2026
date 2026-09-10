import type { LifeMemory } from '../life-types';
const LASTING = new Set(['insult', 'apology']);
const SOCIAL = new Set(['social', 'speech', 'model-speech', 'cooperation', 'declined']);
/** Routine completions cannot displace relationship-changing incidents. */
export function retainMemories(memories: LifeMemory[]): LifeMemory[] {
  const lasting = memories.filter(m => LASTING.has(m.kind)).slice(-12);
  const social = memories.filter(m => SOCIAL.has(m.kind)).slice(-12);
  const routine = memories.filter(m => !LASTING.has(m.kind) && !SOCIAL.has(m.kind)).slice(-8);
  const retained = new Set([...lasting, ...social, ...routine].map(m => m.id));
  return memories.filter(m => retained.has(m.id));
}
export function conversationMemories(memories: LifeMemory[]): LifeMemory[] {
  const important = memories.filter(m => LASTING.has(m.kind)).slice(-6);
  const conversations = memories.filter(m => SOCIAL.has(m.kind)).slice(-8);
  const routine = memories.filter(m => !LASTING.has(m.kind) && !SOCIAL.has(m.kind)).slice(-2);
  const relevant = new Set([...important, ...conversations, ...routine].map(m => m.id));
  return memories.filter(m => relevant.has(m.id));
}
