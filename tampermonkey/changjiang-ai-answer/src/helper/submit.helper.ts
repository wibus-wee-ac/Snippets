import logger from '../logger';

const EXACT_SUBMIT_SELECTOR =
  '#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.problem-fixedbar > div > div:nth-child(2) > div > ul > li > span > button';

function hasText(el: Element, text: string): boolean {
  const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
  return t.includes(text);
}

export function findSubmitButton(): HTMLButtonElement | null {
  // 1) Try exact selector
  const exact = document.querySelector<HTMLButtonElement>(EXACT_SUBMIT_SELECTOR);
  if (exact) return exact;

  // 2) Fallback: within problem-fixedbar, a primary button with text including 提交
  const fixedbar = document.querySelector('.container-problem .problem-fixedbar') || document.querySelector('.problem-fixedbar');
  if (fixedbar) {
    const buttons = Array.from(fixedbar.querySelectorAll<HTMLButtonElement>('button'));
    const byText = buttons.find((b) => hasText(b, '提交'));
    if (byText) return byText;
    const primary = buttons.find((b) => b.className.includes('el-button--primary'));
    if (primary) return primary;
  }

  // 3) Global search for buttons with text 提交 (last resort)
  const anyBtn = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => hasText(b, '提交'));
  if (anyBtn) return anyBtn;

  return null;
}

export function clickSubmit(): boolean {
  const btn = findSubmitButton();
  if (!btn) {
    logger.warn('Submit button not found');
    return false;
  }
  try {
    btn.focus();
    btn.click();
    logger.success('Triggered submit');
    return true;
  } catch (e) {
    logger.error('Submit click failed', e);
    return false;
  }
}

export default clickSubmit;

