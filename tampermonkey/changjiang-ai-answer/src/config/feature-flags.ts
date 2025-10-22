export type DomainKey = 'main' | 'exam' | 'doubao' | 'unknown';

export type FeatureName =
  | 'actionPanel'
  | 'notepad'
  | 'prompt'
  | 'capture' // capture runner + preview gallery
  | 'orderNav'
  | 'submitHotkey'
  | 'questionExport'
  | 'doubaoBridge';

export interface FeatureConfig {
  domain: DomainKey;
  hostMatch: (host: string) => boolean;
  flags: Record<FeatureName, boolean>;
  selectors?: {
    submitButton?: string;
    questionContainerExact?: string;
  };
}

const MAIN_SUBMIT_SELECTOR =
  '#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.problem-fixedbar > div > div:nth-child(2) > div > ul > li > span > button';
const MAIN_QUESTION_EXACT =
  '#app > div.viewContainer > div > div > div.container > div > div > div.container-problem > div.el-scrollbar > div.el-scrollbar__wrap.el-scrollbar__wrap--hidden-default > div > div';

const CONFIGS: FeatureConfig[] = [
  {
    domain: 'main',
    hostMatch: (h) => /(^|\.)changjiang\.yuketang\.cn$/.test(h),
    flags: {
      actionPanel: true,
      notepad: true,
      prompt: true,
      capture: true,
      orderNav: true,
      submitHotkey: true,
      questionExport: false,
      doubaoBridge: true,
    },
    selectors: {
      submitButton: MAIN_SUBMIT_SELECTOR,
      questionContainerExact: MAIN_QUESTION_EXACT,
    },
  },
  {
    domain: 'doubao',
    hostMatch: (h) => /(^|\.)doubao\.com$/.test(h),
    flags: {
      actionPanel: false, // hide panel on doubao
      notepad: false,
      prompt: false,
      capture: false,
      orderNav: false,
      submitHotkey: false,
      questionExport: false,
      doubaoBridge: true, // only bridge host
    },
  },
  {
    domain: 'exam',
    hostMatch: (h) => /(^|\.)changjiang-exam\.yuketang\.cn$/.test(h),
    flags: {
      actionPanel: true,
      notepad: true,
      prompt: true,
      capture: false, // default off; can be overridden at runtime
      orderNav: false,
      submitHotkey: true,
      questionExport: true,
      doubaoBridge: false,
    },
    selectors: {
      // reuse defaults unless overridden later
      submitButton: MAIN_SUBMIT_SELECTOR,
      questionContainerExact: MAIN_QUESTION_EXACT,
    },
  },
];

export function detectDomain(host = location.hostname): FeatureConfig {
  const found = CONFIGS.find((c) => c.hostMatch(host));
  return (
    found || {
      domain: 'unknown',
      hostMatch: () => true,
      flags: {
        actionPanel: true,
        notepad: true,
        prompt: true,
        capture: false,
        orderNav: false,
        submitHotkey: false,
        questionExport: false,
        doubaoBridge: false,
      },
    }
  );
}

const OVERRIDE_PREFIX = 'CJ_AI_FLAGS_';

export function withOverrides(base: FeatureConfig): FeatureConfig {
  try {
    const key = `${OVERRIDE_PREFIX}${base.domain}`;
    const raw = localStorage.getItem(key);
    if (!raw) return base;
    const patch = JSON.parse(raw) as Partial<FeatureConfig> & { flags?: Partial<Record<FeatureName, boolean>> };
    return {
      ...base,
      ...patch,
      flags: { ...base.flags, ...(patch.flags || {}) },
      selectors: { ...base.selectors, ...(patch.selectors || {}) },
    };
  } catch {
    return base;
  }
}

export function getFeatureConfig(host = location.hostname): FeatureConfig {
  return withOverrides(detectDomain(host));
}

export function isEnabled(name: FeatureName): boolean {
  const cfg = getFeatureConfig();
  return !!cfg.flags[name];
}

export default getFeatureConfig;
