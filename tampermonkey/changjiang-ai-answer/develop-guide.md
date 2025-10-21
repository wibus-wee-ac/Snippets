# 开发者指南（Developers Guide）

本项目是一套面向长江雨课堂页面的 Tampermonkey 用户脚本，使用 Vite + TypeScript + vite-plugin-monkey 打包，提供了下列核心能力：

- 可复用的「操作面板」（ActionPanel）与 UI 模块（Tabs、控件、样式体系）
- 题目批量截图（Capture Runner）与预览下载（Preview/Zip/目录保存）
- 题目 JSON 抽取（Extractor）与 Prompt 生成（Prompt Builder）
- Notepad：粘贴/解析统一 AnswerDoc JSON 答案格式
- 按域名（domain）开关的 Feature Flags（工程化可控开关）
- 基础工具：DOM 等待、日志、外部库加载（html2canvas、JSZip）等

本文档介绍项目结构、编码约定、模块边界以及新增特性时的建议落地流程，力求工程完备但不做手把手教程。

---

## 1. 开发环境与运行

- Node.js ≥ 18
- 包管理器：随意（项目内置 lockfile，可用 pnpm/yarn/npm）

在目录 `tampermonkey/changjiang-ai-answer` 内：

- 开发：`pnpm dev`（或 `npm run dev`）
- 构建：`pnpm build`（生成用户脚本到 dist）
- 预览：`pnpm preview`

打包由 `vite-plugin-monkey` 完成，`vite.config.ts` 中配置 userscript 元信息（`namespace`、`match` 等）。目前匹配：

- `https://changjiang.yuketang.cn/*`
- `https://changjiang-exam.yuketang.cn/*`

> 提示：构建出的用户脚本可在 Tampermonkey 中安装，也可用 `vite-plugin-monkey` 的 dev server 直接加载进行调试。

---

## 2. 目录结构与模块职责

仅列出关键模块：

```
src/
  config/feature-flags.ts      # 域名级 Feature Flags 配置与覆盖
  extract/exam-parser.ts       # 题目抽取器（JSON Extractor）
  helper/
    find-question.helper.ts    # 当前题目 DOM 定位 + 等待
    order-nav.helper.ts        # 左侧题号导航（下一题/上一题）
    submit.helper.ts           # 提交按钮定位与点击
  logger/                      # 样式化 Logger（分组、表格、计时、banner）
  prompt/
    template.ts                # AnswerDoc 基础 Prompt 生成器
    questions.ts               # 将题目 JSON 拼入 Prompt 的生成器
  runner/capture-questions.ts  # 批量截图调度器（导航→等待→截图→收集）
  screenshot/index.ts          # html2canvas 封装，保存为 PNG/ZIP/目录
  state/
    capture-store.ts           # 截图结果集中管理
    answers-store.ts           # AnswerDoc 解析/标准化与存储
  ui/
    action-panel.ts            # 可拖拽/可缩放/可折叠的面板 + Tabs
    capture-gallery.ts         # 截图预览与批量下载 UI
    feature-flags.ts           # Feature Flags 可视化（切换/保存/重载）
    json-extractor.ts          # 提取题目 JSON + 复制/下载/生成 Prompt UI
    notepad.ts                 # 粘贴/解析 AnswerDoc、复制 Prompt、折叠输入区
  utils/wait.ts                # sleep / waitUntil 工具
  main.ts                      # 入口：装配面板、注入功能、按 Flag 启用
```

模块边界（强约束）：

- UI 只做展示与交互，真实逻辑（提取/截图/等待/下载/解析）封装在 helper/runner/state 等模块。
- DOM 选择/等待逻辑统一走 helper 或 utils，避免在 UI 层散落复杂选择器。
- 外部库按需动态加载（如 html2canvas/JSZip），通过封装函数 `ensureHtml2Canvas()` / `ensureJSZip()` 控制。

---

## 3. 架构总览

### 3.1 Feature Flags（域名特性开关）

文件：`src/config/feature-flags.ts`

- `detectDomain()` 根据 `location.hostname` 返回基础配置（main/exam/unknown）。
- `getFeatureConfig()` 合并基础配置与 `localStorage` 覆盖（键：`CJ_AI_FLAGS_{domain}`）。
- `isEnabled(name)` 在运行时开关功能（入口 `main.ts` 据此决定是否装配某功能）。
- `selectors` 字段用于按域名覆盖关键选择器（如提交按钮、题目容器）。

UI：`src/ui/feature-flags.ts` 将 Flags 渲染为 Vercel 风格的开关列表：

- Apply：保存覆盖到 `localStorage`（仅保存与默认值的差异）。
- Reset：清除覆盖并恢复 UI。
- Reload：刷新页面生效（部分功能启动阶段读 Flag）。

### 3.2 面板（ActionPanel）与 UI 体系

- 面板支持拖拽、缩放、折叠，主体由「Tabs + 内容区 + 底部操作条」组成。
- 控件与样式前缀统一为 `cjai-*`，避免污染页面样式。
- `panel.addTab({ id, label })` 新增标签页；`panel.setDoc()`/`panel.setInfo()` 填充 Controls 页内容。

