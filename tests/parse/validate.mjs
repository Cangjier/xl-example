// 用例体检：只检查「用例本身是否合格」，不评判解析器。
//
//   node tests/parse/validate.mjs            检查全部用例
//   node tests/parse/validate.mjs types      只检查某个 area
//
// 每条用例是一个 `.ts` 文件，开头可以带下列指令注释（全可选）：
//
//   // xl:expect Interface,InterfaceBody,Field   产物里必须出现的节点标签
//   // xl:absent TernaryOperator                 产物里不允许出现的节点标签
//   // xl:note 一句话说明这条用例在测什么
//   // xl:ts-invalid                              故意写非法 TS（默认必须是合法 TS）
//
// 体检项：文件名规范、area 目录合法、id 全局唯一、指令语法正确、标签在标签表内、
//         没有意外的 BOM（`xl:bom` 显式声明时除外）、TS 语法合法（故意非法的除外）。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));

export const AREAS = ["declarations", "statements", "expressions", "types", "modules", "lexical", "ambiguous"];

/**
 * 允许出现在 `xl:expect` / `xl:absent` 里的标签（**产物标签名**——`ToXmlString` 取的是类名；
 * 写错标签会造出假缺口）。
 *
 * 第 200 轮起测试集只留 AST 相关：`xl:expect` 是**用例自己带的期望值**（原 `cases:run` 用），
 * 现在没有尺子再读它们了，但用例文件里的指令仍然照旧校验——它们是用例的说明，也是下一轮
 * 想重新加回一把「标签级」尺子时的现成语料。
 */
export const TAGS = new Set([
  "Root", "Statement", "Let", "Field",
  "SymbolToken", "Identifier", "Keyword", "String", "ConstString", "InterpolationString",
  "VerbatimQuoteGuide", "InterpolationGuide", "InterpolationExitGuide", "RawQuoteExitGuide", "RegexToken",
  "LineAnnotation", "AreaAnnotation", "PreprocessorDirectives", "Bracket", "LineWrap",
  "GenericType", "Method", "Signature", "TypeDefine", "TypeAssign", "As", "Satisfies", "LogicalOperator", "NullConditionalOperator", "NotNull",
  "PropertyAccess",
  "FunctionType", "ConditionalType", "UnionType", "IntersectionType", "MappedType", "StaticBlock", "NamespaceExport",
  "ArrayType", "TupleType", "IndexedAccessType", "TypeOperator", "TypeQuery", "LiteralType",
  "ImportType", "TypeParameter", "InferType", "TypePredicate",
  "EnumMember", "OptionalType", "RestType", "NamedTupleMember",
  "IndexSignature", "ParenthesizedType", "HeritageClause", "ExpressionWithTypeArguments", "BindingElement",
  "BinaryOperator", "UnaryOperator", "Spread",
  "TernaryOperator", "TernaryOperatorCondition", "TernaryOperatorTrueStatement", "TernaryOperatorFalseStatement",
  "Lamda", "LamdaParameters", "Parameter", "LamdaBody",
  "New", "NewType", "NewArguments",
  "Class", "ClassBody", "Interface", "InterfaceBody", "Namespace", "NamespaceBody", "TypeLiteral", "TypeLiteralBody", "Enum", "EnumBody",
  "Function", "FunctionBody", "MethodDeclaration", "MethodBody", "ReturnType", "Decorator", "Label", "Import", "Export",
  "IfSet", "IfSegment", "IfCondition", "IfStatement",
  "Switch", "SwitchCompare", "SwitchSegment", "SwitchCase", "SwitchStatement",
  "Try", "TryBody", "CatchDefine", "CatchBody", "FinallyBody",
  "For", "ForInitial", "ForCompare", "ForNext", "ForBody",
  "Foreach", "ForeachDefine", "ForeachEnumable", "ForeachBody",
  "While", "WhileCompare", "WhileBody", "DoWhile",
  "ObjectLiteral", "ArrayLiteral",
]);

export const CASES_DIR = path.join(here, "cases");

