import type { Actor, Entity, World } from './types';
export function createWorld(variant: 'baseline' | 'tired' | 'asleep' = 'baseline'): World {
 const actor = (id: string, goal: string): Actor => ({id,role:id==='player'?'player':'npc',hp:8,maxHp:8,fatigue:10,wakefulness:'awake',attention:null,facing:'west',mood:'attentive',goal,memories:[],evidence:[],tendencies:{},capabilities:[],relationships:{},coins:id==='player'?3:0,permission:false});
 const entities: Record<string,Entity> = {};
 const add = (id:string,name:string,kind:Entity['kind'],x:number,y:number,icon:string,description:string,props:Entity['props']={}) => { entities[id]={id,name,kind,location:{kind:'ground',x,y},icon,description,props}; };
 add('player','You','actor',2,4,'🧭','A traveler seeking passage with an injured companion.',{solid:true,size:2,color:'#57c8d1'});
 add('guard','Mara','actor',10,5,'🛡️','The keeper of the gate. Permission, a key, or drawing her attention away may create a route.',{solid:true,size:2,color:'#daa05a'});
 add('companion','Ivo','actor',3,5,'🧑','An injured companion who wants to reach the refuge beyond the gate.',{solid:true,size:2,color:'#b79af2'});
 add('vase','Clay vase','item',4,3,'🏺','Portable, fragile clay. A hard landing breaks it and makes a loud sound.',{portable:true,fragile:true,size:1,noise:8});
 add('key','Brass key','item',7,2,'🗝️','Your brass key fits the gate. Mara will accept it as collateral for unpaid supplies.',{portable:true,size:1,noise:2,owner:'player',price:9});
 add('crate','Wooden crate','item',6,6,'📦','A solid portable crate. Placed in the gate, it braces the opening.',{portable:true,solid:true,size:2,noise:5});
 add('medicine','Bandages','item',5,5,'🩹','Restores 3 HP. Costs 4 coins; belongs to Mara until paid for.',{portable:true,size:1,heal:3,price:4,owner:'guard',noise:1});
 add('tonic','Restorative tonic','item',5,6,'🧪','Restores 4 HP. Costs 5 coins; belongs to Mara until paid for.',{portable:true,size:1,heal:4,price:5,owner:'guard',fragile:true,noise:6});
 add('gate','Iron gate','fixture',11,4,'🚪','Locked gate with a small gap. Mara can permit passage. A key unlocks it when she is not blocking access.',{solid:true,size:3,gap:1,locked:true,open:false,key:'key'});
 add('exit','Refuge','fixture',12,4,'✨','Reach this side of the gate with Ivo.',{});
 add('bench','Stone bench','fixture',8,6,'🪑','A quiet place to rest. Resting reduces fatigue.',{});
 const actors={player:actor('player','Reach the refuge with Ivo.'),guard:actor('guard','Watch the gate. Protect supplies. Consider earned trust, reports, debt, distraction and your fatigue; decide whether to help.'),companion:actor('companion','Reach the refuge with the traveler. Seek treatment if hurt; decide whether to follow, help or report observed theft.')};
 actors.player.relationships.companion={trust:1,fear:0}; actors.companion.relationships.player={trust:1,fear:0};
 actors.player.facing='east'; actors.companion.facing='east'; actors.companion.hp=5;
 if(variant==='tired'){actors.guard.fatigue=85;actors.guard.mood='yawning';}
 if(variant==='asleep'){actors.guard.wakefulness='asleep';actors.guard.fatigue=95;actors.guard.mood='asleep';}
 const walls=[];
 for(let x=0;x<14;x++)for(let y=0;y<9;y++)if(x===0||x===13||y===0||y===8||(x===11&&y!==4))walls.push({x,y});
 return {id:globalThis.crypto.randomUUID(),version:0,tick:0,seed:1,width:14,height:9,walls,entities,actors,events:[],issues:[],objective:{title:'Reach the refuge with Ivo',step:'Help your companion and find a way through the guarded gate.',status:'active'},phase:null,receipts:{}};
}
