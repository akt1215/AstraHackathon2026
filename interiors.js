import {furnishings} from './world.js';
const r=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
export function drawInterior(c,room){
 r(c,0,0,800,600,'#111c20');
 for(let y=149;y<452;y+=13)for(let x=211;x<590;x+=32){r(c,x,y,31,12,(x+y)%3?'#65513b':'#594934');r(c,x+1,y+1,29,1,'#87704d');r(c,x+8,y+7,12,1,'#483e2f')}
 r(c,196,103,408,57,'#263133');
 for(let y=107;y<157;y+=12)for(let x=200;x<601;x+=25){r(c,x,y,23,10,'#454b43');r(c,x,y,23,1,'#74745c')}
 r(c,196,158,18,294,'#42473b');r(c,586,158,18,294,'#343e36');r(c,196,452,185,13,'#706346');r(c,422,452,182,13,'#706346');r(c,199,160,5,290,'#998157');r(c,589,160,4,290,'#706747');
 r(c,374,421,53,40,'#8e7046');r(c,380,427,41,34,'#c19856');r(c,383,430,35,27,'#564c36');
 r(c,323,233,151,167,'#563b32');r(c,327,237,143,159,'#a1784b');r(c,330,240,137,153,'#684437');for(let y=248;y<388;y+=12){r(c,334,y,3,5,'#c5a06a');r(c,465,y,3,5,'#c5a06a')}
 for(const f of furnishings[room]){const {x,y,w,h,type}=f;r(c,x+4,y+h-2,w,7,'#101b2088');
 if(type==='bed'){r(c,x,y,w,h,'#302e28');r(c,x+3,y+3,w-6,h-6,'#ac8858');r(c,x+6,y+7,w-12,25,'#dbd0a6');r(c,x+8,y+9,w-16,16,'#eee2b7');r(c,x+6,y+34,w-12,h-41,'#506f6b');r(c,x+9,y+36,5,h-45,'#8baba0');r(c,x+6,y+58,w-12,3,'#c4b17d')}
 if(type==='table'){r(c,x+6,y+4,w-12,h,'#392e24');r(c,x,y,w,h-8,'#997345');r(c,x+3,y+3,w-6,h-14,'#715238');r(c,x+3,y+3,w-6,2,'#bc955a');r(c,x+18,y+12,20,13,'#d3bc83');r(c,x+20,y+14,15,1,'#69583d');r(c,x+w-22,y+10,8,9,'#bcc3ab');r(c,x+w-20,y+10,4,3,'#504735')}
 if(type==='chest'){r(c,x,y,w,h,'#272c26');r(c,x+3,y+3,w-6,h-6,'#91683b');r(c,x+4,y+9,w-8,2,'#cca063');r(c,x+11,y+2,4,h-4,'#c3b27b');r(c,x+w-15,y+2,4,h-4,'#c3b27b');r(c,x+w/2-3,y+10,7,9,'#e6c56d')}
 if(type==='shelf'){r(c,x,y,w,h,'#342f25');for(let xx=5;xx<w-8;xx+=9){r(c,x+xx,y+5,6,h-12,['#879177','#ab8056','#718f89'][xx%3]);r(c,x+xx,y+9,6,2,'#c9bb8a')}r(c,x,y+h-5,w,5,'#ab8954')}
 if(type==='anvil'){r(c,x+17,y+18,38,25,'#3a4543');r(c,x+8,y+12,56,10,'#798a82');r(c,x,y,w,10,'#b0b9a2');r(c,x+4,y+1,w-8,2,'#e0d8b0')}
 if(type==='hearth'){r(c,x,y,w,h,'#6c6b54');r(c,x+7,y+7,w-14,h-9,'#232723');r(c,x+18,y+20,w-36,h-23,'#ba512b');r(c,x+24,y+28,w-48,h-31,'#ffc879');r(c,x+32,y+34,w-64,h-36,'#fff0ba')}
 }
 for(const x of [259,529]){r(c,x,119,12,28,'#342a22');r(c,x+3,115,6,13,'#e58b39');r(c,x+4,113,4,9,'#ffdda0');const glow=c.createRadialGradient(x+6,124,1,x+6,124,78);glow.addColorStop(0,'#ffc47430');glow.addColorStop(1,'#e7792100');c.fillStyle=glow;c.fillRect(x-72,46,156,156)}
 c.font='14px VT323';c.textAlign='center';c.fillStyle='#e2cb94';c.fillText('EXIT ↓',400,450);
}
