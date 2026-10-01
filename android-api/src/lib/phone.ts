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

/** Opens the SMS app addressed to the contact (US-07 CA-02: "ligação ou mensagem"). */
export async function message(phone: string, body = '') {
  const number = phone.replace(/(?!^\+)[^\d]/g, '');
  try {
    await Linking.openURL(`sms:${number}${body ? `?body=${encodeURIComponent(body)}` : ''}`);
  } catch {
    notify('Não foi possível abrir as mensagens', `Envie uma mensagem para ${phone} pelo seu telefone.`);
  }
}
