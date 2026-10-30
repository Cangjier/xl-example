// tts todo 适配进度报告（只读）：把 todo/ 里每个用例的失败形态分类，并按缺口节点聚合。
//
// 用法:
//   node typescript/tools/tts-todo-report.mjs                # todo/ 全量
//   node typescript/tools/tts-todo-report.mjs --dir <dir>    # 指定目录
//   node typescript/tools/tts-todo-report.mjs --json tmp/x.json
//
// 分类口径（与 run.mjs 的对拍口径一致：节点类型、pos、end）:
//   pass        逐节点一致
//   end-only    结构一致，只有某个节点的 end 不同
//   structural  结构不一致（忽略 end 后仍有 kind/shape/pos 差异）
//   parse-error 解析器抛错
//   ts-invalid  typescript 自己都解析不了（用例本身有问题）
//
// 额外给出:
//   - 首缺节点直方图：structural 用例在忽略 end 后，typescript 有而我们没有的那个节点
//   - 首个阻断构造：parse-error 用例用前缀二分找到最早抛错的字符，按字符/关键字归类
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const CASES = path.join(ROOT, "typescript", "cases", "tts");
const ts = require(path.join(ROOT, "node_modules", "typescript"));

const ENTRY = path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js");
if (!fs.existsSync(ENTRY)) {
  console.error("[tts-report] build/ts 里没有解析器产物：先跑 xl 构建 + npm run compile");
  process.exit(2);
}

const { SyntaxContext } = require(path.join(BUILD, "core/syntax/syntax-context.js"));
const { SourceRange } = require(path.join(BUILD, "core/syntax/source-range.js"));
const { TextDocument } = require(path.join(BUILD, "typescript/run/text-document.js"));
const { TypescriptTemplate } = require(path.join(BUILD, "typescript/run/typescript-template.js"));
const { SourceFileShape } = require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js"));

// typescript 的 SyntaxKind 里有些名字是区间别名；与 run.mjs 用同一张表。
const TS_KIND_ALIASES = new Map([
  ["FirstStatement", "VariableStatement"],
  ["FirstLiteralToken", "NumericLiteral"],
  ["FirstNode", "QualifiedName"],
  ["FirstTypeNode", "TypePredicate"],
  ["LastTypeNode", "ImportType"],
  ["FirstContextualKeyword", "AbstractKeyword"],
  ["LastStatement", "DebuggerStatement"],
  ["FirstTemplateToken", "NoSubstitutionTemplateLiteral"],
  ["LastTemplateToken", "TemplateTail"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["LastBinaryOperator", "CaretEqualsToken"],
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstAssignment", "EqualsToken"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
  ["FirstBinaryOperator", "LessThanToken"],
]);

function runIncremental(source, name) {
  const template = TypescriptTemplate.Create();
  const root = new SourceFileShape(template);
  const context = new SyntaxContext(root, 32);
  const document = new TextDocument(source, name);
  SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const count = document.GetCount();
  for (let index = 0; index < count; index++) {
    context.ProcessRange(root, new SourceRange(document, index, index + 1), index);
  }
  context.Index = count;
  root.SignOut(count);
  context.ProcessRange(root, new SourceRange(document, count, count), count);
  return root;
}

function ourTree(root) {
  const toNode = (shape) => {
    const range = shape.SourceRange ?? {};
    const out = {
      kind: shape.constructor.name.replace(/Shape$/, ""),
      pos: shape.Pos >= 0 ? shape.Pos : (range.Start ?? 0),
      end: range.End ?? 0,
    };
    const children = (shape.Data ?? []).map(toNode);
    if (children.length > 0) out.children = children;
    return out;
  };
  return (root.Data ?? []).map(toNode);
}

function theirTree(fileNode) {
  const toNode = (node) => {
    const raw = ts.SyntaxKind[node.kind];
    const kind = TS_KIND_ALIASES.get(raw) ?? raw;
    const out = { kind, pos: node.pos, end: node.end };
    const children = [];
    // 必须用块体：forEachChild 以回调返回值判断是否继续访问后面的子节点。
    node.forEachChild((child) => {
      children.push(toNode(child));
    });
    if (children.length > 0) out.children = children;
    return out;
  };
  return fileNode.statements.map(toNode);
}

function firstDiff(ours, theirs, ignoreEnd, p = "") {
  if (ours === undefined || theirs === undefined) {
    return { type: "shape", path: p, ours: ours ? ours.kind : "-", theirs: theirs ? theirs.kind : "-" };
  }
  if (ours.kind !== theirs.kind) return { type: "kind", path: p, ours: ours.kind, theirs: theirs.kind };
  if (ours.pos !== theirs.pos) return { type: "pos", path: p, kind: ours.kind, oursPos: ours.pos, theirPos: theirs.pos };
  if (!ignoreEnd && ours.end !== theirs.end) return { type: "end", path: p, kind: ours.kind, oursEnd: ours.end, theirEnd: theirs.end };
  const a = ours.children ?? [];
  const b = theirs.children ?? [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = firstDiff(a[i], b[i], ignoreEnd, p + "/" + (b[i]?.kind ?? a[i]?.kind ?? i));
    if (d) return d;
  }
  return null;
}

function countNodes(list) {
  let total = 0;
  for (const node of list) total += 1 + countNodes(node.children ?? []);
  return total;
}

// 最早会抛错的前缀长度：用于定位“第一个阻断构造”。
function firstThrowingPrefix(source) {
  const throws = (text) => {
    try {
      runIncremental(text, "case.ts");
      return false;
    } catch {
      return true;
    }
  };
  let lo = 0;
  let hi = source.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (throws(source.slice(0, mid))) hi = mid;
    else lo = mid + 1;
  }
  const at = Math.max(0, lo - 1);
  let start = at;
  while (start > 0 && /[A-Za-z0-9_$\u4e00-\u9fa5]/.test(source[start - 1])) start--;
  let end = at;
  while (end < source.length && /[A-Za-z0-9_$\u4e00-\u9fa5]/.test(source[end])) end++;
  return { at, ch: source[at] ?? "<eof>", word: source.slice(start, end) };
}

