import { extractExamQuestions } from '../extract/exam-parser';
import logger from '../logger';
import { buildQuestionAnswerPrompt } from '../prompt/questions';

export class JsonExtractorPanel {
  readonly el: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private btnScan: HTMLButtonElement;
  private btnCopy: HTMLButtonElement;
  private btnDownload: HTMLButtonElement;
  private btnCopyPrompt: HTMLButtonElement;
  private langSelect: HTMLSelectElement;
  private includeExample: HTMLInputElement;
  private minifyJson: HTMLInputElement;
  private status: HTMLElement;

  constructor() {
    const root = document.createElement('div');
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.height = '100%';
    root.style.gap = '8px';

    const bar = document.createElement('div');
    bar.style.display = 'flex'; bar.style.gap = '8px'; bar.style.alignItems = 'center';
    bar.style.border = '1px solid var(--cjai-border)'; bar.style.borderRadius = '8px'; bar.style.padding = '6px';
    const btnScan = document.createElement('button'); btnScan.className = 'cjai-btn cjai-btn--primary'; btnScan.textContent = 'Scan Page';
    const btnCopy = document.createElement('button'); btnCopy.className = 'cjai-btn'; btnCopy.textContent = 'Copy JSON';
    const btnDownload = document.createElement('button'); btnDownload.className = 'cjai-btn'; btnDownload.textContent = 'Download';
    const btnPrompt = document.createElement('button'); btnPrompt.className = 'cjai-btn'; btnPrompt.textContent = 'Copy Prompt';
    const lang = document.createElement('select'); lang.className = 'cjai-btn';
    const optZh = document.createElement('option'); optZh.value = 'zh'; optZh.textContent = '中文';
    const optEn = document.createElement('option'); optEn.value = 'en'; optEn.textContent = 'English';
    const optBoth = document.createElement('option'); optBoth.value = 'zh-en'; optBoth.textContent = '中英';
    lang.append(optZh, optEn, optBoth); lang.value = 'zh';
    const exLabel = document.createElement('label'); exLabel.style.display = 'inline-flex'; exLabel.style.alignItems = 'center'; exLabel.style.gap = '4px';
    const chkExample = document.createElement('input'); chkExample.type = 'checkbox'; chkExample.checked = true; const exTxt = document.createElement('span'); exTxt.textContent = 'Example'; exLabel.append(chkExample, exTxt);
    const minLabel = document.createElement('label'); minLabel.style.display = 'inline-flex'; minLabel.style.alignItems = 'center'; minLabel.style.gap = '4px';
    const chkMin = document.createElement('input'); chkMin.type = 'checkbox'; chkMin.checked = true; const minTxt = document.createElement('span'); minTxt.textContent = 'Minify'; minLabel.append(chkMin, minTxt);
    const status = document.createElement('div'); status.style.marginLeft = 'auto'; status.style.fontSize = '12px'; status.style.color = 'var(--cjai-ink-muted)';
    bar.append(btnScan, btnCopy, btnDownload, btnPrompt, lang, exLabel, minLabel, status);

    const ta = document.createElement('textarea');
    ta.style.flex = '1'; ta.style.width = '100%'; ta.style.resize = 'none';
    ta.style.border = '1px solid var(--cjai-border)'; ta.style.borderRadius = '8px'; ta.style.padding = '8px';

    root.append(bar, ta);
    this.el = root; this.textarea = ta; this.btnScan = btnScan; this.btnCopy = btnCopy; this.btnDownload = btnDownload; this.btnCopyPrompt = btnPrompt; this.langSelect = lang; this.includeExample = chkExample; this.minifyJson = chkMin; this.status = status;

    this.btnScan.onclick = () => this.scan();
    this.btnCopy.onclick = () => this.copy();
    this.btnDownload.onclick = () => this.download();
    this.btnCopyPrompt.onclick = () => this.copyPrompt();
  }

  private setStatus(msg: string, ok = true) {
    this.status.textContent = msg; this.status.style.color = ok ? 'var(--cjai-ink-muted)' : '#e11d48';
  }

  private update(json: string) {
    this.textarea.value = json;
  }

  scan() {
    try {
      const data = extractExamQuestions();
      if (!data.length) { this.setStatus('No questions found', false); return; }
      const json = JSON.stringify(data, null, 2);
      this.update(json);
      this.setStatus(`Extracted ${data.length} questions`);
    } catch (e) {
      logger.error('Scan failed', e);
      this.setStatus('Scan failed', false);
    }
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.textarea.value);
      this.setStatus('Copied');
    } catch {
      this.setStatus('Copy failed', false);
    }
  }

  download() {
    try {
      const blob = new Blob([this.textarea.value || '[]'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'questions.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      this.setStatus('Downloaded');
    } catch {
      this.setStatus('Download failed', false);
    }
  }

  async copyPrompt() {
    const txt = this.textarea.value.trim();
    if (!txt) { this.setStatus('No JSON', false); return; }
    try {
      const prompt = buildQuestionAnswerPrompt(txt, {
        lang: this.langSelect.value as any,
        includeExample: this.includeExample.checked,
        minifyJson: this.minifyJson.checked,
        extraNotes: [
          '请严格依题目顺序（order 从 1 开始）。',
          '如题目为填空题，按空序填写 answerText 数组。',
        ],
      });
      await navigator.clipboard.writeText(prompt);
      this.setStatus('Prompt copied');
    } catch (e) {
      logger.error('Copy prompt failed', e);
      this.setStatus('Copy prompt failed', false);
    }
  }
}

export default JsonExtractorPanel;
