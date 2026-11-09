import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Input, MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import type { TranscriptStatus } from '@/data/types';
import { useUserData } from '@/data/user-data-context';
import { notify } from '@/lib/dialogs';
import { resolveMediaUri } from '@/lib/media';
import {
  canTranscribeWhileRecording,
  requestTranscriptionPermission,
  startTranscribingRecording,
  type TranscribingSession,
} from '@/lib/transcription';
import { makeStyles } from '@/theme';

/** RF-10: voice notes are capped at 30 seconds. */
export const MAX_RECORDING_SEC = 30;

/**
 * Back to playback-only. `playsInSilentMode` must be repeated: on iOS every
 * field left out is reset to its default, and with it off the session becomes
 * "ambient" — the ring/silent switch then mutes the voice notes. This also
 * undoes the speech recogniser's "measurement" session, whose output is
 * almost inaudible.
 */
export const releaseMicrophone = () =>
  setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});

/** What a finished recording hands back. `uri` is still a temporary file: keep it with `keepAudioFile`. */
export type Recording = {
  uri: string;
  durationSec: number;
  /** RF-60: recognised text ('' when none). */
  transcript: string;
  transcriptStatus: TranscriptStatus;
  /** CA-02: why there is no text, to tell the user. */
  problem: string | null;
};

const UNAVAILABLE = 'A transcrição automática não está disponível neste aparelho; o áudio foi salvo sem texto.';

/**
 * Records up to 30 s. With `transcribe`, Android's speech recogniser records
 * and transcribes at once (RF-60) and the text appears while the user speaks;
 * where it can't, the plain recorder is used and the note is saved without
 * text (US-15 CA-02). Either way the microphone is released as soon as the
 * recording stops (RNF-06).
 *
 * The plain recorder's elapsed time comes from our own clock, not its status:
 * once Android stops a recording it resets `durationMillis` to 0, so the limit
 * is enforced here, while the recorder still holds the file. The native
 * `forDuration` is only a safety net for when JS timers are paused.
 */
