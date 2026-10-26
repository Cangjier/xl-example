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
// 退出码：0 = 全部一致；1 = 存在差异；2 = 工具 / 环境错误。
//
// 依赖构建产物 build/ts（先 `xl build` core+typescript（targets=ts），再 `tsc -p .`）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);

const BUILD = path.join(root, "build/ts");
const DOC_PATH = path.join(root, "docs/expected-token-time-shapes.md");
const EXPECTED_PATH = path.join(here, "token-time-shapes/let-x.expected.txt");

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
// shape 树 dump
//
// 字段来源（全部是运行时对象上的真实字段，实测记录在 _coord/REPORT-tts-harness.md）：
//   - 类名      : node.constructor.name
//   - 区间      : node.SourceRange.Start / .End（End < 0 = 未封口）
//   - pos       : node.Pos（只有 shape 有；basic token 上是 undefined，因此不打印 pos 字段）
//   - text      : basic token → TempToString()（Common / WrapSymbol / Symbol 的 Temp）
//                 IdentifierShape → EscapedText；NumericLiteralShape → Text
//   - op        : 名字以 TokenShape 结尾的运算符形状（AsteriskTokenShape / PlusTokenShape …）
//                 没有 text 访问器，取 SourceRange 覆盖的原文切片
// ---------------------------------------------------------------------------
const TOKEN_SHAPE_SUFFIX = /TokenShape$/;

function readText(node) {
  if (node === null || node === undefined) return null;
  if (node.IsBasicToken === true && typeof node.TempToString === "function") {
    try {
      const value = node.TempToString();
      if (typeof value === "string") return value;
    } catch {
      /* 落到下面的字段探测 */
    }
  }
  try {
    if (typeof node.EscapedText === "string") return node.EscapedText;
    if (typeof node.Text === "string") return node.Text;
  } catch {
    /* ignore */
  }
  return null;
}

function readRaw(node) {
  const range = node?.SourceRange;
  if (!range || range.Document === null || range.Document === undefined) return null;
  if (range.Start < 0 || range.End < 0) return null;
  try {
    if (typeof range.Document.GetRaw === "function") {
      return range.Document.GetRaw(range.Start, range.End);
    }
  } catch {
    /* 落到 Content 切片 */
  }
  try {
    const content = range.Document.Content;
    if (typeof content === "string") return content.slice(range.Start, range.End);
  } catch {
    /* ignore */
  }
  return null;
}

function dumpNode(node) {
  const className = node?.constructor?.name ?? "?";
  const range = node?.SourceRange ?? null;
  const start = range ? range.Start : -1;
  const end = range ? range.End : -1;
  // shape 的 Pos 是数字（-1 表示未设置 → 打印 `pos=-`）；basic token 上没有 Pos 字段。
  const pos = typeof node?.Pos === "number" ? node.Pos : undefined;
  const text = readText(node);
  let op = null;
  if (text === null && TOKEN_SHAPE_SUFFIX.test(className)) {
    op = readRaw(node);
  }
  const data = Array.isArray(node?.Data) ? node.Data : [];
  return {
    className,
    pos,
    start,
    end,
    text,
    op,
    children: data.map((child) => dumpNode(child)),
  };
}

function formatNodeFields(node) {
  let line = node.className;
  if (node.pos !== undefined) {
    line += `  pos=${node.pos < 0 ? "-" : String(node.pos)}`;
  }
  line += `  src=[${node.start},${node.end < 0 ? "未封" : String(node.end)})`;
  if (node.text !== null && node.text !== undefined) {
    line += `  text=${JSON.stringify(node.text)}`;
  } else if (node.op !== null && node.op !== undefined) {
    line += `  op=${JSON.stringify(node.op)}`;
  }
  return line;
}

function appendChildren(node, prefix, lines) {
  const children = node.children;
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    const last = index === children.length - 1;
    lines.push(`${prefix}${last ? "└─ " : "├─ "}${formatNodeFields(child)}`);
    appendChildren(child, `${prefix}${last ? "   " : "│  "}`, lines);
  }
}

