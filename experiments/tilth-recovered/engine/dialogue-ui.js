// Prepared text and portraits; no provider or image generation in this path.
export function installDialogue({drawPortrait=()=>{},sound=()=>{},speakerLabel=speaker=>speaker}={}) {
  const overlay = document.createElement('section');
  overlay.className = 'character-dialogue';
  overlay.hidden = true;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','characterSpeaker');
  overlay.setAttribute('aria-describedby','characterSpeech');
  overlay.innerHTML = '<div class="character-dialogue-panel"><canvas width="120" height="120" aria-hidden="true"></canvas><span id="characterSpeaker"></span><p id="characterSpeech"></p><button type="button" aria-label="Continue dialogue">Continue <span aria-hidden="true">▾</span></button></div>';
  document.body.append(overlay);
  const name = overlay.querySelector('#characterSpeaker');
  const text = overlay.querySelector('#characterSpeech');
  const button = overlay.querySelector('button');
  const portrait = overlay.querySelector('canvas');
  let pending = [], current = null, revealed = 0, timer, after, previousFocus;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stopTimer() { clearInterval(timer); timer = undefined; }
  function showNext() {
    stopTimer();
    current = pending.shift();
    if(!current) {
      overlay.hidden = true;
      document.body.classList.remove('character-speaking');
      if(previousFocus?.isConnected) previousFocus.focus();
      const done = after; after = undefined; done?.(); return;
    }
    const label=speakerLabel(current.speaker);
    name.textContent = current.thought ? `${label} · thoughts` : label;
    overlay.dataset.speaker = current.speaker;
    overlay.classList.toggle('is-thought',!!current.thought);
    drawPortrait(portrait.getContext('2d'),current.speaker);
    revealed = reduced() ? current.text.length : 0;
    text.textContent = current.text.slice(0,revealed);
    button.textContent = reduced() ? (pending.length ? 'Continue ▾' : 'Close ▾') : 'Reveal ▾';
    if(!reduced()) timer = setInterval(() => {
      revealed = Math.min(current.text.length,revealed+2);
      text.textContent = current.text.slice(0,revealed);
      if(revealed%8 === 0) sound();
      if(revealed === current.text.length) { stopTimer(); button.textContent = pending.length ? 'Continue ▾' : 'Close ▾'; }
    },28);
    button.focus();
  }
  function advance() {
    if(!current) return;
    if(revealed < current.text.length) { stopTimer(); revealed=current.text.length; text.textContent=current.text; button.textContent=pending.length?'Continue ▾':'Close ▾'; }
    else showNext();
  }
  button.addEventListener('click',advance);
  document.addEventListener('keydown',event => {
    if(overlay.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if(event.repeat) return;
    if(['Enter',' ','Escape','f','F'].includes(event.key)) advance();
    if(event.key === 'Tab') button.focus();
  },true);
  return {
    get active() { return !overlay.hidden; },
    speak(lines,onDone) {
      const valid = lines.filter(line => typeof line?.text==='string' && line.text.length && typeof line.speaker==='string');
      if(!valid.length) { onDone?.(); return; }
      if(!overlay.hidden) { pending.push(...valid); return; }
      previousFocus=document.activeElement; pending=valid.slice(); after=onDone;
      document.body.classList.add('character-speaking'); overlay.hidden=false; showNext();
    }
  };
}
