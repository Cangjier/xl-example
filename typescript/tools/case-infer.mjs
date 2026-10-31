#!/usr/bin/env node
// case.infer 工具。
//
// 用途：给 tts 用例产出一份 `<名字>.infer`：与 `.ast` 同形的树，每行末尾同时记下
//   - created at char N：来自 ShapeToken.CreatedAt，解析器建出这颗形状的那一格；
//   - llm determined at char N：模型按语法逻辑判定的「最早在哪一格确定」。
// 并拿这两个位置对拍，把差异列出来。
//
// 分工：
//   - 判断「形状最早在哪一格确定」是模型的活，不是这个脚本的活；created at 是解析器的活。
//   - 所以骨架里 created at 已经填好（没有 CreatedAt 的写 `?`），llm determined at 一律 `?`，
//     等模型把 `?` 换成字符号。
//
// 用法:
//   node typescript/tools/case-infer.mjs <case.ts>            生成骨架（已有 .infer 不覆盖，--force 覆盖）
//   node typescript/tools/case-infer.mjs --format <case.ts>   规范化：补两个位置的上下文、旧表头换成 ts 源码块
//   node typescript/tools/case-infer.mjs --check <case.ts>    llm determined vs created at（有差异退出码 1）
//   node typescript/tools/case-infer.mjs --actual <case.ts>   只打印 created at（调试用）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseToAstLine } from "./ts-ast-line.mjs";
import { canonicalKind, parserAvailable, traceActual } from "./shape-actual.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

