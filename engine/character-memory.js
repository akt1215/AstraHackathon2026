// Adapted from Notebook World's witnessed event -> memory -> behavior director.
// Tilth's ledger remains the source of facts; this module never simulates a second world.
const ROOM_THOUGHTS = {
  inn: 'Warm beds. For a moment, I can almost forget the ash outside.',
  smith: 'The forge is still burning. Someone here means to keep going.',
  home: 'Someone made a home this close to the caldera. I wonder what keeps them here.'
};
export const ROWAN_HOME = Object.freeze({x:268,y:229});
export const ROWAN_RETREAT = Object.freeze({x:302,y:249});
export const initialCharacterMemory = () => ({version:1,introduced:false,facts:[]});

export function restoreCharacterMemory(value, events = []) {
  const memory = initialCharacterMemory();
  if(value?.version !== 1 || !Array.isArray(value.facts)) return memory;
  memory.introduced = value.introduced === true;
  const ledger = new Map(events.map(event => [event.id,event]));
  for(const fact of value.facts.slice(-24)) {
    const event = ledger.get(fact?.sourceEventId);
    if(!event || memory.facts.some(item => item.key === fact.key)) continue;
    if(fact.kind === 'visited_room' && event.type === 'room_entered' && Object.hasOwn(ROOM_THOUGHTS,event.target) && fact.key === `room:${event.target}`) {
      memory.facts.push({key:fact.key,kind:fact.kind,sourceEventId:event.id,target:event.target});
    }
    if(fact.kind === 'witnessed_combo' && event.type === 'combo_learned' && fact.key === `rowan:${event.target}` && typeof event.target === 'string') {
      memory.facts.push({key:fact.key,kind:fact.kind,sourceEventId:event.id,target:event.target});
    }
  }
  return memory;
}

export function observeCharacterEvent(previous, event, {room=null,player,rowan=ROWAN_HOME}={}) {
  const memory = structuredClone(previous);
  const lines = [];
  if(!event?.id) return {memory,lines};
  const add = (key,kind) => {
    if(memory.facts.some(fact => fact.key === key)) return false;
    memory.facts.push({key,kind,sourceEventId:event.id,target:event.target});
    memory.facts = memory.facts.slice(-24);
    return true;
  };
  if(event.type === 'room_entered' && Object.hasOwn(ROOM_THOUGHTS,event.target) && add(`room:${event.target}`,'visited_room')) {
    lines.push({speaker:'Evergreen',thought:true,text:ROOM_THOUGHTS[event.target],sourceEventIds:[event.id]});
  }
  const witnessed = event.type === 'combo_learned' && room === null && player && Number.isFinite(player.x) && Number.isFinite(player.y) && Math.hypot(player.x-rowan.x,player.y-rowan.y) <= 72;
  const alreadyCautious = memory.facts.some(fact => fact.kind === 'witnessed_combo');
  if(witnessed && add(`rowan:${event.target}`,'witnessed_combo') && !alreadyCautious) {
    lines.push({speaker:'Rowan',text:'Easy! I will give you a little more room to practice.',sourceEventIds:[event.id]});
    lines.push({speaker:'Evergreen',thought:true,text:'I should give people more room when I practice.',sourceEventIds:[event.id]});
  }
  return {memory,lines};
}

export function rowanGoal(memory) {
  return memory.facts.some(fact => fact.kind === 'witnessed_combo') ? {...ROWAN_RETREAT} : {...ROWAN_HOME};
}

export function rowanWaypoint(memory, position) {
  const goal = rowanGoal(memory);
  // Walk along the inn frontage first, then around the end of the fence.
  if(goal.x === ROWAN_RETREAT.x && Math.abs(position.x-goal.x) > .2) return {x:goal.x,y:ROWAN_HOME.y};
  return goal;
}

export function rowanConversation(memory) {
  const witness = memory.facts.findLast(fact => fact.kind === 'witnessed_combo');
  if(witness) return [
    {speaker:'Rowan',text:'I remember that flourish of yours. I am keeping a little distance this time.',sourceEventIds:[witness.sourceEventId]},
    {speaker:'Rowan',text:'Now, about what needs doing around here…'}
  ];
  const forge = memory.facts.find(fact => fact.key === 'room:smith');
  if(forge) return [{speaker:'Evergreen',thought:true,text:'The heat from that forge is still in my clothes.',sourceEventIds:[forge.sourceEventId]},
    {speaker:'Rowan',text:'There is still work to be done in Cinderwatch. Let me think…'}];
  return [{speaker:'Rowan',text:'A new face. The ash usually drives people away.'},
    {speaker:'Evergreen',thought:true,text:'He sounds tired. Maybe he has been waiting for someone.'},
    {speaker:'Rowan',text:'Stay a while. There may be something you can help with.'}];
}
