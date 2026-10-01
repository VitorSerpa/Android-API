import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Pasta raiz do servidor (server/), usada para o caminho padrão dos dados.
const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parsePort(value, fallback) {
  if (value === undefined || value === '') return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT inválida: "${value}"`);
  }
  return port;
}

/**
 * Lê a configuração a partir das variáveis de ambiente.
 * PUBLIC_URL fica indefinida quando não informada; o servidor usa
 * http://localhost:<porta> depois de começar a escutar.
 */
export function loadConfig(env = process.env) {
  const port = parsePort(env.PORT, 3000);
  const host = env.HOST || '0.0.0.0';
  const publicUrl = env.PUBLIC_URL ? env.PUBLIC_URL.replace(/\/+$/, '') : undefined;
  const dataFile = env.DATA_FILE
    ? path.resolve(env.DATA_FILE)
    : path.join(SERVER_ROOT, 'data', 'db.json');
  return { port, host, publicUrl, dataFile };
}
