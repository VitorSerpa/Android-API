import crypto from 'node:crypto';
import { HttpError } from './errors.js';

/**
 * Verifica o ID token do Firebase Authentication que o app envia em
 * `Authorization: Bearer <token>` (US-14 / RF-58). Sem dependências: as chaves
 * públicas do Google vêm do endpoint JWKS e a assinatura RS256 é conferida com
 * `node:crypto`, seguindo as regras documentadas pelo Firebase:
 * https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
 *
 * Com o Auth Emulator (`FIREBASE_AUTH_EMULATOR_HOST`), os tokens não são
 * assinados (`alg: none`); como o Admin SDK, aceitamos esses tokens apenas
 * nesse modo de desenvolvimento.
 */

export const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const CLOCK_SKEW_SEC = 300;
const DEFAULT_KEYS_TTL_MS = 60 * 60 * 1000;

function base64UrlJson(segment) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const unauthorized = (message = 'Sessão inválida. Entre novamente no app.') => new HttpError(401, message);

/**
 * @param {{ projectId: string, emulator?: boolean, fetchImpl?: typeof fetch, now?: () => number }} options
 * @returns {{ verify(token: string): Promise<{ uid: string }> }}
 */
export function createFirebaseVerifier({ projectId, emulator = false, fetchImpl = fetch, now = () => Date.now() }) {
  let keys = null; // Map<kid, KeyObject>
  let keysExpireAt = 0;
  let loading = null;

  async function loadKeys() {
    const response = await fetchImpl(GOOGLE_JWKS_URL);
    if (!response.ok) throw new Error(`JWKS respondeu ${response.status}`);
    const body = await response.json();
    const next = new Map();
    for (const jwk of body.keys ?? []) {
      if (jwk.kid && jwk.kty === 'RSA') next.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: 'jwk' }));
    }
    const maxAge = /max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1];
    keys = next;
    keysExpireAt = now() + (maxAge ? Number(maxAge) * 1000 : DEFAULT_KEYS_TTL_MS);
  }

  async function keyFor(kid) {
    if (!keys || now() >= keysExpireAt || !keys.has(kid)) {
      loading ??= loadKeys().finally(() => {
        loading = null;
      });
      await loading;
    }
    return keys.get(kid) ?? null;
  }

  return {
    async verify(token) {
      if (typeof token !== 'string' || !token) throw unauthorized('Faltou o token de acesso.');
      const parts = token.split('.');
      if (parts.length !== 3) throw unauthorized();
      const [rawHeader, rawPayload, rawSignature] = parts;
      const header = base64UrlJson(rawHeader);
      const payload = base64UrlJson(rawPayload);
      if (!header || !payload) throw unauthorized();

      if (emulator && header.alg === 'none') {
        // Auth Emulator: token sem assinatura, só em desenvolvimento.
      } else {
        if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw unauthorized();
        let key;
        try {
          key = await keyFor(header.kid);
        } catch {
          throw new HttpError(503, 'Não foi possível validar a sessão agora. Tente de novo em instantes.');
        }
        if (!key) throw unauthorized();
        const valid = crypto.verify(
          'RSA-SHA256',
          Buffer.from(`${rawHeader}.${rawPayload}`),
          key,
          Buffer.from(rawSignature, 'base64url'),
        );
        if (!valid) throw unauthorized();
      }

      const nowSec = Math.floor(now() / 1000);
      if (payload.aud !== projectId) throw unauthorized();
      if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw unauthorized();
      if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SEC < nowSec) {
        throw unauthorized('Sua sessão expirou. Abra o app de novo para renová-la.');
      }
      if (typeof payload.iat !== 'number' || payload.iat - CLOCK_SKEW_SEC > nowSec) throw unauthorized();
      if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw unauthorized();
      return { uid: payload.sub };
    },
  };
}

/** Lê o bearer token do cabeçalho `Authorization`. */
export function bearerToken(req) {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : '';
}
