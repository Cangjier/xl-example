// Stage 5d 可执行 gate 汇总：一次打印每类能力的关键读数（可复现，不做全表）。
//
//   node tests/statement-possible/final-matrix.mjs
//   node tests/statement-possible/final-matrix.mjs --decl      # 进程内打开 EnableDeclarationShell
//   node tests/statement-possible/final-matrix.mjs --class     # 进程内打开 EnableBlockClassShell
//   node tests/statement-possible/final-matrix.mjs --decl --class
//   node tests/statement-possible/final-matrix.mjs --json      # 额外输出机器可读 JSON
//
// 每条用例做三件事（与 harness 同口径）：
//   1. 形状对拍：默认开关档 ToXmlString() 与 legacy 档（EnableShellExpressions=false）逐字节；
//   2. AST 对拍：SourceFileRunner.Parse vs ts.createSourceFile 逐节点（kind/pos/end/text/name/isTypeOnly）；
//      `shapeAst` = 通过条数，这是「形状树建出来的 AST 与 TS 一致」的读数；
//   3. 计数增量：解析前后读路由计数器（+ 块体挂载计数器），打印每个族的增量。
//
// 断言：AST 必须全等、XML 必须等于 legacy、除 `allowFallback` 用例外不得出现文件级 fallback；
// `expect` 里声明的计数器必须达到最小增量（未声明的只打印不判）。
// 退出码：任一断言失败 → 1。
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
let BP = null;
try { BP = load("typescript/tokens/statements/block-possible-shape.js").BlockPossibleShape; } catch { BP = null; }

const argv = process.argv.slice(2);
const useDecl = argv.includes("--decl");
const useClass = argv.includes("--class");
const asJson = argv.includes("--json");

// 出厂默认必须在任何改动之前读出来（矩阵里要打印「默认 vs 本轮覆盖」）。
const FACTORY = {
  EnableShellExpressions: R.EnableShellExpressions,
  EnableControlFlowShell: R.EnableControlFlowShell,
  EnableControlFlowLabel: R.EnableControlFlowLabel,
  EnableControlFlowEmpty: R.EnableControlFlowEmpty,
  EnableAwaitStatement: R.EnableAwaitStatement,
  EnableDeclarationShell: R.EnableDeclarationShell,
  EnableSwitchCaseClause: R.EnableSwitchCaseClause,
  EnableBlockClassShell: R.EnableBlockClassShell,
  EnableBlockBodyCatalog: R.EnableBlockBodyCatalog,
  EnableArrowBodyCatalog: R.EnableArrowBodyCatalog,
  EnableObjectMethodBodyCatalog: R.EnableObjectMethodBodyCatalog,
};
const FACTORY_BLOCK = BP ? {
  EnableBlockDeclarationCatalog: BP.EnableBlockDeclarationCatalog,
  EnableSwitchCaseBody: BP.EnableSwitchCaseBody,
  EnableBlockFunctionBody: BP.EnableBlockFunctionBody,
  EnableSwitchCaseClause: BP.EnableSwitchCaseClause,
} : {};

if (useDecl) R.EnableDeclarationShell = true;
if (useClass) R.EnableBlockClassShell = true;
// 双开关必须同开同关（HANDOFF-s4aa §5.5）。
if (BP && useDecl) { /* 声明族不吃 BlockPossibleShape 的 switch 子句开关，无联动 */ }
if (BP && (useDecl || useClass)) { /* 保持其它开关不动 */ }

function pickCounter(name) {
  if (name in R && typeof R[name] === "number") return () => R[name];
  if (BP && name in BP && typeof BP[name] === "number") return () => BP[name];
  return null;
}

const COUNTERS = [
  "BlockShellCount",
  "BlockBodyStatementCount",
  "ControlFlowShellCount",
  "LabelShellCount",
  "AwaitShellCount",
  "DeclarationShellCount",
  "SwitchCaseClauseMountCount",
  "SwitchCaseClauseShellCount",
  "FunctionBodyMountCount",
  "ArrowBodyMountCount",
  "SwitchCaseBodyMountCount",
  "BlockFunctionBodyMountCount",
];

function snap() {
  const values = {};
  for (const name of COUNTERS) {
    const read = pickCounter(name);
    values[name] = read ? read() : null;
  }
  return values;
}

function delta(before, after) {
  const out = {};
  for (const name of COUNTERS) {
    if (before[name] === null || after[name] === null) continue;
    const change = after[name] - before[name];
    if (change !== 0) out[name] = change;
  }
  return out;
}

function parse(source) {
  return SourceFileRunner.Parse(source, "matrix.ts");
}

