import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Cópia no servidor do documento de cada usuário (US-14 / RF-58).
 *
 * - Um arquivo por usuário em `<pasta dos dados>/users/<sha256(uid)>.json`, para
 *   que o id do Firebase não apareça nem no nome do arquivo;
 * - Cada gravação aumenta a `revision`. O app envia a revisão em que se baseou
 *   (`baseRevision`); se outra gravação chegou antes, a resposta é um conflito
 *   com a cópia atual, e o app mescla antes de tentar de novo — assim nada é
 *   sobrescrito sem ser visto;
 * - Gravação atômica (arquivo temporário + rename) e serializada por usuário.
 */
export async function createSyncStore({ directory, logger }) {
  await fs.mkdir(directory, { recursive: true });
  const cache = new Map(); // fileName → { revision, updatedAt, data } | null
  const queues = new Map(); // fileName → Promise da última operação

  const fileNameFor = (uid) => `${crypto.createHash('sha256').update(uid).digest('hex')}.json`;

  async function read(fileName) {
    if (cache.has(fileName)) return cache.get(fileName);
    let record = null;
    try {
      record = JSON.parse(await fs.readFile(path.join(directory, fileName), 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error(`Cópia de sincronização ilegível (${err.message}); tratando como vazia.`);
      }
    }
    cache.set(fileName, record);
    return record;
  }

  async function writeAtomic(fileName, record) {
    const target = path.join(directory, fileName);
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(record), 'utf8');
    try {
      await fs.rename(tmp, target);
    } catch (err) {
      await fs.rm(tmp, { force: true }).catch(() => {});
      throw err;
    }
  }

  /** Executa `task` depois das operações anteriores do mesmo usuário. */
  function serial(fileName, task) {
    const previous = queues.get(fileName) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    queues.set(fileName, next);
    next.finally(() => {
      if (queues.get(fileName) === next) queues.delete(fileName);
    }).catch(() => {});
    return next;
  }

  return {
    /** `{ revision, updatedAt, data }`; revisão 0 e `data: null` quando ainda não há cópia. */
    async get(uid) {
      const fileName = fileNameFor(uid);
      await (queues.get(fileName) ?? Promise.resolve()).catch(() => {});
      return (await read(fileName)) ?? { revision: 0, updatedAt: null, data: null };
    },

    /**
     * Grava se `baseRevision` for a revisão atual. Resolve com
     * `{ ok: true, revision, updatedAt }` ou `{ ok: false, current }` (conflito).
     */
    put(uid, baseRevision, data) {
      const fileName = fileNameFor(uid);
      return serial(fileName, async () => {
        const current = (await read(fileName)) ?? { revision: 0, updatedAt: null, data: null };
        if (current.revision !== baseRevision) return { ok: false, current };
        const record = { revision: current.revision + 1, updatedAt: new Date().toISOString(), data };
        await writeAtomic(fileName, record);
        cache.set(fileName, record);
        return { ok: true, revision: record.revision, updatedAt: record.updatedAt };
      });
    },

    /** Apaga a cópia do usuário (botão "Apagar dados do servidor"). */
    remove(uid) {
      const fileName = fileNameFor(uid);
      return serial(fileName, async () => {
        await fs.rm(path.join(directory, fileName), { force: true });
        cache.set(fileName, null);
      });
    },

    /** Aguarda as gravações pendentes (usado ao encerrar). */
    async flush() {
      await Promise.allSettled([...queues.values()]);
    },
  };
}
