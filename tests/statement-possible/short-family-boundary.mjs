// 短语句族判界专用探针（Stage 5d-2a）。
//
//   node tests/statement-possible/short-family-boundary.mjs
//   node tests/statement-possible/short-family-boundary.mjs --verbose
//
// 覆盖：`return` / `throw`（含受限产生式 ASI）/ `break` / `continue`（含标签与换行）/ `debugger` /
// 空语句（根 / 块 / `if` 体 / 子句）/ 变量声明（`;` / EOF / ASI 收口，以及 `const enum`、`let` 当标识符、
// `for (let …)` 一类**不该误判**的形态），外加 if / while / for / try / switch / do / with / label / 块。
//
// **Stage 5d-2b 起**：原来的 13 条「对照」控制流用例也迁出 `ScanRoot` 了（判据在
// `StatementBoundaryUtil.ControlFlowFamilyEndCode`），所以这里的期望同步改成「0 次」；
// 跨 Stage 的迁移范围仍然可测：正对照（块内 `class` 声明体壳）必须 > 0 次。
// 本 Stage 的专用探针见 `control-flow-boundary.mjs`（85 条形态）。
//
// 每个用例四个面（与 eof-last-token-close.mjs / final-matrix.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；
//   2. 默认态 XML 逐字节 == legacy（`EnableShellExpressions = false` + `EnableDeclarationShell = false`）；
//   3. 不触发文件级 fallback；形状树里不许泄漏 StatementShape / PossibleShape / CatalogGuide；
//   4. **迁移读数**：monkeypatch `StatementScanner.ScanRoot`，按调用栈归因，
//      迁出族（`migrated: true`）在终结候选路径
//      （`StatementEndPossibleShape.ComputeByIndex` / `.BuildByIndex`）上必须 0 次调用；
//      对照组必须 > 0 次——两边一起才算「迁移范围精确」。
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

// 默认态 = 仓库当前默认（`EnableShellExpressions` / `EnableDeclarationShell` 都在位）；
// legacy 对照态 = 两条都关（与 harness 的双路对拍同一口径）。
const DEFAULTS = {
  expressions: R.EnableShellExpressions,
  declaration: R.EnableDeclarationShell,
};

// migrated=true：本轮迁出判界的族（终结候选路径上不许再有迁出族首单元的 ScanRoot 调用）。
// migrated=false：对照（同一条路径必须 > 0 次）。
const CASES = [
  // ---- return：受限产生式 + `;` / EOF / ASI ----
  { name: "return-value", source: "return 1;", migrated: true },
  { name: "return-bare", source: "return;", migrated: true },
  { name: "return-asi", source: "return\nx;", migrated: true },
  { name: "return-paren", source: "return (x);", migrated: true },
  { name: "return-eof", source: "return", migrated: true },
  { name: "return-before-brace", source: "if (a) { return }", migrated: true },
  { name: "return-block", source: "{ return }", migrated: true },
  // ---- throw：受限产生式 + TS 的零宽 Identifier 恢复形 ----
  { name: "throw-call", source: "throw new Error(\"x\");", migrated: true },
  { name: "throw-asi", source: "throw\na;", migrated: true },
  { name: "throw-asi-semicolon", source: "throw\n;", migrated: true },
  // ---- break / continue：标签 + 换行 ----
  { name: "break-label", source: "break lbl;", migrated: true },
  { name: "break-bare", source: "break;", migrated: true },
  { name: "break-asi", source: "break\nlbl;", migrated: true },
  { name: "continue-label", source: "continue lbl;", migrated: true },
  { name: "continue-asi", source: "continue\nlbl", migrated: true },
  // ---- debugger ----
  { name: "debugger-semi", source: "debugger;", migrated: true },
  { name: "debugger-asi", source: "debugger\nx;", migrated: true },
  // ---- 空语句：根 / 块 / if 体 / 子句 ----
  { name: "empty-root", source: ";", migrated: true },
  { name: "empty-block", source: "{ ; }", migrated: true },
  { name: "empty-if-body", source: "if (a) ;", migrated: true },
  { name: "empty-clause", source: "switch (a) { case 1: ; case 2: ; }", migrated: true },
  // ---- 变量声明：`;` / ASI / EOF / 解构 / 类型实参 / for 头 ----
  { name: "let-two", source: "let a = 1;\nlet b = 2;", migrated: true },
  { name: "let-asi", source: "let a = 1\nlet b = 2", migrated: true },
  { name: "let-then-if", source: "let a = 1\nif (x) y;", migrated: true },
  { name: "const-destructure", source: "const { a } = o;\nfoo();", migrated: true },
  { name: "var-eof", source: "var a", migrated: true },
  { name: "var-asi-eof", source: "var a\nvar b", migrated: true },
  { name: "for-let", source: "for (let i = 0; i < 2; i++) { b(); }", migrated: true },
  { name: "let-typearg-asi", source: "let a: Foo<Bar>\nlet b = 1;", migrated: true },
  { name: "const-enum-guard", source: "const enum E { A }", migrated: true },
  { name: "let-as-identifier", source: "let = 1;", migrated: true },
  // ---- 5d-2b 起也已迁出（保留为跨 Stage 回归：读数必须保持 0） ----
  { name: "control-if-block", source: "if (a) { b(); }", migrated: true },
  { name: "control-if-else", source: "if (a) b; else c;", migrated: true },
  { name: "control-while", source: "while (a) { b(); }", migrated: true },
  { name: "control-for", source: "for (;;) { c(); }", migrated: true },
  { name: "control-try", source: "try { a(); } catch (e) { b(); } finally { c(); }", migrated: true },
  { name: "control-switch", source: "switch (a) { case 1: g(); break; default: h(); }", migrated: true },
  { name: "control-do", source: "do { a(); } while (b);", migrated: true },
  { name: "control-with", source: "with (a) { b(); }", migrated: true },
  { name: "control-label-loop", source: "lbl: for (;;) { break lbl; }", migrated: true },
  { name: "control-block", source: "{ a(); b(); }", migrated: true },
  { name: "control-if-return", source: "if (a) return 1;", migrated: true },
  { name: "control-while-throw", source: "while (a) throw e;", migrated: true },
  { name: "control-clause-return", source: "switch (a) { case 1: return 1; }", migrated: true },
  // ---- 正对照：块内 class 声明体壳仍走终结候选的 DeclarationBodyEndCode 分支（必须 > 0 次） ----
  { name: "control-class-shell", source: "{ class C {} }", migrated: false },
  { name: "control-clause-class-shell", source: "switch (a) { case 1: class C {} }", migrated: false },
];

