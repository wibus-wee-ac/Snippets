/*
  Reusable Action Panel (Vercel-like)
  - Draggable, resizable, minimizable (collapsed) and always draggable
  - Info section + action buttons
  - Self-contained styles with CSS variables
*/

type Unsubscribe = () => void;

export interface ActionPanelAction {
  id: string;
  label: string;
  tooltip?: string;
  hotkey?: string;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  // Trigger type: default click; when set to 'dblclick', user must double-click to invoke
  trigger?: 'click' | 'dblclick';
  onClick: (panel: ActionPanel) => void | Promise<void>;
}

export interface ActionPanelInfoItem {
  key: string;
  label: string;
  value: string | number | HTMLElement;
  tooltip?: string;
}

export interface ActionPanelOptions {
  id?: string; // used for storage key
  title?: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  dock?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  resizable?: boolean;
  draggable?: boolean;
  collapsed?: boolean;
  zIndex?: number;
  mount?: HTMLElement; // parent to append
  injectStyles?: boolean; // default true
}

interface PersistedState {
  x: number;
  y: number;
  w: number;
  h: number;
  collapsed: boolean;
}

const DEFAULTS: Required<Omit<ActionPanelOptions, 'position' | 'size' | 'mount'>> = {
  id: 'cjai-action-panel',
  title: 'Action Panel',
  dock: 'bottom-right',
  resizable: true,
  draggable: true,
  collapsed: false,
  zIndex: 999999,
  injectStyles: true,
};

const STYLE_ID = 'cjai-action-panel-style';

