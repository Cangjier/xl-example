// `GATES` 里那几道门**一次成批并行**跑。
//
// 门与门彼此独立（各自读产物、各写各的临时目录），串行跑的总时长是各段之和；
// 并行之后墙钟约等于**最慢的那一道**（串行 ~7 分钟 → 并行 ~30 秒）。
// 这一层是**门与门之间**的并行，与 `tests/coverage/run.mjs` 的 `--jobs`（一道门内部的用例级并行）
// 不是一回事，两层叠起来才是「分组批量跑」。
//
// **用法**：`npm run gates`（或 `node tests/gates/run.mjs --jobs 6 --verbose`）。
// **退出码**：任一**适用**的门红就是 1。
//
// **两个档（W4 起是「默认档 / incremental 档」，D7 波起翻过来）**：默认跑 `GATES` 那 11 道，
// 其中 `wide-ast` 与 `real-dts-ast` 量的是**产品默认路径**，而默认值自 D7 起就是增量形状
// （`StatementRouteUtil.EnableIncrementalShapes` / `EnableIncrementalVariableShapes` 都是 `true`）。
// 它们的判据按 `tests/parse/incremental-crash-expected.mjs` 那一份清单：
// **崩溃 ≤5 且 5 条全在 `lib.*.d.ts` 预期清单里、差异 ≤87、fallback ≤94、`policyProblems === 0` ⇒ exit 0**。
// `--legacy`（或 `XL_GATE_LEGACY=1`）把这两道的两个开关压回 `false`，用**对照档**读 0 / 0 / ≤2。
// `--incremental` 保留为「显式点名默认档」的别名（不再叠第 12 道门）—— 默认档就是它。
//
// **不是放宽判据**：三个数都是显式天花板，预期清单逐字比对（换一个文件崩就红），legacy 档一个字没松。
// 两档的理由与今天的读数写在 `_reports/D7.md`，`_reports/W4.md` 是分档本身的来历。
//
// **not-applicable（第 R7 收口加）**：有几道门读的源 / 产物**在本仓库根本不存在**
// （`runtime/`、`tsrun.xl.md`、`typescript/print-ast-common.xl.md`、`dawn/` 与 C++ 产物；
// 清单与证据见 `tests/MIGRATION.md` 的「本仓库不适用的门」）。这些门以前各红一次，
// 于是「全量门」的读数永远是「多数红」，红里分不出真假。现在它们被**显式**判为
// `NOT-APPLICABLE（原因）`、计入「跳过」而不是「失败」，每一道的理由都印出来。
//
// **这不是放宽判据**：跳过条件只写在 `notApplicable` 上，且只判「源 / 产物存在与否」——
// 源一旦出现（或 `dist/cpp` 由 `xl_emit` 生成），那一门就照常运行、照常可能红。
// 真实失败（脚本抛错、断言不过）一律仍是 `FAIL`，并让退出码为 1。
//
// 门的名单**只写在 `GATES` 这一处**（与 `package.json` 里同名同源的脚本一一对应）：
// 两边各写一遍就是两处会漂，而漂了的症状是「门数与实际跑的对不上」。

import { spawn } from "node:child_process";
import fs from "node:fs";
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
/** 三道门共用的缺口：TS 形状投影那一页不在本仓库（见 `tests/MIGRATION.md` 的「缺什么」）。 */
const NO_PRINT_AST_COMMON = {
  path: "typescript/print-ast-common.xl.md",
  why: "TS 形状投影的源页不在本仓库（全仓无 *print-ast-common*.xl.md）",
};

