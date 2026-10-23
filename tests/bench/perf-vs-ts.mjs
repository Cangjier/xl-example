// perf-vs-ts.mjs — 以 TypeScript 官方解析器为基准，量 shape 树解析的差距。
//
// 口径（写死在脚本里，报告与文档必须同口径）：
//   ours      = shape 树：build/ts/typescript/run/source-file-runner.js 的 SourceFileRunner.Parse
//                （只到 shape 树，不含 AST 投影）
//   ts-np     = ts.createSourceFile(name, text, ScriptTarget.Latest, /*setParentNodes*/ false)
//   ts-parents= ts.createSourceFile(name, text, ScriptTarget.Latest, /*setParentNodes*/ true)
//
// 两者产物不同（shape 树 vs TS AST），倍数只能当量级参照，不能当等价实现对比。
//
// 方法：同进程、逐轮交替（每轮三实现相邻测同一文件，轮间轮换顺序以抵消先后偏置），
//       warmup 1 遍 + repeat 5 遍，每文件取 median；TOTAL = 各文件 median 之和。
//
// 用法（cwd 为仓库根，需先 xl_build + tsc 出 build/ts）：
//   node tests/bench/perf-vs-ts.mjs                # 默认 8 份最大 .d.ts
//   node tests/bench/perf-vs-ts.mjs --corpus       # node_modules 下全部 226 份 .d.ts
//   node tests/bench/perf-vs-ts.mjs --json         # 只输出 JSON（给脚本/记录用）
//   node tests/bench/perf-vs-ts.mjs --repeat 7 --warmup 2 --top 12
//
// 退出码：0 正常；2 前置缺失（build/ts、node_modules/typescript、语料为空）。

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const opts = {
    corpus: false,
    json: false,
    warmup: 1,
    repeat: 5,
    top: 8,
    filter: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`参数 ${arg} 缺少数值`);
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) fail(`参数 ${arg} 需要非负数字，收到 ${v}`);
      return n;
    };
    switch (arg) {
      case "--corpus": opts.corpus = true; break;
      case "--json": opts.json = true; break;
      case "--warmup": opts.warmup = next(); break;
      case "--repeat": opts.repeat = next(); break;
      case "--top": opts.top = next(); break;
      case "--filter": {
        const v = argv[++i];
        if (v === undefined) fail("参数 --filter 缺少子串");
        opts.filter = v;
        break;
      }
      case "-h":
      case "--help":
        console.log("用法: node tests/bench/perf-vs-ts.mjs [--corpus] [--json] [--warmup N] [--repeat N] [--top N] [--filter 子串]");
        process.exit(0);
        break;
      default:
        fail(`未知参数 ${arg}（--help 看用法）`);
    }
  }
  if (opts.repeat < 1) fail("--repeat 至少 1");
  if (opts.top < 1) fail("--top 至少 1");
  return opts;
}

function fail(message) {
  console.error(`perf-vs-ts: ${message}`);
  process.exit(2);
}

// ---------------------------------------------------------------- load

const opts = parseArgs(process.argv.slice(2));

const runnerFile = path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js");
if (!fs.existsSync(runnerFile)) {
  fail(`缺少 ${path.relative(root, runnerFile)}：先在本仓库跑 xl_build（core,typescript / ts）再 tsc -p tsconfig.json`);
}
const { SourceFileRunner } = require(runnerFile);
if (typeof SourceFileRunner?.Parse !== "function") fail(`${path.relative(root, runnerFile)} 没有 SourceFileRunner.Parse`);

let ts;
try {
  ts = require("typescript");
} catch {
  fail("本仓库 node_modules 里没有 typescript（Copy-Item -Recurse 主仓 node_modules 或 npm i）");
}

// ---------------------------------------------------------------- corpus

/** node_modules 下全部 *.d.ts，按字节数降序。 */
function listDts(dir) {
  const out = [];
  const walk = (abs) => {
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const child = path.join(abs, ent.name);
      if (ent.isDirectory()) walk(child);
      else if (ent.isFile() && ent.name.endsWith(".d.ts")) {
        const bytes = fs.statSync(child).size;
        out.push({ abs: child, rel: path.relative(root, child).replaceAll("\\", "/"), bytes });
      }
    }
  };
  walk(dir);
  out.sort((a, b) => b.bytes - a.bytes || a.rel.localeCompare(b.rel));
  return out;
}

