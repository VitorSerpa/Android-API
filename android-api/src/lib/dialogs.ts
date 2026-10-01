import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert` is a no-op on react-native-web, so fall back to the browser's
 * own dialogs there.
 */

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirm(title: string, message: string, confirmLabel = 'Confirmar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}


/**
 * Lets the user pick one of a few actions. On web, where `Alert` has no
 * buttons, the first option is taken.
 */
export function choose<T extends string>(title: string, options: readonly { value: T; label: string }[]): Promise<T | null> {
  if (Platform.OS === 'web') return Promise.resolve(options[0]?.value ?? null);
  return new Promise((resolve) =>
    Alert.alert(
      title,
      undefined,
      [
        ...options.map((option) => ({ text: option.label, onPress: () => resolve(option.value) })),
        { text: 'Cancelar', style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    ),
  );
}
