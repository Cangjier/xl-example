#!/usr/bin/env node
// Stage 5d-1a：**legacy 退场指标探针**（度量，零行为变化）。
//
// 它只回答一件事：默认解析这一整套固定语料时，还有多少语句在走 legacy 通道。
// 四个指标由 `StatementLegacyMetrics` 提供（只加静态整数自增，不改任何分支 / 顺序 / 状态）：
//
//   legacyStatementDispatch  语句壳收口退回 `StatementBuilder.BuildStatement()` 整段 raw 分派建树的次数
//   scanRootCalls            `StatementScanner.ScanRoot` 被调用的次数
//   rawTailBuilds            块体内 raw 尾巴被 `Load` + `BuildStatement()` 逐条建树的次数
//   shapeAstDeclined         表达式语句拒绝「由形状树建 AST」的次数（含形状路径抛错）
//
// 另有两个交叉校验量（同一次 Parse 的读数，用来证伪「新计数器漏记」）：
//
//   totalDeclined            既有 `StatementShapeAst.TotalDeclined` 在该用例上的增量。与 shapeAstDeclined 同步；
//                            形状路径**抛错**时它为 0 而 shapeAstDeclined 为 1——这是两者唯一的已知差异。
//   fileFallbacks            `StatementRouteUtil.FileFallbackCount` 在该用例上的增量（文件级兜底 = 整条文件重解析）。
//
// 语料是**固定的**（不抽样），见下面的 CORPUS 常量：
//   1. `tests/cases/token/**/*.ts` 全部，一份文件 = 一个用例；
//   2. `typescript/cases/*.ts` 全部：整文件是合法 TS 时整文件一个用例；整文件不是合法 TS 时（那些文件本来是
//      「一行一个用例」的集合，`ast-json.mjs` 按行消费它们）退化成**逐行用例**，每行一个用例。
//   两半都按相对路径 / 行号排序，顺序固定。
//
// 跳过口径（与 `typescript/cases/token-ast.mjs` 的 `ts-invalid` 一致）：`ts.createSourceFile(...).parseDiagnostics`
// 非空的**整文件**不计入指标，只计数；退化成逐行时，单行不合法也只计数（`lineSkipped`）。
// 逐行用例**不做** `ast-json.mjs` 那种 `\n` 转义解码：那种解码会把「一行」展开成多条语句，量的是另一个程序；
// 本探针量的是真实片段，所以带转义的行按字面解析，解析不了就计入 `lineSkipped`（见 HANDOFF-5d1a §未覆盖）。
//
// 用法：
//   node tests/statement-possible/legacy-retirement.mjs                  # 逐用例读数 → 与基线比对（默认）
//   node tests/statement-possible/legacy-retirement.mjs --write-baseline # 首次（或某个阶段收口后）写基线
//   node tests/statement-possible/legacy-retirement.mjs --json           # 机器可读结果打到 stdout
//   node tests/statement-possible/legacy-retirement.mjs --top=40         # 「还走 legacy 的用例」Top-N（默认 20）
//   node tests/statement-possible/legacy-retirement.mjs --quiet          # 只打总计与判决
//
// 退出码：0 = 与基线逐用例一致（或刚写完基线）；1 = 指标不同 / 有 crash；2 = 用法或语料错误。
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementLegacyMetrics } = load("typescript/tokens/statements/statement-legacy-metrics.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementShapeAst } = load("typescript/tokens/statements/statement-shape-ast.js");

const BASELINE_PATH = path.join(root, "tests", "statement-possible", "legacy-baseline.json");
const SCHEMA = "statement-legacy-baseline/1";

// 语料常量：改它必须同时重写基线（`--write-baseline`），否则校验必然红——这是刻意的。
const CORPUS = [
  {
    root: "tests/cases/token",
    recursive: true,
    mode: "file",
    note: "tests/cases/token/**/*.ts 全量（token-ast 同一套语料），一份文件 = 一个用例",
  },
  {
    root: "typescript/cases",
    recursive: false,
    mode: "file-or-lines",
    note: "typescript/cases/*.ts 全量：整文件合法 TS 时整文件一个用例，否则逐行一个用例（那些文件本来就是一行一例）",
  },
];

// 逐构造诊断语料（`--snippets`，也进基线）：每种语句族一条最小源码，回答「这一族现在走哪条路」。
// 它们的读数**不计入语料总计**（语料总计只由上面两棵真实目录决定），但一起比基线——
// 这样下一阶段就能指着「`let` 那条从 scanRoot=5 掉到 ≤2」这种**族级**证据验收，而不是只看总数。
const SNIPPETS = [
  ["empty-statement", ";"],
  ["expr-binary", "a + b;"],
  ["expr-call", "f();"],
  ["let-decl", "let x = 1;"],
  ["const-decl", "const x = 1;"],
  ["var-decl", "var x = 1;"],
  ["block", "{ ; }"],
  ["if", "if (a) { f(); }"],
  ["if-else", "if (a) { f(); } else { g(); }"],
  ["while", "while (a) { f(); }"],
  ["do-while", "do { f(); } while (a);"],
  ["for", "for (let i = 0; i < 3; i++) { f(); }"],
  ["for-in", "for (const k in o) { f(); }"],
  ["for-of", "for (const v of xs) { f(); }"],
  ["switch", "switch (a) { case 1: f(); break; default: g(); }"],
  ["try", "try { f(); } catch (e) { g(); } finally { h(); }"],
  ["with", "with (o) { f(); }"],
  ["label", "l: for (;;) { break l; }"],
  ["break-continue", "while (a) { break; continue; }"],
  ["return", "function f() { return 1; }"],
  ["throw", "throw e;"],
  ["debugger", "debugger;"],
  ["function-decl", "function f() { let a = 1; }"],
  ["async-function-decl", "async function f() { await g(); }"],
  ["class-decl", "class C { m() { return 1; } }"],
  ["class-fields", "class C { a = 1; static b = 2; }"],
  ["import-named", "import { a } from \"m\";"],
  ["import-default", "import a from \"m\";"],
  ["export-list", "export { a };"],
  ["export-default", "export default 1;"],
  ["export-const", "export const a = 1;"],
  ["interface", "interface I { a: number; }"],
  ["type-alias", "type T = A | B;"],
  ["enum", "enum E { A, B }"],
  ["namespace", "namespace N { export const a = 1; }"],
  ["declare-global", "declare global { interface W { } }"],
  ["block-function", "{ function f() { } }"],
  ["block-class", "{ class C { } }"],
  ["arrow-block-body", "const f = () => { let a = 1; };"],
  ["object-method-body", "const o = { m() { let a = 1; } };"],
  ["multi-statement-body", "function f() { if (a) b(); for (;;) { c(); } return 1; }"],
  ["decorated-class", "@dec class C { }"],
];

// perFile 数组的字段顺序（baseline 的 perFile 值按此排列）。
const PER_FILE_FIELDS = [
  "legacyStatementDispatch",
  "scanRootCalls",
  "rawTailBuilds",
  "shapeAstDeclined",
  "totalDeclined",
  "fileFallbacks",
];

function parseArgs(argv) {
  const args = { writeBaseline: false, json: false, quiet: false, snippets: false, legacyOnly: false, top: 20, help: false };
  for (const arg of argv) {
    if (arg === "--write-baseline") args.writeBaseline = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--quiet") args.quiet = true;
    else if (arg === "--snippets") args.snippets = true;
    else if (arg === "--legacy-only") args.legacyOnly = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg.startsWith("--top=")) {
      const value = Number(arg.slice("--top=".length));
      if (!Number.isInteger(value) || value < 0) fail(`--top 需要非负整数，收到 ${arg}`);
      args.top = value;
    } else fail(`不认识的选项：${arg}`);
  }
  return args;
}

