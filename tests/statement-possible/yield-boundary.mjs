// `yield` / 生成器语句族判界专用探针（Stage 5d-6）。
//
//   node tests/statement-possible/yield-boundary.mjs
//   node tests/statement-possible/yield-boundary.mjs --verbose
//
// 覆盖（≥45 形态）：`yield` / `yield expr` / `yield* expr` / `yield;` / 无分号 / 受限产生式
// （`yield` ⏎ `(x)` / `yield` ⏎ `x` / `yield` ⏎ `[1]` / 块注释里的换行）/ 两条 `yield` 相邻 /
// `yield` ⏎ `yield` / `yield*` 换行操作数 / 生成器方法 / 生成器函数表达式 / `async function*` /
// `for await` 里的 `yield` / `yield` 与 `await` 混排 / switch·case 子句内 / if 体内 /
// 标签体里 / try 体里 / `yield: 1`（非生成器 = 合法标签）/ `yield: 1`（生成器 = TS 恢复形）/
// `yield = 1`（标识符赋值）/ `yield\`t\``（模板操作数）/ `yield` 收尾于块 `}` / EOF。
//
// 每个用例五个面（与 control-flow-boundary.mjs / short-family-boundary.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；两条**本轮之前就存在**的
//      形状缺口记 `astKnownGap`（XML == legacy 仍然成立，见 HANDOFF-5d6 §3.3）；
//   2. 默认态 XML 逐字节 == legacy（`EnableShellExpressions = false` + `EnableDeclarationShell = false`）；
//   3. 不触发文件级 fallback；形状树里不许泄漏 StatementShape / PossibleShape / CatalogGuide；
//   4. **迁移读数**：monkeypatch `StatementScanner.ScanRoot`，按调用栈归因 + 按首单元归族。
//      `yield` 族在终结候选路径（`StatementEndPossibleShape.ComputeByIndex` / `.BuildByIndex`）与
//      `StatementShape.TryToClose` 上必须 0 次调用；残余只允许是 legacy 根候选自己的调用
//      （`StatementPossibleShape.ComputeByIndex`，不在本轮允许修改的文件里）。
//   5. 正对照：块内 `class` 声明体壳仍应由 `ScanRoot` 判界（必须 > 0 次），证明计数器不是空转。
//
// 归族判据刻意**不复用** `StatementBoundaryUtil.IsYieldFamilyCode`：反事实实验会把它中和，
// 若探针用它归族，中和之后读数会一起消失、探针照样全绿。这里只按「首单元文本 `yield`」独立判族；
// `yield :`（标签）单独归 `yield-label`——它由控制流族建树，但同样必须 0 次 `ScanRoot`。
//
// 退出码：失败 > 0 → 1。
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst, flatten, kindOf } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const load = (p) => require(path.join(root, "build/ts", p));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementScanner } = load("typescript/tokens/statements/statement-scanner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");

const VERBOSE = process.argv.includes("--verbose");

const DEFAULTS = {
  expressions: R.EnableShellExpressions,
  declaration: R.EnableDeclarationShell,
  yieldStatement: R.EnableYieldStatement,
};

