#!/usr/bin/env node
// 表达式形态探针（WP-E0a）：把一段源码喂给逐字符驱动，输出「逐字符 + EOF」的 shape 树快照。
//
// 用法：
//   node typescript/cases/tts/tools/expr-probe.mjs "<源码>" [--legacy|--incremental|--both]
//   node typescript/cases/tts/tools/expr-probe.mjs "<源码>" --both --eof-only
//   node typescript/cases/tts/tools/expr-probe.mjs "<源码>" --both --json tmp/probe.json
//
// 选项：
//   --legacy        只跑 legacy（两个开关都 false，默认）
//   --incremental   只跑 incremental（两个开关都 true）
//   --both          两种模式都跑（便于逐字符 diff）
//   --eof-only      只打印 EOF 那一棵树（逐字符树只数步数，不打印）
//   --json <path>   把快照写成 JSON（结构见 buildSnapshot）
//   -h, --help      本帮助
//
// 说明：
// - 驱动链与 `typescript/cases/tts/run.mjs` 同源：每字符一次 ProcessRange，最后压游标到 count 做 EOF 收尾；
//   本工具**不 import run.mjs 的私有函数**，只复用它的调用顺序（它自己没有导出）。
// - 输出的是 `ToAstLine(0)` 原文（含 basic token 行与 src 区间），因此可直接用来 diff legacy / incremental；
//   账本口径的「类名 + pos + 文本字段、剥 src、忽略 basic 行」由 run.mjs 负责，这里不做过滤。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..");
const require = createRequire(import.meta.url);
const BUILD = path.join(root, "build", "ts");

const USAGE = `用法：node typescript/cases/tts/tools/expr-probe.mjs "<源码>" [选项]

选项：
  --legacy        只跑 legacy（默认）
  --incremental   只跑 incremental
  --both          两种模式都跑
  --eof-only      只打印 EOF 树
  --json <path>   把快照写成 JSON
  -h, --help      显示本帮助
`;

function fail(message) {
  console.error(`[expr-probe] ${message}`);
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
  const value = require(file)[className];
  if (value === undefined) fail(`构建产物 ${file} 里没有导出 ${className}`);
  return value;
}

const { SyntaxContext } = { SyntaxContext: loadBuildClass("core/syntax/syntax-context.js", "SyntaxContext") };
const { SourceRange } = { SourceRange: loadBuildClass("core/syntax/source-range.js", "SourceRange") };
const { TextDocument } = { TextDocument: loadBuildClass("typescript/run/text-document.js", "TextDocument") };
const { TypescriptTemplate } = { TypescriptTemplate: loadBuildClass("typescript/run/typescript-template.js", "TypescriptTemplate") };
const { SourceFileShape } = { SourceFileShape: loadBuildClass("typescript/tokens/files/source-file-shape.js", "SourceFileShape") };
const routeModule = require(path.join(BUILD, "typescript/tokens/statements/statement-route-util.js"));
const StatementRouteUtil = routeModule.StatementRouteUtil ?? routeModule.default?.StatementRouteUtil;
if (StatementRouteUtil === undefined || StatementRouteUtil.EnableIncrementalVariableShapes === undefined) {
  fail("statement-route-util.js 里没有静态字段 EnableIncrementalVariableShapes（构建产物与当前源码不匹配）");
}

function setIncremental(enabled) {
  // 与 run.mjs / tts-impl 同口径：双开关同时置位，保证两种模式各自干净。
  StatementRouteUtil.EnableIncrementalShapes = enabled;
  StatementRouteUtil.EnableIncrementalVariableShapes = enabled;
}

function errorText(exception) {
  const seen = new Set();
  let current = exception;
  let deepest = "";
  while (current !== null && current !== undefined && !seen.has(current)) {
    seen.add(current);
    if (typeof current === "object") {
      const message = current.Message ?? current.message;
      if (message !== undefined && message !== null && String(message).length > 0) {
        deepest = String(message);
      }
      current = current.InnerException ?? null;
    } else {
      deepest = String(current);
      current = null;
    }
  }
  return deepest;
}

