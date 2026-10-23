// 分配归因探针：不改业务源码，只在 require 之后替换模块导出，数出**每字符到底分配了什么**。
//
//   node tests/bench/dts-alloc-probe.mjs --files 1        # 最大的一份 .d.ts（= lib.dom）
//   node tests/bench/dts-alloc-probe.mjs --files 8        # 与 parse-perf --dts 8 同一批
//   node tests/bench/dts-alloc-probe.mjs --files 1 --json
//
// 为什么要单独一个脚本（而不是往 dts-cost-probe.mjs 的 WATCH 里加名字）：
//   `SourceRange` / `TextDocument` 的分配**不在方法调用里**，而在 `new SourceRange(...)` 与
//   `this.GetValue = ...` 这两处。WATCH 只能包原型方法，数不到它们；这里替换的是模块导出本身：
//     - `exports.SourceRange` 换成一个计数子类（SourceRange 全仓没有 `instanceof` 判定依赖导出，
//       只有 source-range.js 内部的 `other instanceof SourceRange` 判形参，子类实例同样通过）；
//     - `SourceRange.Whole` / `SourceRange.Of` 是基类静态方法，单独包一层，因为它们内部的
//       `new SourceRange(...)` 用的是模块内局部绑定，子类看不到；
//     - `exports.TextDocument` 换成子类，在 `super()` 之后把 `this.GetValue` 包一层——
//       `SourceRange.At` 读的就是这个 own property，所以能数到全部 GetValue。
//
// 口径警告：**本脚本打印的 ms 不能用于性能对比**。包装让每次 At/GetValue 多一层调用、
// 让 SourceRange 的隐藏类变成子类，实测会让 Parse 慢一倍以上；ms 只用来确认"这次真的解析了"。
// 本脚本只产出**计数**，ns 成本看 dts-micro-buffer.mjs，时间占比看 prof-summary.mjs。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const buildTs = path.join(root, "build", "ts");

const argv = process.argv.slice(2);
const filesIdx = argv.indexOf("--files");
const fileCount = filesIdx >= 0 ? Number(argv[filesIdx + 1] ?? 1) : 1;
const asJson = argv.includes("--json");
const attribute = argv.includes("--attribute");

