// 专用探针（Stage gap-EXP）：导出族最后两处 AST 缺陷。
//   ① `export let;`（带分号、**空** VariableDeclarationList）：TS = VariableStatement，
//      我们此前是 ExpressionStatement(ExportKeyword, Identifier)；
//   ② `export default async () => {}` / `async () => {}` ⏎ `(b);`：`async` 被当成声明头，
//      打开态把 ExportAssignment 建成 ExpressionStatement；默认态又由
//      `SourceFileEndPossibleShape` 的 EOF 分支把 `(b)` 并进 CallExpression。
//
//   node tests/statement-possible/export-bare-variable-default-async.mjs            # 默认态
//   node tests/statement-possible/export-bare-variable-default-async.mjs --open     # 打开态（EnableDeclarationShell=true）
//
// 两条的根因（详见 HANDOFF-gap-exp.md）：
// ① 两条路径各错一次，判据是同一个「裸变量关键字」：
//    打开态 —— `StatementBuilder.BuildExportStatement` 的 `export` + 裸 `let` 分支只接
//              「后面没有代码单元」，带 `;` 的形落到 `BuildStatement`，被 `let` 的双角色判据
//              （要求 `StartsBinding`）判成标识符表达式；
//    默认态 —— `ExportDeclarationPossibleShape.BuildByIndex`（kind 4 / kind 12）同样交给
//              `BuildStatement`，同一个坑。
//    两处现在都按「关键字之后没有代码单元（只剩终结符 `;`）」直接建变量语句，
//    与 `export let`（无分号）的既有分支同形。
// ② 三处 `async` 判据都缺了「后面必须同行跟 `function`」：
//    `StatementBuilder.BuildExportStatement` 的 `declarationHead`、`StatementBuilder.IsDefaultDeclarationHead`
//    （这两处打开态走声明壳 → `BuildExportedStatement` → `BuildDefaultModifierStatement`），
//    以及 `ExportDeclarationPossibleShape` 的 Stage 32（默认态 Reject 后落到 EOF 分支吞掉 `(b)`）。
//    默认态那条只能在**下一格到达时**判（单元是流式产出的，不能在 `async` 那格往后偷看）。
//
// 断言的四个面（与 declaration-shell-call-position.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；
//   2. 打开态 XML 逐字节 == legacy（EnableShellExpressions=false，两条开关都关）——壳不改形状树；
//   3. 不触发文件级 fallback；声明壳接管次数 == 用例声明值（默认态一律 0）；
//   4. 形状树里不许泄漏 StatementShape / PossibleShape / CatalogGuide。
//
// **故意不在本文档里的形态**（改前改后两档都一样，属别的修点，本轮不动；读数见 HANDOFF 的「未绿」节）：
//   · `export let = 1;`            —— TS 侧本身是 `VariableStatement(空列表) + ExpressionStatement` 的分裂恢复；
//   · `export default async` ⏎ `function(){}` —— TS 在换行处 ASI（ExportAssignment(async) + FunctionDeclaration），
//     我们的 `async` 是语句词、收不住表达式，`IsStatementBoundaryAfterExpression` 判不出这条边界；
//   · `export default async` ⏎ `() => {}`    —— TS 自身恢复成 `ExportAssignment(CallExpression(async))` + Block；
//   · `export async () => {}`      —— TS 丢掉导出词只留 `ExpressionStatement(ArrowFunction)`；
//   · `namespace N { export default async () => {} }` —— 模块体的 `ModuleBlockShape.BuildMember` 是第二份
//     「default 后跟 async」判据（declarations/module-block-shape），本轮未收。
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

// declarationShells：打开态该用例的声明壳接管次数；默认态一律期望 0。
const CASES = [
  // ═══ ① `export` + 裸变量关键字 + `;`：空 VariableDeclarationList 的 VariableStatement ═══
  { name: "export-let-semicolon", source: "export let;", declarationShells: 1 },
  { name: "export-let-semicolon-space", source: "export let ;", declarationShells: 1 },
  // 后面还有一条语句：头一条收在 `;`、第二条照常建（`;` 不能被前一条吃掉）。
  { name: "export-let-semicolon-then-statement", source: "export let;\nexport const a = 1;", declarationShells: 2 },
  // `export` 与关键字之间换行：TS 的变量语句不因换行断开。
  { name: "export-newline-let-semicolon", source: "export\nlet;", declarationShells: 1 },
  // `export declare let;`：同一形 + DeclareKeyword（kind 12 分支，同一个判据）。
  { name: "export-declare-let-semicolon", source: "export declare let;", declarationShells: 1 },
  // **对照**：无分号的形（4af-G 已修，本轮不许退回去）。
  { name: "control-export-let-bare", source: "export let", declarationShells: 1 },
  // **对照**：有绑定的形走原路（`StartsBinding` 成立），不进裸关键字分支。
  { name: "control-export-let-binding", source: "export let x = 1;", declarationShells: 1 },
  { name: "control-export-let-binding-newline", source: "export let\nx = 1;", declarationShells: 1 },
  // **对照**：裸 `let;` 仍是标识符表达式语句——判据只在 `export` 之后成立。
  { name: "control-bare-let-semicolon", source: "let;", declarationShells: 0 },
  // **对照**：`const` / `var` 没有双角色问题，空列表本来就走变量语句。
  { name: "control-export-const-binding", source: "export const a = 1;", declarationShells: 1 },
  { name: "control-export-var-semicolon", source: "export var;", declarationShells: 1 },
  { name: "control-export-const-semicolon", source: "export const;", declarationShells: 1 },

  // ═══ ② `export default async …`：裸 `async` 是 default 表达式，不是声明头 ═══
  { name: "default-async-arrow-block", source: "export default async () => {}", declarationShells: 1 },
  // 箭头**块体**之后换行接调用位：TS 在此插 ASI（ExportAssignment + ExpressionStatement）。
  { name: "default-async-arrow-block-then-call", source: "export default async () => {}\n(b);", declarationShells: 1 },
  { name: "default-async-arrow-expr", source: "export default async () => 1", declarationShells: 1 },
  { name: "default-async-arrow-param", source: "export default async x => x", declarationShells: 1 },
  { name: "default-async-bare", source: "export default async;", declarationShells: 1 },
  // **对照**：`async` 后面真的跟 `function` 时仍是声明（AsyncKeyword 是声明的子节点）。
  { name: "control-default-async-function", source: "export default async function(){}", declarationShells: 1 },
  { name: "control-default-async-function-named", source: "export default async function f(){}", declarationShells: 1 },
  { name: "control-default-async-generator", source: "export default async function* g(){}", declarationShells: 1 },
  // **对照**：非 async 的同族形态（4af-G 已修，本轮不许退回去）。
  { name: "control-default-arrow", source: "export default () => {}", declarationShells: 1 },
  { name: "control-default-arrow-then-call", source: "export default () => {}\n(b);", declarationShells: 1 },
  { name: "control-default-identifier", source: "export default a", declarationShells: 1 },
  { name: "control-default-identifier-semicolon", source: "export default a;", declarationShells: 1 },
  { name: "control-export-equals-arrow", source: "export = () => {}", declarationShells: 0 },
  { name: "control-export-equals-identifier", source: "export = a;", declarationShells: 0 },
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
    if (modeOpen && legacyAstLine !== null) {
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
console.log(
  `[export-bare-variable-default-async] mode=${mode} cases=${CASES.length} pass=${passCases} failed=${failures.length} knownGap=${knownGaps} takeover=${takeoverCases} totalShell=${totalShell}`,
);
process.exit(failures.length > 0 ? 1 : 0);
