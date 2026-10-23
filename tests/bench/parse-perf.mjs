// parse 性能基准：三类输入，全部走 `SourceFileRunner.Parse(text, filePath)`。
//
//   node tests/bench/parse-perf.mjs                     # 三类全跑（默认档位）
//   node tests/bench/parse-perf.mjs --dts               # 真实语料：lib 下最大的若干 *.d.ts
//   node tests/bench/parse-perf.mjs --single 500,1000,2000,4000
//   node tests/bench/parse-perf.mjs --multi 200,500,1000
//   node tests/bench/parse-perf.mjs --repeat 5 --json   # 机器可读
//
// 口径（与 SHAPE-CACHE-WORKFLOW.md §5 一致）：
//   1) --dts   真实语料：node_modules/typescript/lib 下最大的 6~10 份 *.d.ts（必含 es5 / dom /
//              es2015.core / es2015.symbol.wellknown），逐份 parse，各重复 R 次取中位，报每份中位与合计中位。
//   2) --single 合成单成员：`interface I { a: A | A | ... | A; }`，类型 token 数 N 逐档。
//              这是 IMPORTANCE §3.4 微基准的同一形态（长类型 / 长候选链）。
//   3) --multi 合成多成员：一个 interface 里 n 个简单成员 `a0: number; a1: number; ...`，逐档。
//
// 确定性：不使用随机数，不写任何文件（除 stdout），不读网络；同样的输入与档位给出同样的源文本。
// 源文本入口：见 typescript/run/source-file-runner.xl.md —— 静态 Parse(text, filePath)，一次一实例、无跨次状态。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));

const DEFAULTS = {
  dts: 8,
  single: [500, 1000, 2000, 4000],
  multi: [200, 500, 1000],
  repeat: 3,
  warmup: 1,
};

const DTS_REQUIRED = [
  "lib.es5.d.ts",
  "lib.dom.d.ts",
  "lib.es2015.core.d.ts",
  "lib.es2015.symbol.wellknown.d.ts",
];

function usage() {
  return [
    "用法: node tests/bench/parse-perf.mjs [--dts [N]] [--single N,N,...] [--multi N,N,...] [--repeat R] [--warmup W] [--json]",
    "",
    "  --dts [N]     真实语料档：lib 下最大的 N 份 *.d.ts（默认 8，范围 6~10）",
    "  --single ...  合成单成员档的 token 数列表（默认 500,1000,2000,4000）",
    "  --multi ...   合成多成员档的成员数列表（默认 200,500,1000）",
    `  --repeat R    每档重复次数，取中位（默认 ${DEFAULTS.repeat}）`,
    `  --warmup W    每档计时前的预热次数（默认 ${DEFAULTS.warmup}，可为 0）`,
    "  --json        输出机器可读 JSON（不写文件）",
    "",
    "不带任何档位参数时三类全跑。",
  ].join("\n");
}

function parseSizes(text) {
  const list = text.split(",").map((item) => Number(item.trim())).filter((n) => Number.isFinite(n));
  if (list.length === 0 || list.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new Error(`档位列表非法: ${text}`);
  }
  return list;
}

function parseIntArg(text, fallback) {
  const n = Number(text);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) throw new Error(`整数参数非法: ${text}`);
  return n;
}

const argv = process.argv.slice(2);
const opts = {
  modes: { dts: false, single: false, multi: false },
  dtsCount: DEFAULTS.dts,
  single: DEFAULTS.single.slice(),
  multi: DEFAULTS.multi.slice(),
  repeat: DEFAULTS.repeat,
  warmup: DEFAULTS.warmup,
  json: false,
};

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--help" || arg === "-h") {
    console.log(usage());
    process.exit(0);
  } else if (arg === "--json") {
    opts.json = true;
  } else if (arg === "--dts") {
    opts.modes.dts = true;
    const next = argv[i + 1];
    if (next !== undefined && /^\d+$/.test(next)) {
      opts.dtsCount = Math.min(10, Math.max(6, parseIntArg(next, DEFAULTS.dts)));
      i++;
    }
  } else if (arg === "--single") {
    opts.modes.single = true;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) throw new Error("--single 需要一个列表，例如 --single 500,1000");
    opts.single = parseSizes(next);
    i++;
  } else if (arg === "--multi") {
    opts.modes.multi = true;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) throw new Error("--multi 需要一个列表，例如 --multi 200,500");
    opts.multi = parseSizes(next);
    i++;
  } else if (arg === "--repeat") {
    if (argv[i + 1] === undefined) throw new Error("--repeat 需要一个整数");
    opts.repeat = parseIntArg(argv[i + 1], DEFAULTS.repeat);
    if (opts.repeat < 1) throw new Error("--repeat 至少为 1");
    i++;
  } else if (arg === "--warmup") {
    if (argv[i + 1] === undefined) throw new Error("--warmup 需要一个整数");
    opts.warmup = parseIntArg(argv[i + 1], DEFAULTS.warmup);
    i++;
  } else {
    console.error(`未知参数: ${arg}\n\n${usage()}`);
    process.exit(2);
  }
}

