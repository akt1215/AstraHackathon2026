import {characterContent} from '../content/characters.js';
import {drawHero} from '../volcanic.js';
import {drawAttachment} from './generated-renderer.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function installGameUI({runtime,queue,modal,body,title,redraw,onAccept}){
 let status='checking',view=null;
 const show=(name)=>{view=name;modal.classList.remove('start-menu');render();if(!modal.open)modal.showModal();if(status==='offline'||status==='checking')queue.connect()};
 const button=(label,action)=>`<button class="outline" data-engine-action="${action}">${escape(label)}</button>`;
 function render(){if(!view)return;const state=runtime.state;
  if(view==='journal'){title.textContent='Your journal';body.innerHTML=state.journal.length?state.journal.slice().reverse().map(j=>`<div class="journal-entry"><h2>${escape(j.title)}</h2><p>${escape(j.summary||'Recorded in your adventure history.')}</p><small>${j.source==='ai'?'AI reflection · grounded in recorded events':'Game event'} · ${new Date(j.time).toLocaleDateString()}</small></div>`).join(''):'<p class="modal-note">Your story starts here. Visit a house or learn a combo to record your first discovery.</p>';}
  if(view==='awakening'){
   title.textContent='Awakenings';const pending=state.offers.find(o=>o.status==='pending'),active=runtime.activeOffer(),offer=pending||active;
   body.innerHTML=offer?`<div class="eyebrow">${pending?'AN OFFER · YOUR CHOICE':'YOUR ACCEPTED AWAKENING'}</div><h2>${escape(offer.content.name)}</h2><canvas id="awakeningPreview" width="140" height="120" aria-label="Proposed character appearance"></canvas><p class="modal-note">${escape(offer.content.description)}</p><p class="modal-note">${escape(offer.content.reason)}</p><div class="journal-entry"><h2>${escape(offer.content.skill.name)}</h2><p>${escape(offer.content.skill.description)}</p><p>${escape(offer.content.tradeoff)}</p></div><div class="battle-actions">${pending?button('Accept awakening','accept')+button('Decline','decline')+button('Decide later','later'):''}</div>`:'<p class="modal-note">Explore and learn. Significant experiences may lead to an awakening offer. Nothing changes until you accept.</p>';
   if(pending){body.querySelector('[data-engine-action="accept"]').onclick=()=>{runtime.decideAwakening(pending.id,true);onAccept();redraw()};body.querySelector('[data-engine-action="decline"]').onclick=()=>runtime.decideAwakening(pending.id,false);body.querySelector('[data-engine-action="later"]').onclick=()=>modal.close()}
   if(offer){const c=body.querySelector('canvas').getContext('2d');drawAttachment(c,70,70,2,offer.content);drawHero(c,70,70,'#a85b37',2,'',false,{role:runtime.state.profile.heroClass,custom:runtime.state.profile.onboarded?characterContent(runtime.state.profile):undefined})}
  }
  if(view==='quests'){
   title.textContent='Optional requests';body.innerHTML='<p class="modal-note">These requests are optional. Your main goal is to help Clover and earn Rowan’s support.</p><button class="outline" id="requestOptionalQuest">Ask for an optional task</button>'+[...state.quests].sort((a,b)=>(['offered','active'].includes(b.status)?1:0)-(['offered','active'].includes(a.status)?1:0)).map(q=>`<div class="journal-entry"><h2>${escape(q.content.title)}</h2><p>${escape(q.content.description)}</p>${q.content.objectives.map((o,i)=>`<p>${q.completed[i]?'✓':'◇'} ${escape(o.description)}</p>`).join('')}<p>${escape(q.status)}</p>${['active','offered'].includes(q.status)?`<button class="outline" data-replace-quest="${escape(q.id)}">Request a different task</button>`:''}${q.status==='offered'?`<button class="primary" data-quest="${escape(q.id)}">Accept quest</button>`:''}</div>`).join('');body.querySelector('#requestOptionalQuest').onclick=()=>{runtime.automaticQuestFollowups=true;runtime.requestQuest()};body.querySelectorAll('[data-quest]').forEach(b=>b.onclick=()=>runtime.acceptQuest(b.dataset.quest));body.querySelectorAll('[data-replace-quest]').forEach(b=>b.onclick=()=>runtime.replaceQuest(b.dataset.replaceQuest));
  }
  const pending=state.jobs.filter(j=>['queued','running','failed'].includes(j.status));
  if(status!=='ready'||pending.length){const p=document.createElement('p');p.className='modal-note';p.textContent=status==='unconfigured'?'AI generation is not connected yet. Your discoveries are saved.':status==='offline'?'Generation service is unavailable. Your discoveries are saved.':pending.map(j=>`${j.kind}: ${j.status}${j.error?' — '+j.error:''}`).join(' · ');body.append(p)}
  if(state.jobs.some(j=>j.status==='failed')){const b=document.createElement('button');b.className='outline';b.textContent='Retry generation';b.onclick=()=>runtime.retry();body.append(b)}
  if(runtime.storageWarning){const p=document.createElement('p');p.textContent=runtime.storageWarning;body.append(p)}
 }
 runtime.subscribe(()=>{document.querySelector('#awakeningButton').textContent=runtime.state.offers.some(o=>o.status==='pending')?'✦ AWAKENING READY':'✦ AWAKENINGS';if(modal.open&&view)render()});
 modal.addEventListener('close',()=>view=null);
 return {show,leave(){view=null},setStatus(s){status=s;if(modal.open&&view)render()}};
}
