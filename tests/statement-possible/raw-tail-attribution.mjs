// raw 尾巴归因专用探针（Stage 5d-6）。
//
//   node tests/statement-possible/raw-tail-attribution.mjs            # 按「首代码单元」归族
//   node tests/statement-possible/raw-tail-attribution.mjs --top=15   # 只打印前 N 族（默认 20）
//   node tests/statement-possible/raw-tail-attribution.mjs --verbose  # 每族多打印几个源码片段
//
// 回答一个问题：`RawTailBuildCount` 的每一条到底是谁——
// 包装 `StatementBuilder.prototype.BuildStatement`，**只**在直接调用方是 `BuildBlock` /
// `CollectBodyStatements` 时记录（这两个正是 `RawTailBuildCount` 的自增点，见 `statement-legacy-metrics`），
// 于是探针的总数与官方指标**同源**：两数不等就是探针漏记，脚本直接失败（不许假绿）。
//
// 语料与 `legacy-retirement.mjs` 完全一致（`tests/cases/token/**/*.ts` + `typescript/cases/astjson/*.ts` 的
// 合法片段），跳过口径也一致（TS 自己 parseDiagnostics 非空的整文件 / 逐行不算）。
//
// 归族只看**首代码单元的文本**（`yield` / `async` / `function` / `@` / `export` …），不看任何开关或
// 候选判据——它是诊断读数，不是验收断言；族名就是「这一格的首单元」。
//
// 输出末尾给出「体首语句没有候选」的族合计，供下一阶段按族决定「挂体目录」还是「补候选」。
//
// 退出码：探针总数 != 官方 `RawTailBuildCount` → 1；否则 0。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const load = (p) => require(path.join(root, "build/ts", p));
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementBuilder } = load("typescript/tokens/statements/statement-builder.js");
const { StatementLegacyMetrics } = load("typescript/tokens/statements/statement-legacy-metrics.js");

const TOP = (() => {
  const arg = process.argv.find((value) => value.startsWith("--top="));
  if (!arg) return 20;
  const parsed = Number.parseInt(arg.slice("--top=".length), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
})();
const VERBOSE = process.argv.includes("--verbose");

const records = [];
const original = StatementBuilder.prototype.BuildStatement;
StatementBuilder.prototype.BuildStatement = function patched() {
  const frames = (new Error().stack || "").split("\n").map((line) => line.trim())
    .filter((line) => line.startsWith("at "));
  // frames[0] = 本包装器，frames[1] = 直接调用方；只有直接来自两个 raw 循环的调用才计入官方指标。
  const callerFrame = frames[1] || "";
  const raw = callerFrame.includes("BuildBlock") || callerFrame.includes("CollectBodyStatements");
  if (raw) {
    const units = this.Units;
    const at = this.At;
    const head = units[at];
    const last = units[units.length - 1];
    let snippet = "";
    try {
      const doc = head.SourceRange.Document;
      const start = head.SourceRange.StartIndex;
      const end = last && last.SourceRange ? last.SourceRange.EndIndex : start;
      snippet = doc ? doc.GetRangeString({ Document: doc, Start: start, End: end }) : "";
    } catch {
      snippet = "?";
    }
    records.push({
      caller: callerFrame.includes("CollectBodyStatements") ? "collect" : "block",
      head: head && typeof head.TempToString === "function"
        ? head.TempToString()
        : (head && head.constructor ? head.constructor.name : "?"),
      snippet: String(snippet).replace(/\s+/g, " ").slice(0, 90),
    });
  }
  return original.call(this);
};

function walk(dir, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) walk(abs, out);
    else if (name.endsWith(".ts")) out.push(abs);
  }
  return out;
}

const tokenFiles = walk(path.join(root, "tests/cases/token"), []);
const caseFiles = walk(path.join(root, "typescript", "cases", "astjson"), [])
  .filter((file) => path.dirname(file) === path.join(root, "typescript", "cases", "astjson"));
const files = [...tokenFiles, ...caseFiles];

const broken = (text) => {
  const check = ts.createSourceFile("case.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return check.parseDiagnostics && check.parseDiagnostics.length > 0;
};

const grouped = new Map();
let total = 0;
for (const file of files) {
  let text = fs.readFileSync(file, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const isCaseDir = path.dirname(file) === path.join(root, "typescript", "cases", "astjson");
  const unitsOf = broken(text)
    ? (isCaseDir ? text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith("//")) : [])
    : [text];
  for (const unit of unitsOf) {
    if (broken(unit)) continue;
    records.length = 0;
    try {
      SourceFileRunner.Parse(unit, "case.ts");
    } catch {
      continue;
    }
    total += records.length;
    for (const record of records) {
      const key = `${record.caller}|${record.head}`;
      const entry = grouped.get(key) || { count: 0, files: new Set(), samples: [] };
      entry.count += 1;
      entry.files.add(path.relative(root, file));
      if (entry.samples.length < (VERBOSE ? 8 : 3)) entry.samples.push(record.snippet);
      grouped.set(key, entry);
    }
  }
}

const official = StatementLegacyMetrics.RawTailBuildCount;
const rows = [...grouped.entries()].sort((a, b) => b[1].count - a[1].count);
console.log(`[raw-tail-attribution] raw build 总次数 = ${total}（官方 RawTailBuildCount = ${official}）`);
for (const [key, entry] of rows.slice(0, TOP)) {
  console.log(`\n${String(entry.count).padStart(4)}  ${key}  files(${entry.files.size})`);
  for (const sample of entry.samples) console.log(`      · ${sample}`);
}
if (rows.length > TOP) {
  console.log(`\n（其余 ${rows.length - TOP} 族共 ${rows.slice(TOP).reduce((sum, row) => sum + row[1].count, 0)} 条未列出，用 --top 调大）`);
}
console.log(`\n[raw-tail-attribution] 族数 = ${rows.length}；总次数与官方指标一致：${total === official ? "是" : "否"}`);
process.exit(total === official ? 0 : 1);
