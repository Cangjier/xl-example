// 第三个出口（`Token.PrintDirectAst`）的专属尺子（第 992 轮起，第 1013 轮改成单跑）。
//
//   node tests/parse/direct-ast.mjs            # 全语料（用例 + samples）
//   node tests/parse/direct-ast.mjs --all      # 再加上 node_modules / dist/ts（搬页时跑一遍）
//   node tests/parse/direct-ast.mjs --limit 50 # 只跑前 50 份（调这一格的时候用）
//
// ## 为什么要有这一把
//
// `core/syntax/token.xl.md` 给第三个出口只留了一条路（第 1013 轮）：
// **`PrintDirectAst` 就是这一格的唯一写法**，`PrintAst` 与它那条派发分支已经删掉。
// 于是这一门量的是这一趟本身**稳不稳**：同一份输入投两遍必须**逐字节相同**，
// 记账（`unmapped` / `count`）也必须相同。
//
// **为什么判据是「逐字节」而不是「意思差不多」** ✗：这一格是把「这一格出什么」
// **重新按解析期已有的东西说一遍**（`ctx.Text(v)` → `this.TempToString()`、
// 回原文 `indexOf` → token 上记的 `nameStart`）。这种写法的错法**恰好**是在边界上差一点：
// 值不在这一格上时旧路退回 `source.slice`（于是多切/少切一个字符）、区间算成反的、
// kind 落到兜底那一档。只比「有没有这个节点」看不见这些；
// `samples` 那份逐字节夹具又只覆盖三个文件。
//
// **第 1013 轮之前**这一门比的是「直出版与 `PrintAst` 同答」（直出通道开 / 关两遍对拍）。
// 那一对拍在两份写法**逐字节同答**这件事上跑了三千多份语料、一次没红过——
// 正因为同答是既成事实，用户口径才要求**删掉冗余的那一份**：
// 留下的这一份自己跟自己比，管的是「同一份输入不许投出两个答案」。
//
// ## 判据（两项）
//
//   ① **重投一致**：同一份输入投两遍，`ToJsonText` 逐字节相同，`unmapped` / `count` 也相同；
//   ② **不抛异常**：解析或投影抛了就是红（`corpus("cases")` 已经滤掉 `tsInvalid` / `known-gap`）。
//
// **退出码**：两项全 0 才是 0。**「token 自己出的比例」不进退出码**——它是
// 「这一格自己出不出」的读数（`direct / count`），不是缺陷；读数照样印出来，README 的台账抄它。
//
// ## 第 1009 / 1010 轮量出来的两件事（分母与「通用支」）
//
// **① 比例的分母是「问到的次数」，不是「产物里的节点数」**：`projectNode` 里那一问有三种去向——
// 答一个节点（`ctx.direct++`）、答 `ctx.Nothing`（**故意不出节点**）、答 `undefined`（走通用支）。
// 用例语料 1640 份实测 **16557 / 5291 / 26，合计 21874**（就是印出来的 `count`）。
// 那 5291 次是 `projectExpression` 这类调用点「先问一遍再自己摊平」问出来的，**不是缺口**；
// 真正的缺口是 26 次（**0.12%**）：`IfSet` 13（字段没记过时**写下来的让开**）、
// `Bracket` 13（`(` / `[` 是分组，要先把父 kind / 段名递进来才谈得上自己出）。
// ⇒ **拿这个百分比当判据会逼人去写没有出口的写法**（第 1009 轮）。
//
// **② 通用支**在这一趟**一次都没有真的出过节点**：这一项在实测里是 **0**（`--all` 2051 份也是 0）——
// 覆盖不到的那些格，走的都是这一格自己的覆写或「问完就丢」，没有一格透传。
// 同一轮数出来：运行期见到的 **117 个 token 类里 74 个覆写了 `PrintDirectAst`**，
// 另外 **43 个一次都没被问到过**（`IfSegment` / `NewType` / `ClassBody` / `SwitchCase` …）——
// 它们的节点由父单元直接摊平或丢弃，所以**不需要**自己出。
// ⇒ 判断「还差什么」，看的是**被问到的那 74 个类里谁答不出**，不是数源码上有几页。
//
// ## 语料口径
//
// **用例 + `samples`** 是这一门的默认口径（`--all` 会再加上 `node_modules` / `dist/ts`），
// 与 `cases:astjson` 同一份、同一个理由：`cases:shapes` 已经证明用例侧是
// 外部语料形状签名的**超集**，而全语料（`node_modules` + `dist/ts`）单进程要 ~37s——
// 这一门量的是「同一个节点两个出口对不对」，形状种子一一对应，用例那一份是最强的网。
// **搬页那一轮要额外跑一次 `--all`**：真实语料里的排法比用例杂（这一轮就是靠它兜住的）。
// `corpus("cases")` 是**同一个函数**（`ts-ast.mjs` 导出），`tsInvalid` / `.tsx` / `known-gap`
// 的跳过条件只有那一处。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { corpus } from "./ts-ast.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));
const { projectRoot, ToJsonText } = require(path.join(root, "build", "ts", "typescript", "print-ast-common.js"));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
};
const TOP = Math.max(1, Number(value("--top", "8")));
const LIMIT = Number(value("--limit", "0")) || 0;

