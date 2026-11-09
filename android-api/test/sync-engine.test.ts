import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { SyncEngine } from '@/data/sync-engine';
import type { UserData } from '@/data/types';
import type { UserStore } from '@/data/user-data-context';

import { repositoryControl } from './mocks/repository';
import { checkIn, daysAgo, freshData } from './helpers';

/**
 * US-14 integration: two "devices" (two engines, each with its own store and
 * sync state) talk to the real Node server from `../server`, with a fake token
 * verifier standing in for Firebase.
 */

const PORT = 39_000 + Math.floor(Math.random() * 1000);
process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${PORT}`;

// Loaded after the env var is set: `lib/api.ts` reads it at import time.
const { createSyncEngine } = await import('@/data/sync-engine');
const { createApp } = await import('../../server/src/server.js');
const { silentLogger } = await import('../../server/src/logger.js');

const fakeVerifier = {
  async verify(token: string) {
    const match = /^token-(.+)$/.exec(token ?? '');
    if (!match) throw Object.assign(new Error('Sessão inválida.'), { status: 401 });
    return { uid: match[1] };
  },
};

let tmpDir: string;
let server: { listen(): Promise<number>; close(): Promise<void> } | null = null;

async function startServer() {
  server = await createApp({
    port: PORT,
    host: '127.0.0.1',
    dataFile: path.join(tmpDir, 'db.json'),
    logger: silentLogger,
    verifier: fakeVerifier,
  });
  await server!.listen();
}

async function stopServer() {
  await server?.close();
  server = null;
}

/** Minimal store with the two things the engine uses: the snapshot and `applyRemote`. */
function createDevice(name: string, userId: string, initial: UserData = freshData()) {
  let data = initial;
  const listeners = new Set<() => void>();
  const store = {
    getSnapshot: () => data,
    flush: async () => {},
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    actions: {
      applyRemote: (merge: (current: UserData) => UserData) => {
        data = merge(data);
        listeners.forEach((listener) => listener());
      },
    },
  } as unknown as UserStore;
  let token: string | null = `token-${userId}`;
  // Each device keeps its own sync state, as two phones would.
  const engine: SyncEngine = createSyncEngine({ userId: `${userId}@${name}`, store, getToken: async () => token });
  return {
    engine,
    get data() {
      return data;
    },
    edit(recipe: (current: UserData) => UserData) {
      data = recipe(data);
    },
    signOutToken() {
      token = null;
    },
    status: () => engine.getStatus(),
  };
}

/** The account's copy on the server, read through the API like the app does. */
async function serverCopy(userId: string) {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/sync`, { headers: { Authorization: `Bearer token-${userId}` } });
  return (await response.json()) as { revision: number; data: UserData | null };
}

const addCheckIn = (id: string, day = daysAgo(0)) => (current: UserData) => ({
  ...current,
  checkIns: [checkIn(day, { id }), ...current.checkIns],
});

let userCounter = 0;
const newUser = () => `user${++userCounter}`;

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mente-sync-engine-'));
  await startServer();
});

