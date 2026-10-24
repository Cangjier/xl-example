#!/usr/bin/env node
// S3k-3 专用取证：`import.meta` / 动态 `import()` 由表达式壳接管。
//
// 每条用例同时钉四件事：
//   ① 形状层确实接管（`TotalShapeAst >= 1`），不是「XML 相等但其实回退了」；
//   ② 没有触发文件级 fallback，也没有把形状节点泄漏进 XML；
//   ③ 壳路径 XML == legacy 路径 XML，逐字节；
//   ④ AST 节点种类与 TypeScript 的逐节点口径一致（`MetaProperty` / `ImportKeyword` + 调用 /
//      属性访问），并额外钉住 AST 里出现的形状类名（`MetaPropertyShape` / `ImportKeywordShape`）。
//
// 声明形态（`import x from "y"` / `import {a} from "m"`）是**控制组**：必须仍然 shapeAst == 0、
// XML == legacy——路由的 `import` 分支只能把 `import(` / `import.` 判成表达式，不能碰声明。
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

function tsKinds(source) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true);
  const statement = file.statements[0];
  if (statement === undefined) return { statement: "none", expression: "none" };
  const expression = statement.expression;
  return {
    statement: ts.SyntaxKind[statement.kind],
    expression: expression === undefined ? "none" : ts.SyntaxKind[expression.kind],
  };
}

// kind "expression"：必须被形状层接管；kind "decl"：控制组，必须仍然 shapeAst == 0。
const cases = [
  { name: "import-meta", kind: "expression", source: "import.meta;", expression: "MetaProperty", want: ["MetaPropertyShape"] },
  { name: "import-meta-url", kind: "expression", source: "import.meta.url;", expression: "PropertyAccessExpression", want: ["MetaPropertyShape", "PropertyAccessExpressionShape"] },
  { name: "import-dynamic", kind: "expression", source: "import(\"x\");", expression: "CallExpression", want: ["ImportKeywordShape", "CallExpressionShape"] },
  { name: "import-dynamic-then", kind: "expression", source: "import(\"x\").then;", expression: "PropertyAccessExpression", want: ["ImportKeywordShape", "CallExpressionShape", "PropertyAccessExpressionShape"] },
  { name: "import-meta-then-call", kind: "expression", source: "import.meta.url.length;", expression: "PropertyAccessExpression", want: ["MetaPropertyShape"] },
  { name: "import-decl-default", kind: "decl", source: "import x from \"y\";" },
  { name: "import-decl-named", kind: "decl", source: "import { a } from \"m\";" },
  { name: "import-decl-side-effect", kind: "decl", source: "import \"m\";" },
  { name: "import-decl-mixed", kind: "decl", source: "import x from \"y\";\nimport.meta.url;", shapeAst: 1 },
];

let pass = 0;
const failed = [];
for (const item of cases) {
  const shell = runShell(item.source);
  const legacy = runLegacy(item.source);
  const names = nodeNames(shell.shape);
  const kinds = tsKinds(item.source);
  const problems = [];
  if (shell.fallback) problems.push("触发了文件级 fallback");
  if (shell.xml !== legacy) problems.push(firstDiff(shell.xml, legacy) || "XML 不同");
  if (item.kind === "expression") {
    if (shell.shapeAst < 1) problems.push(`shapeAst=${shell.shapeAst}（形状层没有接管）`);
    if (kinds.expression !== item.expression) problems.push(`TS 表达式=${kinds.expression}，期望 ${item.expression}`);
    for (const want of item.want) {
      if (names.indexOf(want) < 0) problems.push(`AST 里没有 ${want}`);
    }
  } else {
    const expectShapeAst = item.shapeAst === undefined ? 0 : item.shapeAst;
    if (shell.shapeAst !== expectShapeAst) problems.push(`shapeAst=${shell.shapeAst}，期望 ${expectShapeAst}`);
  }
  const ok = problems.length === 0;
  if (ok) pass++;
  else failed.push({ name: item.name, problems });
  console.log(`  ${ok ? "ok  " : "FAIL"} ${item.name}`);
  console.log(`      source=${JSON.stringify(item.source)} shapeAst=${shell.shapeAst} declined=${shell.declined} fallback=${shell.fallback} tsStatement=${kinds.statement} tsExpression=${kinds.expression}`);
  console.log(`      texts=${JSON.stringify(shell.texts)} names=${JSON.stringify(names.filter((n) => n.indexOf("Shape") >= 0))}`);
  if (!ok) for (const problem of problems) console.log(`      ! ${problem}`);
}
console.log(`[import-expression] cases=${cases.length} pass=${pass} fail=${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
