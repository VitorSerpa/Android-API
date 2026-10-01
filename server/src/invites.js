import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from './errors.js';

export const MAX_SUMMARY_LINES = 30;
export const MAX_LINE_LENGTH = 200;
const MAX_PERIOD_LABEL_LENGTH = 100;

// token: 16 bytes em base64url = 22 caracteres.
const TOKEN_RE = /^[A-Za-z0-9_-]{22}$/;

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function isValidToken(token) {
  return typeof token === 'string' && TOKEN_RE.test(token);
}

/** Extrai o ownerKey do cabeçalho "Authorization: Bearer <ownerKey>". */
function bearerKey(req) {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1] : null;
}

function keyMatches(invite, key) {
  if (!key) return false;
  const expected = Buffer.from(invite.ownerKeyHash, 'hex');
  const actual = sha256(key);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Regras de negócio dos convites de apoiador.
 * Nada sobre a identidade de quem criou o convite é armazenado:
 * apenas o token, o hash do ownerKey, datas e o último resumo.
 */
export function createInviteService({ store, getPublicUrl }) {
  function create() {
    let token;
    do token = randomBytes(16).toString('base64url');
    while (store.getInvite(token));
    const ownerKey = randomBytes(32).toString('base64url');
    store.saveInvite({
      token,
      ownerKeyHash: sha256(ownerKey).toString('hex'),
      createdAt: new Date().toISOString(),
      revokedAt: null,
      summary: null,
    });
    return { token, ownerKey, url: `${getPublicUrl()}/i/${token}` };
  }

  function find(token) {
    return isValidToken(token) ? store.getInvite(token) : null;
  }

  /** Busca o convite exigindo o ownerKey correto (404 → 401 → 410). */
  function requireOwner(token, req, { allowRevoked = false } = {}) {
    const invite = find(token);
    if (!invite) throw new HttpError(404, 'Convite não encontrado.');
    if (!keyMatches(invite, bearerKey(req))) throw new HttpError(401, 'Chave de acesso inválida.');
    if (invite.revokedAt && !allowRevoked) throw new HttpError(410, 'Este convite foi revogado.');
    return invite;
  }

  function validateSummary(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new HttpError(400, 'Corpo da requisição deve ser um objeto JSON.');
    }
    const { periodLabel, generatedAt, lines } = body;
    if (typeof periodLabel !== 'string' || !periodLabel.trim() || periodLabel.length > MAX_PERIOD_LABEL_LENGTH) {
      throw new HttpError(400, `periodLabel é obrigatório (até ${MAX_PERIOD_LABEL_LENGTH} caracteres).`);
    }
    if (typeof generatedAt !== 'string' || Number.isNaN(Date.parse(generatedAt))) {
      throw new HttpError(400, 'generatedAt deve ser uma data ISO 8601 válida.');
    }
    if (!Array.isArray(lines) || lines.length > MAX_SUMMARY_LINES) {
      throw new HttpError(400, `lines deve ser uma lista com no máximo ${MAX_SUMMARY_LINES} itens.`);
    }
    for (const line of lines) {
      if (typeof line !== 'string' || line.length > MAX_LINE_LENGTH) {
        throw new HttpError(400, `Cada linha deve ser um texto com até ${MAX_LINE_LENGTH} caracteres.`);
      }
    }
    return { periodLabel: periodLabel.trim(), generatedAt, lines: [...lines] };
  }

  function putSummary(token, req, body) {
    const invite = requireOwner(token, req);
    const summary = validateSummary(body);
    store.saveInvite({ ...invite, summary, updatedAt: new Date().toISOString() });
  }

  function revoke(token, req) {
    const invite = requireOwner(token, req, { allowRevoked: true });
    if (invite.revokedAt) return; // já revogado: operação idempotente
    // Mantém um "tombstone" (token + hash + datas) e descarta o resumo.
    store.saveInvite({ ...invite, summary: null, revokedAt: new Date().toISOString() });
  }

  /** Estado público do convite: 'unknown' | 'revoked' | 'empty' | 'ready'. */
  function publicState(token) {
    const invite = find(token);
    if (!invite) return { state: 'unknown' };
    if (invite.revokedAt) return { state: 'revoked' };
    if (!invite.summary) return { state: 'empty' };
    return { state: 'ready', summary: invite.summary };
  }

  return { create, putSummary, revoke, publicState };
}
