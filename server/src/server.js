import http from 'node:http';
import { createStore } from './store.js';
import { createInviteService } from './invites.js';
import { createHttpHandler } from './http.js';
import { attachWebSocket } from './ws.js';
import { consoleLogger } from './logger.js';

/**
 * Monta o servidor HTTP + WebSocket sem começar a escutar.
 * @param {{port?:number, host?:string, publicUrl?:string, dataFile:string, logger?:object, heartbeatMs?:number}} options
 */
export async function createApp({
  port = 3000,
  host = '0.0.0.0',
  publicUrl,
  dataFile,
  logger = consoleLogger,
  heartbeatMs,
}) {
  const store = await createStore({ dataFile, logger });
  let resolvedPublicUrl = publicUrl ?? `http://localhost:${port}`;
  const invites = createInviteService({ store, getPublicUrl: () => resolvedPublicUrl });

  let realtime = null;
  const handler = createHttpHandler({
    store,
    invites,
    onlineCount: (groupId) => realtime?.onlineCount(groupId) ?? 0,
    logger,
  });

  const server = http.createServer((req, res) => {
    handler(req, res).catch((err) => {
      logger.error('Falha inesperada no handler HTTP:', err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro interno do servidor.' }));
    });
  });
  server.on('clientError', (err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    else socket.destroy();
  });

  realtime = attachWebSocket({ server, store, logger, heartbeatMs });

  let closed = false;

  return {
    server,
    store,
    get publicUrl() {
      return resolvedPublicUrl;
    },

    /** Começa a escutar; resolve com a porta efetiva (útil com PORT=0). */
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.off('error', reject);
          const actualPort = server.address().port;
          if (!publicUrl) resolvedPublicUrl = `http://localhost:${actualPort}`;
          resolve(actualPort);
        });
      });
    },

    /** Encerra WebSockets, HTTP e grava os dados pendentes. */
    async close() {
      if (closed) return;
      closed = true;
      await realtime.close();
      await new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
      await store.flush();
    },
  };
}
