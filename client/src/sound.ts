import type { WorldEvent } from '../../shared/types';
import { soundCue, type SoundCue } from './presentation';

const recordings: Partial<Record<SoundCue, string>> = { step: 'footstep00', take: 'handleSmallLeather', coins: 'handleCoins', open: 'doorOpen_1', close: 'doorClose_1', impact: 'metalPot1', inspect: 'bookOpen', activate: 'metalClick', cloth: 'cloth1' };

// Kenney's CC0 RPG recordings from Austin's build; envelope/noise layering and
// visibility handling adapted from Tilth. Never waits for audio to resolve a move.
export class GameSound {
  private context?: AudioContext;
  private master?: GainNode;
  private noiseBuffer?: AudioBuffer;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Set<string>();
  private lastPlayed = new Map<SoundCue, number>();
  private muted: boolean;
  constructor(muted = false) {
    this.muted = muted;
    document.addEventListener('visibilitychange', () => {
      if (!this.context) return;
      if (document.hidden) void this.context.suspend().catch(() => {});
      else if (!this.muted) void this.context.resume().catch(() => {});
    });
  }
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.2, this.context.currentTime, .015);
    if (!muted) this.prime();
  }
  prime(): void {
    if (this.muted || document.hidden || typeof AudioContext === 'undefined') return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = .2;
        const limiter = this.context.createDynamicsCompressor();
        this.master.connect(limiter).connect(this.context.destination);
        this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
        const samples = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      void this.context.resume().catch(() => {});
      for (const file of Object.values(recordings)) void this.load(file);
    } catch { /* Audio is optional; browser/device failures do not block play. */ }
  }
  private async load(file: string): Promise<void> {
    if (!this.context || this.buffers.has(file) || this.loading.has(file)) return;
    this.loading.add(file);
    try {
      const response = await fetch(`/audio/rpg/${file}.ogg`);
      if (!response.ok) return;
      this.buffers.set(file, await this.context.decodeAudioData(await response.arrayBuffer()));
    } catch { /* Synthesized effects remain available when recordings cannot load. */ }
    finally { this.loading.delete(file); }
  }
  play(event: WorldEvent): void {
    const cue = soundCue(event.kind);
    if (!cue || this.muted || document.hidden || this.context?.state !== 'running' || !this.master) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(cue) ?? -Infinity) < (cue === 'step' ? 120 : 70)) return;
    this.lastPlayed.set(cue, now);
    const file = recordings[cue], buffer = file && this.buffers.get(file);
    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.master);
      source.start();
      source.onended = () => source.disconnect();
      return;
    }
    this.synthesize(cue);
  }
  private tone(frequency: number, duration: number, delay = 0, end = frequency): void {
    const context = this.context!, start = context.currentTime + delay;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(.18, start + .006);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(this.master!);
    oscillator.start(start); oscillator.stop(start + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  private noise(duration: number, frequency: number): void {
    const context = this.context!, start = context.currentTime;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = this.noiseBuffer!; filter.type = 'bandpass'; filter.frequency.value = frequency;
    gain.gain.setValueAtTime(.16, start); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    source.connect(filter).connect(gain).connect(this.master!);
    source.start(start); source.stop(start + duration + .02);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  private synthesize(cue: SoundCue): void {
    if (cue === 'step') { this.noise(.07, 700); this.tone(95, .06, 0, 48); }
    else if (cue === 'impact') { this.noise(.2, 2200); this.tone(130, .18, 0, 35); }
    else if (cue === 'heal' || cue === 'success') [392, 494, 587, 784].forEach((frequency, i) => this.tone(frequency, .23, i * .075));
    else { this.noise(.05, 1200); this.tone(cue === 'close' ? 330 : 554, .1); this.tone(cue === 'close' ? 220 : 740, .13, .07); }
  }
}
