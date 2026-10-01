import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import type { Attachment } from '@/data/types';
import { notify } from '@/lib/dialogs';
import { createId } from '@/lib/id';

/**
 * Photos and voice notes attached to the diary (RF-09/RF-10). Picked or
 * recorded files are copied into the app's own document directory, so they
 * survive the picker's cache being cleared and are included in the backup.
 */

function mediaDirectory(): Directory {
  const directory = new Directory(Paths.document, 'media');
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function keep(sourceUri: string, extension: string): string {
  const target = new File(mediaDirectory(), `${createId()}.${extension}`);
  new File(sourceUri).copySync(target);
  return target.uri;
}

export async function pickPhoto(source: 'camera' | 'library'): Promise<Attachment | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify(
      'Permissão necessária',
      source === 'camera'
        ? 'Permita o acesso à câmera nas configurações do Android para tirar fotos.'
        : 'Permita o acesso às fotos nas configurações do Android para anexar imagens.',
    );
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;

  return { id: createId(), kind: 'photo', uri: keep(result.assets[0].uri, 'jpg'), createdAt: new Date().toISOString() };
}

export function keepRecording(uri: string, durationSec: number): Attachment {
  return {
    id: createId(),
    kind: 'audio',
    uri: keep(uri, 'm4a'),
    durationSec: Math.round(durationSec),
    createdAt: new Date().toISOString(),
  };
}

export function deleteMediaFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Falha ao apagar anexo', error);
  }
}

/** For the JSON backup (RF-38): the file's bytes as base64, or `null` if it is gone. */
export async function mediaToBase64(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);
    return file.exists ? await file.base64() : null;
  } catch {
    return null;
  }
}

/** Restores a backed-up file into the media directory and returns its new URI. */
export function mediaFromBase64(base64: string, extension: string): string {
  const target = new File(mediaDirectory(), `${createId()}.${extension}`);
  target.write(base64, { encoding: 'base64' });
  return target.uri;
}
