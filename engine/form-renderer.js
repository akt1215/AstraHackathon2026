const SLOTS={Slash:'primary',Heavy:'heavy',Spin:'special',Bash:'guard',Cleave:'heavy',Cyclone:'special',Breaker:'guard'};
export function formMove(form,action){if(!form)return null;if(action==='Dodge')return{name:'Dodge',duration:form.dodge.durationMs,cooldown:Math.max(750,form.dodge.durationMs+100),sound:'Dodge'};const move=form[SLOTS[action]];return move?{name:move.name,duration:move.clip.durationMs,cooldown:move.cooldownMs,sound:({primary:'Slash',heavy:'Heavy',special:'Rally',guard:'Guard'})[SLOTS[action]]}:null}
export function formClip(form,{walking=false,attack,kind}={}){return Number.isFinite(attack)&&attack>=0&&attack<1?(kind==='Dodge'?form.dodge:form[SLOTS[kind]||'primary'].clip):walking?form.walk:form.idle}
export function partPose(clip,part,t){const at=Math.max(0,Math.min(100,t*100));let a=clip.frames[0],b=clip.frames.at(-1);for(let i=1;i<clip.frames.length;i++)if(clip.frames[i].at>=at){a=clip.frames[i-1];b=clip.frames[i];break}const pa=a.poses.find(p=>p.part===part)||{x:0,y:0,angle:0},pb=b.poses.find(p=>p.part===part)||{x:0,y:0,angle:0};const u=b.at===a.at?0:(at-a.at)/(b.at-a.at);return{x:pa.x+(pb.x-pa.x)*u,y:pa.y+(pb.y-pa.y)*u,angle:pa.angle+(pb.angle-pa.angle)*u}}
export function drawForm(c,x,y,scale,form,pose={},name=''){
 const clip=formClip(form,pose),attacking=Number.isFinite(pose.attack)&&pose.attack>=0&&pose.attack<1;
 const t=attacking?pose.attack:pose.reducedMotion?0:((pose.time??performance.now())%clip.durationMs)/clip.durationMs;
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
 c.fillStyle='#09181a80';c.beginPath();c.ellipse(0,13,23,5,0,0,Math.PI*2);c.fill();
 if(pose.direction==='left'||pose.direction==='up')c.scale(-1,1);
 // Authored parts are polygons; the model supplies the anatomy and all motion tracks.
 for(const part of form.parts){const p=partPose(clip,part.id,t);c.save();c.translate(Math.round(part.x+p.x),Math.round(part.y+p.y));c.rotate(p.angle*Math.PI/180);c.fillStyle=part.color;c.beginPath();part.points.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fill();c.restore()}
 c.restore();if(name){c.font='12px VT323';c.textAlign='center';const w=c.measureText(name).width+14;c.fillStyle='#122024dc';c.fillRect(x-w/2,y-69,w,16);c.fillStyle='#efdbad';c.fillText(name,x,y-57)}
}
