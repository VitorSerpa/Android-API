import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server.js';
import { createFirebaseVerifier, GOOGLE_JWKS_URL } from '../src/auth.js';
import { HttpError } from '../src/errors.js';
import { silentLogger } from '../src/logger.js';

/* ------------------------------------------------------------------ */
/* Rotas /sync com um verificador falso ("token-<uid>")                */
/* ------------------------------------------------------------------ */

const fakeVerifier = {
  async verify(token) {
    const match = /^token-(.+)$/.exec(token ?? '');
    if (!match) throw new HttpError(401, 'Sessão inválida.');
    return { uid: match[1] };
  },
};

let tmpDir;
let dataFile;
let app;
let base;

async function start() {
  const instance = await createApp({ port: 0, host: '127.0.0.1', dataFile, logger: silentLogger, verifier: fakeVerifier });
  const port = await instance.listen();
  return { instance, base: `http://127.0.0.1:${port}` };
}

const call = (method, token, body, query = '') =>
  fetch(`${base}/sync${query}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

const doc = (checkIns) => ({ version: 2, checkIns });

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mente-sync-'));
  dataFile = path.join(tmpDir, 'db.json');
  ({ instance: app, base } = await start());
});

after(async () => {
  await app?.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('Sincronização (RF-58)', () => {
  test('sem token → 401; sem cópia → revisão 0', async () => {
    assert.equal((await call('GET')).status, 401);
    const res = await call('GET', 'token-ana');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { revision: 0, updatedAt: null, data: null, unchanged: false });
  });

  test('envia, lê, detecta conflito e não mistura usuários', async () => {
    let res = await call('PUT', 'token-ana', { baseRevision: 0, data: doc([{ id: 'a' }]) });
    assert.equal(res.status, 200);
    const first = await res.json();
    assert.equal(first.revision, 1);

    // Outro aparelho ainda na revisão 0: conflito, com a cópia atual para mesclar.
    res = await call('PUT', 'token-ana', { baseRevision: 0, data: doc([{ id: 'b' }]) });
    assert.equal(res.status, 409);
    const conflict = await res.json();
    assert.equal(conflict.revision, 1);
    assert.deepEqual(conflict.data, doc([{ id: 'a' }]));

    res = await call('PUT', 'token-ana', { baseRevision: 1, data: doc([{ id: 'a' }, { id: 'b' }]) });
    assert.equal((await res.json()).revision, 2);

    res = await call('GET', 'token-ana', undefined, '?since=2');
    assert.deepEqual(await res.json(), { revision: 2, updatedAt: (await (await call('GET', 'token-ana')).json()).updatedAt, data: null, unchanged: true });

    res = await call('GET', 'token-bia');
    assert.equal((await res.json()).revision, 0, 'cada usuário tem sua própria cópia');
  });

  test('valida o corpo', async () => {
    assert.equal((await call('PUT', 'token-ana', { baseRevision: -1, data: doc([]) })).status, 400);
    assert.equal((await call('PUT', 'token-ana', { baseRevision: 0, data: [1] })).status, 400);
    assert.equal((await call('PUT', 'token-ana', { baseRevision: 0 })).status, 400);
  });

  test('aceita documentos maiores que 64 KB', async () => {
    const big = doc(Array.from({ length: 2000 }, (_, i) => ({ id: `big-${i}`, note: 'x'.repeat(50) })));
    const current = await (await call('GET', 'token-carla')).json();
    const res = await call('PUT', 'token-carla', { baseRevision: current.revision, data: big });
    assert.equal(res.status, 200);
  });

  test('grava em disco sem o uid no nome do arquivo e sobrevive a reinício', async () => {
    await app.close();
    const files = await fs.readdir(path.join(tmpDir, 'users'));
    assert.ok(files.length >= 2);
    assert.ok(files.every((name) => /^[0-9a-f]{64}\.json$/.test(name)));
    ({ instance: app, base } = await start());
    const res = await call('GET', 'token-ana');
    const body = await res.json();
    assert.equal(body.revision, 2);
    assert.equal(body.data.checkIns.length, 2);
  });

  test('DELETE apaga a cópia do usuário', async () => {
    assert.equal((await call('DELETE', 'token-bia')).status, 204);
    await call('PUT', 'token-bia', { baseRevision: 0, data: doc([]) });
    assert.equal((await call('DELETE', 'token-bia')).status, 204);
    assert.equal((await (await call('GET', 'token-bia')).json()).revision, 0);
  });

  test('dois envios simultâneos na mesma revisão: um grava, o outro recebe 409 (nada se perde)', async () => {
    const current = await (await call('GET', 'token-duda')).json();
    const results = await Promise.all([
      call('PUT', 'token-duda', { baseRevision: current.revision, data: doc([{ id: 'x' }]) }),
      call('PUT', 'token-duda', { baseRevision: current.revision, data: doc([{ id: 'y' }]) }),
    ]);
    assert.deepEqual(results.map((res) => res.status).sort(), [200, 409]);
    const after = await (await call('GET', 'token-duda')).json();
    assert.equal(after.revision, current.revision + 1);
  });

  test('corpo acima de 10 MB → 413', async () => {
    const huge = doc([{ id: 'h', note: 'x'.repeat(10 * 1024 * 1024) }]);
    const res = await call('PUT', 'token-duda', { baseRevision: 0, data: huge });
    assert.equal(res.status, 413);
  });

  test('sem FIREBASE_PROJECT_ID a sincronização responde 503', async () => {
    const other = await createApp({ port: 0, host: '127.0.0.1', dataFile: path.join(tmpDir, 'other', 'db.json'), logger: silentLogger });
    const port = await other.listen();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/sync`, { headers: { Authorization: 'Bearer token-ana' } });
      assert.equal(res.status, 503);
    } finally {
      await other.close();
    }
  });
});

