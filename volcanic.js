import {drawForm} from './engine/form-renderer.js';
import {attackPose} from './engine/attack-pose.js';
import {drawHeldWeapon,drawWeaponAction} from './engine/weapon-renderer.js';
import {drawSwing} from './combat-visuals.js';
import {houses,magmaBank,obstacles,addObstacle} from './world.js';
// Original procedural pixel art, with layered materials and emissive lighting.
const R=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),w,h)};
function poly(c,points,col){c.fillStyle=col;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
function light(c,x,y,r,power=.3){let g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,137,47,${power})`);g.addColorStop(.4,`rgba(233,73,22,${power*.4})`);g.addColorStop(1,'rgba(200,48,13,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
function rock(c,x,y,s=1){addObstacle(x-22*s,y-15*s,44*s,23*s);c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-24,4],[-27,-11],[-16,-36],[-4,-51],[13,-43],[25,-15],[23,7]],'#151b1c');poly(c,[[-23,-11],[-14,-34],[-4,-47],[1,-15],[-5,2]],'#424341');poly(c,[[-4,-47],[11,-40],[21,-13],[1,-15]],'#343837');poly(c,[[1,-15],[21,-13],[20,4],[-5,2]],'#272e2e');R(c,-12,-33,3,12,'#646055');R(c,-16,-17,8,2,'#514f48');R(c,8,-10,2,8,'#935340');R(c,9,-10,7,2,'#b2643d');c.restore()}
function deadTree(c,x,y,s=1){addObstacle(x-7*s,y-8*s,14*s,14*s);c.save();c.translate(x,y);c.scale(s,s);poly(c,[[-12,5],[-4,-10],[-5,-32],[-17,-43],[-20,-61],[-15,-49],[-4,-41],[-3,-72],[3,-81],[1,-43],[11,-51],[17,-72],[17,-47],[5,-31],[5,-9],[15,5]],'#111b1c');R(c,-1,-38,3,37,'#51443a');R(c,1,-34,1,13,'#8b5138');R(c,-15,-45,7,2,'#594d40');c.restore()}
function brick(c,x,y,w,h){R(c,x,y,w,h,'#191e20');for(let yy=0;yy<h;yy+=8)for(let xx=-(yy%16?8:0);xx<w;xx+=17){let left=Math.max(0,xx),ww=Math.min(w,xx+15)-left;if(ww>0){R(c,x+left,y+yy,ww,7,(xx+yy)%3?'#444541':'#3a3d3b');R(c,x+left,y+yy,ww,1,'#5c584d')}}}
function fortress(c,x,y,w=130){addObstacle(x,y-48,w,116);R(c,x-7,y+60,w+23,15,'#10191980');brick(c,x,y,w,68);R(c,x,y,5,68,'#625d4d');R(c,x+w-7,y,7,68,'#252d2c');poly(c,[[x-12,y],[x+7,y-48],[x+w-8,y-48],[x+w+12,y]],'#131e20');for(let row=0;row<8;row++){let inset=19-row*2.4;for(let xx=0;xx<w+24-inset*2;xx+=12){let yy=y-46+row*6;R(c,x-12+inset+xx,yy,11,5,row%2?'#394143':'#303b3d');R(c,x-12+inset+xx,yy,10,1,'#566062');if((xx+row)%5===0)R(c,x-11+inset+xx,yy+3,5,1,'#a36d48')}}R(c,x-12,y-2,w+24,5,'#7c6550');R(c,x-12,y+3,w+24,3,'#212a28');for(let xx of [14,w-31]){R(c,x+xx,y+17,18,28,'#131d1e');R(c,x+xx+2,y+19,14,22,'#b04b26');R(c,x+xx+4,y+21,10,18,'#ed9c49');R(c,x+xx+6,y+23,6,13,'#ffe1a0');R(c,x+xx+8,y+18,2,24,'#453b30');R(c,x+xx+1,y+30,16,2,'#453b30');R(c,x+xx-3,y+44,24,3,'#776b53');light(c,x+xx+9,y+30,34,.23)}brick(c,x+w/2-17,y+20,35,48);R(c,x+w/2-11,y+30,23,38,'#121c1e');R(c,x+w/2-9,y+33,19,35,'#513b2d');for(let i=0;i<19;i+=5)R(c,x+w/2-9+i,y+33,1,35,'#796043');R(c,x+w/2+5,y+49,2,3,'#edba67');R(c,x+w/2-17,y+68,36,4,'#777061');R(c,x+w/2-22,y+72,46,3,'#4d5149');brick(c,x+20,y-64,17,31);R(c,x+17,y-67,23,5,'#77715c');R(c,x+21,y-68,14,2,'#191f20')}
function brazier(c,x,y){addObstacle(x-7,y-7,15,17);R(c,x-5,y+7,12,3,'#171f1e');R(c,x-2,y-3,5,12,'#77634a');R(c,x-7,y-7,15,5,'#302e27');R(c,x-5,y-5,11,2,'#aa7041');poly(c,[[x-5,y-8],[x-7,y-15],[x-2,y-12],[x+1,y-27],[x+5,y-17],[x+6,y-9]],'#e75e29');poly(c,[[x-3,y-8],[x-2,y-16],[x+1,y-13],[x+2,y-21],[x+4,y-8]],'#ffc16a');R(c,x,y-13,2,6,'#fff3be');light(c,x,y-13,52,.35)}
export function drawVolcanic(c){obstacles.length=0;let seed=84;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647};R(c,0,0,800,600,'#303735');for(let i=0;i<16500;i++){let x=rand()*800,y=rand()*600;R(c,x,y,rand()*3+1,1,['#3b403a','#282f2e','#46493e','#242d2d'][i%4])}
// Cracked stone plaza. Small irregular slabs make a denser 32-bit-era surface.
for(let y=0;y<600;y+=13)for(let x=0;x<800;x+=23){if((x>309&&x<424)||(y>280&&y<376)){let xx=x+(y%2?5:0);R(c,xx,y,22,12,'#222b2b');R(c,xx+1,y+1,20,10,['#53564c','#4a5048','#5a5b4e','#414b46'][Math.floor(rand()*4)]);R(c,xx+2,y+1,17,1,'#717060');R(c,xx+2,y+10,19,1,'#303a35');if(rand()>.7)R(c,xx+6,y+5,7,1,'#6b6857')}}
// A branching lava river cuts along the eastern ridge.
poly(c,magmaBank,'#171f20');poly(c,[[639,0],[800,0],[800,600],[641,600],[613,543],[602,466],[623,416],[599,370],[627,336],[661,294],[655,219],[684,176],[661,107]],'#bc3d20');poly(c,[[659,0],[800,0],[800,600],[666,600],[637,535],[631,467],[649,416],[626,370],[653,340],[688,295],[680,221],[709,177],[687,109]],'#ef672b');
const lavaPixels=c.getImageData(0,0,800,600).data;for(let y=1;y<600;y+=5)for(let x=596;x<800;x+=6){let idx=(y*800+x)*4;if(lavaPixels[idx]>160&&lavaPixels[idx+1]<120){let shift=Math.floor(rand()*7);R(c,x+shift,y,4+rand()*12,1,['#ff9b3f','#ffd071','#d34a21','#f88030'][Math.floor(rand()*4)]);if(rand()>.84)R(c,x+shift,y+1,3,1,'#ffe198')}}
for(let i=0;i<55;i++){let x=rand()*130+680,y=rand()*600;poly(c,[[x,y],[x+12,y-4],[x+24,y],[x+19,y+6],[x+3,y+7]],'#572e24');R(c,x+6,y+1,10,2,'#2e2925')}
for(let i=0;i<90;i++){let x=rand()*540,y=rand()*600;if(x>305&&x<433||y>279&&y<383)continue;R(c,x,y,15,1,'#161f20');R(c,x+14,y,1,8,'#151e20');if(i%5===0){R(c,x+2,y,9,1,'#b9572c');R(c,x+13,y+2,1,4,'#f38d3e')}}
// Blackstone bridge with iron bands and hot underside.
R(c,570,452,149,65,'#151f20');brick(c,570,461,149,50);R(c,567,450,155,7,'#80705a');R(c,567,509,155,7,'#80705a');for(let x=570;x<720;x+=24){R(c,x,447,7,16,'#242d2c');R(c,x+1,447,5,2,'#9c805e');R(c,x,504,7,16,'#242d2c');R(c,x+1,504,5,2,'#9c805e')}light(c,655,527,90,.2);
houses.forEach(h=>fortress(c,h.x,h.y,h.w));
addObstacle(446,296,51,36);addObstacle(432,322,32,23);addObstacle(474,238,38,15);addObstacle(556,238,18,15);addObstacle(84,247,79,23);addObstacle(199,247,89,23);addObstacle(75,390,76,25);addObstacle(189,390,92,25);
// Central forge, molten crucible, anvil and tools.
brick(c,446,299,51,33);R(c,450,296,42,9,'#8b7152');R(c,456,299,30,6,'#ffbb58');R(c,461,300,20,3,'#ffe5a0');R(c,454,310,34,17,'#241f1a');R(c,459,315,23,10,'#bd4c23');R(c,463,320,16,5,'#ffb755');R(c,435,341,23,4,'#171f20');R(c,441,332,10,10,'#62706b');poly(c,[[433,324],[462,324],[457,331],[439,331]],'#8d9990');R(c,432,322,32,3,'#adb3a1');light(c,472,310,80,.3);
for(let x=474;x<565;x+=21){if(x>512&&x<556)continue;R(c,x,238,16,15,'#242723');R(c,x+1,239,14,12,'#69523a');R(c,x+3,241,10,8,'#443d2d');R(c,x+7,239,2,13,'#ad8852')}
for(let x=84;x<285;x+=20){if(x>163&&x<199)continue;R(c,x,247,4,28,'#171f20');R(c,x+1,246,2,24,'#777158')}R(c,84,256,79,3,'#555d50');R(c,199,256,89,3,'#555d50');R(c,84,267,79,2,'#454f45');R(c,199,267,89,2,'#454f45');
for(let x=75;x<280;x+=21){if(x>151&&x<189)continue;R(c,x,390,4,25,'#172223');R(c,x+1,390,2,24,'#6a6b55')}R(c,75,397,76,3,'#626653');R(c,189,397,92,3,'#626653');
for(let x=0;x<800;x+=31){if(x<309||x>424)rock(c,x,50+rand()*24,.8+rand()*.8);if(x<308)rock(c,x,615+rand()*8,1+rand()*.4)}for(let y=120;y<570;y+=53)rock(c,10,y,1.4);
for(let [x,y,s] of [[72,160,1],[277,153,.75],[552,418,.6],[293,493,.9],[65,466,1],[755,283,1.8],[756,574,2],[748,131,1.4]])rock(c,x,y,s);
for(let [x,y,s] of [[65,238,1],[284,224,.7],[60,553,1.2],[512,564,.9],[560,94,.8],[229,77,.7]])deadTree(c,x,y,s);
for(let [x,y] of [[307,272],[425,272],[305,384],[426,384],[571,442],[571,528],[256,209],[500,209]])brazier(c,x,y);
R(c,344,75,48,18,'#182324');R(c,344,75,48,1,'#977957');c.font='11px VT323';c.textAlign='center';c.fillStyle='#e5b879';c.fillText('CALDERA ↑',368,88);
// Ashfall, worn cobbles, and localized magma bounce light.
for(let i=0;i<350;i++){let x=rand()*800,y=rand()*600;R(c,x,y,1,1,'#a49a7555')}for(let y=0;y<600;y+=100)light(c,647,y,145,.19);
}
export function drawHero(c,x,y,color,scale=1,name='',blade=false,pose={}){
 if(pose.custom?.form){drawForm(c,x,y,scale,pose.custom.form,pose,name);return}
 const custom=pose.custom;const role=pose.role||'Warrior',direction=pose.direction||'down',walking=pose.walking||false;
 if(custom)color=custom.outfitColor;
 const step=walking?Math.sin(performance.now()/85):0, stride=Math.round(step*3),bob=walking?Math.round(Math.abs(step)):0;
 const attacking=typeof pose.attack==='number'&&pose.attack>=0&&pose.attack<1;
 const bodyPose=attackPose(pose.attack,custom?.weapon||(role==='Mage'||role==='Healer'?'staff':'sword'),pose.kind,direction);
 const side=direction==='left'||direction==='right',back=direction==='up';
 c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
 c.fillStyle='#08171980';c.beginPath();c.ellipse(0,13,11,3,0,0,Math.PI*2);c.fill();
 if(pose.kind==='Dodge'&&attacking){c.translate(0,-3);c.rotate(pose.attack*Math.PI*2);c.scale(.85,.8);}
 if(direction==='left')c.scale(-1,1);
 // Separate boots and bent legs, with daylight between the silhouette.
 for(const [lx,offset] of [[-5,stride],[2,-stride]]){R(c,lx,1,4,8,'#293539');R(c,lx+1,3,2,5,'#58615a');R(c,lx,7+offset,4,5,'#332c29');R(c,lx-1,11+offset,6,2,'#111e22');R(c,lx,10+offset,4,1,'#a08760')}
 c.translate(Math.round(bodyPose.x),Math.round(bodyPose.y)-bob);c.rotate(bodyPose.tilt);
 // Split cloak tails taper outward; the hem responds to each step.
 poly(c,[[-6,-17],[5,-17],[8+stride+bodyPose.cape,7],[3,5],[0,8],[-8+stride+bodyPose.cape,5]],'#18272d');
 poly(c,[[-5,-16],[-2,-12],[-3+stride,4],[-7+stride,5]],color);
 if(custom?custom.clothing==='Robe':role==='Mage'||role==='Healer'){poly(c,[[-5,-9],[5,-9],[8,9],[2,7],[0,10],[-7,8]],color);R(c,-4,-4,1,11,'#d1b57a');R(c,4,1,1,6,'#182b30')}
 // Narrow waist, angled shoulders, curved cuirass and exposed neck.
 const torso=['...ooo...','..ohhho..','.ohhhmmo.','ohhhmmmmo','ommmmmmoo','.ommmmoo.','..ommoo..','..ogggo..','..ogbgo..','..ooooo..'];
 const palette={o:'#17262b',h:'#d2c8a3',m:(custom?custom.clothing==='Armor':role==='Warrior')?'#7e9390':color,g:'#78583b',b:'#efc176'};
 torso.forEach((row,yy)=>[...row].forEach((p,xx)=>{if(p!=='.')R(c,xx-4,yy-16,1,1,palette[p])}));
 R(c,-2,-19,4,4,custom?.skinColor||'#c28b63');R(c,-1,-19,2,3,custom?.skinColor||'#e8b780');
 // Articulated upper arms, bracers and hands rather than square shoulder pads.
 for(const [ax,arm] of [[-8,-stride+bodyPose.left],[6,stride+bodyPose.right]]){R(c,ax,-14+arm,3,5,color);R(c,ax,-14+arm,3,1,'#b3b49b');R(c,ax+1,-9+arm,2,4,'#424e4c');R(c,ax+1,-5+arm,2,3,custom?.skinColor||'#d4a375')}
 // Rounded pixel head: hair, brow, eyes, cheek shadow and a visible jaw.
 const face=back?['...hhhh...','..hHHHhh..','.hHHHHHhh.','.hHHHHHhh.','hhHHHHhhh.','.hhhhhhh..','..hhhhh...','...hhh....']:side?['...hhhh...','..hHHHhh..','.hHHHss...','.hHHsssss.','.hhHsos...','..hHssss..','...hsss...','....ss....']:['...hhhh...','..hHHHhh..','.hHHHHhhh.','.hHsssssh.','.hhsoossh.','..hsssssh.','...sssss..','....sss...'];
 const hair=custom?.hairColor||(role==='Healer'?'#c0c4b2':role==='Mage'?'#a4b2ad':'#604633');
 const headColors={h:'#293031',H:hair,s:custom?.skinColor||'#e4b47e',o:'#203138'};
 face.forEach((row,yy)=>[...row].forEach((p,xx)=>{if(p!=='.')R(c,xx-5,yy-27,1,1,headColors[p])}));
 if(!back){R(c,-3,-20,1,2,'#b47c59');if(!side){R(c,-2,-23,1,1,'#f4d5a0');R(c,2,-23,1,1,'#f4d5a0')}}
 if(!custom&&role==='Warrior'){R(c,-5,-25,2,5,'#8da3a0');R(c,4,-25,2,5,'#617d7c');R(c,-4,-26,8,1,'#d1cba8');R(c,-1,-28,3,2,color)}
 if(!custom&&role==='Rogue'){R(c,-5,-26,10,2,color);R(c,-7,-25,3,2,color);R(c,-8,-24,2,4,color)}
 if(!custom&&role==='Mage'){poly(c,[[-7,-26],[-3,-30],[0,-37],[3,-31],[4,-27],[7,-26]],'#23333a');poly(c,[[-5,-27],[-1,-31],[0,-35],[2,-29],[5,-27]],color);R(c,-6,-27,12,1,'#c6ad6f')}
 if(custom){
  if(custom.hairStyle==='Bald'){R(c,-3,-26,6,3,custom.skinColor);R(c,-4,-24,8,2,custom.skinColor)}
  if(custom.hairStyle==='Cropped'){R(c,-4,-27,8,2,hair)}
  if(custom.hairStyle==='Swept'){R(c,-5,-28,9,2,hair);R(c,-6,-27,4,4,hair);R(c,1,-26,4,2,hair)}
  if(custom.hairStyle==='Curls'){for(let i=0;i<4;i++){R(c,-6+i*3,-28-(i%2),3,3,hair)}R(c,-6,-25,3,4,hair);R(c,4,-25,3,4,hair)}
  if(custom.hairStyle==='Braid'){R(c,-4,-27,8,2,hair);for(let i=0;i<6;i++)R(c,5+(i%2),-23+i*2,3,3,hair)}
  if(custom.clothing==='Coat'){R(c,-6,-9,3,14,color);R(c,4,-9,3,14,color);R(c,-4,-9,1,12,'#d1b47b')}
  if(custom.clothing==='Tunic'){R(c,-5,-6,10,7,color);R(c,-5,-1,10,2,'#ac8959')}
 }
 // Weapons distinguish classes at a glance; the sword is angled away from the body.
 if(!attacking&&custom&&drawHeldWeapon(c,custom.weapon)){}
 else if(!attacking&&!custom&&(role==='Mage'||role==='Healer')){R(c,11,-23,2,34,'#815d3a');R(c,11,-22,1,32,'#c29c64');R(c,9,-27,6,5,'#263c40');R(c,10,-29,4,7,role==='Mage'?'#80ccd4':'#d9df9b');R(c,11,-28,2,3,'#f3ebc9');if(role==='Healer')R(c,7,-25,10,2,'#d7bd78')}
 else if(!attacking){for(let i=0;i<17;i++){R(c,12+Math.floor(i/4),2-i+stride,2,2,blade?'#ffe2a0':'#aabcb8');R(c,13+Math.floor(i/4),2-i+stride,1,1,'#eef0d1')}R(c,10,3+stride,7,2,'#c89b57');R(c,12,5+stride,2,5,'#765038')}
 if(back){poly(c,[[-5,-17],[4,-17],[6+stride,5],[0,8],[-7+stride,5]],color);R(c,-4,-15,1,14,'#ce9f63');R(c,2,-13,1,15,'#26343a')}
 if(attacking&&!drawWeaponAction(c,pose.attack,direction,custom?.weapon||(role==='Mage'||role==='Healer'?'staff':'sword'),pose.kind))drawSwing(c,pose.attack,direction,blade,pose.kind);
 c.restore();
 if(name){c.font='12px VT323';c.textAlign='center';let w=c.measureText(name).width+14;R(c,x-w/2,y-48,w,16,'#122024dc');R(c,x-w/2,y-48,w,1,'#877653');c.fillStyle='#eddbac';c.fillText(name,x,y-36)}
}
export function atmosphere(c,t){c.save();c.globalCompositeOperation='screen';for(let i=0;i<42;i++){let x=(i*127.3+Math.sin(t*.2+i)*9)%800,y=600-((t*9+i*51.7)%650);let a=.3+Math.sin(t+i)*.2;R(c,x,y,i%4===0?2:1,i%3===0?3:1,`rgba(255,${130+i%70},64,${a})`)}for(let [x,y] of [[307,256],[425,256],[305,368],[426,368],[571,426],[571,512]]){light(c,x,y,35+Math.sin(t*3+x)*4,.1);R(c,x+Math.sin(t*4+x)*2,y-8,2,4,'#ffd587')}for(let i=0;i<15;i++){let x=707+(i*31)%85,y=(i*43+t*4)%600;R(c,x,y,8+Math.sin(t+i)*4,1,'#ffbc6345')}c.restore()}
