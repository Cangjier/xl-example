#!/usr/bin/env node
// 判据：**直接执行 `.ts` 文件**——`tsrun` 与 `node` 逐字节对拍。
//
//   node tests/runtime/run-cli.mjs              全语料（tests/runtime/cases/*.ts）
//   node tests/runtime/run-cli.mjs --list       只列用例名
//   node tests/runtime/run-cli.mjs 05           只跑名字里带 `05` 的那些
//   node tests/runtime/run-cli.mjs --verbose    连 stderr 与耗时也打出来
//
// ## 这条判据的口径（写在这里，因为它就是全部）
//
// 1. **stdout 逐字节相同**：stdout 只装脚本自己的输出（`console.log` 一行一条）——
//    这是 `tsrun` 唯一承诺的产物，也是与 `node` 能直接 diff 的那一半。
// 2. **退出码相同**：正常跑完 0、脚本抛出 1（两边都这么定）。语料里
//    `09-uncaught-throw.ts` **故意抛**——它钉的就是这一档。
// 3. **stderr 不比**：`node` 打的是 V8 的栈帧，本运行器**没有帧可打**
//    （它是字节码解释器，不是 V8）。拿 stderr 当判据等于把「实现形态」钉进判据——
//    真正要比的是**退出码**（异常有没有冒到宿主）。
// 4. **每一份都必须有 stdout**：什么都不打印的用例「通过」等于什么都没验（这一条是判据自己加的）。
// 5. **产物新鲜度**：规范比产物新就直接红（与 `check.mjs` 同一条规矩）——
//    判据读的是 `build/**/*.js`，跳过 `xl build` 的话量的是上一版。
//
// 裁判是**真的 Node 进程**（`node <用例>`）；被测是**真的 tsrun 进程**
// （`node build/ts/tsrun.js <用例>`）——两个进程、两条完整链路，中间没有打桩。

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const verbose = args.includes("--verbose");
const filter = args.filter((a) => !a.startsWith("--"))[0] || "";

const tsrun = path.join(root, "build", "ts", "tsrun.js");
const casesDir = path.join(here, "cases");

/** 递归收集 `*.xl.md`（规范）与它该有的产物路径。 */
function specs() {
  const out = [path.join(root, "tsrun.xl.md")];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".xl.md")) out.push(full);
    }
  };
  walk(path.join(root, "runtime"));
  walk(path.join(root, "typescript-exec"));
  return out;
}

/** 第 5 条：规范 → 产物（dist/ts）→ 编译产物（build/ts），任何一环陈旧都直接红。 */
function checkFreshness() {
  const stale = [];
  for (const spec of specs()) {
    const rel = path.relative(root, spec);
    const generated = path.join(root, "dist", "ts", rel.replace(/\.xl\.md$/, ".ts"));
    if (!fs.existsSync(generated)) {
      stale.push(`${rel} → 还没有产物，跑 xl_build --force`);
      continue;
    }
    if (fs.statSync(spec).mtimeMs > fs.statSync(generated).mtimeMs) {
      stale.push(`${rel} 比产物新 → 跑 xl_build --force`);
    }
    const built = path.join(root, "build", "ts", rel.replace(/\.xl\.md$/, ".js"));
    if (!fs.existsSync(built) || fs.statSync(generated).mtimeMs > fs.statSync(built).mtimeMs) {
      stale.push(`dist/ts/${rel.replace(/\.xl\.md$/, ".ts")} → 还没跑 npm run compile`);
    }
  }
  if (stale.length > 0) {
    console.log("产物不是最新的，先跑 xl_build --force（插件工具）与 npm run compile：");
    for (const line of stale) console.log(`  ${line}`);
    process.exit(1);
  }
}

function listCases() {
  if (!fs.existsSync(casesDir)) return [];
  return fs
    .readdirSync(casesDir)
    .filter((name) => name.endsWith(".ts"))
    .sort()
    .map((name) => path.join(casesDir, name));
}

/**
 * 跑一个进程，拿 `{ status, stdout, stderr }`（stdout/stderr 都是**字节**，好逐字节比）。
 *
 * **异步 + 池**（第 321 轮 ✓）：原来一条一条 `spawnSync` ✓，79 份语料就是
 * **158 次串行进程启动** ✓（实测 48 秒 ✓，而这一门现在是六道门里最慢的之一 ✗）。
 * 两条路各自有更省的办法 ✓：
 * · **被测侧**：`tsrun --batch` 一个进程跑完 ✓（第 319 轮就有的能力 ✓）；
 * · **裁判侧**：`node <用例>` 没有批量那一说 ✓（每条一个**真进程**才是裁判 ✓），
 *   但可以**并行** ✓——它们是 I/O 等待 ✓，池子一开就重叠 ✓。
 */
function runAsync(file, argv) {
  return new Promise((resolve, reject) => {
    const started = process.hrtime.bigint();
    const child = spawn(process.execPath, argv, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({
        file,
        status,
        stdout: Buffer.concat(out),
        stderr: Buffer.concat(err),
        elapsed: Number(process.hrtime.bigint() - started) / 1e6,
      });
    });
  });
}

