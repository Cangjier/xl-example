#!/usr/bin/env node
// 判据：**场景覆盖度**——exec（降级层）/ runtime（引擎）/ 标准库（builtins）/ 端到端。
//
//   node tests/coverage/run.mjs                     全矩阵 + 覆盖度报告
//   node tests/coverage/run.mjs --layer stdlib      只跑一层
//   node tests/coverage/run.mjs --filter array-map  只跑 id 里带这个子串的
//   node tests/coverage/run.mjs --list              只列 id（一层一行）
//   node tests/coverage/run.mjs --verbose           连 stderr 第一行与耗时都打出来
//   node tests/coverage/run.mjs --strict            只要有一条不是 pass 就红
//   node tests/coverage/run.mjs --no-report         不写 report.json
//
// ## 这条判据的口径（写在这里，因为它就是全部）
//
// 1. **一条用例 = 一个场景**：`matrix.mjs` 里一条 `{ id, title, src }`，
//    就是「普通 `.ts` 里会出现的一种写法」。判据把它**写成真的 `.ts` 文件**，
//    分别交给 `node` 与 `tsrun`，比 **stdout 逐字节 + 退出码**（口径与 `runtime:cli` 同）。
// 2. **裁判是真 Node**：与 `runtime:cli` 同一条纪律——两个进程、两条完整链路、中间没有打桩。
//    `expect: "blocked"` 的那几条**不是免检**：它们照样每次真跑，只是「现在过不了」被记在账上。
// 3. **覆盖度 = pass / 矩阵条数**（按层加权）——这是**唯一**的进度读数，
//    其余百分比（README 里那些估计）都是折算，不是读数。
// 4. **每一条都必须有 stdout**：什么都不打印的「通过」等于什么都没验（判据自己拦）。
// 5. **`expect` 是台账**：`"pass"` 的那条一旦过不了 ⇒ **REGRESSION**（红）；
//    `"blocked"` 的那条（被修好了）⇒ **NEWLY-PASSING**（绿，并提示去改台账）。
//    也就是说：**红只红在「比昨天差」**，不红在「还差多少」。
// 6. **产物新鲜度**：规范比产物新就直接红（与 `runtime:check` / `runtime:cli` 同一条规矩）。
// 7. **`nodeArgs`**：默认裁判是 `node <file>`（TypeScript 的类型剥离）；
//    `enum` / `namespace` 这类**有运行期语义**的 TS 语法，类型剥离会拒收，
//    所以那几条显式给 `nodeArgs: ["--experimental-transform-types"]`（写在 `matrix.mjs` 里）。
//
// 判据读的是 `build/**/*.js`——**跳过 `xl build` 的话，它量的是上一版的产物**。

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LAYER_ORDER, LAYER_WEIGHTS, MATRIX } from "./matrix.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = "") => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const listOnly = flag("--list");
const verbose = flag("--verbose");
const strict = flag("--strict");
const writeReport = !flag("--no-report");
const layerFilter = value("--layer");
const idFilter = value("--filter");
const jobs = Math.max(1, Number(value("--jobs", String(Math.min(8, os.cpus().length)))));

const tsrun = path.join(root, "build", "ts", "tsrun.js");
const workDir = path.join(here, ".work");
const reportPath = path.join(here, "report.json");

/** 第 6 条：规范 → `dist/ts` → `build/ts`，任何一环陈旧都直接红。 */
function checkFreshness() {
  const specs = [path.join(root, "tsrun.xl.md")];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".xl.md")) specs.push(full);
    }
  };
  for (const dir of ["runtime", "typescript-exec", "typescript", "core"]) walk(path.join(root, dir));
  const stale = [];
  for (const spec of specs) {
    const rel = path.relative(root, spec);
    const generated = path.join(root, "dist", "ts", rel.replace(/\.xl\.md$/, ".ts"));
    const built = path.join(root, "build", "ts", rel.replace(/\.xl\.md$/, ".js"));
    if (!fs.existsSync(generated)) {
      stale.push(`${rel} → 还没有产物，跑 xl_build --force`);
      continue;
    }
    if (fs.statSync(spec).mtimeMs > fs.statSync(generated).mtimeMs) {
      stale.push(`${rel} 比产物新 → 跑 xl_build --force`);
    }
    if (!fs.existsSync(built) || fs.statSync(generated).mtimeMs > fs.statSync(built).mtimeMs) {
      stale.push(`dist/ts/${rel.replace(/\.xl\.md$/, ".ts")} → 还没跑 npm run compile`);
    }
  }
  if (stale.length > 0) {
    console.log("产物不是最新的，先跑 xl_build --force（插件工具）与 npm run compile：");
    for (const line of stale.slice(0, 12)) console.log(`  ${line}`);
    if (stale.length > 12) console.log(`  （还有 ${stale.length - 12} 条）`);
    process.exit(1);
  }
}