function treeLines(tree) {
  const lines = [formatNodeFields(tree)];
  appendChildren(tree, "", lines);
  return lines;
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
    step.tree = dumpNode(shape);
    step.lines = treeLines(step.tree);
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
// ---------------------------------------------------------------------------
function differenceLines(expectedLines, actualLines) {
  const total = Math.max(expectedLines.length, actualLines.length);
  const lines = [];
  for (let index = 0; index < total; index++) {
    const expected = index < expectedLines.length ? expectedLines[index] : null;
    const actual = index < actualLines.length ? actualLines[index] : null;
    if (expected !== actual) lines.push({ line: index + 1, expected, actual });
  }
  return lines;
}

function firstDifference(expectedLines, actualLines) {
  const lines = differenceLines(expectedLines, actualLines);
  return lines.length > 0 ? lines[0] : null;
}

// 文档里少数节点行尾带注释（例：`src=[8,11)   ← 3 关闭即封口`），那不是 shape 字段。
// 工具不篡改期望，只把「去掉注释后完全一致」的差异单独归类，便于阅读。
const INLINE_ANNOTATION = /\s{2,}←.*$/;

function stripAnnotation(line) {
  if (line === null) return null;
  return line.replace(INLINE_ANNOTATION, "");
}

function compareWithExpected(steps, sections) {
  const results = [];
  const total = Math.max(steps.length, sections.length);
  let passed = 0;
  let failed = 0;
  let annotationOnly = 0;
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
      expectedLines: section?.lines ?? [],
      actualLines: step?.lines ?? [],
    };
    if (step !== null && section !== null && step.error === null) {
      const diffs = differenceLines(section.lines, step.lines);
      const diff = diffs.length > 0 ? diffs[0] : null;
      if (diff === null) {
        result.status = "PASS";
        passed++;
      } else {
        result.firstDiff = diff;
        result.diffLines = diffs.map((item) => item.line);
        const sameShape =
          section.lines.length === step.lines.length &&
          section.lines.every((line, at) => stripAnnotation(line) === stripAnnotation(step.lines[at]));
        result.annotationOnly = sameShape;
        if (sameShape) annotationOnly++;
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
  return { results, summary: { passed, failed, total, annotationOnly } };
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
      "  --json            输出 JSON（逐字符树 + 比对结果）",
      "  --expected <p>    --diff 的期望源改为指定文件",
      "  --sync-expected   从 docs 文档重新抽取稳定期望文件（无源码参数）",
      "  --help            显示本帮助",
      "",
      "退出码：0 全部一致 / 1 有差异 / 2 工具或环境错误。",
    ].join("\n"),
  );
}

function parseArguments(argv) {
  const options = { diff: false, json: false, fromDoc: false, sync: false, help: false, expected: null, source: null };
  const positional = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--diff") options.diff = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--from-doc") options.fromDoc = true;
    else if (arg === "--sync-expected") options.sync = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--expected") {
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
  if (options.source === null) {
    printHelp();
    fail("缺少源码文件参数");
  }

  const sourcePath = path.resolve(process.cwd(), options.source);
  if (!fs.existsSync(sourcePath)) fail(`找不到源码文件：${sourcePath}`);
  if (fs.statSync(sourcePath).isDirectory()) fail(`源码参数是目录：${sourcePath}`);
  const source = fs.readFileSync(sourcePath, "utf8");
  const { count, steps, stopped } = collectSteps(source, path.basename(sourcePath));

  if (!options.diff) {
    if (options.json) {
      console.log(JSON.stringify({ source: sourcePath, count, steps, stopped }, null, 2));
      return 0;
    }
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
          count,
          steps,
          results,
          summary,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`# token-time-shapes --diff`);
    console.log(`源文件: ${sourcePath}（${count} 字符）`);
    console.log(`期望源: ${expectedPath}（${sections.length} 节）`);
    console.log("");
    for (const result of results) {
      const quoted = result.step !== null && result.step.kind === "char" ? `  ${JSON.stringify(result.step.char)}` : "";
      console.log(`[${result.status}] ${result.label}${quoted}`);
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
        if (result.annotationOnly) {
          console.log(`       （仅差文档行尾内嵌注释 \`← …\`，不是 shape 字段差异）`);
        }
      }
    }
    console.log("");
    if (stopped) console.log("注意：推进过程被异常中断，后续步骤没有覆盖。");
    console.log(
      `合计: PASS ${summary.passed} / FAIL ${summary.failed} / ${summary.total} 步` +
        (summary.annotationOnly > 0 ? `（其中 ${summary.annotationOnly} 步仅差文档内嵌注释）` : ""),
    );
  }
  return summary.failed === 0 ? 0 : 1;
}

process.exitCode = main();