function fail(message) {
  console.error(message);
  process.exit(2);
}

const USAGE = `用法：node tests/statement-possible/legacy-retirement.mjs [选项]
  --write-baseline  把当前读数写成 tests/statement-possible/legacy-baseline.json
  --json            把结果以 JSON 打到 stdout
  --snippets        只跑逐构造诊断语料（42 条），打印每族的四个指标
  --legacy-only     诊断：把壳全关（EnableShellExpressions=false）再量一遍，给出「纯 legacy 底座」
                    读数（不与基线比对）
  --top=<N>         「还走 legacy 的用例」列前 N 个（默认 20）
  --quiet           只打总计与判决`;

function toPosix(rel) {
  return rel.split(path.sep).join("/");
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function collectFiles() {
  const files = [];
  for (const entry of CORPUS) {
    const base = path.join(root, entry.root);
    if (!fs.existsSync(base)) fail(`语料目录不存在：${entry.root}`);
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir).sort()) {
        const abs = path.join(dir, name);
        const stat = fs.statSync(abs);
        if (stat.isDirectory()) {
          if (entry.recursive) walk(abs);
          continue;
        }
        if (stat.isFile() && name.endsWith(".ts")) files.push({ entry, rel: toPosix(path.relative(root, abs)) });
      }
    };
    walk(base);
  }
  files.sort((left, right) => (left.rel < right.rel ? -1 : left.rel > right.rel ? 1 : 0));
  const seen = new Set();
  for (const file of files) {
    if (seen.has(file.rel)) fail(`语料重复：${file.rel}`);
    seen.add(file.rel);
  }
  return files;
}

