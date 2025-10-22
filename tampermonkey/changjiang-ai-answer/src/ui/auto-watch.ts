import logger from '../logger';
import YktAutoPlayer, { type LessonItem } from '../runner/auto-watch';

// 课节状态（基于 title 关键词识别）
enum LessonStatus {
  Completed = '已完成',
  NotCompleted = '未完成',
  InProgress = '进行中',
}

function detectStatusByTitle(title: string): LessonStatus | null {
  if (!title) return null;
  if (title.includes(LessonStatus.Completed)) return LessonStatus.Completed;
  if (title.includes(LessonStatus.NotCompleted)) return LessonStatus.NotCompleted;
  if (title.includes(LessonStatus.InProgress)) return LessonStatus.InProgress;
  return null;
}

class AutoWatchPanel {
  el: HTMLElement;
  private statusEl: HTMLElement;
  private listWrap: HTMLElement;
  private rateSel: HTMLSelectElement;
  // private filterSel!: HTMLSelectElement;
  private filterMode: 'all' | 'incomplete' | 'completed' = 'all';
  private selected = new Set<number>();
  private lessons: LessonItem[] = [];
  private player = new YktAutoPlayer({
    onStatus: (s) => this.setStatus(s),
    rate: 2,
  });

  constructor() {
    const wrap = document.createElement('div');
    wrap.className = 'cjai-section';

    const title = document.createElement('div'); title.className = 'cjai-section__title'; title.textContent = 'YukeTang Auto Watch';
    const desc = document.createElement('div'); desc.className = 'cjai-section__description';
    desc.textContent = '选择需要自动播放的课节，仅支持当前课程页（/v2/web）。';

    const controls = document.createElement('div'); controls.style.display = 'flex'; controls.style.gap = '8px'; controls.style.flexWrap = 'wrap'; controls.style.alignItems = 'center';
    const rateSel = document.createElement('select'); rateSel.className = 'cjai-btn';
    for (const r of [1, 1.25, 1.5, 2, 3, 5, 10]) { const o = document.createElement('option'); o.value = String(r); o.textContent = `${r}x`; if (r === 2) o.selected = true; rateSel.appendChild(o); }
    const btnScan = document.createElement('button'); btnScan.className = 'cjai-btn'; btnScan.textContent = 'Scan Lessons';
    const btnSelectIncomplete = document.createElement('button'); btnSelectIncomplete.className = 'cjai-btn'; btnSelectIncomplete.textContent = 'Select Incomplete';
    const btnAll = document.createElement('button'); btnAll.className = 'cjai-btn'; btnAll.textContent = 'Select All';
    const btnNone = document.createElement('button'); btnNone.className = 'cjai-btn'; btnNone.textContent = 'Select None';
    const btnStart = document.createElement('button'); btnStart.className = 'cjai-btn cjai-btn--primary'; btnStart.textContent = 'Start Selected';
    const btnStop = document.createElement('button'); btnStop.className = 'cjai-btn cjai-btn--danger'; btnStop.textContent = 'Stop';
    const statusEl = document.createElement('div'); statusEl.style.marginLeft = 'auto'; statusEl.style.fontSize = '12px'; statusEl.style.color = 'var(--cjai-ink-muted)';

    // 状态过滤选择器
    const filterSel = document.createElement('select'); filterSel.className = 'cjai-btn';
    const opts: Array<[string, 'all' | 'incomplete' | 'completed']> = [
      ['All', 'all'],
      ['Incomplete', 'incomplete'],
      ['Completed', 'completed'],
    ];
    for (const [labelText, value] of opts) { const o = document.createElement('option'); o.value = value; o.textContent = labelText; filterSel.appendChild(o); }

    controls.append(rateSel, btnScan, filterSel, btnAll, btnNone, btnSelectIncomplete, btnStart, btnStop, statusEl);

    const listWrap = document.createElement('div'); listWrap.style.marginTop = '8px'; listWrap.style.overflow = 'auto'; listWrap.style.border = '1px dashed var(--cjai-border)'; listWrap.style.borderRadius = '8px'; listWrap.style.padding = '6px'; listWrap.style.background = 'var(--cjai-bg)';

    wrap.append(title, desc, controls, listWrap);

    // events
    rateSel.addEventListener('change', () => { this.player.setRate(Number(rateSel.value)); logger.info('YKT: rate ->', rateSel.value); logger.toast(`YKT: rate -> ${rateSel.value}x`, { type: 'info' }); });
    filterSel.addEventListener('change', () => {
      this.filterMode = filterSel.value as any;
      const modeText = this.filterMode === 'incomplete' ? 'Incomplete' : this.filterMode === 'completed' ? 'Completed' : 'All';
      this.renderList();
      logger.toast(`YKT: filter -> ${modeText}`, { type: 'info' });
    });
    btnScan.addEventListener('click', () => this.scan());
    btnSelectIncomplete.addEventListener('click', () => {
      this.selected.clear();
      for (const it of this.lessons) { const s = detectStatusByTitle(it.title); if (s === LessonStatus.NotCompleted || s === LessonStatus.InProgress) this.selected.add(it.index); }
      this.renderList();
      logger.toast(`YKT: selected ${this.selected.size} incomplete`, { type: 'info' });
    });
    btnAll.addEventListener('click', () => { this.selected.clear(); for (const it of this.lessons) this.selected.add(it.index); this.renderList(); logger.toast(`YKT: selected all ${this.selected.size}`, { type: 'info' }); });
    btnNone.addEventListener('click', () => { this.selected.clear(); this.renderList(); logger.toast('YKT: selected none', { type: 'info' }); });
    btnStart.addEventListener('click', async () => { const list = Array.from(this.selected.values()).sort((a, b) => a - b); logger.toast(`YKT: start ${list.length} @ ${this.rateSel.value}x`, { type: 'info' }); await this.player.start(list); });
    btnStop.addEventListener('click', () => { logger.toast('YKT: stop requested', { type: 'warn' }); this.player.stop(); });

    // expose console helpers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g: any = (window as any).CJAI || ((window as any).CJAI = {});
    g.ykt = {
      scan: () => { this.scan(); return this.lessons.map((x) => ({ index: x.index, type: x.type, title: x.title })); },
      start: (indexes: number[], rate?: number) => { if (rate != null) this.player.setRate(rate); return this.player.start(indexes); },
      stop: () => this.player.stop(),
    };

    this.el = wrap; this.statusEl = statusEl; this.listWrap = listWrap; this.rateSel = rateSel; 
    // this.filterSel = filterSel;
  }

