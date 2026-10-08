#!/usr/bin/env node
// **普查**工具：把**还没进矩阵**的候选语料逐条交给 `node` 与 `tsrun` 各跑一遍，
// 报出每一条是 `pass` / `blocked` / `differ` / `nodefail`——**先量再收**。
//
//   node tests/coverage/sweep.mjs tmp-cand.mjs                 一份候选
//   node tests/coverage/sweep.mjs a.mjs b.mjs c.mjs            几份一起（按层分开）
//   node tests/coverage/sweep.mjs tmp-cand.mjs --json out.json 把逐条读数写成 JSON
//   node tests/coverage/sweep.mjs tmp-cand.mjs --verbose       每条一行（含没过的）
//   node tests/coverage/sweep.mjs tmp-cand.mjs --no-batch      一条一个进程（权威口径）
//
// ## 它为什么是**单独一个**工具，而不是 `run.mjs` 的一个开关
//
// `run.mjs` 量的是**矩阵**（已经收编的语料），它要求每一条都在
// 用例文件头的 `xl:want` 里**有账**——没登记的没过就是 `REGRESSION`（红）。
// 而「加宽矩阵」这件事的第一步恰好相反：**还不知道哪些会过**。
// 拿 `run.mjs` 去试，会得到一片红，而红里混着「真的坏了」与「本来就还没做」，
// 读不出东西。
//
// 所以这一条的口径是「**先量再收**」：
//
// 1. 候选写在**任何** `.mjs` 里，导出几个数组（导出的名字当**层名**用，
//    与 `cases/*.mjs` 里的写法一字不差）；
// 2. 逐条判（口径与 `run.mjs` **完全相同**：stdout 逐字节 + 退出码，
//    裁判是 `node`）——但**不写 `report.json`**、**不看台账**、**不红**；
// 3. 只留下 `pass` 的与「**值得收的**」：`nodefail` 的那几条是**用例自己不合法**
//    （裁判都跑不动，说明它不该进矩阵），`blocked` / `differ` 的照样收
//    ——**它们就是这一轮量出来的缺口**，收进矩阵 + 记进台账。
//
// 判据读的是 `build/**/*.js`：跳过 `xl build` 的话，它量的是上一版的产物
//（与 `run.mjs` / `runtime:check` 同一条规矩）。
//
// ## 跑一次要多久（**第 324 轮：40s → 3s**）
//
// **第 324 轮之前它是这一族里唯一没批的那个**：一条用例起**两个**进程，
// 而且是**同步**的 `spawnSync`——`--jobs` 形同虚设（事件循环被堵住，
// 与第 318 轮 `run.mjs` 踩过的那条**一字不差**）。87 条候选实测 **40s 上下**。
//
// **改法与 `run.mjs` 一字不差**（第 319 / 320 轮那两条路都是现成的）：
// · **被测侧** `tsrun --batch 清单.json`（一个进程跑一批，每条各自一次 `RunSources`）；
// · **裁判侧** `judge-batch.mjs`（每条 `import()` 成**自己的模块**，与 `node file.ts` 同一套 ESM 语义）；
// · 没交回结果的**按单条重跑**（批量是加速手段，不许改变判定）；
// · `--no-batch` 保留——那是**权威口径**，用来与批量那一轮逐条对拍
//   （与 `run.mjs` 同一条纪律：**不许给 coverage / sweep 加任何缓存**，
//   加速只能来自「**少起进程**」）。
// · **每个实例一个工作目录**（`.sweep-<pid>`，与 `coverage` 的 `.work-<pid>` 同一个理由：
//   两个实例同时跑时，共用的目录会被其中一个删掉，看起来像「某几条用例坏了」）。

import { spawn } from "node:child_process";
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
const useBatch = !flag("--no-batch");
const jobs = Math.max(1, Number(value("--jobs", String(Math.min(8, os.cpus().length)))));

if (files.length === 0) {
  console.log("用法：node tests/coverage/sweep.mjs <候选.mjs> [更多候选…] [--json 输出] [--only-fail] [--verbose] [--no-batch]");
  process.exit(1);
}

const tsrun = path.join(root, "build", "ts", "tsrun.js");
const workDir = path.join(here, `.sweep-${process.pid}`);
process.on("exit", () => {
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch {
    // 删不掉不是错误（下一次跑用的是新的 pid 目录）。
  }
});

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
const caseFile = (entry) => path.join(workDir, `${entry.id}.ts`);
for (const entry of entries) fs.writeFileSync(caseFile(entry), entry.src.trimEnd() + "\n", "utf8");

