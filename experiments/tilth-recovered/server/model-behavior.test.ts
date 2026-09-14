import {expect,it} from 'vitest';
import {buildPrompt,parseDecision,SYSTEM_PROMPT} from './model';
import {WorldSimulation} from '../engine/world-simulation.js';

it('projects only the current observer combat knowledge into a prompt',()=>{
 const view=new WorldSimulation().view('rowan');
 view.knownBehavior={facts:[{eventId:'known-hit',incidentId:'fight',actorId:'player',victimId:'clover',targetWasEnemy:false,targetWasHostile:false,unprovoked:true,source:'weapon',outcome:'defeat',knowledge:'reported',sourceEventIds:['received-report'],reporterId:'iris'}],traits:[]};
 view.behaviorTraits=[{label:'UNSEEN_GLOBAL_TRAIT'}];view.actor.behavior={secret:'UNSEEN_LEDGER'};
 const prompt=buildPrompt(view,{kind:'npc'});
 expect(prompt).toContain('known-hit');expect(prompt).toContain('received-report');expect(prompt).toContain('reported');
 expect(prompt).not.toContain('UNSEEN_GLOBAL_TRAIT');expect(prompt).not.toContain('UNSEEN_LEDGER');
 expect(SYSTEM_PROMPT).toMatch(/defeat.*not.*death/i);expect(SYSTEM_PROMPT).toContain('unprovoked');
});
it('permits citations from filtered combat knowledge but rejects unseen event references',()=>{
 const view=new WorldSimulation().view('rowan');
 view.knownBehavior={facts:[{eventId:'known-hit',incidentId:'fight',actorId:'player',victimId:'clover',targetWasEnemy:false,targetWasHostile:false,unprovoked:true,source:'weapon',outcome:'hit',knowledge:'witnessed',sourceEventIds:['known-hit']}],traits:[]};
 const decision={action:{actor:'rowan',intent:'Discuss the witnessed attack',ops:[{kind:'emote',text:'I saw that attack.',target:null,topic:'talk',evidence:['known-hit']}]},explanation:'Respond to my own evidence.'};
 expect(()=>parseDecision(decision,view)).not.toThrow();decision.action.ops[0].evidence=['unseen-hit'];expect(()=>parseDecision(decision,view)).toThrow(/not known/);
});
