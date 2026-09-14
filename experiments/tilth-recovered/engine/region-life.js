import {regionSeed} from '../content/region-design.js';
export function regionLife(content){
 const seed=regionSeed(content),sockets=[{x:8,y:8},{x:30,y:8},{x:8,y:22},{x:30,y:22},{x:7,y:15},{x:33,y:15}];
 sockets.sort((a,b)=>Math.min(...content.landmarks.map(m=>Math.hypot(b.x-m.x,b.y-m.y)))-Math.min(...content.landmarks.map(m=>Math.hypot(a.x-m.x,a.y-m.y))));
 const homes=content.houses||[{name:'Wayfarer Refuge',kind:'home',resident:'Mara',greeting:'The roads are no longer safe. Will you help us?',request:'Defeat the patrols outside, then return to me.',thanks:'The roads are safe again. You have earned your rest.'}];
 const houses=homes.map((h,i)=>({...h,id:`house-${i}`,...sockets[i],door:{x:sockets[i].x*20+10,y:sockets[i].y*20+54}}));
 const spots=[{x:13,y:10},{x:26,y:12},{x:12,y:19},{x:25,y:23},{x:20,y:7}];
 const specs=content.enemies||Array.from({length:3},(_,i)=>({name:['Road Reaver','Ruin Sentinel','Ash Hexer'][i],kind:['raider','sentry','mage'][i],hp:[70,100,80][i],color:['#a65639','#827348','#5a8490'][i],taunt:'These roads are ours. Turn back!'}));
 const enemies=specs.map((e,i)=>({...e,...spots[(i+seed%spots.length)%spots.length],id:`foe-${i}`}));
 return{houses,enemies,objective:content.objective||{title:'Secure the passage',description:'Defeat the hostile patrols and report to the refuge.'}};
}
export function regionProgress(entry){const life=regionLife(entry.content),saved=entry.progress||{},valid=new Set(life.enemies.map(e=>e.id));entry.progress={defeated:[...new Set((saved.defeated||[]).filter(id=>valid.has(id)))],offered:saved.offered===true||saved.rewarded===true,accepted:saved.accepted===true||saved.rewarded===true,rewarded:saved.rewarded===true};return entry.progress}
export function defeatRegionalEnemy(runtime,regionId,foeId){const entry=runtime.state.regions?.[regionId];if(!entry)return false;const progress=regionProgress(entry);if(!regionLife(entry.content).enemies.some(e=>e.id===foeId)||progress.defeated.includes(foeId))return false;progress.defeated.push(foeId);runtime.record('enemy_defeated',`${regionId}:${foeId}`,`Defeated ${regionLife(entry.content).enemies.find(e=>e.id===foeId).name}`,{unique:true});return true}
export function completeRegionalObjective(runtime,regionId){const entry=runtime.state.regions?.[regionId];if(!entry)return false;const p=regionProgress(entry),life=regionLife(entry.content);if(!p.accepted||p.rewarded||p.defeated.length!==life.enemies.length)return false;p.rewarded=true;runtime.record('quest_completed',`region:${regionId}`,`Completed: ${life.objective.title}`,{unique:true});return true}
export function regionHouseAt(content,player,dir){if(dir!=='up')return null;return regionLife(content).houses.find(h=>Math.abs(player.x-h.door.x)<=16&&player.y<=h.door.y+10&&player.y>=h.door.y-16)||null}

export function offerRegionalQuest(runtime,regionId){const entry=runtime.state.regions?.[regionId];if(!entry)return false;const p=regionProgress(entry);if(p.offered)return false;p.offered=true;runtime.changed();return true}
export function acceptRegionalQuest(runtime,regionId){const entry=runtime.state.regions?.[regionId];if(!entry)return false;const p=regionProgress(entry);if(!p.offered||p.accepted||p.rewarded)return false;p.accepted=true;runtime.record('quest_accepted',`region:${regionId}`,`Accepted: ${regionLife(entry.content).objective.title}`,{unique:true});return true}
