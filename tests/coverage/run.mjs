#!/usr/bin/env node
// 判据：**场景覆盖度**——五类语料，两种尺子。
//
//   node tests/coverage/run.mjs                     五类全跑 + 覆盖度报告
//   node tests/coverage/run.mjs --category stdlib   只跑一类
//   node tests/coverage/run.mjs --filter array-map  只跑 id 里带这个子串的
//   node tests/coverage/run.mjs --list              只列 id（一类一行）
//   node tests/coverage/run.mjs --verbose           每条一行（含判定与耗时）
//   node tests/coverage/run.mjs --strict            只要有一条不是 pass 就红
//   node tests/coverage/run.mjs --no-report         不写 report.json
//   node tests/coverage/run.mjs --no-batch          一条一个进程（权威口径，用来与批量对拍）
//
// ## 五类与两种尺子
//
// | 类别 | 目录 | 权重 | 尺子 |
// | --- | --- | --- | --- |
// | `token` | `tests/cases/token/<功能域>/` | 15% | **AST 尺子**：逐节点对 `ts.createSourceFile` |
// | `exec` | `tests/cases/exec/<功能域>/` | 25% | **执行尺子**：`node` 与 `tsrun` 各跑一遍，比 stdout 逐字节 + 退出码 |
// | `runtime` | `tests/cases/runtime/<功能域>/` | 25% | 同上 |
// | `stdlib` | `tests/cases/stdlib/<功能域>/` | 20% | 同上 |
// | `e2e` | `tests/cases/e2e/<功能域>/` | 15% | 同上 |
//
// **两种尺子，两套口径，都摆在这里**：
//
// 1. **执行尺子**（原来那四层）：一条 = 一个真跑的 `.ts`，裁判是**真 Node**，
//    比 **stdout 逐字节 + 退出码**。`nodeArgs` 那一档给有运行期语义、
//    类型剥离拒收的语法（`enum` / `namespace`）换 `--experimental-transform-types`。
// 2. **AST 尺子**（token）：一条 = 一份被解析的 `.ts`，裁判是 `ts.createSourceFile`，
//    比 **逐节点的 kind / 区间 / 字段名**，外加未映射 / 缺 range / 区间越界。
//    它**不开进程**（同一个进程里对拍），而且借的是 `cases:tsast` 的**同一份实现**
//    （`compareSource`）——两份实现就是两个口径。
//
// ## token 那两个数（第 685 轮）
//
// 原来 token 只有一把**布尔门**（`cases:tsast`：八项全 0 才退出码 0），
// 于是「还剩多少」在读数里看不见。这里把它折成百分比，**两个数都报**：
//
// - **A. 逐文件完全一致**：每个文件的四个方向 + 三栏地基都为 0。口径最严。
// - **B. 逐条用例还有没有差额**：上面这一条**再排除** `xl:known-gap` 与
//   `xl:ts-invalid` / `.tsx`（口径外的两类）。**加权用的是 B**。
//
// **为什么要 B**：`xl:known-gap` 那 218 条是**已经量出来的缺口**，
// 门把它们排除在八项之外（否则门永远红，红里分不出「新坏了」与「本来就还没做」）。
// 可「还差多少」不该跟着一起消失——B 把分子定成「没有差额的用例数」，
// 218 条缺口就在分母里，收掉一条涨一格。这与执行尺子的台账（`xl:want`）同一精神。
//
// ## 台账（`xl:want` / `xl:skip`，写在用例文件头）
//
// | 判决 | 含义 | 红不红 |
// | --- | --- | --- |
// | `ok` | 台账记 pass、现在 pass | — |
// | `known` | 台账记 blocked/differ、现在还是 | —（还差多少由覆盖度那一栏说） |
// | `MOVED` | 原来进不了门、现在跑得出来但还不对 | —（提示改台账） |
// | `NEWLY-PASSING` | 台账记没过、现在过了 | —（提示删掉那一行） |
// | `REGRESSION` | 台账记 pass、现在过不了 | **红** |
// | `BAD-CASE` | 裁判自己都跑不动（用例写错了） | **红** |
//
// 也就是说：**红只红在「比昨天差」，不红在「还差多少」**。
//
// 判据读的是 `build/**/*.js`——**跳过 `xl build` 的话，它量的是上一版的产物**。

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, isSkipped, listAll, listCategory } from "../cases/corpus.mjs";
import { LAYER_WEIGHTS } from "./matrix.mjs";
import { compareSource } from "../parse/ts-ast.mjs";
import { caseBody } from "../parse/tags.mjs";

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
const categoryFilter = value("--category");
const idFilter = value("--filter");
const jobs = Math.max(1, Number(value("--jobs", String(Math.min(8, os.cpus().length)))));
// **批数（=并行进程数）与并行度（=同时跑几个）是两件事，原来绑在一起。**
//
// 原来 `makeBatches()` / `makeJudgeBatches()` 都写 `batchCount = jobs` ⇒ 8 个 tsrun 进程、
// 而 `runOurs()` 的 worker 数也是 `jobs` ⇒ **8 路并行**。这台机器 16 核，
// 于是 CPU 只吃到 **63%**（实测采样 10 次：均值 62.6%、峰值 71%）——**一半的核在空转**。
//
// 批切细之后 work-stealing 才成立：worker 一空就领下一批，核一直有活。
// 代价是**进程启动次数**（每个 tsrun 启动实测约 100ms，见 `judge-batch.mjs` 的实测），
// 所以批数也不能无限大——`--batch-workers` 可调，默认按核数（这台机器 16）。
const batchWorkers = Math.max(1, Number(value("--batch-workers", String(Math.max(jobs, Math.min(32, os.cpus().length))))));
const useBatch = !flag("--no-batch");

