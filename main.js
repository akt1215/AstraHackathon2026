import {nextGuidance} from './engine/quest-guidance.js';
import {CLASS_COLORS,ITEMS} from './content/game-config.js';
import {GameRuntime} from './engine/runtime.js';
import {GenerationQueue} from './engine/generation.js';
import {installGameUI} from './engine/game-ui.js';
import {drawAttachment,drawGeneratedSkill} from './engine/generated-renderer.js';
let storage;try{storage=localStorage}catch{}
const runtime=new GameRuntime({storage});
let engineUI,generatedSkillStart=-Infinity,generatedSkillReady=0;
import {ComboTracker,COMBOS} from './combos.js';
import {ACTIONS} from './combat-visuals.js';
import {advance,doorwayAt,exitAt} from './world.js';
import {drawInterior} from './interiors.js';
import {playSound, initSound} from './sound.js';
import {drawVolcanic, drawHero, atmosphere} from './volcanic.js';
const canvas=document.querySelector('#world'),ctx=canvas.getContext('2d');
let player={x:400,y:335}, gear='Ashguard armor', heroClass='Warrior', frame=0;
let attackStart=-Infinity,attackKind='Slash',lastActionTick=0;
const actionReady={};
const comboTracker=new ComboTracker();let comboNoticeUntil=0;
const activeDuration=()=>ACTIONS[attackKind].duration;
let facing='down', walkingUntil=0, currentRoom=null, returnPoint=null;
const roomCanvas=document.createElement('canvas');roomCanvas.width=800;roomCanvas.height=600;
const colors=CLASS_COLORS;
if(colors[runtime.state.profile.heroClass])heroClass=runtime.state.profile.heroClass;
if(ITEMS.some(i=>i[1]===runtime.state.profile.gear))gear=runtime.state.profile.gear;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)}
function pixelText(c,t,x,y,color='#fff9d8',size=12){c.font=`${size}px VT323,monospace`;c.textAlign='center';c.fillStyle='#345438';c.fillText(t,x+1,y+1);c.fillStyle=color;c.fillText(t,x,y)}
function sprite(c,x,y,color=colors[heroClass],scale=1,name){if(name==='Evergreen')drawAttachment(c,x,y,scale,runtime.activeOffer()?.content);drawHero(c,x,y,color,scale,name,gear==='Sunsteel blade',{role:({Lunara:'Mage',Clover:'Healer',Foxglove:'Rogue'})[name]||heroClass,direction:name==='Evergreen'?facing:'down',walking:name==='Evergreen'&&performance.now()<walkingUntil,kind:attackKind,attack:name==='Evergreen'&&performance.now()-attackStart<activeDuration()?(performance.now()-attackStart)/activeDuration():undefined})}
const bg=document.createElement('canvas');bg.width=800;bg.height=600;const b=bg.getContext('2d');
function landscape(){drawVolcanic(b)}
landscape();
function draw(){canvas.style.objectPosition=`${player.x/800*100}% ${player.y/600*100}%`;ctx.drawImage(currentRoom?roomCanvas:bg,0,0);if(!currentRoom){sprite(ctx,290,315,'#507f9b',1,'Lunara');sprite(ctx,536,354,'#c6bca0',1,'Clover');sprite(ctx,215,369,'#9b6b3e',1,'Foxglove');sprite(ctx,268,229,'#96815b',1);pixelText(ctx,'!',268,198,'#ffec98',23);}sprite(ctx,player.x,player.y,gear==='Emberweave cloak'?'#b26943':colors[heroClass],1.2,'Evergreen');const awakened=runtime.activeOffer()?.content;if(awakened)drawGeneratedSkill(ctx,player.x,player.y,awakened,(performance.now()-generatedSkillStart)/awakened.skill.durationMs);const guidance=nextGuidance(runtime.state,player,currentRoom);if(guidance.target){const {x,y}=guidance.target;pixelText(ctx,'▼',x,y-35,'#ffe2a0',19);rect(ctx,x-10,y+12,20,2,'#edc67a');}if(!currentRoom)atmosphere(ctx,performance.now()/1000);rect(ctx,player.x-12,player.y+19,25,3,'#172325');rect(ctx,player.x-11,player.y+19,22,2,'#d9df92');if(frame>0){pixelText(ctx,frameText,player.x,player.y-52-(60-frame)/4,'#fff4b0',20);frame--}}let frameText='';draw();
function portrait(){let c=document.querySelector('#portrait').getContext('2d');c.clearRect(0,0,100,80);rect(c,20,66,62,4,'#d2d9be');sprite(c,49,52,gear==='Emberweave cloak'?'#b26943':colors[heroClass],2.2)}portrait();
const modal=document.querySelector('#modal'),body=document.querySelector('#modalBody');let toastTimer;function toast(t){const el=document.querySelector('#mapToast');el.textContent=t;el.classList.remove('quiet');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('quiet'),4500)}function setLocation(title,subtitle){document.querySelector('.area-label strong').textContent=title;document.querySelector('.area-label span').textContent=subtitle;canvas.setAttribute('aria-label',title+'. Use WASD, arrow keys, or touch controls to move.');}
function move(dir){
 if(modal.open||performance.now()-attackStart<activeDuration())return;
 const oldX=player.x,oldY=player.y;facing=dir;
 const [dx,dy]={up:[0,-12],down:[0,12],left:[-12,0],right:[12,0]}[dir];
 const door=!currentRoom&&doorwayAt(player.x,player.y+dy,dir);
 if(door){runtime.record('room_entered',door.id,`Discovered ${door.name}`);currentRoom=door.id;returnPoint={x:door.x+door.w/2,y:door.y+82};player={x:400,y:397};drawInterior(roomCanvas.getContext('2d'),currentRoom);setLocation(door.name,'CINDERWATCH · INTERIOR');playSound('menu');toast('Walk to the doorway below to leave.');draw();return}
 if(currentRoom&&exitAt(player.x,player.y+dy,dir)){player={...returnPoint};currentRoom=null;facing='down';setLocation('Cinderwatch Outpost','THE ASHEN REACH');playSound('close');draw();return}
 player=advance(player,dx,dy,currentRoom);
 if(player.x!==oldX||player.y!==oldY){walkingUntil=performance.now()+180;playSound('step')}else walkingUntil=0;
 draw();
}