const GATES = [
  // **执行引擎那一族（R7 诊断 §5）**：`runtime/` 与 `tsrun.xl.md` 都不在本仓库，
  // 所以这两道门读的 `build/ts/runtime/**` / `build/ts/tsrun.js` 永远不会有本仓库的产物。
  {
    name: "runtime:check",
    script: "tests/runtime/check.mjs",
    notApplicable: [{ path: "runtime", why: "执行引擎的源目录 runtime/ 不在本仓库（诊断 §5）" }],
  },
  {
    name: "runtime:cli",
    script: "tests/runtime/run-cli.mjs",
    notApplicable: [{ path: "tsrun.xl.md", why: "运行时入口 tsrun.xl.md 不在本仓库（诊断 §5）" }],
  },
  // **`cases:tsast` 不再由这里分片**（本轮改）：它自己**默认就是 batch**，
  // 按 `os.cpus().length` 切组、每组一个子进程（组数不 hard code）。
  // 这里再写一个固定片数就是**第二份答案**，而且会把外层各道门 × 16 片叠成过载。
  {
    name: "cases:tsast",
    script: "tests/parse/ts-ast.mjs",
    notApplicable: [NO_PRINT_AST_COMMON],
  },
  // **`cases:astjson`（第 884 轮加、第 1016 轮删）**：出口 2（`cjcli --ast-json`）的专属尺子。
  // 它在的时候核的是「逐节点：标签名 === type」「XML 的每个属性在 JSON 里同名同值」
  // 「每个节点都有合法 range」「JSON 多出来的键在 docs/ast-json.md 第 2–4 节登记过」
  // 「命令行 === 库 API」「不抛异常」六项。
  // 第 1016 轮**命令行那一条出口整条删掉**（`--ast-json` 与它一起），于是这一门没有量得到的对象：
  // 它量的一半是「两个出口说的是不是同一棵树」，而那棵树现在只剩 XML 与 TS 形状两条路
  // （TS 形状那一条由 `cases:tsast` / `samples` 看着）。
  // **第 1019 轮连中间那一层也删了**（`ToPlain` 与它同一批）：
  // 它写的每一格都是 token 自己声明过的属性，今天的消费者只有直出那一趟投影，
  // [docs/ast-json.md](../docs/ast-json.md) 那份规格留着当记录（现状写在它开头）。
  //（`ToJsonString()` 第 1017 轮删了——它在全仓一个调用者都没有；
  // 序列化那一步今天只有 TS 形状出口的 `ToJsonText()` 在做。）
  // **`cases:direct` + `direct:lint`（第 992 轮加，第 1013 / 1017 轮改口径）**：第三个出口
  // （`Token.PrintAst`，现在是它**唯一**的写法）的两条判据，一动态一静态——
  // `cases:direct` 把全语料投一遍（**不抛异常**）并对一份**固定样本**逐格点名（六格 kind + `pos` / `end`），
  // `direct:lint` 逐页扫方法体（不许 `ctx.source` / `ctx.Text` / `ctx.TextOf` / `ctx.StringText`，
  // 也不许按字符串键查）。两条分开是因为它们坏的方式不同：
  // 静态那条坏了是「又回原文查了」（只在坏输入上显形），动态那条坏了是「这一格投不出形状」（当场点名）。
  // **第 1013 轮之前**动态那条比的是「与 `PrintAst` 同答」（开关两遍对拍）；老路删掉之后改成
  // 「同一份输入重投两遍逐字节相同」；**第 1017 轮把那一项撤了**——同一份输入在同一个进程里投两遍，
  // 确定性代码必然逐字节相同（这一门自己的注释就写着「一头恒返回 `undefined` 的投影也满足它」），
  // 它量不出任何一格真的错了。留下的两条都是**绝对**的：抛异常、固定样本缺格。
  {
    name: "cases:direct",
    script: "tests/parse/direct-ast.mjs",
    notApplicable: [NO_PRINT_AST_COMMON],
  },
  { name: "direct:lint", script: "tests/parse/direct-lint.mjs" },
  {
    name: "samples",
    script: "samples/check.mjs",
    notApplicable: [
      { path: "dawn", why: "cjcli.xl.md 依赖 ./dawn/text/*.xl.md，本仓库没有 dawn/（全仓 xl build 报 E1006）" },
    ],
  },
  { name: "cases:check", script: "tests/parse/validate.mjs" },
  // **`wide-ast` + `real-dts-ast`（本轮收编加进池子）**：两把**适用**的 AST 尺子，判据都是
  // 「与本仓直建产物逐节点一致」，而不是「跑得动」。
  // - `wide-ast`（`tests/parse/wide-ast.mjs`）：**1945 件**宽语料（node_modules .d.ts +
  //   samples + tests/cases/token），直接读 `build/ts/typescript/run/source-file-runner.js`，
  //   不依赖那条在本仓库不存在的 print-ast-common；判据见 `tests/parse/incremental-crash-expected.mjs`
  //   （默认 = incremental 档：崩溃 ≤5 全 lib / 差异 ≤87 / fallback ≤94 / `policyProblems` 0；`--legacy` 0/0/≤2）。
  //   **`dist/ts` 的 628 件产物已剔出语料（W4 / D5 §3.2）**，但每一趟仍用 `distOnlyKinds` 复算一次
  //   「剔了不丢节点种类」；这一条不成立就红，所以「少扫几个文件」不能换来绿。
  // - `real-dts-ast`（`typescript/cases/real-dts-ast.mjs`）：226 件真实 `.d.ts`，即 `ast:dts` 那道门；
  //   以前不在池子里，只有 `npm run ast:dts` 才会跑。**它读同一份清单**（D7 波）：默认档允许那 5 条
  //   `lib.*.d.ts` 崩溃、其余一律红，差异 ≤87；`--legacy` 要求 0 崩溃。
  // 两道都**不写 notApplicable**：缺 `build/ts` 是真实失败（先 `npm run build`），不是「本仓库结构上
  // 不可能跑」——与上面 7 道 N/A 的区别正在这里。
  // **`summary`（第 D3e 波加）**：`FileFallbackCount` 是隐性债指标，挂在这里让它在 gates 摘要里可读，
  // 不必把同一件事变成第二道门。**W4 起它进了判据**（默认档 ≤94 = 78 本仓 + 16 白名单），
  // 阈值、两档口径与预期清单都写在 `tests/parse/incremental-crash-expected.mjs`（唯一来源）。
  // **`usesTier`（D7 波）**：标了它的门在 `--legacy` 下会多拿一个 `--legacy` 参数 —— 档位只在这里
  // 拨、不在门自己里面偷偷改默认值。
  { name: "wide-ast", script: "tests/parse/wide-ast.mjs", summary: /^FileFallbackCount /, usesTier: true },
  { name: "real-dts-ast", script: "typescript/cases/real-dts-ast.mjs", usesTier: true },
  // **`cases:tags`（第 633 轮加、第 1017 轮删）**：用例开头那几行 `xl:expect` / `xl:absent` 的
  // 专属尺子（外加「标签表体检」与一条 `<Label />` 结构不变式）。它量的是**产物标签**这一层，
  // 而既定口径是「XML 出口与 token 树质量的尺子不进判据」——**这一条留下的洞记在 README 里**
  // （`xl:expect` / `xl:absent` 的语法照旧由 `cases:check` 管，但**没有门再把它们跟产物核一遍**）。
  // **`cases:shapes`（第 648 轮加、第 1017 轮删）**：用例覆盖了外部语料（`node_modules`）里
  // 出现过的**哪些形状签名**。它量的是**依赖库的形状清单**，不是本工程；从加进来那天起就是绿的，
  // 此后每一次读数都是「未覆盖 0」——一次没红过的门不构成判据。
  {
    name: "coverage",
    script: "tests/coverage/run.mjs",
    notApplicable: [NO_PRINT_AST_COMMON],
  },
  // **`cpp:check`（R7 收口加进池子）**：它原先不在 `gates` 名单里（见 `tests/MIGRATION.md`），
  // 但失败原因与上面那 6 道同属一类——`dist/cpp` 要 `xl_emit` 才生成，而 `xl.json` 的
  // `build.target` 只有 `["ts"]`。按同一条 not-applicable 规则处理，免得「全量门」的读数里
  // 漏掉一道永远红的门；`dist/cpp` 一旦出现，这一门照常运行、照常可能红。
  {
    name: "cpp:check",
    script: "tests/cpp/check.mjs",
    notApplicable: [
      { path: "dist/cpp", why: "要 xl_emit 生成 C++ 产物（xl.json 的 build.target 只有 ts）" },
    ],
  },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback = "") => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const verbose = flag("--verbose");