const hits = MATRIX.filter((entry) => (layerFilter === "" || entry.layer === layerFilter)
  && (idFilter === "" || entry.id.includes(idFilter)));
const selected = hits.filter((entry) => !entry.skip);
const skipped = hits.filter((entry) => entry.skip);

if (hits.length === 0) {
  console.log(layerFilter === "" && idFilter === ""
    ? "矩阵是空的：tests/coverage/matrix.mjs 一条都没有"
    : `没有命中的用例（--layer ${layerFilter} --filter ${idFilter}）`);
  process.exit(1);
}
if (listOnly) {
  for (const entry of selected) console.log(`${entry.layer.padEnd(8)} ${entry.id}`);
  for (const entry of skipped) console.log(`${entry.layer.padEnd(8)} ${entry.id}  （口径外）`);
  process.exit(0);
}

checkFreshness();
// **同一时刻只许有一个实例** ✓（第 319 轮加 ✗，因为我自己踩过一次 ✓）：
// 这一趟开头会 `rm -rf` 那个工作目录 ✓，两个实例撞在一起时，
// 先跑的那一个会开始报「**找不到输入文件**」✗——那看起来像**三条回归** ✓，
// 其实是**另一个进程把它的文件删了** ✗（实测：三条 `stdlib` 被记成 REGRESSION ✓，
// 而它们一个字节都没变 ✓）。**响亮地说出来**比事后看三条假回归便宜得多 ✓。
const lockPath = path.join(here, ".lock");
if (fs.existsSync(lockPath)) {
  const holder = Number(fs.readFileSync(lockPath, "utf8").trim());
  let alive = false;
  if (Number.isFinite(holder) && holder > 0) {
    try {
      process.kill(holder, 0);
      alive = true;
    } catch {
      alive = false;
    }
  }
  if (alive) {
    console.log(`另一个 coverage 正在跑（pid ${holder}）——两个实例会互相删工作目录 ✗，先等它跑完 ✓`);
    process.exit(1);
  }
  // **拿着锁的进程已经没了** ✓：那是上一次崩掉留下的 ✓，直接接管 ✓。
}
fs.writeFileSync(lockPath, String(process.pid), "utf8");
const releaseLock = () => {
  try {
    if (fs.existsSync(lockPath) && Number(fs.readFileSync(lockPath, "utf8").trim()) === process.pid) {
      fs.rmSync(lockPath, { force: true });
    }
  } catch {
    // 放不掉锁**不是错误** ✓（下次那一句「拿着锁的进程还在不在」会判出来 ✓）。
  }
};
process.on("exit", releaseLock);
process.on("SIGINT", () => {
  releaseLock();
  process.exit(130);
});
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

/** 跑一个进程，拿 `{ status, stdout, stderr }`（stdout 是**字节**，好逐字节比）。 */
function run(argv, elapsedOut) {
  const started = process.hrtime.bigint();
  const result = spawnSync(process.execPath, argv, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30000,
  });
  if (elapsedOut) elapsedOut.ms = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/**
 * **异步**跑一个进程（第 318 轮 ✓）——并发池真正并行起来靠的就是它 ✗。
 *
 * **为什么非改不可** ✗：原来那一个是 `spawnSync` ✓，而它是**同步**的 ✓——
 * 它一进去就把整个事件循环**堵住** ✓ ⇒ 那 8 个「并发」worker 一个接一个地跑 ✓
 * ⇒ **`--jobs` 形同虚设** ✗（用户实测：CPU 只有 12% ✓、`--jobs 8` 与 `--jobs 16`
 * 只差 6 秒 ✓——两件事都是这一条造成的 ✓）。
 * 换成 `spawn` + Promise 之后，同一时刻真的有 8 个 `node` 在跑 ✓。
 */
function runAsync(argv) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = [];
    const err = [];
    const timer = setTimeout(() => {
      child.kill();
    }, 30000);
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