function ensureStyles() {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
  
  `;
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function storageKey(id: string) { return `${id}:state`; }

export class ActionPanel {
  private root: HTMLElement;
  private header: HTMLElement;
  private titleEl: HTMLElement;
  private tabsBar: HTMLElement;
  private contentWrap: HTMLElement;
  private contentEl: HTMLElement;
  private actionsEl: HTMLElement;
  private resizeHandle: HTMLElement;
  private opts: Required<ActionPanelOptions>;
  private unsub: Unsubscribe[] = [];
  private dragging = false; private dragOffset = { x: 0, y: 0 };
  private resizing = false; private resizeStart = { w: 0, h: 0, x: 0, y: 0 };
  private panes: Map<string, HTMLElement> = new Map();
  private toastHost!: HTMLElement;

  constructor(options: ActionPanelOptions = {}) {
    const o = { ...DEFAULTS, ...options } as Required<ActionPanelOptions>;
    this.opts = o;
    if (o.injectStyles) ensureStyles();

    // build DOM
    const root = document.createElement('div');
    root.className = 'cjai-panel';
    root.style.zIndex = String(o.zIndex);
    root.style.position = 'fixed';

    const header = document.createElement('div');
    header.className = 'cjai-panel__header';
    const titleEl = document.createElement('div');
    titleEl.className = 'cjai-panel__title';
    titleEl.textContent = o.title || 'Action Panel';
    const controls = document.createElement('div');
    controls.className = 'cjai-panel__controls';
    const btnCollapse = document.createElement('button');
    btnCollapse.className = 'cjai-btn';
    btnCollapse.title = 'Collapse / Expand';
    btnCollapse.textContent = '—';
    const btnClose = document.createElement('button');
    btnClose.className = 'cjai-btn';
    btnClose.title = 'Close';
    btnClose.textContent = '×';
    controls.append(btnCollapse, btnClose);
    header.append(titleEl, controls);

    const body = document.createElement('div');
    body.className = 'cjai-panel__body';
    const tabs = document.createElement('div');
    tabs.className = 'cjai-tabs';
    const content = document.createElement('div');
    content.className = 'cjai-panel__content';
    const controlsPane = document.createElement('div');
    controlsPane.className = 'cjai-tabpane cjai-controls';
    controlsPane.dataset.active = 'true';
    const contentArea = document.createElement('div');
    contentArea.className = 'cjai-controls__content';
    const actions = document.createElement('div');
    actions.className = 'cjai-controls__actions';
    controlsPane.append(contentArea, actions);
    content.append(controlsPane);
    body.append(tabs, content);

    const resize = document.createElement('div');
    resize.className = 'cjai-resize';

    // toast host overlay
    const toastHost = document.createElement('div');
    toastHost.className = 'cjai-toast-host';

    root.append(header, body, resize, toastHost);

    this.root = root; this.header = header; this.titleEl = titleEl;
    this.tabsBar = tabs; this.contentWrap = content;
    this.contentEl = contentArea; this.actionsEl = actions; this.resizeHandle = resize; this.toastHost = toastHost;

    // initialize tabs with default 'controls'
    this.addTab({ id: 'controls', label: 'Controls', content: controlsPane, select: true });

    // interactions
    if (o.draggable) this.enableDragging();
    if (o.resizable) this.enableResizing();
    btnCollapse.addEventListener('click', () => this.setCollapsed(!this.isCollapsed()));
    btnClose.addEventListener('click', () => this.destroy());

    // init position/size from storage or opts
    this.restoreState();
    if (options.position) this.setPosition(options.position.x, options.position.y);
    if (options.size) this.setSize(options.size.width, options.size.height);
    if (options.collapsed != null) this.setCollapsed(!!options.collapsed);

    (o.mount || document.body).appendChild(root);
  }

  private saveState() {
    try {
      const rect = this.root.getBoundingClientRect();
      const state: PersistedState = {
        x: rect.left, y: rect.top, w: rect.width, h: rect.height, collapsed: this.isCollapsed(),
      };
      localStorage.setItem(storageKey(this.opts.id!), JSON.stringify(state));
    } catch {}
  }

  private restoreState() {
    const key = storageKey(this.opts.id!);
    let state: PersistedState | null = null;
    try { const raw = localStorage.getItem(key); if (raw) state = JSON.parse(raw) as PersistedState; } catch {}
    const vw = window.innerWidth, vh = window.innerHeight;
    let { x, y } = state ?? { x: NaN, y: NaN } as any;
    let { w, h } = state ?? { w: NaN, h: NaN } as any;
    if (!Number.isFinite(w) || !Number.isFinite(h)) { w = 360; h = 240; }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      // dock based placement
      const pad = 24;
      const dock = this.opts.dock;
      x = dock.includes('right') ? vw - w - pad : pad;
      y = dock.includes('bottom') ? vh - h - pad : pad;
    }
    this.setSize(w, h);
    this.setPosition(x, y);
    if (state?.collapsed ?? this.opts.collapsed) this.setCollapsed(true);
  }

  private enableDragging() {
    const onDown = (ev: MouseEvent) => {
      if ((ev.target as HTMLElement)?.closest('.cjai-panel__controls')) return; // ignore button drag
      this.dragging = true;
      const rect = this.root.getBoundingClientRect();
      this.dragOffset.x = ev.clientX - rect.left;
      this.dragOffset.y = ev.clientY - rect.top;
      this.root.style.transition = 'none';
      ev.preventDefault();
    };
    const onMove = (ev: MouseEvent) => {
      if (!this.dragging) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      const width = this.root.getBoundingClientRect().width;
      const height = this.root.getBoundingClientRect().height;
      const x = clamp(ev.clientX - this.dragOffset.x, 0, vw - width);
      const y = clamp(ev.clientY - this.dragOffset.y, 0, vh - height);
      this.root.style.left = `${x}px`;
      this.root.style.top = `${y}px`;
    };
    const onUp = () => { if (this.dragging) { this.dragging = false; this.root.style.transition = ''; this.saveState(); } };
    this.header.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    // also drag by whole panel when collapsed
    this.root.addEventListener('mousedown', (e) => {
      if (!this.isCollapsed()) return;
      if ((e.target as HTMLElement).closest('.cjai-panel__controls')) return;
      onDown(e as MouseEvent);
    });
    this.unsub.push(() => {
      this.header.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
  }

  private enableResizing() {
    const handle = this.resizeHandle;
    const onDown = (ev: MouseEvent) => {
      this.resizing = true;
      const rect = this.root.getBoundingClientRect();
      this.resizeStart = { w: rect.width, h: rect.height, x: ev.clientX, y: ev.clientY };
      this.root.style.transition = 'none';
      ev.preventDefault();
    };
    const onMove = (ev: MouseEvent) => {
      if (!this.resizing) return;
      const dx = ev.clientX - this.resizeStart.x;
      const dy = ev.clientY - this.resizeStart.y;
      const w = clamp(this.resizeStart.w + dx, 240, Math.min(window.innerWidth - 20, 800));
      const h = clamp(this.resizeStart.h + dy, 120, Math.min(window.innerHeight - 20, 800));
      this.setSize(w, h);
    };
    const onUp = () => { if (this.resizing) { this.resizing = false; this.root.style.transition = ''; this.saveState(); } };
    handle.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    this.unsub.push(() => {
      handle.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    });
  }

  private isCollapsed(): boolean { return this.root.classList.contains('cjai-panel--collapsed'); }

  setCollapsed(v: boolean) {
    this.root.classList.toggle('cjai-panel--collapsed', v);
    this.saveState();
  }

  setTitle(title: string) { this.titleEl.textContent = title; }

  setPosition(x: number, y: number) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = this.root.getBoundingClientRect();
    const width = rect.width || 360;
    const height = rect.height || 240;
    this.root.style.left = `${clamp(x, 0, vw - width)}px`;
    this.root.style.top = `${clamp(y, 0, vh - height)}px`;
    this.root.style.right = 'auto';
    this.root.style.bottom = 'auto';
  }

  setSize(width: number, height: number) {
    this.root.style.width = `${Math.max(240, width)}px`;
    this.root.style.height = `${Math.max(100, height)}px`;
  }

  mount(parent?: HTMLElement) {
    const p = parent || this.opts.mount || document.body;
    if (!this.root.parentElement) p.appendChild(this.root);
  }

  destroy() {
    this.unsub.forEach((fn) => { try { fn(); } catch {} });
    this.unsub = [];
    this.root.remove();
  }

  clearActions() { this.actionsEl.innerHTML = ''; }

  addAction(action: ActionPanelAction) {
    const btn = document.createElement('button');
    btn.className = 'cjai-btn' + (action.kind === 'primary' ? ' cjai-btn--primary' : action.kind === 'danger' ? ' cjai-btn--danger' : '');
    btn.textContent = action.label;
    if (action.tooltip) btn.title = action.tooltip;
    if (action.hotkey) {
      const chip = document.createElement('span'); chip.className = 'cjai-chip'; chip.textContent = action.hotkey; btn.appendChild(chip);
    }
    btn.disabled = !!action.disabled;
    const trigger = action.trigger === 'dblclick' ? 'dblclick' : 'click';
    btn.addEventListener(trigger, () => action.onClick(this));
    btn.dataset.actionId = action.id;
    this.actionsEl.appendChild(btn);
  }

  // Tabs API
  addTab({ id, label, content, select = false }: { id: string; label: string; content?: HTMLElement; select?: boolean; }): HTMLElement {
    if (this.panes.has(id)) return this.panes.get(id)!;
    const btn = document.createElement('button');
    btn.className = 'cjai-tab';
    btn.type = 'button';
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `pane-${id}`);
    btn.setAttribute('aria-selected', 'false');
    this.tabsBar.appendChild(btn);

    const pane = content ?? document.createElement('div');
    if (!content) pane.className = 'cjai-tabpane';
    pane.id = `pane-${id}`;
    pane.dataset.active = 'false';
    this.contentWrap.appendChild(pane);

    btn.addEventListener('click', () => this.selectTab(id));
    this.panes.set(id, pane);
    if (select) this.selectTab(id);
    // Hide tab bar if single tab
    (this.tabsBar as HTMLElement).style.display = this.tabsBar.childElementCount > 1 ? 'flex' : 'none';
    return pane;
  }

  selectTab(id: string) {
    for (const el of Array.from(this.tabsBar.querySelectorAll<HTMLButtonElement>('.cjai-tab'))) {
      const selected = el.getAttribute('aria-controls') === `pane-${id}`;
      el.setAttribute('aria-selected', String(selected));
    }
    for (const [key, pane] of this.panes.entries()) {
      pane.dataset.active = String(key === id);
    }
  }

  getTabPane(id: string): HTMLElement | null { return this.panes.get(id) ?? null; }

  updateAction(id: string, patch: Partial<ActionPanelAction>) {
    const btn = this.actionsEl.querySelector<HTMLButtonElement>(`button[data-action-id="${id}"]`);
    if (!btn) return;
    if (patch.label != null) btn.firstChild ? (btn.firstChild.textContent = patch.label) : (btn.textContent = patch.label);
    if (patch.tooltip != null) btn.title = patch.tooltip || '';
    if (patch.disabled != null) btn.disabled = !!patch.disabled;
    if (patch.kind) {
      btn.classList.remove('cjai-btn--primary', 'cjai-btn--danger');
      if (patch.kind === 'primary') btn.classList.add('cjai-btn--primary');
      if (patch.kind === 'danger') btn.classList.add('cjai-btn--danger');
    }
  }

  // Content APIs
  setDoc(textOrEl: string | HTMLElement) {
    this.contentEl.innerHTML = '';
    if (typeof textOrEl === 'string') {
      const d = document.createElement('div');
      d.className = 'cjai-doc';
      d.textContent = textOrEl;
      this.contentEl.appendChild(d);
    } else {
      this.contentEl.appendChild(textOrEl);
    }
  }

  setInfo(items: Array<ActionPanelInfoItem> | Record<string, string | number>) {
    this.contentEl.innerHTML = '';
    const list: ActionPanelInfoItem[] = Array.isArray(items)
      ? items
      : Object.entries(items).map(([k, v]) => ({ key: k, label: k, value: v }));
    for (const it of list) {
      const row = document.createElement('div'); row.className = 'cjai-info-item';
      const k = document.createElement('div'); k.className = 'cjai-info-key'; k.textContent = it.label;
      const v = document.createElement('div'); v.className = 'cjai-info-value';
      if (it.value instanceof HTMLElement) v.appendChild(it.value); else v.textContent = String(it.value);
      if (it.tooltip) { k.title = it.tooltip; v.title = it.tooltip; }
      row.append(k, v); this.contentEl.appendChild(row);
    }
  }

  // Lightweight toast within panel
  toast(message: string, opts?: { type?: 'info' | 'success' | 'warn' | 'error'; duration?: number }) {
    const type = opts?.type || 'info';
    const duration = Math.max(1500, opts?.duration ?? 3500);
    const el = document.createElement('div');
    el.className = `cjai-toast cjai-toast--${type}`;
    el.textContent = message;
    this.toastHost.appendChild(el);
    // animate in
    requestAnimationFrame(() => { el.setAttribute('data-show', 'true'); });
    // auto hide
    const hide = () => {
      el.setAttribute('data-show', 'false');
      setTimeout(() => { el.remove(); }, 220);
    };
    const timer = setTimeout(hide, duration);
    // allow manual dismiss on click
    el.addEventListener('click', () => { clearTimeout(timer); hide(); });
  }
}

export default ActionPanel;
