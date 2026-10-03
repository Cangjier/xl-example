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

import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

/** 跑一个进程，拿 `{ status, stdout, stderr }`（stdout/stderr 都是**字节**，好逐字节比）。 */
function run(file, argv) {
  const started = process.hrtime.bigint();
  const result = spawnSync(process.execPath, argv, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
  if (result.error) throw result.error;
  return {
    file,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    elapsed,
  };
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
for (const file of cases) {
  const name = path.relative(casesDir, file);
  try {
    const oracle = run(file, [file]);
    const machine = run(file, [tsrun, file]);
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
    console.log(`ok       ${name}  （stdout ${lines} 行、退出码 ${machine.status}、${machine.elapsed.toFixed(0)} ms）`);
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
