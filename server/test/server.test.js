import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import { createApp } from '../src/server.js';
import { silentLogger } from '../src/logger.js';

let tmpDir;
let dataFile;
let app;
let base;
let wsUrl;

async function startApp() {
  const instance = await createApp({ port: 0, host: '127.0.0.1', dataFile, logger: silentLogger });
  const port = await instance.listen();
  return { instance, base: `http://127.0.0.1:${port}`, wsUrl: `ws://127.0.0.1:${port}/ws` };
}

/** Cliente WebSocket de teste com fila de mensagens recebidas. */
async function connect(url = wsUrl) {
  const ws = new WebSocket(url);
  const queue = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    const idx = waiters.findIndex((w) => w.predicate(msg));
    if (idx >= 0) {
      const [w] = waiters.splice(idx, 1);
      clearTimeout(w.timer);
      w.resolve(msg);
    } else {
      queue.push(msg);
    }
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  return {
    ws,
    send: (obj) => ws.send(JSON.stringify(obj)),
    next(predicate = () => true, timeoutMs = 2000) {
      const idx = queue.findIndex(predicate);
      if (idx >= 0) return Promise.resolve(queue.splice(idx, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const i = waiters.findIndex((w) => w.resolve === resolve);
          if (i >= 0) waiters.splice(i, 1);
          reject(new Error('Tempo esgotado aguardando mensagem do WebSocket'));
        }, timeoutMs);
        waiters.push({ predicate, resolve, timer });
      });
    },
    pending: () => [...queue],
    close() {
      return new Promise((resolve) => {
        if (ws.readyState === WebSocket.CLOSED) return resolve();
        ws.once('close', resolve);
        ws.close();
      });
    },
  };
}

const byType = (type) => (m) => m.type === type;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mente-equilibrada-'));
  dataFile = path.join(tmpDir, 'nested', 'db.json');
  ({ instance: app, base, wsUrl } = await startApp());
});

