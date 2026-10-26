// buffer 改造等价性验收：基线 build 与实验 build 的 **同进程** 双通道对比。
//
// 目的：BUFFER-CORE CONTRACT §0.3 —— 把 token/shape 的闭区间 Source 模型换成
// buffer 窗口 + int 索引（SourceRange 半开 [Start, End)）之后，XML 产出必须逐字节不变。
//
// 两个通道：
//   1) xml    —— 每个语料文件分别用两版 build 的 SourceFileRunner.Parse 解析，
//                取 Root.ToString()（= ToAstLine，与 cjcli 写出的 XML 同源）
//                转 UTF-8 字节后逐字节比较。这是验收口径本身。
//   2) digest —— 位置通道：遍历 token 树，输出「构造器名[Start,End) + Temp 文本」。
//                旧版 build 的 SourceRange.Start/End 是 Source（闭区间，End.Index = 最后字符），
//                归一为半开：end = End.Index + 1；新版 build 的 Start/End 已是 int 半开，原样。
//                即「按新版 End-1 归一后」两版应逐条相同。XML 不含位置，位置变化只能靠这
//                一通道看出来。
//
// 语料（固定四类，顺序确定）：
//   - typescript/cases/**/*.ts（全部；含 astjson/ 语料与 tts/ 边界 cases）
//   - tests/cases/**/*.ts（全部）
//   - samples/*.ts（全部）
//   - node_modules/typescript/lib 下最大 N 份 *.d.ts（默认 8，必需 4 份固定入选，
//     与 tests/bench/parse-perf.mjs 的 --dts 选了同一批文件）
//
// 用法：
//   node tests/bench/buffer-equivalence.mjs                        # xml 模式，全语料
//   node tests/bench/buffer-equivalence.mjs --mode digest          # 只看位置/文本 digest
//   node tests/bench/buffer-equivalence.mjs --mode both --quiet    # 两通道都跑，只打印失败行
//   node tests/bench/buffer-equivalence.mjs --base build-base --new build
//   node tests/bench/buffer-equivalence.mjs --dts 4 --only lib.es5.d.ts
//
// 退出码：0 = 选中通道全部等价；1 = 存在 FAIL / ERROR（或用法错误 2）。
// 本脚本只读文件、不写任何东西，不依赖网络。
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
  mode: "xml",
  dts: 8,
  only: "",
  quiet: false,
  json: false,
};

function usage() {
  return [
    "用法: node tests/bench/buffer-equivalence.mjs [--base <dir>] [--new <dir>] [--mode xml|digest|both]",
    "                                                 [--dts N] [--only <substr>] [--quiet] [--json]",
    "",
    `  --base <dir>   基线 build 目录（含 ts/typescript/run/source-file-runner.js），默认 ${DEFAULTS.base}`,
    `  --new <dir>    实验 build 目录，默认 ${DEFAULTS.new}`,
    `  --mode <m>     xml（逐字节，默认）| digest（构造器[Start,End)+Temp）| both`,
    `  --dts <N>      lib 下最大 N 份 *.d.ts 参与比较（默认 ${DEFAULTS.dts}，0 = 不跑 d.ts 档）`,
    "  --only <s>     只跑相对路径包含 s 的文件（调试用）",
    "  --quiet        不打印 PASS 行，只在末尾打印汇总",
    "  --json         末尾追加一段 JSON 汇总",
    "",
    "退出码 0 = 等价；1 = 有 FAIL/ERROR；2 = 用法错误。",
  ].join("\n");
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS, modes: [] };
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
    } else if (arg === "--mode") {
      const m = need("--mode");
      if (!["xml", "digest", "both"].includes(m)) throw new Error(`--mode 只接受 xml|digest|both，收到 ${m}`);
      opts.mode = m;
    } else if (arg === "--dts") {
      const n = Number(need("--dts"));
      if (!Number.isInteger(n) || n < 0) throw new Error("--dts 需要非负整数");
      opts.dts = n;
    } else if (arg === "--only") {
      opts.only = need("--only");
    } else if (arg === "--quiet") {
      opts.quiet = true;
    } else if (arg === "--json") {
      opts.json = true;
    } else {
      console.error(`未知参数: ${arg}\n\n${usage()}`);
      process.exit(2);
    }
  }
  opts.modes = opts.mode === "both" ? ["xml", "digest"] : [opts.mode];
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
    throw new Error(`找不到 ${label} build: ${entry}（先构建基线/实验分支，或指对目录）`);
  }
  const mod = require(entry);
  const runner = mod && mod.SourceFileRunner;
  if (!runner || typeof runner.Parse !== "function") {
    throw new Error(`${label} build 的 SourceFileRunner.Parse 不可用: ${entry}`);
  }
  return { dir: full, runner };
}