/** 第一条不同的行（对拍失败时给人看的那一眼）。 */
function firstDifference(left, right) {
  const a = left.toString("utf8").split("\n");
  const b = right.toString("utf8").split("\n");
  const limit = Math.max(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return `第 ${i + 1} 行：node «${a[i] === undefined ? "<没有这一行>" : a[i]}» vs tsrun «${b[i] === undefined ? "<没有这一行>" : b[i]}»`;
    }
  }
  return "（逐行相同——差异在行尾字节上）";
}

checkFreshness();

const cases = listCases().filter((file) => path.basename(file).includes(filter));
if (cases.length === 0) {
  console.log(filter === "" ? "没有用例：tests/runtime/cases/*.ts 一份都没有" : `没有名字里带 "${filter}" 的用例`);
  process.exit(1);
}
if (listOnly) {
  for (const file of cases) console.log(path.relative(root, file));
  process.exit(0);
}

console.log("=== 直接执行：tsrun 与 node 逐字节对拍 ===");
console.log(`语料 ${cases.length} 份、被测 ${path.relative(root, tsrun)}`);
console.log("");

let failed = 0;
// **被测侧：一个进程跑完所有语料** ✓（第 321 轮 ✓）——与 coverage 那边同一个形状 ✓
//（`tsrun --batch` 与 `tsrun <file>` 共用 `RunSources` ✓，语义没变 ✓）。
// **每进程一个工作目录** ✓（第 321 轮 ✓，用户口径 ✓）：清单原来写在**仓库里一个固定名字**上 ✗
// ——两个实例（或 `gates` 与手跑）撞在一起时，后写的那个会把前一个的清单换掉 ✗
//（症状是「某几份语料找不到」✓，而它看起来像用例坏了 ✗）。按 pid + 随机后缀分开之后互不相干 ✓。
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `tsrun-cli-${process.pid}-`));
const manifestPath = path.join(workDir, "cases-manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(cases.map((file, index) => ({
  id: String(index),
  path: file,
}))), "utf8");
const batch = await runAsync("(batch)", [tsrun, "--batch", manifestPath]);
fs.rmSync(workDir, { recursive: true, force: true });
const mine = new Map();
for (const line of batch.stdout.toString("utf8").split("\n")) {
  if (line.trim() === "" || line.startsWith('{"begin"')) continue;
  let record = null;
  try {
    record = JSON.parse(line);
  } catch {
    continue;
  }
  if (record === null || record.id === undefined) continue;
  mine.set(Number(record.id), {
    status: record.status,
    stdout: Buffer.from(record.stdout, "utf8"),
    stderr: Buffer.from(record.stderr, "utf8"),
  });
}
// **裁判侧：并行** ✓（每条一个真进程 ✓，但不再一条等一条 ✓）。
const jobs = Math.max(1, Math.min(16, os.cpus().length));
const oracles = new Array(cases.length);
{
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, cases.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= cases.length) return;
      oracles[index] = await runAsync(cases[index], [cases[index]]);
    }
  }));
}
for (let index = 0; index < cases.length; index++) {
  const file = cases[index];
  const name = path.relative(casesDir, file);
  try {
    const oracle = oracles[index];
    const machine = mine.get(index);
    if (machine === undefined) {
      failed += 1;
      console.log(`FAIL     ${name}`);
      console.log("           这一份没从批量那一趟里交回结果（那一趟可能整份崩了）");
      continue;
    }
    const problems = [];
    if (oracle.status !== machine.status) {
      problems.push(`退出码 node=${oracle.status} tsrun=${machine.status}`);
    }
    if (Buffer.compare(oracle.stdout, machine.stdout) !== 0) {
      problems.push("stdout 不同：" + firstDifference(oracle.stdout, machine.stdout));
    }
    if (machine.stdout.length === 0) {
      problems.push("这一份什么都没打印（用例不合格：不打印的通过等于没验）");
    }
    if (problems.length > 0) {
      failed += 1;
      console.log(`FAIL     ${name}`);
      for (const problem of problems) console.log(`           ${problem}`);
      if (verbose) {
        console.log(`           node stderr: ${oracle.stderr.toString("utf8").split("\n")[0]}`);
        console.log(`           tsrun stderr: ${machine.stderr.toString("utf8").split("\n")[0]}`);
      }
      continue;
    }
    const lines = machine.stdout.toString("utf8").split("\n").filter((line) => line !== "").length;
    console.log(`ok       ${name}  （stdout ${lines} 行、退出码 ${machine.status}）`);
    if (verbose && machine.stderr.length > 0) {
      console.log(`           tsrun stderr: ${machine.stderr.toString("utf8").trim().split("\n")[0]}`);
    }
  } catch (error) {
    failed += 1;
    console.log(`FAIL     ${name}: ${error.message}`);
  }
}

console.log("");
console.log(`直接执行 .ts：${cases.length - failed} 份一致，${failed} 份不一致`);
process.exit(failed === 0 ? 0 : 1);
