import { WebSocketServer, WebSocket } from 'ws';

const JOIN_HISTORY_LIMIT = 50;
const MAX_TEXT_LENGTH = 1000;
const MAX_CLIENT_ID_LENGTH = 100;
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 10_000;

/**
 * Chat em tempo real dos grupos, no caminho /ws.
 * Anonimato: nenhuma mensagem guarda ou transmite id de usuário, nome, IP
 * ou identificador de socket — apenas { id, groupId, text, createdAt, clientId }.
 */
export function attachWebSocket({ server, store, logger, heartbeatMs = 30_000 }) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });
  /** groupId → Set<WebSocket> */
  const members = new Map();

  function send(ws, payload) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }

  function sendError(ws, error, extra = {}) {
    send(ws, { type: 'error', error, ...extra });
  }

  function join(ws, groupId) {
    let set = members.get(groupId);
    if (!set) members.set(groupId, (set = new Set()));
    set.add(ws);
    ws.joinedGroups.add(groupId);
  }

  function leave(ws, groupId) {
    const set = members.get(groupId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) members.delete(groupId);
    }
    ws.joinedGroups.delete(groupId);
  }

  function broadcast(groupId, payload) {
    const set = members.get(groupId);
    if (!set) return;
    const data = JSON.stringify(payload);
    for (const client of set) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  function isRateLimited(ws) {
    const now = Date.now();
    ws.sentAt = ws.sentAt.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (ws.sentAt.length >= RATE_LIMIT_COUNT) return true;
    ws.sentAt.push(now);
    return false;
  }

  function handleMessage(ws, msg) {
    const { groupId, clientId } = msg;
    const ref = typeof clientId === 'string' ? { clientId } : {};

    if (typeof groupId !== 'string' || !store.getGroup(groupId)) {
      return sendError(ws, 'Grupo não encontrado.', ref);
    }
    if (!ws.joinedGroups.has(groupId)) {
      return sendError(ws, 'Entre no grupo antes de enviar mensagens.', ref);
    }
    if (typeof clientId !== 'string' || !clientId || clientId.length > MAX_CLIENT_ID_LENGTH) {
      return sendError(ws, 'clientId inválido.');
    }
    const text = typeof msg.text === 'string' ? msg.text.trim() : '';
    if (text.length < 1 || text.length > MAX_TEXT_LENGTH) {
      return sendError(ws, `A mensagem deve ter entre 1 e ${MAX_TEXT_LENGTH} caracteres.`, ref);
    }

    // Idempotência: reenvio com o mesmo clientId apenas recebe um novo ack.
    const existing = store.findMessageByClientId(groupId, clientId);
    if (existing) return send(ws, { type: 'ack', clientId, id: existing.id });

    if (isRateLimited(ws)) {
      return sendError(ws, 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.', ref);
    }

    const message = store.addMessage(groupId, { text, clientId });
    broadcast(groupId, { type: 'message', message });
    send(ws, { type: 'ack', clientId, id: message.id });
  }

  function handle(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString('utf8'));
    } catch {
      return sendError(ws, 'Mensagem inválida: JSON esperado.');
    }
    if (!msg || typeof msg !== 'object') return sendError(ws, 'Mensagem inválida.');

    switch (msg.type) {
      case 'ping':
        return send(ws, { type: 'pong' });
      case 'join': {
        const group = typeof msg.groupId === 'string' ? store.getGroup(msg.groupId) : null;
        if (!group) return sendError(ws, 'Grupo não encontrado.', { groupId: msg.groupId });
        join(ws, group.id);
        return send(ws, {
          type: 'joined',
          groupId: group.id,
          messages: store.getMessages(group.id, { limit: JOIN_HISTORY_LIMIT }),
        });
      }
      case 'leave':
        if (typeof msg.groupId === 'string') leave(ws, msg.groupId);
        return;
      case 'message':
        return handleMessage(ws, msg);
      default:
        return sendError(ws, 'Tipo de mensagem desconhecido.');
    }
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.joinedGroups = new Set();
    ws.sentAt = [];

    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (raw, isBinary) => {
      try {
        if (isBinary) return sendError(ws, 'Mensagens binárias não são suportadas.');
        handle(ws, raw);
      } catch (err) {
        logger.error('Erro ao processar mensagem do WebSocket:', err);
        sendError(ws, 'Erro interno do servidor.');
      }
    });
    ws.on('close', () => {
      for (const groupId of [...ws.joinedGroups]) leave(ws, groupId);
    });
    ws.on('error', (err) => {
      logger.warn(`Erro no WebSocket: ${err.message}`);
    });
  });

  wss.on('error', (err) => logger.error('Erro no servidor WebSocket:', err));

  // Heartbeat: encerra conexões que não responderem ao ping.
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      try {
        ws.ping();
      } catch {
        ws.terminate();
      }
    }
  }, heartbeatMs);
  heartbeat.unref();

  return {
    onlineCount(groupId) {
      return members.get(groupId)?.size ?? 0;
    },
    close() {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      return new Promise((resolve) => wss.close(() => resolve()));
    },
  };
}
