import {characterFromProfile} from '../content/characters.js';
import {questHistory,validateQuestNovelty} from './quest-guidance.js';
import {GENERATION_POLICY as POLICY,HOUSES,COMBOS} from '../content/game-config.js';
import {validateContent} from './contracts.js';
import {initialCharacterMemory,restoreCharacterMemory} from './character-memory.js';
export const SAVE_KEY='glyph-engine-v1';
const initial=()=>({version:1,events:[],seen:[],jobs:[],journal:[],offers:[],quests:[],characterMemory:initialCharacterMemory(),activeAwakening:null,lastAwakeningEvidence:0,lastReflectionEvidence:0,profile:{heroClass:'Warrior',gear:'Ashguard armor'}});
export class GameRuntime {
 constructor({storage=null,clock=()=>Date.now(),id=()=>crypto.randomUUID(),automaticQuestFollowups=true}={}){
  this.automaticQuestFollowups=automaticQuestFollowups;this.storage=storage;this.clock=clock;this.id=id;this.listeners=new Set();this.state=initial();this.storageWarning='';
  try{const saved=JSON.parse(storage?.getItem(SAVE_KEY)||'null');if(saved?.version===1&&['events','seen','jobs','journal','offers','quests'].every(k=>Array.isArray(saved[k]))){this.state={...initial(),...saved};const candidate=characterFromProfile(this.state.profile);const fields=['name','heroClass','hairStyle','hairColor','skinColor','clothing','outfitColor','weapon','bio','characterArt'];try{validateContent('character',Object.fromEntries(fields.map(k=>[k,candidate[k]])),[])}catch{this.state.profile={...initial().profile,onboarded:false}};this.state.jobs.forEach(j=>{if(j.status==='running')j.status='failed'});
    this.state.offers=this.state.offers.filter(o=>{try{validateContent('awakening',o.content,this.state.events);return true}catch{return false}});
    this.state.quests=this.state.quests.filter(q=>{try{validateContent('quest',q.content,this.state.events);return true}catch{return false}});
    if(!this.state.offers.some(o=>o.id===this.state.activeAwakening&&o.status==='accepted'))this.state.activeAwakening=null;
  }}catch{this.storageWarning='Saved progress could not be read; this session started fresh.'}
  for(const job of this.state.jobs)if(job.kind==='awakening'&&!job.rewardQuestId&&['queued','running','failed'].includes(job.status)){job.status='cancelled';job.error=null;}
  this.state.characterMemory=restoreCharacterMemory(this.state.characterMemory,this.state.events);
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn)}
 changed(){try{this.storage?.setItem(SAVE_KEY,JSON.stringify(this.state))}catch{this.storageWarning='Progress cannot be saved in this browser.'}this.listeners.forEach(fn=>fn(this.state))}
 finishCharacter(profile){validateContent('character',profile,[]);this.state.profile={...this.state.profile,...profile,onboarded:true};this.changed()}
 setProfile(profile){this.state.profile={...this.state.profile,...profile};this.changed()}
 enqueue(kind,key,events){if(this.state.jobs.some(j=>j.key===key)||this.state.jobs.length>=POLICY.maxJobs)return;this.state.jobs.push({id:this.id(),kind,key,eventIds:events.slice(-20).map(e=>e.id),status:'queued',error:null,...(kind==='quest'?{questHistory:questHistory(this.state.quests)}:{})});}
 record(type,target,label,{unique=false}={}){
  if(type==='room_entered'&&!HOUSES.some(h=>h.id===target))throw new Error('Unknown room');
  if(type==='combo_learned'&&!COMBOS.some(c=>c.id===target))throw new Error('Unknown combo');
  if(!['room_entered','combo_learned','quest_requested','quest_completed','awakening_accepted','awakening_declined','combat_hit','generated_combo','enemy_defeated','region_house','quest_accepted'].includes(type))throw new Error('Unknown event');
  const key=`${type}:${target}`,first=!this.state.seen.includes(key);if(unique&&!first)return null;
  if(first)this.state.seen.push(key);
  const event={id:this.id(),type,target,label,time:this.clock(),meaningful:first&&['room_entered','combo_learned','quest_completed'].includes(type)};
  this.state.events.push(event);this.state.journal.push({id:this.id(),title:label,summary:'',sourceEventIds:[event.id],source:'game',time:event.time});
  // Objectives count actions performed after quest acceptance, including a revisit.
  for(const q of this.state.quests.filter(q=>q.status==='active')){
   q.content.objectives.forEach((o,i)=>{if(o.target===target&&((o.type==='visit_room'&&type==='room_entered')||(o.type==='perform_combo'&&type==='combo_learned')))q.completed[i]=true});
   if(q.completed.every(Boolean)){q.status='complete';this.record('quest_completed',q.id,`Completed: ${q.content.title}`,{unique:true})}
  }
  const evidence=this.state.events.filter(e=>e.meaningful);
  if(evidence.length-this.state.lastReflectionEvidence>=POLICY.reflectionEvidence){this.enqueue('journal',`journal:${evidence.length}`,evidence);this.state.lastReflectionEvidence=evidence.length;}
  if(type==='quest_completed'){this.requestAwakening(target);if(this.automaticQuestFollowups)this.requestQuest('followup');}
  this.changed();return event;
 }
 requestQuest(reason='rowan'){
  if(this.state.quests.some(q=>['offered','active'].includes(q.status))||this.state.jobs.some(j=>j.kind==='quest'&&['queued','running','failed'].includes(j.status)))return;
  const event=this.record('quest_requested',`rowan:${this.state.quests.length}`,reason==='followup'?'Requested the next chapter after completing a quest':'Asked Rowan for a task',{unique:true});
  if(event)this.enqueue('quest',`quest:${this.state.quests.length}`,[...this.state.events.filter(e=>e.meaningful).slice(-19),event]);this.changed();
 }
 context(job){return {version:1,kind:job.kind,events:this.state.events.filter(e=>job.eventIds.includes(e.id)),profile:this.state.profile,...(job.rewardQuestId?{rewardQuestId:job.rewardQuestId}:{}),knownRooms:HOUSES.map(({id,name})=>({id,name})),knownCombos:COMBOS.map(({id,name})=>({id,name})),pastQuests:job.questHistory||questHistory(this.state.quests),activeAwakening:this.activeOffer()?.content.name||null}}
 requestAwakening(questId){
  const quest=this.state.quests.find(q=>q.id===questId&&q.status==='complete');
  const completion=this.state.events.find(e=>e.type==='quest_completed'&&e.target===questId);
  const regional=typeof questId==='string'&&questId.startsWith('region:')?this.state.regions?.[questId.slice(7)]:null;
  if((!quest&&!regional?.progress?.rewarded)||!completion)return;
  const key=`awakening:quest:${questId}`;if(this.state.jobs.some(j=>j.key===key))return;
  const evidence=this.state.events.filter(e=>e.meaningful&&e.id!==completion.id).slice(-19);
  this.enqueue('awakening',key,[...evidence,completion]);
  const job=this.state.jobs.find(j=>j.key===key);if(job)job.rewardQuestId=questId;
  this.changed();
 }
 activeOffer(){return this.state.offers.find(o=>o.id===this.state.activeAwakening&&o.status==='accepted')}
 complete(jobId,content){const job=this.state.jobs.find(j=>j.id===jobId);if(!job||['complete','cancelled'].includes(job.status))return;validateContent(job.kind,content,this.context(job).events);
  if(job.kind==='awakening')this.state.offers.push({id:job.id,content,status:'pending'});
  if(job.kind==='quest')validateQuestNovelty(content,this.context(job).pastQuests);
  if(job.kind==='quest')this.state.quests.push({id:job.id,content,status:'offered',completed:content.objectives.map(()=>false)});
  if(job.kind==='journal')this.state.journal.push({id:job.id,title:content.title,summary:content.summary,sourceEventIds:content.sourceEventIds,source:'ai',time:this.clock()});
  job.status='complete';job.error=null;this.changed();
 }
 decideAwakening(id,accept){const offer=this.state.offers.find(o=>o.id===id&&o.status==='pending');if(!offer)return;
  offer.status=accept?'accepted':'declined';if(accept)this.state.activeAwakening=id;
  this.record(accept?'awakening_accepted':'awakening_declined',id,`${accept?'Accepted':'Declined'} awakening: ${offer.content.name}`,{unique:true});
 }
 replaceQuest(id){const q=this.state.quests.find(q=>q.id===id&&['offered','active'].includes(q.status));if(!q)return;q.status='replaced';this.requestQuest();this.changed()}
 acceptQuest(id){const q=this.state.quests.find(q=>q.id===id&&q.status==='offered');if(q){q.status='active';this.changed()}}
 retry(){this.state.jobs.filter(j=>j.status==='failed').forEach(j=>{j.status='queued';j.error=null});this.changed()}
}
