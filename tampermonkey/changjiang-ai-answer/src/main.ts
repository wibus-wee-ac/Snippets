import logger from './logger';
import orderNav from './helper/order-nav.helper';
import { waitForQuestionElement } from './helper/find-question.helper';
import { QuestionCaptureRunner } from './runner/capture-questions';
import ActionPanel from './ui/action-panel';
import CaptureStore from './state/capture-store';
import CaptureGallery from './ui/capture-gallery';
import JsonExtractorPanel from './ui/json-extractor';
import getFeatureConfig, { isEnabled } from './config/feature-flags';
import AnswersStore, { normalizeAnswers } from './state/answers-store';
import Notepad from './ui/notepad';
import { GM_info } from '$';
import { clickSubmit } from './helper/submit.helper';

// Build capture runner and expose simple console API
const cfg = getFeatureConfig();
const store = new CaptureStore();
const answers = new AnswersStore();
const runner = new QuestionCaptureRunner({
  delayAfterNavigateMs: 200,
  screenshot: { scale: Math.max(2, window.devicePixelRatio || 1), backgroundColor: '#fff' },
  onCapture: (item) => store.upsert(item),
});

const CJAI = {
  nav: orderNav,
  waitForQuestionElement,
  runner,
  start: () => runner.captureAllFromCurrent(),
  stop: () => runner.stop(),
  one: (order: number) => runner.captureOne(order),
  store,
  answers,
  importAnswers: (doc: unknown) => { const arr = normalizeAnswers(doc as any); answers.setAll(arr); return arr.length; },
  features: cfg,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).CJAI = CJAI;

logger.banner('Injected', 'CJ-AI ready');
logger.info('Use in console:', 'CJAI.start()', 'CJAI.stop()', 'CJAI.one(n)');

// Create Action Panel (Vercel-like) for quick actions
const panel = new ActionPanel({ id: 'cjai-panel', title: 'CJ Capture - 自动截取题目截图', dock: 'bottom-right' });
panel.setDoc(
  `Author: wibus\n` +
  `Version: ${GM_info.script.version}\n` +
  `Namespace: ${GM_info.script.namespace}\n\n` +
  `快速截取题目用于 AI 辅助答题，长江雨课堂在字体文件上做了防爬虫处理，普通复制黏贴无法获得正确的文字渲染。` +
  `同时，该插件提供了 Notepad Tab，可以让你在答题时直接编写和保存文本答案。\n\n`
);

panel.clearActions();
if (isEnabled('capture')) {
  panel.addAction({ id: 'start', label: 'Start', kind: 'primary', tooltip: 'Capture all from current', hotkey: 'S', onClick: () => CJAI.start() });
  panel.addAction({ id: 'stop', label: 'Stop', kind: 'danger', tooltip: 'Stop capture', hotkey: 'X', onClick: () => CJAI.stop() });
}
if (isEnabled('orderNav')) {
  panel.addAction({ id: 'prev', label: 'Prev', tooltip: 'Go to previous', hotkey: 'A', onClick: () => { orderNav.prev(); } });
  panel.addAction({ id: 'next', label: 'Next', tooltip: 'Go to next', hotkey: 'D', onClick: () => { orderNav.next(); } });
}

// Preview tab
if (isEnabled('capture')) {
  const previewPane = panel.addTab({ id: 'preview', label: 'Preview' });
  const gallery = new CaptureGallery(store);
  previewPane.appendChild(gallery.el);
}
// Notepad tab
const notepadPane = panel.addTab({ id: 'notepad', label: 'Notepad' });
const notepad = new Notepad(answers);
notepadPane.appendChild(notepad.el);

// Extract tab (Question JSON)
if (isEnabled('questionExport')) {
  const extractPane = panel.addTab({ id: 'extract', label: 'Extract' });
  const extractor = new JsonExtractorPanel();
  extractPane.appendChild(extractor.el);
}

// Track current question order and sync to Notepad preview list
if (isEnabled('orderNav')) {
  let lastOrder: number | null = null;
  setInterval(() => {
    try {
      const cur = orderNav.current();
      if (cur && cur !== lastOrder) {
        lastOrder = cur;
        notepad.setCurrentOrder(cur);
      }
    } catch {}
  }, 600);
}

// Listen for retry events from gallery
if (isEnabled('capture')) {
  window.addEventListener('cjai:retry', (ev: any) => {
    const order = Number(ev?.detail?.order);
    if (!order) return;
    runner.captureOne(order);
  });
}

// Global hotkey: Cmd+G to submit (Mac). On Windows/Linux, Ctrl+G also works.
if (isEnabled('submitHotkey')) {
  window.addEventListener('keydown', (ev) => {
    const isMeta = ev.metaKey; // macOS Command
    const isCtrl = ev.ctrlKey; // other platforms
    if ((isMeta || isCtrl) && !ev.shiftKey && !ev.altKey) {
      const key = ev.key?.toLowerCase();
      if (key === 'g') {
        // Avoid capturing in editable fields
        const target = ev.target as HTMLElement | null;
        const tag = (target?.tagName || '').toLowerCase();
        const editable = target && (tag === 'input' || tag === 'textarea' || (target as any).isContentEditable);
        if (!editable) {
          ev.preventDefault();
          clickSubmit();
        }
      }
    }
  });
}
