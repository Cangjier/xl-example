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
//   // xl:known-gap 一句话根因                     这条用例是**已知缺口**（见下）
//   // xl:ts-invalid                              故意写非法 TS（默认必须是合法 TS）
//
// **`xl:known-gap`**（第 670 轮）：这条用例**故意留着一个已知缺口**——它照样进语料、
// 照样被 `cases:tsast` 逐节点对拍，但它的差额**不算进那八项判据**（否则门永远是红的，
// 红里就分不出「新坏了」与「本来就还没做」）。改由 `cases:tsast` 那一趟单独盯着：
// **它必须真的还对不上**（收掉了就要来删这条指令），原因写在指令后面。
// 缺口清单因此长在语料里，与用例同生共死，不再只活在 `tmp/` 的探针池里。
//
// 体检项：文件名规范、area 目录合法、id 全局唯一、指令语法正确、标签在标签表内、
//         没有意外的 BOM（`xl:bom` 显式声明时除外）、TS 语法合法（故意非法的除外）。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readCaseFile } from "../cases/case-file.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));

/**
 * 功能域（**旧的 area 名没变**，变的是它在目录树里的位置）。
 *
 * 整体布局（第 685 轮起的口径，见 `tests/cases/README.md`）：
 *
 * ```
 * tests/cases/<类别>/<功能域>/<序号>-<名字>.ts     类别 = token / exec / runtime / stdlib / e2e
 * ```
 *
 * 「功能域」就是原来 `tests/parse/cases/<area>/`（第 685 轮搬到 `tests/cases/token/<area>/`）里那个 area——
 * 名字与含义一字未改，只把它从「语料根」挪成「token 类别下的一层」，
 * 于是五类语料在目录树上终于同一形状。
 */
export const DOMAINS = ["declarations", "statements", "expressions", "types", "modules", "lexical", "ambiguous"];

/** 旧的导出名，仍然指向同一份名单（`tags.mjs` / 调用方还在用 `AREAS`）。 */
export const AREAS = DOMAINS;

/**
 * `xl:expect` / `xl:absent` 里允许出现的**产物标签名**（`ToXmlString` 取的是类名；
 * 写错标签会造出假缺口）。
 *
 * 口径是「**这个名字真的可能出现在产物 XML 里**」，由 `tests/parse/tags.mjs` 的标签表体检
 * 机械地把关：表里每个名字都必须有至少一条用例真的产出过它。反过来，漏一个真标签的代价
 * 同样是假的：`IfBody` 一直没在表里，于是**块体那一族用例只能写 `xl:expect IfStatement`**，
 * 而块体投出来的是 `IfBody`——12 条用例的期望因此一直是错的却没人看得见（第 633 轮补上）。
 *
 * **永远不进产物的名字走 `GHOST_TAGS`**（下一张表）：它们只能出现在 `xl:absent` 里。
 */
export const TAGS = new Set([
  "Root", "Statement", "Let", "Field",
  "SymbolToken", "Identifier", "Keyword", "String", "ConstString", "InterpolationString",
  "RegexToken",
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
  "SemicolonClassElement",
  "Function", "FunctionBody", "MethodDeclaration", "MethodBody", "ReturnType", "Decorator", "Label", "Import", "Export",
  "IfSet", "IfSegment", "IfCondition", "IfStatement", "IfBody",
  "Switch", "SwitchCompare", "SwitchSegment", "SwitchCase", "SwitchStatement",
  "Try", "TryBody", "CatchDefine", "CatchBody", "FinallyBody",
  "For", "ForInitial", "ForCompare", "ForNext", "ForBody",
  "Foreach", "ForeachDefine", "ForeachEnumable", "ForeachBody",
  "While", "WhileCompare", "WhileBody", "DoWhile",
  "ObjectLiteral", "ArrayLiteral",
]);

