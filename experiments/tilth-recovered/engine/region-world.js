import {ACTORS} from '../content/encounters.js';
import {regionLife} from './region-life.js';

const regionPattern=/^-?\d+,-?\d+$/;
const roomKinds=new Set(['inn','smith','home']);
export function worldScene(regionId='0,0',terrainRoom=null,houseId=null){
 if(!regionPattern.test(regionId))throw new Error('Unknown region coordinates.');
 if(terrainRoom!==null&&!roomKinds.has(terrainRoom))throw new Error('Unknown interior terrain.');
 if(regionId==='0,0')return{sceneId:terrainRoom,terrainRoom,regionId,houseId:null};
 if(terrainRoom&&!/^house-\d+$/.test(houseId??''))throw new Error('A regional interior needs its own house identity.');
 return{sceneId:`region:${regionId}${terrainRoom?`/house:${houseId}`:''}`,terrainRoom,regionId,houseId:terrainRoom?houseId:null};
}
export function regionActorSpecs(regionId,content,progress={}){
 const life=regionLife(content),outdoor=worldScene(regionId),defeated=new Set(progress.defeated??[]);
 const enemies=life.enemies.map(e=>({
  ...ACTORS.find(a=>a.id===(e.kind==='sentry'?'cinder-sentry':'ash-raider')),
  ...outdoor,id:`${regionId}:${e.id}`,foeId:e.id,name:e.name,hp:e.hp,maxHp:e.hp,
  x:e.x*20+10,y:e.y*20,color:e.color,role:e.kind==='mage'?'Mage':e.kind==='sentry'?'Warrior':'Rogue',weapon:e.kind==='mage'?'staff':e.kind==='sentry'?'spear':'sword',
  personality:`${e.name} patrols ${content.name}. ${e.taunt}`,warning:e.taunt,enemy:true,persistentDefeat:defeated.has(e.id),
 }));
 const residents=life.houses.map(h=>({
  ...worldScene(regionId,h.kind,h.id),id:`${regionId}:${h.id}:resident`,name:h.resident,hp:100,maxHp:100,x:510,y:280,color:'#a79665',role:'Healer',weapon:'staff',enemy:false,
  personality:`${h.resident} lives in ${h.name}. ${h.greeting} ${h.request}`,goal:h.request,warning:'Please stop. I live here.',
 }));
 return [...enemies,...residents];
}
export function resolveWorldPosition(saved={},regions={}){
 const requested=saved?.regionId??'0,0',regionId=requested==='0,0'||Object.hasOwn(regions,requested)?requested:'0,0';
 let terrainRoom=null,houseId=null;
 if(requested===regionId){
  if(regionId==='0,0')terrainRoom=roomKinds.has(saved?.room)?saved.room:null;
  else{const house=regionLife(regions[regionId].content).houses.find(h=>h.id===saved?.houseId);if(house&&saved?.room===house.kind){terrainRoom=house.kind;houseId=house.id;}}
 }
 const p=saved?.returnPoint,validPoint=p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<800&&p.y>=0&&p.y<600;
 return{...worldScene(regionId,terrainRoom,houseId),returnPoint:terrainRoom&&validPoint?{x:p.x,y:p.y}:null};
}