/** 第一条不同的行（对拍失败时给人看的那一眼）。 */
function firstDifference(left, right) {
  const a = left.toString("utf8").split("\n");
  const b = right.toString("utf8").split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `第 ${i + 1} 行：node «${a[i] === undefined ? "<没有这一行>" : a[i]}» vs tsrun «${b[i] === undefined ? "<没有这一行>" : b[i]}»`;
    }
  }
  return "（逐行相同——差异在行尾字节上）";
}

/** 跑一条用例，给出 `{ actual, detail, stderr }`；`actual` 是 `pass|differ|blocked|nodefail`。 */
async function judge(entry) {
  const file = caseFile(entry);
  fs.writeFileSync(file, entry.src.trimEnd() + "\n", "utf8");
  const oracle = await judgeOnce(entry, file);
  const ours = await runAsync([tsrun, file]);
  return verdictOf(entry, oracle, ours);
}

/** 判定一条：把「裁判那一对」与「被测那一对」比出结论（第 319 轮抽出来 ✓）。 */
function verdictOf(entry, oracle, ours) {
  const elapsed = 0;
  const mine = ours.stderr.toString("utf8").split("\n").find((line) => line.trim() !== "") || "";
  // `nodeMayFail`：这一条**本来就是**「两边都非零退出」那一档（`exc-uncaught-exit-code`）——
  // 裁判非零退出不算用例坏，只是**退出码也要对得上**。
  if (oracle.status !== 0 && !entry.nodeMayFail) {
    const first = oracle.stderr.toString("utf8").split("\n").find((line) => line.trim() !== "") || "";
    return { actual: "nodefail", detail: `node 自己跑不动：${first.trim().slice(0, 120)}`, elapsed };
  }
  if (oracle.stdout.length === 0) {
    return { actual: "nodefail", detail: "node 一行都没打印（用例不合格：不打印的通过等于没验）", elapsed };
  }
  if (ours.stdout.length === 0 && ours.status !== 0) {
    return { actual: "blocked", detail: mine.trim().slice(0, 120), elapsed };
  }
  if (ours.status !== oracle.status) {
    return {
      actual: "differ",
      detail: `退出码 node=${oracle.status} tsrun=${ours.status}${mine ? `｜${mine.trim().slice(0, 90)}` : ""}`,
      elapsed,
    };
  }
  if (Buffer.compare(oracle.stdout, ours.stdout) !== 0) {
    return { actual: "differ", detail: `stdout 不同：${firstDifference(oracle.stdout, ours.stdout)}`, elapsed };
  }
  return { actual: "pass", detail: "", elapsed };
}