/**
 * **永远不进产物的名字**——它们只能写进 `xl:absent`（写进 `xl:expect` 是一条永远红的假缺口）。
 * 三类：
 *
 * - **抽象基类**：`ClassMember` 自己不进 `Data`，进树的是子类（标签取子类类名）；
 * - **自我摘除的向导**：`VerbatimQuoteGuide` / `InterpolationGuide` / `InterpolationExitGuide` /
 *   `RawQuoteExitGuide` / `StringGuide` 的 `Navigate` 第一件事就是 `RemoveSelf`——
 *   `xl:absent InterpolationGuide` 正是「向导没有留在产物里」这条事实的判据；
 * - **只属于 TS 形状投影的 kind**：`MetaProperty` / `TemplateHead` / `TemplateMiddle` /
 *   `TemplateTail` / `AssertClause` / `AssertEntry` 是投影**造**出来的节点
 *   （`print-ast-common.xl.md` / `import.xl.md`），没有对应的产物类。
 *
 * 两个方向都由 `tests/parse/tags.mjs` 盯着：`TAGS` 里每个名字都要被至少一条用例产出 ✓，
 * `GHOST_TAGS` 里每个名字都要在**全语料**里一次都不出现 ✓。
 */
export const GHOST_TAGS = new Set([
  "ClassMember",
  "VerbatimQuoteGuide", "InterpolationGuide", "InterpolationExitGuide", "RawQuoteExitGuide", "StringGuide",
  "MetaProperty", "TemplateHead", "TemplateMiddle", "TemplateTail", "AssertClause", "AssertEntry",
]);

export const CASES_DIR = path.join(root, "tests", "cases", "token");

/** 解析一条用例的指令与正文（读文件这一层交给共用的 `case-file.mjs`）。 */
export function readCase(filePath) {
  const parsed = readCaseFile(filePath, "token");
  const directives = parsed.directives;
  const problems = [...parsed.problems];
  // BOM 不是解析器的朋友：本项目的库路径不剥 BOM，会污染第一个 token。
  // 所以用例文件默认不许有 BOM，只有显式写 xl:bom 的「BOM 用例」才带。
  if (parsed.source.charCodeAt(0) === 0xfeff && !directives.bom) {
    problems.push("文件带 BOM；解析器不剥 BOM，第一个 token 会被污染。要测 BOM 请显式写 // xl:bom");
  }
  return { source: parsed.source, body: parsed.body, directives, problems };
}

/** 列出全部用例：{ id, category, area, file, source, body, directives }。 */
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
      const id = `token/${area}/${name.replace(/\.tsx?$/, "")}`;
      const parsed = readCase(file);
      const problems = [...parsed.problems];
      if (!AREAS.includes(area)) problems.push(`area 不在 ${AREAS.join(" / ")} 里`);
      for (const [directive, raws] of [["expect", parsed.directives.expect], ["absent", parsed.directives.absent]]) {
        for (const raw of raws) {
          // `Tag:2` 是带个数的期望（旧 `run.mjs` 的写法），标签表里查的是冒号前那一段。
          const separator = raw.indexOf(":");
          const tag = separator === -1 ? raw : raw.slice(0, separator);
          if (!TAGS.has(tag) && !GHOST_TAGS.has(tag)) {
            problems.push(`xl:${directive} 里的标签 ${raw} 不在标签表里（写错标签会造出假缺口）`);
          }
          // **幽灵标签只能进 `absent`**：它们在产物里永远不会出现，
          // 写进 `expect` 就是一条永远修不好的假缺口。
          if (directive === "expect" && GHOST_TAGS.has(tag)) {
            problems.push(`xl:expect 里的标签 ${raw} 永远不进产物（自我摘除的向导 / 抽象基类 / 投影专有的 kind），只能写进 xl:absent`);
          }
          if (separator !== -1 && Number.isFinite(Number(raw.slice(separator + 1))) === false) {
            problems.push(`xl:${directive} 里的个数写法 ${raw} 不合法（要写成 Tag:2）`);
          }
        }
      }
      if (seen.has(id)) problems.push(`id 与 ${seen.get(id)} 重复`);
      seen.set(id, file);
      cases.push({ id, category: "token", area, domain: area, file, name, ...parsed, problems });
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
