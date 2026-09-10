import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { interpret, decideNpc, providerInfo } from './model';
import type { ActorView, ModelResult, ProviderInfo } from '../shared/types';

const id=z.string().min(1).max(100),text=z.string().max(1200),number=z.number().finite();
const point=z.object({x:number.min(0).max(1000),y:number.min(0).max(1000)});
const observation=z.object({id,eventId:id,tick:number.int().min(0),kind:id,text,location:point,actor:id.optional(),subject:id.optional(),source:id.optional(),lineage:z.array(id).max(40)});
const evidence=z.object({id,category:z.enum(['care','honesty','deception','vigilance']),eventIds:z.array(id).max(40),text});
const actor=z.object({id,role:z.enum(['player','npc']),hp:number.min(0).max(1e6),maxHp:number.positive().max(1e6),fatigue:number.min(0).max(100),wakefulness:z.enum(['awake','asleep']),awakenedTick:number.optional(),attention:point.extend({until:number}).nullable(),facing:z.enum(['north','south','east','west']),mood:text,goal:text,memories:z.array(observation).max(120),evidence:z.array(evidence).max(100),tendencies:z.record(id,number),capabilities:z.array(id).max(40),relationships:z.record(id,z.object({trust:number,fear:number})),coins:number.min(0).max(1e6),following:id.optional(),permission:z.boolean()});
const location=z.discriminatedUnion('kind',[point.extend({kind:z.literal('ground')}),z.object({kind:z.literal('held'),actor:id}),z.object({kind:z.literal('contained'),container:id}),z.object({kind:z.literal('removed')})]);
const entity=z.object({id,name:text,kind:z.enum(['actor','item','fixture']),location,description:text,icon:z.string().max(100),props:z.record(id,z.union([z.string().max(1000),number,z.boolean()]))});
const issue=z.object({id,actor:id,owner:id,entity:id,amount:number.min(0),status:z.enum(['open','settled']),eventId:id,reportedTo:z.array(id).max(40),applied:z.array(id).max(40)});
const viewSchema=z.object({actor,self:entity,entities:z.array(entity).max(100),observations:z.array(observation).max(120),width:number.int().positive().max(1000),height:number.int().positive().max(1000),walls:z.array(point).max(1500),tick:number.int().min(0),version:number.int().min(0),knownIssues:z.array(issue).max(100)}).refine(view=>view.actor.id===view.self.id&&view.self.kind==='actor','Actor and self must match.');
const requestSchema=z.object({view:viewSchema,input:z.string().trim().min(1).max(1200).optional(),requestId:id.optional()}).strict();
interface Runtime {info():ProviderInfo;interpret(view:ActorView,input:string):Promise<ModelResult>;decide(view:ActorView):Promise<ModelResult>}
interface Options {env?:NodeJS.ProcessEnv;runtime?:Runtime}

/** Pure proposal service. Tilth's local deterministic simulation commits effects. */
export function worldApi({env=process.env,runtime}:Options={}) {
 const model=runtime??{info:()=>providerInfo(env),interpret:(view:ActorView,input:string)=>interpret(view,input,env),decide:(view:ActorView)=>decideNpc(view,env)};
 const cache=new Map<string,{digest:string;promise:Promise<ModelResult>;done:boolean}>();
 return async(req:IncomingMessage,res:ServerResponse,next:()=>unknown)=>{
  const path=req.url?.split('?')[0];if(!path?.startsWith('/api/world/'))return next();
  const send=(status:number,value:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value));};
  if(path==='/api/world/info'&&req.method==='GET')return send(200,{provider:model.info()});
  if(!['/api/world/interpret','/api/world/decide'].includes(path)||req.method!=='POST')return send(404,{error:'Unknown world request.'});
  try{
   if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Origin not allowed.'});
   if(model.info().provider==='claude-cli'&&!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??''))return send(403,{error:'The local narrator is available only on this computer.'});
   let bytes=0;const chunks:Buffer[]=[];
   for await(const chunk of req){const buffer=Buffer.from(chunk);bytes+=buffer.length;if(bytes>160_000)return send(413,{error:'The visible scene is too large.'});chunks.push(buffer);}
   let input;try{input=requestSchema.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{return send(400,{error:'Invalid actor view or action request.'});}
   const player=path.endsWith('/interpret');
   if(input.view.actor.role!==(player?'player':'npc')||player&&!input.input||!player&&input.input)return send(400,{error:'This request must control exactly its own character.'});
   const view=input.view as ActorView;
   const digest=createHash('sha256').update(JSON.stringify({path,view,input:input.input})).digest('hex');
   const prior=input.requestId?cache.get(input.requestId):undefined;
   if(prior&&prior.digest!==digest)return send(409,{error:'This request ID belongs to a different action snapshot.'});
   let result:ModelResult;
   if(prior)result=await prior.promise;
   else {
    for(const [key,value] of cache){if(cache.size<64)break;if(value.done)cache.delete(key);}
    if(input.requestId&&cache.size>=64)return send(429,{error:'The narrator is busy. Try again shortly.'});
    const promise=player?model.interpret(view,input.input!):model.decide(view);
    const entry={digest,promise,done:false};if(input.requestId)cache.set(input.requestId,entry);
    try{result=await promise;entry.done=true;}catch(error){if(input.requestId)cache.delete(input.requestId);throw error;}
   }
   return send(200,result);
  }catch(error){return send(502,{error:error instanceof Error?error.message:'The narrator could not produce an action.'});}
 };
}
