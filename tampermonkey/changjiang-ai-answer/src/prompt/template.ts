import { ANSWER_FORMAT_EXAMPLE, AnswerDoc } from '../state/answers-store';

export type PromptLang = 'zh' | 'en' | 'zh-en';

export interface PromptOptions {
  lang?: PromptLang;
  version?: string;
  includeExample?: boolean;
  customExample?: AnswerDoc;
  extraNotes?: string[];
}

const zhIntro = `你是一个严谨的答题助手。根据我提供的“按顺序排列”的题目截图，输出 JSON 答案。`;
const zhRules = `
要求：
- 仅输出 JSON，请使用 \`\`\` 包裹，不要解释或多余文本。
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

function buildBody(lang: PromptLang): string {
  if (lang === 'zh') return `${zhIntro}\n\n${zhRules}`.trim();
  if (lang === 'en') return `${enIntro}\n\n${enRules}`.trim();
  return `${zhIntro}\n\n${zhRules}\n\n${enIntro}\n\n${enRules}`.trim();
}

export function buildAnswerPrompt(options: PromptOptions = {}): string {
  const lang = options.lang ?? 'zh';
  const version = options.version ?? '1.0';
  const includeExample = options.includeExample ?? true;
  const example = options.customExample ?? ANSWER_FORMAT_EXAMPLE;
  const noteLines = (options.extraNotes ?? []).map((x) => `- ${x}`).join('\n');

  const body = buildBody(lang);
  const schemaHeader = lang === 'en' ? 'JSON Schema/Shape' : 'JSON 形状与字段说明';
  const exampleHeader = lang === 'en' ? 'Example' : '示例';
  const endHeader = lang === 'en' ? 'Return JSON only' : '仅输出 JSON';

  const exampleStr = JSON.stringify(example, null, 2);

  return [
    body,
    noteLines && (lang === 'en' ? 'Notes:\n' : '注意：\n') + noteLines,
    `${schemaHeader} (version: ${version}):\n` +
      `{
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
    includeExample ? `${exampleHeader} (DO NOT COPY LITERALLY):\n\`\`\`\n${exampleStr}\n\`\`\`` : '',
    `${endHeader}.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export default buildAnswerPrompt;

