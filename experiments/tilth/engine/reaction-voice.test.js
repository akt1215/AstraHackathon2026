import test from 'node:test';
import assert from 'node:assert/strict';
import {ReactionVoice} from './reaction-voice.js';
const event={id:'hit',type:'combat_hit',target:'rowan'},actor=()=>({id:'rowan',revision:1});
const response=()=>Response.json({content:{speaker:'rowan',line:'Back off!',sourceEventIds:['hit']}});
const flush=()=>new Promise(r=>setTimeout(r,10));
test('AI reaction is skipped offline and stale replies never speak after recovery',async()=>{let calls=0,resolve,lines=0;const offline=new ReactionVoice({isEnabled:()=>false,fetcher:()=>calls++});offline.request(actor(),event);assert.equal(calls,0);const a=actor(),voice=new ReactionVoice({fetcher:()=>new Promise(r=>resolve=r),onLine:()=>lines++});voice.request(a,event);a.revision++;resolve(response());await flush();assert.equal(lines,0)});
test('valid replies reach dialogue and failures leave the gameplay callback untouched',async()=>{let line='',errors=0;const voice=new ReactionVoice({fetcher:async()=>response(),onLine:(a,s)=>line=s});voice.request(actor(),event);await flush();assert.equal(line,'Back off!');const failed=new ReactionVoice({fetcher:async()=>new Response('',{status:502}),onLine:()=>assert.fail(),onError:()=>errors++});failed.request(actor(),event);await flush();assert.equal(errors,1)});