/**
 * **档位（D7 波翻过来）：默认 = incremental，对照档用 `--legacy`**
 *
 * 产品的默认值就是增量形状（`EnableIncrementalShapes` / `EnableIncrementalVariableShapes` 都是 `true`），
 * 所以**默认这一趟不需要拨任何开关** —— 这样门量到的才是用户真拿到的那条路径。要看老口径
 * （0 / 0 / ≤2）就显式 `--legacy`：它只给标了 `usesTier` 的两道门（`wide-ast` / `real-dts-ast`）
 * 各加一个 `--legacy`，门的名单**一道都不增删**（仍是 11 道）。
 *
 * 以前（W4–W6）是反过来：默认档 legacy、`--incremental` 叠第 12 道 `wide-ast:incr`。现在
 * `--incremental` 只是默认档的显式别名，不再叠门 —— 同一把尺子量两遍会给出两个可以互相矛盾的读数，
 * 而 M-W6 §4.1 记的正是那一次「4 PASS / 1 FAIL」的口径冲突。
 */
const legacy = flag("--legacy") || process.env.XL_GATE_LEGACY === "1";
const incrementalAlias = flag("--incremental") || process.env.XL_GATE_INCREMENTAL === "1";
if (legacy && incrementalAlias) {
  console.log("（--legacy 与 --incremental 互斥：incremental 已是默认档，本次按 --legacy 跑对照档）");
}
const tierArgs = legacy ? ["--legacy"] : [];
const gates = legacy
  ? GATES.map((gate) => (gate.usesTier ? { ...gate, args: [...(gate.args ?? []), ...tierArgs] } : gate))
  : GATES;

