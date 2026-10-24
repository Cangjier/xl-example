#!/usr/bin/env node
// S3k 专用取证：逗号运算符 / `import.meta` / 动态 `import()` 的**安全回退契约**。
//
// 本组**不**声称这些构造已被形状层接管——它们没有。它钉住的是三条当前事实：
//   ① 壳路径 XML == legacy 路径 XML，逐字节（回退是安全的，不是另一棵树）；
//   ② 壳路径没有触发文件级 fallback，也没有把形状节点泄漏进 XML；
//   ③ 参数 / 数组 / 对象字面量**内部**的逗号不被误当序列：控制组仍由形状树接管（shapeAst >= 1）。
//
// 每条用例同时打印 TotalShapeAst / TotalDeclined / LastDeclineReason / 形状文本 / TS 节点种类，
// 作为「未覆盖构造保持保守拒绝」的可复核台账。将来若有人改了树却没改用例，这里会先红：
// 要么 shapeAst 从 0 变 1（接管了，但没有 SequenceExpression 的专用断言），
// 要么 XML 与 legacy 不再逐字节相同（回退契约被破坏）。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const buildRoot = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(buildRoot, rel));
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementOperatorBody } = load("typescript/tokens/statements/statement-operator-body.js");
const { StatementShapeAst } = load("typescript/tokens/statements/statement-shape-ast.js");

function xmlOf(shape) {
  if (shape === null || shape === undefined || typeof shape.ToXmlString !== "function") return null;
  return shape.ToXmlString();
}

function firstDiff(left, right) {
  if (left === right) return null;
  const limit = Math.min(left.length, right.length);
  for (let at = 0; at < limit; at++) {
    if (left[at] !== right[at]) {
      return `首个不同在第 ${at} 字节：壳=${JSON.stringify(left.slice(Math.max(0, at - 24), at + 24))} legacy=${JSON.stringify(right.slice(Math.max(0, at - 24), at + 24))}`;
    }
  }
  return `长度不同：壳=${left.length} legacy=${right.length}`;
}

function reset() {
  StatementOperatorBody.ShapeTexts.length = 0;
  StatementOperatorBody.TotalBodies = 0;
  StatementOperatorBody.TotalInserts = 0;
  StatementOperatorBody.TotalIncomplete = 0;
  StatementOperatorBody.LastText = "";
  StatementOperatorBody.LastComplete = false;
  StatementShapeAst.TotalShapeAst = 0;
  StatementShapeAst.TotalDeclined = 0;
  StatementShapeAst.LastDeclineReason = "";
}

function runShell(source) {
  reset();
  StatementRouteUtil.EnableShellExpressions = true;
  const shape = SourceFileRunner.Parse(source, "case.ts");
  return {
    shape,
    xml: xmlOf(shape),
    fallback: StatementRouteUtil.LastFileFallback === true,
    texts: StatementOperatorBody.ShapeTexts.slice(),
    shapeAst: StatementShapeAst.TotalShapeAst,
    declined: StatementShapeAst.TotalDeclined,
    declineReason: StatementShapeAst.LastDeclineReason,
  };
}

function runLegacy(source) {
  const previous = StatementRouteUtil.EnableShellExpressions;
  reset();
  try {
    StatementRouteUtil.EnableShellExpressions = false;
    return xmlOf(SourceFileRunner.Parse(source, "case.ts"));
  } finally {
    StatementRouteUtil.EnableShellExpressions = previous;
  }
}

// 形状 / AST 节点遍历：只看结构（Data 子节点），不碰文本。
function walk(node, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (typeof node !== "object") return;
  visit(node);
  const data = node.Data;
  if (Array.isArray(data)) walk(data, visit);
}

function nodeNames(shape) {
  const names = [];
  walk(shape, (node) => {
    const name = node.constructor === undefined || node.constructor === null ? "" : String(node.constructor.name);
    if (name !== "" && names.indexOf(name) < 0) names.push(name);
  });
  return names;
}

function tsKindOf(source) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true);
  const statement = file.statements[0];
  if (statement === undefined) return { statement: "none", expression: "none" };
  const expression = statement.expression;
  return {
    statement: ts.SyntaxKind[statement.kind],
    expression: expression === undefined ? "none" : ts.SyntaxKind[expression.kind],
  };
}

