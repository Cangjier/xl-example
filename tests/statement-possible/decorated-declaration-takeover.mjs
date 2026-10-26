// 装饰器声明（`@dec class C {}`）的 root 建树探针（Stage 4af-E）。
//
//   node tests/statement-possible/decorated-declaration-takeover.mjs          # 默认模式
//   node tests/statement-possible/decorated-declaration-takeover.mjs --open    # 开档模式
//
// 用例来自 tests/statement-possible/decorated-declaration-cases.json。
//
// 背景（HANDOFF-s4af-E §2）：`@dec class C {}` 的语句首是 Symbol `@`，root 目录原来没有任何候选
// 认这一格——单独一个文件要靠**文件级 fallback** 才能建对；`declare function gf(): void` ⏎
// `@dec class C {}` 里声明壳又不在 `@` 收口，把装饰器声明整段吞进函数声明（ast-json `end-build`
// 47 条结构差）。Stage 4af-E 让 `Decide` 把 `@` 归 `Legacy`（root 的声明候选自己认装饰器前缀）、
// 并让声明壳在换行后的 `@` 收口，于是这两种形态都由 root（含 leftover replay）建出、不需要兜底。
//
// 两种模式都断言（默认模式 = 出厂开关，开档模式 = 进程内把 EnableDeclarationShell 置 true）：
//   1. **AST == TS 逐节点**（结构 / 区间 / 字段，口径同 ast-json-diff.mjs）；
//   2. **XML == legacy**（`EnableShellExpressions = false` 档逐字节等价）；
//   3. **没有文件级 fallback**（`@dec class` 这类形态本轮起不再需要整条重解析）；
//   4. 顶层节点种类与装饰器个数符合用例声明（防止「AST 恰好相等但整条被丢掉」）；
//   5. 两次解析 XML 逐字节相同（确定性）。
//
// 开档模式另断言：
//   6. `DeclarationShellCount` 增量 = 用例的 `declarationShells`；
//   7. 用例 `declarationShells > 0`（= 前面有一条被声明壳接管的声明）时，
//      `LeftoverReplayCount` 增量 > 0 —— 证明装饰器声明是**壳收口后 leftover 重放**在 root 建出来的，
//      而不是拖到 EOF / fallback。
// 默认模式另断言 `DeclarationShellCount` 增量 = 0（默认不接管声明壳）。
//
// 退出码：失败 > 0 → 1（没有 knownGap：本轮这 14 条必须全绿）。
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createAstCore, cjAst, flatten, kindOf } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { tsAst } = createAstCore(ts);
const load = (p) => require(path.join(root, "build/ts", p));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil: R } = load("typescript/tokens/statements/statement-route-util.js");

const cases = JSON.parse(fs.readFileSync(path.join(here, "decorated-declaration-cases.json"), "utf8"));
const modeOpen = process.argv.includes("--open");

// 实际默认值必须在改动开关之前读。
const actualDefault = R.EnableDeclarationShell === true;
const hasCounters = typeof R.DeclarationShellCount === "number"
  && typeof R.LeftoverReplayCount === "number"
  && typeof R.FileFallbackCount === "number";
const expectTakeover = modeOpen ? true : actualDefault;

if (modeOpen) R.EnableDeclarationShell = true;

function describeError(error) {
  let message = "";
  for (let node = error; node; node = node.InnerException || node.innerException) {
    const text = node.Message || node.message;
    if (text) message = String(text);
  }
  return message.split("\n")[0] || "unknown error";
}

function parse(source) {
  return SourceFileRunner.Parse(source, "case.ts");
}

function firstDifference(tsNodes, cjNodes) {
  const tsFlat = flatten(tsNodes);
  const cjFlat = flatten(cjNodes);
  const count = Math.min(tsFlat.length, cjFlat.length);
  for (let index = 0; index < count; index++) {
    const left = tsFlat[index];
    const right = cjFlat[index];
    if (kindOf(left.kind) !== kindOf(right.kind)) {
      return `#${index} kind: TS=${kindOf(left.kind)} CJ=${kindOf(right.kind)}`;
    }
    if (left.pos !== right.pos || left.end !== right.end) {
      return `#${index} ${kindOf(left.kind)} range: TS=[${left.pos},${left.end}) CJ=[${right.pos},${right.end})`;
    }
    for (const field of ["text", "name", "isTypeOnly"]) {
      if (JSON.stringify(left[field]) !== JSON.stringify(right[field])) {
        return `#${index} ${kindOf(left.kind)} ${field}: TS=${JSON.stringify(left[field])} CJ=${JSON.stringify(right[field])}`;
      }
    }
  }
  if (tsFlat.length !== cjFlat.length) {
    return `节点数：TS=${tsFlat.length} CJ=${cjFlat.length}`;
  }
  return null;
}

