import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {resolveWorldPosition} from './region-world.js';

const source=readFileSync(new URL('../main.js',import.meta.url),'utf8');
function runFunction(name,next,context){const start=source.indexOf(`function ${name}(`),end=source.indexOf(`function ${next}(`,start);assert.ok(start>=0&&end>start);vm.runInNewContext(`${source.slice(start,end)};${name}()`,context);}
test('revisiting a cached scene preserves actor combat state and position',()=>{
 const actor={id:'resident',sceneId:'region:1,0/house:house-0',x:527,y:290,hostile:true,downUntil:19000};
 const context={atlas:{current:'1,0',content:{name:'Glasswood'}},scene:()=>({sceneId:actor.sceneId}),setRegionTerrain(){},regionGrid:()=>[],drawRegion(){},regionCanvas:{getContext:()=>({})},regionActors:new Map([['1,0',[actor]]]),simulation:{restoreActors(actors){for(const a of actors){a.hostile=false;a.downUntil=0}}},encounters:{},currentRoom:'home',regionalHouse:{name:'Glass House'},advance(){},setLocation(){},attackStart:0,activeGeneratedMove:null};
 runFunction('prepareScene','leaveScene',context);assert.equal(actor.hostile,true);assert.equal(actor.downUntil,19000);assert.equal(actor.x,527);
});
test('regional interior encounters advance while empty hub interiors stay paused',()=>{
 const expression=source.match(/const combatActive=([^;]+);/)[1];
 const context={document:{hidden:false},modal:{open:false},creator:{dialog:{open:false}},witch:{dialog:{open:false}},dialogue:{active:false},currentRoom:'home',regionalHouse:{id:'house-0'},encounters:{actors:[{id:'resident'}]}};
 assert.equal(vm.runInNewContext(expression,context),true);context.regionalHouse=null;context.encounters.actors=[];assert.equal(vm.runInNewContext(expression,context),false);
});
test('regional guidance points to the living resident position instead of a painted coordinate',()=>{
 const context={atlas:{current:'1,0',content:{},regions:{'1,0':{}},homeDirection:()=> 'left'},regionLife:()=>({houses:[{name:'Glass House',door:{x:600,y:450}}],enemies:[],objective:{title:'Help the road'}}),regionProgress:()=>({accepted:false,offered:false,rewarded:false}),currentRoom:'home',regionalHouse:{id:'house-0',resident:'Mara'},regionalResident:()=>({x:541,y:319,hp:100}),regionActors:new Map(),currentGuidance(){throw Error('wrong scene')}};
 const start=source.indexOf('function worldGuidance('),end=source.indexOf('function talkRegionalResident(',start);vm.runInNewContext(`${source.slice(start,end)};result=worldGuidance()`,context);
 assert.equal(context.result.target.x,541);assert.equal(context.result.target.y,319);
});
test('scene preparation binds only the current resident and keeps hub interiors empty',()=>{
 const a={id:'one',sceneId:'region:1,0/house:house-0'},b={id:'two',sceneId:'region:1,0/house:house-1'};
 const context={atlas:{current:'1,0',content:{name:'Wood'}},scene:()=>({sceneId:a.sceneId}),setRegionTerrain(){},regionGrid:()=>[],drawRegion(){},regionCanvas:{getContext:()=>({})},regionActors:new Map([['1,0',[a,b]]]),simulation:{restoreActors(){}},encounters:{},currentRoom:'home',regionalHouse:{name:'House'},advance(){},setLocation(){},attackStart:0,activeGeneratedMove:null,hubActors:[{id:'rowan'}],HOUSES:[{id:'inn',name:'Inn'}]};
 runFunction('prepareScene','leaveScene',context);assert.deepEqual(context.encounters.actors,[a]);
 context.atlas.content=null;context.currentRoom='inn';context.regionalHouse=null;runFunction('prepareScene','leaveScene',context);assert.equal(context.encounters.actors.length,0);
});
test('startup restores matching region coordinates and rejects coordinates from a removed region',()=>{
 for(const exists of [true,false]){
  const context={runtime:{state:{worldPosition:{regionId:'1,0',room:null}}},simulation:{state:{room:'region:1,0',regionId:'1,0',terrainRoom:null,actors:{player:{facing:'south'}}},restoreBindings({player}){if(player)Object.assign(player,{x:740,y:80});return{};}},atlas:{regions:exists?{'1,0':{content:{name:'Test',landmarks:[]}}}:{},content:null},resolveWorldPosition,prepareScene(){},encounters:{actors:[]},player:{x:1,y:1}};
  const start=source.indexOf('const savedPosition='),end=source.indexOf('function scene()',start);vm.runInNewContext(source.slice(start,end),context);
  assert.equal(context.atlas.current,exists?'1,0':'0,0');assert.equal(context.player.x,exists?740:400);assert.equal(context.player.y,exists?80:335);
 }
});
test('resident dialogue checks authoritative reach and uses the actual resident identity',()=>{
 const resident={id:'1,0:house-0:resident',name:'Mara',hp:100,x:541,y:319};let offered=0,spoken;
 const context={runtime:{},atlas:{current:'1,0',content:{},regions:{'1,0':{}}},regionLife:()=>({houses:[],enemies:[]}),regionProgress:()=>({accepted:false}),currentRoom:'home',regionalHouse:{id:'house-0',resident:'Mara',greeting:'Hello.',request:'Help.'},regionalResident:()=>resident,simulation:{sync(){},reachable(){throw new Error('A solid obstruction blocks that interaction.')}},worldSnapshot:()=>({}),toast(){},offerRegionalQuest(){offered++},dialogue:{speak(lines){spoken=lines}},engineUI:{show(){}}};
 runFunction('talkRegionalResident','enterRegion',context);assert.equal(offered,0);assert.equal(spoken,undefined);
 context.simulation.reachable=(who,id,range)=>{assert.equal(who,'player');assert.equal(id,resident.id);assert.equal(range,75)};
 runFunction('talkRegionalResident','enterRegion',context);assert.equal(offered,1);assert.equal(spoken[0].speaker,'Mara');
});
