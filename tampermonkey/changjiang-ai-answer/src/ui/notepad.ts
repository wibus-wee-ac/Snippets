import AnswersStore, { normalizeAnswers } from '../state/answers-store';
import { buildAnswerPrompt, PromptOptions } from '../prompt/template';
import logger from '../logger';

export class Notepad {
  readonly el: HTMLElement;
  private input: HTMLTextAreaElement;
  private btnParse: HTMLButtonElement;
  private btnPrompt: HTMLButtonElement;
  private langSelect: HTMLSelectElement;
  private includeExample: HTMLInputElement;
  private list: HTMLElement;
  private status: HTMLElement;
  private btnToggleInput: HTMLButtonElement;
  private inputWrap: HTMLElement;
  private collapsed = false;
  private highlightedOrder: number | null = null;

  constructor(private store: AnswersStore) {
    const root = document.createElement('div');
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.height = '100%';
    root.style.gap = '8px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    toolbar.style.alignItems = 'center';
    toolbar.style.border = '1px solid var(--cjai-border)';
    toolbar.style.borderRadius = '8px';
    toolbar.style.padding = '6px';
    const btnPrompt = document.createElement('button'); btnPrompt.className = 'cjai-btn cjai-btn--primary'; btnPrompt.textContent = 'Copy Prompt';
    const btnParse = document.createElement('button'); btnParse.className = 'cjai-btn'; btnParse.textContent = 'Parse JSON';
    // const btnExample = document.createElement('button'); btnExample.className = 'cjai-btn'; btnExample.textContent = 'Copy Example';
    // const btnCopy = document.createElement('button'); btnCopy.className = 'cjai-btn'; btnCopy.textContent = 'Copy Current';
    const lang = document.createElement('select');
    lang.className = 'cjai-btn';
    const optZh = document.createElement('option'); optZh.value = 'zh'; optZh.textContent = '中文';
    const optEn = document.createElement('option'); optEn.value = 'en'; optEn.textContent = 'English';
    const optBoth = document.createElement('option'); optBoth.value = 'zh-en'; optBoth.textContent = '中英';
    lang.append(optZh, optEn, optBoth); lang.value = 'zh';
    const chk = document.createElement('label'); chk.style.display = 'inline-flex'; chk.style.alignItems = 'center'; chk.style.gap = '4px';
    const includeExample = document.createElement('input'); includeExample.type = 'checkbox'; includeExample.checked = true; const chkText = document.createElement('span'); chkText.textContent = 'Example';
    chk.append(includeExample, chkText);
    const status = document.createElement('div'); status.style.marginLeft = 'auto'; status.style.fontSize = '12px'; status.style.color = 'var(--cjai-ink-muted)';
    const btnToggle = document.createElement('button'); btnToggle.className = 'cjai-btn'; btnToggle.textContent = 'Hide Input';
    toolbar.append(btnPrompt, lang, chk, btnParse, btnToggle, status);

    const inputWrap = document.createElement('div');
    inputWrap.style.display = 'block';
    const area = document.createElement('textarea');
    area.placeholder = '粘贴答题器输出的 JSON（见示例格式）';
    area.style.width = '100%'; area.style.height = '120px';
    area.style.border = '1px solid var(--cjai-border)';
    area.style.borderRadius = '8px'; area.style.padding = '8px';
    area.spellcheck = false;
    inputWrap.appendChild(area);

    const list = document.createElement('div');
    list.style.flex = '1'; list.style.overflow = 'auto';
    list.style.border = '1px solid var(--cjai-border)';
    list.style.borderRadius = '8px'; list.style.padding = '8px';

    root.append(toolbar, inputWrap, list);
    this.el = root; this.input = area; this.btnParse = btnParse; this.btnPrompt = btnPrompt; this.langSelect = lang; this.includeExample = includeExample; this.list = list; this.status = status; this.btnToggleInput = btnToggle; this.inputWrap = inputWrap;

    this.btnParse.onclick = () => this.parse();
    this.btnPrompt.onclick = () => this.copyPrompt();

    this.btnToggleInput.onclick = () => this.setInputCollapsed(!this.collapsed);
    this.store.subscribe(() => this.render());
    this.render();
  }

