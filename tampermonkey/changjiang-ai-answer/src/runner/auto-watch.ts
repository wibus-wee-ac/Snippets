import logger, { type CJLogger } from '../logger';
import { sleep } from '../utils/wait';

export type LessonType = 'shipin' | 'piliang' | 'kejian' | 'ketang' | 'unknown';

export interface LessonItem {
  index: number;
  title: string;
  type: LessonType;
}

export interface YktAutoPlayerOptions {
  rate?: number;
  onStatus?: (s: string) => void;
  log?: CJLogger;
}

/**
 * Minimal auto-watcher for changjiang.yuketang.cn /v2/web course directory.
 * - Supports 视频 shipin, 批量 piliang, 课件 kejian (PPT/视频), 课堂 ketang (iframe media)
 * - Uses progress bar text and media ended as completion criteria
 */
export class YktAutoPlayer {
  private running = false;
  private observer: MutationObserver | null = null;
  private rate = 2;
  private onStatus?: (s: string) => void;
  private log: CJLogger;

  constructor(options: YktAutoPlayerOptions = {}) {
    this.rate = options.rate ?? 2;
    this.onStatus = options.onStatus;
    this.log = options.log || logger.withScope('ykt');
  }

  setRate(rate: number) { this.rate = rate; }

  status(s: string) { try { this.onStatus?.(s); } catch {} }

  stop() {
    this.running = false;
    try { this.observer?.disconnect(); } catch {}
    this.observer = null;
    this.status('Stopped');
    this.log.warn('Stopped');
    this.log.toast('Auto Watch: Stopped', { type: 'warn' });
  }

  async start(indices: number[]) {
    if (!indices?.length) { this.log.warn('No lessons selected'); return; }
    this.running = true; this.status(`Running (${indices.length})`);
    this.log.banner('Start', `${indices.length} items`);
    this.log.toast(`Auto Watch: Start ${indices.length} item(s)`, { type: 'info' });
    for (const idx of indices) {
      if (!this.running) break;
      try { await this.playIndex(idx); } catch (e) { this.log.warn('playIndex error', idx, e); }
    }
    this.stop();
  }

  scanLessons(): LessonItem[] {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.logs-list .content-box section'));
    const seen = new Set<string>();
    const result: LessonItem[] = [];
    let shipinCount = 0; let dupCount = 0;

    const norm = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 200);
    const getHref = (el: Element): string => {
      try {
        const a = el.querySelector<HTMLAnchorElement>('a[href]');
        if (!a) return '';
        const href = a.getAttribute('href') || '';
        // normalize by removing query/hash to improve de-duplication
        const url = href.split('#')[0]!.split('?')[0] || href;
        return url;
      } catch { return ''; }
    };

    sections.forEach((sec, i) => {
      const type = this.detectType(sec);
      if (type !== 'shipin') return; // only video lessons
      shipinCount++;
      const title = norm((sec.querySelector('.title')?.textContent || sec.textContent || ''));
      const href = getHref(sec);
      const key = href ? `href:${href}` : `title:${title}|type:${type}`;
      if (seen.has(key)) { dupCount++; return; } // de-duplicate repeated DOM groups
      seen.add(key);
      result.push({ index: i, title, type });
    });

