#!/usr/bin/env node
// 原始 kind 名一致性专用门（Stage 2-A / AST 正确性边界 1：赋值运算符命名口径错位）。
//
// 为什么需要这一门：既有对拍门（ast-json-diff / token-ast / final-matrix）都会先对
// **两侧**施加归一表再比较，所以「产物用了 TS 枚举的别名类」这种漂移永远看不见：
// 已提交快照里 `literals.ts-ast.json` 写 `EqualsToken`、`literals.cj-ast.json` 写
// `FirstAssignment`，6167/6167 却照常绿。本门直接比较**原始 kind 字符串**。
//
// 口径（A4 起断言 `=` / `+=` / `^=` / `,` 四类，没有 known-gap 豁免）：
//   ① live：`x = 1;` / `x = y = 1;` / `x += 1;` / `x ^= 1;` / `x = 1, y = 2;` 现场解析，
//      CJ 运算符 token 的构造函数名必须是规范类
//      （EqualsTokenShape / PlusEqualsTokenShape / CaretEqualsTokenShape / CommaTokenShape），
//      且「去 Shape 后的名字」== kindOf(ts.SyntaxKind[TS 运算符 token.kind]);
//   ② snapshot：`typescript/cases/astjson/literals.{ts,cj}-ast.json` 与**全部** fixtures 里，
//      两侧同一用例、同一位置的运算符节点原始 kind 字符串必须相等；任何一栏出现
//      TS 枚举别名（FirstAssignment / FirstCompoundAssignment / LastBinaryOperator /
//      LastAssignment / LastCompoundAssignment / LastPunctuation）即失败——即便两侧同名，
//      因为「两侧都是别名」= 规范名丢失，正是本门要防的退化;
//   ③ self-test：用内存里的合成节点反证比较器有牙齿（别名残留 / 数量不同 / 原始名不同
//      都必须被判为问题），不依赖产品代码。真实反例的构造方法见 HANDOFF。
//
// 只读：不写任何文件，不碰 build/ 与 typescript/cases/。
//   node tests/statement-possible/ast-kind-names.mjs   # 退出码 0 = 全绿；1 = 有断言失败
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { kindOf } from "../../typescript/cases/ast-compare.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(import.meta.url);
const ts = require(path.join(root, "node_modules", "typescript"));
const { SourceFileRunner } = require(path.join(root, "build", "ts", "typescript", "run", "source-file-runner.js"));

// 规范运算符类 → 规范 kind 名（去 Shape 后必须相等）。A4 起四类全部硬断言。
const CANONICAL_OPERATOR_CLASSES = new Map([
  ["EqualsTokenShape", "EqualsToken"],
  ["PlusEqualsTokenShape", "PlusEqualsToken"],
  ["CaretEqualsTokenShape", "CaretEqualsToken"],
  ["CommaTokenShape", "CommaToken"],
]);

// TS 枚举别名：反查名（或产物侧误用的别名类名）落到这些名字上就是缺陷。
// 两侧同名也算缺陷（规范名丢失），不再有 known-gap 豁免。
const ALIAS_KIND_NAMES = new Set([
  "FirstAssignment",
  "FirstCompoundAssignment",
  "LastBinaryOperator",
  "LastAssignment",
  "LastCompoundAssignment",
  "LastPunctuation",
]);

// 本门认的运算符节点 = 四类规范名 + 它们的历史别名（识别到别名才能报错）。
const TARGET_KINDS = new Set(["EqualsToken", "PlusEqualsToken", "CaretEqualsToken", "CommaToken"]);
const OPERATOR_KINDS = new Set([...TARGET_KINDS, ...ALIAS_KIND_NAMES]);

const LIVE_CASES = [
  { name: "assign", source: "x = 1;" },
  { name: "assign-chain", source: "x = y = 1;" },
  { name: "plus-equals", source: "x += 1;" },
  { name: "caret-equals", source: "x ^= 1;" },
  { name: "assign-comma", source: "x = 1, y = 2;" },
];

