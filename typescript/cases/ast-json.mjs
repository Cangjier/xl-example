// 生成 import 场景的两份 AST 快照：
//   import.ts-ast.json  —— TypeScript 自己给的 AST（ts.createSourceFile，语义层）
//   import.cj-ast.json  —— 本仓当前解析出的形状树（形状类名 + 区间 + 字段 + 子节点）
//
//   node typescript/cases/ast-json.mjs
//
// 两份都按「一行一个用例」对齐，逐条对比即可看出 gap：某条在 cj 侧是 error，
// 或两侧的子节点/字段对不上，就是缺口。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));

const source = fs.readFileSync(path.join(here, "import.ts"), "utf8");
const cases = source
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("//"))
  .map((line) => line.replace(/\\n/g, "\n"));

function tsAst(node) {
  const out = { kind: ts.SyntaxKind[node.kind], pos: node.pos, end: node.end };
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
    out.text = node.text;
  }
  if (ts.isImportDeclaration(node)) {
    out.isTypeOnly = node.importClause ? node.importClause.isTypeOnly === true : false;
    out.attributes = node.attributes ? true : false;
  }
  if (ts.isImportClause(node)) {
    out.isTypeOnly = node.isTypeOnly === true;
    if (node.name && node.name.text) out.name = node.name.text;
    if (node.namedBindings) out.namedBindings = ts.SyntaxKind[node.namedBindings.kind];
  }
  const children = [];
  node.forEachChild((child) => {
    children.push(tsAst(child));
  });
  if (children.length > 0) out.children = children;
  return out;
}

function cjAst(shape) {
  const range = shape.SourceRange || {};
  const out = {
    kind: shape.constructor.name,
    start: range.Start == null ? null : range.Start.Index,
    end: range.End == null ? null : range.End.Index,
  };
  for (const [field, label] of [
    ["EscapedText", "text"],
    ["Text", "text"],
  ]) {
    if (typeof shape[field] === "string" && shape[field] !== "") out[label] = shape[field];
  }
  if (shape.Pos >= 0) out.pos = shape.Pos;
  if (shape.IsTypeOnly === true) out.isTypeOnly = true;
  for (const field of ["ImportClause", "ModuleSpecifier", "Name", "NamedBindings", "Attributes", "AssertClause"]) {
    const value = shape[field];
    if (value && typeof value === "object") out[field] = value.constructor.name;
  }
  if (Array.isArray(shape.Modifiers) && shape.Modifiers.length > 0) {
    out.Modifiers = shape.Modifiers.map((item) => item.constructor.name);
  }
  const children = (shape.Data || []).map(cjAst);
  if (children.length > 0) out.children = children;
  return out;
}

const tsCases = [];
const cjCases = [];
for (const src of cases) {
  const file = ts.createSourceFile("case.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const statements = file.statements.map((statement) => tsAst(statement));
  tsCases.push({ src, ast: statements });
  try {
    const rootShape = SourceFileRunner.Parse(src, "case.ts");
    cjCases.push({ src, ast: rootShape.Data.map(cjAst) });
  } catch (error) {
    let message = "";
    for (let node = error; node; node = node.InnerException || node.innerException) {
      const text = node.Message || node.message;
      if (text) message = String(text);
    }
    cjCases.push({ src, error: message.split("\n")[0] || "unknown" });
  }
}

fs.writeFileSync(path.join(here, "import.ts-ast.json"), JSON.stringify({ cases: tsCases }, null, 2) + "\n");
fs.writeFileSync(path.join(here, "import.cj-ast.json"), JSON.stringify({ cases: cjCases }, null, 2) + "\n");

const ok = cjCases.filter((item) => !item.error).length;
console.log(`cases=${cases.length} cj-ok=${ok} cj-fail=${cases.length - ok}`);
