// 标签级尺子：把用例文件开头那几行 `xl:expect` / `xl:absent` 当**真判据**跑一遍。
//
//   node tests/parse/tags.mjs              全部用例
//   node tests/parse/tags.mjs statements   只看某个 area
//   node tests/parse/tags.mjs --list       只列不一致的用例
//
// 它问的是**一个问题**：「这条用例说产物里该有什么，产物里真的有吗」。
//
// **为什么要有它**：`xl:expect` / `xl:absent` 从第 200 轮起就没有尺子读了 ✗——
// 于是 47 处期望随着解析器改名 / 改口径一起过期 ✓（例如类成员早年叫 `Method` ✓、
// 块体早年投成 `IfStatement` ✓），**没有任何东西会响** ✗。这一把尺子把它们接回判据链 ✓。
//
// 三条口径：
//
// 1. **指令行自己在源码里**：它会被解析成一个 `<LineAnnotation>` ✓（还是包在
//    `<Statement>` 里的 ✓）——不剥掉就会给 `Statement` / `Identifier` 这类计数
//    白送几格 ✓（实测 `Statement:4` 量的其实是指令行 ✓）。所以**量之前先剥掉指令行** ✓：
//    只剥 `//  xl:` 开头的整行 ✓，正文里 `/* */` 那种注释照旧参与 ✓。
// 2. **`Tag` 是「至少一个」、`Tag:N` 是「正好 N 个」**，`absent` 是「一个都没有」。
// 3. **标签表里每个名字都要有一条用例真的产出它**（见下面「标签表体检」）——
//    否则表里就躺着不可能出现的名字，写成 `xl:expect` 会造出一个永远修不好的假缺口。
//
// 4. **结构不变式：`Label` 必须包住它标的那条语句**（第 929 轮）——
//    `xl:expect` 只数标签、说不出「谁在谁里面」，所以这一条在这里单独钉：产物里**不许**
//    出现自闭合的 `<Label … />`（那说明 `Statement.AbsorbLabels` 那一步没生效）。
//
// 退出码：任一条不一致、或标签表体检不过，就是 1。

import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases, TAGS, GHOST_TAGS } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

/** 用例的正文：把开头的指令行整行去掉（它们是元数据，不是被测的形状）。 */
export function caseBody(source) {
  return source
    .split("\n")
    .filter((line) => !/^\/\/\s*xl:/.test(line))
    .join("\n");
}

/** 解析一段源码 → 产物的紧凑 XML。 */
export function productXml(source, filePath) {
  const document = new TextDocument(source);
  document.FilePath = filePath;
  const context = new TextContext(new Template());
  context.Process(document);
  return context.Root.ToXmlString();
}

/** 产物里每个标签出现几次。 */
export function tagCounts(xml) {
  const counts = new Map();
  for (const m of xml.matchAll(/<([A-Za-z][A-Za-z0-9]*)[ />]/g)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return counts;
}

/** 把 `xl:expect` 的一条写法拆成 `{ tag, count }`（没有冒号就是「至少一个」）。 */
function parseExpectation(raw) {
  const separator = raw.indexOf(":");
  if (separator === -1) return { tag: raw, count: null };
  return { tag: raw.slice(0, separator), count: Number(raw.slice(separator + 1)) };
}

function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list");
  const filterArea = args.find((a) => !a.startsWith("--"));
  const cases = listCases(filterArea);
  const seen = new Map();
  const bad = [];
  const crashed = [];
  let checked = 0;
  let assertions = 0;

  for (const one of cases) {
    const { expect, absent } = one.directives;
    // **产物抛异常的用例跳过期望核实**（第 674 轮）：那一条根本没有产物可比。
    // 它**不在这里判红**——「哪一条解析不了」由 `cases:tsast` 的**抛异常计数**盯着
    // （那一项进了退出码），这里只把名字报出来，免得同一个事实两处各判一次。
    let xml;
    try {
      xml = productXml(caseBody(one.source), one.file);
    } catch (error) {
      crashed.push(`${one.id}  ${String(error && error.Message ? error.Message : error).split("\n")[0]}`);
      continue;
    }
    const counts = tagCounts(xml);
    for (const [tag, n] of counts) seen.set(tag, (seen.get(tag) ?? 0) + n);
    // **结构不变式：`Label` 必须包住它标的那条语句**（第 929 轮）。
    // `xl:expect` 只数标签、说不出「谁在谁里面」，所以这一条**只能在这里钉**：
    // 产物里出现自闭合的 `<Label … />` 就说明那一步（`Statement.AbsorbLabels`）没生效——
    // 标签又退回成前缀标记，而 `cases:tsast` 看不见（投影那两条老形状的补丁照旧能拼回来）。
    if (/<Label [^>]*\/>/.test(xml)) {
      bad.push(`${one.id}  结构：出现了自闭合的 <Label … />——标签没有包住它标的语句`);
    }
    if (expect.length === 0 && absent.length === 0) continue;
    checked++;
    for (const raw of expect) {
      assertions++;
      const { tag, count } = parseExpectation(raw);
      const got = counts.get(tag) ?? 0;
      if (count === null ? got === 0 : got !== count) {
        bad.push(`${one.id}  expect ${raw}，产物里 ${got} 个`);
      }
    }
    for (const tag of absent) {
      assertions++;
      const got = counts.get(tag) ?? 0;
      if (got !== 0) bad.push(`${one.id}  absent ${tag}，产物里 ${got} 个`);
    }
  }

  if (!listOnly) {
    for (const line of bad) console.log(`BAD  ${line}`);
    // **产物抛异常的用例**：不判红、但要说出来（判红的是 `cases:tsast` 的抛异常计数）。
    for (const line of crashed) console.log(`CRASH ${line}`);
  }

  // **标签表体检**：表里每个名字都要有至少一条用例真的产出它 ✓。
  // 少了这一条，表里会一直躺着「不可能出现」的名字 ✓（`xl:expect` 写上去永远红 ✓，
  // 而它看起来像解析器的缺口 ✗——这正是这一轮要清掉的那一类 ✓）。
  // **只在跑全量时做** ✓：`--filter` 那种单 area 的运行里，别的 area 的标签当然一个都没有 ✓。
  const full = filterArea === undefined;
  const dead = full ? [...TAGS].filter((tag) => !seen.has(tag)).sort() : [];
  if (dead.length > 0) {
    console.log(`BAD  标签表里这些名字没有任何用例产出过：${dead.join(" ")}`);
  }
  // **反方向**：`GHOST_TAGS`（自我摘除的向导 / 抽象基类 / 投影专有的 kind）在整个语料里
  // 一次都不许出现 ✓。它们只能写进 `xl:absent`，`xl:expect` 由 `cases:check` 挡住；
  // 这里再钉住另一半：**它们真的没有留在产物里** ✓。
  const leaked = full ? [...GHOST_TAGS].filter((tag) => seen.has(tag)).sort() : [];
  if (leaked.length > 0) {
    console.log(`BAD  幽灵标签不该出现在产物里，却出现了：${leaked.join(" ")}`);
  }

  console.log(
    `\n${cases.length} 条用例，其中 ${checked} 条带期望（共 ${assertions} 条断言），${bad.length} 条不一致；` +
      `产物抛异常 ${crashed.length} 条；` +
      `产物标签 ${seen.size} 种，标签表 ${TAGS.size} 种（没被产出的 ${dead.length} 种），` +
      `幽灵标签 ${GHOST_TAGS.size} 种（漏进产物的 ${leaked.length} 种）`,
  );
  process.exitCode = bad.length === 0 && dead.length === 0 && leaked.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
