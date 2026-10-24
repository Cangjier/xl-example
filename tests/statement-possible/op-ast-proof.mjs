#!/usr/bin/env node
// S3c 专用取证：受支持表达式语句的 AST 由增量形状树产出（不属于旧门）。
//
// 对 tests/statement-possible/op-ast-cases.json 里 ast-from-shapes 组的每一条，断言：
//   1. 壳路径 XML == 同源码 legacy 路径（EnableShellExpressions=false）XML，逐字节；
//   2. 形状树**确实接管了 AST**：StatementShapeAst.TotalShapeAst === 期望条数。
//      未覆盖构造必须 === 0（declined 而不是静默回退）——这一条让「新 AST 与 legacy 不一致」时必然是红，
//      不会被 try/catch 回退吞掉（回退只会让计数变 0，用例期望是 1）。
//   3. 形状结构 == TypeScript 自己的 AST 结构：用 ts.createSourceFile 逐节点渲染成与 ShapeTexts 同一套
//      前缀写法，逐字比较（二元左右子树、括号、前缀、叶子文本都是独立节点）。TS 渲染不了的构造
//      （调用 / 成员访问）返回 null 并被滤掉，用例用 tsTexts 显式声明这种情形下的期望。
//   4. 壳里不泄漏形状节点进 XML。
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const buildRoot = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);
const load = (rel) => require(path.join(buildRoot, rel));
const ts = require(path.join(root, "node_modules", "typescript"));

const { SourceFileRunner } = load("typescript/run/source-file-runner.js");
const { StatementRouteUtil } = load("typescript/tokens/statements/statement-route-util.js");
const { StatementOperatorBody } = load("typescript/tokens/statements/statement-operator-body.js");
const { StatementShapeAst } = load("typescript/tokens/statements/statement-shape-ast.js");

const argOf = (name, fallback) => {
  const hit = process.argv.find((item) => item.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const file = path.resolve(root, argOf("file", path.join("tests", "statement-possible", "op-ast-cases.json")));
const groupName = argOf("group", "ast-from-shapes");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const group = data.groups[groupName];
if (group === undefined) {
  console.log(`FAIL  用例文件 ${file} 里没有分组 ${groupName}`);
  process.exit(1);
}

function xmlOf(shape) {
  if (shape === null || shape === undefined || typeof shape.ToXmlString !== "function") return null;
  return shape.ToXmlString();
}

function firstDiff(left, right) {
  if (left === right) return null;
  const limit = Math.min(left.length, right.length);
  for (let at = 0; at < limit; at++) {
    if (left[at] !== right[at]) {
      return `首个不同在第 ${at} 字节：壳=${JSON.stringify(left.slice(Math.max(0, at - 30), at + 30))} legacy=${JSON.stringify(right.slice(Math.max(0, at - 30), at + 30))}`;
    }
  }
  return `长度不同：壳=${left.length} legacy=${right.length}`;
}

// ---- TypeScript 侧的前缀渲染：与 StatementOperatorBody.Render / RenderInfix 同一套写法 ----
function opText(node, sourceFile) {
  return node.operatorToken.getText(sourceFile);
}

function prefixOperatorText(node) {
  return ts.tokenToString(node.operator) || "";
}

function leafText(node, sourceFile) {
  if (ts.isIdentifier(node) || ts.isNumericLiteral(node)) {
    return node.getText(sourceFile);
  }
  return null;
}

function tsInfix(node, sourceFile) {
  const leaf = leafText(node, sourceFile);
  if (leaf !== null) {
    return leaf;
  }
  if (ts.isBinaryExpression(node)) {
    const left = tsInfix(node.left, sourceFile);
    const right = tsInfix(node.right, sourceFile);
    if (left === null || right === null) return null;
    return left + opText(node, sourceFile) + right;
  }
  if (ts.isPrefixUnaryExpression(node)) {
    const operand = tsInfix(node.operand, sourceFile);
    if (operand === null) return null;
    return prefixOperatorText(node) + operand;
  }
  if (ts.isParenthesizedExpression(node)) {
    const inner = tsInfix(node.expression, sourceFile);
    if (inner === null) return null;
    return "(" + inner + ")";
  }
  return null;
}

function tsPrefix(node, sourceFile) {
  const leaf = leafText(node, sourceFile);
  if (leaf !== null) {
    return leaf;
  }
  if (ts.isBinaryExpression(node)) {
    const left = tsPrefix(node.left, sourceFile);
    const right = tsPrefix(node.right, sourceFile);
    if (left === null || right === null) return null;
    return opText(node, sourceFile) + "(" + left + "," + right + ")";
  }
  if (ts.isPrefixUnaryExpression(node)) {
    const operand = tsPrefix(node.operand, sourceFile);
    if (operand === null) return null;
    return prefixOperatorText(node) + "(" + operand + ")";
  }
  if (ts.isParenthesizedExpression(node)) {
    const inner = tsInfix(node.expression, sourceFile);
    if (inner === null) return null;
    return "(" + inner + ")";
  }
  return null;
}

function tsShapeTexts(source) {
  const sourceFile = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const texts = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement)) continue;
    const rendered = tsPrefix(statement.expression, sourceFile);
    if (rendered !== null) {
      texts.push(rendered);
    }
  }
  return texts;
}

