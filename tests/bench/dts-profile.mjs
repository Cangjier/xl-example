// dts 性能画像：真实 `.d.ts` 语料的端到端读数、TS 对照、规模曲线与机器可读输出。
//
//   node tests/bench/dts-profile.mjs --corpus                 # 226 份 *.d.ts 全量逐份
//   node tests/bench/dts-profile.mjs --corpus --top 10        # 只打印最大的 10 份
//   node tests/bench/dts-profile.mjs --file <path> --repeat 7 # 单文件重复 parse
//   node tests/bench/dts-profile.mjs --ts --corpus            # 同一批文件与 ts.createSourceFile 对照
//   node tests/bench/dts-profile.mjs --scale 1,2,4,8          # 最大文件拼接 1/2/4/8 倍
//   node --expose-gc tests/bench/dts-profile.mjs --corpus     # 强制计时样本间 GC，读数更稳
//
// 口径（与 tests/bench/parse-perf.mjs 一致，只测 SourceFileRunner.Parse）：
//   1) `Parse(text, path)` 返回 **shape 树**（SourceFileShape）。本轮实测确认它不投影 AST，
//      因此「ours」= 一棵 shape 树；`--ts` 的 `ts.createSourceFile` = 一棵 AST（可选父指针）。
//      两边都是「一次扫描建一棵树」，但节点字段与后处理不同，倍数只能当上界参照，不是等价工作量。
//   2) 每档 warmup 次预热后 repeat 次计时，报 min/median/max/mean/stdev；corpus 模式默认 repeat=2。
//   3) 计时用 process.hrtime.bigint()，只包住 Parse（不含 readFileSync、不含 GC 统计本身）。
//   4) 确定性：无随机数、无网络；除 `--cpu-prof`/`--trace-gc` 这种 Node 自己的开关外不写文件。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import v8 from "node:v8";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PerformanceObserver } from "node:perf_hooks";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));

const DEFAULTS = {
  repeat: 2,
  warmup: 1,
  top: 0,
  scale: "1,2,4,8",
};

function usage() {
  return [
    "用法: node tests/bench/dts-profile.mjs <mode> [options]",
    "",
    "  --corpus            真实语料：node_modules 下全部 *.d.ts（typescript/lib + @types/node + undici-types，共 226 份）",
    "  --file <path>       单文件重复 parse（配合 --repeat/--warmup）",
    "  --top N             报告里只打印耗时最大的 N 份（corpus）/ 只重复最大的 N 份（--ts 时同 --corpus）",
    `  --scale 1,2,4,8     最大文件内容重复拼接的倍数列表（默认 ${DEFAULTS.scale}）`,
    "  --ts                与 ts.createSourceFile 对照，给出 ours/TS 倍数",
    "  --repeat R          每档重复次数，取中位（corpus 默认 2，单文件默认 7）",
    "  --warmup W          计时前预热次数（默认 1）",
    "  --gc                样本之间强制 global.gc()（需 node --expose-gc；否则忽略并注明）",
    "  --json              输出机器可读 JSON（不写文件）",
    "",
    "不带 mode 时等价于 --corpus。",
  ].join("\n");
}

// ---------------- 参数 ----------------
function parseIntArg(text, name) {
  const n = Number(text);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) throw new Error(`${name} 需要非负整数: ${text}`);
  return n;
}
function parseList(text, name) {
  const list = text.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  if (list.length === 0 || list.some((n) => !Number.isInteger(n) || n <= 0)) throw new Error(`${name} 列表非法: ${text}`);
  return list;
}

