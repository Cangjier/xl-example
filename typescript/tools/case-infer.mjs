#!/usr/bin/env node
// case.infer 工具。
//
// 用途：给 tts 用例产出一份「LLM 判定的期望创建位置」文件 `<名字>.infer`，并拿它和解析器
// 逐字符推进的实际结果对拍，把差异列出来。
//
// 分工：
//   - 判断「形状最早在哪一格确定」是模型的活，不是这个脚本的活；脚本只负责
//     骨架、格式、和对拍（`--check` 里 expected 来自 .infer，actual 来自 build/ts）。
//   - 所以 `--scaffold` 产出的每一行都是 `// char ?`，等模型把 `?` 换成字符号。
//
// 用法:
//   node typescript/tools/case-infer.mjs <case.ts>            生成骨架（已有 .infer 不覆盖，--force 覆盖）
//   node typescript/tools/case-infer.mjs --format <case.ts>   规范化注记：// char N → // char N "上下文"
//   node typescript/tools/case-infer.mjs --check <case.ts>    期望 vs 实际逐节点对比（有差异退出码 1）
//   node typescript/tools/case-infer.mjs --actual <case.ts>   只打印实际的创建位置（调试用）
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseToAstLine } from "./ts-ast-line.mjs";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const BUILD = path.join(ROOT, "build", "ts");
const BUILD_ENTRY = path.join(BUILD, "typescript", "shapes", "files", "source-file-shape.js");

const RET = "\u23ce";
const SPACE = "\u2423";
const BLOCK = 20;           // 逐字编号每块 20 个字符
const CONTEXT = 5;          // 注记里标记字符前后至少各 5 个字符

// ---------------------------------------------------------------------------
// 文本工具
// ---------------------------------------------------------------------------

const charsOf = (source) => Array.from(source);

function displayChar(ch) {
  if (ch === "\n") {
    return RET;
  }
  if (ch === " ") {
    return SPACE;
  }
  return ch;
}

/** `[0-19] |type A<T> = T extend| [20-39] |...|`：每块 20 个字符，一行两块。
 *  空格按原样保留（有 `|` 兜着），只有换行写成 ⏎。 */
function charBlocks(source) {
  const chars = charsOf(source);
  const labels = [];
  const texts = [];
  for (let i = 0; i < chars.length; i += BLOCK) {
    labels.push(`[${i}-${Math.min(i + BLOCK, chars.length) - 1}]`);
    texts.push(chars.slice(i, i + BLOCK).map((ch) => (ch === "\n" ? RET : ch)).join(""));
  }
  const width = Math.max(0, ...labels.map((label) => label.length));
  const groups = labels.map((label, i) => `${label.padEnd(width)} |${texts[i]}|`);
  const lines = [];
  for (let i = 0; i < groups.length; i += 2) {
    lines.push(groups.slice(i, i + 2).join(" "));
  }
  return lines;
}

const isWord = (ch) => /[A-Za-z0-9_$]/.test(ch);

/** 标记字符的上下文：前后各至少 5 个字符，边缘落在单词中间时向外扩到词边界，两端空白压成一个空格。 */
function snippetAt(source, at) {
  const chars = charsOf(source);
  let start = Math.max(0, at - CONTEXT);
  while (start > 0 && isWord(chars[start - 1]) && isWord(chars[start])) {
    start--;
  }
  let end = Math.min(chars.length, at + 1 + CONTEXT);
  while (end < chars.length && isWord(chars[end - 1]) && isWord(chars[end])) {
    end++;
  }
  const left = chars.slice(start, at).join("").replace(/\s+/g, " ").trim();
  const right = chars.slice(at + 1, end).join("").replace(/\s+/g, " ").trim();
  return `${left}【${displayChar(chars[at])}】${right}`;
}

// ---------------------------------------------------------------------------
// 节点身份：kind + pos + src 起点（.ast / .infer / 实际树三边都用它对齐）
// ---------------------------------------------------------------------------