// ---------------------------------------------------------------------------
// **裁判那一半的缓存**（第 318 轮加，用户口径：「coverage 每次十分钟太慢」）。
//
// **先量出来的事实** ✗：一条用例要起**两个** `node` 进程 ✓（裁判 `node file.ts` ✓、
// 被测 `tsrun file.ts` ✓）——实测裁判 ~204ms ✓、被测 ~265ms ✓、裸 `node -e 0` 130ms ✓
// ——**时间几乎全在进程启动上** ✓（1110 条 × ~0.47s ≈ 520s ✓，与实测 600s 对得上 ✓）。
// 所以「加并行」没用 ✗（实测 `--jobs 16` 与 `--jobs 8` 只差 6s ✓：瓶颈是 Windows 的
// 进程创建 ✓，不是 CPU ✓）；**能省的是「把裁判那一趟去掉」** ✓——它是**同一份源码
// 交给 node 的确定结果** ✓，与 `tsrun` 那一侧无关 ✓。
//
// **不许省的情形** ✓（保守到「宁可多跑」✗）：源码里出现**非确定**来源时一律不缓存 ✓
//（`Date.now` / `new Date()` 无参 / `Math.random` / `performance.now` / `process.hrtime` ✓）
// ——那些用例每次的 stdout 本来就该不同 ✓，缓存下来就是**拿旧答案判今天的题** ✗。
// 键里还带上**裁判的 node 版本** ✓（换 node 就是换裁判 ✓）与 `nodeArgs` ✓。
//
// **它不改变任何判定** ✓：命中时用的就是**同一趟跑出来的** stdout / 退出码 ✓，
// 只是那一趟是**上一次**跑的 ✓。要关掉它：`--no-judge-cache` ✓（或删掉那个文件 ✓）。
const judgeCachePath = path.join(here, ".judge-cache.json");
const noJudgeCache = flag("--no-judge-cache");
const JUDGE_CACHE_VERSION = 1;
let judgeCache = { version: JUDGE_CACHE_VERSION, node: process.version, entries: {} };
let judgeCacheHits = 0;
let judgeCacheMisses = 0;
if (!noJudgeCache && fs.existsSync(judgeCachePath)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(judgeCachePath, "utf8"));
    if (loaded && loaded.version === JUDGE_CACHE_VERSION && loaded.node === process.version) {
      judgeCache = loaded;
    }
  } catch {
    // 坏掉的缓存**不是错误** ✓：重新攒一份 ✓（它只是加速用的 ✓）。
  }
}
/** 这一份源码可不可以缓存（非确定来源就不行）。 */
function cacheable(entry) {
  if (noJudgeCache) return false;
  return !/(Date\.now|new Date\(\s*\)|Math\.random|performance\.now|process\.hrtime)/.test(entry.src);
}
/** 缓存键：源码 + 裁判参数（node 版本在文件的头上 ✓）。 */
function judgeKey(entry) {
  const hash = createHash("sha256").update(entry.src.trimEnd()).digest("hex").slice(0, 32);
  return `${hash}|${(entry.nodeArgs || []).join(" ")}`;
}
/** 裁判那一趟：有缓存就用缓存 ✓，没有就真跑一趟 ✓并且记下来 ✓。 */
async function judgeOnce(entry, file) {
  const usable = cacheable(entry);
  const key = usable ? judgeKey(entry) : "";
  if (usable) {
    const hit = judgeCache.entries[key];
    if (hit !== undefined) {
      judgeCacheHits += 1;
      return {
        status: hit.status,
        stdout: Buffer.from(hit.stdout, "base64"),
        stderr: Buffer.from(hit.stderr, "base64"),
      };
    }
    judgeCacheMisses += 1;
  }
  const oracle = await runAsync([...(entry.nodeArgs || []), file]);
  if (usable) {
    judgeCache.entries[key] = {
      status: oracle.status,
      stdout: oracle.stdout.toString("base64"),
      stderr: oracle.stderr.toString("base64"),
    };
  }
  return oracle;
}

// ---------------------------------------------------------------------------
// **被测侧：一个进程跑一批**（第 319 轮加，用户口径：「一次 tsrun（一个进程跑多个 case），
// 同时起 CPU 核心数那么多个」）。
//
// **为什么** ✗：裁判那一半已经缓存了 ✓，剩下的全在**被测侧**——1111 条就是 1111 次
// `node` 启动 ✓（~265ms 里大半是启动 ✓）。`tsrun --batch 清单` 让**一个进程**跑一整批 ✓
// ⇒ 启动次数从「条数」降到「批数」✓（16 批就是 16 次 ✓）。
//
// **批与批并行** ✓：`--jobs`（默认 `min(核数, 16)` ✓）就是**进程数** ✓——
// 这正是用户要的那个形状 ✓。
//
// **每条用例仍然是独立的** ✗：清单里每一条各自一次 `RunSources` ✓（新的机器、新的表 ✓），
// 与「一条一个进程」**同一个入口** ✓ ⇒ 语义没变 ✓、读数没变 ✓（唯一的差别是 stdout 被
// 逐条捕获 ✓，见 `tsrun.xl.md` 的 `RunBatch` ✓）。
//
// **兜底** ✓：某一条没出现在记录里（整批崩了 / 那条自己把进程带崩了 ✓）⇒
// **按单条重跑那一条** ✓——批量是加速手段，不许改变任何一条的判定 ✓。
const useBatch = !flag("--no-batch");
const manifestsDir = path.join(workDir, "manifests");
fs.mkdirSync(manifestsDir, { recursive: true });

/** 把选中的用例铺成 `jobs` 批（轮转分，长的短的混在一起 ✓）。 */
function makeBatches() {
  const batchCount = Math.max(1, Math.min(jobs, selected.length));
  const groups = Array.from({ length: batchCount }, () => []);
  for (let i = 0; i < selected.length; i++) groups[i % batchCount].push(i);
  return groups;
}

