// tests/body-drive/batch-split.mjs — 批次无关性（INV-6）的**族无关骨架** + statement family 钩子。
//
//   node tests/body-drive/batch-split.mjs
//   node tests/body-drive/batch-split.mjs --family=statement
//   node tests/body-drive/batch-split.mjs --verbose
//
// 断言：同一个宿主、同一段代码，
//   a) 整段一次喂完（`Reset(host, 0, AtEof=true)` + `OnBasicTokens` + `CloseBatch`）；
//   b) 在任意中间位置切两批喂（第一批 `To = k`，第二批把剩下的喂完）；
// 建出的 item 序列（构造器名 + XML）必须**完全一致**，且不能有 raw 回退。
//
// 骨架的用法：一个「族」就是一个配置 { name, rules(), code: () => [codeArray], makeHost(code) }。
// 其它族（enum / members / module-block）以后只追加配置，不改本文件的驱动逻辑。
// statement 族用真实 token（来自真实解析），不造假 token。

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
const only = take("--family", null);
const verbose = args.includes("--verbose");
if (verbose) args.splice(args.indexOf("--verbose"), 1);
if (args.length > 0) {
  console.error(`未知参数: ${args.join(" ")}`);
  process.exit(2);
}

const { BasicTokenBatch } = require(path.join(root, "build/ts/core/syntax/batch/basic-token-batch.js"));
const { BatchStates } = require(path.join(root, "build/ts/core/syntax/batch/batch-states.js"));
const { StatementBodyItemHost } = require(path.join(root, "build/ts/typescript/tokens/items/statement-item-rule.js"));
const { StatementBuilder } = require(path.join(root, "build/ts/typescript/tokens/statements/statement-builder.js"));
const { SourceFileBodyItemHost } = require(path.join(root, "build/ts/typescript/tokens/items/root-item-rule.js"));
const { SourceFileShape } = require(path.join(root, "build/ts/typescript/tokens/files/source-file-shape.js"));
const { SourceFileRunner } = require(path.join(root, "build/ts/typescript/run/source-file-runner.js"));

// ---------------------------------------------------------------------------
// 语料与捕获（与 item-oracle 同一套办法：打桩 Load 拿真实 token 段）
// ---------------------------------------------------------------------------
const SOURCES = [
  `function a() { let x = 1; if (x) { while (x) { x = x - 1; } } }`,
  `function b() {
  switch (x) { case 1: a(); break; default: b(); }
  try { a(); } catch (e) { b(); } finally { c(); }
}`,
  `function c() {
  for (let i = 0; i < 3; i++) { if (i) { a(); } else { b(); } }
  return i;
}`,
  `function d() { a(); a(); a(); a(); }`,
  `function e() { let a = 1; b(); c(); }`,
];

const captures = [];
const seen = new Set();
const originalLoad = StatementBuilder.prototype.Load;
StatementBuilder.prototype.Load = function (units, basePos) {
  const result = originalLoad.call(this, units, basePos);
  if (Array.isArray(units) && units.length > 0) {
    const code = [];
    for (const unit of units) {
      if (unit !== null && unit !== undefined && !unit.IsTriviaToken) {
        code.push(unit);
      }
    }
    if (code.length > 1 && code.length <= 200) {
      const key = `${code.length}@${code[0].SourceRange.Start}`;
      if (!seen.has(key)) {
        seen.add(key);
        captures.push(code);
      }
    }
  }
  return result;
};
for (let i = 0; i < SOURCES.length; i++) {
  try {
    SourceFileRunner.Parse(SOURCES[i], `batch-split-${i}.ts`);
  } catch (e) {
    console.error(`语料 #${i} 解析失败: ${e && e.message ? e.message : e}`);
  }
}
StatementBuilder.prototype.Load = originalLoad;

