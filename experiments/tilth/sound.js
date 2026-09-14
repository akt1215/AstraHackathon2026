// Small original, synthesized effects. No downloads or background audio loops.
let context, master, noiseBuffer;
let enabled = true;
try { enabled = localStorage.getItem('glyph-sound') !== 'muted'; } catch {}
const lastPlayed = new Map();
function ready() {
  if (!enabled || document.hidden) return false;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return false;
  if (!context) {
    context = new Audio();
    master = context.createGain();
    master.gain.value = 0.22;
    const limiter = context.createDynamicsCompressor();
    master.connect(limiter); limiter.connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context.state !== 'closed';
}
function tone(frequency, duration, delay = 0, type = 'triangle', volume = .25, end = frequency) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator(), envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(volume, start + .006);
  envelope.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(envelope); envelope.connect(master);
  oscillator.start(start); oscillator.stop(start + duration + .02);
  oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
}
function noise(duration, frequency, volume = .2, delay = 0, end = frequency) {
  const start = context.currentTime + delay;
  const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
  source.buffer = noiseBuffer; filter.type = 'bandpass'; filter.Q.value = .8;
  filter.frequency.setValueAtTime(frequency, start);
  filter.frequency.exponentialRampToValueAtTime(end, start + duration);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(volume, start + .005);
  envelope.gain.exponentialRampToValueAtTime(.001, start + duration);
  source.connect(filter); filter.connect(envelope); envelope.connect(master);
  source.start(start); source.stop(start + duration + .02);
  source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
}
export function playSound(name) {
  if (!ready()) return;
  const now = performance.now(), cooldown = name === 'step' ? 120 : 55;
  if (now - (lastPlayed.get(name) ?? -Infinity) < cooldown) return;
  lastPlayed.set(name, now);
  switch (name) {
    case 'Arrow': noise(.1,3000,.18,0,800);tone(700,.07,0,'sine',.12,250);break;
    case 'ArrowHeavy': noise(.2,1500,.14);noise(.19,3500,.3,.3,600);break;
    case 'Volley': [0,.12,.24].forEach(d=>noise(.12,3000,.2,d,700));break;
    case 'Cleave': noise(.4,2600,.5,.25,150);tone(130,.45,.25,'sawtooth',.18,35);tone(660,.2,.05);break;
    case 'Cyclone': [0,.18,.36,.54].forEach(d=>noise(.22,2800,.3,d,450));tone(440,.6,0,'triangle',.16,880);break;
    case 'Breaker': tone(180,.25,0,'triangle',.3,60);noise(.24,3600,.4,.2,800);[660,990].forEach(f=>tone(f,.3,.2,'sine',.15));break;
    case 'Dodge': noise(.22,1200,.25,0,180);break;
    case 'Heavy': noise(.32,2600,.5,.12,180);tone(95,.3,.22,'triangle',.35,35);break;
    case 'Spin': noise(.2,2200,.3,0,600);noise(.25,2800,.3,.22,500);break;
    case 'step': noise(.075, 650 + Math.random() * 250, .16); tone(95, .055, 0, 'sine', .18, 48); break;
    case 'menu': tone(370, .07); tone(554, .10, .05); break;
    case 'close': tone(440, .065); tone(294, .08, .045); break;
    case 'select': tone(660, .045, 0, 'triangle', .14); break;
    case 'equip': noise(.07, 2400, .10); tone(740, .14, 0, 'triangle', .18); tone(1110, .18, .075, 'sine', .15); break;
    case 'Slash': noise(.19, 3200, .45, 0, 420); tone(170, .16, .075, 'sawtooth', .12, 50); break;
    case 'Guard': noise(.09, 1900, .2); [440, 693, 1030].forEach(f => tone(f, .27, 0, 'sine', .13)); break;
    case 'Rally': [220, 277, 330, 440].forEach((f, i) => tone(f, .24, i * .075, 'triangle', .2)); break;
    case 'Potion': [440, 660, 880].forEach((f, i) => tone(f, .19, i * .07, 'sine', .25)); noise(.14, 1200, .06); break;
    case 'heal': [523, 659, 784, 1047].forEach((f, i) => tone(f, .4, i * .08, 'sine', .22)); break;
    case 'battle': tone(110, .5, 0, 'triangle', .3, 55); noise(.4, 450, .3); [165, 220, 277].forEach((f, i) => tone(f, .24, .15 + i * .1)); break;
    case 'victory': [392, 494, 587, 784].forEach((f, i) => tone(f, .35, .12 + i * .13, 'triangle', .25)); break;
  }
}
function updateButton() {
  const button = document.querySelector('#sound');
  button.querySelector('span').textContent = enabled ? 'ON' : 'OFF';
  button.setAttribute('aria-label', enabled ? 'Mute sound effects' : 'Enable sound effects');
  button.setAttribute('aria-pressed', String(enabled));
  button.title = enabled ? 'Mute sound effects' : 'Enable sound effects';
}
export function initSound() {
  updateButton();
  document.querySelector('#sound').onclick = () => {
    enabled = !enabled;
    try { localStorage.setItem('glyph-sound', enabled ? 'on' : 'muted'); } catch {}
    if (!enabled && context) master.gain.setTargetAtTime(0, context.currentTime, .01);
    if (enabled) { ready(); if (context) master.gain.setTargetAtTime(.22, context.currentTime, .01); playSound('menu'); }
    updateButton();
  };
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) context.suspend().catch(() => {});
    else if (enabled) context.resume().catch(() => {});
  });
}