const argv = process.argv.slice(2);
const opts = {
  corpus: false,
  file: null,
  scale: null,
  ts: false,
  repeat: null,
  warmup: DEFAULTS.warmup,
  top: DEFAULTS.top,
  forceGc: false,
  json: false,
};

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--help" || arg === "-h") {
    console.log(usage());
    process.exit(0);
  } else if (arg === "--corpus") opts.corpus = true;
  else if (arg === "--ts") opts.ts = true;
  else if (arg === "--json") opts.json = true;
  else if (arg === "--gc") opts.forceGc = true;
  else if (arg === "--file") {
    if (argv[i + 1] === undefined) throw new Error("--file 需要一个路径");
    opts.file = argv[++i];
  } else if (arg === "--top") {
    if (argv[i + 1] === undefined) throw new Error("--top 需要一个整数");
    opts.top = parseIntArg(argv[++i], "--top");
  } else if (arg === "--repeat") {
    if (argv[i + 1] === undefined) throw new Error("--repeat 需要一个整数");
    opts.repeat = parseIntArg(argv[++i], "--repeat");
    if (opts.repeat < 1) throw new Error("--repeat 至少为 1");
  } else if (arg === "--warmup") {
    if (argv[i + 1] === undefined) throw new Error("--warmup 需要一个整数");
    opts.warmup = parseIntArg(argv[++i], "--warmup");
  } else if (arg === "--scale") {
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      opts.scale = parseList(DEFAULTS.scale, "--scale"); // 只写 --scale 时取默认档 1,2,4,8
    } else {
      opts.scale = parseList(next, "--scale");
      i++;
    }
  } else {
    console.error(`未知参数: ${arg}\n\n${usage()}`);
    process.exit(2);
  }
}

if (!opts.corpus && !opts.file && !opts.scale) opts.corpus = true;
const repeat = opts.repeat === null ? (opts.file && !opts.corpus ? 7 : DEFAULTS.repeat) : opts.repeat;
const canGc = typeof global.gc === "function";
const useGc = opts.forceGc && canGc;

// ---------------- 语料 ----------------
// 与 typescript/cases/real-dts-ast.mjs 同一批：三棵目录树下全部 *.d.ts。
function collectCorpus() {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (name.endsWith(".d.ts")) files.push({ full, rel: path.relative(root, full), size: stat.size });
    }
  };
  walk(path.join(root, "node_modules", "typescript", "lib"));
  walk(path.join(root, "node_modules", "@types", "node"));
  walk(path.join(root, "node_modules", "undici-types"));
  if (files.length === 0) throw new Error("语料为空：先安装 node_modules（typescript / @types/node / undici-types）");
  // 固定顺序：体积降序、同体积按相对路径，保证重复运行顺序一致。
  return files.sort((a, b) => b.size - a.size || a.rel.localeCompare(b.rel));
}

// ---------------- 计时 ----------------
const round = (v, d = 3) => Number(v.toFixed(d));
const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const stdev = (values) => {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1));
};

function parseOnce(text, fileName) {
  const start = process.hrtime.bigint();
  const shape = SourceFileRunner.Parse(text, fileName);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  if (!shape || !Array.isArray(shape.Data)) throw new Error(`${fileName}: Parse 未返回带 Data 的 SourceFileShape`);
  return { ms, statements: shape.Data.length };
}

// 一次完整测量：warmup 次预热 → repeat 次计时（可选样本间强制 GC）。
function measure(text, fileName) {
  for (let i = 0; i < opts.warmup; i++) parseOnce(text, fileName);
  const samples = [];
  let statements = 0;
  for (let i = 0; i < repeat; i++) {
    if (useGc) global.gc();
    const r = parseOnce(text, fileName);
    samples.push(r.ms);
    statements = r.statements;
  }
  return { samples, statements };
}

// ---------------- GC / 堆观测 ----------------
let gcEvents = [];
let gcObserverUsable = false;
try {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) gcEvents.push(entry);
  });
  observer.observe({ entryTypes: ["gc"] });
  gcEvents = [];
  gcObserverUsable = true;
} catch {
  gcObserverUsable = false;
}

function gcSnapshot() {
  // 手动触发一次 GC 让 after 读数可比（仅当允许）。
  if (canGc) global.gc();
  const heap = v8.getHeapStatistics();
  const mem = process.memoryUsage();
  return { heapUsedMB: round(heap.used_heap_size / 1048576, 1), rssMB: round(mem.rss / 1048576, 1) };
}

