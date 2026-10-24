// tests/body-drive/batch-split.mjs — 批次无关性（INV-6）的**族无关骨架** + statement family 钩子。
//
//   node tests/body-drive/batch-split.mjs
//   node tests/body-drive/batch-split.mjs --family=statement
//   node tests/body-drive/batch-split.mjs --family=try
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
// clause 族（WP-6-3）：`import { … }` / `export { … }` 的花括号内层，
// item = 一个 specifier（含它的 `,`），见 typescript/tokens/items/clause-item-rule.xl.md
// ---------------------------------------------------------------------------
// 捕获：`NamedImportsShape.FromBracket` / `NamedExportsShape.FromBracket` 拿到的是**原始**代码单元
// （WP-6-3 起 shell 在克隆括号上跑 item 表，容器 `bracket.Data` 一个字节都不动），正好当 item 表宿主。
const { NamedImportsShape } = require(path.join(root, "build/ts/typescript/tokens/declarations/named-imports-shape.js"));
const { NamedExportsShape } = require(path.join(root, "build/ts/typescript/tokens/declarations/named-exports-shape.js"));
const { ImportSpecifierClauseBuild } = require(path.join(root, "build/ts/typescript/tokens/declarations/named-imports-shape.js"));
const { ExportSpecifierClauseBuild } = require(path.join(root, "build/ts/typescript/tokens/declarations/named-exports-shape.js"));
const { ClauseItemHost, ClauseItemRule } = require(path.join(root, "build/ts/typescript/tokens/items/clause-item-rule.js"));

const CLAUSE_SOURCES = [
  `import { a, b } from "m";`,
  `import { a as b, type c } from "m";`,
  `export { x as "y", z };`,
  `export { a, b, } from "m";`,
  `import { } from "m";`,
  `export { type A as B } from "m";`,
];

const clauseBrackets = [];
const originalNamedImports = NamedImportsShape.FromBracket;
const originalNamedExports = NamedExportsShape.FromBracket;
NamedImportsShape.FromBracket = function (bracket, context) {
  clauseBrackets.push({ kind: "imports", bracket, code: bracket.Data.slice() });
  return originalNamedImports.call(this, bracket, context);
};
NamedExportsShape.FromBracket = function (bracket, context) {
  clauseBrackets.push({ kind: "exports", bracket, code: bracket.Data.slice() });
  return originalNamedExports.call(this, bracket, context);
};
for (let i = 0; i < CLAUSE_SOURCES.length; i++) {
  try {
    SourceFileRunner.Parse(CLAUSE_SOURCES[i], `batch-split-clause-${i}.ts`);
  } catch (e) {
    console.error(`clause 语料 #${i} 解析失败: ${e && e.message ? e.message : e}`);
  }
}
NamedImportsShape.FromBracket = originalNamedImports;
NamedExportsShape.FromBracket = originalNamedExports;

function makeClauseHost(code) {
  const source = clauseBrackets.find((c) => c.code === code);
  if (source === undefined) {
    return makeHost(code);
  }
  const bracket = new Bracket(source.bracket.Template);
  bracket.Data = code.slice();
  bracket.SourceRange = source.bracket.SourceRange.Clone();
  bracket.StartBracketChar = source.bracket.StartBracketChar;
  bracket.EndBracketChar = source.bracket.EndBracketChar;
  bracket.ClauseKind = source.kind;
  return bracket;
}

function makeClauseRule(host) {
  const rule = new ClauseItemRule();
  rule.ClauseBuilder = host.ClauseKind === "exports"
    ? new ExportSpecifierClauseBuild(host)
    : new ImportSpecifierClauseBuild(host);
  rule.Host = host;
  return rule;
}

function runClauseWhole(host, context) {
  const adapter = new ClauseItemHost(host, [makeClauseRule(host)]);
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, true);
  batch.Sealed = true;
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, closed] };
}

