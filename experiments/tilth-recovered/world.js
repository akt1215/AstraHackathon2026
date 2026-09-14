import {standInRegion} from './engine/regions.js';
let activeTerrain=null;
export function setRegionTerrain(grid){activeTerrain=grid}
import {HOUSES} from './content/game-config.js';
export const houses=HOUSES;
export const magmaBank = [[610,0],[800,0],[800,600],[615,600],[586,548],[575,464],[593,414],[568,370],[597,332],[634,287],[631,221],[658,176],[632,115]];
export const obstacles=[];
export function addObstacle(x,y,w,h){obstacles.push({x,y,w,h})}
export function pointInPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside}return inside}
function overlaps(x,y,r){return x+6>r.x&&x-6<r.x+r.w&&y+14>r.y&&y+7<r.y+r.h}
export const furnishings={
 inn:[{x:240,y:177,w:76,h:95,type:'bed'},{x:477,y:177,w:76,h:95,type:'bed'},{x:337,y:281,w:125,h:56,type:'table'},{x:235,y:358,w:65,h:34,type:'chest'}],
 smith:[{x:235,y:177,w:86,h:64,type:'hearth'},{x:457,y:178,w:100,h:42,type:'shelf'},{x:361,y:286,w:72,h:43,type:'anvil'},{x:476,y:351,w:76,h:36,type:'chest'}],
 home:[{x:240,y:179,w:76,h:95,type:'bed'},{x:449,y:180,w:110,h:40,type:'shelf'},{x:386,y:294,w:100,h:54,type:'table'},{x:241,y:360,w:68,h:34,type:'chest'}]
};
export function canStand(x,y,room=null){
 if(room){if(x<223||x>577||y+7<164||y+14>440)return false;return !furnishings[room].some(r=>overlaps(x,y,r))}
 if(activeTerrain)return standInRegion(activeTerrain,x,y);
 if(x<35||x>765||y<76||y>568)return false;
 // Only the deck is safe. Keep a foot-sized margin inside its railings.
 const bridge=x-6>=566&&x+6<=719&&y+7>=460&&y+14<=508;
 if(!bridge){for(const dx of [-6,0,6])for(const dy of [7,14])if(pointInPolygon(x+dx,y+dy,magmaBank))return false}
 return !obstacles.some(r=>overlaps(x,y,r));
}
export function doorwayAt(x,y,direction){if(direction!=='up')return null;return houses.find(h=>Math.abs(x-(h.x+h.w/2))<=11&&y+7<=h.y+77&&y+14>=h.y+67)||null}
export function exitAt(x,y,direction){return direction==='down'&&Math.abs(x-400)<=21&&y+14>=433}
// Pixel substeps prevent a held key or a large movement from tunnelling through walls.
export function advance(position,dx,dy,room=null){let {x,y}=position;const steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy)));for(let i=0;i<steps;i++){const nx=x+dx/steps,ny=y+dy/steps;if(!canStand(nx,ny,room))break;x=nx;y=ny}return {x,y}}