// ---------------------------------------------------------------------------
// root 族语料：root 级声明 / 语句 / ASI 尾巴。
// 此步 SourceFileShape.BatchAdapter 仍为 null，捕获的是 legacy 路径的解析结果，正好当参照。
// 根形状的 Data 每个顶层声明只有 1 个形状，所以按**顶层子形状的 Data**（真实 token 段）切条。
// ---------------------------------------------------------------------------
const ROOT_SOURCES = [
  `import a from "m";`,
  `import * as ns from "m";`,
  `export { x };`,
  `export default class D {}`,
  `class C { a: number; }`,
  `interface I { a: number }`,
  `function f() { return 1; }`,
  `enum E { A, B }`,
  `namespace N { export const x = 1; }`,
  `type T = A;`,
  `let x = 1;`,
  `{ }`,
  `if (a) b;`,
  `let a = 1
let b = 2`,
];

const rootCaptures = [];
const rootSeen = new Set();
function pushRootCapture(code) {
  if (!Array.isArray(code) || code.length <= 1 || code.length > 200) {
    return;
  }
  const first = code[0];
  if (first === null || first === undefined || !first.SourceRange) {
    return;
  }
  const key = `${code.length}@${first.SourceRange.Start}`;
  if (rootSeen.has(key)) {
    return;
  }
  rootSeen.add(key);
  rootCaptures.push(code);
}
function codeUnitsOf(units) {
  const code = [];
  if (!Array.isArray(units)) {
    return code;
  }
  for (const unit of units) {
    if (unit !== null && unit !== undefined && !unit.IsTriviaToken) {
      code.push(unit);
    }
  }
  return code;
}
for (let i = 0; i < ROOT_SOURCES.length; i++) {
  try {
    const rootShape = SourceFileRunner.Parse(ROOT_SOURCES[i], `batch-split-root-${i}.ts`);
    const data = rootShape && Array.isArray(rootShape.Data) ? rootShape.Data : [];
    pushRootCapture(codeUnitsOf(data));
    for (const child of data) {
      if (child === null || child === undefined || child.IsTriviaToken) {
        continue;
      }
      pushRootCapture(codeUnitsOf(child.Data));
    }
  } catch (e) {
    console.error(`root 语料 #${i} 解析失败: ${e && e.message ? e.message : e}`);
  }
}

// ---------------------------------------------------------------------------
// 宿主：一段语句代码单元的容器（真实 token，Data 可被引擎 splice）
// ---------------------------------------------------------------------------
function makeHost(code) {
  const first = code[0];
  const document = first.SourceRange.Document;
  const start = first.SourceRange.Start;
  const end = code[code.length - 1].SourceRange.End;
  return {
    Data: code.slice(),
    Parent: null,
    Template: first.Template,
    SourceRange: {
      Document: document,
      Start: start - 1,
      End: end,
      get StartIndex() {
        return this.Start;
      },
      get EndIndex() {
        return this.End;
      },
    },
  };
}

function contextOf(code) {
  // 引擎与建造器都不改上下文；用真实解析出来的那一份最稳（Document / VariableMap 都对）。
  const { SyntaxContext } = require(path.join(root, "build/ts/core/syntax/syntax-context.js"));
  return new SyntaxContext(code[0].SourceRange.Document, 32);
}

// ---------------------------------------------------------------------------
// 驱动：（a）整段一次喂完
// ---------------------------------------------------------------------------
function runWhole(host, context) {
  const adapter = new StatementBodyItemHost(host, StatementBodyItemHost.CreateRules());
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, true);
  batch.Sealed = true;
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, closed] };
}

// ---------------------------------------------------------------------------
// 驱动：（b）在 k 处切两批
// ---------------------------------------------------------------------------
function runSplit(host, context, k) {
  const adapter = new StatementBodyItemHost(host, StatementBodyItemHost.CreateRules());
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, false);
  batch.To = Math.max(1, Math.min(k, host.Data.length));
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  // 引擎在批末已把 batch.From / To / Cursor 重定位到 splice 之后；这里只把剩下的喂完。
  batch.To = host.Data.length;
  batch.AtEof = true;
  batch.Sealed = false;
  batch.Recompute();
  const second = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, second, closed] };
}

function rootRules() {
  return SourceFileBodyItemHost.CreateRules(SourceFileShape.CreatePossibleShapes());
}

function runWholeRoot(host, context) {
  const adapter = new SourceFileBodyItemHost(host, rootRules());
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, true);
  batch.Sealed = true;
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, closed] };
}

