#!/usr/bin/env node
// 原始 kind 名一致性专用门（Stage 2-A / AST 正确性边界 1：赋值运算符命名口径错位）。
//
// 为什么需要这一门：既有对拍门（ast-json-diff / token-ast / final-matrix）都会先对
// **两侧**施加归一表再比较，所以「产物用了 TS 枚举的别名类」这种漂移永远看不见：
// 已提交快照里 `literals.ts-ast.json` 写 `EqualsToken`、`literals.cj-ast.json` 写
// `FirstAssignment`，6167/6167 却照常绿。本门直接比较**原始 kind 字符串**。
//
// 口径（本轮只断言 `=` 与 `,` 两类）：
//   ① live：`x = 1;` / `x = y = 1;` / `x = 1, y = 2;` 现场解析，
//      CJ 运算符 token 的构造函数名必须是规范类（EqualsTokenShape / CommaTokenShape），
//      且「去 Shape 后的名字」== kindOf(ts.SyntaxKind[TS 运算符 token.kind])；
//   ② snapshot：`typescript/cases/literals.{ts,cj}-ast.json` 里同 (pos,end) 的运算符节点，
//      原始 kind 字符串必须相等（改前红在 FirstAssignment vs EqualsToken，改后绿）；
//   ③ known-gap：`+=` / `^=` 仍是别名类（FirstCompoundAssignmentShape / LastBinaryOperatorShape），
//      本轮 A4 未做，因此遇到时只打印 KNOWN-GAP，不判失败；全仓 fixtures 另做只读台账。
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

// 规范运算符类 / 规范 kind 名。本轮只把 `=` / `,` 两类算作硬断言范围。
const CANONICAL_OPERATOR_CLASSES = new Set(["EqualsTokenShape", "CommaTokenShape"]);

// A4 未做时的已知别名残留：类名 → 它应该对应的规范 kind 名。
const KNOWN_GAP_ALIASES = new Map([
  ["FirstCompoundAssignmentShape", "PlusEqualsToken"],
  ["LastBinaryOperatorShape", "CaretEqualsToken"],
  ["FirstAssignmentShape", "EqualsToken"],
]);

// 快照里可能出现的运算符 kind 名（TS 侧规范名 + 本仓别名残留）。
// 只用于在 fixtures 里挑出「运算符节点」，不是第二张归一表：比较的是原始字符串。
const OPERATOR_KINDS = new Set([
  "EqualsToken", "CommaToken", "PlusEqualsToken", "CaretEqualsToken",
  "PlusToken", "MinusToken", "AsteriskToken", "SlashToken", "PercentToken", "AsteriskAsteriskToken",
  "LessThanToken", "GreaterThanToken", "LessThanEqualsToken", "GreaterThanEqualsToken",
  "EqualsEqualsToken", "ExclamationEqualsToken", "EqualsEqualsEqualsToken", "ExclamationEqualsEqualsToken",
  "AmpersandToken", "BarToken", "CaretToken", "LessThanLessThanToken", "GreaterThanGreaterThanToken",
  "GreaterThanGreaterThanGreaterThanToken", "AmpersandAmpersandToken", "BarBarToken", "QuestionQuestionToken",
  "EqualsGreaterThanToken", "QuestionToken", "ColonToken", "DotDotDotToken", "QuestionDotToken",
  "MinusEqualsToken", "AsteriskEqualsToken", "SlashEqualsToken", "PercentEqualsToken",
  "AsteriskAsteriskEqualsToken", "LessThanLessThanEqualsToken", "GreaterThanGreaterThanEqualsToken",
  "GreaterThanGreaterThanGreaterThanEqualsToken", "AmpersandEqualsToken", "BarEqualsToken",
  "AmpersandAmpersandEqualsToken", "BarBarEqualsToken", "QuestionQuestionEqualsToken",
  // 别名残留（known-gap）：只用于识别节点，识别到后按 KNOWN-GAP 处理。
  "FirstAssignment", "FirstCompoundAssignment", "LastBinaryOperator",
  "LastAssignment", "LastCompoundAssignment", "LastPunctuation",
]);

const LIVE_CASES = [
  { name: "assign", source: "x = 1;" },
  { name: "assign-chain", source: "x = y = 1;" },
  { name: "assign-comma", source: "x = 1, y = 2;" },
];

const failures = [];
let livePassed = 0;
const knownGaps = [];

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

