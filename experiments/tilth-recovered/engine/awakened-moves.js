export const MOVE_STYLES=['arc','thrust','nova','spiral','beam'];
export const MOVE_KEYS={Slash:'Space',Heavy:'Q',Spin:'E',Bash:'R',Dodge:'Shift'};
export function awakenedMove(content){return content?.skill.move||{style:'nova',damage:24,range:60,hits:1,color:content?.skill.effects[0]?.color||'#eaa34b'}}
export function awakenedCombo(content){const combo=content?.skill.combo;return combo?{id:'AwakenedCombo',name:combo.name,steps:combo.steps,keys:combo.steps.map(s=>MOVE_KEYS[s]).join(' → '),description:`${combo.move.style} · ${combo.move.damage} damage × ${combo.move.hits} · range ${combo.move.range}`,generated:true,move:combo.move}:null}
export function impactTimes(move){return Array.from({length:move.hits},(_,i)=>.35+(move.hits===1?0:i*.45/(move.hits-1)))}
export function moveStats(move){return {damage:move.damage,range:move.range,radial:['nova','spiral'].includes(move.style),cone:move.style==='beam'||move.style==='thrust'?.94:.45}}
export function movePose(move){return ['nova','spiral'].includes(move?.style)?'Spin':move?.style==='thrust'?'Bash':'Heavy'}
export function drawAwakenedMove(c,x,y,move,progress,direction){
 if(!move||progress<0||progress>1)return;
 const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[direction]||0;
 c.save();c.translate(x,y-10);c.rotate(angle);c.fillStyle=move.color;
 for(const at of impactTimes(move)){
  const p=(progress-(at-.22))/.42;if(p<0||p>1)continue;
  c.globalAlpha=Math.sin(p*Math.PI);const range=move.range;
  const pixel=(px,py,size=3)=>c.fillRect(Math.round(px),Math.round(py),size,size);
  if(move.style==='beam'){for(let d=8;d<=range;d+=4)for(let w=-3;w<=3;w+=3)pixel(d,w* Math.sin(p*Math.PI),3)}
  if(move.style==='thrust'){const tip=range*Math.sin(p*Math.PI);for(let d=0;d<24;d+=3){pixel(tip-d,-d/4);pixel(tip-d,d/4)}}
  if(move.style==='arc'){for(let i=0;i<50;i++){const a=-1.1+2.2*i/49;pixel(Math.cos(a)*range*Math.sin(p*Math.PI),Math.sin(a)*range*Math.sin(p*Math.PI),i%3?3:5)}}
  if(move.style==='nova'){for(let i=0;i<80;i++){const a=i*Math.PI*2/80;pixel(Math.cos(a)*range*Math.min(1,p*2),Math.sin(a)*range*Math.min(1,p*2))}}
  if(move.style==='spiral'){for(let arm=0;arm<3;arm++)for(let i=0;i<35;i++){const a=arm*Math.PI*2/3+p*Math.PI*4-i*.08,r=range*(1-i/40);pixel(Math.cos(a)*r,Math.sin(a)*r)}}
 }
 c.restore();
}
