export type CaptureStatus = 'ok' | 'error' | 'pending';

export interface CaptureItem {
  order: number;
  total: number | null;
  filename: string;
  blob: Blob | null;
  url: string | null;
  status: CaptureStatus;
  createdAt: number;
  selected: boolean;
  error?: string;
}

type Listener = () => void;

export class CaptureStore {
  private items: CaptureItem[] = [];
  private listeners: Set<Listener> = new Set();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { for (const fn of this.listeners) try { fn(); } catch {} }

  clear() {
    for (const it of this.items) { if (it.url) URL.revokeObjectURL(it.url); }
    this.items = [];
    this.emit();
  }

  list(): CaptureItem[] { return this.items.slice().sort((a,b) => a.order - b.order); }

  get(order: number): CaptureItem | undefined { return this.items.find(x => x.order === order); }

  upsert(partial: Partial<CaptureItem> & { order: number; filename?: string; }) {
    const idx = this.items.findIndex(x => x.order === partial.order);
    const base: CaptureItem = idx >= 0 ? this.items[idx] : {
      order: partial.order,
      total: partial.total ?? null,
      filename: partial.filename || `question-${String(partial.order).padStart(3,'0')}.png`,
      blob: null,
      url: null,
      status: partial.status ?? 'pending',
      createdAt: Date.now(),
      selected: true,
      error: undefined,
    };
    const merged: CaptureItem = { ...base, ...partial } as CaptureItem;
    // refresh url if blob changed
    if (merged.blob && merged.blob !== base.blob) {
      if (base.url) URL.revokeObjectURL(base.url);
      merged.url = URL.createObjectURL(merged.blob);
    }
    if (idx >= 0) this.items[idx] = merged; else this.items.push(merged);
    this.emit();
  }

  setSelected(order: number, v: boolean) { const it = this.get(order); if (!it) return; it.selected = v; this.emit(); }
  selectAll(v: boolean) { for (const it of this.items) it.selected = v; this.emit(); }
  toggle(order: number) { const it = this.get(order); if (!it) return; it.selected = !it.selected; this.emit(); }

  selected(): CaptureItem[] { return this.list().filter(x => x.selected && x.status === 'ok' && x.blob); }
}

export default CaptureStore;