const nm = path.join(root, "node_modules");
if (!fs.existsSync(nm)) fail("缺少 node_modules/（Copy-Item -Recurse 主仓 node_modules 进来）");

let corpus = listDts(nm);
if (opts.filter) corpus = corpus.filter((f) => f.rel.includes(opts.filter));
const decoded = { total: corpus.length, picked: 0, chars: 0, bytes: 0 };
const files = (opts.corpus ? corpus : corpus.slice(0, opts.top)).map((f) => {
  const text = fs.readFileSync(f.abs, "utf8");
  decoded.picked += 1;
  decoded.chars += text.length;
  decoded.bytes += f.bytes;
  return { ...f, name: path.basename(f.abs), text };
});
if (files.length === 0) fail("语料为空（node_modules 下没有 *.d.ts）");

// ---------------------------------------------------------------- measure

const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const now = () => process.hrtime.bigint();
const toMs = (from, to) => Number(to - from) / 1e6;

const impls = [
  {
    key: "ours",
    label: "ours",
    run: (file) => {
      const shape = SourceFileRunner.Parse(file.text, file.abs);
      if (!shape || !Array.isArray(shape.Data)) throw new Error("SourceFileRunner.Parse 未返回 shape 树");
    },
  },
  {
    key: "tsNoParents",
    label: "ts-np",
    run: (file) => {
      const sf = ts.createSourceFile(file.abs, file.text, ts.ScriptTarget.Latest, false);
      if (!sf || !Array.isArray(sf.statements)) throw new Error("createSourceFile 未返回 SourceFile");
    },
  },
  {
    key: "tsParents",
    label: "ts-parents",
    run: (file) => {
      const sf = ts.createSourceFile(file.abs, file.text, ts.ScriptTarget.Latest, true);
      if (!sf || !Array.isArray(sf.statements)) throw new Error("createSourceFile 未返回 SourceFile");
    },
  },
];
const implByKey = Object.fromEntries(impls.map((impl) => [impl.key, impl]));

// samples[fileIndex][implKey] = ms[]
const samples = files.map(() => ({ ours: [], tsNoParents: [], tsParents: [] }));
const failures = [];
const failuresSeen = new Set();

/** 跑一个实现一次；失败只记一次，后续跳过该文件。 */
function timeOnce(fileIndex, key) {
  const file = files[fileIndex];
  if (failuresSeen.has(`${fileIndex}:${key}`)) return;
  const impl = implByKey[key];
  const start = now();
  try {
    impl.run(file);
  } catch (error) {
    failuresSeen.add(`${fileIndex}:${key}`);
    failures.push({ file: file.rel, impl: key, error: String(error && error.message ? error.message : error) });
    return;
  }
  samples[fileIndex][key].push(toMs(start, now()));
}

// 预热：整份语料、三实现各一遍，不计时。
for (const [index] of files.entries()) {
  for (const impl of impls) {
    try {
      impl.run(files[index]);
    } catch (error) {
      failuresSeen.add(`${index}:${impl.key}`);
      failures.push({ file: files[index].rel, impl: impl.key, error: String(error && error.message ? error.message : error) });
    }
  }
}

// 计时：每轮三实现相邻测同一文件；轮间轮换顺序，避免"总是最后测的占便宜"。
const startedAt = new Date();
for (let round = 0; round < opts.repeat; round++) {
  for (const [index] of files.entries()) {
    for (let slot = 0; slot < impls.length; slot++) {
      const order = (round + slot) % impls.length;
      timeOnce(index, impls[order].key);
    }
  }
}
const elapsedMs = Date.now() - startedAt.getTime();

// ---------------------------------------------------------------- summarize

const usable = files.map((file, index) => ({
  file,
  index,
  ok: impls.every((impl) => samples[index][impl.key].length > 0),
}));

