import './style.css';
import logger, { setToastEchoLevels, setToastPresenter } from './logger';
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
import { clickSubmit } from './helper/submit.helper';
import FeatureFlagsWidget from './ui/feature-flags';
import { setupDoubaoHostIfMatched, pingDoubao, doubaoCompose, doubaoAttach, doubaoSend, sendPromptToDoubao, doubaoWaitUploads, waitForLastJson, ensureDoubaoReady } from './bridge/doubao-bridge';
import { buildAnswerPrompt } from './prompt/template';
import { extractExamQuestions } from './extract/exam-parser';
import { buildQuestionAnswerPrompt } from './prompt/questions';

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
  doubao: {
    ping: () => pingDoubao(),
    compose: (p: any) => doubaoCompose(p),
    attach: (b: Blob, name?: string) => doubaoAttach(b, name),
    send: () => doubaoSend(),
    sendPrompt: (prompt: string, image?: Blob) => sendPromptToDoubao(prompt, image),
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).CJAI = CJAI;

logger.banner('Injected', 'CJ-AI ready');
logger.info('Use in console:', 'CJAI.start()', 'CJAI.stop()', 'CJAI.one(n)');

// Initialize Doubao host when running on doubao.com
setupDoubaoHostIfMatched();

if (isEnabled('actionPanel')) {
  // Create Action Panel (Vercel-like) for quick actions
  const panel = new ActionPanel({ id: 'cjai-panel', title: 'CJ N-IN-1 ToolBox', dock: 'bottom-right' });
  // Hook logger toast into panel toast
  setToastPresenter((msg, opts) => panel.toast(msg, opts as any));
  setToastEchoLevels(['error', 'warn', 'success', 'info']);
  // Compose About + Feature Flags into info content
  {
  const infoWrap = document.createElement('div');
  const doc = document.createElement('div');
  doc.className = 'cjai-section';
  const docTitle = document.createElement('div'); docTitle.className = 'cjai-section__title'; docTitle.textContent = 'About';
  const docBody = document.createElement('div'); docBody.className = 'cjai-doc';
  docBody.textContent = `• Tabs 说明：
  - Preview（截图预览，测试页面专属）：点击 Start 从“当前题”至“最后一题”依次截图；可在列表中勾选后 Download Zip / Save to Folder / Download Files；Retry 可重拍某题。
  - Extract（题目提取，考试页面专属）：Scan Page 获取题目 JSON；Copy Prompt 生成给 AI 的提示词（内含题目 JSON）；Download 保存 JSON 文件。
  - Notepad（答案簿）：将返回的 AnswerDoc JSON 粘贴→Parse JSON；列表按题号展示，跟随左侧导航自动滚动；输入区可 Hide/Show；Copy Prompt 可复制标准提示词模板。
• 快捷键：Cmd/Ctrl + E 触发页面提交按钮。
• Feature Flags：Info 面板下方可切换功能开关；Apply 后 Reload 生效。一般来说，并不需要修改这些设置，功能会随着作用域自动更新。

## Brand New Features
• Doubao Bridge: 在 doubao.com 页面可使用 CJAI.doubao 相关方法与豆包 AI 桥接，发送提示词并接收 AI 解题。
• Auto Watch: 在“课程播放”页面自动播放未完成的视频课节，支持倍速播放和自动跳过已完成课节。

`;
  doc.append(docTitle, docBody);
  const flags = new FeatureFlagsWidget();
  infoWrap.append(doc, flags.el);
  panel.setDoc(infoWrap);
  }
  
  panel.clearActions();
  if (isEnabled('capture')) {
    panel.addAction({ id: 'start', label: 'Start', kind: 'primary', tooltip: 'Capture all from current', hotkey: 'S', onClick: () => CJAI.start() });
    panel.addAction({ id: 'stop', label: 'Stop', kind: 'danger', tooltip: 'Stop capture', hotkey: 'X', onClick: () => CJAI.stop() });
  }
  if (isEnabled('orderNav')) {
    panel.addAction({ id: 'prev', label: 'Prev', tooltip: 'Go to previous', hotkey: 'A', onClick: () => { orderNav.prev(); } });
    panel.addAction({ id: 'next', label: 'Next', tooltip: 'Go to next', hotkey: 'D', onClick: () => { orderNav.next(); } });
  }
  // Doubao Bridge (only on main domain)
  if (isEnabled('doubaoBridge')) {
    panel.addAction({ id: 'db-connect', label: 'Doubao: Ping', tooltip: 'Open Doubao (reuse) and send ping', onClick: () => { logger.toast('Ping sent to Doubao.', { type: 'success' }); pingDoubao(); } });
    panel.addAction({ id: 'db-send-test', label: 'Doubao: Send Test', tooltip: 'Compose test text and send', onClick: () => { doubaoCompose({ text: 'Hello from CJ-AI bridge at ' + new Date().toLocaleTimeString(), send: true }); } });
    panel.addAction({ id: 'db-oneclick', label: 'One-Click Solve', kind: 'primary', tooltip: 'Run · Capture/Scan → Doubao → Import JSON → Notepad', onClick: async () => {
      logger.toast('Starting One-Click Solve flow...', { type: 'info' });
      try {
        // Ensure Doubao popup is alive and host is ready
        logger.toast('Ensuring Doubao is ready...');
        const ready = await ensureDoubaoReady(15000, 800);
        if (!ready) { logger.warn('Doubao not ready (no pong). Abort.'); return; }

        // Decide mode by feature flags
        if (isEnabled('questionExport')) {
          // JSON mode (exam domain)
          logger.banner('One-Click', 'Scan questions JSON');
          const questions = extractExamQuestions();
          if (!questions.length) { logger.warn('No questions found'); return; }
          const prompt = buildQuestionAnswerPrompt(questions, { lang: 'zh', includeExample: true, minifyJson: true, extraNotes: ['请严格依题目顺序（order 从 1 开始）。'] });
          const ok = sendPromptToDoubao(prompt);
          if (!ok) { logger.warn('Failed to send to Doubao'); return; }
          logger.toast('已发送到豆包。如果没有自动发送，请切到豆包窗口按 Enter。', { type: 'info', duration: 6000 });
          logger.info('Waiting for AI JSON...');
          const res = await waitForLastJson(90000, 3000);
          if (!res.ok || !res.text) { logger.warn('No AI JSON'); return; }
          const count = CJAI.importAnswers(res.text);
          logger.success('Imported answers', count);
          panel.selectTab('notepad');
          return;
        }

        if (isEnabled('capture')) {
          // Image mode (main domain)
          logger.banner('One-Click', 'Capture all questions');
          await runner.captureAllFromCurrent();
          const files = store.selected();
          if (!files.length) { logger.warn('No captures to send'); return; }
          logger.info('Attaching images to Doubao', files.length);
          for (const f of files) { if (f.blob) doubaoAttach(f.blob, f.filename); await new Promise((r) => setTimeout(r, 200)); }
          let up = await doubaoWaitUploads(60000);
          if (!up.ok) {
            logger.warn('Uploads still in progress, extend wait', up.reason || '');
            up = await doubaoWaitUploads(30000);
          }
          if (!up.ok) { logger.warn('Uploads not ready, abort send'); return; }
          const prompt = buildAnswerPrompt({ lang: 'zh', includeExample: true, extraNotes: [
            '请按截图顺序作答，输出 AnswerDoc JSON，order 从 1 开始。',
          ]});
          const sent = doubaoCompose({ text: prompt, send: true });
          if (!sent) { logger.warn('Failed to send'); return; }
          logger.toast('已发送到豆包。如果没有自动发送，请切到豆包窗口按 Enter。', { type: 'info', duration: 6000 });
          logger.info('Waiting for AI JSON...');
          const res = await waitForLastJson(120000, 4000);
          if (!res.ok || !res.text) { logger.warn('No AI JSON'); return; }
          const count = CJAI.importAnswers(res.text);
          logger.success('Imported answers', count);
          panel.selectTab('notepad');
          return;
        }

        logger.warn('No supported mode (capture or questionExport)');
      } catch (e) {
        logger.toast('One-Click flow failed. See console.', { type: 'error', duration: 8000 });
        logger.error('One-Click flow failed', e);
      }
    }});
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

  // YukeTang Auto Watch tab
  if (isEnabled('autoWatch')) {
    const watchPane = panel.addTab({ id: 'watch', label: 'Watch' });
    const AutoWatchPanel = (await import('./ui/auto-watch')).default;
    const widget = new AutoWatchPanel();
    watchPane.appendChild(widget.el);
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
      if (key === 'e') {
        ev.preventDefault();
        clickSubmit();
      }
    }
  });
}
