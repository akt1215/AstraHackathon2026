// A short wind-up, fast directional cut, then recovery. Rendering only; no damage system.
export const SWING_DURATION = 420;
export const SWING_COOLDOWN = 500;
export const ACTIONS={Slash:{duration:420,cooldown:500,sound:'Slash'},Heavy:{duration:720,cooldown:1000,sound:'Heavy'},Spin:{duration:650,cooldown:1300,sound:'Spin'},Bash:{duration:430,cooldown:800,sound:'Guard'},Dodge:{duration:360,cooldown:750,sound:'Dodge'}};
Object.assign(ACTIONS,{Cleave:{duration:850,cooldown:1100,sound:'Cleave'},Cyclone:{duration:1000,cooldown:1400,sound:'Cyclone'},Breaker:{duration:780,cooldown:1100,sound:'Breaker'}});
export function drawSwing(c, progress, direction, legendary = false, kind='Slash') {
  const facing = {right:0, left:0, down:Math.PI/2, up:-Math.PI/2}[direction];
  const cut = Math.max(0, Math.min(1, (progress - (kind==='Heavy'?.45:.22)) / (kind==='Heavy'?.3:.48)));
  const angle = kind==='Spin'?facing+progress*Math.PI*4:facing-1.25+cut*2.5;
  const reach = kind==='Heavy'?39:kind==='Spin'?35:29;
  const px = 3, py = -9;
  const pixel = (x,y,size,color) => {c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),size,size)};
  if(['Cleave','Cyclone','Breaker'].includes(kind)){
    const burst=Math.sin(Math.min(1,progress*1.5)*Math.PI);
    const a=facing,dx=Math.cos(a),dy=Math.sin(a);
    if(kind==='Cyclone'){
      drawSwing(c,progress,direction,true,'Spin');
      for(let arm=0;arm<3;arm++)for(let i=0;i<35;i++){
        const t=progress*Math.PI*5+arm*Math.PI*2/3-i*.028,r=37+burst*12;
        pixel(Math.cos(t)*r,-8+Math.sin(t)*r,2,i<12?'#ffe5a1':'#df8240');
      }
    }else if(kind==='Cleave'){
      drawSwing(c,progress,direction,true,'Heavy');
      if(progress>.42&&progress<.9)for(let j=0;j<6;j++)for(let i=10;i<51;i++){
        const spread=(j-2.5)*(1-progress)*4;
        pixel(dx*i-dy*spread,-9+dy*i+dx*spread,2,j===2?'#fff3c6':'#ef9b46');
      }
    }else{
      const extension=12+Math.sin(progress*Math.PI)*37;
      for(let i=3;i<extension;i++){pixel(dx*i,-9+dy*i,3,'#c0dfd6');pixel(dx*i-dy,-9+dy*i+dx,1,'#fff5cd')}
      for(let i=-4;i<=4;i++)pixel(dx*12-dy*i,-9+dy*12+dx*i,2,'#b98c4b');
      if(progress>.25&&progress<.8)for(let i=0;i<16;i++){
        const t=i*Math.PI/8,r=8+burst*12;
        pixel(dx*extension+Math.cos(t)*r,-9+dy*extension+Math.sin(t)*r,2,'#ffd893');
      }
    }
    return;
  }
  if(kind==='Dodge')return;
  if(kind==='Bash'){
    const thrust=Math.sin(progress*Math.PI)*14;
    const sx=Math.cos(facing)*(13+thrust),sy=-9+Math.sin(facing)*(13+thrust);
    for(let y=-10;y<=10;y++)for(let x=-7;x<=7;x++){
      if(Math.abs(x)+Math.max(0,y-5)>11)continue;
      pixel(sx+x,sy+y,1,Math.abs(x)>5||Math.abs(y)>8?'#e6c287':x===0||y===0?'#ddac65':'#476d70');
    }
    if(progress>.35&&progress<.8)for(let i=-3;i<=3;i++)pixel(sx+Math.cos(facing)*15-Math.sin(facing)*i*4,sy+Math.sin(facing)*15+Math.cos(facing)*i*4,2,'#fff0b2');
    return;
  }
  // Draw a tapered, pixel-stepped crescent behind the weapon.
  if (progress > .22 && progress < .86) {
    const fade = Math.min(1, (.86-progress)/.2);
    c.save();c.globalAlpha=fade;
    for(let i=0;i<24;i++) {
      const tail=i/23, a=angle-tail*Math.min(1.3,cut*2.5);
      for(let width=0;width<3;width++) {
        const radius=reach+3-width*2;
        pixel(px+Math.cos(a)*radius,py+Math.sin(a)*radius,tail>.7?1:2,
          width===0?'#fff1c1':legendary?'#efad4e':'#a7d1c9');
      }
    }
    for(let i=0;i<5;i++){
      const a=angle-.2-i*.18,r=35+i*1.7;
      pixel(px+Math.cos(a)*r,py+Math.sin(a)*r,1,i%2?'#f4c475':'#fff3d2');
    }
    c.restore();
  }
  const dx=Math.cos(angle),dy=Math.sin(angle);
  // Extended sword arm, hilt, steel core and bright cutting edge.
  for(let i=2;i<11;i++)pixel(px+dx*i,py+dy*i,3,i<6?'#8f9f92':'#d4a375');
  for(let i=11;i<reach;i++){
    pixel(px+dx*i,py+dy*i,2,legendary?'#f4c96f':'#8ca9aa');
    pixel(px+dx*i-dy,py+dy*i+dx,1,'#fff2cf');
  }
  for(let i=-3;i<=3;i++)pixel(px+dx*10-dy*i,py+dy*10+dx*i,2,'#c39250');
}
