import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_MESSAGES_PER_GROUP = 500;
const SAVE_DEBOUNCE_MS = 200;

// Grupos criados automaticamente na primeira inicialização.
const DEFAULT_GROUPS = [
  {
    name: 'Ansiedade no dia a dia',
    description: 'Troque experiências e estratégias para lidar com a ansiedade na rotina.',
  },
  {
    name: 'Rotina e sono',
    description: 'Conversas sobre hábitos, descanso e como cuidar de noites mais tranquilas.',
  },
  {
    name: 'Trabalho e estresse',
    description: 'Um espaço para falar sobre pressão no trabalho, limites e equilíbrio.',
  },
];

function emptyData() {
  return { version: 1, groups: [], messages: {}, invites: {} };
}

/**
 * Persistência simples em arquivo JSON.
 * - Carrega na inicialização (cria o arquivo se não existir);
 * - Gravação atômica: arquivo temporário + rename;
 * - Gravações agrupadas com debounce (~200 ms).
 */
export async function createStore({ dataFile, logger }) {
  let data;
  let saveTimer = null;
  let writing = null; // Promise da gravação em andamento
  let dirtyWhileWriting = false;

  await fs.mkdir(path.dirname(dataFile), { recursive: true });

  let firstStart = false;
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    data = { ...emptyData(), ...JSON.parse(raw) };
  } catch (err) {
    if (err.code === 'ENOENT') {
      firstStart = true;
      data = emptyData();
    } else {
      // Arquivo corrompido: guarda uma cópia e recomeça, sem derrubar o servidor.
      const backup = `${dataFile}.corrompido-${Date.now()}`;
      logger.error(`Não foi possível ler ${dataFile} (${err.message}). Cópia salva em ${backup}.`);
      await fs.rename(dataFile, backup).catch(() => {});
      firstStart = true;
      data = emptyData();
    }
  }

  if (firstStart) {
    const now = new Date().toISOString();
    for (const g of DEFAULT_GROUPS) {
      data.groups.push({ id: randomUUID(), name: g.name, description: g.description, createdAt: now });
    }
    for (const g of data.groups) data.messages[g.id] ??= [];
    await writeNow();
  }

  async function writeFileAtomic(contents) {
    const tmp = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, contents, 'utf8');
    // No Windows o rename pode falhar momentaneamente (antivírus/indexador).
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(tmp, dataFile);
        return;
      } catch (err) {
        if (attempt >= 4 || !['EPERM', 'EACCES', 'EBUSY'].includes(err.code)) {
          await fs.rm(tmp, { force: true }).catch(() => {});
          throw err;
        }
        await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
      }
    }
  }

  async function writeNow() {
    if (writing) {
      dirtyWhileWriting = true;
      return writing;
    }
    writing = (async () => {
      try {
        do {
          dirtyWhileWriting = false;
          await writeFileAtomic(JSON.stringify(data));
        } while (dirtyWhileWriting);
      } catch (err) {
        logger.error(`Falha ao salvar dados: ${err.message}`);
      } finally {
        writing = null;
      }
    })();
    return writing;
  }

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      writeNow();
    }, SAVE_DEBOUNCE_MS);
  }

  /** Grava imediatamente o que estiver pendente (usado ao encerrar). */
  async function flush() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      await writeNow();
    }
    while (writing) await writing;
  }

  // ---- Grupos ----
  function listGroups() {
    return data.groups;
  }

  function getGroup(id) {
    return data.groups.find((g) => g.id === id) ?? null;
  }

  function createGroup({ name, description }) {
    const group = { id: randomUUID(), name, description, createdAt: new Date().toISOString() };
    data.groups.push(group);
    data.messages[group.id] = [];
    scheduleSave();
    return group;
  }

  // ---- Mensagens (anônimas: apenas id, groupId, text, createdAt, clientId) ----
  function getMessages(groupId, { limit, since } = {}) {
    let list = data.messages[groupId] ?? [];
    if (since !== undefined) list = list.filter((m) => Date.parse(m.createdAt) > since);
    return list.slice(-limit);
  }

  function findMessageByClientId(groupId, clientId) {
    const list = data.messages[groupId] ?? [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].clientId === clientId) return list[i];
    }
    return null;
  }

  function addMessage(groupId, { text, clientId }) {
    const list = (data.messages[groupId] ??= []);
    // Garante createdAt estritamente crescente dentro do grupo (útil para ?since=).
    let ts = Date.now();
    const last = list.at(-1);
    if (last) ts = Math.max(ts, Date.parse(last.createdAt) + 1);
    const message = { id: randomUUID(), groupId, text, createdAt: new Date(ts).toISOString(), clientId };
    list.push(message);
    if (list.length > MAX_MESSAGES_PER_GROUP) list.splice(0, list.length - MAX_MESSAGES_PER_GROUP);
    scheduleSave();
    return message;
  }

  // ---- Convites ----
  function getInvite(token) {
    return Object.hasOwn(data.invites, token) ? data.invites[token] : null;
  }

  function saveInvite(invite) {
    data.invites[invite.token] = invite;
    scheduleSave();
    return invite;
  }

  return {
    dataFile,
    flush,
    listGroups,
    getGroup,
    createGroup,
    getMessages,
    findMessageByClientId,
    addMessage,
    getInvite,
    saveInvite,
  };
}

// Exportado apenas para depuração/testes.
export function readDataFileSync(dataFile) {
  return JSON.parse(fsSync.readFileSync(dataFile, 'utf8'));
}
