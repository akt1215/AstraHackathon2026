// The canvas uses cover sizing and player-anchored percentage object-position.
// Keep selection and the on-screen list on this same transform.
export function canvasViewport({bounds,width=800,height=600,position,viewport}){
 if(bounds.width<=0||bounds.height<=0)return null;
 const scale=Math.max(bounds.width/width,bounds.height/height);
 const originX=bounds.left+(bounds.width-width*scale)*position.x/width;
 const originY=bounds.top+(bounds.height-height*scale)*position.y/height;
 const clipLeft=Math.max(bounds.left,viewport.left??0),clipTop=Math.max(bounds.top,viewport.top??0);
 const clipRight=Math.min(bounds.left+bounds.width,(viewport.left??0)+viewport.width);
 const clipBottom=Math.min(bounds.top+bounds.height,(viewport.top??0)+viewport.height);
 if(clipRight<=clipLeft||clipBottom<=clipTop)return null;
 return {scale,originX,originY,clipLeft,clipTop,clipRight,clipBottom,left:Math.max(0,(clipLeft-originX)/scale),top:Math.max(0,(clipTop-originY)/scale),right:Math.min(width,(clipRight-originX)/scale),bottom:Math.min(height,(clipBottom-originY)/scale)};
}
export function clientToWorld({x,y},view){
 if(!view||x<view.clipLeft||x>view.clipRight||y<view.clipTop||y>view.clipBottom)return null;
 return {x:(x-view.originX)/view.scale,y:(y-view.originY)/view.scale};
}
export function entitiesInViewport(entities,view,room,boundsFor=()=>({left:0,right:0,top:0,bottom:0})){
 if(!view)return [];
 return entities.filter(entity=>{
  const p=entity.location;if(entity.id==='player'||p.kind!=='ground'||(p.room??null)!==(room??null))return false;
  const b=boundsFor(entity);
  return p.x+b.right>=view.left&&p.x+b.left<=view.right&&p.y+b.bottom>=view.top&&p.y+b.top<=view.bottom;
 });
}
export function entityPosition(entity,entities,player,seen=new Set()){
 if(!entity||seen.has(entity.id))return null;seen.add(entity.id);
 const p=entity.location;
 if(p.kind==='ground')return {x:p.x,y:p.y,room:p.room??null};
 if(p.kind==='held'&&p.actor==='player')return player;
 const parent=p.kind==='contained'?p.container:p.kind==='held'?p.actor:null;
 return parent?entityPosition(entities.find(e=>e.id===parent),entities,player,seen):null;
}
export function playerViewForViewport(base,state,view,boundsFor){
 const visible=new Set(entitiesInViewport(state.entities,view,state.room,boundsFor).map(e=>e.id));
 visible.add('player');
 for(const e of state.entities)if(e.location.kind==='held'&&e.location.actor==='player')visible.add(e.id);
 // Public projection already omits contents behind closed containers and private inventories.
 let added=true;while(added){added=false;for(const e of state.entities)if(e.location.kind==='contained'&&visible.has(e.location.container)&&!visible.has(e.id)){visible.add(e.id);added=true;}}
 return {...base,entities:state.entities.filter(e=>visible.has(e.id))};
}
