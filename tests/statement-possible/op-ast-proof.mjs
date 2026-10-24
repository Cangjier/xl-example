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
const { NumericLiteralShape } = load("typescript/tokens/literals/numeric-literal-shape.js");

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

function tsLiteralText(node) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return "template";
  if (ts.isTemplateExpression(node)) return "template";
  if (ts.isObjectLiteralExpression(node)) return "object";
  if (ts.isRegularExpressionLiteral(node)) return "regex";
  if (ts.isStringLiteral(node)) return "string";
  if (ts.isArrayLiteralExpression(node)) return "array";
  return null;
}

function tsBareImport(node) {
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node) && !ts.isCallExpression(node)) {
    return false;
  }
  return ts.isIdentifier(node.expression) && node.expression.text === "import";
}

function tsInfix(node, sourceFile) {
  const leaf = leafText(node, sourceFile);
  if (leaf !== null) {
    return leaf;
  }
  if (tsBareImport(node)) {
    // `import.meta` / `import("m")` 被形状层保守拒绝（legacy 树不同），这里同样不渲染
    return null;
  }
  const literal = tsLiteralText(node);
  if (literal !== null) {
    return literal;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const object = tsInfix(node.expression, sourceFile);
    if (object === null) return null;
    return "member(" + object + "," + node.name.getText(sourceFile) + ")";
  }
  if (ts.isElementAccessExpression(node)) {
    const object = tsInfix(node.expression, sourceFile);
    const subscript = tsInfix(node.argumentExpression, sourceFile);
    if (object === null || subscript === null) return null;
    return "index(" + object + "," + subscript + ")";
  }
  if (ts.isCallExpression(node)) {
    const callee = tsInfix(node.expression, sourceFile);
    if (callee === null) return null;
    return "call(" + callee + ")";
  }
  if (ts.isNewExpression(node)) {
    const callee = tsInfix(node.expression, sourceFile);
    if (callee === null) return null;
    return "new(" + callee + ")";
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
  if (tsBareImport(node)) {
    // `import.meta` / `import("m")` 被形状层保守拒绝（legacy 树不同），这里同样不渲染
    return null;
  }
  const literal = tsLiteralText(node);
  if (literal !== null) {
    return literal;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const object = tsPrefix(node.expression, sourceFile);
    if (object === null) return null;
    return "member(" + object + "," + node.name.getText(sourceFile) + ")";
  }
  if (ts.isElementAccessExpression(node)) {
    const object = tsPrefix(node.expression, sourceFile);
    const subscript = tsPrefix(node.argumentExpression, sourceFile);
    if (object === null || subscript === null) return null;
    return "index(" + object + "," + subscript + ")";
  }
  if (ts.isCallExpression(node)) {
    const callee = tsPrefix(node.expression, sourceFile);
    if (callee === null) return null;
    return "call(" + callee + ")";
  }
  if (ts.isNewExpression(node)) {
    const callee = tsPrefix(node.expression, sourceFile);
    if (callee === null) return null;
    return "new(" + callee + ")";
  }
  if (ts.isConditionalExpression(node)) {
    const condition = tsPrefix(node.condition, sourceFile);
    const whenTrue = tsPrefix(node.whenTrue, sourceFile);
    const whenFalse = tsPrefix(node.whenFalse, sourceFile);
    if (condition === null || whenTrue === null || whenFalse === null) return null;
    return "?(" + condition + "," + whenTrue + "," + whenFalse + ")";
  }
  if (ts.isPostfixUnaryExpression(node)) {
    const operand = tsPrefix(node.operand, sourceFile);
    if (operand === null) return null;
    return "post(" + operand + ")";
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

// ---- ④ AST 里的数字叶子：用来钉住「前导点 .5 只能是 NumericLiteral」----
// 一边从壳路径真正建出的 AST（SourceFileShape 的 Data 树）里按源码顺序收集 NumericLiteralShape 的规范化文本，
// 一边用 ts.createSourceFile 收集 NumericLiteral.text（TS 同样规范化：.5→0.5、0x1f→31），
// 两边都与用例声明的 astLeaves 逐字比。若 .5 退化成 Identifier，壳这边会少一条，立刻红。
function numericLeavesOfShape(shape, out) {
  if (shape === null || shape === undefined) return out;
  if (shape instanceof NumericLiteralShape) {
    out.push("Numeric:" + shape.Text);
    return out;
  }
  const data = shape.Data;
  if (Array.isArray(data)) {
    for (const child of data) numericLeavesOfShape(child, out);
  }
  return out;
}

function tsNumericLeaves(source) {
  const sourceFile = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = [];
  const walk = (node) => {
    if (ts.isNumericLiteral(node)) {
      out.push("Numeric:" + node.text);
      return;
    }
    node.forEachChild(walk);
  };
  for (const statement of sourceFile.statements) {
    if (ts.isExpressionStatement(statement)) walk(statement.expression);
  }
  return out;
}

// ---- ⑤ AST 节点类型计数：可选链的 ?. / new / 内插模板是 S3g 新增的接管点，
// 光看结构文本（member(...)）分不出「带 ?. 的成员访问」与普通成员访问，所以直接数 AST 里的节点类型。
function countNodes(shape, name) {
  let total = 0;
  const walk = (node) => {
    if (node === null || node === undefined) return;
    if (node.constructor !== undefined && node.constructor.name === name) total++;
    const data = node.Data;
    if (Array.isArray(data)) {
      for (const child of data) walk(child);
    }
  };
  walk(shape);
  return total;
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
    shape,
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
let leafChecked = 0;

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
    // ④ AST 数字叶子：壳路径真建出的 AST、用例声明、TS 的 NumericLiteral.text 三者一致
    const wantLeaves = asList(caseDef.astLeaves);
    if (wantLeaves !== null) {
      leafChecked++;
      const fromShape = numericLeavesOfShape(shell.shape, []);
      if (JSON.stringify(fromShape) !== JSON.stringify(wantLeaves)) {
        problems.push(`AST 数字叶子不符（形状树建的 AST）：期望 ${JSON.stringify(wantLeaves)} 实际 ${JSON.stringify(fromShape)}`);
      }
      const fromTsLeaves = tsNumericLeaves(caseDef.source);
      if (JSON.stringify(fromTsLeaves) !== JSON.stringify(wantLeaves)) {
        problems.push(`AST 数字叶子与 ts.createSourceFile 不符：TS=${JSON.stringify(fromTsLeaves)} 期望=${JSON.stringify(wantLeaves)}`);
      }
    }
    // ⑤ AST 节点类型计数（可选链 / new / 内插模板）
    const wantCounts = caseDef.counts;
    if (wantCounts !== undefined && wantCounts !== null) {
      for (const nodeName of Object.keys(wantCounts)) {
        const actual = countNodes(shell.shape, nodeName);
        if (actual !== wantCounts[nodeName]) {
          problems.push(`AST 节点计数不符 ${nodeName}：期望 ${wantCounts[nodeName]} 实际 ${actual}`);
        }
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
console.log(`[op-ast-proof] group=${groupName} cases=${cases.length} pass=${passed} fail=${failures.length} | 形状树接管计数已核 ${astChecked} 条、TS 逐节点已核 ${tsChecked} 条、AST 数字叶子已核 ${leafChecked} 条`);
if (failures.length > 0) process.exit(1);