function gcReport() {
  if (!gcObserverUsable) return { available: false, reason: "PerformanceObserver 不支持 gc entryType" };
  const totalMs = gcEvents.reduce((sum, e) => sum + e.duration, 0);
  const maxMs = gcEvents.reduce((m, e) => Math.max(m, e.duration), 0);
  const byKind = {};
  for (const e of gcEvents) {
    const kind = e.detail && e.detail.kind !== undefined ? `kind${e.detail.kind}` : "unknown";
    byKind[kind] = byKind[kind] || { count: 0, ms: 0 };
    byKind[kind].count += 1;
    byKind[kind].ms = round(byKind[kind].ms + e.duration);
  }
  return { available: true, count: gcEvents.length, totalMs: round(totalMs), maxMs: round(maxMs), byKind };
}

// ---------------- 回归：ms vs KB ----------------
function regress(points) {
  // points: [{ kb, ms }]；OLS ms = a + b*kb；log-log 指数 beta（>1 表示超线性）
  const n = points.length;
  if (n < 2) return null;
  const mx = mean(points.map((p) => p.kb));
  const my = mean(points.map((p) => p.ms));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.kb - mx) * (p.ms - my);
    den += (p.kb - mx) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = my - b * mx;
  // R²
  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    ssTot += (p.ms - my) ** 2;
    ssRes += (p.ms - (a + b * p.kb)) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  // log-log
  const lp = points.filter((p) => p.kb > 0 && p.ms > 0).map((p) => ({ x: Math.log(p.kb), y: Math.log(p.ms) }));
  const lmx = mean(lp.map((p) => p.x));
  const lmy = mean(lp.map((p) => p.y));
  let lnum = 0;
  let lden = 0;
  for (const p of lp) {
    lnum += (p.x - lmx) * (p.y - lmy);
    lden += (p.x - lmx) ** 2;
  }
  const beta = lden === 0 ? 0 : lnum / lden;
  return { slopeMsPerKB: round(b, 4), interceptMs: round(a), r2: round(r2, 4), logLogExponent: round(beta, 3) };
}

// ---------------- TS 对照 ----------------
let tsModule = null;
function tsParseOnce(text, fileName) {
  if (!tsModule) tsModule = require(path.join(root, "node_modules", "typescript"));
  const ts = tsModule;
  const start = process.hrtime.bigint();
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  if (!sf || !Array.isArray(sf.statements)) throw new Error(`${fileName}: ts.createSourceFile 未返回 SourceFile`);
  return { ms, statements: sf.statements.length };
}
function tsParseNoParents(text, fileName) {
  if (!tsModule) tsModule = require(path.join(root, "node_modules", "typescript"));
  const ts = tsModule;
  const start = process.hrtime.bigint();
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { ms, statements: sf.statements.length };
}

// ---------------- 报告 ----------------
const report = {
  tool: "dts-profile",
  node: process.version,
  v8: process.versions.v8,
  platform: `${process.platform}-${process.arch}`,
  cpu: (os.cpus()[0] || {}).model || "unknown",
  cpuCount: os.cpus().length,
  repeat,
  warmup: opts.warmup,
  forcedGc: useGc,
  gcObserverUsable,
  modes: {},
};
const human = [];
human.push(`node ${process.version}  v8 ${process.versions.v8}  ${process.platform}-${process.arch}  cpu="${report.cpu}" x${report.cpuCount}`);
human.push(`repeat=${repeat} warmup=${opts.warmup} forcedGc=${useGc}${opts.forceGc && !canGc ? "（--gc 被忽略：未用 --expose-gc 启动）" : ""}`);

let peakHeapUsedMB = 0;
const trackHeap = () => {
  const used = v8.getHeapStatistics().used_heap_size;
  peakHeapUsedMB = Math.max(peakHeapUsedMB, used);
};

