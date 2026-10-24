// Stage 5c：let / const / var 三层 possible（独立实现路线）的专用对拍。
//
//   node tests/statement-possible/declaration-takeover.mjs
//   node tests/statement-possible/declaration-takeover.mjs --verbose
//   node tests/statement-possible/declaration-takeover.mjs --file=tests/statement-possible/declaration-cases.json --group=stage5c
//
// 四条口径，缺一不算绿：
//   1. TS 真值：ts.createSourceFile 的 AST 与产物 shape 树逐节点一致（ast-compare 的唯一一套归一表）；
//   2. 零差异：同一份源码再跑一遍「接管关闭」（VariableStatementThreeLayer.Enabled=false）的纯 legacy 路径，
//      两棵树 JSON 相同——接管没有改变任何节点 / Pos / End；
//   3. 接管证据：语句级 / 列表级 / 声明级计数 > 0，且与 cases 里声明的 takeover / declarations 相符；
//   4. 未覆盖形态：takeover=false 的 case 必须 0 接管（真实回退），且不抛错。
//
// 三层读数是分开的：statements（语句级接管次数）/ lists（列表级判成立次数）/
// declarations（声明级条目总数）/ fallbacks（判型不成立交回基线的次数）/ mismatch（事后核对失败）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createAstCore, cjAst } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));
const { VariableStatementThreeLayer } = require(
  path.join(root, "build/ts/typescript/tokens/statements/variable-statement-three-layer.js"),
);

const argv = process.argv.slice(2);
const verbose = argv.includes("--verbose");
const fileArg = argv.find((item) => item.startsWith("--file="));
const groupArg = argv.find((item) => item.startsWith("--group="));
const group = groupArg ? groupArg.slice("--group=".length) : "stage5c";
const file = fileArg
  ? path.resolve(root, fileArg.slice("--file=".length))
  : path.join(here, "declaration-cases.json");

if (group !== "stage5c") {
  console.error(`未知分组：${group}（本文件只有 stage5c）`);
  process.exit(1);
}

const cases = JSON.parse(fs.readFileSync(file, "utf8"));
const serialize = (value) => JSON.stringify(value);
const errorText = (error) => {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return (message.split("\n")[0] || "unknown").slice(0, 200);
};

let pass = 0;
let knownTsDiff = 0;
const failures = [];
const totals = { statements: 0, lists: 0, declarations: 0, fallbacks: 0, mismatch: 0 };

for (const item of cases) {
  const problems = [];

  // 口径 3/4：接管开启
  let takenTree = null;
  let takenError = null;
  VariableStatementThreeLayer.Reset();
  try {
    takenTree = SourceFileRunner.Parse(item.source, "case.ts").Data.map(cjAst);
  } catch (error) {
    takenError = errorText(error);
  }
  const counters = {
    statements: VariableStatementThreeLayer.StatementCount,
    lists: VariableStatementThreeLayer.ListCount,
    declarations: VariableStatementThreeLayer.DeclarationCount,
    fallbacks: VariableStatementThreeLayer.FallbackCount,
    mismatch: VariableStatementThreeLayer.MismatchCount,
  };
  totals.statements += counters.statements;
  totals.lists += counters.lists;
  totals.declarations += counters.declarations;
  totals.fallbacks += counters.fallbacks;
  totals.mismatch += counters.mismatch;

  // 口径 2：接管关闭（同一份源码、纯 legacy 路径）
  let legacyTree = null;
  VariableStatementThreeLayer.Enabled = false;
  try {
    legacyTree = SourceFileRunner.Parse(item.source, "case.ts").Data.map(cjAst);
  } catch (error) {
    problems.push(`legacy 路径抛错：${errorText(error)}`);
  } finally {
    VariableStatementThreeLayer.Enabled = true;
  }

  if (takenError !== null) {
    problems.push(`接管路径抛错：${takenError}`);
  }
  if (takenTree !== null && legacyTree !== null && serialize(takenTree) !== serialize(legacyTree)) {
    problems.push("接管路径与纯 legacy 路径的 shape 树不一致（零差异被破坏）");
  }

  // 口径 1：与 TS 编译器逐节点一致
  const tsFile = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tsTree = tsFile.statements.map(tsAst);
  if (item.knownTsDiff === true) {
    // 已知基线差异：CJ 与 TS 对 `let = 1;`（`let` 作标识符的赋值）给出不同节点类别。
    // 本条只作「不接管 / 零差异」取证，TS 逐节点这一口径单独计数，不混进 pass。
    knownTsDiff = knownTsDiff + 1;
  } else if (takenTree !== null && serialize(takenTree) !== serialize(tsTree)) {
    problems.push("与 ts.createSourceFile 逐节点不一致");
  }

  // 口径 3/4：计数与 cases 声明相符
  const expectedTakeover = item.takeover === true;
  if (expectedTakeover && counters.statements <= 0) {
    problems.push("期望接管，但语句级 StatementCount=0");
  }
  if (!expectedTakeover && counters.statements !== 0) {
    problems.push(`期望回退，但发生了接管（StatementCount=${counters.statements}）`);
  }
  if (expectedTakeover && counters.lists <= 0) {
    problems.push("期望列表级成立，但 ListCount=0");
  }
  if (expectedTakeover && counters.declarations !== (item.declarations ?? 1)) {
    problems.push(`声明级条目 ${counters.declarations} != 期望 ${item.declarations ?? 1}`);
  }
  if (counters.mismatch !== 0) {
    problems.push(`事后核对失配 MismatchCount=${counters.mismatch}`);
  }

  const line =
    `${problems.length === 0 ? "PASS" : "FAIL"}  ${item.name.padEnd(26)} ` +
    `stmts=${counters.statements} lists=${counters.lists} decls=${counters.declarations} ` +
    `fallbacks=${counters.fallbacks}`;
  if (problems.length === 0) {
    pass++;
    if (verbose) console.log(line);
  } else {
    failures.push({ name: item.name, source: item.source, problems });
    console.log(line);
    for (const problem of problems) console.log(`        - ${problem}`);
  }
}

console.log("");
console.log(`[stage5c/declaration] cases=${cases.length} pass=${pass} fail=${failures.length} knownTsDiff=${knownTsDiff}`);
console.log(
  `[stage5c/declaration] totals: statements=${totals.statements} lists=${totals.lists} ` +
    `declarations=${totals.declarations} fallbacks=${totals.fallbacks} mismatch=${totals.mismatch}`,
);
if (failures.length > 0) {
  process.exit(1);
}
