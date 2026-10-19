// 生成用例的两份 AST 快照：
//   <构造>.ts-ast.json   —— TypeScript 自己给的 AST（ts.createSourceFile，语义层）
//   <构造>.cj-ast.json   —— 本仓当前解析出的形状树（形状类名 + 区间 + 字段 + 子节点）
//
//   node typescript/cases/ast-json.mjs              # 全量：typescript/cases/*.ts
//   node typescript/cases/ast-json.mjs import       # 只跑指定构造（可给多个）
//
// 两份都按「一行一个用例」对齐，逐条对比即可看出 gap：某条在 cj 侧是 error，
// 或两侧的子节点 / 字段对不上，就是缺口。对拍见 ast-json-diff.mjs。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));

// 构造名 = 用例文件名去掉 .ts；目录里的 *.ts 就是全部可用构造。
function availableStems() {
  return fs
    .readdirSync(here)
    .filter((name) => name.endsWith(".ts") && fs.statSync(path.join(here, name)).isFile())
    .map((name) => name.slice(0, -3))
    .sort();
}

function selectedStems(args) {
  const all = availableStems();
  if (args.length === 0) return all;
  const unknown = [];
  const picked = new Set();
  for (const arg of args) {
    const base = path.basename(arg);
    const stem = base.endsWith(".ts") ? base.slice(0, -3) : base;
    if (all.includes(stem)) picked.add(stem);
    else unknown.push(arg);
  }
  if (unknown.length > 0) {
    console.error(`未知构造：${unknown.join(", ")}`);
    console.error(`可用构造：${all.join(", ")}`);
    process.exit(1);
  }
  return [...picked];
}

function readCases(stem) {
  const source = fs.readFileSync(path.join(here, `${stem}.ts`), "utf8");
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("//"))
    .map((line) => line.replace(/\\n/g, "\n"));
}

// TS 的 SyntaxKind 301/302 在本版里反查出来印的是旧名 AssertClause / AssertEntry，
// 但 `with` 与 `assert` 用的是同一个 kind（301/302），产物侧叫 ImportAttributes / ImportAttribute；
// 先归一，否则每一行 attributes 都会凭空多出「结构差」。
const TS_KIND_ALIASES = new Map([
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);

function norm(node) {
  const out = { kind: node.kind, pos: node.pos, end: node.end };
  if (node.text !== undefined) out.text = node.text;
  if (node.name !== undefined) out.name = node.name;
  if (node.isTypeOnly === true) out.isTypeOnly = true;
  if (node.children && node.children.length > 0) out.children = node.children;
  return out;
}

function tsAst(node) {
  const kind = ts.SyntaxKind[node.kind];
  const out = { kind: TS_KIND_ALIASES.get(kind) || kind, pos: node.pos, end: node.end };
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
    out.text = node.text;
  }
  // 与投影字段同名的那些：没出现的键不写，diff 两侧都缺就是一致。
  // ImportDeclaration 的 type-only 在 TS 里记在子句上、产物侧记在声明上，这里把子句的 true 提上来；
  // 少了这一句，`import type …` 那 8 条会从「一致」变成「字段差」。
  if (ts.isImportDeclaration(node) && node.importClause && node.importClause.isTypeOnly === true) {
    out.isTypeOnly = true;
  }
  if (node.isTypeOnly === true) out.isTypeOnly = true;
  if (ts.isImportClause(node) && node.name && node.name.text) out.name = node.name.text;
  if (ts.isImportSpecifier(node) && node.name && node.name.text) out.name = node.name.text;
  if (ts.isNamespaceImport(node) && node.name && node.name.text) out.name = node.name.text;
  if (ts.isExportSpecifier(node) && node.name && node.name.text) out.name = node.name.text;
  if (ts.isNamespaceExport(node) && node.name && node.name.text) out.name = node.name.text;
  const children = [];
  node.forEachChild((child) => {
    children.push(tsAst(child));
  });
  if (children.length > 0) out.children = children.map(norm);
  return norm(out);
}

function cjAst(shape) {
  const range = shape.SourceRange || {};
  const out = {
    kind: shape.constructor.name.replace("Shape", ""),
    pos: shape.Pos >= 0 ? shape.Pos : (range.Start == null ? 0 : range.Start.Index),
    end: range.End == null ? 0 : range.End.Index + 1,
  };
  if (typeof shape.EscapedText === "string" && shape.EscapedText !== "") out.text = shape.EscapedText;
  if (typeof shape.Text === "string" && shape.Text !== "") out.text = shape.Text;
  if (shape.Name && shape.Name.text !== undefined) out.name = shape.Name.text;
  if (shape.Name && shape.Name.EscapedText) out.name = shape.Name.EscapedText;
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
  return norm(out);
}

const stems = selectedStems(process.argv.slice(2));
let total = 0;
let okAll = 0;
for (const stem of stems) {
  const cases = readCases(stem);
  const tsCases = [];
  const cjCases = [];
  for (const src of cases) {
    const file = ts.createSourceFile("case.ts", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    tsCases.push({ src, ast: file.statements.map(tsAst) });
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
  fs.writeFileSync(path.join(here, `${stem}.ts-ast.json`), JSON.stringify({ cases: tsCases }, null, 2) + "\n");
  fs.writeFileSync(path.join(here, `${stem}.cj-ast.json`), JSON.stringify({ cases: cjCases }, null, 2) + "\n");
  const ok = cjCases.filter((item) => !item.error).length;
  console.log(`[${stem}] cases=${cases.length} cj-ok=${ok} cj-fail=${cases.length - ok}`);
  total += cases.length;
  okAll += ok;
}
console.log(`total cases=${total} cj-ok=${okAll} cj-fail=${total - okAll}（${stems.length} 个构造）`);
