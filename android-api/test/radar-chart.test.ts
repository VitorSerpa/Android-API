import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  describeRadarAxis,
  nearestRadarAxis,
  radarLevel,
  radarPoint,
  radarPolygonPoints,
  radarRatio,
  radarValueText,
  toggleRadarSelection,
  validRadarSelection,
} from '@/data/radar';

describe('Radar de bem-estar interativo (RF-22)', () => {
  test('o primeiro eixo aponta para cima e o anel externo fica no raio', () => {
    const p = radarPoint(0, 5, 1, 100, 50);
    assert.ok(Math.abs(p.x - 100) < 1e-9);
    assert.ok(Math.abs(p.y - 50) < 1e-9);
  });

  test('razão ignora valores ausentes e limita 0–100', () => {
    assert.equal(radarRatio(null), 0);
    assert.equal(radarRatio(50), 0.5);
    assert.equal(radarRatio(140), 1);
    assert.equal(radarRatio(-10), 0);
    assert.equal(radarRatio(Number.NaN), 0);
  });

  test('polígono: eixo sem dados fica no centro', () => {
    const points = radarPolygonPoints([100, null, null, null], 100, 50).split(' ');
    assert.equal(points.length, 4);
    assert.equal(points[0], '100,50');
    assert.equal(points[1], '100,100');
  });

  test('toque escolhe o eixo mais próximo pelo ângulo', () => {
    const center = 110;
    for (let index = 0; index < 5; index += 1) {
      const p = radarPoint(index, 5, 0.6, center, 76);
      assert.equal(nearestRadarAxis(p.x, p.y, center, 5), index);
    }
    // Ligeiramente à direita do topo continua sendo o eixo 0.
    assert.equal(nearestRadarAxis(center + 10, center - 60, center, 5), 0);
    // Um pouco à esquerda do topo também (dá a volta em 2π).
    assert.equal(nearestRadarAxis(center - 10, center - 60, center, 5), 0);
  });

  test('toque no centro ou sem eixos não seleciona nada', () => {
    assert.equal(nearestRadarAxis(110, 112, 110, 5), null);
    assert.equal(nearestRadarAxis(0, 0, 110, 0), null);
  });

  test('tocar no mesmo eixo de novo limpa a seleção', () => {
    assert.equal(toggleRadarSelection(null, 2), 2);
    assert.equal(toggleRadarSelection(2, 2), null);
    assert.equal(toggleRadarSelection(2, 3), 3);
  });

  test('seleção inválida quando os eixos mudam vira null', () => {
    assert.equal(validRadarSelection(4, 5), 4);
    assert.equal(validRadarSelection(5, 5), null);
    assert.equal(validRadarSelection(null, 5), null);
  });

  test('texto e nível em termos humanos', () => {
    assert.equal(radarValueText(null), 'sem dados');
    assert.equal(radarValueText(71.6), '72%');
    assert.equal(radarLevel(10), 'baixo');
    assert.equal(radarLevel(50), 'moderado');
    assert.equal(radarLevel(90), 'alto');
    assert.equal(radarLevel(null), 'sem dados');
  });

  test('resumo do eixo inclui o detalhe para leitores de tela', () => {
    const summary = describeRadarAxis({ label: 'Ansiedade', percent: 72, detail: 'Quanto maior, mais intensa.' });
    assert.equal(summary.value, '72 de 100 · nível alto');
    assert.equal(summary.spoken, 'Ansiedade: 72 de 100, nível alto. Quanto maior, mais intensa.');
    const empty = describeRadarAxis({ label: 'Sono', percent: null });
    assert.equal(empty.value, 'Sem dados no período');
    assert.equal(empty.spoken, 'Sono: sem dados no período.');
  });
});