const failures = [];
let livePassed = 0;
let selfCheckPassed = 0;

function fail(scope, message) {
  failures.push(`[${scope}] ${message}`);
  console.log(`FAIL  ${scope}  ${message}`);
}

function walkShape(node, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walkShape(item, visit);
    return;
  }
  if (typeof node !== "object") return;
  visit(node);
  if (Array.isArray(node.Data)) walkShape(node.Data, visit);
}

function shapeClassName(node) {
  const ctor = node === null || node === undefined ? undefined : node.constructor;
  return ctor === undefined || ctor === null ? "" : String(ctor.name);
}

// CJ 侧：只认 BinaryExpressionShape 的 Data[1]（运算符 token）。前序顺序与 TS 的 forEachChild 一致。
function collectCjOperators(shape) {
  const operators = [];
  walkShape(shape, (node) => {
    if (shapeClassName(node) !== "BinaryExpressionShape") return;
    const data = node.Data || [];
    const token = data[1];
    if (token === undefined || token === null) return;
    const range = token.SourceRange || {};
    operators.push({
      className: shapeClassName(token),
      normalized: shapeClassName(token).replace(/Shape$/, ""),
      pos: typeof token.Pos === "number" ? token.Pos : -1,
      end: typeof range.EndIndex === "number" ? range.EndIndex : -1,
    });
  });
  return operators;
}

function collectTsOperators(source) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true);
  const operators = [];
  const visit = (node) => {
    if (ts.isBinaryExpression(node)) {
      const token = node.operatorToken;
      const raw = ts.SyntaxKind[token.kind];
      operators.push({ raw, normalized: kindOf(raw), pos: token.pos, end: token.end });
    }
    node.forEachChild(visit);
  };
  file.forEachChild(visit);
  return operators;
}

// ---- 纯函数：一次「原始 kind 逐位比较」，供 snapshot 与 self-test 共用 ----
// 输入是两侧按前序排好的运算符节点 { kind, pos, end }（kind 为原始字符串）。
// 返回问题列表（空 = 通过）。不做任何归一，别名即问题。
function compareOperatorNodes(tsNodes, cjNodes) {
  const problems = [];
  if (tsNodes.length !== cjNodes.length) {
    problems.push(`运算符 token 数不同：TS=${tsNodes.length} CJ=${cjNodes.length}`);
  }
  const pairCount = Math.min(tsNodes.length, cjNodes.length);
  for (let index = 0; index < pairCount; index++) {
    const theirs = tsNodes[index];
    const ours = cjNodes[index];
    if (ours.pos !== theirs.pos || ours.end !== theirs.end) {
      problems.push(`第 ${index} 个运算符位置不同：CJ ${ours.pos}-${ours.end} vs TS ${theirs.pos}-${theirs.end}`);
    }
    if (ALIAS_KIND_NAMES.has(theirs.kind)) {
      problems.push(`第 ${index} 个运算符 TS 侧原始名是别名 ${theirs.kind}（规范名应为其枚举规范名）`);
    }
    if (ALIAS_KIND_NAMES.has(ours.kind)) {
      problems.push(`第 ${index} 个运算符 CJ 侧仍是别名类 ${ours.kind}Shape`);
    }
    if (theirs.kind !== ours.kind) {
      problems.push(`第 ${index} 个运算符原始 kind 不同：CJ=${ours.kind} TS=${theirs.kind}`);
    }
  }
  return problems;
}

