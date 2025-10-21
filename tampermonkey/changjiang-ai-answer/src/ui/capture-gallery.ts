import type CaptureStore from '../state/capture-store';
import type { CaptureItem } from '../state/capture-store';
import { downloadAsZip, downloadSequential, downloadToDirectory } from '../screenshot';
import logger from '../logger';

export class CaptureGallery {
  readonly el: HTMLElement;
  private listEl: HTMLElement;

  constructor(private store: CaptureStore) {
    const root = document.createElement('div');
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.height = '100%';
    root.style.gap = '8px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    toolbar.style.alignItems = 'center';

    const btnSelectAll = this.btn('Select All', () => this.store.selectAll(true));
    const btnSelectNone = this.btn('Select None', () => this.store.selectAll(false));
    const btnClear = this.btn('Clear', () => this.store.clear());
    const btnZip = this.btn('Download Zip', () => this.downloadZip());
    const btnDir = this.btn('Save to Folder', () => this.saveToDir());
    const btnSeq = this.btn('Download Files', () => this.downloadSequential());
    toolbar.append(btnSelectAll, btnSelectNone, btnZip, btnDir, btnSeq, btnClear);

    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(160px, 1fr))';
    list.style.gap = '8px';
    list.style.overflow = 'auto';
    list.style.padding = '2px';

    root.append(toolbar, list);
    this.el = root; this.listEl = list;

    this.store.subscribe(() => this.render());
    this.render();
  }

  private btn(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button'); b.textContent = text; b.className = 'cjai-btn'; b.onclick = onClick; return b;
  }

  private card(item: CaptureItem): HTMLElement {
    const card = document.createElement('div');
    card.style.border = '1px solid var(--cjai-border)';
    card.style.borderRadius = '8px';
    card.style.overflow = 'hidden';
    card.style.background = 'var(--cjai-bg)';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '6px';
    card.style.padding = '6px';

    const head = document.createElement('div');
    head.style.display = 'flex'; head.style.alignItems = 'center'; head.style.justifyContent = 'space-between'; head.style.gap = '6px';
    const left = document.createElement('div'); left.style.display = 'flex'; left.style.gap = '6px'; left.style.alignItems = 'center';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = item.selected; cb.onchange = () => this.store.setSelected(item.order, cb.checked);
    const title = document.createElement('div'); title.textContent = `#${item.order}`;
    left.append(cb, title);
    const right = document.createElement('div'); right.style.display = 'flex'; right.style.gap = '6px';
    const btnRetry = this.btn('Retry', () => this.retry(item.order));
    const btnView = this.btn('Open', () => { if (item.url) window.open(item.url, '_blank'); });
    right.append(btnRetry, btnView);
    head.append(left, right);

    const imgWrap = document.createElement('div'); imgWrap.style.aspectRatio = '4/3'; imgWrap.style.overflow = 'hidden'; imgWrap.style.background = 'rgba(0,0,0,0.03)'; imgWrap.style.border = '1px solid var(--cjai-border)'; imgWrap.style.borderRadius = '6px';
    if (item.url) {
      const img = document.createElement('img'); img.src = item.url; img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain';
      imgWrap.appendChild(img);
    } else {
      imgWrap.textContent = item.status === 'pending' ? 'Pending…' : 'No image'; imgWrap.style.display = 'grid'; (imgWrap.style as any).placeItems = 'center';
    }

    const meta = document.createElement('div'); meta.style.fontSize = '12px'; meta.style.color = 'var(--cjai-ink-muted)'; meta.textContent = item.filename;
    card.append(head, imgWrap, meta);
    return card;
  }

  private async retry(order: number) {
    logger.info('Retry capture', order);
    const ev = new CustomEvent('cjai:retry', { detail: { order } });
    window.dispatchEvent(ev);
  }

  private selectedFiles(): Array<{ name: string; blob: Blob }> {
    return this.store.selected().map(x => ({ name: x.filename, blob: x.blob! }));
  }

  private async downloadZip() {
    const files = this.selectedFiles(); if (!files.length) return;
    const ok = await downloadAsZip(files, 'captures.zip');
    if (!ok) logger.warn('Zip not available, try other download method');
  }

  private async saveToDir() {
    const files = this.selectedFiles(); if (!files.length) return;
    const ok = await downloadToDirectory(files);
    if (!ok) logger.warn('Cannot save to directory (unsupported or denied)');
  }

  private async downloadSequential() {
    const files = this.selectedFiles(); if (!files.length) return;
    await downloadSequential(files);
  }

  render() {
    this.listEl.innerHTML = '';
    for (const item of this.store.list()) {
      this.listEl.appendChild(this.card(item));
    }
  }
}

export default CaptureGallery;
