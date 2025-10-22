/*
  A small, styled logger tailored for this userscript.
  - Clear visual identity so logs stand out in console
  - Log levels, enable/disable via localStorage
  - Group helpers, timing helpers, trace, table, success
*/

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
type ToastType = 'info' | 'success' | 'warn' | 'error';
export interface ToastOptions { type?: ToastType; duration?: number }

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

const STORAGE_KEY = 'CJ_AI_LOG_LEVEL';
const BRAND = 'CJ-AI';

// Optional UI toast presenter, injected by app (e.g., ActionPanel)
let gToastPresenter: ((message: string, opts?: ToastOptions) => void) | null = null;
export function setToastPresenter(presenter: ((message: string, opts?: ToastOptions) => void) | null) {
  gToastPresenter = presenter;
}

// Visual identity for our logs
const brandStyle = [
  'background: linear-gradient(135deg, #2b6cb0, #3182ce)',
  'color: #fff',
  'padding: 2px 8px',
  'border-radius: 999px 0 0 999px',
  'font-weight: 700',
  'font-family: ui-sans-serif, -apple-system, system-ui, Segoe UI, Roboto',
].join(';');

const levelStyles: Record<'error' | 'warn' | 'info' | 'debug' | 'trace' | 'success', string> = {
  error: [
    'background: #c53030',
    'color: #fff',
    'padding: 2px 8px',
    'border-radius: 0 999px 999px 0',
    'font-weight: 700',
  ].join(';'),
  warn: [
    'background: #b7791f',
    'color: #fff',
    'padding: 2px 8px',
    'border-radius: 0 999px 999px 0',
    'font-weight: 700',
  ].join(';'),
  info: [
    'background: #2c5282',
    'color: #fff',
    'padding: 2px 8px',
    'border-radius: 0 999px 999px 0',
    'font-weight: 700',
  ].join(';'),
  debug: [
    'background: #4a5568',
    'color: #fff',
    'padding: 2px 8px',
    'border-radius: 0 999px 999px 0',
    'font-weight: 700',
  ].join(';'),
  trace: [
    'background: #1a202c',
    'color: #fff',
    'padding: 2px 8px',
    'border-radius: 0 999px 999px 0',
    'font-weight: 700',
  ].join(';'),
  success: [
    'background: #2f855a',
    'color: #fff',
    'padding: 2px 8px',
    'border-radius: 0 999px 999px 0',
    'font-weight: 700',
  ].join(';'),
};

function getStoredLevel(): LogLevel {
  const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || '';
  if (raw && raw in LEVEL_ORDER) return raw as LogLevel;
  return 'debug';
}

function setStoredLevel(level: LogLevel): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, level);
  } catch {}
}

function fmt(level: keyof typeof levelStyles, scope?: string): [string, string, string, string] {
  const scopeText = scope ? `:${scope}` : '';
  return [
    `%c ${BRAND}${scopeText} %c ${level.toUpperCase()} `,
    brandStyle,
    levelStyles[level],
    '',
  ];
}

function shouldLog(current: LogLevel, want: LogLevel): boolean {
  return LEVEL_ORDER[current] >= LEVEL_ORDER[want];
}

export interface CJLogger {
  level(): LogLevel;
  setLevel(level: LogLevel): void;

  // core
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  trace: (...args: unknown[]) => void;
  success: (...args: unknown[]) => void;

  // ui toast (if presenter provided)
  toast: (message: string, opts?: ToastOptions) => void;

  // utilities
  group: (title?: string) => void;
  groupCollapsed: (title?: string) => void;
  groupEnd: () => void;

  time: (label?: string) => void;
  timeEnd: (label?: string) => void;

