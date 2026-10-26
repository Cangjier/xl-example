// B4f 箭头形参的**边角**只读探针（R1 默认值参数 / R2 嵌套箭头）。
//
// 断言口径（`_reports/B4f.md` §2）：
//   1. **角色**：每只括号 `BracketRoleResolver.Resolve` 的结论（Known/Deferred/Fallback + Role +
//      Reason）逐个对上——R2 的内层 `(b)` 必须是 `Deferred / ArrowParams / nested-arrow-paren-wait-for-arrow`，
//      不许再是 `Fallback / no-host-rule`；
//   2. **一次**：文件级 `DeferredBracketCatalog.ReplayCount` == 期望值；且在**每次 `Bind` 之后**
//      读该括号的 `ReplayCount`，不允许出现 `> 1`（A2 §3 的 R1「一次」是硬规则）；
//   3. `ReplayFailureCount` / `ArrowParamsCatalog.HalfBuildCount` 增量必须是 0；
//   4. `ParameterShape` 的子节点类名逐个对上：`b` 必须是 `IdentifierShape`，默认值必须由
//      **legacy 同一个建造器**（`ExpressionBuilder.ParseAssign`）建出——
//      `= 1` 是 `NumericLiteralShape`、`= {x:1}` 是 `ObjectLiteralExpressionShape`；
//   5. **不误 replay**：`(a)` / `(a) + 1` / `f(a, b)` / `function fn(...)` / `x => (a) + 1`
//      的 replay 必须是 0（分别是分组括号、调用实参、函数形参表、箭头体的分组括号）。
//
// 只读：不写文件、不改任何默认值（`EnableExprBracketCatalog` 默认 true）。
//
// 用法：
//   node typescript/cases/tts/tools/arrow-edge-probe.mjs
//   node typescript/cases/tts/tools/arrow-edge-probe.mjs <file.ts> ...
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..");
const BUILD = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);

const { SourceFileRunner } = require(path.join(BUILD, "typescript", "run", "source-file-runner.js"));
const { StatementRouteUtil } = require(path.join(BUILD, "typescript", "tokens", "statements", "statement-route-util.js"));
const { Bracket } = require(path.join(BUILD, "core", "syntax", "basic-tokens", "bracket.js"));
const { DeferredBracketCatalog } = require(path.join(BUILD, "typescript", "tokens", "statements", "deferred-bracket-catalog.js"));
const { BracketRoleResolver } = require(path.join(BUILD, "typescript", "tokens", "statements", "bracket-role-resolver.js"));
const { ArrowParamsCatalog } = require(path.join(BUILD, "typescript", "tokens", "expressions", "forms", "primary", "arrow-params-catalog.js"));
const { ParameterListPossibleShape } = require(path.join(BUILD, "typescript", "tokens", "types", "parameter-list-possible-shape.js"));
const { ArrowFunctionShape } = require(path.join(BUILD, "typescript", "tokens", "expressions", "arrow-function-shape.js"));

