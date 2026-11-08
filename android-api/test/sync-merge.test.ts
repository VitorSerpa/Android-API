import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { deepEqual, merge3, mergeUserData } from '@/data/sync-merge';
import type { UserData } from '@/data/types';

import { checkIn, freshData, health } from './helpers';

const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe('deepEqual', () => {
  test('compara valores, listas e objetos sem depender da ordem das chaves', () => {
    assert.ok(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }));
    assert.ok(!deepEqual({ a: 1 }, { a: 1, b: undefined }));
    assert.ok(!deepEqual([1, 2], [2, 1]));
    assert.ok(!deepEqual(null, {}));
    assert.ok(deepEqual(null, null));
  });
});

describe('merge3 (RF-58 / US-14 CA-01)', () => {
  const a = { id: 'a', v: 1 };
  const b = { id: 'b', v: 1 };

  test('um lado sem mudanças adota o outro', () => {
    assert.deepEqual(merge3([a], [a], [a, b]), [a, b]);
    assert.deepEqual(merge3([a], [a, b], [a]), [a, b]);
  });

  test('registros criados nos dois aparelhos são unidos uma vez só, sem duplicar', () => {
    const c = { id: 'c', v: 1 };
    const merged = merge3([a], [a, b], [a, c]) as { id: string }[];
    assert.deepEqual(ids(merged), ['a', 'b', 'c']);
  });

  test('o mesmo registro enviado pelos dois lados aparece uma vez', () => {
    assert.deepEqual(merge3([], [a], [a]), [a]);
    assert.deepEqual(ids(merge3([], [a, b], [b, a]) as { id: string }[]), ['a', 'b']);
  });

  test('exclusões são respeitadas dos dois lados', () => {
    assert.deepEqual(merge3([a, b], [b], [a, b]), [b], 'apagado aqui');
    assert.deepEqual(merge3([a, b], [a, b, { id: 'z' }], [b]), [b, { id: 'z' }], 'apagado no servidor');
  });

  test('edição vence exclusão (nada editado se perde)', () => {
    const edited = { id: 'a', v: 2 };
    assert.deepEqual(merge3([a], [edited], []), [edited], 'editado aqui, apagado lá');
    assert.deepEqual(merge3([a], [], [edited]), [edited], 'apagado aqui, editado lá');
  });

  test('campos diferentes do mesmo registro são combinados; conflito no mesmo campo fica com este aparelho', () => {
    const base = { id: 'a', note: '', mood: 1 };
    const merged = merge3([base], [{ ...base, note: 'aqui' }], [{ ...base, mood: 4 }]);
    assert.deepEqual(merged, [{ id: 'a', note: 'aqui', mood: 4 }]);
    assert.deepEqual(merge3([base], [{ ...base, mood: 2 }], [{ ...base, mood: 3 }]), [{ ...base, mood: 2 }]);
  });

  test('registros identificados por token (convites) também são mesclados', () => {
    const merged = merge3([], [{ token: 't1' }], [{ token: 't2' }]) as { token: string }[];
    assert.deepEqual(merged.map((item) => item.token), ['t1', 't2']);
  });

  test('listas de valores simples funcionam como conjuntos', () => {
    assert.deepEqual(merge3(['x', 'y'], ['x', 'y', 'w'], ['x', 'z']), ['x', 'w', 'z']);
  });

  test('objetos (como a saúde por dia) são mesclados chave a chave', () => {
    const base = { d1: { sleep: 7 } };
    const merged = merge3(base, { d1: { sleep: 7 }, d2: { sleep: 5 } }, { d1: { sleep: 8 } });
    assert.deepEqual(merged, { d1: { sleep: 8 }, d2: { sleep: 5 } });
    assert.deepEqual(merge3(base, {}, { d1: { sleep: 7 } }), {}, 'apagado aqui');
  });

  test('conflito de valor simples fica com este aparelho', () => {
    assert.equal(merge3(1, 2, 3), 2);
    assert.equal(merge3(1, 1, 3), 3);
  });
});

describe('mergeUserData', () => {
  test('primeira sincronização (sem base) une os dois documentos', () => {
    const local: UserData = { ...freshData(), checkIns: [checkIn('2026-10-01', { id: 'l' })] };
    const remote: UserData = { ...freshData(), checkIns: [checkIn('2026-10-02', { id: 'r' })] };
    const merged = mergeUserData(null, local, remote);
    assert.deepEqual(ids(merged.checkIns).sort(), ['l', 'r']);
  });

  test('os itens padrão têm id fixo: dois aparelhos novos não duplicam lembretes e metas', () => {
    const merged = mergeUserData(null, freshData(), freshData());
    assert.equal(merged.reminders.length, freshData().reminders.length);
    assert.equal(merged.goals.length, freshData().goals.length);
  });

  test('listas cronológicas ficam da mais nova para a mais antiga', () => {
    const base = freshData();
    const older = checkIn('2026-10-01', { id: 'old', at: '2026-10-01T09:00:00.000Z' });
    const newer = checkIn('2026-10-05', { id: 'new', at: '2026-10-05T09:00:00.000Z' });
    const middle = checkIn('2026-10-03', { id: 'mid', at: '2026-10-03T09:00:00.000Z' });
    const merged = mergeUserData(base, { ...base, checkIns: [newer, older] }, { ...base, checkIns: [middle] });
    assert.deepEqual(ids(merged.checkIns), ['new', 'mid', 'old']);
  });

  test('mantém a versão do esquema deste aparelho e mescla configurações por campo', () => {
    const base = freshData();
    const local = { ...base, settings: { ...base.settings, breathingMinutes: 3 as const } };
    const remote = { ...base, settings: { ...base.settings, weeklyMoodGoal: 4 } };
    const merged = mergeUserData(base, local, remote);
    assert.equal(merged.version, base.version);
    assert.equal(merged.settings.breathingMinutes, 3);
    assert.equal(merged.settings.weeklyMoodGoal, 4);
  });

  test('saúde do mesmo dia editada nos dois aparelhos combina os campos', () => {
    const day = '2026-10-10';
    const base = { ...freshData(), health: { [day]: health(day) } };
    const local = { ...base, health: { [day]: { ...health(day), sleepHours: 7 } } };
    const remote = { ...base, health: { [day]: { ...health(day), symptoms: ['Cansaço'] } } };
    const merged = mergeUserData(base, local, remote);
    assert.equal(merged.health[day].sleepHours, 7);
    assert.deepEqual(merged.health[day].symptoms, ['Cansaço']);
  });

  test('não muda nada quando os dois lados são iguais', () => {
    const data = { ...freshData(), checkIns: [checkIn('2026-10-01')] };
    assert.ok(deepEqual(mergeUserData(data, data, structuredClone(data)), data));
  });
});
