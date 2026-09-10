import {ACTORS} from '../content/encounters.js';
import {HAIRSTYLES,CLOTHES,WEAPONS} from '../content/characters.js';
const str=(maxLength=240)=>({type:'string',minLength:1,maxLength});
const num=(minimum,maximum)=>({type:'integer',minimum,maximum});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,maxItems,minItems=1)=>({type:'array',items,minItems,maxItems});
const color={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
const pixel=obj({x:num(-48,48),y:num(-52,30),w:num(1,16),h:num(1,16),color});
const effect=obj({shape:{type:'string',enum:['ring','ray','orbit']},color,radius:num(8,60),count:num(4,24),rotation:num(-6,6)});
const sourceEventIds=list(str(100),20);
export const SCHEMAS={
 reaction:obj({speaker:{type:'string',enum:ACTORS.map(a=>a.id)},line:str(160),sourceEventIds}),
 character:obj({name:str(24),heroClass:{type:'string',enum:['Warrior','Mage','Rogue','Healer']},hairStyle:{type:'string',enum:HAIRSTYLES},hairColor:color,skinColor:color,clothing:{type:'string',enum:CLOTHES},outfitColor:color,weapon:{type:'string',enum:Object.keys(WEAPONS)},bio:str(300),characterArt:list(pixel,48,0)}),
 name:obj({name:str(24)}),
 awakening:obj({name:str(60),description:str(500),reason:str(400),tradeoff:str(250),sourceEventIds,appearance:list(pixel,96),skill:obj({name:str(60),description:str(250),durationMs:num(400,1400),cooldownMs:num(1500,8000),effects:list(effect,4)})}),
 quest:obj({title:str(70),description:str(500),sourceEventIds,objectives:list(obj({type:{type:'string',enum:['visit_room','perform_combo']},target:{type:'string',enum:['inn','smith','home','Cleave','Cyclone','Breaker']},description:str(160)}),3)}),
 journal:obj({title:str(70),summary:str(700),sourceEventIds})
};
export function matches(schema,value){
 if(schema.type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>k in schema.properties)&&schema.required.every(k=>Object.hasOwn(value,k)&&matches(schema.properties[k],value[k]));
 if(schema.type==='array')return Array.isArray(value)&&value.length>=schema.minItems&&value.length<=schema.maxItems&&value.every(v=>matches(schema.items,v));
 if(schema.type==='integer')return Number.isInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
 if(schema.type==='string')return typeof value==='string'&&(!schema.minLength||value.length>=schema.minLength)&&(!schema.maxLength||value.length<=schema.maxLength)&&(!schema.enum||schema.enum.includes(value))&&(!schema.pattern||new RegExp(schema.pattern).test(value));
 return false;
}
export function validateContent(kind,value,events){
 if(!SCHEMAS[kind]||!matches(SCHEMAS[kind],value))throw new Error('Generated content does not match the engine contract.');
 if(kind==='reaction'&&(!value.sourceEventIds.length||!value.sourceEventIds.every(id=>events.some(e=>e.id===id&&e.type==='combat_hit'&&e.target===value.speaker))))throw new Error('Reaction must cite a hit on the speaking character.');
 const allowed=new Set(events.map(e=>e.id));
 if((value.sourceEventIds||[]).some(id=>!allowed.has(id)))throw new Error('Generated content cites unknown events.');
 if(kind==='quest'&&value.objectives.some(o=>!(o.type==='visit_room'?['inn','smith','home']:['Cleave','Cyclone','Breaker']).includes(o.target)))throw new Error('Quest objective cannot be executed.');
 if(kind==='awakening'&&value.skill.cooldownMs<value.skill.durationMs+300)throw new Error('Skill recovery budget exceeded.');
 return value;
}
