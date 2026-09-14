import test from 'node:test';
import assert from 'node:assert/strict';
import {ComboTracker,COMBOS} from './combos.js';
import {ACTIONS} from './combat-visuals.js';
test('all recipes trigger only on the final accepted action',()=>{for(const combo of COMBOS){const tracker=new ComboTracker();let now=0;combo.steps.forEach((name,i)=>{const result=tracker.accept(name,now,ACTIONS[name].duration);assert.equal(result?.id,i===2?combo.id:undefined);now+=ACTIONS[name].duration+120});assert.deepEqual(tracker.steps,[])}});
test('expired sequence cannot trigger a finisher',()=>{const t=new ComboTracker();t.accept('Slash',0,420);t.accept('Slash',600,420);assert.equal(t.accept('Heavy',3000,720),null)});
test('wrong inputs reset the recipe, retaining a valid new beginning',()=>{const t=new ComboTracker();t.accept('Slash',0,420);t.accept('Bash',600,430);assert.deepEqual(t.steps,['Bash']);t.accept('Heavy',1200,720);assert.equal(t.accept('Slash',2100,420)?.id,'Breaker')});
test('timeout starts after animation and explicit reset clears progress',()=>{const t=new ComboTracker();t.accept('Heavy',0,720);t.accept('Dodge',1000,360);assert.ok(t.hint(2950));assert.equal(t.hint(2961),null);t.accept('Slash',3000,420);t.reset();assert.equal(t.hint(3001),null)});