// ---- 语料收集（顺序确定）----
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
  // 与 parse-perf 同序：体积降序、同体积按名字。
  return [...chosen.values()].sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
}

function collectCorpus() {
  const files = [];
  walkTs(path.join(root, "typescript", "cases"), files);
  walkTs(path.join(root, "tests", "cases"), files);
  walkTs(path.join(root, "samples"), files);
  files.sort((a, b) => a.localeCompare(b));
  const dts = collectDts(opts.dts).map((entry) => entry.full);
  const seen = new Set();
  const corpus = [];
  for (const full of [...files, ...dts]) {
    if (seen.has(full)) continue;
    seen.add(full);
    const label = path.relative(root, full).split(path.sep).join("/");
    if (opts.only && !label.includes(opts.only)) continue;
    corpus.push({ full, label, name: path.basename(full) });
  }
  return corpus;
}

// ---- 比较原语 ----
function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return { at: i, lenA: a.length, lenB: b.length };
  }
  if (a.length !== b.length) return { at: n, lenA: a.length, lenB: b.length };
  return null;
}

function context(buffer, at, radius = 90) {
  const from = Math.max(0, at - radius);
  const to = Math.min(buffer.length, at + radius);
  const text = buffer.subarray(from, to).toString("utf8");
  return `${from > 0 ? "..." : ""}${JSON.stringify(text)}${to < buffer.length ? "..." : ""}`;
}

// 旧版 SourceRange 端点：Source（.Index 为闭区间下标）或 null；新版：int（-1 = 未设置）。
// 归一目标 = 半开 [start, end)：旧版 end = End.Index + 1。
function coord(value, isEnd) {
  if (value === null || value === undefined) return -1;
  if (typeof value === "number") return value; // 新版 int，原样
  if (typeof value.Index === "number") {
    const index = value.Index;
    if (index < 0) return -1;
    return isEnd ? index + 1 : index;
  }
  return -1;
}

function tempText(token) {
  if (typeof token.Temp === "string") return token.Temp;
  if (typeof token.Tmp === "string") return token.Tmp;
  return "";
}

// digest = 每个 token 一行：构造器名[Start,End)  Temp=<JSON>。按 Data 先序遍历（与 ToAstLine 同构）。
function buildDigest(shape) {
  const lines = [];
  const walk = (token) => {
    const range = token.SourceRange || {};
    const start = coord(range.Start, false);
    const end = coord(range.End, true);
    lines.push(`${token.constructor.name}[${start},${end})  ${JSON.stringify(tempText(token))}`);
    const data = token.Data;
    if (Array.isArray(data)) for (const child of data) walk(child);
  };
  walk(shape);
  return lines;
}