// ---------------- Whole() 调用点抽样归因 ----------------
const wholeSites = new Map();
const shortFile = (url) => (url ? url.replace(/\\/g, "/").replace(/^.*?\/build\/ts\//, "") : "(native)");
function callerFrame() {
  const saved = Error.stackTraceLimit;
  Error.stackTraceLimit = 8;
  const stack = new Error().stack || "";
  Error.stackTraceLimit = saved;
  // stack[0]="Error" [1]=callerFrame [2]=CountingSourceRange.Whole [3]=真正的调用者 [4]=它的调用者
  const frames = stack.split("\n");
  const name = (line) => {
    const m = (line || "").match(/\(?([^()\s]+):(\d+):\d+\)?$/);
    if (!m) return (line || "(unknown)").trim();
    const fn = (line.match(/at\s+([^\s(]+)/) || [])[1] || "?";
    return `${shortFile(m[1])}:${m[2]} ${fn.replace(/^.*\./, "")}`;
  };
  return `${name(frames[3])} ← ${name(frames[4])}`;
}

// ---------------- 计数桶 ----------------
const counts = {
  newSourceRange: 0,
  srNullDocument: 0, // new SourceRange()：Token 的字段初始化，每建一个 token 一次
  srEmpty: 0, // Start === End：空区间（收尾 / 哨兵）
  srWindowShaped: 0, // 0 < End-Start <= 32：窗口形态（驱动层每窗口一个，另有少量同宽的其它区间）
  srWide: 0, // End-Start > 32：token 的真实跨度
  whole: 0, // SourceRange.Whole(document)
  of: 0, // SourceRange.Of(document, start, end)
  fromRanges: 0, // SourceRange.FromRanges(start, end)
  getValue: 0, // Document.GetValue(index) —— At 内部一次 + 别的读字符处
  documents: 0,
};
const bump = (key) => {
  counts[key] = (counts[key] ?? 0) + 1;
};

// ---------------- 替换 SourceRange ----------------
const sourceRangeMod = require(path.join(buildTs, "core", "syntax", "source-range.js"));
const BaseSourceRange = sourceRangeMod.SourceRange;

// BufferSize 从语法上下文读，避免把 32 写死在两个地方。
const { SyntaxContext } = require(path.join(buildTs, "core", "syntax", "syntax-context.js"));
const BUFFER_SIZE = new SyntaxContext({}).BufferSize;

class CountingSourceRange extends BaseSourceRange {
  constructor(document, start, end) {
    super(document, start, end);
    bump("newSourceRange");
    if (document === undefined || document === null || document === undefined) {
      // `new SourceRange()`：Token.SourceRange 的字段初始化（也含 SourceRange 内部 Clone 以外的空构造）。
      bump("srNullDocument");
    } else if (start === end) {
      bump("srEmpty");
    } else if (end - start <= BUFFER_SIZE) {
      bump("srWindowShaped");
    } else {
      bump("srWide");
    }
  }
}
CountingSourceRange.Whole = function (document) {
  bump("whole");
  // 抽样归因：Whole 是所有 SourceRange 里分配量最大的一项（lib.dom 每次 parse 140 万次），
  // 而它内部的 `new SourceRange(...)` 用的是模块内局部绑定，数不到调用点。
  // 每 200 次抽一次栈，按「调用 Whole 的那一帧」聚合——足够看出是谁在热路径里反复 Whole。
  if (attribute && counts.whole % 200 === 0) {
    const frame = callerFrame();
    wholeSites.set(frame, (wholeSites.get(frame) || 0) + 200); // 按抽样间隔放大，得到可比的相对量
  }
  return BaseSourceRange.Whole(document);
};
CountingSourceRange.Of = function (document, start, end) {
  bump("of");
  return BaseSourceRange.Of(document, start, end);
};
CountingSourceRange.FromRanges = function (start, end) {
  bump("fromRanges");
  return BaseSourceRange.FromRanges(start, end);
};
sourceRangeMod.SourceRange = CountingSourceRange;

// ---------------- 替换 TextDocument（只为包住 GetValue）----------------
const textDocumentMod = require(path.join(buildTs, "typescript", "run", "text-document.js"));
const BaseTextDocument = textDocumentMod.TextDocument;

class CountingTextDocument extends BaseTextDocument {
  constructor(content, filePath) {
    super(content, filePath);
    bump("documents");
    const original = this.GetValue;
    this.GetValue = (index) => {
      bump("getValue");
      return original(index);
    };
  }
}
textDocumentMod.TextDocument = CountingTextDocument;

// SourceFileRunner.Parse 内部是 `new text_document_1.TextDocument(...)`——模块对象上的属性查找，
// 所以上面的替换会被它看到（这点由下面的 `documents` 计数验证：必须等于解析次数）。
const { SourceFileRunner } = require(path.join(buildTs, "typescript", "run", "source-file-runner.js"));

// ---------------- 语料 ----------------
function collectDtsFiles(n) {
  const libDir = path.join(root, "node_modules", "typescript", "lib");
  return fs
    .readdirSync(libDir)
    .filter((name) => name.endsWith(".d.ts"))
    .map((name) => ({ name, full: path.join(libDir, name), size: fs.statSync(path.join(libDir, name)).size }))
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name))
    .slice(0, n);
}

const reset = () => {
  for (const key of Object.keys(counts)) counts[key] = 0;
  wholeSites.clear();
};

const files = collectDtsFiles(fileCount);
const rows = [];
for (const file of files) {
  const text = fs.readFileSync(file.full, "utf8");
  SourceFileRunner.Parse(text, file.name); // warmup，顺带验证替换没把解析搞坏
  if (counts.documents === 0) {
    throw new Error("TextDocument 替换没有被 SourceFileRunner.Parse 看到——计数无效，不要相信后面的数字");
  }
  reset();
  const start = process.hrtime.bigint();
  const shape = SourceFileRunner.Parse(text, file.name);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  if (!shape || !Array.isArray(shape.Data)) throw new Error(`${file.name}: Parse 未返回带 Data 的 SourceFileShape`);

  const chars = text.length;
  const windows = Math.ceil(chars / BUFFER_SIZE);
  const perChar = (v) => +(v / chars).toFixed(4);
  const perWindow = (v) => +(v / windows).toFixed(3);

  const wholeBySite = [...wholeSites.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([site, estimated]) => ({ site, estimated, sharePct: +((estimated / Math.max(1, counts.whole)) * 100).toFixed(1) }));

  rows.push({
    file: file.name,
    chars,
    bytes: file.size,
    statements: shape.Data.length,
    msInflated: +ms.toFixed(1),
    bufferSize: BUFFER_SIZE,
    windows,
    windowsFormula: `ceil(chars/${BUFFER_SIZE})`,
    counts: { ...counts },
    wholeBySite,
    perChar: {
      newSourceRange: perChar(counts.newSourceRange),
      srNullDocument: perChar(counts.srNullDocument),
      srEmpty: perChar(counts.srEmpty),
      srWindowShaped: perChar(counts.srWindowShaped),
      srWide: perChar(counts.srWide),
      whole: perChar(counts.whole),
      getValue: perChar(counts.getValue),
    },
    perWindow: {
      newSourceRange: perWindow(counts.newSourceRange),
      srWindowShaped: perWindow(counts.srWindowShaped),
      whole: perWindow(counts.whole),
    },
    // 每窗口到底分配了几个 SourceRange，是判断"窗口分配是不是瓶颈"的关键口径。
    sourceRangePerWindow: perWindow(counts.newSourceRange),
    windowShareOfAllocationsPct: +((windows / Math.max(1, counts.newSourceRange)) * 100).toFixed(2),
  });
}

const report = {
  mode: "alloc",
  node: process.version,
  bufferSize: BUFFER_SIZE,
  note:
    "msInflated 是包装后的耗时，只用于确认解析真的发生了，不可用于性能对比；" +
    "windows 由 BufferSize 算术得出（SyntaxContext.Process 每窗口 new 一个 SourceRange）；" +
    "srWindowShaped 是实测的『宽度 ≤ BufferSize 的 SourceRange』，含窗口本身与少量其它同宽区间。",
  files: rows,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const lines = [];
  lines.push(`node ${process.version}  BufferSize=${BUFFER_SIZE}  files=${rows.length}`);
  for (const r of rows) {
    lines.push("");
    lines.push(`## ${r.file}  chars=${r.chars}  stmts=${r.statements}  (msInflated ${r.msInflated}，仅供确认解析发生)`);
    lines.push(`   窗口数 ${r.windows}（${r.windowsFormula}），每窗口分配 ${r.sourceRangePerWindow} 个 SourceRange`);
    lines.push(`   SourceRange 分配 ${r.counts.newSourceRange} 个 = ${r.perChar.newSourceRange}/char；其中`);
    lines.push(`     空构造（Token 字段）${r.counts.srNullDocument}  ${r.perChar.srNullDocument}/char`);
    lines.push(`     窗口形态(0<宽≤${BUFFER_SIZE}) ${r.counts.srWindowShaped}  ${r.perChar.srWindowShaped}/char`);
    lines.push(`     宽区间(>${BUFFER_SIZE})      ${r.counts.srWide}  ${r.perChar.srWide}/char`);
    lines.push(`     空区间(Start===End) ${r.counts.srEmpty}  ${r.perChar.srEmpty}/char`);
    lines.push(`   SourceRange.Whole() ${r.counts.whole}  ${r.perChar.whole}/char  ${r.perWindow.whole}/窗口`);
    lines.push(`   SourceRange.Of()    ${r.counts.of}`);
    lines.push(`   Document.GetValue() ${r.counts.getValue}  ${r.perChar.getValue}/char`);
    lines.push(`   窗口自身占全部分配 ${r.windowShareOfAllocationsPct}%`);
    if (r.wholeBySite.length > 0) {
      lines.push(`   SourceRange.Whole() 调用点抽样（每 200 次抽 1，占比为估算）：`);
      for (const s of r.wholeBySite) lines.push(`     ${String(s.sharePct).padStart(5)}%  ${String(s.estimated).padStart(9)} 次  ${s.site}`);
    }
    lines.push(
      `   全部 SourceRange 分配 ≈ ${(r.counts.newSourceRange + r.counts.whole + r.counts.of + r.counts.fromRanges).toLocaleString("en-US")} 个` +
        ` = ${((r.counts.newSourceRange + r.counts.whole + r.counts.of + r.counts.fromRanges) / r.chars).toFixed(3)}/char`,
    );
  }
  console.log(lines.join("\n"));
}
