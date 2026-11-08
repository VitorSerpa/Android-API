import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { correlation, describeSleepMood, moodByProfile, mostBalancedProfile, recentWeeks, sleepMoodPoints } from '@/data/comparisons';
import { morningQuestionDue, weeklyCalmSessions, weeklyMoodGoalStatus } from '@/data/insights';
import { dayTimeline } from '@/data/timeline';
import type { UserData } from '@/data/types';
import { diaryWordFrequencies, fontSizeFor } from '@/data/word-cloud';
import { newRound, ROUND_LENGTH, roundMessage, WORD_CATEGORIES } from '@/data/word-game';
import { toDayKey } from '@/lib/dates';

import { at, checkIn, daysAgo, diary, freshData, health, practice } from './helpers';

const withData = (patch: Partial<UserData>): UserData => ({ ...freshData(), ...patch });

/* ------------------------------------------------------------------ */

describe('Linha do tempo do dia (RF-62 / US-16 CA-01)', () => {
  const day = '2026-10-20';
  const data = withData({
    checkIns: [checkIn(day, { id: 'late', at: at(day, 21), mood: 4 }), checkIn(day, { id: 'early', at: at(day, 7), mood: 1 })],
    health: { [day]: health(day, { activities: ['Leitura'], symptoms: ['Cansaço'], updatedAt: at(day, 13) }) },
    diary: [
      diary(day, 'Texto livre', { id: 'free1', createdAt: at(day, 15) }),
      // Como o app grava: os três itens também vão para `text`.
      diary(day, 'a\nb\nc', { id: 'grat', kind: 'gratitude', gratitude: ['a', 'b', 'c'], createdAt: at(day, 22) }),
      diary('2026-10-21', 'outro dia'),
    ],
    practices: [practice(new Date(at(day, 8)), 'breathing', 180)],
    crises: [
      {
        id: 'cr',
        at: at(day, 11),
        intensity: 8,
        triggers: { situation: 'Reunião', place: '', thought: '' },
        note: '',
        location: { latitude: 1, longitude: 2, accuracy: null },
      },
    ],
  });
  const events = dayTimeline(data, day);

  test('todos os eventos do dia, só dele, em ordem de horário', () => {
    assert.deepEqual(
      events.map((event) => event.kind),
      ['checkin', 'practice', 'crisis', 'health', 'diary', 'checkin', 'diary'],
    );
    const times = events.map((event) => event.at);
    assert.deepEqual(times, [...times].sort());
  });

  test('o registro completo traz os detalhes de cada evento', () => {
    const crisis = events.find((event) => event.kind === 'crisis')!;
    assert.ok(crisis.details.includes('Intensidade 8/10'));
    assert.ok(crisis.details.includes('Situação: Reunião'));
    assert.ok(crisis.details.includes('Local salvo com a sua permissão'));
    const healthEvent = events.find((event) => event.kind === 'health')!;
    assert.ok(healthEvent.summary.includes('Leitura') && healthEvent.summary.includes('Cansaço'));
    assert.equal(events[0].title, 'Humor: Triste');
  });

  test('só a escrita livre abre na tela do diário; os outros abrem no lugar', () => {
    const diaries = events.filter((event) => event.kind === 'diary');
    assert.equal(diaries.find((event) => event.id === 'diary:free1')!.diaryEntryId, 'free1');
    assert.equal(diaries.find((event) => event.id === 'diary:grat')!.diaryEntryId, undefined);
  });

  test('dia vazio não tem eventos', () => {
    assert.deepEqual(dayTimeline(freshData(), day), []);
  });
});

/* ------------------------------------------------------------------ */

describe('Nuvem de palavras (RF-63 / US-16 CA-02)', () => {
  const data = withData({
    diary: [
      diary(daysAgo(1), 'O trabalho foi pesado, mas a caminhada no parque me acalmou.'),
      diary(daysAgo(2), 'TRABALHO e mais trabalho! Depois, parque com a família.'),
      diary(daysAgo(3), '', {
        attachments: [{ id: 'a', kind: 'audio', uri: 'x.wav', transcript: 'gratidão pela família', transcriptStatus: 'done', createdAt: '' }],
      }),
      diary(daysAgo(60), 'viagem antiga'),
    ],
  });

  test('ignora artigos, preposições e palavras comuns, sem diferenciar maiúsculas', () => {
    const words = diaryWordFrequencies(data, { days: 30 });
    const list = words.map((item) => item.word);
    for (const stop of ['o', 'a', 'foi', 'mas', 'no', 'me', 'e', 'mais', 'com', 'depois', 'pela']) {
      assert.ok(!list.includes(stop), `"${stop}" deveria ser ignorada`);
    }
    assert.deepEqual(words[0], { word: 'trabalho', count: 3 });
    assert.equal(words.find((item) => item.word === 'parque')!.count, 2);
  });

  test('inclui as transcrições dos áudios e respeita o período', () => {
    const recent = diaryWordFrequencies(data, { days: 30 }).map((item) => item.word);
    assert.ok(recent.includes('gratidão'));
    assert.ok(!recent.includes('viagem'));
    assert.ok(diaryWordFrequencies(data).some((item) => item.word === 'viagem'), 'sem período: tudo');
  });

  test('tamanho proporcional à frequência', () => {
    assert.equal(fontSizeFor(1, 1, 5), 13);
    assert.equal(fontSizeFor(5, 1, 5), 34);
    assert.ok(fontSizeFor(3, 1, 5) > fontSizeFor(2, 1, 5));
    assert.equal(fontSizeFor(2, 2, 2), Math.round((13 + 34) / 2), 'todas iguais: tamanho médio');
  });
});