// 与 run.mjs 的 collectSteps 同源（顺序一字不差），但这里把每步的树原样留下来供打印 / diff。
function collectSteps(source, filePath, incremental) {
  setIncremental(incremental);
  try {
    const template = TypescriptTemplate.Create();
    const shape = new SourceFileShape(template);
    const context = new SyntaxContext(shape, 32);
    const document = new TextDocument(source, filePath);
    SourceRange.CurrentDocument = document;
    context.CurrentDocument = document;
    const count = document.GetCount();
    const steps = [];
    for (let index = 0; index < count; index++) {
      let error = null;
      try {
        context.ProcessRange(context.Root, new SourceRange(document, index, index + 1), index);
      } catch (exception) {
        error = errorText(exception);
      }
      steps.push({ kind: "char", index, char: source[index], tree: shape.ToAstLine(0), error });
      if (error !== null) return { count, steps, stopped: true, stage: "char", index };
    }
    let error = null;
    try {
      // 与 SyntaxContext.Process 的 EOF 尾巴同一顺序：游标压到 count → 根签出 → 空窗口交给根 → 抽消息。
      context.Index = count;
      context.Root.SignOut(count);
      context.Root.Process(context, new SourceRange(document, count, count), count);
      if (typeof context.DrainMessages === "function") context.DrainMessages();
    } catch (exception) {
      error = errorText(exception);
    }
    steps.push({ kind: "eof", index: count, char: null, tree: shape.ToAstLine(0), error });
    return { count, steps, stopped: error !== null, stage: error === null ? null : "eof", index: count };
  } finally {
    setIncremental(false);
  }
}

function buildSnapshot(source, mode, options) {
  const collected = collectSteps(source, "<expr-probe>", mode === "incremental");
  return {
    mode,
    source,
    count: collected.count,
    stopped: collected.stopped,
    stage: collected.stage,
    error: collected.stopped ? collected.steps[collected.steps.length - 1].error : null,
    steps: options.eofOnly ? [collected.steps[collected.steps.length - 1]] : collected.steps,
    eof: collected.steps[collected.steps.length - 1],
  };
}

function printSnapshot(snapshot) {
  console.log(`=== ${snapshot.mode}: ${JSON.stringify(snapshot.source)} ===`);
  if (snapshot.source.length === 0) {
    console.log("(空源码，直接看 EOF)");
  }
  for (const step of snapshot.steps) {
    if (step.kind === "char") {
      console.log(`[char ${step.index}] ${JSON.stringify(step.char)}`);
    } else {
      console.log(`[eof] index=${step.index}`);
    }
    if (step.error !== null) {
      console.log(`  ERROR ${step.error}`);
    } else {
      for (const line of step.tree.split("\n")) console.log(`  ${line}`);
    }
  }
  console.log("");
}

function parseArgs(argv) {
  const options = { source: null, modes: [], eofOnly: false, json: null, help: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--") {
      // `--` 之后一律当源码：`-a+b;` 这种以运算符开头的片段不能被当成选项。
      for (let rest = index + 1; rest < argv.length; rest++) {
        if (options.source === null) options.source = argv[rest];
        else fail(`多余的参数：${argv[rest]}（源码要整段放进一个引号里）`);
      }
      break;
    }
    if (arg === "-h" || arg === "--help") options.help = true;
    else if (arg === "--legacy") options.modes.push("legacy");
    else if (arg === "--incremental") options.modes.push("incremental");
    else if (arg === "--both") options.modes.push("legacy", "incremental");
    else if (arg === "--eof-only") options.eofOnly = true;
    else if (arg === "--json") options.json = argv[++index] ?? fail("--json 后面要跟一个路径");
    else if (arg.startsWith("--json=")) options.json = arg.slice("--json=".length);
    else if (arg.startsWith("-")) fail(`不认识的选项：${arg}`);
    else if (options.source === null) options.source = arg;
    else fail(`多余的参数：${arg}（源码要整段放进一个引号里）`);
  }
  if (options.modes.length === 0) options.modes.push("legacy");
  // 去重，顺序固定 legacy → incremental。
  const modes = [];
  for (const mode of ["legacy", "incremental"]) {
    if (options.modes.includes(mode)) modes.push(mode);
  }
  return { ...options, modes };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }
  if (options.source === null) fail(`缺源码参数\n\n${USAGE}`);
  const snapshots = [];
  for (const mode of options.modes) {
    const snapshot = buildSnapshot(options.source, mode, options);
    snapshots.push(snapshot);
    printSnapshot(snapshot);
  }
  if (options.json !== null) {
    const outPath = path.resolve(root, options.json);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ source: options.source, snapshots }, null, 2) + "\n", "utf8");
    console.log(`[expr-probe] JSON 已写入 ${outPath}`);
  }
}

main();
