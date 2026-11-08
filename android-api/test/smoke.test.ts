import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatDecimal } from '@/data/insights';

test('o carregador resolve o alias @/ e executa TypeScript', () => {
  assert.equal(formatDecimal(3.25), '3,3');
});
