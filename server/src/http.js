import { HttpError } from './errors.js';
import { renderInvitePage } from './html.js';

export const BODY_LIMIT_BYTES = 64 * 1024;
const MESSAGES_HTTP_LIMIT = 200;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function sendEmpty(res, status) {
  res.writeHead(status);
  res.end();
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.end(html);
}

/** Lê o corpo JSON respeitando o limite de 64 KB. Corpo vazio → undefined. */
function readJson(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (declared > BODY_LIMIT_BYTES) {
      reject(new HttpError(413, 'Corpo da requisição excede 64 KB.'));
      return;
    }
    const chunks = [];
    let size = 0;
    let failed = false;
    req.on('data', (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) {
        failed = true;
        reject(new HttpError(413, 'Corpo da requisição excede 64 KB.'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (failed) return;
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve(undefined);
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new HttpError(400, 'JSON inválido no corpo da requisição.'));
      }
    });
    req.on('error', (err) => {
      if (!failed) reject(err);
    });
  });
}

function asObject(body) {
  if (body === undefined) return {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Corpo da requisição deve ser um objeto JSON.');
  }
  return body;
}

// Remove tokens do caminho antes de registrar no log.
function redactPath(pathname) {
  return pathname.replace(/^\/(i|invites)\/[^/]+/, '/$1/:token');
}

/**
 * Cria o handler HTTP.
 * @param {{store, invites, onlineCount:(groupId:string)=>number, logger}} deps
 */
export function createHttpHandler({ store, invites, onlineCount, logger }) {
  function groupView(group) {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      online: onlineCount(group.id),
    };
  }

  // Rotas: [método, regex do caminho, handler(req, res, params, url)]
  const routes = [
    ['GET', /^\/health$/, (req, res) => sendJson(res, 200, { ok: true })],

    ['GET', /^\/groups$/, (req, res) => sendJson(res, 200, store.listGroups().map(groupView))],

    ['POST', /^\/groups$/, async (req, res) => {
      const body = asObject(await readJson(req));
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 3 || name.length > 60) {
        throw new HttpError(400, 'O nome do grupo deve ter entre 3 e 60 caracteres.');
      }
      let description = '';
      if (body.description !== undefined && body.description !== null) {
        if (typeof body.description !== 'string') throw new HttpError(400, 'A descrição deve ser um texto.');
        description = body.description.trim();
        if (description.length > 200) throw new HttpError(400, 'A descrição deve ter no máximo 200 caracteres.');
      }
      const group = store.createGroup({ name, description });
      logger.info('Grupo criado');
      sendJson(res, 201, groupView(group));
    }],

    ['GET', /^\/groups\/([^/]+)\/messages$/, (req, res, [id], url) => {
      const group = store.getGroup(id);
      if (!group) throw new HttpError(404, 'Grupo não encontrado.');
      let since;
      const sinceParam = url.searchParams.get('since');
      if (sinceParam !== null && sinceParam !== '') {
        since = Date.parse(sinceParam);
        if (Number.isNaN(since)) throw new HttpError(400, 'Parâmetro "since" deve ser uma data ISO 8601 válida.');
      }
      sendJson(res, 200, store.getMessages(group.id, { limit: MESSAGES_HTTP_LIMIT, since }));
    }],

    ['POST', /^\/invites$/, async (req, res) => {
      await readJson(req); // sem corpo; lido apenas para respeitar o limite
      sendJson(res, 201, invites.create());
    }],

    ['PUT', /^\/invites\/([^/]+)\/summary$/, async (req, res, [token]) => {
      const body = await readJson(req);
      invites.putSummary(token, req, body);
      sendEmpty(res, 204);
    }],

    ['GET', /^\/invites\/([^/]+)\/summary$/, (req, res, [token]) => {
      const info = invites.publicState(token);
      if (info.state === 'unknown') throw new HttpError(404, 'Convite não encontrado.');
      if (info.state === 'revoked') throw new HttpError(410, 'Este convite foi revogado.');
      if (info.state === 'empty') throw new HttpError(404, 'Ainda não há resumo para este convite.');
      const { periodLabel, generatedAt, lines } = info.summary;
      sendJson(res, 200, { periodLabel, generatedAt, lines });
    }],

    ['DELETE', /^\/invites\/([^/]+)$/, (req, res, [token]) => {
      invites.revoke(token, req);
      sendEmpty(res, 204);
    }],

    ['GET', /^\/i\/([^/]+)$/, (req, res, [token]) => {
      const { status, html } = renderInvitePage(invites.publicState(token));
      sendHtml(res, status, html);
    }],
  ];

  async function dispatch(req, res, url) {
    if (req.method === 'OPTIONS') return sendEmpty(res, 204);

    let pathMatched = false;
    for (const [method, pattern, handler] of routes) {
      const match = pattern.exec(url.pathname);
      if (!match) continue;
      pathMatched = true;
      if (method !== req.method) continue;
      let params;
      try {
        params = match.slice(1).map(decodeURIComponent);
      } catch {
        throw new HttpError(400, 'Caminho inválido.');
      }
      return handler(req, res, params, url);
    }
    if (pathMatched) throw new HttpError(405, 'Método não permitido.');
    throw new HttpError(404, 'Rota não encontrada.');
  }

  return async function handle(req, res) {
    const started = Date.now();
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);

    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      url = new URL('http://localhost/');
    }

    try {
      await dispatch(req, res, url);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) logger.error(`Erro ao processar ${req.method} ${redactPath(url.pathname)}:`, err);
      if (res.headersSent) {
        res.destroy();
      } else {
        if (status === 413) res.setHeader('Connection', 'close');
        sendJson(res, status, { error: status === 500 ? 'Erro interno do servidor.' : err.message });
      }
    } finally {
      logger.info(`${req.method} ${redactPath(url.pathname)} ${res.statusCode} ${Date.now() - started}ms`);
    }
  };
}