after(async () => {
  await app?.close();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('HTTP básico', () => {
  test('GET /health', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(await res.json(), { ok: true });
  });

  test('OPTIONS responde 204 com CORS', async () => {
    const res = await fetch(`${base}/groups`, { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.match(res.headers.get('access-control-allow-methods'), /DELETE/);
    assert.match(res.headers.get('access-control-allow-headers'), /Authorization/);
  });

  test('rota desconhecida → 404 com { error }', async () => {
    const res = await fetch(`${base}/nada`);
    assert.equal(res.status, 404);
    assert.equal(typeof (await res.json()).error, 'string');
  });

  test('corpo acima de 64 KB → 413', async () => {
    const res = await fetch(`${base}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x'.repeat(70 * 1024) }),
    });
    assert.equal(res.status, 413);
  });
});

describe('Grupos', () => {
  test('lista os 3 grupos padrão', async () => {
    const res = await fetch(`${base}/groups`);
    assert.equal(res.status, 200);
    const groups = await res.json();
    assert.deepEqual(
      groups.map((g) => g.name),
      ['Ansiedade no dia a dia', 'Rotina e sono', 'Trabalho e estresse'],
    );
    for (const g of groups) {
      assert.deepEqual(Object.keys(g).sort(), ['createdAt', 'description', 'id', 'name', 'online']);
      assert.equal(g.online, 0);
      assert.ok(g.description.length > 0);
    }
  });

  test('cria grupo e valida campos', async () => {
    const res = await fetch(`${base}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Luto e perdas  ', description: 'Apoio mútuo.' }),
    });
    assert.equal(res.status, 201);
    const group = await res.json();
    assert.equal(group.name, 'Luto e perdas');
    assert.equal(group.description, 'Apoio mútuo.');
    assert.equal(group.online, 0);
    assert.ok(group.id && group.createdAt);

    const list = await (await fetch(`${base}/groups`)).json();
    assert.ok(list.some((g) => g.id === group.id));

    for (const body of [{ name: 'ab' }, { name: 'x'.repeat(61) }, { name: 'Válido', description: 'd'.repeat(201) }, {}]) {
      const bad = await fetch(`${base}/groups`, { method: 'POST', body: JSON.stringify(body) });
      assert.equal(bad.status, 400);
      assert.equal(typeof (await bad.json()).error, 'string');
    }
    const invalidJson = await fetch(`${base}/groups`, { method: 'POST', body: '{nope' });
    assert.equal(invalidJson.status, 400);
  });

  test('mensagens de grupo desconhecido → 404', async () => {
    const res = await fetch(`${base}/groups/nao-existe/messages`);
    assert.equal(res.status, 404);
  });
});

describe('WebSocket', () => {
  test('join → message → broadcast para outro cliente, ack e histórico HTTP', async () => {
    const [group] = await (await fetch(`${base}/groups`)).json();
    const a = await connect();
    const b = await connect();
    try {
      a.send({ type: 'ping' });
      assert.deepEqual(await a.next(byType('pong')), { type: 'pong' });

      a.send({ type: 'join', groupId: group.id });
      b.send({ type: 'join', groupId: group.id });
      const joinedA = await a.next(byType('joined'));
      await b.next(byType('joined'));
      assert.equal(joinedA.groupId, group.id);
      assert.ok(Array.isArray(joinedA.messages));

      const online = (await (await fetch(`${base}/groups`)).json()).find((g) => g.id === group.id).online;
      assert.equal(online, 2);

      const clientId = randomUUID();
      a.send({ type: 'message', groupId: group.id, text: '  Olá, pessoal  ', clientId });

      const ack = await a.next(byType('ack'));
      const echoed = await a.next(byType('message'));
      const received = await b.next(byType('message'));

      assert.deepEqual(received, echoed);
      const msg = received.message;
      assert.deepEqual(Object.keys(msg).sort(), ['clientId', 'createdAt', 'groupId', 'id', 'text']);
      assert.equal(msg.text, 'Olá, pessoal');
      assert.equal(msg.groupId, group.id);
      assert.equal(msg.clientId, clientId);
      assert.deepEqual(ack, { type: 'ack', clientId, id: msg.id });

      const history = await (await fetch(`${base}/groups/${group.id}/messages`)).json();
      assert.equal(history.at(-1).id, msg.id);

      const before = new Date(Date.parse(msg.createdAt) - 1).toISOString();
      const since = await (await fetch(`${base}/groups/${group.id}/messages?since=${encodeURIComponent(before)}`)).json();
      assert.deepEqual(since.map((m) => m.id), [msg.id]);
      const none = await (await fetch(`${base}/groups/${group.id}/messages?since=${encodeURIComponent(msg.createdAt)}`)).json();
      assert.deepEqual(none, []);

      // Novo join recebe a mensagem no histórico.
      const c = await connect();
      c.send({ type: 'join', groupId: group.id });
      const joinedC = await c.next(byType('joined'));
      assert.equal(joinedC.messages.at(-1).id, msg.id);
      await c.close();
    } finally {
      await a.close();
      await b.close();
    }
  });

  test('idempotência por clientId: reenvio só recebe ack, sem novo broadcast', async () => {
    const [, group] = await (await fetch(`${base}/groups`)).json();
    const a = await connect();
    const b = await connect();
    try {
      a.send({ type: 'join', groupId: group.id });
      b.send({ type: 'join', groupId: group.id });
      await a.next(byType('joined'));
      await b.next(byType('joined'));

      const clientId = randomUUID();
      const payload = { type: 'message', groupId: group.id, text: 'Primeira vez', clientId };
      a.send(payload);
      const firstAck = await a.next(byType('ack'));
      await b.next(byType('message'));

      // Simula reconexão: novo socket reenvia a mensagem da fila.
      await a.close();
      const a2 = await connect();
      a2.send({ type: 'join', groupId: group.id });
      await a2.next(byType('joined'));
      a2.send(payload);
      const secondAck = await a2.next(byType('ack'));
      assert.deepEqual(secondAck, firstAck);

      await delay(150);
      assert.equal(b.pending().filter(byType('message')).length, 0);
      assert.equal(a2.pending().filter(byType('message')).length, 0);

      const history = await (await fetch(`${base}/groups/${group.id}/messages`)).json();
      assert.equal(history.filter((m) => m.clientId === clientId).length, 1);
      await a2.close();
    } finally {
      await a.close();
      await b.close();
    }
  });

  test('erros: grupo desconhecido, sem join, texto inválido e limite de taxa', async () => {
    const [, , group] = await (await fetch(`${base}/groups`)).json();
    const a = await connect();
    try {
      a.send({ type: 'join', groupId: 'nao-existe' });
      assert.equal((await a.next(byType('error'))).type, 'error');

      a.send({ type: 'message', groupId: group.id, text: 'oi', clientId: randomUUID() });
      assert.match((await a.next(byType('error'))).error, /Entre no grupo/);

      a.send({ type: 'join', groupId: group.id });
      await a.next(byType('joined'));

      a.send({ type: 'message', groupId: group.id, text: '   ', clientId: randomUUID() });
      await a.next(byType('error'));
      a.send({ type: 'message', groupId: group.id, text: 'x'.repeat(1001), clientId: randomUUID() });
      await a.next(byType('error'));

      a.ws.send('isto não é json');
      await a.next(byType('error'));

      for (let i = 0; i < 10; i++) {
        a.send({ type: 'message', groupId: group.id, text: `msg ${i}`, clientId: randomUUID() });
        await a.next(byType('ack'));
      }
      a.send({ type: 'message', groupId: group.id, text: 'excesso', clientId: randomUUID() });
      assert.match((await a.next(byType('error'))).error, /muito rápido/);

      a.send({ type: 'leave', groupId: group.id });
      await delay(50);
      const online = (await (await fetch(`${base}/groups`)).json()).find((g) => g.id === group.id).online;
      assert.equal(online, 0);
    } finally {
      await a.close();
    }
  });
});

describe('Convites de apoiador', () => {
  test('criar → enviar resumo → ler → página HTML escapada → revogar → 410', async () => {
    const created = await fetch(`${base}/invites`, { method: 'POST' });
    assert.equal(created.status, 201);
    const { token, ownerKey, url } = await created.json();
    assert.match(token, /^[A-Za-z0-9_-]{22}$/);
    assert.match(ownerKey, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(url, `${app.publicUrl}/i/${token}`);

    // Sem resumo ainda.
    assert.equal((await fetch(`${base}/invites/${token}/summary`)).status, 404);
    const emptyPage = await fetch(`${base}/i/${token}`);
    assert.equal(emptyPage.status, 200);
    assert.match(await emptyPage.text(), /Ainda não há resumo/);

    const summary = {
      periodLabel: '22 Set a 28 Set',
      generatedAt: '2026-09-28T21:00:00.000Z',
      lines: ['Humor médio: 3,8 / 5', '<script>alert("x")</script> & 5 > 3'],
    };
    const put = (key, body = summary) =>
      fetch(`${base}/invites/${token}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify(body),
      });

    assert.equal((await put(null)).status, 401);
    assert.equal((await put('chave-errada')).status, 401);
    assert.equal((await put(ownerKey, { ...summary, lines: Array(31).fill('x') })).status, 400);
    assert.equal((await put(ownerKey, { ...summary, lines: ['x'.repeat(201)] })).status, 400);
    const ok = await put(ownerKey);
    assert.equal(ok.status, 204);

    const got = await fetch(`${base}/invites/${token}/summary`);
    assert.equal(got.status, 200);
    assert.deepEqual(await got.json(), summary);

    const page = await fetch(`${base}/i/${token}`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    const html = await page.text();
    assert.match(html, /<meta name="viewport"/);
    assert.match(html, /lang="pt-BR"/);
    assert.ok(html.includes('Humor médio: 3,8 / 5'));
    assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; 5 &gt; 3'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('22 Set a 28 Set'));

    // Revogação.
    const unauthorizedDelete = await fetch(`${base}/invites/${token}`, { method: 'DELETE' });
    assert.equal(unauthorizedDelete.status, 401);
    const del = await fetch(`${base}/invites/${token}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerKey}` },
    });
    assert.equal(del.status, 204);

    assert.equal((await fetch(`${base}/invites/${token}/summary`)).status, 410);
    assert.equal((await put(ownerKey)).status, 410);
    const revokedPage = await fetch(`${base}/i/${token}`);
    assert.equal(revokedPage.status, 410);
    assert.match(await revokedPage.text(), /este convite foi revogado/i);

    // Tokens desconhecidos.
    assert.equal((await fetch(`${base}/invites/AAAAAAAAAAAAAAAAAAAAAA/summary`)).status, 404);
    const unknownPage = await fetch(`${base}/i/desconhecido`);
    assert.equal(unknownPage.status, 404);
    assert.match(await unknownPage.text(), /não encontrado/);
    const unknownPut = await fetch(`${base}/invites/AAAAAAAAAAAAAAAAAAAAAA/summary`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerKey}` },
      body: JSON.stringify(summary),
    });
    assert.equal(unknownPut.status, 404);
  });
});

describe('Persistência e anonimato', () => {
  test('dados sobrevivem a reinício e não guardam ownerKey nem identificadores', async () => {
    const { ownerKey, token } = await (await fetch(`${base}/invites`, { method: 'POST' })).json();
    const group = await (
      await fetch(`${base}/groups`, { method: 'POST', body: JSON.stringify({ name: 'Grupo persistente' }) })
    ).json();

    await app.close();
    const raw = await fs.readFile(dataFile, 'utf8');
    assert.ok(!raw.includes(ownerKey), 'ownerKey não pode ser salvo em texto puro');
    const data = JSON.parse(raw);
    assert.ok(data.invites[token].ownerKeyHash);
    for (const list of Object.values(data.messages)) {
      for (const m of list) {
        assert.deepEqual(Object.keys(m).sort(), ['clientId', 'createdAt', 'groupId', 'id', 'text']);
      }
    }

    ({ instance: app, base, wsUrl } = await startApp());
    const groups = await (await fetch(`${base}/groups`)).json();
    assert.ok(groups.some((g) => g.id === group.id));
    assert.equal(groups.filter((g) => g.name === 'Ansiedade no dia a dia').length, 1, 'não deve semear de novo');
  });
});
