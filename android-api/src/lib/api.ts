/**
 * Client for the Node.js server in `/server`: sync of the user's document
 * (US-14), supporter invites and the anonymous support groups over WebSocket
 * (US-13, currently hidden in the app). Configure it with
 * `EXPO_PUBLIC_API_URL` (e.g. `http://10.0.2.2:3000` on the Android emulator) or,
 * on the phone, in Configurações → Sincronização.
 */

export const DEFAULT_API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? '');

let apiUrl = DEFAULT_API_URL;

/**
 * `http://192.168.0.10:3000/` → `http://192.168.0.10:3000`; adds `http://` when
 * missing. Returns '' for an empty or invalid address.
 */
export function normalizeApiUrl(value: string): string {
  let url = value.trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return /^https?:\/\/[^\s/?#]+(?::\d+)?(\/[^\s?#]*)?$/i.test(url) ? url : '';
}

/** The server address in use: the one typed in Configurações, or the build's default. */
export const getApiUrl = () => apiUrl;
export const isApiConfigured = () => apiUrl.length > 0;
export const getWsUrl = () => apiUrl.replace(/^http/, 'ws') + '/ws';

/**
 * Changes the server address at runtime (Configurações → Sincronização), so a
 * build installed on the phone can reach the computer even when its IP
 * changes. `null` goes back to the build's default. Persisting it is up to the
 * caller (`lib/server-address.ts`).
 */
export function setApiUrl(value: string | null) {
  apiUrl = value === null ? DEFAULT_API_URL : normalizeApiUrl(value);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TIMEOUT_MS = 10_000;

type RequestOptions = RequestInit & { json?: unknown; token?: string; timeoutMs?: number; acceptStatus?: number[] };

export async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
  if (!isApiConfigured()) throw new ApiError('Servidor não configurado (EXPO_PUBLIC_API_URL).', null);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? TIMEOUT_MS);
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    if (!response.ok && !init.acceptStatus?.includes(response.status)) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(body?.error ?? `Erro ${response.status} no servidor.`, response.status);
    }
    return (response.status === 204 ? undefined : await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Sem conexão com o servidor. Tente novamente quando estiver online.', null);
  } finally {
    clearTimeout(timer);
  }
}

export type Group = { id: string; name: string; description: string; createdAt: string; online: number };
export type GroupMessage = { id: string; groupId: string; text: string; createdAt: string; clientId: string };

export const listGroups = () => request<Group[]>('/groups');
export const createGroup = (name: string, description: string) =>
  request<Group>('/groups', { method: 'POST', json: { name, description } });
export const groupMessages = (groupId: string, since?: string) =>
  request<GroupMessage[]>(`/groups/${encodeURIComponent(groupId)}/messages${since ? `?since=${encodeURIComponent(since)}` : ''}`);

export type CreatedInvite = { token: string; ownerKey: string; url: string };

export const createInvite = () => request<CreatedInvite>('/invites', { method: 'POST' });
export const putInviteSummary = (
  token: string,
  ownerKey: string,
  summary: { periodLabel: string; generatedAt: string; lines: string[] },
) => request<void>(`/invites/${encodeURIComponent(token)}/summary`, { method: 'PUT', json: summary, token: ownerKey });
export const revokeInvite = (token: string, ownerKey: string) =>
  request<void>(`/invites/${encodeURIComponent(token)}`, { method: 'DELETE', token: ownerKey });

/* Sincronização (US-14 / RF-58) ------------------------------------------ */

export type RemoteDocument = {
  revision: number;
  updatedAt: string | null;
  /** `null` when the server has no copy yet, or nothing changed since `since`. */
  data: Record<string, unknown> | null;
  unchanged: boolean;
};

export type PushResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; revision: number; updatedAt: string | null; data: Record<string, unknown> | null };

/** The whole document can be large (up to 10 MB on the server), so it gets more time. */
const SYNC_TIMEOUT_MS = 30_000;

export const pullDocument = (token: string, since?: number) =>
  request<RemoteDocument>(`/sync${since !== undefined ? `?since=${since}` : ''}`, { token, timeoutMs: SYNC_TIMEOUT_MS });

/** 409 is a normal answer: someone else wrote first, and it carries their copy to merge. */
export async function pushDocument(token: string, baseRevision: number, data: unknown): Promise<PushResult> {
  const body = await request<{ revision: number; updatedAt: string | null; data?: Record<string, unknown> | null; error?: string }>(
    '/sync',
    { method: 'PUT', json: { baseRevision, data }, token, timeoutMs: SYNC_TIMEOUT_MS, acceptStatus: [409] },
  );
  if (body.error !== undefined) return { ok: false, revision: body.revision, updatedAt: body.updatedAt, data: body.data ?? null };
  return { ok: true, revision: body.revision, updatedAt: body.updatedAt ?? new Date().toISOString() };
}

export const deleteRemoteDocument = (token: string) => request<void>('/sync', { method: 'DELETE', token });
