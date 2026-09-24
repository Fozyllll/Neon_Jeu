import { AudioManager } from './audio/AudioManager';
import { getBrowserStorage, SaveManager } from './save/saveManager';

/** Services partagés par toutes les scènes (sauvegarde locale et audio). */
export const save = new SaveManager(getBrowserStorage());
export const audio = new AudioManager(() => save.data.settings);
save.subscribe(() => audio.applySettings());

/** Annonce un message aux lecteurs d'écran (région aria-live de index.html). */
export function announce(text: string): void {
  const region = document.getElementById('sr-status');
  if (region) region.textContent = text;
}
