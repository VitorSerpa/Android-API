import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, MIN_TOUCH } from '@/components/mente/ui';
import { MenteRadius, MenteType } from '@/constants/mente-theme';
import { notify } from '@/lib/dialogs';
import { makeStyles } from '@/theme';

/** RF-10: voice notes are capped at 30 seconds. */
export const MAX_RECORDING_SEC = 30;

/**
 * Records up to 30 s. It stops by itself at the limit and switches the audio
 * session back to playback-only, which releases the microphone (CA-04 / RNF-06).
 */
export function AudioRecorderPanel({ onRecorded, onCancel }: { onRecorded: (uri: string, durationSec: number) => void; onCancel: () => void }) {
  const styles = useStyles();
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [started, setStarted] = useState(false);
  const finishing = useRef(false);
  const seconds = Math.min(Math.floor(state.durationMillis / 1000), MAX_RECORDING_SEC);

  const release = () => setAudioModeAsync({ allowsRecording: false }).catch(() => {});

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    const duration = Math.min(state.durationMillis / 1000, MAX_RECORDING_SEC);
    try {
      if (recorder.isRecording) await recorder.stop();
    } finally {
      await release();
    }
    if (recorder.uri && duration > 0.5) onRecorded(recorder.uri, duration);
    else onCancel();
  };

  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      notify('Permissão necessária', 'Permita o uso do microfone nas configurações do Android para gravar áudios.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: MAX_RECORDING_SEC });
    setStarted(true);
  };

  // The native `forDuration` stops at 30 s; this also covers platforms that ignore it.
  useEffect(() => {
    if (started && (seconds >= MAX_RECORDING_SEC || (!state.isRecording && state.durationMillis > 0))) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, seconds, state.isRecording]);

  // Leaving the screen mid-recording must not keep the microphone open.
  useEffect(
    () => () => {
      if (recorder.isRecording) recorder.stop().catch(() => {});
      release();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
