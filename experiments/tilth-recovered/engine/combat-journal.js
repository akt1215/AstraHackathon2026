// The witch and journal consume one sourced entry per fight, never every impact.
export function recordCombatJournal(runtime,fact,victim,location){
 if(fact.actorId!=='player'||!fact.targetWasEnemy&&!fact.unprovoked)return null;
 if(runtime.state.events.some(e=>e.combatIncidentId===fact.incidentId&&e.target===fact.victimId))return null;
 const event=runtime.record('combat_hit',fact.victimId,`${fact.targetWasEnemy?'Fought enemy':'Attacked peaceful'} ${victim?.name||fact.victimId} using ${fact.source} in ${location}`);
 event.combatIncidentId=fact.incidentId;event.combatEventId=fact.eventId;
 runtime.changed();return event;
}