function runClauseSplit(host, context, k) {
  const adapter = new ClauseItemHost(host, [makeClauseRule(host)]);
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
// case 族（WP-6-4）：`switch (x) { … }` 的花括号内层，item = 一条 case / default 子句，
// 见 typescript/tokens/items/case-clause-item-rule.xl.md
// ---------------------------------------------------------------------------
// 捕获：`StatementBuilder.BuildCaseBlock` 拿到的 `bracket.Data` 就是 case block 的原始代码单元
// （WP-6-4 起 item 表在克隆括号上驱动，容器 `bracket.Data` 一个字节都不动），正好当 item 表宿主。
const { CaseClauseItemHost, CaseClauseItemRule } = require(path.join(root, "build/ts/typescript/tokens/items/case-clause-item-rule.js"));
const { CaseClauseBuildAdapter } = require(path.join(root, "build/ts/typescript/tokens/statements/statement-builder.js"));

const CASE_SOURCES = [
  `function f() { switch (a) { case 1: break; } }`,
  `function f() { switch (a) { case 1: g(); break; default: h(); } }`,
  `function f() { switch (a) { case a ? b : c: g(); break; case 2: case 3: h(); break; } }`,
  `function f() { switch (a) { default: g(); } }`,
  `function f() { switch (a) { } }`,
  `function f() { switch (a) { case 1: switch (b) { case 2: g(); } break; } }`,
  `function f() { switch (a) { case 1: let x = 1; { let y = 2; } break; case 2: g(); } }`,
  `function f() { switch (a) { case o.default: g(); break; } }`,
];

const caseBrackets = [];
const originalBuildCaseBlock = StatementBuilder.prototype.BuildCaseBlock;
StatementBuilder.prototype.BuildCaseBlock = function (bracket, bracketIndex) {
  caseBrackets.push(bracket);
  return originalBuildCaseBlock.call(this, bracket, bracketIndex);
};
for (let i = 0; i < CASE_SOURCES.length; i++) {
  try {
    SourceFileRunner.Parse(CASE_SOURCES[i], `batch-split-case-${i}.ts`);
  } catch (e) {
    console.error(`case 语料 #${i} 解析失败: ${e && e.message ? e.message : e}`);
  }
}
StatementBuilder.prototype.BuildCaseBlock = originalBuildCaseBlock;

function makeCaseHost(code) {
  const source = caseBrackets.find((b) => b.Data === code);
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

function makeCaseRule(host) {
  const rule = new CaseClauseItemRule();
  rule.ClauseBuilder = new CaseClauseBuildAdapter();
  rule.Host = host;
  return rule;
}

function runCaseWhole(host, context) {
  const adapter = new CaseClauseItemHost(host, [makeCaseRule(host)]);
  const batch = new BasicTokenBatch();
  batch.Reset(host, 0, true);
  batch.Sealed = true;
  batch.Recompute();
  const first = adapter.OnBasicTokens(batch, context);
  const closed = adapter.CloseBatch(context);
  return { items: collectItems(host), states: [first, closed] };
}

function runCaseSplit(host, context, k) {
  const adapter = new CaseClauseItemHost(host, [makeCaseRule(host)]);
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
// try 族（WP-6-5）：`try { … }` / `catch (e) { … }` / `finally { … }` 的**块体**，item = 一条语句。
// ---------------------------------------------------------------------------
// 三个块在基线上都走 `BuildTry → BuildStatement → BuildBlock`：
//   - 流式路径：`StatementBlockStream` 在 `{` 创建时挂 `StatementBodyItemHost`（`try` / `finally` /
//     `catch (e)` 在钩子白名单里），`BuildBlock` 只 `FlushBatch`，item 在解析期建出；
//   - 闭合后批处理：`StatementBlockStream.Enabled = false` 时没有挂载，`BuildBlock` 调 `DriveBodyItems`。
// 两条路的 item 表是同一套 `StatementBodyItemHost.CreateRules()`；本族验收：
//   ① 三个块确实被 item 表驱动（挂载计数 + `DriveBodyItems` 调用计数 + 建出 item 数）；
//   ② 整批 vs 切点等价；③ 全有或全无回退（本族语料要么整段建成 item，要么整段留 raw）；
//   ④ 空块 `{ }` 建出 0 item、无 raw 残留、不抛异常。
//
// 捕获：**关闭流式挂载**后 `BuildBlock` 入口的 `bracket.Data` 还是原始代码单元
// （`DriveBodyItems` 的 splice 发生在这次调用里，捕获取的是它之前的一份副本），正好当 item 表宿主。
const { StatementBlockStream } = require(path.join(root, "build/ts/typescript/run/statement-block-stream.js"));

const TRY_SOURCES = [
  `function f(){ try { let a = 1; } finally { let b = 2; } }`,
  `function f(){ try { let a = 1; } catch (e) { let b = 2; } }`,
  `function f(){ try { let a = 1; } catch (e) { let b = 2; } finally { let c = 3; } }`,
  `function f(){ try { try { let a = 1; } catch (e) { let b = 2; } } finally { let c = 3; } }`,
  `function f(){ try { let a = 1; } catch (e: any) { let b = 2; } }`,
  // `catch {`（可选绑定）不在流式钩子的白名单里（只有 `catch (e)` 的 `)` 前缀被认），走 legacy；这里钉住它。
  `function f(){ try { } catch { } finally { } }`,
  `function f(){ try { let a = 1; if (a) { a = 2; } return a; } catch (e) { throw e; } finally { let d = 4; } }`,
  // 表达式起头的块：`StatementItemRule.Classify` 不认领（`StatementItemScan` 返回 Mismatch），
  // 整块留 raw —— 这是「全有或全无」的**回退**方向，必须与整段建成 item 的方向一起钉住。
  `function f(){ try { g(); } finally { g(); } }`,
];

// 块头分类：`{` 前面的最后一个代码单元是 try / finally / catch，或者 `catch ( … )` 的 `)`。
function tryKindOf(units, at) {
  let i = at - 1;
  while (i >= 0 && units[i].IsTriviaToken) i--;
  if (i < 0) return "other";
  const unit = units[i];
  let text = "";
  try {
    text = unit instanceof Bracket ? "" : (typeof unit.TempToString === "function" ? unit.TempToString() : "");
  } catch (e) {
    text = "";
  }
  if (text === "try" || text === "finally" || text === "catch") return text;
  if (unit instanceof Bracket && unit.StartBracketChar === "(") {
    let j = i - 1;
    while (j >= 0 && units[j].IsTriviaToken) j--;
    if (j >= 0) {
      try {
        if (typeof units[j].TempToString === "function" && units[j].TempToString() === "catch") return "catch";
      } catch (e) {
        /* ignore */
      }
    }
  }
  return "other";
}

const tryBlocks = [];
const tryDriveKinds = [];
const tryEnabledBefore = StatementBlockStream.Enabled;
const originalBuildBlock = StatementBuilder.prototype.BuildBlock;
const originalDriveBodyItems = StatementBuilder.prototype.DriveBodyItems;
StatementBlockStream.Enabled = false;
StatementBuilder.prototype.BuildBlock = function () {
  const at = this.At;
  const unit = this.Units[at];
  if (unit instanceof Bracket && unit.StartBracketChar === "{") {
    const kind = tryKindOf(this.Units, at);
    if (kind === "try" || kind === "catch" || kind === "finally") {
      tryBlocks.push({ kind, bracket: unit, code: unit.Data.slice() });
    }
  }
  return originalBuildBlock.call(this);
};
StatementBuilder.prototype.DriveBodyItems = function (bracket) {
  if (bracket instanceof Bracket) {
    tryDriveKinds.push(tryKindOf(this.Units, this.At - 1));
  }
  return originalDriveBodyItems.call(this, bracket);
};
for (let i = 0; i < TRY_SOURCES.length; i++) {
  try {
    SourceFileRunner.Parse(TRY_SOURCES[i], `batch-split-try-${i}.ts`);
  } catch (e) {
    console.error(`try 语料 #${i} 解析失败: ${e && e.message ? e.message : e}`);
  }
}
StatementBuilder.prototype.BuildBlock = originalBuildBlock;
StatementBuilder.prototype.DriveBodyItems = originalDriveBodyItems;
StatementBlockStream.Enabled = tryEnabledBefore;

// 一次流式解析的挂载计数（每次新建 wrapper，避免污染 stream-proof 之外的全局状态）。
function tryStreamMounts() {
  const mounts = [];
  const before = StatementBlockStream.Hook;
  StatementBlockStream.Hook = function (bracket, host, context) {
    const prior = bracket.BatchAdapter;
    before.call(StatementBlockStream, bracket, host, context);
    if (bracket.BatchAdapter !== prior && bracket.BatchAdapter !== null) {
      mounts.push({
        kind: tryKindOf(host.Data, host.Data.length - 1),
        bracket,
        adapter: bracket.BatchAdapter.constructor.name,
      });
    }
  };
  try {
    for (let i = 0; i < TRY_SOURCES.length; i++) {
      SourceFileRunner.Parse(TRY_SOURCES[i], `batch-split-try-stream-${i}.ts`);
    }
  } finally {
    StatementBlockStream.Hook = before;
  }
  return mounts;
}

function tryDataStats(host) {
  let items = 0;
  let raw = 0;
  for (const unit of host.Data) {
    if (unit === null || unit === undefined || unit.IsTriviaToken) continue;
    if (unit.IsBasicToken) raw++;
    else items++;
  }
  return { items, raw };
}

// 验收：① 三个块被 item 表驱动（计数）；② 全有或全无；③ 空块 0 item。
function verifyTryFamily() {
  const results = [];
  const add = (ok, label, detail) => results.push({ ok, label: `${label}${detail ? "  (" + detail + ")" : ""}` });
  const kinds = { try: 0, catch: 0, finally: 0 };
  for (const record of tryBlocks) kinds[record.kind]++;
  add(kinds.try === 9 && kinds.catch === 6 && kinds.finally === 6,
    "捕获 try 族块 = try 9 / catch 6 / finally 6", `try ${kinds.try} / catch ${kinds.catch} / finally ${kinds.finally}`);

  let driven = 0;
  for (const kind of tryDriveKinds) {
    if (kind === "try" || kind === "catch" || kind === "finally") driven++;
  }
  add(driven === tryBlocks.length,
    `每个 try 族块都被 BuildBlock 的 DriveBodyItems 驱动（${tryBlocks.length} 个）`, `实际 ${driven}`);

  const mounts = tryStreamMounts();
  const mounted = { try: 0, catch: 0, finally: 0 };
  let badAdapter = 0;
  let built = 0;
  let rawOnly = 0;
  let partial = 0;
  let streamedItems = 0;
  for (const mount of mounts) {
    if (mounted[mount.kind] === undefined) continue;
    mounted[mount.kind]++;
    if (mount.adapter !== "StatementBodyItemHost") badAdapter++;
    const stats = tryDataStats(mount.bracket);
    streamedItems += stats.items;
    if (stats.items > 0 && stats.raw === 0) built++;
    else if (stats.items === 0) rawOnly++;
    else partial++;
  }
  add(badAdapter === 0, "挂载的适配器全是 StatementBodyItemHost", `异常 ${badAdapter}`);
  add(mounted.try === 9 && mounted.catch === 5 && mounted.finally === 6,
    "流式挂载 try 9 / catch 5 / finally 6（`catch {` 不在白名单）",
    `try ${mounted.try} / catch ${mounted.catch} / finally ${mounted.finally}`);
  add(built === 16 && rawOnly === 4 && partial === 0,
    "流式建出 item 的块 16 / 整块 raw 4（2 空块 + 2 表达式块）/ 部分 0", `built ${built} / rawOnly ${rawOnly} / partial ${partial}`);
  add(streamedItems === 18, "解析期建出 item 总数 = 18", `实际 ${streamedItems}`);

  let batchItems = 0;
  let batchRaw = 0;
  let emptyRecords = 0;
  let rawOnlyRecords = 0;
  for (const record of tryBlocks) {
    const host = makeHost(record.code);
    const whole = runWhole(host, contextOf(record.code));
    const stats = tryDataStats(host);
    batchItems += stats.items;
    batchRaw += stats.raw;
    // 全有或全无：要么整段建成 item（raw = 0），要么一段 item 都没有（整段留 raw）；
    // 空块（items = 0 且 raw = 0）两边都空，也算一条。
    add(stats.items === 0 || stats.raw === 0,
      `${record.kind}@${record.bracket.SourceRange.Start}: 全有或全无（item ${stats.items} / raw ${stats.raw}）`);
    add(whole.items.length === stats.items,
      `${record.kind}@${record.bracket.SourceRange.Start}: 建出 item 与宿主 Data 一致`,
      `Build ${whole.items.length} / Data ${stats.items}`);
    if (stats.items === 0 && stats.raw === 0) emptyRecords++;
    if (stats.items === 0 && stats.raw > 0) rawOnlyRecords++;
  }
  add(batchItems === 18 && batchRaw === 6 && emptyRecords === 3 && rawOnlyRecords === 2,
    "整批驱动：item 18 / raw 残留 6 / 空块 3 / 整段回退 2",
    `item ${batchItems} / raw ${batchRaw} / empty ${emptyRecords} / rawOnly ${rawOnlyRecords}`);
  return results;
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
  },
  {
    name: "module",
    cases: () => moduleBrackets.map((b) => b.Data),
    makeHost: makeModuleHost,
    contextOf,
    runWhole: runModuleWhole,
    runSplit: runModuleSplit,
  },
  {
    name: "clause",
    cases: () => clauseBrackets.map((c) => c.code),
    makeHost: makeClauseHost,
    contextOf,
    runWhole: runClauseWhole,
    runSplit: runClauseSplit,
  },
  {
    name: "case",
    cases: () => caseBrackets.map((b) => b.Data),
    makeHost: makeCaseHost,
    contextOf,
    runWhole: runCaseWhole,
    runSplit: runCaseSplit,
  },
  {
    name: "try",
    cases: () => tryBlocks.map((b) => b.code),
    verify: verifyTryFamily,
    makeHost,
    contextOf,
    runWhole,
    runSplit,
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
  // 族级验收（可选）：挂载 / 建出 / 全有或全无这类「整族性质」的断言，按条计进 checks。
  if (typeof family.verify === "function") {
    for (const result of family.verify()) {
      checks++;
      if (!result.ok) {
        fail(`${family.name}: ${result.label}`);
      } else if (verbose) {
        console.log(`  ok ${result.label}`);
      }
    }
  }
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