const tsrun = path.join(root, "build", "ts", "tsrun.js");
// **每个实例一个工作目录**：共用一份时，两个实例并行会互相 `rm -rf` 掉对方的输入。
const workDir = path.join(here, `.work-${process.pid}`);
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

// ---------------------------------------------------------------------------
// 选中的语料
// ---------------------------------------------------------------------------
const all = listAll();
const hits = all.filter((entry) => (categoryFilter === "" || entry.category === categoryFilter)
  && (idFilter === "" || entry.id.includes(idFilter)));
if (hits.length === 0) {
  console.log(categoryFilter === "" && idFilter === ""
    ? "语料是空的：tests/cases/ 下一份用例都没有"
    : `没有命中的用例（--category ${categoryFilter} --filter ${idFilter}）`);
  process.exit(1);
}
// **口径外的不进分母，但要看得见**（`--list` 与报告里都单列）。
const selected = hits.filter((entry) => !isSkipped(entry));
const skipped = hits.filter((entry) => isSkipped(entry));
// **AST 尺子算不了的**：`xl:ts-invalid`（故意写非法 TS）与 `.tsx`（TSX 语法）——
// 它们与 `cases:tsast` 的门是同一份排除表，**不算进 token 的分母**，也不进报告的分母。
const tokenExcluded = (entry) =>
  entry.category === "token" && (entry.directives.tsInvalid || entry.file.endsWith(".tsx"));
const scored = selected.filter((entry) => !tokenExcluded(entry));
const excluded = selected.filter(tokenExcluded);

if (listOnly) {
  for (const entry of scored) console.log(`${entry.category.padEnd(8)} ${entry.id}`);
  for (const entry of excluded) console.log(`${entry.category.padEnd(8)} ${entry.id}  （口径外：故意非法 TS / TSX）`);
  for (const entry of skipped) console.log(`${entry.category.padEnd(8)} ${entry.id}  （口径外：${entry.directives.skip}）`);
  process.exit(0);
}

// **退出时删掉自己那一份工作目录**：留着的话每跑一次就多一个 `.work-<pid>`。
process.on("exit", () => {
  try {
    fs.rmSync(workDir, { recursive: true, force: true });
  } catch {
    // 删不掉**不是错误**（下一次跑用的是新的 pid 目录）。
  }
});
checkFreshness();
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });
/** 裁判侧那一份份 `.ts` 落在哪儿（见 `judgeSourceFile` 的说明）。 */
const srcDir = path.join(workDir, "src");
fs.mkdirSync(srcDir, { recursive: true });
// **哨兵 `package.json` 要写上，但里面不能有 `type`**（第 686 轮；原来写的是 `{"type":"commonjs"}`）。
//
// 那一份**本身是错的**，错在把两种判据的**入口形态**混成一种。`.ts` 的执行形态由最近的
// `package.json` 决定，而「最近的 `package.json`」对**入口点**与对 **`import()` 进来的模块**
// 是两回事：
//
//   · `node <文件>.ts`（`--no-batch` 那一档）——Node 按最近的 `package.json` 取到 commonjs 后
//     先按 CJS 解析，**失败再按语法探测重试成 ESM**（`Failed to load the ES module: …`
//     那句 warning 就是这个重试），所以带 `export` / `import` / 顶层 `await` 的用例**跑得动**；
//   · 批里那句 `await import(url)`（`judge-batch.mjs`）——**没有那一步重试**，
//     在显式 `type: commonjs` 下带 ESM 语法的文件就是**硬语法错**。
//
// 于是同一条用例在两档里结论不同，而 `verdictOf` 只看裁判的退出码 ⇒ 判 `nodefail` / `bad`
// （第 685 轮那 3 条 `bad` 就是这么来的：`006-module-export` / `007-module-import` /
// `056-l677p-dynamic-import`——**它们没有一条真的跑不动**，是这一份哨兵把批那一路弄坏的）。
//
// **两种改法都实测过，只有这一种对**（关键是这一层在仓根那份 `type: commonjs` 之下，
// 仓根那份不能动——`tests/cases/package.json` 也依赖它）：
//
//   · **删掉这一份** ✗：最近的 `package.json` 变成仓根那份 `type: commonjs`，批那一路照旧硬错；
//   · **换成 `{"type":"module"}`** ✗：ESM 一律严格模式，而这一层语料的期望值全是照松散模式
//     写的（写只读属性静默、`delete` 不可配置属性静默、非严格调用里 `this` 指向全局）——
//     实测 `bad 3 → 12`、`differ 40 → 50`、通过 3520 → 3500；
//   · **`{}`（只有注释、没有 `type`）** ✓：**没有显式 `type` ⇒ Node 对 `.ts` 走语法探测**，
//     批那一路与 `node <文件>.ts` 落到同一个模式上；而这一层仍在仓根的 commonjs 之内，
//     松散模式那一半原样保住（实测同一条用例在两档下的 `this` / 冻结写 / `delete` 三个读数
//     逐字相同）。
//
// 也就是说这里要的是**「没有显式 type」**，不是「显式换成另一个 type」。
fs.writeFileSync(
  path.join(srcDir, "package.json"),
  `${JSON.stringify({ "//": "本目录**故意不写 type**：写了就把批那一路的 import() 钉死在那个模式上（见 run.mjs 里这段注释）。" }, null, 2)}\n`,
  "utf8",
);