// 与 token-ast 同口径：TS 自己解析失败 ⇒ 这份源码不参与指标。
function tsBroken(text, fileName) {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return sourceFile.parseDiagnostics !== undefined && sourceFile.parseDiagnostics.length > 0;
}

function buildCases() {
  const files = collectFiles();
  const cases = [];
  const fileTsInvalid = [];
  const lineSkipped = [];
  let bytes = 0;
  for (const file of files) {
    const text = stripBom(fs.readFileSync(path.join(root, file.rel), "utf8"));
    bytes += Buffer.byteLength(text, "utf8");
    if (!tsBroken(text, file.rel)) {
      cases.push({ key: file.rel, source: text });
      continue;
    }
    if (file.entry.mode !== "file-or-lines") {
      fileTsInvalid.push(file.rel);
      continue;
    }
    // 整文件不是合法 TS：它是「一行一个用例」的集合，退化成逐行用例。
    const lines = text.split("\n");
    for (let at = 0; at < lines.length; at++) {
      const line = lines[at].trim();
      if (line.length === 0 || line.startsWith("//")) continue;
      const key = `${file.rel}:L${at + 1}`;
      if (tsBroken(line, key)) {
        lineSkipped.push(key);
        continue;
      }
      cases.push({ key, source: line });
    }
  }
  return { files, cases, fileTsInvalid, lineSkipped, bytes };
}

function resetCounters() {
  StatementLegacyMetrics.Reset();
  // 既有台账：两个都按「用例」为界清零，只为读该用例的增量（探针内部口径，跑完恢复）。
  StatementShapeAst.TotalDeclined = 0;
  StatementShapeAst.TotalShapeAst = 0;
  StatementRouteUtil.FileFallbackCount = 0;
}

function serializeBaseline(baseline) {
  // `perFile` 一个用例一行（排序后写）：既让 JSON 可 diff，也不让 6300 个用例把文件撑成七倍。
  const perFile = baseline.perFile;
  const keys = Object.keys(perFile).sort();
  const head = { ...baseline };
  delete head.perFile;
  const headText = JSON.stringify(head, null, 2);
  const body = keys.map((key) => `    ${JSON.stringify(key)}: ${JSON.stringify(perFile[key])}`).join(",\n");
  return `${headText.slice(0, -1).trimEnd()},\n  "perFile": {\n${body}\n  }\n}\n`;
}

