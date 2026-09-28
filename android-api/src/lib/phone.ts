import { Linking } from 'react-native';

import { notify } from '@/lib/dialogs';

/** Opens the dialer. Keeps only digits and a leading `+` from what the user typed. */
export async function call(phone: string) {
  const number = phone.replace(/(?!^\+)[^\d]/g, '');
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    notify('Não foi possível ligar', `Disque ${phone} pelo seu telefone.`);
  }
}