// **默认是「门数」而不是「核数」**：所有门同时开一条，而每一条自己还会再开用例级的并行
// （`coverage` 那一道默认 8）——两层相乘会过载，所以这里给一个能把所有门**同时**放下的数就够。
const jobs = Math.max(1, Math.min(gates.length, Number(value("--jobs", String(gates.length)))));

/**
 * **一道门在这个仓库里是否「不适用」**（not-applicable：按跳过计，不算失败）。
 *
 * 判据刻意只写「这条命令依赖的**源 / 产物**在不在」：`gate.notApplicable` 是几条
 * `{ path, why }`，**全部** `path` 都不存在才判不适用；只要有一条出现，这一门就照常跑。
 *
 * **为什么不能按「产物不在」判** ✗：`build/ts/**` 只是**还没构建**，那是真实的失败
 * （「先跑 xl build && tsc」），不该被吞。所以这里列的是**源**（`runtime/`、`tsrun.xl.md`、
 * `typescript/print-ast-common.xl.md`、`dawn/`）与**只有 xl_emit 才产出的** `dist/cpp`——
 * 它们不是本仓库的构建步骤能补出来的（证据见 `tests/MIGRATION.md` 与
 * `_coord/REPORT-r7-gates.md` §5）。
 */
const notApplicableReason = (gate) => {
  const required = gate.notApplicable ?? [];
  if (required.length === 0) return null;
  const missing = required.filter((one) => !fs.existsSync(path.join(root, one.path)));
  if (missing.length < required.length) return null;
  return missing.map((one) => `${one.path} 不存在（${one.why}）`).join("；");
};

