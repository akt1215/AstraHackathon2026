import {regionLife} from './region-life.js';
import {regionSeed,regionLayout} from '../content/region-design.js';
import {validateContent} from './contracts.js';
export const OPPOSITE={up:'down',down:'up',left:'right',right:'left'};
const DELTA={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export function neighbor(id,dir){const [x,y]=id.split(',').map(Number),[dx,dy]=DELTA[dir];return `${x+dx},${y+dy}`}
export function edgeAt(p,dir,generated=false){if(generated)return ({up:p.y<=42,down:p.y>=553,left:p.x<=36,right:p.x>=764})[dir];return ({up:p.y<=88,down:p.y>=552,left:p.x<=62,right:p.x>=699&&p.y>=451&&p.y<=494})[dir]}
export function arrival(dir,hub=false){if(hub)return {up:{x:400,y:540},down:{x:400,y:102},left:{x:687,y:475},right:{x:73,y:335}}[dir];return {up:{x:400,y:530},down:{x:400,y:64},left:{x:744,y:300},right:{x:56,y:300}}[dir]}
function noise(seed,x,y){let n=Math.imul(x+47,374761393)^Math.imul(y+79,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
export function regionGrid(content){
 const life=regionLife(content);
 const seed=regionSeed(content),layout=regionLayout(content),grid=Array.from({length:30},()=>Array(40).fill('ground'));
 const wet=content.theme==='volcanic'?'lava':'water',cx=15+seed%10,cy=11+(seed>>>4)%8;
 for(let y=0;y<30;y++)for(let x=0;x<40;x++){
  const n=noise(seed,x,y),river=cy+Math.sin(x*.19+seed%7)*5;
  if(layout==='archipelago'){grid[y][x]=wet;for(const [ix,iy,rx,ry] of [[8,8,7,6],[29,7,8,5],[20,21,10,7],[34,24,5,5]])if(((x-ix)/(rx+Math.sin(y*.6)))**2+((y-iy)/ry)**2<1)grid[y][x]=n>.87?'trees':'ground';}
  if(layout==='river'){if(Math.abs(y-river)<2.3)grid[y][x]=wet;else if(n>.79)grid[y][x]=y<river?'trees':'rock';}
  if(layout==='caldera'){const d=Math.hypot((x-cx)/1.35,y-cy);if(d>5&&d<9+Math.sin(x*.7))grid[y][x]=wet;else if(d>=9&&n>.75)grid[y][x]='rock';}
  if(layout==='grove'&&Math.sin(x*.28+seed%11)+Math.cos(y*.36)>-.25&&n>.16)grid[y][x]='trees';
  if(layout==='ruins'&&x>3&&x<36&&y>3&&y<27&&((x+seed)%9===0||(y+(seed>>>3))%8===0)&&n>.18)grid[y][x]='rock';
 }
 for(const p of content.patches)for(let y=p.y;y<Math.min(30,p.y+p.h);y++)for(let x=p.x;x<Math.min(40,p.x+p.w);x++){const nx=(x-p.x+.5)/p.w*2-1,ny=(y-p.y+.5)/p.h*2-1;if(nx*nx+ny*ny<.8+noise(seed,x,y)*.5&&noise(seed+1,x,y)>.15){if(layout==='archipelago'&&grid[y][x]===wet)continue;grid[y][x]=p.kind;}}
 for(const h of life.houses){for(let y=h.y-2;y<=h.y+4;y++)for(let x=h.x-3;x<=h.x+3;x++)grid[y][x]='path';for(let y=h.y-2;y<=h.y+1;y++)for(let x=h.x-2;x<=h.x+2;x++)grid[y][x]='house';}
 // Join entrances, recovery point, patrol spawns and monuments using a seeded minimum spanning tree.
 // Weighted paths follow land when possible; crossings become bridges, not erased rivers.
 const nodes=[{x:20,y:2},{x:20,y:26},{x:2,y:15},{x:37,y:15},{x:20,y:16},{x:20,y:12},{x:20,y:20},...content.landmarks.map(m=>({x:m.x,y:m.y})),...life.houses.map(h=>({x:h.x,y:h.y+3})),...life.enemies.map(e=>({x:e.x,y:e.y}))];
 const carve=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>39||yy<0||yy>29||grid[yy][xx]==='house')continue;grid[yy][xx]=['water','lava','bridge'].includes(grid[yy][xx])?'bridge':'path'}};
 function connect(start,end){const costs=new Float64Array(1200).fill(Infinity),prev=new Int16Array(1200).fill(-1),done=new Uint8Array(1200);const from=start.y*40+start.x,to=end.y*40+end.x;costs[from]=0;for(let iter=0;iter<1200;iter++){let at=-1,best=Infinity;for(let i=0;i<1200;i++)if(!done[i]&&costs[i]<best){best=costs[i];at=i}if(at<0||at===to)break;done[at]=1;const x=at%40,y=Math.floor(at/40);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||nx>=40||ny<0||ny>=30)continue;const j=ny*40+nx,k=grid[ny][nx],cost=best+({path:.6,bridge:.9,ground:1,trees:2.8,rock:4,water:5,lava:6,house:Infinity}[k])+noise(seed,nx,ny)*1.7;if(cost<costs[j]){costs[j]=cost;prev[j]=at}}}for(let at=to;at!==-1;at=prev[at]){carve(at%40,Math.floor(at/40));if(at===from)break}}
 const joined=[nodes.shift()];while(nodes.length){let pick=0,parent=joined[0],best=Infinity;for(let i=0;i<nodes.length;i++)for(const n of joined){const d=Math.hypot(n.x-nodes[i].x,n.y-nodes[i].y);if(d<best){best=d;pick=i;parent=n}}const next=nodes.splice(pick,1)[0];connect(parent,next);joined.push(next)}
 // Small gate aprons support travel at the fixed arrival coordinates without a perimeter highway.
 for(const [x,y] of [[20,1],[20,27],[1,15],[38,15]])carve(x,y);
 return grid;
}
export function standInRegion(grid,x,y){if(x<16||x>784||y<26||y>572)return false;for(const dx of [-6,6])for(const dy of [7,14])if(!['ground','path','bridge'].includes(grid[Math.floor((y+dy)/20)]?.[Math.floor((x+dx)/20)]))return false;return true}
export class RegionAtlas{
 constructor(runtime){this.runtime=runtime;this.current='0,0';this.regions={};for(const [id,r] of Object.entries(runtime.state.regions||{}).slice(0,16)){try{if(!/^-?\d+,-?\d+$/.test(id)||id==='0,0')continue;validateContent('region',r.content,r.events);this.regions[id]=r}catch{}}runtime.state.regions=this.regions}
 get content(){return this.regions[this.current]?.content}
 add(id,content,events){validateContent('region',content,events);if(!this.regions[id]&&Object.keys(this.regions).length>=16)throw new Error('This world has reached its 16-area exploration limit.');this.regions[id]={content,events};this.runtime.state.regions=this.regions;this.runtime.changed()}
 homeDirection(){const queue=[{id:this.current,first:null}],seen=new Set([this.current]);for(const n of queue){if(n.id==='0,0')return n.first;for(const dir of Object.keys(DELTA)){const id=neighbor(n.id,dir);if(seen.has(id)||!(id==='0,0'||this.regions[id]))continue;seen.add(id);queue.push({id,first:n.first||dir})}}return null}
}
export {drawRegion} from './region-art.js';
