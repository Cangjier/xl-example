// 带体 / 链式控制流族判界专用探针（Stage 5d-2b）。
//
//   node tests/statement-possible/control-flow-boundary.mjs
//   node tests/statement-possible/control-flow-boundary.mjs --verbose
//
// 覆盖（≥40 形态）：`if` / `else`（含 else-if 链、悬垂 else、嵌套）/ `while` / `do-while` /
// `for` / `for-in` / `for-of` / `for await` / `try`·`catch`·`finally`（含可选绑定、缺失兜底）/
// `switch`·`case`·`default`（含 fallthrough、子句内嵌套控制流）/ `with` / `label` / 块，
// 以及「单语句体 / 块体混合、体后 ASI、链式关键字（else / while / catch / finally）跨行」的形态。
//
// 每个用例五个面（与 short-family-boundary.mjs / final-matrix.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；唯一例外是 `try { a(); }`
//      这个 TS 错误恢复形（`astKnownGap`：TS 插零宽 Block、legacy 本来就不建，属本轮之前的缺口）；
//   2. 默认态 XML 逐字节 == legacy（`EnableShellExpressions = false` + `EnableDeclarationShell = false`）；
//   3. 不触发文件级 fallback；形状树里不许泄漏 StatementShape / PossibleShape / CatalogGuide；
//   4. **迁移读数**：monkeypatch `StatementScanner.ScanRoot`，按调用栈归因 + 按首单元归族。
//      本族（带体 / 链式控制流 + 块 + 标签）在终结候选路径
//      （`StatementEndPossibleShape.ComputeByIndex` / `.BuildByIndex`）与
//      `StatementShape.TryToClose` 上必须 0 次调用；残余只允许是 legacy 根候选自己的调用
//      （`StatementPossibleShape.ComputeByIndex`，不在本轮允许修改的文件里）。
//   5. 对照：短语句族（5d-2a 已迁出）与表达式 / 声明族（本来就不走 ScanRoot 判界）读数不退化；
//      另有一条真正的正对照（块内 `class` 声明体壳）必须 > 0 次，证明计数器不是空转。
//
// 归族判据刻意**不复用** `StatementBoundaryUtil.IsControlFlowFamilyCode`：反事实实验会把它中和，
// 若探针用它归族，中和之后读数会一起消失、探针照样全绿。这里只按「首单元文本 / `{` 括号 / `标识符 :`」
// 独立判族。
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
};

