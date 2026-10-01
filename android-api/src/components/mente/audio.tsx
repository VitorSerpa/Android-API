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

import { Button, MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { notify } from '@/lib/dialogs';
import { makeStyles } from '@/theme';

/** RF-10: voice notes are capped at 30 seconds. */
export const MAX_RECORDING_SEC = 30;

const releaseMicrophone = () => setAudioModeAsync({ allowsRecording: false }).catch(() => {});

/**
 * Records up to 30 s. It stops by itself at the limit and switches the audio
 * session back to playback-only, which releases the microphone (CA-04 / RNF-06).
 *
 * The elapsed time comes from our own clock, not the recorder's status: once
 * Android stops a recording it resets `durationMillis` to 0, so the limit is
 * enforced here, while the recorder still holds the file. The native
 * `forDuration` is only a safety net for when JS timers are paused.
 */
export function AudioRecorderPanel({ onRecorded, onCancel }: { onRecorded: (uri: string, durationSec: number) => void; onCancel: () => void }) {
  const styles = useStyles();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const starting = useRef(false);
  const finishing = useRef(false);
  const started = startedAt !== null;
  const seconds = started ? Math.min(Math.floor((now - startedAt) / 1000), MAX_RECORDING_SEC) : 0;

  const finish = async () => {
    if (finishing.current || startedAt === null) return;
    finishing.current = true;
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
    if (stopped && recorder.uri && duration > 0.5) onRecorded(recorder.uri, duration);
    else onCancel();
  };

  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        notify('Permissão necessária', 'Permita o uso do microfone nas configurações do Android para gravar áudios.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_RECORDING_SEC + 1 });
      const time = Date.now();
      setNow(time);
      setStartedAt(time);
    } catch (error) {
      console.error('Falha ao iniciar a gravação', error);
      await releaseMicrophone();
      notify('Não foi possível gravar', 'O microfone não pôde ser usado agora. Tente de novo.');
    } finally {
      starting.current = false;
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
  // released and would throw), so only the audio session is reset.
  useEffect(() => () => void releaseMicrophone(), []);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{started ? 'Gravando…' : 'Gravar áudio (até 30 s)'}</Text>
      <View style={styles.track} accessible accessibilityLabel={`${seconds} de ${MAX_RECORDING_SEC} segundos`}>
        <View style={[styles.fill, { width: `${(seconds / MAX_RECORDING_SEC) * 100}%` }]} />
      </View>
      <Text style={styles.detail}>
        {seconds}s / {MAX_RECORDING_SEC}s
      </Text>
      {started ? (
        <Button label="Parar e anexar" onPress={finish} />
      ) : (
        <View style={styles.row}>
          <Button label="Começar" onPress={start} style={styles.flex} />
          <Button label="Cancelar" variant="secondary" onPress={onCancel} style={styles.flex} />
        </View>
      )}
    </View>
  );
}

/** Play/pause row for an attached voice note. */
export function AudioClip({ uri, durationSec, onRemove }: { uri: string; durationSec?: number; onRemove?: () => void }) {
  const styles = useStyles();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) player.seekTo(0);
      player.play();
    }
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
