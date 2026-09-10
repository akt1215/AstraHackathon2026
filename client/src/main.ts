import type { ActionResponse, ProviderInfo, PublicState } from '../../shared/types';
import { ActionRequests, type PlayerIntent } from './action-requests';
import { DEFAULT_APPEARANCE, type Appearance } from '../../shared/appearance';
import { guidance, journalEntries, objectArt, pixelTraveler } from './presentation';
import { GameSound } from './sound';
import { installCharacterEditor } from './character-editor';
import { belongsToCurrentWorld } from './world-response';
import './style.css';

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};
const escape = (value: unknown): string => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const app = $('#app');
app.innerHTML = `
  <header class="masthead">
    <a class="brand" href="/" aria-label="The DM Is Real home"><span class="brand-mark">◇</span><span>THE DM IS REAL<small>A world that remembers.</small></span></a>
    <div class="header-tools"><button id="journal-open" class="quiet-button">Journal</button><button id="theme" class="icon-button" title="Switch color theme" aria-label="Switch to light theme">☼</button><button id="mute" class="icon-button" aria-label="Mute sound" aria-pressed="false" title="Mute sound">♪</button><button id="new-run" class="quiet-button">New story</button></div>
  </header>
  <main>
    <section class="chapter-bar" aria-label="Current objective"><div><p class="eyebrow">CHAPTER 01 <span>/</span> THE THRESHOLD</p><h1 id="goal">A story is waiting.</h1><p id="goal-step" class="muted">Connecting to your world…</p></div><div class="run-status"><span id="turn" class="turn">TURN —</span><span id="provider" class="provider">Connecting</span></div></section>
    <div class="play-layout">
      <section class="world-panel panel" aria-label="The room">
        <div class="panel-heading"><span><i class="live-dot"></i> THE GATEHOUSE</span><span class="room-subtitle">Stone, silence, and a way through.</span></div>
        <div id="room" class="room" aria-label="Room map"><div class="map-loading">Lighting the lanterns…</div></div>
        <div class="map-footer"><span><i class="legend-dot player-dot"></i>You <i class="legend-dot npc-dot"></i>Others <i class="legend-dot prop-dot"></i>Objects</span><span>Click to explore · WASD to walk</span></div>
        <div id="guidance" class="goal-guidance" aria-label="Goal guidance"></div><div id="selection" class="selection"><div><span class="eyebrow">LOOK AROUND</span><p>Select something in the room, or describe what you have in mind.</p></div></div>
      </section>
      <aside class="side-column">
        <section class="character panel"><div class="panel-heading"><span>THE TRAVELER</span><span class="small-mark">✧</span></div><div class="traveler-card"><svg id="traveler-portrait" viewBox="-40 -43 80 85" role="img" aria-label="Your traveler"></svg><div><h2 id="traveler-name">Traveler</h2><button id="character-open" class="text-button">Edit appearance ↗</button></div></div><div id="vitals" class="vitals"><span>—</span></div><div class="inventory-heading"><h2>In your keeping</h2><span id="item-count">0 items</span></div><div id="inventory" class="inventory"><p class="empty-note">Your hands are empty.</p></div></section>
        <section class="becoming panel"><div class="panel-heading"><span>WHO YOU ARE BECOMING</span><span class="small-mark">◈</span></div><div id="evidence" class="evidence"><p class="empty-note">A character is made in the choices.<br>Your story has yet to leave a mark.</p></div></section>
      </aside>
    </div>
    <section class="story-panel panel" aria-label="Narration and actions"><div class="story-header"><span class="eyebrow">THE WORLD RESPONDS</span><span id="activity" role="status" aria-live="polite">Waiting for the world</span></div><div id="events" class="events" role="log" aria-label="Committed world events" aria-live="polite"></div><form id="intent-form"><label for="intent">What do you do?</label><div class="input-row"><textarea id="intent" rows="2" maxlength="1200" placeholder="Tell the world what you have in mind…" aria-describedby="input-help"></textarea><button id="submit" type="submit" class="primary-button">Make your move <span>↗</span></button></div><div class="input-footer"><span id="input-help">Your words. Your approach. <kbd>Enter</kbd> to act · <kbd>Shift ↵</kbd> for a new line</span><button id="save" class="text-button" type="button">Save story</button></div></form><p id="notice" class="notice" role="status" aria-live="polite" hidden></p></section>
    <footer class="page-footer"><span>Every action leaves a trace.</span><span>One room. Many ways through. <a href="/CREDITS.md" target="_blank" rel="noopener">Team credits</a></span></footer>
  </main>
  <dialog id="new-dialog"><form method="dialog"><p class="eyebrow">A FRESH BEGINNING</p><h2>Begin a new story?</h2><p>This replaces the current run. Your present choices will not carry over. Your name and appearance stay with you.</p><label for="variant">The guard at the threshold</label><select id="variant"><option value="baseline">Awake and watchful</option><option value="tired">Tired</option><option value="asleep">Asleep</option></select><div class="dialog-actions"><button value="cancel" class="quiet-button">Keep this story</button><button id="confirm-new" value="new" class="primary-button">Begin again</button></div></form></dialog>
<dialog id="journal-dialog" class="journal-dialog" aria-labelledby="journal-title"><div class="editor-heading"><div><p class="eyebrow">YOUR STORY SO FAR</p><h2 id="journal-title">The things that stayed.</h2></div><button id="journal-close" class="icon-button" aria-label="Close journal">×</button></div><p class="journal-intro">A record of what you experienced. Your choices shape who you become.</p><div id="journal-content"></div></dialog>
`;