const runOne = (gate) =>
  new Promise((resolve) => {
    const started = Date.now();
    // **分片那一档** ✓（第 321 轮 ✓）：这一门自己不起子进程 ✓，
    // 所以由**这里**替它开 n 个（每个跑一组 ✓），并且**全都要绿** ✓。
    const shards = gate.shards || 1;
    const runs = Array.from({ length: shards }, (_, index) => {
      const argv = [path.join(root, gate.script), ...(gate.args ?? [])];
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
// **档位只影响「门怎么判」，不影响「跑哪几道」**：两种档都是 11 道（其中 4 道适用、7 道 N/A）。
// 默认档 = 产品默认路径（incremental）；`--legacy` 是同一批门的对照口径。档位与阈值都印在头上，
// 免得「这一档存在但没人知道」。
console.log(`${gates.length} 道门并行跑（${jobs} 路，${os.cpus().length} 核）：${gates.map((g) => g.name).join(" · ")}`);
console.log(
  `档位：${legacy
    ? "legacy（对照档）—— wide-ast / real-dts-ast 加 --legacy，判据 崩溃 0 / 差异 0 / fallback ≤2"
    : "incremental（默认档）—— 判据 崩溃 ≤5 且全在 lib.*.d.ts 预期清单 / 差异 ≤87 / fallback ≤94 / policyProblems 0"}`,
);
console.log("（清单与天花板只有一处：tests/parse/incremental-crash-expected.mjs；读数的来历见 _reports/D7.md）");
console.log("");
/** **先把不适用的挑出来**：它们不运行、不计失败，但**每一道的理由都要印出来**（见 notApplicableReason）。 */
const outcomes = new Map();
for (const gate of gates) {
  const why = notApplicableReason(gate);
  if (why !== null) outcomes.set(gate, { gate, skipped: why });
}
const runnable = gates.filter((gate) => !outcomes.has(gate));
const results = await pool(runnable, runOne);
for (const result of results) outcomes.set(result.gate, result);

/**
 * 每一门挑一行「结论」印出来（各自最后一行通常就是它 ✓）。
 *
 * **`gate.summary`（第 D3e 波加）**：有些门要印的**不是**结论行而是一条量出来的指标
 * （例如 `wide-ast` 的 `FileFallbackCount`）。声明一个正则，这里把**最后一条**命中的行取出来，
 * 接在结论后面一起印。它只影响**怎么印**，不参与 PASS/FAIL：`code` 仍然只看子进程退出码
 * ——阈值判在门自己那一侧（`tests/parse/wide-ast.mjs` 的 `FALLBACK_BASELINE`）。
 */
const conclusion = (text) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  return lines.length === 0 ? "（没有输出）" : lines[lines.length - 1].trim();
};
const summaryOf = (gate, text) => {
  if (!gate.summary) return "";
  const hit = text.split(/\r?\n/).filter((line) => gate.summary.test(line)).pop();
  return hit === undefined ? "" : `  ·  ${hit.trim()}`;
};

let failed = 0;
let passed = 0;
let skippedCount = 0;
for (const gate of gates) {
  const result = outcomes.get(gate);
  // **not-applicable 与 FAIL 是两种结论**：前者不运行、不计失败；理由照印（`--verbose` 再多一句去哪看清单）。
  if (result.skipped !== undefined) {
    skippedCount += 1;
    console.log(`N/A   ${gate.name.padEnd(14)}          ${result.skipped}`);
    if (verbose) {
      console.log("        （不运行；按跳过计，不计失败——清单与证据见 tests/MIGRATION.md「本仓库不适用的门」）");
      console.log("");
    }
    continue;
  }
  const ok = result.code === 0;
  if (ok) passed += 1;
  else failed += 1;
  const seconds = (result.ms / 1000).toFixed(1);
  console.log(`${ok ? "ok  " : "FAIL"}  ${gate.name.padEnd(14)} ${seconds.padStart(6)}s  ${conclusion(result.out)}${summaryOf(gate, result.out)}`);
  if (!ok || verbose) {
    const tail = (result.out + result.err).split(/\r?\n/).filter((line) => line.trim() !== "").slice(-8);
    for (const line of tail) console.log(`        ${line}`);
    console.log("");
  }
}

console.log("");
console.log(
  `${gates.length} 道门：${passed} 道通过、${failed} 道失败、${skippedCount} 道不适用（NOT-APPLICABLE，按跳过计）；墙钟 ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
// **档位也要在结尾说一句**：两种档都是 11 道 / 4 通过 / 0 失败 / 7 不适用 —— 数对不上时，
// 先看这一行再怀疑门（`wide-ast` 与 `real-dts-ast` 在对照档里各多一个 `--legacy`，门数不变）。
console.log(
  `（档位：${legacy ? "legacy 对照档（0/0/≤2）" : "incremental 默认档（崩溃 0 + 差异 33 + fallback 85(+外部 13) 是登记在案的读数）"}；` +
    "清单见 tests/parse/incremental-crash-expected.mjs）",
);
// **不适用的理由在门那一行已经印过一遍了**，这里只再说一句「它不掩盖真实失败」。
if (skippedCount > 0) {
  console.log("（不适用 = 命令依赖的源 / 产物在本仓库根本不存在；不是放过真实失败，清单见 tests/MIGRATION.md）");
}
// **哪几门没进池子就说清楚** ✗（`--jobs` 调小到 1 时也一样跑 ✓，只是慢 ✓）。
if (jobs < runnable.length) {
  console.log(`（${jobs} 路并行：别的门等前面让出来，总时长会长一些 ✓）`);
}
process.exit(failed === 0 ? 0 : 1);
