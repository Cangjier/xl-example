// B4g 箭头体（非 Common：`(b) => b` / `[1,2]` / `({a:1})`）的只读探针。
//
// 断言口径（`_reports/B4g.md` §2）：
//   1. **不再抛**：`SourceFileRunner.Parse(text, file)` 不抛，且 `LastFileFallback === false`
//      （base：`ArrowBodyPossibleShape` 只建 `Common` 体 ⇒ `x => (` 的括号关闭格抛
//      `CatalogGuide: 没有候选形状可以构成` ⇒ 整文件 legacy 重解析 ⇒ 不 replay）；
//   2. **真的 replay**：`DeferredBracketCatalog.ReplayCount` 增量 == 期望；每一只被 Bind 的箭头形参 `(`
//      的 `ReplayCount` 恒为 **1**（A2 §3 的 R1「一次」）；
//   3. `ReplayFailureCount` / `ArrowParamsCatalog.HalfBuildCount` 增量 == 0；
//   4. **树与 legacy 逐节点一致**：把 `ParseCore(text, true)` 与 `ParseCore(text, false)` 各投影成
//      「类名 + Pos + 起点 + 终点」的签名逐行比对（`SourceFileShape` / `VariableStatementShape` 的
//      `src` 终点是**既有基线口径**——增量路径的语句终点不含 `;`，wide-ast 已登记——这两行只比起点）；
//   5. **不误 replay**：`(a)` / `f(a, b)` 的 replay 必须为 0（分组括号 / 调用实参）。
//
// 只读：不写文件、不改任何默认值（`EnableExprBracketCatalog` 默认 true）。
//
// 用法：
//   node typescript/cases/tts/tools/arrow-body-probe.mjs
import path from "node:path";
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
const { ArrowParamsCatalog } = require(path.join(BUILD, "typescript", "tokens", "expressions", "forms", "primary", "arrow-params-catalog.js"));
const { ArrowFunctionShape } = require(path.join(BUILD, "typescript", "tokens", "expressions", "arrow-function-shape.js"));

// [label, source, 期望 replay, 期望的箭头形参括号个数]
const SNIPPETS = [
  // 目标探针：体是括号的三种形态
  ["nested-single", "let n = x => (b) => b;\n", 1, 1],
  ["nested-single-body", "let p = x => (b) => b + 1;\n", 1, 1],
  ["array-body", "let a = x => [1, 2];\n", 0, 0],
  ["object-body", "let o = x => ({ a: 1 });\n", 0, 0],
  // 体是括号之后还有续接（`+ 1` 在箭头之外）—— 与 legacy 同树是重点
  ["array-body-suffix", "let b = x => [1].length;\n", 0, 0],
  ["nested-in-object", "let c = { f: x => (b) => b };\n", 1, 1],
  ["nested-in-call", "let d = h(x => (b) => b);\n", 1, 1],
  ["nested-then-array-body", "let e = x => (b) => b;\nlet f = y => [y];\n", 1, 1],
  // 三层、体是括号：两条箭头形参 `(` 各 replay 一次
  ["nested-three-brackets", "let q = x => (b) => (c) => c;\n", 2, 2],
  ["nested-three-brackets-body", "let q = x => (b) => (c) => c + 1;\n", 2, 2],
  // 不误 replay：分组括号 / 调用实参 / 单标识符体（逐字节同 base）
  ["paren-only", "let v = (a);\n", 0, 0],
  ["call-args", "let q = f(a, b);\n", 0, 0],
  ["single-ident-body", "let s = x => x;\n", 0, 0],
  ["number-body", "let u = x => 1;\n", 0, 0],
];

const bindLog = [];
const originalBind = ArrowFunctionShape.BindParameterBracket;
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

// 树签名：类名 + Pos + 起点 + 终点。三类**语句边界**节点（`SourceFileShape` / `VariableStatementShape` /
// `VariableDeclarationListShape`）只比类名 + Pos：增量路径的语句区间取「前一个非 trivia 单元的终点」
// （不含 `;` / 不含换行），legacy 取「语句首字符 / 含换行」——这是**既有基线**（`let a = 1` ⏎ `let b = 2`
// 的第二条语句同样是 `[10,…)` vs `[11,…)`，与箭头体无关），已登记在 wide-ast 的 29 条差异里。
function signature(tree) {
  const lines = [];
  walk(tree, (token) => {
    const range = token.SourceRange || {};
    const name = token.constructor.name;
    const loose = name === "SourceFileShape" || name === "VariableStatementShape"
      || name === "VariableDeclarationListShape";
    if (token.IsTriviaToken) {
      return;
    }
    if (loose) {
      lines.push(name + " " + token.Pos);
      return;
    }
    lines.push(name + " " + token.Pos + " [" + range.StartIndex + "," + range.EndIndex + ")");
  });
  return lines.join("\n");
}

function run(label, source, expectedReplay, expectedArrowBrackets) {
  const file = label + ".ts";
  DeferredBracketCatalog.Reset();
  ArrowParamsCatalog.HalfBuildCount = 0;
  bindLog.length = 0;
  const beforeReplay = DeferredBracketCatalog.ReplayCount;
  const beforeFail = DeferredBracketCatalog.ReplayFailureCount;
  let tree = null;
  let error = "";
  let fallback = false;
  try {
    tree = SourceFileRunner.Parse(source, file);
    fallback = StatementRouteUtil.LastFileFallback === true;
  } catch (e) {
    error = String(e && e.Message ? e.Message : e).split("\n")[0];
  }
  const replay = DeferredBracketCatalog.ReplayCount - beforeReplay;
  const failed = DeferredBracketCatalog.ReplayFailureCount - beforeFail;
  const halves = ArrowParamsCatalog.HalfBuildCount;
  const overReplayed = bindLog.filter((entry) => Number(entry.split(":")[1]) > 1);
  const problems = [];
  if (tree === null) {
    problems.push("throw:" + error);
  }
  if (fallback) {
    problems.push("fileFallback");
  }
  if (replay !== expectedReplay) {
    problems.push("replay=" + replay + "!=" + expectedReplay);
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
  if (bindLog.length !== expectedArrowBrackets) {
    problems.push("arrowBrackets=" + bindLog.length + "!=" + expectedArrowBrackets);
  }
  if (tree !== null) {
    let same = false;
    try {
      same = signature(tree) === signature(SourceFileRunner.ParseCore(source, file, false));
    } catch (e) {
      problems.push("legacyThrow:" + String(e && e.InnerException ? e.InnerException.message : e).split("\n")[0]);
    }
    if (!same) {
      problems.push("treeDiffersFromLegacy");
    }
  }
  const verdict = problems.length === 0 ? "OK" : "NG";
  console.log("=== " + verdict + " " + label + " === " + source.replace(/\n/g, "\\n"));
  console.log("  replay+" + replay + " (expected " + expectedReplay + ")"
    + " bindReplayCounts=[" + bindLog.join(",") + "]"
    + " fail+" + failed
    + " half=" + halves
    + " pending=" + DeferredBracketCatalog.Pending.length
    + " fileFallback=" + fallback);
  if (problems.length > 0) {
    console.log("  PROBLEMS: " + problems.join(" | "));
  }
  console.log("");
  return problems.length === 0;
}

let ok = true;
for (const [label, source, expected, arrowBrackets] of SNIPPETS) {
  ok = run(label, source, expected, arrowBrackets) && ok;
}

ArrowFunctionShape.BindParameterBracket = originalBind;

console.log(ok ? "ARROW-BODY-PROBE PASS" : "ARROW-BODY-PROBE FAIL");
process.exitCode = ok ? 0 : 1;