// [label, source, 期望 replay, 期望的 ParameterShape 子节点, options]
//   options.roles        : 逐只括号的期望角色串（只在**没有 fileFallback** 时用精确比对）
//   options.roleFirst    : 只断言第一只括号的角色（有 fileFallback 时第二次 legacy 重解析会多记一条）
//   options.rejects      : 期望的 `ArrowParamsCatalog.RejectCount`
//   options.allowFallback: 允许 fileFallback=true（**只给 base 上就回退的片段**，见报告 §6 R5）
const SNIPPETS = [
  // ---- R1：默认值参数 ----
  ["default-number", "let d = (a: number, b = 1) => a;\n", 1, [
    ["IdentifierShape", "NumberKeywordShape"],
    ["IdentifierShape", "NumericLiteralShape"],
  ], { rejects: 0, roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow"] }],
  ["default-object", "let e = (a = {x:1}) => a;\n", 1, [
    ["IdentifierShape", "ObjectLiteralExpressionShape"],
  ], {
    rejects: 0,
    roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow", "Fallback/-/bracket-host-not-a-block"],
  }],
  ["default-typed-object", "let f = (a: string, b = {k: 2}) => b;\n", 1, [
    ["IdentifierShape", "StringKeywordShape"],
    ["IdentifierShape", "ObjectLiteralExpressionShape"],
  ], { rejects: 0 }],
  // 默认值里的 `,`（数组 / 实参列表里）**不得**被当成形参分隔：`c` 仍是第三个参数。
  ["default-nested-commas", "let g = (a = [1, 2], b = f(3, 4), c = 5) => c;\n", 1, [
    ["IdentifierShape", "ArrayLiteralExpressionShape"],
    ["IdentifierShape", "CallExpressionShape"],
    ["IdentifierShape", "NumericLiteralShape"],
  ], { rejects: 0 }],
  ["default-first", "let h = (a = 1) => a;\n", 1, [
    ["IdentifierShape", "NumericLiteralShape"],
  ], { rejects: 0 }],
  ["default-ident", "let i = (a, b = a) => b;\n", 1, [
    ["IdentifierShape"],
    ["IdentifierShape", "IdentifierShape"],
  ], { rejects: 0 }],
  // ---- R2：嵌套箭头 ----
  ["nested-inner-typed", "let p = (a) => (b: number) => a + b;\n", 2, [
    ["IdentifierShape"],
    ["IdentifierShape", "NumberKeywordShape"],
  ], {
    rejects: 0,
    roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow",
      "Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow"],
  }],
  ["nested-three", "let q = (a) => (b) => (c) => a + b + c;\n", 3, [
    ["IdentifierShape"],
    ["IdentifierShape"],
    ["IdentifierShape"],
  ], {
    rejects: 0,
    roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow",
      "Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow",
      "Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow"],
  }],
  // [B4g] 内层 `(b)` 现在真的 replay 了：体是 `(` 的箭头不再在增量里建（`ArrowPossibleShape`
  // 在 `=>` 格保持 Uncertain），整条初始化器留 raw basic，收口格原子建树时 legacy
  // `ParseArrowFromBracket → ParseFunctionParameters` 绑定这只括号 ⇒ replay 一次、fileFallback 消失。
  // （base / B4f：replay 0 + 整文件 fallback，见 B4g §1）
  ["nested-single-outer", "let n = x => (b) => b;\n", 1, [
    ["IdentifierShape"],
    ["IdentifierShape"],
  ], {
    rejects: 0,
    roleFirst: "Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow",
  }],
  // ---- 负样本：一次都不许 replay ----
  ["paren-only", "let v = (a);\n", 0, [], {
    rejects: 0, roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow"],
  }],
  ["paren-binop", "let w = (a) + 1;\n", 0, [], {
    rejects: 0, roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow"],
  }],
  ["call-args", "let q = f(a, b);\n", 0, [], { rejects: 0, roles: ["Known/CallArgs"] }],
  ["function-params", "function fn(a: number) {}\n", 0, [
    ["IdentifierShape", "NumberKeywordShape"],
  ], { rejects: 0 }],
  // `=>` 之后的分组括号：R2 会把它登记成 Deferred，`)=>` 不成立 ⇒ 永远不 Bind、不 replay。
  ["arrow-body-paren", "let r = x => (a) + 1;\n", 0, [
    ["IdentifierShape"],
  ], {
    rejects: 0,
    roleFirst: "Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow",
    allowFallback: true,
  }],
  ["arrow-body-paren2", "let s = (a) => (b) + 1;\n", 1, [
    ["IdentifierShape"],
  ], {
    rejects: 0,
    roles: ["Deferred/ArrowParams/arrow-paren-wait-for-arrow",
      "Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow"],
  }],
];

const resolveLog = [];
const bindLog = [];
const originalResolve = BracketRoleResolver.Resolve;
const originalBind = ArrowFunctionShape.BindParameterBracket;
BracketRoleResolver.Resolve = function (host, bracket, context) {
  const result = originalResolve.call(BracketRoleResolver, host, bracket, context);
  const state = result.IsKnown() ? "Known" : (result.IsDeferred() ? "Deferred" : "Fallback");
  // `Fallback` 的 Reason 是排障主线索（`no-host-rule:…` / `return-type-position` …），一并记下。
  resolveLog.push(state + "/" + (result.Role || "-") + (result.Reason ? "/" + result.Reason : ""));
  return result;
};
ArrowFunctionShape.BindParameterBracket = function (bracket, context) {
  const result = originalBind.call(ArrowFunctionShape, bracket, context);
  if (bracket !== null && bracket instanceof Bracket) {
    bindLog.push(bracket.SourceRange.Start + ":" + bracket.ReplayCount);
  }
  return result;
};

function walk(token, visit) {
  if (!token) {
    return;
  }
  visit(token);
  if (!token.Data) {
    return;
  }
  for (const child of token.Data) {
    walk(child, visit);
  }
}

