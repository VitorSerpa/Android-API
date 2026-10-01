import { loadConfig } from './config.js';
import { createApp } from './server.js';
import { consoleLogger as logger } from './logger.js';

let app;

try {
  const config = loadConfig();
  app = await createApp({ ...config, logger });
  const port = await app.listen();
  logger.info(`Mente Equilibrada ouvindo em http://${config.host}:${port} (WebSocket em /ws)`);
  logger.info(`URL pública dos convites: ${app.publicUrl}`);
  logger.info(`Dados em: ${config.dataFile}`);
} catch (err) {
  logger.error('Não foi possível iniciar o servidor:', err.message);
  process.exit(1);
}

let shuttingDown = false;
async function shutdown(signal, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Encerrando (${signal})...`);
  const force = setTimeout(() => process.exit(code || 1), 5000);
  force.unref();
  try {
    await app.close();
  } catch (err) {
    logger.error('Erro ao encerrar:', err);
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error('Promise rejeitada sem tratamento:', err));
process.on('uncaughtException', (err) => {
  logger.error('Exceção não tratada:', err);
  shutdown('uncaughtException', 1);
});
