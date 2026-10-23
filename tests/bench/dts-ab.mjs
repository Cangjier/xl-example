// A/B：基线 build/ts 与实验 build/ts-exp（注释整段预扫描 + 驱动层跳读）。
// 只用于取证，不进入交付；跑法：node tests/bench/dts-ab.mjs
//
// buffer 契约（BUFFER-CONTRACT §1.2 / §1.6）之后：
//   - `SourceRange.Start` / `.End` 从 `Source` 对象变成 **int**（-1 = 未设置），没有 `.Index`；
//   - 两端都是**半开**区间，digest 因此印 `[StartIndex, EndIndex)`（旧版是闭区间 `[Start,End]`）。
//     digest 只用于 base vs exp 两侧互比（`sameDigest`），记号换了不影响结论。
//
// 前置：两棵编译产物 `build/ts` 与 `build/ts-exp` 都要在。缺任何一棵时本脚本给出口径说明并
// 以退出码 2 结束（「前置未满足」，不是脚本坏了）。
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

function load(tree) {
  const file = path.join(root, tree, "typescript", "run", "source-file-runner.js");
  if (!fs.existsSync(file)) return null;
  const { SourceFileRunner } = require(file);
  return SourceFileRunner;
}

const base = load("build/ts");
const exp = load("build/ts-exp");
if (!base || !exp) {
  console.error("dts-ab: 需要两棵编译产物 build/ts（基线）与 build/ts-exp（实验），当前缺失。");
  console.error(`  build/ts      : ${base ? "ok" : "缺失"}`);
  console.error(`  build/ts-exp  : ${exp ? "ok" : "缺失"}`);
  console.error("  先 `xl_build`（core,typescript）+ tsc 出 build/ts；build/ts-exp 是历史实验树，本分支没有。");
  process.exit(2);
}

const files = ["lib.dom.d.ts", "lib.es5.d.ts", "lib.es2015.core.d.ts"];

/** 半开区间记号 `[StartIndex, EndIndex)`；未设置为 -1。 */
function rangeTag(node) {
  const range = node.SourceRange || {};
  const startIndex = typeof range.StartIndex === "number" ? range.StartIndex : -1;
  const endIndex = typeof range.EndIndex === "number" ? range.EndIndex : -1;
  return `[${startIndex},${endIndex})`;
}

function digest(node, acc) {
  acc.push(`${node.constructor.name}${rangeTag(node)}`);
  if (typeof node.Tmp === "string") acc.push(node.Tmp);
  for (const child of node.Data) digest(child, acc);
  return acc;
}

function run(runner, text, name) {
  const start = process.hrtime.bigint();
  const shape = runner.Parse(text, name);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { ms, shape };
}

const median = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const rows = [];
for (const name of files) {
  const text = fs.readFileSync(path.join(root, "node_modules", "typescript", "lib", name), "utf8");
  run(base, text, name);
  run(exp, text, name);
  const a = [], b = [];
  for (let i = 0; i < 3; i++) {
    a.push(run(base, text, name).ms);
    b.push(run(exp, text, name).ms);
  }
  const da = digest(run(base, text, name).shape, []).join("|");
  const db = digest(run(exp, text, name).shape, []).join("|");
  rows.push({
    file: name,
    chars: text.length,
    baseMs: +median(a).toFixed(1),
    expMs: +median(b).toFixed(1),
    deltaPct: +(((median(b) - median(a)) / median(a)) * 100).toFixed(1),
    sameDigest: da === db,
    digestLen: da.length,
  });
}
console.log(JSON.stringify(rows, null, 2));