function asList(value) {
  if (value === undefined || value === null) return null;
  return Array.isArray(value) ? value : [value];
}

function reset() {
  StatementOperatorBody.ShapeTexts.length = 0;
  StatementOperatorBody.TotalBodies = 0;
  StatementOperatorBody.TotalInserts = 0;
  StatementOperatorBody.TotalIncomplete = 0;
  StatementOperatorBody.LastText = "";
  StatementOperatorBody.LastComplete = false;
  StatementShapeAst.TotalShapeAst = 0;
  StatementShapeAst.TotalDeclined = 0;
  StatementShapeAst.LastDeclineReason = "";
}

function runShell(source) {
  reset();
  StatementRouteUtil.EnableShellExpressions = true;
  const shape = SourceFileRunner.Parse(source, "case.ts");
  return {
    xml: xmlOf(shape),
    fallback: StatementRouteUtil.LastFileFallback === true,
    texts: StatementOperatorBody.ShapeTexts.slice(),
    shapeAst: StatementShapeAst.TotalShapeAst,
    declined: StatementShapeAst.TotalDeclined,
    declineReason: StatementShapeAst.LastDeclineReason,
  };
}

function runLegacy(source) {
  const previous = StatementRouteUtil.EnableShellExpressions;
  reset();
  try {
    StatementRouteUtil.EnableShellExpressions = false;
    return xmlOf(SourceFileRunner.Parse(source, "case.ts"));
  } finally {
    StatementRouteUtil.EnableShellExpressions = previous;
  }
}

const cases = group.cases || [];
const failures = [];
let passed = 0;
let astChecked = 0;
let tsChecked = 0;

for (const caseDef of cases) {
  const problems = [];
  let shell = null;
  try {
    shell = runShell(caseDef.source);
  } catch (error) {
    problems.push(`壳路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
  if (shell !== null) {
    let legacyXml = null;
    try {
      legacyXml = runLegacy(caseDef.source);
    } catch (error) {
      problems.push(`legacy 路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
    }
    if (shell.fallback) problems.push("壳路径触发了文件级 fallback（本组要求不 fallback）");
    if (legacyXml === null) {
      problems.push("legacy 路径没有产出 XML");
    } else if (shell.xml === null) {
      problems.push("壳路径没有产出 XML");
    } else {
      const diff = firstDiff(shell.xml, legacyXml);
      if (diff !== null) problems.push(`壳 XML != legacy XML：${diff}`);
    }
    if (shell.xml !== null) {
      for (const tag of ["StatementShape", "StatementOperandShape", "StatementOperatorBody", "StatementShapeAst"]) {
        if (shell.xml.includes(`<${tag}>`)) problems.push(`形状泄漏进 XML：<${tag}>`);
      }
    }
    // ② 形状树是否真的接管了 AST
    const wantAst = typeof caseDef.shapeAst === "number" ? caseDef.shapeAst : 1;
    astChecked++;
    if (shell.shapeAst !== wantAst) {
      problems.push(`形状树接管条数不符：期望 ${wantAst} 实际 ${shell.shapeAst}（declined=${shell.declined} 原因=${JSON.stringify(shell.declineReason)}）`);
    }
    if (wantAst === 0 && shell.declined === 0) {
      problems.push("期望 declined（未覆盖构造）实际没有拒绝记录");
    }
    // ③ 结构文本：形状树自己的文本、TS 逐节点渲染的文本，两者都要与期望一致
    const wantTexts = asList(caseDef.shapeTexts);
    if (wantTexts !== null) {
      if (JSON.stringify(shell.texts) !== JSON.stringify(wantTexts)) {
        problems.push(`形状结构文本不符：期望 ${JSON.stringify(wantTexts)} 实际 ${JSON.stringify(shell.texts)}`);
      }
      const tsDeclared = asList(caseDef.tsTexts);
      const tsExpected = tsDeclared === null ? wantTexts : tsDeclared;
      const fromTs = tsShapeTexts(caseDef.source);
      tsChecked++;
      if (JSON.stringify(fromTs) !== JSON.stringify(tsExpected)) {
        problems.push(`与 ts.createSourceFile 逐节点渲染不符：TS=${JSON.stringify(fromTs)} 期望=${JSON.stringify(tsExpected)}`);
      }
    }
  }
  if (problems.length === 0) {
    passed++;
    console.log(`PASS  ${caseDef.name}  shapeAst=${shell.shapeAst} declined=${shell.declined} texts=${JSON.stringify(shell.texts)}`);
  } else {
    failures.push({ name: caseDef.name, problems });
    console.log(`FAIL  ${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
    for (const problem of problems) console.log(`        ${problem}`);
  }
}

console.log("");
console.log(`[op-ast-proof] group=${groupName} cases=${cases.length} pass=${passed} fail=${failures.length} | 形状树接管计数已核 ${astChecked} 条、TS 逐节点已核 ${tsChecked} 条`);
if (failures.length > 0) process.exit(1);
