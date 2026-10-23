// buffer 窗口大小扫描：8 / 16 / 32 / 64 / 128（可加 256）对解析耗时的影响，
// 同时校验「窗口大小不改变语义」—— 同进程、同语料、逐轮交替所有 size。
//
// 背景：SyntaxContext 一次处理一个窗口 [Index, Index+BufferSize)，默认 BufferSize=32。
// SourceFileRunner.Parse 把 32 写死，所以这里按 runner 的装配手工构造：
//   const template = TypescriptTemplate.Create();
//   const root = new SourceFileShape(template);
//   const context = new SyntaxContext(root, size);
//   context.Process(new TextDocument(text, filePath));
// 与 Parse 唯一的差别就是那个 bufferSize —— 因此任何耗时差异都只能来自窗口大小。
//
// 口径（测量纪律）：
//   - **同进程**跑完所有 size：跨进程会把 JIT / 页缓存差异算到 size 头上。
//   - 每轮内对每个文件**交替**所有 size，顺序按 (轮次 + 文件序号) 轮转、奇数轮整体反向，
//     抵消「越跑越热」的位置偏置。
//   - warmup 轮（默认 1）不计时；repeat 轮（默认 5）后按 **文件 × size 取中位数**，
//     TOTAL = 各文件中位数之和（与 tests/bench/buffer-ab.mjs 同口径）。
//   - 单次差异 < 3% 视为噪声（报告里明确标出哪些 size 落在 3% 带内）。
//   - 计时只用 process.hrtime.bigint() 包住一次 parse，不挂 profiler。
//   - XML 逐字节等价：每个文件 × 每个 size 解析一次，Root.ToString() 转 UTF-8 字节，
//     与 size=32 的字节流逐字节比较（不计时，单独一遍）。
//
// 语料：
//   - 默认：tests/cases/**/*.ts + samples/**/*.ts + node_modules/typescript/lib 下
//     最大的 --dts 份 *.d.ts（默认 8，必需 4 份固定入选，与 parse-perf / buffer-ab 同一批）。
//     typescript/cases 默认不进：那里是模板化用例（行内 `\n` 是待还原的转义文本），
//     直接喂 parser 会抛错，只有 9/53 可解析，不适合当计时语料。
//   - --corpus <a,b|dirs>  替换仓库语料（可多次、可传目录或文件）；--dts 0 关掉 d.ts 档。
//   - --single N / --multi N  合成档：
//       --single N  一行 N 个字符的长表达式（`const v = 1 + 2 + ... + k;`）
//       --multi  N  N 行短语句（每行 `const vI = I + I1;`），看「多行短语句」下的窗口效应
//
// 用法：
//   node tests/bench/buffer-size-sweep.mjs
//   node tests/bench/buffer-size-sweep.mjs --sizes 8,16,32,64,128,256 --repeat 7
//   node tests/bench/buffer-size-sweep.mjs --dts 4 --files
//   node tests/bench/buffer-size-sweep.mjs --corpus tests/cases --dts 0 --repeat 3
//   node tests/bench/buffer-size-sweep.mjs --single 2000 --multi 1000
//   node tests/bench/buffer-size-sweep.mjs --json
//
// 退出码：0 = 跑完且所有 size 的 XML 逐字节等价；1 = 存在不等价/解析不一致；2 = 用法错误。
import fs from "node:fs";
import os from "node:os";
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

const REFERENCE_SIZE = 32;

const DEFAULTS = {
  sizes: "8,16,32,64,128",
  dts: 8,
  repeat: 5,
  warmup: 1,
  corpus: [],
  single: 0,
  multi: 0,
  files: false,
  json: false,
  jsonRows: false,
};