function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    if (kindOf(left.kind) !== kindOf(right.kind)) {
      return `#${index} kind TS=${kindOf(left.kind)} CJ=${kindOf(right.kind)}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${kindOf(left.kind)} range TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${kindOf(left.kind)} ${field}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) return `节点数 TS=${tsFlat.length} CJ=${cjFlat.length}`;
  return null;
}

function xmlDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 字符`;
  }
  if (left.length !== right.length) return `长度 ${left.length}/${right.length}`;
  return null;
}

// 用例：family = 能力类别；expect = 必须达到最小增量的计数器；allowFallback = 已知会走文件级兜底。
const CASES = [
  { family: "表达式语句（根）", name: "expr-call", src: "f();" },
  { family: "表达式语句（根）", name: "expr-priority", src: "-a + b * c ** d ** e;" },
  { family: "表达式语句（根）", name: "expr-conditional", src: "x ? y : z;" },
  { family: "表达式语句（根）", name: "expr-assign", src: "x = y = 1;" },
  { family: "表达式语句（根）", name: "expr-comma", src: "a(b, c);" },
  { family: "表达式语句（根）", name: "expr-optional", src: "a?.b?.[0];" },
  { family: "表达式语句（根）", name: "expr-arrow", src: "const g = (a) => a + 1;" },
  { family: "表达式语句（根）", name: "expr-async-arrow", src: "(async () => { await f(); })();" },
  { family: "表达式语句（根）", name: "expr-class", src: "const C = class { m() { } };" },
  { family: "表达式语句（根）", name: "expr-import-meta", src: "import.meta;" },
  { family: "表达式语句（根）", name: "expr-dynamic-import", src: "import(\"m\");" },
  { family: "变量声明（三层）", name: "var-simple", src: "let x = 1;" },
  { family: "变量声明（三层）", name: "var-list", src: "let a = 1, b = 2;" },
  { family: "变量声明（三层）", name: "var-destructure", src: "const { a, b: c } = o;" },
  { family: "块语句", name: "block", src: "{ f(); }", expect: { BlockShellCount: 1, BlockBodyStatementCount: 1 } },
  { family: "块语句", name: "block-nested", src: "{ { f(); } }", expect: { BlockShellCount: 2, BlockBodyStatementCount: 1 } },
  { family: "控制流族", name: "if-body", src: "if (x) { y; }", expect: { ControlFlowShellCount: 1, BlockBodyStatementCount: 1 } },
  { family: "控制流族", name: "while-body", src: "while (x) { y; }", expect: { ControlFlowShellCount: 1 } },
  { family: "控制流族", name: "for-body", src: "for (let i = 0; i < 3; i++) { y; }", expect: { ControlFlowShellCount: 1 } },
  { family: "控制流族", name: "for-of", src: "for (const a of o) { y; }", expect: { ControlFlowShellCount: 1 } },
  { family: "控制流族", name: "try-catch", src: "try { f(); } catch (e) { g(); }", expect: { ControlFlowShellCount: 1 } },
  { family: "控制流族", name: "do-while", src: "do f(); while (x);", expect: { ControlFlowShellCount: 1 } },
  { family: "控制流族", name: "return", src: "function f() { return 1; }", expect: { FunctionBodyMountCount: 1 } },
  { family: "空语句", name: "empty-root", src: ";" },
  { family: "空语句", name: "empty-in-block", src: "{ ; }", expect: { BlockShellCount: 1 } },
  { family: "标签", name: "label", src: "lbl: f();", expect: { LabelShellCount: 1 } },
  { family: "await 体语句", name: "await-block", src: "async function a() { await f(); }", expect: { AwaitShellCount: 1, FunctionBodyMountCount: 1 } },
  { family: "函数体", name: "function-body", src: "function f() { let x = 1; }", expect: { FunctionBodyMountCount: 1, BlockBodyStatementCount: 1 } },
  { family: "箭头体", name: "arrow-body", src: "const g = () => { f(); };", expect: { ArrowBodyMountCount: 1 } },
  { family: "对象方法体", name: "object-method", src: "const o = { m() { f(); } };" },
  { family: "switch 子句级", name: "clause-one", src: "switch (x) { case 1: f(); }", expect: { SwitchCaseClauseMountCount: 1, SwitchCaseClauseShellCount: 1 } },
  { family: "switch 子句级", name: "clause-two", src: "switch (x) { case 1: a; b; }", expect: { SwitchCaseClauseShellCount: 2 } },
  { family: "switch 子句级", name: "clause-case-body", src: "switch (x) { case 1: { g(); } }", expect: { BlockBodyStatementCount: 1 } },
  { family: "switch 子句级", name: "clause-nested-known-gap", src: "switch (x) { case 1: switch (y) { case 2: f(); } }", knownGap: "内层 case 块不走 OnShellBracketCreated 的 switch 分支（HANDOFF-s4aa §5.3）" },
  { family: "声明族（默认关）", name: "decl-type", src: "type T = 1;", expect: useDecl ? { DeclarationShellCount: 1 } : { DeclarationShellCount: 0 } },
  { family: "声明族（默认关）", name: "decl-import", src: "import x from \"y\";", expect: useDecl ? { DeclarationShellCount: 1 } : { DeclarationShellCount: 0 } },
  { family: "声明族（默认关）", name: "decl-export", src: "export const a = 1;", expect: useDecl ? { DeclarationShellCount: 1 } : { DeclarationShellCount: 0 } },
  { family: "块内 class（默认关）", name: "block-class", src: "{ class C { m() { } } }", expect: useClass ? { ControlFlowShellCount: 1 } : {}, knownGap: useClass ? null : "EnableBlockClassShell=false（Stage 4y 未转正）" },
];

