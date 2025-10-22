// Lightweight cross-origin bridge using window.postMessage
// Works between different origins as long as both sides run a userscript that
// listens/sends messages. Avoids CORS by not touching network. Use when you
// need to coordinate two pages (e.g., changjiang <-> another site).

export type BridgeRole = 'client' | 'host';

export interface BridgeMessage<T = unknown> {
  channel: 'CJAI_BRIDGE_V1';
  type: string; // e.g. 'ping' | 'answer.upload'
  payload?: T;
  // handshake / routing
  nonce?: string;
  from?: string; // origin string of sender
}

export type BridgeHandler = (msg: MessageEvent<BridgeMessage>) => void;

export interface BridgeClient {
  role: 'client';
  target: Window;
  origin: string; // expected targetOrigin for postMessage
  send: (type: string, payload?: unknown) => void;
  on: (type: string, handler: (msg: BridgeMessage) => void) => () => void;
  destroy(): void;
}

export interface BridgeHost {
  role: 'host';
  on: (type: string, handler: (msg: BridgeMessage, reply: (type: string, payload?: unknown) => void) => void) => () => void;
  destroy(): void;
}

const CHANNEL = 'CJAI_BRIDGE_V1';

function isBridgeMessage(e: MessageEvent<any>): e is MessageEvent<BridgeMessage> {
  return !!e && e.data && e.data.channel === CHANNEL && typeof e.data.type === 'string';
}

// Client side: you already have a handle to target window (iframe.contentWindow or popup)
export function createBridgeClient(target: Window, targetOrigin: string): BridgeClient {
  const registry = new Map<string, Set<(m: BridgeMessage) => void>>();
  const listener = (e: MessageEvent<any>) => {
    if (!isBridgeMessage(e)) return;
    const set = registry.get(e.data.type);
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(e.data); } catch {}
    }
  };
  window.addEventListener('message', listener);

  return {
    role: 'client',
    target,
    origin: targetOrigin,
    send: (type: string, payload?: unknown) => {
      target.postMessage({ channel: CHANNEL, type, payload, from: location.origin } satisfies BridgeMessage, targetOrigin);
    },
    on: (type: string, handler: (msg: BridgeMessage) => void) => {
      let set = registry.get(type);
      if (!set) { set = new Set(); registry.set(type, set); }
      set.add(handler);
      return () => { set!.delete(handler); };
    },
    destroy: () => window.removeEventListener('message', listener),
  };
}

// Host side: attach on the page that receives messages (the remote site)
export function createBridgeHost(allowedOrigins: string[]): BridgeHost {
  const registry = new Map<string, Set<(m: BridgeMessage, reply: (type: string, payload?: unknown) => void) => void>>();

  const listener = (e: MessageEvent<any>) => {
    if (!isBridgeMessage(e)) return;
    if (!allowedOrigins.includes('*') && !allowedOrigins.includes(e.origin)) return;
    const set = registry.get(e.data.type);
    const reply = (type: string, payload?: unknown) => {
      e.source && (e.source as Window).postMessage({ channel: CHANNEL, type, payload, from: location.origin } satisfies BridgeMessage, e.origin);
    };
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(e.data, reply); } catch {}
    }
  };
  window.addEventListener('message', listener);

  return {
    role: 'host',
    on: (type: string, handler: (msg: BridgeMessage, reply: (type: string, payload?: unknown) => void) => void) => {
      let set = registry.get(type);
      if (!set) { set = new Set(); registry.set(type, set); }
      set.add(handler);
      return () => { set!.delete(handler); };
    },
    destroy: () => window.removeEventListener('message', listener),
  };
}

// Utilities to open target context
export function openBridgePopup(url: string, name = 'cjai-bridge', features = 'width=480,height=720'): Window | null {
  try { return window.open(url, name, features); } catch { return null; }
}

export function injectBridgeIframe(url: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  return iframe;
}

// Example usage (pseudo):
// const w = openBridgePopup('https://other-site.example.com/bridge');
// if (w) {
//   const client = createBridgeClient(w, 'https://other-site.example.com');
//   client.send('ping');
//   client.on('pong', () => console.log('ok'));
// }
// // On the other site:
// const host = createBridgeHost(['https://your-site.example.com']);
// host.on('ping', (_m, reply) => reply('pong'));

