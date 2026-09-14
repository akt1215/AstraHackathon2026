import test from 'node:test';
import assert from 'node:assert/strict';
import {regionLife,regionHouseAt,regionProgress,defeatRegionalEnemy,completeRegionalObjective,offerRegionalQuest,acceptRegionalQuest} from './region-life.js';
import {regionGrid,standInRegion} from './regions.js';
import {GameRuntime} from './runtime.js';
const content={name:'Testwood',theme:'forest',seed:10,layout:'grove',accent:'#eebb77',patches:[],landmarks:[{name:'Old shrine',x:8,y:8}]};
test('every area has enemies, a house, and a reachable resident entrance',()=>{for(const layout of ['archipelago','river','caldera','grove','ruins']){const c={...content,layout},life=regionLife(c),grid=regionGrid(c);assert.equal(life.enemies.length,3);for(const e of life.enemies)assert.ok(standInRegion(grid,e.x*20+10,e.y*20));for(const h of life.houses){assert.ok(standInRegion(grid,h.door.x,h.door.y+16));assert.equal(standInRegion(grid,h.x*20+10,h.y*20),false);assert.equal(regionHouseAt(c,{x:h.door.x,y:h.door.y+5},'up').id,h.id)}}});
test('regional enemy defeats persist and only a cleared area grants one quest reward',()=>{const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},g=new GameRuntime({storage});g.state.regions={'0,-1':{content,events:[]}};assert.equal(completeRegionalObjective(g,'0,-1'),false);const enemies=regionLife(content).enemies;assert.equal(defeatRegionalEnemy(g,'0,-1','invented'),false);for(const e of enemies){assert.equal(defeatRegionalEnemy(g,'0,-1',e.id),true);assert.equal(defeatRegionalEnemy(g,'0,-1',e.id),false)}assert.equal(completeRegionalObjective(g,'0,-1'),false);assert.equal(acceptRegionalQuest(g,'0,-1'),false);assert.equal(offerRegionalQuest(g,'0,-1'),true);assert.equal(completeRegionalObjective(g,'0,-1'),false);assert.equal(acceptRegionalQuest(g,'0,-1'),true);assert.equal(acceptRegionalQuest(g,'0,-1'),false);assert.equal(completeRegionalObjective(g,'0,-1'),true);assert.equal(completeRegionalObjective(g,'0,-1'),false);assert.equal(g.state.jobs.filter(j=>j.kind==='awakening').length,1);assert.equal(g.state.jobs.find(j=>j.kind==='awakening').rewardQuestId,'region:0,-1');const restored=new GameRuntime({storage});assert.equal(regionProgress(restored.state.regions['0,-1']).defeated.length,3);assert.equal(completeRegionalObjective(restored,'0,-1'),false)});
test('generated rosters and resident text are used instead of the legacy defaults',()=>{const c={...content,enemies:[{name:'Frost Reaver',kind:'mage',hp:90,color:'#aaccdd',taunt:'Leave!'}],houses:[{name:'Snow House',kind:'inn',resident:'Edda',greeting:'Hello',request:'Fight',thanks:'Thanks'}],objective:{title:'Free the road',description:'Defeat the reavers'}};assert.equal(regionLife(c).enemies[0].name,'Frost Reaver');assert.equal(regionLife(c).houses[0].resident,'Edda')});
test('houses and all five enemy positions connect to the entrance across varied terrain',()=>{
 for(const layout of ['archipelago','river','caldera','grove','ruins'])for(const seed of [1,71,501,684217]){
  const c={...content,layout,seed,houses:Array.from({length:2},()=>({name:'Refuge',kind:'home',resident:'Mara'})),enemies:Array.from({length:5},()=>({name:'Foe',kind:'raider'})),landmarks:[{x:8,y:8},{x:30,y:8},{x:8,y:22},{x:30,y:22}],patches:[{kind:'water',x:2,y:2,w:30,h:20}]};
  const grid=regionGrid(c),life=regionLife(c),queue=[[20,16]],seen=new Set(['20,16']);
  for(const [x,y] of queue)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=`${nx},${ny}`;if(!seen.has(k)&&standInRegion(grid,nx*20+10,ny*20)){seen.add(k);queue.push([nx,ny])}}
  for(const e of life.enemies)assert.ok(seen.has(`${e.x},${e.y}`),`${layout} ${seed} enemy ${e.id}`);
  for(const h of life.houses)assert.ok(seen.has(`${h.x},${h.y+3}`),`${layout} ${seed} house ${h.id}`);
 }
});

test('offered and accepted regional quests survive reload without generating rewards',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 let g=new GameRuntime({storage});g.state.regions={'1,0':{content,events:[]}};
 offerRegionalQuest(g,'1,0');g=new GameRuntime({storage});assert.equal(regionProgress(g.state.regions['1,0']).offered,true);assert.equal(regionProgress(g.state.regions['1,0']).accepted,false);
 acceptRegionalQuest(g,'1,0');g=new GameRuntime({storage});assert.equal(regionProgress(g.state.regions['1,0']).accepted,true);assert.equal(g.state.jobs.filter(j=>j.kind==='awakening').length,0);assert.equal(completeRegionalObjective(g,'1,0'),false);
});
