// declaration 族语句壳探针（Stage 4q 接管路径；Stage 5d 改为双模式）。
//
//   node tests/statement-possible/declaration-statement-takeover.mjs          # 默认模式
//   node tests/statement-possible/declaration-statement-takeover.mjs --open    # 开档模式
//
// 用例来自 tests/statement-possible/declaration-statement-cases.json（组 stage4q）。
//
// 出厂默认：`StatementRouteUtil.EnableDeclarationShell = false`（Stage 4r 实测回退，见
// docs/possible-statement-final-inventory.md §3 与 HANDOFF-s4r/4aa）。因此本脚本不再断言
// 「默认必须是 true」——那是一条长期红门，会把真实回归掩盖在一个稳定失败里。它改成：
//
// 默认模式（不带参数）：
//   1. 读取**实际**默认值（EnableShellExpressions / EnableControlFlowShell /
//      EnableDeclarationShell / DeclarationShellCount），只断言基础不变量（前两者 true、
//      计数存在、开关是 bool），并打印实际默认；
//   2. 断言默认态**不接管**：每条用例 DeclarationShellCount 增量 = 0；
//   3. 断言 XML == legacy（EnableShellExpressions=false 档）、AST == TS 逐节点、
//      无文件级 fallback、BlockBodyStatementCount 增量 = 0（声明族不注册进块体目录）。
//
// 开档模式（--open，进程内把 EnableDeclarationShell 置 true，不改源码 / 不改产物）：
//   1. 断言接管：每条用例 DeclarationShellCount 增量 = 用例声明的 declarationShells；
//   2. 同样断言 XML == legacy、AST == TS、无 fallback、块体增量 0；
//   3. 已知缺陷（Stage 4r 记录的双建壳 / ASI 退化组合）在用例里带 `knownGap` 字段：
//      只打印 KNOWN-GAP 与实测增量，不计入失败（不伪造绿，也不把已知红当新回归）。
//
// 退出码：失败（非 knownGap）> 0 → 1。
import path from "node:path";
import fs from "node:fs";
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

const cases = JSON.parse(fs.readFileSync(path.join(here, "declaration-statement-cases.json"), "utf8"));
const modeOpen = process.argv.includes("--open");

// Stage 4r 已记录的已知缺陷（与 declaration-statement-cases.json 的用例对应）：
// 组合形态下双建壳 / enum 退化成 raw。开档模式里只打印、不判失败；默认模式不会触发它们。
const KNOWN_GAP_SOURCES = new Set([
  "interface I { }\nconst a = 1;",
  "type T = 1;\nenum E { A }\nexport { T, E };",
]);
const knownGapOf = (item) => item.knownGap || (KNOWN_GAP_SOURCES.has(item.source) ? "Stage 4r 已知组合缺陷" : null);

// 实际默认值必须在改动开关之前读。
const actualDefault = R.EnableDeclarationShell === true;
const defaultShellExpressions = R.EnableShellExpressions === true;
const defaultControlFlowShell = R.EnableControlFlowShell === true;
const hasCounters = typeof R.DeclarationShellCount === "number"
  && typeof R.BlockBodyStatementCount === "number"
  && typeof R.FileFallbackCount === "number";
const expectTakeover = modeOpen ? true : actualDefault;

if (modeOpen) R.EnableDeclarationShell = true;

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function parse(source) {
  return SourceFileRunner.Parse(source, "case.ts");
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
const knownGaps = [];
const invariants = [];
if (!defaultShellExpressions) invariants.push("EnableShellExpressions 默认不是 true");
if (!defaultControlFlowShell) invariants.push("EnableControlFlowShell 默认不是 true");
if (!hasCounters) invariants.push("DeclarationShellCount / BlockBodyStatementCount / FileFallbackCount 不存在");
if (invariants.length > 0) {
  failures.push(`基础不变量不成立：${invariants.join("；")}`);
}

let totalShell = 0;
let takeoverCases = 0;
let passCases = 0;

for (const item of cases) {
  const problems = [];
  R.EnableShellExpressions = false;
  let legacyAstLine = null;
  try {
    legacyAstLine = parse(item.source).ToAstLine(0);
  } catch (error) {
    problems.push(`legacy 抛错：${describeError(error)}`);
  }

  R.EnableShellExpressions = true;
  const before = {
    shell: R.DeclarationShellCount,
    fallback: R.FileFallbackCount,
    body: R.BlockBodyStatementCount,
  };
  let shape = null;
  try {
    shape = parse(item.source);
  } catch (error) {
    problems.push(`接管档抛错：${describeError(error)}`);
  }
  const shellDelta = R.DeclarationShellCount - before.shell;
  const bodyDelta = R.BlockBodyStatementCount - before.body;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  totalShell += shellDelta;
  if (shellDelta > 0) takeoverCases += 1;

  const expectedShells = expectTakeover ? (item.declarationShells ?? 0) : 0;
  const shellMismatch = shellDelta !== expectedShells;

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
    const again = parse(item.source).ToAstLine(0);
    const determinism = astLineDifference(xml, again);
    if (determinism !== null) problems.push(`XML 非确定：${determinism}`);
  }
  if (fallback) problems.push("触发了文件级 fallback（接管档不应需要兜底）");
  if (shellMismatch) {
    problems.push(`DeclarationShellCount 增量=${shellDelta} 期望=${expectedShells}（${expectTakeover ? "开档接管" : "默认关不接管"}）`);
  }
  if (bodyDelta !== 0) {
    problems.push(`BlockBodyStatementCount 增量=${bodyDelta} 期望=0（声明族不注册进块体目录）`);
  }

  const shown = JSON.stringify(item.source.length > 60 ? `${item.source.slice(0, 60)}…` : item.source);
  const gap = knownGapOf(item);
  if (problems.length > 0 && gap && expectTakeover) {
    // 已知缺陷只在开档模式出现：记录，不判失败（Stage 4r 已记录，非本轮新回归）。
    knownGaps.push({ source: shown, gap, measured: `decl=${shellDelta}`, problems });
    console.log(`KNOWN-GAP ${shown}  decl=${shellDelta}  gap=${gap}`);
    for (const problem of problems) console.log(`   ~ ${problem}`);
  } else if (problems.length > 0) {
    failures.push(`${shown}: ${problems.join(" | ")}`);
    console.log(`FAIL ${shown}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  } else {
    passCases += 1;
    console.log(`PASS ${shown}  decl=${shellDelta}`);
  }
}

console.log(
  `\n[declaration-statement-takeover] mode=${modeOpen ? "open" : "default"}`
  + ` actualDefault=${actualDefault} expectedTakeover=${expectTakeover}`
  + ` cases=${cases.length} pass=${passCases} knownGap=${knownGaps.length} failed=${failures.length}`
  + ` takeover=${takeoverCases} totalShell=${totalShell}`,
);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`);
}
process.exit(failures.length === 0 ? 0 : 1);
