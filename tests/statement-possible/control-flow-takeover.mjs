// Stage 4c takeover proof（通用控制流壳）：
//
//   node tests/statement-possible/control-flow-takeover.mjs
//
// 对每个源码断言：
//   1. 出厂默认确实是 EnableControlFlowShell=true（不伪造「已打开」）；
//   2. 接管档解析不抛错、不触发文件级 fallback；
//   3. ControlFlowShellCount 的增量为期望值（控制流族确实走了壳的计数证据）；
//   4. 块内样例的 BlockBodyStatementCount 增量（块体目录也接上了这类语句）；
//   5. 接管档 XML == legacy 档（EnableShellExpressions=false）XML 逐字节；
//   6. 接管档 AST 与 ts.createSourceFile 逐节点一致；
//   7. 同一源码两次接管档解析 XML 逐字节相同（确定性）；
//   8. XML 里没有 StatementShape / PossibleShape / CatalogGuide 泄漏。
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

// cf = 期望的 ControlFlowShellCount 增量；body = 期望的 BlockBodyStatementCount 增量（块内样例）。
const cases = [
  { source: "if (a) b;", cf: 1 },
  { source: "if (a) b; else c;", cf: 1 },
  { source: "if (a) b; else if (c) d; else e;", cf: 1 },
  { source: "while (a) b;", cf: 1 },
  { source: "do b; while (a);", cf: 1 },
  { source: "for (let i = 0; i < 3; i++) b;", cf: 1 },
  { source: "for (const k in o) b;", cf: 1 },
  { source: "for (const v of o) b;", cf: 1 },
  { source: "switch (a) { case 1: b; break; default: c; }", cf: 1 },
  { source: "try { a; } catch (e) { b; }", cf: 1 },
  { source: "try { a; } finally { b; }", cf: 1 },
  { source: "with (a) b;", cf: 1 },
  { source: "throw e;", cf: 1 },
  { source: "debugger;", cf: 1 },
  { source: "if (a) b;\nwhile (c) d;", cf: 2 },
  { source: "if (a) { while (b) { c; } }", cf: 2 },
  // Stage 4n：控制流体体括号挂上块体目录后，**体内语句也被接管**，下面两条的 BlockBodyStatementCount
  // 读数因此上移（`{ if (a) { b; } }` 1→2：`b;` 也被 if 体目录接管；`{ while (a) { b; } let x = 1; }`
  // 2→3：`while` 体里的 `b;` 同样被接管）。XML / AST 断言未变，只有接管计数变深——见 HANDOFF-s4n.md §3。
  { source: "{ if (a) { b; } }", cf: 1, body: 2 },
  { source: "{ if (a) b; else c; d; }", cf: 1, body: 2 },
  { source: "{ ; }", cf: 1, body: 1 },
  { source: "{ while (a) { b; } let x = 1; }", cf: 1, body: 3 },
  // Stage 4d：空语句**已接管**（`EnableControlFlowEmpty` 默认 true；旧读数见 HANDOFF-s4d.md §3）
  { source: ";", cf: 1 },
  { source: ";;", cf: 2 },
  { source: "a;\n;\nb;", cf: 1 },
  { source: ";\n;", cf: 2 },
  { source: "{ ; ; }", cf: 2, body: 2 },
  { source: "if (a) {}\n;\nwhile (b) {}\n;", cf: 4 },
  // Stage 4f：标签**已接管**（`EnableControlFlowLabel` 默认 true；文档级前瞻修掉「第二代码单元未到」的死锁）
  { source: "en: a;", cf: 0, label: 1 },
  { source: "lab: { f(); }", cf: 0, label: 1 },
  { source: "en:\n{ f() }", cf: 0, label: 1 },
  { source: "outer: while (a) { break outer; }", cf: 0, label: 1 },
  { source: "l1: f();\nl2: g();", cf: 0, label: 2 },
  { source: "en: ;", cf: 0, label: 1 },
  { source: "a ? b : c;", cf: 0, label: 0 },
  // Stage 4f：嵌套标签（只有外层建壳，标签体由建造器原子递归）/ 标签体多语句 / 块内标签 / 标签后接语句
  { source: "l1: l2: f();", cf: 0, label: 1 },
  { source: "en: { a; b; }", cf: 0, label: 1 },
  { source: "en: while (a) b;", cf: 0, label: 1 },
  { source: "{ en: a; g(); }", cf: 0, label: 1 },
  { source: "en: a;\nb;", cf: 0, label: 1 },
  { source: "en /* c */ : a;", cf: 0, label: 1 },
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
const defaultFlag = R.EnableControlFlowShell === true && R.EnableControlFlowLabel === true;
if (!defaultFlag) failures.push("出厂默认 EnableControlFlowShell / EnableControlFlowLabel 不都是 true");

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
    cf: R.ControlFlowShellCount,
    label: R.LabelShellCount,
    body: R.BlockBodyStatementCount,
    fallback: R.FileFallbackCount,
  };
  let shape = null;
  try {
    shape = parse(item.source);
  } catch (error) {
    problems.push(`接管档抛错：${describeError(error)}`);
  }
  const cfDelta = R.ControlFlowShellCount - before.cf;
  const labelDelta = R.LabelShellCount - before.label;
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
  if (cfDelta !== item.cf) problems.push(`ControlFlowShellCount 增量=${cfDelta} 期望=${item.cf}`);
  if (item.label !== undefined && labelDelta !== item.label) {
    problems.push(`LabelShellCount 增量=${labelDelta} 期望=${item.label}`);
  }
  if (item.body !== undefined && bodyDelta !== item.body) {
    problems.push(`BlockBodyStatementCount 增量=${bodyDelta} 期望=${item.body}`);
  }

  const shown = JSON.stringify(item.source.length > 60 ? `${item.source.slice(0, 60)}…` : item.source);
  if (problems.length > 0) {
    failures.push(`${shown}: ${problems.join(" | ")}`);
    console.log(`FAIL ${shown}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  } else {
    console.log(`PASS ${shown}  cf=${cfDelta} body=${bodyDelta} label=${labelDelta}`);
  }
}

console.log(`\n[control-flow-takeover] cases=${cases.length} failed=${failures.length} defaultFlag=${defaultFlag}`);
process.exit(failures.length === 0 ? 0 : 1);
