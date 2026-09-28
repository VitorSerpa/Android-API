import { Share } from 'react-native';

import { notify } from '@/lib/dialogs';

/**
 * Opens the system share sheet. On web this needs the Web Share API, which not
 * every browser has, so fall back to the clipboard and then to a dialog.
 */
export async function shareText(title: string, message: string) {
  try {
    await Share.share({ title, message });
    return;
  } catch {
    // Fall through to the web fallbacks.
  }
  try {
    await globalThis.navigator?.clipboard?.writeText(message);
    notify('Copiado', 'O texto foi copiado para a área de transferência.');
  } catch {
    notify(title, message);
  }
}
