import logger from '../logger';
import { createBridgeClient, createBridgeHost, openBridgePopup, BridgeClient } from './post-message';

const DOUHAO_ORIGIN = 'https://www.doubao.com';
const DOUHAO_URL = 'https://www.doubao.com/';

export function setupDoubaoHostIfMatched() {
  const isDoubao = location.origin.startsWith(DOUHAO_ORIGIN);
  if (!isDoubao) return;
  const allowed = ['https://changjiang.yuketang.cn', 'https://changjiang-exam.yuketang.cn'];
  const host = createBridgeHost(allowed);
  host.on('ping', (msg, reply) => {
    // visible in Doubao console
    // eslint-disable-next-line no-console
    console.log('[CJAI bridge@doubao] ping from', msg.from, 'payload:', msg.payload);
    reply('pong', { ok: true, at: Date.now() });
  });
  // Compose text and optionally attach image + send
  host.on('db.compose', async (msg, reply) => {
    try {
      const payload = (msg.payload || {}) as any;
      const text: string | undefined = payload.text;
      const send: boolean = !!payload.send;
      const fileName: string | undefined = payload.fileName || payload.name;
      const dataUrl: string | undefined = payload.dataUrl || payload.imageDataUrl;
      const blob: Blob | undefined = payload.blob;

      const comp = await findDoubaoComposer(6000);
      if (!comp) { reply('db.result', { ok: false, reason: 'composer-not-found' }); return; }

      if (text && text.length) {
        const ok = setComposerText(comp, text);
        if (!ok) { reply('db.result', { ok: false, reason: 'set-text-failed' }); return; }
      }

      let attached = false;
      if (blob || dataUrl) {
        const f = blob ? blob : await dataUrlToBlob(dataUrl!);
        const file = new File([f!], fileName || `image-${Date.now()}.png`, { type: (f as Blob).type || 'image/png' });
        attached = (await attachImage(comp, file)) || false;
      }

      if (send) {
        // small wait to allow image preview attach
        if (attached) { try { await sleep(900); } catch {} }
        const ok = await trySend(comp);
        reply('db.result', { ok, attached });
        return;
      }
      reply('db.result', { ok: true, attached });
    } catch (e) {
      reply('db.result', { ok: false, reason: String(e) });
    }
  });

  // Attach only
  host.on('db.attachImage', async (msg, reply) => {
    try {
      const payload = (msg.payload || {}) as any;
      const fileName: string = payload.fileName || payload.name || `image-${Date.now()}.png`;
      const dataUrl: string | undefined = payload.dataUrl;
      const blob: Blob | undefined = payload.blob;

      const comp = await findDoubaoComposer(6000);
      if (!comp) { reply('db.result', { ok: false, reason: 'composer-not-found' }); return; }
      const f = blob ? blob : await dataUrlToBlob(dataUrl!);
      const file = new File([f!], fileName, { type: (f as Blob).type || 'image/png' });
      const ok = await attachImage(comp, file);
      reply('db.result', { ok });
    } catch (e) {
      reply('db.result', { ok: false, reason: String(e) });
    }
  });

  // Send only
  host.on('db.send', async (_msg, reply) => {
    try {
      const comp = await findDoubaoComposer(6000);
      if (!comp) { reply('db.result', { ok: false, reason: 'composer-not-found' }); return; }
      const ok = await trySend(comp);
      reply('db.result', { ok });
    } catch (e) {
      reply('db.result', { ok: false, reason: String(e) });
    }
  });

  // Read last AI JSON from the latest message (best-effort DOM extraction; no clipboard dependency)
  host.on('db.getLastJson', async (_msg, reply) => {
    try {
      const text = extractLastJsonFromDoubao();
      if (text) reply('db.lastJson', { ok: true, text });
      else reply('db.lastJson', { ok: false, reason: 'json-not-found' });
    } catch (e) {
      reply('db.lastJson', { ok: false, reason: String(e) });
    }
  });
  logger.info('Doubao host ready for CJ-AI bridge');
}

let gWin: Window | null = null;
let gClient: BridgeClient | null = null;
let gPongUnsub: (() => void) | null = null;

function focusWin() {
  try { gWin && !gWin.closed && gWin.focus(); } catch {}
}

