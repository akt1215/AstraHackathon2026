import {COMBOS} from './content/game-config.js';
export {COMBOS};
export class ComboTracker {
 constructor(combos=COMBOS){this.combos=combos;this.reset()}
 setCombos(combos){this.combos=combos;this.reset()}
 reset(){this.steps=[];this.deadline=0}
 expire(now){if(now>this.deadline)this.reset()}
 accept(skill,now,duration){
  this.expire(now);this.steps.push(skill);
  // Keep the longest suffix that can still form a combo.
  while(this.steps.length&&!this.combos.some(c=>this.steps.every((s,i)=>c.steps[i]===s)))this.steps.shift();
  const complete=this.combos.find(c=>c.steps.length===this.steps.length&&c.steps.every((s,i)=>this.steps[i]===s));
  if(complete){this.reset();return complete}
  this.deadline=now+duration+1600;return null;
 }
 hint(now){this.expire(now);return this.steps.length?this.combos.find(c=>this.steps.every((s,i)=>c.steps[i]===s)):null}
}