/** 跑一批：返回 `Map<index, {status, stdout, stderr}>`（缺的就是没跑出来的 ✓）。 */
async function runBatchProcess(indices) {
  const manifestPath = path.join(manifestsDir, `batch-${indices[0]}.json`);
  const items = indices.map((index) => ({
    id: String(index),
    path: caseFile(selected[index]),
  }));
  fs.writeFileSync(manifestPath, JSON.stringify(items), "utf8");
  const out = await runAsync([tsrun, "--batch", manifestPath]);
  const found = new Map();
  for (const line of out.stdout.toString("utf8").split("\n")) {
    if (line.trim() === "" || line.startsWith('{"begin"')) continue;
    let record = null;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record === null || record.id === undefined) continue;
    found.set(Number(record.id), {
      status: record.status,
      stdout: Buffer.from(record.stdout, "utf8"),
      stderr: Buffer.from(record.stderr, "utf8"),
    });
  }
  return found;
}

/** 被测侧的结果：先跑批 ✓，缺的按单条补 ✓。 */
async function runOurs() {
  const ours = new Array(selected.length);
  if (!useBatch) {
    const pool = async (itemsArray, run) => {
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(jobs, itemsArray.length) }, async () => {
          for (;;) {
            const index = cursor++;
            if (index >= itemsArray.length) return;
            await run(itemsArray[index]);
          }
        }),
      );
    };
    await pool(
      selected.map((_, i) => i),
      async (index) => {
        ours[index] = await runAsync([tsrun, caseFile(selected[index])]);
      },
    );
    return ours;
  }
  const batches = makeBatches();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(jobs, batches.length) }, async () => {
      for (;;) {
        const index = cursor++;
        if (index >= batches.length) return;
        const found = await runBatchProcess(batches[index]);
        for (const [caseIndex, record] of found) ours[caseIndex] = record;
      }
    }),
  );
  // **没跑出来的按单条补** ✓（批量是加速手段，不许改变判定 ✓）。
  const missing = [];
  for (let i = 0; i < ours.length; i++) if (ours[i] === undefined) missing.push(i);
  if (missing.length > 0) {
    console.log(`（批里有 ${missing.length} 条没交回结果：按单条重跑 ✓）`);
    let at = 0;
    await Promise.all(
      Array.from({ length: Math.min(jobs, missing.length) }, async () => {
        for (;;) {
          const slot = at++;
          if (slot >= missing.length) return;
          const index = missing[slot];
          ours[index] = await runAsync([tsrun, caseFile(selected[index])]);
        }
      }),
    );
  }
  return ours;
}

/** 一条用例的源码落在哪儿（批量与单条两条路都用它 ✓）。 */
function caseFile(entry) {
  return path.join(workDir, `${entry.id}.ts`);
}

// 一个很小的并发池：用例是**两个真进程**，串行跑一条要几百毫秒。
const results = new Array(selected.length);
for (const entry of selected) {
  fs.writeFileSync(caseFile(entry), entry.src.trimEnd() + "\n", "utf8");
}
const startedAll = process.hrtime.bigint();
const oursAll = await runOurs();
const oursMs = Number(process.hrtime.bigint() - startedAll) / 1e6;

let cursor = 0;
const workers = Array.from({ length: Math.min(jobs, selected.length) }, async () => {
  for (;;) {
    const index = cursor++;
    if (index >= selected.length) return;
    const entry = selected[index];
    const started = process.hrtime.bigint();
    let outcome;
    try {
      const oracle = await judgeOnce(entry, caseFile(entry));
      outcome = verdictOf(entry, oracle, oursAll[index]);
    } catch (error) {
      outcome = { actual: "nodefail", detail: `跑不起来：${error.message}`, elapsed: 0 };
    }
    outcome.ms = Number(process.hrtime.bigint() - started) / 1e6;
    results[index] = { entry, ...outcome };
  }
});
await Promise.all(workers);

const expectation = (entry) => entry.expect || "pass";
let red = 0;

