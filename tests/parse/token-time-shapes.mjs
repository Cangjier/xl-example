#!/usr/bin/env node
// 「basic tokens → shape」重构的**目标用例工具**：逐字符推进 + shape 树对拍。
//
// 口径来源：docs/expected-token-time-shapes.md。工具只负责**报告差异**，
// 不会为了让 diff 变绿去修正期望（文档自己声明了「样本不一定完全正确」）。
//
// 用法：
//   node tests/parse/token-time-shapes.mjs <file.ts>                  # 打印整棵逐字符树
//   node tests/parse/token-time-shapes.mjs <file.ts> --diff           # 与稳定期望文件逐节比对
//   node tests/parse/token-time-shapes.mjs <file.ts> --diff --from-doc # 直接与 docs/ 文档比对
//   node tests/parse/token-time-shapes.mjs <file.ts> --json           # 结构化输出（树 + 步）
//   node tests/parse/token-time-shapes.mjs --sync-expected            # 从文档重新抽取稳定期望文件
//
// 增量模式（WP-A 契约 C4，见 _coord/CONTRACT-tts-incremental.md）：
//   node tests/parse/token-time-shapes.mjs <file.ts> --diff --incremental
//   打开 StatementRouteUtil.EnableIncrementalVariableShapes（默认 false）后再解析；
//   开关字段名可用环境变量 TTS_MODE_FIELD 覆盖。字段不存在时 stderr 一行提示并继续 legacy。
//
// legacy 语料基线（WP-E 用它证明默认模式零回归）：
//   node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline
//   node tests/parse/token-time-shapes.mjs --legacy-corpus
//   对 tests/cases/token/**/*.ts 与 samples/*.ts 逐文件做**整文档**解析
//   （context.Process(document) → Root.ToAstLine(0)），按相对路径排序后算 sha256。
//
// 退出码：0 = 全部一致；1 = 存在差异；2 = 工具 / 环境错误。
//
// 依赖构建产物 build/ts（先 `xl build` core+typescript（targets=ts），再 `tsc -p .`）。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);

const BUILD = path.join(root, "build/ts");
const DOC_PATH = path.join(root, "docs/expected-token-time-shapes.md");
const EXPECTED_PATH = path.join(here, "token-time-shapes/let-x.expected.txt");
const BASELINE_PATH = path.join(here, "token-time-shapes/legacy-corpus-baseline.json");
const DEFAULT_CORPUS_DIR = "tests/cases/token";
const DEFAULT_MODE_FIELD = "EnableIncrementalVariableShapes";

// ---------------------------------------------------------------------------
// 构建产物加载
// ---------------------------------------------------------------------------
function fail(message) {
  console.error(`[token-time-shapes] ${message}`);
  process.exit(2);
}

function loadBuildClass(relativePath, className) {
  const file = path.join(BUILD, relativePath);
  if (!fs.existsSync(file)) {
    fail(
      `构建产物缺失：${file}\n` +
        `先构建（本机没有 xl CLI，用 DSH 的 xl_build 工具）：\n` +
        `  1) xl_build { cwd: <repo>, paths: ["core","typescript"], targets: ["ts"] }\n` +
        `  2) node node_modules/typescript/bin/tsc -p .`,
    );
  }
  const mod = require(file);
  const value = mod[className];
  if (value === undefined) {
    fail(`构建产物 ${file} 里没有导出 ${className}`);
  }
  return value;
}

const { SyntaxContext } = { SyntaxContext: loadBuildClass("core/syntax/syntax-context.js", "SyntaxContext") };
const { SourceRange } = { SourceRange: loadBuildClass("core/syntax/source-range.js", "SourceRange") };
const { TextDocument } = { TextDocument: loadBuildClass("typescript/run/text-document.js", "TextDocument") };
const { TypescriptTemplate } = { TypescriptTemplate: loadBuildClass("typescript/run/typescript-template.js", "TypescriptTemplate") };
const { SourceFileShape } = { SourceFileShape: loadBuildClass("typescript/tokens/files/source-file-shape.js", "SourceFileShape") };

