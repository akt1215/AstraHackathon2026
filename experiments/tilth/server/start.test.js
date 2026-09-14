import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {productionServer} from './start.js';
test('production serves frontend and generation API in the same process',async t=>{
 const root=await mkdtemp(join(tmpdir(),'tilth-server-'));await writeFile(join(root,'index.html'),'<html>Tilth</html>');await writeFile(join(root,'.env'),'private');
 const server=productionServer({root,env:{OPENAI_API_KEY:'test',OPENAI_MODEL:'test',ASTRA_PROVIDER:'offline'},fetcher:async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:'{"name":"Sable"}'}]}]})});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true})});
 const url=`http://127.0.0.1:${server.address().port}`;
 assert.match(await(await fetch(url)).text(),/Tilth/);
 const worldInfo=await(await fetch(url+'/api/world/info')).json();assert.equal(worldInfo.provider.provider,'offline');assert.equal(worldInfo.provider.available,false);
 assert.equal((await fetch(url+'/api/world/missing')).status,404);
 assert.deepEqual(await(await fetch(url+'/api/generation/status')).json(),{configured:true});
 const response=await fetch(url+'/api/generation',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify({id:'prod-test',kind:'name',mode:'name',brief:'Name a traveler',events:[]})});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{content:{name:'Sable'}});
 for(const path of ['/.env','/api/missing','/missing.js','/%2e%2e%2f.env'])assert.equal((await fetch(url+path)).status,404);
});
