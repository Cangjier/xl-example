#!/usr/bin/env node
// **普查**工具：把**还没进矩阵**的候选语料逐条交给 `node` 与 `tsrun` 各跑一遍，
// 报出每一条是 `pass` / `blocked` / `differ` / `nodefail`——**先量再收**。
//
//   node tests/coverage/sweep.mjs tmp-cand.mjs                 一份候选
//   node tests/coverage/sweep.mjs a.mjs b.mjs c.mjs            几份一起（按层分开）
//   node tests/coverage/sweep.mjs tmp-cand.mjs --json out.json 把逐条读数写成 JSON
//   node tests/coverage/sweep.mjs tmp-cand.mjs --verbose       每条一行（含没过的）
//
// ## 它为什么是**单独一个**工具，而不是 `run.mjs` 的一个开关
//
// `run.mjs` 量的是**矩阵**（已经收编的语料 ✓），它要求每一条都在
// `expectations.mjs` 里**有账** ✓——没登记的没过就是 `REGRESSION`（红 ✓）。
// 而「加宽矩阵」这件事的第一步恰好相反 ✓：**还不知道哪些会过** ✗。
// 拿 `run.mjs` 去试，会得到一片红 ✗，而红里混着「真的坏了」与「本来就还没做」✓，
// 读不出东西 ✗。
//
// 所以这一条的口径是「**先量再收**」✓：
//
// 1. 候选写在**任何** `.mjs` 里 ✓，导出几个数组 ✓（导出的名字当**层名**用 ✓，
//    与 `cases/*.mjs` 里的写法一字不差 ✓）；
// 2. 逐条判（口径与 `run.mjs` **完全相同** ✓：stdout 逐字节 + 退出码 ✓，
//    裁判是 `node` ✓）——但**不写 `report.json`** ✓、**不看台账** ✓、**不红** ✓；
// 3. 只留下 `pass` 的与「**值得收的**」✗：`nodefail` 的那几条是**用例自己不合法** ✗
//    （裁判都跑不动 ✓，说明它不该进矩阵 ✓），`blocked` / `differ` 的照样收 ✓
//    ——**它们就是这一轮量出来的缺口** ✓，收进矩阵 + 记进台账 ✓。
//
// 判据读的是 `build/**/*.js` ✓：跳过 `xl build` 的话，它量的是上一版的产物 ✗
//（与 `run.mjs` / `runtime:check` 同一条规矩 ✓）。

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = "") => {
  const at = argv.indexOf(name);
  return at >= 0 && at + 1 < argv.length ? argv[at + 1] : fallback;
};
const files = argv.filter((a) => !a.startsWith("--") && a !== value("--json", "\u0000") && a !== value("--jobs", "\u0000"));
const jsonOut = value("--json");
const verbose = flag("--verbose");
const jobs = Math.max(1, Number(value("--jobs", String(Math.min(8, os.cpus().length)))));

if (files.length === 0) {
  console.log("用法：node tests/coverage/sweep.mjs <候选.mjs> [更多候选…] [--json 输出] [--only-fail] [--verbose]");
  process.exit(1);
}

const tsrun = path.join(root, "build", "ts", "tsrun.js");
const workDir = path.join(here, ".sweep");

// 候选文件的形状与 `cases/*.mjs` 相同：导出几个数组，导出的名字就是层名。
const entries = [];
for (const file of files) {
  const resolved = path.resolve(root, file);
  if (!fs.existsSync(resolved)) {
    console.log(`候选文件不存在：${file}`);
    process.exit(1);
  }
  const mod = await import(pathToFileURL(resolved).href);
  let taken = 0;
  for (const [name, list] of Object.entries(mod)) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      if (typeof entry?.id !== "string" || typeof entry?.src !== "string") {
        console.log(`候选 ${file} 的 ${name} 里有一条既没有 id 也没有 src`);
        process.exit(1);
      }
      entries.push({ ...entry, layer: name, from: file });
      taken += 1;
    }
  }
  console.log(`读入 ${file}：${taken} 条`);
}
if (entries.length === 0) {
  console.log("候选是空的：每个导出数组里至少要有一条 { id, title, src }");
  process.exit(1);
}
const seen = new Set();
for (const entry of entries) {
  if (seen.has(entry.id)) {
    console.log(`候选里 id 撞车：${entry.id}（收编之前先改名）`);
    process.exit(1);
  }
  seen.add(entry.id);
}

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

function run(argv2) {
  const started = process.hrtime.bigint();
  const result = spawnSync(process.execPath, argv2, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30000,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, ms: Number(process.hrtime.bigint() - started) / 1e6 };
}
const firstLine = (buf) => (buf.toString("utf8").split("\n").find((line) => line.trim() !== "") || "").trim();
function firstDifference(left, right) {
  const a = left.toString("utf8").split("\n");
  const b = right.toString("utf8").split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `第 ${i + 1} 行：node «${a[i] ?? "<没有这一行>"}» vs tsrun «${b[i] ?? "<没有这一行>"}»`;
  }
  return "（逐行相同——差异在行尾字节上）";
}

