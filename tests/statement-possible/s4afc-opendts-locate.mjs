// s4af-C C2 定位工装：打开态 real-dts 差异的「首个差异节点」逐文件定位。
//
// 用途：`real-dts-ast.mjs` 只报「有几个 structural / moved / fields」，不给出到底哪个节点差。
// 本脚本对同一批文件做三层定位：
//   1) 顶层语句按 pos 对齐：ts 有、cj 没有的（丢失语句）与 cj 有、ts 没有的（多出语句），
//      各给出 kind / [pos,end] / 源码片段；
//   2) 对齐上的语句做树序逐节点对拍，命中第一个不同节点即停：kind / pos-end / 字段（含 typeof）；
//   3) 全量展平后按 kind 计数的净差（与 real-dts 的 structural 同口径）。
//
// 用法（打开态必须带 preload）：
//   node --require ./tmp/open-flag.cjs tests/statement-possible/s4afc-opendts-locate.mjs [--all|文件...]
//   默认只跑已知的 4 份 undici-types 声明。
// 退出码：全部一致 0；有差异 1；用法错 2。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));
const { StatementRouteUtil } = require(path.join(root, "build", "ts", "typescript", "tokens", "statements", "statement-route-util.js"));

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
const FIELD_NAMES = ["text", "name", "isTypeOnly", "attributes", "namedBindings"];

function tsAst(node) {
  const kindRaw = ts.SyntaxKind[node.kind];
  const out = { kind: kindOf(kindRaw), pos: node.pos, end: node.end };
  if (
    ts.isIdentifier(node) ||
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isNumericLiteral(node) ||
    ts.isBigIntLiteral(node) ||
    ts.isRegularExpressionLiteral(node)
  ) {
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
  // 注意：回调必须用花括号、不返回值 —— `forEachChild` 把任何 truthy 返回当「已处理」并提前停止，
  // 写成 `(child) => children.push(...)` 会让每层只访问第一个子节点（这里曾因此把 ts 侧整棵树截断）。
  node.forEachChild((child) => {
    children.push(tsAst(child));
  });
  if (children.length > 0) out.children = children;
  return out;
}

function cjAst(shape) {
  const range = shape.SourceRange || {};
  const startIndex = typeof range.StartIndex === "number" ? range.StartIndex : -1;
  const endIndex = typeof range.EndIndex === "number" ? range.EndIndex : -1;
  const out = {
    kind: shape.constructor.name.replace("Shape", ""),
    pos: shape.Pos >= 0 ? shape.Pos : startIndex >= 0 ? startIndex : 0,
    end: endIndex >= 0 ? endIndex : 0,
  };
  if (typeof shape.EscapedText === "string") out.text = shape.EscapedText;
  if (typeof shape.Text === "string") out.text = shape.Text;
  if (shape.Name && shape.Name.text !== undefined) out.name = shape.Name.text;
  if (shape.Name && shape.Name.EscapedText) out.name = shape.Name.EscapedText;
  if (shape.IsTypeOnly === true) out.isTypeOnly = true;
  const children = (shape.Data || []).map(cjAst);
  if (children.length > 0) out.children = children;
  return out;
}

function fieldOf(node, name) {
  if (node[name] !== undefined) return node[name];
  const lower = name[0].toLowerCase() + name.slice(1);
  return node[lower];
}

function snippet(text, pos, end) {
  const at = Math.max(0, pos);
  const to = Math.min(text.length, Math.max(end, at + 30));
  return JSON.stringify(text.slice(at, to).replace(/\s+/g, " ").slice(0, 70));
}

function flatten(nodes, out = []) {
  for (const node of nodes || []) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

function kinds(nodes) {
  const map = new Map();
  for (const node of nodes) {
    const kind = kindOf(node.kind);
    map.set(kind, (map.get(kind) || 0) + 1);
  }
  return map;
}

/** 树序逐节点对拍（调用方保证顶层已对齐），返回第一个差异。 */
function firstDifference(their, our, trail) {
  if (their.kind !== our.kind) {
    return { kind: "kind", path: trail.join(" > "), their: their.kind, our: our.kind, at: our };
  }
  if (their.pos !== our.pos || their.end !== our.end) {
    return {
      kind: "pos-end",
      path: [trail.join(" > "), our.kind].filter(Boolean).join(" > "),
      their: `${their.kind}[${their.pos},${their.end}]`,
      our: `${our.kind}[${our.pos},${our.end}]`,
      at: our,
    };
  }
  for (const name of FIELD_NAMES) {
    const a = fieldOf(their, name);
    const b = fieldOf(our, name);
    if (String(a) !== String(b)) {
      return {
        kind: "field",
        path: [trail.join(" > "), our.kind].filter(Boolean).join(" > "),
        field: name,
        their: a === undefined ? undefined : a,
        our: b === undefined ? undefined : b,
        theirType: a === undefined ? "absent" : typeof a,
        ourType: b === undefined ? "absent" : typeof b,
        at: our,
      };
    }
  }
  const theirChildren = their.children || [];
  const ourChildren = our.children || [];
  if (theirChildren.length !== ourChildren.length) {
    return {
      kind: "child-count",
      path: [trail.join(" > "), our.kind].filter(Boolean).join(" > "),
      their: theirChildren.length,
      our: ourChildren.length,
      at: our,
    };
  }
  for (let index = 0; index < theirChildren.length; index++) {
    const child = firstDifference(theirChildren[index], ourChildren[index], [...trail, our.kind]);
    if (child !== null) {
      if (child.position === undefined) child.position = index;
      return child;
    }
  }
  return null;
}

const KNOWN = [
  "node_modules/undici-types/index.d.ts",
  "node_modules/undici-types/mock-call-history.d.ts",
  "node_modules/undici-types/mock-interceptor.d.ts",
  "node_modules/undici-types/snapshot-agent.d.ts",
];

function parseArgs(argv) {
  const args = { all: false, files: [] };
  for (const arg of argv) {
    if (arg === "--all") args.all = true;
    else if (arg.startsWith("-")) {
      console.error(`不认识的选项：${arg}`);
      process.exit(2);
    } else args.files.push(arg);
  }
  return args;
}

function collectAll() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".d.ts")) files.push(full);
    }
  };
  walk(path.join(root, "node_modules", "typescript", "lib"));
  walk(path.join(root, "node_modules", "@types", "node"));
  walk(path.join(root, "node_modules", "undici-types"));
  return files;
}

