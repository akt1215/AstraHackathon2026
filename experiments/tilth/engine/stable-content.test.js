import test from 'node:test';
import assert from 'node:assert/strict';
import {replaceContent} from './stable-content.js';
test('unchanged content preserves the existing interactive subtree',()=>{let writes=0;const element={ownerDocument:{activeElement:null},contains:()=>false,set innerHTML(value){writes++}};replaceContent(element,'<button>Take</button>');replaceContent(element,'<button>Take</button>');assert.equal(writes,1)});
test('changed content restores focus to the same action rather than another item',()=>{let focused='';const before={dataset:{worldDirect:'inspect',worldEntity:'note'}};const replacement={dataset:{worldDirect:'inspect',worldEntity:'note'},focus(){focused='note'}};const element={ownerDocument:{activeElement:before},contains:()=>true,set innerHTML(value){},querySelectorAll:()=>[{dataset:{worldDirect:'inspect',worldEntity:'chest'},focus(){focused='chest'}},replacement]};replaceContent(element,'changed note');assert.equal(focused,'note')});
