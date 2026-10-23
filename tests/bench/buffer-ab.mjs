// buffer 改造性能验收：基线 build 与实验 build 的 **同进程** A/B 基准。
//
// 目的：BUFFER-CORE CONTRACT §0.5 —— 同机同会话、同进程交替，比较两版 build 的
// `SourceFileRunner.Parse`。验收要求 TOTAL 中位 ≥20% 提升（即实验版明显更快）。
//
// 口径：
//   - 语料：node_modules/typescript/lib 下最大的 N 份 *.d.ts（默认 8；必需 4 份固定入选），
//     与 tests/bench/parse-perf.mjs --dts 选同一批文件、同一顺序（体积降序、同体积按名字）。
//   - 每轮对每个文件：A、B 各 parse 一次并计时；相邻轮交换先后顺序（奇偶轮 A→B / B→A），
//     抵消「后跑更熟/更冷」的顺序偏置。
//   - warmup 轮先各跑一遍（不计数）。R 轮（默认 5）后，逐文件取中位数，TOTAL = 逐文件中位之和；
//     另报「每轮合计的中位」，用于看稳定性。
//   - 同一进程内分别 require 两个 build 目录的 source-file-runner.js：两棵模块树互不共享，
//     这才是「同机同会话」；跨进程跑会把 JIT/页缓存差异算到改造头上。
//
// 用法：
//   node tests/bench/buffer-ab.mjs                                 # base=build-base new=build，5 轮
//   node tests/bench/buffer-ab.mjs --repeat 7 --dts 8
//   node tests/bench/buffer-ab.mjs --base build-base --new build-exp
//   node tests/bench/buffer-ab.mjs --min-improve 20                # TOTAL 不达 20% 则退出码 1
//   node tests/bench/buffer-ab.mjs --json                          # 机器可读
//
// 说明：--base 默认 build-base，是「基线 build 目录复制保留」的约定位置（.gitignore 忽略）。
// 从 verify/buffer-baseline 分支重新生成基线产物的方法见 docs/buffer-baseline.md。
//
// 退出码：0 = 正常跑完（或达到 --min-improve）；1 = 运行失败/未达门槛；2 = 用法错误。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const DTS_REQUIRED = [
  "lib.es5.d.ts",
  "lib.dom.d.ts",
  "lib.es2015.core.d.ts",
  "lib.es2015.symbol.wellknown.d.ts",
];

const DEFAULTS = {
  base: "build-base",
  new: "build",
  dts: 8,
  repeat: 5,
  warmup: 1,
  minImprove: null,
  json: false,
};

