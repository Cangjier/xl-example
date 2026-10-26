// B4d 箭头形参 `(` 的 Deferred → replay 只读探针（可复算）。
//
// 断言口径（`_reports/B4d.md` §2）：
//   1. `(` 在创建格由 `BracketRoleResolver` 判为 `Deferred ArrowParams`；
//   2. `=>` 确定之后该括号 `ReplayCount === 1`、`DeferredBracketCatalog.ReplayFailureCount === 0`；
//   3. `a` / `b` 在各自的 token 格成 `IdentifierShape` / `ParameterShape`（即 replay 出来的
//      `ParameterShape` 里就是 `IdentifierShape`），且最终树与 legacy 逐节点一致（`fileFallback === false`）；
//   4. 非箭头 `(a)`（分组括号）**不 replay**（`ReplayCount === 0`，条目留在 `Pending`）。
//
// 只读：不写任何文件、不改任何默认值（`EnableExprBracketCatalog` 本来就是默认 true）。
//
// 用法：
//   node typescript/cases/tts/tools/arrow-param-probe.mjs
//   node typescript/cases/tts/tools/arrow-param-probe.mjs <file.ts> ...
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
const { ArrowFunctionShape } = require(path.join(BUILD, "typescript", "tokens", "expressions", "arrow-function-shape.js"));

const SNIPPETS = [
  ["arrow-typed", "let f = (a: number) => a;\n", 1],
  ["arrow-two", "let g = (a, b) => a + b;\n", 1],
  ["arrow-async", "let h = async (a: number) => a;\n", 1],
  ["arrow-single", "let k = x => x;\n", 0],
  ["arrow-object-value", "let o = { m: (a: number) => a };\n", 1],
  ["arrow-call-arg", "let c = h((a: number) => a + 1);\n", 1],
  // [B4f] 嵌套箭头：内层 `(b) =>` 的 `(` 前一个是 `=>`，`BracketRoleResolver.Classify` 现在有
  // 这条规则（`nested-arrow-paren-wait-for-arrow`），外层与内层各 replay 一次 ⇒ 2。
  ["arrow-nested", "let n = (a) => (b) => a + b;\n", 2],
  ["arrow-twice", "let p = (a: number) => a;\nlet q = (a, b) => b;\n", 2],
  ["paren-only", "let v = (a);\n", 0],
  ["paren-binop", "let w = (a) + 1;\n", 0],
  ["paren-call", "let q = f(a, b);\n", 0],
  ["function-params", "function fn(a: number) {}\n", 0],
  // [B4f] R1 默认值参数：`IsSimpleArrowList` + `Probe` 动作 9 ⇒ 整份 replay 一次。
  ["arrow-default", "let d = (a: number, b = 1) => a;\n", 1],
];

function walk(token, visit) {
  visit(token);
  if (!token || !token.Data) {
    return;
  }
  for (const child of token.Data) {
    walk(child, visit);
  }
}

const bracketLog = [];
const originalBind = ArrowFunctionShape.BindParameterBracket;
ArrowFunctionShape.BindParameterBracket = function (bracket, context) {
  const before = bracket === null || bracket === undefined ? -1 : bracket.ReplayCount;
  const result = originalBind.call(ArrowFunctionShape, bracket, context);
  const after = bracket === null || bracket === undefined ? -1 : bracket.ReplayCount;
  bracketLog.push("  bind: bracketReplay=" + before + "->" + after + " arrowable="
    + (bracket instanceof Bracket ? ArrowParamsCatalog.IsArrowable(bracket) : "-")
    + " -> " + result);
  return result;
};

const resolveLog = [];
const originalResolve = BracketRoleResolver.Resolve;
BracketRoleResolver.Resolve = function (host, bracket, context) {
  const result = originalResolve.call(BracketRoleResolver, host, bracket, context);
  const state = result.IsKnown() ? "Known" : (result.IsDeferred() ? "Deferred" : "Fallback");
  resolveLog.push("  resolve: " + bracket.StartBracketChar + " host=" + host.constructor.name
    + " -> " + state + " " + result.Role + (result.Reason ? " (" + result.Reason + ")" : ""));
  return result;
};

function run(label, source, file, expectedReplay) {
  DeferredBracketCatalog.Reset();
  ArrowParamsCatalog.MountCount = 0;
  ArrowParamsCatalog.ReplayedCount = 0;
  ArrowParamsCatalog.RejectCount = 0;
  ArrowParamsCatalog.HalfBuildCount = 0;
  bracketLog.length = 0;
  resolveLog.length = 0;
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
  const verdict = (tree !== null && !fallback && failed === 0 && replayed === expectedReplay) ? "OK" : "NG";
  console.log("=== " + verdict + " " + label + " === " + source.replace(/\n/g, "\\n"));
  for (const line of resolveLog) {
    console.log(line);
  }
  for (const line of bracketLog) {
    console.log(line);
  }
  if (tree === null) {
    console.log("  PARSE ERROR: " + error);
  }
  const params = [];
  walk(tree, (token) => {
    if (token.constructor.name === "ParameterShape") {
      const kids = token.Data.filter((u) => !u.IsTriviaToken).map((u) => u.constructor.name);
      params.push("ParameterShape(pos=" + token.Pos + ", " + kids.join("+") + ")");
    }
  });
  if (params.length > 0) {
    console.log("  params: " + params.join(" ; "));
  }
  console.log("  replay+" + replayed + " (expected " + expectedReplay + ")"
    + " fail+" + failed
    + " deferred+" + deferred
    + " pending=" + DeferredBracketCatalog.Pending.length
    + " half=" + ArrowParamsCatalog.HalfBuildCount
    + " rejected=" + ArrowParamsCatalog.RejectCount
    + " fileFallback=" + fallback);
  console.log("");
  return verdict === "OK";
}

const files = process.argv.slice(2);
let ok = true;
if (files.length > 0) {
  for (const file of files) {
    ok = run(path.basename(file), fs.readFileSync(file, "utf8"), path.basename(file), 1) && ok;
  }
} else {
  for (const [label, source, expected] of SNIPPETS) {
    ok = run(label, source, label + ".ts", expected) && ok;
  }
}

ArrowFunctionShape.BindParameterBracket = originalBind;
BracketRoleResolver.Resolve = originalResolve;

console.log(ok ? "ARROW-PARAM-PROBE PASS" : "ARROW-PARAM-PROBE FAIL");
process.exitCode = ok ? 0 : 1;