try {
  // ---- 模式 A：corpus ----
  if (opts.corpus) {
    const corpus = collectCorpus();
    const heapBefore = gcSnapshot();
    gcEvents = [];
    const startedWall = process.hrtime.bigint();

    const rows = [];
    for (const entry of corpus) {
      const text = fs.readFileSync(entry.full, "utf8");
      const { samples, statements } = measure(text, path.basename(entry.full));
      trackHeap();
      const kb = text.length / 1024;
      rows.push({
        file: entry.rel,
        bytes: entry.size,
        chars: text.length,
        kb: round(kb, 2),
        statements,
        minMs: round(Math.min(...samples)),
        medianMs: round(median(samples)),
        maxMs: round(Math.max(...samples)),
        meanMs: round(mean(samples)),
        msPerKB: round(median(samples) / kb, 4),
      });
    }
    const wallMs = round(Number(process.hrtime.bigint() - startedWall) / 1e6);
    const heapAfter = gcSnapshot();

    const totalMs = round(rows.reduce((s, r) => s + r.medianMs, 0));
    const totalBytes = rows.reduce((s, r) => s + r.bytes, 0);
    const medians = rows.map((r) => r.medianMs);
    const normalized = rows.filter((r) => r.kb >= 1).map((r) => ({ kb: r.kb, ms: r.medianMs }));
    const fit = regress(normalized);
    const sortedByMs = rows.slice().sort((a, b) => b.medianMs - a.medianMs);

    report.modes.corpus = {
      count: rows.length,
      totalBytes,
      totalMedianMs: totalMs,
      wallMs,
      medianOfFilesMs: round(median(medians)),
      meanOfFilesMs: round(mean(medians)),
      p90OfFilesMs: round(medians.slice().sort((a, b) => a - b)[Math.floor(medians.length * 0.9)]),
      maxOfFilesMs: round(Math.max(...medians)),
      minOfFilesMs: round(Math.min(...medians)),
      aggregateMsPerKB: round(totalMs / (totalBytes / 1024), 4),
      regression: fit,
      gc: gcReport(),
      heap: { beforeMB: heapBefore.heapUsedMB, afterMB: heapAfter.heapUsedMB, peakMB: round(peakHeapUsedMB / 1048576, 1) },
      files: rows,
    };

    human.push("");
    human.push(`## corpus（${rows.length} 份，${totalBytes} B，合计 median ${totalMs} ms，墙钟 ${wallMs} ms）`);
    human.push(`   每份 median：中位 ${report.modes.corpus.medianOfFilesMs} ms / 均值 ${report.modes.corpus.meanOfFilesMs} ms / p90 ${report.modes.corpus.p90OfFilesMs} ms / 最大 ${report.modes.corpus.maxOfFilesMs} ms`);
    human.push(`   归一化：合计 ${report.modes.corpus.aggregateMsPerKB} ms/KB；OLS 斜率 ${fit.slopeMsPerKB} ms/KB（R²=${fit.r2}）；log-log 指数 β=${fit.logLogExponent}${fit.logLogExponent > 1.1 ? "  ← 超线性" : ""}`);
    const shown = opts.top > 0 ? sortedByMs.slice(0, opts.top) : sortedByMs;
    human.push(`   按耗时降序：`);
    for (const row of shown) {
      human.push(
        `     ${String(row.medianMs).padStart(9)} ms  ${String(row.bytes).padStart(9)} B  ${String(row.msPerKB).padStart(7)} ms/KB  stmts=${String(row.statements).padStart(5)}  ${row.file}`,
      );
    }
    if (opts.top > 0 && shown.length < rows.length) human.push(`     …（其余 ${rows.length - shown.length} 份见 --json）`);
  }

  // ---- 模式 B：单文件重复 ----
  if (opts.file) {
    const full = path.resolve(root, opts.file);
    if (!fs.existsSync(full)) throw new Error(`文件不存在: ${full}`);
    const text = fs.readFileSync(full, "utf8");
    const heapBefore = gcSnapshot();
    gcEvents = [];
    const startedWall = process.hrtime.bigint();
    const { samples, statements } = measure(text, path.basename(full));
    const wallMs = round(Number(process.hrtime.bigint() - startedWall) / 1e6);
    trackHeap();
    const heapAfter = gcSnapshot();
    const kb = text.length / 1024;
    const row = {
      file: path.relative(root, full),
      bytes: Buffer.byteLength(text, "utf8"),
      chars: text.length,
      kb: round(kb, 2),
      statements,
      samplesMs: samples.map((ms) => round(ms)),
      minMs: round(Math.min(...samples)),
      medianMs: round(median(samples)),
      maxMs: round(Math.max(...samples)),
      meanMs: round(mean(samples)),
      stdevMs: round(stdev(samples)),
      spread: round(Math.max(...samples) / Math.min(...samples), 2),
      msPerKB: round(median(samples) / kb, 4),
      wallMs,
      gc: gcReport(),
      heap: { beforeMB: heapBefore.heapUsedMB, afterMB: heapAfter.heapUsedMB, peakMB: round(peakHeapUsedMB / 1048576, 1) },
    };
    report.modes.single = row;
    human.push("");
    human.push(`## single（${row.file}，${row.bytes} B，repeat=${repeat}）`);
    human.push(`   samples=[${row.samplesMs.join(", ")}]`);
    human.push(`   min ${row.minMs} / median ${row.medianMs} / max ${row.maxMs} / mean ${row.meanMs} / stdev ${row.stdevMs} ms  spread=x${row.spread}  ${row.msPerKB} ms/KB`);
    human.push(`   gc: ${row.gc.available ? `${row.gc.count} 次，${row.gc.totalMs} ms 合计，最长 ${row.gc.maxMs} ms` : row.gc.reason}`);
    human.push(`   heap: before ${row.heap.beforeMB} MB → after ${row.heap.afterMB} MB，峰值 ${row.heap.peakMB} MB`);
  }

  // ---- 模式 C：TS 对照 ----
  if (opts.ts) {
    const corpus = collectCorpus();
    const picked = opts.top > 0 ? corpus.slice(0, opts.top) : corpus;
    const rows = [];
    for (const entry of picked) {
      const text = fs.readFileSync(entry.full, "utf8");
      const ours = measure(text, path.basename(entry.full));
      const oursMedian = median(ours.samples);

      // TS 两次：带父指针（真实门禁口径）与不带（更接近"只建一棵树"）
      for (let i = 0; i < opts.warmup; i++) tsParseOnce(text, path.basename(entry.full));
      const tsSamples = [];
      for (let i = 0; i < repeat; i++) tsSamples.push(tsParseOnce(text, path.basename(entry.full)).ms);
      for (let i = 0; i < opts.warmup; i++) tsParseNoParents(text, path.basename(entry.full));
      const tsNoParentSamples = [];
      for (let i = 0; i < repeat; i++) tsNoParentSamples.push(tsParseNoParents(text, path.basename(entry.full)).ms);

      const tsMedian = median(tsSamples);
      const tsNoParentMedian = median(tsNoParentSamples);
      rows.push({
        file: entry.rel,
        bytes: entry.size,
        statements: ours.statements,
        oursMedianMs: round(oursMedian),
        tsMedianMs: round(tsMedian),
        tsNoParentMedianMs: round(tsNoParentMedian),
        ratio: round(oursMedian / tsMedian, 2),
        ratioNoParent: round(oursMedian / tsNoParentMedian, 2),
      });
      trackHeap();
    }
    const oursTotal = round(rows.reduce((s, r) => s + r.oursMedianMs, 0));
    const tsTotal = round(rows.reduce((s, r) => s + r.tsMedianMs, 0));
    const tsNoParentTotal = round(rows.reduce((s, r) => s + r.tsNoParentMedianMs, 0));
    report.modes.tsCompare = {
      count: rows.length,
      oursTotalMs: oursTotal,
      tsTotalMs: tsTotal,
      tsNoParentTotalMs: tsNoParentTotal,
      ratioTotal: round(oursTotal / tsTotal, 2),
      ratioNoParentTotal: round(oursTotal / tsNoParentTotal, 2),
      note:
        "ours = SourceFileRunner.Parse 建的 shape 树（实测不投影 AST）；" +
        "ts(parents) = ts.createSourceFile(..., /*setParentNodes*/ true) 建 AST + 父指针；" +
        "ts(noParents) = 同一调用 setParentNodes=false。三者都是「一次扫描建一棵树」，但节点字段/后处理不同，倍数仅供参考上界。",
      files: rows,
    };
    human.push("");
    human.push(`## ts（${rows.length} 份，与 ts.createSourceFile 对照）`);
    for (const row of rows.sort((a, b) => b.oursMedianMs - a.oursMedianMs)) {
      human.push(
        `   ${row.file.padEnd(46)} ours ${String(row.oursMedianMs).padStart(9)} ms  ts ${String(row.tsMedianMs).padStart(8)} ms  ` +
          `ts-noParents ${String(row.tsNoParentMedianMs).padStart(8)} ms  x${row.ratio} / x${row.ratioNoParent}`,
      );
    }
    human.push(`   TOTAL ours ${oursTotal} ms vs ts ${tsTotal} ms → x${report.modes.tsCompare.ratioTotal}；vs ts(noParents) ${tsNoParentTotal} ms → x${report.modes.tsCompare.ratioNoParentTotal}`);
  }

  // ---- 模式 D：scale ----
  if (opts.scale) {
    const corpus = collectCorpus();
    const largest = corpus[0];
    const text = fs.readFileSync(largest.full, "utf8");
    const rows = [];
    for (const mult of opts.scale) {
      const grown = mult === 1 ? text : text.repeat(mult);
      const { samples, statements } = measure(grown, `scaled-x${mult}-${path.basename(largest.full)}`);
      const kb = grown.length / 1024;
      rows.push({
        multiple: mult,
        chars: grown.length,
        kb: round(kb, 2),
        statements,
        minMs: round(Math.min(...samples)),
        medianMs: round(median(samples)),
        maxMs: round(Math.max(...samples)),
        msPerKB: round(median(samples) / kb, 4),
      });
      trackHeap();
    }
    const fit = regress(rows.map((r) => ({ kb: r.kb, ms: r.medianMs })));
    for (let i = 1; i < rows.length; i++) {
      rows[i].scaleVsPrev = round(rows[i].medianMs / rows[i - 1].medianMs, 2);
      rows[i].msPerKBVsPrev = round(rows[i].msPerKB / rows[i - 1].msPerKB, 3);
    }
    report.modes.scale = { source: largest.rel, baseBytes: largest.size, regression: fit, cases: rows };
    human.push("");
    human.push(`## scale（${largest.rel} 重复拼接，判定是否 O(N)）`);
    for (const row of rows) {
      const rel = row.scaleVsPrev === undefined ? "" : `  x${row.scaleVsPrev} vs 上一档，ms/KB x${row.msPerKBVsPrev}`;
      human.push(
        `   x${String(row.multiple).padStart(2)}  ${String(row.chars).padStart(9)} chars  ${String(row.msPerKB).padStart(7)} ms/KB  ` +
          `median ${String(row.medianMs).padStart(10)} ms${rel}`,
      );
    }
    human.push(`   回归：${fit.slopeMsPerKB} ms/KB（R²=${fit.r2}），log-log 指数 β=${fit.logLogExponent}${fit.logLogExponent > 1.1 ? "  ← 超线性" : "  ← 线性"}`);
  }
} catch (error) {
  console.error(`dts-profile 失败: ${error && error.message ? error.message : error}`);
  if (process.env.DTS_PROFILE_STACK) console.error(error);
  process.exit(1);
}

report.peakHeapUsedMB = round(peakHeapUsedMB / 1048576, 1);

if (opts.json) console.log(JSON.stringify(report, null, 2));
else {
  human.push("");
  human.push(`峰值 used_heap_size ${report.peakHeapUsedMB} MB`);
  console.log(human.join("\n"));
}
