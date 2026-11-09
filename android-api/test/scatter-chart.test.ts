import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { SleepMoodPoint } from '@/data/comparisons';
import {
  describePoint,
  formatHours,
  formatMoodScore,
  formatPointDate,
  leastSquares,
  moodNameFor,
  nearestPointIndex,
  sleepDomain,
  stepIndex,
  trendSegment,
} from '@/lib/scatter-chart';

const point = (day: string, sleepHours: number, mood: number): SleepMoodPoint => ({ day, sleepHours, mood });

describe('Gráfico sono × humor: interação (RF-64)', () => {
  test('o eixo de horas cobre 4h–10h e se alarga para noites fora disso', () => {
    assert.deepEqual(sleepDomain([]), { minX: 4, maxX: 10 });
    assert.deepEqual(sleepDomain([point('2026-10-01', 7, 3)]), { minX: 4, maxX: 10 });
    assert.deepEqual(sleepDomain([point('2026-10-01', 2.5, 3), point('2026-10-02', 11.2, 4)]), { minX: 2, maxX: 12 });
  });

  test('o toque seleciona o ponto mais próximo dentro do raio, ou nenhum', () => {
    const dots = [
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      { x: 56, y: 50 },
    ];
    assert.equal(nearestPointIndex(dots, { x: 12, y: 9 }), 0);
    assert.equal(nearestPointIndex(dots, { x: 55, y: 52 }), 2);
    assert.equal(nearestPointIndex(dots, { x: 200, y: 200 }), null);
    assert.equal(nearestPointIndex(dots, { x: 40, y: 50 }, 5), null);
    assert.equal(nearestPointIndex([], { x: 0, y: 0 }), null);
    // Empate: fica o primeiro (a noite mais antiga).
    assert.equal(nearestPointIndex([{ x: 0, y: 0 }, { x: 0, y: 0 }], { x: 1, y: 1 }), 0);
  });

  test('a reta de tendência é a de mínimos quadrados e exige 3 noites com variação', () => {
    assert.equal(leastSquares([point('a', 6, 2), point('b', 8, 4)]), null);
    assert.equal(leastSquares([point('a', 7, 2), point('b', 7, 4), point('c', 7, 5)]), null);
    const fit = leastSquares([point('a', 5, 2), point('b', 6, 3), point('c', 7, 4)]);
    assert.ok(fit);
    assert.ok(Math.abs(fit.slope - 1) < 1e-9);
    assert.ok(Math.abs(fit.intercept + 3) < 1e-9);
  });

  test('o segmento da tendência fica dentro do eixo de humor (1 a 5)', () => {
    // humor = horas − 3: sai de 1 em 4h e chega a 5 em 8h.
    const segment = trendSegment({ slope: 1, intercept: -3 }, 2, 12);
    assert.deepEqual(segment, { x1: 4, y1: 1, x2: 8, y2: 5 });
    assert.deepEqual(trendSegment({ slope: 0, intercept: 3 }, 4, 10), { x1: 4, y1: 3, x2: 10, y2: 3 });
    assert.equal(trendSegment({ slope: 0, intercept: 7 }, 4, 10), null);
    const falling = trendSegment({ slope: -0.1, intercept: 4 }, 4, 10);
    assert.ok(falling && falling.y1 > falling.y2 && falling.x1 === 4 && falling.x2 === 10);
  });

  test('os textos usam vírgula decimal e o nome do humor arredondado', () => {
    assert.equal(formatHours(7), '7');
    assert.equal(formatHours(7.5), '7,5');
    assert.equal(formatHours(6.96), '7');
    assert.equal(formatMoodScore(3.75), '3,8');
    assert.equal(formatMoodScore(4), '4,0');
    assert.equal(moodNameFor(3.8), 'Feliz');
    assert.equal(moodNameFor(1), 'Muito triste');
    assert.equal(moodNameFor(5), 'Muito feliz');
    assert.equal(moodNameFor(2.5), 'Neutro');
    assert.equal(moodNameFor(9), 'Muito feliz');
  });

  test('o cartão do ponto mostra data, sono e humor', () => {
    assert.equal(formatPointDate('2026-10-24'), 'Sáb, 24 de Outubro');
    const details = describePoint(point('2026-10-24', 7.5, 3.75));
    assert.equal(details.date, 'Sáb, 24 de Outubro');
    assert.equal(details.sleep, '7,5 h de sono');
    assert.equal(details.mood, 'Feliz (3,8)');
    assert.match(details.accessibilityLabel, /7,5 h de sono/);
    assert.match(details.accessibilityLabel, /3,8 de 5/);
  });

  test('o leitor de tela percorre as noites em ordem, dando a volta', () => {
    assert.equal(stepIndex(null, 1, 3), 0);
    assert.equal(stepIndex(null, -1, 3), 2);
    assert.equal(stepIndex(2, 1, 3), 0);
    assert.equal(stepIndex(0, -1, 3), 2);
    assert.equal(stepIndex(null, 1, 0), null);
  });
});