/** 解析一条用例的指令与正文。 */
export function readCase(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const directives = { expect: [], absent: [], note: "", tsInvalid: false, bom: false };
  const problems = [];
  for (const line of source.split("\n")) {
    const m = /^\/\/\s*xl:(\S+)\s*(.*)$/.exec(line);
    if (m === null) continue;
    const [, key, value] = m;
    if (key === "expect") directives.expect.push(...split(value));
    else if (key === "absent") directives.absent.push(...split(value));
    else if (key === "note") directives.note = value.trim();
    else if (key === "ts-invalid") directives.tsInvalid = true;
    else if (key === "bom") directives.bom = true;
    else problems.push(`未知指令 xl:${key}`);
  }
  // BOM 不是解析器的朋友：本项目的库路径不剥 BOM，会污染第一个 token。
  // 所以用例文件默认不许有 BOM，只有显式写 xl:bom 的「BOM 用例」才带。
  if (source.charCodeAt(0) === 0xfeff && !directives.bom) {
    problems.push("文件带 BOM；解析器不剥 BOM，第一个 token 会被污染。要测 BOM 请显式写 // xl:bom");
  }
  return { source, directives, problems };
}

function split(value) {
  return value.split(",").map((s) => s.trim()).filter((s) => s !== "");
}

/** 列出全部用例：{ id, area, file, source, directives }。 */
export function listCases(filterArea) {
  const cases = [];
  const seen = new Map();
  if (!fs.existsSync(CASES_DIR)) return cases;
  for (const area of fs.readdirSync(CASES_DIR).sort()) {
    const areaDir = path.join(CASES_DIR, area);
    if (!fs.statSync(areaDir).isDirectory()) continue;
    if (filterArea && area !== filterArea) continue;
    for (const name of fs.readdirSync(areaDir).sort()) {
      if (!name.endsWith(".ts") && !name.endsWith(".tsx")) continue;
      const file = path.join(areaDir, name);
      const id = `${area}/${name.replace(/\.tsx?$/, "")}`;
      const parsed = readCase(file);
      const problems = [...parsed.problems];
      if (!AREAS.includes(area)) problems.push(`area 不在 ${AREAS.join(" / ")} 里`);
      for (const raw of [...parsed.directives.expect, ...parsed.directives.absent]) {
        // `Tag:2` 是带个数的期望（旧 `run.mjs` 的写法），标签表里查的是冒号前那一段。
        const separator = raw.indexOf(":");
        const tag = separator === -1 ? raw : raw.slice(0, separator);
        if (!TAGS.has(tag)) problems.push(`xl:expect/absent 里的标签 ${raw} 不在标签表里（写错标签会造出假缺口）`);
        if (separator !== -1 && Number.isFinite(Number(raw.slice(separator + 1))) === false) {
          problems.push(`xl:expect 里的个数写法 ${raw} 不合法（要写成 Tag:2）`);
        }
      }
      if (seen.has(id)) problems.push(`id 与 ${seen.get(id)} 重复`);
      seen.set(id, file);
      const title = parsed.source.split("\n").find((l) => /^\/\/\s*xl:note/.test(l));
      cases.push({ id, area, file, name, title, ...parsed, problems });
    }
  }
  return cases;
}

/** TS 语法是否合法（用 TypeScript 自带 parser 判）。`.tsx` 走 TSX 语法。 */
export function tsProblems(source, name) {
  const kind = name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, false, kind);
  return (sf.parseDiagnostics || []).map((d) =>
    ts.flattenDiagnosticMessageText(d.messageText, " ").split("\n")[0],
  );
}

function main() {
  const filterArea = process.argv[2];
  const cases = listCases(filterArea);
  let bad = 0;
  for (const c of cases) {
    const problems = [...c.problems];
    if (!c.directives.tsInvalid) {
      for (const p of tsProblems(c.source, c.name)) problems.push("不是合法 TS：" + p);
    }
    if (problems.length === 0) continue;
    bad++;
    console.log(`BAD  ${c.id}`);
    for (const p of problems) console.log(`       ${p}`);
  }
  console.log(`\n${cases.length} 条用例，${bad} 条不合格`);
  process.exitCode = bad === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