const RET = "\u23ce";
const SPACE = "\u2423";
const BLOCK = 20;           // 逐字编号每块 20 个字符
const CONTEXT = 5;          // 注记里标记字符前后至少各 5 个字符
const OLD_HEADING = "# 预期形状创建位置";

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
export function charBlocks(source) {
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
export function snippetAt(source, at) {
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

const TREE_ID = /^[\s│├└─]*([A-Za-z_$][\w$]*)\s+pos=(-?\d+)\s+src=\[(-?\d+),(-?\d+)\)/;

/** 节点身份：kind + pos + src 起点（End 会随形状生长变化，不能进身份）。 */
export function nodeId(line) {
  const match = TREE_ID.exec(line);
  if (match === null) {
    return null;
  }
  return `${canonicalKind(match[1])}|${match[2]}|${match[3]}`;
}

/** 从 `SourceFile  pos=0  src=[0,49)` 这种行里取出 kind / pos / src，用于报告。 */
export function nodeInfo(line) {
  const match = TREE_ID.exec(line);
  return match === null ? null : { kind: match[1], pos: Number(match[2]), start: Number(match[3]), end: Number(match[4]) };
}

// ---------------------------------------------------------------------------
// 骨架
// ---------------------------------------------------------------------------

export function astLines(source, name) {
  return parseToAstLine(source, name).split("\n").filter((line) => line !== "");
}

/** 用例源码的 ```ts 围栏：用例里可能有单个反引号（模板字面量类型），但不该有三个。 */
function sourceFence(source) {
  return ["```ts", ...source.replace(/\r?\n$/, "").split("\n"), "```"];
}

/** 注记里的上下文是双引号包起来的，片段自己的 `"` / `\` 必须转义，否则注记无法再解析。 */
function escapeContext(text) {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** 标记字符的上下文；at 越界（created 落在 EOF 那一格 = 字符总数）时给 EOF 记号。 */
function contextAt(source, at) {
  if (at === null || at === undefined) {
    return "";
  }
  const chars = charsOf(source);
  return at >= chars.length ? ` "【EOF】"` : ` "${escapeContext(snippetAt(source, at))}"`;
}

/** 行末注记：两个位置各带自己的上下文，未知写 `?`。
 *  例：`created at char 5 "let x【␣】= 1", llm determined at char 3 "let【␣】x = 1"` */
export function noteFor(source, created, llm) {
  const c = created === null || created === undefined
    ? "created at char ?"
    : `created at char ${created}${contextAt(source, created)}`;
  const l = llm === null || llm === undefined
    ? "llm determined at char ?"
    : `llm determined at char ${llm}${contextAt(source, llm)}`;
  return `${c}, ${l}`;
}

export function scaffold(source, name, created = null) {
  const blocks = charBlocks(source);
  const lines = [];
  lines.push(...sourceFence(source));
  lines.push("");
  lines.push("```text");
  for (const line of blocks) {
    lines.push(line);
  }
  lines.push("```");
  lines.push("");
  for (const line of astLines(source, name)) {
    const id = nodeId(line);
    const at = created === null || id === null ? null : created.get(id) ?? null;
    lines.push(`${line}   // ${noteFor(source, at, null)}`);
  }
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// .infer 解析 / 规范化
// ---------------------------------------------------------------------------

const NOTE_NEW = /^created at char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?,\s*llm determined at char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?(.*)$/;
const NOTE_OLD = /^char (\d+|\?)(?:\s*"(?:[^"\\]|\\.)*")?(.*)$/;

/** 注记里唯一有意义的补充说明：`（由 TypeParameterList 转换）` 这类括号尾注。 */
const NOTE_SUFFIX = /（由[^）]*）\s*$/;

/** 解析一行注记（新格式两个位置；旧的 `// char N "…"` 当作只有 llm determined）。
 *  旧文件的上下文没有转义（片段里带 `"` 时已经解析不回去了），所以两者的上下文都不采信：
 *  数字照收，上下文由 formatInfer 用源码重算。 */
export function parseNote(text) {
  const trimmed = text.trim();
  const next = NOTE_NEW.exec(trimmed);
  if (next !== null) {
    return {
      created: next[1] === "?" ? null : Number(next[1]),
      llm: next[2] === "?" ? null : Number(next[2]),
      suffix: next[3] ?? "",
    };
  }
  // 宽容版：上下文里的引号没转义时，严格的 NOTE_NEW 会停在中间；位置数字仍然可信。
  const loose = /^created at char (\d+|\?).*?llm determined at char (\d+|\?)/.exec(trimmed);
  if (loose !== null) {
    return {
      created: loose[1] === "?" ? null : Number(loose[1]),
      llm: loose[2] === "?" ? null : Number(loose[2]),
      suffix: NOTE_SUFFIX.exec(trimmed)?.[0] ?? "",
    };
  }
  const old = NOTE_OLD.exec(trimmed);
  if (old === null) {
    return null;
  }
  return {
    created: null,
    llm: old[1] === "?" ? null : Number(old[1]),
    suffix: NOTE_SUFFIX.exec(trimmed)?.[0] ?? "",
  };
}

export function parseInfer(text) {
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
    const note = parseNote(line.slice(at + 3));
    if (note === null) {
      continue;
    }
    notes.set(id, note);
  }
  return notes;
}

/** 旧表头 `# 预期形状创建位置（逐字）：`…`` → ```ts 用例源码块；之后的逐字编号表原样保留。 */
export function normalizeHeader(source, text) {
  const lines = text.split(/\r?\n/);
  if (!lines[0]?.startsWith(OLD_HEADING)) {
    return text;
  }
  lines.splice(0, 1, ...sourceFence(source));
  return lines.join("\n");
}

/** `--format`：旧表头换成 ```ts 源码块，注记重写成
 *  `// created at char N "…", llm determined at char N "…"`；`?` 原样保留，补充说明保留。
 *  created 由调用方从 shape token 算好（`traceActual(...).created`），给了就以它为准。 */
export function formatInfer(source, text, created = null) {
  const chars = charsOf(source);
  let changed = 0;
  const out = normalizeHeader(source, text).split(/\r?\n/).map((line) => {
    const at = line.indexOf("// ");
    if (at < 0) {
      return line;
    }
    const head = line.slice(0, at);
    const id = nodeId(head);
    if (id === null) {
      return line;
    }
    const note = parseNote(line.slice(at + 3));
    if (note === null) {
      return line;
    }
    for (const index of [note.llm, note.created]) {
      if (index !== null && index > chars.length) {
        throw new Error(`char ${index} 超出源码长度 ${chars.length}：${line.trim()}`);
      }
    }
    // 给了 created 就以它为准：map 里是 null（shape token 没记 CreatedAt）也要盖掉文件里的旧数字。
    const createdAt = created === null
      ? note.created
      : created.has(id) ? created.get(id) : note.created;
    const next = `${head}// ${noteFor(source, createdAt, note.llm)}${note.suffix}`;
    if (next !== line) {
      changed++;
    }
    return next;
  });
  return { text: out.join("\n"), changed };
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------

const KIND_WIDTH = 22;

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

export function printActual(source, actual) {
  for (const rec of actual.final) {
    const at = actual.created.get(rec.key);
    const where = at === undefined
      ? "not in tree"
      : `created at char ${at === null ? "?" : at}${contextAt(source, at)}`;
    const gutter = "   ".repeat(rec.depth);
    const branch = rec.depth === 0 ? "" : rec.isLast ? "└─ " : "├─ ";
    const text = rec.text === "" ? "" : `  text="${rec.text}"`;
    const pos = rec.kind === "SourceFile" ? 0 : rec.pos;
    console.log(`${gutter}${branch}${rec.kind}  pos=${pos}  src=[${rec.start},${rec.end})${text}   // ${where}`);
  }
}

/** 结构化的对拍结果：插件和 CLI 共用，CLI 只负责把它打印出来。
 *  llm determined（.infer 里的判定）对 created at（shape token 的创建位置）：
 *  delta = llm - created，正数 = 模型判得比实际创建晚。 */
export function evaluate(source, name, inferText, actual = null) {
  const notes = parseInfer(inferText);
  const traced = actual ?? traceActual(source, name);
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
    const llm = note === undefined ? null : note.llm;
    const created = traced.created.get(id);
    let status;
    let delta = null;
    if (note === undefined) {
      status = "no-annotation";
    } else if (llm === null) {
      status = "unfilled";
    } else if (created === undefined) {
      status = "no-shape";
    } else if (created === null) {
      status = "no-created";
    } else {
      delta = llm - created;
      status = delta === 0 ? "ok" : delta > 0 ? `late +${delta}` : `early ${delta}`;
    }
    rows.push({
      id,
      info,
      llm,
      created: created === undefined ? null : created,
      delta,
      status,
    });
  }
  const stale = [...notes.keys()].filter((id) => !used.has(id));
  return { rows, stale };
}

/**
 * 把「节点 → llm determined」的数字填进骨架，再补两个位置的上下文。
 * @param {string} source 用例源码
 * @param {string} scaffoldText 骨架（每行 `created at …` + `llm determined at char ?`）
 * @param {Map<string, number>} numbers 节点身份 → 模型判定的字符号
 * @param {Map<string, number|null>|null} created 节点身份 → shape token 的 CreatedAt
 * @returns {{text: string, filled: number, missing: string[]}}
 */
export function applyNumbers(source, scaffoldText, numbers, created = null) {
  let filled = 0;
  const missing = [];
  const lines = scaffoldText.split(/\r?\n/).map((line) => {
    const at = line.indexOf("// ");
    if (at < 0) {
      return line;
    }
    const head = line.slice(0, at);
    const id = nodeId(head);
    if (id === null) {
      return line;
    }
    const note = parseNote(line.slice(at + 3));
    if (note === null) {
      return line;
    }
    if (!numbers.has(id)) {
      missing.push(id);
      return line;
    }
    filled++;
    const createdAt = created === null
      ? note.created
      : created.has(id) ? created.get(id) : note.created;
    return `${head}// ${noteFor(source, createdAt, numbers.get(id))}${note.suffix}`;
  });
  return { text: formatInfer(source, lines.join("\n"), created).text, filled, missing };
}

export function check(source, name, inferText) {
  const { rows, stale } = evaluate(source, name, inferText);

  const okCount = rows.filter((row) => row.status === "ok").length;
  const badCount = rows.length - okCount;
  for (const row of rows) {
    const where = `${row.info.kind}  pos=${row.info.pos}  src=[${row.info.start},${row.info.end})`;
    console.log(
      `${pad(row.status, 14)}${pad(where, KIND_WIDTH + 24)}llm=${row.llm === null ? "?" : row.llm}` +
      `  created=${row.created === null ? "?" : row.created}  ${row.status === "ok" ? "" : "<--"}`,
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
  node typescript/tools/case-infer.mjs --format <case.ts>   规范化：补两个位置的上下文、旧表头换成 ts 源码块
  node typescript/tools/case-infer.mjs --check <case.ts>    llm determined vs created at（有差异退出码 1）
  node typescript/tools/case-infer.mjs --actual <case.ts>   打印 created at（调试用）
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
      fs.writeFileSync(inferPath, scaffold(source, name, traceActual(source, name).created), "utf8");
      console.log(`wrote ${path.relative(ROOT, inferPath).split(path.sep).join("/")}`);
      return 0;
    }

    if (!fs.existsSync(inferPath)) {
      process.stderr.write(`没有 ${path.relative(ROOT, inferPath)}：先跑 node typescript/tools/case-infer.mjs ${files[0]}\n`);
      return 2;
    }
    const inferText = fs.readFileSync(inferPath, "utf8");

    if (mode === "format") {
      const result = formatInfer(source, inferText, traceActual(source, name).created);
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

const invokedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  process.exitCode = main(process.argv.slice(2));
}