// TS 的 SyntaxKind 里有些名字是区间别名（FirstLiteralToken 之类），ts-ast-line 打出来的是别名，
// 形状侧用的是区间首项的名字。和 run.mjs 的对拍表保持一致。
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
  ["FirstPunctuation", "OpenBraceToken"],
  ["FirstAssignment", "EqualsToken"],
  ["FirstCompoundAssignment", "PlusEqualsToken"],
  ["LastAssignment", "CaretEqualsToken"],
  ["LastCompoundAssignment", "CaretEqualsToken"],
  ["LastPunctuation", "CaretEqualsToken"],
  ["FirstBinaryOperator", "LessThanToken"],
  ["AssertClause", "ImportAttributes"],
  ["AssertEntry", "ImportAttribute"],
]);

const canonicalKind = (kind) => TS_KIND_ALIASES.get(kind) ?? kind;

const TREE_ID = /^[\s│├└─]*([A-Za-z_$][\w$]*)\s+pos=(-?\d+)\s+src=\[(-?\d+),(-?\d+)\)/;

/** 节点身份：kind + pos + src 起点（End 会随形状生长变化，不能进身份）。 */
function nodeId(line) {
  const match = TREE_ID.exec(line);
  if (match === null) {
    return null;
  }
  return `${canonicalKind(match[1])}|${match[2]}|${match[3]}`;
}

/** 从 `SourceFile  pos=0  src=[0,49)` 这种行里取出 kind / pos / src，用于报告。 */
function nodeInfo(line) {
  const match = TREE_ID.exec(line);
  return match === null ? null : { kind: match[1], pos: Number(match[2]), start: Number(match[3]), end: Number(match[4]) };
}

// ---------------------------------------------------------------------------
// 骨架
// ---------------------------------------------------------------------------

function escapeTitle(source) {
  return source.replace(/\r?\n$/, "").replace(/\n/g, RET);
}

function astLines(source, name) {
  return parseToAstLine(source, name).split("\n").filter((line) => line !== "");
}

