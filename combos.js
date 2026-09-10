export const COMBOS=[
 {id:'Cleave',name:'Cinder Cleave',steps:['Slash','Slash','Heavy'],keys:'Space → Space → Q',description:'Two quick cuts prime a blazing overhead strike.'},
 {id:'Cyclone',name:'Ash Cyclone',steps:['Dodge','Slash','Spin'],keys:'Shift → Space → E',description:'Roll, cut, then unleash a wide ring of ember blades.'},
 {id:'Breaker',name:'Forge Breaker',steps:['Bash','Heavy','Slash'],keys:'R → Q → Space',description:'A shield bash and heavy blow set up a piercing sword thrust.'}
];
export class ComboTracker {
 constructor(){this.reset()}
 reset(){this.steps=[];this.deadline=0}
 expire(now){if(now>this.deadline)this.reset()}
 accept(skill,now,duration){
  this.expire(now);this.steps.push(skill);
  // Keep the longest suffix that can still form a combo.
  while(this.steps.length&&!COMBOS.some(c=>this.steps.every((s,i)=>c.steps[i]===s)))this.steps.shift();
  const complete=COMBOS.find(c=>c.steps.length===this.steps.length&&c.steps.every((s,i)=>this.steps[i]===s));
  if(complete){this.reset();return complete}
  this.deadline=now+duration+1600;return null;
 }
 hint(now){this.expire(now);return this.steps.length?COMBOS.find(c=>this.steps.every((s,i)=>c.steps[i]===s)):null}
}
