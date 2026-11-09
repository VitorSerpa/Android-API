import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

import {
  canTranscribeWhileRecording,
  requestTranscriptionPermission,
  startTranscribingRecording,
  TRANSCRIPTION_LANG,
  type TranscribedRecording,
} from '@/lib/transcription';

import { speechControl } from './mocks/expo-speech-recognition';
import { Platform } from './mocks/react-native';

/**
 * RF-60 / US-15: the recording-with-transcription flow, driven by the events
 * Android's recogniser emits (simulated in `mocks/expo-speech-recognition.ts`).
 */

const URI = 'file:///cache/recording_1.wav';

function session(options: { offlineMode?: boolean; maxSeconds?: number } = {}) {
  const partials: string[] = [];
  const results: TranscribedRecording[] = [];
  const handle = startTranscribingRecording({
    maxSeconds: options.maxSeconds ?? 30,
    offlineMode: options.offlineMode ?? false,
    onPartial: (text) => partials.push(text),
    onFinish: (result) => results.push(result),
  });
  return { handle, partials, results };
}

beforeEach(() => {
  speechControl.reset();
  Platform.OS = 'android';
});

describe('Disponibilidade', () => {
  test('no Android e no iPhone, com gravação e serviço de voz disponíveis', () => {
    assert.equal(canTranscribeWhileRecording(false), true);
    speechControl.supportsRecording = false; // Android 12 ou anterior
    assert.equal(canTranscribeWhileRecording(false), false);
    speechControl.reset();
    speechControl.recognitionAvailable = false;
    assert.equal(canTranscribeWhileRecording(false), false);
    speechControl.reset();
    Platform.OS = 'ios';
    assert.equal(canTranscribeWhileRecording(false), true);
    Platform.OS = 'web';
    assert.equal(canTranscribeWhileRecording(false), false);
  });

  test('no modo offline completo exige reconhecimento no próprio aparelho (RF-37)', () => {
    speechControl.onDevice = false;
    assert.equal(canTranscribeWhileRecording(false), true);
    assert.equal(canTranscribeWhileRecording(true), false);
    speechControl.onDevice = true;
    assert.equal(canTranscribeWhileRecording(true), true);
  });

  test('permissão', async () => {
    assert.equal(await requestTranscriptionPermission(), true);
    speechControl.permissionGranted = false;
    assert.equal(await requestTranscriptionPermission(), false);
  });
});

describe('Gravação com transcrição', () => {
  test('inicia em pt-BR, contínuo, gravando o áudio; offline usa o reconhecedor local', () => {
    session().handle.abort();
    session({ offlineMode: true }).handle.abort();
    const [online, offline] = speechControl.started;
    assert.equal(online.lang, TRANSCRIPTION_LANG);
    assert.equal(online.continuous, true);
    assert.equal(online.interimResults, true);
    assert.deepEqual(online.recordingOptions, { persist: true, outputSampleRate: 16000, outputEncoding: 'pcmFormatInt16' });
    assert.equal(online.requiresOnDeviceRecognition, false);
    assert.equal(offline.requiresOnDeviceRecognition, true);
  });

  test('CA-01: junta os trechos finais, mostra o parcial ao vivo e entrega áudio + texto', () => {
    const { handle, partials, results } = session();
    speechControl.emit('audiostart', { uri: URI, timestamp: 1_000 });
    speechControl.emit('result', { isFinal: false, results: [{ transcript: 'hoje eu' }] });
    speechControl.emit('result', { isFinal: true, results: [{ transcript: 'Hoje eu corri' }] });
    speechControl.emit('result', { isFinal: false, results: [{ transcript: 'cinco' }] });
    speechControl.emit('result', { isFinal: true, results: [{ transcript: 'cinco quilômetros.' }] });
    assert.deepEqual(partials, ['hoje eu', 'Hoje eu corri', 'Hoje eu corri cinco', 'Hoje eu corri cinco quilômetros.']);

    handle.stop();
    assert.equal(speechControl.stops, 1);
    speechControl.emit('audioend', { uri: URI, timestamp: 7_500 });
    speechControl.emit('end');

    assert.equal(results.length, 1);
    assert.deepEqual(results[0], {
      uri: URI,
      durationSec: 6.5,
      transcript: 'Hoje eu corri cinco quilômetros.',
      status: 'done',
      problem: null,
    });
    assert.equal(speechControl.listenerCount(), 0, 'os ouvintes nativos são removidos (RNF-06)');
  });

  test('CA-02: sem fala reconhecida, o áudio vem mesmo assim, com o motivo', () => {
    const { results } = session();
    speechControl.emit('audiostart', { uri: URI, timestamp: 0 });
    speechControl.emit('error', { error: 'no-speech', message: 'No speech' });
    speechControl.emit('audioend', { uri: URI, timestamp: 4_000 });
    speechControl.emit('end');
    assert.equal(results[0].uri, URI);
    assert.equal(results[0].status, 'failed');
    assert.equal(results[0].transcript, '');
    assert.equal(results[0].problem, 'Nenhuma fala foi reconhecida.');
  });

  test('CA-02: sem internet para transcrever, avisa o motivo certo', () => {
    const { results } = session();
    speechControl.emit('audiostart', { uri: URI, timestamp: 0 });
    speechControl.emit('error', { error: 'network', message: 'Network' });
    speechControl.emit('end');
    assert.equal(results[0].problem, 'Sem internet para transcrever.');
  });

  test('um texto parcial conta como transcrição mesmo se o reconhecedor terminar com erro', () => {
    const { results } = session();
    speechControl.emit('audiostart', { uri: URI, timestamp: 0 });
    speechControl.emit('result', { isFinal: false, results: [{ transcript: 'tudo bem' }] });
    speechControl.emit('error', { error: 'client', message: 'x' });
    speechControl.emit('end');
    assert.equal(results[0].status, 'done');
    assert.equal(results[0].transcript, 'tudo bem');
  });

  test('RF-10: para sozinho ao atingir o limite e a duração nunca passa dele', () => {
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const { results } = session({ maxSeconds: 30 });
      speechControl.emit('audiostart', { uri: URI, timestamp: 0 });
      mock.timers.tick(29_999);
      assert.equal(speechControl.stops, 0);
      mock.timers.tick(1);
      assert.equal(speechControl.stops, 1, 'pede para parar aos 30 s');
      speechControl.emit('audioend', { uri: URI, timestamp: 30_400 });
      speechControl.emit('end');
      assert.equal(results[0].durationSec, 30);
    } finally {
      mock.timers.reset();
    }
  });

  test('cancelar descarta: não entrega resultado e libera o reconhecedor', () => {
    const { handle, results } = session();
    speechControl.emit('audiostart', { uri: URI, timestamp: 0 });
    handle.abort();
    speechControl.emit('end');
    assert.equal(speechControl.aborts, 1);
    assert.equal(results.length, 0);
    assert.equal(speechControl.listenerCount(), 0);
  });

  test('se o reconhecedor nem inicia, termina na hora sem áudio (o app então grava sem texto)', () => {
    speechControl.startThrows = new Error('Recognizer unavailable');
    const { results } = session();
    assert.equal(results.length, 1);
    assert.equal(results[0].uri, null);
    assert.equal(results[0].status, 'failed');
  });

  test('o resultado é entregue uma única vez', () => {
    const { results } = session();
    speechControl.emit('audiostart', { uri: URI, timestamp: 0 });
    speechControl.emit('end');
    speechControl.emit('end');
    assert.equal(results.length, 1);
  });
});
