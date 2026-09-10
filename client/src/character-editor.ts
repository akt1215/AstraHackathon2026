import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, characterSchema, type Appearance, type CharacterRequest } from '../../shared/appearance';
import type { PublicState } from '../../shared/types';
import { pixelTraveler } from './presentation';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export function installCharacterEditor(save: (draft: CharacterRequest) => Promise<void>, currentState: () => PublicState | undefined): { open(state: PublicState): void; dialog: HTMLDialogElement } {
  const dialog = document.createElement('dialog');
  dialog.className = 'character-editor';
  dialog.setAttribute('aria-labelledby', 'character-title');
  document.body.append(dialog);
  let draft: Appearance = { ...DEFAULT_APPEARANCE }, name = '', worldId = '', version = 0, saving = false;
  function render(): void {
    const optionFields = Object.entries(APPEARANCE_OPTIONS).map(([field, options]) => {
      const label = { skin: 'Skin', hair: 'Hair color', clothing: 'Outfit color', hairStyle: 'Hair style', outfit: 'Clothing' }[field];
      return `<fieldset><legend>${label}</legend><div class="appearance-options">${Object.entries(options).map(([value, option]) => `<button type="button" class="appearance-choice" data-appearance-field="${field}" data-appearance-value="${value}" aria-pressed="${draft[field as keyof Appearance] === value}">${'color' in option ? `<span class="appearance-swatch" style="background:${option.color}"></span>` : ''}${option.label}</button>`).join('')}</div></fieldset>`;
    }).join('');
    dialog.innerHTML = `<form><div class="editor-heading"><div><p class="eyebrow">YOUR STARTING FORM</p><h2 id="character-title">Make this traveler yours.</h2></div><button type="button" class="icon-button" data-cancel aria-label="Cancel appearance changes">×</button></div><p>Choose your appearance. Your actions write the rest.</p><div class="editor-layout"><div class="character-preview"><svg id="appearance-preview" viewBox="-40 -43 80 85" aria-label="Character appearance preview"></svg><strong id="appearance-name"></strong><small>Appearance never limits your actions.</small></div><div class="editor-fields"><label for="character-name">Traveler’s name</label><input id="character-name" required maxlength="24" autocomplete="off" value="${escape(name)}">${optionFields}</div></div><p id="character-status" role="status" aria-live="polite"></p><div class="dialog-actions"><button type="button" class="quiet-button" data-cancel>Keep current appearance</button><button type="submit" class="primary-button">Save character</button></div></form>`;
    preview();
    dialog.querySelector<HTMLInputElement>('#character-name')!.addEventListener('input', event => {
      name = (event.target as HTMLInputElement).value;
      preview();
    });
    dialog.querySelectorAll<HTMLElement>('[data-appearance-field]').forEach(button => button.addEventListener('click', () => {
      if (saving) return;
      const field = button.dataset.appearanceField as keyof Appearance;
      draft = { ...draft, [field]: button.dataset.appearanceValue };
      dialog.querySelectorAll<HTMLElement>(`[data-appearance-field="${field}"]`).forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      preview();
    }));
    dialog.querySelectorAll('[data-cancel]').forEach(button => button.addEventListener('click', () => { if (!saving) dialog.close(); }));
    dialog.querySelector('form')!.addEventListener('submit', async event => {
      event.preventDefault();
      if (saving) return;
      const result = characterSchema.safeParse({ worldId, version, name, appearance: draft });
      const status = dialog.querySelector<HTMLElement>('#character-status')!;
      if (!result.success) { status.textContent = 'Choose a name with 1–24 characters and no control characters.'; return; }
      saving = true;
      dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement>('button,input').forEach(element => element.disabled = true);
      status.textContent = 'Saving your character…';
      try { await save(result.data); dialog.close(); }
      catch (error) {
        const current = currentState();
        if (current && current.id !== worldId) status.textContent = 'This story has changed. Close this draft and reopen appearance to edit the current traveler.';
        else if (current && current.version !== version) {
          version = current.version;
          status.textContent = 'The world changed while you were editing. Your draft is kept; review it and save again.';
        } else status.textContent = error instanceof Error ? error.message : 'Could not save. Your draft is still here.';
      }
      finally { saving = false; dialog.querySelectorAll<HTMLInputElement | HTMLButtonElement>('button,input').forEach(element => element.disabled = false); }
    });
  }
  function preview(): void {
    dialog.querySelector('#appearance-preview')!.innerHTML = `<ellipse cx="0" cy="23" rx="22" ry="5" fill="#0a171933"/>${pixelTraveler(draft)}`;
    dialog.querySelector('#appearance-name')!.textContent = name.trim() || 'Your traveler';
  }
  dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
  return { dialog, open(state) {
    if (dialog.open || saving) return;
    const player = state.entities.find(e => e.id === 'player');
    draft = { ...DEFAULT_APPEARANCE, ...state.actors.find(actor => actor.id === 'player')?.appearance };
    name = player?.name === 'You' ? 'Traveler' : player?.name || 'Traveler';
    worldId = state.id; version = state.version;
    render(); dialog.showModal(); dialog.querySelector<HTMLInputElement>('#character-name')!.focus();
  } };
}
