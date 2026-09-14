import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldController,isTextEntry} from './world-controller.js';
const deferred=()=>{let resolve;return{promise:new Promise(r=>resolve=r),resolve}};
function fixture(fetcher){const simulation={state:{id:'one',version:0,actors:{player:{hp:280}}},sync(){},view(id='player'){return{actor:{id},self:{id},version:this.state.version}},reactions(){return[]},publicState(){return{journal:[]}},apply(action){this.state.version++;return{ok:true,events:[],action}},direct(kind,entity){return{actor:'player',ops:[{kind,entity}]}}};const runtime={state:{journal:[]},changed(){this.saves=(this.saves||0)+1}};const scene={player:{x:10,y:20},room:null,actors:[{id:'rowan',revision:0}]};return{simulation,runtime,scene,controller:new WorldController({simulation,runtime,snapshot:()=>scene,fetcher})}}
test('unrestricted text remains input, and its response applies against the current simulation',async()=>{const response=deferred();const{simulation,controller}=fixture(()=>response.promise);let applied;simulation.apply=a=>{applied={a,version:simulation.state.version};return{ok:true,events:[]}};const pending=controller.submit('throw this like a comet');simulation.state.version=6;response.resolve({ok:true,json:async()=>({decision:{action:{actor:'player',ops:[]},explanation:'Throw'}})});assert.equal((await pending).ok,true);assert.equal(applied.version,6)});
test('a late result from a replaced story cannot overwrite current state',async()=>{const response=deferred();const{simulation,controller}=fixture(()=>response.promise);let calls=0;simulation.apply=()=>calls++;const pending=controller.submit('look around');simulation.state.id='two';response.resolve({ok:true,json:async()=>({decision:{action:{actor:'player',ops:[]}}})});assert.equal((await pending).ok,false);assert.equal(calls,0)});
test('coalesces repeated background reaction slots and never blocks observing movement',async()=>{const response=deferred();let calls=0;const{controller,simulation}=fixture(()=>{calls++;return response.promise});controller.enabled=true;let cues=['rowan','rowan'];simulation.reactions=()=>{const next=cues;cues=[];return next};controller.observe();simulation.state.version++;controller.observe();assert.equal(calls,1);assert.equal(controller.playerPending,false);response.resolve({ok:true,json:async()=>({decision:{action:{actor:'rowan',ops:[]}}})});await controller.idle();assert.equal(calls,1)});
test('keyboard targets inside writable fields never become game shortcuts',()=>{for(const matches of [true,false])assert.equal(isTextEntry({closest:()=>matches?{}:null}),matches)});