// ---- 主循环 ----
let baseMod;
let newMod;
try {
  baseMod = loadRunner(opts.base, "基线");
  newMod = loadRunner(opts.new, "实验");
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
if (baseMod.dir === newMod.dir) {
  console.error(`警告: --base 与 --new 指向同一目录（${baseMod.dir}），结果必然等价，仅能做脚本自检。`);
}

const corpus = collectCorpus();
if (corpus.length === 0) {
  console.error("语料为空（检查 --only / --dts）。");
  process.exit(2);
}

const stats = {
  files: 0,
  corpusBytes: 0,
  xml: { pass: 0, fail: 0, error: 0, sameError: 0, baseBytes: 0, newBytes: 0 },
  digest: { pass: 0, fail: 0, error: 0, sameError: 0, baseTokens: 0, newTokens: 0 },
  rootRangeMismatch: [],
  failures: [],
  timings: { parseBaseMs: 0, parseNewMs: 0, xmlMs: 0, digestMs: 0 },
};

const round = (value, digits = 1) => Number(value.toFixed(digits));

function now() {
  return Number(process.hrtime.bigint()) / 1e6;
}

function recordFailure(entry, channel, detail) {
  stats.failures.push({ file: entry.label, channel, detail });
  const line = `FAIL  [${channel}] ${entry.label}\n        ${detail}`;
  console.log(line);
}

function readText(entry) {
  return fs.readFileSync(entry.full, "utf8");
}

for (const entry of corpus) {
  stats.files++;
  const text = readText(entry);
  stats.corpusBytes += Buffer.byteLength(text, "utf8");

  let baseShape = null;
  let newShape = null;
  let baseError = null;
  let newError = null;

  const t0 = now();
  try {
    baseShape = baseMod.runner.Parse(text, entry.name);
  } catch (error) {
    baseError = error;
  }
  const t1 = now();
  try {
    newShape = newMod.runner.Parse(text, entry.name);
  } catch (error) {
    newError = error;
  }
  const t2 = now();
  stats.timings.parseBaseMs += t1 - t0;
  stats.timings.parseNewMs += t2 - t1;

  if (baseError || newError) {
    // 语料里 parse 抛的是 SyntaxException（字段名 Message，没有 .message），两种都要能读出来。
    const messageOf = (error) => {
      if (error && typeof error.message === "string" && error.message) return error.message;
      if (error && typeof error.Message === "string" && error.Message) return error.Message;
      return String(error);
    };
    if (baseError && newError && messageOf(baseError) === messageOf(newError)) {
      // 两版抛同样的错（同一处语法错误）：行为等价，但 XML 无法比较，单独计数。
      if (opts.modes.includes("xml")) stats.xml.sameError++;
      if (opts.modes.includes("digest")) stats.digest.sameError++;
      if (!opts.quiet) console.log(`PASS  ${entry.label}  (两版抛同一错误: ${messageOf(baseError)})`);
    } else {
      const detail = [
        baseError ? `基线抛错: ${messageOf(baseError)}` : "基线解析成功",
        newError ? `实验抛错: ${messageOf(newError)}` : "实验解析成功",
      ].join("; ");
      if (opts.modes.includes("xml")) stats.xml.error++;
      if (opts.modes.includes("digest")) stats.digest.error++;
      recordFailure(entry, "parse", detail);
    }
    continue;
  }

  // ---- 通道 1：XML 逐字节 ----
  let xmlPass = true;
  let baseXmlBytes = 0;
  let newXmlBytes = 0;
  if (opts.modes.includes("xml")) {
    const x0 = now();
    let baseXml;
    let newXml;
    try {
      baseXml = baseShape.ToString();
      newXml = newShape.ToString();
    } catch (error) {
      stats.xml.error++;
      recordFailure(entry, "xml", `ToString 抛错: ${error && error.message ? error.message : error}`);
      baseXml = null;
      newXml = null;
      xmlPass = false;
    }
    if (baseXml !== null && newXml !== null) {
      const baseBytes = Buffer.from(baseXml, "utf8");
      const newBytes = Buffer.from(newXml, "utf8");
      baseXmlBytes = baseBytes.length;
      newXmlBytes = newBytes.length;
      stats.xml.baseBytes += baseBytes.length;
      stats.xml.newBytes += newBytes.length;
      const diff = firstDiff(baseBytes, newBytes);
      if (diff === null) {
        stats.xml.pass++;
      } else {
        xmlPass = false;
        stats.xml.fail++;
        recordFailure(
          entry,
          "xml",
          `首个不同字节 @${diff.at}（基线 ${diff.lenA} B / 实验 ${diff.lenB} B）\n` +
            `        基线: ${context(baseBytes, diff.at)}\n` +
            `        实验: ${context(newBytes, diff.at)}`,
        );
      }
    }
    stats.timings.xmlMs += now() - x0;
  }

  // ---- 通道 2：digest（构造器[Start,End) + Temp） ----
  let digestPass = true;
  if (opts.modes.includes("digest")) {
    const d0 = now();
    let baseDigest;
    let newDigest;
    try {
      baseDigest = buildDigest(baseShape);
      newDigest = buildDigest(newShape);
    } catch (error) {
      stats.digest.error++;
      recordFailure(entry, "digest", `遍历 token 树抛错: ${error && error.message ? error.message : error}`);
      baseDigest = null;
      newDigest = null;
      digestPass = false;
    }
    if (baseDigest !== null && newDigest !== null) {
      stats.digest.baseTokens += baseDigest.length;
      stats.digest.newTokens += newDigest.length;
      // 自检：归一后的根范围应为 [0, 字符数)，可证明 End+1 归一确实生效。
      const rootLine = baseDigest[0] || "";
      const rootMatch = /^[^[]*\[(-?\d+),(-?\d+)\)/.exec(rootLine);
      if (!rootMatch || Number(rootMatch[1]) !== 0 || Number(rootMatch[2]) !== text.length) {
        stats.rootRangeMismatch.push({
          file: entry.label,
          root: rootLine,
          chars: text.length,
        });
      }
      if (baseDigest.length !== newDigest.length) {
        digestPass = false;
        stats.digest.fail++;
        recordFailure(
          entry,
          "digest",
          `token 数不同：基线 ${baseDigest.length} / 实验 ${newDigest.length}` +
            (baseDigest.length && newDigest.length
              ? `\n        基线首条: ${baseDigest[0]}\n        实验首条: ${newDigest[0]}`
              : ""),
        );
      } else {
        let mismatch = -1;
        for (let i = 0; i < baseDigest.length; i++) {
          if (baseDigest[i] !== newDigest[i]) {
            mismatch = i;
            break;
          }
        }
        if (mismatch < 0) {
          stats.digest.pass++;
        } else {
          digestPass = false;
          stats.digest.fail++;
          recordFailure(
            entry,
            "digest",
            `第 ${mismatch + 1}/${baseDigest.length} 条不同` +
              `\n        基线: ${baseDigest[mismatch]}` +
              `\n        实验: ${newDigest[mismatch]}`,
          );
        }
      }
    }
    stats.timings.digestMs += now() - d0;
  }

  if (!opts.quiet && xmlPass && digestPass) {
    const xmlInfo = opts.modes.includes("xml")
      ? `xml=${baseXmlBytes}B` + (baseXmlBytes === newXmlBytes ? "" : `/${newXmlBytes}B`)
      : "";
    const digestInfo = opts.modes.includes("digest") ? `tokens=${stats.digest.baseTokens}/${stats.digest.newTokens}` : "";
    console.log(`PASS  ${entry.label}  ${[xmlInfo, digestInfo].filter(Boolean).join("  ")}`);
  }
}

// ---- 汇总 ----
const modeSummary = [];
if (opts.modes.includes("xml")) {
  modeSummary.push(
    `xml: PASS ${stats.xml.pass} / FAIL ${stats.xml.fail} / ERROR ${stats.xml.error}` +
      (stats.xml.sameError ? ` / 同错 ${stats.xml.sameError}` : "") +
      `（字节 基线 ${stats.xml.baseBytes} / 实验 ${stats.xml.newBytes}）`,
  );
}
if (opts.modes.includes("digest")) {
  modeSummary.push(
    `digest: PASS ${stats.digest.pass} / FAIL ${stats.digest.fail} / ERROR ${stats.digest.error}` +
      (stats.digest.sameError ? ` / 同错 ${stats.digest.sameError}` : "") +
      `（token 基线 ${stats.digest.baseTokens} / 实验 ${stats.digest.newTokens}）`,
  );
}
const failed = stats.xml.fail + stats.xml.error + stats.digest.fail + stats.digest.error;
console.log("");
console.log(`语料 ${stats.files} 个文件，${stats.corpusBytes} 字符`);
console.log(`基线 build: ${path.relative(root, baseMod.dir).split(path.sep).join("/")}  实验 build: ${path.relative(root, newMod.dir).split(path.sep).join("/")}`);
for (const line of modeSummary) console.log(line);
console.log(
  `解析耗时 基线 ${round(stats.timings.parseBaseMs)} ms / 实验 ${round(stats.timings.parseNewMs)} ms` +
    `；XML 序列化 ${round(stats.timings.xmlMs)} ms；digest ${round(stats.timings.digestMs)} ms`,
);
if (stats.rootRangeMismatch.length > 0) {
  console.log(`警告: 根范围自检失败 ${stats.rootRangeMismatch.length} 个文件（归一后应为 [0, 字符数)）：`);
  for (const item of stats.rootRangeMismatch.slice(0, 5)) {
    console.log(`  ${item.file}: ${item.root}  期望 [0,${item.chars})`);
  }
}
if (opts.json) {
  console.log(
    JSON.stringify(
      {
        base: path.relative(root, baseMod.dir).split(path.sep).join("/"),
        new: path.relative(root, newMod.dir).split(path.sep).join("/"),
        modes: opts.modes,
        files: stats.files,
        corpusBytes: stats.corpusBytes,
        xml: stats.xml,
        digest: stats.digest,
        rootRangeMismatch: stats.rootRangeMismatch.length,
        failures: stats.failures,
      },
      null,
      2,
    ),
  );
}

if (failed > 0) {
  console.log(`\n结论: 不等价（FAIL/ERROR ${failed} 项）。`);
  process.exitCode = 1;
} else {
  console.log(`\n结论: 等价（${opts.modes.join("+")} 通道全部 PASS）。`);
  process.exitCode = 0;
}