// ---------------------------------------------------------------------------
// 增量开关（契约 C4）
//
// 唯一静态开关是 StatementRouteUtil.EnableIncrementalVariableShapes（默认 false）。
// 本工具是它唯一的「打开」入口：解析前把字段写 true / false，再照原路径解析。
// 字段名允许用 TTS_MODE_FIELD 覆盖（形状归属调整时不必改工具）；
// 字段不存在（构建产物是旧版 / 被重命名）时只在 stderr 提示一行并继续 legacy——
// 目标用例工具是诊断工具，不该因为开关缺失而变成环境错误。
// ---------------------------------------------------------------------------
function resolveModeField() {
  const fromEnv = process.env.TTS_MODE_FIELD;
  return typeof fromEnv === "string" && fromEnv.length > 0 ? fromEnv : DEFAULT_MODE_FIELD;
}

function applyMode(requested) {
  const field = resolveModeField();
  const info = { requested, mode: "legacy", field, applied: false, note: null };
  const file = path.join(BUILD, "typescript/tokens/statements/statement-route-util.js");
  if (!fs.existsSync(file)) {
    info.note = `构建产物缺失，无法应用模式开关：${file}`;
    return info;
  }
  let util = null;
  try {
    const mod = require(file);
    util = mod.StatementRouteUtil ?? (mod.default !== undefined ? mod.default.StatementRouteUtil : undefined) ?? null;
  } catch (exception) {
    info.note = `读取 StatementRouteUtil 失败：${exception instanceof Error ? exception.message : String(exception)}`;
    return info;
  }
  if (util === null || util[field] === undefined) {
    info.note = `statement-route-util.js 里没有静态字段 ${field}`;
    return info;
  }
  util[field] = requested === "incremental";
  info.applied = true;
  info.mode = requested === "incremental" ? "incremental" : "legacy";
  return info;
}

function modeLabel(modeInfo) {
  if (!modeInfo.applied) {
    return `${modeInfo.mode}（开关未应用：${modeInfo.note}）`;
  }
  return `${modeInfo.mode}（${modeInfo.field} = ${modeInfo.mode === "incremental" ? "true" : "false"}）`;
}

function reportModeNote(modeInfo) {
  if (!modeInfo.applied && modeInfo.note !== null) {
    console.error(`[token-time-shapes] ${modeInfo.note}；本趟按 ${modeInfo.mode} 模式跑。`);
  }
}

// ---------------------------------------------------------------------------
// shape 树渲染
//
// 树不由本工具自绘：一律取 `Token.ToAstLine(0)`（W1 的渲染器：每层 3 列、
// `├─` / `└─` 连接线、字段顺序 pos → src=[a,b)/... → text="…" → op="…"）。
// 工具只负责「逐字符推进 + 与期望逐行比对」，格式实现只有 W1 那一处。
// ---------------------------------------------------------------------------
function renderTree(shape) {
  if (shape === null || shape === undefined || typeof shape.ToAstLine !== "function") {
    fail("SourceFileShape 上没有 ToAstLine(indent)：需要 W1 的 Token.ToAstLine 渲染器（先构建 core + typescript）。");
  }
  const text = shape.ToAstLine(0);
  if (typeof text !== "string") {
    fail(`ToAstLine(0) 返回的不是字符串（${typeof text}）`);
  }
  // 渲染结果末尾可能带一个换行：按行切开时去掉它，避免多出一个空行。
  return text.endsWith("\n") ? text.slice(0, -1) : text;
}

// ---------------------------------------------------------------------------
// 逐字符驱动
// ---------------------------------------------------------------------------
function collectSteps(source, filePath) {
  const template = TypescriptTemplate.Create();
  const shape = new SourceFileShape(template);
  const context = new SyntaxContext(shape, 32);
  const document = new TextDocument(source, filePath);
  SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const count = document.GetCount();
  const steps = [];

  const makeStep = (kind, index, char) => {
    const step = { kind, index, char, lines: [], tree: null, error: null, annotationOnly: false };
    step.tree = renderTree(shape);
    step.lines = step.tree.split("\n");
    return step;
  };

  for (let index = 0; index < count; index++) {
    let error = null;
    try {
      context.ProcessRange(context.Root, new SourceRange(document, index, index + 1), index);
    } catch (exception) {
      error = `推进到 char ${index} 时抛异常：${exception instanceof Error ? exception.message : String(exception)}`;
    }
    const step = makeStep("char", index, source[index]);
    step.error = error;
    steps.push(step);
    if (error !== null) {
      return { count, steps, stopped: true };
    }
  }

  // 模拟 SyntaxContext.Process 的 EOF 收尾（见 core/syntax/syntax-context.xl.md `method Process`）：
  // 游标压到 count → 根签出 → 空窗口 [count,count) 交给根 → 抽消息队列。
  let eofError = null;
  try {
    context.Index = count;
    context.Root.SignOut(count);
    context.Root.Process(context, new SourceRange(document, count, count), count);
    if (typeof context.DrainMessages === "function") {
      context.DrainMessages();
    }
  } catch (exception) {
    eofError = `EOF 收尾时抛异常：${exception instanceof Error ? exception.message : String(exception)}`;
  }
  const eofStep = makeStep("eof", count, null);
  eofStep.error = eofError;
  steps.push(eofStep);

  return { count, steps, stopped: false };
}

