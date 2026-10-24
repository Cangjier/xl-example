// tests/body-drive/item-oracle.mjs — WP-2 语句 item 状态机对 oracle 的逐前缀对拍。
//
//   node tests/body-drive/item-oracle.mjs
//   node tests/body-drive/item-oracle.mjs --verbose        # 逐条打印语料与首个收口点
//   node tests/body-drive/item-oracle.mjs --max-code=120   # 单段代码单元上限（默认 200）
//
// 口径（HANDOFF.wp2-2「未完成项 6」）：对每一段「语句代码单元」（块体 / 体里的一段语句），
// 逐前缀 n = 1..N（N = 代码单元数）：
//   a) `new StatementItemScan()`，`AtEof = (n === N)`，`Run(code[0..n])`；
//   b) `StatementScanner.ScanRoot(code[0..n])`，同样 `AtEOF = (n === N)`；
//   c) 两边 `Status` 与 `End` 必须**完全一致**（不只首个收口点）。不一致就是状态机与 scanner 分叉，
//      先修状态机，不要改 scanner（scanner 是 oracle）。
//   d) 阶段 2（续扫）：**同一个** `StatementItemScan` 实例从 n=1 续着喂到 N，每个前缀的结果必须与
//      (a) 的「每个前缀一个新实例」逐字一致。这条是流式路径真正依赖的不变量：`StatementItemRule`
//      每条 item 只用一个驻留实例，`ScannedTo` 一旦算错，这里与 AST 都会红。
//
// 语料从真实解析里取：monkeypatch `StatementBuilder.prototype.Load`（运行时打桩，不改源码），
// 记录每次「一段代码单元」的载入（块体、if/while/for/do/try 体、case 体、根级片段……），
// 每段都是**非 trivia** 的 token 数组 —— 正是 `ScanRoot` / `StatementItemScan.Run` 的输入域。
//
// 任一前缀不一致 → 非零退出。exit 0 才是「状态机与 oracle 完全一致」。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
function take(flag, fallback) {
  const i = args.indexOf(flag);
  if (i < 0) return fallback;
  const v = args[i + 1];
  if (v === undefined || v.startsWith("--")) throw new Error(`${flag} 需要一个值`);
  args.splice(i, 2);
  return v;
}
const verbose = args.includes("--verbose");
if (verbose) args.splice(args.indexOf("--verbose"), 1);
const maxCode = Number(take("--max-code", "200"));
if (args.length > 0) {
  console.error(`未知参数: ${args.join(" ")}`);
  process.exit(2);
}

const { StatementScanner } = require(path.join(root, "build/ts/typescript/tokens/statements/statement-scanner.js"));
const { StatementItemScan } = require(path.join(root, "build/ts/typescript/tokens/items/statement-item-scan.js"));
const { StatementBuilder } = require(path.join(root, "build/ts/typescript/tokens/statements/statement-builder.js"));
const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));

// ---------------------------------------------------------------------------
// 语料：覆盖「块 / 体」里能出现的全部语句形态（+ 嵌套 + 恢复形）。
// 每一条都是可解析源码；解析产物里每个 Load 就是一段语句代码单元。
// ---------------------------------------------------------------------------
const SOURCES = [
  // 变量 / 空语句 / 块 / 表达式语句
  `function a() {
  ;
  {}
  { let x = 1; }
  let y = 2, z = 3;
  var w;
  const c = 4;
  x = 5;
  x + 1;
}`,
  // if / else-if / else + 单语句体 / 块体 / 悬垂 else
  `function b(p, q) {
  if (p) { a(); }
  if (p) a(); else b();
  if (p) { a(); } else if (q) { b(); } else { c(); }
  if (p)
    if (q) a();
    else b();
}`,
  // while / do-while / for / for-in / for-of
  `function c(o) {
  while (a) { b(); }
  do { b(); } while (a);
  do c(); while (a);
  for (let i = 0; i < 3; i++) { b(); }
  for (;;) { b(); }
  for (const k in o) { b(); }
  for (const v of o) b();
}`,
  // switch / case / default / case 体
  `function d(x) {
  switch (x) {
    case 1: a(); break;
    case 2:
    case 3: b(); break;
    default: c();
  }
  switch (x) {}
}`,
  // try / catch / finally
  `function e() {
  try { a(); } catch (e) { b(); }
  try { a(); } catch { b(); } finally { c(); }
  try { a(); } finally { b(); }
  try {} catch (e) {}
}`,
  // return / throw / break / continue / debugger / 标签
  `function f(x) {
  return;
  return x;
  throw x;
  lbl: { a(); }
  lbl2: a();
  debugger;
  while (a) { break; continue; break lbl; continue lbl; }
  return (
    x
  );
}`,
  // 声明族在语句位置
  `function g() {
  function h() {}
  async function i() {}
  function* j() {}
  class K { m() {} }
  interface L { p: number }
  enum M { A }
  namespace N { let n = 1; }
  type O = number;
  declare const d: number;
  declare function df(): void;
}`,
  // import / export 在块里（TS 允许的形态）+ export 修饰
  `function h2() {
  import x = require("y");
  export const ex = 1;
  export default 1;
  export { a };
}`,
  // using / await using / 装饰器
  `function i2(o) {
  using u = o;
  await using v = o;
  @dec class P {}
  @dec @dec2 class Q {}
}`,
  // 表达式语句的 ASI 边界（跨行续行 / 前缀后缀）
  `function j2() {
  a
  (b)
  c
  ++d
  e ++
  f
  g
  let k = 1
  k
  ;
}`,
  // 深嵌套体（每层都是一个 Load）
  `function k2() {
  if (a) { if (b) { if (c) { while (d) { for (;;) { a(); } } } } }
}`,
  // 单条长表达式语句（状态机最长的前缀）
  `function l2() {
  let x = a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p;
}`,
  // 恢复形：非法语句（缺分号 / 半个 if）
  `function m2() {
  let a = 1 let b = 2
  if (a
  a();
}`,
];

