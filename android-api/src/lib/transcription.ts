import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { Platform } from 'react-native';

import type { TranscriptStatus } from '@/data/types';

/**
 * RF-60: records a voice note and transcribes it at the same time, on Android
 * and on iPhone (Apple's Speech framework).
 *
 * The system speech recogniser owns the microphone while it listens, so instead
 * of recording first and transcribing the file afterwards, the recogniser
 * itself records (`recordingOptions.persist`, Android 13+ and iOS) and returns
 * both the text and a 16 kHz WAV file. Where that is not possible (Android 12 or older,
 * no recognition service, offline mode without an on-device model), callers
 * fall back to the plain recorder and the note is kept without text (CA-02).
 *
 * `expo-speech-recognition` is the maintained Expo module derived from
 * react-native-voice, which the backlog names; react-native-voice itself does
 * not support React Native's New Architecture used by this app.
 */

export const TRANSCRIPTION_LANG = 'pt-BR';

export type TranscribedRecording = {
  /** WAV in the cache directory; `null` if nothing was recorded. */
  uri: string | null;
  durationSec: number;
  transcript: string;
  status: TranscriptStatus;
  /** Why the text is missing, to tell the user (CA-02). */
  problem: string | null;
};

/** Whether recording-with-transcription can run on this device right now. */
export function canTranscribeWhileRecording(offlineMode: boolean): boolean {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
  try {
    if (!ExpoSpeechRecognitionModule.supportsRecording()) return false;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return false;
    // RF-37: in offline mode nothing may leave the phone, so only on-device recognition is allowed.
    if (offlineMode && !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function requestTranscriptionPermission(): Promise<boolean> {
  try {
    return (await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

const PROBLEMS: Partial<Record<string, string>> = {
  network: 'Sem internet para transcrever.',
  'no-speech': 'Nenhuma fala foi reconhecida.',
  'speech-timeout': 'Nenhuma fala foi reconhecida.',
  'language-not-supported': 'O reconhecimento de voz em português não está disponível neste aparelho.',
  'service-not-allowed':
    Platform.OS === 'ios'
      ? 'O reconhecimento de voz está desligado. Ative a Siri e o Ditado nos Ajustes do iPhone.'
      : 'O serviço de reconhecimento de voz do Android está indisponível.',
  'not-allowed': 'Permissão de reconhecimento de voz negada.',
  busy: 'O reconhecimento de voz está ocupado com outro app.',
};

export type TranscribingSession = {
  /** Stops listening; the result arrives through `onFinish`. */
  stop: () => void;
  /** Cancels: the recording is discarded. */
  abort: () => void;
};

/**
 * Starts listening. `onPartial` receives the text recognised so far; `onFinish`
 * fires once, after the recogniser has closed the audio file.
 */
export function startTranscribingRecording({
  maxSeconds,
  offlineMode,
  onPartial,
  onFinish,
}: {
  maxSeconds: number;
  offlineMode: boolean;
  onPartial: (text: string) => void;
  onFinish: (result: TranscribedRecording) => void;
}): TranscribingSession {
  const finals: string[] = [];
  let interim = '';
  let error: { code: string; message: string } | null = null;
  let audioUri: string | null = null;
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let finished = false;
  let aborted = false;

  const text = () => [...finals, interim].map((part) => part.trim()).filter(Boolean).join(' ');

  const subscriptions = [
    ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const best = event.results[0]?.transcript ?? '';
      if (event.isFinal) {
        if (best.trim()) finals.push(best);
        interim = '';
      } else {
        interim = best;
      }
      onPartial(text());
    }),
    ExpoSpeechRecognitionModule.addListener('error', (event) => {
      if (event.error !== 'aborted') error = { code: event.error, message: event.message };
    }),
    ExpoSpeechRecognitionModule.addListener('audiostart', (event) => {
      startedAt = event.timestamp;
      audioUri = event.uri ?? audioUri;
    }),
    ExpoSpeechRecognitionModule.addListener('audioend', (event) => {
      endedAt = event.timestamp;
      audioUri = event.uri ?? audioUri;
    }),
    ExpoSpeechRecognitionModule.addListener('end', () => finish()),
  ];

  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(limit);
    subscriptions.forEach((subscription) => subscription.remove());
    if (aborted) return;
    const transcript = text();
    const durationSec =
      startedAt !== null ? Math.min(((endedAt ?? Date.now()) - startedAt) / 1000, maxSeconds) : 0;
    const status: TranscriptStatus = transcript ? 'done' : 'failed';
    const currentError = error as { code: string; message: string } | null;
    onFinish({
      uri: audioUri,
      durationSec,
      transcript,
      status,
      problem: transcript ? null : (currentError && PROBLEMS[currentError.code]) || 'Não foi possível reconhecer a fala.',
    });
  };

  // RF-10: never more than `maxSeconds`; the native side keeps the file it has so far.
  const limit = setTimeout(() => ExpoSpeechRecognitionModule.stop(), maxSeconds * 1000);

  try {
    ExpoSpeechRecognitionModule.start({
      lang: TRANSCRIPTION_LANG,
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: offlineMode,
      addsPunctuation: true,
      // Pauses to think are normal in a diary: don't stop at the first silence.
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
      },
      // iOS: 16-bit/16 kHz like Android (the default 32-bit float WAV is 4× larger).
      recordingOptions: { persist: true, outputSampleRate: 16000, outputEncoding: 'pcmFormatInt16' },
      // iOS: a normal playback session (the default "measurement" mode leaves the speaker almost mute).
      iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth'], mode: 'default' },
    });
  } catch (cause) {
    error = { code: 'client', message: cause instanceof Error ? cause.message : String(cause) };
    finish();
  }

  return {
    stop: () => {
      if (!finished) ExpoSpeechRecognitionModule.stop();
    },
    abort: () => {
      aborted = true;
      if (!finished) ExpoSpeechRecognitionModule.abort();
      finish();
    },
  };
}
