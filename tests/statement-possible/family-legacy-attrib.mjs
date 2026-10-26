#!/usr/bin/env node
// Stage 5d-3：根层 function / class / 装饰器声明的**族作用域**退场归因（monkeypatch 探针，不改源码）。
//
//   node tests/statement-possible/family-legacy-attrib.mjs
//
// 同一份**文件半边**语料（`tests/cases/token/**/*.ts` + `typescript/cases/astjson/*.ts`，与
// `legacy-retirement.mjs` 的两棵语料根相同；逐行用例不在本探针里）跑两遍：
//
//   1. `5d-3 on`：默认档（`EnableRootDeclarationShell = true`）；
//   2. `5d-2a path`：进程内把 `EnableRootDeclarationShell` 置 false（5d-3 之前的路由，不改源码 / 不改产物）。
//
// 每遍只回答四个问题（全部是**壳侧**读数，不猜树）：
//   familyScanRoot              族作用域内 `StatementScanner.ScanRoot` 的调用次数。族作用域 = 首单元
//                               `Parent` 是 `SourceFileShape`（根层）、且首单元是 `function` / `class` / `@`
//                               （或已判出的 `async`+`function` / `abstract`+`class`）。块内 class 壳的
//                               ScanRoot 不算（首单元 `Parent` 是 `StatementShape`）。
//   asyncAbstractFirstColumn    `async` / `abstract` **首格**（code 只有这一个单元）的 ScanRoot 次数。
//                               这些是「第二个代码单元还没 token 化」的格子；真正的 `async function` /
//                               `abstract class` 在 `Decide` 的文档前瞻判族后不再问 ScanRoot，所以这个数
//                               里剩下的都是 `async` 箭头 / `async`、`abstract` 标识符表达式的首格。
//   legacyRootBuilds            `FunctionDeclarationPossibleShape` / `ClassDeclarationPossibleShape` 的
//                               `BuildByIndex` 在 **shell 模式**（`EnableShellExpressions === true`）里被调用的
//                               次数——也就是「legacy 根候选还在替这两族建树」的次数。文件级 fallback 的
//                               legacy 重解析不计（它会置 `EnableShellExpressions = false`）。
//   scanRootTotal / legacyDispatch / fileFallbacks
//                               整份文件半边语料的对应指标（与 `legacy-retirement.mjs` 的 totals 同口径，
//                               但只覆盖文件半边）。
//
// 输出：两行 JSON（label 区分两档）。退出码 0 = 两遍都跑完（探针是诊断，不设 PASS/FAIL 阈值；
// 阈值断言在 `declaration-shell-boundary.mjs` 与 `legacy-baseline.json` 里）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(root, "build", "ts", rel));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementScanner } = load("typescript/tokens/statements/statement-scanner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementLegacyMetrics } = load("typescript/tokens/statements/statement-legacy-metrics.js");
const { FunctionDeclarationPossibleShape } = load("typescript/tokens/declarations/function-declaration-possible-shape.js");
const { ClassDeclarationPossibleShape } = load("typescript/tokens/declarations/class-declaration-possible-shape.js");

function headTextOf(unit) {
  if (unit === null || unit === undefined) return "";
  if (typeof unit.TempToString === "function") return unit.TempToString();
  return "";
}

function isRootOwned(unit) {
  const owner = unit === null || unit === undefined ? null : unit.Parent;
  return owner !== null && owner !== undefined && owner.constructor?.name === "SourceFileShape";
}

let familyScanRoot = 0;
let asyncAbstractFirstColumn = 0;
const originalScanRoot = StatementScanner.ScanRoot;
StatementScanner.ScanRoot = function (code) {
  if (Array.isArray(code) && code.length > 0 && isRootOwned(code[0]) && R.EnableShellExpressions === true) {
    const first = headTextOf(code[0]);
    const second = code.length > 1 ? headTextOf(code[1]) : "";
    if (first === "function" || first === "class" || first === "@") familyScanRoot += 1;
    else if (first === "async" && second === "function") familyScanRoot += 1;
    else if (first === "abstract" && second === "class") familyScanRoot += 1;
    if (code.length === 1 && (first === "async" || first === "abstract")) asyncAbstractFirstColumn += 1;
  }
  return originalScanRoot.call(StatementScanner, code);
};

let legacyRootBuilds = 0;
for (const shapeClass of [FunctionDeclarationPossibleShape, ClassDeclarationPossibleShape]) {
  const original = shapeClass.prototype.BuildByIndex;
  shapeClass.prototype.BuildByIndex = function (...callArgs) {
    // 只量 shell 模式的主路径：文件级 fallback 会把 EnableShellExpressions 置 false 再整条重解析，
    // 那一次 legacy 建树不是「主路径还在用 legacy 根候选」。
    if (R.EnableShellExpressions === true) legacyRootBuilds += 1;
    return original.apply(this, callArgs);
  };
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

const files = [];
walk(path.join(root, "tests", "cases", "token"), files);
for (const entry of fs.readdirSync(path.join(root, "typescript", "cases", "astjson"))) {
  if (entry.endsWith(".ts")) files.push(path.join(root, "typescript", "cases", "astjson", entry));
}

function run(label) {
  familyScanRoot = 0;
  asyncAbstractFirstColumn = 0;
  legacyRootBuilds = 0;
  const before = {
    legacy: StatementLegacyMetrics.LegacyStatementDispatchCount,
    scan: StatementLegacyMetrics.ScanRootCallCount,
    fallback: R.FileFallbackCount,
  };
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    try {
      SourceFileRunner.Parse(text, path.relative(root, file));
    } catch {
      // TS 非法的 token 语料：与 legacy-retirement 同一批，跳过不计数。
    }
  }
  console.log(JSON.stringify({
    label,
    files: files.length,
    familyScanRoot,
    asyncAbstractFirstColumn,
    legacyRootBuilds,
    legacyDispatch: StatementLegacyMetrics.LegacyStatementDispatchCount - before.legacy,
    scanRootTotal: StatementLegacyMetrics.ScanRootCallCount - before.scan,
    fileFallbacks: R.FileFallbackCount - before.fallback,
  }));
}

R.EnableShellExpressions = true;
R.EnableRootDeclarationShell = true;
run("5d-3 on");
R.EnableRootDeclarationShell = false;
run("5d-2a path (flag off)");
R.EnableRootDeclarationShell = true;