function run(label, source, file, expectedReplay, expectedParams, options) {
  const opts = options || {};
  DeferredBracketCatalog.Reset();
  ArrowParamsCatalog.MountCount = 0;
  ArrowParamsCatalog.ReplayedCount = 0;
  ArrowParamsCatalog.BindCount = 0;
  ArrowParamsCatalog.RejectCount = 0;
  ArrowParamsCatalog.HalfBuildCount = 0;
  ParameterListPossibleShape.DefaultValueCount = 0;
  resolveLog.length = 0;
  bindLog.length = 0;
  const before = {
    replay: DeferredBracketCatalog.ReplayCount,
    fail: DeferredBracketCatalog.ReplayFailureCount,
    deferred: StatementRouteUtil.BracketRoleDeferredCount,
  };
  let tree = null;
  let error = "";
  let fallback = false;
  try {
    tree = SourceFileRunner.Parse(source, file);
    fallback = StatementRouteUtil.LastFileFallback === true;
  } catch (e) {
    error = String(e && e.Message ? e.Message : e).split("\n")[0];
  }
  const replayed = DeferredBracketCatalog.ReplayCount - before.replay;
  const failed = DeferredBracketCatalog.ReplayFailureCount - before.fail;
  const deferred = StatementRouteUtil.BracketRoleDeferredCount - before.deferred;
  const halves = ArrowParamsCatalog.HalfBuildCount;
  const rejects = ArrowParamsCatalog.RejectCount;
  const overReplayed = bindLog.filter((entry) => Number(entry.split(":")[1]) > 1);
  const params = [];
  walk(tree, (token) => {
    if (token.constructor.name === "ParameterShape") {
      params.push(token);
    }
  });
  const actual = params.map((parameter) => parameter.Data
    .filter((unit) => !unit.IsTriviaToken)
    .map((unit) => unit.constructor.name));
  const expectedText = JSON.stringify(expectedParams);
  const actualText = JSON.stringify(actual);
  const problems = [];
  if (tree === null) {
    problems.push("parse-error:" + error);
  }
  if (fallback && opts.allowFallback !== true) {
    problems.push("fileFallback");
  }
  if (replayed !== expectedReplay) {
    problems.push("replay=" + replayed + "!=" + expectedReplay);
  }
  if (failed !== 0) {
    problems.push("replayFailure=+" + failed);
  }
  if (halves !== 0) {
    problems.push("halfBuild=+" + halves);
  }
  if (overReplayed.length !== 0) {
    problems.push("replayCount>1 at " + overReplayed.join(","));
  }
  if (actualText !== expectedText) {
    problems.push("params=" + actualText + " != " + expectedText);
  }
  if (opts.rejects !== undefined && rejects !== opts.rejects) {
    problems.push("rejects=" + rejects + "!=" + opts.rejects);
  }
  if (opts.roles !== undefined) {
    const expectedRoles = JSON.stringify(opts.roles);
    if (JSON.stringify(resolveLog) !== expectedRoles) {
      problems.push("roles=" + JSON.stringify(resolveLog) + " != " + expectedRoles);
    }
  }
  if (opts.roleFirst !== undefined && resolveLog[0] !== opts.roleFirst) {
    problems.push("roleFirst=" + resolveLog[0] + " != " + opts.roleFirst);
  }
  const verdict = problems.length === 0 ? "OK" : "NG";
  console.log("=== " + verdict + " " + label + " === " + source.replace(/\n/g, "\\n"));
  console.log("  replay+" + replayed + " (expected " + expectedReplay + ")"
    + " bindReplayCounts=[" + bindLog.join(",") + "]"
    + " fail+" + failed
    + " half=" + halves
    + " rejected=" + rejects
    + " deferred+" + deferred
    + " pending=" + DeferredBracketCatalog.Pending.length
    + " defaults=" + ParameterListPossibleShape.DefaultValueCount
    + " fileFallback=" + fallback);
  console.log("  roles: [" + resolveLog.join(" ") + "]");
  if (params.length > 0) {
    console.log("  params: " + params.map((parameter) => "ParameterShape(pos=" + parameter.Pos + ", "
      + parameter.Data.filter((unit) => !unit.IsTriviaToken).map((unit) => unit.constructor.name).join("+")
      + ")").join(" ; "));
  }
  if (problems.length > 0) {
    console.log("  PROBLEMS: " + problems.join(" | "));
  }
  console.log("");
  return problems.length === 0;
}

const files = process.argv.slice(2);
let ok = true;
if (files.length > 0) {
  for (const file of files) {
    ok = run(path.basename(file), fs.readFileSync(file, "utf8"), path.basename(file), 1,
      [["IdentifierShape"]], {}) || ok;
  }
} else {
  for (const [label, source, expected, params, options] of SNIPPETS) {
    ok = run(label, source, label + ".ts", expected, params, options) && ok;
  }
}

BracketRoleResolver.Resolve = originalResolve;
ArrowFunctionShape.BindParameterBracket = originalBind;

console.log(ok ? "ARROW-EDGE-PROBE PASS" : "ARROW-EDGE-PROBE FAIL");
process.exitCode = ok ? 0 : 1;
