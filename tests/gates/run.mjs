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
  // **`cases:astjson`（第 884 轮加、第 1016 轮删）**：出口 2（`cjcli --ast-json`）的专属尺子。
  // 它在的时候核的是「逐节点：标签名 === type」「XML 的每个属性在 JSON 里同名同值」
  // 「每个节点都有合法 range」「JSON 多出来的键在 docs/ast-json.md 第 2–4 节登记过」
  // 「命令行 === 库 API」「不抛异常」六项。
  // 第 1016 轮**命令行那一条出口整条删掉**（`--ast-json` 与它一起），于是这一门没有量得到的对象：
  // 它量的一半是「两个出口说的是不是同一棵树」，而那棵树现在只剩 XML 与 TS 形状两条路
  // （TS 形状那一条由 `cases:tsast` / `samples` 看着）。
  // **库那一层一格没动**：`ToDictionary` / `ToList` / `ToPlain` / `WithRange` 与
  // [docs/ast-json.md](../docs/ast-json.md) 那份规格都还在，只是不再有门核它们。
  //（`ToJsonString()` 第 1017 轮删了——它在全仓一个调用者都没有；
  // 序列化那一步今天只有 TS 形状出口的 `ToJsonText()` 在做。）
  // **`cases:direct` + `direct:lint`（第 992 轮加，第 1013 / 1017 轮改口径）**：第三个出口
  // （`Token.PrintDirectAst`，现在是它**唯一**的写法）的两条判据，一动态一静态——
  // `cases:direct` 把全语料投一遍（**不抛异常**）并对一份**固定样本**逐格点名（六格 kind + `pos` / `end`），
  // `direct:lint` 逐页扫方法体（不许 `ctx.source` / `ctx.Text` / `ctx.TextOf` / `ctx.StringText`，
  // 也不许按字符串键查）。两条分开是因为它们坏的方式不同：
  // 静态那条坏了是「又回原文查了」（只在坏输入上显形），动态那条坏了是「这一格投不出形状」（当场点名）。
  // **第 1013 轮之前**动态那条比的是「与 `PrintAst` 同答」（开关两遍对拍）；老路删掉之后改成
  // 「同一份输入重投两遍逐字节相同」；**第 1017 轮把那一项撤了**——同一份输入在同一个进程里投两遍，
  // 确定性代码必然逐字节相同（这一门自己的注释就写着「一头恒返回 `undefined` 的投影也满足它」），
  // 它量不出任何一格真的错了。留下的两条都是**绝对**的：抛异常、固定样本缺格。
  { name: "cases:direct", script: "tests/parse/direct-ast.mjs" },
  { name: "direct:lint", script: "tests/parse/direct-lint.mjs" },
  { name: "samples", script: "samples/check.mjs" },
  { name: "cases:check", script: "tests/parse/validate.mjs" },
  // **`cases:tags`（第 633 轮加、第 1017 轮删）**：用例开头那几行 `xl:expect` / `xl:absent` 的
  // 专属尺子（外加「标签表体检」与一条 `<Label />` 结构不变式）。它量的是**产物标签**这一层，
  // 而既定口径是「XML 出口与 token 树质量的尺子不进判据」——**这一条留下的洞记在 README 里**
  // （`xl:expect` / `xl:absent` 的语法照旧由 `cases:check` 管，但**没有门再把它们跟产物核一遍**）。
  // **`cases:shapes`（第 648 轮加、第 1017 轮删）**：用例覆盖了外部语料（`node_modules`）里
  // 出现过的**哪些形状签名**。它量的是**依赖库的形状清单**，不是本工程；从加进来那天起就是绿的，
  // 此后每一次读数都是「未覆盖 0」——一次没红过的门不构成判据。
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
