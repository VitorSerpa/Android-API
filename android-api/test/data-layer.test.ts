import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';

import { exportBackup, extensionOf, readBackup } from '@/data/backup';
import { createDefaultUserData, migrate } from '@/data/defaults';
import { DATA_VERSION, type UserData } from '@/data/types';
import { createActions, type Recipe } from '@/data/user-data-actions';
import { toDayKey } from '@/lib/dates';

import { filesControl } from './mocks/files';
import { mediaFiles } from './mocks/media';
import { checkIn, diary } from './helpers';

/** Runs the real actions against an in-memory document, like the store does. */
function harness(initial: UserData = createDefaultUserData()) {
  let data = initial;
  let writes = 0;
  const actions = createActions((recipe: Recipe) => {
    const next = recipe(data);
    if (next !== data) writes += 1;
    data = next;
  });
  return {
    actions,
    get data() {
      return data;
    },
    get writes() {
      return writes;
    },
  };
}

/* ------------------------------------------------------------------ */

describe('Ações do store (Sprint 2)', () => {
  test('RF-60 / US-15 CA-01: a transcrição de um áudio do diário pode ser editada', () => {
    const store = harness();
    const entryId = store.actions.saveDiaryEntry({
      day: toDayKey(),
      kind: 'free',
      profileId: null,
      text: '',
      gratitude: null,
      dreamEmotion: null,
      attachments: [],
    });
    store.actions.addAttachment(entryId, { id: 'a1', kind: 'audio', uri: 'x.wav', transcript: 'olá', transcriptStatus: 'done', createdAt: '' });
    store.actions.updateAttachment(entryId, 'a1', { transcript: 'olá, mundo' });
    const attachment = store.data.diary[0].attachments[0];
    assert.equal(attachment.transcript, 'olá, mundo');
    assert.equal(attachment.transcriptStatus, 'done');
    assert.equal(attachment.uri, 'x.wav', 'o áudio continua o mesmo');
  });

  test('RF-61: conquistas são criadas com o dia de hoje, renomeadas e apagadas', () => {
    const store = harness();
    const id = store.actions.addAchievement({ uri: 'v.wav', durationSec: 12, title: 'corri', transcriptStatus: 'done' });
    store.actions.addAchievement({ uri: 'w.wav', durationSec: 5, title: '', transcriptStatus: 'failed' });
    assert.equal(store.data.achievements.length, 2);
    assert.equal(store.data.achievements[1].id, id, 'a mais nova fica primeiro');
    assert.equal(store.data.achievements[1].day, toDayKey());
    store.actions.renameAchievement(id, 'Corri 5 km');
    assert.equal(store.data.achievements.find((item) => item.id === id)!.title, 'Corri 5 km');
    store.actions.deleteAchievement(id);
    assert.equal(store.data.achievements.length, 1);
  });

  test('RF-69: atalhos favoritos alternam e mantêm a ordem de inclusão', () => {
    const store = harness();
    store.actions.toggleFavoriteTechnique('word-game');
    store.actions.toggleFavoriteTechnique('breathing');
    assert.deepEqual(store.data.favoriteTechniques, ['word-game', 'breathing']);
    store.actions.toggleFavoriteTechnique('word-game');
    assert.deepEqual(store.data.favoriteTechniques, ['breathing']);
  });

  test('RF-70 / US-19 CA-01: a pergunta da manhã é marcada uma vez por dia', () => {
    const store = harness();
    store.actions.markMorningAsked('2026-11-03');
    const writes = store.writes;
    store.actions.markMorningAsked('2026-11-03');
    assert.equal(store.writes, writes, 'marcar de novo no mesmo dia não grava nada');
    assert.equal(store.data.settings.morningCheckIn.lastAskedOn, '2026-11-03');
    store.actions.markMorningAsked('2026-11-04');
    assert.equal(store.data.settings.morningCheckIn.lastAskedOn, '2026-11-04');
  });

  test('RF-66 e RF-71: duração da respiração e objetivo semanal são configurações', () => {
    const store = harness();
    store.actions.updateSettings({ breathingMinutes: 5, weeklyMoodGoal: 3.5 });
    assert.equal(store.data.settings.breathingMinutes, 5);
    assert.equal(store.data.settings.weeklyMoodGoal, 3.5);
    assert.equal(store.data.settings.offlineMode, false, 'o resto continua igual');
  });

  test('RF-72: apagar os locais salvos mantém os picos de ansiedade', () => {
    const store = harness();
    const id = store.actions.logCrisis(7);
    store.actions.logCrisis(4);
    store.actions.updateCrisis(id, { location: { latitude: -23.5, longitude: -46.6, accuracy: 10 } });
    store.actions.clearCrisisLocations();
    assert.equal(store.data.crises.length, 2);
    assert.ok(store.data.crises.every((item) => item.location === null));
    const writes = store.writes;
    store.actions.clearCrisisLocations();
    assert.equal(store.writes, writes, 'sem locais, não grava nada');
  });

  test('RF-58: applyRemote aplica a mesclagem sobre o estado mais recente', () => {
    const store = harness();
    store.actions.saveCheckIn({ mood: 3, anxiety: 2, anxietyNote: '', energy: 4, profileId: null });
    store.actions.applyRemote((current) => ({ ...current, checkIns: [...current.checkIns, checkIn('2026-01-01', { id: 'remote' })] }));
    assert.equal(store.data.checkIns.length, 2);
  });
});

