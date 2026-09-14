import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {generationApi} from './generation-api.js';
import {worldApi} from './world-api.ts';
const defaultRoot=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
export function productionServer({env=process.env,root=defaultRoot,fetcher=fetch}={}){
 const api=generationApi(env,fetcher);
 const world=worldApi({env});
 return createServer(async(req,res)=>{
  const fail=(status,error)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({error}))};
  try{
   if(req.url?.startsWith('/api/world/'))return await world(req,res,()=>fail(404,'Unknown world endpoint.'));
   await api(req,res,async()=>{
    if(req.url?.startsWith('/api/'))return fail(404,'Unknown API endpoint.');
    if(!['GET','HEAD'].includes(req.method))return fail(405,'Method not allowed.');
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return fail(400,'Invalid path.')}
    const base=await realpath(root),requested=resolve(base,'.'+pathname);
    if(requested!==base&&!requested.startsWith(base+sep))return fail(404,'Not found.');
    if(pathname.split('/').some(p=>p.startsWith('.')&&p!==''))return fail(404,'Not found.');
    let file=requested;
    try{if(!(await stat(file)).isFile())file=resolve(base,'index.html')}catch{if(extname(pathname))return fail(404,'Not found.');file=resolve(base,'index.html')}
    file=await realpath(file);if(!file.startsWith(base+sep))return fail(404,'Not found.');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:body);
   });
  }catch{if(!res.headersSent)fail(500,'Server could not complete the request.');else res.end()}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 await stat(resolve(defaultRoot,'index.html'));
 const port=Number(process.env.PORT)||3000;
 const server=productionServer();server.listen(port,process.env.HOST||'0.0.0.0',()=>console.log(`Tilth listening on port ${port}`));
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
