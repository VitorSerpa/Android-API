// Logger mínimo. Nunca registre textos de mensagens, IPs ou tokens.
function write(level, args) {
  const line = `${new Date().toISOString()} ${level}`;
  if (level === 'ERROR') console.error(line, ...args);
  else if (level === 'WARN') console.warn(line, ...args);
  else console.log(line, ...args);
}

export const consoleLogger = {
  info: (...args) => write('INFO', args),
  warn: (...args) => write('WARN', args),
  error: (...args) => write('ERROR', args),
};

export const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