let state: PublicState | undefined;
let provider: ProviderInfo | undefined;
let selected: string | null = null;
let pending = false;
let pendingMessage = '';
let reactionTimer: ReturnType<typeof setTimeout> | undefined;
let connected = false;
let sessionEpoch = 0;
let muted = localStorage.getItem('dm-muted') === 'true';
let theme = localStorage.getItem('dm-theme') || 'dark';
const gameSound = new GameSound(muted);
let animatedActors = new Set<string>();
let walkingTimer: ReturnType<typeof setTimeout> | undefined;
const sounded = new Set<string>();
const actionRequests = new ActionRequests();
const input = $<HTMLTextAreaElement>('#intent');
const turnReceipt = document.createElement('p');
turnReceipt.className = 'turn-receipt';
turnReceipt.hidden = true;
turnReceipt.setAttribute('role', 'status');
$('#notice').after(turnReceipt);
const retryButton = document.createElement('button');
retryButton.type = 'button';
retryButton.className = 'quiet-button retry-button';
retryButton.textContent = 'Check previous move';
retryButton.hidden = true;
turnReceipt.after(retryButton);

function setNotice(message: string, error = false): void {
  const notice = $('#notice');
  notice.textContent = message;
  notice.hidden = !message;
  notice.classList.toggle('error', error);
}

function updateSettings(): void {
  document.documentElement.dataset.theme = theme;
  $('#theme').textContent = theme === 'dark' ? '☼' : '☾';
  $('#theme').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  $('#mute').textContent = muted ? '♩̸' : '♪';
  $('#mute').setAttribute('aria-pressed', String(muted));
  $('#mute').setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
}

function updateAvailability(): void {
  const locked = pending || Boolean(state?.busy) || !connected;
  const textAvailable = Boolean(provider && provider.provider !== 'offline');
  $<HTMLButtonElement>('#submit').disabled = locked || !textAvailable;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direct], [data-drop], [data-inspect]')) button.disabled = locked;
  $<HTMLButtonElement>('#save').disabled = locked;
  $<HTMLButtonElement>('#new-run').disabled = pending || Boolean(state?.busy) || !connected;
  $<HTMLButtonElement>('#character-open').disabled = locked || Boolean(actionRequests.current);
  $('#activity').textContent = !connected ? 'Reconnecting to the world…' : pending ? pendingMessage : state?.busy ? 'Someone is reacting…' : state?.objective.status === 'complete' ? 'You made it through.' : provider?.available ? 'Your move' : textAvailable ? 'Narrator paused · you can retry' : 'Narrator offline · direct play works';
  $('#activity').classList.toggle('thinking', pending ? Boolean(pendingMessage) : Boolean(state?.busy));
  input.setAttribute('aria-busy', String(pending));
  retryButton.hidden = !actionRequests.current || pending;
  retryButton.disabled = locked;
}

function beginPending(message: string, delayedReaction = false): void {
  clearTimeout(reactionTimer);
  pending = true;
  pendingMessage = message;
  if (delayedReaction) {
    // Local steps normally finish before this; avoid flashing a thinking indicator.
    reactionTimer = setTimeout(() => {
      pendingMessage = 'Someone is reacting…';
      updateAvailability();
    }, 200);
  }
  updateAvailability();
}

