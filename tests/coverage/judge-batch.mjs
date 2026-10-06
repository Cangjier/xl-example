// **裁判那一侧的批量跑**：一个进程跑一批用例，把每条的 stdout / 退出码逐条交回去
// （第 320 轮加，用户口径：「不要 cache 方案」+「起 n 个进程，每个进程跑一组 cases」）。
//
// **为什么必须批** ✗：这台机器上**每次 `node` 启动 ~100ms 且并行度很差** ✓——
// 实测（第 320 轮）：64 次 `node -e 0`、16 路并发 ⇒ 6519ms ✓（每次摊销 101ms ✓）；
// 1 路 ⇒ 16 次 1639ms ✓（每次 102ms ✓）——**并发完全不省时间** ✗。
// 而纯 CPU 那一路能并行 ✓（16 个满载进程 ≈ **6.1 核** ✓），所以瓶颈**就是进程启动** ✓
// ⇒ 唯一的出路是**少起进程** ✓：1113 条用例的裁判那一半从 1113 次启动降到十几次 ✓。
//
// **每一条仍然是自己的模块** ✗：`import()` 一个文件就是一个独立的模块作用域 ✓
// （与 `node file.ts` **同一套** ESM 语义 ✓、同样走类型剥离 ✓）——
// 不是把源码拼起来 ✓（拼接会改变语义 ✗，那条路第 318 轮就否掉了 ✓）。
//
// **谁不能进批** ✓（调用方筛掉，见 `run.mjs` 的 `judgeGroup` ✓）：
//   · **会排异步工作的** ✗（`node file.ts` 会在**退出前**把微任务与事件循环跑干净 ✓，
//     而批里那一条 `import()` 一返回就轮到下一条 ✓ ⇒ 前一条**迟到的输出会落进后一条的缓冲** ✗
//     ——实测不筛时 `bad` 从 0 涨到 4 ✓、通过数掉了一截 ✓，**而它看起来只是「跑得快了」** ✗）；
//   · **会把进程带走的** ✗（`process.exit` ✓）：真出现时这一批提前结束 ✓，
//     调用方发现「某几条没交回结果」就**按单条重跑** ✓。
//
// **协议**（与 `tsrun --batch` 一字不差 ✓）：先一行 `{"begin":true,"count":N}` ✓，
// 然后每条一行 `{"id","status","stdout","stderr"}` ✓。

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const manifestPath = process.argv[2];
if (!manifestPath) {
  process.stderr.write("judge-batch: 需要一个清单文件\n");
  process.exit(2);
}
const items = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const write = (line) => process.stdout.write(line + "\n");
write(JSON.stringify({ begin: true, count: items.length }));

/** 跑一条：把它的 stdout / stderr 收进缓冲 ✓，顶层抛出算退出码 1 ✓。 */
async function judgeOne(item) {
  const outChunks = [];
  const errChunks = [];
  const realOut = process.stdout.write.bind(process.stdout);
  const realErr = process.stderr.write.bind(process.stderr);
  const collector = (chunks) => (chunk, encoding, callback) => {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk, encoding || "utf8") : chunk);
    if (typeof encoding === "function") encoding();
    else if (typeof callback === "function") callback();
    return true;
  };
  process.stdout.write = collector(outChunks);
  process.stderr.write = collector(errChunks);
  let status = 0;
  let failure = "";
  try {
    // **每条一个独立的模块作用域** ✓（查询串只是让它不被模块缓存复用 ✓）。
    const url = pathToFileURL(path.resolve(item.path)).href + `?case=${encodeURIComponent(item.id)}`;
    await import(url);
    // **`await import()` 返回之后，这一条可能还排着微任务** ✓（`main()` 没人在等它 ✓）——
    // `node file.ts` 会在**退出前**把它们跑干净 ✓，这里就**让几个 tick**再收工 ✓
    //（`setImmediate` 排在**微任务之后** ✓，所以 2 个 tick 足够让那些 `Promise` 链跑完 ✓）。
    //
    // **这是一处近似** ✗（写在明处 ✓）：定时器还没到点的那种（`setTimeout(f, 100)` ✓）
    // 这里**等不到** ✓——真出现时它的输出会落进**下一条**缓冲 ✗。
    // 所以这一条纪律要配一句**可执行的验证** ✓：拿 `--no-batch`（一条一进程 ✓）
    // 跑一整轮，与批量那一轮**逐条对拍** ✓（第 320 轮实测 1113 条逐条一致 ✓）。
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  } catch (error) {
    // **与 `node file.ts` 同一个形状** ✓：顶层抛出去 ⇒ 退出码 1 ✓、栈进 stderr ✓
    //（调用方只在「进不了门」时读 stderr 的第一行 ✓，形态对齐就够 ✓）。
    status = 1;
    failure = error && error.stack ? String(error.stack) : String(error);
  } finally {
    process.stdout.write = realOut;
    process.stderr.write = realErr;
  }
  return { status, stdout: Buffer.concat(outChunks).toString("utf8"), stderr: failure === "" ? "" : failure + "\n" };
}

for (const item of items) {
  const result = await judgeOne(item);
  write(JSON.stringify({ id: item.id, status: result.status, stdout: result.stdout, stderr: result.stderr }));
}