    this.log.info('scanLessons:', { totalSections: sections.length, shipin: shipinCount, unique: result.length, dups: dupCount });
    this.log.toast(`Scan: sections ${sections.length}, video ${shipinCount}, unique ${result.length}`, { type: 'info' });
    return result;
  }

  private lessonElements(): HTMLElement[] { return Array.from(document.querySelectorAll<HTMLElement>('.logs-list .content-box section')); }
  private getLessonByIndex(index: number): HTMLElement | null { return this.lessonElements()[index] || null; }

  private detectType(section: Element | null): LessonType {
    if (!section) return 'unknown';
    try {
      const use = section.querySelector('use');
      const ref = use?.getAttribute('xlink:href') || '';
      if (ref.includes('shipin')) return 'shipin';
      if (ref.includes('piliang')) return 'piliang';
      if (ref.includes('kejian')) return 'kejian';
      if (ref.includes('ketang')) return 'ketang';
      return 'unknown';
    } catch { return 'unknown'; }
  }

  private observePauseOnce() {
    try {
      const target = document.getElementsByClassName('play-btn-tip')[0];
      if (!target) return;
      this.observer?.disconnect();
      const obs = new MutationObserver(() => {
        const text = (target as HTMLElement).innerText || '';
        if (text.includes('播放')) { const v = document.querySelector('video') as HTMLVideoElement | null; v?.play?.(); this.log.info('auto-resume'); this.log.toast('Auto-resume playback', { type: 'info' }); }
      });
      obs.observe(target, { childList: true });
      this.observer = obs;
    } catch {}
  }

  private applySpeedAndMute() {
    // Try official speed controls first
    try {
      const rate = this.rate;
      const speedwrap = document.getElementsByTagName('xt-speedbutton')[0] as any;
      const speedlist = document.getElementsByTagName('xt-speedlist')[0] as any;
      const speedlistBtn = speedlist?.firstElementChild?.firstElementChild as HTMLElement | null;
      if (speedwrap && speedlist && speedlistBtn) {
        speedlistBtn.setAttribute('data-speed', String(rate));
        speedlistBtn.setAttribute('keyt', rate + '.00');
        speedlistBtn.textContent = rate + '.00X';
        const mousemove = document.createEvent('MouseEvent');
        // @ts-ignore legacy API present in browser
        mousemove.initMouseEvent('mousemove', true, true, window, 0, 10, 10, 10, 10, 0, 0, 0, 0, 0, null);
        speedwrap.dispatchEvent(mousemove);
        speedlistBtn.click();
        this.log.info('speed set', rate);
      }
    } catch {}
    // Fallback: directly set on media elements
    for (const v of Array.from(document.querySelectorAll<HTMLVideoElement>('video'))) { try { v.play(); v.playbackRate = this.rate; v.volume = 0; } catch {} }
    for (const a of Array.from(document.querySelectorAll<HTMLAudioElement>('audio'))) { try { a.play(); a.playbackRate = this.rate; a.volume = 0; } catch {} }
    // Try click mute icon in native controls
    try { (document.querySelector('#video-box > div > xt-wrap > xt-controls > xt-inner > xt-volumebutton > xt-icon') as HTMLElement | null)?.click(); } catch {}
    this.observePauseOnce();
    this.log.toast(`Playback: ${this.rate}x · muted`, { type: 'info' });
  }

  private async waitProgressDone(timeoutMs = 15 * 60 * 1000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs && this.running) {
      try {
        const p = document.querySelector('.progress-wrap .text') as HTMLElement | null;
        const txt = p?.innerText || '';
        if (/(100%|99%|98%|已完成)/.test(txt)) return true;
      } catch {}
      // fallback: check video ended
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v && v.ended) return true;
      await sleep(1000);
    }
    return false;
  }

  private async playIndex(index: number) {
    this.status(`Playing #${index + 1}`);
    const el = this.getLessonByIndex(index);
    if (!el) { this.log.warn('lesson not found', index); return; }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(600);
    const type = this.detectType(el);
    this.log.info('open', index + 1, type);
    this.log.toast(`Open #${index + 1} (${type})`, { type: 'info' });
    (el as HTMLElement).click();
    await sleep(2500);

    if (type === 'shipin') {
      this.applySpeedAndMute();
      const ok = await this.waitProgressDone();
      this.log[ok ? 'success' : 'warn']('video done?', ok);
      this.log.toast(`#${index + 1} ${ok ? 'Completed' : 'Not fully completed (timeout?)'}`, { type: ok ? 'success' : 'warn' });
      history.back();
      await sleep(1500);
      return;
    }

    // Ignore other types on purpose (simplified scope)
    // if (type !== 'shipin') { this.log.debug('skip non-shipin', type); this.log.toast(`Skip #${index + 1} (type: ${type})`, { type: 'warn' }); return; }

    this.log.info('skip unknown type');
  }
}

export default YktAutoPlayer;
