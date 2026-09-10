// Render locally in sprite coordinates. All projectile effects are visual previews.
const p=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)};
function line(c,x,y,dx,dy,length,color,size=1){for(let i=0;i<length;i++)p(c,x+dx*i,y+dy*i,size,size,color)}
export function drawHeldWeapon(c,weapon){
 if(weapon==='spear'){p(c,12,-25,2,35,'#a88751');p(c,11,-30,4,8,'#a5c2bd');p(c,12,-33,2,5,'#e9e5c0');return true}
 if(weapon==='bow'){for(let i=-13;i<14;i++){p(c,12+Math.round(Math.cos(i/14*Math.PI/2)*5),-5+i,2,2,'#d5ae6c');p(c,12,-5+i,1,1,'#dbe1c0')}return true}
 if(weapon==='staff'){p(c,12,-25,2,37,'#a78659');p(c,10,-29,6,6,'#79babc');p(c,11,-28,3,3,'#e6f2c1');return true}
 return false;
}
export function drawWeaponAction(c,progress,direction,weapon,action){
 if(weapon==='sword'||action==='Dodge')return false;
 const angle={left:0,right:0,up:-Math.PI/2,down:Math.PI/2}[direction];
 let kind=({Cleave:'Heavy',Cyclone:'Spin',Breaker:'Bash'})[action]||action;
 const dx=Math.cos(angle),dy=Math.sin(angle),fade=Math.sin(progress*Math.PI);
 if(weapon==='spear'){
  const a=kind==='Spin'?angle+progress*Math.PI*3:angle+(kind==='Bash'?Math.PI/2:0),sx=Math.cos(a),sy=Math.sin(a);
  const thrust=kind==='Heavy'?Math.sin(progress*Math.PI)*22:Math.sin(progress*Math.PI)*10;
  line(c,sx*(-15+thrust),-9+sy*(-15+thrust),sx,sy,47,'#ab8c55',2);
  line(c,sx*(30+thrust),-9+sy*(30+thrust),sx,sy,9,'#ecedc9',3);
  if(kind==='Spin')for(let i=0;i<18;i++){let t=a-i*.05;p(c,Math.cos(t)*43,-9+Math.sin(t)*43,2,2,'#bcdbcb')}
 }else if(weapon==='bow'){
  // Rotate the bow toward the shot and visibly draw/release its string.
  const charge=kind==='Heavy'?.42:.22,draw=progress<charge?progress/charge:Math.max(0,1-(progress-charge)*9);
  c.save();c.translate(dx*12,-9+dy*12);c.rotate(angle);
  for(let i=-14;i<=14;i++)p(c,Math.round(Math.cos(i/14*Math.PI/2)*6),i,2,2,'#d5ae6c');
  for(let i=0;i<=28;i++){const t=i/28;p(c,-draw*9*(1-Math.abs(t*2-1)),-14+i,1,1,'#e9e4c5')}
  p(c,-draw*9-2,-2,4,4,'#ceaa7d');c.restore();
  if(kind==='Bash'){for(let i=0;i<12;i++)p(c,dx*(12+i),-9+dy*(12+i),3,3,'#c2d4b7');return true}
  const shots=kind==='Spin'?[-.35,0,.35]:[0];
  for(const offset of shots){const a=angle+offset,travel=Math.max(0,progress-(kind==='Heavy'?.42:.15))*105;
   line(c,Math.cos(a)*(10+travel),-9+Math.sin(a)*(10+travel),Math.cos(a),Math.sin(a),kind==='Heavy'?18:12,kind==='Heavy'?'#ffdc85':'#e9dec0',2);
   p(c,Math.cos(a)*(23+travel),-9+Math.sin(a)*(23+travel),3,3,'#e7efcf')}
 }else{
  c.save();c.translate(dx*4,-Math.sin(progress*Math.PI)*7);c.rotate((progress-.5)*.5);drawHeldWeapon(c,'staff');c.restore();c.save();c.globalAlpha=Math.max(.1,fade);
  const count=kind==='Slash'?8:32;
  for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2+progress*5,r=kind==='Heavy'?progress*58:kind==='Spin'?33:kind==='Bash'?21:5;
   const distance=kind==='Slash'?progress*85:0;
   p(c,Math.cos(a)*r+dx*distance,-9+Math.sin(a)*r+dy*distance,2,2,i%3?'#88d4cf':'#f4dc9e');
  }c.restore();
 }
 return true;
}
