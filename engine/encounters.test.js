import test from 'node:test';
import assert from 'node:assert/strict';
import {Encounters,inStrike,attackStats} from './encounters.js';
import {validateContent} from './contracts.js';
import {ACTORS} from '../content/encounters.js';
import {canStand,advance} from '../world.js';
import {drawVolcanic} from '../volcanic.js';
const free=(p,dx,dy)=>({x:p.x+dx,y:p.y+dy});
const setup=(extra={})=>new Encounters({actors:[{...ACTORS[3],hp:100,weapon:'sword',x:130,y:100}],mover:free,...extra});
const tick=(g,p,ms)=>{for(let i=0;i<ms;i+=50)g.step(50,p)};
test('hits require facing, range and an unobstructed path',()=>{const a={x:0,y:0},stats=attackStats('sword','Slash');assert.equal(inStrike(a,{x:30,y:0},'right',stats,free),true);assert.equal(inStrike(a,{x:-30,y:0},'right',stats,free),false);assert.equal(inStrike(a,{x:100,y:0},'right',stats,free),false);assert.equal(inStrike(a,{x:30,y:0},'right',stats,p=>p),false);assert.equal(inStrike(a,{x:-30,y:0},'right',attackStats('sword','Spin'),free),true)});
test('one swing hits once and provokes one dialogue request',()=>{let requests=0;const g=setup({onProvoked:()=>requests++}),p={x:100,y:100};g.begin('Slash','right','sword',420);tick(g,p,200);assert.equal(g.actors[0].hp,84);tick(g,p,250);assert.equal(g.actors[0].hp,84);assert.equal(requests,1);assert.equal(g.actors[0].hostile,true);g.begin('Slash','right','sword',420);tick(g,p,250);assert.equal(requests,1)});
test('retaliation is telegraphed, dodge avoids impact, pause freezes combat',()=>{const p={x:100,y:100},g=setup();g.actors[0].hostile=true;g.actors[0].peaceAt=20000;g.step(50,p);assert.ok(g.actors[0].attack);g.step(500,p,{active:false});assert.equal(g.hp,280);g.begin('Dodge','left','sword',900);tick(g,p,600);assert.equal(g.hp,280);tick(g,p,2200);assert.ok(g.hp<280)});
test('townspeople yield and recover; player defeat resets combat safely',()=>{const p={x:100,y:100},g=setup();g.hit(g.actors[0],100);assert.ok(g.actors[0].downUntil);tick(g,p,18100);assert.equal(g.actors[0].hp,100);assert.equal(g.actors[0].downUntil,0);g.hp=0;g.step(50,p);assert.deepEqual(p,{x:400,y:335});assert.equal(g.hp,280);assert.equal(g.actors[0].hostile,false)});
test('reaction cannot invent its speaker or evidence',()=>{const event={id:'hit',type:'combat_hit',target:'rowan'};assert.doesNotThrow(()=>validateContent('reaction',{speaker:'rowan',line:'Back off!',sourceEventIds:['hit']},[event]));for(const change of [{speaker:'clover'},{sourceEventIds:[]},{sourceEventIds:['fake']}])assert.throws(()=>validateContent('reaction',{speaker:'rowan',line:'Back off!',sourceEventIds:['hit'],...change},[event]))});
test('actors spawn and roam on walkable outpost terrain',()=>{const ctx=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(800*600*4)}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});drawVolcanic(ctx);for(const a of ACTORS)assert.ok(canStand(a.x,a.y),a.name);const g=new Encounters(),p={x:400,y:335};for(let i=0;i<400;i++){g.step(50,p);for(const a of g.actors)assert.ok(canStand(a.x,a.y),a.name)}assert.ok(g.actors.some(a=>Math.hypot(a.x-a.home.x,a.y-a.home.y)>1))});

test('Rowan ignores every weapon and combo without damage, retaliation or AI requests',()=>{
 for(const weapon of ['sword','spear','bow','staff'])for(const kind of ['Slash','Heavy','Spin','Bash','Cleave','Cyclone','Breaker']){
  let requests=0;const g=new Encounters({actors:[{...ACTORS[0],x:130,y:100},{...ACTORS[3],x:132,y:100}],mover:free,onProvoked:()=>requests++});
  const rowan=g.actors[0];g.begin(kind,'right',weapon,420);tick(g,{x:100,y:100},250);
  assert.equal(rowan.hp,rowan.maxHp);assert.equal(rowan.hostile,false);assert.equal(rowan.attack,null);assert.equal(rowan.downUntil,0);assert.equal(rowan.bubble,'');
  assert.ok(g.actors[1].hp<g.actors[1].maxHp);assert.equal(requests,1);
  g.hit(rowan,999);assert.equal(rowan.hp,rowan.maxHp);assert.equal(requests,1);
 }
});

test('world sleep suspends combat and committed following continues locally',()=>{
 const g=setup(),p={x:185,y:100},a=g.actors[0];a.hostile=true;a.worldSleeping=true;tick(g,p,1000);assert.equal(a.x,130);assert.equal(a.attack,null);assert.equal(g.hp,g.maxHp);
 a.worldSleeping=false;a.hostile=false;a.worldFollowing={x:185,y:100};a.nextRoam=Infinity;tick(g,p,1000);assert.ok(a.x>130);assert.ok(a.x<=185);
});

test('simulation throws enter the existing yield and recovery lifecycle once',async()=>{
 const {WorldSimulation}=await import('./world-simulation.js');let provoked=0;const g=new Encounters({actors:[{...ACTORS[2],x:430,y:300,hp:2}],mover:free,onProvoked:()=>provoked++});
 const player={x:400,y:300},sim=new WorldSimulation({mover:free});sim.restoreBindings({player,actors:g.actors,encounters:g});sim.sync({player,actors:g.actors,room:null,hp:g.hp});sim.state.entities.stone.location={kind:'held',actor:'player'};
 assert.equal(sim.apply({actor:'player',intent:'Throw',ops:[{kind:'move',entity:'stone',x:460,y:300,style:'throw'}]}).ok,true);
 assert.equal(g.actors[0].hp,0);assert.ok(g.actors[0].downUntil>0);assert.equal(g.actors[0].hostile,false);assert.equal(provoked,1);
 const x=g.actors[0].x;tick(g,player,1000);assert.equal(g.actors[0].x,x);tick(g,player,18100);assert.equal(g.actors[0].hp,g.actors[0].maxHp);assert.equal(g.actors[0].downUntil,0);
});