// migrated=true：本 Stage 迁出判界的族（终结候选路径 / TryToClose 上不许再有本族 ScanRoot 调用）。
// control=true：真正的正对照（仍应由 ScanRoot 判界，用来证明计数器敏感）。
// 其余（短族 / 表达式 / 声明）：只断言 AST / XML / 无 fallback，读数作为「不退化」参考。
const CASES = [
  // ---- if / else ----
  { name: "if-body-expr", source: "if (a) b();", migrated: true },
  { name: "if-body-block", source: "if (a) { b(); }", migrated: true },
  { name: "if-else-expr", source: "if (a) b(); else c();", migrated: true },
  { name: "if-else-block", source: "if (a) { b(); } else { c(); }", migrated: true },
  { name: "if-else-if-chain", source: "if (a) b(); else if (c) d(); else e();", migrated: true },
  { name: "if-else-if-block-chain", source: "if (a) { b(); } else if (c) { d(); } else { e(); }", migrated: true },
  { name: "if-nested-block", source: "if (a) { if (b) { c(); } }", migrated: true },
  { name: "if-nested-dangling-else", source: "if (a) if (b) c(); else d();", migrated: true },
  { name: "if-body-return", source: "if (a) return 1;", migrated: true },
  { name: "if-body-asi-next", source: "if (a) b()\nc();", migrated: true },
  { name: "if-else-newline", source: "if (a) b();\nelse c();", migrated: true },
  { name: "if-body-newline-else", source: "if (a) b()\nelse c();", migrated: true },
  { name: "if-empty-blocks", source: "if (a) {} else {}", migrated: true },
  { name: "if-empty-body", source: "if (a) ;", migrated: true },
  { name: "if-eof-no-semi", source: "if (a) b", migrated: true },
  { name: "if-else-if-empty", source: "if (a) { } else if (b) { }", migrated: true },

  // ---- while ----
  { name: "while-body-expr", source: "while (a) b();", migrated: true },
  { name: "while-body-block", source: "while (a) { b(); }", migrated: true },
  { name: "while-empty-body", source: "while (a) ;", migrated: true },
  { name: "while-body-break", source: "while (a) break;", migrated: true },
  { name: "while-body-asi-next", source: "while (a) b()\nc();", migrated: true },
  { name: "while-eof-no-semi", source: "while (a) b", migrated: true },

  // ---- do-while ----
  { name: "do-body-expr", source: "do b(); while (a);", migrated: true },
  { name: "do-body-block", source: "do { b(); } while (a);", migrated: true },
  { name: "do-header-no-semi", source: "do b(); while (a)", migrated: true },
  { name: "do-header-asi-next", source: "do { b(); } while (a)\nc();", migrated: true },
  { name: "do-empty-body", source: "do ; while (a);", migrated: true },
  { name: "do-body-nested-if", source: "do { if (a) b(); } while (c);", migrated: true },
  { name: "do-newline-while", source: "do { b(); }\nwhile (a);", migrated: true },

  // ---- for / for-in / for-of / for await ----
  { name: "for-empty-header-block", source: "for (;;) { b(); }", migrated: true },
  { name: "for-classic-expr-body", source: "for (let i = 0; i < 2; i++) b();", migrated: true },
  { name: "for-in-block", source: "for (const k in o) { b(k); }", migrated: true },
  { name: "for-of-block", source: "for (const v of xs) { b(v); }", migrated: true },
  { name: "for-await-of-block", source: "for await (const v of xs) { b(v); }", migrated: true },
  { name: "for-body-break", source: "for (;;) break;", migrated: true },
  { name: "for-empty-body", source: "for (;;) ;", migrated: true },
  { name: "for-body-asi-next", source: "for (let i = 0; i < 2; i++)\nb();", migrated: true },
  { name: "for-eof-no-semi", source: "for (;;) b", migrated: true },
  { name: "for-body-nested-break", source: "for (let i = 0; i < 2; i++) { if (i) break; }", migrated: true },

  // ---- try / catch / finally ----
  { name: "try-catch", source: "try { a(); } catch (e) { b(); }", migrated: true },
  { name: "try-finally", source: "try { a(); } finally { c(); }", migrated: true },
  { name: "try-catch-finally", source: "try { a(); } catch (e) { b(); } finally { c(); }", migrated: true },
  { name: "try-catch-no-binding", source: "try { a(); } catch { b(); }", migrated: true },
  { name: "try-then-next", source: "try { a(); } catch (e) { b(); }\nc();", migrated: true },
  { name: "try-catch-throw-body", source: "try { a(); } catch (e) { throw e; }", migrated: true },
  { name: "try-finally-loop-body", source: "try { while (a) b(); } finally { c(); }", migrated: true },
  { name: "try-eof", source: "try { a(); }", migrated: true, astKnownGap: true },
  { name: "try-finally-empty", source: "try { a(); } finally {}", migrated: true },
  { name: "try-catch-empty", source: "try { a(); } catch (e) {}", migrated: true },
  { name: "try-catch-eof", source: "try { a(); } catch (e) { b(); }", migrated: true },
  { name: "try-catch-finally-newline", source: "try { a(); }\ncatch (e) { b(); }\nfinally { c(); }", migrated: true },

  // ---- switch / case / default ----
  { name: "switch-empty", source: "switch (a) {}", migrated: true },
  { name: "switch-default", source: "switch (a) { default: c(); }", migrated: true },
  { name: "switch-case-default", source: "switch (a) { case 1: b(); break; default: c(); }", migrated: true },
  { name: "switch-fallthrough", source: "switch (a) { case 1: case 2: b(); }", migrated: true },
  { name: "switch-clause-nested-if", source: "switch (a) { case 1: if (b) c(); break; }", migrated: true },
  { name: "switch-only-case", source: "switch (a) { case 1: }", migrated: true },
  { name: "switch-eof-no-semi", source: "switch (a) { case 1: b() }", migrated: true },
  { name: "switch-clause-return", source: "switch (a) { case 1: return 1; }", migrated: true },
  { name: "switch-then-next", source: "switch (a) { case 1: b(); }\nc();", migrated: true },

  // ---- with ----
  { name: "with-block", source: "with (a) { b(); }", migrated: true },
  { name: "with-expr-body", source: "with (a) b();", migrated: true },
  { name: "with-body-asi-next", source: "with (a) b()\nc();", migrated: true },

  // ---- label ----
  { name: "label-block", source: "lbl: { a(); }", migrated: true },
  { name: "label-for", source: "lbl: for (;;) { break lbl; }", migrated: true },
  { name: "label-while", source: "lbl: while (a) b();", migrated: true },
  { name: "label-if", source: "lbl: if (a) b();", migrated: true },
  { name: "label-nested-block", source: "lbl: { if (a) { break lbl; } }", migrated: true },
  { name: "label-let", source: "let: 1;", migrated: true },

  // ---- 块 ----
  { name: "block-statements", source: "{ a(); b(); }", migrated: true },
  { name: "block-empty", source: "{}", migrated: true },
  { name: "block-if", source: "{ if (a) b(); }", migrated: true },
  { name: "block-nested", source: "{ { a(); } }", migrated: true },
  { name: "block-switch", source: "{ switch (a) { case 1: b(); } }", migrated: true },

  // ---- 混合 / 链式跨行 ----
  { name: "do-then-if", source: "do b(); while (a);\nif (c) d();", migrated: true },
  { name: "if-then-while-after", source: "if (a) { b(); }\nwhile (c) d();", migrated: true },
  { name: "label-block-if-asi", source: "lbl: { a()\nb(); }", migrated: true },

  // ---- 对照：短语句族（5d-2a 已迁出，读数必须保持 0） ----
  { name: "control-short-return", source: "return 1;" },
  { name: "control-short-variable", source: "let a = 1;" },
  // ---- 对照：表达式族 / 声明族（本来就不走 ScanRoot 判界） ----
  { name: "control-expression", source: "foo();" },
  { name: "control-declaration", source: "class C {}" },
  { name: "control-function", source: "function f() {}" },
  { name: "control-const-enum", source: "const enum E { A }" },
  // ---- 正对照：块内 class 声明体壳仍在终结候选路径上读 ScanRoot（必须 > 0 次） ----
  { name: "positive-class-shell", source: "{ class C {} }", control: true },
  { name: "positive-clause-class-shell", source: "switch (a) { case 1: class C {} }", control: true },
];