function usage() {
  return [
    "用法: node tests/bench/buffer-size-sweep.mjs [--sizes 8,16,32,64,128[,256]] [--dts N]",
    "                                            [--corpus <路径>]... [--repeat R] [--warmup W]",
    "                                            [--single N] [--multi N] [--files] [--json]",
    "",
    `  --sizes <list>   逗号分隔的窗口大小，默认 ${DEFAULTS.sizes}（32 恒为参照，缺了会补上）`,
    `  --dts <N>        lib 下最大的 N 份 *.d.ts，默认 ${DEFAULTS.dts}；0 = 不跑 d.ts 档`,
    "  --corpus <路径>  替换默认仓库语料（tests/cases + samples）；可重复，目录递归收 *.ts",
    `  --repeat <R>     计时轮数，逐文件取中位数，默认 ${DEFAULTS.repeat}（至少 2）`,
    `  --warmup <W>     预热轮数，默认 ${DEFAULTS.warmup}`,
    "  --single <N>     追加一个合成档：一行 N 个字符的长表达式",
    "  --multi <N>      追加一个合成档：N 行短语句",
    "  --files          额外打印逐文件明细表",
    "  --json           末尾追加一段机器可读 JSON（不含逐文件行，见 --json-rows）",
    "  --json-rows      JSON 里也带上逐文件中位数（4500 个语料文件时很大）",
    "",
    `Δ% = (TOTAL(size) - TOTAL(${REFERENCE_SIZE})) / TOTAL(${REFERENCE_SIZE}) × 100，正数 = 更慢。`,
    "单次差异 < 3% 视为噪声；报告会标出落在 3% 带内的 size。",
  ].join("\n");
}

function parseArgs(argv) {
  // sizes 在 DEFAULTS 里写成字符串（usage 直接用），这里先拆成数字数组。
  const opts = { ...DEFAULTS, sizes: DEFAULTS.sizes.split(",").map(Number), corpus: [] };
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
    } else if (arg === "--sizes") {
      const list = need("--sizes")
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .map(Number);
      if (list.length === 0 || list.some((n) => !Number.isInteger(n) || n < 1)) {
        throw new Error("--sizes 需要逗号分隔的正整数");
      }
      opts.sizes = list;
    } else if (arg === "--dts") {
      const n = Number(need("--dts"));
      if (!Number.isInteger(n) || n < 0) throw new Error("--dts 需要非负整数");
      opts.dts = n;
    } else if (arg === "--corpus") {
      opts.corpus.push(need("--corpus"));
    } else if (arg === "--repeat") {
      const n = Number(need("--repeat"));
      if (!Number.isInteger(n) || n < 2) throw new Error("--repeat 至少 2（中位数才有意义）");
      opts.repeat = n;
    } else if (arg === "--warmup") {
      const n = Number(need("--warmup"));
      if (!Number.isInteger(n) || n < 0) throw new Error("--warmup 需要非负整数");
      opts.warmup = n;
    } else if (arg === "--single") {
      const n = Number(need("--single"));
      if (!Number.isInteger(n) || n < 10) throw new Error("--single 需要 >= 10 的整数");
      opts.single = n;
    } else if (arg === "--multi") {
      const n = Number(need("--multi"));
      if (!Number.isInteger(n) || n < 1) throw new Error("--multi 需要正整数");
      opts.multi = n;
    } else if (arg === "--files") {
      opts.files = true;
    } else if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--json-rows") {
      opts.jsonRows = true;
    } else {
      console.error(`未知参数: ${arg}\n\n${usage()}`);
      process.exit(2);
    }
  }
  // 32 是报告的参照点，永远在测量集合里。
  if (!opts.sizes.includes(REFERENCE_SIZE)) opts.sizes.push(REFERENCE_SIZE);
  opts.sizes = [...new Set(opts.sizes)].sort((a, b) => a - b);
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