const skipped = usable.filter((entry) => !entry.ok).map((entry) => entry.file.rel);
const rows = [];
const total = { bytes: 0, chars: 0, ours: 0, tsNoParents: 0, tsParents: 0 };
for (const entry of usable) {
  if (!entry.ok) continue;
  const { file, index } = entry;
  const ms = {
    ours: median(samples[index].ours),
    tsNoParents: median(samples[index].tsNoParents),
    tsParents: median(samples[index].tsParents),
  };
  const kb = file.bytes / 1024;
  const row = {
    file: file.rel,
    bytes: file.bytes,
    chars: file.text.length,
    kb,
    ms,
    msPerKB: { ours: ms.ours / kb, tsNoParents: ms.tsNoParents / kb, tsParents: ms.tsParents / kb },
    ratio: { noParents: ms.ours / ms.tsNoParents, parents: ms.ours / ms.tsParents },
  };
  rows.push(row);
  total.bytes += file.bytes;
  total.chars += file.text.length;
  total.ours += ms.ours;
  total.tsNoParents += ms.tsNoParents;
  total.tsParents += ms.tsParents;
}

const git = (() => {
  const res = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  return res.status === 0 ? res.stdout.trim() : "unknown";
})();

const meta = {
  tool: "tests/bench/perf-vs-ts.mjs",
  mode: opts.corpus ? "corpus" : `top${opts.top}`,
  corpus: opts.corpus ? "node_modules/**/*.d.ts" : `top${opts.top} largest .d.ts under node_modules`,
  files: rows.length,
  skipped,
  bytes: total.bytes,
  chars: total.chars,
  warmup: opts.warmup,
  repeat: opts.repeat,
  startedAt: startedAt.toISOString(),
  measuredSeconds: elapsedMs / 1000,
  node: process.version,
  typescript: ts.version,
  platform: `${process.platform} ${process.arch}`,
  cpus: os.cpus().length,
  cpu: os.cpus()[0]?.model ?? "unknown",
  totalMemGB: Math.round((os.totalmem() / 2 ** 30) * 10) / 10,
  commit: git,
  method:
    "ours = SourceFileRunner.Parse (shape tree only, no AST projection); " +
    "ts-np = ts.createSourceFile(setParentNodes=false); ts-parents = ts.createSourceFile(setParentNodes=true). " +
    "Same process, three implementations adjacent per file, order rotated per round; warmup once then median of repeat rounds. " +
    "TOTAL = sum of per-file medians. Products differ (shape tree vs TS AST) so ratios are order-of-magnitude references only.",
};

const result = {
  meta,
  rows,
  failures,
  total: {
    oursMs: total.ours,
    tsNoParentsMs: total.tsNoParents,
    tsParentsMs: total.tsParents,
    oursMsPerKB: total.ours / (total.bytes / 1024),
    tsNoParentsMsPerKB: total.tsNoParents / (total.bytes / 1024),
    tsParentsMsPerKB: total.tsParents / (total.bytes / 1024),
    ratioNoParents: total.ours / total.tsNoParents,
    ratioParents: total.ours / total.tsParents,
    nsPerChar: {
      ours: (total.ours * 1e6) / total.chars,
      tsNoParents: (total.tsNoParents * 1e6) / total.chars,
      tsParents: (total.tsParents * 1e6) / total.chars,
    },
  },
};

// ---------------------------------------------------------------- print

const fixed = (value, digits) => value.toFixed(digits);
const fmt = (value, digits = 2) => {
  const text = fixed(value, digits);
  return Number(text) === 0 ? "0" : text;
};

