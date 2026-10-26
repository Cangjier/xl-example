// 族 3 专用探针（Stage 4af-G）：`possible-compute` 打开态最后两条残差——
//   ① `export let`（TS = 带**空** VariableDeclarationList 的 VariableStatement，我们此前是 ExpressionStatement）；
//   ② `export default () => {}` ⏎ `(b);`（箭头**块体**之后换行接调用位：TS 在这里插 ASI，
//      我们此前把 `(b)` 并进 `export default` 的表达式，成了 ExportAssignment(CallExpression)）。
//
//   node tests/statement-possible/declaration-shell-call-position.mjs            # 默认态
//   node tests/statement-possible/declaration-shell-call-position.mjs --open     # 打开态（EnableDeclarationShell=true）
//
// 缺陷 ① 的根因在 `StatementBuilder.BuildExportStatement`：`export` 之后的裸 `let` 交给了
// `BuildStatement`，而 `let` 是上下文关键字（`let;` / `let = 1` 是 ExpressionStatement），
// 它的变量声明分支要求 `StartsBinding` 成立，裸 `let` 于是落进标识符表达式语句。
// 修法：新增 `BuildExportedVariableStatement`，`export` + 无绑定的变量关键字直接建变量语句
// （与根级 EOF 的 `isExportVariable` 空声明列表分支同一形态）。
//
// 缺陷 ② 的根因在声明壳的收口判据：`StatementEndPossibleShape.CallPositionEndCode`（本 Stage 新增）
// 之前，声明壳对「块体箭头 / as / satisfies 之后换行接 `(` `[` 反引号」这一格答不出收口
// （`IsAsiBoundary` 的条件 5 对声明头一律 false），于是壳把下一条语句吞进 `export default`。
// **必须收在 `(b)` 到达的那一格**（不是 EOF）：EOF 时最后到场的是下一条语句的 `;`，壳会连它一起
// 消费，尾巴重放只能把 `(b)` 建出来、`;` 掉成 EmptyStatement——`declare const x: A = a as T` ⏎ `(b);`
// 的旧读数正是这个，所以 #98 是本文件的**对照用例**（它必须与 TS 一致，且不许退回文件级 fallback）。
//
// 断言的四个面（与 eof-last-token-close.mjs / export-no-semicolon-eof.mjs 同口径）：
//   1. AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）；
//   2. 打开态 XML 逐字节 == legacy（EnableShellExpressions=false，两条开关都关）——壳不改变形状树；
//   3. 不触发文件级 fallback；声明壳接管次数 == 用例声明值（默认态一律 0）；
//   4. 形状树里不许泄漏 StatementShape / PossibleShape / CatalogGuide。
//
// **故意不在本文件里的两条既有缺口**（它们两档都不对，属**别的**路径，本轮不改，见 HANDOFF §7）：
//   · `export let;`：走 export 候选 `ExportDeclarationPossibleShape.BuildByIndex` → `BuildStatement`，
//     两档都建出 ExpressionStatement（TS 是空声明列表的 VariableStatement）；
//   · `export default async () => {}`（含 `\n(b);`）：`BuildExportStatement` 把裸 `async` 当成声明头，
//     打开态把 ExportAssignment 建成 ExpressionStatement。两条都应在后续 Stage 单独收口。
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
  // ══ ② 调用位收口：块体箭头 / as / satisfies 之后换行接 `(` `[` 反引号模板 ══
  // 4af-F 留下的 #135（`possible-compute` 最后两条结构差之一）。
  { name: "arrow-block-then-call", source: "export default () => {}\n(b);", declarationShells: 1 },
  // 变体：末尾没有 `;`（收口仍然发生在 `(b)` 那一格，不依赖 EOF）。
  { name: "arrow-block-then-call-nosemi", source: "export default () => {}\n(b)", declarationShells: 1 },
  // 变体：`[` 下标位 / 反引号标签模板位（同一批 IsCallishUnit 判据的另外两格）。
  { name: "arrow-block-then-index", source: "export default () => {}\n[b];", declarationShells: 1 },
  { name: "arrow-block-then-template", source: "export default () => {}\n`t`;", declarationShells: 1 },
  // `as` / `satisfies` 的类型之后：同一个 #135 机制的另一支（此前靠文件级 fallback 兜住，
  // 本 Stage 起由声明壳自己收口——所以这里同时断言「不触发 fallback」）。
  { name: "as-tail-then-call", source: "export default a as T\n(b);", declarationShells: 1 },
  { name: "satisfies-tail-then-call", source: "export default a satisfies T\n(b);", declarationShells: 1 },
  // 变量声明壳（不是 `export default`）的同形形态：`export const` / `declare const`。
  { name: "export-const-arrow-then-call", source: "export const x = () => {}\n(b);", declarationShells: 1 },
  { name: "declare-const-arrow-then-call", source: "declare const x = () => {}\n(b);", declarationShells: 1 },
  // **对照（#98）**：4af-F 的实测结论——把调用位判据挪到 `;` 之前会让这一条退回去。
  // 这里同时锁住「AST == TS」与「不触发文件级 fallback」（它以前是靠 fallback 才对的）。
  { name: "control-98-declare-as-then-call", source: "declare const x: A = a as T\n(b);", declarationShells: 1 },
  // **对照**：尾巴可调用（括号表达式 / 标识符）时 `(` 是**同一条表达式**的调用，绝不拆句。
  { name: "control-parenthesized-arrow-then-call", source: "export default (() => {})\n(b);", declarationShells: 1 },
  { name: "control-callable-tail-then-call", source: "export default a\n(b);", declarationShells: 1 },
  // **对照**：`export default () => {}` 后换行只有一个 `;`（收在 `;`，不涉及调用位判据）。
  { name: "control-arrow-block-then-semicolon", source: "export default () => {}\n;", declarationShells: 1 },
  // **对照**：表达式语句壳（不是声明壳）的同形形态走的是 `IsAsiBoundary`，本 Stage 不碰它。
  { name: "control-expression-shell-arrow-then-call", source: "const x = () => {}\n(b);", declarationShells: 0 },
  // **对照**：`export =` 不建声明壳（`ExportAssignment` 走的是表达式赋值那条路）。
  { name: "control-export-equals-arrow-then-call", source: "export = () => {}\n(b);", declarationShells: 0 },

  // ══ ① `export` + 没有绑定的变量关键字：带**空** VariableDeclarationList 的 VariableStatement ══
  // 4af-F 留下的 #63（`possible-compute` 最后两条结构差之一）。
  { name: "export-let-bare", source: "export let", declarationShells: 1 },
  // 变体：末尾只有 trivia（换行）——壳的 `Data` 里有 trivia 单元，判据不能只看 `Peek(2) === null`。
  { name: "export-let-bare-trailing-newline", source: "export let\n", declarationShells: 1 },
  // 变体：`export` 与关键字之间换行（TS 的 parseModifiers 对 export 不看换行）。
  { name: "export-newline-let-bare", source: "export\nlet", declarationShells: 1 },
  // 同族的另外三个关键字（它们在 `BuildStatement` 里本来就走变量语句，本 Stage 未改，作对照）。
  { name: "control-export-const-bare", source: "export const", declarationShells: 1 },
  { name: "control-export-var-bare", source: "export var", declarationShells: 1 },
  { name: "control-export-declare-const-bare", source: "export declare const", declarationShells: 1 },
  // **对照**：有绑定的形态走 `BuildExportedStatement` → `BuildStatement` → `BuildVariableStatement`
  // （`StartsBinding` 成立），本 Stage 的新分支不接这一格。
  { name: "control-export-let-binding", source: "export let x = 1", declarationShells: 1 },
  { name: "control-export-let-binding-newline", source: "export let\nx = 1", declarationShells: 1 },
  // **对照**：裸 `let` 是**标识符表达式语句**（双角色判据的另一半），不许被上面那条分支带成变量语句。
  { name: "control-bare-let-is-expression", source: "let", declarationShells: 0 },
  // **对照**：`export { … }` 的模块说明符形态与本 Stage 无关。
  { name: "control-export-clause", source: "export { a }", declarationShells: 1 },
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
console.log(`[declaration-shell-call-position] mode=${mode} cases=${CASES.length} pass=${passCases} failed=${failures.length} knownGap=${knownGaps} takeover=${takeoverCases} totalShell=${totalShell}`);
process.exit(failures.length > 0 ? 1 : 0);