  table: (tabularData?: any, properties?: readonly string[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  assert: (condition?: boolean, ...data: unknown[]) => void;
  banner: (title: string, subtitle?: string) => void;

  withScope: (scope: string) => CJLogger;
}

function createLogger(scope?: string): CJLogger {
  let currentLevel: LogLevel = getStoredLevel();

  const logAt = (want: LogLevel, method: keyof Console | 'success') =>
    (...args: unknown[]) => {
      if (!shouldLog(currentLevel, want)) return;
      const [fmtStr, brand, lvl, none] = fmt((method === 'success' ? 'success' : (want as any)) as any, scope);
      const c: Console = console;
      switch (method) {
        case 'error':
          c.error(fmtStr, brand, lvl, none, ...args);
          break;
        case 'warn':
          c.warn(fmtStr, brand, lvl, none, ...args);
          break;
        case 'debug':
          c.debug(fmtStr, brand, lvl, none, ...args);
          break;
        case 'trace':
          c.trace(fmtStr, brand, lvl, none, ...args);
          break;
        case 'success':
          c.log(fmtStr, brand, lvl, none, ...args);
          break;
        default:
          c.log(fmtStr, brand, lvl, none, ...args);
      }
    };

  const logger: CJLogger = {
    level: () => currentLevel,
    setLevel: (l: LogLevel) => {
      currentLevel = l;
      setStoredLevel(l);
    },

    error: logAt('error', 'error'),
    warn: logAt('warn', 'warn'),
    info: logAt('info', 'log'),
    debug: logAt('debug', 'debug'),
    trace: logAt('trace', 'trace'),
    success: logAt('info', 'success'),

    toast: (message: string, opts?: ToastOptions) => {
      if (!gToastPresenter) return; // no UI available
      try { gToastPresenter(message, opts); } catch {}
    },

    group: (title?: string) => {
      if (!shouldLog(currentLevel, 'info')) return;
      const [fmtStr, brand, lvl, none] = fmt('info', scope);
      if (title) console.group(fmtStr + ' %c' + title, brand, lvl, none, '');
      else console.group(fmtStr, brand, lvl, none);
    },
    groupCollapsed: (title?: string) => {
      if (!shouldLog(currentLevel, 'info')) return;
      const [fmtStr, brand, lvl, none] = fmt('info', scope);
      if (title) console.groupCollapsed(fmtStr + ' %c' + title, brand, lvl, none, '');
      else console.groupCollapsed(fmtStr, brand, lvl, none);
    },
    groupEnd: () => {
      console.groupEnd();
    },

    time: (label = 'time') => {
      if (!shouldLog(currentLevel, 'debug')) return;
      console.time(`${BRAND}${scope ? ':' + scope : ''}:${label}`);
    },
    timeEnd: (label = 'time') => {
      if (!shouldLog(currentLevel, 'debug')) return;
      console.timeEnd(`${BRAND}${scope ? ':' + scope : ''}:${label}`);
    },

    table: (tabularData?: any, properties?: readonly string[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!shouldLog(currentLevel, 'debug')) return;
      const [fmtStr, brand, lvl, none] = fmt('debug', scope);
      if (typeof console.table === 'function') {
        console.log(fmtStr, brand, lvl, none);
        // @ts-expect-error since console.table types differ by env
        console.table(tabularData, properties);
      } else {
        console.log(fmtStr, brand, lvl, none, tabularData);
      }
    },
    assert: (condition?: boolean, ...data: unknown[]) => {
      if (!shouldLog(currentLevel, 'warn')) return;
      const [fmtStr, brand, lvl, none] = fmt('warn', scope);
      console.assert(condition ?? false, fmtStr, brand, lvl, none, ...data);
    },
    banner: (title: string, subtitle?: string) => {
      if (!shouldLog(currentLevel, 'info')) return;
      const pillLeft = 'background:#2b6cb0;color:white;padding:2px 8px;border-radius:8px 0 0 8px;font-weight:700;';
      const pillRight = 'background:#1a202c;color:#fff;padding:2px 8px;border-radius:0 8px 8px 0;font-weight:600;';
      const txt = `%c ${BRAND} %c ${title}${subtitle ? ' — ' + subtitle : ''}`;
      console.log(txt, pillLeft, pillRight);
    },

    withScope: (child: string) => createLogger(scope ? `${scope}:${child}` : child),
  };

  return logger;
}

// default singleton logger for convenience
const logger = createLogger();
export default logger;
export { createLogger };
