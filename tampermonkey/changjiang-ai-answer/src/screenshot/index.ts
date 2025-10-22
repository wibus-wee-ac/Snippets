import logger from '../logger';

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const unsafeWindow: any;

export interface ScreenshotOptions {
  scale?: number; // default devicePixelRatio
  backgroundColor?: string | null; // default '#fff'
}

let lastScreenshotError: unknown = null;
export function getLastScreenshotError(): unknown {
  return lastScreenshotError;
}

function loadScriptOnce(id: string, src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const exist = document.getElementById(id) as HTMLScriptElement | null;
    if (exist) { resolve(true); return; }
    const s = document.createElement('script');
    s.id = id; s.src = src; s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export async function ensureHtml2Canvas(): Promise<boolean> {
  const g: any = (globalThis as any);
  if (typeof (window as any).html2canvas === 'function') return true;
  if (g && typeof g.html2canvas === 'function') { (window as any).html2canvas = g.html2canvas; return true; }
  if (typeof unsafeWindow !== 'undefined' && typeof unsafeWindow.html2canvas === 'function') { (window as any).html2canvas = unsafeWindow.html2canvas; return true; }

  // runtime inject fallback
  const ok = await loadScriptOnce('cjai-html2canvas', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
  if (!ok) logger.warn('Failed to inject html2canvas from CDN');
  for (let i = 0; i < 50; i++) {
    if (typeof (window as any).html2canvas === 'function') return true;
    if (g && typeof g.html2canvas === 'function') { (window as any).html2canvas = g.html2canvas; return true; }
    if (typeof unsafeWindow !== 'undefined' && typeof unsafeWindow.html2canvas === 'function') { (window as any).html2canvas = unsafeWindow.html2canvas; return true; }
    await new Promise((r) => setTimeout(r, 100));
  }
  logger.warn('html2canvas is not available');
  return false;
}

export async function captureElementToCanvas(el: HTMLElement, opts: ScreenshotOptions = {}): Promise<HTMLCanvasElement | null> {
  const ok = await ensureHtml2Canvas();
  if (!ok || !window.html2canvas) return null;
  const scale = opts.scale ?? (window.devicePixelRatio || 1);
  const backgroundColor = opts.backgroundColor ?? '#fff';
  try {
    const canvas = await window.html2canvas(el, {
      backgroundColor,
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
    return canvas;
  } catch (e) {
    lastScreenshotError = e;
    logger.error('captureElementToCanvas failed', e);
    return null;
  }
}

export async function captureElementToBlob(el: HTMLElement, opts: ScreenshotOptions = {}): Promise<Blob | null> {
  const canvas = await captureElementToCanvas(el, opts);
  if (!canvas) return null;
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export async function saveElementAsPng(el: HTMLElement, filename: string, opts: ScreenshotOptions = {}): Promise<boolean> {
  const blob = await captureElementToBlob(el, opts);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

// Optional ZIP support via JSZip CDN
declare global { interface Window { JSZip?: any } }

async function ensureJSZip(): Promise<boolean> {
  const g: any = (globalThis as any);
  if ((window as any).JSZip) return true;
  if (g && g.JSZip) { (window as any).JSZip = g.JSZip; return true; }
  if (typeof unsafeWindow !== 'undefined' && unsafeWindow.JSZip) { (window as any).JSZip = unsafeWindow.JSZip; return true; }
  const ok = await loadScriptOnce('cjai-jszip', 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  if (!ok) logger.warn('Failed to inject JSZip from CDN');
  for (let i = 0; i < 50; i++) {
    if ((window as any).JSZip) return true;
    if (g && g.JSZip) { (window as any).JSZip = g.JSZip; return true; }
    if (typeof unsafeWindow !== 'undefined' && unsafeWindow.JSZip) { (window as any).JSZip = unsafeWindow.JSZip; return true; }
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!(window as any).JSZip;
}

export async function downloadAsZip(files: Array<{ name: string; blob: Blob }>, zipName = 'captures.zip'): Promise<boolean> {
  const ok = await ensureJSZip();
  if (!ok || !window.JSZip) return false;
  const zip = new window.JSZip();
  for (const f of files) zip.file(f.name, f.blob);
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  }
}

export async function downloadSequential(files: Array<{ name: string; blob: Blob }>, delayMs = 150): Promise<void> {
  for (const f of files) {
    const url = URL.createObjectURL(f.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
}

export async function downloadToDirectory(files: Array<{ name: string; blob: Blob }>): Promise<boolean> {
  // File System Access API (Chromium, secure contexts)
  const anyWin = window as any;
  if (!('showDirectoryPicker' in anyWin)) return false;
  try {
    // @ts-ignore
    const dir = await (window as any).showDirectoryPicker();
    for (const f of files) {
      const handle = await dir.getFileHandle(f.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(f.blob);
      await writable.close();
    }
    return true;
  } catch {
    return false;
  }
}