console.log("== live 用例（`=` / `,`：规范类名 + 归一后与 TS 一致） ==");
for (const caseDef of LIVE_CASES) {
  const problems = [];
  let cjOperators = [];
  try {
    cjOperators = collectCjOperators(SourceFileRunner.Parse(caseDef.source, "case.ts"));
  } catch (error) {
    problems.push(`CJ Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
  const tsOperators = collectTsOperators(caseDef.source);
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
    if (!CANONICAL_OPERATOR_CLASSES.has(ours.className)) {
      problems.push(`第 ${index} 个运算符 ${JSON.stringify(caseDef.source.slice(theirs.pos, theirs.end))} 的类名 ${ours.className} 不在 {EqualsTokenShape, CommaTokenShape}`);
    }
    if (ours.normalized !== theirs.normalized) {
      problems.push(`第 ${index} 个运算符归一后不同：CJ ${ours.className} → ${ours.normalized} vs TS ${theirs.raw} → ${theirs.normalized}`);
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

// ---- snapshot：literals 两侧原始 kind 字符串必须相等（硬断言） ----
const CASES_DIR = path.join(root, "typescript", "cases");

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

// 键必须带用例序号：同一个文件里不同用例的运算符会落在同一个 (pos,end)
//（例如 `a += 1;` 与 `a ^= 1;` 都是 1:3 / 1:4），只按 pos:end 做键会把后者覆盖掉。
function operatorKindMap(snapshot) {
  const map = new Map();
  (snapshot.cases || []).forEach((caseEntry, caseIndex) => {
    for (const node of flattenSnapshot(caseEntry.ast)) {
      if (!OPERATOR_KINDS.has(node.kind)) continue;
      map.set(`case[${caseIndex}] ${node.pos}:${node.end}`, node.kind);
    }
  });
  return map;
}

function compareOperatorKinds(scope, tsMap, cjMap, strict) {
  let compared = 0;
  const keys = new Set([...tsMap.keys(), ...cjMap.keys()]);
  for (const key of keys) {
    const tsKind = tsMap.get(key);
    const cjKind = cjMap.get(key);
    if (tsKind === undefined || cjKind === undefined) {
      const message = `同一位置 ${key} 运算符节点只在一侧出现：TS=${String(tsKind)} CJ=${String(cjKind)}`;
      if (strict) fail(scope, message);
      else console.log(`WARN  ${scope}  ${message}`);
      continue;
    }
    compared++;
    if (tsKind === cjKind) {
      if (tsKind === "FirstAssignment") {
        const message = `位置 ${key} 两侧原始 kind 都是别名 FirstAssignment（规范名 EqualsToken 丢失）`;
        if (strict) fail(scope, message);
        else console.log(`WARN  ${scope}  ${message}`);
      } else if (KNOWN_GAP_ALIASES.has(`${tsKind}Shape`)) {
        knownGaps.push(`${scope} ${key} 两侧=${tsKind}（别名类 ${tsKind}Shape，应规范为 ${KNOWN_GAP_ALIASES.get(`${tsKind}Shape`)}）`);
      }
      continue;
    }
    // 只让已列的 known-gap 通过：TS 规范名 vs CJ 别名残留。
    if (tsKind === "CaretEqualsToken" && cjKind === "LastBinaryOperator") {
      knownGaps.push(`${scope} ${key} TS=${tsKind} CJ=${cjKind}（别名类 LastBinaryOperatorShape，应规范为 CaretEqualsToken）`);
      continue;
    }
    const message = `位置 ${key} 原始 kind 不同：TS=${tsKind} CJ=${cjKind}`;
    if (strict) fail(scope, message);
    else console.log(`WARN  ${scope}  ${message}`);
  }
  return compared;
}

console.log("");
console.log("== snapshot：literals.{ts,cj}-ast.json 同 (pos,end) 原始 kind 相等 ==");
let literalsCompared = 0;
try {
  const tsMap = operatorKindMap(readSnapshot("literals", "ts"));
  const cjMap = operatorKindMap(readSnapshot("literals", "cj"));
  literalsCompared = compareOperatorKinds("literals", tsMap, cjMap, true);
} catch (error) {
  fail("literals", `读取/解析快照失败：${String(error && error.message ? error.message : error).split("\n")[0]}`);
}

// ---- known-gap 台账：全仓 fixtures 只读扫描（不判失败；A4 的残留清单） ----
console.log("");
console.log("== known-gap 台账：全仓 fixtures 的别名运算符（只读，不判失败） ==");
const fixtureFiles = fs
  .readdirSync(CASES_DIR)
  .filter((name) => name.endsWith(".cj-ast.json"))
  .sort();
let gapFiles = 0;
for (const fileName of fixtureFiles) {
  const stem = fileName.slice(0, -".cj-ast.json".length);
  const tsFile = path.join(CASES_DIR, `${stem}.ts-ast.json`);
  if (!fs.existsSync(tsFile)) continue;
  try {
    const tsMap = operatorKindMap(readSnapshot(stem, "ts"));
    const cjMap = operatorKindMap(readSnapshot(stem, "cj"));
    const before = knownGaps.length;
    compareOperatorKinds(stem, tsMap, cjMap, false);
    if (knownGaps.length > before) gapFiles++;
  } catch (error) {
    console.log(`WARN  ${stem}  扫描失败：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
}

const uniqueKnownGaps = [...new Set(knownGaps)];
const knownGapClasses = [...new Set(uniqueKnownGaps.map((line) => (line.includes("LastBinaryOperator") ? "LastBinaryOperatorShape(^=)" : "FirstCompoundAssignmentShape(+=)")))].sort();
console.log("");
if (uniqueKnownGaps.length > 0) {
  console.log(`KNOWN-GAP  别名类运算符 ${uniqueKnownGaps.length} 处（${gapFiles} 个快照文件），A4 未做，本门不判失败：`);
  for (const line of uniqueKnownGaps.slice(0, 10)) console.log(`  ${line}`);
  if (uniqueKnownGaps.length > 10) console.log(`  （另有 ${uniqueKnownGaps.length - 10} 处）`);
  console.log(`KNOWN-GAP  classes=${JSON.stringify(knownGapClasses)}`);
} else {
  console.log("KNOWN-GAP  无（`+=` / `^=` 也已是规范名？）");
}

console.log("");
console.log(
  `[ast-kind-names] live=${livePassed}/${LIVE_CASES.length} literals-compared=${literalsCompared} ` +
    `known-gap=${uniqueKnownGaps.length} fail=${failures.length}（口径：只断言 = 与 ,）`,
);
if (failures.length > 0) process.exit(1);
console.log("PASS  原始 kind 名一致（= / ,），known-gap 已如实列出");
process.exit(0);
