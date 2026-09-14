import {HOUSES,COMBOS} from '../content/game-config.js';
export const objectiveKey=o=>`${o.type}:${o.target}`;
export function questHistory(quests){return quests.slice(-8).map(q=>({title:q.content.title,status:q.status,objectives:q.content.objectives.map(({type,target})=>({type,target}))}))}
export function questConstraints(history=[]){
 const recent=history.filter(q=>Array.isArray(q.objectives));
 const last=recent.at(-1)?.objectives||[];
 const excluded=new Set(last.map(objectiveKey));
 const all=[...HOUSES.map(h=>({type:'visit_room',target:h.id})),...COMBOS.map(c=>({type:'perform_combo',target:c.id}))];
 const allowed=all.filter(o=>!excluded.has(objectiveKey(o)));
 const counts=new Map();for(const q of recent)for(const o of q.objectives)counts.set(objectiveKey(o),(counts.get(objectiveKey(o))||0)+1);
 const minimum=Math.min(...allowed.map(o=>counts.get(objectiveKey(o))||0));
 return {allowedObjectives:allowed,priorityObjectives:allowed.filter(o=>(counts.get(objectiveKey(o))||0)===minimum),recentTitles:recent.map(q=>q.title)};
}
export function validateQuestNovelty(content,history){
 const {allowedObjectives,priorityObjectives,recentTitles}=questConstraints(history);
 const allowed=new Set(allowedObjectives.map(objectiveKey)),priority=new Set(priorityObjectives.map(objectiveKey));
 const keys=content.objectives.map(objectiveKey);
 if(new Set(keys).size!==keys.length||keys.some(k=>!allowed.has(k))||!keys.some(k=>priority.has(k))||recentTitles.some(t=>t.trim().toLowerCase()===content.title.trim().toLowerCase()))throw new Error('Quest repeats recent content. Retry to request different objectives.');
 return content;
}
export function nextGuidance(state,position,room,rowanPosition){
 const quest=state.quests.find(q=>q.status==='active');
 if(quest){const index=quest.completed.findIndex(done=>!done),o=quest.content.objectives[index];if(!o)return null;
  if(o.type==='perform_combo'){const combo=COMBOS.find(c=>c.id===o.target);return{title:quest.content.title,text:`${index+1}/${quest.completed.length} · ${combo.name}: ${combo.keys}. Let each move finish.`,target:null}}
  const house=HOUSES.find(h=>h.id===o.target);
  if(room)return{title:quest.content.title,text:`Leave through the bottom doorway, then enter ${house.name}.`,target:{x:400,y:421}};
  const target={x:house.x+house.w/2,y:house.y+79};
  const horizontal=target.x-position.x,vertical=target.y-position.y;
  const bearing=[Math.abs(vertical)>25?(vertical<0?'north':'south'):'',Math.abs(horizontal)>25?(horizontal<0?'west':'east'):''].filter(Boolean).join('-');
  return{title:quest.content.title,text:`${index+1}/${quest.completed.length} · ${house.name}: ${bearing?`head ${bearing}, then `:''}enter the south-facing door.`,target};
 }
 if(state.quests.some(q=>q.status==='offered'))return{title:'A new quest is ready',text:'Press T to read and accept your next task.',target:null};
 const job=state.jobs.find(j=>j.kind==='quest'&&['queued','running','failed'].includes(j.status));
 if(job)return{title:job.status==='failed'?'Next quest needs a retry':'Preparing your next quest',text:job.status==='failed'?'Press T to see the error and retry.':'Keep exploring. A new task will appear here when ready.',target:null};
 return{title:'Find your next adventure',text:'Speak to Rowan near the inn. Press F when close.',target:room?{x:400,y:421}:rowanPosition?{x:rowanPosition.x,y:rowanPosition.y}:{x:268,y:260}};
}
