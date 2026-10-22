// 真实 `.d.ts` 的 AST 门禁：node_modules 下 226 份手写声明（lib / @types/node / undici-types）
// 必须全部解析成功，且与本仓形状 AST 逐节点一致（结构 / 位置 / 字段三栏，口径同 ast-json-diff.mjs）。
//
//   node typescript/cases/real-dts-ast.mjs            # 门禁：任一崩溃或差异 → 退出码 1
//   node typescript/cases/real-dts-ast.mjs --verbose  # 印出每处差异
//
// 为什么要有这一门：typescript/cases/*.ts 是**整理过的语料**，它保证「节点种类」覆盖；
// 真实 `.d.ts` 保证「源码形态」覆盖（无分号 ambient 成员、global 增强、计算名、真实 TS 版本自己
// 的 lib 文件……）。历史读数见 docs/Final.md §6.2：修之前 112/226 解析崩溃、能解析的
// 114 份 AST 一致；修之后 226/226 解析成功且 226/226 AST 完全一致。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));

const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["FirstNode", "QualifiedName"],
  ["LastStatement", "DebuggerStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);
const kindOf = (kind) => TS_KIND_ALIASES.get(kind) || kind;

function flatten(nodes, out = []) {
  for (const node of nodes || []) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

function groupByKind(nodes) {
  const map = new Map();
  for (const node of nodes) {
    const kind = kindOf(node.kind);
    if (!map.has(kind)) map.set(kind, []);
    map.get(kind).push(node);
  }
  return map;
}

const FIELD_NAMES = ["text", "name", "isTypeOnly", "attributes", "namedBindings"];
function fieldOf(node, name) {
  const lower = name[0].toLowerCase() + name.slice(1);
  if (node[name] !== undefined) return node[name];
  return node[lower];
}

function norm(node) {
  const out = { kind: node.kind, pos: node.pos, end: node.end };
  if (node.text !== undefined) out.text = node.text;
  if (node.name !== undefined) out.name = node.name;
  if (node.isTypeOnly === true) out.isTypeOnly = true;
  if (node.children && node.children.length > 0) out.children = node.children;
  return out;
}

// 与 ast-json.mjs 的 tsAst / cjAst 同口径。
function tsAst(node) {
  const kindRaw = ts.SyntaxKind[node.kind];
  const out = { kind: TS_KIND_ALIASES.get(kindRaw) || kindRaw, pos: node.pos, end: node.end };
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)
    || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node) || ts.isRegularExpressionLiteral(node)) {
    out.text = node.text;
  }
  if (ts.isImportDeclaration(node) && node.importClause && node.importClause.isTypeOnly === true) out.isTypeOnly = true;
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
  // 空文本也是取值（throw 恢复形里的零宽 Identifier，TS 侧 text=""）。
  if (typeof shape.EscapedText === "string") out.text = shape.EscapedText;
  if (typeof shape.Text === "string") out.text = shape.Text;
  if (shape.Name && shape.Name.text !== undefined) out.name = shape.Name.text;
  if (shape.Name && shape.Name.EscapedText) out.name = shape.Name.EscapedText;
  if (shape.IsTypeOnly === true) out.isTypeOnly = true;
  const children = (shape.Data || []).map(cjAst);
  if (children.length > 0) out.children = children;
  return norm(out);
}

function collectFiles() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".d.ts")) files.push(full);
    }
  };
  walk(path.join(root, "node_modules", "typescript", "lib"));
  walk(path.join(root, "node_modules", "@types", "node"));
  walk(path.join(root, "node_modules", "undici-types"));
  return files;
}

function diffOne(file, src) {
  const fileNode = ts.createSourceFile(path.basename(file), src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (fileNode.parseDiagnostics || []).length;
  if (diagnostics > 0) return { skipped: true };
  let rootShape;
  try {
    rootShape = SourceFileRunner.Parse(src, path.basename(file));
  } catch (error) {
    let message = "";
    for (let node = error; node; node = node.InnerException || node.innerException) {
      const text = node.Message || node.message;
      if (text) message = String(text);
    }
    return { error: message.split("\n")[0] || "unknown" };
  }
  const theirs = flatten(fileNode.statements.map(tsAst));
  const ours = flatten(rootShape.Data.map(cjAst));
  const theirKinds = groupByKind(theirs);
  const ourKinds = groupByKind(ours);
  const structural = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const delta = (ourKinds.get(kind)?.length || 0) - (theirKinds.get(kind)?.length || 0);
    if (delta !== 0) structural.push(`${kind}${delta > 0 ? "+" : ""}${delta}`);
  }
  const moved = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let index = 0; index < theirList.length; index++) {
      if (theirList[index].pos !== ourList[index].pos || theirList[index].end !== ourList[index].end) {
        moved.push(`${kind}[${index}] ${theirList[index].pos}-${theirList[index].end} vs ${ourList[index].pos}-${ourList[index].end}`);
      }
    }
  }
  const fields = [];
  for (const [kind, theirList] of theirKinds) {
    const ourList = ourKinds.get(kind);
    if (!ourList || ourList.length !== theirList.length) continue;
    for (let index = 0; index < theirList.length; index++) {
      for (const name of FIELD_NAMES) {
        const a = fieldOf(theirList[index], name);
        const b = fieldOf(ourList[index], name);
        if (String(a) !== String(b)) fields.push(`${kind}[${index}].${name} ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
  }
  return { structural, moved, fields };
}

const verbose = process.argv.includes("--verbose");
const files = collectFiles();
let identical = 0;
let crashed = 0;
let diffed = 0;
let skipped = 0;
const failures = [];
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const result = diffOne(file, src);
  const label = path.relative(root, file);
  if (result.skipped) {
    skipped++;
    continue;
  }
  if (result.error) {
    crashed++;
    failures.push(`${label}  CRASH  ${result.error}`);
    continue;
  }
  if (result.structural.length === 0 && result.moved.length === 0 && result.fields.length === 0) {
    identical++;
    continue;
  }
  diffed++;
  failures.push(
    `${label}  structural=${result.structural.length} moved=${result.moved.length} fields=${result.fields.length}`,
  );
}

console.log(
  `real-dts: 文件 ${files.length}（跳过 TS 非法 ${skipped}）：解析成功 ${files.length - skipped - crashed}、` +
    `崩溃 ${crashed}；AST 完全一致 ${identical}、有差异 ${diffed}`,
);
if (failures.length > 0) {
  console.log("失败清单（--verbose 才逐条展开差异）：");
  for (const line of failures.slice(0, verbose ? failures.length : 20)) console.log(`  ${line}`);
  if (!verbose && failures.length > 20) console.log(`  （另有 ${failures.length - 20} 处）`);
  process.exit(1);
}
console.log("真实 .d.ts 全量解析成功且 AST 逐节点一致");
process.exit(0);