// 量一个用例：清零 → Parse → 读六元组。返回 { record, error }；error 非 null 表示 Parse 抛错。
function measure(source, key) {
  resetCounters();
  try {
    SourceFileRunner.Parse(source, key);
  } catch (error) {
    return { record: null, error: String(error && error.message ? error.message : error).split("\n")[0] };
  }
  return {
    record: [
      StatementLegacyMetrics.LegacyStatementDispatchCount,
      StatementLegacyMetrics.ScanRootCallCount,
      StatementLegacyMetrics.RawTailBuildCount,
      StatementLegacyMetrics.ShapeAstDeclinedCount,
      StatementShapeAst.TotalDeclined,
      StatementRouteUtil.FileFallbackCount,
    ],
    error: null,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  const startedAt = Date.now();
  const { files, cases, fileTsInvalid, lineSkipped, bytes } = buildCases();

  // 跑完把既有台账恢复成进入时的值：探针不改变别人的读数。
  const savedFileFallbackCount = StatementRouteUtil.FileFallbackCount;
  const savedTotalDeclined = StatementShapeAst.TotalDeclined;
  const savedTotalShapeAst = StatementShapeAst.TotalShapeAst;
  const savedShellExpressions = StatementRouteUtil.EnableShellExpressions;
  // `--legacy-only` 是**诊断**模式：壳全关，量「纯 legacy 底座」，用来解释各指标里有多少是根 legacy 候选的固有成本。
  if (args.legacyOnly) StatementRouteUtil.EnableShellExpressions = false;

  const crashes = [];
  const perFile = {};
  const snippets = {};
  const snippetErrors = {};
  const totals = {};
  for (const field of PER_FILE_FIELDS) totals[field] = 0;

  try {
    // `--snippets`：只跑逐构造诊断语料（快，用来验收「这一族掉了几次」）。
    if (args.snippets) {
      for (const [name, source] of SNIPPETS) {
        const measured = measure(source, name);
        if (measured.error !== null) snippetErrors[name] = measured.error;
        else snippets[name] = measured.record;
      }
      printSnippetTable(snippets, snippetErrors, args);
      return;
    }
    for (const item of cases) {
      const measured = measure(item.source, item.key);
      if (measured.error !== null) {
        // crash 的用例不参与指标总计（读数没有意义），但单独列出，判决必红。
        crashes.push({ key: item.key, message: measured.error });
        continue;
      }
      const record = measured.record;
      for (let at = 0; at < PER_FILE_FIELDS.length; at++) totals[PER_FILE_FIELDS[at]] += record[at];
      if (record.some((value) => value !== 0)) perFile[item.key] = record;
    }
    for (const [name, source] of SNIPPETS) {
      const measured = measure(source, name);
      if (measured.error !== null) snippetErrors[name] = measured.error;
      else snippets[name] = measured.record;
    }
  } finally {
    StatementRouteUtil.FileFallbackCount = savedFileFallbackCount;
    StatementShapeAst.TotalDeclined = savedTotalDeclined;
    StatementShapeAst.TotalShapeAst = savedTotalShapeAst;
    StatementRouteUtil.EnableShellExpressions = savedShellExpressions;
    StatementLegacyMetrics.Reset();
  }

  if (args.legacyOnly && !args.snippets) {
    // 诊断模式：只报「纯 legacy 底座」的总计与逐构造读数，不参与基线校验（它量的是另一套装配）。
    console.log("[legacy-retirement] 诊断模式 --legacy-only（EnableShellExpressions=false，壳全关；不与基线比对）");
    console.log(`  cases=${cases.length} crash=${crashes.length}`);
    for (const field of PER_FILE_FIELDS) {
      console.log(`  ${field.padEnd(26, " ")} = ${String(totals[field]).padStart(6, " ")}`);
    }
    printSnippetTable(snippets, snippetErrors, args);
    return;
  }

  const filesWithAnyLegacy = Object.keys(perFile).filter((key) => {
    const record = perFile[key];
    return record[0] !== 0 || record[1] !== 0 || record[2] !== 0 || record[3] !== 0;
  }).length;

  const corpusSha = crypto.createHash("sha256").update(cases.map((item) => item.key).join("\n")).digest("hex");
  const result = {
    schema: SCHEMA,
    corpus: {
      roots: CORPUS.map((entry) => entry.root + (entry.recursive ? "/**/*.ts" : "/*.ts")),
      files: files.length,
      cases: cases.length,
      fileTsInvalid: fileTsInvalid.length,
      lineSkipped: lineSkipped.length,
      crash: crashes.length,
      bytes,
      caseListSha256: corpusSha,
    },
    totals,
    filesWithAnyLegacy,
    perFileFields: PER_FILE_FIELDS,
    fileTsInvalid,
    lineSkipped,
    crashes,
    snippets,
    snippetErrors,
    perFile,
    elapsedMs: Date.now() - startedAt,
  };

  if (args.writeBaseline) {
    const baseline = {
      schema: SCHEMA,
      note: "Stage 5d-1a legacy 退场指标的当前事实（基线）：每个阶段的退场目标 = 对应指标下降且全门零回归；只有改语料或改指标口径才重写它。",
      corpus: {
        roots: result.corpus.roots,
        files: result.corpus.files,
        cases: result.corpus.cases,
        fileTsInvalid: result.corpus.fileTsInvalid,
        lineSkipped: result.corpus.lineSkipped,
        bytes: result.corpus.bytes,
        caseListSha256: result.corpus.caseListSha256,
      },
      totals,
      filesWithAnyLegacy,
      perFileFields: PER_FILE_FIELDS,
      fileTsInvalid,
      snippets,
      perFile,
    };
    fs.writeFileSync(BASELINE_PATH, serializeBaseline(baseline), "utf8");
    if (args.json) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    else printReport(args, result, null);
    console.error(`已写入基线 ${path.relative(root, BASELINE_PATH)}：files=${files.length} cases=${cases.length} fileTsInvalid=${fileTsInvalid.length} lineSkipped=${lineSkipped.length}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    fail(`找不到基线 ${path.relative(root, BASELINE_PATH)}；首次运行请加 --write-baseline`);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const verdict = compareToBaseline(baseline, result);

  if (args.json) {
    const payload = {
      ...result,
      baseline: baseline.totals,
      verdict: verdict.failures.length === 0 && crashes.length === 0 ? "PASS" : "FAIL",
      differences: verdict.failures,
      perFileDifferences: verdict.perFileDiffs,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    if (payload.verdict !== "PASS") process.exit(1);
    return;
  }

  printReport(args, result, verdict);
  if (verdict.failures.length > 0 || crashes.length > 0) process.exit(1);
}

function compareToBaseline(baseline, result) {
  const failures = [];
  const totalsOfBaseline = baseline.totals || {};
  for (const field of PER_FILE_FIELDS) {
    const want = typeof totalsOfBaseline[field] === "number" ? totalsOfBaseline[field] : null;
    if (want === null) failures.push(`基线缺少总计 ${field}`);
    else if (want !== result.totals[field]) failures.push(`总计 ${field}：基线 ${want} 实际 ${result.totals[field]}`);
  }
  const corpus = baseline.corpus || {};
  if (corpus.files !== result.corpus.files) failures.push(`语料文件数不同：基线 ${corpus.files} 实际 ${result.corpus.files}`);
  if (corpus.cases !== result.corpus.cases) failures.push(`用例数不同：基线 ${corpus.cases} 实际 ${result.corpus.cases}`);
  if (corpus.fileTsInvalid !== result.corpus.fileTsInvalid) {
    failures.push(`ts-invalid 整文件数不同：基线 ${corpus.fileTsInvalid} 实际 ${result.corpus.fileTsInvalid}`);
  }
  if (corpus.lineSkipped !== result.corpus.lineSkipped) {
    failures.push(`跳过的逐行用例数不同：基线 ${corpus.lineSkipped} 实际 ${result.corpus.lineSkipped}`);
  }
  if (corpus.caseListSha256 !== undefined && corpus.caseListSha256 !== result.corpus.caseListSha256) {
    // 语料内容变了但指标没变：只是提示，不判红（结论仍由指标决定）。
    console.log("[legacy-retirement] 提示：用例清单指纹与基线不同（语料被加/删/改），指标仍按数值比对。");
  }
  const baselinePerFile = baseline.perFile || {};
  const keys = new Set([...Object.keys(baselinePerFile), ...Object.keys(result.perFile)]);
  const zeros = [0, 0, 0, 0, 0, 0];
  const perFileDiffs = [];
  for (const key of [...keys].sort()) {
    const want = baselinePerFile[key] === undefined ? zeros : baselinePerFile[key];
    const got = result.perFile[key] === undefined ? zeros : result.perFile[key];
    if (JSON.stringify(want) === JSON.stringify(got)) continue;
    perFileDiffs.push({ key, baseline: want, actual: got });
  }
  if (perFileDiffs.length > 0) failures.push(`逐用例读数不同：${perFileDiffs.length} 个用例（见下）`);
  const baselineSnippets = baseline.snippets || {};
  const snippetDiffs = [];
  for (const [name] of SNIPPETS) {
    const want = baselineSnippets[name];
    const got = result.snippets[name];
    if (JSON.stringify(want) === JSON.stringify(got)) continue;
    snippetDiffs.push({ name, baseline: want === undefined ? null : want, actual: got === undefined ? null : got });
  }
  if (snippetDiffs.length > 0) failures.push(`逐构造读数不同：${snippetDiffs.length} 条（见下）`);
  return { failures, perFileDiffs, snippetDiffs, baselineTotals: totalsOfBaseline };
}

function metricReason(record) {
  const reasons = [];
  if (record[3] > 0) reasons.push("表达式语句形状树拒绝（ShapeAstDecline）");
  if (record[0] > 0) reasons.push("语句壳退回整段 raw 分派（BuildFromShell fallback）");
  if (record[2] > 0) reasons.push("块体 raw 尾巴逐条建树（BuildBlock/CollectBodyStatements）");
  if (record[1] > 0) reasons.push("判界仍问 legacy 扫描器（ScanRoot）");
  if (reasons.length === 0) reasons.push("无（只有 totalDeclined 增量）");
  return reasons.join(" + ");
}

function printSnippetTable(snippets, snippetErrors, args) {
  if (args.json) {
    process.stdout.write(JSON.stringify({ snippets, snippetErrors, fields: PER_FILE_FIELDS }, null, 2) + "\n");
    return;
  }
  const lines = [];
  lines.push(`[legacy-retirement] 逐构造读数（每族一条最小源码；四列 = legacy / scanRoot / rawTail / declined）${args.legacyOnly ? " —— 诊断 --legacy-only（壳全关）" : ""}`);
  lines.push(`  ${"构造".padEnd(24, " ")} legacy scanRoot rawTail declined   totalDeclined fileFallback`);
  for (const [name] of SNIPPETS) {
    const record = snippets[name];
    if (record === undefined) {
      lines.push(`  ${name.padEnd(24, " ")} THROW  ${JSON.stringify(snippetErrors[name] || "unknown")}`);
      continue;
    }
    lines.push(`  ${name.padEnd(24, " ")} ${String(record[0]).padStart(6, " ")} ${String(record[1]).padStart(8, " ")} ${String(record[2]).padStart(7, " ")} ${String(record[3]).padStart(8, " ")} ${String(record[4]).padStart(13, " ")} ${String(record[5]).padStart(12, " ")}`);
  }
  console.log(lines.join("\n"));
}

function printReport(args, result, verdict) {
  const lines = [];
  lines.push(`[legacy-retirement] files=${result.corpus.files} cases=${result.corpus.cases} fileTsInvalid=${result.corpus.fileTsInvalid} lineSkipped=${result.corpus.lineSkipped} crash=${result.corpus.crash}`);
  const labels = {
    legacyStatementDispatch: "LegacyStatementDispatchCount                ",
    scanRootCalls: "ScanRootCallCount                           ",
    rawTailBuilds: "RawTailBuildCount                           ",
    shapeAstDeclined: "ShapeAstDeclinedCount                       ",
    totalDeclined: "  （交叉校验）StatementShapeAst.TotalDeclined   ",
    fileFallbacks: "  （交叉校验）FileFallbackCount                 ",
  };
  for (const field of PER_FILE_FIELDS) {
    const base = verdict === null ? null : verdict.baselineTotals[field];
    const suffix = base === null || base === undefined
      ? ""
      : `（基线 ${base}${base === result.totals[field] ? "" : "  ✗"})`;
    lines.push(`  ${labels[field]} = ${String(result.totals[field]).padStart(6, " ")} ${suffix}`);
  }
  lines.push(`  仍有 legacy 读数的用例 = ${result.filesWithAnyLegacy}/${result.corpus.cases}`);
  if (result.fileTsInvalid.length > 0) {
    lines.push(`  跳过（整文件 TS 自己解析失败）${result.fileTsInvalid.length} 个：`);
    for (const file of result.fileTsInvalid.slice(0, 5)) lines.push(`    - ${file}`);
    if (result.fileTsInvalid.length > 5) lines.push(`    … 其余 ${result.fileTsInvalid.length - 5} 个见 --json`);
  }
  if (result.lineSkipped.length > 0) {
    lines.push(`  跳过（逐行用例自己解析失败，未做 \\n 转义解码）${result.lineSkipped.length} 行`);
  }
  if (result.crashes.length > 0) {
    lines.push(`  crash ${result.crashes.length} 个（本探针把 crash 判红）：`);
    for (const crash of result.crashes.slice(0, 10)) lines.push(`    - ${crash.key}: ${crash.message}`);
  }

  const ranked = Object.keys(result.perFile)
    .map((key) => ({ key, record: result.perFile[key] }))
    .filter((entry) => entry.record[0] !== 0 || entry.record[1] !== 0 || entry.record[2] !== 0 || entry.record[3] !== 0)
    .map((entry) => ({ ...entry, weight: entry.record[0] * 4 + entry.record[2] * 3 + entry.record[3] * 2 + entry.record[1] }))
    .sort((left, right) => right.weight - left.weight || (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
  if (!args.quiet && args.top > 0 && ranked.length > 0) {
    lines.push("");
    lines.push(`还走 legacy 的用例 Top ${Math.min(args.top, ranked.length)}（加权 legacy×4 + rawTail×3 + declined×2 + scanRoot×1）：`);
    for (const entry of ranked.slice(0, args.top)) {
      const record = entry.record;
      lines.push(`  legacy=${String(record[0]).padStart(4)} scanRoot=${String(record[1]).padStart(5)} rawTail=${String(record[2]).padStart(4)} declined=${String(record[3]).padStart(3)}  ${entry.key}`);
      lines.push(`      → ${metricReason(record)}`);
    }
    if (ranked.length > args.top) lines.push(`  … 其余 ${ranked.length - args.top} 个用例见 --json`);
  }

  lines.push("");
  if (verdict === null) {
    lines.push(`verdict: BASELINE-WRITTEN（${path.relative(root, BASELINE_PATH)}）`);
  } else if (verdict.failures.length === 0 && result.crashes.length === 0) {
    lines.push(`verdict: PASS —— 四个指标与基线逐用例一致（${result.elapsedMs} ms）`);
  } else {
    lines.push("verdict: FAIL —— 指标与基线不同：");
    for (const failure of verdict.failures) lines.push(`  - ${failure}`);
    for (const diff of verdict.perFileDiffs.slice(0, 40)) {
      lines.push(`  - ${diff.key}: 基线 ${JSON.stringify(diff.baseline)} 实际 ${JSON.stringify(diff.actual)}`);
    }
    if (verdict.perFileDiffs.length > 40) lines.push(`  … 其余 ${verdict.perFileDiffs.length - 40} 个差异见 --json`);
    for (const diff of verdict.snippetDiffs.slice(0, 42)) {
      lines.push(`  - [构造] ${diff.name}: 基线 ${JSON.stringify(diff.baseline)} 实际 ${JSON.stringify(diff.actual)}`);
    }
  }
  console.log(lines.join("\n"));
}

main();
