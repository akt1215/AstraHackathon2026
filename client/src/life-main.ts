import type { ActivityKind, LifeCommand, LifeObject, LifeResident, LifeResponse, LifeState, LifeTheme } from '../../shared/life-types';
import { HURT_THRESHOLD } from '../../shared/life/harm';
import { createLifeScene } from './life-scene';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './life-style.css';

const shapes: Record<string, string> = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/>',
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  leaf: '<path d="M5 20C2 8 8 3 21 3c0 12-5 17-13 14M4 21 16 9"/>',
  heart: '<path d="M12 21 3.7 13a5.5 5.5 0 0 1 8.3-7 5.5 5.5 0 0 1 8.3 7Z"/>',
  food: '<path d="M5 3v7m3-7v7M3 3v5a3.5 3.5 0 0 0 7 0V3M6.5 12v9M17 3c-4 4-4 8 0 8V3Zm0 8v10"/>',
  energy: '<path d="m13 2-8 12h6l-1 8 9-13h-6Z"/>',
  fun: '<path d="M7 7h10c4 0 5 11 2 12-2 1-4-3-4-3H9s-2 4-4 3C2 18 3 7 7 7Z"/><path d="M7 10v4m-2-2h4m6-1h.1m2 3h.1"/>',
  chat: '<path d="M20 14a3 3 0 0 1-3 3H9l-5 4V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z"/><path d="M8 8h8M8 12h5"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  fast: '<path d="m3 5 9 7-9 7Zm9 0 9 7-9 7Z"/>',
  camera: '<path d="M3 7h5l2-3h4l2 3h5v13H3Z"/><circle cx="12" cy="13" r="4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1"/>',
  reset: '<path d="M3 5v6h6M4 10a8 8 0 1 1 1 8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  bed: '<path d="M3 5v15m18-9v9M3 16h18M3 9h5v7m0-5h10a3 3 0 0 1 3 3"/>',
  paint: '<path d="m13 4 7-1-1 7-8 8-5-5ZM6 13c-5 0-1 6-5 8 7 1 11-2 10-5"/>',
  coffee: '<path d="M4 7h12v8a5 5 0 0 1-10 0V7m10 1h2a3 3 0 0 1 0 6h-2M3 22h16M7 2v2m5-2v2"/>',
  hand: '<path d="M4 13h6l3-3a2 2 0 0 1 3 2l-3 3h-3m3 0 6-4a2 2 0 0 1 3 2l-6 6H8l-4-2M1 12h3v8H1"/>',
  queue: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.1M3 12h.1M3 18h.1"/>',
};
const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${shapes[name] ?? shapes.leaf}</svg>`;
const esc = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const themes: Record<LifeTheme, { name: string; place: string; description: string; icon: string }> = {
  loft: { name: 'City loft', place: 'NEW YORK · THE LOFT', description: 'Warm light, familiar streets, a place to call yours.', icon: 'home' },
  lantern: { name: 'Lantern house', place: 'A HOUSE BETWEEN WORLDS', description: 'An original spirit-world home, softly lit by lanterns.', icon: 'leaf' },
  comic: { name: 'Skyline studio', place: 'LIFE IN FULL COLOR', description: 'An original comic-book city with a bolder everyday.', icon: 'sun' },
};
const actionInfo: Record<ActivityKind, { name: string; icon: string; hint: string }> = {
  walk: { name: 'Go here', icon: 'arrow', hint: 'Stretch your legs' },
  eat: { name: 'Make a snack', icon: 'food', hint: 'Restore hunger' },
  sleep: { name: 'Get some sleep', icon: 'bed', hint: 'Restore energy' },
  relax: { name: 'Unwind', icon: 'sun', hint: 'A little energy and fun' },
  read: { name: 'Read a chapter', icon: 'book', hint: 'Feed your curiosity' },
  paint: { name: 'Paint something', icon: 'paint', hint: 'Make time for creativity' },
  water: { name: 'Tend the plants', icon: 'leaf', hint: 'A small moment of calm' },
  coffee: { name: 'Brew a coffee', icon: 'coffee', hint: 'A little energy boost' },
  chat: { name: 'Catch up', icon: 'chat', hint: 'Spend a moment together' },
  share: { name: 'Share a meal', icon: 'food', hint: 'Food tastes better together' },
  compliment: { name: 'Give a compliment', icon: 'heart', hint: 'Make their day a little brighter' },
  apologize: { name: 'Make amends', icon: 'hand', hint: 'Acknowledge what happened' },
  insult: { name: 'Say something unkind', icon: 'chat', hint: 'This may hurt your relationship' },
};

$('#life-app').innerHTML = `
  <canvas id="world-canvas" aria-label="Interactive 3D home. Click the floor to walk, objects to use them, and people to interact." tabindex="0"></canvas>
  <div class="world-vignette"></div><div id="speech-layer" aria-hidden="true"></div>
  <header class="topbar">
    <div class="brand"><div class="brand-mark">${icon('leaf')}</div><div><span class="wordmark">elsewhere<span class="brand-dot">.</span></span><span class="brand-tagline">a life of your own</span></div></div>
    <button id="world-button" class="world-button glass" aria-expanded="false"><span id="world-icon">${icon('home')}</span><span><small>YOUR WORLD</small><strong id="world-name">City loft</strong></span>${icon('arrow','chevron-down')}</button>
    <div class="clock glass"><span id="day-label">Day 1</span><strong id="clock-time">4:20 PM</strong><span class="clock-divider"></span><div class="speed-buttons" role="group" aria-label="Simulation speed"><button data-speed="0" aria-label="Pause">${icon('pause')}</button><button data-speed="1" class="active" aria-label="Normal speed">${icon('play')}</button><button data-speed="3" aria-label="Three times speed">${icon('fast')}</button></div></div>
    <div class="top-tools"><button id="camera-button" class="icon-button glass" title="Switch to follow camera" aria-label="Switch to follow camera">${icon('camera')}</button><button id="appearance-button" class="icon-button glass" title="Switch interface theme" aria-label="Switch interface theme">${icon('moon')}</button><button id="help-button" class="icon-button glass" title="How to play" aria-label="How to play">${icon('help')}</button></div>
  </header>
  <section id="world-menu" class="world-menu glass hidden" aria-label="Choose a world preset"><div class="panel-heading"><span>Somewhere new</span><small>AUTHORED WORLD PRESETS</small></div>${Object.entries(themes).map(([id,t])=>`<button data-theme="${id}" class="world-option"><div class="world-thumbnail ${id}">${icon(t.icon)}</div><span><strong>${t.name}</strong><small>${t.description}</small></span>${icon('arrow')}</button>`).join('')}<p>Same life. A different atmosphere. Your relationships and memories stay with you.</p></section>
  <div class="place-caption"><span id="place-label">NEW YORK · THE LOFT</span><h1>Make yourself<br><em>at home.</em></h1><p id="place-subtitle">Little moments make a life.</p></div>
  <button id="interface-button" class="interface-button glass" aria-label="Hide interface" title="Hide interface · H">${icon('eye')}<span>Hide interface</span><kbd>H</kbd></button>
  <button id="restore-interface" class="restore-interface glass" aria-label="Show interface">${icon('eye')}<span>Show interface</span><kbd>H</kbd></button>
  <section class="life-feed" aria-label="Recent moments"><div class="feed-heading"><span class="live-dot"></span> LIFE, LATELY</div><div id="recent-events"><p class="feed-empty">Your story is just beginning.</p></div></section>
  <section class="resident-panel glass" aria-label="Your resident"><div class="resident-header"><button id="player-focus" class="portrait portrait-player" aria-label="Focus on your resident"><span class="avatar-face"></span></button><div class="resident-name"><small>YOUR RESIDENT</small><h2 id="player-name">You</h2><span id="player-mood" class="mood">Feeling at home</span><div id="player-traits" class="trait-list compact"></div></div><button id="household-button" class="quiet-button" aria-label="Activities in your home" title="Activities in your home">${icon('home')}</button><button id="resident-focus" class="quiet-button" aria-label="Focus camera on your resident" title="Find your resident">${icon('target')}</button></div><div id="needs" class="needs">${(['hunger','energy','social','fun'] as const).map(n=>`<div class="need"><div class="need-label">${icon(n==='hunger'?'food':n==='social'?'heart':n)}<span>${n[0].toUpperCase()+n.slice(1)}</span><b id="need-value-${n}">—</b></div><div class="need-track"><div id="need-bar-${n}" class="need-fill ${n}"></div></div></div>`).join('')}</div><div class="activity-line"><span id="activity-icon">${icon('leaf')}</span><div><strong id="activity-label">Taking it all in</strong><div class="activity-track"><div id="activity-progress"></div></div></div><button id="cancel-activity" class="quiet-button" aria-label="Cancel activity" title="Cancel activity">${icon('close')}</button></div><div id="activity-queue" class="activity-queue"></div></section>
  <div class="bottom-center"><div id="input-hint" class="controls-hint"><span>Click to walk</span><i>·</i><span>WASD to move</span><i>·</i><span>Drag to orbit</span></div><div id="save-status" class="save-status">${icon('check')} Your life saves automatically</div></div>
  <section id="people-panel" class="people-panel glass" aria-label="People in your world"><div class="panel-heading"><span>Your little circle</span><small id="people-count">2 HOUSEMATES</small></div><div id="people-list"></div><button id="journal-button" class="journal-button">${icon('book')} Memories & relationships ${icon('arrow')}</button></section>
  <section id="context-panel" class="context-panel glass hidden" aria-label="Interaction options"></section>
  <div id="provider-badge" class="provider-badge" title="Simulation and model status"><span class="live-dot"></span><span>Connecting to your world…</span></div>
  <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
  <div id="loading" class="loading"><div class="loading-symbol">${icon('leaf')}</div><h2>A little world, just for you.</h2><p id="loading-message">Opening the doors…</p></div>
  <dialog id="help-dialog" class="modal"><button class="modal-close icon-button" aria-label="Close">${icon('close')}</button><span class="eyebrow">WELCOME HOME</span><h2>Life happens in<br>the little moments.</h2><p>Look after your needs, spend time with your housemates, and see how your choices shape their next move.</p><div class="help-grid"><div>${icon('target')}<strong>Find your way</strong><span>Click the floor or use WASD. Drag the scene to orbit; scroll to zoom.</span></div><div>${icon('coffee')}<strong>Make time for yourself</strong><span>Click furniture to eat, rest, read, paint, or tend a plant. Shift-click an action to queue it.</span></div><div>${icon('heart')}<strong>Get to know people</strong><span>Click a housemate to interact. Kindness and conflict leave memories.</span></div><div>${icon('energy')}<strong>Set your own pace</strong><span>Pause or speed up time. Housemates have needs and make their own choices.</span></div></div><p class="model-note">The provider badge shows which model is connected. Routine activities work without a model; free-text reactions require a connected provider.</p><button id="start-playing" class="primary-button">Make yourself at home ${icon('arrow')}</button><button id="reset-button" class="reset-button">${icon('reset')} Start a fresh life</button></dialog>
  <dialog id="household-dialog" class="modal household-modal"><button class="modal-close icon-button" aria-label="Close">${icon('close')}</button><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>A moment for you.</h2><div id="household-list" class="household-list"></div></dialog>
  <dialog id="journal-dialog" class="modal journal-modal"><button class="modal-close icon-button" aria-label="Close">${icon('close')}</button><span class="eyebrow">THE WORLD REMEMBERS</span><h2>Little moments.<br>Lasting impressions.</h2><div id="journal-content"></div></dialog>
