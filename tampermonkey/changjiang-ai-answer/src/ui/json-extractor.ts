import { extractExamQuestions } from '../extract/exam-parser';
import logger from '../logger';

export class JsonExtractorPanel {
  readonly el: HTMLElement;
  private textarea: HTMLTextAreaElement;
  private btnScan: HTMLButtonElement;
  private btnCopy: HTMLButtonElement;
  private btnDownload: HTMLButtonElement;
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
    const btnCopy = document.createElement('button'); btnCopy.className = 'cjai-btn'; btnCopy.textContent = 'Copy';
    const btnDownload = document.createElement('button'); btnDownload.className = 'cjai-btn'; btnDownload.textContent = 'Download';
    const status = document.createElement('div'); status.style.marginLeft = 'auto'; status.style.fontSize = '12px'; status.style.color = 'var(--cjai-ink-muted)';
    bar.append(btnScan, btnCopy, btnDownload, status);

    const ta = document.createElement('textarea');
    ta.style.flex = '1'; ta.style.width = '100%'; ta.style.resize = 'none';
    ta.style.border = '1px solid var(--cjai-border)'; ta.style.borderRadius = '8px'; ta.style.padding = '8px';

    root.append(bar, ta);
    this.el = root; this.textarea = ta; this.btnScan = btnScan; this.btnCopy = btnCopy; this.btnDownload = btnDownload; this.status = status;

    this.btnScan.onclick = () => this.scan();
    this.btnCopy.onclick = () => this.copy();
    this.btnDownload.onclick = () => this.download();
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
}

export default JsonExtractorPanel;

