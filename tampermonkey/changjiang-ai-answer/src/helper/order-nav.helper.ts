import logger from '../logger';

export interface WaitForOrderOptions {
  timeoutMs?: number; // default 10s
  intervalMs?: number; // default 300ms
  useObserver?: boolean; // default true
  signal?: AbortSignal;
}

export interface GoOptions {
  smooth?: boolean;
}

export interface StepOptions extends GoOptions {
  loop?: boolean; // wrap around when exceeding range
}

export interface OrderNav {
  container(): HTMLElement | null;
  list(): HTMLElement[];
  currentEl(): HTMLElement | null;
  current(): number | null;
  total(): number | null;
  goTo(order: number, opts?: GoOptions): boolean;
  next(opts?: StepOptions): boolean;
  prev(opts?: StepOptions): boolean;
  first(opts?: GoOptions): boolean;
  last(opts?: GoOptions): boolean;
  wait(options?: WaitForOrderOptions): Promise<HTMLElement | null>;
}

const CONTAINER_SELECTOR = '.exam-aside .el-scrollbar__view .aside-body';
const FALLBACK_CONTAINER_SELECTOR = '.exam-aside';
const ITEM_SELECTOR = '.subject-item.J_order[data-order]';
const ACTIVE_SELECTOR = '.subject-item.J_order.active';
const PROGRESS_SELECTOR = '.aside-body--progress';

function getContainer(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(CONTAINER_SELECTOR) ||
    document.querySelector<HTMLElement>(FALLBACK_CONTAINER_SELECTOR)
  );
}

function getItems(container?: HTMLElement | null): HTMLElement[] {
  const root = container ?? getContainer();
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
}

function parseOrder(el: HTMLElement | null | undefined): number | null {
  if (!el) return null;
  const raw = el.getAttribute('data-order') || '';
  const n = parseInt(raw, 10);
  if (!Number.isNaN(n)) return n;
  // Fallback to textual content if needed
  const text = (el.textContent || '').trim();
  const m = text.match(/\d+/);
  if (m) return parseInt(m[0], 10);
  return null;
}

function getCurrentEl(container?: HTMLElement | null): HTMLElement | null {
  const root = container ?? getContainer();
  if (!root) return null;
  return root.querySelector<HTMLElement>(ACTIVE_SELECTOR);
}

function getProgressTotal(container?: HTMLElement | null): number | null {
  const root = container ?? getContainer();
  if (!root) return null;
  const prog = root.querySelector<HTMLElement>(PROGRESS_SELECTOR);
  if (!prog) return null;
  const txt = (prog.textContent || '').replace(/\u00A0/g, ' ').trim(); // normalize nbsp
  // e.g. "0/20题" or "5/100 题"
  const m = txt.match(/\/(\s*\d+)\s*题?/);
  if (m) {
    const n = parseInt(m[1].trim(), 10);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function scrollIntoView(el: HTMLElement, smooth = true) {
  try {
    el.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  } catch {
    el.scrollIntoView();
  }
}

function goTo(order: number, opts?: GoOptions): boolean {
  const container = getContainer();
  if (!container) return false;
  const item = container.querySelector<HTMLElement>(`${ITEM_SELECTOR}[data-order="${order}"]`);
  if (!item) return false;
  scrollIntoView(item, opts?.smooth !== false);
  item.click();
  logger.info('goTo', order);
  return true;
}

async function waitForOrders(options: WaitForOrderOptions = {}): Promise<HTMLElement | null> {
  const { timeoutMs = 10000, intervalMs = 300, useObserver = true, signal } = options;

  const first = getContainer();
  if (first && getItems(first).length > 0) return first;

  let resolved = false;
  let intervalId: number | null = null;
  let timeoutId: number | null = null;
  let observer: MutationObserver | null = null;

  const stopAll = (el: HTMLElement | null, resolve: (v: HTMLElement | null) => void) => {
    if (resolved) return;
    resolved = true;
    if (intervalId !== null) window.clearInterval(intervalId);
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    if (observer) observer.disconnect();
    resolve(el);
  };

  return new Promise<HTMLElement | null>((resolve) => {
    const tick = () => {
      const root = getContainer();
      if (!root) return;
      if (getItems(root).length > 0) stopAll(root, resolve);
    };
    intervalId = window.setInterval(tick, intervalMs);

    if (useObserver && typeof MutationObserver !== 'undefined') {
      const target = document.body;
      observer = new MutationObserver(() => tick());
      observer.observe(target, { childList: true, subtree: true });
    }

    timeoutId = window.setTimeout(() => stopAll(null, resolve), timeoutMs);

    if (signal) {
      const onAbort = () => stopAll(null, resolve);
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

const orderNav: OrderNav = {
  container: getContainer,
  list: () => getItems(),
  currentEl: getCurrentEl,
  current: () => parseOrder(getCurrentEl()),
  total: () => (getProgressTotal() ?? (getItems().length || null)),
  goTo,
  next: (opts?: StepOptions) => {
    const total = orderNav.total();
    const cur = orderNav.current();
    const target = cur ? cur + 1 : 1;
    if (total && target > total) {
      if (opts?.loop) return orderNav.goTo(1, opts);
      return false;
    }
    return orderNav.goTo(target, opts);
  },
  prev: (opts?: StepOptions) => {
    const total = orderNav.total();
    const cur = orderNav.current();
    const target = cur ? cur - 1 : 1;
    if (target < 1) {
      if (opts?.loop && total) return orderNav.goTo(total, opts);
      return false;
    }
    return orderNav.goTo(target, opts);
  },
  first: (opts?: GoOptions) => orderNav.goTo(1, opts),
  last: (opts?: GoOptions) => {
    const total = orderNav.total();
    if (!total) return false;
    return orderNav.goTo(total, opts);
  },
  wait: waitForOrders,
};

export default orderNav;
export { waitForOrders as waitForOrderSidebar, goTo };
