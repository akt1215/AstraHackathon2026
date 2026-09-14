import test from 'node:test';
import assert from 'node:assert/strict';
import {traitsMarkup} from './world-traits.js';
import {initialBehaviorState,recordCombatBehavior,behaviorTraits} from './behavior-traits.js';
const initial=()=>({entities:[{id:'player',name:'Ember'},{id:'rowan',name:'Rowan'}],player:{hp:280,maxHp:280,fatigue:15,wakefulness:'awake',mood:'attentive',permission:false,evidence:[],tendencies:{},capabilities:[],relationships:{}},issues:[]});
test('new character traits show real condition and honest empty development states',()=>{
 const html=traitsMarkup(initial());
 assert.match(html,/280 \/ 280/);assert.match(html,/15 \/ 100/);assert.match(html,/No tendencies recorded yet/);assert.match(html,/No developed capabilities yet/);assert.match(html,/No relationship changes recorded/);
 assert.doesNotMatch(html,/Good|Evil|kind soul|moral score/i);
});
test('developed traits show evidence, exact counts, capabilities and own relationships',()=>{
 const state=initial();Object.assign(state.player,{tendencies:{care:2,honesty:1},evidence:[{category:'care',text:'Helped Clover recover.',eventIds:['one']},{category:'honesty',text:'Settled supplies.',eventIds:['two']}],capabilities:['reassuring'],relationships:{rowan:{trust:-1,fear:0}},permission:true});
 const html=traitsMarkup(state);
 assert.match(html,/Care/);assert.match(html,/2 recorded actions/);assert.match(html,/Helped Clover recover\./);assert.match(html,/Reassuring/);assert.match(html,/Your relationships/);assert.match(html,/Rowan/);assert.match(html,/Trust −1/);assert.match(html,/Rowan’s support granted/);
 assert.doesNotMatch(html,/Rowan trusts you/);
});
test('traits escape user-controlled text and show only known obligation state',()=>{
 const state=initial();state.entities[0].name='<script>bad</script>';state.player.evidence=[{category:'care',text:'<img src=x onerror=bad>',eventIds:[]}];state.issues=[{actor:'player',owner:'rowan',entity:'ration',amount:2,status:'open'},{actor:'clover',owner:'rowan',entity:'secret',amount:99,status:'open'}];
 const html=traitsMarkup(state);assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/2 coins/);assert.doesNotMatch(html,/99 coins/);
});
test('named combat traits show committed evidence and distinguish defeat from death',()=>{
 const state=initial();let behavior=initialBehaviorState();
 const facts=['clover','rowan'].map((victimId,i)=>({eventId:`hit-${i}`,incidentId:`fight-${i}`,actorId:'player',victimId,targetWasEnemy:false,targetWasHostile:false,unprovoked:true,source:'weapon',outcome:'defeat'}));
 for(const fact of facts)behavior=recordCombatBehavior(behavior,fact);
 state.behaviorTraits=behaviorTraits(behavior);state.behaviorFacts=facts;
 const html=traitsMarkup(state);
 assert.match(html,/Aggressor/);assert.match(html,/2 distinct peaceful characters/);assert.match(html,/Defeated/);assert.match(html,/Unprovoked attack/);assert.match(html,/Rowan/);assert.match(html,/hit-1/);
 assert.doesNotMatch(html,/Killer|Serial killer|Killed Rowan/);
});
test('combat history explains hostile opponents without inventing peaceful aggression',()=>{
 const state=initial();let behavior=initialBehaviorState();
 state.behaviorFacts=['enemy-one','enemy-two'].map((victimId,i)=>({eventId:`battle-${i}`,incidentId:`battle-${i}`,actorId:'player',victimId,targetWasEnemy:true,targetWasHostile:true,unprovoked:false,source:'throw',outcome:'death'}));
 for(const fact of state.behaviorFacts)behavior=recordCombatBehavior(behavior,fact);
 state.behaviorTraits=behaviorTraits(behavior);
 const html=traitsMarkup(state);
 assert.match(html,/Battle-hardened/);assert.match(html,/Enemy opponent/);assert.match(html,/Confirmed death/);assert.doesNotMatch(html,/Ruthless|Aggressor|Serial killer/);
});
test('combat history preserves initial provocation when a victim later fights back',()=>{
 const state=initial(),origin={eventId:'first-hit',incidentId:'fight',actorId:'player',victimId:'rowan',targetWasEnemy:false,targetWasHostile:false,unprovoked:true,source:'weapon',outcome:'hit'};
 state.behaviorFacts=[origin,{...origin,eventId:'final-hit',targetWasHostile:true,unprovoked:false,outcome:'defeat'}];
 const html=traitsMarkup(state);assert.equal((html.match(/Unprovoked attack on a peaceful character/g)||[]).length,2);assert.doesNotMatch(html,/Hostile opponent/);
});