function truncated(text, width) {
  if (text.length <= width) return text;
  const keep = width - 1;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${text.slice(0, head)}…${text.slice(text.length - tail)}`;
}

if (opts.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const nameWidth = Math.min(46, Math.max(20, ...rows.map((row) => row.file.length)));
  const columns = [
    ["file", nameWidth, "l"],
    ["KB", 8, "r"],
    ["ours ms", 9, "r"],
    ["ours ms/KB", 11, "r"],
    ["ts-np ms", 9, "r"],
    ["ts-np ms/KB", 12, "r"],
    ["x np", 7, "r"],
    ["ts-par ms", 10, "r"],
    ["ts-par ms/KB", 13, "r"],
    ["x par", 7, "r"],
  ];
  const pad = (text, width, align) => (align === "r" ? text.padStart(width) : text.padEnd(width));
  const line = (cells) => cells.map(([text, width, align]) => pad(text, width, align)).join("  ");

  console.log("perf-vs-ts — shape 树（SourceFileRunner.Parse）对照 TypeScript 解析器");
  console.log(
    `${meta.node} · typescript ${meta.typescript} · ${meta.platform} · ${meta.cpus} cores · ${meta.cpu} · ${meta.totalMemGB} GB`,
  );
  console.log(
    `语料 ${meta.mode}：${rows.length} 份 / ${fmt(meta.bytes / 1024, 0)} KB / ${fmt(meta.chars / 1e6, 2)} M 字符` +
      `${meta.skipped.length ? ` · 跳过 ${meta.skipped.length} 份（解析失败）` : ""}`,
  );
  console.log(
    `方法：同进程逐轮交替，warmup ${meta.warmup} + repeat ${meta.repeat}，每文件 median；TOTAL = 各文件 median 之和 · ${meta.startedAt}`,
  );
  console.log("口径：ours = shape 树（不含 AST 投影）；ts-np/ts-par = ts.createSourceFile(setParentNodes false/true)。");
  console.log("      两者产物不同，倍数只作量级参照，不是等价实现的比值。");
  console.log("");
  console.log(line(columns.map(([name, width, align]) => [name, width, align])));
  console.log(line(columns.map(([, width]) => ["-".repeat(width), width, "l"])));
  for (const row of rows) {
    console.log(
      line([
        [truncated(row.file, nameWidth), nameWidth, "l"],
        [fmt(row.kb, 0), 8, "r"],
        [fmt(row.ms.ours), 9, "r"],
        [fmt(row.msPerKB.ours, 3), 11, "r"],
        [fmt(row.ms.tsNoParents), 9, "r"],
        [fmt(row.msPerKB.tsNoParents, 3), 12, "r"],
        [`${fmt(row.ratio.noParents)}x`, 7, "r"],
        [fmt(row.ms.tsParents, 2), 10, "r"],
        [fmt(row.msPerKB.tsParents, 3), 13, "r"],
        [`${fmt(row.ratio.parents)}x`, 7, "r"],
      ]),
    );
  }
  console.log(line(columns.map(([, width]) => ["-".repeat(width), width, "l"])));
  console.log(
    line([
      ["TOTAL", nameWidth, "l"],
      [fmt(total.bytes / 1024, 0), 8, "r"],
      [fmt(total.ours), 9, "r"],
      [fmt(result.total.oursMsPerKB, 3), 11, "r"],
      [fmt(total.tsNoParents), 9, "r"],
      [fmt(result.total.tsNoParentsMsPerKB, 3), 12, "r"],
      [`${fmt(result.total.ratioNoParents)}x`, 7, "r"],
      [fmt(total.tsParents), 10, "r"],
      [fmt(result.total.tsParentsMsPerKB, 3), 13, "r"],
      [`${fmt(result.total.ratioParents)}x`, 7, "r"],
    ]),
  );
  console.log("");
  console.log(
    `倍数：ours/ts-np = ${fmt(result.total.ratioNoParents)}x · ours/ts-par = ${fmt(result.total.ratioParents)}x`,
  );
  console.log(
    `每字符：ours ${fmt(result.total.nsPerChar.ours)} ns · ts-np ${fmt(result.total.nsPerChar.tsNoParents)} ns · ` +
      `ts-par ${fmt(result.total.nsPerChar.tsParents)} ns`,
  );
  console.log(`耗时 ${fmt(elapsedMs / 1000, 1)} s（含预热与全部重复）；commit ${meta.commit}`);
  if (failures.length) {
    console.log("");
    console.log(`失败 ${failures.length} 次（这些文件不进 TOTAL）：`);
    for (const item of failures.slice(0, 10)) console.log(`  ${item.file} [${item.impl}] ${item.error}`);
  }
}
