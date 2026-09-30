/// 最小片段探针：把一段 TS 源码同时喂给 TypeScript 自带 parser 与本工程解析器，
/// 并排打印 AST 与 XML 产物，用来复现/定位缺口。
///
///   node probe.mjs "const a = b!"
///   node probe.mjs --file <路径>
///   node probe.mjs --file <路径> --lines 10-30
///
/// 依赖 build/ts（即先 `xl build && npx tsc`）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

const args = process.argv.slice(2);
const fileAt = args.indexOf("--file");
const linesAt = args.indexOf("--lines");
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
  source = args.filter((a) => !a.startsWith("--")).join(" ");
  if (!source) {
    console.error('用法: node probe.mjs "<源码>"  或  --file <路径> [--lines a-b]');
    process.exit(2);
  }
}

console.log("### 输入 (" + label + ") ###");
console.log(source);

console.log("\n### TS AST ###");
const sf = ts.createSourceFile(label, source, ts.ScriptTarget.Latest, true, label.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
(function show(node, depth) {
  const pad = "  ".repeat(depth);
  let extra = "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) extra = " «" + node.text + "»";
  console.log(pad + ts.SyntaxKind[node.kind] + extra);
  ts.forEachChild(node, (c) => show(c, depth + 1));
})(sf, 0);
if (sf.parseDiagnostics && sf.parseDiagnostics.length) {
  console.log("TS 语法诊断:", sf.parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).slice(0, 3));
}

console.log("\n### 解析产物 XML ###");
try {
  const template = new Template();
  const document = new TextDocument(source);
  document.FilePath = label;
  const context = new TextContext(template);
  context.Process(document);
  const xml = context.Root.ToString();
  console.log(xml);
  const tags = {};
  for (const m of xml.matchAll(/<([A-Z][A-Za-z]*)(?=[ />])/g)) tags[m[1]] = (tags[m[1]] || 0) + 1;
  console.log("\n### 标签计数 ###");
  console.log(
    Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(" "),
  );
} catch (e) {
  console.log("抛异常:", e && e.constructor && e.constructor.name, "::", String(e && e.message).split("\n")[0]);
  let cur = e;
  for (let i = 0; i < 8 && cur; i++) {
    console.log("   原因:", cur.constructor && cur.constructor.name, String(cur.Message || cur.message || "").split("\n")[0]);
    cur = cur.InnerException;
  }
}
