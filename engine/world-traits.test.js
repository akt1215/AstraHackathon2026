import test from 'node:test';
import assert from 'node:assert/strict';
import {traitsMarkup} from './world-traits.js';
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