const layers = new Map();
for (const result of results) {
  const { entry, actual } = result;
  const want = expectation(entry);
  if (actual === "pass") result.verdict = want === "pass" ? "ok" : "NEWLY-PASSING";
  else if (actual === "nodefail") result.verdict = "BAD-CASE";
  else if (want === actual) result.verdict = "known";
  // 台账记「进不了门」、现在「跑得出来但不对」= **进了门**，是进步（不是倒退）：
  // 单独报 **MOVED**，提醒把台账那一行改掉。
  else if (want === "blocked" && actual === "differ") result.verdict = "MOVED";
  else result.verdict = "REGRESSION";
  if (result.verdict === "REGRESSION" || result.verdict === "BAD-CASE") red += 1;

  const bucket = layers.get(entry.layer) || { layer: entry.layer, total: 0, weight: 0, pass: 0, blocked: 0, differ: 0, nodefail: 0 };
  bucket.total += 1;
  bucket.weight += entry.weight || 1;
  bucket[actual] = (bucket[actual] || 0) + 1;
  layers.set(entry.layer, bucket);
}

const rows = [...layers.values()].sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer));
const weightOf = (layer) => LAYER_WEIGHTS[layer] || 0;

console.log("=== 场景覆盖度：exec / runtime / 标准库 / 端到端 ===");
console.log(`矩阵 ${selected.length} 条、裁判 node${selected.some((e) => e.nodeArgs) ? "（含 --experimental-transform-types）" : ""}、被测 ${path.relative(root, tsrun)}`);
console.log("");
console.log("层        覆盖度                     条数                     贡献（权重 × 覆盖度）");
let progress = 0;
for (const bucket of rows) {
  const coverage = bucket.pass / bucket.total;
  const contribution = weightOf(bucket.layer) * coverage;
  progress += contribution;
  console.log(`  ${bucket.layer.padEnd(8)} ${(coverage * 100).toFixed(1).padStart(5)}%   `
    + `${String(bucket.pass).padStart(3)}/${String(bucket.total).padEnd(3)}  `
    + `(pass ${bucket.pass} · blocked ${bucket.blocked} · differ ${bucket.differ} · bad ${bucket.nodefail})`
    + `   ${(weightOf(bucket.layer) * 100).toFixed(0).padStart(3)}% × ${(coverage * 100).toFixed(1)}% = ${contribution.toFixed(2)}`);
}
console.log(`  ${"合计".padEnd(7)} ${(progress * 100).toFixed(2)} / 100  →  **整体 ${(progress * 100).toFixed(1)}%**`);
console.log("");
if (skipped.length > 0) {
  console.log(`口径外（不测，${skipped.length} 条）：`);
  for (const entry of skipped) console.log(`  ${entry.layer.padEnd(8)} ${entry.id.padEnd(34)} ${entry.skip}`);
  console.log("");
}

const blocked = results.filter((r) => r.actual === "blocked");
const differ = results.filter((r) => r.actual === "differ");
const bad = results.filter((r) => r.actual === "nodefail");
const newly = results.filter((r) => r.verdict === "NEWLY-PASSING");
const moved = results.filter((r) => r.verdict === "MOVED");
const regressions = results.filter((r) => r.verdict === "REGRESSION");

const show = (title, list, line) => {
  if (list.length === 0) return;
  console.log(`${title}（${list.length} 条）：`);
  for (const result of list) console.log(`  ${line(result)}`);
  console.log("");
};
// 台账里写过的用**台账那句话**（人话），没写过的用实测的第一手信息。
const reason = (result) => result.entry.why || result.detail;
show("进不了门（blocked）", blocked, (r) => `${r.entry.layer.padEnd(8)} ${r.entry.id.padEnd(34)} ${reason(r)}`);
show("跑得出来但 stdout / 退出码不同（differ）", differ, (r) => `${r.entry.layer.padEnd(8)} ${r.entry.id.padEnd(34)} ${reason(r)}`);
show("用例自己不合法（bad）", bad, (r) => `${r.entry.layer.padEnd(8)} ${r.entry.id.padEnd(34)} ${r.detail}`);
show("台账该更新了（原来记 blocked、现在过了）", newly, (r) => `${r.entry.layer.padEnd(8)} ${r.entry.id}`);
show("进了一步（原来进不了门，现在跑得出来但还不对）", moved, (r) => `${r.entry.layer.padEnd(8)} ${r.entry.id.padEnd(34)} ${r.detail}`);
show("**倒退**（台账记 pass、现在过不了）", regressions, (r) => `${r.entry.layer.padEnd(8)} ${r.entry.id.padEnd(34)} ${r.detail}`);