// ---- ③ self-test：合成节点证明比较器有牙齿 ----
console.log("== self-test：比较器对别名 / 数量 / 原始名差都会报错 ==");
const synthetic = (kind, pos) => ({ kind, pos, end: pos + 2 });
const selfCheckCases = [
  {
    name: "canonical-passes",
    tsNodes: [synthetic("PlusEqualsToken", 1), synthetic("CaretEqualsToken", 5)],
    cjNodes: [synthetic("PlusEqualsToken", 1), synthetic("CaretEqualsToken", 5)],
    wantProblems: 0,
  },
  {
    name: "cj-alias-detected",
    tsNodes: [synthetic("PlusEqualsToken", 1)],
    cjNodes: [synthetic("FirstCompoundAssignment", 1)],
    wantProblems: 2, // 别名 + 原始名不同
  },
  {
    name: "both-alias-detected",
    tsNodes: [synthetic("LastBinaryOperator", 1)],
    cjNodes: [synthetic("LastBinaryOperator", 1)],
    wantProblems: 2, // 两侧各报一次：两侧都是别名 = 规范名丢失
  },
  {
    name: "count-mismatch-detected",
    tsNodes: [synthetic("EqualsToken", 1)],
    cjNodes: [],
    wantProblems: 1,
  },
];
for (const check of selfCheckCases) {
  const problems = compareOperatorNodes(check.tsNodes, check.cjNodes);
  if (problems.length === check.wantProblems) {
    selfCheckPassed++;
    console.log(`PASS  ${check.name.padEnd(24)} problems=${problems.length}`);
  } else {
    fail("self-test", `${check.name} 期望 problems=${check.wantProblems} 实际=${problems.length}：${problems.join("；")}`);
  }
}