/** **异步**跑一个进程（第 324 轮）——`spawnSync` 会把事件循环堵住 ⇒ `--jobs` 形同虚设。 */
function runAsync(argv2) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv2, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    const out = [];
    const err = [];
    const timer = setTimeout(() => child.kill(), 30000);
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      resolve({ status, stdout: Buffer.concat(out), stderr: Buffer.concat(err) });
    });
  });
}

const firstLine = (buf) => (buf.toString("utf8").split("\n").find((line) => line.trim() !== "") || "").trim();
function firstDifference(left, right) {
  const a = left.toString("utf8").split("\n");
  const b = right.toString("utf8").split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `第 ${i + 1} 行：node «${a[i] ?? "<没有这一行>"} vs tsrun «${b[i] ?? "<没有这一行>"}»`;
  }
  return "（逐行相同——差异在行尾字节上）";
}

// ---------------------------------------------------------------------------
// 两侧都「一个进程跑一批」（口径与 `run.mjs` 的 `runOurs` / `runJudge` 一字不差）。
//
// **谁不能进批**（两条都是实测的）：
//   · **会把进程带走的**（`process.exit` / `require(`）——真出现时那一批提前结束，
//     调用方发现「某几条没交回结果」就**按单条重跑**；
//   · **裁判要额外实参的**（`--experimental-transform-types`）——按组分开批
//     （同组之内再按 `jobs` 切），不能与默认那一档混在一个进程里。
/** 一条候选能不能进裁判批：不能就返回 `null`（按单条跑）。 */
function judgeGroup(entry) {
  if (/process\.exit|require\(/.test(entry.src)) return null;
  return (entry.nodeArgs || []).join(" ");
}
const singleOnly = new Set();
for (let i = 0; i < entries.length; i++) if (judgeGroup(entries[i]) === null) singleOnly.add(i);

/** 轮转分成 `jobs` 批（长的短的混在一起）。 */
function rotate(indices) {
  const count = Math.max(1, Math.min(jobs, indices.length));
  const groups = Array.from({ length: count }, () => []);
  for (let i = 0; i < indices.length; i++) groups[i % count].push(indices[i]);
  return groups.filter((group) => group.length > 0);
}

/** 把一批的 stdout 解析成 `Map<全局下标, {status, stdout, stderr}>`。 */
function collect(stdout, indices) {
  const found = new Map();
  for (const line of stdout.toString("utf8").split("\n")) {
    if (line.trim() === "" || line.startsWith('{"begin"')) continue;
    let record = null;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record === null || record.id === undefined) continue;
    found.set(indices[Number(record.id)], {
      status: record.status,
      stdout: Buffer.from(record.stdout, "utf8"),
      stderr: Buffer.from(record.stderr, "utf8"),
    });
  }
  return found;
}

/** 跑一批被测：清单里每条各自一次 `RunSources`（新的机器、新的表）。 */
async function runOursBatch(indices) {
  const manifestPath = path.join(workDir, `ours-${indices[0]}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(indices.map((index, at) => ({
    id: String(at),
    path: caseFile(entries[index]),
  }))), "utf8");
  const out = await runAsync([tsrun, "--batch", manifestPath]);
  return collect(out.stdout, indices);
}

/** 跑一批裁判：每条 `import()` 成自己的模块（与 `node file.ts` 同一套 ESM 语义）。 */
async function runJudgeBatch(indices, nodeArgs) {
  const manifestPath = path.join(workDir, `judge-${indices[0]}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(indices.map((index, at) => ({
    id: String(at),
    path: caseFile(entries[index]),
  }))), "utf8");
  const out = await runAsync([...nodeArgs, path.join(here, "judge-batch.mjs"), manifestPath]);
  return collect(out.stdout, indices);
}

/** 通用并发池：把若干「跑一批」的任务并行跑掉（`jobs` 是**进程数**）。 */
async function pool(tasks) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, Math.max(1, tasks.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= tasks.length) return;
      await tasks[index]();
    }
  }));
}

const single = [...singleOnly];
const batchable = entries.map((_, i) => i).filter((i) => !singleOnly.has(i));