function astLineDifference(left, right) {
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index++) {
    if (left[index] !== right[index]) return `第 ${index} 个字符起不同`;
  }
  if (left.length !== right.length) return `长度不同：${left.length} / ${right.length}`;
  return null;
}

const failures = [];
const invariants = [];
if (!hasCounters) invariants.push("DeclarationShellCount / LeftoverReplayCount / FileFallbackCount 不存在");
if (invariants.length > 0) {
  failures.push(`基础不变量不成立：${invariants.join("；")}`);
}

let passCases = 0;
let takeoverCases = 0;
let totalShell = 0;
let totalReplay = 0;

for (const item of cases) {
  const problems = [];
  const expectedTop = (item.top ?? []).map((kind) => kindOf(kind));
  const expectedDecorators = item.decorators ?? 0;

  R.EnableShellExpressions = false;
  let legacyAstLine = null;
  try {
    legacyAstLine = parse(item.source).ToAstLine(0);
  } catch (error) {
    problems.push(`legacy 抛错：${describeError(error)}`);
  }

  R.EnableShellExpressions = true;
  const before = {
    shell: R.DeclarationShellCount,
    replay: R.LeftoverReplayCount,
    fallback: R.FileFallbackCount,
  };
  let shape = null;
  try {
    shape = parse(item.source);
  } catch (error) {
    problems.push(`解析抛错：${describeError(error)}`);
  }
  const shellDelta = R.DeclarationShellCount - before.shell;
  const replayDelta = R.LeftoverReplayCount - before.replay;
  const fallback = R.LastFileFallback === true || R.FileFallbackCount !== before.fallback;
  totalShell += shellDelta;
  totalReplay += replayDelta;
  if (shellDelta > 0) takeoverCases += 1;

  const expectedShells = expectTakeover ? (item.declarationShells ?? 0) : 0;
  if (shellDelta !== expectedShells) {
    problems.push(`DeclarationShellCount 增量=${shellDelta} 期望=${expectedShells}`);
  }
  if (fallback) {
    problems.push("触发了文件级 fallback（装饰器声明应由 root 建出，不靠整条重解析）");
  }
  if (expectTakeover && (item.declarationShells ?? 0) > 0 && replayDelta <= 0) {
    problems.push(`LeftoverReplayCount 增量=${replayDelta} 期望>0（装饰器声明要经壳收口后的尾巴重放建出）`);
  }

  if (shape !== null) {
    const xml = shape.ToAstLine(0);
    if (legacyAstLine !== null) {
      const diff = astLineDifference(xml, legacyAstLine);
      if (diff !== null) problems.push(`XML != legacy：${diff}`);
    }
    for (const tag of ["StatementShape", "PossibleShape", "CatalogGuide"]) {
      if (xml.includes(`${tag}  `)) problems.push(`形状树泄漏 <${tag}>`);
    }
    const file = ts.createSourceFile("case.ts", item.source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const astDiff = firstDifference(file.statements.map(tsAst), shape.Data.map(cjAst));
    if (astDiff !== null) problems.push(`AST != TS：${astDiff}`);
    const flat = flatten(shape.Data.map(cjAst));
    const decorators = flat.filter((node) => kindOf(node.kind) === "Decorator").length;
    if (decorators !== expectedDecorators) {
      problems.push(`Decorator 节点数=${decorators} 期望=${expectedDecorators}`);
    }
    const top = shape.Data.map((node) => kindOf(cjAst(node).kind));
    if (JSON.stringify(top) !== JSON.stringify(expectedTop)) {
      problems.push(`顶层节点=${JSON.stringify(top)} 期望=${JSON.stringify(expectedTop)}`);
    }
    const again = parse(item.source).ToAstLine(0);
    const determinism = astLineDifference(xml, again);
    if (determinism !== null) problems.push(`XML 非确定：${determinism}`);
  }

  const shown = JSON.stringify(item.source.length > 60 ? `${item.source.slice(0, 60)}…` : item.source);
  if (problems.length > 0) {
    failures.push(`${shown}: ${problems.join(" | ")}`);
    console.log(`FAIL ${shown}`);
    for (const problem of problems) console.log(`   ! ${problem}`);
  } else {
    passCases += 1;
    console.log(`PASS ${shown}  decl=${shellDelta} replay=${replayDelta}`);
  }
}

console.log(
  `\n[decorated-declaration] mode=${modeOpen ? "open" : "default"}`
  + ` actualDefault=${actualDefault} expectedTakeover=${expectTakeover}`
  + ` cases=${cases.length} pass=${passCases} failed=${failures.length}`
  + ` takeover=${takeoverCases} totalShell=${totalShell} totalReplay=${totalReplay}`,
);
if (failures.length > 0) {
  for (const failure of failures) console.log(`  FAIL ${failure}`);
}
process.exit(failures.length === 0 ? 0 : 1);
