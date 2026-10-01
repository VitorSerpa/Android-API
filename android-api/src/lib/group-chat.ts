import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiConfigured, WS_URL, type GroupMessage } from '@/lib/api';

/**
 * Anonymous support-group chat (RF-54). Messages carry no name or id of the
 * author (CA-01): the server only sees the text and a random per-message
 * `clientId`, which this device remembers to show its own messages as "Você".
 *
 * Offline first (RNF-05): the conversation is cached on the device and
 * messages written without internet wait in a queue that is re-sent — without
 * duplicates, since the server dedupes by `clientId` — once the socket reconnects.
 */

export type JoinedGroup = { id: string; name: string };
export type PendingMessage = { clientId: string; groupId: string; text: string; createdAt: string };

type ChatCache = {
  joined: JoinedGroup[];
  messages: Record<string, GroupMessage[]>;
  pending: PendingMessage[];
  mine: string[];
};

const MAX_CACHED = 200;
const keyFor = (userId: string) => `mente:user:${userId}:groups`;

const empty = (): ChatCache => ({ joined: [], messages: {}, pending: [], mine: [] });

export async function loadChatCache(userId: string): Promise<ChatCache> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw ? { ...empty(), ...(JSON.parse(raw) as Partial<ChatCache>) } : empty();
  } catch {
    return empty();
  }
}

async function saveChatCache(userId: string, cache: ChatCache) {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(cache));
  } catch (error) {
    console.warn('Falha ao salvar conversa do grupo', error);
  }
}

export async function setJoinedGroups(userId: string, update: (joined: JoinedGroup[]) => JoinedGroup[]) {
  const cache = await loadChatCache(userId);
  cache.joined = update(cache.joined);
  await saveChatCache(userId, cache);
  return cache.joined;
}

function merge(existing: GroupMessage[], incoming: GroupMessage[]): GroupMessage[] {
  const byId = new Map(existing.map((item) => [item.clientId || item.id, item]));
  for (const message of incoming) byId.set(message.clientId || message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-MAX_CACHED);
}

export type ChatStatus = 'connecting' | 'online' | 'offline' | 'disabled';

export type ChatItem = { key: string; text: string; createdAt: string; mine: boolean; pending: boolean };

export function useGroupChat(userId: string, groupId: string, offlineMode: boolean) {
  const [cache, setCache] = useState<ChatCache | null>(null);
  const [status, setStatus] = useState<ChatStatus>('connecting');
  const cacheRef = useRef<ChatCache | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const commit = useCallback(
    (next: ChatCache) => {
      cacheRef.current = next;
      setCache(next);
      saveChatCache(userId, next);
    },
    [userId],
  );

  useEffect(() => {
    let cancelled = false;
    loadChatCache(userId).then((loaded) => {
      if (cancelled) return;
      cacheRef.current = loaded;
      setCache(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flush = useCallback(() => {
    const socket = socketRef.current;
    const current = cacheRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !current) return;
    for (const item of current.pending.filter((pending) => pending.groupId === groupId)) {
      socket.send(JSON.stringify({ type: 'message', groupId, text: item.text, clientId: item.clientId }));
    }
  }, [groupId]);

  useEffect(() => {
    if (!cache || offlineMode || !apiConfigured) return;

    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let delay = 1000;

    const connect = () => {
      setStatus('connecting');
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        delay = 1000;
        setStatus('online');
        socket.send(JSON.stringify({ type: 'join', groupId }));
      };

      socket.onmessage = (event) => {
        let payload: { type: string; messages?: GroupMessage[]; message?: GroupMessage; clientId?: string };
        try {
          payload = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const current = cacheRef.current;
        if (!current) return;
        if (payload.type === 'joined' && payload.messages) {
          commit({ ...current, messages: { ...current.messages, [groupId]: merge(current.messages[groupId] ?? [], payload.messages) } });
          flush();
        } else if (payload.type === 'message' && payload.message && payload.message.groupId === groupId) {
          const message = payload.message;
          commit({
            ...current,
            messages: { ...current.messages, [groupId]: merge(current.messages[groupId] ?? [], [message]) },
            pending: current.pending.filter((item) => item.clientId !== message.clientId),
          });
        } else if (payload.type === 'ack' && payload.clientId) {
          commit({ ...current, pending: current.pending.filter((item) => item.clientId !== payload.clientId) });
        }
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (closed) return;
        setStatus('offline');
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30_000);
      };
      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
      socketRef.current = null;
    };
    // Connect once per group; the cache is read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, offlineMode, cache === null]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const current = cacheRef.current;
      if (!trimmed || !current) return;
      const item: PendingMessage = { clientId: Crypto.randomUUID(), groupId, text: trimmed.slice(0, 1000), createdAt: new Date().toISOString() };
      commit({ ...current, pending: [...current.pending, item], mine: [...current.mine, item.clientId].slice(-2000) });
      flush();
    },
    [commit, flush, groupId],
  );

  const mine = new Set(cache?.mine ?? []);
  const items: ChatItem[] = [
    ...(cache?.messages[groupId] ?? []).map((message) => ({
      key: message.clientId || message.id,
      text: message.text,
      createdAt: message.createdAt,
      mine: mine.has(message.clientId),
      pending: false,
    })),
    ...(cache?.pending ?? [])
      .filter((item) => item.groupId === groupId)
      .map((item) => ({ key: item.clientId, text: item.text, createdAt: item.createdAt, mine: true, pending: true })),
  ];

  return { items, status: offlineMode || !apiConfigured ? ('disabled' as const) : status, send, ready: cache !== null };
}
