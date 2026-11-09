/** Test double: media files live in a map instead of the device's storage. */
export const mediaFiles = new Map<string, string>();
let counter = 0;
export async function mediaToBase64(uri: string) {
  return mediaFiles.get(uri) ?? null;
}
export function mediaFromBase64(base64: string, extension: string) {
  const uri = `file:///media/restored-${++counter}.${extension}`;
  mediaFiles.set(uri, base64);
  return uri;
}
export function keepAudioFile(uri: string) {
  return uri;
}

export function resolveMediaUri(uri: string): string {
  return uri;
}
