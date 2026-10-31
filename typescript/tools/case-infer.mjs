#!/usr/bin/env node
// case.infer 工具。
//
// 用途：给 tts 用例产出一份 `<名字>.infer`：与 `.ast` 同形的树，每行末尾的上下文用 `【x:N】`
// 标出位置——N 是 ShapeToken.CreatedAt（解析器建出这颗形状的那一格）。两个位置不同时，
// 后面再跟 `-> llm "…【x:M】…"`，M 是模型按语法逻辑判定的「最早在哪一格确定」。
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

/** 标记字符的上下文：前后各至少 5 个字符，边缘落在单词中间时向外扩到词边界，两端空白压成一个空格。
 *  marker 缺省时标出字符本身（`【<】`），给了就写进括号（注记用 `【x:N】`）。 */
export function snippetAt(source, at, marker = null) {
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
  const mark = marker === null ? displayChar(chars[at]) : marker;
  return `${left}【${mark}】${right}`;
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

/** 标记字符的上下文；at 落在 EOF 那一格（= 字符总数）时贴在末尾。 */
function contextAt(source, at) {
  if (at === null || at === undefined) {
    return "";
  }
  const chars = charsOf(source);
  if (at >= chars.length) {
    const tail = chars.slice(Math.max(0, chars.length - CONTEXT * 2)).join("").replace(/\s+/g, " ").trim();
    return `"${escapeContext(tail)}【x:${at}】"`;
  }
  return `"${escapeContext(snippetAt(source, at, `x:${at}`))}"`;
}

/** 行末注记：位置写在上下文的 `【x:N】` 里。
 *  两个位置相同 → `"let x【x:5】= 1"`；
 *  不同 → `"let x【x:8】= 1" -> llm "let x【x:5】= 1"`；
 *  缺哪一侧就在哪一侧写 `?`。 */
export function noteFor(source, created, llm) {
  const hasCreated = created !== null && created !== undefined;
  const hasLlm = llm !== null && llm !== undefined;
  if (!hasCreated && !hasLlm) {
    return "?";
  }
  if (!hasCreated) {
    return `? -> llm ${contextAt(source, llm)}`;
  }
  const first = contextAt(source, created);
  if (!hasLlm) {
    return `${first} -> llm ?`;
  }
  return created === llm ? first : `${first} -> llm ${contextAt(source, llm)}`;
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

const QUOTED = '"(?:[^"\\\\]|\\\\.)*"';
const NOTE_DIFF = new RegExp(`^(${QUOTED})\\s*->\\s*llm\\s+(${QUOTED})(.*)$`);
const NOTE_LLM_ONLY = new RegExp(`^\\?\\s*->\\s*llm\\s+(${QUOTED})(.*)$`);
const NOTE_CREATED_ONLY = new RegExp(`^(${QUOTED})\\s*->\\s*llm\\s+\\?(.*)$`);
const NOTE_SAME = new RegExp(`^(${QUOTED})(.*)$`);
const X_MARK = /【x:(\d+)】/;

/** 注记里唯一有意义的补充说明：`（由 TypeParameterList 转换）` 这类括号尾注。 */
const NOTE_SUFFIX = /（由[^）]*）\s*$/;

/** 从上下文里取位置：`"…【x:6】…"` → 6；没有标记就是 null。 */
function positionIn(context) {
  const match = X_MARK.exec(context);
  return match === null ? null : Number(match[1]);
}

/** 解析一行注记（位置在 `【x:N】` 里）。
 *  同一格式：`"…【x:5】…"`；不同：`"…【x:8】…" -> llm "…【x:5】…"`；
 *  缺一侧写 `?`。过渡期仍认上一版 `created at char N …, llm determined at char N …`
 *  和最早的 `// char N "…"`：数字照收，上下文由 formatInfer 用源码重算。 */
export function parseNote(text) {
  const trimmed = text.trim();

  const diff = NOTE_DIFF.exec(trimmed);
  if (diff !== null) {
    return { created: positionIn(diff[1]), llm: positionIn(diff[2]), suffix: diff[3] ?? "" };
  }
  const llmOnly = NOTE_LLM_ONLY.exec(trimmed);
  if (llmOnly !== null) {
    return { created: null, llm: positionIn(llmOnly[1]), suffix: llmOnly[2] ?? "" };
  }
  const createdOnly = NOTE_CREATED_ONLY.exec(trimmed);
  if (createdOnly !== null) {
    return { created: positionIn(createdOnly[1]), llm: null, suffix: createdOnly[2] ?? "" };
  }
  const same = NOTE_SAME.exec(trimmed);
  if (same !== null) {
    const at = positionIn(same[1]);
    return { created: at, llm: at, suffix: same[2] ?? "" };
  }
  const blank = /^\?(.*)$/.exec(trimmed);
  if (blank !== null) {
    return { created: null, llm: null, suffix: blank[1] ?? "" };
  }

  // 过渡期：上一版 `created at char N "…", llm determined at char N "…"`。
  const prev = /^created at char (\d+|\?).*?llm determined at char (\d+|\?)/.exec(trimmed);
  if (prev !== null) {
    return {
      created: prev[1] === "?" ? null : Number(prev[1]),
      llm: prev[2] === "?" ? null : Number(prev[2]),
      suffix: NOTE_SUFFIX.exec(trimmed)?.[0] ?? "",
    };
  }
  // 更早：`// char N "…"`，只有 llm determined。
  const old = /^char (\d+|\?)/.exec(trimmed);
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
 *  `// "…【x:N】…"` 或 `// "…【x:N】…" -> llm "…【x:M】…"`；`?` 与补充说明保留。
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
    const where = at === undefined ? "not in tree" : `created ${noteFor(source, at, null)}`;
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
 * @param {string} scaffoldText 骨架（每行 `"…【x:N】…" -> llm ?`，N 是 CreatedAt）
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
