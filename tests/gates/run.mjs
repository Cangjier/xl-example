// 六道门**一次成批并行**跑（第 318 轮加，用户口径：「分组批量跑，快一点」）。
//
// **为什么值得** ✗：六道门彼此**独立** ✓（各自读产物、各写各的临时目录 ✓），
// 而串着跑的总时长是**六段之和** ✓——16 核的机器上大半时间是在等一个进程 ✗。
// 并行之后墙钟时间约等于**最慢的那一道** ✓（实测：串行 ~7 分钟 → 并行 ~2 分钟 ✓）。
//
// **与 `tests/coverage/run.mjs` 的 `--jobs` 不是一回事** ✗：那一个是**一道门内部**的
// 用例级并行 ✓（第 205 轮就有 ✓，默认 `min(8, 核数)` ✓）；这一层是**门与门之间**的并行 ✓。
// 两层叠起来才叫「分组批量跑」✓。
//
// **用法**：`npm run gates`（或 `node tests/gates/run.mjs --jobs 6 --verbose`）。
// **退出码**：任一门红就是 1 ✓（CI 与我自己都只看这一个数 ✓）。
//
// 门的名单**写在这一处** ✓：加一道门只改这里 ✓（与 `package.json` 里那几个脚本**同名同源** ✓
// ——两边各写一遍就是两处会漂 ✗，而漂了的症状是「我跑了六道、CI 跑了七道」✗）。

import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

/**
 * 六道门：名字 → 脚本路径（与 `package.json` 一一对应）。
 *
 * **`shards`**（第 321 轮加的机制）：把一门切成 n 组、每组一个子进程。
 * **本轮它已经没有用户了**：`cases:tsast`（唯一用过它的那一道）自己**默认就是 batch** ——
 * 按 `os.cpus().length` 切组、每组一个子进程，组数不 hard code。机制留着给以后需要它的门。
 *
 * **改语料时的快循环**（第 351 轮 / 本轮）：
 * 这一门默认把**全部** 1447 份过一遍。本轮之前是**单进程 60s 量级**
 *（大头是 `typescript/lib` / `@types` 那几份大 `.d.ts`，82 万个产物节点）；
 * 本轮把它改成**默认 batch**（按逻辑处理器数量切组、贪心 LPT 分片）之后：**墙钟 ~10s**，
 * 下界就是**最重的那一份语料**（`typescript/lib/lib.dom.d.ts`，2.3 MB，单份约 6.3s 真工 ——
 * 分片切不开一个文件）。只想让一条新用例说话时，`npm run cases:tsast:cases` 更快（2s 量级）。
 * **`--batch`（`tsrun --batch` / `judge-batch.mjs`）是另一件事** ✗：那是给
 * **每个用例必须起子进程**的门用的 ✓（`runtime:cli` 要对每个 `.ts` 跑 `node` 与 `tsrun` 各一次 ✓）。
 * **每片各自算那七项** ✓，「每片都 0」⟺「整体都 0」✓——**不需要把计数合起来** ✓
 *（那正是分片最容易出错的地方 ✓）。
 */
const GATES = [
  { name: "runtime:check", script: "tests/runtime/check.mjs" },
  { name: "runtime:cli", script: "tests/runtime/run-cli.mjs" },
  // **`cases:tsast` 不再由这里分片**（本轮改）：它自己**默认就是 batch**，
  // 按 `os.cpus().length` 切组、每组一个子进程（组数不 hard code）。
  // 这里再写一个固定片数就是**第二份答案**，而且会把外层 6 道门 × 16 片叠成过载。
  { name: "cases:tsast", script: "tests/parse/ts-ast.mjs" },
  { name: "samples", script: "samples/check.mjs" },
  { name: "cases:check", script: "tests/parse/validate.mjs" },
  { name: "coverage", script: "tests/coverage/run.mjs" },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = "") => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const verbose = flag("--verbose");
// **默认是「门数」而不是「核数」** ✓：六道门同时开六条 ✓，而每一条自己还会再开
// 用例级的并行 ✓（`coverage` 那一道默认 8 ✓）——两层相乘会过载 ✗，
// 所以这里给一个能把六道**同时**放下的数就够 ✓（再大也只是多几段等待 ✓）。
const jobs = Math.max(1, Math.min(GATES.length, Number(value("--jobs", String(GATES.length)))));

const runOne = (gate) =>
  new Promise((resolve) => {
    const started = Date.now();
    // **分片那一档** ✓（第 321 轮 ✓）：这一门自己不起子进程 ✓，
    // 所以由**这里**替它开 n 个（每个跑一组 ✓），并且**全都要绿** ✓。
    const shards = gate.shards || 1;
    const runs = Array.from({ length: shards }, (_, index) => {
      const argv = [path.join(root, gate.script)];
      if (shards > 1) argv.push("--shard", `${index}/${shards}`);
      return new Promise((done) => {
        const child = spawn(process.execPath, argv, {
          cwd: root,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk) => {
          out += chunk;
        });
        child.stderr.on("data", (chunk) => {
          err += chunk;
        });
        child.on("close", (code) => done({ code, out, err }));
      });
    });
    Promise.all(runs).then((all) => {
      const code = all.every((one) => one.code === 0) ? 0 : 1;
      // **报告取「最慢的那一片」的尾巴** ✓：它才是这一门的墙钟 ✓。
      const slowest = all.reduce((best, one) => (one.out.length > best.out.length ? one : best), all[0]);
      resolve({
        gate,
        code,
        out: (shards > 1 ? `（${shards} 片并行）\n` : "") + slowest.out,
        err: all.map((one) => one.err).join(""),
        ms: Date.now() - started,
      });
    });
  });

const pool = async (items, run) => {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

const started = Date.now();
console.log(`六道门并行跑（${jobs} 路，${os.cpus().length} 核）：${GATES.map((g) => g.name).join(" · ")}`);
console.log("");
const results = await pool(GATES, runOne);

/** 每一门挑一行「结论」印出来（各自最后一行通常就是它 ✓）。 */
const conclusion = (text) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.length === 0 ? "（没有输出）" : lines[lines.length - 1].trim();
};

let failed = 0;
for (const result of results) {
  const ok = result.code === 0;
  if (!ok) failed += 1;
  const seconds = (result.ms / 1000).toFixed(1);
  console.log(`${ok ? "ok  " : "FAIL"}  ${result.gate.name.padEnd(14)} ${seconds.padStart(6)}s  ${conclusion(result.out)}`);
  if (!ok || verbose) {
    const tail = (result.out + result.err).split(/\r?\n/).filter((line) => line.trim() !== "").slice(-8);
    for (const line of tail) console.log(`        ${line}`);
    console.log("");
  }
}

console.log("");
console.log(`${GATES.length} 道门：${GATES.length - failed} 道通过、${failed} 道失败；墙钟 ${((Date.now() - started) / 1000).toFixed(1)}s`);
// **哪几门没进池子就说清楚** ✗（`--jobs` 调小到 1 时也一样跑 ✓，只是慢 ✓）。
if (jobs < GATES.length) {
  console.log(`（${jobs} 路并行：别的门等前面让出来，总时长会长一些 ✓）`);
}
process.exit(failed === 0 ? 0 : 1);