建议：

- 新增 UI 组件放在 `src/ui/`，使用轻量 DOM API + 项目内样式变量（见 `action-panel.ts` `:root` CSS 变量）。
- 保持一致的视觉语言（Vercel-like：玻璃态背景、圆角、淡边框、极简按钮）。

### 3.3 题目抽取（Extractor）

- 抽取器：`src/extract/exam-parser.ts`，输入为当前 DOM，输出结构化 `ExamQuestion[]`。
- 处理题型：单选/多选/判断/填空。填空题：
  - 在 `.exam-font`/`.custom_ueditor_cn_body` 中遍历，将 `<input>` 替换为占位符（如【空1】）。
  - 记录 `blanks` 数量；读取输入框当前值作为 `selected: string[]`。
- 解析容器限定在主内容区（避免左侧题号列表混入）。

可扩展位（建议）：

- 新题型可在解析器内按 `typeText` 分支处理，保持输出结构稳定。
- 需要跨页面/域名适配时，尽量通过 `selectors` 配置或在函数内做最小前缀限定。

### 3.4 截图（Capture Runner）

- 调度器：`runner/capture-questions.ts`
  - `captureAllFromCurrent()`：按左侧导航顺序，从当前题遍历至末题。
  - 关键步骤：`orderNav.goTo()` → `waitUntil(order active)` → `waitForQuestionElement()` → `captureElementToBlob()`
- 截图器：`screenshot/index.ts`
  - `ensureHtml2Canvas()` 动态加载 CDN；`captureElementToBlob()` → `saveElementAsPng()`
  - 批量打包：`downloadAsZip()`（JSZip）/ `downloadToDirectory()`（File System Access）
- 预览：`ui/capture-gallery.ts`

### 3.5 Notepad & Prompt

- 标准答案格式：`state/answers-store.ts`（AnswerDoc / RawAnswerItem / normalizeAnswers）。
- Prompt：
  - `prompt/template.ts` 生成 AnswerDoc 的提示词（中/英/双语，含字段约束）。
  - `prompt/questions.ts` 将抽取到的题目 JSON 以 fenced-code 形式拼入 Prompt，支持最小化与长度裁剪。
- Notepad UI：`ui/notepad.ts`
  - 粘贴 JSON → 解析 → 列表展示；输入区可折叠；高亮/滚动到当前题（跟随左侧导航）。

### 3.6 工具与基础能力

- `utils/wait.ts`：`sleep` / `waitUntil`
- `helper/find-question.helper.ts`：
  - 同步定位 + `waitForQuestionElement()`（轮询 + MutationObserver + 超时 + AbortSignal）。
- `helper/order-nav.helper.ts`：操作左侧题号（`goTo/next/prev/first/last/wait`）。
- `helper/submit.helper.ts`：提交按钮定位与快捷键触发（按 Flag 开启）。
- `logger/`：样式化日志，`localStorage.setItem('CJ_AI_LOG_LEVEL','debug')` 可调整等级。

---

## 4. 代码风格与约定

- 语言：TypeScript（5.9+）。尽量定义 `interface`/`type`，避免 `any`。
- 导出：模块可 `export default` + 命名导出；对外 API 使用语义明确的函数名。
- 命名：
  - DOM 选择器/类名使用 `cjai-*` 前缀（CSS/数据属性）。
  - Boolean 开关使用动宾短语（`isEnabled/has*/should*`）。
- DOM 查询：
  - 优先限定在主容器（如 `.container-problem .el-scrollbar__view`）。
  - 复杂结构引入最少依赖的后代选择器，避免绝对路径；必要时通过 `feature-flags.selectors` 覆盖。
- 等待策略：
  - UI 渲染或切题引入 `waitUntil`；题目加载用 `waitForQuestionElement`。
  - MutationObserver + 轮询 + 超时兜底；支持 `AbortSignal` 及时终止。
- 错误处理：
  - 统一使用 `logger` 输出（`error/warn/info/debug/trace`）；
  - 可在 UI 状态栏提示（如 Extractor/Notepad 的 status）。
- 样式系统：
  - 通过 `action-panel.ts` 注入一组 `:root` CSS 变量（明/暗适配）；
  - 组件样式以 BEM-ish 扁平命名（`cjai-section__title`、`cjai-row__label`）。
- 事件与热键：
  - 全局热键需避开输入态（input/textarea/contentEditable）。
  - 可配置（通过 Feature Flag）是否挂载热键。

---

## 5. 如何新增特性（范式）

### 5.1 新增一个 Tab + 功能面板

1) 在 `src/ui/` 新建组件（如 `my-feature.ts`），只负责 UI 与最小状态；
2) 在 `src/main.ts` 中：
- 通过 `panel.addTab({ id:'my', label:'My' })` 创建标签页；
- `const widget = new MyFeature(...);`；`pane.appendChild(widget.el)`；
- 若需按域名开关，新增 Feature Flag 字段并在入口处判定 `isEnabled('myFeature')`。