/* ------------------------------------------------------------------ */

describe('Sono × humor do dia seguinte (RF-64 / US-17 CA-01)', () => {
  test('cada ponto pareia as horas da noite com o humor do dia em que a pessoa acordou', () => {
    const d1 = daysAgo(2);
    const d2 = daysAgo(1);
    const data = withData({
      health: { [d1]: health(d1, { sleepHours: 5 }), [d2]: health(d2, { sleepHours: 8.5 }), [daysAgo(3)]: health(daysAgo(3)) },
      checkIns: [checkIn(d1, { mood: 0 }), checkIn(d1, { mood: 2 }), checkIn(d2, { mood: 4 })],
    });
    assert.deepEqual(sleepMoodPoints(data), [
      { day: d1, sleepHours: 5, mood: 2 },
      { day: d2, sleepHours: 8.5, mood: 5 },
    ]);
  });

  test('dias sem check-in ou sem horas de sono ficam de fora; janela de 90 dias', () => {
    const old = daysAgo(120);
    const data = withData({ health: { [old]: health(old, { sleepHours: 7 }) }, checkIns: [checkIn(old)] });
    assert.deepEqual(sleepMoodPoints(data), []);
  });

  test('correlação e frase descritiva', () => {
    const points = [5, 6, 7, 8].map((hours, index) => ({ day: `d${index}`, sleepHours: hours, mood: index + 1 }));
    assert.ok(correlation(points)! > 0.99);
    assert.match(describeSleepMood(points), /tende a ser melhor/);
    const inverse = points.map((point) => ({ ...point, mood: 6 - point.mood }));
    assert.match(describeSleepMood(inverse), /mais baixo/);
    assert.equal(correlation(points.slice(0, 2)), null);
    assert.match(describeSleepMood(points.slice(0, 2)), /\(2 de 3\)/);
    assert.equal(correlation(points.map((point) => ({ ...point, mood: 3 }))), null, 'sem variação');
  });
});

/* ------------------------------------------------------------------ */

describe('Humor por perfil de vida (RF-65 / US-17 CA-02)', () => {
  const now = new Date(2026, 10, 4, 12); // quarta-feira
  const thisWeek = toDayKey(now);
  const lastWeek = toDayKey(new Date(2026, 9, 28));
  const data = withData({
    checkIns: [
      checkIn(thisWeek, { profileId: 'trabalho', mood: 1 }),
      checkIn(thisWeek, { profileId: 'trabalho', mood: 3 }),
      checkIn(lastWeek, { profileId: 'trabalho', mood: 0 }),
      checkIn(thisWeek, { profileId: 'lazer', mood: 4 }),
      checkIn(thisWeek, { profileId: 'lazer', mood: 4 }),
      checkIn(lastWeek, { profileId: 'lazer', mood: 4 }),
      checkIn(thisWeek, { profileId: null, mood: 0 }),
    ],
  });

  test('8 semanas começando na segunda-feira', () => {
    const weeks = recentWeeks(8, now);
    assert.equal(weeks.length, 8);
    assert.equal(weeks.at(-1)!.start, '2026-11-02');
    assert.equal(weeks.at(-1)!.end, '2026-11-08');
    assert.equal(weeks[0].start, '2026-09-14');
  });

  test('uma curva por perfil, com média semanal e geral; check-ins sem perfil não entram', () => {
    const series = moodByProfile(data, 8, now);
    assert.deepEqual(series.map((item) => item.profileId), ['trabalho', 'familia', 'lazer']);
    const work = series[0];
    assert.equal(work.weekly.at(-1), 3);
    assert.equal(work.weekly.at(-2), 1);
    assert.equal(work.weekly.at(0), null);
    assert.equal(work.count, 3);
    assert.equal(series[1].count, 0);
    assert.equal(mostBalancedProfile(series)!.profileId, 'lazer');
  });

  test('a área mais equilibrada só é apontada com pelo menos dois perfis com dados suficientes', () => {
    const series = moodByProfile(data, 8, now);
    assert.equal(mostBalancedProfile(series, 4), null);
  });
});

/* ------------------------------------------------------------------ */

