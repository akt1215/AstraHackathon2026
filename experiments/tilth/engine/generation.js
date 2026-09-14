import {generationResponse} from './api-response.js';
// Only milestone jobs reach the provider. Opening the journal never enqueues a request.
export class GenerationQueue {
 constructor(runtime,{fetcher=fetch,onStatus=()=>{}}={}){this.runtime=runtime;this.fetcher=(...args)=>fetcher(...args);this.onStatus=onStatus;this.enabled=false;this.running=false;runtime.subscribe(()=>this.pump())}
 async connect(){try{const r=await this.fetcher('/api/generation/status');if(!r.ok)throw new Error();const s=await r.json();this.enabled=s.configured===true;this.onStatus(this.enabled?'ready':'unconfigured');if(this.enabled)this.pump()}catch{this.onStatus('offline')}}
 async pump(){if(!this.enabled||this.running)return;const job=this.runtime.state.jobs.find(j=>j.status==='queued');if(!job)return;
  this.running=true;job.status='running';this.runtime.changed();
  try{const r=await this.fetcher('/api/generation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:job.id,...this.runtime.context(job)}),signal:AbortSignal.timeout(45000)});const data=await generationResponse(r);this.runtime.complete(job.id,data.content)}
  catch(e){job.status='failed';job.error=e.name==='TimeoutError'?'Generation timed out. You can retry later.':e.message;this.runtime.changed()}
  finally{this.running=false;this.pump()}
 }
}
