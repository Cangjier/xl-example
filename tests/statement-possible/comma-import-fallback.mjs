#!/usr/bin/env node
// S3n 专用取证：逗号运算符**必须由形状树接管**；`import` 表达式 / 声明头仍是边界，台账保持。
//
// 分组语义（S3n 起与 S3k 相反，逗号从「保守回退」翻成「必须接管」）：
//   comma    —— 逗号表达式必须由形状树接管：`shapeAst === 1`、`declined === 0`，且形状结构文本逐条断言。
//               同时仍钉住安全契约：壳路径 XML == legacy 路径 XML 逐字节、无文件级 fallback、无形状节点泄漏。
//   import   —— `import.meta` / 动态 `import()` 今天已经 `shapeAst=1`（表达式位），只进台账、不写成「必须回退」；
//               `import x from "m";` 是**声明**，声明头仍走 legacy：显式断言 `shapeAst === 0 && declined === 0`。
//   control  —— 参数 / 数组 / 对象字面量**内部**的逗号不是序列：控制组仍由形状树接管（shapeAst >= 1）。
//
// 逗号运算符的 AST 形状在 TS 6.0.3 里就是 `BinaryExpression + CommaToken`（**没有 SequenceExpression**），
// 所以本组断言的是「谁来建树」与结构文本，不是节点种类——`ast-json` 的快照零变化才是树不变的证据。
//
// 每条用例同时打印 TotalShapeAst / TotalDeclined / LastDeclineReason / 形状文本 / TS 节点种类，
// 作为可复核台账。将来若有人动了树却没改用例，这里会先红：
// 要么逗号组的 shapeAst 掉回 0（退回 legacy）、要么结构文本变了、要么 XML 与 legacy 不再逐字节相同。
import { createRequire } from "node:module";
import path from "node:path";
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

function astLineOf(shape) {
  if (shape === null || shape === undefined || typeof shape.ToAstLine !== "function") return null;
  return shape.ToAstLine(0);
}

function firstDiff(left, right) {
  if (left === right) return null;
  const limit = Math.min(left.length, right.length);
  for (let at = 0; at < limit; at++) {
    if (left[at] !== right[at]) {
      return `首个不同在第 ${at} 字节：壳=${JSON.stringify(left.slice(Math.max(0, at - 24), at + 24))} legacy=${JSON.stringify(right.slice(Math.max(0, at - 24), at + 24))}`;
    }
  }
  return `长度不同：壳=${left.length} legacy=${right.length}`;
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
    xml: astLineOf(shape),
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
    return astLineOf(SourceFileRunner.Parse(source, "case.ts"));
  } finally {
    StatementRouteUtil.EnableShellExpressions = previous;
  }
}

// 形状 / AST 节点遍历：只看结构（Data 子节点），不碰文本。
function walk(node, visit) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (typeof node !== "object") return;
  visit(node);
  const data = node.Data;
  if (Array.isArray(data)) walk(data, visit);
}

function nodeNames(shape) {
  const names = [];
  walk(shape, (node) => {
    const name = node.constructor === undefined || node.constructor === null ? "" : String(node.constructor.name);
    if (name !== "" && names.indexOf(name) < 0) names.push(name);
  });
  return names;
}

function tsKindOf(source) {
  const file = ts.createSourceFile("case.ts", source, ts.ScriptTarget.Latest, true);
  const statement = file.statements[0];
  if (statement === undefined) return { statement: "none", expression: "none" };
  const expression = statement.expression;
  return {
    statement: ts.SyntaxKind[statement.kind],
    expression: expression === undefined ? "none" : ts.SyntaxKind[expression.kind],
  };
}

function sameList(left, right) {
  if (left.length !== right.length) return false;
  for (let at = 0; at < left.length; at++) {
    if (left[at] !== right[at]) return false;
  }
  return true;
}

// kind "comma"：必须被形状树接管（shapeAst === 1、declined === 0），形状结构文本逐条断言。
// kind "import"：表达式位只进台账；声明头（declaration:true）断言仍走 legacy（shapeAst === 0）。
// kind "control"：参数 / 数组 / 对象内部的逗号，必须仍由形状树接管（shapeAst >= 1）。
const cases = [
  { name: "comma-plain", kind: "comma", source: "a, b;", shapeTexts: [",(a,b)"] },
  { name: "comma-call", kind: "comma", source: "f(), g();", shapeTexts: [",(call(f),call(g))"] },
  { name: "comma-assign", kind: "comma", source: "a = (1, 2);", shapeTexts: ["=(a,(1,2))"] },
  { name: "comma-mixed", kind: "comma", source: "f(a, b), g(c);", shapeTexts: [",(call(f),call(g))"] },
  { name: "comma-add", kind: "comma", source: "(a, b) + c;", shapeTexts: ["+((a,b),c)"] },
  { name: "comma-chain", kind: "comma", source: "a, b, c;", shapeTexts: [",(,(a,b),c)"] },
  { name: "comma-assign-chain", kind: "comma", source: "a = 1, b = 2;", shapeTexts: [",(=(a,1),=(b,2))"] },
  { name: "comma-paren", kind: "comma", source: "(a, b);", shapeTexts: ["(a,b)"] },
  { name: "comma-nested-call", kind: "comma", source: "f((a, b));", shapeTexts: ["call(f)"] },
  { name: "import-meta-url", kind: "import", source: "import.meta.url;" },
  { name: "import-meta", kind: "import", source: "import.meta;" },
  { name: "import-dynamic", kind: "import", source: "import(\"x\");" },
  { name: "import-declaration", kind: "import", source: "import x from \"m\";", declaration: true },
  { name: "control-call-args", kind: "control", source: "f(a, b);" },
  { name: "control-array", kind: "control", source: "[a, b];" },
  { name: "control-object", kind: "control", source: "({a: 1, b: 2});" },
];

