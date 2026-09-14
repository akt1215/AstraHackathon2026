import {drawHero} from '../volcanic.js';
import {characterContent} from '../content/characters.js';
export function drawEncounter(c,a,time){
 if(a.downUntil){c.fillStyle='#6c6855';c.fillRect(a.x-12,a.y+8,24,5);return}
 if(a.attack&&time-a.attack.start<500){c.strokeStyle='#f1a457';c.lineWidth=2;c.beginPath();c.ellipse(a.x,a.y+10,24,9,0,0,Math.PI*2);c.stroke()}
 drawHero(c,a.x,a.y,a.color,1,a.name,false,{role:a.role,custom:{...characterContent({heroClass:a.role}),weapon:a.weapon,outfitColor:a.color,clothing:a.enemy?'Armor':a.role==='Mage'||a.role==='Healer'?'Robe':'Coat'},direction:a.direction,walking:a.walk,kind:'Heavy',attack:a.attack?(time-a.attack.start)/850:undefined});
 if(a.attackable===false)return;
 c.fillStyle='#111d20';c.fillRect(a.x-19,a.y+20,38,4);c.fillStyle=a.hostile||a.enemy?'#d77953':'#b6be8b';c.fillRect(a.x-18,a.y+21,36*a.hp/a.maxHp,2);
}
export function drawEncounterSpeech(c,actors,time){for(const a of actors){if(!a.bubble||a.bubbleUntil<time)continue;c.font='13px VT323, monospace';const words=a.bubble.split(/\s+/),lines=[''];for(const word of words){const i=lines.length-1;if(c.measureText(lines[i]+word).width>170&&lines[i])lines.push(word+' ');else lines[i]+=word+' '}const w=186,h=lines.length*14+14,x=Math.max(4,Math.min(800-w-4,a.x-w/2)),y=Math.max(5,a.y-54-h);c.fillStyle='#182b2bee';c.fillRect(x,y,w,h);c.strokeStyle='#b99b65';c.lineWidth=1;c.strokeRect(x,y,w,h);c.fillStyle='#f3ddb1';c.textAlign='left';lines.forEach((line,i)=>c.fillText(line,x+8,y+16+i*14))}}
