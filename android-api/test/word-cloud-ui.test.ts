import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { UserData } from '@/data/types';
import { diaryWordFrequencies } from '@/data/word-cloud';
import {
  countWordIn,
  diaryWordEntries,
  entryRowLabel,
  findWordEntries,
  timesLabel,
  wordSnippet,
  wordUsageSummary,
} from '@/data/word-cloud-ui';

import { at, daysAgo, diary, freshData } from './helpers';

const withData = (patch: Partial<UserData>): UserData => ({ ...freshData(), ...patch });

describe('Nuvem de palavras interativa (RF-63 / US-16)', () => {
  test('conta só palavras inteiras, sem diferenciar maiúsculas e pontuação', () => {
    assert.equal(countWordIn('Calma, calma! Calmamente... CALMA.', 'calma'), 3);
    assert.equal(countWordIn('Nada aqui', 'calma'), 0);
    assert.equal(countWordIn('bem-estar e bem estar', 'bem-estar'), 1);
  });

  test('lista os registros mais recentes primeiro, no máximo 5', () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      id: `e${index}`,
      day: `2026-10-0${index + 1}`,
      text: index === 3 ? 'nada' : `Senti ansiedade ${index}`,
    }));
    const found = findWordEntries(entries, 'ansiedade');
    assert.deepEqual(
      found.map((match) => match.id),
      ['e6', 'e5', 'e4', 'e2', 'e1'],
    );
    assert.equal(findWordEntries(entries, 'ansiedade', { limit: 2 }).length, 2);
    assert.equal(findWordEntries(entries, 'inexistente').length, 0);
  });

  test('no mesmo dia, o registro criado depois vem primeiro', () => {
    const found = findWordEntries(
      [
        { id: 'manha', day: '2026-10-20', text: 'paz', createdAt: at('2026-10-20', 8) },
        { id: 'noite', day: '2026-10-20', text: 'paz paz', createdAt: at('2026-10-20', 22) },
      ],
      'paz',
    );
    assert.deepEqual(
      found.map((match) => [match.id, match.count]),
      [
        ['noite', 2],
        ['manha', 1],
      ],
    );
  });

  test('o trecho mostra a palavra com reticências onde foi cortado', () => {
    const text = 'Hoje acordei cedo e fui caminhar no parque perto de casa, e senti muita gratidão pelo sol e pelo vento fresco da manhã.';
    const snippet = wordSnippet(text, 'gratidão', 20);
    assert.match(snippet, /gratidão/);
    assert.ok(snippet.startsWith('…'));
    assert.ok(snippet.endsWith('…'));
    assert.equal(wordSnippet('Curto e calmo', 'calmo'), 'Curto e calmo');
  });

  test('textos de apoio em português', () => {
    assert.equal(timesLabel(1), '1 vez');
    assert.equal(timesLabel(4), '4 vezes');
    assert.equal(wordUsageSummary('calma', 3), '“calma” aparece 3 vezes');
    assert.equal(entryRowLabel({ day: '2026-10-24', kind: 'gratitude' }), '24 de Outubro · Gratidão');
    assert.equal(entryRowLabel({ day: '2026-10-24' }), '24 de Outubro');
  });

  test('os registros do diário somam o mesmo total que a nuvem conta', () => {
    const data = withData({
      diary: [
        diary(daysAgo(0), 'Trabalho cansativo, trabalho demais'),
        diary(daysAgo(1), 'x\ny\nz', { kind: 'gratitude', gratitude: ['trabalho novo', 'família', 'sol'] }),
        diary(daysAgo(2), '', {
          attachments: [{ transcript: 'Falei do trabalho' } as UserData['diary'][number]['attachments'][number]],
        }),
        diary(daysAgo(60), 'trabalho antigo'),
      ],
    });
    const cloud = diaryWordFrequencies(data, { days: 30 });
    const word = cloud.find((item) => item.word === 'trabalho');
    assert.equal(word?.count, 4);

    const entries = diaryWordEntries(data, { days: 30 });
    assert.equal(entries.length, 3);
    const total = findWordEntries(entries, 'trabalho', { limit: 99 }).reduce((sum, match) => sum + match.count, 0);
    assert.equal(total, word?.count);
    assert.equal(diaryWordEntries(data).length, 4);
  });
});
