/**
 * Client for the Node.js server in `/server` (US-13): supporter invites (and
 * the anonymous support groups over WebSocket, currently hidden in the app). Configure it with
 * `EXPO_PUBLIC_API_URL` (e.g. `http://10.0.2.2:3000` on the Android emulator).
 */

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const apiConfigured = API_URL.length > 0;

export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

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

export async function request<T>(path: string, init: RequestInit & { json?: unknown; token?: string } = {}): Promise<T> {
  if (!apiConfigured) throw new ApiError('Servidor não configurado (EXPO_PUBLIC_API_URL).', null);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...init.headers,
      },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    if (!response.ok) {
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