`;

let state: LifeState | null = null;
let selection: { type: 'object' | 'resident'; id: string } | null = null;
let contextSignature = '';
let cameraMode: 'orbit' | 'follow' = 'orbit';
let lastEventSignature = '';
let lastPeopleSignature = '';
let pending = 0;
let talkPending = false;
let stopped = false;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let movePending = false;
let persistenceError: string | null = null;
let polls = 0;
let paintedTraits = '';
/** Traits the world assigns for conduct, highlighted so an earned reputation is unmissable. */
const EARNED_TRAITS = ['Callous', 'Violent'];
let visualsReady = false;
let controlsReady = false;
const canvas = $<HTMLCanvasElement>('#world-canvas');
for (const element of $('#life-app').children) if (element instanceof HTMLElement && element.id !== 'loading') element.inert = true;
$('#life-app').setAttribute('aria-busy', 'true');
function revealLife() {
  if (!state || !visualsReady || controlsReady) return;
  controlsReady = true;
  for (const element of $('#life-app').children) if (element instanceof HTMLElement) element.inert = false;
  $('#life-app').setAttribute('aria-busy', 'false');
  $('#loading').classList.add('hidden');
}
let scene: ReturnType<typeof createLifeScene>;
try {
  scene = createLifeScene(canvas, {
    onObject: id => select('object', id),
    onResident: id => { if (id === 'player') { scene.focusResident(id); closeContext(); } else select('resident', id); },
    onGround: point => { closeContext(); void command({ kind: 'walk', ...point }, true); },
  });
} catch (error) {
  $('#loading-message').textContent = `The 3D scene could not start: ${error instanceof Error ? error.message : 'WebGL is unavailable.'}`;
  throw error;
}
void scene.ready.then(result => {
  visualsReady = true;
  revealLife();
  if (result.degraded) toast('Some visual assets could not load. Your life still works; refresh to retry.');
}).catch(() => {
  visualsReady = true;
  revealLife();
  toast('The room could not finish loading all visual details. Refresh to retry.');
});

function toast(message: string) {
  const el = $('#toast'); el.textContent = message; el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 4400);
}
function closeContext() { selection = null; contextSignature = ''; $('#context-panel').classList.add('hidden'); $('#people-panel').classList.remove('hidden'); }
function setInterfaceVisible(visible: boolean) {
  document.body.classList.toggle('interface-hidden', !visible);
  if (!visible) {
    closeContext();
    $('#world-menu').classList.add('hidden');
    $('#world-button').setAttribute('aria-expanded', 'false');
    canvas.focus();
  }
}
function select(type: 'object' | 'resident', id: string) { setInterfaceVisible(true); selection = { type, id }; contextSignature = ''; $('#world-menu').classList.add('hidden'); renderContext(); }
function relationName(value: number) { return value >= 45 ? 'Close friends' : value >= 20 ? 'Getting closer' : value >= 0 ? 'Getting acquainted' : value >= -25 ? 'Some tension' : 'A strained connection'; }
function portrait(r: LifeResident, size = '') { return `<span class="portrait ${size}" style="--shirt:${esc(r.color)};--skin:${esc(r.skin)};--hair:${esc(r.hair)}"><span class="avatar-face"></span></span>`; }

async function command(cmd: LifeCommand, quiet = false) {
  if (!state || !visualsReady) return false;
  const worldId = state.id;
  pending++;
  try {
    const response = await fetch('/api/life/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ worldId, requestId: crypto.randomUUID(), command: cmd }), signal: AbortSignal.timeout(16000) });
    const body = await response.json() as LifeResponse & { error?: string };
    if (!response.ok) throw new Error(body.error ?? body.message ?? 'That action could not finish.');
    if (body.state && (state?.id === worldId || cmd.kind === 'reset')) acceptState(body.state);
    if (!quiet && body.message) toast(body.message);
    return true;
  } catch (error) { toast(error instanceof Error ? error.message : 'Could not reach your world.'); return false; }
  finally { pending--; }
}

function acceptState(next: LifeState) {
  if (state && next.id === state.id && next.version < state.version) return;
  if (state && next.id !== state.id) { closeContext(); lastEventSignature = ''; lastPeopleSignature = ''; }
  state = next;
  scene.update(next);
  if (visualsReady) revealLife();
  else $('#loading-message').textContent = 'Bringing your home to life…';
  const player = next.residents.find(r => r.role === 'player');
  if (!player) return;
  $('#player-name').textContent = player.name;
  $('#player-mood').textContent = player.mood || 'Feeling at home';
  $('#player-mood').classList.toggle('mood-harmed', EARNED_TRAITS.some(trait => player.traits.includes(trait)));
  const shownTraits = player.traits.join('|');
  if (shownTraits !== paintedTraits) {
    paintedTraits = shownTraits;
    $('#player-traits').innerHTML = player.traits.map(t => `<span class="${EARNED_TRAITS.includes(t) ? 'trait-earned' : ''}">${esc(t)}</span>`).join('');
  }
  $('#player-focus').style.setProperty('--shirt', player.color);
  $('#player-focus').style.setProperty('--skin', player.skin);
  $('#player-focus').style.setProperty('--hair', player.hair);
  for (const key of ['hunger','energy','social','fun'] as const) {
    const value = Math.round(Math.max(0, Math.min(100, player.needs[key])));
    $(`#need-value-${key}`).textContent = `${value}`;
    const bar = $(`#need-bar-${key}`); bar.style.width = `${value}%`; bar.classList.toggle('low', value < 25);
  }
  $('#day-label').textContent = `Day ${next.day}`;
  const hour = ((next.hour % 24) + 24) % 24;
  $('#clock-time').textContent = `${hour % 12 || 12}:${String(Math.floor(next.minute)).padStart(2,'0')} ${hour < 12 ? 'AM' : 'PM'}`;
  document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => { b.classList.toggle('active', Number(b.dataset.speed) === next.speed); b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === next.speed)); });
  const theme = themes[next.theme]; $('#world-name').textContent = theme.name; $('#place-label').textContent = theme.place;
  $('#world-icon').innerHTML = icon(theme.icon);
  document.body.dataset.world = next.theme;
  const a = player.activity;
  $('#activity-label').textContent = a ? a.label : 'Taking it all in';
  $('#activity-icon').innerHTML = icon(a ? actionInfo[a.kind]?.icon ?? 'leaf' : 'leaf');
  $('#activity-progress').style.width = a && a.phase === 'doing' ? `${Math.min(100, (a.elapsed / Math.max(a.duration, .1)) * 100)}%` : '0%';
  $<HTMLButtonElement>('#cancel-activity').disabled = !a && player.queue.length === 0;
  $('#activity-queue').innerHTML = player.queue.length ? `${icon('queue')} ${player.queue.map(q=>`<span title="${esc(q.label)}">${icon(actionInfo[q.kind]?.icon ?? 'leaf')}</span>`).join('')}<small>${player.queue.length} queued</small>` : '';
  const provider = next.provider;
  const badge = $('#provider-badge');
  badge.classList.toggle('disconnected', !provider.available || Boolean(provider.error));
  badge.classList.toggle('thinking', provider.busy);
  badge.querySelector('span:last-child')!.textContent = provider.busy ? `${provider.name} is considering a response…` : provider.error ? `${provider.name} · last reply unavailable` : provider.available ? `${provider.name}${provider.model ? ` · ${provider.model}` : ''}` : 'Local simulation · model not connected';
  badge.title = provider.error ?? `${provider.calls} model calls${provider.lastLatencyMs === null ? '' : ` · last response ${(provider.lastLatencyMs/1000).toFixed(1)}s`}`;
  renderPeople(); renderEvents(); renderContext();
}

