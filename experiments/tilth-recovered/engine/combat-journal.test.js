import test from 'node:test';
import assert from 'node:assert/strict';
import {GameRuntime} from './runtime.js';
import {recordCombatJournal} from './combat-journal.js';
const fact={actorId:'player',victimId:'clover',incidentId:'fight-1',eventId:'hit-1',source:'weapon',outcome:'hit',targetWasEnemy:false,targetWasHostile:false,unprovoked:true};
test('one truthful journal entry per fight survives reload and excludes later retaliation',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},runtime=new GameRuntime({storage});
 recordCombatJournal(runtime,fact,{name:'Clover'},'Cinderwatch');
 recordCombatJournal(runtime,{...fact,eventId:'defeat',outcome:'defeat'},{name:'Clover'},'Cinderwatch');
 const restored=new GameRuntime({storage});recordCombatJournal(restored,fact,{name:'Clover'},'Cinderwatch');
 recordCombatJournal(restored,{...fact,incidentId:'another',eventId:'retaliation',targetWasHostile:true,unprovoked:false},{name:'Clover'},'Cinderwatch');
 assert.equal(restored.state.events.filter(e=>e.type==='combat_hit').length,1);
 assert.match(restored.state.events[0].label,/peaceful Clover/);
 assert.equal(restored.state.events[0].combatEventId,'hit-1');
});
test('enemy combat is recorded without inventing a peaceful victim or a death',()=>{
 const runtime=new GameRuntime();recordCombatJournal(runtime,{...fact,targetWasEnemy:true,unprovoked:false,outcome:'defeat'},{name:'Raider'},'Glasswood');
 assert.match(runtime.state.events[0].label,/Fought enemy Raider/);assert.doesNotMatch(runtime.state.events[0].label,/killed|murder|peaceful/);
});