if (!opts.modes.dts && !opts.modes.single && !opts.modes.multi) {
  opts.modes.dts = opts.modes.single = opts.modes.multi = true;
}

const round = (value, digits = 3) => Number(value.toFixed(digits));
const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// 一次真实 parse，并确认确实产出了形状树（防止空跑被当成"很快"）。
function parseOnce(text, fileName) {
  const start = process.hrtime.bigint();
  const shape = SourceFileRunner.Parse(text, fileName);
  const end = process.hrtime.bigint();
  if (!shape || !Array.isArray(shape.Data)) {
    throw new Error(`${fileName}: Parse 未返回带 Data 数组的 SourceFileShape`);
  }
  return { ms: Number(end - start) / 1e6, statements: shape.Data.length };
}

// 一档：warmup 次预热后，repeat 次计时，取中位；samples 一并保留以便看波动。
function measure(label, text, fileName, unitCount, unitName) {
  let warmupMs = 0;
  for (let i = 0; i < opts.warmup; i++) warmupMs += parseOnce(text, fileName).ms;
  const samples = [];
  let statements = 0;
  for (let i = 0; i < opts.repeat; i++) {
    const result = parseOnce(text, fileName);
    samples.push(result.ms);
    statements = result.statements;
  }
  const medianMs = median(samples);
  return {
    label,
    bytes: Buffer.byteLength(text, "utf8"),
    unitCount,
    unitName,
    statements,
    warmupMs: round(warmupMs),
    samplesMs: samples.map((ms) => round(ms)),
    medianMs: round(medianMs),
    perUnitUs: round((medianMs * 1000) / unitCount),
  };
}

