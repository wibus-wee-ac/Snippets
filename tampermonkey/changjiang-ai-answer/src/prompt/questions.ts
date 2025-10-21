import { buildAnswerPrompt, PromptLang } from './template';

export interface QuestionPromptOptions {
  lang?: PromptLang;
  includeExample?: boolean; // include AnswerDoc example
  minifyJson?: boolean; // minify questions json body
  maxChars?: number; // optional clipping limit for the whole prompt
  extraNotes?: string[]; // additional bullet points
}

function tryParse(json: string): unknown | null {
  try { return JSON.parse(json); } catch { return null; }
}

function stringify(obj: unknown, minify: boolean): string {
  try {
    return JSON.stringify(obj, null, minify ? undefined : 2);
  } catch {
    return String(obj ?? '');
  }
}

/**
 * Builds a full prompt that: (1) instructs the model to output AnswerDoc JSON
 * and (2) embeds the extracted questions JSON under a fenced block.
 */
export function buildQuestionAnswerPrompt(
  questionsJson: string | unknown,
  opts: QuestionPromptOptions = {},
): string {
  const lang = opts.lang ?? 'zh';
  const base = buildAnswerPrompt({ lang, includeExample: opts.includeExample !== false, extraNotes: opts.extraNotes });

  const obj = typeof questionsJson === 'string' ? (tryParse(questionsJson) ?? questionsJson) : questionsJson;
  const body = typeof obj === 'string' ? obj : stringify(obj, opts.minifyJson !== false);

  const header = lang === 'en'
    ? 'Questions JSON (in order):'
    : '按顺序排列的题目 JSON：';

  const prompt = `${base}\n\n${header}\n\n\`\`\`json\n${body}\n\`\`\``;

  if (!opts.maxChars) return prompt;
  if (prompt.length <= opts.maxChars) return prompt;

  // Try to re-minify (if not already) and clip as a last resort
  const compact = (() => {
    if (typeof obj === 'string') return prompt; // can't do better
    const compactBody = stringify(obj, true);
    const p = `${base}\n\n${header}\n\n\`\`\`json\n${compactBody}\n\`\`\``;
    return p;
  })();
  if (compact.length <= (opts.maxChars || 0)) return compact;

  // Clip the JSON with a note (engineering fallback)
  const clippedBody = body.slice(0, Math.max(0, (opts.maxChars || 0) - base.length - header.length - 32)) + '\n/* clipped */';
  return `${base}\n\n${header}\n\n\`\`\`json\n${clippedBody}\n\`\`\``;
}

export default buildQuestionAnswerPrompt;