// kind "comma" / "import"：未覆盖，只钉回退契约与台账。
// kind "control"：参数 / 数组 / 对象内部的逗号，必须仍由形状树接管（shapeAst >= 1）。
const cases = [
  { name: "comma-plain", kind: "comma", source: "a, b;" },
  { name: "comma-call", kind: "comma", source: "f(), g();" },
  { name: "comma-assign", kind: "comma", source: "a = (1, 2);" },
  { name: "comma-mixed", kind: "comma", source: "f(a, b), g(c);" },
  { name: "comma-add", kind: "comma", source: "(a, b) + c;" },
  { name: "import-meta-url", kind: "import", source: "import.meta.url;" },
  { name: "import-meta", kind: "import", source: "import.meta;" },
  { name: "import-dynamic", kind: "import", source: "import(\"x\");" },
  { name: "control-call-args", kind: "control", source: "f(a, b);" },
  { name: "control-array", kind: "control", source: "[a, b];" },
  { name: "control-object", kind: "control", source: "({a: 1, b: 2});" },
];

const failures = [];
let passed = 0;
const ledger = [];

for (const caseDef of cases) {
  const problems = [];
  let shell = null;
  try {
    shell = runShell(caseDef.source);
  } catch (error) {
    problems.push(`壳路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
  if (shell !== null) {
    let legacyXml = null;
    try {
      legacyXml = runLegacy(caseDef.source);
    } catch (error) {
      problems.push(`legacy 路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
    }
    if (shell.fallback) problems.push("壳路径触发了文件级 fallback（本组要求不 fallback）");
    if (shell.xml === null) {
      problems.push("壳路径没有产出 XML");
    } else if (legacyXml === null) {
      problems.push("legacy 路径没有产出 XML");
    } else {
      const diff = firstDiff(shell.xml, legacyXml);
      if (diff !== null) problems.push(`壳 XML != legacy XML：${diff}`);
      for (const tag of ["StatementShape", "StatementOperandShape", "StatementOperatorBody", "StatementShapeAst"]) {
        if (shell.xml.includes(`<${tag}>`)) problems.push(`形状泄漏进 XML：<${tag}>`);
      }
    }
    if (caseDef.kind === "control" && shell.shapeAst < 1) {
      problems.push(`控制组未由形状树接管：shapeAst=${shell.shapeAst} declined=${shell.declined}（参数/数组/对象内部逗号不能被误当序列，也不该整体退回 legacy）`);
    }
    if (shell.declined > 0 && String(shell.declineReason).length === 0) {
      problems.push("有拒绝记录但 LastDeclineReason 为空（诊断信息丢失）");
    }
    const tsKind = tsKindOf(caseDef.source);
    ledger.push({
      name: caseDef.name,
      kind: caseDef.kind,
      source: caseDef.source,
      shapeAst: shell.shapeAst,
      declined: shell.declined,
      reason: shell.declineReason,
      texts: shell.texts,
      tsKind,
      nodes: nodeNames(shell.shape).filter((name) => /Sequence|Meta|Import|Binary|Call|Array|Object|Parenthes/.test(name)),
    });
  }
  if (problems.length === 0) {
    passed++;
    console.log(`PASS  ${caseDef.name.padEnd(20)} kind=${caseDef.kind.padEnd(8)} shapeAst=${shell.shapeAst} declined=${shell.declined} ts=${tsKindOf(caseDef.source).expression} texts=${JSON.stringify(shell.texts)}`);
  } else {
    failures.push({ name: caseDef.name, problems });
    console.log(`FAIL  ${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
    for (const problem of problems) console.log(`        ${problem}`);
  }
}

console.log("");
console.log("[ledger] 未覆盖构造的保守回退台账（形状层没有接管，AST 由 legacy 产出）：");
for (const row of ledger) {
  if (row.kind === "control") continue;
  console.log(`  ${row.name}  source=${JSON.stringify(row.source)}  shapeAst=${row.shapeAst} declined=${row.declined}`);
  console.log(`      declineReason=${JSON.stringify(row.reason)}  tsExpression=${row.tsKind.expression}`);
  console.log(`      shapeNodes=${JSON.stringify(row.nodes)}  shapeTexts=${JSON.stringify(row.texts)}`);
}
console.log("");
console.log(`[comma-import-fallback] cases=${cases.length} pass=${passed} fail=${failures.length}（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管）`);
if (failures.length > 0) process.exit(1);