function scaffold(source, name) {
  const blocks = charBlocks(source);
  const lines = [];
  lines.push(`# 预期形状创建位置（逐字）：\`${escapeTitle(source)}\``);
  lines.push("");
  lines.push("```text");
  for (const line of blocks) {
    lines.push(line);
  }
  lines.push("```");
  lines.push("");
  for (const line of astLines(source, name)) {
    lines.push(`${line}   // char ?`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// .infer 解析 / 规范化
// ---------------------------------------------------------------------------

function parseInfer(text) {
  const notes = new Map();
  for (const line of text.split(/\r?\n/)) {
    const at = line.indexOf("// ");
    if (at < 0) {
      continue;
    }
    const id = nodeId(line.slice(0, at));
    if (id === null) {
      continue;
    }
    const match = /^char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?(.*)$/.exec(line.slice(at + 3).trim());
    if (match === null) {
      continue;
    }
    notes.set(id, {
      char: match[1] === "?" ? null : Number(match[1]),
      suffix: match[2] ?? "",
    });
  }
  return notes;
}

/** `--format`：把 `// char N` 重写成 `// char N "上下文"`，`?` 原样保留，注记后面的补充说明保留。 */
function formatInfer(source, text) {
  const chars = charsOf(source);
  let changed = 0;
  const out = text.split(/\r?\n/).map((line) => {
    const at = line.indexOf("// ");
    if (at < 0) {
      return line;
    }
    const head = line.slice(0, at);
    if (nodeId(head) === null) {
      return line;
    }
    const match = /^char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?(.*)$/.exec(line.slice(at + 3).trim());
    if (match === null) {
      return line;
    }
    const suffix = match[2] ?? "";
    let note;
    if (match[1] === "?") {
      note = "char ?";
    } else {
      const index = Number(match[1]);
      if (index >= chars.length) {
        throw new Error(`char ${index} 超出源码长度 ${chars.length}：${line.trim()}`);
      }
      note = `char ${index} "${snippetAt(source, index)}"`;
    }
    const next = `${head}// ${note}${suffix}`;
    if (next !== line) {
      changed++;
    }
    return next;
  });
  return { text: out.join("\n"), changed };
}

// ---------------------------------------------------------------------------
// 实际创建位置：用 build/ts 逐字符推进，取每个节点第一次出现在树里的那一格
// ---------------------------------------------------------------------------

function loadParser() {
  if (!fs.existsSync(BUILD_ENTRY)) {
    throw new Error(`缺少 ${path.relative(ROOT, BUILD)}：先跑 npm run build`);
  }
  const { SyntaxContext } = require(path.join(BUILD, "core/syntax/syntax-context.js"));
  const { SourceRange } = require(path.join(BUILD, "core/syntax/source-range.js"));
  const { TextDocument } = require(path.join(BUILD, "typescript/run/text-document.js"));
  const { TypescriptTemplate } = require(path.join(BUILD, "typescript/run/typescript-template.js"));
  const { SourceFileShape } = require(path.join(BUILD, "typescript/shapes/files/source-file-shape.js"));
  return { SyntaxContext, SourceRange, TextDocument, TypescriptTemplate, SourceFileShape };
}

const kindOf = (node) => node.constructor.name.replace(/Shape$/, "");

function collect(node, depth, isLast, out) {
  const range = node.SourceRange ?? {};
  const kind = kindOf(node);
  const pos = node.Pos ?? -1;
  const start = range.Start ?? -1;
  out.push({
    // 只按 kind + pos + src 起点做身份：End 会随形状生长变化，不能进身份。
    // 根节点的 Pos 在形状侧是 -1、在 TS 侧是 0，统一按 0 记。
    key: kind === "SourceFile" ? "SourceFile|0|0" : `${kind}|${pos}|${start}`,
    kind,
    pos,
    start,
    end: range.End ?? -1,
    text: node.Text !== undefined ? node.Text : (node.Temp !== undefined ? node.Temp : ""),
    isLast,
    depth,
  });
  const children = node.Data ?? [];
  for (let i = 0; i < children.length; i++) {
    collect(children[i], depth + 1, i === children.length - 1, out);
  }
  return out;
}

/** 返回 { map: Map<key, char>, final: 最终树, steps }。key 与 .ast 行用 nodeId 对齐。 */
function traceActual(source, name) {
  const parser = loadParser();
  const template = parser.TypescriptTemplate.Create();
  const root = new parser.SourceFileShape(template);
  const context = new parser.SyntaxContext(root, 32);
  const document = new parser.TextDocument(source, name);
  parser.SourceRange.CurrentDocument = document;
  context.CurrentDocument = document;
  const total = document.GetCount();
  const map = new Map();
  for (let index = 0; index < total; index++) {
    context.ProcessRange(root, new parser.SourceRange(document, index, index + 1), index);
    for (const rec of collect(root, 0, true, [])) {
      if (!map.has(rec.key)) {
        map.set(rec.key, index);
      }
    }
  }
  context.Index = total;
  root.SignOut(total);
  context.ProcessRange(root, new parser.SourceRange(document, total, total), total);
  const final = collect(root, 0, true, []);
  return { map, final };
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------

const KIND_WIDTH = 22;

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function printActual(source, actual) {
  for (const rec of actual.final) {
    const at = actual.map.get(rec.key);
    const where = at === undefined ? "never" : `char ${at} "${snippetAt(source, at)}"`;
    const gutter = "   ".repeat(rec.depth);
    const branch = rec.depth === 0 ? "" : rec.isLast ? "└─ " : "├─ ";
    const text = rec.text === "" ? "" : `  text="${rec.text}"`;
    const pos = rec.kind === "SourceFile" ? 0 : rec.pos;
    console.log(`${gutter}${branch}${rec.kind}  pos=${pos}  src=[${rec.start},${rec.end})${text}   // ${where}`);
  }
}

function check(source, name, inferText) {
  const notes = parseInfer(inferText);
  const actual = traceActual(source, name);
  const lines = astLines(source, name);
  const rows = [];
  const used = new Set();
  for (const line of lines) {
    const info = nodeInfo(line);
    if (info === null) {
      continue;
    }
    const id = nodeId(line);
    const note = notes.get(id);
    if (note !== undefined) {
      used.add(id);
    }
    const expected = note === undefined || note.char === null ? null : note.char;
    const got = actual.map.get(id) ?? null;
    let status;
    let delta = null;
    if (note === undefined) {
      status = "no-annotation";
    } else if (expected === null) {
      status = "unfilled";
    } else if (got === null) {
      status = "no-shape";
    } else {
      delta = got - expected;
      status = delta === 0 ? "ok" : delta > 0 ? `late +${delta}` : `early ${delta}`;
    }
    rows.push({ info, expected, got, delta, status });
  }
  const stale = [...notes.keys()].filter((id) => !used.has(id));

  const okCount = rows.filter((row) => row.status === "ok").length;
  const badCount = rows.length - okCount;
  for (const row of rows) {
    const where = `${row.info.kind}  pos=${row.info.pos}  src=[${row.info.start},${row.info.end})`;
    console.log(
      `${pad(row.status, 14)}${pad(where, KIND_WIDTH + 24)}expected=${row.expected === null ? "-" : row.expected}` +
      `  actual=${row.got === null ? "-" : row.got}  ${row.status === "ok" ? "" : "<--"}`,
    );
  }
  for (const id of stale) {
    console.log(`${pad("stale", 14)}${id}  <-- .infer 里有，.ast 里没有这个节点`);
  }
  console.log("");
  console.log(
    `节点 ${rows.length}，一致 ${okCount}，不一致 ${badCount}` +
    (stale.length > 0 ? `，多余注记 ${stale.length}` : ""),
  );
  return badCount === 0 && stale.length === 0;
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

function usage() {
  process.stderr.write(`用法:
  node typescript/tools/case-infer.mjs <case.ts>            生成 .infer 骨架（已有则不覆盖，--force 覆盖）
  node typescript/tools/case-infer.mjs --format <case.ts>   规范化注记：// char N → // char N "上下文"
  node typescript/tools/case-infer.mjs --check <case.ts>    期望 vs 实际逐节点对比（有差异退出码 1）
  node typescript/tools/case-infer.mjs --actual <case.ts>   打印实际的创建位置（调试用）
`);
}

function main(argv) {
  const force = argv.includes("--force");
  const mode = argv.includes("--check") ? "check"
    : argv.includes("--format") ? "format"
      : argv.includes("--actual") ? "actual"
        : "scaffold";
  const files = argv.filter((arg) => !arg.startsWith("-"));
  if (files.length !== 1) {
    usage();
    return 2;
  }
  const full = path.resolve(ROOT, files[0]);
  if (!fs.existsSync(full)) {
    process.stderr.write(`找不到 ${path.relative(ROOT, full)}\n`);
    return 2;
  }
  const source = fs.readFileSync(full, "utf8");
  const name = path.basename(full);
  const inferPath = full.replace(/\.ts$/, ".infer");

  try {
    if (mode === "actual") {
      printActual(source, traceActual(source, name));
      return 0;
    }

    if (mode === "scaffold") {

      if (fs.existsSync(inferPath) && !force) {
        process.stderr.write(`${path.relative(ROOT, inferPath)} 已存在；要覆盖加 --force\n`);
        return 2;
      }
      fs.writeFileSync(inferPath, scaffold(source, name), "utf8");
      console.log(`wrote ${path.relative(ROOT, inferPath).split(path.sep).join("/")}`);
      return 0;
    }

    if (!fs.existsSync(inferPath)) {
      process.stderr.write(`没有 ${path.relative(ROOT, inferPath)}：先跑 node typescript/tools/case-infer.mjs ${files[0]}\n`);
      return 2;
    }
    const inferText = fs.readFileSync(inferPath, "utf8");

    if (mode === "format") {
      const result = formatInfer(source, inferText);
      if (result.text !== inferText) {
        fs.writeFileSync(inferPath, result.text, "utf8");
      }
      console.log(`${result.changed} 行注记已规范化（${path.relative(ROOT, inferPath).split(path.sep).join("/")}）`);
      return 0;
    }

    return check(source, name, inferText) ? 0 : 1;
  } catch (error) {
    process.stderr.write(`错误: ${error?.message ?? error}\n`);
    return 2;
  }
}

process.exitCode = main(process.argv.slice(2));