function renderPeople() {
  if (!state) return;
  const people = state.residents.filter(r=>r.role==='npc');
  const signature = JSON.stringify(people.map(r=>[r.id,r.name,r.mood,r.activity?.label,r.relationships.player,r.color,r.skin,r.hair,r.hurt>HURT_THRESHOLD]));
  if (signature === lastPeopleSignature) return;
  lastPeopleSignature = signature;
  $('#people-count').textContent = `${people.length} HOUSEMATES`;
  $('#people-list').innerHTML = people.map(r=>`<button class="person-row" data-person="${esc(r.id)}">${portrait(r,'small')}<span><strong>${esc(r.name)}</strong><small>${esc(r.activity?.label ?? r.mood)}</small></span>${r.hurt>HURT_THRESHOLD?`<span class="hurt-badge" title="Injured because of you">Hurt</span>`:''}<span class="relationship-mini ${r.relationships.player < 0 ? 'strained' : ''}" title="${esc(relationName(r.relationships.player ?? 0))}">${icon('heart')}</span></button>`).join('');
  $('#people-list').querySelectorAll<HTMLButtonElement>('[data-person]').forEach(b=>b.addEventListener('click',()=>select('resident',b.dataset.person!)));
}

function renderEvents() {
  if (!state) return;
  const list = state.events.slice(-3).reverse();
  const sig = list.map(e=>e.id).join();
  if (sig === lastEventSignature) return;
  lastEventSignature = sig;
  $('#recent-events').innerHTML = list.length ? list.map(e=>`<div class="feed-item"><span class="feed-icon">${icon(/social|chat|compliment|share|insult|apolog|reaction/.test(e.kind)?'heart':'leaf')}</span><p>${esc(e.text)}</p></div>`).join('') : '<p class="feed-empty">Your story is just beginning.</p>';
}