// ---------------------------------------------------------------------------
// 捕获：monkeypatch Load（只在本次进程内，退出即还原），记录每段代码单元。
// ---------------------------------------------------------------------------
const captures = [];
const seen = new Set();
const originalLoad = StatementBuilder.prototype.Load;
StatementBuilder.prototype.Load = function (units, basePos) {
  const result = originalLoad.call(this, units, basePos);
  if (!Array.isArray(units) || units.length === 0) {
    return result;
  }
  const code = [];
  for (const unit of units) {
    if (unit !== null && unit !== undefined && !unit.IsTriviaToken) {
      code.push(unit);
    }
  }
  if (code.length === 0 || code.length > maxCode) {
    return result;
  }
  const first = code[0];
  const key = `${code.length}@${first.SourceRange.Start}`;
  if (seen.has(key)) {
    return result;
  }
  seen.add(key);
  captures.push({ code, template: this.Template, context: this.Context });
  return result;
};

const files = [];
for (let i = 0; i < SOURCES.length; i++) {
  const text = SOURCES[i];
  try {
    SourceFileRunner.Parse(text, `item-oracle-${i}.ts`);
    files.push({ index: i, text, ok: true });
  } catch (e) {
    files.push({ index: i, text, ok: false, error: String(e && e.message ? e.message : e) });
  }
}
StatementBuilder.prototype.Load = originalLoad;

// ---------------------------------------------------------------------------
// 对拍
// ---------------------------------------------------------------------------
const mismatch = [];
const skipped = [];
let compared = 0;
let prefixes = 0;

function status(result) {
  if (result === null || result === undefined) {
    return -99;
  }
  return result.Status === undefined ? -98 : result.Status;
}
function end(result) {
  if (result === null || result === undefined) {
    return -99;
  }
  return result.End === undefined ? -98 : result.End;
}

function oracleScan(code, eof) {
  const previous = StatementScanner.AtEOF;
  StatementScanner.AtEOF = eof;
  try {
    return StatementScanner.ScanRoot(code);
  } finally {
    StatementScanner.AtEOF = previous;
  }
}

function mineScan(code, eof) {
  const scan = new StatementItemScan();
  scan.AtEof = eof;
  return scan.Run(code);
}