export function connectDoubao(): boolean {
  if (gWin && !gWin.closed && gClient) { focusWin(); return true; }
  const win = openBridgePopup(DOUHAO_URL, 'cjai-doubao', 'width=980,height=720');
  if (!win) { logger.warn('Open Doubao popup failed'); return false; }
  gWin = win;
  gClient = createBridgeClient(win, DOUHAO_ORIGIN);
  if (gPongUnsub) { try { gPongUnsub(); } catch {} gPongUnsub = null; }
  gPongUnsub = gClient.on('pong', (m) => { logger.success('Doubao pong', m.payload); });
  focusWin();
  return true;
}

export function pingDoubao(): void {
  if (!gClient || !gWin || gWin.closed) {
    const ok = connectDoubao();
    if (!ok) return;
  }
  gClient!.send('ping', { ts: Date.now() });
}

export function disconnectDoubao(): void {
  try { if (gPongUnsub) gPongUnsub(); } catch {}
  gPongUnsub = null;
  gClient = null;
  gWin = null;
}

// ===============================
// Client-side helpers (main domain)
// ===============================

export interface DoubaoComposePayload {
  text?: string;
  send?: boolean;
  fileName?: string;
  blob?: Blob;
  dataUrl?: string;
}

export function doubaoCompose(payload: DoubaoComposePayload): boolean {
  if (!gClient || !gWin || gWin.closed) {
    const ok = connectDoubao();
    if (!ok) return false;
  }
  try { gClient!.send('db.compose', payload); return true; } catch { return false; }
}

export function doubaoAttach(blob: Blob, fileName = `image-${Date.now()}.png`): boolean {
  if (!gClient || !gWin || gWin.closed) {
    const ok = connectDoubao();
    if (!ok) return false;
  }
  try { gClient!.send('db.attachImage', { blob, fileName }); return true; } catch { return false; }
}

export function doubaoSend(): boolean {
  if (!gClient || !gWin || gWin.closed) {
    const ok = connectDoubao();
    if (!ok) return false;
  }
  try { gClient!.send('db.send'); return true; } catch { return false; }
}

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  if (!t || (t[0] !== '{' && t[0] !== '[')) return false;
  try { JSON.parse(t); return true; } catch { return false; }
}

export function sendPromptToDoubao(prompt: string, imageBlob?: Blob, fileName = 'question.png'): boolean {
  const isJson = looksLikeJson(prompt);
  if (isJson) return doubaoCompose({ text: prompt, send: true });
  if (imageBlob) return doubaoCompose({ text: prompt, blob: imageBlob, fileName, send: true });
  return doubaoCompose({ text: prompt, send: true });
}

export function pullDoubaoLastJson(timeoutMs = 8000): Promise<{ ok: boolean; text?: string; reason?: string }> {
  if (!gClient || !gWin || gWin.closed) {
    const ok = connectDoubao();
    if (!ok) return Promise.resolve({ ok: false, reason: 'no-bridge' });
  }
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { off(); done = true; resolve({ ok: false, reason: 'timeout' }); } }, timeoutMs);
    const off = gClient!.on('db.lastJson', (m) => {
      if (done) return;
      done = true;
      off();
      clearTimeout(timer);
      const p: any = m.payload || {};
      resolve({ ok: !!p.ok, text: p.text, reason: p.reason });
    });
    try { gClient!.send('db.getLastJson'); } catch { off(); clearTimeout(timer); resolve({ ok: false, reason: 'send-failed' }); }
  });
}

// ===============================
// Host-side DOM helpers (doubao.com)
// ===============================

interface ComposerElements {
  textarea?: HTMLTextAreaElement | null;
  editable?: HTMLElement | null;
  container: HTMLElement;
  sendBtn?: HTMLElement | null;
}

function isElementVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
  // consider off-screen as not visible
  if (rect.width <= 0 || rect.height <= 0) return false;
  return true;
}


