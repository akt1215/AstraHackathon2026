import {REGION_LAYOUTS} from '../content/region-design.js';
import {MOVE_STYLES} from './awakened-moves.js';
import {COMBOS} from '../content/game-config.js';
import {ACTORS} from '../content/encounters.js';
import {HAIRSTYLES,CLOTHES,WEAPONS} from '../content/characters.js';
const str=(maxLength=240)=>({type:'string',minLength:1,maxLength});
const num=(minimum,maximum)=>({type:'integer',minimum,maximum});
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=(items,maxItems,minItems=1)=>({type:'array',items,minItems,maxItems});
const color={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
const pixel=obj({x:num(-48,48),y:num(-52,30),w:num(1,16),h:num(1,16),color});
const effect=obj({shape:{type:'string',enum:['ring','ray','orbit']},color,radius:num(8,60),count:num(4,24),rotation:num(-6,6)});
const move=obj({style:{type:'string',enum:MOVE_STYLES},damage:num(8,45),range:num(30,150),hits:num(1,3),color});
const combo=obj({name:str(60),steps:list({type:'string',enum:['Slash','Heavy','Spin','Bash','Dodge']},3,3),move});
const sourceEventIds=list(str(100),20);
export const SCHEMAS={
 witch:obj({name:str(40),line:str(300),sourceEventIds:list(str(100),20,0)}),
 region:obj({objective:obj({title:str(70),description:str(300)}),houses:list(obj({name:str(60),kind:{type:'string',enum:['home','inn','smith']},resident:str(30),greeting:str(240),request:str(240),thanks:str(240)}),2,1),enemies:list(obj({name:str(40),kind:{type:'string',enum:['raider','sentry','mage']},hp:num(55,140),color,taunt:str(160)}),5,3),layout:{type:'string',enum:REGION_LAYOUTS},seed:num(1,999999),name:str(60),description:str(400),witchLine:str(450),verdict:{type:'string',enum:['welcoming','hostile']},sourceEventIds:list(str(100),20,0),theme:{type:'string',enum:['forest','marsh','frost','volcanic']},accent:color,enemyCount:num(3,5),patches:list(obj({kind:{type:'string',enum:['trees','rock','water','lava']},x:num(2,35),y:num(2,25),w:num(2,8),h:num(2,6)}),22,6),landmarks:list(obj({kind:{type:'string',enum:['shrine','arch','tower','camp','crystal']},name:str(40),x:num(4,35),y:num(4,25)}),4,1)}),
 reaction:obj({speaker:{type:'string',enum:ACTORS.map(a=>a.id)},line:str(160),sourceEventIds}),
 character:obj({name:str(24),heroClass:{type:'string',enum:['Warrior','Mage','Rogue','Healer']},hairStyle:{type:'string',enum:HAIRSTYLES},hairColor:color,skinColor:color,clothing:{type:'string',enum:CLOTHES},outfitColor:color,weapon:{type:'string',enum:Object.keys(WEAPONS)},bio:str(300),characterArt:list(pixel,48,0)}),
 name:obj({name:str(24)}),
 awakening:obj({name:str(60),description:str(500),reason:str(400),tradeoff:str(250),sourceEventIds,appearance:list(pixel,96),skill:obj({name:str(60),description:str(250),durationMs:num(400,1400),cooldownMs:num(1500,8000),effects:list(effect,4),move,combo})}),
 quest:obj({title:str(70),description:str(500),sourceEventIds,objectives:list(obj({type:{type:'string',enum:['visit_room','perform_combo']},target:{type:'string',enum:['inn','smith','home','Cleave','Cyclone','Breaker']},description:str(160)}),3)}),
 journal:obj({title:str(70),summary:str(700),sourceEventIds})
};
const sceneryRegion=structuredClone(SCHEMAS.region);for(const k of ['objective','houses','enemies']){delete sceneryRegion.properties[k];sceneryRegion.required=sceneryRegion.required.filter(v=>v!==k)}sceneryRegion.properties.enemyCount={type:'integer',minimum:0,maximum:2};
const legacyRegion=structuredClone(sceneryRegion);for(const k of ['layout','seed']){delete legacyRegion.properties[k];legacyRegion.required=legacyRegion.required.filter(v=>v!==k)}delete legacyRegion.properties.landmarks.items.properties.kind;legacyRegion.properties.landmarks.items.required=legacyRegion.properties.landmarks.items.required.filter(v=>v!=='kind');
const legacyAwakening=structuredClone(SCHEMAS.awakening);for(const k of ['move','combo']){delete legacyAwakening.properties.skill.properties[k];legacyAwakening.properties.skill.required=legacyAwakening.properties.skill.required.filter(v=>v!==k)}
export function matches(schema,value){
 if(schema.type==='object')return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>k in schema.properties)&&schema.required.every(k=>Object.hasOwn(value,k)&&matches(schema.properties[k],value[k]));
 if(schema.type==='array')return Array.isArray(value)&&value.length>=schema.minItems&&value.length<=schema.maxItems&&value.every(v=>matches(schema.items,v));
 if(schema.type==='integer')return Number.isInteger(value)&&value>=schema.minimum&&value<=schema.maximum;
 if(schema.type==='string')return typeof value==='string'&&(!schema.minLength||value.length>=schema.minLength)&&(!schema.maxLength||value.length<=schema.maxLength)&&(!schema.enum||schema.enum.includes(value))&&(!schema.pattern||new RegExp(schema.pattern).test(value));
 return false;
}
export function validateContent(kind,value,events){
 if(!SCHEMAS[kind]||!(matches(SCHEMAS[kind],value)||(kind==='awakening'&&matches(legacyAwakening,value))||(kind==='region'&&(matches(legacyRegion,value)||matches(sceneryRegion,value)))))throw new Error('Generated content does not match the engine contract.');
 if(kind==='reaction'&&(!value.sourceEventIds.length||!value.sourceEventIds.every(id=>events.some(e=>e.id===id&&e.type==='combat_hit'&&e.target===value.speaker))))throw new Error('Reaction must cite a hit on the speaking character.');
 if(kind==='region'&&value.enemies&&value.enemyCount!==value.enemies.length)throw new Error('Enemy count must match the region roster.');
 if(kind==='region'&&value.verdict==='hostile'){if(!events.some(e=>value.sourceEventIds.includes(e.id)&&e.type==='combat_hit'&&ACTORS.some(a=>a.id===e.target&&!a.enemy&&a.attackable!==false)))throw new Error('A hostile witch response needs evidence of attacking a townsperson.');if(value.enemyCount<1)throw new Error('A hostile region must contain a challenge.');}
 const allowed=new Set(events.map(e=>e.id));
 if((value.sourceEventIds||[]).some(id=>!allowed.has(id)))throw new Error('Generated content cites unknown events.');
 if(kind==='quest'&&value.objectives.some(o=>!(o.type==='visit_room'?['inn','smith','home']:['Cleave','Cyclone','Breaker']).includes(o.target)))throw new Error('Quest objective cannot be executed.');
 if(kind==='awakening'&&value.skill.cooldownMs<value.skill.durationMs+300)throw new Error('Skill recovery budget exceeded.');
 if(kind==='awakening'&&value.skill.move){for(const m of [value.skill.move,value.skill.combo.move])if(m.damage*m.hits>90)throw new Error('Generated move damage budget exceeded.');if(COMBOS.some(c=>c.steps.join(',')===value.skill.combo.steps.join(',')))throw new Error('Generated combo must use a new sequence.');if(value.skill.move.style===value.skill.combo.move.style)throw new Error('The combo needs a distinct animation style.');}
 return value;
}
