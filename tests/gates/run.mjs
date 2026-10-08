// `GATES` 里那几道门**一次成批并行**跑。
//
// 门与门彼此独立（各自读产物、各写各的临时目录），串行跑的总时长是各段之和；
// 并行之后墙钟约等于**最慢的那一道**（串行 ~7 分钟 → 并行 ~30 秒）。
// 这一层是**门与门之间**的并行，与 `tests/coverage/run.mjs` 的 `--jobs`（一道门内部的用例级并行）
// 不是一回事，两层叠起来才是「分组批量跑」。
//
// **用法**：`npm run gates`（或 `node tests/gates/run.mjs --jobs 6 --verbose`）。
// **退出码**：任一门红就是 1。
//
// 门的名单**只写在 `GATES` 这一处**（与 `package.json` 里同名同源的脚本一一对应）：
// 两边各写一遍就是两处会漂，而漂了的症状是「门数与实际跑的对不上」。

import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

/**
 * 门的名单：名字 → 脚本路径（与 `package.json` 一一对应）。
 *
 * **`shards`**：把一门切成 n 组、每组一个子进程。目前没有门用它——
 * `cases:tsast` 自己默认就是 batch（按 `os.cpus().length` 切组、贪心 LPT 分片），
 * 这里再写一个固定片数就是第二份答案。机制留着给以后需要它的门。
 *
 * **`cases:tsast` 的那个 batch 与本文件的并行不是一回事**：那是给「每条用例必须起子进程」的门用的
 * （`runtime:cli` 要对每个 `.ts` 跑 `node` 与 `tsrun` 各一次）。它每片各自算那八项，
 * 「每片都 0」⟺「整体都 0」，所以不需要把计数合起来。
 */
const GATES = [
  { name: "runtime:check", script: "tests/runtime/check.mjs" },
  { name: "runtime:cli", script: "tests/runtime/run-cli.mjs" },
  // **`cases:tsast` 不再由这里分片**（本轮改）：它自己**默认就是 batch**，
  // 按 `os.cpus().length` 切组、每组一个子进程（组数不 hard code）。
  // 这里再写一个固定片数就是**第二份答案**，而且会把外层各道门 × 16 片叠成过载。
  { name: "cases:tsast", script: "tests/parse/ts-ast.mjs" },
  { name: "samples", script: "samples/check.mjs" },
  { name: "cases:check", script: "tests/parse/validate.mjs" },
  // **`cases:tags`（第 633 轮加）**：用例开头那几行 `xl:expect` / `xl:absent` 的**真判据**。
  // 它是这一族里唯一读「用例自带的期望」的一道 ✓——`cases:tsast` 比的是形状 ✓，
  // 它比的是**这条用例说自己该有什么，产物里真的有吗** ✓。加它之前那些期望已经过期 47 处
  // 而没有任何东西会响 ✗（见 `tests/parse/tags.mjs` 开头）。
  { name: "cases:tags", script: "tests/parse/tags.mjs" },
  // **`cases:shapes`（本轮加）**：用例**覆盖了哪些形状**。
  // `cases:tsast` 量的是「对得上的对不对」（用例 + 真实语料），它绿不代表**用例**里有那种形状：
  // 真实语料来自 `node_modules`（会随依赖升级变、也可能整份消失），用例才是仓库自己的回归网。
  // 这一门按「kind + 有子节点的字段名」的签名比，外部语料里出现过的签名必须在用例里出现过。
  { name: "cases:shapes", script: "tests/parse/shapes.mjs" },
  { name: "coverage", script: "tests/coverage/run.mjs" },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = "") => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const verbose = flag("--verbose");
// **默认是「门数」而不是「核数」**：所有门同时开一条，而每一条自己还会再开用例级的并行
// （`coverage` 那一道默认 8）——两层相乘会过载，所以这里给一个能把所有门**同时**放下的数就够。
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
console.log(`${GATES.length} 道门并行跑（${jobs} 路，${os.cpus().length} 核）：${GATES.map((g) => g.name).join(" · ")}`);
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
