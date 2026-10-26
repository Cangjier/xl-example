// 族 2/3 专用探针（Stage 4af-F）：**文件以「下一条语句只有一个 token」结束**时，声明壳的 EOF 收口。
//
//   node tests/statement-possible/eof-last-token-close.mjs            # 默认态
//   node tests/statement-possible/eof-last-token-close.mjs --open     # 打开态（EnableDeclarationShell=true）
//
// 缺陷形态：`type T = A` ⏎ `a`。壳的终结候选只在**有新代码单元流入**时被求值，而一个 token 的
// 「流入」要等它自己之后的那一个字符；末 token 等的那一个字符就是 EOF——`StatementEndPossibleShape`
// 因此从没被问过，`StatementShape.TryToClose` 是唯一的机会。它原来对声明族读 `ScanRoot` 的
// `End`，而 `ScanRoot` 对「壳里塞了两条语句」只回 `Mismatch`，于是 `endIndex` 落回末单元 →
// `BuildFromShell` 读到两条 → 抛错 → `DetachShell` → 首条退 raw（首节点 `Common`、`Identifier -2`）。
// `export default x` ⏎ `a` 是同一个 EOF 时机（`end-export-assignment` 构造）。
//
// 修法（本 Stage）：`StatementBoundaryUtil.StatementEndCode` 成为收口位置的唯一实现点
// （从 `StatementEndPossibleShape.ExpressionEndCode` 逐字搬迁），`TryToClose` 对
// `ShellDeclarationFamily` 改读它——与终结候选同一份判据，不是第二套 ASI。
//
// 断言的四个面（与 export-no-semicolon-eof.mjs / declaration-statement-takeover.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；
//   2. 打开态 XML 逐字节 == legacy（EnableShellExpressions=false）——壳不改变形状树；
//   3. 打开态不触发文件级 fallback；声明壳接管次数 == 用例声明值（默认态 == 0）；
//   4. 形状树里不许泄漏 StatementShape / PossibleShape / CatalogGuide。
//
// 用例里 8 条是本次修好的「末 token 单 token」形态（含 `f` / `f;` / `1` / 四个关键字 / `export default`），
// 4 条是对照（单条声明、带 `;`、下一条语句不止一个 token、闭合 `{}` 后接单词），锁定「不许变坏」。
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
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");

const modeOpen = process.argv.includes("--open");

// declarationShells：打开态该用例的声明壳接管次数；默认态一律 0。
const CASES = [
  // ---- 本次修好的 8 条：上一条声明完整、下一条语句只有一个 token，且文件在此结束 ----
  { name: "type-then-word", source: "type T = A\nf", declarationShells: 1 },
  { name: "type-then-word-semi", source: "type T = A\nf;", declarationShells: 1 },
  { name: "type-then-number", source: "type T = A\n1", declarationShells: 1 },
  { name: "type-then-return", source: "type T = A\nreturn", declarationShells: 1 },
  { name: "type-then-debugger", source: "type T = A\ndebugger", declarationShells: 1 },
  { name: "type-then-break", source: "type T = A\nbreak", declarationShells: 1 },
  { name: "type-then-continue", source: "type T = A\ncontinue", declarationShells: 1 },
  // `end-export-assignment` 构造的同族形态（`ExportAssignment` 也是声明 / 导入导出族）。
  { name: "export-default-then-word", source: "export default x\na", declarationShells: 1 },
  // ---- 对照：单条声明 / 带 `;` / 下一条语句不止一个 token / 闭合 `{}` 后接单词 ----
  // 这四条在本次改动**之前**就是对的，锁住它们防止 `TryToClose` 的新分支把「一条语句」切成两条。
  { name: "control-type-alone", source: "type T = A", declarationShells: 1 },
  { name: "control-export-default-alone", source: "export default x", declarationShells: 1 },
  { name: "control-type-semicolon", source: "type T = A;", declarationShells: 1 },
  { name: "control-type-then-call", source: "type T = A\nfoo();", declarationShells: 1 },
  // 闭合 `{…}` 收尾 + 末 token 单 token（同一条「声明跟随边界」判据的另一格）。
  { name: "control-interface-then-word", source: "interface I {}\nf", declarationShells: 1 },
];

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

function astLineDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 个字符起不同`;
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
let passCases = 0;
let knownGaps = 0;
let totalShell = 0;
let takeoverCases = 0;

for (const item of CASES) {
  const problems = [];

  // legacy 基线：两条开关都关，走纯 legacy。
  R.EnableShellExpressions = false;
  R.EnableDeclarationShell = false;
  let legacyAstLine = null;
  try {
    legacyAstLine = SourceFileRunner.Parse(item.source, "case.ts").ToAstLine(0);
  } catch (error) {
    problems.push(`legacy 抛错：${describeError(error)}`);
  }

  // 被测档：默认态（只开 shell 表达式）或打开态（再加声明壳）。
  R.EnableShellExpressions = true;
  R.EnableDeclarationShell = modeOpen;
  const before = { shell: R.DeclarationShellCount, fallback: R.FileFallbackCount };
  let shape = null;
  try {
    shape = SourceFileRunner.Parse(item.source, "case.ts");
  } catch (error) {
    problems.push(`${modeOpen ? "打开态" : "默认态"}抛错：${describeError(error)}`);
  }
  const shellDelta = R.DeclarationShellCount - before.shell;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  totalShell += shellDelta;
  if (shellDelta > 0) takeoverCases += 1;

  const expectedShells = modeOpen ? item.declarationShells : 0;
  if (shellDelta !== expectedShells) {
    problems.push(`DeclarationShellCount 增量=${shellDelta} 期望=${expectedShells}`);
  }

  if (shape !== null) {
    const xml = shape.ToAstLine(0);
    if (legacyAstLine !== null) {
      const diff = astLineDifference(xml, legacyAstLine);
      if (diff !== null) problems.push(`XML != legacy：${diff}`);
    }
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`${tag}  `)) problems.push(`形状树泄漏 <${tag}>`);
    }
    const file = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
  }
  if (fallback) problems.push("触发了文件级 fallback");

  const knownGap = modeOpen && typeof item.knownGap === "string";
  if (problems.length === 0) {
    passCases += 1;
    if (modeOpen) console.log(`PASS ${item.name}  decl=${shellDelta}`);
  } else if (knownGap) {
    knownGaps += 1;
    console.log(`KNOWN-GAP ${item.name}  ${JSON.stringify(item.source)} — ${item.knownGap}`);
    for (const problem of problems) console.log(`     - ${problem}`);
  } else {
    failures.push(item.name);
    console.log(`FAIL ${item.name}  ${JSON.stringify(item.source)}`);
    for (const problem of problems) console.log(`     - ${problem}`);
  }
}

const mode = modeOpen ? "open" : "default";
console.log(`[eof-last-token-close] mode=${mode} cases=${CASES.length} pass=${passCases} failed=${failures.length} knownGap=${knownGaps} takeover=${takeoverCases} totalShell=${totalShell}`);
process.exit(failures.length > 0 ? 1 : 0);