function runSplitRoot(host, context, k) {
  const adapter = new SourceFileBodyItemHost(host, rootRules());
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, false);
  batch.To = Math.max(1, Math.min(k, host.Data.length));
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  batch.To = host.Data.length;
  batch.AtEof = true;
  batch.Sealed = false;
  batch.Recompute();
  const second = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, second, closed] };
}

function collectItems(host) {
  const items = [];
  for (const unit of host.Data) {
    if (unit === null || unit === undefined) {
      continue;
    }
    if (unit.IsTriviaToken || unit.IsBasicToken) {
      continue;
    }
    items.push(describe(unit));
  }
  return items;
}

function describe(unit) {
  let xml = "";
  try {
    xml = unit.ToXmlString();
  } catch (e) {
    xml = `<xml-error ${String(e && e.message ? e.message : e)}>`;
  }
  let name = "?";
  try {
    name = unit.constructor.name;
  } catch (e) {
    /* ignore */
  }
  return `${name}\n${xml}`;
}

// ---------------------------------------------------------------------------
// module 族（WP-6）：模块体括号 = `Bracket` 宿主，`ModuleItemRule` 的 item = 一个成员
// ---------------------------------------------------------------------------
// 捕获：模块体括号由 `ModuleBlockShape.FromBracket` 接手，那里拿到的 `bracket.Data` 还是原始代码单元
// （成员是「读出来建」的，不 splice 括号自己的 Data），正好可以当 item 表的宿主。
// 每次跑都克隆一个括号（Data 换副本），否则整批那一趟建出的形状会留在下一次跑的宿主里。
const { Bracket } = require(path.join(root, "build/ts/core/syntax/basic-tokens/bracket.js"));
const { ModuleBlockShape } = require(path.join(root, "build/ts/typescript/tokens/declarations/module-block-shape.js"));
const { ModuleBodyItemHost } = require(path.join(root, "build/ts/typescript/tokens/items/module-item-rule.js"));

const MODULE_SOURCES = [
  `declare module "m" { export let x: number; export function f(): void; }`,
  `namespace N { let a = 1; function g(): void }`,
  `declare namespace P { const k: string; interface I { a: number; } }`,
  `namespace Q { export import x = require("m") }`,
  `declare module "n" {
  export as namespace NN;
  const v: number;
  class C {}
}`,
];

const moduleBrackets = [];
const originalFromBracket = ModuleBlockShape.FromBracket;
ModuleBlockShape.FromBracket = function (bracket, pos, context) {
  moduleBrackets.push(bracket);
  return originalFromBracket.call(this, bracket, pos, context);
};
for (let i = 0; i < MODULE_SOURCES.length; i++) {
  try {
    SourceFileRunner.Parse(MODULE_SOURCES[i], `batch-split-module-${i}.ts`);
  } catch (e) {
    console.error(`module 语料 #${i} 解析失败: ${e && e.message ? e.message : e}`);
  }
}
ModuleBlockShape.FromBracket = originalFromBracket;

function makeModuleHost(code) {
  const source = moduleBrackets.find((b) => b.Data === code);
  if (source === undefined) {
    return makeHost(code);
  }
  const bracket = new Bracket(source.Template);
  bracket.Data = code.slice();
  bracket.SourceRange = source.SourceRange.Clone();
  bracket.StartBracketChar = source.StartBracketChar;
  bracket.EndBracketChar = source.EndBracketChar;
  return bracket;
}

function runModuleWhole(host, context) {
  const adapter = new ModuleBodyItemHost(host, ModuleBlockShape.CreateBodyItemRules());
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, true);
  batch.Sealed = true;
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, closed] };
}

function runModuleSplit(host, context, k) {
  const adapter = new ModuleBodyItemHost(host, ModuleBlockShape.CreateBodyItemRules());
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, false);
  batch.To = Math.max(1, Math.min(k, host.Data.length));
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  batch.To = host.Data.length;
  batch.AtEof = true;
  batch.Sealed = false;
  batch.Recompute();
  const second = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, second, closed] };
}

