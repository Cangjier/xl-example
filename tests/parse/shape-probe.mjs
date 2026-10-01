/// 投影探针：把一段 TS 源码同时喂给 TypeScript 自带 parser 与**投影层**
/// （`ts-shape.mjs`），把两棵树**并排带区间**打印出来，用来定位单个 gap 的根因。
///
///   node tests/parse/shape-probe.mjs "declare function f(): void"
///   node tests/parse/shape-probe.mjs --file <路径> [--lines a-b]
///   node tests/parse/shape-probe.mjs --file <路径> --kind Identifier   # 只看某一类对不上的
///
/// 与 `probe.mjs` 的分工：那个打印**产物 XML**（token 层长什么样），
/// 这个打印**投影后的 TS 形状**（差在哪一格）——`cases:tsast` 报了数但没有定位能力。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { projectRoot } from "./ts-shape.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const args = process.argv.slice(2);
const fileAt = args.indexOf("--file");
const linesAt = args.indexOf("--lines");
const kindAt = args.indexOf("--kind");
const onlyKind = kindAt >= 0 ? args[kindAt + 1] : undefined;
let label = "snippet";
let source;

if (fileAt >= 0) {
  const p = path.resolve(root, args[fileAt + 1]);
  label = path.relative(root, p);
  source = fs.readFileSync(p, "utf8");
  if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
  if (linesAt >= 0) {
    const [a, b] = args[linesAt + 1].split("-").map(Number);
    source = source.split("\n").slice(a - 1, b).join("\n");
    label += `:${a}-${b}`;
  }
} else {
  source = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--kind").join(" ");
  if (!source) {
    console.error('用法: node tests/parse/shape-probe.mjs "<源码>"  或  --file <路径> [--lines a-b] [--kind Name]');
    process.exit(2);
  }
}

const SK = ts.SyntaxKind;
const kindName = (kind) => (typeof kind === "string" ? kind : (SK[kind] ?? String(kind)));

const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["ThisType", "ThisKeyword"],
]);

const sf = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

const theirNodes = [];
(function visit(node, depth) {
  const raw = SK[node.kind];
  theirNodes.push({
    depth,
    raw,
    kind: TS_KIND_ALIASES.get(raw) ?? raw,
    start: node.getStart(sf),
    end: node.end,
    text: source.slice(node.getStart(sf), node.end),
  });
  ts.forEachChild(node, (child) => visit(child, depth + 1));
})(sf, 0);

const template = new Template();
const document = new TextDocument(source);
document.FilePath = label;
const context = new TextContext(template);
context.Process(document);
const projected = projectRoot(context.Root.ToList(), source);

const ourNodes = [];
(function visit(node, depth) {
  if (node === null || typeof node !== "object" || !("kind" in node)) return;
  const fields = Object.entries(node)
    .filter(([k, v]) => !["kind", "pos", "end", "text"].includes(k) &&
      (Array.isArray(v) ? v.some((x) => x && typeof x === "object" && "kind" in x) : v && typeof v === "object" && "kind" in v))
    .map(([k]) => k)
    .sort();
  ourNodes.push({ depth, kind: node.kind, start: node.pos ?? 0, end: node.end ?? node.pos ?? 0, fields });
  for (const [key, value] of Object.entries(node)) {
    if (["kind", "pos", "end", "text"].includes(key)) continue;
    if (Array.isArray(value)) for (const c of value) visit(c, depth + 1);
    else if (value && typeof value === "object" && "kind" in value) visit(value, depth + 1);
  }
})(projected.ast, 0);

const ourByKind = new Map();
for (const n of ourNodes) {
  if (!ourByKind.has(n.kind)) ourByKind.set(n.kind, []);
  ourByKind.get(n.kind).push(n);
}
const used = new Set();
const verdict = new Map();
for (const t of theirNodes) {
  const candidates = ourByKind.get(t.kind) || [];
  const hit = candidates.find((o) => !used.has(o) && o.start === t.start && o.end === t.end);
  if (hit) {
    used.add(hit);
    verdict.set(t, "ok");
    continue;
  }
  const near = candidates.find((o) => !used.has(o) && Math.abs(o.start - t.start) <= 2);
  if (near) {
    used.add(near);
    verdict.set(t, `漂移 产物[${near.start},${near.end})`);
    continue;
  }
  verdict.set(t, "缺");
}
const extras = ourNodes.filter((n) => !used.has(n));

if (onlyKind) {
  console.log(`### ${label}  只看 ${onlyKind} ###`);
  for (const t of theirNodes) {
    const v = verdict.get(t);
    if (t.kind !== onlyKind && !(v && v !== "ok")) continue;
    if (t.kind !== onlyKind) continue;
    console.log(`TS  ${String(t.start).padStart(5)},${String(t.end).padEnd(5)} ${v.padEnd(24)} ${JSON.stringify(t.text.slice(0, 40))}`);
    for (const o of ourByKind.get(t.kind) || []) {
      if (Math.abs(o.start - t.start) <= 2) console.log(`产物${String(o.start).padStart(5)},${String(o.end).padEnd(5)}                      ${JSON.stringify(source.slice(o.start, o.end).slice(0, 40))}`);
    }
  }
  process.exit(0);
}

console.log(`### 输入 (${label}) ###\n${source}\n`);
console.log("### TS AST（✓ 同 kind 同区间） ###");
for (const t of theirNodes) {
  const v = verdict.get(t);
  console.log(`${(v === "ok" ? "✓" : v === "缺" ? "✗" : "~").padEnd(2)}${"  ".repeat(t.depth)}${String(t.start).padStart(5)},${String(t.end).padEnd(5)} ${t.kind}${v === "ok" ? "" : "   ← " + v}`);
}
console.log("\n### 投影树（带区间与字段名） ###");
for (const n of ourNodes) {
  console.log(`${used.has(n) ? "✓" : "✗"} ${"  ".repeat(n.depth)}${String(n.start).padStart(5)},${String(n.end).padEnd(5)} ${n.kind}${n.fields.length ? "  [" + n.fields.join(",") + "]" : ""}`);
}
if (extras.length) console.log(`\n产物多出 ${extras.length} 个节点，未与 TS 对上`);
if (projected.unmapped.length) console.log(`投影未覆盖的标签: ${projected.unmapped.join(" ")}`);
