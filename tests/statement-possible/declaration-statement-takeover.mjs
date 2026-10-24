// Stage 4q takeover proof（根层声明 / 导入导出语句壳）：
//
//   node tests/statement-possible/declaration-statement-takeover.mjs
//
// 用例来自 tests/statement-possible/declaration-statement-cases.json（组 stage4q）。
//
// 对每个源码断言：
//   1. 出厂默认 EnableShellExpressions / EnableControlFlowShell / EnableDeclarationShell 都是 true；
//   2. 接管档解析不抛错、不触发文件级 fallback；
//   3. DeclarationShellCount 的增量为期望值（这条语句确实走了声明族语句壳）；
//   4. 接管档 XML == legacy 档（EnableShellExpressions=false）逐字节；
//   5. 接管档 AST 与 ts.createSourceFile 逐节点一致（kind / pos / end / text / name / isTypeOnly）；
//   6. 同一源码两次接管档解析 XML 逐字节相同（确定性）；
//   7. XML 里没有 StatementShape / PossibleShape / CatalogGuide 泄漏；
//   8. 块内声明不被块体目录接管（块体目录不注册声明族候选，避免双挂载）。
//
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

const cases = JSON.parse(fs.readFileSync(path.join(here, "declaration-statement-cases.json"), "utf8"));

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

function xmlDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 个字符起不同`;
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
const defaultFlags = R.EnableShellExpressions === true
  && R.EnableControlFlowShell === true
  && R.EnableDeclarationShell === true
  && typeof R.DeclarationShellCount === "number";
if (!defaultFlags) {
  failures.push("出厂默认 EnableShellExpressions / EnableControlFlowShell / EnableDeclarationShell 不都是 true，或 DeclarationShellCount 不存在");
}

let totalShell = 0;
let takeoverCases = 0;

for (const item of cases) {
  const problems = [];
  R.EnableShellExpressions = false;
  let legacyXml = null;
  try {
    legacyXml = parse(item.source).ToXmlString();
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
    const again = parse(item.source).ToXmlString();
    const determinism = xmlDifference(xml, again);
    if (determinism !== null) problems.push(`XML 非确定：${determinism}`);
  }
  if (fallback) problems.push("触发了文件级 fallback（接管档不应需要兜底）");
  if (item.declarationShells !== undefined && shellDelta !== item.declarationShells) {
    problems.push(`DeclarationShellCount 增量=${shellDelta} 期望=${item.declarationShells}`);
  }
  if (bodyDelta !== 0) {
    problems.push(`BlockBodyStatementCount 增量=${bodyDelta} 期望=0（声明族不注册进块体目录）`);
  }

  const shown = JSON.stringify(item.source.length > 60 ? `${item.source.slice(0, 60)}…` : item.source);
  if (problems.length > 0) {
    failures.push(`${shown}: ${problems.join(" | ")}`);
    console.log(`FAIL ${shown}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  } else {
    console.log(`PASS ${shown}  decl=${shellDelta}`);
  }
}

console.log(`\n[declaration-statement-takeover] cases=${cases.length} failed=${failures.length} defaultFlags=${defaultFlags} takeover=${takeoverCases} totalShell=${totalShell}`);
process.exit(failures.length === 0 ? 0 : 1);