console.log("");
console.log("== live 用例（四类运算符：规范类名 + 归一后与 TS 一致） ==");
for (const caseDef of LIVE_CASES) {
  const problems = [];
  let cjOperators = [];
  try {
    cjOperators = collectCjOperators(SourceFileRunner.Parse(caseDef.source, "case.ts"));
  } catch (error) {
    problems.push(`CJ Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
  const tsOperators = collectTsOperators(caseDef.source);
  // live 的 TS 侧「原始名」本来就是枚举别名（FirstAssignment / FirstCompoundAssignment …），
  // 所以这里不比原始名，而是比 **CJ 去 Shape 后的规范名 == kindOf(TS 原始名)**，见下方循环。
  if (cjOperators.length !== tsOperators.length) {
    problems.push(`运算符 token 数不同：CJ=${cjOperators.length} TS=${tsOperators.length}`);
  }
  const pairCount = Math.min(cjOperators.length, tsOperators.length);
  for (let index = 0; index < pairCount; index++) {
    const ours = cjOperators[index];
    const theirs = tsOperators[index];
    if (ours.pos !== theirs.pos || ours.end !== theirs.end) {
      problems.push(`第 ${index} 个运算符位置不同：CJ ${ours.pos}-${ours.end} vs TS ${theirs.pos}-${theirs.end}`);
    }
    const expected = CANONICAL_OPERATOR_CLASSES.get(ours.className);
    if (expected === undefined) {
      problems.push(
        `第 ${index} 个运算符 ${JSON.stringify(caseDef.source.slice(theirs.pos, theirs.end))} 的类名 ${ours.className} 不在 ` +
          `${JSON.stringify([...CANONICAL_OPERATOR_CLASSES.keys()])}`,
      );
      continue;
    }
    if (ours.normalized !== theirs.normalized) {
      problems.push(
        `第 ${index} 个运算符规范化不同：CJ ${ours.className} → ${ours.normalized} vs TS ${theirs.raw} → ${theirs.normalized}`,
      );
    }
    if (ours.normalized !== expected) {
      problems.push(`第 ${index} 个运算符类名与规范映射不符：${ours.className} 应为 ${expected}`);
    }
  }
  if (problems.length === 0) {
    livePassed++;
    console.log(
      `PASS  ${caseDef.name.padEnd(14)} src=${JSON.stringify(caseDef.source).padEnd(18)} ` +
        `operators=${JSON.stringify(cjOperators.map((item) => `${item.className}@${item.pos}-${item.end}`))}`,
    );
  } else {
    for (const problem of problems) fail(caseDef.name, problem);
  }
}

// ---- snapshot：两侧原始 kind 逐位相等（四类运算符，严格，无豁免） ----
const CASES_DIR = path.join(root, "typescript", "cases", "astjson");

function readSnapshot(stem, side) {
  const file = path.join(CASES_DIR, `${stem}.${side}-ast.json`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function flattenSnapshot(nodes, out = []) {
  for (const node of nodes || []) {
    out.push(node);
    flattenSnapshot(node.children, out);
  }
  return out;
}

// 按用例收集四类运算符节点（原始 kind 字符串 + 位置），保持前序顺序。
// 只认 OPERATOR_KINDS 里的名字：它既是「规范名」也是「历史别名」，识别别名才能报错。
function collectSnapshotOperators(snapshot) {
  return (snapshot.cases || []).map((caseEntry) =>
    flattenSnapshot(caseEntry.ast)
      .filter((node) => OPERATOR_KINDS.has(node.kind))
      .map((node) => ({ kind: node.kind, pos: node.pos, end: node.end })),
  );
}

function compareSnapshotPair(scope, tsSnapshot, cjSnapshot, strict) {
  const tsByCase = collectSnapshotOperators(tsSnapshot);
  const cjByCase = collectSnapshotOperators(cjSnapshot);
  let compared = 0;
  const caseCount = Math.max(tsByCase.length, cjByCase.length);
  const problems = [];
  for (let caseIndex = 0; caseIndex < caseCount; caseIndex++) {
    const tsNodes = tsByCase[caseIndex] || [];
    const cjNodes = cjByCase[caseIndex] || [];
    for (const problem of compareOperatorNodes(tsNodes, cjNodes)) {
      problems.push(`case[${caseIndex}] ${problem}`);
    }
    compared += Math.min(tsNodes.length, cjNodes.length);
  }
  if (strict) {
    for (const problem of problems) fail(scope, problem);
  } else {
    for (const problem of problems) console.log(`WARN  ${scope}  ${problem}`);
  }
  return compared;
}

console.log("");
console.log("== snapshot：literals.{ts,cj}-ast.json 四类运算符原始 kind 逐位相等 ==");
let literalsCompared = 0;
try {
  literalsCompared = compareSnapshotPair(
    "literals",
    readSnapshot("literals", "ts"),
    readSnapshot("literals", "cj"),
    true,
  );
} catch (error) {
  fail("literals", `读取/解析快照失败：${String(error && error.message ? error.message : error).split("\n")[0]}`);
}

// ---- 全仓 fixtures：同一口径，严格（A4 后不应再有 += / ^= 别名残留） ----
console.log("");
console.log("== 全仓 fixtures：四类运算符原始 kind 逐位相等（严格） ==");
const fixtureFiles = fs
  .readdirSync(CASES_DIR)
  .filter((name) => name.endsWith(".cj-ast.json"))
  .sort();
let scannedFiles = 0;
let comparedNodes = literalsCompared;
for (const fileName of fixtureFiles) {
  const stem = fileName.slice(0, -".cj-ast.json".length);
  const tsFile = path.join(CASES_DIR, `${stem}.ts-ast.json`);
  if (!fs.existsSync(tsFile)) continue;
  try {
    const before = failures.length;
    comparedNodes += compareSnapshotPair(stem, readSnapshot(stem, "ts"), readSnapshot(stem, "cj"), true);
    scannedFiles++;
    if (failures.length > before) console.log(`FAIL  ${stem}  见上方逐条差异`);
  } catch (error) {
    fail(stem, `扫描失败：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
}

console.log("");
console.log(
  `[ast-kind-names] live=${livePassed}/${LIVE_CASES.length} self-test=${selfCheckPassed}/${selfCheckCases.length} ` +
    `fixtures=${scannedFiles} operator-nodes-compared=${comparedNodes} fail=${failures.length}` +
    `（口径：硬断言 = / += / ^= / , 四类，无 known-gap 豁免）`,
);
if (failures.length > 0) process.exit(1);
console.log("PASS  四类运算符原始 kind 名一致（= / += / ^= / ,），别名残留 0");
process.exit(0);