function usage() {
  return [
    "用法: node tests/bench/buffer-ab.mjs [--base <dir>] [--new <dir>] [--dts N] [--repeat R]",
    "                                     [--warmup W] [--min-improve <pct>] [--json]",
    "",
    `  --base <dir>     基线 build 目录，默认 ${DEFAULTS.base}（含 ts/typescript/run/source-file-runner.js）`,
    `  --new <dir>      实验 build 目录，默认 ${DEFAULTS.new}`,
    `  --dts <N>        lib 下最大 N 份 *.d.ts，默认 ${DEFAULTS.dts}（范围 6~10，与 parse-perf 一致）`,
    `  --repeat <R>     计时轮数，逐文件取中位，默认 ${DEFAULTS.repeat}（至少 1）`,
    `  --warmup <W>     预热轮数，默认 ${DEFAULTS.warmup}`,
    "  --min-improve P  TOTAL 提升百分比低于 P 时退出码 1（验收用，例如 --min-improve 20）",
    "  --json           追加机器可读 JSON",
    "",
    "提升 % = (基线中位 - 实验中位) / 基线中位 × 100，正数 = 实验版更快。",
  ].join("\n");
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const need = (name) => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${name} 需要一个值`);
      i++;
      return value;
    };
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (arg === "--base") {
      opts.base = need("--base");
    } else if (arg === "--new") {
      opts.new = need("--new");
    } else if (arg === "--dts") {
      const n = Number(need("--dts"));
      if (!Number.isInteger(n) || n < 1) throw new Error("--dts 需要正整数");
      opts.dts = Math.min(10, Math.max(6, n));
    } else if (arg === "--repeat") {
      const n = Number(need("--repeat"));
      if (!Number.isInteger(n) || n < 1) throw new Error("--repeat 需要正整数");
      opts.repeat = n;
    } else if (arg === "--warmup") {
      const n = Number(need("--warmup"));
      if (!Number.isInteger(n) || n < 0) throw new Error("--warmup 需要非负整数");
      opts.warmup = n;
    } else if (arg === "--min-improve") {
      const n = Number(need("--min-improve"));
      if (!Number.isFinite(n)) throw new Error("--min-improve 需要数字");
      opts.minImprove = n;
    } else if (arg === "--json") {
      opts.json = true;
    } else {
      console.error(`未知参数: ${arg}\n\n${usage()}`);
      process.exit(2);
    }
  }
  return opts;
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`参数错误: ${error.message}`);
  console.error(usage());
  process.exit(2);
}

function loadRunner(dir, label) {
  const full = path.resolve(root, dir);
  const entry = path.join(full, "ts", "typescript", "run", "source-file-runner.js");
  if (!fs.existsSync(entry)) {
    throw new Error(
      `找不到 ${label} build: ${entry}\n` +
        "  （基线可从 verify/buffer-baseline 分支构建后复制为 build-base，见 docs/buffer-baseline.md）",
    );
  }
  const mod = require(entry);
  const runner = mod && mod.SourceFileRunner;
  if (!runner || typeof runner.Parse !== "function") {
    throw new Error(`${label} build 的 SourceFileRunner.Parse 不可用: ${entry}`);
  }
  return { dir: full, runner };
}

function collectDts(count) {
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
    if (chosen.size >= count) break;
    chosen.set(entry.name, entry);
  }
  return [...chosen.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
}

const round = (value, digits = 1) => Number(value.toFixed(digits));
const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

let baseMod;
let newMod;
let files;
let texts;
try {
  baseMod = loadRunner(opts.base, "基线");
  newMod = loadRunner(opts.new, "实验");
  if (baseMod.dir === newMod.dir) {
    throw new Error(`--base 与 --new 指向同一目录（${baseMod.dir}），A/B 无意义`);
  }
  files = collectDts(opts.dts);
  texts = files.map((file) => fs.readFileSync(file.full, "utf8"));
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

function timeParse(runner, text, name) {
  const start = process.hrtime.bigint();
  const shape = runner.Parse(text, name);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  if (!shape || !Array.isArray(shape.Data)) {
    throw new Error(`${name}: Parse 未返回带 Data 数组的 SourceFileShape（空跑不能算很快）`);
  }
  return ms;
}

function parseAll(runner) {
  return files.map((file, i) => timeParse(runner, texts[i], file.name));
}

// warmup 轮（不计数，两版各预热一遍）。
try {
  for (let w = 0; w < opts.warmup; w++) {
    parseAll(baseMod.runner);
    parseAll(newMod.runner);
  }
} catch (error) {
  console.error(`预热阶段失败: ${error.message}`);
  process.exit(1);
}

const samples = { base: files.map(() => []), new: files.map(() => []) };
const roundTotals = { base: [], new: [] };

try {
  for (let r = 0; r < opts.repeat; r++) {
    // 奇偶轮交换先后顺序，抵消顺序偏置。
    const order = r % 2 === 0 ? ["base", "new"] : ["new", "base"];
    const runnerOf = { base: baseMod.runner, new: newMod.runner };
    const sums = { base: 0, new: 0 };
    for (let i = 0; i < files.length; i++) {
      for (const side of order) {
        const ms = timeParse(runnerOf[side], texts[i], files[i].name);
        samples[side][i].push(ms);
        sums[side] += ms;
      }
    }
    roundTotals.base.push(sums.base);
    roundTotals.new.push(sums.new);
  }
} catch (error) {
  console.error(`计时阶段失败: ${error.message}`);
  process.exit(1);
}

const rows = files.map((file, i) => {
  const baseMed = median(samples.base[i]);
  const newMed = median(samples.new[i]);
  const delta = newMed - baseMed;
  const improvePct = baseMed === 0 ? 0 : ((baseMed - newMed) / baseMed) * 100;
  return {
    file: file.name,
    bytes: Buffer.byteLength(texts[i], "utf8"),
    baseMs: baseMed,
    newMs: newMed,
    deltaMs: delta,
    improvePct,
    baseSamples: samples.base[i],
    newSamples: samples.new[i],
  };
});

const totalBase = rows.reduce((sum, row) => sum + row.baseMs, 0);
const totalNew = rows.reduce((sum, row) => sum + row.newMs, 0);
const totalDelta = totalNew - totalBase;
const totalImprovePct = totalBase === 0 ? 0 : ((totalBase - totalNew) / totalBase) * 100;
const totalBaseMedianOfRounds = median(roundTotals.base);
const totalNewMedianOfRounds = median(roundTotals.new);
const roundImprovePct =
  totalBaseMedianOfRounds === 0 ? 0 : ((totalBaseMedianOfRounds - totalNewMedianOfRounds) / totalBaseMedianOfRounds) * 100;

const pad = (value, width) => String(value).padStart(width);
const lines = [];
lines.push(
  `node ${process.version}  dts=${files.length}  repeat=${opts.repeat}  warmup=${opts.warmup}  顺序每轮交替`,
);
lines.push(
  `基线 ${path.relative(root, baseMod.dir).split(path.sep).join("/")}  vs  实验 ${path.relative(root, newMod.dir).split(path.sep).join("/")}`,
);
lines.push("");
lines.push(
  `${"文件".padEnd(34)} ${pad("bytes", 9)} ${pad("基线中位", 12)} ${pad("实验中位", 12)} ${pad("Δms", 10)} ${pad("提升%", 9)}`,
);
for (const row of rows) {
  lines.push(
    `${row.file.padEnd(34)} ${pad(row.bytes, 9)} ${pad(round(row.baseMs, 3), 12)} ${pad(round(row.newMs, 3), 12)} ` +
      `${pad(round(row.deltaMs, 3), 10)} ${pad(round(row.improvePct, 2), 9)}`,
  );
}
lines.push("");
lines.push(
  `TOTAL（逐文件中位之和）            ${pad(round(totalBase, 3), 12)} ${pad(round(totalNew, 3), 12)} ` +
    `${pad(round(totalDelta, 3), 10)} ${pad(round(totalImprovePct, 2), 9)}`,
);
lines.push(
  `TOTAL（每轮合计的中位）            ${pad(round(totalBaseMedianOfRounds, 3), 12)} ` +
    `${pad(round(totalNewMedianOfRounds, 3), 12)} ${pad(round(totalNewMedianOfRounds - totalBaseMedianOfRounds, 3), 10)} ` +
    `${pad(round(roundImprovePct, 2), 9)}`,
);
lines.push(
  `每轮合计样本 基线 [${roundTotals.base.map((ms) => round(ms, 1)).join(", ")}]  实验 [${roundTotals.new.map((ms) => round(ms, 1)).join(", ")}]`,
);
lines.push(
  `稳定性：逐文件中位之和 vs 每轮合计中位，基线差 ${round(Math.abs(totalBase - totalBaseMedianOfRounds), 1)} ms、` +
    `实验差 ${round(Math.abs(totalNew - totalNewMedianOfRounds), 1)} ms`,
);

console.log(lines.join("\n"));

if (opts.json) {
  console.log(
    JSON.stringify(
      {
        node: process.version,
        dts: files.length,
        repeat: opts.repeat,
        warmup: opts.warmup,
        base: path.relative(root, baseMod.dir).split(path.sep).join("/"),
        new: path.relative(root, newMod.dir).split(path.sep).join("/"),
        rows: rows.map((row) => ({
          file: row.file,
          bytes: row.bytes,
          baseMs: round(row.baseMs, 3),
          newMs: round(row.newMs, 3),
          improvePct: round(row.improvePct, 2),
          baseSamples: row.baseSamples.map((ms) => round(ms, 3)),
          newSamples: row.newSamples.map((ms) => round(ms, 3)),
        })),
        total: {
          baseMs: round(totalBase, 3),
          newMs: round(totalNew, 3),
          improvePct: round(totalImprovePct, 2),
          baseRoundsMedianMs: round(totalBaseMedianOfRounds, 3),
          newRoundsMedianMs: round(totalNewMedianOfRounds, 3),
          roundsImprovePct: round(roundImprovePct, 2),
        },
      },
      null,
      2,
    ),
  );
}

if (opts.minImprove !== null) {
  if (totalImprovePct < opts.minImprove) {
    console.error(`\n不达标：TOTAL 提升 ${round(totalImprovePct, 2)}% < ${opts.minImprove}%`);
    process.exitCode = 1;
  } else {
    console.log(`\n达标：TOTAL 提升 ${round(totalImprovePct, 2)}% >= ${opts.minImprove}%`);
  }
}
