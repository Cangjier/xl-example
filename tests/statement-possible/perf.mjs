// 语句 possible 性能骨架（设计 §8.3，T1c 只要求"能跑出读数"，不设硬阈值）。
//
//   node tests/statement-possible/perf.mjs
//   node tests/statement-possible/perf.mjs --reps=5 --long=300 --many=2000
//   node tests/statement-possible/perf.mjs --verbose
//
// 测什么：
//   1. 长语句：`a1+a2+…+aN;` 的 SourceFileRunner.Parse 墙钟（performance.now，取中位数）。
//   2. 多语句：M 条 `a;`。
//   3. 候选调用计数：monkeypatch CatalogGuide.ComputePossibleShapesByIndex 计数
//      （每次判定 = 存活候选数 + 1 个终结候选），给出「总调用数 / basic token 数」。
//   4. 退化探测：n = 100 / 200 / 400，看耗时是否接近线性（记录比值，不判失败）。
//
// 口径：只量 build/ts 产物，与其余尺子一致；绝对 ms 不可跨机比较，跨 Stage 只看比值（设计 §8.3.4）。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const buildRoot = path.join(root, "build/ts");
const require = createRequire(import.meta.url);

function parseFlags(argv) {
  // R3：加 `--warmup`（默认 2）。首轮样本含模块加载 / JIT 冷启动：同一份 build 曾把 long 读成
  // 3.62ms，下一轮又读成 5.87ms。预热轮不计入样本，口径从「首轮含冷启动」变成「热态中位数」。
  const flags = { reps: 5, long: 300, many: 2000, warmup: 2, verbose: argv.includes("--verbose") };
  for (const name of ["reps", "long", "many", "warmup"]) {
    const hit = argv.find((item) => item.startsWith(`--${name}=`));
    if (hit !== undefined) flags[name] = Number(hit.slice(name.length + 3));
  }
  return flags;
}

const flags = parseFlags(process.argv.slice(2));
const { SourceFileRunner } = require(path.join(buildRoot, "typescript/run/source-file-runner.js"));
const { CatalogGuide } = require(path.join(buildRoot, "core/syntax/catalog-guide.js"));

// 计数仪器（只计数，不改判定）。
const state = { cells: 0, candidateCalls: 0, endCalls: 0 };
const original = CatalogGuide.prototype.ComputePossibleShapesByIndex;
CatalogGuide.prototype.ComputePossibleShapesByIndex = function (host, tokenIndex, context) {
  state.cells++;
  state.candidateCalls += (this.Candidates ? this.Candidates.size : 0);
  if (this.EndPossible) state.endCalls++;
  return original.call(this, host, tokenIndex, context);
};

function resetCounters() {
  state.cells = 0;
  state.candidateCalls = 0;
  state.endCalls = 0;
}

function parse(source) {
  resetCounters();
  return SourceFileRunner.Parse(source, "perf.ts");
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function timeParse(source, reps, warmup) {
  const samples = [];
  let lastTokens = 0;
  let lastCalls = 0;
  for (let index = 0; index < warmup; index++) {
    const shape = parse(source);
    if (shape === null) throw new Error("Parse 返回 null");
  }
  for (let index = 0; index < reps; index++) {
    const started = performance.now();
    const shape = parse(source);
    const elapsed = performance.now() - started;
    if (shape === null) throw new Error("Parse 返回 null");
    lastTokens = countCodeTokens(shape);
    lastCalls = state.candidateCalls;
    samples.push(elapsed);
  }
  return { median: median(samples), samples, tokens: lastTokens, calls: lastCalls };
}

/** 语法树的叶子形状数（近似 basic token 数）：AST 线里「下一行不再缩进」的节点。 */
function countCodeTokens(shape) {
  let astLine = "";
  try {
    astLine = shape.ToAstLine(0);
  } catch {
    return 0;
  }
  const prefixLength = (line) => {
    const match = /^[│├└─ ]*/.exec(line);
    return match === null ? 0 : match[0].length;
  };
  const lines = astLine.split("\n").filter((line) => line.length > 0);
  let leaves = 0;
  for (let index = 0; index < lines.length; index++) {
    if (index === lines.length - 1 || prefixLength(lines[index + 1]) <= prefixLength(lines[index])) leaves += 1;
  }
  return leaves;
}

function longStatement(n) {
  const parts = [];
  for (let index = 1; index <= n; index++) parts.push(`a${index}`);
  return `${parts.join("+")};`;
}

function manyStatements(count) {
  const lines = [];
  for (let index = 0; index < count; index++) lines.push("a;");
  return lines.join("\n");
}

function format(value) {
  return value.toFixed(2);
}

function main() {
  console.log(`[perf] build=${buildRoot}`);
  console.log(`[perf] reps=${flags.reps} warmup=${flags.warmup} long=${flags.long} many=${flags.many}（预热后中位数；不设硬阈值）`);

  const longSource = longStatement(flags.long);
  const long = timeParse(longSource, flags.reps, flags.warmup);
  const longCallsPerToken = long.tokens > 0 ? long.calls / long.tokens : 0;
  console.log(
    `[perf] long n=${flags.long} median=${format(long.median)}ms tokens=${long.tokens} ` +
      `candidateCalls=${long.calls} callsPerToken=${longCallsPerToken.toFixed(2)}`,
  );
  if (flags.verbose) console.log(`[perf] long samples=${long.samples.map(format).join(",")}`);

  const manySource = manyStatements(flags.many);
  const many = timeParse(manySource, flags.reps, flags.warmup);
  const manyCallsPerToken = many.tokens > 0 ? many.calls / many.tokens : 0;
  console.log(
    `[perf] many statements=${flags.many} median=${format(many.median)}ms tokens=${many.tokens} ` +
      `candidateCalls=${many.calls} callsPerToken=${manyCallsPerToken.toFixed(2)}`,
  );
  if (flags.verbose) console.log(`[perf] many samples=${many.samples.map(format).join(",")}`);

  const scaling = [];
  for (const n of [100, 200, 400]) {
    const measured = timeParse(longStatement(n), Math.max(3, Math.min(flags.reps, 5)), flags.warmup);
    scaling.push({ n, median: measured.median, tokens: measured.tokens, calls: measured.calls });
    console.log(
      `[perf] scale n=${n} median=${format(measured.median)}ms tokens=${measured.tokens} candidateCalls=${measured.calls}`,
    );
  }
  if (scaling.length === 3) {
    const first = scaling[1].median / Math.max(scaling[0].median, 0.001);
    const second = scaling[2].median / Math.max(scaling[1].median, 0.001);
    console.log(`[perf] scale ratio(200/100)=${first.toFixed(2)} ratio(400/200)=${second.toFixed(2)}（线性≈2.0；>2.5 视为退化告警，不判失败）`);
    if (first > 2.5 || second > 2.5) console.log("[perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3）");
  }
  console.log("[perf] done");
}

main();
