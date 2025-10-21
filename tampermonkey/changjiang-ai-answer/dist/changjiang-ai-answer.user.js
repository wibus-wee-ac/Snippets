// ==UserScript==
// @name       changjiang-ai-answer
// @namespace  wibus/changjiang-ai-answer
// @version    0.0.0
// @icon       https://vitejs.dev/logo.svg
// @match      https://changjiang.yuketang.cn/*
// @match      https://changjiang-exam.yuketang.cn/*
// @grant      GM_addStyle
// @grant      GM_info
// ==/UserScript==

(function () {
  'use strict';

  const d=new Set;const importCSS = async e=>{d.has(e)||(d.add(e),(t=>{typeof GM_addStyle=="function"?GM_addStyle(t):document.head.appendChild(document.createElement("style")).append(t);})(e));};

  const styleCss = ':root{--cjai-bg: rgba(255, 255, 255, .8);--cjai-bg-muted: rgba(255, 255, 255, .9);--cjai-border: rgba(0, 0, 0, .1);--cjai-ink: #111;--cjai-ink-muted: #666;--cjai-shadow: 0 8px 30px rgba(0, 0, 0, .12);--cjai-radius: 12px;--cjai-accent: #111;--cjai-danger: #e11d48;--cjai-primary: #111}.cjai-panel{position:fixed;inset:auto auto 24px 24px;min-width:260px;min-height:120px;width:360px;height:240px;z-index:10;color:var(--cjai-ink);background:var(--cjai-bg);-webkit-backdrop-filter:saturate(180%) blur(12px);backdrop-filter:saturate(180%) blur(12px);border:1px solid var(--cjai-border);border-radius:var(--cjai-radius);box-shadow:var(--cjai-shadow);overflow:hidden;-webkit-user-select:none;user-select:none;font:13px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}.cjai-panel *{box-sizing:border-box}.cjai-panel__header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-bottom:1px solid var(--cjai-border);cursor:move;background:var(--cjai-bg-muted)}.cjai-panel__title{font-weight:600;letter-spacing:.2px}.cjai-panel__controls{display:flex;gap:6px}.cjai-btn{appearance:none;border:1px solid var(--cjai-border);background:transparent;color:var(--cjai-ink);padding:6px 10px;border-radius:8px;cursor:pointer;transition:all .12s ease}.cjai-btn:hover{border-color:var(--cjai-ink)}.cjai-btn--primary{background:var(--cjai-accent);color:#fff;border-color:transparent}.cjai-btn--primary:hover{filter:brightness(1.05)}.cjai-btn--danger{background:#e11d48;color:#fff;border-color:transparent}.cjai-btn--danger:hover{filter:brightness(1.05)}.cjai-btn[disabled]{opacity:.5;cursor:not-allowed}.cjai-chip{font-size:10px;padding:2px 6px;background:var(--cjai-bg-muted);border:1px solid var(--cjai-border);border-radius:999px;color:var(--cjai-ink-muted);margin-left:6px}.cjai-panel__body{display:flex;flex-direction:column;gap:8px;padding:8px;height:calc(100% - 40px)}.cjai-tabs{display:flex;gap:6px;padding:4px;border:1px solid var(--cjai-border);border-radius:8px;background:var(--cjai-bg-muted)}.cjai-tab{appearance:none;border:none;background:transparent;color:var(--cjai-ink-muted);padding:6px 10px;border-radius:6px;cursor:pointer;font-weight:600}.cjai-tab[aria-selected=true]{background:var(--cjai-bg);color:var(--cjai-ink);box-shadow:inset 0 0 0 1px var(--cjai-border)}.cjai-panel__content{position:relative;flex:1;min-height:0;border:1px solid var(--cjai-border);border-radius:8px;overflow:hidden;background:var(--cjai-bg)}.cjai-tabpane{position:absolute;inset:0;overflow:auto;display:none;background:#fff}.cjai-tabpane[data-active=true]{display:block}.cjai-controls{display:flex;flex-direction:column;gap:8px;height:100%}.cjai-controls__content{padding:8px 2px 8px 8px;flex:1;min-height:0;overflow:auto}.cjai-controls__actions{flex:0 0 auto;display:flex;flex-wrap:wrap;gap:8px;padding:8px;border-top:1px solid var(--cjai-border);background:var(--cjai-bg-muted);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);position:sticky;bottom:0}.cjai-doc{white-space:pre-wrap;word-break:break-word;line-height:1.6}.cjai-section{border:1px solid var(--cjai-border);border-radius:8px;padding:10px;background:var(--cjai-bg)}.cjai-section+.cjai-section{margin-top:8px}.cjai-section__title{font-weight:600;margin-bottom:8px}.cjai-section__description{font-size:12px;color:var(--cjai-ink-muted);margin-bottom:8px}.cjai-rows{display:flex;flex-direction:column;gap:8px;margin-top:4px}.cjai-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border:1px solid var(--cjai-border);border-radius:8px;background:var(--cjai-bg)}.cjai-row__label{color:var(--cjai-ink);font-weight:500}.cjai-switch{position:relative;width:44px;height:24px}.cjai-switch input{opacity:0;width:0;height:0}.cjai-switch__slider{position:absolute;inset:0;background:#e5e7eb;border-radius:999px;transition:all .15s ease;box-shadow:inset 0 0 0 1px var(--cjai-border)}.cjai-switch__slider:after{content:"";position:absolute;left:3px;top:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:all .15s ease;box-shadow:0 1px 2px #0000001a}.cjai-switch input:checked+.cjai-switch__slider{background:var(--cjai-accent);box-shadow:none}.cjai-switch input:checked+.cjai-switch__slider:after{transform:translate(20px)}.cjai-info-item{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed rgba(0,0,0,.06)}.cjai-info-item:last-child{border-bottom:none}.cjai-info-key{color:var(--cjai-ink-muted)}.cjai-info-value{font-weight:600}.cjai-resize{position:absolute;right:6px;bottom:6px;width:14px;height:14px;cursor:nwse-resize;opacity:.6}.cjai-resize:after{content:"";position:absolute;right:2px;bottom:2px;width:10px;height:10px;border-right:2px solid var(--cjai-border);border-bottom:2px solid var(--cjai-border);border-radius:0 0 3px}.cjai-panel--collapsed{height:auto!important;width:auto!important;min-width:48px;min-height:32px}.cjai-panel--collapsed .cjai-panel__body,.cjai-panel--collapsed .cjai-resize{display:none}.cjai-panel--collapsed .cjai-panel__header{cursor:move;padding:6px 8px}.cjai-panel--collapsed .cjai-panel__title{font-size:12px}';
  importCSS(styleCss);
  const LEVEL_ORDER = {
    silent: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5
  };
  const STORAGE_KEY = "CJ_AI_LOG_LEVEL";
  const BRAND = "CJ-AI";
  const brandStyle = [
    "background: linear-gradient(135deg, #2b6cb0, #3182ce)",
    "color: #fff",
    "padding: 2px 8px",
    "border-radius: 999px 0 0 999px",
    "font-weight: 700",
    "font-family: ui-sans-serif, -apple-system, system-ui, Segoe UI, Roboto"
  ].join(";");
  const levelStyles = {
    error: [
      "background: #c53030",
      "color: #fff",
      "padding: 2px 8px",
      "border-radius: 0 999px 999px 0",
      "font-weight: 700"
    ].join(";"),
    warn: [
      "background: #b7791f",
      "color: #fff",
      "padding: 2px 8px",
      "border-radius: 0 999px 999px 0",
      "font-weight: 700"
    ].join(";"),
    info: [
      "background: #2c5282",
      "color: #fff",
      "padding: 2px 8px",
      "border-radius: 0 999px 999px 0",
      "font-weight: 700"
    ].join(";"),
    debug: [
      "background: #4a5568",
      "color: #fff",
      "padding: 2px 8px",
      "border-radius: 0 999px 999px 0",
      "font-weight: 700"
    ].join(";"),
    trace: [
      "background: #1a202c",
      "color: #fff",
      "padding: 2px 8px",
      "border-radius: 0 999px 999px 0",
      "font-weight: 700"
    ].join(";"),
    success: [
      "background: #2f855a",
      "color: #fff",
      "padding: 2px 8px",
      "border-radius: 0 999px 999px 0",
      "font-weight: 700"
    ].join(";")
  };
  function getStoredLevel() {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) || "";
    if (raw && raw in LEVEL_ORDER) return raw;
    return "debug";
  }
  function setStoredLevel(level) {
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, level);
    } catch {
    }
  }
  function fmt(level, scope) {
    const scopeText = scope ? `:${scope}` : "";
    return [
      `%c ${BRAND}${scopeText} %c ${level.toUpperCase()} `,
      brandStyle,
      levelStyles[level],
      ""
    ];
  }
  function shouldLog(current, want) {
    return LEVEL_ORDER[current] >= LEVEL_ORDER[want];
  }
  function createLogger(scope) {
    let currentLevel = getStoredLevel();
    const logAt = (want, method) => (...args) => {
      if (!shouldLog(currentLevel, want)) return;
      const [fmtStr, brand, lvl, none] = fmt(method === "success" ? "success" : want, scope);
      const c = console;
      switch (method) {
        case "error":
          c.error(fmtStr, brand, lvl, none, ...args);
          break;
        case "warn":
          c.warn(fmtStr, brand, lvl, none, ...args);
          break;
        case "debug":
          c.debug(fmtStr, brand, lvl, none, ...args);
          break;
        case "trace":
          c.trace(fmtStr, brand, lvl, none, ...args);
          break;
        case "success":
          c.log(fmtStr, brand, lvl, none, ...args);
          break;
        default:
          c.log(fmtStr, brand, lvl, none, ...args);
      }
    };
    const logger2 = {
      level: () => currentLevel,
      setLevel: (l) => {
        currentLevel = l;
        setStoredLevel(l);
      },
      error: logAt("error", "error"),
      warn: logAt("warn", "warn"),
      info: logAt("info", "log"),
      debug: logAt("debug", "debug"),
      trace: logAt("trace", "trace"),
      success: logAt("info", "success"),
      group: (title) => {
        if (!shouldLog(currentLevel, "info")) return;
        const [fmtStr, brand, lvl, none] = fmt("info", scope);
        if (title) console.group(fmtStr + " %c" + title, brand, lvl, none, "");
        else console.group(fmtStr, brand, lvl, none);
      },
      groupCollapsed: (title) => {
        if (!shouldLog(currentLevel, "info")) return;
        const [fmtStr, brand, lvl, none] = fmt("info", scope);
        if (title) console.groupCollapsed(fmtStr + " %c" + title, brand, lvl, none, "");
        else console.groupCollapsed(fmtStr, brand, lvl, none);
      },
      groupEnd: () => {
        console.groupEnd();
      },
      time: (label = "time") => {
        if (!shouldLog(currentLevel, "debug")) return;
        console.time(`${BRAND}${scope ? ":" + scope : ""}:${label}`);
      },
      timeEnd: (label = "time") => {
        if (!shouldLog(currentLevel, "debug")) return;
        console.timeEnd(`${BRAND}${scope ? ":" + scope : ""}:${label}`);
      },
      table: (tabularData, properties) => {
        if (!shouldLog(currentLevel, "debug")) return;
        const [fmtStr, brand, lvl, none] = fmt("debug", scope);
        if (typeof console.table === "function") {
          console.log(fmtStr, brand, lvl, none);
          console.table(tabularData, properties);
        } else {
          console.log(fmtStr, brand, lvl, none, tabularData);
        }
      },
      assert: (condition, ...data) => {
        if (!shouldLog(currentLevel, "warn")) return;
        const [fmtStr, brand, lvl, none] = fmt("warn", scope);
        console.assert(condition ?? false, fmtStr, brand, lvl, none, ...data);
      },
      banner: (title, subtitle) => {
        if (!shouldLog(currentLevel, "info")) return;
        const pillLeft = "background:#2b6cb0;color:white;padding:2px 8px;border-radius:8px 0 0 8px;font-weight:700;";
        const pillRight = "background:#1a202c;color:#fff;padding:2px 8px;border-radius:0 8px 8px 0;font-weight:600;";
        const txt = `%c ${BRAND} %c ${title}${subtitle ? " — " + subtitle : ""}`;
        console.log(txt, pillLeft, pillRight);
      },
      withScope: (child) => createLogger(scope ? `${scope}:${child}` : child)
    };
    return logger2;
  }
  const logger = createLogger();
  const CONTAINER_SELECTOR = ".exam-aside .el-scrollbar__view .aside-body";
  const FALLBACK_CONTAINER_SELECTOR = ".exam-aside";
  const ITEM_SELECTOR = ".subject-item.J_order[data-order]";
  const ACTIVE_SELECTOR = ".subject-item.J_order.active";
  const PROGRESS_SELECTOR = ".aside-body--progress";
  function getContainer() {
    return document.querySelector(CONTAINER_SELECTOR) || document.querySelector(FALLBACK_CONTAINER_SELECTOR);
  }
  function getItems(container) {
    const root = container ?? getContainer();
    if (!root) return [];
    return Array.from(root.querySelectorAll(ITEM_SELECTOR));
  }
  function parseOrder(el) {
    if (!el) return null;
    const raw = el.getAttribute("data-order") || "";
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return n;
    const text2 = (el.textContent || "").trim();
    const m = text2.match(/\d+/);
    if (m) return parseInt(m[0], 10);
    return null;
  }
  function getCurrentEl(container) {
    const root = container ?? getContainer();
    if (!root) return null;
    return root.querySelector(ACTIVE_SELECTOR);
  }
  function getProgressTotal(container) {
    const root = getContainer();
    if (!root) return null;
    const prog = root.querySelector(PROGRESS_SELECTOR);
    if (!prog) return null;
    const txt = (prog.textContent || "").replace(/\u00A0/g, " ").trim();
    const m = txt.match(/\/(\s*\d+)\s*题?/);
    if (m) {
      const n = parseInt(m[1].trim(), 10);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  }
  function scrollIntoView(el, smooth = true) {
    try {
      el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
    } catch {
      el.scrollIntoView();
    }
  }
  function goTo(order, opts) {
    const container = getContainer();
    if (!container) return false;
    const item = container.querySelector(`${ITEM_SELECTOR}[data-order="${order}"]`);
    if (!item) return false;
    scrollIntoView(item, opts?.smooth !== false);
    item.click();
    logger.info("goTo", order);
    return true;
  }
  async function waitForOrders(options = {}) {
    const { timeoutMs = 1e4, intervalMs = 300, useObserver = true, signal } = options;
    const first = getContainer();
    if (first && getItems(first).length > 0) return first;
    let resolved = false;
    let intervalId = null;
    let timeoutId = null;
    let observer = null;
    const stopAll = (el, resolve) => {
      if (resolved) return;
      resolved = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      resolve(el);
    };
    return new Promise((resolve) => {
      const tick = () => {
        const root = getContainer();
        if (!root) return;
        if (getItems(root).length > 0) stopAll(root, resolve);
      };
      intervalId = window.setInterval(tick, intervalMs);
      if (useObserver && typeof MutationObserver !== "undefined") {
        const target = document.body;
        observer = new MutationObserver(() => tick());
        observer.observe(target, { childList: true, subtree: true });
      }
      timeoutId = window.setTimeout(() => stopAll(null, resolve), timeoutMs);
      if (signal) {
        const onAbort = () => stopAll(null, resolve);
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
  const orderNav = {
    container: getContainer,
    list: () => getItems(),
    currentEl: getCurrentEl,
    current: () => parseOrder(getCurrentEl()),
    total: () => getProgressTotal() ?? (getItems().length || null),
    goTo,
    next: (opts) => {
      const total = orderNav.total();
      const cur = orderNav.current();
      const target = cur ? cur + 1 : 1;
      if (total && target > total) {
        if (opts?.loop) return orderNav.goTo(1, opts);
        return false;
      }
      return orderNav.goTo(target, opts);
    },
    prev: (opts) => {
      const total = orderNav.total();
      const cur = orderNav.current();
      const target = cur ? cur - 1 : 1;
      if (target < 1) {
        if (opts?.loop && total) return orderNav.goTo(total, opts);
        return false;
      }
      return orderNav.goTo(target, opts);
    },
    first: (opts) => orderNav.goTo(1, opts),
    last: (opts) => {
      const total = orderNav.total();
      if (!total) return false;
      return orderNav.goTo(total, opts);
    },
    wait: waitForOrders
  };
  const MAIN_SUBMIT_SELECTOR = "#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.problem-fixedbar > div > div:nth-child(2) > div > ul > li > span > button";
  const MAIN_QUESTION_EXACT = "#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.el-scrollbar > div.el-scrollbar__wrap.el-scrollbar__wrap--hidden-default > div > div";
  const CONFIGS = [
    {
      domain: "main",
      hostMatch: (h) => /(^|\.)changjiang\.yuketang\.cn$/.test(h),
      flags: {
        actionPanel: true,
        notepad: true,
        prompt: true,
        capture: true,
        orderNav: true,
        submitHotkey: true,
        questionExport: false
      },
      selectors: {
        submitButton: MAIN_SUBMIT_SELECTOR,
        questionContainerExact: MAIN_QUESTION_EXACT
      }
    },
    {
      domain: "exam",
      hostMatch: (h) => /(^|\.)changjiang-exam\.yuketang\.cn$/.test(h),
      flags: {
        actionPanel: true,
        notepad: true,
        prompt: true,
        capture: false,
orderNav: false,
        submitHotkey: true,
        questionExport: true
      },
      selectors: {
submitButton: MAIN_SUBMIT_SELECTOR,
        questionContainerExact: MAIN_QUESTION_EXACT
      }
    }
  ];
  function detectDomain(host = location.hostname) {
    const found = CONFIGS.find((c) => c.hostMatch(host));
    return found || {
      domain: "unknown",
      hostMatch: () => true,
      flags: {
        actionPanel: true,
        notepad: true,
        prompt: true,
        capture: false,
        orderNav: false,
        submitHotkey: false,
        questionExport: false
      }
    };
  }
  const OVERRIDE_PREFIX$1 = "CJ_AI_FLAGS_";
  function withOverrides(base) {
    try {
      const key = `${OVERRIDE_PREFIX$1}${base.domain}`;
      const raw = localStorage.getItem(key);
      if (!raw) return base;
      const patch = JSON.parse(raw);
      return {
        ...base,
        ...patch,
        flags: { ...base.flags, ...patch.flags || {} },
        selectors: { ...base.selectors, ...patch.selectors || {} }
      };
    } catch {
      return base;
    }
  }
  function getFeatureConfig(host = location.hostname) {
    return withOverrides(detectDomain(host));
  }
  function isEnabled(name) {
    const cfg2 = getFeatureConfig();
    return !!cfg2.flags[name];
  }
  function findQuestionElementHelper() {
    const EXACT_FALLBACK_SELECTOR = getFeatureConfig().selectors?.questionContainerExact || "#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.el-scrollbar > div.el-scrollbar__wrap.el-scrollbar__wrap--hidden-default > div > div";
    const SCORE_RE = /\(\s*\d+(?:\.\d+)?\s*分\s*\)/;
    const TYPE_RE = /\b\d+[\.、]?[\u3001、\s]*[\u4e00-\u9fa5]{1,6}题\b/;
    const normalizeText = (s) => (s ?? "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
    const isLikelyItemTypeText = (text2) => {
      const t = normalizeText(text2);
      return SCORE_RE.test(t) || TYPE_RE.test(t);
    };
    const isElementInViewport = (el) => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vertVisible = rect.top < vh && rect.bottom > 0;
      const horizVisible = rect.left < vw && rect.right > 0;
      return vertVisible && horizVisible;
    };
    const pickClosestToTop = (elements) => {
      if (elements.length === 0) return null;
      const scored = elements.map((el) => ({ el, top: Math.abs(el.getBoundingClientRect().top) }));
      scored.sort((a, b) => a.top - b.top);
      return scored[0].el;
    };
    const container = document.querySelector(".container-problem .el-scrollbar__view") || document.querySelector(".container-problem") || null;
    const itemTypeNodes = Array.from(
      (container ?? document).querySelectorAll('.subject-item .item-type, .item-type, [class*="item-type"]')
    );
    const viaTextMatched = itemTypeNodes.filter((n) => isLikelyItemTypeText(n.textContent || "")).map((n) => n.closest(".subject-item")).filter((n) => !!n);
    if (viaTextMatched.length > 0) {
      const visible = viaTextMatched.filter(isElementInViewport);
      if (visible.length > 0) return pickClosestToTop(visible);
      return pickClosestToTop(viaTextMatched);
    }
    const allSubjectItems = Array.from(
      (container ?? document).querySelectorAll(".subject-item")
    );
    if (allSubjectItems.length > 0) {
      const visible = allSubjectItems.filter(isElementInViewport);
      if (visible.length > 0) return pickClosestToTop(visible);
      return allSubjectItems[0] ?? null;
    }
    const exactFallback = document.querySelector(EXACT_FALLBACK_SELECTOR);
    if (exactFallback) return exactFallback;
    const fallbackContainer = document.querySelector("#app .container-problem .el-scrollbar__wrap") || document.querySelector(".viewContainer .container-problem") || document.querySelector("#app");
    if (fallbackContainer) {
      const blocks = Array.from(
        fallbackContainer.querySelectorAll(':scope > div, :scope > * > div, [class*="subject"], [class*="item"]')
      );
      const plausible = blocks.filter((el) => el.childElementCount > 0).filter((el) => el.getBoundingClientRect().height > 40).filter((el) => /subject|item/i.test(el.className));
      if (plausible.length > 0) {
        const visible = plausible.filter(isElementInViewport);
        if (visible.length > 0) return pickClosestToTop(visible);
        return plausible[0] ?? null;
      }
    }
    return null;
  }
  async function waitForQuestionElement(options = {}) {
    const { timeoutMs = 1e4, intervalMs = 300, useObserver = true, signal } = options;
    const first = findQuestionElementHelper();
    if (first) return first;
    logger.info("waitForQuestionElement: initial check did not find the element, start waiting...");
    let resolved = false;
    let intervalId = null;
    let timeoutId = null;
    let observer = null;
    const stopAll = (el, resolve) => {
      if (resolved) return;
      resolved = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (observer) observer.disconnect();
      resolve(el);
    };
    return new Promise((resolve) => {
      const tick = () => {
        const el = findQuestionElementHelper();
        if (el) stopAll(el, resolve);
      };
      intervalId = window.setInterval(tick, intervalMs);
      if (useObserver && typeof MutationObserver !== "undefined") {
        const target = document.querySelector(".container-problem .el-scrollbar__view") || document.querySelector(".container-problem") || document.body;
        observer = new MutationObserver(() => tick());
        observer.observe(target, { childList: true, subtree: true });
      }
      timeoutId = window.setTimeout(() => stopAll(null, resolve), timeoutMs);
      if (signal) {
        const onAbort = () => stopAll(null, resolve);
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }
  async function ensureHtml2Canvas() {
    if (typeof window !== "undefined" && typeof window.html2canvas === "function") return true;
    const id = "cj-ai-html2canvas";
    if (document.getElementById(id)) {
      for (let i = 0; i < 20; i++) {
        if (typeof window.html2canvas === "function") return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return typeof window.html2canvas === "function";
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.async = true;
    const p = new Promise((resolve) => {
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
    });
    document.head.appendChild(script);
    const ok = await p;
    if (!ok) logger.warn("Failed to load html2canvas from CDN");
    return ok;
  }
  async function captureElementToCanvas(el, opts = {}) {
    const ok = await ensureHtml2Canvas();
    if (!ok || !window.html2canvas) return null;
    const scale = opts.scale ?? (window.devicePixelRatio || 1);
    const backgroundColor = opts.backgroundColor ?? "#fff";
    try {
      const canvas = await window.html2canvas(el, {
        backgroundColor,
        scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight
      });
      return canvas;
    } catch (e) {
      logger.error("captureElementToCanvas failed", e);
      return null;
    }
  }
  async function captureElementToBlob(el, opts = {}) {
    const canvas = await captureElementToCanvas(el, opts);
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }
  async function ensureJSZip() {
    if (window.JSZip) return true;
    const id = "cjai-jszip";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
      s.async = true;
      document.head.appendChild(s);
    }
    for (let i = 0; i < 50; i++) {
      if (window.JSZip) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return !!window.JSZip;
  }
  async function downloadAsZip(files, zipName = "captures.zip") {
    const ok = await ensureJSZip();
    if (!ok || !window.JSZip) return false;
    const zip = new window.JSZip();
    for (const f of files) zip.file(f.name, f.blob);
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 8e3);
    }
  }
  async function downloadSequential(files, delayMs = 150) {
    for (const f of files) {
      const url = URL.createObjectURL(f.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 8e3);
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  async function downloadToDirectory(files) {
    const anyWin = window;
    if (!("showDirectoryPicker" in anyWin)) return false;
    try {
      const dir = await window.showDirectoryPicker();
      for (const f of files) {
        const handle = await dir.getFileHandle(f.name, { create: true });
        const writable = await handle.createWritable();
        await writable.write(f.blob);
        await writable.close();
      }
      return true;
    } catch {
      return false;
    }
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  async function waitUntil(predicate, options = {}) {
    const { timeoutMs = 1e4, intervalMs = 100, signal } = options;
    const start = Date.now();
    while (true) {
      if (signal?.aborted) return false;
      const ok = await predicate();
      if (ok) return true;
      if (Date.now() - start > timeoutMs) return false;
      await sleep(intervalMs);
    }
  }
  class QuestionCaptureRunner {
    constructor(options = {}) {
      this.options = options;
    }
    abort = new AbortController();
    running = false;
    stop() {
      if (this.running) {
        this.abort.abort();
        this.abort = new AbortController();
        this.running = false;
        logger.warn("Capture stopped");
      }
    }
    async captureOne(order) {
      if (!orderNav.goTo(order, { smooth: false })) {
        logger.warn("goTo failed", order);
        return false;
      }
      const okActive = await waitUntil(() => orderNav.current() === order, { timeoutMs: 8e3, intervalMs: 100 });
      if (!okActive) logger.warn("Wait active timed out for order", order);
      if (this.options.delayAfterNavigateMs ?? 200) await sleep(this.options.delayAfterNavigateMs ?? 200);
      const el = await waitForQuestionElement({ timeoutMs: 12e3, intervalMs: 250, signal: this.abort.signal });
      if (!el) {
        logger.error("Question element not found for order", order);
        return false;
      }
      const total = orderNav.total();
      const filename = this.options.filenamePattern ? this.options.filenamePattern(order, total) : `question-${String(order).padStart(3, "0")}.png`;
      try {
        el.scrollIntoView({ block: "nearest", behavior: "instant" });
      } catch {
      }
      const blob = await captureElementToBlob(el, this.options.screenshot);
      if (!blob) {
        logger.error("Capture failed for order", order);
        this.options.onCapture?.({ order, total: total ?? null, filename, blob: null, url: null, status: "error", createdAt: Date.now(), selected: false, error: "capture-failed" });
        return false;
      }
      const item = { order, total: total ?? null, filename, blob, url: null, status: "ok", createdAt: Date.now(), selected: true };
      this.options.onCapture?.(item);
      logger.success("Captured", filename);
      return true;
    }
    async captureAllFromCurrent() {
      if (this.running) {
        logger.warn("Capture already running");
        return;
      }
      this.running = true;
      try {
        await orderNav.wait({ timeoutMs: 15e3, intervalMs: 300, signal: this.abort.signal });
        const total = orderNav.total();
        const start = orderNav.current() ?? 1;
        if (!total || total <= 0) {
          logger.error("Total questions not detected");
          return;
        }
        logger.banner("Capture", `from ${start} to ${total}`);
        for (let i = start; i <= total; i++) {
          if (this.abort.signal.aborted) break;
          const ok = await this.captureOne(i);
          if (!ok) logger.warn("Capture failed at order", i);
        }
        logger.success("Capture finished");
      } finally {
        this.running = false;
      }
    }
  }
  const DEFAULTS = {
    id: "cjai-action-panel",
    title: "Action Panel",
    dock: "bottom-right",
    resizable: true,
    draggable: true,
    collapsed: false,
    zIndex: 999999,
    injectStyles: true
  };
  const STYLE_ID = "cjai-action-panel-style";
  function ensureStyles() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
  
  `;
  }
  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }
  function storageKey(id) {
    return `${id}:state`;
  }
  class ActionPanel {
    root;
    header;
    titleEl;
    tabsBar;
    contentWrap;
    contentEl;
    actionsEl;
    resizeHandle;
    opts;
    unsub = [];
    dragging = false;
    dragOffset = { x: 0, y: 0 };
    resizing = false;
    resizeStart = { w: 0, h: 0, x: 0, y: 0 };
    panes = new Map();
    constructor(options = {}) {
      const o = { ...DEFAULTS, ...options };
      this.opts = o;
      if (o.injectStyles) ensureStyles();
      const root = document.createElement("div");
      root.className = "cjai-panel";
      root.style.zIndex = String(o.zIndex);
      root.style.position = "fixed";
      const header = document.createElement("div");
      header.className = "cjai-panel__header";
      const titleEl = document.createElement("div");
      titleEl.className = "cjai-panel__title";
      titleEl.textContent = o.title || "Action Panel";
      const controls = document.createElement("div");
      controls.className = "cjai-panel__controls";
      const btnCollapse = document.createElement("button");
      btnCollapse.className = "cjai-btn";
      btnCollapse.title = "Collapse / Expand";
      btnCollapse.textContent = "—";
      const btnClose = document.createElement("button");
      btnClose.className = "cjai-btn";
      btnClose.title = "Close";
      btnClose.textContent = "×";
      controls.append(btnCollapse, btnClose);
      header.append(titleEl, controls);
      const body = document.createElement("div");
      body.className = "cjai-panel__body";
      const tabs = document.createElement("div");
      tabs.className = "cjai-tabs";
      const content = document.createElement("div");
      content.className = "cjai-panel__content";
      const controlsPane = document.createElement("div");
      controlsPane.className = "cjai-tabpane cjai-controls";
      controlsPane.dataset.active = "true";
      const contentArea = document.createElement("div");
      contentArea.className = "cjai-controls__content";
      const actions = document.createElement("div");
      actions.className = "cjai-controls__actions";
      controlsPane.append(contentArea, actions);
      content.append(controlsPane);
      body.append(tabs, content);
      const resize = document.createElement("div");
      resize.className = "cjai-resize";
      root.append(header, body, resize);
      this.root = root;
      this.header = header;
      this.titleEl = titleEl;
      this.tabsBar = tabs;
      this.contentWrap = content;
      this.contentEl = contentArea;
      this.actionsEl = actions;
      this.resizeHandle = resize;
      this.addTab({ id: "controls", label: "Controls", content: controlsPane, select: true });
      if (o.draggable) this.enableDragging();
      if (o.resizable) this.enableResizing();
      btnCollapse.addEventListener("click", () => this.setCollapsed(!this.isCollapsed()));
      btnClose.addEventListener("click", () => this.destroy());
      this.restoreState();
      if (options.position) this.setPosition(options.position.x, options.position.y);
      if (options.size) this.setSize(options.size.width, options.size.height);
      if (options.collapsed != null) this.setCollapsed(!!options.collapsed);
      (o.mount || document.body).appendChild(root);
    }
    saveState() {
      try {
        const rect = this.root.getBoundingClientRect();
        const state = {
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          collapsed: this.isCollapsed()
        };
        localStorage.setItem(storageKey(this.opts.id), JSON.stringify(state));
      } catch {
      }
    }
    restoreState() {
      const key = storageKey(this.opts.id);
      let state = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw) state = JSON.parse(raw);
      } catch {
      }
      const vw = window.innerWidth, vh = window.innerHeight;
      let { x, y } = state ?? { x: NaN, y: NaN };
      let { w, h } = state ?? { w: NaN, h: NaN };
      if (!Number.isFinite(w) || !Number.isFinite(h)) {
        w = 360;
        h = 240;
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const pad = 24;
        const dock = this.opts.dock;
        x = dock.includes("right") ? vw - w - pad : pad;
        y = dock.includes("bottom") ? vh - h - pad : pad;
      }
      this.setSize(w, h);
      this.setPosition(x, y);
      if (state?.collapsed ?? this.opts.collapsed) this.setCollapsed(true);
    }
    enableDragging() {
      const onDown = (ev) => {
        if (ev.target?.closest(".cjai-panel__controls")) return;
        this.dragging = true;
        const rect = this.root.getBoundingClientRect();
        this.dragOffset.x = ev.clientX - rect.left;
        this.dragOffset.y = ev.clientY - rect.top;
        this.root.style.transition = "none";
        ev.preventDefault();
      };
      const onMove = (ev) => {
        if (!this.dragging) return;
        const vw = window.innerWidth, vh = window.innerHeight;
        const width = this.root.getBoundingClientRect().width;
        const height = this.root.getBoundingClientRect().height;
        const x = clamp(ev.clientX - this.dragOffset.x, 0, vw - width);
        const y = clamp(ev.clientY - this.dragOffset.y, 0, vh - height);
        this.root.style.left = `${x}px`;
        this.root.style.top = `${y}px`;
      };
      const onUp = () => {
        if (this.dragging) {
          this.dragging = false;
          this.root.style.transition = "";
          this.saveState();
        }
      };
      this.header.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      this.root.addEventListener("mousedown", (e) => {
        if (!this.isCollapsed()) return;
        if (e.target.closest(".cjai-panel__controls")) return;
        onDown(e);
      });
      this.unsub.push(() => {
        this.header.removeEventListener("mousedown", onDown);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      });
    }
    enableResizing() {
      const handle = this.resizeHandle;
      const onDown = (ev) => {
        this.resizing = true;
        const rect = this.root.getBoundingClientRect();
        this.resizeStart = { w: rect.width, h: rect.height, x: ev.clientX, y: ev.clientY };
        this.root.style.transition = "none";
        ev.preventDefault();
      };
      const onMove = (ev) => {
        if (!this.resizing) return;
        const dx = ev.clientX - this.resizeStart.x;
        const dy = ev.clientY - this.resizeStart.y;
        const w = clamp(this.resizeStart.w + dx, 240, Math.min(window.innerWidth - 20, 800));
        const h = clamp(this.resizeStart.h + dy, 120, Math.min(window.innerHeight - 20, 800));
        this.setSize(w, h);
      };
      const onUp = () => {
        if (this.resizing) {
          this.resizing = false;
          this.root.style.transition = "";
          this.saveState();
        }
      };
      handle.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      this.unsub.push(() => {
        handle.removeEventListener("mousedown", onDown);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      });
    }
    isCollapsed() {
      return this.root.classList.contains("cjai-panel--collapsed");
    }
    setCollapsed(v) {
      this.root.classList.toggle("cjai-panel--collapsed", v);
      this.saveState();
    }
    setTitle(title) {
      this.titleEl.textContent = title;
    }
    setPosition(x, y) {
      const vw = window.innerWidth, vh = window.innerHeight;
      const rect = this.root.getBoundingClientRect();
      const width = rect.width || 360;
      const height = rect.height || 240;
      this.root.style.left = `${clamp(x, 0, vw - width)}px`;
      this.root.style.top = `${clamp(y, 0, vh - height)}px`;
      this.root.style.right = "auto";
      this.root.style.bottom = "auto";
    }
    setSize(width, height) {
      this.root.style.width = `${Math.max(240, width)}px`;
      this.root.style.height = `${Math.max(100, height)}px`;
    }
    mount(parent) {
      const p = parent || this.opts.mount || document.body;
      if (!this.root.parentElement) p.appendChild(this.root);
    }
    destroy() {
      this.unsub.forEach((fn) => {
        try {
          fn();
        } catch {
        }
      });
      this.unsub = [];
      this.root.remove();
    }
    clearActions() {
      this.actionsEl.innerHTML = "";
    }
    addAction(action) {
      const btn = document.createElement("button");
      btn.className = "cjai-btn" + (action.kind === "primary" ? " cjai-btn--primary" : action.kind === "danger" ? " cjai-btn--danger" : "");
      btn.textContent = action.label;
      if (action.tooltip) btn.title = action.tooltip;
      if (action.hotkey) {
        const chip = document.createElement("span");
        chip.className = "cjai-chip";
        chip.textContent = action.hotkey;
        btn.appendChild(chip);
      }
      btn.disabled = !!action.disabled;
      btn.addEventListener("click", () => action.onClick(this));
      btn.dataset.actionId = action.id;
      this.actionsEl.appendChild(btn);
    }
addTab({ id, label, content, select = false }) {
      if (this.panes.has(id)) return this.panes.get(id);
      const btn = document.createElement("button");
      btn.className = "cjai-tab";
      btn.type = "button";
      btn.textContent = label;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", `pane-${id}`);
      btn.setAttribute("aria-selected", "false");
      this.tabsBar.appendChild(btn);
      const pane = content ?? document.createElement("div");
      if (!content) pane.className = "cjai-tabpane";
      pane.id = `pane-${id}`;
      pane.dataset.active = "false";
      this.contentWrap.appendChild(pane);
      btn.addEventListener("click", () => this.selectTab(id));
      this.panes.set(id, pane);
      if (select) this.selectTab(id);
      this.tabsBar.style.display = this.tabsBar.childElementCount > 1 ? "flex" : "none";
      return pane;
    }
    selectTab(id) {
      for (const el of Array.from(this.tabsBar.querySelectorAll(".cjai-tab"))) {
        const selected = el.getAttribute("aria-controls") === `pane-${id}`;
        el.setAttribute("aria-selected", String(selected));
      }
      for (const [key, pane] of this.panes.entries()) {
        pane.dataset.active = String(key === id);
      }
    }
    getTabPane(id) {
      return this.panes.get(id) ?? null;
    }
    updateAction(id, patch) {
      const btn = this.actionsEl.querySelector(`button[data-action-id="${id}"]`);
      if (!btn) return;
      if (patch.label != null) btn.firstChild ? btn.firstChild.textContent = patch.label : btn.textContent = patch.label;
      if (patch.tooltip != null) btn.title = patch.tooltip || "";
      if (patch.disabled != null) btn.disabled = !!patch.disabled;
      if (patch.kind) {
        btn.classList.remove("cjai-btn--primary", "cjai-btn--danger");
        if (patch.kind === "primary") btn.classList.add("cjai-btn--primary");
        if (patch.kind === "danger") btn.classList.add("cjai-btn--danger");
      }
    }
setDoc(textOrEl) {
      this.contentEl.innerHTML = "";
      if (typeof textOrEl === "string") {
        const d = document.createElement("div");
        d.className = "cjai-doc";
        d.textContent = textOrEl;
        this.contentEl.appendChild(d);
      } else {
        this.contentEl.appendChild(textOrEl);
      }
    }
    setInfo(items) {
      this.contentEl.innerHTML = "";
      const list = Array.isArray(items) ? items : Object.entries(items).map(([k, v]) => ({ key: k, label: k, value: v }));
      for (const it of list) {
        const row = document.createElement("div");
        row.className = "cjai-info-item";
        const k = document.createElement("div");
        k.className = "cjai-info-key";
        k.textContent = it.label;
        const v = document.createElement("div");
        v.className = "cjai-info-value";
        if (it.value instanceof HTMLElement) v.appendChild(it.value);
        else v.textContent = String(it.value);
        if (it.tooltip) {
          k.title = it.tooltip;
          v.title = it.tooltip;
        }
        row.append(k, v);
        this.contentEl.appendChild(row);
      }
    }
  }
  class CaptureStore {
    items = [];
    listeners = new Set();
    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    emit() {
      for (const fn of this.listeners) try {
        fn();
      } catch {
      }
    }
    clear() {
      for (const it of this.items) {
        if (it.url) URL.revokeObjectURL(it.url);
      }
      this.items = [];
      this.emit();
    }
    list() {
      return this.items.slice().sort((a, b) => a.order - b.order);
    }
    get(order) {
      return this.items.find((x) => x.order === order);
    }
    upsert(partial) {
      const idx = this.items.findIndex((x) => x.order === partial.order);
      const base = idx >= 0 ? this.items[idx] : {
        order: partial.order,
        total: partial.total ?? null,
        filename: partial.filename || `question-${String(partial.order).padStart(3, "0")}.png`,
        blob: null,
        url: null,
        status: partial.status ?? "pending",
        createdAt: Date.now(),
        selected: true,
        error: void 0
      };
      const merged = { ...base, ...partial };
      if (merged.blob && merged.blob !== base.blob) {
        if (base.url) URL.revokeObjectURL(base.url);
        merged.url = URL.createObjectURL(merged.blob);
      }
      if (idx >= 0) this.items[idx] = merged;
      else this.items.push(merged);
      this.emit();
    }
    setSelected(order, v) {
      const it = this.get(order);
      if (!it) return;
      it.selected = v;
      this.emit();
    }
    selectAll(v) {
      for (const it of this.items) it.selected = v;
      this.emit();
    }
    toggle(order) {
      const it = this.get(order);
      if (!it) return;
      it.selected = !it.selected;
      this.emit();
    }
    selected() {
      return this.list().filter((x) => x.selected && x.status === "ok" && x.blob);
    }
  }
  class CaptureGallery {
    constructor(store2) {
      this.store = store2;
      const root = document.createElement("div");
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.height = "100%";
      root.style.gap = "8px";
      const toolbar = document.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.gap = "8px";
      toolbar.style.alignItems = "center";
      const btnSelectAll = this.btn("Select All", () => this.store.selectAll(true));
      const btnSelectNone = this.btn("Select None", () => this.store.selectAll(false));
      const btnClear = this.btn("Clear", () => this.store.clear());
      const btnZip = this.btn("Download Zip", () => this.downloadZip());
      const btnDir = this.btn("Save to Folder", () => this.saveToDir());
      const btnSeq = this.btn("Download Files", () => this.downloadSequential());
      toolbar.append(btnSelectAll, btnSelectNone, btnZip, btnDir, btnSeq, btnClear);
      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gridTemplateColumns = "repeat(auto-fill, minmax(160px, 1fr))";
      list.style.gap = "8px";
      list.style.overflow = "auto";
      list.style.padding = "2px";
      root.append(toolbar, list);
      this.el = root;
      this.listEl = list;
      this.store.subscribe(() => this.render());
      this.render();
    }
    el;
    listEl;
    btn(text2, onClick) {
      const b = document.createElement("button");
      b.textContent = text2;
      b.className = "cjai-btn";
      b.onclick = onClick;
      return b;
    }
    card(item) {
      const card = document.createElement("div");
      card.style.border = "1px solid var(--cjai-border)";
      card.style.borderRadius = "8px";
      card.style.overflow = "hidden";
      card.style.background = "var(--cjai-bg)";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "6px";
      card.style.padding = "6px";
      const head = document.createElement("div");
      head.style.display = "flex";
      head.style.alignItems = "center";
      head.style.justifyContent = "space-between";
      head.style.gap = "6px";
      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.gap = "6px";
      left.style.alignItems = "center";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.selected;
      cb.onchange = () => this.store.setSelected(item.order, cb.checked);
      const title = document.createElement("div");
      title.textContent = `#${item.order}`;
      left.append(cb, title);
      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.gap = "6px";
      const btnRetry = this.btn("Retry", () => this.retry(item.order));
      const btnView = this.btn("Open", () => {
        if (item.url) window.open(item.url, "_blank");
      });
      right.append(btnRetry, btnView);
      head.append(left, right);
      const imgWrap = document.createElement("div");
      imgWrap.style.aspectRatio = "4/3";
      imgWrap.style.overflow = "hidden";
      imgWrap.style.background = "rgba(0,0,0,0.03)";
      imgWrap.style.border = "1px solid var(--cjai-border)";
      imgWrap.style.borderRadius = "6px";
      if (item.url) {
        const img = document.createElement("img");
        img.src = item.url;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        imgWrap.appendChild(img);
      } else {
        imgWrap.textContent = item.status === "pending" ? "Pending…" : "No image";
        imgWrap.style.display = "grid";
        imgWrap.style.placeItems = "center";
      }
      const meta = document.createElement("div");
      meta.style.fontSize = "12px";
      meta.style.color = "var(--cjai-ink-muted)";
      meta.textContent = item.filename;
      card.append(head, imgWrap, meta);
      return card;
    }
    async retry(order) {
      logger.info("Retry capture", order);
      const ev = new CustomEvent("cjai:retry", { detail: { order } });
      window.dispatchEvent(ev);
    }
    selectedFiles() {
      return this.store.selected().map((x) => ({ name: x.filename, blob: x.blob }));
    }
    async downloadZip() {
      const files = this.selectedFiles();
      if (!files.length) return;
      const ok = await downloadAsZip(files, "captures.zip");
      if (!ok) logger.warn("Zip not available, try other download method");
    }
    async saveToDir() {
      const files = this.selectedFiles();
      if (!files.length) return;
      const ok = await downloadToDirectory(files);
      if (!ok) logger.warn("Cannot save to directory (unsupported or denied)");
    }
    async downloadSequential() {
      const files = this.selectedFiles();
      if (!files.length) return;
      await downloadSequential(files);
    }
    render() {
      this.listEl.innerHTML = "";
      for (const item of this.store.list()) {
        this.listEl.appendChild(this.card(item));
      }
    }
  }
  function text(el) {
    return (el?.textContent || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  }
  function findMainContainer() {
    return document.querySelector(".container-problem .el-scrollbar__view") || document.querySelector(".container-problem") || document;
  }
  function extractExamQuestions() {
    const root = findMainContainer();
    const items = Array.from(root.querySelectorAll(".subject-item"));
    if (items.length === 0) logger.warn("No .subject-item found when extracting JSON");
    const out = [];
    const seen = new Set();
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const typeEl = item.querySelector(".item-type");
      const typeText = text(typeEl);
      const m = /(\d+)\.(\S+)\s*\((\d+(?:\.\d+)?)分\)/.exec(typeText) || /(\d+)\s*[\.、]\s*(\S+).*?(\d+(?:\.\d+)?)\s*分/.exec(typeText);
      const id = m ? parseInt(m[1], 10) : index + 1;
      const type = m ? m[2] : "";
      const score = m ? Math.round(parseFloat(m[3]) * 100) / 100 : 0;
      const statusEl = item.querySelector(".status");
      const status = statusEl ? "已提交" : "未提交";
      const isFill = /填空/.test(typeText) || /填空/.test(type);
      let question = "";
      let blanks = 0;
      let fillAnswers = [];
      if (isFill) {
        const info = extractFillQuestion(item);
        question = info.question;
        blanks = info.blanks;
        fillAnswers = info.answers;
      } else {
        const h4 = item.querySelector(".item-body h4");
        if (h4) {
          const custom = h4.querySelector(".custom_ueditor_cn_body");
          if (custom) {
            const p = custom.querySelector("p");
            question = text(p || custom);
          } else {
            const p = h4.querySelector("p");
            question = text(p || h4);
          }
        } else {
          const rich = item.querySelector(".item-body .custom_ueditor_cn_body") || item.querySelector(".item-body");
          question = text(rich);
        }
      }
      const options = [];
      const radioLis = item.querySelectorAll(".list-unstyled-radio li");
      radioLis.forEach((li) => {
        const kEl = li.querySelector(".radioInput");
        let vEl = li.querySelector(".radioText .custom_ueditor_cn_body");
        if (!vEl) vEl = li.querySelector(".radioText");
        if (!kEl || !vEl) return;
        const p = vEl.querySelector("p");
        const value = text(p || vEl);
        const key = text(kEl);
        if (key) options.push({ key, value });
      });
      const checkboxLis = item.querySelectorAll(".list-unstyled-checkbox li");
      checkboxLis.forEach((li) => {
        const kEl = li.querySelector(".checkboxInput");
        let vEl = li.querySelector(".checkboxText .custom_ueditor_cn_body");
        if (!vEl) vEl = li.querySelector(".checkboxText");
        if (!kEl || !vEl) return;
        const value = text(vEl);
        const key = text(kEl);
        if (key) options.push({ key, value });
      });
      const judgeLis = item.querySelectorAll(".list-inline.list-unstyled-radio li");
      if (judgeLis.length === 2 && options.length === 0) {
        options.push({ key: "✓", value: "正确" });
        options.push({ key: "✗", value: "错误" });
      }
      let selected = null;
      const selectedRadio = item.querySelector(".el-radio.is-checked");
      if (selectedRadio) {
        const k = selectedRadio.querySelector(".radioInput");
        if (k) selected = text(k);
      }
      const selectedChecks = Array.from(item.querySelectorAll(".el-checkbox.is-checked"));
      if (selectedChecks.length > 0) {
        selected = [];
        for (const el of selectedChecks) {
          const k = el.querySelector(".checkboxInput");
          const t = text(k);
          if (t) selected.push(t);
        }
      }
      if (isFill) {
        const vals = fillAnswers.map((s) => s.trim()).filter((s) => s.length > 0);
        if (vals.length > 0) selected = vals;
      }
      const valid = question.trim() !== "" && type !== "" && score > 0;
      const dup = seen.has(id);
      if (!valid || dup) {
        logger.debug("Skip item", { id, valid, dup, typeText });
        continue;
      }
      seen.add(id);
      const q = { id, type, score, status, question, options, selected, rawTypeText: typeText };
      if (isFill) q.blanks = blanks;
      out.push(q);
    }
    logger.success("Extracted questions", out.length);
    return out;
  }
  function extractFillQuestion(item) {
    const body = item.querySelector(".item-body") || item;
    const inputs = Array.from(body.querySelectorAll('input.blank-item-dynamic, input[type="text"].blank-item-dynamic, input.blank-item, input[type="text"]'));
    const answers2 = inputs.map((i) => (i.value || "").trim());
    const container = body.querySelector(".exam-font") || body.querySelector(".custom_ueditor_cn_body") || body;
    let idx = 0;
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent || "").replace(/\u00A0/g, " ");
        parts.push(t);
        return;
      }
      if (!(node instanceof Element)) return;
      const el = node;
      if (el.tagName.toLowerCase() === "input" && el.type === "text") {
        idx += 1;
        parts.push(`【空${idx}】`);
        return;
      }
      const children = Array.from(el.childNodes);
      if (children.length === 0) return;
      for (const c of children) walk(c);
    };
    walk(container);
    let question = parts.join("");
    question = question.replace(/\s+/g, " ").replace(/\s([，。！？；,.!?])/g, "$1").trim();
    const blanks = Math.max(inputs.length, idx);
    return { question, blanks, answers: answers2 };
  }
  class AnswersStore {
    map = new Map();
    listeners = new Set();
    subscribe(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    emit() {
      for (const fn of this.listeners) try {
        fn();
      } catch {
      }
    }
    clear() {
      this.map.clear();
      this.emit();
    }
    setAll(items) {
      this.map.clear();
      for (const it of items) this.map.set(it.order, it);
      this.emit();
    }
    upsert(item) {
      this.map.set(item.order, item);
      this.emit();
    }
    get(order) {
      return this.map.get(order) || null;
    }
    list() {
      return Array.from(this.map.values()).sort((a, b) => a.order - b.order);
    }
    toJSON() {
      return {
        version: "1.0",
        answers: this.list().map((a) => ({
          order: a.order,
          type: a.type,
          choice: a.choices,
          answerText: a.text,
          explanation: a.explanation,
          confidence: a.confidence,
          source: a.source
        }))
      };
    }
  }
  function normalizeType(t) {
    if (!t) return "unknown";
    const s = String(t).toLowerCase();
    if (/(single|单选)/.test(s)) return "single";
    if (/(multiple|多选)/.test(s)) return "multiple";
    if (/(true|false|判断)/.test(s)) return "true_false";
    if (/(fill|填空)/.test(s)) return "fill";
    if (/(short|简答|问答)/.test(s)) return "short";
    return "unknown";
  }
  function normalizeAnswers(doc) {
    const parse = (input) => {
      if (typeof input === "string") return JSON.parse(input);
      return input;
    };
    const d = parse(doc);
    const out = [];
    const push = (raw, key) => {
      if (typeof raw === "string" || Array.isArray(raw)) {
        const order2 = typeof key === "string" ? parseInt(key, 10) : key;
        const text22 = Array.isArray(raw) ? raw.map(String) : [String(raw)];
        out.push({ order: order2, type: "unknown", choices: [], text: text22 });
        return;
      }
      const order = Number(raw.order ?? key);
      const type = normalizeType(raw.type);
      const choices = Array.isArray(raw.choice) ? raw.choice.map(String) : [];
      const text2 = raw.answerText == null ? [] : Array.isArray(raw.answerText) ? raw.answerText.map(String) : [String(raw.answerText)];
      out.push({
        order,
        type,
        choices,
        text: text2,
        explanation: raw.explanation,
        confidence: raw.confidence,
        source: raw.source
      });
    };
    const src = d.answers;
    if (Array.isArray(src)) {
      for (const r of src) push(r);
    } else if (src && typeof src === "object") {
      for (const [k, v] of Object.entries(src)) push(v, k);
    }
    return out.filter((x) => Number.isFinite(x.order));
  }
  const ANSWER_FORMAT_EXAMPLE = {
    version: "1.0",
    answers: [
      { order: 1, type: "single", choice: ["C"], explanation: "理由...", confidence: 0.93 },
      { order: 2, type: "multiple", choice: ["A", "D"], explanation: "理由...", confidence: 0.87 },
      { order: 3, type: "true_false", choice: ["T"], explanation: "True 为正确，False 为错误" },
      { order: 4, type: "fill", answerText: ["第一空内容", "第二空内容"] },
      { order: 5, type: "short", answerText: ["简答题作答要点 1", "要点 2"] }
    ],
    meta: { generator: "CJ-AI", ts: Date.now() }
  };
  const zhIntro = `你是一个严谨的答题助手。根据我提供的“按顺序排列”的题目截图，输出 JSON 答案。`;
  const zhRules = `
要求：
- 仅输出 JSON，不要解释或多余文本。
- \`order\` 从 1 开始，按我提供的题目顺序递增。
- 单选/多选：在 \`choice\` 字段中返回大写字母数组，例如 ["A"] 或 ["A","C"]。
- 判断题：\`choice\` 使用 ["T"] 或 ["F"] 表示对/错。
- 填空/简答：将文本答案拆分为数组，写入 \`answerText\`，每空或每行一个元素。
- 如果无法确定题型，\`type\` 可为 "unknown"。
- 可选：\`explanation\` 给出简要理由；\`confidence\` 给出 0~1 之间的置信度。
`;
  const enIntro = `You are a rigorous answering assistant. Given question screenshots in order, output answers as JSON.`;
  const enRules = `
Rules:
- Output JSON only. No extra words.
- \`order\` starts from 1 and follows the input order.
- Single/Multiple choice: return uppercase letters in \`choice\`, e.g., ["A"] or ["A","C"].
- True/False: use ["T"] or ["F"] in \`choice\`.
- Fill-in/Short: split text into an array in \`answerText\`, one blank/line per item.
- If unknown type, set \`type\` to "unknown".
- Optional: \`explanation\` for brief rationale; \`confidence\` in [0,1].
`;
  function buildBody(lang) {
    if (lang === "zh") return `${zhIntro}

${zhRules}`.trim();
    if (lang === "en") return `${enIntro}

${enRules}`.trim();
    return `${zhIntro}

${zhRules}

${enIntro}

${enRules}`.trim();
  }
  function buildAnswerPrompt(options = {}) {
    const lang = options.lang ?? "zh";
    const version = options.version ?? "1.0";
    const includeExample = options.includeExample ?? true;
    const example = options.customExample ?? ANSWER_FORMAT_EXAMPLE;
    const noteLines = (options.extraNotes ?? []).map((x) => `- ${x}`).join("\n");
    const body = buildBody(lang);
    const schemaHeader = lang === "en" ? "JSON Schema/Shape" : "JSON 形状与字段说明";
    const exampleHeader = lang === "en" ? "Example" : "示例";
    const endHeader = lang === "en" ? "Return JSON only" : "仅输出 JSON";
    const exampleStr = JSON.stringify(example, null, 2);
    return [
      body,
      noteLines && (lang === "en" ? "Notes:\n" : "注意：\n") + noteLines,
      `${schemaHeader} (version: ${version}):
{
  "version": "${version}",
  "answers": [
    {
      "order": 1,
      "type": "single | multiple | true_false | fill | short | unknown",
      "choice": ["A"],
      "answerText": ["string"],
      "explanation": "string",
      "confidence": 0.9,
      "source": "optional"
    }
  ]
}`,
      includeExample ? `${exampleHeader} (DO NOT COPY LITERALLY):
\`\`\`
${exampleStr}
\`\`\`` : "",
      `${endHeader}.`
    ].filter(Boolean).join("\n\n");
  }
  function tryParse(json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  function stringify(obj, minify) {
    try {
      return JSON.stringify(obj, null, minify ? void 0 : 2);
    } catch {
      return String(obj ?? "");
    }
  }
  function buildQuestionAnswerPrompt(questionsJson, opts = {}) {
    const lang = opts.lang ?? "zh";
    const base = buildAnswerPrompt({ lang, includeExample: opts.includeExample !== false, extraNotes: opts.extraNotes });
    const obj = typeof questionsJson === "string" ? tryParse(questionsJson) ?? questionsJson : questionsJson;
    const body = typeof obj === "string" ? obj : stringify(obj, opts.minifyJson !== false);
    const header = lang === "en" ? "Questions JSON (in order):" : "按顺序排列的题目 JSON：";
    const prompt = `${base}

${header}

\`\`\`json
${body}
\`\`\``;
    if (!opts.maxChars) return prompt;
    if (prompt.length <= opts.maxChars) return prompt;
    const compact = (() => {
      if (typeof obj === "string") return prompt;
      const compactBody = stringify(obj, true);
      const p = `${base}

${header}

\`\`\`json
${compactBody}
\`\`\``;
      return p;
    })();
    if (compact.length <= (opts.maxChars || 0)) return compact;
    const clippedBody = body.slice(0, Math.max(0, (opts.maxChars || 0) - base.length - header.length - 32)) + "\n/* clipped */";
    return `${base}

${header}

\`\`\`json
${clippedBody}
\`\`\``;
  }
  class JsonExtractorPanel {
    el;
    textarea;
    btnScan;
    btnCopy;
    btnDownload;
    btnCopyPrompt;
    langSelect;
    includeExample;
    minifyJson;
    status;
    constructor() {
      const root = document.createElement("div");
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.height = "100%";
      root.style.gap = "8px";
      const bar = document.createElement("div");
      bar.style.display = "flex";
      bar.style.gap = "8px";
      bar.style.alignItems = "center";
      bar.style.border = "1px solid var(--cjai-border)";
      bar.style.borderRadius = "8px";
      bar.style.padding = "6px";
      const btnScan = document.createElement("button");
      btnScan.className = "cjai-btn cjai-btn--primary";
      btnScan.textContent = "Scan Page";
      const btnCopy = document.createElement("button");
      btnCopy.className = "cjai-btn";
      btnCopy.textContent = "Copy JSON";
      const btnDownload = document.createElement("button");
      btnDownload.className = "cjai-btn";
      btnDownload.textContent = "Download";
      const btnPrompt = document.createElement("button");
      btnPrompt.className = "cjai-btn";
      btnPrompt.textContent = "Copy Prompt";
      const lang = document.createElement("select");
      lang.className = "cjai-btn";
      const optZh = document.createElement("option");
      optZh.value = "zh";
      optZh.textContent = "中文";
      const optEn = document.createElement("option");
      optEn.value = "en";
      optEn.textContent = "English";
      const optBoth = document.createElement("option");
      optBoth.value = "zh-en";
      optBoth.textContent = "中英";
      lang.append(optZh, optEn, optBoth);
      lang.value = "zh";
      const exLabel = document.createElement("label");
      exLabel.style.display = "inline-flex";
      exLabel.style.alignItems = "center";
      exLabel.style.gap = "4px";
      const chkExample = document.createElement("input");
      chkExample.type = "checkbox";
      chkExample.checked = true;
      const exTxt = document.createElement("span");
      exTxt.textContent = "Example";
      exLabel.append(chkExample, exTxt);
      const minLabel = document.createElement("label");
      minLabel.style.display = "inline-flex";
      minLabel.style.alignItems = "center";
      minLabel.style.gap = "4px";
      const chkMin = document.createElement("input");
      chkMin.type = "checkbox";
      chkMin.checked = true;
      const minTxt = document.createElement("span");
      minTxt.textContent = "Minify";
      minLabel.append(chkMin, minTxt);
      const status = document.createElement("div");
      status.style.marginLeft = "auto";
      status.style.fontSize = "12px";
      status.style.color = "var(--cjai-ink-muted)";
      bar.append(btnScan, btnCopy, btnDownload, btnPrompt, lang, exLabel, minLabel, status);
      const ta = document.createElement("textarea");
      ta.style.flex = "1";
      ta.style.width = "100%";
      ta.style.resize = "none";
      ta.style.border = "1px solid var(--cjai-border)";
      ta.style.borderRadius = "8px";
      ta.style.padding = "8px";
      root.append(bar, ta);
      this.el = root;
      this.textarea = ta;
      this.btnScan = btnScan;
      this.btnCopy = btnCopy;
      this.btnDownload = btnDownload;
      this.btnCopyPrompt = btnPrompt;
      this.langSelect = lang;
      this.includeExample = chkExample;
      this.minifyJson = chkMin;
      this.status = status;
      this.btnScan.onclick = () => this.scan();
      this.btnCopy.onclick = () => this.copy();
      this.btnDownload.onclick = () => this.download();
      this.btnCopyPrompt.onclick = () => this.copyPrompt();
    }
    setStatus(msg, ok = true) {
      this.status.textContent = msg;
      this.status.style.color = ok ? "var(--cjai-ink-muted)" : "#e11d48";
    }
    update(json) {
      this.textarea.value = json;
    }
    scan() {
      try {
        const data = extractExamQuestions();
        if (!data.length) {
          this.setStatus("No questions found", false);
          return;
        }
        const json = JSON.stringify(data, null, 2);
        this.update(json);
        this.setStatus(`Extracted ${data.length} questions`);
      } catch (e) {
        logger.error("Scan failed", e);
        this.setStatus("Scan failed", false);
      }
    }
    async copy() {
      try {
        await navigator.clipboard.writeText(this.textarea.value);
        this.setStatus("Copied");
      } catch {
        this.setStatus("Copy failed", false);
      }
    }
    download() {
      try {
        const blob = new Blob([this.textarea.value || "[]"], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "questions.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 8e3);
        this.setStatus("Downloaded");
      } catch {
        this.setStatus("Download failed", false);
      }
    }
    async copyPrompt() {
      const txt = this.textarea.value.trim();
      if (!txt) {
        this.setStatus("No JSON", false);
        return;
      }
      try {
        const prompt = buildQuestionAnswerPrompt(txt, {
          lang: this.langSelect.value,
          includeExample: this.includeExample.checked,
          minifyJson: this.minifyJson.checked,
          extraNotes: [
            "请严格依题目顺序（order 从 1 开始）。",
            "如题目为填空题，按空序填写 answerText 数组。"
          ]
        });
        await navigator.clipboard.writeText(prompt);
        this.setStatus("Prompt copied");
      } catch (e) {
        logger.error("Copy prompt failed", e);
        this.setStatus("Copy prompt failed", false);
      }
    }
  }
  class Notepad {
    constructor(store2) {
      this.store = store2;
      const root = document.createElement("div");
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.height = "100%";
      root.style.gap = "8px";
      const toolbar = document.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.gap = "8px";
      toolbar.style.alignItems = "center";
      toolbar.style.border = "1px solid var(--cjai-border)";
      toolbar.style.borderRadius = "8px";
      toolbar.style.padding = "6px";
      const btnPrompt = document.createElement("button");
      btnPrompt.className = "cjai-btn cjai-btn--primary";
      btnPrompt.textContent = "Copy Prompt";
      const btnParse = document.createElement("button");
      btnParse.className = "cjai-btn";
      btnParse.textContent = "Parse JSON";
      const lang = document.createElement("select");
      lang.className = "cjai-btn";
      const optZh = document.createElement("option");
      optZh.value = "zh";
      optZh.textContent = "中文";
      const optEn = document.createElement("option");
      optEn.value = "en";
      optEn.textContent = "English";
      const optBoth = document.createElement("option");
      optBoth.value = "zh-en";
      optBoth.textContent = "中英";
      lang.append(optZh, optEn, optBoth);
      lang.value = "zh";
      const chk = document.createElement("label");
      chk.style.display = "inline-flex";
      chk.style.alignItems = "center";
      chk.style.gap = "4px";
      const includeExample = document.createElement("input");
      includeExample.type = "checkbox";
      includeExample.checked = true;
      const chkText = document.createElement("span");
      chkText.textContent = "Example";
      chk.append(includeExample, chkText);
      const status = document.createElement("div");
      status.style.marginLeft = "auto";
      status.style.fontSize = "12px";
      status.style.color = "var(--cjai-ink-muted)";
      const btnToggle = document.createElement("button");
      btnToggle.className = "cjai-btn";
      btnToggle.textContent = "Hide Input";
      toolbar.append(btnPrompt, lang, chk, btnParse, btnToggle, status);
      const inputWrap = document.createElement("div");
      inputWrap.style.display = "block";
      const area = document.createElement("textarea");
      area.placeholder = "粘贴答题器输出的 JSON（见示例格式）";
      area.style.width = "100%";
      area.style.height = "120px";
      area.style.border = "1px solid var(--cjai-border)";
      area.style.borderRadius = "8px";
      area.style.padding = "8px";
      area.spellcheck = false;
      inputWrap.appendChild(area);
      const list = document.createElement("div");
      list.style.flex = "1";
      list.style.overflow = "auto";
      list.style.border = "1px solid var(--cjai-border)";
      list.style.borderRadius = "8px";
      list.style.padding = "8px";
      root.append(toolbar, inputWrap, list);
      this.el = root;
      this.input = area;
      this.btnParse = btnParse;
      this.btnPrompt = btnPrompt;
      this.langSelect = lang;
      this.includeExample = includeExample;
      this.list = list;
      this.status = status;
      this.btnToggleInput = btnToggle;
      this.inputWrap = inputWrap;
      this.btnParse.onclick = () => this.parse();
      this.btnPrompt.onclick = () => this.copyPrompt();
      this.btnToggleInput.onclick = () => this.setInputCollapsed(!this.collapsed);
      this.store.subscribe(() => this.render());
      this.render();
    }
    el;
    input;
    btnParse;
    btnPrompt;
    langSelect;
    includeExample;
    list;
    status;
    btnToggleInput;
    inputWrap;
    collapsed = false;
    highlightedOrder = null;
    setStatus(msg, ok = true) {
      this.status.textContent = msg;
      this.status.style.color = ok ? "var(--cjai-ink-muted)" : "#e11d48";
    }
    async copy(text2) {
      try {
        await navigator.clipboard.writeText(text2);
        this.setStatus("Copied");
      } catch {
        this.setStatus("Copy failed", false);
      }
    }
    async copyPrompt() {
      const opts = {
        lang: this.langSelect.value ?? "zh",
        includeExample: this.includeExample.checked
      };
      const text2 = buildAnswerPrompt(opts);
      await this.copy(text2);
    }
    setInputCollapsed(v) {
      this.collapsed = v;
      this.inputWrap.style.display = v ? "none" : "block";
      this.btnToggleInput.textContent = v ? "Show Input" : "Hide Input";
    }
    setCurrentOrder(order) {
      this.highlightedOrder = order ?? null;
      for (const el of Array.from(this.list.querySelectorAll("[data-order]"))) {
        const o = Number(el.dataset.order);
        el.style.background = this.highlightedOrder === o ? "rgba(17, 17, 17, 0.06)" : "transparent";
        el.style.borderRadius = "6px";
      }
      if (order != null) this.scrollToOrder(order);
    }
    scrollToOrder(order) {
      const row = this.list.querySelector(`[data-order="${order}"]`);
      if (!row) return;
      const parent = this.list;
      const pr = parent.getBoundingClientRect();
      const rr = row.getBoundingClientRect();
      if (rr.top < pr.top || rr.bottom > pr.bottom) {
        row.scrollIntoView({ block: "center" });
      }
    }
    badge(text2) {
      const span = document.createElement("span");
      span.textContent = text2;
      span.style.fontSize = "11px";
      span.style.border = "1px solid var(--cjai-border)";
      span.style.padding = "2px 6px";
      span.style.borderRadius = "999px";
      span.style.marginLeft = "6px";
      span.style.color = "var(--cjai-ink-muted)";
      return span;
    }
    render() {
      this.list.innerHTML = "";
      const data = this.store.list();
      if (!data.length) {
        const p = document.createElement("div");
        p.textContent = "暂无答案，请粘贴 JSON 并解析";
        this.list.appendChild(p);
        return;
      }
      for (const a of data) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.flexDirection = "column";
        row.style.gap = "4px";
        row.style.padding = "8px 6px";
        row.style.borderBottom = "1px dashed var(--cjai-border)";
        row.dataset.order = String(a.order);
        const head = document.createElement("div");
        head.style.display = "flex";
        head.style.alignItems = "center";
        head.style.gap = "6px";
        const title = document.createElement("div");
        title.textContent = `#${a.order}`;
        title.style.fontWeight = "600";
        const type = this.badge(a.type);
        if (a.confidence != null) head.append(title, type, this.badge(`${Math.round(a.confidence * 100)}%`));
        else head.append(title, type);
        const ans = document.createElement("div");
        ans.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        if (a.choices.length) ans.textContent = `Choice: ${a.choices.join(", ")}`;
        else if (a.text.length) ans.textContent = `Text: ${a.text.join(" | ")}`;
        else ans.textContent = "(empty)";
        const explain = document.createElement("div");
        explain.style.whiteSpace = "pre-wrap";
        explain.style.color = "var(--cjai-ink-muted)";
        explain.textContent = a.explanation || "";
        row.append(head, ans, explain);
        this.list.appendChild(row);
      }
      if (this.highlightedOrder != null) this.setCurrentOrder(this.highlightedOrder);
    }
afterParseSuccess(count) {
      this.setStatus(`Parsed ${count} answers`);
      this.setInputCollapsed(true);
    }
parse() {
      const raw = this.input.value.trim();
      if (!raw) {
        this.setStatus("No input");
        return;
      }
      try {
        const items = normalizeAnswers(raw);
        this.store.setAll(items);
        this.afterParseSuccess(items.length);
      } catch (e) {
        logger.error("Parse notepad JSON failed", e);
        this.setStatus("JSON parse error", false);
      }
    }
  }
  var _GM_info = (() => typeof GM_info != "undefined" ? GM_info : void 0)();
  function hasText(el, text2) {
    const t = (el.textContent || "").replace(/\s+/g, " ").trim();
    return t.includes(text2);
  }
  function findSubmitButton() {
    const cfg2 = getFeatureConfig();
    const exactSelector = cfg2.selectors?.submitButton;
    const exact = exactSelector ? document.querySelector(exactSelector) : null;
    if (exact) return exact;
    const fixedbar = document.querySelector(".container-problem .problem-fixedbar") || document.querySelector(".problem-fixedbar");
    if (fixedbar) {
      const buttons = Array.from(fixedbar.querySelectorAll("button"));
      const byText = buttons.find((b) => hasText(b, "提交"));
      if (byText) return byText;
      const primary = buttons.find((b) => b.className.includes("el-button--primary"));
      if (primary) return primary;
    }
    const anyBtn = Array.from(document.querySelectorAll("button")).find((b) => hasText(b, "提交"));
    if (anyBtn) return anyBtn;
    return null;
  }
  function clickSubmit() {
    const btn = findSubmitButton();
    if (!btn) {
      logger.warn("Submit button not found");
      return false;
    }
    try {
      btn.focus();
      btn.click();
      logger.success("Triggered submit");
      return true;
    } catch (e) {
      logger.error("Submit click failed", e);
      return false;
    }
  }
  const OVERRIDE_PREFIX = "CJ_AI_FLAGS_";
  function createSwitch(checked) {
    const label = document.createElement("label");
    label.className = "cjai-switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    const slider = document.createElement("span");
    slider.className = "cjai-switch__slider";
    label.append(input, slider);
    return { el: label, input };
  }
  class FeatureFlagsWidget {
    el;
    toggles = new Map();
    base = detectDomain();
    eff = getFeatureConfig();
    status;
    constructor() {
      const root = document.createElement("div");
      root.className = "cjai-section";
      const title = document.createElement("div");
      title.className = "cjai-section__title";
      title.textContent = "Feature Flags | 特性开关";
      const description = document.createElement("div");
      description.className = "cjai-section__description";
      description.textContent = "启用或禁用实验性功能，一般情况下并不需要修改此设置，功能会随着作用域自动更新。";
      const meta = document.createElement("div");
      meta.style.fontSize = "12px";
      meta.style.color = "var(--cjai-ink-muted)";
      meta.textContent = `Domain: ${this.base.domain}  •  Host: ${location.hostname}`;
      const rows = document.createElement("div");
      rows.className = "cjai-rows";
      for (const [k, v] of Object.entries(this.eff.flags)) {
        const row = document.createElement("div");
        row.className = "cjai-row";
        const label = document.createElement("div");
        label.className = "cjai-row__label";
        label.textContent = k;
        const sw = createSwitch(!!v);
        row.append(label, sw.el);
        rows.appendChild(row);
        this.toggles.set(k, sw.input);
      }
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      actions.style.marginTop = "8px";
      const btnApply = document.createElement("button");
      btnApply.className = "cjai-btn cjai-btn--primary";
      btnApply.textContent = "Apply";
      const btnReset = document.createElement("button");
      btnReset.className = "cjai-btn";
      btnReset.textContent = "Reset";
      const btnReload = document.createElement("button");
      btnReload.className = "cjai-btn";
      btnReload.textContent = "Reload";
      const status = document.createElement("div");
      status.style.marginLeft = "auto";
      status.style.fontSize = "12px";
      status.style.color = "var(--cjai-ink-muted)";
      actions.append(btnApply, btnReset, btnReload, status);
      root.append(title, description, meta, rows, actions);
      this.el = root;
      this.status = status;
      btnApply.onclick = () => this.apply();
      btnReset.onclick = () => this.reset();
      btnReload.onclick = () => location.reload();
    }
    setStatus(msg, ok = true) {
      this.status.textContent = msg;
      this.status.style.color = ok ? "var(--cjai-ink-muted)" : "#e11d48";
    }
    apply() {
      try {
        const baseFlags = this.base.flags;
        const next = {};
        let changed = false;
        for (const [k, input] of this.toggles.entries()) {
          const val = !!input.checked;
          next[k] = val;
          if (baseFlags[k] !== val) changed = true;
        }
        const key = `${OVERRIDE_PREFIX}${this.base.domain}`;
        if (!changed) {
          localStorage.removeItem(key);
          this.setStatus("No changes (overrides cleared)");
        } else {
          localStorage.setItem(key, JSON.stringify({ flags: next }));
          this.setStatus("Overrides saved. Reload to take effect.");
        }
      } catch (e) {
        logger.error("Apply flags failed", e);
        this.setStatus("Apply failed", false);
      }
    }
    reset() {
      try {
        const key = `${OVERRIDE_PREFIX}${this.base.domain}`;
        localStorage.removeItem(key);
        for (const [k, input] of this.toggles.entries()) {
          input.checked = !!this.base.flags[k];
        }
        this.setStatus("Overrides cleared");
      } catch (e) {
        logger.error("Reset flags failed", e);
        this.setStatus("Reset failed", false);
      }
    }
  }
  const cfg = getFeatureConfig();
  const store = new CaptureStore();
  const answers = new AnswersStore();
  const runner = new QuestionCaptureRunner({
    delayAfterNavigateMs: 200,
    screenshot: { scale: Math.max(2, window.devicePixelRatio || 1), backgroundColor: "#fff" },
    onCapture: (item) => store.upsert(item)
  });
  const CJAI = {
    nav: orderNav,
    waitForQuestionElement,
    runner,
    start: () => runner.captureAllFromCurrent(),
    stop: () => runner.stop(),
    one: (order) => runner.captureOne(order),
    store,
    answers,
    importAnswers: (doc) => {
      const arr = normalizeAnswers(doc);
      answers.setAll(arr);
      return arr.length;
    },
    features: cfg
  };
  window.CJAI = CJAI;
  logger.banner("Injected", "CJ-AI ready");
  logger.info("Use in console:", "CJAI.start()", "CJAI.stop()", "CJAI.one(n)");
  const panel = new ActionPanel({ id: "cjai-panel", title: "CJ Capture", dock: "bottom-right" });
  {
    const infoWrap = document.createElement("div");
    const doc = document.createElement("div");
    doc.className = "cjai-section";
    const docTitle = document.createElement("div");
    docTitle.className = "cjai-section__title";
    docTitle.textContent = "About";
    const docBody = document.createElement("div");
    docBody.className = "cjai-doc";
    docBody.textContent = `Author: wibus
Version: ${_GM_info.script.version}
Namespace: ${_GM_info.script.namespace}

快速截取题目用于 AI 辅助答题，长江雨课堂在字体文件上做了防爬虫处理，普通复制黏贴无法获得正确的文字渲染。同时，该插件提供了 Notepad/Extract 等工具。`;
    doc.append(docTitle, docBody);
    const flags = new FeatureFlagsWidget();
    infoWrap.append(doc, flags.el);
    panel.setDoc(infoWrap);
  }
  panel.clearActions();
  if (isEnabled("capture")) {
    panel.addAction({ id: "start", label: "Start", kind: "primary", tooltip: "Capture all from current", hotkey: "S", onClick: () => CJAI.start() });
    panel.addAction({ id: "stop", label: "Stop", kind: "danger", tooltip: "Stop capture", hotkey: "X", onClick: () => CJAI.stop() });
  }
  if (isEnabled("orderNav")) {
    panel.addAction({ id: "prev", label: "Prev", tooltip: "Go to previous", hotkey: "A", onClick: () => {
      orderNav.prev();
    } });
    panel.addAction({ id: "next", label: "Next", tooltip: "Go to next", hotkey: "D", onClick: () => {
      orderNav.next();
    } });
  }
  if (isEnabled("capture")) {
    const previewPane = panel.addTab({ id: "preview", label: "Preview" });
    const gallery = new CaptureGallery(store);
    previewPane.appendChild(gallery.el);
  }
  const notepadPane = panel.addTab({ id: "notepad", label: "Notepad" });
  const notepad = new Notepad(answers);
  notepadPane.appendChild(notepad.el);
  if (isEnabled("questionExport")) {
    const extractPane = panel.addTab({ id: "extract", label: "Extract" });
    const extractor = new JsonExtractorPanel();
    extractPane.appendChild(extractor.el);
  }
  if (isEnabled("orderNav")) {
    let lastOrder = null;
    setInterval(() => {
      try {
        const cur = orderNav.current();
        if (cur && cur !== lastOrder) {
          lastOrder = cur;
          notepad.setCurrentOrder(cur);
        }
      } catch {
      }
    }, 600);
  }
  if (isEnabled("capture")) {
    window.addEventListener("cjai:retry", (ev) => {
      const order = Number(ev?.detail?.order);
      if (!order) return;
      runner.captureOne(order);
    });
  }
  if (isEnabled("submitHotkey")) {
    window.addEventListener("keydown", (ev) => {
      const isMeta = ev.metaKey;
      const isCtrl = ev.ctrlKey;
      if ((isMeta || isCtrl) && !ev.shiftKey && !ev.altKey) {
        const key = ev.key?.toLowerCase();
        if (key === "g") {
          const target = ev.target;
          const tag = (target?.tagName || "").toLowerCase();
          const editable = target && (tag === "input" || tag === "textarea" || target.isContentEditable);
          if (!editable) {
            ev.preventDefault();
            clickSubmit();
          }
        }
      }
    });
  }

})();