async function findDoubaoComposer(timeoutMs = 5000): Promise<ComposerElements | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Prefer visible textarea near bottom
      const areas = Array.from(document.querySelectorAll('textarea')) as HTMLTextAreaElement[];
      const visAreas = areas.filter((a) => isElementVisible(a) && !a.disabled);
      const ranked = visAreas
        .map((a) => ({ a, rect: a.getBoundingClientRect() }))
        .sort((x, y) => y.rect.top - x.rect.top); // closest to bottom first
      let textarea: HTMLTextAreaElement | null = ranked[0]?.a || null;

      let editable: HTMLElement | null = null;
      if (!textarea) {
        const edits = Array.from(document.querySelectorAll('[contenteditable="true"]')) as HTMLElement[];
        const visEdits = edits.filter((e) => isElementVisible(e));
        const rankedE = visEdits
          .map((e) => ({ e, rect: e.getBoundingClientRect() }))
          .sort((x, y) => y.rect.top - x.rect.top);
        editable = rankedE[0]?.e || null;
      }

      const inputEl: HTMLElement | null = (textarea as any) || editable;
      if (inputEl && isElementVisible(inputEl)) {
        const container = findContainer(inputEl);
        const sendBtn = findSendButton(container);
        return { textarea: textarea || null, editable: textarea ? null : editable, container, sendBtn };
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

function findContainer(el: HTMLElement): HTMLElement {
  // ascend a few levels to get a stable container for paste/drop
  let cur: HTMLElement | null = el;
  for (let i = 0; i < 6 && cur?.parentElement; i++) {
    const p = cur.parentElement as HTMLElement;
    cur = p;
  }
  // fallback
  return cur || document.body;
}

function textContentOf(el: Element): string {
  const t = (el.textContent || '').trim();
  return t.replace(/\s+/g, '');
}

function findSendButton(scope: HTMLElement): HTMLElement | null {
  // strategy: any visible enabled button close to the input. Prefer text including '发送' or 'Send'
  const buttons = Array.from(scope.querySelectorAll('button')) as HTMLElement[];
  let best: { score: number; el: HTMLElement } | null = null;
  for (const b of buttons) {
    if (!isElementVisible(b) || (b as HTMLButtonElement).disabled) continue;
    const rect = b.getBoundingClientRect();
    // prefer small buttons near the bottom/right
    const scorePos = rect.top * 0.001 + rect.right * 0.0005;
    const label = textContentOf(b) + ' ' + ((b.getAttribute('aria-label') || '') + (b.getAttribute('title') || ''));
    let scoreLabel = 0;
    if (/发送|Send/i.test(label)) scoreLabel += 10;
    if (/发送/.test(label)) scoreLabel += 5;
    const score = scoreLabel + 1 / (1 + scorePos);
    if (!best || score > best.score) best = { score, el: b };
  }
  return best?.el || null;
}

function setComposerText(comp: ComposerElements, text: string): boolean {
  try {
    if (comp.textarea) {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(comp.textarea, text);
      else comp.textarea.value = text;
      comp.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (comp.editable) {
      comp.editable.focus();
      comp.editable.textContent = text;
      comp.editable.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  } catch { return false; }
}

async function trySend(comp: ComposerElements): Promise<boolean> {
  // prefer Enter on input element (avoid custom click handlers/portals)
  const el = (comp.textarea as HTMLElement) || comp.editable;
  if (el) {
    try {
      const evOpts: any = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      el.dispatchEvent(new KeyboardEvent('keydown', evOpts));
      el.dispatchEvent(new KeyboardEvent('keypress', evOpts));
      el.dispatchEvent(new KeyboardEvent('keyup', evOpts));
      return true;
    } catch {}
  }
  // fallback: clicking send button
  if (comp.sendBtn) {
    try { (comp.sendBtn as HTMLElement).click(); return true; } catch {}
  }
  return false;
}

async function attachImage(comp: ComposerElements, file: File): Promise<boolean> {
  // 1) Try drag & drop into container or input
  const target = comp.container || (comp.textarea as HTMLElement) || comp.editable || document.body;
  try {
    const okDrop = await simulateDrop(target, file);
    if (okDrop) return true;
  } catch {}

  // 2) Try file input if any inside container
  try {
    const input = findImageFileInput(comp.container);
    if (input) {
      const ok = await tryAssignFileToInput(input, file);
      if (ok) {
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  } catch {}

  return false;
}

function findImageFileInput(scope: HTMLElement): HTMLInputElement | null {
  const cand = Array.from(scope.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
  const imgs = cand.filter((i) => {
    const acc = (i.accept || '').toLowerCase();
    return acc.includes('image') || acc.includes('png') || acc.includes('jpg') || acc.includes('jpeg');
  });
  // prefer visible, else first
  const vis = imgs.find((i) => isElementVisible(i));
  return vis || imgs[0] || null;
}

async function simulateDrop(target: HTMLElement, file: File): Promise<boolean> {
  if (!('DataTransfer' in window)) return false;
  try {
    const dt = new DataTransfer();
    dt.items.add(file);
    const common: any = { bubbles: true, cancelable: true, dataTransfer: dt };
    target.dispatchEvent(new DragEvent('dragenter', common));
    target.dispatchEvent(new DragEvent('dragover', common));
    const dropped = target.dispatchEvent(new DragEvent('drop', common));
    return dropped;
  } catch {
    return false;
  }
}

async function tryAssignFileToInput(input: HTMLInputElement, file: File): Promise<boolean> {
  try {
    // Note: HTMLInputElement.files is generally read-only; this may fail on some browsers.
    const dt = new DataTransfer();
    dt.items.add(file);
    // @ts-ignore assigning for best-effort
    input.files = dt.files;
    return input.files?.length ? true : false;
  } catch { return false; }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!m) return fetch(dataUrl).then((r) => r.blob());
  const b64 = m[2];
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: m[1] || 'application/octet-stream' });
}

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

// ========= Doubao message JSON extraction =========

function getVisibleCopyButtons(): HTMLButtonElement[] {
  const btns = Array.from(document.querySelectorAll('button[data-testid="message_action_copy"]')) as HTMLButtonElement[];
  return btns.filter((b) => isElementVisible(b));
}

function findContentRootFromButton(btn: HTMLElement): HTMLElement | null {
  // Ascend to a container that contains pre/code or markdown content
  let cur: HTMLElement | null = btn;
  for (let i = 0; i < 10 && cur; i++) {
    const scope = cur as HTMLElement;
    if (scope.querySelector('pre code, pre, code')) return scope;
    cur = scope.parentElement as HTMLElement | null;
  }
  // fallback to nearest large ancestor
  cur = btn.parentElement as HTMLElement | null;
  for (let i = 0; i < 4 && cur?.parentElement; i++) cur = cur.parentElement as HTMLElement;
  return cur || null;
}

function tryParseAnswerDoc(text: string): any | null {
  const t = text.trim();
  let body = t;
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m) body = m[1];
  if (!(body.startsWith('{') || body.startsWith('['))) return null;
  try {
    const obj = JSON.parse(body);
    if (obj && (Array.isArray(obj.answers) || obj.answers)) return obj;
    return obj; // still return if valid JSON; client will normalize/fail accordingly
  } catch { return null; }
}

function extractJsonFromElement(el: HTMLElement): string | null {
  const candidates: string[] = [];
  const codes = Array.from(el.querySelectorAll('pre code')) as HTMLElement[];
  for (const c of codes) candidates.push(c.textContent || '');
  if (!candidates.length) {
    const pres = Array.from(el.querySelectorAll('pre')) as HTMLElement[];
    for (const p of pres) candidates.push(p.textContent || '');
  }
  if (!candidates.length) {
    const inline = Array.from(el.querySelectorAll('code')) as HTMLElement[];
    for (const c of inline) candidates.push(c.textContent || '');
  }
  for (const text of candidates) {
    const obj = tryParseAnswerDoc(text);
    if (obj) return (typeof obj === 'string') ? obj : JSON.stringify(obj);
  }
  // fallback to entire text with fence detection
  const all = el.textContent || '';
  const obj = tryParseAnswerDoc(all);
  if (obj) return (typeof obj === 'string') ? obj : JSON.stringify(obj);
  return null;
}

function extractLastJsonFromDoubao(): string | null {
  const btns = getVisibleCopyButtons();
  if (!btns.length) return null;
  for (let i = btns.length - 1; i >= 0; i--) {
    const el = btns[i] as HTMLElement;
    const root = findContentRootFromButton(el);
    if (!root) continue;
    const text = extractJsonFromElement(root);
    if (text) return text;
  }
  return null;
}