/* ------------------------------------------------------------------ */
/* Verificador de ID token do Firebase                                 */
/* ------------------------------------------------------------------ */

describe('Verificador de ID token do Firebase', () => {
  const projectId = 'demo-mente';
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'chave-1', alg: 'RS256', use: 'sig' };
  let fetchCount = 0;
  const fetchImpl = async (url) => {
    assert.equal(url, GOOGLE_JWKS_URL);
    fetchCount += 1;
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'public, max-age=3600' } });
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const claims = (patch = {}) => ({
    aud: projectId,
    iss: `https://securetoken.google.com/${projectId}`,
    sub: 'uid-123',
    iat: nowSec - 10,
    exp: nowSec + 3600,
    ...patch,
  });
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const sign = (payload, header = { alg: 'RS256', kid: 'chave-1', typ: 'JWT' }, key = privateKey) => {
    const input = `${encode(header)}.${encode(payload)}`;
    return `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
  };

  const verifier = createFirebaseVerifier({ projectId, fetchImpl });

  test('aceita um token válido e guarda as chaves em cache', async () => {
    assert.deepEqual(await verifier.verify(sign(claims())), { uid: 'uid-123' });
    await verifier.verify(sign(claims()));
    assert.equal(fetchCount, 1);
  });

  test('recusa assinatura, projeto, emissor e validade errados', async () => {
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    const cases = [
      sign(claims(), undefined, other),
      sign(claims({ aud: 'outro-projeto' })),
      sign(claims({ iss: 'https://example.com' })),
      sign(claims({ exp: nowSec - 3600 })),
      sign(claims({ sub: '' })),
      sign(claims(), { alg: 'HS256', kid: 'chave-1' }),
      'nao.e.jwt',
      '',
    ];
    for (const token of cases) {
      await assert.rejects(verifier.verify(token), (err) => err instanceof HttpError && err.status === 401);
    }
  });

  test('chave nova (rotação do Google) recarrega o JWKS; Google fora do ar → 503', async () => {
    const rotated = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rotatedJwk = { ...rotated.publicKey.export({ format: 'jwk' }), kid: 'chave-2', alg: 'RS256' };
    let calls = 0;
    let down = false;
    const rotating = createFirebaseVerifier({
      projectId,
      fetchImpl: async () => {
        calls += 1;
        if (down) throw new Error('offline');
        return new Response(JSON.stringify({ keys: calls === 1 ? [jwk] : [jwk, rotatedJwk] }), { headers: { 'cache-control': 'max-age=3600' } });
      },
    });
    await rotating.verify(sign(claims()));
    assert.deepEqual(await rotating.verify(sign(claims(), { alg: 'RS256', kid: 'chave-2' }, rotated.privateKey)), { uid: 'uid-123' });
    assert.equal(calls, 2);

    down = true;
    await assert.rejects(
      rotating.verify(sign(claims(), { alg: 'RS256', kid: 'chave-desconhecida' })),
      (err) => err instanceof HttpError && err.status === 503,
    );
  });

  test('chaves expiradas no cache são buscadas de novo', async () => {
    let clock = Date.now();
    let calls = 0;
    const cached = createFirebaseVerifier({
      projectId,
      now: () => clock,
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=60' } });
      },
    });
    await cached.verify(sign(claims()));
    clock += 30_000;
    await cached.verify(sign(claims()));
    assert.equal(calls, 1);
    clock += 31_000;
    await cached.verify(sign(claims()));
    assert.equal(calls, 2);
  });

  test('tokens sem assinatura só valem com o Auth Emulator', async () => {
    const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims())}.`;
    await assert.rejects(verifier.verify(unsigned), (err) => err.status === 401);
    const emulator = createFirebaseVerifier({ projectId, emulator: true, fetchImpl });
    assert.deepEqual(await emulator.verify(unsigned), { uid: 'uid-123' });
  });
});