/** **异步**跑一个进程——并发池真正并行起来靠的就是它（`spawnSync` 会堵住事件循环）。 */
function runAsync(argv) {
  return new Promise((resolve, reject) => {
    // **把宿主自己的告警关掉**（第 735 轮）：这一层测的是「脚本往两条流写了什么」，
    // 而 `node` 跑 `.ts` 时会额外打两三行**它自己的**东西
    //（`ExperimentalWarning: Transform Types …` + `(Use \`node --trace-warnings\` …)`
    // + `[MODULE_TYPELESS_PACKAGE_JSON] Warning …`）——**每一份 exec 用例都有**。
    // **实测**：不关的话通过数从 7480 掉到 7474、`differ` 从 85 涨到 95，
    // 而红的那十条**一条都不是真缺口**（全是这一档噪声）。
    // **为什么在这里关而不是在过滤那一支**：告警有几行是**成对**出现的
    //（第二行以 `(Use …` 开头，形状与第一行完全不同），
    // 逐个认形状就是一份**会长**的名单；`NODE_NO_WARNINGS` 是**一处关掉源头**。
    // **被测侧不用关**：`tsrun` 不打这些告警（它不跑 `.ts` 的类型剥离）。
    const child = spawn(process.execPath, argv, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
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

/**
 * **把宿主自己的唠叨滤掉**（第 735 轮，**实测撞到的**）。
 *
 * `stderr` 这一格一旦开始比，`node` 自己打的那些行就全跑出来了——**它们与脚本无关**：
 * `(node:1234) ExperimentalWarning: Transform Types is an experimental feature …`
 * （裁判跑 `.ts` 用的就是那个特性 ⇒ **每一份 exec 用例都有这一行**）、
 * `[MODULE_TYPELESS_PACKAGE_JSON] Warning: …`（模块类型没声明）、
 * 以及顶层抛出时那一段**栈**（里面是宿主自己的路径与行号，
 * 而两条路的工作目录不同 ⇒ **永远不可能逐字节相同**）。
 *
 * **判据是「这一行是不是宿主在说自己的事」**：这一档一律丢掉，
 * 剩下的才是「**脚本往 stderr 写了什么**」——那正是要比的东西。
 * **不丢的话**后果是**每一份 exec 用例都红**（实测：通过数从 7480 掉到 7474，
 * `differ` 从 85 涨到 95，而红的那十条**一条都不是真缺口**）。
 */
function hostNoiseLines(buffer) {
  return buffer.toString("utf8").split("\n").filter((line) => {
    const text = line.trim();
    if (text === "") return false;
    // `node` 自己的告警与提示（都带这个形状的前缀）。
    if (/^\(node:\d+\)/.test(text)) return false;
    if (/^\[[A-Z_]+\]\s*Warning:/.test(text)) return false;
    if (/^(ExperimentalWarning|DeprecationWarning|Warning):/.test(text)) return false;
    // **栈帧**：`at …` 与 `file:///…`（宿主路径与行号，两条路一定不同）。
    if (/^at\s/.test(text)) return false;
    if (/^file:\/\//.test(text)) return false;
    if (/^Node\.js v/.test(text)) return false;
    // `node:internal/…` 那几行（同样的理由）。
    if (/^node:internal\//.test(text)) return false;
    return true;
  });
}

/** 两条流的「脚本自己写的那一部分」逐行相同。 */
function sameScriptStderr(oracle, ours) {
  const a = hostNoiseLines(oracle);
  const b = hostNoiseLines(ours);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** 执行尺子判一条：把「裁判那一对」与「被测那一对」比出结论。 */
function verdictOf(entry, oracle, ours) {
  const mine = ours.stderr.toString("utf8").split("\n").find((line) => line.trim() !== "") || "";
  const mayFail = entry.directives.nodeMayFail;
  if (oracle.status !== 0 && !mayFail) {
    const first = oracle.stderr.toString("utf8").split("\n").find((line) => line.trim() !== "") || "";
    return { actual: "nodefail", detail: `node 自己跑不动：${first.trim().slice(0, 120)}` };
  }
  if (oracle.stdout.length === 0) {
    return { actual: "nodefail", detail: "node 一行都没打印（用例不合格：不打印的通过等于没验）" };
  }
  if (ours.stdout.length === 0 && ours.status !== 0) {
    return { actual: "blocked", detail: mine.trim().slice(0, 120) };
  }
  if (ours.status !== oracle.status) {
    return {
      actual: "differ",
      detail: `退出码 node=${oracle.status} tsrun=${ours.status}${mine ? `｜${mine.trim().slice(0, 90)}` : ""}`,
    };
  }
  if (Buffer.compare(oracle.stdout, ours.stdout) !== 0) {
    return { actual: "differ", detail: `stdout 不同：${firstDifference(oracle.stdout, ours.stdout)}` };
  }
  // **stderr 也要比**（第 735 轮）：原来只比 stdout，因为在此之前**没有一条路
  // 会往 stderr 写东西**（`console.log` 那一条是唯一的出口）。
  // 第 735 轮把 `console.error` / `warn` 按 Node 的口径落到 stderr 之后，
  // 这一条就**非有不可**了——不比的话，`console.error` 的内容与顺序
  // **一个字节都没人管**（而它恰恰是这一轮新加的那一格）。
  // **只比「正常收场」那一档**：退出码非 0 时（`xl:may-fail` 那种「两边都抛」的用例）
  // Node 往 stderr 写的是**它自己的栈**、本仓写的是**一句话**——
  // 那是**宿主报错格式**的差，与「脚本往 stderr 写了什么」是两件事，
  // 而这一档的判据一直是「退出码对得上」（见那条用例的 `xl:title`）。
  if (oracle.status === 0 && ours.status === 0 && !sameScriptStderr(oracle.stderr, ours.stderr)) {
    return {
      actual: "differ",
      detail: `stderr 不同：node «${hostNoiseLines(oracle.stderr).join("|")}» vs tsrun «${hostNoiseLines(ours.stderr).join("|")}»`,
    };
  }
  return { actual: "pass", detail: "" };
}

/**
 * AST 尺子判一条：与 `cases:tsast` **同一份实现**（`compareSource`），
 * 判「过没过」用的是四方向 + 三栏地基（与那边的八项**同源**；
 * 那边多出来的第八项「抛异常」在这里单独记成 `blocked`）。
 */
function verdictOfToken(entry) {
  let row;
  try {
    row = compareSource(entry.source, entry.file, { list: false, limit: 0 });
  } catch (error) {
    return { actual: "blocked", detail: `产物抛异常：${String(error && error.Message ? error.Message : error).split("\n")[0].slice(0, 120)}`, diff: -1 };
  }
  const diff = row.missing + row.drift + row.extra + row.fieldDiff + row.unmapped.length + row.missingRange + row.outOfRange;
  if (diff === 0) return { actual: "pass", detail: "", diff: 0 };
  const parts = [];
  if (row.missing) parts.push(`缺 ${row.missing}`);
  if (row.drift) parts.push(`漂 ${row.drift}`);
  if (row.extra) parts.push(`多 ${row.extra}`);
  if (row.fieldDiff) parts.push(`字段 ${row.fieldDiff}`);
  if (row.unmapped.length) parts.push(`未映射 ${row.unmapped.length}`);
  if (row.missingRange) parts.push(`缺 range ${row.missingRange}`);
  if (row.outOfRange) parts.push(`越界 ${row.outOfRange}`);
  return { actual: "blocked", detail: `${parts.join("　")}　${entry.directives.knownGap || ""}`.trim().slice(0, 160), diff };
}

// ---------------------------------------------------------------------------
// 被测侧：一个进程跑一批（`tsrun --batch 清单`），**只有执行尺子那一类需要**
// ---------------------------------------------------------------------------
const stdoutEntries = scored.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.category !== "token");
const manifestsDir = path.join(workDir, "manifests");
fs.mkdirSync(manifestsDir, { recursive: true });

/**
 * **被测侧跑哪一份文件**：仓库里那一条 `.ts`（唯一的事实来源）。
 * `tsrun` 吃 `.ts`，与这一层原来的口径一字不差。
 */
function caseFile(entry) {
  return entry.file;
}

/**
 * **裁判侧跑哪一份文件**：`.work-<pid>/src/<下标>.ts`（每次现写，跑完就删）。
 *
 * 为什么裁判不能直接吃仓库里那份 `.ts`（第 685 轮实测三次才定下来）：
 * `.ts` 的执行形态由**最近的 `package.json`** 决定，而语料树在 `tests/cases/` 下、
 * 最近的是仓根那个 `"type": "commonjs"`，于是 `node <那份 .ts>` 把 `export` 当成
 * CJS 语法错（实测 `SyntaxError: Unexpected token 'export'`）。
 * 两条弯路也量过了：（a）给 `tests/cases/` 放一份 `"type": "module"` ⇒ `export` 通了，
 * 但 ESM 一律是**严格模式**，于是 12 条「写只读属性该静默」的用例变成抛错
 *（`Object.freeze` 之后写属性、`delete` 不可配置属性——它们的期望值正是照松散模式写的）；
 *（b）改写成 `.mjs` ⇒ **Node 只对 `.ts` 做类型剥离**，`.mjs` 里的类型注解全成语法错
 *（实测 1510 条 `nodefail`）。
 *
 * 所以落点是：**`.ts` 扩展名**（类型剥离照旧生效）+ **这一份目录里的
 * `package.json` 写 `"type": "module"`**（ES 模块，`import` / `export` 有意义，
 * 而严格模式那一档由这一层的口径自己决定，见 `judgeSourceDir`）。
 *
 * `.work-<pid>/` 本来就是每次跑完就删的临时目录，所以这里没有引入第二份要维护的源码：
 * **仓库里的 `.ts` 是唯一的事实来源**，跑的时候按判据的形态各落一份。
 */
function judgeSourceFile(row) {
  return path.join(srcDir, `${row.index}.ts`);
}

function makeBatches() {
  const batchCount = Math.max(1, Math.min(batchWorkers, stdoutEntries.length));
  const groups = Array.from({ length: batchCount }, () => []);
  for (let i = 0; i < stdoutEntries.length; i++) groups[i % batchCount].push(stdoutEntries[i]);
  return groups.filter((g) => g.length > 0);
}

/**
 * **不能进裁判批的**（`judge-batch.mjs` 一个进程跑一批，每条之后只让两个 `setImmediate` tick）：
 *   · `process.exit` / `require(` —— 会把批进程带走或换掉模块语义；
 *   · **排宏任务的**（`setTimeout` / `setInterval` / `setImmediate`）——定时器还没到点，
 *     输出会落进**下一条**的缓冲。
 * **按源码认，不按台账认**——台账说的是「现在过不过」，它管的是「能不能进批」。
 */
function judgeGroup(entry) {
  if (/process\.exit|require\(|setTimeout|setInterval|setImmediate/.test(caseBody(entry.body))) return null;
  return entry.directives.nodeArgs.join(" ");
}

function makeJudgeBatches() {
  const groups = new Map();
  for (const row of stdoutEntries) {
    const key = judgeGroup(row.entry);
    if (key === null) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const batchCount = Math.max(1, Math.min(batchWorkers, stdoutEntries.length));
  const batches = [];
  for (const [key, rows] of groups) {
    const slices = Array.from({ length: Math.min(batchCount, rows.length) }, () => []);
    for (let i = 0; i < rows.length; i++) slices[i % slices.length].push(rows[i]);
    for (const slice of slices) if (slice.length > 0) batches.push({ key, rows: slice });
  }
  return batches;
}

/** 解析批进程交回的一行行 JSON。 */function parseRecords(stdout, into) {
  for (const line of stdout.toString("utf8").split("\n")) {
    if (line.trim() === "" || line.startsWith('{"begin"')) continue;
    let record = null;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record === null || record.id === undefined) continue;
    into.set(Number(record.id), {
      status: record.status,
      stdout: Buffer.from(record.stdout, "utf8"),
      stderr: Buffer.from(record.stderr, "utf8"),
    });
  }
  return into;
}

async function runJudgeProcess(batch) {
  const manifestPath = path.join(workDir, `judge-${batch.rows[0].index}.json`);
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(batch.rows.map((row) => ({ id: String(row.index), path: judgeSourceFile(row) }))),
    "utf8",
  );
  const nodeArgs = batch.key === "" ? [] : batch.key.split(" ");
  const out = await runAsync([...nodeArgs, path.join(here, "judge-batch.mjs"), manifestPath]);
  return parseRecords(out.stdout, new Map());
}

async function runJudge() {
  const oracleAll = new Array(scored.length);
  // **裁判侧那一份份 `.mjs`**：先全部落地，再开跑（见 `judgeSourceFile` 的说明）。
  for (const row of stdoutEntries) {
    fs.writeFileSync(judgeSourceFile(row), caseBody(row.entry.body).trimEnd() + "\n", "utf8");
  }
  if (!useBatch) {
    const rows = stdoutEntries;
    let at = 0;
    await Promise.all(
      Array.from({ length: Math.min(jobs, rows.length) }, async () => {
        for (;;) {
          const slot = at++;
          if (slot >= rows.length) return;
          const row = rows[slot];
          oracleAll[row.index] = await runAsync([...row.entry.directives.nodeArgs, judgeSourceFile(row)]);
        }
      }),
    );
    return oracleAll;
  }
  const batches = makeJudgeBatches();
  const batched = batches.reduce((sum, batch) => sum + batch.rows.length, 0);
  console.log(
    `裁判：${batches.length} 个进程跑 ${batched} 条（每个进程约 ${Math.round(batched / Math.max(1, batches.length))} 条）`
    + `；另有 ${stdoutEntries.length - batched} 条按单条跑（排宏任务 / 会带走进程的那种）`,
  );
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(batchWorkers, batches.length) }, async () => {
      for (;;) {
        const index = cursor++;
        if (index >= batches.length) return;
        const found = await runJudgeProcess(batches[index]);
        for (const [caseIndex, record] of found) oracleAll[caseIndex] = record;
      }
    }),
  );
  const missing = [];
  for (const { index } of stdoutEntries) if (oracleAll[index] === undefined) missing.push(index);
  if (missing.length > 0) {
    console.log(`（裁判批里有 ${missing.length} 条没交回结果：按单条重跑）`);
    let at = 0;
    await Promise.all(
      Array.from({ length: Math.min(jobs, missing.length) }, async () => {
        for (;;) {
          const slot = at++;
          if (slot >= missing.length) return;
          const index = missing[slot];
          const row = stdoutEntries.find((r) => r.index === index);
          oracleAll[index] = await runAsync([...scored[index].directives.nodeArgs, judgeSourceFile(row)]);
        }
      }),
    );
  }
  return oracleAll;
}

async function runBatchProcess(rows) {
  const manifestPath = path.join(manifestsDir, `batch-${rows[0].index}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(rows.map(({ entry, index }) => ({ id: String(index), path: caseFile(entry) }))), "utf8");
  const out = await runAsync([tsrun, "--batch", manifestPath]);
  return parseRecords(out.stdout, new Map());
}

async function runOurs() {
  const ours = new Array(scored.length);
  if (!useBatch) {
    let at = 0;
    await Promise.all(
      Array.from({ length: Math.min(jobs, stdoutEntries.length) }, async () => {
        for (;;) {
          const slot = at++;
          if (slot >= stdoutEntries.length) return;
          const { entry, index } = stdoutEntries[slot];
          ours[index] = await runAsync([tsrun, caseFile(entry)]);
        }
      }),
    );
    return ours;
  }
  const batches = makeBatches();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(batchWorkers, batches.length) }, async () => {
      for (;;) {
        const index = cursor++;
        if (index >= batches.length) return;
        const found = await runBatchProcess(batches[index]);
        for (const [caseIndex, record] of found) ours[caseIndex] = record;
      }
    }),
  );
  const missing = [];
  for (const { index } of stdoutEntries) if (ours[index] === undefined) missing.push(index);
  if (missing.length > 0) {
    console.log(`（批里有 ${missing.length} 条没交回结果：按单条重跑）`);
    let at = 0;
    await Promise.all(
      Array.from({ length: Math.min(jobs, missing.length) }, async () => {
        for (;;) {
          const slot = at++;
          if (slot >= missing.length) return;
          const index = missing[slot];
          ours[index] = await runAsync([tsrun, caseFile(scored[index])]);
        }
      }),
    );
  }
  return ours;
}

// ---------------------------------------------------------------------------
// 跑
// ---------------------------------------------------------------------------
const results = new Array(scored.length);
const startedAll = process.hrtime.bigint();
const oursAll = await runOurs();
const oursMs = Number(process.hrtime.bigint() - startedAll) / 1e6;
const judgeStarted = process.hrtime.bigint();
const oracleAll = await runJudge();
const judgeMs = Number(process.hrtime.bigint() - judgeStarted) / 1e6;
console.log(`被测侧 ${(oursMs / 1000).toFixed(1)}s、裁判侧 ${(judgeMs / 1000).toFixed(1)}s`);

const astStarted = process.hrtime.bigint();
// **先把每条落到自己的下标上**：不得用 `push`（那样同一条会被写两遍——
// stdout 那一条既在 worker 里写、又在下面统一判，条数直接翻倍）。
const indexOfEntry = new Map();
for (let index = 0; index < scored.length; index++) {
  indexOfEntry.set(scored[index], index);
  const entry = scored[index];
  if (entry.category !== "token") continue;
  results[index] = { entry, ...verdictOfToken(entry) };
}
const astMs = Number(process.hrtime.bigint() - astStarted) / 1e6;

let cursor = 0;
const workers = Array.from({ length: Math.min(jobs, Math.max(1, stdoutEntries.length)) }, async () => {
  for (;;) {
    const index = cursor++;
    if (index >= stdoutEntries.length) return;
    const { entry, index: at } = stdoutEntries[index];
    let outcome;
    try {
      outcome = verdictOf(entry, oracleAll[at], oursAll[at]);
    } catch (error) {
      outcome = { actual: "nodefail", detail: `跑不起来：${error.message}` };
    }
    results[at] = { entry, ...outcome };
  }
});
await Promise.all(workers);
console.log(`AST 尺子 ${(astMs / 1000).toFixed(1)}s`);

// ---------------------------------------------------------------------------
// 判决与覆盖度
//
// **只用一次遍历、只从 `results` 里算**（第 685 轮重写）：原来这里是"边判边累加"
// （`bucket.pass += 1` 与 `bucket[actual] += 1` 两套计数），于是同一个数在两个地方各长一次，
// 症状是**分类那一行的 pass 恰好是逐条通过数的两倍**，而总数又是对的——
// 排查它花的时间比写这段代码还多。现在改成：判定一趟、统计一趟，统计**不持有累加器**，
// 每个数都是当场 `filter().length` 出来的。
// ---------------------------------------------------------------------------
/**
 * 一条用例的**台账**（红只红在「比昨天差」）。
 *
 * 两套尺子各有自己的登记方式，但**语义是同一个**：
 *
 *   · 执行尺子（exec / runtime / stdlib / e2e）：`xl:want blocked|differ`；
 *   · AST 尺子（token）：`xl:known-gap` —— 登记着就是 `blocked`，没登记就是 `pass`。
 *
 * 两者都遵守同一条纪律：**登记过的照样每次真跑**；哪天对上了，判 `NEWLY-PASSING`
 * 提示把那一行登记删掉。token 那一侧由 `cases:tsast` 的 `knownGapCheck` 负责红，
 * 这里负责把它折进百分比（219 条留在分母里，收掉一条涨一格）。
 */
const wantOf = (entry) => {
  if (entry.category === "token") return entry.directives.knownGap !== "" ? "blocked" : "pass";
  return entry.directives.want || "pass";
};
const decisions = results.filter((result) => result !== undefined && result.actual !== undefined);
for (const result of decisions) {
  const { entry, actual } = result;
  const want = wantOf(entry);
  if (actual === "pass") result.verdict = want === "pass" ? "ok" : "NEWLY-PASSING";
  else if (actual === "nodefail") result.verdict = "BAD-CASE";
  else if (want === actual) result.verdict = "known";
  else if (want === "blocked" && actual === "differ") result.verdict = "MOVED";
  else result.verdict = "REGRESSION";
}
const red = decisions.filter((r) => r.verdict === "REGRESSION" || r.verdict === "BAD-CASE").length;

const rows = CATEGORIES.map((category) => {
  const list = decisions.filter((r) => r.entry.category === category);
  return {
    category,
    weight: LAYER_WEIGHTS[category] ?? 0,
    total: list.length,
    pass: list.filter((r) => r.actual === "pass").length,
    blocked: list.filter((r) => r.actual === "blocked").length,
    differ: list.filter((r) => r.actual === "differ").length,
    nodefail: list.filter((r) => r.actual === "nodefail").length,
  };
}).filter((bucket) => bucket.total > 0);

if (process.env.XL_COVERAGE_SELFCHECK === "1") {
  const sum = rows.reduce((a, b) => a + b.total, 0);
  console.log(`[自查] results.length=${results.length} 已判定=${decisions.length} 进桶=${sum}`);
}
console.log("");
console.log("=== 场景覆盖度：token / exec / runtime / stdlib / e2e ===");
console.log(`${scored.length} 条（另有口径外 ${skipped.length + excluded.length} 条：skip ${skipped.length}、故意非法 TS / TSX ${excluded.length}）`);
console.log("");
console.log("类       覆盖度                     条数                     贡献（权重 × 覆盖度）");
let progress = 0;
for (const bucket of rows) {
  const coverage = bucket.pass / bucket.total;
  const contribution = bucket.weight * coverage;
  progress += contribution;
  console.log(`  ${bucket.category.padEnd(8)} ${(coverage * 100).toFixed(1).padStart(5)}%   `
    + `${String(bucket.pass).padStart(4)}/${String(bucket.total).padEnd(4)}  `
    + `(pass ${bucket.pass} · blocked ${bucket.blocked} · differ ${bucket.differ} · bad ${bucket.nodefail})`
    + `   ${(bucket.weight * 100).toFixed(0).padStart(3)}% × ${(coverage * 100).toFixed(1)}% = ${contribution.toFixed(2)}`);
}
console.log(`  ${"合计".padEnd(7)} ${(progress * 100).toFixed(2)} / 100  →  **整体 ${(progress * 100).toFixed(1)}%**`);

// token 的**两个数**（口径见文件头）
const tokenAll = results.filter((r) => r.entry.category === "token");
const tokenGap = tokenAll.filter((r) => r.entry.directives.knownGap !== "");
const tokenNoGap = tokenAll.filter((r) => r.entry.directives.knownGap === "");
if (tokenAll.length > 0) {
  // **两个数（口径见文件头）**：
  //   A = 逐文件完全一致（含缺口里已经对上的那些）
  //   B = **只看没有登记缺口的那些**——登记了缺口的**整条**排除在分母外，
  //       所以 B 的分母是"本来该全对的用例"，它掉下来就是**真的坏了**。
  const exact = tokenAll.filter((r) => (r.diff ?? -1) === 0).length;
  const exactNoGap = tokenNoGap.filter((r) => (r.diff ?? -1) === 0).length;
  const gapStillOpen = tokenGap.filter((r) => (r.diff ?? -1) !== 0).length;
  console.log("");
  console.log("token 的两个数：");
  console.log(`  A 逐文件完全一致（四方向 + 三栏地基全 0）        ${String(exact).padStart(4)} / ${String(tokenAll.length).padEnd(4)}  = ${((100 * exact) / tokenAll.length).toFixed(1)}%   ← 含 ${tokenGap.length} 条已登记缺口`);
  console.log(`  B 没登记缺口的用例里全对的           ${String(exactNoGap).padStart(4)} / ${String(tokenNoGap.length).padEnd(4)}  = ${((100 * exactNoGap) / Math.max(1, tokenNoGap.length)).toFixed(1)}%   ← 加权用的是这个`);
  console.log(`  （xl:known-gap ${tokenGap.length} 条：还对不上 ${gapStillOpen}、已收掉 ${tokenGap.length - gapStillOpen}——收掉的要来删指令）`);
}
console.log("");
if (skipped.length > 0) {
  console.log(`口径外（不测，${skipped.length} 条）——**理由写在用例文件头的 xl:skip 里**：`);
  for (const entry of skipped) console.log(`  ${entry.category.padEnd(8)} ${entry.id.padEnd(46)} ${entry.directives.skip}`);
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
const reason = (result) => result.entry.directives.why || result.detail;
show("进不了门（blocked）", blocked, (r) => `${r.entry.category.padEnd(8)} ${r.entry.id.padEnd(46)} ${reason(r)}`);
show("跑得出来但 stdout / 退出码不同（differ）", differ, (r) => `${r.entry.category.padEnd(8)} ${r.entry.id.padEnd(46)} ${reason(r)}`);
show("用例自己不合法（bad）", bad, (r) => `${r.entry.category.padEnd(8)} ${r.entry.id.padEnd(46)} ${r.detail}`);
show("台账该更新了（原来记 blocked、现在过了）", newly, (r) => `${r.entry.category.padEnd(8)} ${r.entry.id}`);
show("进了一步（原来进不了门，现在跑得出来但还不对）", moved, (r) => `${r.entry.category.padEnd(8)} ${r.entry.id.padEnd(46)} ${r.detail}`);
show("**倒退**（台账记 pass、现在过不了）", regressions, (r) => `${r.entry.category.padEnd(8)} ${r.entry.id.padEnd(46)} ${r.detail}`);

/**
 * `detail` 里**不许出现「跑一次变一次」的东西**（第 884 轮）。
 *
 * `report.json` 是**进仓**的读数。可它里面有一批 `detail` 会把
 * `file:///…/tests/coverage/.work-<pid>/src/<下标>.ts` **原样抄进去**——
 * 那些用例是**故意打印 Error 的栈**的（`stdlib/console/011` 那一族：
 * `console.log(new Error("boom"))` 的栈就是被测的那一格），栈帧里当然带着裁判跑的那个临时路径。
 * 临时目录**按 pid 分开是故意的**（并行实例互不干扰，见 `workDir`），可它一旦进了读数，
 * **同一次运行、两次写出来的 `report.json` 就不是同一份字节**：第 883 → 884 轮实测，
 * 那一轮的 diff **整整 4 行全是 `.work-5500` → `.work-28348`**，没有一行是台账真的动了。
 * 那不只是噪声：**真正的台账变化会被这 4 行淹掉**（这一份文件进仓的全部意义就是给人看 diff）。
 *
 * 所以这里在**写读数那一刻**把工作目录折成一个稳定的占位符——**只动报告，不动运行**：
 * 盘符、大小写、反斜杠 / 正斜杠（`file://` URL 那边是正斜杠）都放过，
 * 剩下的 pid 尾巴也兜一格（换了 pid 来源时仍然稳定）。
 */
function stableDetail(text) {
  if (typeof text !== "string" || text === "") return text;
  // 反斜杠 / 正斜杠都认：`workDir` 是 `…\.work-123`，而 `file://` URL 里是 `…/.work-123`。
  const escaped = workDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\\/g, "[\\\\/]");
  return text.replace(new RegExp(escaped, "g"), "<work>").replace(/\.work-\d+/g, "<work>");
}

const summary = {
  round: value("--round", ""),
  total: scored.length,
  skipped: skipped.map((entry) => ({ id: entry.id, category: entry.category, why: entry.directives.skip })),
  excluded: excluded.map((entry) => ({ id: entry.id, category: entry.category, why: entry.directives.tsInvalid ? "xl:ts-invalid（故意写非法 TS）" : "TSX（TSX 语法）" })),
  progressPercent: Number((progress * 100).toFixed(2)),
  categories: rows.map((bucket) => ({
    category: bucket.category,
    weight: bucket.weight,
    total: bucket.total,
    pass: bucket.pass,
    blocked: bucket.blocked,
    differ: bucket.differ,
    nodefail: bucket.nodefail,
    coverage: Number(((bucket.pass / bucket.total) * 100).toFixed(2)),
  })),
  token: tokenAll.length === 0 ? null : {
    total: tokenAll.length,
    knownGap: tokenGap.length,
    knownGapStillOpen: tokenGap.filter((r) => (r.diff ?? -1) !== 0).length,
    exactFiles: tokenAll.filter((r) => (r.diff ?? -1) === 0).length,
    scoredWithoutGap: tokenNoGap.length,
    passedWithoutGap: tokenNoGap.filter((r) => (r.diff ?? -1) === 0).length,
  },
  blocked: blocked.map((r) => ({ id: r.entry.id, category: r.entry.category, title: r.entry.directives.title, detail: stableDetail(r.detail) })),
  differ: differ.map((r) => ({ id: r.entry.id, category: r.entry.category, title: r.entry.directives.title, detail: stableDetail(r.detail) })),
  bad: bad.map((r) => ({ id: r.entry.id, category: r.entry.category, detail: stableDetail(r.detail) })),
  moved: moved.map((r) => ({ id: r.entry.id, category: r.entry.category, why: r.entry.directives.why || "", detail: stableDetail(r.detail) })),
  newlyPassing: newly.map((r) => ({ id: r.entry.id, category: r.entry.category })),
  regressions: regressions.map((r) => ({ id: r.entry.id, category: r.entry.category, detail: stableDetail(r.detail) })),
};

// **过滤过的一次运行不覆盖读数**：`report.json` 是**整张矩阵**的读数，
// 而 `--category` / `--filter` 只是一次查看——让它覆盖的话，那一次**部分**运行会被当成全局读数。
const filteredRun = categoryFilter !== "" || idFilter !== "";
if (writeReport && filteredRun) {
  console.log("（这是**过滤后**的一次运行，`report.json` 不覆盖——去掉 `--category` / `--filter` 再跑才会写读数）");
}
if (writeReport && !filteredRun) {
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2) + "\n", "utf8");
  console.log(`report.json 已写：${path.relative(root, reportPath)}`);
}
if (verbose) {
  console.log("");
  for (const result of results) {
    console.log(`${result.verdict.padEnd(14)} ${result.entry.category.padEnd(8)} ${result.entry.id}`);
  }
}
console.log(`覆盖度：${results.filter((r) => r && r.actual === "pass").length} / ${results.length} 条通过；`
  + `blocked ${blocked.length}、differ ${differ.length}、bad ${bad.length}；`
  + `整体加权 ${(progress * 100).toFixed(1)}%`);
if (verbose) {
  const sum = rows.reduce((a, b) => a + b.total, 0);
  console.log(`（自查：results 长度 ${results.length}、聚合进桶 ${sum}、判决行 ${results.filter((r) => r && r.verdict).length}）`);
}

// `--emit-ledger`：按现状打一份台账骨架（给人改），逐类的键是**新 id**。
if (flag("--emit-ledger")) {
  console.log("");
  console.log("export const LEDGER = {");
  for (const result of results) {
    if (result.actual === "pass" && wantOf(result.entry) === "pass") continue;
    const kind = result.actual === "pass" ? "pass" : result.actual === "differ" ? "differ" : "blocked";
    console.log(`  ${JSON.stringify(result.entry.id)}: { want: ${JSON.stringify(kind)}, why: ${JSON.stringify(result.detail.slice(0, 110))} },`);
  }
  console.log("};");
}
process.exit(red > 0 || (strict && blocked.length + differ.length + bad.length > 0) ? 1 : 0);
