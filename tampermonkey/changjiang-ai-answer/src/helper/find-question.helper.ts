import logger from '../logger';
/**
 * 定位当前页中「题目容器」元素（通常为 `.subject-item`）。
 *
 * 策略说明：
 * - 优先在 `.item-type` 中查找能够唯一标识题目的文本特征：`(X分)` 或 `序号+题型（如：1.单选题）`。
 * - 若命中，则沿 DOM 向上回溯最近的 `.subject-item` 容器。
 * - 若未命中，则回退为查找可见区域中最靠近视口顶部的 `.subject-item`。
 * - 最后兜底返回页面上的第一个 `.subject-item`，找不到则返回 null。
 */
export function findQuestionElementHelper(): HTMLElement | null {
  // 明确的最后兜底：页面当前结构下的精确路径（主内容区，不是左侧题号侧栏）
  const EXACT_FALLBACK_SELECTOR =
    getFeatureConfig().selectors?.questionContainerExact ||
    '#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.el-scrollbar > div.el-scrollbar__wrap.el-scrollbar__wrap--hidden-default > div > div';
  // 文本匹配：题目分值，如：(1分)、(2.5分)
  const SCORE_RE = /\(\s*\d+(?:\.\d+)?\s*分\s*\)/;
  // 文本匹配：题目序号+题型，如：1.单选题、2、判断题、3、填空题 等
  const TYPE_RE = /\b\d+[\.、]?[\u3001、\s]*[\u4e00-\u9fa5]{1,6}题\b/;

  const normalizeText = (s: string | null | undefined): string =>
    (s ?? '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isLikelyItemTypeText = (text: string): boolean => {
    const t = normalizeText(text);
    return SCORE_RE.test(t) || TYPE_RE.test(t);
  };

  const isElementInViewport = (el: Element): boolean => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vertVisible = rect.top < vh && rect.bottom > 0;
    const horizVisible = rect.left < vw && rect.right > 0;
    return vertVisible && horizVisible;
  };

  const pickClosestToTop = (elements: HTMLElement[]): HTMLElement | null => {
    if (elements.length === 0) return null;
    const scored = elements.map((el) => ({ el, top: Math.abs(el.getBoundingClientRect().top) }));
    scored.sort((a, b) => a.top - b.top);
    return scored[0].el;
  };

  // 锚定主内容区容器，避免误匹配左侧 aside 中的 `.subject-item J_order`
  const container: HTMLElement | null =
    document.querySelector('.container-problem .el-scrollbar__view') ||
    document.querySelector('.container-problem') ||
    null;

  // Step 1: 从主容器里的 `.item-type` 文本定位，再回溯到 `.subject-item`
  const itemTypeNodes = Array.from(
    (container ?? document).querySelectorAll<HTMLElement>('.subject-item .item-type, .item-type, [class*="item-type"]'),
  );

  const viaTextMatched = itemTypeNodes
    .filter((n) => isLikelyItemTypeText(n.textContent || ''))
    .map((n) => n.closest('.subject-item') as HTMLElement | null)
    .filter((n): n is HTMLElement => !!n);

  if (viaTextMatched.length > 0) {
    // 优先返回视口内的题目，若都不在视口内，则返回最接近顶部的一个
    const visible = viaTextMatched.filter(isElementInViewport);
    if (visible.length > 0) return pickClosestToTop(visible);
    return pickClosestToTop(viaTextMatched);
  }

  // Step 2: 未从文本命中，则在主内容区内基于 `.subject-item` 可见性选择
  const allSubjectItems = Array.from(
    (container ?? document).querySelectorAll<HTMLElement>('.subject-item'),
  );
  if (allSubjectItems.length > 0) {
    const visible = allSubjectItems.filter(isElementInViewport);
    if (visible.length > 0) return pickClosestToTop(visible);
    return allSubjectItems[0] ?? null;
  }

  // Step 3: 最后兜底，使用用户提供的精确 selector
  const exactFallback = document.querySelector<HTMLElement>(EXACT_FALLBACK_SELECTOR);
  if (exactFallback) return exactFallback;

  // Step 4: 结构启发式兜底（保留，防止 DOM 发生轻微变动也能回退）
  const fallbackContainer =
    document.querySelector<HTMLElement>('#app .container-problem .el-scrollbar__wrap') ||
    document.querySelector<HTMLElement>('.viewContainer .container-problem') ||
    document.querySelector<HTMLElement>('#app');

  if (fallbackContainer) {
    const blocks = Array.from(
      fallbackContainer.querySelectorAll<HTMLElement>(':scope > div, :scope > * > div, [class*="subject"], [class*="item"]'),
    );
    const plausible = blocks
      .filter((el) => el.childElementCount > 0)
      .filter((el) => el.getBoundingClientRect().height > 40)
      .filter((el) => /subject|item/i.test(el.className));

    if (plausible.length > 0) {
      const visible = plausible.filter(isElementInViewport);
      if (visible.length > 0) return pickClosestToTop(visible);
      return plausible[0] ?? null;
    }
  }

  return null;
}

export default findQuestionElementHelper;

/**
 * 轮询/监听等待题目元素渲染出来（适配“正在加载 ...”的情况）。
 */
export interface WaitForQuestionOptions {
  timeoutMs?: number; // 超时时间，默认 10s
  intervalMs?: number; // 轮询间隔，默认 300ms
  useObserver?: boolean; // 是否使用 MutationObserver 辅助，默认 true
  signal?: AbortSignal; // 可选的中断信号
}

export async function waitForQuestionElement(
  options: WaitForQuestionOptions = {},
): Promise<HTMLElement | null> {
  const { timeoutMs = 10000, intervalMs = 300, useObserver = true, signal } = options;

  // 优先尝试一次
  const first = findQuestionElementHelper();
  if (first) return first;
  logger.info('waitForQuestionElement: initial check did not find the element, start waiting...');
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
    // 轮询检查
    const tick = () => {
      const el = findQuestionElementHelper();
      if (el) stopAll(el, resolve);
    };
    intervalId = window.setInterval(tick, intervalMs);

    // 监听 DOM 变化（容器优先，找不到则挂到 body）
    if (useObserver && typeof MutationObserver !== 'undefined') {
      const target =
        document.querySelector('.container-problem .el-scrollbar__view') ||
        document.querySelector('.container-problem') ||
        document.body;
      observer = new MutationObserver(() => tick());
      observer.observe(target!, { childList: true, subtree: true });
    }

    // 超时
    timeoutId = window.setTimeout(() => stopAll(null, resolve), timeoutMs);

    // 支持外部中断
    if (signal) {
      const onAbort = () => stopAll(null, resolve);
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
import { getFeatureConfig } from '../config/feature-flags';
