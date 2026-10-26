// Stage 4b takeover proof（D1/D2 修复后的块体接管）：
//
//   node tests/statement-possible/block-body-takeover.mjs
//
// 对 stage4b 的每个源码，断言：
//   1. 出厂默认确实是 EnableBlockBodyCatalog=true（不伪造「已打开」）；
//   2. 接管档（flag=true）解析不抛错、不触发文件级 fallback；
//   3. BlockShellCount / BlockBodyStatementCount 的增量为期望值（块壳化与块内接管的计数证据）；
//   4. 接管档 XML == legacy 档（EnableShellExpressions=false）XML 逐字节；
//   5. 接管档 AST 与 ts.createSourceFile 逐节点一致（kind / pos / end / text / name / isTypeOnly）；
//   6. 同一源码两次接管档解析 XML 逐字节相同（确定性）；
//   7. XML 里没有 StatementShape 等壳节点泄漏。
//
// 退出码：任一断言失败 → 1。
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

// body = 期望的 BlockBodyStatementCount 增量；shells = 期望的 BlockShellCount 增量。
const cases = [
  { source: "{ let x = 1; f(); }", body: 2, shells: 1 },
  { source: "{ f(); g(); }", body: 2, shells: 1 },
  // Stage 4e：块体目录加入 BlockPossibleShape，内层 `{` 也建壳 —— 深度 2 边界。
  // Stage 4k：括号宿主在子 `{` 创建时就判一格（安全子集：只对目录有终结候选的宿主），内层块体也由
  // 目录接管，深度不再止于 2。body 计数改为**各层分别收集**：`{ { a; } }` 外层收内层块、内层收 `a`，
  // 所以 body=2；`{ { { a; } } }` 三个壳、三层各收一条，body=3。
  { source: "{ { a; } }", body: 2, shells: 2 },
  { source: "{ { let x = 1; } }", body: 2, shells: 2 },
  { source: "{ { { a; } } }", body: 3, shells: 3 },
  { source: "{ { a; } b; }", body: 3, shells: 2 },
  { source: "{ { f(); } { g(); } }", body: 4, shells: 3 },
  { source: "{ let a = 1\nlet b = 2\nf() }", body: 3, shells: 1 },
  { source: "{ a; }\n{ b; }", body: 2, shells: 2 },
  { source: "{ let a = 1; f(); b; }", body: 3, shells: 1 },
  { source: "{ if (a) b; }", body: 1, shells: 1 },
  { source: "{ ; }", body: 1, shells: 1 },
  { source: "{ a; b; c; }", body: 3, shells: 1 },
  { source: "{ let x = 1 }", body: 1, shells: 1 },
  { source: "{ a }", body: 1, shells: 1 },
  { source: "{ f() }", body: 1, shells: 1 },
  { source: "{ let x = 1; f() }", body: 2, shells: 1 },
  { source: "{ /*c*/ a; }", body: 1, shells: 1 },
  { source: "{ a /*c*/ }", body: 1, shells: 1 },
  { source: "{ if (a) b; while (c) d; }", body: 2, shells: 1 },
  { source: "{ a; if (b) c; d; }", body: 3, shells: 1 },
];

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function parse(source) {
  const shape = SourceFileRunner.Parse(source, "case.ts");
  return shape;
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
    if (left[index] !== right[index]) {
      return `第 ${index} 个字符起不同`;
    }
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
const defaultFlag = R.EnableBlockBodyCatalog === true;
if (!defaultFlag) {
  failures.push("出厂默认 EnableBlockBodyCatalog 不是 true");
}

for (const item of cases) {
  const problems = [];
  R.EnableShellExpressions = false;
  R.EnableBlockBodyCatalog = false;
  let legacyAstLine = null;
  try {
    legacyAstLine = parse(item.source).ToAstLine(0);
  } catch (error) {
    problems.push(`legacy 抛错：${describeError(error)}`);
  }

  R.EnableShellExpressions = true;
  R.EnableBlockBodyCatalog = true;
  const before = { shell: R.BlockShellCount, body: R.BlockBodyStatementCount, fallback: R.FileFallbackCount };
  let shape = null;
  try {
    shape = parse(item.source);
  } catch (error) {
    problems.push(`接管档抛错：${describeError(error)}`);
  }
  const shellDelta = R.BlockShellCount - before.shell;
  const bodyDelta = R.BlockBodyStatementCount - before.body;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;

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
  if (shellDelta !== item.shells) problems.push(`BlockShellCount 增量=${shellDelta} 期望=${item.shells}`);
  if (bodyDelta !== item.body) problems.push(`BlockBodyStatementCount 增量=${bodyDelta} 期望=${item.body}`);

  const shown = JSON.stringify(item.source.length > 60 ? `${item.source.slice(0, 60)}…` : item.source);
  if (problems.length > 0) {
    failures.push(`${shown}: ${problems.join(" | ")}`);
    console.log(`FAIL ${shown}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  } else {
    console.log(`PASS ${shown}  shells=${shellDelta} body=${bodyDelta}`);
  }
}

console.log(`\n[block-body-takeover] cases=${cases.length} failed=${failures.length} defaultFlag=${defaultFlag}`);
process.exit(failures.length === 0 ? 0 : 1);