  private setStatus(s: string) { this.statusEl.textContent = s; }

  private renderList() {
    this.listWrap.innerHTML = '';
    if (!this.lessons.length) {
      const d = document.createElement('div');
      d.style.fontSize = '12px'; d.style.color = 'var(--cjai-ink-muted)'; d.textContent = '未发现课节，请在课程目录页（/v2/web）点击 Scan Lessons。';
      this.listWrap.appendChild(d); this.setStatus(''); return;
    }
    for (const it of this.lessons) {
      const status = detectStatusByTitle(it.title);
      if (this.filterMode === 'incomplete' && status === LessonStatus.Completed) continue;
      if (this.filterMode === 'completed' && status !== LessonStatus.Completed) continue;
      const row = document.createElement('div'); row.className = 'cjai-row cjai-row--clickable';
      const label = document.createElement('label'); label.className = 'cjai-check';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = this.selected.has(it.index);
      const text = document.createElement('span'); text.textContent = `#${it.index + 1} · ${it.title}`;

      // 状态识别徽标
      if (status) {
        const badge = document.createElement('span');
        badge.textContent = ` ${status}`;
        badge.style.marginLeft = '6px';
        badge.style.padding = '0 6px';
        badge.style.borderRadius = '10px';
        badge.style.fontSize = '12px';
        badge.style.lineHeight = '18px';
        badge.style.border = '1px solid var(--cjai-border)';
        badge.style.background = 'var(--cjai-bg)';
        // 轻微的语义色彩（尽量与现有主题变量靠拢）
        if (status === LessonStatus.Completed) badge.style.color = 'var(--cjai-ink-muted)';
        if (status === LessonStatus.NotCompleted) badge.style.color = 'var(--cjai-danger, #d84a4a)';
        if (status === LessonStatus.InProgress) badge.style.color = 'var(--cjai-warning, #d89614)';
        text.appendChild(badge);
      }
      // 已完成的灰色显示
      if (status === LessonStatus.Completed) {
        row.style.opacity = '0.65';
        text.style.color = 'var(--cjai-ink-muted)';
      }
      row.dataset.selected = String(cb.checked);
      cb.addEventListener('change', () => {
        if (cb.checked) this.selected.add(it.index); else this.selected.delete(it.index);
        row.dataset.selected = String(cb.checked);
        this.setStatus(`${this.selected.size} selected`);
      });
      row.addEventListener('click', (ev) => { if ((ev.target as HTMLElement).tagName.toLowerCase() === 'input') return; cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });
      label.append(cb, text);
      row.append(label);
      this.listWrap.appendChild(row);
    }
    this.setStatus(`${this.selected.size} selected`);
  }

  private scan() {
    try {
      this.lessons = this.player.scanLessons();
      this.selected.clear();
      // 扫描后自动勾选“未完成/进行中”，忽略“已完成”
      for (const it of this.lessons) {
        const s = detectStatusByTitle(it.title);
        if (s === LessonStatus.NotCompleted || s === LessonStatus.InProgress) this.selected.add(it.index);
      }
      this.renderList();
      logger.toast(`YKT: scanned (shipin only) ${this.lessons.length}`, { type: 'success' });
      logger.toast(`YKT: auto-selected ${this.selected.size} (未完成/进行中)`, { type: 'info' });
      logger.success('YKT: scanned (shipin only)', this.lessons.length);
    } catch (e) {
      logger.error('YKT: scan failed', e);
      logger.toast('YKT: scan failed (see console)', { type: 'error' });
    }
  }
}

export default AutoWatchPanel;
