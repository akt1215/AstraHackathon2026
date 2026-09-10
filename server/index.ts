import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { z } from 'zod';
import { Coordinator, RequestError } from './coordinator';
import { providerInfo, interpret, decideNpc } from './model';

const point={x:z.number().int().min(0).max(100),y:z.number().int().min(0).max(100)};
const direct=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('move'),...point}).strict(),
 z.object({kind:z.enum(['interact','drop']),entity:z.string().min(1).max(80)}).strict(),
 z.object({kind:z.enum(['wait','rest'])}).strict(),
]);
const action=z.object({requestId:z.string().min(1).max(100),worldId:z.string().min(1).max(100),version:z.number().int().min(0),input:z.string().trim().min(1).max(1200).optional(),direct:direct.optional()}).strict().refine(v=>!!v.input!==!!v.direct,{message:'Choose either an intention or a direct interaction.'});
const fresh=z.object({variant:z.enum(['baseline','tired','asleep']).optional()}).strict();
const port=Number(process.env.PORT ?? 8787);
const coordinator=new Coordinator(resolve(process.env.DATA_FILE ?? 'data/session.json'),{info:providerInfo,interpret,decide:decideNpc});
const dist=resolve('dist');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
function json(res:ServerResponse,status:number,value:unknown) {
 res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));
}
async function body(req:IncomingMessage):Promise<unknown> {
 let size=0;const chunks:Buffer[]=[];
 for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>16_384)throw new RequestError('Request is too large.',413);chunks.push(b);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new RequestError('Request must contain valid JSON.');}
}
async function handle(req:IncomingMessage,res:ServerResponse) {
 const path=new URL(req.url ?? '/','http://localhost').pathname;
 // Local app: accept browser mutations only from this server or the Vite dev server.
 if(req.method==='POST' && req.headers.origin){
  const origin=new URL(req.headers.origin);
  if(!['localhost','127.0.0.1'].includes(origin.hostname)||![String(port),'5173'].includes(origin.port))throw new RequestError('This page cannot change the local world.',403);
 }
 if(path==='/api/state' && req.method==='GET')return json(res,200,{state:coordinator.state(),provider:coordinator.info()});
 if(path==='/api/action' && req.method==='POST')return json(res,200,await coordinator.act(action.parse(await body(req))));
 if(path==='/api/new' && req.method==='POST'){const v=fresh.parse(await body(req));return json(res,200,{state:coordinator.newWorld(v.variant),provider:coordinator.info()});}
 if(path==='/api/save' && req.method==='POST'){coordinator.save();return json(res,200,{ok:true});}
 if(path.startsWith('/api/'))return json(res,404,{error:'No such action.'});
 if(req.method!=='GET' && req.method!=='HEAD')return json(res,405,{error:'Method not supported.'});
 const requested=resolve(dist,'.'+decodeURIComponent(path));
 if(requested!==dist && !requested.startsWith(dist+sep))throw new RequestError('Invalid path.',400);
 let file=requested;
 try {if(!(await stat(file)).isFile())file=resolve(dist,'index.html');}catch{file=resolve(dist,'index.html');}
 try {
  const bytes=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)] ?? 'application/octet-stream','x-content-type-options':'nosniff','cache-control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch{return json(res,503,{error:'Build the client with npm run build, or open the Vite development URL.'});}
}
const server=createServer((req,res)=>{void handle(req,res).catch(error=>{
 if(res.headersSent){res.end();return;}
 const status=error instanceof RequestError?error.status:error instanceof z.ZodError?400:500;
 const message=error instanceof z.ZodError?'That request is invalid.':error instanceof Error?error.message:'The action could not finish.';
 json(res,status,{error:message,state:coordinator.state()});
});});
server.listen(port,'127.0.0.1',()=>{
 console.log(`The DM Is Real: http://127.0.0.1:${port} (${coordinator.info().label})`);
 void coordinator.recover().catch(error=>console.error('Recovery paused:',error instanceof Error?error.message:'unknown failure'));
});
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>server.close(()=>process.exit(0)));