const summary = {
  round: value("--round", ""),
  matrix: selected.length,
  skipped: skipped.map((entry) => ({ id: entry.id, layer: entry.layer, why: entry.skip })),
  progressPercent: Number((progress * 100).toFixed(2)),
  layers: rows.map((bucket) => ({
    layer: bucket.layer,
    weight: weightOf(bucket.layer),
    total: bucket.total,
    pass: bucket.pass,
    blocked: bucket.blocked,
    differ: bucket.differ,
    nodefail: bucket.nodefail,
    coverage: Number(((bucket.pass / bucket.total) * 100).toFixed(2)),
  })),
  blocked: blocked.map((r) => ({ id: r.entry.id, layer: r.entry.layer, title: r.entry.title, detail: r.detail })),
  differ: differ.map((r) => ({ id: r.entry.id, layer: r.entry.layer, title: r.entry.title, detail: r.detail })),
  bad: bad.map((r) => ({ id: r.entry.id, layer: r.entry.layer, detail: r.detail })),
  moved: moved.map((r) => ({ id: r.entry.id, layer: r.entry.layer, why: r.entry.why || "", detail: r.detail })),
  newlyPassing: newly.map((r) => ({ id: r.entry.id, layer: r.entry.layer })),
  regressions: regressions.map((r) => ({ id: r.entry.id, layer: r.entry.layer, detail: r.detail })),
};

// **过滤过的一次运行不覆盖读数** ✗（第 205 轮补的）：`report.json` 是**整张矩阵**的读数 ✓，
// 而 `--layer` / `--filter` 只是一次查看 ✓——让它覆盖的话，那一次**部分**运行会被当成全局读数 ✓
//（**静默** ✗：文件里还是那份 JSON，只是分母悄悄变了几条 ✓）。
const filteredRun = layerFilter !== "" || idFilter !== "";
if (writeReport && filteredRun) {
  console.log("（这是**过滤后**的一次运行，`report.json` 不覆盖——去掉 `--layer` / `--filter` 再跑才会写读数）");
}
if (writeReport && !filteredRun) {
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(`report.json 已写：${path.relative(root, reportPath)}`);
}
if (verbose) {
  console.log("");
  for (const result of results) {
    console.log(`${result.verdict.padEnd(14)} ${result.entry.id.padEnd(34)} ${result.ms.toFixed(0).padStart(5)} ms`);
  }
}
console.log(`覆盖度：${results.filter((r) => r.actual === "pass").length} / ${results.length} 条通过；`
  + `blocked ${blocked.length}、differ ${differ.length}、bad ${bad.length}；`
  + `整体加权 ${(progress * 100).toFixed(1)}%`);
// **裁判缓存这一趟省了多少** ✓（第 318 轮 ✓）：命中数就是「少起了几个 node」✓。
// **非确定来源那几条永远计在未命中里** ✓（它们不许缓存 ✓）——所以未命中数**不等于**
// 「新增了多少条用例」✗，这一行只是让人看得见加速有没有生效 ✓。
if (!noJudgeCache && (judgeCacheHits > 0 || judgeCacheMisses > 0)) {
  const saved = ((judgeCacheHits * 0.2)).toFixed(0);
  console.log(`裁判缓存：命中 ${judgeCacheHits} 条、实跑 ${judgeCacheMisses} 条`
    + `（省下约 ${saved}s 的进程启动；关掉它：--no-judge-cache）`);
  try {
    fs.writeFileSync(judgeCachePath, JSON.stringify(judgeCache), "utf8");
  } catch {
    // 写不进去也**不是错误** ✓（下一次照旧实跑 ✓）。
  }
}

// `--emit-expectations`：把**现状**打成一份台账骨架（给人改，然后贴进 expectations.mjs）。
// 它只生成 `expect` 与 `why` 两栏——`why` 是从失败信息里抄的，**必须再读一遍**：
// 台账写的是「这条为什么现在过不了」，不是「它现在过不了」。
if (flag("--emit-expectations")) {
  console.log("");
  console.log("export const EXPECTATIONS = {");
  for (const result of results) {
    if (result.actual === "pass" && expectation(result.entry) === "pass") continue;
    const kind = result.actual === "pass" ? "pass" : result.actual === "differ" ? "differ" : "blocked";
    console.log(`  ${JSON.stringify(result.entry.id)}: { expect: ${JSON.stringify(kind)}, why: ${JSON.stringify(result.detail.slice(0, 110))} },`);
  }
  console.log("};");
}
process.exit(red > 0 || (strict && blocked.length + differ.length + bad.length > 0) ? 1 : 0);
