// tts（token-time shapes）用例门禁：
// 把解析器逐字符推进得到的 AST 与 typescript 的语义 AST 逐节点对拍。
//
// 用法:
//   node typescript/cases/tts/run.mjs               # 校验 success/（必须全绿）
//   node typescript/cases/tts/run.mjs --all         # success/ + todo/ 一起统计
//   node typescript/cases/tts/run.mjs <dir|file>    # 只跑指定目录/文件
//   node typescript/cases/tts/run.mjs --list        # 额外打印通过清单
//   node typescript/cases/tts/run.mjs --verbose     # 失败时打印前 12 条差异
//   node typescript/cases/tts/run.mjs --write-index # 重写 index.md（覆盖统计）
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseToAstLine } from "../../tools/ts-ast-line.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const CASES = path.join(ROOT, "typescript", "cases", "tts");
const ts = require(path.join(ROOT, "node_modules", "typescript"));

const ENTRY = path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js");
if (!fs.existsSync(ENTRY)) {
  console.error("[tts] build/ts 里没有解析器产物：先跑 npm run build（或 npm run compile）");
  process.exit(2);
}

const { SyntaxContext } = require(path.join(BUILD, "core/syntax/syntax-context.js"));
const { SourceRange } = require(path.join(BUILD, "core/syntax/source-range.js"));
const { TextDocument } = require(path.join(BUILD, "typescript/run/text-document.js"));
const { TypescriptTemplate } = require(path.join(BUILD, "typescript/run/typescript-template.js"));
const { SourceFileShape } = require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js"));

// typescript 的 SyntaxKind 里有些名字是区间别名；解析器的类名对应区间首项，这里映射到可比较的名字。
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
      pos: shape.Pos >= 0 ? shape.Pos : range.Start ?? 0,
      end: range.End ?? 0,
      text: shape.Text !== undefined ? shape.Text : shape.EscapedText,
    };
    const children = (shape.Data ?? []).map(toNode);
    if (children.length > 0) {
      out.children = children;
    }
    return out;
  };
  return (root.Data ?? []).map(toNode);
}

function theirTree(fileNode) {
  const toNode = (node) => {
    const raw = ts.SyntaxKind[node.kind];
    const kind = TS_KIND_ALIASES.get(raw) ?? raw;
    const out = { kind, pos: node.pos, end: node.end };
    if (ts.isIdentifier(node) || ts.isNumericLiteral(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      out.text = node.text;
    }
    const children = [];
    node.forEachChild((child) => {
      children.push(toNode(child));
    });
    if (children.length > 0) {
      out.children = children;
    }
    return out;
  };
  return fileNode.statements.map(toNode);
}

function label(node, depth) {
  return `${"  ".repeat(depth)}${node.kind} [${node.pos},${node.end})${node.text !== undefined ? ` text=${JSON.stringify(node.text)}` : ""}`;
}

function compare(ours, theirs, depth, diffs) {
  if (ours === undefined || theirs === undefined) {
    if (ours !== theirs) {
      diffs.push(`  ${"  ".repeat(depth)}missing: ours=${ours ? label(ours, 0) : "-"} theirs=${theirs ? label(theirs, 0) : "-"}`);
    }
    return;
  }
  if (ours.kind !== theirs.kind) {
    diffs.push(`  ${"  ".repeat(depth)}kind: ours=${label(ours, 0)} theirs=${label(theirs, 0)}`);
  }
  if (ours.pos !== theirs.pos) {
    diffs.push(`  ${"  ".repeat(depth)}pos: ${ours.kind} ours=${ours.pos} theirs=${theirs.pos}`);
  }
  if (ours.end !== theirs.end) {
    diffs.push(`  ${"  ".repeat(depth)}end: ${ours.kind} ours=${ours.end} theirs=${theirs.end}`);
  }
  const a = ours.children ?? [];
  const b = theirs.children ?? [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    compare(a[i], b[i], depth + 1, diffs);
  }
}

function collect(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of fs.readdirSync(at, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name))) {
      const full = path.join(at, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".ts")) {
        out.push(full);
      }
    }
  };
  if (fs.statSync(dir).isFile()) {
    return [dir];
  }
  walk(dir);
  return out;
}

function runFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const fileNode = ts.createSourceFile(path.basename(file), source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = (fileNode.parseDiagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
  if (diagnostics.length > 0) {
    return { rel, why: "ts-invalid: " + diagnostics.join(" | ") };
  }
  let root;
  try {
    root = runIncremental(source, path.basename(file));
  } catch (error) {
    return { rel, why: "parse-error: " + String(error?.Message ?? error?.message ?? error).split("\n")[0] };
  }
  const ours = { kind: "SourceFile", pos: 0, end: source.length, children: ourTree(root) };
  const theirs = { kind: "SourceFile", pos: 0, end: source.length, children: theirTree(fileNode) };
  const diffs = [];
  compare(ours, theirs, 0, diffs);
  if (diffs.length === 0) {
    // success 用例带 .ast 快照：它必须是同一条 ts-ast-line 输出，过期的夹具同样算失败。
    const astPath = file.replace(/\.ts$/, ".ast");
    if (fs.existsSync(astPath)) {
      const expected = parseToAstLine(source, path.basename(file)) + "\n";
      const actual = fs.readFileSync(astPath, "utf8");
      if (actual !== expected) {
        return { rel, why: "stale-ast: " + path.basename(astPath) + " 与 ts-ast-line 输出不一致" };
      }
    }
    return { rel };
  }
  return { rel, why: "diff", diffs };
}

function main(argv) {
  const all = argv.includes("--all");
  const list = argv.includes("--list");
  const verbose = argv.includes("--verbose");
  const writeIndex = argv.includes("--write-index");
  const explicit = argv.filter((arg) => !arg.startsWith("-"));
  const targets = explicit.length > 0
    ? explicit.map((arg) => path.resolve(ROOT, arg))
    : all || writeIndex
      ? [path.join(CASES, "success"), path.join(CASES, "todo")]
      : [path.join(CASES, "success")];

  const summary = [];
  let total = 0;
  let failedTotal = 0;
  for (const target of targets) {
    const files = collect(target);
    const failures = [];
    let pass = 0;
    for (const file of files) {
      const result = runFile(file);
      if (result.why === undefined) {
        pass++;
        if (list) {
          console.log("PASS " + result.rel);
        }
      } else {
        failures.push(result);
        if (list) {
          console.log("FAIL " + result.rel);
        }
      }
    }
    for (const failure of failures) {
      console.log(`FAIL ${failure.rel}: ${failure.why}`);
      if (verbose && failure.diffs) {
        for (const line of failure.diffs.slice(0, 12)) {
          console.log(line);
        }
      }
    }
    const rel = path.relative(CASES, target).replace(/\\/g, "/") || ".";
    summary.push({ rel, files: files.length, pass, fail: failures.length });
    total += files.length;
    failedTotal += failures.length;
    console.log(`[tts] ${rel}: ${files.length} case, PASS ${pass} / FAIL ${failures.length}`);
  }

  if (writeIndex) {
    const lines = ["# tts 用例覆盖", "", "由 `npm run tts:cases:index` 重写；数字来自对拍，不是手写。", "", "| 目录 | 用例 | 通过 | 失败 |", "| --- | --- | --- | --- |"];
    for (const item of summary) {
      lines.push(`| \`${item.rel}\` | ${item.files} | ${item.pass} | ${item.fail} |`);
    }
    const indexPath = path.join(CASES, "index.md");
    fs.writeFileSync(indexPath, lines.join("\n") + "\n", "utf8");
    console.log(`[tts] wrote ${path.relative(ROOT, indexPath).replace(/\\/g, "/")}`);
  }

  console.log(`[tts] TOTAL ${total} case, FAIL ${failedTotal}`);
  // --write-index 是报告模式：todo 里仍有未支持的用例，不该让覆盖统计脚本失败。
  return writeIndex || failedTotal === 0 ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
