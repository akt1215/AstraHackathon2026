import test from 'node:test';
import assert from 'node:assert/strict';
import {drawVolcanic} from './volcanic.js';
import {canStand,advance,doorwayAt,exitAt,houses,obstacles} from './world.js';
// Capture the actual geometry registered by the art renderer, not a duplicate map.
const ctx=new Proxy({getImageData:()=>({data:new Uint8ClampedArray(800*600*4)}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
drawVolcanic(ctx);
test('magma is blocked along the full river; the bridge deck is safe',()=>{
 for(const [x,y] of [[710,90],[725,240],[645,370],[650,550],[780,480]])assert.equal(canStand(x,y),false,`${x},${y}`);
 for(const x of [560,585,620,650,690,712])assert.equal(canStand(x,475),true,`bridge ${x}`);
 assert.equal(canStand(650,440),false);assert.equal(canStand(650,505),false);
});
test('buildings block all sides and each door has a safe approach and return',()=>{
 for(const h of houses){assert.equal(canStand(h.x+h.w/2,h.y+20),false);assert.equal(canStand(h.x-2,h.y+20),false);assert.equal(canStand(h.x+h.w/2,h.y+82),true);assert.equal(doorwayAt(h.x+h.w/2,h.y+65,'up')?.id,h.id);assert.equal(doorwayAt(h.x,h.y+65,'up'),null)}
 assert.equal(canStand(181,258),true);assert.equal(canStand(170,535),true);
});
test('substeps prevent tunnelling through walls and magma',()=>{
 assert.ok(advance({x:400,y:335},400,0).x<610);
 const p=advance({x:130,y:245},0,-100);assert.ok(p.y>=233);
});
test('room walls and furniture are solid; entrances and exits remain accessible',()=>{
 for(const room of ['inn','smith','home']){assert.equal(canStand(400,397,room),true);assert.equal(canStand(400,418,room),true);assert.equal(canStand(205,300,room),false);assert.equal(canStand(400,450,room),false);assert.equal(canStand(260,210,room),false)}
 assert.equal(exitAt(400,421,'down'),true);assert.equal(exitAt(300,421,'down'),false);assert.equal(exitAt(400,421,'up'),false);
});
test('redrawing does not accumulate collision bodies',()=>{const count=obstacles.length;drawVolcanic(ctx);assert.equal(obstacles.length,count)});