const SHORT_HEADS = ["return", "throw", "break", "continue", "debugger", "let", "const", "var", ";"];
const CONTROL_HEADS = ["if", "while", "do", "for", "try", "switch", "with"];

// 独立归族（不读本轮的 `IsControlFlowFamilyCode`，反事实中和后计数仍然有效）。
function familyOf(code) {
  if (code.length === 0) return "";
  const head = code[0];
  if (head !== null && typeof head === "object" && head.StartBracketChar === "{") return "block";
  const text = StatementScanner.TextOf(head);
  if (CONTROL_HEADS.includes(text)) return text;
  if (SHORT_HEADS.includes(text)) return text;
  if (code.length >= 2 && StatementScanner.TextOf(code[1]) === ":") return "label";
  return text;
}

const MIGRATED_FAMILIES = new Set([...SHORT_HEADS, ...CONTROL_HEADS, "block", "label"]);

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
const familyTryToCloseTotals = {};
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
  const fallbackBefore = R.FileFallbackCount;
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
  // 只在**合法形态**上做逐节点对拍。`try { a(); }`（缺 catch/finally）是 TS 的错误恢复形：
  // TS 会在末尾插一个零宽 `Block [12,12)`，legacy 路径本来就不建它（**本轮之前就存在的缺口**，
  // 与本 Stage 无关：XML == legacy 仍然成立）。保留该用例测判界，但把这一条记成 knownGap。
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
  familyTryToCloseTotals[item.name] = counts.tryToCloseMigrated;
  if (counts.tryToCloseMigrated > 0) tryToCloseCases.push(item.name);

  if (problems.length === 0) {
    passed += 1;
    if (VERBOSE) {
      console.log(`PASS ${item.name}  endPath=${counts.endPath} endPathMigrated=${counts.endPathMigrated}` +
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

const migrated = CASES.filter((item) => item.migrated).length;
const controls = CASES.filter((item) => item.control).length;
const knownGaps = CASES.filter((item) => item.astKnownGap).length;
console.log(`[control-flow-boundary] cases=${CASES.length}（迁出族 ${migrated} / 正对照 ${controls}）` +
  ` pass=${passed} failed=${failures.length} knownGap=${knownGaps}`);
console.log(`[control-flow-boundary] 终结候选路径 ScanRoot 调用（按族合计）：` +
  JSON.stringify(familyTotals));
console.log(`[control-flow-boundary] ScanRoot 总调用（按族合计，含 legacy 残余）：` +
  JSON.stringify(familyTotalCalls));
console.log(`[control-flow-boundary] TryToClose 上有本族 ScanRoot 调用的语料（${tryToCloseCases.length} 条）：` +
  JSON.stringify(tryToCloseCases));
process.exit(failures.length > 0 ? 1 : 0);