document.querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>move(el.dataset.move));document.addEventListener('keydown',e=>{if(modal.open)return;const dir={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[e.key];if(dir){e.preventDefault();move(dir)}if(e.code==='Space'||e.key===' '){e.preventDefault();if(!e.repeat)skill('Slash');return}if(e.key.toLowerCase()==='f'){e.preventDefault();if(!e.repeat)requestQuest();return}if(e.key==='5'){e.preventDefault();if(!e.repeat)useAwakening();return}const extra={q:'Heavy',e:'Spin',r:'Bash',Shift:'Dodge'}[e.key];if(extra){e.preventDefault();if(!e.repeat)skill(extra);return}if('1234'.includes(e.key))skill(['Slash','Guard','Rally','Potion'][+e.key-1])});function skill(name){
 if(modal.open)return;
 const now=performance.now();
 if(ACTIONS[name]){
   if(now-attackStart<activeDuration()||now<(actionReady[name]||0))return;
   const combo=comboTracker.accept(name,now,ACTIONS[name].duration);
   attackKind=combo?combo.id:name;
   if(combo){runtime.record('combo_learned',combo.id,`Learned ${combo.name}`);comboNoticeUntil=now+1800;document.querySelector('#comboGuide').textContent=`✦ ${combo.name.toUpperCase()}!`;toast(`${combo.name}!`)}
   attackStart=now;lastActionTick=now;actionReady[name]=now+ACTIONS[name].cooldown;
   walkingUntil=0;playSound(ACTIONS[attackKind].sound);draw();return;
 }
 comboTracker.reset();playSound(name);frameText={Guard:'+ DEFENSE',Rally:'+ STRENGTH',Potion:'+ 40 HP'}[name];frame=60;draw();toast(`${name} · animation preview`)
}
document.querySelectorAll('[data-skill]').forEach(el=>el.onclick=()=>skill(el.dataset.skill));
const items=ITEMS;
function openView(view){if(view==='journal'){engineUI.show('journal');return}engineUI.leave();if(!modal.open)playSound('menu');modal.classList.remove('start-menu');if(view==='world'){modal.close();return}document.querySelector('#modalTitle').textContent={inventory:'A pack full of possibilities',character:'Meet Evergreen',journal:'Your story so far'}[view];if(view==='inventory'){body.innerHTML=`<p class="modal-note">Try on a blade, armor, or cloak to change your village sprite. Equipment and stats are a visual preview.</p><div class="inventory-grid">${items.map(([icon,name,rarity])=>`<button class="item ${gear===name?'equipped':''}" data-item="${name}"><span class="item-icon">${icon}</span><b>${name}</b><small>${gear===name?'✓ Equipped':rarity}</small></button>`).join('')}</div>`;body.querySelectorAll('[data-item]').forEach(el=>el.onclick=()=>{if(['Sunsteel blade','Ashguard armor','Emberweave cloak'].includes(el.dataset.item)){playSound('equip');gear=el.dataset.item;runtime.setProfile({gear});portrait();draw();openView('inventory')}else{body.querySelector('.modal-note').textContent=el.dataset.item==='Health potion'?'Health potion · Restores 40 HP. Consumables are a visual preview.':`${el.dataset.item} · Slot preview. Try the blade, armor, or cloak to see your character change.`}})}else if(view==='character'){body.innerHTML=`<p class="modal-note">Level 12 · The Wanderer<br>Choose a class to preview its colors on your character.</p><div class="classes">${Object.keys(colors).map(c=>`<button class="${c===heroClass?'chosen':''}" data-class="${c}">${c}</button>`).join('')}</div><div class="stats">${['Strength','Defense','Intelligence','Luck'].map((s,i)=>`<div class="stat">${s}<b>${({Warrior:[28,22,8,12],Mage:[8,12,32,18],Rogue:[20,14,12,30],Healer:[10,18,28,16]})[heroClass][i]}</b></div>`).join('')}</div><div class="journal-entry"><h2>${{Warrior:'Stand your ground',Mage:'A spark of possibility',Rogue:'Fortune favors the quick',Healer:'Leave no one behind'}[heroClass]}</h2><p>Active skill → Passive bonus → Mastery<br>Skill trees and progression will come after the visual direction is approved.</p></div>`;body.querySelectorAll('[data-class]').forEach(el=>el.onclick=()=>{playSound('equip');heroClass=el.dataset.class;gear='Ashguard armor';runtime.setProfile({heroClass,gear});portrait();draw();document.querySelector('.character>.muted').innerHTML=`${heroClass} <span class="dot">·</span> The Wanderer`;openView('character')})};if(!modal.open)modal.showModal()}
document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>openView(el.dataset.view));document.querySelector('#closeModal').onclick=()=>modal.close();modal.addEventListener('click',e=>{if(e.target===modal){let r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close()}});document.querySelector('#trackQuest').onclick=()=>{toast('Beyond the Cinder Gate · Follow the path north ↑');document.querySelector('#trackQuest').innerHTML='Quest tracked <span>✓</span>'};document.querySelector('#mapInfo').onclick=()=>toast('Cinderwatch · Caldera to the north, magma to the east');
initSound();
let bossHP=100;function battle(){engineUI.leave();playSound('battle');modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='The Cinderbound Warden';body.innerHTML='<canvas id="battleCanvas" width="500" height="260" aria-label="Front-facing pixel battle preview"></canvas><p class="battle-log">Your party stands together.</p><div class="battle-actions"><button class="primary" id="attack">⚔ Power strike</button><button class="outline" id="heal">✚ Party heal</button></div><p class="modal-note">Staged encounter · Class synergy and combat visuals only.</p>';modal.showModal();bossHP=100;drawBattle();document.querySelector('#attack').onclick=()=>{playSound('Slash');bossHP=Math.max(0,bossHP-25);drawBattle('- 128');body.querySelector('.battle-log').textContent=bossHP?`Power strike! Guardian vitality: ${bossHP}%`:'Victory! + 350 XP · Preview complete';if(!bossHP){playSound('victory');document.querySelector('#attack').disabled=true}};document.querySelector('#heal').onclick=()=>{playSound('heal');drawBattle('+ 64 HP');body.querySelector('.battle-log').textContent='Clover casts Renewal. The whole party is healed.'}}
function drawBattle(effect=''){const c=document.querySelector('#battleCanvas').getContext('2d');rect(c,0,0,500,260,'#242e2e');c.drawImage(bg,560,0,240,220,0,0,500,115);rect(c,0,110,500,150,'#373e36');function oval(x,y,rx,ry,col){c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}oval(345,155,87,21,'#141f21');oval(345,151,79,17,'#62634e');rect(c,320,99,49,48,'#353c37');rect(c,312,100,17,31,'#6a6251');rect(c,364,100,17,31,'#6a6251');rect(c,326,72,37,34,'#534e40');rect(c,323,71,44,9,'#865136');rect(c,329,66,9,9,'#d17e36');rect(c,354,62,6,15,'#d17e36');rect(c,332,87,6,5,'#ffc66d');rect(c,351,87,6,5,'#ffc66d');rect(c,328,144,14,11,'#333b35');rect(c,352,144,14,11,'#333b35');rect(c,301,49,88,5,'#5b6747');rect(c,302,50,86*bossHP/100,3,'#e9a052');pixelText(c,'CINDERBOUND WARDEN',345,39,'#fcf5cf',14);[['Warrior',75,190],['Mage',150,175],['Rogue',205,217],['Healer',275,221]].forEach(([cl,x,y])=>{oval(x,y+12,32,9,'#64634d');sprite(c,x,y,colors[cl],1.5)});if(effect)pixelText(c,effect,effect.startsWith('-')?345:180,effect.startsWith('-')?69:139,'#fff1bb',26)}document.querySelector('#battleOpen').onclick=battle;
document.fonts.ready.then(()=>{landscape();draw()});
function openMenu(){engineUI.leave();comboTracker.reset();playSound('menu');modal.classList.add('start-menu');document.querySelector('#modalTitle').textContent='ADVENTURE';body.innerHTML=`<div class="menu-list"><button data-menu="character">Character <kbd>C</kbd></button><button data-menu="inventory">Bag <kbd>I</kbd></button><button data-menu="party">Party <kbd>P</kbd></button><button data-menu="journal">Journal <kbd>J</kbd></button><button data-menu="awakening">Awakenings <kbd>U</kbd></button><button data-menu="quests">Quests <kbd>T</kbd></button><button data-menu="combos">Combos <kbd>K</kbd></button><button data-menu="battle">Battle preview <kbd>B</kbd></button><button data-menu="resume">Back to game <kbd>Esc</kbd></button></div><div class="menu-footer"><span>◆ 1,240</span><span>Cinderwatch</span></div>`;body.querySelectorAll('[data-menu]').forEach(el=>el.onclick=()=>showGameView(el.dataset.menu));if(!modal.open)modal.showModal();body.querySelector('button').focus()}
function showGameView(view){if(['awakening','quests','journal'].includes(view)){engineUI.show(view);return}engineUI.leave();if(view==='combos'){comboTracker.reset();modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Combat combos';body.innerHTML='<p class="modal-note">Let each move finish, then use the next skill within 1.6 seconds. The final input becomes a special finisher. Touch buttons work too.</p>'+COMBOS.map(c=>`<div class="journal-entry"><h2>${c.name}</h2><p>${c.steps.join(' → ')}<br><b>${c.keys}</b><br>${c.description}</p></div>`).join('')+'<p class="modal-note">Animation previews · no enemy damage yet.</p>';if(!modal.open)modal.showModal();return}if(view==='resume'){modal.close();return}if(view==='battle'){battle();return}if(view==='party'){modal.classList.remove('start-menu');document.querySelector('#modalTitle').textContent='Your party';body.innerHTML='<div class="party-panel">'+document.querySelector('.party').innerHTML+'</div>';if(!modal.open)modal.showModal();return}openView(view)}
document.querySelector('#gameMenu').onclick=openMenu;
modal.addEventListener('cancel',e=>{e.preventDefault();if(modal.classList.contains('start-menu'))modal.close();else openMenu()});
document.querySelector('#closeModal').onclick=()=>{if(modal.classList.contains('start-menu'))modal.close();else openMenu()};
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();if(key==='escape'){if(!modal.open){e.preventDefault();openMenu()}return}const view={i:'inventory',c:'character',j:'journal',p:'party',b:'battle',k:'combos',u:'awakening',t:'quests'}[key];if(view){e.preventDefault();showGameView(view);return}if(modal.open&&modal.classList.contains('start-menu')&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const entries=[...body.querySelectorAll('[data-menu]')];let idx=entries.indexOf(document.activeElement);entries[(idx+(e.key==='ArrowDown'?1:-1)+entries.length)%entries.length].focus()}});
setTimeout(()=>document.querySelector('#mapToast').classList.add('quiet'),4500);

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let lastAmbient=0;let lastGuidance=0;
function animateScene(now){
 if(now-lastGuidance>120){lastGuidance=now;const guidance=nextGuidance(runtime.state,player,currentRoom),el=document.querySelector('#questTracker');el.querySelector('strong').textContent=guidance.title;el.querySelector('span').textContent=guidance.text;}

 if(now>comboNoticeUntil){const hint=comboTracker.hint(now);document.querySelector('#comboGuide').textContent=hint?`${comboTracker.steps.join(' → ')} → ${hint.steps[comboTracker.steps.length]}  ·  ${comboTracker.steps.length}/3`:'K · COMBO GUIDE'}

 if(attackKind==='Dodge'&&now-attackStart<activeDuration()+100){
   const end=Math.min(now,attackStart+activeDuration()),dt=Math.max(0,end-lastActionTick);lastActionTick=end;
   if(!document.hidden&&!modal.open&&dt){const [dx,dy]={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[facing];player=advance(player,dx*dt*.2,dy*dt*.2,currentRoom);}
 }
 document.querySelectorAll('[data-skill]').forEach(button=>{const name=button.dataset.skill;if(!ACTIONS[name])return;const left=Math.max(0,(actionReady[name]||0)-now);button.style.setProperty('--cooldown',`${left/ACTIONS[name].cooldown*100}%`);button.classList.toggle('cooling',left>0)});
 if(!document.hidden&&(!reducedMotion.matches||now<walkingUntil+100||now-attackStart<activeDuration()+100||now-generatedSkillStart<1500)&&now-lastAmbient>40){draw();lastAmbient=now}requestAnimationFrame(animateScene)}requestAnimationFrame(animateScene);

modal.addEventListener('close',()=>playSound('close'));
document.addEventListener('click',e=>{if(e.target.closest('[data-menu], [data-view]'))playSound('select')});
body.addEventListener('focusin',e=>{if(e.target.matches('[data-menu]'))playSound('select')});

document.querySelector('#comboGuide').onclick=()=>showGameView('combos');

function requestQuest(){if(modal.open)return;if(currentRoom||Math.hypot(player.x-268,player.y-229)>58){toast('Speak to Rowan near the inn. Walk closer, then press F.');return}runtime.requestQuest();engineUI.show('quests')}
function useAwakening(){if(modal.open)return;const content=runtime.activeOffer()?.content,now=performance.now();if(!content){toast('Accept an awakening to unlock its skill.');return}if(now<generatedSkillReady)return;generatedSkillStart=now;generatedSkillReady=now+content.skill.cooldownMs;playSound('Rally');draw()}
const generation=new GenerationQueue(runtime,{onStatus:s=>engineUI.setStatus(s)});
engineUI=installGameUI({runtime,queue:generation,modal,body,title:document.querySelector('#modalTitle'),redraw:draw,onAccept:()=>{playSound('Rally');toast('Awakening accepted. Press 5 to try your new skill.')}});
document.querySelector('#awakeningButton').onclick=()=>engineUI.show('awakening');
document.querySelector('#talkButton').onclick=requestQuest;
document.querySelector('#awakenedSkill').onclick=useAwakening;
generation.connect();

document.querySelector('#questTracker').onclick=()=>engineUI.show('quests');