export function AudioRecorderPanel({
  onRecorded,
  onCancel,
  transcribe = true,
  title = 'Gravar áudio (até 30 s)',
}: {
  onRecorded: (recording: Recording) => void;
  onCancel: () => void;
  transcribe?: boolean;
  title?: string;
}) {
  const styles = useStyles();
  const { data } = useUserData();
  const offlineMode = data.settings.offlineMode;
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [mode, setMode] = useState<'idle' | 'speech' | 'plain' | 'finishing'>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [partial, setPartial] = useState('');
  const starting = useRef(false);
  const finishing = useRef(false);
  const session = useRef<TranscribingSession | null>(null);
  const plainProblem = useRef<string | null>(null);
  const started = startedAt !== null;
  const seconds = started ? Math.min(Math.floor((now - startedAt) / 1000), MAX_RECORDING_SEC) : 0;

  const finishPlain = async () => {
    if (finishing.current || startedAt === null) return;
    finishing.current = true;
    setMode('finishing');
    const duration = Math.min((Date.now() - startedAt) / 1000, MAX_RECORDING_SEC);
    let stopped = true;
    try {
      if (recorder.isRecording) await recorder.stop();
    } catch (error) {
      console.error('Falha ao parar a gravação', error);
      stopped = false;
    } finally {
      await releaseMicrophone();
    }
    if (!stopped) notify('Não foi possível gravar', 'O áudio não pôde ser salvo. Tente de novo.');
    if (stopped && recorder.uri && duration > 0.5) {
      onRecorded({
        uri: recorder.uri,
        durationSec: duration,
        transcript: '',
        transcriptStatus: transcribe ? 'unavailable' : 'done',
        problem: transcribe ? plainProblem.current : null,
      });
    } else onCancel();
  };

  const startPlain = async (problem: string | null) => {
    plainProblem.current = problem;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      notify('Permissão necessária', 'Permita o uso do microfone nas configurações do Android para gravar áudios.');
      setMode('idle');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: MAX_RECORDING_SEC + 1 });
    const time = Date.now();
    finishing.current = false;
    setNow(time);
    setStartedAt(time);
    setMode('plain');
  };

  const startSpeech = async () => {
    if (!(await requestTranscriptionPermission())) {
      await startPlain('Sem permissão de reconhecimento de voz; o áudio foi salvo sem texto.');
      return;
    }
    const time = Date.now();
    session.current = startTranscribingRecording({
      maxSeconds: MAX_RECORDING_SEC,
      offlineMode,
      onPartial: setPartial,
      onFinish: (result) => {
        session.current = null;
        void releaseMicrophone();
        if (result.uri && result.durationSec > 0.5) {
          onRecorded({
            uri: result.uri,
            durationSec: result.durationSec,
            transcript: result.transcript,
            transcriptStatus: result.status,
            problem: result.problem,
          });
        } else if (Date.now() - time < 2000 && !finishing.current) {
          // The recogniser gave up before recording anything: record without text instead.
          setStartedAt(null);
          startPlain(UNAVAILABLE).catch(() => onCancel());
        } else {
          notify('Não foi possível gravar', 'O áudio não pôde ser salvo. Tente de novo.');
          onCancel();
        }
      },
    });
    finishing.current = false;
    setNow(time);
    setStartedAt(time);
    setMode('speech');
  };

  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      if (transcribe && canTranscribeWhileRecording(offlineMode)) await startSpeech();
      else await startPlain(transcribe ? UNAVAILABLE : null);
    } catch (error) {
      console.error('Falha ao iniciar a gravação', error);
      await releaseMicrophone();
      setMode('idle');
      notify('Não foi possível gravar', 'O microfone não pôde ser usado agora. Tente de novo.');
    } finally {
      starting.current = false;
    }
  };

  const finish = () => {
    if (mode === 'plain') return finishPlain();
    if (mode === 'speech' && !finishing.current) {
      finishing.current = true;
      setMode('finishing');
      session.current?.stop();
    }
  };

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  useEffect(() => {
    if (seconds >= MAX_RECORDING_SEC) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  // Leaving the screen mid-recording: `useAudioRecorder` releases the recorder on
  // unmount, which stops it natively. It must not be touched here (it is already
  // released and would throw), so only the audio session is reset; a
  // transcription in progress is cancelled.
  useEffect(
    () => () => {
      session.current?.abort();
      void releaseMicrophone();
    },
    [],
  );

  const recording = mode === 'speech' || mode === 'plain';

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>
        {mode === 'finishing' ? 'Salvando…' : recording ? (mode === 'speech' ? 'Gravando e transcrevendo…' : 'Gravando…') : title}
      </Text>
      <View style={styles.track} accessible accessibilityLabel={`${seconds} de ${MAX_RECORDING_SEC} segundos`}>
        <View style={[styles.fill, { width: `${(seconds / MAX_RECORDING_SEC) * 100}%` }]} />
      </View>
      <Text style={styles.detail}>
        {seconds}s / {MAX_RECORDING_SEC}s
      </Text>
      {mode === 'speech' || (mode === 'finishing' && partial) ? (
        <Text style={styles.partial} accessibilityLiveRegion="polite">
          {partial || 'Fale normalmente — o texto aparece aqui.'}
        </Text>
      ) : null}
      {recording ? (
        <Button label="Parar e anexar" onPress={finish} />
      ) : mode === 'idle' ? (
        <View style={styles.row}>
          <Button label="Começar" onPress={start} style={styles.flex} />
          <Button label="Cancelar" variant="secondary" onPress={onCancel} style={styles.flex} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * RF-60 / US-15 CA-01: the transcript under a voice note, editable. Saved when
 * the field loses focus.
 */
export function TranscriptField({
  transcript,
  status,
  onChange,
}: {
  transcript: string | undefined;
  status: TranscriptStatus | undefined;
  onChange: (text: string) => void;
}) {
  const styles = useStyles();
  const [text, setText] = useState(transcript ?? '');
  if (!status) return null;
  return (
    <View style={styles.transcript}>
      <Text style={styles.detail}>
        {status === 'done'
          ? 'Transcrição (toque para editar)'
          : status === 'failed'
            ? 'Não foi possível transcrever este áudio. Se quiser, escreva o que disse:'
            : 'Transcrição indisponível neste aparelho. Se quiser, escreva o que disse:'}
      </Text>
      <Input
        multiline
        accessibilityLabel="Transcrição do áudio"
        placeholder="Texto do áudio"
        value={text}
        onChangeText={setText}
        onBlur={() => text !== (transcript ?? '') && onChange(text)}
      />
    </View>
  );
}

/** Play/pause row for an attached voice note. */
export function AudioClip({ uri, durationSec, onRemove }: { uri: string; durationSec?: number; onRemove?: () => void }) {
  const styles = useStyles();
  const player = useAudioPlayer(resolveMediaUri(uri));
  const status = useAudioPlayerStatus(player);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // Loud speaker, even with the iPhone on silent (see `releaseMicrophone`).
    await releaseMicrophone();
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) await player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.clip}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pausar áudio' : 'Ouvir áudio'}
        onPress={toggle}
        style={styles.play}>
        <Text style={styles.playText}>{status.playing ? '❚❚' : '▶'}</Text>
      </Pressable>
      <Text style={styles.detail}>
        Áudio · {Math.round(status.playing ? status.currentTime : (durationSec ?? status.duration))}s
      </Text>
      <View style={styles.flex} />
      {onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Remover áudio" onPress={onRemove} style={styles.remove}>
          <Text style={styles.removeText}>Remover</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  panel: {
    gap: 10,
    padding: 14,
    borderRadius: MenteRadius.row,
    backgroundColor: c.background,
  },
  title: {
    ...MenteType.captionStrong,
    color: c.text,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    backgroundColor: c.dangerText,
  },
  detail: {
    ...MenteType.small,
    color: c.textMuted,
  },
  partial: {
    ...MenteType.caption,
    color: c.text,
    fontStyle: 'italic',
  },
  transcript: {
    gap: 4,
    width: '100%',
  },
  clip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    borderRadius: MenteRadius.row,
    backgroundColor: c.background,
  },
  play: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    ...MenteType.button,
    color: c.accent,
  },
  remove: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  removeText: {
    ...MenteType.captionStrong,
    color: c.dangerText,
  },
}));
