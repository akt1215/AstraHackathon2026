const str=n=>({type:'string',minLength:1,maxLength:n});
const int=(minimum,maximum)=>({type:'integer',minimum,maximum});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const arr=(items,minItems,maxItems)=>({type:'array',items,minItems,maxItems});
const point=obj({x:int(-60,60),y:int(-60,60)});
const pose=obj({part:str(24),x:int(-20,20),y:int(-20,20),angle:int(-100,100)});
const frame=obj({at:int(0,100),poses:arr(pose,0,18)});
const clip=obj({durationMs:int(350,1800),frames:arr(frame,2,5)});
export const FORM_SCHEMA=obj({
 species:str(40),parts:arr(obj({id:str(24),x:int(-50,50),y:int(-45,25),color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},points:arr(point,3,12)}),4,18),
 idle:clip,walk:clip,dodge:clip,
 primary:obj({name:str(40),cooldownMs:int(600,6000),clip}),
 heavy:obj({name:str(40),cooldownMs:int(600,6000),clip}),
 special:obj({name:str(40),cooldownMs:int(600,6000),clip}),
 guard:obj({name:str(40),cooldownMs:int(600,6000),clip})
});
export function validateForm(form){
 const ids=form.parts.map(p=>p.id);if(new Set(ids).size!==ids.length)throw new Error('Custom form part IDs must be unique.');
 const clips=[form.idle,form.walk,form.dodge,...['primary','heavy','special','guard'].map(k=>form[k].clip)];
 for(const clip of clips){if(clip.frames[0].at!==0||clip.frames.at(-1).at!==100)throw new Error('Animation must begin at 0 and end at 100.');let at=-1;for(const frame of clip.frames){if(frame.at<=at)throw new Error('Animation frames must be ordered.');at=frame.at;if(new Set(frame.poses.map(p=>p.part)).size!==frame.poses.length||frame.poses.some(p=>!ids.includes(p.part)))throw new Error('Animation references invalid parts.')}}
 for(const k of ['primary','heavy','special','guard'])if(form[k].cooldownMs<form[k].clip.durationMs)throw new Error('Move cooldown must cover its animation.');
 if(!clips.some(clip=>clip.frames.some(frame=>frame.poses.some(p=>p.x||p.y||p.angle))))throw new Error('Custom form needs animated motion.');
 return form;
}