// ---------------------------------------------------------------------------
// 期望文件解析 / 生成
// ---------------------------------------------------------------------------
const SECTION_MARK = /^##\s*\[(?:char\s+(\d+)|EOF)\]\s*(.*)$/;

function sectionLabel(section) {
  return section.kind === "char" ? `char ${section.index}` : "EOF";
}

// 从 markdown（docs 文档或稳定期望文件）里按 `## [char N]` / `## [EOF]` 抽 ```text 围栏块。
function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = null;
  let fence = null;
  for (const line of lines) {
    const fenceMatch = /^```(.*)$/.exec(line);
    if (fenceMatch !== null) {
      if (fence === null) {
        fence = fenceMatch[1].trim();
      } else {
        fence = null;
      }
      continue;
    }
    if (fence !== null) {
      if (fence === "text" && current !== null) {
        current.lines.push(line);
      }
      continue;
    }
    const mark = SECTION_MARK.exec(line);
    if (mark !== null) {
      current = {
        kind: mark[1] !== undefined ? "char" : "eof",
        index: mark[1] !== undefined ? Number.parseInt(mark[1], 10) : null,
        title: (mark[2] ?? "").trim(),
        lines: [],
      };
      sections.push(current);
    }
  }
  return sections;
}

function buildExpectedText(sections) {
  const out = [
    "# let-x 期望 shape 树（逐字符）",
    "# 来源：docs/expected-token-time-shapes.md —— 按节原文抽取，未做任何修正。",
    "# 样本源码：let x = 2*3+1（13 字符，无尾随换行）",
    "# 重新生成：node tests/parse/token-time-shapes.mjs --sync-expected",
    "",
  ];
  for (const section of sections) {
    out.push(`## [${sectionLabel(section)}]${section.title.length > 0 ? ` ${section.title}` : ""}`);
    out.push("```text");
    out.push(...section.lines);
    out.push("```");
    out.push("");
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// 比对
//
// 文档里少数节点行尾带注释（例：`src=[8,11)   ← 3 关闭即封口`），那不是 shape 字段。
// 规则（契约：char 11）：
//   - 期望行去掉尾部 `   ← …` 注释后与实际行相等 ⇒ 该行算**一致**，本步计 PASS，
//     并标注 annotation-only（只容错期望侧的尾部注解；实际行的其它差异照旧 FAIL）。
//   - 不改文档、不改稳定期望文件：容错只发生在比对这一层。
// ---------------------------------------------------------------------------
const INLINE_ANNOTATION = /\s+←.*$/;

function stripAnnotation(line) {
  if (line === null) return null;
  return line.replace(INLINE_ANNOTATION, "");
}

// 逐行比对：返回硬差异（真差异）与「去掉期望侧注解后一致」的行号。
function compareLines(expectedLines, actualLines) {
  const hard = [];
  const annotated = [];
  const total = Math.max(expectedLines.length, actualLines.length);
  for (let index = 0; index < total; index++) {
    const expected = index < expectedLines.length ? expectedLines[index] : null;
    const actual = index < actualLines.length ? actualLines[index] : null;
    if (expected === actual) continue;
    if (expected !== null && actual !== null && stripAnnotation(expected) === actual) {
      annotated.push(index + 1);
      continue;
    }
    hard.push({ line: index + 1, expected, actual });
  }
  return { hard, annotated };
}

function compareWithExpected(steps, sections) {
  const results = [];
  const total = Math.max(steps.length, sections.length);
  let passed = 0;
  let failed = 0;
  let annotationOnlyPassed = 0;
  for (let index = 0; index < total; index++) {
    const step = index < steps.length ? steps[index] : null;
    const section = index < sections.length ? sections[index] : null;
    const result = {
      label: step !== null ? sectionLabel(step) : sectionLabel(section),
      step: step !== null ? { kind: step.kind, index: step.index, char: step.char } : null,
      status: "FAIL",
      firstDiff: null,
      diffLines: [],
      error: step?.error ?? null,
      annotationOnly: false,
      annotatedLines: [],
      expectedLines: section?.lines ?? [],
      actualLines: step?.lines ?? [],
    };
    if (step !== null && section !== null && step.error === null) {
      const comparison = compareLines(section.lines, step.lines);
      result.annotatedLines = comparison.annotated;
      if (comparison.hard.length === 0) {
        result.status = "PASS";
        result.annotationOnly = comparison.annotated.length > 0;
        if (result.annotationOnly) annotationOnlyPassed++;
        passed++;
      } else {
        result.firstDiff = comparison.hard[0];
        result.diffLines = comparison.hard.map((item) => item.line);
        failed++;
      }
    } else {
      if (step !== null && step.error !== null) {
        result.firstDiff = { line: 0, expected: null, actual: step.error };
      } else if (step === null) {
        result.firstDiff = { line: 1, expected: "(期望文件多出的一步)", actual: null };
      } else {
        result.firstDiff = { line: 1, expected: section.lines[0] ?? null, actual: "(实际缺少这一步)" };
      }
      failed++;
    }
    results.push(result);
  }
  return {
    results,
    summary: { passed, failed, total, annotationOnly: annotationOnlyPassed },
  };
}

// ---------------------------------------------------------------------------
// legacy 语料基线（契约 C7：默认模式零回归的证据）
//
// 每个文件跑**整文档**解析：context.Process(document) → Root.ToAstLine(0)，
// 按仓库相对路径（posix 分隔符）排序后取 sha256。基线固定 legacy 模式：
// 本模式的存在意义就是证明「默认解析路径逐字节不变」，增量模式不采集语料基线。
// ---------------------------------------------------------------------------
const CORPUS_BUFFER_SIZE = 32;
const CORPUS_EXTENSIONS = [".ts", ".tsx"];

function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function collectCorpusFiles(dirRel) {
  const dirAbs = path.resolve(root, dirRel);
  if (!fs.existsSync(dirAbs)) fail(`找不到语料目录：${dirAbs}`);
  const entries = [];
  const walk = (absDir) => {
    for (const name of fs.readdirSync(absDir).sort()) {
      const abs = path.join(absDir, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) {
        walk(abs);
        continue;
      }
      if (CORPUS_EXTENSIONS.some((extension) => name.endsWith(extension))) entries.push(abs);
    }
  };
  walk(dirAbs);
  const samplesDir = path.join(root, "samples");
  if (fs.existsSync(samplesDir)) {
    for (const name of fs.readdirSync(samplesDir).sort()) {
      const abs = path.join(samplesDir, name);
      if (!fs.statSync(abs).isFile()) continue;
      if (CORPUS_EXTENSIONS.some((extension) => name.endsWith(extension))) entries.push(abs);
    }
  }
  return entries
    .map((abs) => ({ abs, rel: path.relative(root, abs).split(path.sep).join("/") }))
    .sort((left, right) => (left.rel < right.rel ? -1 : left.rel > right.rel ? 1 : 0));
}

// 一次整文档解析，返回根 shape 的 AST 线指纹。
function corpusFingerprint(source, filePath) {
  const template = TypescriptTemplate.Create();
  const shape = new SourceFileShape(template);
  const context = new SyntaxContext(shape, CORPUS_BUFFER_SIZE);
  const document = new TextDocument(source, filePath);
  context.Process(document);
  return shape.ToAstLine(0);
}

// 异常也进指纹，所以错误文案必须**确定且可区分**：SyntaxException 不是标准 Error
// （字段是 `Message` 而不是 `message`），直接 `String(exception)` 只会得到 `[object Object]`，
// 那样「同一个文件换了一种错误」在基线里就看不出来。
function describeError(exception) {
  if (exception === null || exception === undefined) return String(exception);
  if (exception instanceof Error) return exception.message;
  let message = null;
  try {
    const candidate = exception.Message;
    if (typeof candidate === "string" && candidate.length > 0) message = candidate;
  } catch {
    /* 落到下面 */
  }
  if (message === null) {
    try {
      message = String(exception);
    } catch {
      message = "(无法转成字符串的异常)";
    }
  }
  const name = exception?.constructor?.name ?? "UnknownException";
  let text = `${name}: ${message}`;
  try {
    const inner = exception.InnerException;
    if (inner !== null && inner !== undefined && inner !== exception) {
      let innerMessage = null;
      if (inner instanceof Error) innerMessage = inner.message;
      else if (typeof inner.Message === "string" && inner.Message.length > 0) innerMessage = inner.Message;
      if (innerMessage !== null) text += ` <- ${inner.constructor?.name ?? "Inner"}: ${innerMessage}`;
    }
  } catch {
    /* 内层异常只是补充信息，取不到就算了 */
  }
  return text;
}

function digestCorpus(files) {
  const started = Date.now();
  const entries = [];
  let errorCount = 0;
  for (const file of files) {
    const source = fs.readFileSync(file.abs, "utf8");
    let error = null;
    let hash = null;
    try {
      hash = sha256(corpusFingerprint(source, path.basename(file.abs)));
    } catch (exception) {
      errorCount++;
      error = describeError(exception);
      // 异常也进指纹：解析路径的行为变化（包括抛错）必须能被基线看见。
      hash = sha256(`ERROR\n${error}`);
    }
    entries.push(error === null ? [file.rel, hash] : [file.rel, hash, error]);
  }
  return { entries, errorCount, elapsedMs: Date.now() - started };
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    fail(
      `找不到语料基线：${BASELINE_PATH}\n` +
        `先采集：node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline`,
    );
  }
  let parsed = null;
  try {
    parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  } catch (exception) {
    fail(`语料基线不是合法 JSON：${BASELINE_PATH}（${exception instanceof Error ? exception.message : String(exception)}）`);
  }
  if (!parsed || !Array.isArray(parsed.files)) {
    fail(`语料基线缺少 files 数组：${BASELINE_PATH}`);
  }
  return parsed;
}