/** 每一条的裁判结果（先批、缺的按单条补）。 */
async function runJudge() {
  const oracle = new Array(entries.length);
  if (!useBatch) {
    let at = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, entries.length) }, async () => {
      for (;;) {
        const index = at++;
        if (index >= entries.length) return;
        oracle[index] = await runAsync([...(entries[index].nodeArgs || []), caseFile(entries[index])]);
      }
    }));
    return oracle;
  }
  // **按裁判组分开批**（`--experimental-transform-types` 那一档不能与默认档混）。
  const groups = new Map();
  for (const index of batchable) {
    const key = judgeGroup(entries[index]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  }
  const tasks = [];
  for (const [key, indices] of groups) {
    for (const slice of rotate(indices)) tasks.push(async () => {
      const found = await runJudgeBatch(slice, key === "" ? [] : key.split(" "));
      for (const [index, record] of found) oracle[index] = record;
    });
  }
  const batched = [...groups.values()].reduce((sum, list) => sum + list.length, 0);
  console.log(`裁判：${tasks.length} 个进程跑 ${batched} 条、另有 ${single.length} 条按单条跑`);
  await pool(tasks);
  const missing = [];
  for (let i = 0; i < entries.length; i++) if (oracle[i] === undefined) missing.push(i);
  if (missing.length > 0) {
    console.log(`（裁判批里有 ${missing.length} 条没交回结果：按单条重跑）`);
    let at = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, missing.length) }, async () => {
      for (;;) {
        const slot = at++;
        if (slot >= missing.length) return;
        const index = missing[slot];
        oracle[index] = await runAsync([...(entries[index].nodeArgs || []), caseFile(entries[index])]);
      }
    }));
  }
  return oracle;
}

/** 每一条的被测结果（先批、缺的按单条补）。 */
async function runOurs() {
  const ours = new Array(entries.length);
  if (!useBatch) {
    let at = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, entries.length) }, async () => {
      for (;;) {
        const index = at++;
        if (index >= entries.length) return;
        ours[index] = await runAsync([tsrun, caseFile(entries[index])]);
      }
    }));
    return ours;
  }
  // **`process.exit` 那几条不与被测批同流**：它们会把整个批带走（按单条跑）。
  const batches = rotate(batchable);
  const tasks = batches.map((slice) => async () => {
    const found = await runOursBatch(slice);
    for (const [index, record] of found) ours[index] = record;
  });
  const batched = batches.reduce((sum, slice) => sum + slice.length, 0);
  console.log(`被测：${batches.length} 个进程跑 ${batched} 条、另有 ${single.length} 条按单条跑`);
  await pool(tasks);
  const missing = [];
  for (let i = 0; i < entries.length; i++) if (ours[i] === undefined) missing.push(i);
  if (missing.length > 0) {
    console.log(`（被测批里有 ${missing.length} 条没交回结果：按单条重跑）`);
    let at = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, missing.length) }, async () => {
      for (;;) {
        const slot = at++;
        if (slot >= missing.length) return;
        const index = missing[slot];
        ours[index] = await runAsync([tsrun, caseFile(entries[index])]);
      }
    }));
  }
  return ours;
}

// 与 `run.mjs` 的判决同一个形状，只是**不看台账**。
function judge(entry, oracle, ours) {
  if (oracle.status !== 0 && !entry.nodeMayFail) {
    return { actual: "nodefail", detail: `node 自己跑不动：${firstLine(oracle.stderr).slice(0, 140)}` };
  }
  if (oracle.stdout.length === 0) {
    return { actual: "nodefail", detail: "node 一行都没打印（候选不合格：不打印的通过等于没验）" };
  }
  const mine = firstLine(ours.stderr);
  if (ours.stdout.length === 0 && ours.status !== 0) {
    return { actual: "blocked", detail: mine.slice(0, 140) };
  }
  if (ours.status !== oracle.status) {
    return { actual: "differ", detail: `退出码 node=${oracle.status} tsrun=${ours.status}${mine ? `｜${mine.slice(0, 110)}` : ""}` };
  }
  if (Buffer.compare(oracle.stdout, ours.stdout) !== 0) {
    return { actual: "differ", detail: `stdout 不同：${firstDifference(oracle.stdout, ours.stdout)}` };
  }
  return { actual: "pass", detail: "" };
}

const startedAll = process.hrtime.bigint();
const oursAll = await runOurs();
const oursMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
const judgeStarted = process.hrtime.bigint();
const oracleAll = await runJudge();
const judgeMs = Number(process.hrtime.bigint() - judgeStarted) / 1e6;
console.log(`被测侧 ${(oursMs / 1000).toFixed(1)}s、裁判侧 ${(judgeMs / 1000).toFixed(1)}s`);

const results = new Array(entries.length);
for (let i = 0; i < entries.length; i++) {
  results[i] = { entry: entries[i], ...judge(entries[i], oracleAll[i], oursAll[i]) };
}

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
console.log("**收编的办法**：`pass` 的照原样进矩阵；`blocked` / `differ` 的也进，"
  + "同时把 `xl:want` / `xl:why` 写进那一条用例的文件头（写清**根子**，不是抄 stderr）；"
  + "`nodefail` 的**不要进**（裁判都跑不动 = 用例自己不合法，"
  + "要留就用 `skip` 记成「口径外」）。");
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
    console.log(`${result.actual.padEnd(9)} ${result.entry.id.padEnd(36)}`);
  }
}

if (jsonOut !== "") {
  const summary = {
    total,
    passed: tally.pass,
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
