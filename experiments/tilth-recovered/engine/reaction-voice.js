import {generationResponse} from './api-response.js';
import {validateContent} from './contracts.js';
export class ReactionVoice{
 constructor({fetcher=fetch,isEnabled=()=>true,onLine=()=>{},onError=()=>{}}={}){Object.assign(this,{fetcher:(...args)=>fetcher(...args),isEnabled,onLine,onError});this.queue=[];this.running=false}
 request(actor,event){if(!this.isEnabled())return;this.queue=this.queue.filter(j=>j.actor.id!==actor.id);this.queue.push({actor,event,revision:actor.revision});this.pump()}
 async pump(){if(this.running)return;const job=this.queue.shift();if(!job)return;this.running=true;try{if(job.actor.revision!==job.revision||job.actor.downUntil)return;const r=await this.fetcher('/api/generation',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({id:crypto.randomUUID(),kind:'reaction',events:[job.event]})});const data=await generationResponse(r);validateContent('reaction',data.content,[job.event]);if(job.actor.revision===job.revision&&!job.actor.downUntil)this.onLine(job.actor,data.content.line,job.event)}catch(e){this.onError(e.message)}finally{this.running=false;this.pump()}}
}
