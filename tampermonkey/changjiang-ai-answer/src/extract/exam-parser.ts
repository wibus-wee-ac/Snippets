import logger from '../logger';

export interface ExamOption { key: string; value: string }
export interface ExamQuestion {
  id: number;
  type: string;
  score: number;
  status: '已提交' | '未提交';
  question: string;
  options: ExamOption[];
  selected: string | string[] | null;
  rawTypeText?: string;
  blanks?: number; // for fill-in-the-blank
}

function text(el: Element | null | undefined): string {
  return (el?.textContent || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

function findMainContainer(): HTMLElement | Document {
  return (
    (document.querySelector('.container-problem .el-scrollbar__view') as HTMLElement | null) ||
    (document.querySelector('.container-problem') as HTMLElement | null) ||
    document
  );
}

export function extractExamQuestions(): ExamQuestion[] {
  const root = findMainContainer();
  const items = Array.from(root.querySelectorAll<HTMLElement>('.subject-item'));
  if (items.length === 0) logger.warn('No .subject-item found when extracting JSON');

  const out: ExamQuestion[] = [];
  const seen = new Set<number>();

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    // Parse type/id/score from item-type
    const typeEl = item.querySelector('.item-type');
    const typeText = text(typeEl);
    // Matches: "1.单选题 (1分)" or variants
    const m = /(\d+)\.(\S+)\s*\((\d+(?:\.\d+)?)分\)/.exec(typeText) || /(\d+)\s*[\.、]\s*(\S+).*?(\d+(?:\.\d+)?)\s*分/.exec(typeText);
    const id = m ? parseInt(m[1], 10) : index + 1;
    const type = m ? m[2] : '';
    const score = m ? Math.round(parseFloat(m[3]) * 100) / 100 : 0;

    // Status (best effort)
    const statusEl = item.querySelector('.status');
    const status: '已提交' | '未提交' = statusEl ? '已提交' : '未提交';

    const isFill = /填空/.test(typeText) || /填空/.test(type);

    // Question text (+ special handling for fill-in-the-blank)
    let question = '';
    let blanks = 0;
    let fillAnswers: string[] = [];
    if (isFill) {
      const info = extractFillQuestion(item);
      question = info.question;
      blanks = info.blanks;
      fillAnswers = info.answers;
    } else {
      const h4 = item.querySelector('.item-body h4');
      if (h4) {
        const custom = h4.querySelector('.custom_ueditor_cn_body');
        if (custom) {
          const p = custom.querySelector('p');
          question = text(p || custom);
        } else {
          const p = h4.querySelector('p');
          question = text(p || h4);
        }
      } else {
        // Fallback: any rich text inside item-body
        const rich = item.querySelector('.item-body .custom_ueditor_cn_body') || item.querySelector('.item-body');
        question = text(rich as Element);
      }
    }

    // Options
    const options: ExamOption[] = [];
    // radio
    const radioLis = item.querySelectorAll('.list-unstyled-radio li');
    radioLis.forEach((li) => {
      const kEl = li.querySelector('.radioInput');
      let vEl: Element | null = li.querySelector('.radioText .custom_ueditor_cn_body');
      if (!vEl) vEl = li.querySelector('.radioText');
      if (!kEl || !vEl) return;
      const p = vEl.querySelector('p');
      const value = text(p || vEl);
      const key = text(kEl);
      if (key) options.push({ key, value });
    });
    // checkbox
    const checkboxLis = item.querySelectorAll('.list-unstyled-checkbox li');
    checkboxLis.forEach((li) => {
      const kEl = li.querySelector('.checkboxInput');
      let vEl: Element | null = li.querySelector('.checkboxText .custom_ueditor_cn_body');
      if (!vEl) vEl = li.querySelector('.checkboxText');
      if (!kEl || !vEl) return;
      const value = text(vEl);
      const key = text(kEl);
      if (key) options.push({ key, value });
    });
    // True/False fallback
    const judgeLis = item.querySelectorAll('.list-inline.list-unstyled-radio li');
    if (judgeLis.length === 2 && options.length === 0) {
      options.push({ key: '✓', value: '正确' });
      options.push({ key: '✗', value: '错误' });
    }

    // Selected options
    let selected: string | string[] | null = null;
    const selectedRadio = item.querySelector('.el-radio.is-checked');
    if (selectedRadio) {
      const k = selectedRadio.querySelector('.radioInput');
      if (k) selected = text(k);
    }
    const selectedChecks = Array.from(item.querySelectorAll('.el-checkbox.is-checked'));
    if (selectedChecks.length > 0) {
      selected = [];
      for (const el of selectedChecks) {
        const k = el.querySelector('.checkboxInput');
        const t = text(k);
        if (t) (selected as string[]).push(t);
      }
    }

    // For fill-in-the-blank, prefer current input values
    if (isFill) {
      const vals = fillAnswers.map((s) => s.trim()).filter((s) => s.length > 0);
      if (vals.length > 0) selected = vals;
    }

    const valid = question.trim() !== '' && type !== '' && score > 0;
    const dup = seen.has(id);
    if (!valid || dup) {
      logger.debug('Skip item', { id, valid, dup, typeText });
      continue;
    }
    seen.add(id);
    const q: ExamQuestion = { id, type, score, status, question, options, selected, rawTypeText: typeText };
    if (isFill) q.blanks = blanks;
    out.push(q);
  }

  logger.success('Extracted questions', out.length);
  return out;
}

function extractFillQuestion(item: HTMLElement): { question: string; blanks: number; answers: string[] } {
  const body = (item.querySelector('.item-body') as HTMLElement) || item;
  const inputs = Array.from(body.querySelectorAll<HTMLInputElement>('input.blank-item-dynamic, input[type="text"].blank-item-dynamic, input.blank-item, input[type="text"]'));
  const answers = inputs.map((i) => (i.value || '').trim());

  // build question by walking .exam-font/.custom_ueditor_cn_body and replacing inputs with placeholders
  const container = (body.querySelector('.exam-font') as HTMLElement) || (body.querySelector('.custom_ueditor_cn_body') as HTMLElement) || body;
  let idx = 0;
  const parts: string[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent || '').replace(/\u00A0/g, ' ');
      parts.push(t);
      return;
    }
    if (!(node instanceof Element)) return;
    const el = node as Element;
    if (el.tagName.toLowerCase() === 'input' && (el as HTMLInputElement).type === 'text') {
      idx += 1;
      parts.push(`【空${idx}】`);
      return;
    }
    // prefer inner content for rich text containers
    const children = Array.from(el.childNodes);
    if (children.length === 0) return;
    for (const c of children) walk(c);
  };

  walk(container);
  let question = parts.join('');
  question = question.replace(/\s+/g, ' ').replace(/\s([，。！？；,.!?])/g, '$1').trim();
  const blanks = Math.max(inputs.length, idx);
  return { question, blanks, answers };
}

export default extractExamQuestions;