function renderContext() {
  if (!state || !selection) return;
  const target: LifeObject | LifeResident | undefined = selection.type==='object' ? state.objects.find(o=>o.id===selection!.id) : state.residents.find(r=>r.id===selection!.id);
  if (!target) { closeContext(); return; }
  const signature = `${selection.type}:${selection.id}:${state.id}`;
  if (signature === contextSignature) {
    if (selection.type === 'resident') {
      const r = target as LifeResident;
      const val = r.relationships.player ?? 0;
      $('#context-relation').textContent = relationName(val);
      $('#relationship-progress').style.width = `${(val + 100) / 2}%`;
      const player = state.residents.find(r=>r.role==='player')!;
      const near = Math.hypot(player.x-r.x, player.z-r.z) <= 3;
      $('#talk-hint').textContent = state.provider.busy ? 'A response is on its way. Life keeps moving.' : !near ? 'Move closer for a free-text conversation.' : !state.provider.available ? 'Connect a model for free-text reactions.' : 'Say it your way. They will remember.';
      $<HTMLButtonElement>('#send-talk').disabled = talkPending || !near || !state.provider.available || state.provider.busy;
    } else {
      const o = target as LifeObject;
      $('#object-status').textContent = o.occupiedBy && o.occupiedBy !== 'player' ? `${state.residents.find(r=>r.id===o.occupiedBy)?.name ?? 'Someone'} is using this` : 'A moment for yourself';
    }
    return;
  }
  contextSignature = signature;
  $('#context-panel').classList.remove('hidden'); $('#people-panel').classList.add('hidden');
  if (selection.type === 'object') {
    const o = target as LifeObject;
    $('#context-panel').innerHTML = `<div class="context-heading"><span class="object-emblem">${icon(actionInfo[o.actions[0]]?.icon??'home')}</span><div><small>A LITTLE EVERYDAY RITUAL</small><h2>${esc(o.name)}</h2></div><button id="close-context" class="quiet-button" aria-label="Close interactions">${icon('close')}</button></div><p id="object-status" class="context-subtitle">A moment for yourself</p><div class="action-list">${o.actions.map(a=>`<button class="action-option" data-action="${a}">${icon(actionInfo[a]?.icon??'leaf')}<span><strong>${esc(actionInfo[a]?.name??a)}</strong><small>${esc(actionInfo[a]?.hint??'')}</small></span>${icon('arrow')}</button>`).join('')}</div><p class="queue-hint">Hold Shift while choosing to add to your queue.</p>`;
    $('#context-panel').querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',e=>{ void command({kind:'use',objectId:o.id,action:b.dataset.action as ActivityKind,queue:e.shiftKey},true); }));
  } else {
    const r = target as LifeResident;
    $('#context-panel').innerHTML = `<div class="context-heading">${portrait(r)}<div><small>YOUR HOUSEMATE</small><h2>${esc(r.name)}</h2></div><button id="close-context" class="quiet-button" aria-label="Close interactions">${icon('close')}</button></div><div class="trait-list">${r.traits.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${r.hurt>HURT_THRESHOLD?`<p class="hurt-note">${esc(r.name)} is hurt and does not want you near them.</p>`:''}<div class="relationship-line">${icon('heart')}<span id="context-relation">${esc(relationName(r.relationships.player??0))}</span></div><div class="relationship-track"><div id="relationship-progress" style="width:${((r.relationships.player??0)+100)/2}%"></div></div><div class="social-actions">${(['chat','share','compliment','apologize','insult'] as const).map(a=>`<button class="social-action ${a==='insult'?'risky':''}" data-social="${a}" title="${esc(actionInfo[a].hint)}">${icon(actionInfo[a].icon)}${esc(actionInfo[a].name)}</button>`).join('')}</div><form id="talk-form" class="talk-form"><label for="talk-input">Or say something of your own</label><div class="talk-input-wrap"><input id="talk-input" maxlength="500" autocomplete="off" placeholder="What’s on your mind?"/><button id="send-talk" type="submit" aria-label="Send message">${icon('arrow')}</button></div><small id="talk-hint">Say it your way. They will remember.</small></form>`;
    $('#context-panel').querySelectorAll<HTMLButtonElement>('[data-social]').forEach(b=>b.addEventListener('click',e=>{ void command({kind:'social',targetId:r.id,action:b.dataset.social as 'chat',queue:e.shiftKey},true); }));
    $('#talk-form').addEventListener('submit', e=>{
      e.preventDefault();
      const input=$<HTMLInputElement>('#talk-input'); const text=input.value.trim();
      if (!text || talkPending || $<HTMLButtonElement>('#send-talk').disabled) return;
      const originalValue=input.value; const worldId=state?.id;
      talkPending=true; $<HTMLButtonElement>('#send-talk').disabled=true;
      void command({kind:'talk',targetId:r.id,text}).then(ok=>{
        if(ok && input.isConnected && input.value===originalValue && state?.id===worldId)input.value='';
      }).finally(()=>{talkPending=false;renderContext();});
    });
  }
  $('#close-context').addEventListener('click',closeContext);
  renderContext();
}