after(async () => {
  await stopServer();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

beforeEach(() => repositoryControl.failNextSyncSave = false);

describe('Motor de sincronização com o servidor real (US-14)', () => {
  test('envia o primeiro documento e registra a revisão', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.edit(addCheckIn('c1'));
    await phone.engine.syncNow();
    assert.equal(phone.status().kind, 'idle');
    const copy = await serverCopy(user);
    assert.equal(copy.revision, 1);
    assert.deepEqual(copy.data!.checkIns.map((item) => item.id), ['c1']);
    assert.ok((phone.status() as { lastSyncAt: string }).lastSyncAt);
  });

  test('um segundo aparelho recebe tudo sem duplicar lembretes e metas padrão', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.edit(addCheckIn('c1'));
    await phone.engine.syncNow();

    const tablet = createDevice('tablet', user);
    await tablet.engine.syncNow();
    assert.deepEqual(tablet.data.checkIns.map((item) => item.id), ['c1']);
    assert.equal(tablet.data.reminders.length, freshData().reminders.length);
    assert.equal(tablet.data.goals.length, freshData().goals.length);
  });

  test('CA-01/CA-02: 14 dias de registros feitos com o servidor fora do ar chegam uma vez só quando ele volta', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    await phone.engine.syncNow();

    await stopServer();
    for (let day = 14; day >= 1; day -= 1) {
      phone.edit(addCheckIn(`offline-${day}`, daysAgo(day)));
      await phone.engine.syncNow();
      assert.equal(phone.status().kind, 'error', 'sem servidor a sincronização falha, mas os dados ficam no aparelho');
    }
    assert.equal(phone.data.checkIns.length, 14);

    await startServer();
    await phone.engine.syncNow();
    await phone.engine.syncNow(); // repetir não pode duplicar
    assert.equal(phone.status().kind, 'idle');
    const copy = await serverCopy(user);
    assert.equal(copy.data!.checkIns.length, 14);
    assert.equal(new Set(copy.data!.checkIns.map((item) => item.id)).size, 14);
  });

  test('alterações simultâneas em dois aparelhos: conflito 409, mescla e os dois terminam iguais', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    const tablet = createDevice('tablet', user);
    await phone.engine.syncNow();
    await tablet.engine.syncNow();

    phone.edit(addCheckIn('from-phone'));
    tablet.edit(addCheckIn('from-tablet'));
    await phone.engine.syncNow();
    await tablet.engine.syncNow(); // recebe 409, mescla e reenvia
    await phone.engine.syncNow(); // puxa o resultado

    const expected = ['from-phone', 'from-tablet'];
    assert.deepEqual(phone.data.checkIns.map((item) => item.id).sort(), expected);
    assert.deepEqual(tablet.data.checkIns.map((item) => item.id).sort(), expected);
    assert.deepEqual((await serverCopy(user)).data!.checkIns.map((item) => item.id).sort(), expected);
  });

  test('uma exclusão feita num aparelho chega ao outro', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.edit(addCheckIn('keep'));
    phone.edit(addCheckIn('remove'));
    await phone.engine.syncNow();
    const tablet = createDevice('tablet', user);
    await tablet.engine.syncNow();
    assert.equal(tablet.data.checkIns.length, 2);

    phone.edit((current) => ({ ...current, checkIns: current.checkIns.filter((item) => item.id !== 'remove') }));
    await phone.engine.syncNow();
    await tablet.engine.syncNow();
    assert.deepEqual(tablet.data.checkIns.map((item) => item.id), ['keep']);
  });

  test('sem mudanças, a sincronização só confirma a revisão (não reenvia o documento)', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    await phone.engine.syncNow();
    const before = (await serverCopy(user)).revision;
    await phone.engine.syncNow();
    await phone.engine.syncNow();
    assert.equal((await serverCopy(user)).revision, before);
  });

  test('modo offline completo (RF-37): nenhuma requisição é feita', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.edit((current) => ({ ...current, settings: { ...current.settings, offlineMode: true } }));
    phone.edit(addCheckIn('private'));
    await phone.engine.syncNow();
    assert.deepEqual(phone.status(), { kind: 'disabled', reason: 'offline-mode' });
    assert.equal((await serverCopy(user)).revision, 0);
  });

  test('sem sessão válida mostra erro e não envia nada', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.signOutToken();
    await phone.engine.syncNow();
    assert.equal(phone.status().kind, 'error');
    assert.equal((await serverCopy(user)).revision, 0);
  });

  test('RNF-07: uma falha ao gravar o estado da sincronização é recuperada na próxima, sem duplicar', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.edit(addCheckIn('c1'));
    repositoryControl.failNextSyncSave = true;
    await phone.engine.syncNow();
    assert.equal(phone.status().kind, 'error');

    phone.edit(addCheckIn('c2'));
    await phone.engine.syncNow();
    assert.equal(phone.status().kind, 'idle');
    const copy = await serverCopy(user);
    assert.deepEqual(copy.data!.checkIns.map((item) => item.id).sort(), ['c1', 'c2']);
  });

  test('chamadas simultâneas de syncNow não disparam envios paralelos', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    phone.edit(addCheckIn('c1'));
    await Promise.all([phone.engine.syncNow(), phone.engine.syncNow(), phone.engine.syncNow()]);
    assert.equal(phone.status().kind, 'idle');
    // One push, plus at most one confirmation pull: the revision moved exactly once.
    assert.equal((await serverCopy(user)).revision, 1);
  });

  test('o status é observável (Configurações re-renderiza)', async () => {
    const user = newUser();
    const phone = createDevice('phone', user);
    const seen: string[] = [];
    const off = phone.engine.subscribe(() => seen.push(phone.status().kind));
    await phone.engine.syncNow();
    off();
    assert.ok(seen.includes('syncing'));
    assert.equal(seen.at(-1), 'idle');
  });
});
