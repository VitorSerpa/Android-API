import type { TranscriptStatus } from '@/data/types';

/** Web preview: no native recogniser that can also keep the audio, so notes are recorded without text. */

export const TRANSCRIPTION_LANG = 'pt-BR';

export type TranscribedRecording = {
  uri: string | null;
  durationSec: number;
  transcript: string;
  status: TranscriptStatus;
  problem: string | null;
};

export type TranscribingSession = { stop: () => void; abort: () => void };

export const canTranscribeWhileRecording = (_offlineMode: boolean) => false;

export const requestTranscriptionPermission = async () => false;

export function startTranscribingRecording(_options: {
  maxSeconds: number;
  offlineMode: boolean;
  onPartial: (text: string) => void;
  onFinish: (result: TranscribedRecording) => void;
}): TranscribingSession {
  throw new Error('Transcrição indisponível na web.');
}