const failures = [];
let passed = 0;
const ledger = [];

for (const caseDef of cases) {
  const problems = [];
  let shell = null;
  try {
    shell = runShell(caseDef.source);
  } catch (error) {
    problems.push(`壳路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
  }
  if (shell !== null) {
    let legacyAstLine = null;
    try {
      legacyAstLine = runLegacy(caseDef.source);
    } catch (error) {
      problems.push(`legacy 路径 Parse 抛错：${String(error && error.message ? error.message : error).split("\n")[0]}`);
    }
    if (shell.fallback) problems.push("壳路径触发了文件级 fallback（本组要求不 fallback）");
    if (shell.xml === null) {
      problems.push("壳路径没有产出 XML");
    } else if (legacyAstLine === null) {
      problems.push("legacy 路径没有产出 XML");
    } else {
      const diff = firstDiff(shell.xml, legacyAstLine);
      if (diff !== null) problems.push(`壳 XML != legacy XML：${diff}`);
      for (const tag of ["StatementShape", "StatementOperandShape", "StatementOperatorBody", "StatementShapeAst"]) {
        if (shell.xml.includes(`${tag}  `)) problems.push(`形状泄漏进 XML：<${tag}>`);
      }
    }
    if (caseDef.kind === "comma") {
      if (shell.shapeAst !== 1) {
        problems.push(`逗号表达式未被形状树接管：shapeAst=${shell.shapeAst} declined=${shell.declined} 原因=${JSON.stringify(shell.declineReason)}`);
      }
      if (shell.declined !== 0) {
        problems.push(`逗号表达式不应有拒绝记录：declined=${shell.declined} 原因=${JSON.stringify(shell.declineReason)}`);
      }
      if (!sameList(shell.texts, caseDef.shapeTexts)) {
        problems.push(`逗号结构文本不符：期望 ${JSON.stringify(caseDef.shapeTexts)} 实际 ${JSON.stringify(shell.texts)}`);
      }
    }
    if (caseDef.kind === "import" && caseDef.declaration === true) {
      if (shell.shapeAst !== 0) {
        problems.push(`import 声明头不应归形状树：shapeAst=${shell.shapeAst} texts=${JSON.stringify(shell.texts)}`);
      }
      if (shell.declined !== 0) {
        problems.push(`import 声明头不应有拒绝记录：declined=${shell.declined} 原因=${JSON.stringify(shell.declineReason)}`);
      }
    }
    if (caseDef.kind === "control" && shell.shapeAst < 1) {
      problems.push(`控制组未由形状树接管：shapeAst=${shell.shapeAst} declined=${shell.declined}（参数/数组/对象内部逗号不能被误当序列，也不该整体退回 legacy）`);
    }
    if (shell.declined > 0 && String(shell.declineReason).length === 0) {
      problems.push("有拒绝记录但 LastDeclineReason 为空（诊断信息丢失）");
    }
    const tsKind = tsKindOf(caseDef.source);
    ledger.push({
      name: caseDef.name,
      kind: caseDef.kind,
      source: caseDef.source,
      shapeAst: shell.shapeAst,
      declined: shell.declined,
      reason: shell.declineReason,
      texts: shell.texts,
      tsKind,
      nodes: nodeNames(shell.shape).filter((name) => /Sequence|Meta|Import|Binary|Call|Array|Object|Parenthes/.test(name)),
    });
  }
  if (problems.length === 0) {
    passed++;
    console.log(`PASS  ${caseDef.name.padEnd(20)} kind=${caseDef.kind.padEnd(8)} shapeAst=${shell.shapeAst} declined=${shell.declined} ts=${tsKindOf(caseDef.source).expression} texts=${JSON.stringify(shell.texts)}`);
  } else {
    failures.push({ name: caseDef.name, problems });
    console.log(`FAIL  ${caseDef.name}  ${JSON.stringify(caseDef.source)}`);
    for (const problem of problems) console.log(`        ${problem}`);
  }
}

console.log("");
console.log("[ledger] import 表达式 / 声明头台账（表达式位已由形状树接管，声明头仍走 legacy）：");
for (const row of ledger) {
  if (row.kind !== "import") continue;
  console.log(`  ${row.name}  source=${JSON.stringify(row.source)}  shapeAst=${row.shapeAst} declined=${row.declined}`);
  console.log(`      declineReason=${JSON.stringify(row.reason)}  tsExpression=${row.tsKind.expression}`);
  console.log(`      shapeNodes=${JSON.stringify(row.nodes)}  shapeTexts=${JSON.stringify(row.texts)}`);
}
console.log("");
console.log("[ledger] 逗号表达式（S3n：由形状树接管，AST 仍是 BinaryExpression + CommaToken，与 TS 6.0.3 一致）：");
for (const row of ledger) {
  if (row.kind !== "comma") continue;
  console.log(`  ${row.name}  source=${JSON.stringify(row.source)}  shapeAst=${row.shapeAst} declined=${row.declined} tsExpression=${row.tsKind.expression} texts=${JSON.stringify(row.texts)}`);
}
console.log("");
console.log(`[comma-import-fallback] cases=${cases.length} pass=${passed} fail=${failures.length}（契约：逗号组 shapeAst=1/declined=0/文本逐条；XML==legacy、无 fallback、无形状泄漏；import 声明头仍 legacy；控制组仍被接管）`);
if (failures.length > 0) process.exit(1);