const args = parseArgs(process.argv.slice(2));
const targets = args.all
  ? collectAll()
  : args.files.length > 0
    ? args.files.map((file) => path.resolve(root, file))
    : KNOWN.map((file) => path.join(root, file));

console.log(
  `s4afc-opendts-locate：EnableDeclarationShell=${StatementRouteUtil.EnableDeclarationShell} ` +
    `EnableShellExpressions=${StatementRouteUtil.EnableShellExpressions} 文件 ${targets.length}`,
);
let diffed = 0;
for (const file of targets) {
  const label = path.relative(root, file);
  const src = fs.readFileSync(file, "utf8");
  const fileNode = ts.createSourceFile(path.basename(file), src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (fileNode.parseDiagnostics || []).length;
  if (diagnostics > 0) {
    console.log(`\n=== ${label}  跳过（TS 非法 ${diagnostics}）`);
    continue;
  }
  let rootShape;
  try {
    rootShape = SourceFileRunner.Parse(src, path.basename(file));
  } catch (error) {
    let message = "";
    for (let node = error; node; node = node.InnerException || node.innerException) {
      const text = node.Message || node.message;
      if (text) message = String(text);
    }
    console.log(`\n=== ${label}  CRASH ${message.split("\n")[0]}`);
    diffed++;
    continue;
  }
  const their = fileNode.statements.map(tsAst);
  const our = rootShape.Data.map(cjAst);
  const theirKeys = their.map((n) => `${n.kind}@${n.pos}`);
  const ourKeys = our.map((n) => `${n.kind}@${n.pos}`);
  const missing = their.filter((n) => !ourKeys.includes(`${n.kind}@${n.pos}`));
  const extra = our.filter((n) => !theirKeys.includes(`${n.kind}@${n.pos}`));
  const treeDiff = (() => {
    if (their.length !== our.length) return null;
    for (let index = 0; index < their.length; index++) {
      const diff = firstDifference(their[index], our[index], []);
      if (diff !== null) return { ...diff, position: index };
    }
    return null;
  })();
  const theirKinds = kinds(flatten(their));
  const ourKinds = kinds(flatten(our));
  const delta = [];
  for (const kind of new Set([...theirKinds.keys(), ...ourKinds.keys()])) {
    const value = (ourKinds.get(kind) || 0) - (theirKinds.get(kind) || 0);
    if (value !== 0) delta.push(`${kind}${value > 0 ? "+" : ""}${value}`);
  }
  if (missing.length === 0 && extra.length === 0 && treeDiff === null && delta.length === 0) continue;
  diffed++;
  console.log(`\n=== ${label}`);
  console.log(`  顶层语句: ts=${their.length} cj=${our.length}；kind 净差: ${delta.length > 0 ? delta.join(" ") : "无"}`);
  // 「末尾收口」证据：末尾是 EOF / 末尾是 `}` / 语句之后只剩空白——这是把差异归到
  // 「EOF 闭合 {} 收口上界」还是「闭合 {} 后无边界」的依据，不用另外猜。
  const eofOfStatement = (node) => {
    if (node.end > src.length) return "end 超出文件";
    const rest = src.slice(node.end);
    if (/^[\s;]*$/.test(rest)) return "其后只剩空白（文件末尾）";
    const nextCodeAt = src.slice(node.end).search(/\S/);
    return `其后还有代码（下一非空白字符=${JSON.stringify(src[node.end + nextCodeAt] || "")}）`;
  };
  const lastUnit = (node) => {
    const text = src.slice(node.pos, node.end).trimEnd();
    return text.length > 0 ? JSON.stringify(text.slice(-1)) : "空";
  };
  for (const node of missing) {
    const index = their.indexOf(node);
    console.log(
      `  丢失语句[ts#${index}] ${node.kind}[${node.pos},${node.end}] 末字符=${lastUnit(node)} ${eofOfStatement(node)} 源码=${snippet(src, node.pos, node.end)}`,
    );
  }
  for (const node of extra) {
    const index = our.indexOf(node);
    console.log(
      `  多出语句[cj#${index}] ${node.kind}[${node.pos},${node.end}] 末字符=${lastUnit(node)} ${eofOfStatement(node)} 源码=${snippet(src, node.pos, node.end)}`,
    );
  }
  if (treeDiff !== null) {
    const kind = treeDiff.kind;
    console.log(`  首个差异节点类别=${kind} path=${treeDiff.path}`);
    if (kind === "kind") console.log(`    kind: ts=${treeDiff.their} cj=${treeDiff.our}`);
    else if (kind === "pos-end")
      console.log(`    节点: ts=${treeDiff.their} cj=${treeDiff.our} 源码=${snippet(src, treeDiff.at.pos, treeDiff.at.end)}`);
    else if (kind === "field")
      console.log(
        `    字段 ${treeDiff.field}: ts=${JSON.stringify(treeDiff.their)}(${treeDiff.theirType}) cj=${JSON.stringify(treeDiff.our)}(${treeDiff.ourType}) 源码=${snippet(src, treeDiff.at.pos, treeDiff.at.end)}`,
      );
    else console.log(`    ts=${JSON.stringify(treeDiff.their)} cj=${JSON.stringify(treeDiff.our)}`);
  }
}
console.log(`\n有差异文件 ${diffed}/${targets.length}`);
process.exit(diffed === 0 ? 0 : 1);