function runCorpus(options) {
  const dirRel = options.corpusDir ?? DEFAULT_CORPUS_DIR;
  const modeInfo = applyMode("legacy");
  reportModeNote(modeInfo);
  const files = collectCorpusFiles(dirRel);
  const current = digestCorpus(files);

  if (options.writeBaseline) {
    const baseline = {
      version: 1,
      tool: "tests/parse/token-time-shapes.mjs",
      mode: "legacy",
      note: "整文档解析（context.Process）+ Root.ToAstLine(0) 的 sha256；按相对路径排序。默认模式零回归的基线。",
      bufferSize: CORPUS_BUFFER_SIZE,
      roots: [`${dirRel}/**/*.ts`, "samples/*.ts"],
      fileCount: current.entries.length,
      errorCount: current.errorCount,
      generatedBy: "--legacy-corpus --write-baseline",
      files: current.entries,
    };
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 1)}\n`, "utf8");
    if (options.json) {
      console.log(JSON.stringify({ mode: modeInfo.mode, corpus: { dir: dirRel, baseline: BASELINE_PATH, written: true, fileCount: current.entries.length, errorCount: current.errorCount } }, null, 2));
    } else if (options.quiet) {
      console.log(`legacy-corpus: 已写入基线 ${current.entries.length} 文件（解析异常 ${current.errorCount}，模式 ${modeInfo.mode}）`);
    } else {
      console.log("# legacy-corpus --write-baseline");
      console.log(`模式: ${modeLabel(modeInfo)}（语料基线固定 legacy）`);
      console.log(`语料根: ${dirRel}/**/* + samples/*.ts`);
      console.log(`文件数: ${current.entries.length}（解析异常 ${current.errorCount}）`);
      console.log(`耗时: ${(current.elapsedMs / 1000).toFixed(2)}s`);
      console.log(`已写入: ${BASELINE_PATH}`);
    }
    return 0;
  }

  const baseline = readBaseline();
  const baselineMap = new Map();
  for (const entry of baseline.files) baselineMap.set(entry[0], entry[1]);
  const currentMap = new Map();
  for (const entry of current.entries) currentMap.set(entry[0], entry[1]);
  const changed = [];
  const missing = [];
  const extra = [];
  for (const [rel, hash] of baselineMap) {
    if (!currentMap.has(rel)) missing.push(rel);
    else if (currentMap.get(rel) !== hash) changed.push(rel);
  }
  for (const rel of currentMap.keys()) {
    if (!baselineMap.has(rel)) extra.push(rel);
  }
  const differences = changed.length + missing.length + extra.length;
  const same = currentMap.size - changed.length - extra.length;

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          mode: modeInfo.mode,
          corpus: {
            dir: dirRel,
            baseline: BASELINE_PATH,
            baselineFileCount: baselineMap.size,
            currentFileCount: currentMap.size,
            same,
            changed,
            missing,
            extra,
            differences,
            errorCount: current.errorCount,
            elapsedMs: current.elapsedMs,
          },
        },
        null,
        2,
      ),
    );
  } else if (options.quiet) {
    console.log(
      `legacy-corpus: 当前 ${currentMap.size} 文件 / 基线 ${baselineMap.size} 文件，差异 ${differences}` +
        `（变化 ${changed.length} / 缺失 ${missing.length} / 新增 ${extra.length}，模式 ${modeInfo.mode}）`,
    );
  } else {
    console.log("# legacy-corpus 比对");
    console.log(`模式: ${modeLabel(modeInfo)}（语料基线固定 legacy）`);
    console.log(`基线文件: ${BASELINE_PATH}`);
    console.log(`语料根: ${dirRel}/**/* + samples/*.ts`);
    console.log(`文件数: 当前 ${currentMap.size} / 基线 ${baselineMap.size}（解析异常 ${current.errorCount}）`);
    console.log(`一致: ${same}`);
    console.log(`差异: ${differences}（变化 ${changed.length} / 缺失 ${missing.length} / 新增 ${extra.length}）`);
    const shown = [...changed, ...missing, ...extra].slice(0, 20);
    for (const rel of shown) {
      const tag = changed.includes(rel) ? "CHANGED" : missing.includes(rel) ? "MISSING" : "EXTRA";
      console.log(`  [${tag}] ${rel}`);
    }
    if (differences > shown.length) console.log(`  …还有 ${differences - shown.length} 个`);
    console.log(`耗时: ${(current.elapsedMs / 1000).toFixed(2)}s`);
  }
  return differences === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function printHelp() {
  console.log(
    [
      "用法：node tests/parse/token-time-shapes.mjs <file.ts> [选项]",
      "",
      "  （无选项）        打印整棵逐字符 shape 树（格式与 docs/expected-token-time-shapes.md 相同）",
      "  --diff           与稳定期望文件 tests/parse/token-time-shapes/let-x.expected.txt 逐节比对",
      "  --from-doc       --diff 的期望源改成 docs/expected-token-time-shapes.md（检测文档与稳定文件漂移）",
      "  --json            输出 JSON（逐字符树 + 比对结果；含 mode 字段）",
      "  --expected <p>    --diff 的期望源改为指定文件",
      "  --sync-expected   从 docs 文档重新抽取稳定期望文件（无源码参数）",
      "",
      "模式（增量开关）：",
      "  --incremental     解析前打开 StatementRouteUtil.EnableIncrementalVariableShapes",
      "  --mode <m>        m = legacy（默认）| incremental；与 --incremental 等价",
      "                    （开关字段名可用环境变量 TTS_MODE_FIELD 覆盖；字段缺失时提示后继续 legacy）",
      "",
      "输出控制：",
      "  --quiet           diff / dump / 语料模式只打一行汇总",
      "",
      "legacy 语料基线（默认模式零回归）：",
      "  --legacy-corpus [dir]  对目录下所有 .ts/.tsx + samples/*.ts 做整文档解析并比对 sha256",
      "                         dir 缺省 = tests/cases/token",
      "  --write-baseline       采集并写入 tests/parse/token-time-shapes/legacy-corpus-baseline.json",
      "",
      "  --help            显示本帮助",
      "",
      "退出码：0 全部一致 / 1 有差异 / 2 工具或环境错误。",
    ].join("\n"),
  );
}

function parseArguments(argv) {
  const options = {
    diff: false,
    json: false,
    fromDoc: false,
    sync: false,
    help: false,
    quiet: false,
    expected: null,
    source: null,
    mode: "legacy",
    corpus: false,
    corpusDir: null,
    writeBaseline: false,
  };
  const positional = [];
  const readMode = (raw) => {
    if (raw !== "legacy" && raw !== "incremental") fail(`--mode 只接受 legacy / incremental（收到 ${raw}）`);
    return raw;
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--diff") options.diff = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--from-doc") options.fromDoc = true;
    else if (arg === "--sync-expected") options.sync = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--quiet") options.quiet = true;
    else if (arg === "--incremental") options.mode = "incremental";
    else if (arg === "--mode") {
      const raw = argv[++index];
      if (raw === undefined) fail("--mode 需要跟 legacy 或 incremental");
      options.mode = readMode(raw);
    } else if (arg.startsWith("--mode=")) options.mode = readMode(arg.slice("--mode=".length));
    else if (arg === "--legacy-corpus") {
      options.corpus = true;
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("-")) {
        options.corpusDir = next;
        index++;
      }
    } else if (arg.startsWith("--legacy-corpus=")) {
      options.corpus = true;
      options.corpusDir = arg.slice("--legacy-corpus=".length);
    } else if (arg === "--write-baseline") {
      options.writeBaseline = true;
      options.corpus = true;
    } else if (arg === "--expected") {
      options.expected = argv[++index] ?? null;
      if (options.expected === null) fail("--expected 需要跟一个文件路径");
    } else if (arg.startsWith("--expected=")) options.expected = arg.slice("--expected=".length);
    else if (arg.startsWith("-")) fail(`未知选项：${arg}（--help 看用法）`);
    else positional.push(arg);
  }
  if (options.fromDoc) options.diff = true;
  if (positional.length > 0) options.source = positional[0];
  return options;
}

function syncExpected() {
  if (!fs.existsSync(DOC_PATH)) fail(`找不到文档：${DOC_PATH}`);
  const sections = parseSections(fs.readFileSync(DOC_PATH, "utf8"));
  if (sections.length === 0) fail(`文档里没有解析出任何 \`## [char N]\` / \`## [EOF]\` 小节：${DOC_PATH}`);
  const text = buildExpectedText(sections);
  fs.mkdirSync(path.dirname(EXPECTED_PATH), { recursive: true });
  fs.writeFileSync(EXPECTED_PATH, text, "utf8");
  // 自检：抽出来的文件必须能被同一解析器原样读回。
  const reparsed = parseSections(fs.readFileSync(EXPECTED_PATH, "utf8"));
  const same =
    reparsed.length === sections.length &&
    reparsed.every(
      (section, index) =>
        sectionLabel(section) === sectionLabel(sections[index]) &&
        section.lines.length === sections[index].lines.length &&
        section.lines.every((line, at) => line === sections[index].lines[at]),
    );
  console.log(`[sync-expected] 已写入 ${EXPECTED_PATH}`);
  console.log(`[sync-expected] 节数：${sections.length}（char ${sections.filter((s) => s.kind === "char").length} + EOF ${sections.filter((s) => s.kind === "eof").length}）`);
  console.log(`[sync-expected] 自检：${same ? "OK（逐字节可读回）" : "失败（写出的文件读回后与文档不一致）"}`);
  if (!same) process.exit(2);
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return 0;
  }
  if (options.sync) {
    syncExpected();
    return 0;
  }
  if (options.corpus) {
    return runCorpus(options);
  }
  if (options.source === null) {
    printHelp();
    fail("缺少源码文件参数");
  }

  const modeInfo = applyMode(options.mode);
  reportModeNote(modeInfo);

  const sourcePath = path.resolve(process.cwd(), options.source);
  if (!fs.existsSync(sourcePath)) fail(`找不到源码文件：${sourcePath}`);
  if (fs.statSync(sourcePath).isDirectory()) fail(`源码参数是目录：${sourcePath}`);
  const source = fs.readFileSync(sourcePath, "utf8");
  const { count, steps, stopped } = collectSteps(source, path.basename(sourcePath));

  if (!options.diff) {
    if (options.json) {
      console.log(JSON.stringify({ source: sourcePath, mode: modeInfo.mode, modeField: modeInfo.field, modeApplied: modeInfo.applied, count, steps, stopped }, null, 2));
      return 0;
    }
    if (options.quiet) {
      console.log(`[dump] 模式=${modeInfo.mode} 源码=${sourcePath} 字符数=${count} 步数=${steps.length} 中断=${stopped ? "是" : "否"}`);
      return 0;
    }
    console.log(`# 模式: ${modeLabel(modeInfo)}`);
    for (const step of steps) {
      const heading = step.kind === "char" ? `char ${step.index}` : "EOF";
      const quoted = step.kind === "char" ? ` ${JSON.stringify(step.char)}` : "";
      console.log(`\n## [${heading}]${quoted}`);
      console.log(step.lines.join("\n"));
      if (step.error !== null) console.log(`# ERROR: ${step.error}`);
    }
    return 0;
  }

  const expectedPath = options.expected !== null
    ? path.resolve(process.cwd(), options.expected)
    : options.fromDoc
      ? DOC_PATH
      : EXPECTED_PATH;
  if (!fs.existsSync(expectedPath)) fail(`找不到期望文件：${expectedPath}`);
  const sections = parseSections(fs.readFileSync(expectedPath, "utf8"));
  if (sections.length === 0) fail(`期望文件里没有解析出任何小节：${expectedPath}`);

  const { results, summary } = compareWithExpected(steps, sections);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          source: sourcePath,
          expected: expectedPath,
          mode: modeInfo.mode,
          modeField: modeInfo.field,
          modeApplied: modeInfo.applied,
          count,
          steps,
          results,
          summary,
        },
        null,
        2,
      ),
    );
  } else if (options.quiet) {
    console.log(
      `token-time-shapes: PASS ${summary.passed} / FAIL ${summary.failed} / ${summary.total} 步` +
        `（模式 ${modeInfo.mode}${summary.annotationOnly > 0 ? `，${summary.annotationOnly} 步仅差行尾注解` : ""}）`,
    );
  } else {
    console.log(`# token-time-shapes --diff`);
    console.log(`模式: ${modeLabel(modeInfo)}`);
    console.log(`源文件: ${sourcePath}（${count} 字符）`);
    console.log(`期望源: ${expectedPath}（${sections.length} 节）`);
    console.log("");
    for (const result of results) {
      const quoted = result.step !== null && result.step.kind === "char" ? `  ${JSON.stringify(result.step.char)}` : "";
      const annotation = result.annotationOnly ? "  [annotation-only]" : "";
      console.log(`[${result.status}] ${result.label}${quoted}${annotation}`);
      if (result.status === "FAIL") {
        if (result.error !== null) {
          console.log(`       错误：${result.error}`);
        } else if (result.firstDiff !== null) {
          console.log(`       首个差异：第 ${result.firstDiff.line} 行`);
          console.log(`         期望: ${result.firstDiff.expected === null ? "(无)" : result.firstDiff.expected}`);
          console.log(`         实际: ${result.firstDiff.actual === null ? "(无)" : result.firstDiff.actual}`);
          if (result.diffLines.length > 0) {
            const shown = result.diffLines.slice(0, 12).join(",");
            const more = result.diffLines.length > 12 ? ",…" : "";
            console.log(`       差异行数：${result.diffLines.length}（行 ${shown}${more}）`);
          }
        }
        if (result.annotatedLines.length > 0) {
          console.log(`       另 ${result.annotatedLines.length} 行仅差期望侧行尾内嵌注释 \`← …\`（不是 shape 字段差异）`);
        }
      }
    }
    console.log("");
    if (stopped) console.log("注意：推进过程被异常中断，后续步骤没有覆盖。");
    console.log(
      `合计: PASS ${summary.passed} / FAIL ${summary.failed} / ${summary.total} 步` +
        (summary.annotationOnly > 0 ? `（其中 ${summary.annotationOnly} 步仅差文档内嵌注释，计 PASS）` : ""),
    );
  }
  return summary.failed === 0 ? 0 : 1;
}

process.exitCode = main();