describe('Sessões da semana (RF-68 / US-18 CA-03)', () => {
  const monday = new Date(2026, 10, 2, 8);
  const sunday = new Date(2026, 10, 1, 20);
  const wednesday = new Date(2026, 10, 4, 12);
  const data = withData({
    practices: [
      practice(sunday, 'breathing'),
      practice(monday, 'breathing'),
      practice(monday, 'meditation'),
      practice(wednesday, 'meditation'),
      practice(wednesday, 'grounding'),
    ],
  });

  test('conta só respiração e meditação desde segunda-feira', () => {
    assert.deepEqual(weeklyCalmSessions(data, wednesday), { total: 3, meditation: 2, breathing: 1 });
  });

  test('reinicia toda segunda-feira', () => {
    assert.deepEqual(weeklyCalmSessions(data, new Date(2026, 10, 9, 0, 5)), { total: 0, meditation: 0, breathing: 0 });
    assert.equal(weeklyCalmSessions(data, sunday).total, 1, 'no domingo ainda vale a semana anterior');
  });
});

describe('Objetivo de humor da semana (RF-71 / US-19 CA-02)', () => {
  const now = new Date(2026, 10, 4, 12);
  const base = freshData();
  const goal = (value: number | null, checkIns = base.checkIns) =>
    weeklyMoodGoalStatus({ ...base, checkIns, settings: { ...base.settings, weeklyMoodGoal: value } }, now);

  test('sem objetivo e sem dados', () => {
    assert.deepEqual(goal(null), { status: 'none' });
    assert.deepEqual(goal(3.5), { status: 'no-data', goal: 3.5 });
  });

  test('acima e abaixo, só com os check-ins da semana', () => {
    const week = [checkIn('2026-11-02', { mood: 3 }), checkIn('2026-11-03', { mood: 4 }), checkIn('2026-10-30', { mood: 0 })];
    assert.deepEqual(goal(4, week), { status: 'above', goal: 4, average: 4.5, days: 2 });
    assert.deepEqual(goal(5, week), { status: 'below', goal: 5, average: 4.5, days: 2 });
  });
});

/* ------------------------------------------------------------------ */

describe('Jogo de palavras (RF-73)', () => {
  test('rodada com 3 categorias e 10 palavras, cada uma da categoria indicada', () => {
    for (let run = 0; run < 50; run += 1) {
      const round = newRound();
      assert.equal(round.categories.length, 3);
      assert.equal(new Set(round.categories.map((category) => category.id)).size, 3);
      assert.equal(round.words.length, ROUND_LENGTH);
      assert.equal(new Set(round.words.map((item) => item.word)).size, ROUND_LENGTH, 'sem palavra repetida');
      for (const item of round.words) {
        const category = round.categories.find((entry) => entry.id === item.categoryId);
        assert.ok(category?.words.includes(item.word));
      }
    }
  });

  test('nenhuma palavra pertence a duas categorias', () => {
    const all = WORD_CATEGORIES.flatMap((category) => category.words);
    assert.equal(new Set(all).size, all.length);
  });

  test('mensagens gentis para qualquer pontuação', () => {
    assert.match(roundMessage(10, 10), /perfeita/);
    assert.match(roundMessage(7, 10), /Muito bem/);
    assert.match(roundMessage(0, 10), /mais uma rodada/);
  });
});

/* ------------------------------------------------------------------ */

describe('Pergunta da manhã (RF-70 / US-19 CA-01)', () => {
  const morning = (patch: Partial<UserData['settings']['morningCheckIn']> = {}, checkIns: UserData['checkIns'] = []) => {
    const base = freshData();
    return { ...base, checkIns, settings: { ...base.settings, morningCheckIn: { ...base.settings.morningCheckIn, enabled: true, ...patch } } };
  };
  const at7 = new Date(2026, 10, 4, 7, 30);

  test('pergunta na janela da manhã, se ainda não houver check-in', () => {
    assert.equal(morningQuestionDue(morning(), at7), 'ask');
  });

  test('desligada, fora da janela ou já perguntada hoje: nada', () => {
    assert.equal(morningQuestionDue(morning({ enabled: false }), at7), 'none');
    assert.equal(morningQuestionDue(morning(), new Date(2026, 10, 4, 14)), 'none');
    assert.equal(morningQuestionDue(morning(), new Date(2026, 10, 4, 4, 59)), 'none');
    assert.equal(morningQuestionDue(morning({ lastAskedOn: '2026-11-04' }), at7), 'none');
    assert.equal(morningQuestionDue(morning({ lastAskedOn: '2026-11-03' }), at7), 'ask', 'no dia seguinte pergunta de novo');
  });

  test('com check-in já feito hoje, só marca o dia (não abre a pergunta)', () => {
    assert.equal(morningQuestionDue(morning({}, [checkIn('2026-11-04')]), at7), 'mark');
    assert.equal(morningQuestionDue(morning({}, [checkIn('2026-11-03')]), at7), 'ask', 'check-in de ontem não conta');
  });

  test('janelas que cruzam a meia-noite funcionam', () => {
    assert.equal(morningQuestionDue(morning({ start: '23:00', end: '02:00' }), new Date(2026, 10, 4, 1, 0)), 'ask');
    assert.equal(morningQuestionDue(morning({ start: '23:00', end: '02:00' }), at7), 'none');
  });
});
