import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { worldApi } from './world-api';
import {interpret,providerInfo} from './model';
import {WorldSimulation} from '../engine/world-simulation.js';

const actor={id:'player',role:'player',hp:280,maxHp:280,fatigue:10,wakefulness:'awake',attention:null,facing:'east',mood:'alert',goal:'Help Clover',memories:[],evidence:[],tendencies:{},capabilities:[],relationships:{},coins:3,permission:false};
const self={id:'player',name:'Traveler',kind:'actor',location:{kind:'ground',x:400,y:335},description:'A traveler',icon:'',props:{solid:true}};
const view={actor,self,entities:[self],observations:[],width:800,height:600,walls:[],tick:0,version:0,knownIssues:[]};
const result={decision:{action:{actor:'player',intent:'Rest',ops:[{kind:'transform',entity:'player',rule:'rest'}]},explanation:'Rest'},latencyMs:1,provider:'test'};
function setup(){const runtime={info:()=>({provider:'offline',model:'test',available:false,label:'Test'}),interpret:vi.fn(async()=>result),decide:vi.fn(async()=>result)};return {runtime,api:worldApi({runtime})};}
async function call(api:ReturnType<typeof worldApi>,input:unknown,{url='/api/world/interpret',origin='http://localhost:8788',address='127.0.0.1'}={}){
 const req=Readable.from([JSON.stringify(input)]);Object.assign(req,{url,method:'POST',headers:{host:'localhost:8788',origin},socket:{remoteAddress:address}});
 let status=200,body='';const res={setHeader(){},set statusCode(value:number){status=value},end(value:string){body=value}};
 await api(req as never,res as never,()=>{});return {status,body:JSON.parse(body)};
}
describe('world proposal boundary',()=>{
 it('forwards unrestricted text and only the bounded actor projection',async()=>{
  const {api,runtime}=setup();const response=await call(api,{view:{...view,hiddenWorld:{secret:'never pass this'}},input:'Could I toss this to my friend?',requestId:'first'});
  expect(response.status).toBe(200);expect(runtime.interpret).toHaveBeenCalledOnce();
  expect(runtime.interpret.mock.calls[0][0]).not.toHaveProperty('hiddenWorld');
  expect(runtime.interpret.mock.calls[0][1]).toBe('Could I toss this to my friend?');
 });
 it('rejects invalid geometry, role confusion and other origins before inference',async()=>{
  const {api,runtime}=setup();
  expect((await call(api,{view:{...view,width:NaN},input:'go'})).status).toBe(400);
  expect((await call(api,{view,input:'go'},{url:'/api/world/decide'})).status).toBe(400);
  expect((await call(api,{view,input:'go'},{origin:'https://unrelated.example'})).status).toBe(403);
  expect(runtime.interpret).not.toHaveBeenCalled();expect(runtime.decide).not.toHaveBeenCalled();
 });
 it('deduplicates a captured request and rejects a changed snapshot under its ID',async()=>{
  const {api,runtime}=setup();const input={view,input:'rest',requestId:'retry'};
  expect((await call(api,input)).status).toBe(200);
  expect((await call(api,input)).body).toEqual(result);
  expect(runtime.interpret).toHaveBeenCalledOnce();
  expect((await call(api,{...input,input:'something else'})).status).toBe(409);
 });
 it('never exposes the locally logged-in CLI to nonlocal clients',async()=>{
  const {runtime}=setup();const api=worldApi({runtime:{...runtime,info:()=>({provider:'claude-cli',model:'sonnet',available:true,label:'Local'})}});
  expect((await call(api,{view,input:'go'},{address:'192.168.1.20'})).status).toBe(403);
  expect(runtime.interpret).not.toHaveBeenCalled();
 });
});

it('a failed local request leaves an explicit retry path for a configured provider',async()=>{
 const env={...process.env,ASTRA_PROVIDER:'claude-cli',CLAUDE_BIN:'/usr/bin/false',CLAUDE_MODEL:'retry-regression'};
 await expect(interpret(new WorldSimulation().view('player'),'Say hello',env)).rejects.toThrow();
 const status=providerInfo(env);
 expect(status.label).toMatch(/failed|exit|error/i);
 expect(status.available).toBe(true);
 expect(providerInfo({...env,CLAUDE_BIN:'/missing/claude'}).available).toBe(false);
});