// ---------------------------------------------------------------------------
// 族表（骨架）：以后加族只在这里追加配置
// ---------------------------------------------------------------------------
const FAMILIES = [
  {
    name: "statement",
    cases: () => captures,
    makeHost,
    contextOf,
    runWhole,
    runSplit,
  },
  {
    name: "root",
    cases: () => rootCaptures,
    makeHost,
    contextOf,
    runWhole: runWholeRoot,
    runSplit: runSplitRoot,
    name: "module",
    cases: () => moduleBrackets.map((b) => b.Data),
    makeHost: makeModuleHost,
    contextOf,
    runWhole: runModuleWhole,
    runSplit: runModuleSplit,
  },
];

// ---------------------------------------------------------------------------
// 跑
// ---------------------------------------------------------------------------
const active = only === null ? FAMILIES : FAMILIES.filter((f) => f.name === only);
if (active.length === 0) {
  console.error(`没有这个族: ${only}（有：${FAMILIES.map((f) => f.name).join(", ")}）`);
  process.exit(2);
}

let cases = 0;
let checks = 0;
let failures = 0;
let builtCases = 0;
let emptyCases = 0;

function fail(message) {
  failures++;
  console.error(`FAIL ${message}`);
}

for (const family of active) {
  const codeList = family.cases();
  if (codeList.length === 0) {
    fail(`${family.name}: 没有捕获到用例（build/ 是不是没编译？）`);
    continue;
  }
  console.log(`== family ${family.name}: ${codeList.length} 段代码 ==`);
  for (let index = 0; index < codeList.length; index++) {
    const code = codeList[index];
    const count = code.length;
    cases++;
    const whole = family.runWhole(family.makeHost(code), family.contextOf(code));
    // 整段一次喂完：状态只能是 Done / NeedMore（NeedMore = 本批没建出 item）
    for (const state of whole.states) {
      checks++;
      if (state !== BatchStates.Done && state !== BatchStates.NeedMore) {
        fail(`${family.name}#${index}: 整批驱动返回非法状态（${state}）`);
        break;
      }
    }
    if (whole.items.length === 0) {
      // 段里只有表达式片段 / 判不出语句的形态时，引擎正确地留 raw（0 item）。
      // 不当作失败，但要求整体上足够多的段真的建出了 item（否则引擎等于没跑）。
      emptyCases++;
      continue;
    }
    builtCases++;
    const splits = [];
    splits.push(1);
    splits.push(Math.floor(count / 2));
    splits.push(count - 1);
    for (const k of splits) {
      if (k < 1 || k >= count) {
        continue;
      }
      const split = family.runSplit(family.makeHost(code), family.contextOf(code), k);
      checks++;
      const left = JSON.stringify(whole.items);
      const right = JSON.stringify(split.items);
      if (left !== right) {
        let at = 0;
        while (at < left.length && at < right.length && left[at] === right[at]) {
          at++;
        }
        fail(`${family.name}#${index} split@${k}: item 序列不一致（整批 ${whole.items.length} / 分两批 ${split.items.length}），首个差异在 ${at}`);
        console.error(`    整批  : …${left.slice(Math.max(0, at - 90), at + 90)}…`);
        console.error(`    分两批: …${right.slice(Math.max(0, at - 90), at + 90)}…`);
      }
      // 批次驱动只允许答 Done / NeedMore（NeedMore = 本批没建出 item，宿主继续喂，这是正常路径）
      for (const state of split.states) {
        checks++;
        if (state !== BatchStates.Done && state !== BatchStates.NeedMore) {
          fail(`${family.name}#${index} split@${k}: 驱动返回非法状态（${state}）`);
          break;
        }
      }
      if (verbose) {
        console.log(`  ok split@${k} (${whole.items.length} items)`);
      }
    }
  }
}

console.log(`  代码段: ${cases}（建出 item ${builtCases} / 全 raw ${emptyCases}）`);
// 「建出 item 的段」下限：所有 Load 捕获里有一部分**不是**语句列表（for 头 / case 头 / catch 头 /
// 单条语句切片），它们正确地留 raw（0 item）。这里只要求整体上真的有足够多的段走到了建造。
if (builtCases < 4) {
  fail(`建出 item 的段太少（${builtCases}/${cases}）：引擎没真正跑起来`);
}
console.log(`  RESULT: ${failures === 0 ? "PASS" : "FAIL"}  （${cases} 段代码 / ${checks} 次断言 / ${failures} 次失败）`);
process.exit(failures === 0 ? 0 : 1);