// 与 `run.mjs` 的 `judge` 同一个判决，只是**不看台账**。
function judge(entry) {
  const file = path.join(workDir, `${entry.id}.ts`);
  fs.writeFileSync(file, entry.src.trimEnd() + "\n", "utf8");
  const oracle = run([...(entry.nodeArgs || []), file]);
  if (oracle.status !== 0 && !entry.nodeMayFail) {
    return { actual: "nodefail", detail: `node 自己跑不动：${firstLine(oracle.stderr).slice(0, 140)}` };
  }
  if (oracle.stdout.length === 0) {
    return { actual: "nodefail", detail: "node 一行都没打印（候选不合格：不打印的通过等于没验）" };
  }
  const ours = run([tsrun, file]);
  const mine = firstLine(ours.stderr);
  if (ours.stdout.length === 0 && ours.status !== 0) {
    return { actual: "blocked", detail: mine.slice(0, 140), oracle, ours };
  }
  if (ours.status !== oracle.status) {
    return { actual: "differ", detail: `退出码 node=${oracle.status} tsrun=${ours.status}${mine ? `｜${mine.slice(0, 110)}` : ""}`, oracle, ours };
  }
  if (Buffer.compare(oracle.stdout, ours.stdout) !== 0) {
    return { actual: "differ", detail: `stdout 不同：${firstDifference(oracle.stdout, ours.stdout)}`, oracle, ours };
  }
  return { actual: "pass", detail: "", oracle, ours };
}

const results = new Array(entries.length);
let cursor = 0;
await Promise.all(Array.from({ length: Math.min(jobs, entries.length) }, async () => {
  for (;;) {
    const index = cursor++;
    if (index >= entries.length) return;
    const entry = entries[index];
    try {
      results[index] = { entry, ...judge(entry) };
    } catch (error) {
      results[index] = { entry, actual: "nodefail", detail: `跑不起来：${error.message}` };
    }
  }
}));

const buckets = new Map();
for (const result of results) {
  const bucket = buckets.get(result.entry.layer) || { layer: result.entry.layer, total: 0, pass: 0, blocked: 0, differ: 0, nodefail: 0 };
  bucket.total += 1;
  bucket[result.actual] += 1;
  buckets.set(result.entry.layer, bucket);
}
console.log("");
console.log("层           总   pass  blocked differ  bad");
for (const bucket of buckets.values()) {
  console.log(`${bucket.layer.padEnd(12)}${String(bucket.total).padStart(3)}  ${String(bucket.pass).padStart(4)}  `
    + `${String(bucket.blocked).padStart(6)}  ${String(bucket.differ).padStart(5)}  ${String(bucket.nodefail).padStart(4)}`);
}
const total = results.length;
const tally = { pass: 0, blocked: 0, differ: 0, nodefail: 0 };
for (const result of results) tally[result.actual] += 1;
console.log(`合计 ${total} 条：pass ${tally.pass}、blocked ${tally.blocked}、differ ${tally.differ}、nodefail ${tally.nodefail}`);
console.log("");
console.log("**收编的办法**：`pass` 的照原样进矩阵 ✓；`blocked` / `differ` 的也进 ✓，"
  + "同时往 `expectations.mjs` 记一行（写清**根子**，不是抄 stderr）✓；"
  + "`nodefail` 的**不要进** ✗（裁判都跑不动 = 用例自己不合法 ✓，"
  + "要留就用 `skip` 记成「口径外」✓）。");
console.log("");

const bad = results.filter((r) => r.actual !== "pass");
if (bad.length > 0) {
  console.log(`没过的那 ${bad.length} 条：`);
  for (const result of bad) {
    console.log(`  ${result.actual.toUpperCase().padEnd(9)} ${result.entry.layer.padEnd(8)} ${result.entry.id.padEnd(36)} ${result.detail}`);
  }
}
if (verbose) {
  console.log("");
  for (const result of results) {
    console.log(`${result.actual.padEnd(9)} ${result.entry.id.padEnd(36)} ${(result.ms ?? 0).toFixed(0).padStart(5)} ms`);
  }
}

if (jsonOut !== "") {
  const summary = {
    total,
    passed,
    layers: [...buckets.values()],
    results: results.map((r) => ({
      id: r.entry.id,
      layer: r.entry.layer,
      title: r.entry.title,
      actual: r.actual,
      detail: r.detail,
    })),
  };
  fs.writeFileSync(path.resolve(root, jsonOut), JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(`\n逐条读数已写：${jsonOut}`);
}
console.log(`\n（这次普查跑在 ${path.relative(root, workDir)} 下，产物不进仓）`);