function endPending(): void {
  clearTimeout(reactionTimer);
  reactionTimer = undefined;
  pending = false;
  pendingMessage = '';
  updateAvailability();
}

function drawRoom(): void {
  if (!state) return;
  const s = state;
  const tile = 60;
  const border = 30;
  const width = s.width * tile + border * 2;
  const height = s.height * tile + border * 2;
  const walls = new Set(s.walls.map(p => `${p.x},${p.y}`));
  let tiles = '';
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      const wall = walls.has(`${x},${y}`);
      const floorVariation = (x * 7 + y * 11) % 4;
      tiles += `<g class="tile ${wall ? 'wall' : `floor floor-${floorVariation}`}" data-x="${x}" data-y="${y}" ${wall ? '' : `role="button" tabindex="0" aria-label="Walk to column ${x + 1}, row ${y + 1}"`} transform="translate(${x * tile + border},${y * tile + border})"><rect x="1" y="1" width="58" height="58" rx="4"/>${wall ? '<path class="stone-seam" d="M2 30H58M30 2V30M15 30V58M48 30V58"/>' : `<path class="tile-crack" d="M${9 + floorVariation * 7} 3l5 7-2 4M47 58l-3-9 5-4"/>`}</g>`;
    }
  }
  const guideTarget = guidance(s).target;
  let entities = '';
  for (const entity of s.entities) {
    if (entity.location.kind !== 'ground') continue;
    const { x, y } = entity.location;
    const actor = s.actors.find(a => a.id === entity.id);
    const isPlayer = entity.id === 'player';
    const cls = isPlayer ? 'player-figure' : entity.kind === 'actor' ? 'npc-figure' : 'prop-figure';
    const mapLabels: Record<string, string> = { tonic: 'Tonic', crate: 'Crate', medicine: 'Bandages', key: 'Key', vase: 'Vase', bench: 'Bench', gate: 'Gate', chest: 'Chest', crowbar: 'Crowbar', shutter: 'Shutter', release: 'Release', letter: 'Note', ration: 'Ration' };
    const mapLabel = mapLabels[entity.id] ?? entity.name;
    let shape = '';
    const color = entity.props.color && /^#[\da-f]{3,8}$/i.test(entity.props.color) ? entity.props.color : '';
    if (entity.kind === 'actor') {
      const rotation = { north: 0, east: 90, south: 180, west: 270 }[actor?.facing ?? 'south'];
      const appearance: Appearance = actor?.appearance ?? (isPlayer ? DEFAULT_APPEARANCE : { ...DEFAULT_APPEARANCE, clothing: entity.id === 'companion' ? 'violet' : 'rust', hair: entity.id === 'guard' ? 'silver' : 'chestnut' });
      shape = `<ellipse class="figure-shadow" cx="0" cy="19" rx="16" ry="5"/><path class="facing" transform="rotate(${rotation})" d="M-4-32L0-38 4-32Z"/><g class="traveler-motion ${animatedActors.has(entity.id) ? 'walking' : ''}">${pixelTraveler(appearance, actor?.facing)}</g>${actor?.wakefulness === 'asleep' ? '<text class="condition-text" x="12" y="-26">zZ</text>' : actor && actor.fatigue >= 60 ? '<text class="condition-text" x="13" y="-28">⋯</text>' : ''}${actor && actor.hp <= 0 ? '<path class="fallen" d="M-12-16L12 14M12-16L-12 14"/>' : ''}`;
    } else if (objectArt[entity.id]) {
      const art = objectArt[entity.id];
      const colocated = s.entities.filter(e => e.location.kind === 'ground' && e.location.x === x && e.location.y === y);
      const offset = entity.kind === 'item' && colocated.some(e => e.props.container) ? (colocated.filter(e => e.kind === 'item').findIndex(e => e.id === entity.id) % 2 === 0 ? -13 : 13) : 0;
      const size = offset ? 30 : 48;
      shape = `<ellipse class="figure-shadow" cy="18" rx="18" ry="5"/><image class="object-pixels" href="/art/hero/${art}.png" x="${-size / 2 + offset}" y="${-size / 2 + (offset ? 14 : 0)}" width="${size}" height="${size}"/>${entity.props.container && entity.props.open ? '<path d="M-16-21H16" stroke="#81c3c5" stroke-width="3"/><text class="object-state" y="-27">OPEN</text>' : ''}`;
    } else if (entity.props.mechanism) {
      shape = `<rect class="fixture" x="-13" y="-15" width="26" height="33" rx="3"/><path d="M0 10L${entity.props.open ? '10 -12' : '-9 -8'}" stroke="#d7bc83" stroke-width="5" stroke-linecap="round"/><circle cx="0" cy="10" r="4" fill="#bd8651"/>`;
    } else if (/door|gate/.test(`${entity.id} ${entity.icon}`)) {
      shape = `<path class="fixture" d="M-22 23V-14Q0-39 22-14V23Z"/><path class="gate-bars ${entity.props.open ? 'gate-open' : ''}" d="M-12-14V22M0-21V22M12-14V22M-18-2H18M-18 11H18"/>${entity.props.locked ? '<rect class="metal" x="-5" y="1" width="10" height="10" rx="2"/>' : ''}`;
    } else if (/key/.test(`${entity.id} ${entity.icon}`)) {
      shape = '<ellipse class="figure-shadow" cx="0" cy="11" rx="16" ry="5"/><g class="key-shape" transform="rotate(-30)"><circle cx="-7" cy="0" r="7"/><path d="M0 0H18M12 0V7M18 0V5"/></g>';
    } else if (/potion|bottle|tonic/.test(`${entity.id} ${entity.icon}`)) {
      shape = '<ellipse class="figure-shadow" cy="17" rx="12" ry="4"/><path class="bottle" d="M-5-16H5V-7Q15-1 12 12Q0 22-12 12Q-15-1-5-7Z"/><path class="liquid" d="M-10 5Q0 10 10 5L9 12Q0 17-9 12Z"/><path class="cork" d="M-5-17H5"/>';
    } else if (/vase|pot/.test(`${entity.id} ${entity.icon}`)) {
      shape = '<ellipse class="figure-shadow" cy="18" rx="15" ry="5"/><path class="vase" d="M-8-19H8L5-8Q22 2 13 15Q0 23-13 15Q-22 2-5-8Z"/><path class="vase-line" d="M-13 5Q0 12 13 5"/>';
    } else if (entity.id === 'medicine') {
      shape = '<ellipse class="figure-shadow" cy="14" rx="16" ry="5"/><rect x="-16" y="-11" width="32" height="24" rx="5" fill="#d7d1b6" stroke="#9d9984" stroke-width="2"/><path d="M-12-5H12M-12 1H12M-12 7H12" stroke="#aea994" stroke-width="2"/>';
    } else if (entity.id === 'crate') {
      shape = '<path class="wood" d="M-22-17H22V21H-22Z"/><path class="wood-grain" d="M-20-15L20 19M20-15L-20 19M-22-7H22M-22 11H22"/>';
    } else if (entity.id === 'exit') {
      shape = '<circle r="19" fill="#81c3c5" fill-opacity=".15"/><path d="M-13 0H13M5-8L13 0 5 8" fill="none" stroke="#a4dcd3" stroke-width="3" stroke-linecap="round"/>';
    } else if (/bench|bed|table/.test(`${entity.id} ${entity.icon}`)) {
      shape = '<path class="wood" d="M-23-9H23V8H-23ZM-18 8V20M18 8V20"/><path class="wood-grain" d="M-19-4H19M-17 3H12"/>';
    } else {
      shape = `<ellipse class="figure-shadow" cy="13" rx="15" ry="5"/><path class="generic-object" d="M0-17L16-7 12 13-9 16-17-3Z"/><path class="object-facet" d="M0-17L-2 2 12 13M-17-3L-2 2 16-7"/>`;
    }
    entities += `<g class="entity ${cls} ${selected === entity.id ? 'selected' : ''}" data-entity="${escape(entity.id)}" role="button" tabindex="0" aria-label="${escape(entity.name)}${actor ? `, ${escape(actor.mood)}, ${actor.wakefulness}, facing ${actor.facing}` : ''}" transform="translate(${border + x * tile + tile / 2},${border + y * tile + tile / 2})" ${color ? `style="--entity-color:${color}"` : ''}><title>${escape(entity.name)}${actor ? ` · ${escape(actor.mood)} · ${actor.wakefulness}` : ''}</title><rect class="entity-hit" x="-27" y="-28" width="54" height="56" rx="8"/><ellipse class="selection-ring" cy="15" rx="23" ry="12"/>${shape}${guideTarget === entity.id ? '<path class="goal-marker" d="M-5-43L0-37 5-43"/>' : ''}<text class="entity-label" y="39">${escape(mapLabel)}</text></g>`;
  }
  $('#room').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="group" aria-label="Gatehouse room. Select an entity or a floor tile. Arrows or WASD move; E interacts with your selected target." xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="lantern-glow"><stop offset="0" stop-color="#dca756" stop-opacity=".19"/><stop offset="1" stop-color="#dca756" stop-opacity="0"/></radialGradient></defs><rect class="map-ground" width="${width}" height="${height}" rx="8"/>${tiles}<circle cx="${border + tile * 1.5}" cy="${border + tile * 1.5}" r="140" fill="url(#lantern-glow)" pointer-events="none"/>${entities}</svg>`;
}

function renderSelection(): void {
  const entity = state?.entities.find(e => e.id === selected);
  if (!entity || entity.location.kind === 'removed') {
    selected = null;
    $('#selection').innerHTML = '<div><span class="eyebrow">LOOK AROUND</span><p>Select something in the room, or describe what you have in mind.</p></div>';
    return;
  }
  const actor = state?.actors.find(a => a.id === entity.id);
  const held = entity.location.kind === 'held' && entity.location.actor === 'player';
  const player = state?.entities.find(e => e.id === 'player');
  const distance = entity.location.kind === 'ground' && player?.location.kind === 'ground' ? Math.abs(entity.location.x - player.location.x) + Math.abs(entity.location.y - player.location.y) : Infinity;
  const nearby = held || distance <= 1;
  const usable = Boolean(entity.props.heal || entity.props.food);
  const label = !nearby ? 'Approach' : entity.props.mechanism ? 'Activate' : entity.kind === 'item' ? held && entity.props.food ? 'Eat' : held && entity.props.heal ? 'Use' : held ? 'Interact' : 'Pick up' : entity.id === 'bench' ? 'Rest' : entity.kind === 'actor' ? 'Talk' : entity.props.open ? 'Close' : entity.props.open !== undefined ? 'Open' : 'Interact';
  const clues = state?.journal.filter(event => event.kind === 'discovery' && event.subject === entity.id) ?? [];
  const location = entity.location;
  const here = location.kind === 'ground' ? state?.entities.filter(e => e.id !== entity.id && e.location.kind === 'ground' && e.location.x === location.x && e.location.y === location.y) ?? [] : [];
  $('#selection').innerHTML = `<div class="selection-copy"><span class="eyebrow">${held ? 'IN YOUR KEEPING' : entity.kind === 'actor' ? 'SOMEONE HERE' : 'A CLOSER LOOK'}</span><h2>${escape(entity.name)}</h2><p>${escape(entity.description)}</p>${actor ? `<p class="actor-status">${escape(actor.mood)} · ${actor.wakefulness} · ${actor.hp}/${actor.maxHp} vitality · facing ${actor.facing}</p>` : ''}${clues.map(clue => `<blockquote class="known-clue">${escape(clue.text)}</blockquote>`).join('')}${here.length ? `<div class="here-list"><span>Also here</span>${here.map(e => `<button class="quiet-button" data-select="${escape(e.id)}">${escape(e.name)}</button>`).join('')}</div>` : ''}</div><div class="context-actions">${entity.id === 'player' || (held && !usable) ? '' : `<button class="quiet-button" data-direct="${escape(entity.id)}">${label} <kbd>E</kbd></button>`}${entity.id !== 'player' ? `<button class="quiet-button" data-inspect="${escape(entity.id)}">Examine</button>` : ''}${held ? `<button class="quiet-button" data-drop="${escape(entity.id)}">Set down</button>` : ''}<button class="text-button" id="describe-action">Describe an action ↗</button></div>`;
}

function renderPanels(): void {
  if (!state) return;
  const s = state;
  $('#goal').textContent = s.objective.title;
  $('#goal-step').textContent = s.objective.status === 'complete' ? `Complete · ${s.objective.step}` : s.objective.status === 'failed' ? `Story ended · ${s.objective.step}` : s.objective.step;
  const guide = guidance(s);
  $('#guidance').innerHTML = `<span class="guidance-compass">◇</span><p>${escape(guide.text)}</p>${guide.target ? `<button class="text-button" data-select="${guide.target}">Show ↗</button>` : ''}`;
  const playerEntity = s.entities.find(e => e.id === 'player');
  $('#traveler-name').textContent = playerEntity?.name === 'You' ? 'The traveler' : playerEntity?.name || 'Traveler';
  $('#traveler-portrait').innerHTML = pixelTraveler(s.actors.find(a => a.id === 'player')?.appearance);
  renderJournal();
  $('#turn').textContent = `TURN ${String(s.tick).padStart(2, '0')}`;
  $('#vitals').innerHTML = `<div><span class="vital-icon">♡</span><strong>${s.player.hp}<small> / ${s.player.maxHp}</small></strong><span>Vitality</span></div><div><span class="vital-icon">◉</span><strong>${s.player.coins}</strong><span>Coins</span></div><div><span class="vital-icon">☾</span><strong>${s.player.fatigue}</strong><span>Fatigue</span></div>`;
  const items = s.entities.filter(e => e.location.kind === 'held' && e.location.actor === 'player');
  $('#item-count').textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  $('#inventory').innerHTML = items.length ? items.map(e => `<button class="inventory-item ${selected === e.id ? 'active' : ''}" data-select="${escape(e.id)}"><span class="item-glyph">${/key/.test(e.id) ? '⚿' : /potion/.test(e.id) ? '♧' : '◇'}</span><span>${escape(e.name)}<small>${e.props.fragile ? 'Fragile' : 'In your keeping'}</small></span><span class="item-arrow">↗</span></button>`).join('') : '<p class="empty-note">Your hands are empty.<br>Look around. There may be something useful.</p>';
  const evidence = s.player.evidence;
  $('#evidence').innerHTML = `${s.player.capabilities.length ? `<div class="capabilities">${s.player.capabilities.map(c => `<span>✦ ${escape(c.replace(/_/g, ' '))}</span>`).join('')}</div>` : ''}${evidence.length ? evidence.map(e => `<article class="evidence-item"><span class="evidence-dot"></span><div><span class="evidence-category">${escape(e.category)}</span><p>${escape(e.text)}</p></div></article>`).join('') : '<p class="empty-note">A character is made in the choices.<br>Your story has yet to leave a mark.</p>'}`;
  const events = $('#events');
  const atBottom = events.scrollHeight - events.scrollTop - events.clientHeight < 45;
  const signature = s.events.slice(-40).map(e => e.id).join('|');
  if (events.dataset.signature !== signature) {
    events.dataset.signature = signature;
    events.innerHTML = s.events.length ? s.events.slice(-40).map(e => `<p class="event ${e.actor === 'player' ? 'player-event' : ''}"><span class="event-tick">${String(e.tick).padStart(2, '0')}</span><span>${escape(e.text)}</span></p>`).join('') : '<p class="opening-narration">The gatehouse settles around you. A guard watches the threshold. Take a look around, or tell the world what you do.</p>';
    if (atBottom) events.scrollTop = events.scrollHeight;
  }
  renderSelection();
}

function acceptState(next: PublicState, initial = false): void {
  if (state?.id === next.id && next.version < state.version) return;
  const changed = !state || next.id !== state.id || next.version !== state.version;
  if (state && state.id !== next.id) actionRequests.clear();
  animatedActors = new Set(next.entities.filter(entity => {
    const before = state?.entities.find(e => e.id === entity.id);
    return entity.kind === 'actor' && before?.location.kind === 'ground' && entity.location.kind === 'ground' && (before.location.x !== entity.location.x || before.location.y !== entity.location.y);
  }).map(entity => entity.id));
  state = next;
  for (const event of next.events) {
    if (!initial && !sounded.has(event.id)) gameSound.play(event);
    sounded.add(event.id);
  }
  if (changed || initial) {
    drawRoom();
    renderPanels();
    clearTimeout(walkingTimer);
    walkingTimer = setTimeout(() => { animatedActors.clear(); document.querySelectorAll('.traveler-motion.walking').forEach(el => el.classList.remove('walking')); }, 240);
  }
  updateAvailability();
}

class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly busy: boolean) { super(message); }
}

async function request<T>(path: string, body?: unknown, originWorldId?: string, timeoutMs?: number): Promise<T> {
  const response = await fetch(path, body === undefined ? { cache: 'no-store', signal: AbortSignal.timeout(5000) } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined });
  const result = await response.json();
  if (originWorldId && result.state && !belongsToCurrentWorld(originWorldId, state, result.state)) {
    throw new ApiError('This response belongs to a different story. The current story is unchanged.', 409, false);
  }
  if (!response.ok || result.error) {
    if (result.state) acceptState(result.state);
    throw new ApiError(result.error || `The world could not respond (${response.status}).`, response.status, Boolean(result.state?.busy));
  }
  return result as T;
}

async function load(initial = false): Promise<void> {
  const epoch = sessionEpoch;
  try {
    const result = await request<{ state: PublicState; provider: ProviderInfo }>('/api/state');
    if (epoch !== sessionEpoch) return;
    connected = true;
    provider = result.provider;
    $('#provider').textContent = result.provider.available ? result.provider.label : 'Narrator offline';
    $('#provider').title = `${result.provider.label} · ${result.provider.model}`;
    $('#provider').classList.toggle('unavailable', !result.provider.available);
    acceptState(result.state, initial);
  } catch {
    if (epoch !== sessionEpoch) return;
    connected = false;
    updateAvailability();
    if (initial) setNotice('Cannot reach the local game server. Your words will stay here while we reconnect.', true);
  }
}

async function act(payload: PlayerIntent): Promise<void> {
  if (!state || pending || state.busy || !connected) return;
  if ('input' in payload && (!provider || provider.provider === 'offline') && !actionRequests.current) {
    setNotice('The narrator is unavailable. Your words are saved in the input; you can still explore with direct controls.', true);
    return;
  }
  let actionRequest;
  try { actionRequest = actionRequests.begin(state, payload); }
  catch (error) { setNotice(error instanceof Error ? error.message : 'Check the previous move first.', true); updateAvailability(); return; }
  gameSound.prime();
  setNotice('');
  beginPending('input' in payload ? 'Considering your action…' : '', 'direct' in payload);
  try {
    const result = await request<ActionResponse>('/api/action', actionRequest, actionRequest.worldId);
    actionRequests.clear();
    if (state && state.id !== actionRequest.worldId) {
      setNotice('The previous story’s move has resolved. The current story is unchanged.');
      return;
    }
    acceptState(result.state);
    if (result.ok && 'input' in payload && input.value.trim() === payload.input) input.value = '';
    setNotice(result.message, !result.ok);
    const fallback = /NPC fallback/i.test(result.source);
    const source = result.source.replace(/\s*·\s*NPC fallback/i, '').replace('claude-cli', 'Claude').replace('openai', 'OpenAI').replace(/^direct$/, 'Direct interaction').replace(/^saved$/, 'Saved action');
    turnReceipt.textContent = `${source} · ${(result.timing.totalMs / 1000).toFixed(1)}s${fallback ? ' · Other characters used a basic fallback because their narrator was unavailable.' : ''}`;
    turnReceipt.title = `Interpretation ${(result.timing.interpretationMs / 1000).toFixed(1)}s · Character responses ${(result.timing.reactionMs / 1000).toFixed(1)}s`;
    turnReceipt.classList.toggle('fallback', fallback);
    turnReceipt.hidden = false;
  } catch (error) {
    const definitive = error instanceof ApiError && error.status < 500 && !error.busy;
    if (definitive) actionRequests.clear();
    const message = error instanceof Error ? error.message : 'The connection was interrupted.';
    setNotice(`${message}${!definitive && actionRequests.current ? ' The move may already be recorded. Check its result before trying another action; your words are still here.' : ''}`, true);
  } finally {
    endPending();
  }
}

retryButton.addEventListener('click', () => {
  const previous = actionRequests.current;
  if (previous) void act('input' in previous ? { input: previous.input } : { direct: previous.direct });
});

function selectEntity(id: string): void {
  selected = id;
  drawRoom();
  renderPanels();
  updateAvailability();
}

$('#room').addEventListener('click', event => {
  const target = event.target as Element;
  const entity = target.closest<SVGGElement>('[data-entity]');
  if (entity) { selectEntity(entity.dataset.entity!); return; }
  const tile = target.closest<SVGGElement>('.floor');
  if (tile) void act({ direct: { kind: 'move', x: Number(tile.dataset.x), y: Number(tile.dataset.y) } });
});
$('#room').addEventListener('keydown', event => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  (event.target as Element).dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
document.addEventListener('click', event => {
  const target = event.target as Element;
  const select = target.closest<HTMLElement>('[data-select]');
  if (select) selectEntity(select.dataset.select!);
  const interact = target.closest<HTMLElement>('[data-direct]');
  if (interact) void act({ direct: { kind: 'interact', entity: interact.dataset.direct! } });
  const inspect = target.closest<HTMLElement>('[data-inspect]');
  if (inspect) void act({ direct: { kind: 'inspect', entity: inspect.dataset.inspect! } });
  const drop = target.closest<HTMLElement>('[data-drop]');
  if (drop) void act({ direct: { kind: 'drop', entity: drop.dataset.drop! } });
  if (target.closest('#describe-action')) input.focus();
});
document.addEventListener('keydown', event => {
  if ((event.target as Element).closest('input, textarea, select, button, dialog') || Boolean(document.querySelector('dialog[open]')) || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const vector: Record<string, [number, number]> = { w: [0, -1], ArrowUp: [0, -1], s: [0, 1], ArrowDown: [0, 1], a: [-1, 0], ArrowLeft: [-1, 0], d: [1, 0], ArrowRight: [1, 0] };
  const delta = vector[event.key];
  const player = state?.entities.find(e => e.id === 'player');
  if (delta && player?.location.kind === 'ground') {
    event.preventDefault();
    void act({ direct: { kind: 'move', x: player.location.x + delta[0], y: player.location.y + delta[1] } });
  } else if (event.key.toLowerCase() === 'e' && selected && $('#selection').querySelector('[data-direct]')) {
    event.preventDefault();
    void act({ direct: { kind: 'interact', entity: selected } });
  }
});
$('#intent-form').addEventListener('submit', event => {
  event.preventDefault();
  const value = input.value.trim();
  if (value) void act({ input: value });
  else input.focus();
});
input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    $<HTMLFormElement>('#intent-form').requestSubmit();
  }
});
$('#theme').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('dm-theme', theme); updateSettings(); });
$('#mute').addEventListener('click', () => { muted = !muted; localStorage.setItem('dm-muted', String(muted)); updateSettings(); gameSound.setMuted(muted); });
$('#save').addEventListener('click', async () => {
  try { await request('/api/save', {}); setNotice('Story saved. You can return to this moment.'); }
  catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save this story.', true); }
});
$('#new-run').addEventListener('click', () => {
  const dialog = $<HTMLDialogElement>('#new-dialog');
  dialog.returnValue = '';
  dialog.showModal();
});
$('#new-dialog').addEventListener('close', async () => {
  if ($<HTMLDialogElement>('#new-dialog').returnValue !== 'new') return;
  sessionEpoch++;
  beginPending('Beginning your story…');
  try {
    const result = await request<{ state: PublicState; provider: ProviderInfo }>('/api/new', { variant: $<HTMLSelectElement>('#variant').value });
    sessionEpoch++;
    state = undefined;
    actionRequests.clear();
    selected = null;
    provider = result.provider;
    sounded.clear();
    input.value = '';
    setNotice('');
    turnReceipt.hidden = true;
    acceptState(result.state, true);
  } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not begin a new story.', true); }
  finally { endPending(); }
});


function renderJournal(): void {
  if (!state) return;
  const entries = journalEntries(state);
  const evidence = state.player.evidence;
  $('#journal-content').innerHTML = `${evidence.length ? `<section class="journal-evidence"><h3>What your choices reveal</h3>${evidence.map(item => `<article><span class="evidence-category">${escape(item.category)}</span><p>${escape(item.text)}</p><small>${item.eventIds.length} recorded ${item.eventIds.length === 1 ? 'event' : 'events'}</small></article>`).join('')}</section>` : ''}<section><h3>Remembered moments</h3>${entries.length ? entries.map(event => `<article class="journal-entry"><span class="event-tick">TURN ${event.tick}</span><p>${escape(event.text)}</p></article>`).join('') : '<p class="empty-note">Your first meaningful encounter will appear here. Walking leaves room for the moments that matter.</p>'}</section>`;
}
const characterEditor = installCharacterEditor(async draft => {
  if (pending || state?.busy || actionRequests.current) throw new Error('Resolve the current move before changing your appearance.');
  beginPending('Saving your character…');
  try {
    const result = await request<{ state: PublicState; provider: ProviderInfo }>('/api/character', draft, draft.worldId, 10000);
    provider = result.provider;
    acceptState(result.state);
    setNotice('Character saved. Your story and abilities are unchanged.');
  } finally { endPending(); }
}, () => state);
$('#character-open').addEventListener('click', () => { if (state && !pending && !state.busy && !actionRequests.current) characterEditor.open(state); });
$('#journal-open').addEventListener('click', () => { renderJournal(); $<HTMLDialogElement>('#journal-dialog').showModal(); });
$('#journal-close').addEventListener('click', () => $<HTMLDialogElement>('#journal-dialog').close());

updateSettings();
updateAvailability();
void load(true);
window.setInterval(() => { void load(); }, 1800);
