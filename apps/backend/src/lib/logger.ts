import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: label => ({ level: label }),
    bindings: bindings => ({ pid: bindings.pid, host: bindings.hostname })
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