// ---- ScanRoot 计数（迁移读数） ----
// 归族用**被扫代码的首单元文本**：容器的壳（`{` / `if` / `switch` / `for`）首单元不是迁出族，
// 所以「`if (a) { return }` 里外层的 if 壳仍走 ScanRoot」不会被误判成迁出族残留；
// 反过来，若 `return` 自己的壳还在走 ScanRoot，首单元就是 `return`，这里一定会抓到。
const MIGRATED_HEADS = ["return", "throw", "break", "continue", "debugger", "let", "const", "var", ";",
  "if", "while", "do", "for", "try", "switch", "with", "{"];

function headOf(code) {
  if (code.length === 0) return "";
  const first = code[0];
  if (first !== null && typeof first === "object" && first.StartBracketChar === "{") return "{";
  try {
    const text = String(StatementScanner.TextOf(first) || "");
    if (code.length >= 2 && String(StatementScanner.TextOf(code[1]) || "") === ":") return `${text}:`;
    return text;
  } catch {
    return "";
  }
}

// 标签头（`lbl:`）的族名一定是 `标识符:`；`StatementScanner.TextOf` 对 Bracket 返回空串，块用 `{` 标记。
function isMigratedHead(head) {
  return MIGRATED_HEADS.includes(head) || head.endsWith(":");
}

const originalScanRoot = StatementScanner.ScanRoot;
let scanCounts = null;

// 取**最内层**（最近）的那一帧：`BuildByIndex` 会经 `FinishShell` 重放 leftover，
// 重放里 legacy 候选自己也会调 `ScanRoot`，那一层的归属是 legacy，不是 BuildByIndex。
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
  scanCounts = { total: 0, endPath: 0, endPathMigrated: 0, byCaller: {}, byHead: {} };
  StatementScanner.ScanRoot = function (code) {
    scanCounts.total += 1;
    const caller = callerOf(new Error().stack || "");
    scanCounts.byCaller[caller] = (scanCounts.byCaller[caller] || 0) + 1;
    const head = headOf(code);
    scanCounts.byHead[head || "?"] = (scanCounts.byHead[head || "?"] || 0) + 1;
    if (caller === "end.ComputeByIndex" || caller === "end.BuildByIndex") {
      scanCounts.endPath += 1;
      if (isMigratedHead(head)) {
        scanCounts.endPathMigrated += 1;
      }
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
      byCaller: { ...scanCounts.byCaller },
      byHead: { ...scanCounts.byHead },
    };
  });
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== fallbackBefore;
  if (fallback) problems.push("触发了文件级 fallback");

  if (item.migrated && counts.endPathMigrated !== 0) {
    problems.push(`迁出族在终结候选路径上仍有 ${counts.endPathMigrated} 次 ScanRoot 调用（期望 0）` +
      ` byCaller=${JSON.stringify(counts.byCaller)} byHead=${JSON.stringify(counts.byHead)}`);
  }
  if (!item.migrated && counts.endPath <= 0) {
    problems.push(`对照组在终结候选路径上 ${counts.endPath} 次 ScanRoot 调用（期望 > 0）`);
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
    const file = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
  }

  if (problems.length === 0) {
    passed += 1;
    if (VERBOSE) {
      console.log(`PASS ${item.name}  endPathMigrated=${counts.endPathMigrated} endPath=${counts.endPath}` +
        ` total=${counts.total}`);
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
const controls = CASES.length - migrated;
console.log(`[short-family-boundary] cases=${CASES.length}（迁出族 ${migrated} / 正对照 ${controls}）` +
  ` pass=${passed} failed=${failures.length}`);
process.exit(failures.length > 0 ? 1 : 0);