// ---- 装配：按 SourceFileRunner.Parse 的手工版，只多一个 size ----
const buildDir = path.join(root, "build", "ts");
function loadBuild() {
  const entry = path.join(buildDir, "typescript", "run", "source-file-runner.js");
  if (!fs.existsSync(entry)) {
    throw new Error(
      `找不到 build: ${entry}\n  先跑 xl_build（cwd=仓库根，paths ["core","typescript"]，targets ["ts"]）` +
        " 再跑 node_modules\\.bin\\tsc.cmd -p tsconfig.json",
    );
  }
  const req = (rel) => require(path.join(buildDir, rel));
  const mods = {
    TypescriptTemplate: req("typescript/run/typescript-template").TypescriptTemplate,
    SourceFileShape: req("typescript/tokens/files/source-file-shape").SourceFileShape,
    SyntaxContext: req("core/syntax/syntax-context").SyntaxContext,
    TextDocument: req("typescript/run/text-document").TextDocument,
  };
  for (const [name, value] of Object.entries(mods)) {
    if (typeof value !== "function") throw new Error(`build 里缺 ${name}: ${buildDir}`);
  }
  return mods;
}

let mods;
try {
  mods = loadBuild();
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

function parseWithSize(text, name, size) {
  const template = mods.TypescriptTemplate.Create();
  const shape = new mods.SourceFileShape(template);
  const context = new mods.SyntaxContext(shape, size);
  context.Process(new mods.TextDocument(text, name));
  return shape;
}

// ---- 语料 ----
function walkTs(dir, out) {
  if (!fs.existsSync(dir)) return;
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
}

function collectDts(count) {
  if (count <= 0) return [];
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
  // 与 parse-perf / buffer-ab 同序：体积降序、同体积按名字。
  return [...chosen.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
}

// 合成档：--single 建一行 N 字符的长表达式，--multi 建 N 行短语句。
// 两者都只由合法 ts 组成，parse 不该抛错；命名带 <synthetic:...> 前缀便于在表里认出来。
function syntheticCorpus() {
  const items = [];
  if (opts.single > 0) {
    const target = opts.single;
    const parts = ["const v = 1"];
    let length = "const v = 1".length;
    let next = 2;
    while (length + " + 2".length + 1 <= target) {
      const piece = ` + ${next}`;
      parts.push(piece);
      length += piece.length;
      next++;
    }
    const text = parts.join("") + ";";
    items.push({ label: `<synthetic:single:${target}>`, name: `synthetic-single-${target}.ts`, text, bytes: text.length });
  }
  if (opts.multi > 0) {
    const lines = [];
    for (let i = 0; i < opts.multi; i++) lines.push(`const v${i} = ${i} + ${i + 1};`);
    const text = lines.join("\n") + "\n";
    items.push({ label: `<synthetic:multi:${opts.multi}>`, name: `synthetic-multi-${opts.multi}.ts`, text, bytes: text.length });
  }
  return items;
}

function groupFor(label) {
  if (label.startsWith("<synthetic:")) return "synthetic";
  if (label.startsWith("node_modules/typescript/lib/")) return "lib/*.d.ts";
  if (label.startsWith("tests/cases/")) return "tests/cases";
  if (label.startsWith("samples/")) return "samples";
  return "other";
}

function collectCorpus() {
  const files = [];
  if (opts.corpus.length > 0) {
    for (const spec of opts.corpus) {
      for (const piece of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
        const full = path.resolve(root, piece);
        if (!fs.existsSync(full)) throw new Error(`--corpus 路径不存在: ${piece}`);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walkTs(full, files);
        } else if (stat.isFile()) {
          files.push(full);
        } else {
          throw new Error(`--corpus 既不是文件也不是目录: ${piece}`);
        }
      }
    }
  } else {
    // 默认语料 = tests/cases（真实 .ts，4487/4495 可解析）+ samples。
    // typescript/cases 不进：那里是「模板化用例」，行内 `\n` 是要由 ast-json.mjs 还原的转义文本，
    // 直接喂 parser 会抛错（53 个文件里 44 个解析失败），不适合当计时语料。
    walkTs(path.join(root, "tests", "cases"), files);
    walkTs(path.join(root, "samples"), files);
  }
  files.sort((a, b) => a.localeCompare(b));
  const dts = collectDts(opts.dts).map((entry) => entry.full);

  const seen = new Set();
  const corpus = [];
  const push = (full) => {
    if (seen.has(full)) return;
    seen.add(full);
    const text = fs.readFileSync(full, "utf8");
    const label = path.relative(root, full).split(path.sep).join("/");
    corpus.push({ label, group: groupFor(label), name: path.basename(full), text, chars: text.length });
  };
  for (const full of [...files, ...dts]) push(full);
  for (const item of syntheticCorpus()) {
    corpus.push({ label: item.label, group: groupFor(item.label), name: item.name, text: item.text, chars: item.bytes });
  }
  return corpus;
}

let corpus;
try {
  corpus = collectCorpus();
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (corpus.length === 0) {
  console.error("语料为空（检查 --corpus / --dts）。");
  process.exit(2);
}

const sizes = opts.sizes;

// 取一个错误对象里能读的文字：SyntaxException 把消息放在 Message 上，没有 .message。
function messageOf(error) {
  if (error && typeof error.message === "string" && error.message) return error.message;
  if (error && typeof error.Message === "string" && error.Message) return error.Message;
  return String(error);
}

// ---- 预筛：哪些文件在参照 size 下就解析不了 ----
// 解析失败的文件进不了计时（错误路径的耗时与正常路径不可比），但仍要参与 XML 等价性：
// 它们必须「在所有 size 下抛同一个错」，这本身就是窗口大小不改变语义的证据。
const rejects = [];
for (const entry of corpus) {
  try {
    parseWithSize(entry.text, entry.name, REFERENCE_SIZE);
  } catch (error) {
    entry.parseError = messageOf(error);
    rejects.push(entry);
  }
}

const active = corpus.filter((entry) => !entry.parseError);
if (active.length === 0) {
  console.error("所有语料在参照 size 下都解析失败，无法计时（检查 --corpus）。");
  process.exit(2);
}
const totalChars = active.reduce((sum, entry) => sum + entry.chars, 0);
const allChars = corpus.reduce((sum, entry) => sum + entry.chars, 0);

// ---- 计时 ----
const now = () => Number(process.hrtime.bigint()) / 1e6;
const round = (value, digits = 2) => Number(value.toFixed(digits));
const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const rotate = (list, offset) => list.slice(offset).concat(list.slice(0, offset));

// warmup：所有 size × 所有可解析文件各跑一遍，不计入样本。
let current = { label: "(未开始)", size: 0 };
const warmupStarted = now();
try {
  for (let w = 0; w < opts.warmup; w++) {
    for (const entry of active) {
      for (const size of sizes) {
        current = { label: entry.label, size };
        const shape = parseWithSize(entry.text, entry.name, size);
        if (!shape || !Array.isArray(shape.Data)) {
          throw new Error(`未返回带 Data 数组的 SourceFileShape（空跑不能算很快）`);
        }
      }
    }
  }
} catch (error) {
  console.error(`预热阶段失败（${current.label} ${JSON.stringify(current.size)}）: ${messageOf(error)}`);
  process.exit(1);
}
const warmupMs = now() - warmupStarted;

// samples[size][fileIndex] = [ms, ...]；roundTotals[size][round] = 该轮所有文件合计
const samples = new Map(sizes.map((size) => [size, active.map(() => [])]));
const roundTotals = new Map(sizes.map((size) => [size, []]));

const timedStarted = now();
try {
  for (let r = 0; r < opts.repeat; r++) {
    const perRound = new Map(sizes.map((size) => [size, 0]));
    for (let i = 0; i < active.length; i++) {
      const entry = active[i];
      let order = rotate(sizes, (r + i) % sizes.length);
      if (r % 2 === 1) order = order.slice().reverse();
      for (const size of order) {
        const start = process.hrtime.bigint();
        const shape = parseWithSize(entry.text, entry.name, size);
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        if (!shape || !Array.isArray(shape.Data)) {
          throw new Error(`${entry.label}: size=${size} 未返回带 Data 数组的 SourceFileShape`);
        }
        samples.get(size)[i].push(ms);
        perRound.set(size, perRound.get(size) + ms);
      }
    }
    for (const size of sizes) roundTotals.get(size).push(perRound.get(size));
  }
} catch (error) {
  console.error(`计时阶段失败: ${messageOf(error)}`);
  process.exit(1);
}
const timedMs = now() - timedStarted;

// ---- 汇总 ----
const rows = active.map((entry, i) => {
  const perSize = {};
  const spread = {};
  for (const size of sizes) {
    const list = samples.get(size)[i];
    const med = median(list);
    perSize[size] = med;
    spread[size] = med === 0 ? 0 : ((Math.max(...list) - Math.min(...list)) / med) * 100;
  }
  return { label: entry.label, group: entry.group, name: entry.name, chars: entry.chars, perSize, spread };
});

// 分组小计：不同语料族的窗口敏感度不一样（d.ts 是超长文件，tests/cases 是短文件多）。
const groups = [];
for (const size of sizes) {
  for (const row of rows) {
    let group = groups.find((item) => item.name === row.group);
    if (!group) {
      group = { name: row.group, files: 0, chars: 0, perSize: Object.fromEntries(sizes.map((s) => [s, 0])) };
      groups.push(group);
    }
    group.perSize[size] += row.perSize[size];
  }
}
for (const group of groups) {
  const members = rows.filter((row) => row.group === group.name);
  group.files = members.length;
  group.chars = members.reduce((sum, row) => sum + row.chars, 0);
}
groups.sort((a, b) => b.chars - a.chars);

const totals = {};
for (const size of sizes) totals[size] = rows.reduce((sum, row) => sum + row.perSize[size], 0);
const reference = totals[REFERENCE_SIZE];
for (const size of sizes) {
  totals[size] = { ms: totals[size], deltaMs: totals[size] - reference, deltaPct: reference === 0 ? 0 : ((totals[size] - reference) / reference) * 100 };
}
const totalMsOf = (size) => totals[size].ms;
const nsPerChar = {};
for (const size of sizes) nsPerChar[size] = totalChars === 0 ? 0 : (totalMsOf(size) * 1e6) / totalChars;

// 噪声：全部 (文件 × size) 的轮内相对极差的中位数，以及单个 size 的轮间 TOTAL 极差。
const spreads = [];
for (const row of rows) for (const size of sizes) spreads.push(row.spread[size]);
const spreadMedian = median(spreads);
const spreadP90 = (() => {
  const sorted = spreads.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
})();
const roundTotalSpread = {};
for (const size of sizes) {
  const list = roundTotals.get(size);
  const med = median(list);
  roundTotalSpread[size] = med === 0 ? 0 : ((Math.max(...list) - Math.min(...list)) / med) * 100;
}
const NOISE_PCT = 3;
const withinNoise = sizes.filter((size) => size !== REFERENCE_SIZE && Math.abs(totals[size].deltaPct) < NOISE_PCT);
const bestSize = sizes.slice().sort((a, b) => totalMsOf(a) - totalMsOf(b))[0];

// ---- XML 逐字节等价（不计时，单独一遍）----
const equivalence = {
  reference: REFERENCE_SIZE,
  pass: 0,
  fail: 0,
  error: 0,
  sameError: 0,
  bytes: {},
  failures: [],
};
for (const size of sizes) equivalence.bytes[size] = 0;

function xmlBytesOf(entry, size) {
  const shape = parseWithSize(entry.text, entry.name, size);
  return Buffer.from(shape.ToString(), "utf8");
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return { at: i, lenA: a.length, lenB: b.length };
  if (a.length !== b.length) return { at: n, lenA: a.length, lenB: b.length };
  return null;
}

function contextAround(buffer, at, radius = 80) {
  const from = Math.max(0, at - radius);
  const to = Math.min(buffer.length, at + radius);
  return `${from > 0 ? "..." : ""}${JSON.stringify(buffer.subarray(from, to).toString("utf8"))}${to < buffer.length ? "..." : ""}`;
}

for (const entry of corpus) {
  const refBytes = {};
  let refError = null;
  try {
    const bytes = xmlBytesOf(entry, REFERENCE_SIZE);
    refBytes[REFERENCE_SIZE] = bytes;
    equivalence.bytes[REFERENCE_SIZE] += bytes.length;
  } catch (error) {
    refError = error;
  }
  if (refError) {
    // 参照 size 自己都抛错：只能看其它 size 是不是抛同一个错。
    let allSame = true;
    const messages = [`size=${REFERENCE_SIZE}: ${messageOf(refError)}`];
    for (const size of sizes) {
      if (size === REFERENCE_SIZE) continue;
      try {
        xmlBytesOf(entry, size);
        allSame = false;
        messages.push(`size=${size}: 解析成功`);
      } catch (error) {
        if (messageOf(error) !== messageOf(refError)) {
          allSame = false;
          messages.push(`size=${size}: ${messageOf(error)}`);
        }
      }
    }
    if (allSame) {
      equivalence.sameError++;
    } else {
      equivalence.error++;
      equivalence.failures.push({ file: entry.label, channel: "parse", detail: messages.join(" ; ") });
    }
    continue;
  }

  let ok = true;
  let detail = null;
  for (const size of sizes) {
    if (size === REFERENCE_SIZE) continue;
    let bytes;
    try {
      bytes = xmlBytesOf(entry, size);
    } catch (error) {
      ok = false;
      equivalence.error++;
      detail = `size=${size} 解析抛错: ${messageOf(error)}（size=${REFERENCE_SIZE} 成功）`;
      equivalence.failures.push({ file: entry.label, channel: "parse", detail });
      break;
    }
    equivalence.bytes[size] += bytes.length;
    const diff = firstDiff(refBytes[REFERENCE_SIZE], bytes);
    if (diff === null) continue;
    ok = false;
    detail =
      `size=${size} 与 size=${REFERENCE_SIZE} 首个不同字节 @${diff.at}` +
      `（${diff.lenA} B / ${diff.lenB} B）\n` +
      `        size=${REFERENCE_SIZE}: ${contextAround(refBytes[REFERENCE_SIZE], diff.at)}\n` +
      `        size=${size}: ${contextAround(bytes, diff.at)}`;
    equivalence.failures.push({ file: entry.label, channel: "xml", detail });
    break;
  }
  if (ok) equivalence.pass++;
  else equivalence.fail++;
}

// ---- 打印 ----
const pad = (value, width) => String(value).padStart(width);
const padRight = (value, width) => String(value).padEnd(width);
const lines = [];
lines.push(
  `node ${process.version}  ${os.platform()} ${os.release()}  ${os.cpus()[0] ? os.cpus()[0].model.trim() : "?"}  ` +
    `核数 ${os.cpus().length}  内存 ${(os.totalmem() / 2 ** 30).toFixed(1)} GiB`,
);
lines.push(
  `语料 ${active.length} 个可解析文件 / ${totalChars} 字符` +
    (rejects.length > 0 ? `（另有 ${rejects.length} 个文件在参照 size 下就解析失败，只参加等价性检查）` : "") +
    `  dts=${opts.dts}  repeat=${opts.repeat}  warmup=${opts.warmup}  sizes=${sizes.join(",")}（参照 ${REFERENCE_SIZE}）`,
);
lines.push(
  `warmup ${(warmupMs / 1000).toFixed(1)} s，计时 ${(timedMs / 1000).toFixed(1)} s；` +
    `每轮内所有 size 交替，顺序按 (轮次+文件序号) 轮转、奇数轮反向`,
);
lines.push("");
if (opts.corpus.length === 0) {
  lines.push("语料构成：tests/cases + samples + 最大 N 份 lib/*.d.ts");
} else {
  lines.push(`语料构成：--corpus ${opts.corpus.join(", ")} + d.ts=${opts.dts}`);
}
if (opts.single > 0 || opts.multi > 0) {
  lines.push(
    `合成档：${[opts.single > 0 ? `--single ${opts.single}` : "", opts.multi > 0 ? `--multi ${opts.multi}` : ""]
      .filter(Boolean)
      .join("  ")}`,
  );
}
if (rejects.length > 0) {
  lines.push(`不计时的文件（参照 size 下解析失败）：${rejects.slice(0, 5).map((entry) => entry.label).join(", ")}` +
    (rejects.length > 5 ? ` … 共 ${rejects.length} 个` : ""));
}
lines.push("");

const header =
  `${padRight("size", 6)} ${pad("TOTAL ms", 11)} ${pad("Δ ms", 10)} ${pad("Δ%", 9)} ${pad("ns/字符", 10)} ` +
  `${pad("轮间极差%", 10)} ${pad("轮合计中位", 12)}`;
lines.push(header);
lines.push("-".repeat(header.length));
for (const size of sizes) {
  const tag = size === REFERENCE_SIZE ? "  ← 参照" : "";
  lines.push(
    `${padRight(size, 6)} ${pad(round(totals[size].ms, 3), 11)} ${pad(round(totals[size].deltaMs, 3), 10)} ` +
      `${pad(round(totals[size].deltaPct, 2), 9)} ${pad(round(nsPerChar[size], 3), 10)} ` +
      `${pad(round(roundTotalSpread[size], 2), 10)} ${pad(round(median(roundTotals.get(size)), 3), 12)}${tag}`,
  );
}
lines.push("");
lines.push(
  `TOTAL = 各文件中位数之和；Δ% 相对 size=${REFERENCE_SIZE}（正 = 更慢）。` +
    `噪声带：轮内极差中位 ${round(spreadMedian, 2)}%（P90 ${round(spreadP90, 2)}%），单次差异 < ${NOISE_PCT}% 视为噪声。`,
);
lines.push(
  `落在 ${NOISE_PCT}% 噪声带内的 size：${withinNoise.length === 0 ? `（无，即相对 ${REFERENCE_SIZE} 的差异都超过 ${NOISE_PCT}%）` : withinNoise.join(", ")}`,
);
lines.push(`TOTAL 最小：size=${bestSize}（${round(totalMsOf(bestSize), 3)} ms）`);

if (groups.length > 1) {
  lines.push("");
  lines.push("分组小计（各文件中位数之和，ms）：");
  const groupHeader = `${padRight("语料组", 16)} ${pad("文件", 6)} ${pad("字符", 9)} ` +
    sizes.map((size) => pad(`s${size}`, 10)).join(" ");
  lines.push(groupHeader);
  lines.push("-".repeat(groupHeader.length));
  for (const group of groups) {
    lines.push(
      `${padRight(group.name, 16)} ${pad(group.files, 6)} ${pad(group.chars, 9)} ` +
        sizes.map((size) => pad(round(group.perSize[size], 2), 10)).join(" "),
    );
  }
  lines.push("");
  lines.push(`分组 Δ%（相对各组的 size=${REFERENCE_SIZE}）：`);
  const deltaHeader = `${padRight("语料组", 16)} ` + sizes.filter((size) => size !== REFERENCE_SIZE).map((size) => pad(`s${size}`, 10)).join(" ");
  lines.push(deltaHeader);
  lines.push("-".repeat(deltaHeader.length));
  for (const group of groups) {
    const base = group.perSize[REFERENCE_SIZE];
    lines.push(
      `${padRight(group.name, 16)} ` +
        sizes
          .filter((size) => size !== REFERENCE_SIZE)
          .map((size) => pad(round(base === 0 ? 0 : ((group.perSize[size] - base) / base) * 100, 2), 10))
          .join(" "),
    );
  }
}

if (opts.files) {
  lines.push("");
  const fileHeader =
    `${padRight("文件", 46)} ${pad("字符", 8)} ` + sizes.map((size) => pad(`s${size}`, 9)).join(" ");
  lines.push(fileHeader);
  lines.push("-".repeat(fileHeader.length));
  for (const row of rows) {
    lines.push(
      `${padRight(row.label.length > 46 ? "…" + row.label.slice(-45) : row.label, 46)} ${pad(row.chars, 8)} ` +
        sizes.map((size) => pad(round(row.perSize[size], 2), 9)).join(" "),
    );
  }
}

lines.push("");
lines.push(
  `XML 逐字节等价：PASS ${equivalence.pass} / FAIL ${equivalence.fail} / ERROR ${equivalence.error}` +
    (equivalence.sameError ? ` / 同错 ${equivalence.sameError}` : "") +
    `（基线 size=${REFERENCE_SIZE}，共 ${corpus.length} 个文件 × ${sizes.length} 个 size）`,
);
const byteSummary = sizes.map((size) => `s${size}=${equivalence.bytes[size]}B`).join("  ");
lines.push(`各 size 的 XML 字节总量：${byteSummary}`);
for (const failure of equivalence.failures.slice(0, 5)) {
  lines.push(`FAIL  [${failure.channel}] ${failure.file}`);
  lines.push(`        ${failure.detail}`);
}
if (equivalence.failures.length > 5) lines.push(`… 另有 ${equivalence.failures.length - 5} 条失败未打印（见 --json）`);

const equivalenceOk = equivalence.fail === 0 && equivalence.error === 0;
lines.push(
  equivalenceOk
    ? `结论: 窗口大小不改变语义（${sizes.join("/")} 的 XML 全部逐字节相同）。`
    : "结论: 不等价 —— 有窗口大小改变了 XML 或解析结果。",
);

console.log(lines.join("\n"));

if (opts.json) {
  console.log(
    JSON.stringify(
      {
        node: process.version,
        platform: `${os.platform()} ${os.release()}`,
        cpu: os.cpus()[0] ? os.cpus()[0].model.trim() : null,
        cores: os.cpus().length,
        corpus: {
          files: corpus.length,
          timed: active.length,
          chars: totalChars,
          charsAll: allChars,
          rejected: rejects.map((entry) => ({ file: entry.label, error: entry.parseError })),
          dts: opts.dts,
        },
        repeat: opts.repeat,
        warmup: opts.warmup,
        sizes,
        reference: REFERENCE_SIZE,
        noisePct: NOISE_PCT,
        rows: opts.jsonRows
          ? rows.map((row) => ({
              file: row.label,
              group: row.group,
              chars: row.chars,
              medians: Object.fromEntries(sizes.map((size) => [size, round(row.perSize[size], 3)])),
              spreads: Object.fromEntries(sizes.map((size) => [size, round(row.spread[size], 2)])),
            }))
          : undefined,
        groups: groups.map((group) => ({
          name: group.name,
          files: group.files,
          chars: group.chars,
          ms: Object.fromEntries(sizes.map((size) => [size, round(group.perSize[size], 3)])),
        })),
        totals: Object.fromEntries(
          sizes.map((size) => [
            size,
            { ms: round(totals[size].ms, 3), deltaMs: round(totals[size].deltaMs, 3), deltaPct: round(totals[size].deltaPct, 2), nsPerChar: round(nsPerChar[size], 3) },
          ]),
        ),
        roundTotals: Object.fromEntries(sizes.map((size) => [size, roundTotals.get(size).map((ms) => round(ms, 3))])),
        noise: {
          withinNoise: withinNoise,
          fileSpreadMedianPct: round(spreadMedian, 2),
          fileSpreadP90Pct: round(spreadP90, 2),
          roundTotalSpreadPct: Object.fromEntries(sizes.map((size) => [size, round(roundTotalSpread[size], 2)])),
        },
        bestSize,
        equivalence: {
          ok: equivalenceOk,
          pass: equivalence.pass,
          fail: equivalence.fail,
          error: equivalence.error,
          sameError: equivalence.sameError,
          bytes: equivalence.bytes,
          failures: equivalence.failures,
        },
      },
      null,
      2,
    ),
  );
}

if (!equivalenceOk) process.exitCode = 1;