// ---- 档 1：真实 .d.ts ----
function collectDtsFiles() {
  const libDir = path.join(root, "node_modules", "typescript", "lib");
  if (!fs.existsSync(libDir)) throw new Error(`找不到 ${libDir}（先安装 node_modules）`);
  const all = fs
    .readdirSync(libDir)
    .filter((name) => name.endsWith(".d.ts"))
    .map((name) => {
      const full = path.join(libDir, name);
      return { name, full, size: fs.statSync(full).size };
    });
  const byName = new Map(all.map((entry) => [entry.name, entry]));
  for (const required of DTS_REQUIRED) {
    if (!byName.has(required)) throw new Error(`缺少必需语料 ${required}`);
  }
  const chosen = new Map();
  for (const required of DTS_REQUIRED) chosen.set(required, byName.get(required));
  const rest = all
    .filter((entry) => !chosen.has(entry.name))
    .sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
  for (const entry of rest) {
    if (chosen.size >= opts.dtsCount) break;
    chosen.set(entry.name, entry);
  }
  // 固定顺序：按体积降序、同体积按名字，保证重复运行顺序一致。
  return [...chosen.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
}

function runDts() {
  const files = collectDtsFiles();
  const rows = [];
  for (const file of files) {
    const text = fs.readFileSync(file.full, "utf8");
    rows.push({ file: file.name, ...measure(file.name, text, file.name, text.length, "chars") });
  }
  const totalMedianMs = round(rows.reduce((sum, row) => sum + row.medianMs, 0));
  const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
  return { count: rows.length, totalBytes, totalMedianMs, files: rows };
}

// ---- 档 2：合成单成员（长类型 token 链）----
function singleSource(tokens) {
  const type = new Array(tokens).fill("A").join(" | ");
  return `interface I { a: ${type}; }\n`;
}

// ---- 档 3：合成多成员 ----
function multiSource(members) {
  const lines = [];
  for (let i = 0; i < members; i++) lines.push(`  a${i}: number;`);
  return `interface I {\n${lines.join("\n")}\n}\n`;
}

const report = { repeat: opts.repeat, warmup: opts.warmup, node: process.version, modes: {} };
const human = [];
human.push(`node ${process.version}  repeat=${opts.repeat} warmup=${opts.warmup}`);

try {
  if (opts.modes.dts) {
    const started = process.hrtime.bigint();
    const dts = runDts();
    const wallMs = round(Number(process.hrtime.bigint() - started) / 1e6);
    report.modes.dts = dts;
    human.push("");
    human.push(`## dts（${dts.count} 份，合计 ${dts.totalBytes} B，repeat=${opts.repeat}，墙钟 ${wallMs} ms）`);
    for (const row of dts.files) {
      human.push(
        `  ${row.file.padEnd(34)} ${String(row.bytes).padStart(8)} B  stmts=${String(row.statements).padStart(5)}  ` +
          `median ${String(row.medianMs).padStart(9)} ms  samples=[${row.samplesMs.join(", ")}]`,
      );
    }
    human.push(`  TOTAL median ${dts.totalMedianMs} ms`);
  }

  if (opts.modes.single) {
    const rows = [];
    for (const tokens of opts.single) {
      const text = singleSource(tokens);
      const row = measure(`single-${tokens}`, text, `synthetic-single-${tokens}.ts`, tokens, "tokens");
      row.scaleVsPrev = null;
      rows.push(row);
    }
    for (let i = 1; i < rows.length; i++) {
      rows[i].scaleVsPrev = round(rows[i].medianMs / rows[i - 1].medianMs, 2);
    }
    report.modes.single = { cases: rows };
    human.push("");
    human.push(`## single（一个 interface、一个成员，类型 token 数逐档）`);
    for (const row of rows) {
      const scale = row.scaleVsPrev === null ? "" : `  x${row.scaleVsPrev} vs 上一档`;
      human.push(
        `  N=${String(row.unitCount).padStart(5)}  bytes=${String(row.bytes).padStart(7)}  ` +
          `median ${String(row.medianMs).padStart(9)} ms  ${String(row.perUnitUs).padStart(7)} µs/token  ` +
          `samples=[${row.samplesMs.join(", ")}]${scale}`,
      );
    }
  }

  if (opts.modes.multi) {
    const rows = [];
    for (const members of opts.multi) {
      const text = multiSource(members);
      const row = measure(`multi-${members}`, text, `synthetic-multi-${members}.ts`, members, "members");
      row.scaleVsPrev = null;
      rows.push(row);
    }
    for (let i = 1; i < rows.length; i++) {
      rows[i].scaleVsPrev = round(rows[i].medianMs / rows[i - 1].medianMs, 2);
    }
    report.modes.multi = { cases: rows };
    human.push("");
    human.push(`## multi（一个 interface、n 个简单成员）`);
    for (const row of rows) {
      const scale = row.scaleVsPrev === null ? "" : `  x${row.scaleVsPrev} vs 上一档`;
      human.push(
        `  n=${String(row.unitCount).padStart(5)}  bytes=${String(row.bytes).padStart(7)}  ` +
          `median ${String(row.medianMs).padStart(9)} ms  ${String(row.perUnitUs).padStart(7)} µs/member  ` +
          `samples=[${row.samplesMs.join(", ")}]${scale}`,
      );
    }
  }
} catch (error) {
  // 解析失败抛的是 `SyntaxException`（不是 JS Error：文本在 `Message` 字段上），
  // 旧的一行只读 `error.message`，于是门禁上只看到 `bench 失败: [object Object]`——
  // 解析器未适配时这条读数就没法用。这里只改「怎么打印」，测量与退出码不变。
  const text = error && typeof error === "object" ? error.message ?? error.Message ?? error : error;
  console.error(`bench 失败: ${text}`);
  const inner = error && typeof error === "object" ? error.InnerException : null;
  if (inner) console.error(`  inner: ${inner.Message ?? inner.message ?? inner}`);
  process.exit(1);
}

if (opts.json) console.log(JSON.stringify(report, null, 2));
else console.log(human.join("\n"));
