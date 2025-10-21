export type AnswerType = 'single' | 'multiple' | 'true_false' | 'fill' | 'short' | 'unknown';

export interface RawAnswerItem {
  order: number; // 1-based index mapping to sidebar order
  type?: AnswerType | string;
  choice?: string[]; // e.g. ["A"], or ["A","C"] for multiple
  answerText?: string | string[]; // for fill/short
  explanation?: string;
  confidence?: number; // 0..1
  source?: string; // model/run id
}

export interface AnswerDoc {
  version: string | number;
  answers: RawAnswerItem[] | Record<string | number, RawAnswerItem | string | string[]>;
  meta?: Record<string, unknown>;
}

export interface AnswerItemNormalized {
  order: number;
  type: AnswerType;
  choices: string[]; // normalized A/B/C etc.
  text: string[]; // normalized text lines for fill/short
  explanation?: string;
  confidence?: number;
  source?: string;
}

type Listener = () => void;

export class AnswersStore {
  private map = new Map<number, AnswerItemNormalized>();
  private listeners = new Set<Listener>();

  subscribe(fn: Listener) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit() { for (const fn of this.listeners) try { fn(); } catch {} }

  clear() { this.map.clear(); this.emit(); }

  setAll(items: AnswerItemNormalized[]) {
    this.map.clear();
    for (const it of items) this.map.set(it.order, it);
    this.emit();
  }

  upsert(item: AnswerItemNormalized) { this.map.set(item.order, item); this.emit(); }

  get(order: number) { return this.map.get(order) || null; }
  list(): AnswerItemNormalized[] { return Array.from(this.map.values()).sort((a,b) => a.order - b.order); }

  toJSON(): AnswerDoc {
    return {
      version: '1.0',
      answers: this.list().map((a) => ({
        order: a.order,
        type: a.type,
        choice: a.choices,
        answerText: a.text,
        explanation: a.explanation,
        confidence: a.confidence,
        source: a.source,
      })),
    };
  }
}

export function normalizeType(t?: string): AnswerType {
  if (!t) return 'unknown';
  const s = String(t).toLowerCase();
  if (/(single|单选)/.test(s)) return 'single';
  if (/(multiple|多选)/.test(s)) return 'multiple';
  if (/(true|false|判断)/.test(s)) return 'true_false';
  if (/(fill|填空)/.test(s)) return 'fill';
  if (/(short|简答|问答)/.test(s)) return 'short';
  return 'unknown';
}

export function normalizeAnswers(doc: AnswerDoc | string): AnswerItemNormalized[] {
  const parse = (input: AnswerDoc | string): AnswerDoc => {
    if (typeof input === 'string') return JSON.parse(input) as AnswerDoc;
    return input as AnswerDoc;
  };
  const d = parse(doc);
  const out: AnswerItemNormalized[] = [];
  const push = (raw: RawAnswerItem | string | string[], key?: number | string) => {
    if (typeof raw === 'string' || Array.isArray(raw)) {
      const order = typeof key === 'string' ? parseInt(key, 10) : (key as number);
      const text = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      out.push({ order, type: 'unknown', choices: [], text });
      return;
    }
    const order = Number(raw.order ?? key);
    const type = normalizeType(raw.type);
    const choices = Array.isArray(raw.choice) ? raw.choice.map(String) : [];
    const text = raw.answerText == null ? [] : Array.isArray(raw.answerText) ? raw.answerText.map(String) : [String(raw.answerText)];
    out.push({
      order,
      type,
      choices,
      text,
      explanation: raw.explanation,
      confidence: raw.confidence,
      source: raw.source,
    });
  };

  const src = d.answers;
  if (Array.isArray(src)) {
    for (const r of src) push(r);
  } else if (src && typeof src === 'object') {
    for (const [k, v] of Object.entries(src)) push(v as any, k);
  }
  return out.filter((x) => Number.isFinite(x.order));
}

export const ANSWER_FORMAT_EXAMPLE: AnswerDoc = {
  version: '1.0',
  answers: [
    { order: 1, type: 'single', choice: ['C'], explanation: '理由...', confidence: 0.93 },
    { order: 2, type: 'multiple', choice: ['A', 'D'], explanation: '理由...', confidence: 0.87 },
    { order: 3, type: 'true_false', choice: ['T'], explanation: 'True 为正确，False 为错误' },
    { order: 4, type: 'fill', answerText: ['第一空内容', '第二空内容'] },
    { order: 5, type: 'short', answerText: ['简答题作答要点 1', '要点 2'] },
  ],
  meta: { generator: 'CJ-AI', ts: Date.now() },
};

export default AnswersStore;

