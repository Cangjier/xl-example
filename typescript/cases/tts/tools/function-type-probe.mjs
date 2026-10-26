// B4h 函数类型参数只读探针：`type F = (x: number) => void` 的 `(` / 名字格 / `=>` / 返回类型。
//
// 断言口径（`_reports/B4h.md` §3）：
//   1. **角色**：类型位置的 `(` 由 `BracketRoleResolver` 判成 `Known / FunctionTypeParams`
//      （表达式 `(a)` / 箭头 `(` 的宿主不是类型别名壳，不受影响）；
//   2. **逐格**：`FunctionTypeShape` 首见于 `(` 那一格；`ParameterShape` 首见于名字关格；
//      `VoidKeywordShape` 首见于 `;` 那一格；**别名收口格（`;` 的下一格）新增 shape 0**；
//   3. **参数表 / 返回类型**：`ParameterShape` 的子节点类名逐个对上（含 `(b?: number)` 的
//      `QuestionTokenShape`），`ReturnType` 的类名对上（`VoidKeywordShape` / `TypePredicateShape`）；
//   4. **不误判**：`type A = (B)` / `(B)[]` / `(B) | C` 的 `(` 仍是 `Fallback`，树与 legacy 逐字节一致；
//   5. **树**：每个片段的增量树与 `ParseCore(..., false)` 的 `ToAstLine(0)` 完全一致。
//
// 只读：不写文件、不改任何默认值。
//
// 用法：node typescript/cases/tts/tools/function-type-probe.mjs
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..", "..", "..");
const BUILD = path.join(root, "build", "ts");
const require = createRequire(import.meta.url);

const { SourceFileRunner } = require(path.join(BUILD, "typescript", "run", "source-file-runner.js"));
const { StatementRouteUtil } = require(path.join(BUILD, "typescript", "tokens", "statements", "statement-route-util.js"));
const { BracketRoleResolver } = require(path.join(BUILD, "typescript", "tokens", "statements", "bracket-role-resolver.js"));
const { ParameterListPossibleShape } = require(path.join(BUILD, "typescript", "tokens", "types", "parameter-list-possible-shape.js"));
const { SourceFileShape } = require(path.join(BUILD, "typescript", "tokens", "files", "source-file-shape.js"));
const { TypescriptTemplate } = require(path.join(BUILD, "typescript", "run", "typescript-template.js"));
const { SyntaxContext } = require(path.join(BUILD, "core", "syntax", "syntax-context.js"));
const { SourceRange } = require(path.join(BUILD, "core", "syntax", "source-range.js"));
const { TextDocument } = require(path.join(BUILD, "typescript", "run", "text-document.js"));

function setIncremental(enabled) {
  StatementRouteUtil.EnableIncrementalShapes = enabled;
  StatementRouteUtil.EnableIncrementalVariableShapes = enabled;
}

function walk(token, visit) {
  if (!token) return;
  visit(token);
  for (const child of token.Data || []) walk(child, visit);
}

function nameKey(token) {
  const name = token.constructor.name;
  if (name === "IdentifierShape") {
    const text = token.EscapedText ?? token.Text ?? "";
    return name + ":" + text;
  }
  return name;
}

// 逐字符驱动（与 tshape-judge 的 trace 同一口径），记录每个「类名（标识符带文本）」首见的 step。
// 返回的 `seen` 里 step 是**字符下标**；EOF 收口格的 step 是 `count`。
function firstSeenSteps(source) {
  setIncremental(true);
  const template = TypescriptTemplate.Create();
  const shape = new SourceFileShape(template);
  const context = new SyntaxContext(shape, 32);
  const document = new TextDocument(source, "probe.ts");
  SourceRange.CurrentDocument = document;
  const count = document.GetCount();
  const seen = new Map();
  try {
    for (let index = 0; index < count; index++) {
      context.ProcessRange(context.Root, new SourceRange(document, index, index + 1), index);
      walk(shape, (token) => {
        const key = nameKey(token);
        if (!seen.has(key)) seen.set(key, index);
      });
    }
    context.Index = count;
    context.Root.SignOut(count);
    context.Root.Process(context, new SourceRange(document, count, count), count);
    if (typeof context.DrainMessages === "function") context.DrainMessages();
    walk(shape, (token) => {
      const key = nameKey(token);
      if (!seen.has(key)) seen.set(key, count);
    });
  } finally {
    setIncremental(false);
  }
  return { seen, shape };
}

function paramsOf(rootShape) {
  const params = [];
  walk(rootShape, (token) => {
    if (token.constructor.name === "ParameterShape") params.push(token);
  });
  return params.map((parameter) => parameter.Data
    .filter((unit) => !unit.IsTriviaToken)
    .map((unit) => unit.constructor.name));
}

function returnTypesOf(rootShape) {
  const returns = [];
  walk(rootShape, (token) => {
    if (token.constructor.name === "FunctionTypeShape" && token.ReturnType) {
      returns.push(token.ReturnType.constructor.name);
    }
  });
  return returns;
}

function legacyTree(source, file) {
  setIncremental(false);
  try {
    return SourceFileRunner.ParseCore(source, file, false);
  } finally {
    setIncremental(true);
  }
}

