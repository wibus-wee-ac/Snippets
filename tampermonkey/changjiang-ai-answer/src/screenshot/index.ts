import logger from '../logger';

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: any) => Promise<HTMLCanvasElement>;
  }
}

export interface ScreenshotOptions {
  scale?: number; // default devicePixelRatio
  backgroundColor?: string | null; // default '#fff'
}

export async function ensureHtml2Canvas(): Promise<boolean> {
  if (typeof window !== 'undefined' && typeof window.html2canvas === 'function') return true;
  // dynamic load from CDN once
  const id = 'cj-ai-html2canvas';
  if (document.getElementById(id)) {
    // already injected, wait a bit for it to be ready
    for (let i = 0; i < 20; i++) {
      if (typeof window.html2canvas === 'function') return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return typeof window.html2canvas === 'function';
  }
  const script = document.createElement('script');
  script.id = id;
  script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  script.async = true;
  const p = new Promise<boolean>((resolve) => {
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
  });
  document.head.appendChild(script);
  const ok = await p;
  if (!ok) logger.warn('Failed to load html2canvas from CDN');
  return ok;
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
declare global {
  interface Window { JSZip?: any }
}

async function ensureJSZip(): Promise<boolean> {
  if (window.JSZip) return true;
  const id = 'cjai-jszip';
  if (!document.getElementById(id)) {
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
    s.async = true;
    document.head.appendChild(s);
  }
  for (let i = 0; i < 50; i++) {
    if (window.JSZip) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!window.JSZip;
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
