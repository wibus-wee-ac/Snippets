import logger from '../logger';
import orderNav from '../helper/order-nav.helper';
import { waitForQuestionElement } from '../helper/find-question.helper';
import { captureElementToBlob, ScreenshotOptions, getLastScreenshotError } from '../screenshot';
import { waitUntil, sleep } from '../utils/wait';
import type { CaptureItem } from '../state/capture-store';

export interface CaptureOptions {
  delayAfterNavigateMs?: number; // extra wait after navigation, default 200ms
  filenamePattern?: (order: number, total: number | null) => string; // default: question-###.png
  screenshot?: ScreenshotOptions;
  onCapture?: (item: CaptureItem) => void;
}

export class QuestionCaptureRunner {
  private abort = new AbortController();
  private running = false;

  constructor(private options: CaptureOptions = {}) {}

  stop() {
    if (this.running) {
      this.abort.abort();
      this.abort = new AbortController();
      this.running = false;
      logger.warn('Capture stopped');
    }
  }

  async captureOne(order: number): Promise<boolean> {
    // navigate
    if (!orderNav.goTo(order, { smooth: false })) {
      logger.warn('goTo failed', order);
      return false;
    }
    // wait current becomes active
    const okActive = await waitUntil(() => orderNav.current() === order, { timeoutMs: 8000, intervalMs: 100 });
    if (!okActive) logger.warn('Wait active timed out for order', order);

    // optional small delay for DOM settle
    if (this.options.delayAfterNavigateMs ?? 200) await sleep(this.options.delayAfterNavigateMs ?? 200);

    // wait question element present
    const el = await waitForQuestionElement({ timeoutMs: 12000, intervalMs: 250, signal: this.abort.signal });
    if (!el) {
      logger.error('Question element not found for order', order);
      return false;
    }

    // compose filename
    const total = orderNav.total();
    const filename = this.options.filenamePattern
      ? this.options.filenamePattern(order, total)
      : `question-${String(order).padStart(3, '0')}.png`;

    // ensure visible
    try { el.scrollIntoView({ block: 'nearest', behavior: 'instant' as any }); } catch {}

    // capture to blob only (defer downloading)
    const blob = await captureElementToBlob(el, this.options.screenshot);
    if (!blob) {
      const rect = el.getBoundingClientRect();
      const info = {
        reason: getLastScreenshotError(),
        html2canvas: typeof (window as any).html2canvas,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
        offset: { w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight },
        visibility: getComputedStyle(el).visibility,
        display: getComputedStyle(el).display,
        inDOM: document.contains(el),
      } as const;
      logger.error('Capture failed for order', order, info);
      this.options.onCapture?.({ order, total: total ?? null, filename, blob: null, url: null, status: 'error', createdAt: Date.now(), selected: false, error: JSON.stringify(info) });
      return false;
    }

    const item: CaptureItem = { order, total: total ?? null, filename, blob, url: null, status: 'ok', createdAt: Date.now(), selected: true };
    this.options.onCapture?.(item);
    logger.success('Captured', filename);
    return true;
  }

  async captureAllFromCurrent(): Promise<void> {
    if (this.running) {
      logger.warn('Capture already running');
      return;
    }
    this.running = true;
    try {
      // ensure sidebar ready
      await orderNav.wait({ timeoutMs: 15000, intervalMs: 300, signal: this.abort.signal });
      const total = orderNav.total();
      const start = orderNav.current() ?? 1;
      if (!total || total <= 0) {
        logger.error('Total questions not detected');
        return;
      }
      logger.banner('Capture', `from ${start} to ${total}`);
      for (let i = start; i <= total; i++) {
        if (this.abort.signal.aborted) break;
        const ok = await this.captureOne(i);
        if (!ok) logger.warn('Capture failed at order', i);
      }
      logger.success('Capture finished');
    } finally {
      this.running = false;
    }
  }
}

export default QuestionCaptureRunner;