test('player proposals do not cross a room transition',async()=>{const response=deferred();const{simulation,controller,scene}=fixture(()=>response.promise);let applied=0;simulation.apply=()=>applied++;const pending=controller.submit('throw the stone');scene.room='inn';response.resolve({ok:true,json:async()=>({decision:{action:{actor:'player',ops:[]}}})});assert.equal((await pending).ok,false);assert.equal(applied,0)});
test('a delayed NPC proposal is discarded after combat eligibility changes',async()=>{const response=deferred();const{simulation,controller,scene}=fixture(()=>response.promise);let applied=0;simulation.apply=()=>applied++;controller.enabled=true;controller.queued.add('rowan');controller.pump();scene.actors[0].hostile=true;scene.actors[0].revision=1;response.resolve({ok:true,json:async()=>({decision:{action:{actor:'rowan',ops:[]}}})});await controller.idle();assert.equal(applied,0)});
test('enemy encounter movement never requests a model proposal',()=>{let requests=0;const{simulation,controller,scene}=fixture(()=>requests++);scene.actors[0].enemy=true;simulation.reactions=()=>['rowan'];controller.enabled=true;controller.observe();assert.equal(requests,0)});
test('a configured but unhealthy narrator remains explicitly retryable',async()=>{const{controller}=fixture(async()=>({ok:true,json:async()=>({provider:{provider:'claude-cli',available:false}})}));await controller.connect();assert.equal(controller.enabled,true)});
test('browser fetch is invoked without a controller receiver',async()=>{let receiver;const{controller}=fixture(function(){receiver=this;return Promise.resolve({ok:true,json:async()=>({provider:{provider:'claude-cli',available:true}})})});await controller.connect();assert.equal(receiver,undefined);assert.equal(controller.enabled,true)});
test('player proposals use the screen projection while NPC proposals keep their own view',async()=>{
 const requests=[];const f=fixture(async(path,options)=>{const body=JSON.parse(options.body);requests.push({path,view:body.view});
test('player proposals cannot cross between two regions with the same outdoor terrain kind',async()=>{
 const reply=deferred(),{controller,scene,simulation}=fixture(()=>reply.promise);scene.sceneId='region:1,0';scene.regionId='1,0';let applied=0;simulation.apply=()=>applied++;
 const pending=controller.submit('speak to the person here');scene.sceneId='region:2,0';scene.regionId='2,0';
 reply.resolve({ok:true,json:async()=>({decision:{action:{actor:'player',ops:[]}}})});assert.equal((await pending).ok,false);assert.equal(applied,0);
});
test('an actual regional resident responds inside its own house and a reply cannot cross houses',async()=>{
 const reply=deferred();let calls=0;const{controller,scene,simulation}=fixture(()=>{calls++;return reply.promise});
 const resident={id:'1,0:house-0:resident',sceneId:'region:1,0/house:house-0',revision:0,hp:100};scene.actors=[resident];scene.room='home';scene.sceneId=resident.sceneId;scene.regionId='1,0';let applied=0;simulation.apply=()=>applied++;
 controller.enabled=true;controller.queued.add(resident.id);controller.pump();assert.equal(calls,1);scene.sceneId='region:1,0/house:house-1';
 reply.resolve({ok:true,json:async()=>({decision:{action:{actor:resident.id,ops:[]}}})});await controller.idle();assert.equal(applied,0);
});
test('resident eligibility excludes sleeping, defeated, hostile and enemy characters',()=>{
 const{controller,scene}=fixture(()=>{});scene.room='home';scene.sceneId='region:1,0/house:house-0';scene.actors=[{id:'resident',sceneId:scene.sceneId,hp:100}];
 assert.ok(controller.npcToken('resident'));
 for(const patch of [{worldSleeping:true},{downUntil:10},{hostile:true},{enemy:true},{hp:0}]){Object.assign(scene.actors[0],patch);assert.equal(controller.npcToken('resident'),null);for(const key of Object.keys(patch))delete scene.actors[0][key];scene.actors[0].hp=100;}
});
test('persistence stores region and house identity together with physical room and return point',()=>{
 const{controller,scene,runtime}=fixture(()=>{});Object.assign(scene,{sceneId:'region:1,0/house:house-1',room:'home',regionId:'1,0',houseId:'house-1',returnPoint:{x:600,y:450}});controller.persist();
 assert.deepEqual(runtime.state.worldPosition,{sceneId:scene.sceneId,room:'home',regionId:'1,0',houseId:'house-1',returnPoint:{x:600,y:450}});
});return{ok:true,json:async()=>({decision:{action:{actor:body.view.actor.id,ops:[]}}})}});
 const playerView=()=>({actor:{id:'player'},entities:[{id:'visible-far-edge'}]});
 const controller=new WorldController({simulation:f.simulation,runtime:f.runtime,snapshot:()=>f.scene,fetcher:f.controller.fetcher,playerView});
 await controller.submit('look at the far edge');controller.enabled=true;controller.queued.add('rowan');controller.pump();await controller.idle();
 assert.deepEqual(requests[0].view.entities,[{id:'visible-far-edge'}]);assert.equal(requests[1].view.actor.id,'rowan');assert.equal(requests[1].view.entities,undefined);
});