  private setStatus(msg: string, ok = true) {
    this.status.textContent = msg;
    this.status.style.color = ok ? 'var(--cjai-ink-muted)' : '#e11d48';
  }

  private async copy(text: string) {
    try { await navigator.clipboard.writeText(text); this.setStatus('Copied'); } catch { this.setStatus('Copy failed', false); }
  }

  private async copyPrompt() {
    const opts: PromptOptions = {
      lang: (this.langSelect.value as any) ?? 'zh',
      includeExample: this.includeExample.checked,
    };
    const text = buildAnswerPrompt(opts);
    await this.copy(text);
  }

  setInputCollapsed(v: boolean) {
    this.collapsed = v;
    this.inputWrap.style.display = v ? 'none' : 'block';
    this.btnToggleInput.textContent = v ? 'Show Input' : 'Hide Input';
  }

  setCurrentOrder(order: number | null) {
    this.highlightedOrder = order ?? null;
    // update highlight
    for (const el of Array.from(this.list.querySelectorAll<HTMLElement>('[data-order]'))) {
      const o = Number(el.dataset.order);
      el.style.background = this.highlightedOrder === o ? 'rgba(17, 17, 17, 0.06)' : 'transparent';
      el.style.borderRadius = '6px';
    }
    if (order != null) this.scrollToOrder(order);
  }

  scrollToOrder(order: number) {
    const row = this.list.querySelector<HTMLElement>(`[data-order="${order}"]`);
    if (!row) return;
    // Ensure in view inside list container
    const parent = this.list;
    const pr = parent.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    if (rr.top < pr.top || rr.bottom > pr.bottom) {
      row.scrollIntoView({ block: 'center' });
    }
  }

  

  private badge(text: string) {
    const span = document.createElement('span');
    span.textContent = text; span.style.fontSize = '11px'; span.style.border = '1px solid var(--cjai-border)';
    span.style.padding = '2px 6px'; span.style.borderRadius = '999px'; span.style.marginLeft = '6px';
    span.style.color = 'var(--cjai-ink-muted)';
    return span;
  }

  render() {
    this.list.innerHTML = '';
    const data = this.store.list();
    if (!data.length) { const p = document.createElement('div'); p.textContent = '暂无答案，请粘贴 JSON 并解析'; this.list.appendChild(p); return; }
    for (const a of data) {
      const row = document.createElement('div'); row.style.display = 'flex'; row.style.flexDirection = 'column'; row.style.gap = '4px'; row.style.padding = '8px 6px'; row.style.borderBottom = '1px dashed var(--cjai-border)';
      row.dataset.order = String(a.order);
      const head = document.createElement('div'); head.style.display = 'flex'; head.style.alignItems = 'center'; head.style.gap = '6px';
      const title = document.createElement('div'); title.textContent = `#${a.order}`; title.style.fontWeight = '600';
      const type = this.badge(a.type);
      if (a.confidence != null) head.append(title, type, this.badge(`${Math.round(a.confidence * 100)}%`)); else head.append(title, type);
      const ans = document.createElement('div'); ans.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      if (a.choices.length) ans.textContent = `Choice: ${a.choices.join(', ')}`;
      else if (a.text.length) ans.textContent = `Text: ${a.text.join(' | ')}`;
      else ans.textContent = '(empty)';
      const explain = document.createElement('div'); explain.style.whiteSpace = 'pre-wrap'; explain.style.color = 'var(--cjai-ink-muted)'; explain.textContent = a.explanation || '';
      row.append(head, ans, explain);
      this.list.appendChild(row);
    }
    // re-apply highlight if any
    if (this.highlightedOrder != null) this.setCurrentOrder(this.highlightedOrder);
  }

  // After successful parse, auto-collapse the input area
  private afterParseSuccess(count: number) {
    this.setStatus(`Parsed ${count} answers`);
    this.setInputCollapsed(true);
  }

  // Override parse to collapse on success
  private parse() {
    const raw = this.input.value.trim();
    if (!raw) { this.setStatus('No input'); return; }
    try {
      const items = normalizeAnswers(raw);
      this.store.setAll(items);
      this.afterParseSuccess(items.length);
    } catch (e) {
      logger.error('Parse notepad JSON failed', e);
      this.setStatus('JSON parse error', false);
    }
  }
}

export default Notepad;