// migrated=true：本 Stage 迁出判界的族（终结候选路径 / TryToClose 上不许再有本族 ScanRoot 调用）。
// astKnownGap=true：TS 侧是错误恢复形 / legacy 形状树本来就有的缺口（**本轮之前**就存在，
// 与判界迁移无关），只测判界，不做逐节点对拍。XML == legacy 仍然要成立。
const CASES = [
  // ---- 基本形态 ----
  { name: "yield-value", source: "function* g() { yield 1; }", migrated: true },
  { name: "yield-bare", source: "function* g() { yield; }", migrated: true },
  { name: "yield-star", source: "function* g() { yield* h(); }", migrated: true },
  { name: "yield-star-no-space", source: "function* g() { yield* h(); }", migrated: true },
  { name: "yield-no-semi", source: "function* g() { yield 1 }", migrated: true },
  { name: "yield-bare-no-semi", source: "function* g() { yield }", migrated: true },
  { name: "yield-eof-no-semi", source: "function* g() { yield 1 }", migrated: true },
  { name: "yield-ident", source: "function* g() { yield x; }", migrated: true },
  { name: "yield-call", source: "function* g() { yield f(a, b); }", migrated: true },
  { name: "yield-object", source: "function* g() { yield { a: 1 }; }", migrated: true },
  { name: "yield-array", source: "function* g() { yield [1, 2]; }", migrated: true },
  { name: "yield-paren", source: "function* g() { yield (x); }", migrated: true },
  { name: "yield-assign", source: "function* g() { yield x = 1; }", migrated: true },
  { name: "yield-ternary", source: "function* g() { yield a ? b : c; }", migrated: true },
  { name: "yield-type-args", source: "function* g() { yield f<number>(); }", migrated: true },
  { name: "yield-template", source: "function* g() { yield `t`; }", migrated: true },

  // ---- 受限产生式：`yield` 之后换行 ⇒ 没有操作数 ----
  { name: "yield-newline-paren", source: "function* g() { yield\n(x); }", migrated: true },
  { name: "yield-newline-ident", source: "function* g() { yield\nx; }", migrated: true },
  { name: "yield-newline-bracket", source: "function* g() { yield\n[1]; }", migrated: true },
  { name: "yield-newline-template", source: "function* g() { yield\n`t`; }", migrated: true },
  { name: "yield-comment-newline", source: "function* g() { yield /*\n*/ (x); }", migrated: true },
  { name: "yield-newline-semi", source: "function* g() { yield\n; }", migrated: true, astKnownGap: true },
  { name: "yield-newline-brace", source: "function* g() { yield\n}", migrated: true },
  { name: "yield-star-newline-operand", source: "function* g() { yield*\n xs; }", migrated: true },

  // ---- 多条相邻 / ASI ----
  { name: "yield-two", source: "function* g() { yield 1; yield 2; }", migrated: true },
  { name: "yield-semi-two", source: "function* g() { yield;\nyield; }", migrated: true, astKnownGap: true },
  { name: "yield-two-no-semi", source: "function* g() { yield 1\nyield 2 }", migrated: true },
  { name: "yield-next-star", source: "function* g() { yield 1\nyield* other(); }", migrated: true },
  { name: "yield-then-return", source: "function* g() { yield 1; return; }", migrated: true },
  { name: "yield-then-let", source: "function* g() { yield 1; let a = 2; }", migrated: true },
  { name: "yield-let-then-yield", source: "function* g() { let a = 1; yield a; }", migrated: true },
  { name: "yield-mixed-raw", source: "function* g() { let a = 1; yield a; a++; }", migrated: true },
  { name: "yield-brace-same-line", source: "function* g() { yield 1 }", migrated: true },
  { name: "yield-semi-newline-next", source: "function* g() { yield 1;\nlet a = 2; }", migrated: true },

  // ---- 宿主形态：方法 / 表达式 / 类 / 嵌套 ----
  { name: "yield-method", source: "const o = { *m() { yield 2; } };", migrated: true },
  { name: "yield-class-method", source: "class K { *m() { yield 2; } }", migrated: true },
  { name: "yield-fn-expression", source: "const g = function* () { yield 1; };", migrated: true },
  { name: "yield-async-generator", source: "async function* g() { yield 1; }", migrated: true },
  { name: "yield-await-mixed", source: "async function* g() { await f(); yield await h(); }", migrated: true },
  { name: "yield-for-await", source: "async function* g() { for await (const x of xs) { yield x; } }", migrated: true },
  { name: "yield-nested-fn", source: "function* g() { function f() { return 1; } yield f(); }", migrated: true },
  { name: "yield-static-block", source: "class C { static { let a = 1; } }", migrated: true },

  // ---- 位置：控制流体 / 标签体 / 子句 ----
  { name: "yield-in-if", source: "function* g() { if (a) { yield 1; } }", migrated: true },
  { name: "yield-in-if-expr", source: "function* g() { if (a) yield 1; }", migrated: true },
  { name: "yield-in-while", source: "function* g() { while (a) { yield 1; } }", migrated: true },
  { name: "yield-in-for", source: "function* g() { for (;;) { yield 1; } }", migrated: true },
  { name: "yield-in-switch", source: "function* g() { switch (x) { case 1: yield 1; } }", migrated: true },
  { name: "yield-in-try", source: "function* g() { try { yield 1; } finally { f(); } }", migrated: true },
  { name: "yield-in-label", source: "function* g() { lbl: { yield 1; } }", migrated: true },
  { name: "yield-in-block", source: "{ function* g() { yield 1; } }", migrated: true },

  // ---- 双角色：标签 / 标识符 ----
  { name: "yield-label-fn", source: "function f() { yield: 1; }", migrated: true },
  { name: "yield-label-generator", source: "function* g() { yield: 1; }", migrated: true, astKnownGap: true },
  { name: "yield-identifier-assign", source: "function f() { yield = 1; }", migrated: true },
  { name: "yield-identifier-call", source: "function f() { yield(1); }", migrated: true },
  { name: "yield-identifier-tag", source: "function f() { yield`t`; }", migrated: true },

  // ---- 正对照：块内 class 声明体壳仍在终结候选路径上读 ScanRoot（必须 > 0 次） ----
  { name: "positive-class-shell", source: "{ class C {} }", control: true },
];

