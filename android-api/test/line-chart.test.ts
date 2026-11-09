import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  areaPath,
  defaultFormat,
  hasValueAt,
  linePath,
  linearTrend,
  nearestIndex,
  pointSummary,
  pointValueText,
  pointX,
  pointY,
  stepIndex,
  tooltipLeft,
  valueRuns,
} from '@/lib/line-chart-math';

const box = { width: 100, height: 50, padX: 0, padY: 0 };

describe('Gráfico de linha: geometria', () => {
  test('pontos espalhados pela largura e valor 0..1 de baixo para cima', () => {
    assert.equal(pointX(0, 5, box), 0);
    assert.equal(pointX(4, 5, box), 100);
    assert.equal(pointX(2, 5, box), 50);
    assert.equal(pointX(0, 1, box), 50);
    assert.equal(pointY(1, box), 0);
    assert.equal(pointY(0, box), 50);
    assert.equal(pointY(2, box), 0, 'valores fora da faixa ficam no gráfico');
    const padded = { width: 100, height: 50, padX: 10, padY: 5 };
    assert.equal(pointX(0, 3, padded), 10);
    assert.equal(pointX(2, 3, padded), 90);
    assert.equal(pointY(0, padded), 45);
  });

  test('lacunas (null) quebram a linha em trechos', () => {
    assert.deepEqual(valueRuns([0.1, 0.2, null, 0.5, null, null, 0.7, 0.8]), [
      { start: 0, values: [0.1, 0.2] },
      { start: 3, values: [0.5] },
      { start: 6, values: [0.7, 0.8] },
    ]);
    assert.deepEqual(valueRuns([null, null]), []);
  });

  test('caminho reto e suave começam e terminam nos pontos', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ];
    assert.equal(linePath(points, 'linear'), 'M0 10L10 0L20 10');
    const smooth = linePath(points, 'smooth');
    assert.match(smooth, /^M0 10C/);
    assert.ok(smooth.endsWith(' 20 10'));
    assert.equal(linePath([{ x: 1, y: 1 }]), '', 'ponto isolado não vira linha');
    assert.equal(areaPath(points, 30, 'linear'), 'M0 10L10 0L20 10L20 30L0 30Z');
  });

  test('curva suave é monótona: não ultrapassa o pico dos dados', () => {
    const points = [
      { x: 0, y: 40 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 40 },
    ];
    const numbers = linePath(points, 'smooth').match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    assert.ok(Math.min(...ys) >= 0, `controle acima do pico: ${ys}`);
  });
});

describe('Gráfico de linha: seleção por toque', () => {
  const series = [{ values: [0.2, null, null, 0.6, 0.4] }, { values: [null, null, null, null, 0.1] }];
  const selectable = (index: number) => hasValueAt(series, index);

  test('acha o índice mais próximo que tem valor', () => {
    assert.equal(nearestIndex(0, 5, box, selectable), 0);
    assert.equal(nearestIndex(30, 5, box, selectable), 0, 'índices vazios são pulados');
    assert.equal(nearestIndex(60, 5, box, selectable), 3);
    assert.equal(nearestIndex(500, 5, box, selectable), 4, 'toque fora da largura vai para a ponta');
    assert.equal(nearestIndex(50, 5, box, () => false), null);
  });

  test('passos de acessibilidade pulam lacunas e param nas pontas', () => {
    assert.equal(stepIndex(null, 1, 5, selectable), 0);
    assert.equal(stepIndex(null, -1, 5, selectable), 4);
    assert.equal(stepIndex(0, 1, 5, selectable), 3);
    assert.equal(stepIndex(4, 1, 5, selectable), 4);
    assert.equal(stepIndex(3, -1, 5, selectable), 0);
  });

  test('tooltip fica dentro da largura', () => {
    assert.equal(tooltipLeft(50, 40, 100), 30);
    assert.equal(tooltipLeft(5, 40, 100), 0);
    assert.equal(tooltipLeft(98, 40, 100), 60);
    assert.equal(tooltipLeft(50, 200, 100), 0);
  });
});

describe('Gráfico de linha: textos e tendência', () => {
  test('displayValues > format > porcentagem; null vira "sem registro"', () => {
    const values = [0.5, null, 1];
    assert.equal(pointValueText({ values, displayValues: ['3,0 / 5', null, null], format: () => 'x' }, 0), '3,0 / 5');
    assert.equal(pointValueText({ values, format: (index) => `#${index}` }, 2), '#2');
    assert.equal(pointValueText({ values, format: () => null }, 2), '100%');
    assert.equal(pointValueText({ values }, 1), 'sem registro');
    assert.equal(defaultFormat(0.444), '44%');
    assert.equal(
      pointSummary('Seg', [{ values, label: 'Humor' }, { values: [null] }], 0),
      'Seg: Humor 50%; Série 2 sem registro',
    );
  });

  test('tendência linear pelos valores existentes', () => {
    const up = linearTrend([0, null, 0.5, 0.75]);
    assert.ok(up);
    assert.ok(up.slope > 0);
    assert.ok(up.from < up.to);
    const flat = linearTrend([0.4, 0.4, null, 0.4]);
    assert.ok(flat);
    assert.ok(Math.abs(flat.slope) < 1e-9);
    assert.ok(Math.abs(flat.from - 0.4) < 1e-9 && Math.abs(flat.to - 0.4) < 1e-9);
    assert.equal(linearTrend([null, 0.3]), null);
    const steep = linearTrend([0, 1, null, null, null, null]);
    assert.equal(steep?.to, 1, 'extrapolação é limitada a 0..1');
  });
});
