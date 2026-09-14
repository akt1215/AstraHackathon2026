import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldSimulation} from './world-simulation.js';
test('open container contents keep their containment rather than becoming ground props',()=>{
 const simulation=new WorldSimulation();simulation.state.entities['supply-chest'].props.open=true;
 const note=simulation.publicState().entities.find(e=>e.id==='supply-note');
 assert.deepEqual(note.location,{kind:'contained',container:'supply-chest'});
 assert.equal(simulation.state.entities['supply-note'].location.kind,'contained');
});