### 5.2 新增题目抽取器/适配

- 在 `extract/exam-parser.ts` 按 `typeText` 增加分支，确保输出稳定；
- 对于不同域名/结构差异，优先通过 `selectors` 做可配置化；
- 变更逻辑同时更新 `ui/json-extractor.ts` 的使用文案/提示。

### 5.3 新增域名/站点支持

- `config/feature-flags.ts`：新增一个 `FeatureConfig`，配置 `hostMatch`、默认 `flags`、可选 `selectors`；
- `vite.config.ts`：在 userscript `match` 中补充新域名；
- 若页面结构差异较大，新增对应 helper/selector，并通过 `selectors` 或入口 `isEnabled` 进行选择。

### 5.4 引入新下载/存储方式

- 在 `screenshot/index.ts` 内新增封装（如 Web Share、IndexedDB），确保：
  - 用户手势要求（浏览器限制）与错误提示；
  - URL.createObjectURL 的回收（`revokeObjectURL`）。

### 5.5 引入外部库

- 通过动态脚本标签 + `ensureXxx()`：
  - CDN：jsDelivr/unpkg，失败时给出降级方案；
  - 多次调用要幂等（同 `id` 的 `<script>` 只注入一次）。

---

## 6. Feature Flags 与运行时切换

- 运行时读取：`getFeatureConfig()`；入口用 `isEnabled('flagName')` 装配模块；
- 覆盖：`localStorage.setItem('CJ_AI_FLAGS_{domain}', '{"flags":{"capture":true}}')`；
- 可视化：Info 面板中「Feature Flags」小部件支持一键 Apply/Reset/Reload；
- 支持 `selectors` 覆盖关键选择器：
  - `submitButton`：提交按钮 CSS 选择器
  - `questionContainerExact`：用于 fallback 的题目容器路径

---

## 7. Prompt 集成与 AnswerDoc

- 标准 Prompt：`prompt/template.ts`（中/英/双语、字段说明、示例 AnswerDoc）
- 题目 JSON + Prompt：`prompt/questions.ts` 把 JSON 嵌入 fenced-code，提供 `minify/maxChars` 等控制
- Notepad：`ui/notepad.ts` 可复制示例、复制当前 AnswerDoc、折叠输入区、解析后高亮当前题

> 核心约束：模型产出必须是 AnswerDoc JSON，No extra words。

---

## 8. 调试与诊断

- 全局 API：`window.CJAI`
  - `start()/stop()/one(n)`: 截图任务控制
  - `nav`: 左侧题号导航（`next/prev/goTo/first/last`）
  - `store/answers`: 截图与答案存储
  - `importAnswers(doc)`: 导入/标准化 AnswerDoc
  - `features`: 当前域配置（含 flags/selectors）
- 日志等级：`localStorage.setItem('CJ_AI_LOG_LEVEL','debug')`
- 题目等待：`waitForQuestionElement({ timeoutMs, intervalMs })`
- 常见排查：
  - 面板样式异常：强刷页面；`ensureStyles()` 会覆盖旧样式内容
  - 截图空白：检查 html2canvas 是否加载、元素是否在视口内
  - 提交按钮未命中：检查 `feature-flags.selectors.submitButton` 覆盖

---

## 9. 性能与兼容性建议

- DOM 查询限定范围（container-first），避免全局选择器滥用；
- 页面滚动/突变高频处避免同步重排；
- MutationObserver 配合节流；
- 兼容性：
  - ZIP 依赖 JSZip（CDN）；
  - 目录保存依赖 File System Access API（Chromium，https 环境）；
  - html2canvas 依赖 CORS 可用性，必要时 `backgroundColor: '#fff'` 与 `scale` 控制清晰度。

---

## 10. 版本与发布

- 版本管理：遵循 semver，大特性升级前确保向后兼容或文档说明破坏点；
- 发布流程：
  1) 本地 `pnpm build` 产出 dist 用户脚本；
  2) 在 Tampermonkey 中更新/安装；
  3) 在目标域进行回归（Extractor/Notepad/Prompt/Submit/Capture）。

---

## 11. 示例：添加一个“自动填写答案”功能（思路）

1) 新建 `src/ui/auto-apply.ts`：提供「从 AnswerStore 应用到当前题」的按钮与状态；
2) 在 `answers-store` 中补充适配器：`toDom(order: number) => void`（按题型写回输入/勾选）；
3) 入口 `main.ts` 新增 Tab，并通过 `isEnabled('notepad')` 或新 Flag 进行开关；
4) 注意：
   - DOM 写入需在 `waitForQuestionElement()` 之后；
   - 对未识别题型给出 UI 提示与跳过策略；
   - 失败重试/AbortSignal 友好退出；
   - 日志清晰标注 order 与原因。

以上约定与范式可确保在不同域与页面结构差异下，功能扩展仍具备工程完备性、可维护性与一致的用户体验。

