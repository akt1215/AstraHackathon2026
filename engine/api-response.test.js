import test from 'node:test';
import assert from 'node:assert/strict';
import {generationResponse} from './api-response.js';
test('empty and truncated responses produce actionable errors instead of JSON exceptions',async()=>{
 for(const body of ['', '{"content":'])await assert.rejects(generationResponse(new Response(body)),/empty or invalid response \(HTTP 200\)/);
 await assert.rejects(generationResponse(new Response('',{status:404})),/endpoint is unavailable.*npm run dev/);
 await assert.rejects(generationResponse(new Response('Gateway timeout',{status:504})),/timed out/);
 await assert.rejects(generationResponse(new Response('<html>proxy error</html>',{status:502})),/invalid response.*HTTP 502/);
});
test('valid content and structured server errors are preserved',async()=>{
 assert.deepEqual(await generationResponse(Response.json({content:{name:'Sable'}})),{content:{name:'Sable'}});
 await assert.rejects(generationResponse(Response.json({error:'Generation budget reached.'},{status:429})),/Generation budget reached/);
 for(const data of [null,[], 'oops'])await assert.rejects(generationResponse(Response.json(data)),/invalid response/);
});