const DECLARATION_KEYWORDS = new Set([
  "let", "const", "var", "function", "class", "interface", "enum", "namespace", "module",
  "import", "export", "declare", "type", "abstract",
]);
const EXPRESSION_KEYWORDS = new Set(["async", "await", "yield", "new", "this", "super", "delete", "typeof", "void", "in", "instanceof", "as", "satisfies"]);

function classifyBlock(word, ch) {
  if (DECLARATION_KEYWORDS.has(word)) return `声明关键字 ${word}`;
  if (EXPRESSION_KEYWORDS.has(word)) return `关键字 ${word}`;
  if (word.length > 0) return "标识符 / 语句头";
  return `符号 ${JSON.stringify(ch)}`;
}

function collect(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function analyse(file) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(CASES, file).replace(/\\/g, "/");
  const fileNode = ts.createSourceFile(path.basename(file), source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (fileNode.parseDiagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
  if (diagnostics.length > 0) return { rel, status: "ts-invalid", why: diagnostics.join(" | ") };

  let ours;
  try {
    ours = ourTree(runIncremental(source, path.basename(file)));
  } catch (error) {
    const message = String(error?.Message ?? error?.message ?? error);
    const blocking = firstThrowingPrefix(source);
    return { rel, status: "parse-error", why: message.split("\n")[0], blocking };
  }

  const ourRoot = { kind: "SourceFile", pos: 0, end: source.length, children: ours };
  const theirRoot = { kind: "SourceFile", pos: 0, end: source.length, children: theirTree(fileNode) };
  const diff = firstDiff(ourRoot, theirRoot, false);
  if (!diff) return { rel, status: "pass" };

  const diffNoEnd = firstDiff(ourRoot, theirRoot, true);
  return {
    rel,
    status: diffNoEnd ? "structural" : "end-only",
    diff,
    diffNoEnd,
    oursNodes: countNodes(ours),
    theirsNodes: countNodes(theirRoot.children),
  };
}

function main(argv) {
  const dirArg = argv.indexOf("--dir");
  const jsonArg = argv.indexOf("--json");
  const target = dirArg >= 0 ? path.resolve(ROOT, argv[dirArg + 1]) : path.join(CASES, "todo");
  const files = fs.statSync(target).isFile() ? [target] : collect(target);
  const results = files.map(analyse);
  if (jsonArg >= 0) {
    fs.writeFileSync(path.resolve(ROOT, argv[jsonArg + 1]), JSON.stringify(results, null, 2), "utf8");
  }

  const categories = new Map();
  const missingKinds = new Map();
  const blocking = new Map();
  const totals = { pass: 0, "end-only": 0, structural: 0, "parse-error": 0, "ts-invalid": 0 };
  for (const item of results) {
    totals[item.status] = (totals[item.status] ?? 0) + 1;
    const category = item.rel.split("/").slice(1, -1).join("/") || ".";
    const row = categories.get(category) ?? { total: 0, pass: 0, endOnly: 0, structural: 0, parseError: 0, missing: new Set() };
    row.total++;
    if (item.status === "pass") row.pass++;
    else if (item.status === "end-only") row.endOnly++;
    else if (item.status === "structural") row.structural++;
    else if (item.status === "parse-error") row.parseError++;

    if (item.status === "structural" || item.status === "end-only") {
      const d = item.diffNoEnd ?? item.diff;
      const key = d.type === "shape" ? `${d.theirs}（缺）` : d.type === "kind" ? `${d.theirs}（当前 ${d.ours}）` : `${d.type}:${d.kind}`;
      missingKinds.set(key, (missingKinds.get(key) ?? 0) + 1);
      row.missing.add(d.type === "shape" || d.type === "kind" ? d.theirs : d.kind);
    }
    if (item.blocking) {
      const key = classifyBlock(item.blocking.word, item.blocking.ch);
      blocking.set(key, (blocking.get(key) ?? 0) + 1);
    }
    categories.set(category, row);
  }

  console.log(`[tts-report] ${path.relative(ROOT, target).replace(/\\/g, "/")}: ${results.length} case`);
  console.log(`  通过 ${totals.pass} / 仅 end 不同 ${totals["end-only"]} / 结构缺树 ${totals.structural} / 直接抛错 ${totals["parse-error"]} / 用例本身非法 ${totals["ts-invalid"]}`);

  console.log("\n类别".padEnd(26), "用例", "通过", "仅end", "缺树", "抛错", "首缺种类");
  for (const [category, row] of [...categories.entries()].sort()) {
    console.log(
      category.padEnd(26),
      String(row.total).padStart(4),
      String(row.pass).padStart(4),
      String(row.endOnly).padStart(5),
      String(row.structural).padStart(5),
      String(row.parseError).padStart(4),
      String(row.missing.size).padStart(6),
    );
  }

  if (missingKinds.size > 0) {
    console.log("\n首缺节点（缺树用例，忽略 end 后第一个缺的节点）");
    for (const [key, count] of [...missingKinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) {
      console.log(String(count).padStart(4), key);
    }
  }

  if (blocking.size > 0) {
    console.log("\n首个阻断构造（抛错用例，前缀二分）");
    for (const [key, count] of [...blocking.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(String(count).padStart(4), key);
    }
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
