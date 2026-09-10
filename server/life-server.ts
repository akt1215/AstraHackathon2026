import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { LifeProvider } from '../shared/life-types';
import { LifeError, LifeSimulation, type ReactionDecision, type TalkRequest } from '../shared/life/simulation';
import { LifeModel } from './life-model';
import { envelopeSchema } from './life-schema';
import { LifeStore } from './life-store';

interface ModelRuntime { info(): LifeProvider; react(request: TalkRequest): Promise<ReactionDecision> }
interface ServerOptions { dataFile?: string; dist?: string; model?: ModelRuntime; ticking?: boolean }
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
function json(response: ServerResponse, status: number, value: unknown): void { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); response.end(JSON.stringify(value)); }
async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of request) { const buffer = Buffer.from(chunk); bytes += buffer.length; if (bytes > 8192) throw new LifeError('Command exceeds the request size limit.', 413); chunks.push(buffer); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new LifeError('Send a valid JSON command.'); }
}
export function createLifeServer(options: ServerOptions = {}) {
  const model = options.model ?? new LifeModel();
  const store = new LifeStore(resolve(options.dataFile ?? process.env.LIFE_DATA_FILE ?? 'data/life-session.json'));
  const sim = new LifeSimulation(store.load()); sim.provider(model.info());
  const dist = resolve(options.dist ?? 'dist-life');
  let persistenceError: string | null = null, lastSaved = performance.now(), closed = false;
  const save = () => { store.save(sim.snapshot()); persistenceError = null; lastSaved = performance.now(); };
  save();
  function pendingReplies(): void {
    for (const request of sim.takeTalkRequests()) {
      void model.react(request).then(decision => { if (!closed) sim.applyReaction(request, decision); }).catch(error => {
        if (!closed) sim.failReaction(request, error instanceof Error ? error.message : 'The resident could not respond. Direct activities still work.');
      }).finally(() => {
        if (closed) return;
        sim.provider(model.info());
        try { save(); } catch { persistenceError = 'The latest change could not be saved. Check available disk space and save permissions.'; }
      });
    }
    sim.provider(model.info());
  }
  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method === 'POST' && request.headers.origin) {
      let origin: URL; try { origin = new URL(request.headers.origin); } catch { throw new LifeError('Invalid browser origin.', 403); }
      const address = server.address(); const serverPort = address && typeof address !== 'string' ? String(address.port) : String(process.env.LIFE_PORT ?? 8791);
      if (!['http:'].includes(origin.protocol) || !['localhost', '127.0.0.1'].includes(origin.hostname) || ![serverPort, '5175'].includes(origin.port)) throw new LifeError('This browser origin cannot change the local life simulation.', 403);
    }
    if (path === '/api/life/state' && request.method === 'GET') { sim.provider(model.info()); json(response, 200, { state: sim.state() }); return; }
    if (path === '/api/life/health' && request.method === 'GET') { json(response, persistenceError ? 503 : 200, { ok: !persistenceError, provider: model.info(), persistenceError }); return; }
    if (path === '/api/life/command' && request.method === 'POST') {
      const envelope = envelopeSchema.parse(await body(request));
      if (envelope.command.kind === 'talk' && model.info().busy && !sim.commandRecorded(envelope.requestId)) throw new LifeError('A resident is already considering your last words. Other activities still work.', 409);
      const result = sim.command(envelope);
      save(); pendingReplies();
      json(response, 200, { ...result, state: sim.state() }); return;
    }
    if (path.startsWith('/api/')) { json(response, 404, { error: 'Unknown life endpoint.' }); return; }
    if (request.method !== 'GET' && request.method !== 'HEAD') { json(response, 405, { error: 'Method not supported.' }); return; }
    const requested = resolve(dist, `.${decodeURIComponent(path)}`);
    if (requested !== dist && !requested.startsWith(dist + sep)) throw new LifeError('Invalid file path.');
    let file = requested;
    try { if (!(await stat(file)).isFile()) file = resolve(dist, 'life.html'); }
    catch { if (extname(path)) { json(response, 404, { error: 'Asset not found.' }); return; } file = resolve(dist, 'life.html'); }
    try { const bytes = await readFile(file); response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'x-content-type-options': 'nosniff', 'cache-control': 'no-cache' }); response.end(request.method === 'HEAD' ? undefined : bytes); }
    catch { json(response, 503, { error: 'Build the life client, or open the Vite life page on port 5175.' }); }
  }
  const server = createServer((request, response) => { void handle(request, response).catch(error => {
    if (response.headersSent) { response.end(); return; }
    const status = error instanceof LifeError ? error.status : error instanceof z.ZodError ? 400 : 500;
    const message = error instanceof LifeError ? error.message : error instanceof z.ZodError ? 'That life command is invalid.' : 'The change could not be completed. Check the local server and save storage.';
    json(response, status, { error: message, state: sim.state() });
  }); });
  let previous = performance.now();
  const timer = options.ticking === false ? null : setInterval(() => {
    const now = performance.now(), dt = Math.min(.25, (now - previous) / 1000); previous = now;
    sim.tick(dt); sim.provider(model.info());
    if (now - lastSaved >= 1000) { try { save(); } catch { persistenceError = 'The latest change could not be saved. Check available disk space and save permissions.'; lastSaved = now; } }
  }, 100);
  async function close(): Promise<void> { closed = true; if (timer) clearInterval(timer); save(); await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose())); }
  return { server, sim, close };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = createLifeServer(); const port = Number(process.env.LIFE_PORT ?? 8791);
  app.server.listen(port, '127.0.0.1', () => console.log(`Life simulation: http://127.0.0.1:${port} (${app.sim.state().provider.name}, ${app.sim.state().provider.model})`));
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void app.close().then(() => process.exit(0)).catch(() => process.exit(1)); });
}
