/**
 * 简单的日志工具
 * 支持多个日志级别和格式化输出
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = (process.env.OCR_LOG || 'info') as LogLevel;
    this.level = LOG_LEVELS[envLevel] !== undefined ? envLevel : 'info';
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, mod: string, msg: string): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const SSS = String(now.getMilliseconds()).padStart(3, '0');
    const ts = `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}.${SSS}`;
    return `[${ts}][${level.toUpperCase()}][${mod}] ${msg}`;
  }

  debug(mod: string, msg: string) {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', mod, msg));
    }
  }

  info(mod: string, msg: string) {
    if (this.shouldLog('info')) {
      console.info(this.format('info', mod, msg));
    }
  }

  warn(mod: string, msg: string) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', mod, msg));
    }
  }

  error(mod: string, msg: string | Error) {
    if (this.shouldLog('error')) {
      const message = msg instanceof Error ? `${msg.message}\n${msg.stack}` : msg;
      console.error(this.format('error', mod, message));
    }
  }
}

export const logger = new Logger();
