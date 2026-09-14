export const HAIRSTYLES=['Cropped','Swept','Curls','Braid','Bald'];
export const CLOTHES=['Armor','Coat','Robe','Tunic'];
export const HAIR_COLORS=['#302d2b','#705039','#ad633f','#d6b46d','#c9d0c3','#749fa3'];
export const SKIN_COLORS=['#f1cfaa','#e4b47e','#c68e62','#a66d4e','#774d3d','#51392f'];
export const OUTFIT_COLORS=['#a85b37','#497985','#788753','#b49758','#657b79','#984f54'];
const move=(name,duration,cooldown,sound)=>({name,duration,cooldown,sound});
export const WEAPONS={
 sword:{name:'Sword',icon:'⚔',description:'Balanced cuts, heavy cleaves, and close-range defense.',moves:{Slash:move('Quick cut',420,500,'Slash'),Heavy:move('Heavy cleave',720,1000,'Heavy'),Spin:move('Whirlwind',650,1300,'Spin'),Bash:move('Shield bash',430,800,'Guard')}},
 spear:{name:'Spear',icon:'↟',description:'Long-reaching thrusts and broad sweeping attacks.',moves:{Slash:move('Jab',350,450,'Slash'),Heavy:move('Piercing thrust',680,950,'Heavy'),Spin:move('Sweeping pole',720,1300,'Spin'),Bash:move('Shaft parry',420,800,'Guard')}},
 bow:{name:'Bow',icon:'➶',description:'Quick arrows, charged shots, and a spreading volley.',moves:{Slash:move('Quick shot',430,550,'Arrow'),Heavy:move('Charged arrow',850,1150,'ArrowHeavy'),Spin:move('Fan volley',750,1400,'Volley'),Bash:move('Bow strike',400,750,'Guard')}},
 staff:{name:'Staff',icon:'✦',description:'Arcane bolts, expanding novas, and a protective ward.',moves:{Slash:move('Spark bolt',460,600,'Potion'),Heavy:move('Arcane nova',900,1400,'Rally'),Spin:move('Orbiting sparks',850,1450,'heal'),Bash:move('Runic ward',600,1000,'Guard')}}
};
export const DEFAULT_CHARACTER={name:'Evergreen',heroClass:'Warrior',hairStyle:'Swept',hairColor:'#705039',skinColor:'#e4b47e',clothing:'Coat',outfitColor:'#a85b37',weapon:'sword',bio:'A traveler finding their own way through the ash.',characterArt:[]};
export function characterFromProfile(p={}){return{...DEFAULT_CHARACTER,...p,characterArt:Array.isArray(p.characterArt)?p.characterArt:[]}}
export function weaponMove(weapon,action,fallback){return WEAPONS[weapon]?.moves[action]||fallback}
export const CHARACTER_FIELDS=Object.keys(DEFAULT_CHARACTER);
export const characterContent=profile=>Object.fromEntries(CHARACTER_FIELDS.map(k=>[k,characterFromProfile(profile)[k]]));