function renderJournal() {
  if (!state) return;
  $('#journal-content').innerHTML = state.residents.map(r=>`<section class="journal-resident"><div class="journal-person">${portrait(r,'small')}<div><h3>${esc(r.name)}</h3><p>${esc(r.aspiration)}</p></div></div><div class="trait-list">${r.traits.map(t=>`<span>${esc(t)}</span>`).join('')}</div>${r.memories.length?r.memories.slice(-8).reverse().map(m=>`<p class="memory-item">${icon('leaf')}<span>${esc(m.text)}</span></p>`).join(''):'<p class="empty-memories">A fresh start. Shared moments will appear here.</p>'}</section>`).join('');
}

document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b=>b.addEventListener('click',()=>void command({kind:'speed',speed:Number(b.dataset.speed) as 0|1|3},true)));
$('#world-button').addEventListener('click',()=>{const menu=$('#world-menu'); menu.classList.toggle('hidden'); $('#world-button').setAttribute('aria-expanded',String(!menu.classList.contains('hidden')));});
document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b=>b.addEventListener('click',()=>{void command({kind:'theme',theme:b.dataset.theme as LifeTheme},true); $('#world-menu').classList.add('hidden'); $('#world-button').setAttribute('aria-expanded','false');}));
$('#appearance-button').addEventListener('click',()=>{document.body.classList.toggle('dark-ui'); $('#appearance-button').innerHTML=icon(document.body.classList.contains('dark-ui')?'sun':'moon');});
$('#interface-button').addEventListener('click',()=>setInterfaceVisible(false));
$('#restore-interface').addEventListener('click',()=>setInterfaceVisible(true));
$('#camera-button').addEventListener('click',()=>{cameraMode=cameraMode==='orbit'?'follow':'orbit'; scene.setCamera(cameraMode); const label=`Switch to ${cameraMode==='orbit'?'follow':'orbit'} camera`; $('#camera-button').setAttribute('aria-label',label); $('#camera-button').title=label; toast(cameraMode==='follow'?'Following your resident':'Orbit camera · drag to look around');});
$('#player-focus').addEventListener('click',()=>scene.focusResident('player'));
$('#resident-focus').addEventListener('click',()=>scene.focusResident('player'));
$('#cancel-activity').addEventListener('click',()=>void command({kind:'cancel'},true));
$('#help-button').addEventListener('click',()=> $<HTMLDialogElement>('#help-dialog').showModal());
$('#start-playing').addEventListener('click',()=> $<HTMLDialogElement>('#help-dialog').close());
$('#household-button').addEventListener('click',()=>{
  if(!state)return;
  $('#household-list').innerHTML=state.objects.map(o=>`<button class="action-option" data-household-object="${esc(o.id)}">${icon(actionInfo[o.actions[0]]?.icon??'home')}<span><strong>${esc(o.name)}</strong><small>${esc(o.actions.map(a=>actionInfo[a]?.name??a).join(' · '))}</small></span>${icon('arrow')}</button>`).join('');
  $('#household-list').querySelectorAll<HTMLButtonElement>('[data-household-object]').forEach(b=>b.addEventListener('click',()=>{
    $<HTMLDialogElement>('#household-dialog').close();select('object',b.dataset.householdObject!);
    $('#context-panel').querySelector<HTMLButtonElement>('[data-action]')?.focus();
  }));
  $<HTMLDialogElement>('#household-dialog').showModal();
});
$('#journal-button').addEventListener('click',()=>{renderJournal(); $<HTMLDialogElement>('#journal-dialog').showModal();});
document.querySelectorAll<HTMLButtonElement>('.modal-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog')!.close()));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#reset-button').addEventListener('click',()=>{
  const button=$<HTMLButtonElement>('#reset-button');
  if (button.dataset.confirm !== 'yes') { button.dataset.confirm='yes'; button.textContent='Start fresh? This replaces this life’s save. Click again.'; setTimeout(()=>{button.dataset.confirm='';button.innerHTML=`${icon('reset')} Start a fresh life`;},6000);return; }
  button.dataset.confirm='';$<HTMLDialogElement>('#help-dialog').close();void command({kind:'reset'});
});