const rows = [];
const failures = [];
let shapeAstPass = 0;

for (const item of CASES) {
  const problems = [];
  R.EnableShellExpressions = false;
  let legacyXml = null;
  try {
    legacyXml = parse(item.src).ToXmlString();
  } catch (error) {
    problems.push(`legacy 抛错：${String(error && (error.message || error.Message) || error).split("\n")[0]}`);
  }

  R.EnableShellExpressions = true;
  const before = { ...snap(), fallback: R.FileFallbackCount };
  let shape = null;
  try {
    shape = parse(item.src);
  } catch (error) {
    problems.push(`默认档抛错：${String(error && (error.message || error.Message) || error).split("\n")[0]}`);
  }
  const after = { ...snap(), fallback: R.FileFallbackCount };
  const counts = delta(before, after);
  const fallbackCount = after.fallback - before.fallback;

  if (shape !== null) {
    const xml = shape.ToXmlString();
    if (legacyXml !== null) {
      const diff = xmlDifference(xml, legacyXml);
      if (diff !== null) problems.push(`XML != legacy（${diff}）`);
    }
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`<${tag}>`)) problems.push(`泄漏 <${tag}>`);
    }
    const file = ts.createSourceFile("matrix.ts", item.src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
    else if (problems.length === 0) shapeAstPass += 1;
  }
  if (fallbackCount !== 0 && !item.allowFallback) problems.push(`文件级 fallback +${fallbackCount}`);
  for (const [name, minimum] of Object.entries(item.expect || {})) {
    const actual = counts[name] || 0;
    const at = name in before ? actual : 0;
    if (at < minimum) problems.push(`${name}=${at} < ${minimum}`);
  }

  const row = {
    family: item.family,
    name: item.name,
    counts,
    fallback: fallbackCount,
    xmlEqLegacy: problems.every((p) => !p.startsWith("XML != legacy")),
    astEqTS: problems.every((p) => !p.startsWith("AST != TS")),
    knownGap: item.knownGap || null,
    ok: problems.length === 0,
  };
  rows.push(row);
  const countText = Object.entries(counts).map(([k, v]) => `${k}=+${v}`).join(" ") || "-";
  if (problems.length > 0) {
    if (item.knownGap) {
      console.log(`KNOWN-GAP ${item.name.padEnd(24)} ${countText}  ${item.knownGap}`);
    } else {
      failures.push(`${item.name}: ${problems.join(" | ")}`);
      console.log(`FAIL ${item.name.padEnd(24)} ${countText}  ${problems.join(" | ")}`);
    }
  } else if (item.knownGap) {
    console.log(`PASS ${item.name.padEnd(24)} ${countText}  (known-gap: ${item.knownGap})`);
  } else {
    console.log(`PASS ${item.name.padEnd(24)} ${countText}`);
  }
}

console.log("\n=== 开关矩阵（出厂默认 vs 本轮覆盖）===");
for (const [name, value] of Object.entries({ ...FACTORY, ...FACTORY_BLOCK })) {
  const selected = (name === "EnableDeclarationShell" && useDecl) || (name === "EnableBlockClassShell" && useClass);
  console.log(`${name.padEnd(32)} default=${String(value).padEnd(5)} ${selected ? "→ 本轮 " + String(R[name] ?? BP[name]) : ""}`);
}

console.log(
  `\n[final-matrix] cases=${rows.length} shapeAst=${shapeAstPass}/${rows.length}`
  + ` xmlEqLegacy=${rows.filter((r) => r.xmlEqLegacy).length}/${rows.length}`
  + ` astEqTS=${rows.filter((r) => r.astEqTS).length}/${rows.length}`
  + ` knownGap=${rows.filter((r) => r.knownGap).length} failed=${failures.length}`
  + ` decl=${useDecl ? "open" : "default"} class=${useClass ? "open" : "default"}`,
);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`);
}

if (asJson) {
  const outPath = path.join(here, "final-matrix.json");
  fs.writeFileSync(outPath, `${JSON.stringify({ flags: { ...FACTORY, ...FACTORY_BLOCK }, rows, failures }, null, 2)}\n`, "utf8");
  console.log(`wrote ${outPath}`);
}

process.exit(failures.length === 0 ? 0 : 1);
