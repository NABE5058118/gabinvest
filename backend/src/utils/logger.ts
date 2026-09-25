type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'adminToken',
  'Authorization',
  'x-admin-token',
  'x-telegram-init-data',
  'initData',
  'secret',
  'jwtSecret',
  'adminJwtSecret',
  'apiKey',
  'webhookUrl',
];

function redact(obj: unknown): unknown {
  if (obj == null) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);

  const entries = Object.entries(obj as Record<string, unknown>);
  const result: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatValue(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack || ''}`;
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(redact(value));
    } catch {
      return String(value);
    }
  }
  return String(value);
}

class Logger {
  private level: LogLevel;
  private context?: string;

  constructor(context?: string) {
    this.context = context;
    this.level = process.env.NODE_ENV === 'test' ? 'warn' : 'debug';
  }

  setContext(context: string) {
    this.context = context;
  }

  isEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!this.isEnabled(level)) return;
    const ts = new Date().toISOString();
    const ctx = this.context ? ` [${this.context}]` : '';
    const prefix = `${ts}${ctx} ${level.toUpperCase()}:`;
    if (args.length === 0) {
      console.log(`${prefix} ${message}`);
      return;
    }
    const formattedArgs = args.map(formatValue);
    if (formattedArgs.length === 1) {
      console.log(`${prefix} ${message} ${formattedArgs[0]}`);
      return;
    }
    console.log(`${prefix} ${message}`);
    for (const arg of formattedArgs) {
      console.log(arg);
    }
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }

  fatal(message: string, ...args: unknown[]) {
    this.log('error', `FATAL: ${message}`, ...args);
  }
}

let defaultLogger = new Logger();

export function createLogger(context: string): Logger {
  const logger = new Logger(context);
  return logger;
}

export function getLogger(): Logger {
  return defaultLogger;
}

export default defaultLogger;