/** 第一处不同的下标与它两边的一小段——报差异时**要能直接看出错在哪一格**。 */
function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  let at = 0;
  while (at < n && a[at] === b[at]) at++;
  const from = Math.max(0, at - 90);
  return {
    at,
    left: a.slice(from, Math.min(a.length, at + 90)),
    right: b.slice(from, Math.min(b.length, at + 90)),
    leftLength: a.length,
    rightLength: b.length,
  };
}

const files = flag("--all") ? corpus() : corpus("cases");
const run = LIMIT > 0 ? files.slice(0, LIMIT) : files;

let nodes = 0;
let direct = 0;
let parsed = 0;
const mismatches = [];
const errors = [];

for (const file of run) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  let source;
  try {
    source = fs.readFileSync(file, "utf8");
  } catch (error) {
    errors.push({ file: rel, why: `读不到：${error.message}` });
    continue;
  }
  try {
    const context = new TextContext(new Template());
    context.Process(new TextDocument(source));
    parsed++;
    // **一趟**（第 1013 轮）：第三个出口只剩 `PrintDirectAst` 一条路，
    // 所以这里量的不再是「两遍同不同答」，而是这一趟本身——
    // 出多少节点、由 token 自己出了多少个、以及**同一份输入重投一次是不是逐字节相同**。
    const first = projectRoot(context.Root.ToList(), source);
    const second = projectRoot(context.Root.ToList(), source);
    const a = ToJsonText(first);
    const b = ToJsonText(second);
    nodes += first.count;
    direct += first.direct;
    if (a !== b) {
      mismatches.push({ file: rel, diff: firstDiff(a, b) });
      continue;
    }
    if (first.count !== second.count) {
      mismatches.push({ file: rel, diff: { at: -1, left: `count ${first.count}`, right: `count ${second.count}` } });
      continue;
    }
    if (JSON.stringify(first.unmapped) !== JSON.stringify(second.unmapped)) {
      mismatches.push({
        file: rel,
        diff: { at: -1, left: JSON.stringify(first.unmapped), right: JSON.stringify(second.unmapped) },
      });
    }
  } catch (error) {
    errors.push({ file: rel, why: String(error && error.message ? error.message : error) });
  }
}

const share = nodes === 0 ? 0 : (direct / nodes) * 100;
console.log(
  `cases:direct —— 语料 ${run.length} 份（解析 ${parsed}）、投影 ${nodes} 个节点，` +
    `其中 token 自己出的 ${direct} 个（${share.toFixed(1)}%）`,
);
console.log(
  `重投一致 ${mismatches.length} 处不一致、抛异常 ${errors.length} 处` +
    `（同一份输入投两遍，逐字节比 + unmapped / count 记账）`,
);
console.log(
  `自己出的比例的分母是「问到的次数」，里面混着答 \`ctx.Nothing\`（故意不出节点）的那些——` +
    `所以它**不进退出码**；进退出码的是上面那两项。`,
);

if (flag("--verbose") || mismatches.length > 0 || errors.length > 0) {
  for (const one of mismatches.slice(0, TOP)) {
    console.log("");
    console.log(`FAIL  ${one.file}  第一处不同在下标 ${one.diff.at}（一遍 ${one.diff.leftLength} 字节 / 二遍 ${one.diff.rightLength} 字节）`);
    console.log(`      第一遍：${one.diff.left}`);
    console.log(`      第二遍：${one.diff.right}`);
  }
  if (mismatches.length > TOP) console.log(`（另有 ${mismatches.length - TOP} 份不一致，用 --top 调）`);
  for (const one of errors.slice(0, TOP)) console.log(`FAIL  ${one.file}  ${one.why}`);
  if (errors.length > TOP) console.log(`（另有 ${errors.length - TOP} 处异常）`);
}

if (mismatches.length > 0 || errors.length > 0) process.exit(1);
console.log(`第三个出口只有一条路，重投逐字节一致（${run.length} 份语料）`);
process.exit(0);