for (const capture of captures) {
  const code = capture.code;
  const count = code.length;
  let firstOracleComplete = { n: -1, end: -1 };
  let firstMineComplete = { n: -1, end: -1 };
  const fresh = [];
  let bad = 0;
  for (let n = 1; n <= count; n++) {
    const prefix = code.slice(0, n);
    const eof = n === count;
    let oracle;
    let mine;
    try {
      oracle = oracleScan(prefix, eof);
    } catch (e) {
      oracle = { Status: -1, End: -1, threw: String(e && e.message ? e.message : e) };
    }
    try {
      mine = mineScan(prefix, eof);
    } catch (e) {
      mine = { Status: -1, End: -1, threw: String(e && e.message ? e.message : e) };
    }
    prefixes++;
    const os = status(oracle);
    const oe = end(oracle);
    const ms = status(mine);
    const me = end(mine);
    fresh.push({ status: ms, end: me });
    if (firstOracleComplete.n < 0 && os === 1) {
      firstOracleComplete = { n, end: oe };
    }
    if (firstMineComplete.n < 0 && ms === 1) {
      firstMineComplete = { n, end: me };
    }
    if (os !== ms || (os === 1 && oe !== me)) {
      bad++;
      if (mismatch.length < 20) {
        mismatch.push({
          n,
          count,
          status: [ms, os],
          end: [me, oe],
          head: code.slice(0, Math.min(n, 8)).map((u) => textOf(u)).join(" "),
        });
      }
    }
  }
  compared++;
  // 阶段 2：驻留实例续着喂全部前缀，结果必须与「每前缀一个新实例」逐字一致。
  const resident = new StatementItemScan();
  for (let n = 1; n <= count; n++) {
    const prefix = code.slice(0, n);
    const eof = n === count;
    let result;
    try {
      resident.AtEof = eof;
      result = resident.Run(prefix);
    } catch (e) {
      result = { Status: -1, End: -1, threw: String(e && e.message ? e.message : e) };
    }
    const rs = status(result);
    const re = end(result);
    const base = fresh[n - 1];
    if (rs !== base.status || (rs === 1 && re !== base.end)) {
      bad++;
      if (mismatch.length < 20) {
        mismatch.push({
          n,
          count,
          resident: [rs, re],
          fresh: [base.status, base.end],
          head: code.slice(0, Math.min(n, 8)).map((u) => textOf(u)).join(" "),
        });
      }
    }
  }
  if (firstOracleComplete.n !== firstMineComplete.n || firstOracleComplete.end !== firstMineComplete.end) {
    bad++;
    if (mismatch.length < 20) {
      mismatch.push({
        n: -1,
        count,
        firstComplete: [firstMineComplete, firstOracleComplete],
        head: code.slice(0, 8).map((u) => textOf(u)).join(" "),
      });
    }
  }
  if (verbose) {
    const head = code.slice(0, 6).map((u) => textOf(u)).join(" ");
    console.log(`  [${bad === 0 ? "ok" : "BAD"}] ${count} units, first=${firstOracleComplete.n}/${firstOracleComplete.end}  ${head}`);
  }
}

function textOf(unit) {
  try {
    if (typeof unit.TempToString === "function") {
      return unit.TempToString();
    }
  } catch (e) {
    /* fallthrough */
  }
  try {
    return unit.constructor.name;
  } catch (e) {
    return "?";
  }
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------
const failedFiles = files.filter((f) => !f.ok);
console.log("== item-oracle: StatementItemScan vs StatementScanner.ScanRoot ==");
console.log(`  语料文件 : ${files.length}（解析失败 ${failedFiles.length}）`);
for (const file of failedFiles) {
  console.log(`    解析失败 #${file.index}: ${file.error}`);
}
if (captures.length === 0) {
  console.error("  没有捕获到任何语句代码单元：build/ 是不是没编译？");
  process.exit(2);
}
console.log(`  代码段   : ${compared}`);
console.log(`  前缀总数 : ${prefixes}`);
if (mismatch.length === 0) {
  console.log("  RESULT: PASS（逐前缀 Status/End 与 oracle 完全一致；驻留续扫与逐前缀新实例一致）");
  process.exit(0);
}
console.error(`  RESULT: FAIL（${mismatch.length} 处分叉，最多列 20 处）`);
for (const item of mismatch) {
  if (item.resident !== undefined) {
    console.error(`    [n=${item.n}/${item.count}] 驻留续扫 mine=${item.resident[0]}/${item.resident[1]} vs 新实例 ${item.fresh[0]}/${item.fresh[1]}  <${item.head}>`);
    continue;
  }
  if (item.n === -1) {
    const mine = item.firstComplete[0];
    const oracle = item.firstComplete[1];
    console.error(`    [首个收口点] mine n=${mine.n} end=${mine.end} / oracle n=${oracle.n} end=${oracle.end}  <${item.head}>`);
    continue;
  }
  console.error(`    [n=${item.n}/${item.count}] status mine=${item.status[0]} oracle=${item.status[1]}, end mine=${item.end[0]} oracle=${item.end[1]}  <${item.head}>`);
}
process.exit(1);