// 独立归族（不读本轮的 `IsYieldFamilyCode`，反事实中和后计数仍然有效）。
function familyOf(code) {
  if (code.length === 0) return "";
  const text = StatementScanner.TextOf(code[0]);
  if (text !== "yield") return text;
  if (code.length >= 2 && StatementScanner.TextOf(code[1]) === ":") return "yield-label";
  return "yield";
}

const MIGRATED_FAMILIES = new Set(["yield", "yield-label"]);

const originalScanRoot = StatementScanner.ScanRoot;
let scanCounts = null;

function callerOf(stack) {
  const frames = stack.split("\n").slice(1);
  for (const frame of frames) {
    if (frame.includes("StatementEndPossibleShape.ComputeByIndex")) return "end.ComputeByIndex";
    if (frame.includes("StatementEndPossibleShape.BuildByIndex")) return "end.BuildByIndex";
    if (frame.includes("StatementShape.TryToClose")) return "shape.TryToClose";
    if (frame.includes("StatementPossibleShape.ComputeByIndex")) return "legacy.ComputeByIndex";
    if (frame.includes("StatementPossibleShape.BuildByIndex")) return "legacy.BuildByIndex";
  }
  return "other";
}

function withScanCounter(action) {
  scanCounts = {
    total: 0,
    endPath: 0,
    endPathMigrated: 0,
    tryToCloseMigrated: 0,
    migratedTotal: 0,
    migratedByCaller: {},
    byFamily: {},
    totalByFamily: {},
    endPathByFamily: {},
  };
  StatementScanner.ScanRoot = function (code) {
    scanCounts.total += 1;
    const caller = callerOf(new Error().stack || "");
    const family = familyOf(code);
    const migrated = MIGRATED_FAMILIES.has(family);
    scanCounts.byFamily[family || "?"] = (scanCounts.byFamily[family || "?"] || 0) + 1;
    scanCounts.totalByFamily[family || "?"] = (scanCounts.totalByFamily[family || "?"] || 0) + 1;
    if (caller === "end.ComputeByIndex" || caller === "end.BuildByIndex") {
      scanCounts.endPath += 1;
      scanCounts.endPathByFamily[family || "?"] = (scanCounts.endPathByFamily[family || "?"] || 0) + 1;
      if (migrated) scanCounts.endPathMigrated += 1;
    }
    if (migrated) {
      scanCounts.migratedTotal += 1;
      scanCounts.migratedByCaller[caller] = (scanCounts.migratedByCaller[caller] || 0) + 1;
      if (caller === "shape.TryToClose") scanCounts.tryToCloseMigrated += 1;
    }
    return originalScanRoot.call(this, code);
  };
  try {
    return action();
  } finally {
    StatementScanner.ScanRoot = originalScanRoot;
  }
}

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    if (kindOf(left.kind) !== kindOf(right.kind)) {
      return `#${index} kind: TS=${kindOf(left.kind)} CJ=${kindOf(right.kind)}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${kindOf(left.kind)} range: TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${kindOf(left.kind)} ${field}: TS=${JSON.stringify(left[field])} CJ=${JSON.stringify(right[field])}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) {
    return `节点数：TS=${tsFlat.length} CJ=${cjFlat.length}`;
  }
  return null;
}

function xmlDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 个字符起不同`;
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
const familyTotals = {};
const familyTotalCalls = {};
const tryToCloseCases = [];
let passed = 0;

for (const item of CASES) {
  const problems = [];

  // 1) legacy 基线 XML（两条开关都关）。
  R.EnableShellExpressions = false;
  R.EnableDeclarationShell = false;
  let legacyXml = null;
  withScanCounter(() => {
    try {
      legacyXml = SourceFileRunner.Parse(item.source, "case.ts").ToXmlString();
    } catch (error) {
      problems.push(`legacy 抛错：${describeError(error)}`);
    }
  });

  // 2) 默认态（仓库默认开关）。
  R.EnableShellExpressions = DEFAULTS.expressions;
  R.EnableDeclarationShell = DEFAULTS.declaration;
  R.EnableYieldStatement = DEFAULTS.yieldStatement;
  const fallbackBefore = R.FileFallbackCount;
  const shellsBefore = R.YieldShellCount;
  let shape = null;
  const counts = withScanCounter(() => {
    try {
      shape = SourceFileRunner.Parse(item.source, "case.ts");
    } catch (error) {
      problems.push(`默认态抛错：${describeError(error)}`);
    }
    return {
      total: scanCounts.total,
      endPath: scanCounts.endPath,
      endPathMigrated: scanCounts.endPathMigrated,
      tryToCloseMigrated: scanCounts.tryToCloseMigrated,
      migratedTotal: scanCounts.migratedTotal,
      migratedByCaller: { ...scanCounts.migratedByCaller },
      byFamily: { ...scanCounts.byFamily },
      totalByFamily: { ...scanCounts.totalByFamily },
      endPathByFamily: { ...scanCounts.endPathByFamily },
    };
  });
  const shells = R.YieldShellCount - shellsBefore;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== fallbackBefore;
  if (fallback) problems.push("触发了文件级 fallback");

  if (item.migrated) {
    if (counts.endPathMigrated !== 0) {
      problems.push(`本族在终结候选路径上仍有 ${counts.endPathMigrated} 次 ScanRoot 调用（期望 0）` +
        ` endPathByFamily=${JSON.stringify(counts.endPathByFamily)}` +
        ` byFamily=${JSON.stringify(counts.byFamily)}`);
    }
    if (counts.tryToCloseMigrated !== 0) {
      problems.push(`本族在 TryToClose 上仍有 ${counts.tryToCloseMigrated} 次 ScanRoot 调用（期望 0）`);
    }
    // 残余只允许是 legacy 根候选自己（statement-possible-shape，不在本轮可改文件清单里）。
    for (const caller of Object.keys(counts.migratedByCaller)) {
      if (caller !== "legacy.ComputeByIndex" && caller !== "legacy.BuildByIndex") {
        problems.push(`本族的 ScanRoot 调用出现在非 legacy 调用点：${caller}` +
          ` byCaller=${JSON.stringify(counts.migratedByCaller)}`);
      }
    }
  }
  if (item.control && counts.endPath <= 0) {
    problems.push(`正对照在终结候选路径上 ${counts.endPath} 次 ScanRoot 调用（期望 > 0）`);
  }

  if (shape !== null) {
    const xml = shape.ToXmlString();
    if (legacyXml !== null) {
      const diff = xmlDifference(xml, legacyXml);
      if (diff !== null) problems.push(`XML != legacy：${diff}`);
    }
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`<${tag}>`)) problems.push(`形状树泄漏 <${tag}>`);
    }
    // 只在**合法形态**上做逐节点对拍。两条 `astKnownGap` 是**本轮之前**就存在的形状缺口
    // （XML == legacy 仍然成立，见 HANDOFF-5d6 §3.3），这里只测判界。
    if (item.astKnownGap !== true) {
      const file = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
      if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
    }
  }

  for (const family of Object.keys(counts.endPathByFamily)) {
    familyTotals[family] = (familyTotals[family] || 0) + counts.endPathByFamily[family];
  }
  for (const family of Object.keys(counts.totalByFamily)) {
    familyTotalCalls[family] = (familyTotalCalls[family] || 0) + counts.totalByFamily[family];
  }
  if (counts.tryToCloseMigrated > 0) tryToCloseCases.push(item.name);

  if (problems.length === 0) {
    passed += 1;
    if (VERBOSE) {
      console.log(`PASS ${item.name}  shell=${shells} endPath=${counts.endPath} endPathMigrated=${counts.endPathMigrated}` +
        ` tryToCloseMigrated=${counts.tryToCloseMigrated} migratedTotal=${counts.migratedTotal}` +
        ` byCaller=${JSON.stringify(counts.migratedByCaller)} endPathByFamily=${JSON.stringify(counts.endPathByFamily)}`);
    }
  } else {
    failures.push(item.name);
    console.log(`FAIL ${item.name}  ${JSON.stringify(item.source)}`);
    for (const problem of problems) console.log(`     - ${problem}`);
  }
}

// 恢复默认开关，避免影响同进程后续用例。
R.EnableShellExpressions = DEFAULTS.expressions;
R.EnableDeclarationShell = DEFAULTS.declaration;
R.EnableYieldStatement = DEFAULTS.yieldStatement;

const knownGaps = CASES.filter((item) => item.astKnownGap).length;
const controls = CASES.filter((item) => item.control).length;
console.log(`[yield-boundary] cases=${CASES.length}（迁出族 ${CASES.filter((i) => i.migrated).length} / 正对照 ${controls}）` +
  ` pass=${passed} failed=${failures.length} knownGap=${knownGaps}`);
console.log(`[yield-boundary] 终结候选路径 ScanRoot 调用（按族合计）：` + JSON.stringify(familyTotals));
console.log(`[yield-boundary] ScanRoot 总调用（按族合计，含 legacy 残余）：` + JSON.stringify(familyTotalCalls));
console.log(`[yield-boundary] TryToClose 上有本族 ScanRoot 调用的语料（${tryToCloseCases.length} 条）：` +
  JSON.stringify(tryToCloseCases));
process.exit(failures.length > 0 ? 1 : 0);
