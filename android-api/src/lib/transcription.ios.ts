/**
 * iOS: transcription while recording is implemented for Android only (see
 * `transcription.ts`), so on iPhone notes are recorded without text, as on the
 * web. This file also keeps `expo-speech-recognition` out of the iOS bundle:
 * that package loads its native module on import, which Expo Go does not ship,
 * and the import alone would crash the app there.
 */
export * from './transcription.web';
