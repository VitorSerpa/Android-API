import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  anxietyValueText,
  chartDayTitle,
  chartWeekTitle,
  moodNameOf,
  moodValueText,
  profileValueText,
  wellbeingDetails,
} from '@/data/history-charts';

describe('Histórico: textos dos gráficos interativos', () => {
  test('título do dia e da semana em pt-BR curto', () => {
    assert.equal(chartDayTitle('2026-11-05'), 'qui, 5 nov');
    assert.equal(chartDayTitle('2026-03-01'), 'dom, 1 mar');
    assert.equal(chartWeekTitle('2026-10-26'), 'Semana de 26 out');
  });

  test('humor com nome e número; ansiedade em x/10', () => {
    assert.equal(moodNameOf(3.8), 'Feliz');
    assert.equal(moodNameOf(1), 'Muito triste');
    assert.equal(moodNameOf(5), 'Muito feliz');
    assert.equal(moodNameOf(null), null);
    assert.equal(moodValueText(3.8), 'Feliz · 3,8');
    assert.equal(moodValueText(null), null);
    assert.equal(anxietyValueText(4.5), '4,5/10');
    assert.equal(anxietyValueText(0), '0,0/10');
    assert.equal(anxietyValueText(null), null);
    assert.equal(profileValueText(3), '3,0 / 5');
    assert.equal(profileValueText(null), null);
  });

  test('detalhes do radar convertem a porcentagem para a escala original', () => {
    const d = wellbeingDetails({ mood: 75, sleep: 60, anxiety: 45, stress: null, activity: null });
    assert.match(d.mood, /Média 4,0 de 5/);
    assert.match(d.anxiety, /Média 4,5 de 10/);
    assert.match(d.stress, /teste rápido de estresse/);
    assert.match(d.activity, /Registre/);
    assert.match(d.sleep, /Quanto maior, melhor/);
  });
});
