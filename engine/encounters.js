import {ACTORS} from '../content/encounters.js';
import {advance} from '../world.js';
const vectors={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export const face=(a,b)=>Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(b.x>a.x?'right':'left'):(b.y>a.y?'down':'up');
export function clearReach(a,b,mover=advance){const p=mover(a,b.x-a.x,b.y-a.y);return Math.hypot(p.x-b.x,p.y-b.y)<1}
export function attackStats(weapon,kind){const radial=['Spin','Cyclone'].includes(kind)||(weapon==='staff'&&kind==='Heavy');return {range:radial?65:kind==='Bash'?32:weapon==='bow'?155:weapon==='staff'?125:weapon==='spear'?68:47,damage:({Heavy:26,Cleave:34,Spin:17,Cyclone:28,Bash:12,Breaker:30})[kind]||16,radial}}
export function inStrike(a,b,direction,stats,mover=advance){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),v=vectors[direction];return d<=stats.range&&(stats.radial||d<12||(dx*v[0]+dy*v[1])/d>.65)&&clearReach(a,b,mover)}
// Short grid search around geometry; every segment still uses world collision.
function waypoint(a,b,mover){if(clearReach(a,b,mover))return b;const queue=[{x:a.x,y:a.y,first:null}],seen=new Set(['0,0']);for(let i=0;i<queue.length&&i<650;i++){const n=queue[i];if(Math.hypot(n.x-b.x,n.y-b.y)<20&&n.first)return n.first;for(const [dx,dy] of [[12,0],[-12,0],[0,12],[0,-12]]){const x=n.x+dx,y=n.y+dy,key=`${Math.round((x-a.x)/12)},${Math.round((y-a.y)/12)}`;if(seen.has(key)||Math.hypot(x-a.x,y-a.y)>200)continue;seen.add(key);const p=mover(n,dx,dy);if(p.x!==x||p.y!==y)continue;queue.push({x,y,first:n.first||{x,y}})}}return a}
export class Encounters{
 constructor({actors=ACTORS,mover=advance,onProvoked=()=>{},onFeedback=()=>{}}={}){this.actors=actors.map(a=>({...a,maxHp:a.hp,home:{x:a.x,y:a.y},direction:'down',hostile:false,attack:null,ready:0,downUntil:0,peaceAt:0,nextRoam:0,walk:false,bubble:'',bubbleUntil:0,revision:0}));this.mover=mover;this.onProvoked=onProvoked;this.onFeedback=onFeedback;this.time=0;this.hp=280;this.maxHp=280;this.swing=null;this.invulnerable=0;this.guardUntil=0;this.potionReady=0;this.floats=[]}
 begin(kind,direction,weapon,duration){if(kind==='Dodge'){this.invulnerable=this.time+duration;return}this.swing={kind,direction,weapon,impact:this.time+duration*.45,done:false};if(kind==='Bash')this.guardUntil=this.time+duration+450}
 heal(){if(this.time<this.potionReady||this.hp===this.maxHp)return false;this.hp=Math.min(this.maxHp,this.hp+40);this.potionReady=this.time+8000;return true}
 say(a,text){a.bubble=text;a.bubbleUntil=this.time+7000}
 hit(a,damage){if(a.attackable===false)return;const first=!a.hostile;a.hp=Math.max(0,a.hp-damage);a.hostile=true;a.peaceAt=this.time+14000;this.floats.push({x:a.x,y:a.y,text:`−${damage}`,until:this.time+900});if(first)a.revision++;if(this.time-(a.lastReaction??-Infinity)>30000){a.lastReaction=this.time;this.say(a,a.warning);this.onProvoked(a)}if(a.hp===0){a.downUntil=this.time+18000;a.hostile=false;a.attack=null;a.revision++;this.say(a,a.enemy?'Defeated':'Enough… I yield.');this.onFeedback(`${a.name} ${a.enemy?'defeated':'yielded'}.`);}}
 step(dt,player,{active=true}={}){if(!active){this.swing=null;return;}this.time+=Math.min(50,dt);const now=this.time;this.floats=this.floats.filter(f=>f.until>now);
 if(this.swing&&!this.swing.done&&now>=this.swing.impact){this.swing.done=true;const s=this.swing;for(const a of this.actors)if(a.attackable!==false&&!a.downUntil&&inStrike(player,a,s.direction,attackStats(s.weapon,s.kind),this.mover))this.hit(a,attackStats(s.weapon,s.kind).damage)}
 for(const a of this.actors){a.walk=false;if(a.downUntil){if(now>=a.downUntil){a.downUntil=0;a.hp=a.maxHp;a.x=a.home.x;a.y=a.home.y;a.ready=now+2000;a.revision++}continue}
 if(a.worldSleeping){a.attack=null;continue;}
 const distance=Math.hypot(a.x-player.x,a.y-player.y),strike=attackStats(a.weapon,'Heavy');
 if(a.enemy&&!a.hostile&&distance<95&&now>=a.ready&&clearReach(a,player,this.mover)){a.hostile=true;a.peaceAt=now+14000;this.say(a,'This road belongs to us!')}
 if(a.hostile&&(distance>210||now>a.peaceAt)){a.hostile=false;a.attack=null;a.revision++;a.ready=now+3500;this.say(a,a.enemy?'Run, then.':'Stay back. I am done fighting.');}
 if(a.attack){const elapsed=now-a.attack.start;if(!a.attack.hit&&elapsed>=500){a.attack.hit=true;if(now>=this.invulnerable&&inStrike(a,player,a.attack.direction,strike,this.mover)){const damage=now<this.guardUntil?3:a.enemy?13:9;this.hp=Math.max(0,this.hp-damage);this.invulnerable=now+650;this.floats.push({x:player.x,y:player.y,text:`−${damage}`,until:now+900});this.onFeedback(`${a.name} hit you for ${damage}.`)}}if(elapsed>=850)a.attack=null;continue}
 if(a.hostile&&distance<strike.range-4&&now>=a.ready){a.direction=face(a,player);a.attack={start:now,hit:false,direction:a.direction};a.ready=now+1600;continue}
 let goal=a.home;
 if(a.hostile){goal=player;if(distance<strike.range-10)continue}else if(a.worldFollowing){goal=a.worldFollowing;if(Math.hypot(a.x-goal.x,a.y-goal.y)<36)continue}else if(a.worldAttention){a.direction=face(a,a.worldAttention);continue}else{if(now>a.nextRoam){a.nextRoam=now+3500;const phase=Math.floor(now/3500)+this.actors.indexOf(a);a.roam={x:a.home.x+Math.cos(phase*1.7)*24,y:a.home.y+Math.sin(phase*1.7)*18}}goal=a.roam||a.home}
 if(!a.pathAt||now>a.pathAt){a.waypoint=waypoint(a,goal,this.mover);a.pathAt=now+400}
 const target=a.waypoint||goal,dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);if(d>1){const step=Math.min(d,Math.min(50,dt)*(a.hostile?.055:.022)),p=this.mover(a,dx/d*step,dy/d*step);a.direction=face(a,target);a.walk=p.x!==a.x||p.y!==a.y;a.x=p.x;a.y=p.y}
 }
 if(this.hp<=0){this.hp=this.maxHp;player.x=400;player.y=335;this.invulnerable=now+3500;this.swing=null;for(const a of this.actors){a.hostile=false;a.attack=null;a.ready=now+5000;a.revision++}this.onFeedback('You were overwhelmed. Recovered at the outpost.');}
 }
}