const problems = [];
function check(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) problems.push(`${label}: ${a} != ${e}`);
}

// ---- 1. 角色 + 参数 + 返回类型 + 树一致 ----
const CASES = [
  {
    label: "F",
    source: "type F = (x: number) => void;",
    params: [["IdentifierShape", "NumberKeywordShape"]],
    returns: ["VoidKeywordShape"],
    role: "Known/FunctionTypeParams",
  },
  {
    label: "G",
    source: "type G = (a: string, b?: number) => a is string;",
    params: [
      ["IdentifierShape", "StringKeywordShape"],
      ["IdentifierShape", "QuestionTokenShape", "NumberKeywordShape"],
    ],
    returns: ["TypePredicateShape"],
    role: "Known/FunctionTypeParams",
  },
  {
    label: "H",
    source: "type H = <T>(x: T) => T;",
    params: [["IdentifierShape", "TypeReferenceShape"]],
    returns: ["TypeReferenceShape"],
    role: "Known/FunctionTypeParams",
  },
  {
    label: "empty",
    source: "type E = () => void;",
    params: [],
    returns: ["VoidKeywordShape"],
    role: "Known/FunctionTypeParams",
  },
  {
    label: "array-param",
    source: "type A = (a: B[]) => C;",
    params: [["IdentifierShape", "ArrayTypeShape"]],
    returns: ["TypeReferenceShape"],
    role: "Known/FunctionTypeParams",
  },
  {
    label: "union-return",
    source: "type U = (a: A) => B | C;",
    params: [["IdentifierShape", "TypeReferenceShape"]],
    returns: ["UnionTypeShape"],
    role: "Known/FunctionTypeParams",
  },
];

const roleLog = [];
const originalResolve = BracketRoleResolver.Resolve;
BracketRoleResolver.Resolve = function (host, bracket, context) {
  const result = originalResolve.call(BracketRoleResolver, host, bracket, context);
  const state = result.IsKnown() ? "Known" : (result.IsDeferred() ? "Deferred" : "Fallback");
  roleLog.push(state + "/" + (result.Role || "-"));
  return result;
};

let treeOk = true;
for (const item of CASES) {
  roleLog.length = 0;
  let tree;
  let fallback = false;
  try {
    tree = SourceFileRunner.Parse(item.source, item.label + ".ts");
    fallback = StatementRouteUtil.LastFileFallback === true;
  } catch (error) {
    problems.push(`${item.label}: parse-throw ${String(error && (error.Message || error.message))}`);
    treeOk = false;
    continue;
  }
  if (fallback) problems.push(`${item.label}: fileFallback`);
  check(`${item.label} role`, roleLog[0] || "-", item.role);
  check(`${item.label} params`, paramsOf(tree), item.params);
  check(`${item.label} returns`, returnTypesOf(tree), item.returns);
  // 与 legacy 同一份树的文本比对：所有形状都收口之后，增量树不该留下任何 basic token。
  const legacy = legacyTree(item.source, item.label + "-legacy.ts");
  if (tree.ToAstLine(0) !== legacy.ToAstLine(0)) {
    problems.push(`${item.label}: tree differs from legacy`);
    treeOk = false;
  }
}

// ---- 2. 逐格：F 的 `(` / 名字格 / `;` / 收口格 ----
{
  const source = "type F = (x: number) => void;";
  const { seen } = firstSeenSteps(source);
  const parenAt = source.indexOf("(");
  const colonAt = source.indexOf(":");
  const semiAt = source.indexOf(";");
  const closeStep = semiAt + 1; // `;` 关闭那一格：别名换成正品，新增 shape 必须是 0。
  check("F fn first-seen step", seen.get("FunctionTypeShape"), parenAt);
  check("F parameter first-seen step", seen.get("ParameterShape"), colonAt);
  check("F identifier(x) first-seen step", seen.get("IdentifierShape:x"), colonAt);
  check("F void first-seen step", seen.get("VoidKeywordShape"), semiAt);
  for (const [name, step] of seen) {
    if (step === closeStep && name !== "TypeAliasDeclarationShape") {
      problems.push(`F close-cell built a new ${name}`);
    }
  }
}

// ---- 3. 不误判：括号类型仍是 Fallback，且树一致 ----
{
  const cases = ["type A = (B);", "type C = (B)[];", "type D = (B) | C;"];
  for (const source of cases) {
    roleLog.length = 0;
    const tree = SourceFileRunner.Parse(source, "neg.ts");
    check(`${source} role`, roleLog[0] || "-", "Fallback/-");
    if (tree.ToAstLine(0) !== legacyTree(source, "neg-legacy.ts").ToAstLine(0)) {
      problems.push(`${source}: tree differs from legacy`);
    }
  }
}

BracketRoleResolver.Resolve = originalResolve;

console.log("function-type-probe");
console.log("  FunctionTypeMountCount=" + ParameterListPossibleShape.FunctionTypeMountCount
  + " tree=" + (treeOk ? "same-as-legacy" : "DIFFERS"));
if (problems.length > 0) {
  for (const problem of problems) console.log("  PROBLEM " + problem);
  console.log("FUNCTION-TYPE-PROBE FAIL");
  process.exitCode = 1;
} else {
  console.log("FUNCTION-TYPE-PROBE PASS");
}
