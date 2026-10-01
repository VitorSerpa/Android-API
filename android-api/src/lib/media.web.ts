import * as ImagePicker from 'expo-image-picker';

import type { Attachment } from '@/data/types';
import { createId } from '@/lib/id';

/**
 * Web preview: there is no app sandbox to copy into, so attachments are kept
 * inline as data URIs (the picker is asked for base64).
 */

export async function pickPhoto(_source: 'camera' | 'library'): Promise<Attachment | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
  return { id: createId(), kind: 'photo', uri, createdAt: new Date().toISOString() };
}

export function keepRecording(uri: string, durationSec: number): Attachment {
  return { id: createId(), kind: 'audio', uri, durationSec: Math.round(durationSec), createdAt: new Date().toISOString() };
}

export function deleteMediaFile(_uri: string) {}

export async function mediaToBase64(uri: string): Promise<string | null> {
  const match = /^data:[^;]+;base64,(.*)$/.exec(uri);
  return match ? match[1] : null;
}

export function mediaFromBase64(base64: string, extension: string): string {
  const mime = extension === 'm4a' ? 'audio/mp4' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}