/* ------------------------------------------------------------------ */

describe('Migração do documento', () => {
  test('documentos salvos antes da Sprint 2 ganham os campos novos com valores padrão', () => {
    const sprint1 = JSON.parse(JSON.stringify(createDefaultUserData())) as Record<string, any>;
    delete sprint1.achievements;
    delete sprint1.favoriteTechniques;
    delete sprint1.settings.breathingMinutes;
    delete sprint1.settings.morningCheckIn;
    delete sprint1.settings.weeklyMoodGoal;
    sprint1.checkIns = [checkIn('2026-10-01', { id: 'kept' })];
    const migrated = migrate(sprint1);
    assert.deepEqual(migrated.achievements, []);
    assert.deepEqual(migrated.favoriteTechniques, []);
    assert.equal(migrated.settings.breathingMinutes, 1);
    assert.equal(migrated.settings.weeklyMoodGoal, null);
    assert.deepEqual(migrated.settings.morningCheckIn, { enabled: false, start: '05:00', end: '11:00', lastAskedOn: null });
    assert.deepEqual(migrated.checkIns.map((item) => item.id), ['kept']);
    assert.equal(migrated.version, DATA_VERSION);
  });

  test('configuração parcial da pergunta da manhã é completada, sem perder o que existe', () => {
    const doc = JSON.parse(JSON.stringify(createDefaultUserData()));
    doc.settings.morningCheckIn = { enabled: true };
    const migrated = migrate(doc);
    assert.deepEqual(migrated.settings.morningCheckIn, { enabled: true, start: '05:00', end: '11:00', lastAskedOn: null });
  });

  test('itens padrão têm ids fixos (base da sincronização sem duplicatas)', () => {
    const a = createDefaultUserData();
    const b = createDefaultUserData();
    assert.deepEqual(a.reminders.map((item) => item.id), b.reminders.map((item) => item.id));
    assert.deepEqual(a.goals.map((item) => item.id), b.goals.map((item) => item.id));
  });
});

/* ------------------------------------------------------------------ */

describe('Backup JSON (RF-38) com os dados da Sprint 2', () => {
  beforeEach(() => {
    mediaFiles.clear();
    filesControl.shared.length = 0;
  });

  test('a extensão do arquivo é preservada (áudios transcritos são .wav)', () => {
    assert.equal(extensionOf({ uri: 'file:///media/a.wav', kind: 'audio' }), 'wav');
    assert.equal(extensionOf({ uri: 'file:///media/a.m4a', kind: 'audio' }), 'm4a');
    assert.equal(extensionOf({ uri: 'file:///media/a.JPG', kind: 'photo' }), 'jpg');
    assert.equal(extensionOf({ uri: 'data:audio/wav;base64,AAA', kind: 'audio' }), 'wav');
    assert.equal(extensionOf({ uri: 'data:audio/mp4;base64,AAA', kind: 'audio' }), 'm4a');
    assert.equal(extensionOf({ uri: 'blob:xyz', kind: 'photo' }), 'jpg');
  });

  test('exporta e restaura conquistas e áudios com transcrição, com os arquivos', async () => {
    mediaFiles.set('file:///media/note.wav', 'V0FWREFUQQ==');
    mediaFiles.set('file:///media/diary.wav', 'RElBUlk=');
    const data: UserData = {
      ...createDefaultUserData(),
      achievements: [
        { id: 'n1', day: '2026-11-03', uri: 'file:///media/note.wav', durationSec: 9, title: 'Corri', transcriptStatus: 'done', createdAt: '2026-11-03T10:00:00.000Z' },
      ],
      diary: [
        diary('2026-11-03', 'texto', {
          attachments: [{ id: 'a', kind: 'audio', uri: 'file:///media/diary.wav', transcript: 'oi', transcriptStatus: 'done', createdAt: '' }],
        }),
      ],
      favoriteTechniques: ['word-game'],
    };
    await exportBackup(data);
    assert.equal(filesControl.shared.length, 1);
    const file = JSON.parse(filesControl.shared[0].json);
    assert.equal(file.data.achievements[0].base64, 'V0FWREFUQQ==');

    mediaFiles.clear(); // outro aparelho
    filesControl.nextPick = filesControl.shared[0].json;
    const restored = (await readBackup())!;
    const note = restored.achievements[0];
    assert.match(note.uri, /\.wav$/);
    assert.equal(mediaFiles.get(note.uri), 'V0FWREFUQQ==');
    assert.equal(note.title, 'Corri');
    assert.ok(!('base64' in note));
    const audio = restored.diary[0].attachments[0];
    assert.match(audio.uri, /\.wav$/);
    assert.equal(audio.transcript, 'oi');
    assert.deepEqual(restored.favoriteTechniques, ['word-game']);
  });

  test('conquistas cujo arquivo sumiu ficam de fora da restauração', async () => {
    const data: UserData = {
      ...createDefaultUserData(),
      achievements: [{ id: 'gone', day: '2026-11-03', uri: 'file:///media/gone.wav', durationSec: 3, title: '', transcriptStatus: 'failed', createdAt: '' }],
    };
    await exportBackup(data);
    filesControl.nextPick = filesControl.shared[0].json;
    assert.deepEqual((await readBackup())!.achievements, []);
  });
});
