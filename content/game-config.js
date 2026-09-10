// Authored starting content. Engine code consumes this same registry as validated generated content.
export const CONFIG_VERSION=1;
export const CLASS_COLORS={Warrior:'#a85b37',Mage:'#558b9b',Rogue:'#a68a46',Healer:'#a9b89d'};
export const ITEMS=[['⚔','Sunsteel blade','Legendary · Main hand'],['▣','Ashguard armor','Rare · Armor'],['♜','Wayfarer helm','Common · Head'],['⚑','Emberweave cloak','Epic · Accessory'],['♥','Health potion','Common · Consumable'],['▧','Oakbound shield','Rare · Off-hand']];
export const HOUSES=[{id:'inn',name:'The Ember Rest',x:116,y:165,w:130},{id:'smith',name:'Cinderwatch Smithy',x:469,y:152,w:127},{id:'home',name:'The Watchkeeper’s House',x:112,y:451,w:115}];
export const ACTIONS={Slash:{duration:420,cooldown:500,sound:'Slash'},Heavy:{duration:720,cooldown:1000,sound:'Heavy'},Spin:{duration:650,cooldown:1300,sound:'Spin'},Bash:{duration:430,cooldown:800,sound:'Guard'},Dodge:{duration:360,cooldown:750,sound:'Dodge'},Cleave:{duration:850,cooldown:1100,sound:'Cleave'},Cyclone:{duration:1000,cooldown:1400,sound:'Cyclone'},Breaker:{duration:780,cooldown:1100,sound:'Breaker'}};
export const COMBOS=[
 {id:'Cleave',name:'Cinder Cleave',steps:['Slash','Slash','Heavy'],keys:'Space → Space → Q',description:'Two quick cuts prime a blazing overhead strike.'},
 {id:'Cyclone',name:'Ash Cyclone',steps:['Dodge','Slash','Spin'],keys:'Shift → Space → E',description:'Roll, cut, then unleash a wide ring of ember blades.'},
 {id:'Breaker',name:'Forge Breaker',steps:['Bash','Heavy','Slash'],keys:'R → Q → Space',description:'A shield bash and heavy blow set up a piercing sword thrust.'}
];
export const GENERATION_POLICY={awakeningEvidence:3,reflectionEvidence:6,maxActiveQuests:1,maxJobs:30};