const heldKeys=new Set<string>();
document.addEventListener('focusin',e=>{if((e.target as HTMLElement).closest('input,textarea,button,dialog'))heldKeys.clear();});
window.addEventListener('keydown',e=>{
  if ((e.target as HTMLElement).closest('input,textarea,select,dialog') || document.querySelector('dialog[open]')) return;
  const key=e.key.toLowerCase();
  if (key === 'h') { if(!e.repeat)setInterfaceVisible(document.body.classList.contains('interface-hidden')); e.preventDefault(); return; }
  if(e.key==='Escape'){setInterfaceVisible(true);closeContext();$('#world-menu').classList.add('hidden');$('#world-button').setAttribute('aria-expanded','false');return;}
  if ((e.target as HTMLElement).closest('button')) return;
  if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {heldKeys.add(key);e.preventDefault();if(!e.repeat)moveOneStep();}
});
window.addEventListener('keyup',e=>heldKeys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>heldKeys.clear());
function moveOneStep(){
  if (!state || !visualsReady || movePending || !heldKeys.size || state.speed===0) return;
  const p=state.residents.find(r=>r.role==='player');if(!p)return;
  let x=0,z=0;
  if(heldKeys.has('w')||heldKeys.has('arrowup'))z-=1;
  if(heldKeys.has('s')||heldKeys.has('arrowdown'))z+=1;
  if(heldKeys.has('a')||heldKeys.has('arrowleft'))x-=1;
  if(heldKeys.has('d')||heldKeys.has('arrowright'))x+=1;
  if(!x&&!z)return;
  const movement=scene.movementDirection(x,z);
  movePending=true;
  void command({kind:'walk',x:Math.max(.5,Math.min(state.width-.5,p.x+movement.x*1.4)),z:Math.max(.5,Math.min(state.depth-.5,p.z+movement.z*1.4))},true).finally(()=>{movePending=false;});
}
setInterval(moveOneStep,240);

