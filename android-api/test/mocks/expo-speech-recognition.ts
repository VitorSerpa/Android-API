/**
 * Test double of `expo-speech-recognition`: records the calls the app makes and
 * lets a test fire the native events (result, audiostart, audioend, error, end).
 */
type Listener = (event: any) => void;

const listeners = new Map<string, Set<Listener>>();

export const speechControl = {
  supportsRecording: true,
  recognitionAvailable: true,
  onDevice: true,
  permissionGranted: true,
  startThrows: null as Error | null,
  started: [] as any[],
  stops: 0,
  aborts: 0,
  emit(name: string, event: any = null) {
    for (const listener of [...(listeners.get(name) ?? [])]) listener(event);
  },
  listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
  reset() {
    listeners.clear();
    Object.assign(this, {
      supportsRecording: true,
      recognitionAvailable: true,
      onDevice: true,
      permissionGranted: true,
      startThrows: null,
      started: [],
      stops: 0,
      aborts: 0,
    });
  },
};

export const ExpoSpeechRecognitionModule = {
  addListener(name: string, listener: Listener) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name)!.add(listener);
    return { remove: () => listeners.get(name)?.delete(listener) };
  },
  start(options: any) {
    if (speechControl.startThrows) throw speechControl.startThrows;
    speechControl.started.push(options);
  },
  stop() {
    speechControl.stops += 1;
  },
  abort() {
    speechControl.aborts += 1;
  },
  supportsRecording: () => speechControl.supportsRecording,
  isRecognitionAvailable: () => speechControl.recognitionAvailable,
  supportsOnDeviceRecognition: () => speechControl.onDevice,
  requestPermissionsAsync: async () => ({ granted: speechControl.permissionGranted }),
};