let lastSpeechPaint=0;
function paintSpeech(t:number){
  if(stopped)return;
  if(state && t-lastSpeechPaint>90){
    lastSpeechPaint=t;
    const layer=$('#speech-layer');
    for(const r of state.residents){
      let bubble=document.getElementById(`speech-${r.id}`);
      const active=!!r.speech && r.speechUntil>state.elapsed;
      const pos=scene.projectResident(r.id);
      if(!active||!pos?.visible){bubble?.remove();continue;}
      if(!bubble){bubble=document.createElement('div');bubble.id=`speech-${r.id}`;bubble.className='speech-bubble';layer.append(bubble);}
      bubble.textContent=r.speech;
      bubble.style.left=`${pos.x}px`;bubble.style.top=`${pos.y}px`;
    }
  }
  requestAnimationFrame(paintSpeech);
}
requestAnimationFrame(paintSpeech);

async function poll(){
  if(stopped)return;
  const requestedWorldId=state?.id;
  try {
    const response=await fetch('/api/life/state',{cache:'no-store',signal:AbortSignal.timeout(4000)});
    if(!response.ok)throw new Error('The local world is not responding.');
    const data=await response.json() as LifeState|{state:LifeState};
    if(requestedWorldId && state && requestedWorldId!==state.id)return;
    acceptState('state' in data?data.state:data);
    if(polls++ % 20 === 0){
      try {
        const health=await fetch('/api/life/health',{cache:'no-store',signal:AbortSignal.timeout(2500)});
        const result=await health.json() as {persistenceError?:string|null};
        persistenceError=result.persistenceError??null;
      }catch{persistenceError='Save status could not be verified.';}
    }
    if(persistenceError)$('#save-status').textContent=persistenceError;
    else $('#save-status').innerHTML=`${icon('check')} Your life saves automatically`;
  }catch(error){
    if(!state)$('#loading-message').textContent='Waiting for the local game server on port 8791…';
    else $('#save-status').textContent='Connection interrupted · reconnecting';
  }finally{if(!stopped)setTimeout(()=>void poll(),pending?320:150);}
}
void poll();
window.addEventListener('beforeunload',()=>{stopped=true;scene.dispose();});
