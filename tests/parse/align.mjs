// 对齐探针：用**源码区间重叠**把产物单元与 TypeScript 自带的 AST 节点对齐，双向反查
//
//   1) 产物里有某个标签，源码里没有对应构造 —— 标签被别的形状占用（形状换错了语义）
//   2) 源码里有某个构造，产物里没有对应标签 —— 缺节点
//
//   node tests/parse/align.mjs             真实语料 + 用例语料
//   node tests/parse/align.mjs cases       只用例语料
//   node tests/parse/align.mjs real        只用真实语料（node_modules / dist / samples）
//   node tests/parse/align.mjs --top 10    每类最多列 10 个样本
//   node tests/parse/align.mjs --all       连口径内的（已登记的差异）也打印
//
// 它是**探针**不是判据：退出码恒为 0，只打印可疑项。
//
// 为什么需要它：八把尺子比的是**计数 / 内容 / 括号归属 / 语句边界 / 空节点**。
// `const f = (a) => { return a }` 的块体被收成 `TypeLiteral` 时，这五样全都正常
// （节点都在、名字都在、括号归属不变、边界不变），差分账上只表现为几处「真多」。
// 第 53 轮靠它抓到六处真缺口，其中四处是这条路径独有的：
//   - 箭头函数块体被收成类型字面量（里面的语句退化成 Field / MethodDeclaration）
//   - 多形参箭头只产出一个 LamdaParameter（形参表里的逗号被折成 BinaryOperator）
//   - 复合赋值展开的克隆体是空壳（BinaryOperator / NotNull / Spread / UnaryOperator 的 Clone 丢子单元）
//   - 变量声明的多声明符逗号被折成逗号运算符；`yield*` 被折成乘法；`satisfies` 没有节点
//
// 口径（**不是缺口**，已在 `gap-dashboard.mjs` 的「有意排除」里登记）：
// 一个标签被允许对应多种 TS 构造（`ArrayLiteral` 同时是数组字面量与元组类型），
// 以及少数位置两边读法不同（构造签名的 `new`、映射类型按 `Field` 收…）。
// 这些都在下面的 `ALLOWED_EXTRA` 里逐条写明，`--all` 才能看到。

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listCases } from "./validate.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const ts = require(path.join(root, "node_modules", "typescript"));
const { Template } = require(path.join(root, "build", "ts", "core", "syntax", "templates", "template.js"));
const { TextDocument } = require(path.join(root, "build", "ts", "typescript", "text-document.js"));
const { TextContext } = require(path.join(root, "build", "ts", "typescript", "text-context.js"));

/// 产物标签 → 它**本该**由哪些 TS 构造产出（`SyntaxKind` 的名字）。
const REVERSE = {
  BinaryOperator: ["BinaryExpression"],
  LogicalOperator: ["BinaryExpression"],
  UnaryOperator: ["PrefixUnaryExpression", "PostfixUnaryExpression", "TypeOfExpression", "DeleteExpression", "VoidExpression", "AwaitExpression", "YieldExpression"],
  TernaryOperator: ["ConditionalExpression"],
  NotNull: ["NonNullExpression"],
  Spread: ["SpreadElement", "SpreadAssignment"],
  Let: ["VariableDeclaration"],
  // **`MappedType` 从这里删掉**（第 67 轮）：映射类型有自己的标签
  // （`MappedType: ["MappedType"]`），留着别名等于给「映射类型没认出来」发免罪符。
  // 删掉之后实测「缺节点」仍是 0 —— 说明这一层是真的成形了，不是靠别名遮过去的。
  Field: ["PropertyDeclaration", "PropertySignature"],
  IndexSignature: ["IndexSignature"],
  ParenthesizedType: ["ParenthesizedType"],
  Parameter: ["Parameter"],
  HeritageClause: ["HeritageClause"],
  ExpressionWithTypeArguments: ["ExpressionWithTypeArguments"],
  BindingElement: ["BindingElement"],
  // 形参：**箭头函数**那一支本来就有 `Parameter` 节点（`lamda.xl.md` 收进 `LamdaParameters`，
  // 第 66 轮第六批把标签从 `LamdaParameter` 统一成 `Parameter`）。
  // 函数 / 方法 / 签名 / 构造签名的形参表**暂时**仍是括号里的散单元——试过统一（见 README
  // 「已知缺口」第 66 轮第六批那一节）：`cases:boundaries` 的 XML 定位器会因此漂一格，
  // 在 `@types/node/url.d.ts` 造出一处**假阳性**（它报某个 `<Parameter>` 横跨两条重载，
  // 而产物树与 XML 里那个形参的区间都是对的）。定位器修好之前先按位置登记，不遮蔽太久。
  MethodDeclaration: ["MethodDeclaration", "MethodSignature", "GetAccessor", "SetAccessor", "Constructor"],
  Signature: ["CallSignature", "ConstructSignature"],
  New: ["NewExpression", "ConstructSignature", "NewExpression"],
  Lamda: ["ArrowFunction", "FunctionExpression"],
  FunctionType: ["FunctionType", "ConstructorType"],
  ConditionalType: ["ConditionalType"],
  MappedType: ["MappedType"],
  UnionType: ["UnionType"],
  IntersectionType: ["IntersectionType"],
  ArrayType: ["ArrayType"],
  TupleType: ["TupleType"],
  IndexedAccessType: ["IndexedAccessType"],
  LiteralType: ["LiteralType"],
  TypeParameter: ["TypeParameter"],
  InferType: ["InferType"],
  TypePredicate: ["TypePredicate"],
  EnumMember: ["EnumMember"],
  OptionalType: ["OptionalType"],
  RestType: ["RestType"],
  NamedTupleMember: ["NamedTupleMember"],
  TypeOperator: ["TypeOperator"],
  TypeQuery: ["TypeQuery"],
  // **`ImportType` / `TypeQuery` 从这里删掉**（第 67 轮）：两者都有自己的标签了。
  // 删掉之后 `Method in ImportType`（175 处）会露出来——那是 `<ImportType>` 里
  // **嵌着**的那个 `import("m")` 调用单元（TS 那边 `ImportType` 的实参是 `LiteralType`，
  // 不产调用节点）。它是有意的形状，按位置登记进 `ALLOWED_EXTRA`，
  // 而不是靠这张宽别名表悄悄认领——登记看得见，别名看不见。
  Method: ["CallExpression", "ExternalModuleReference"],
  ImportType: ["ImportType"],
  RegexToken: ["RegularExpressionLiteral"],
  NamespaceBody: ["ModuleBlock"],
  StaticBlock: ["ClassStaticBlockDeclaration"],
  Class: ["ClassDeclaration", "ClassExpression"],
  Interface: ["InterfaceDeclaration"],
  Enum: ["EnumDeclaration"],
  Function: ["FunctionDeclaration", "FunctionExpression"],
  Namespace: ["ModuleDeclaration"],
  TypeAssign: ["TypeAliasDeclaration"],
  TypeLiteral: ["TypeLiteral"],
  ObjectLiteral: ["ObjectLiteralExpression", "ObjectBindingPattern"],
  // **`TupleType` 已经从这里删掉**（第 67 轮）：元组类型早就有自己的标签了，
  // 留着这条别名等于给「元组没成形」发免罪符——它真的遮住过一个真缺口：
  // **空元组** `[]`（`next(...args: [] | [TNext])` 那种）因为
  // `TypeBracketReorganization.Previous` 里「空括号必须左边有操作数」那一条而永远不成形，
  // 产物是裸括号；而这条别名让「产物里的 `ArrayLiteral`」把 TS 的 `TupleType` 认领走了，
  // 于是 `cases:align` 一直报「缺节点 0」。删掉之后当场报出 13 处（全部已修）。
  // 教训与 `kindName()` 那两条同类：**宽口径的登记本身就是尺子的盲区**。
  ArrayLiteral: ["ArrayLiteralExpression", "ComputedPropertyName", "IndexSignature", "MappedType", "ArrayBindingPattern"],
  Import: ["ImportDeclaration", "ImportEqualsDeclaration"],
  Export: ["ExportDeclaration", "ExportAssignment"],
  Decorator: ["Decorator"],
  Label: ["LabeledStatement"],
  // **`SatisfiesExpression` 从这里删掉**（第 67 轮）：`satisfies` 有自己的标签
  // （`Satisfies: ["SatisfiesExpression"]`）。删掉之后实测「缺节点」仍是 0。
  As: ["AsExpression"],
  Satisfies: ["SatisfiesExpression"],
  NamespaceExport: ["NamespaceExportDeclaration"],
};

/// 反过来：TS 构造 → 允许承接它的产物标签（一个构造可以被多个标签承接，
/// 只要**任意一个**在位置上对得上就不算缺节点）。
const TAGS_BY_KIND = new Map();
for (const [tag, kinds] of Object.entries(REVERSE)) {
  for (const kind of kinds) {
    if (!TAGS_BY_KIND.has(kind)) TAGS_BY_KIND.set(kind, []);
    if (!TAGS_BY_KIND.get(kind).includes(tag)) TAGS_BY_KIND.get(kind).push(tag);
  }
}

/// 显式登记的口径差异：`标签 in 父标签` → 理由。命中的条目不算可疑项（`--all` 才打印）。
const ALLOWED_EXTRA = {
  "New in Signature": "构造签名 `new (a: number): I`：`new` 与形参表、返回类型收在一个 New 里，外面套 Signature",
  "Method in ImportType": "类型位的 `import(\"m\")`：外层已经是 `ImportType`（与 TS 一对一），里面那个 `Method name=\"import\"` 是**动态导入调用的形状**（TS 那边 `ImportType` 的实参是 `LiteralType`，不产调用节点）。内容与位置都对，只是多一层调用壳——第 67 轮把 `Method` 的宽别名表收干净之后按位置登记",
  "MethodDeclaration in ClassBody": "`constructor(…)`：TS 的 SyntaxKind 叫 Constructor，本工程按方法声明收",
  "ArrayLiteral in Field": "计算属性名 `[expr]: T` 与索引签名 `[k: string]: T` 用同一对 `[ ]` 括号",
  "ArrayLiteral in MethodDeclaration": "计算属性名作方法名（`[Symbol.iterator]() {}`）",
  "ArrayLiteral in TypeDefine": "数组/元组类型的 `[ ]`（`T[]`、`readonly [A, B]`）",
  "ArrayLiteral in GenericType": "类型实参里的元组类型",
  // 样本实测是**值位的下标访问**（`a[cursor]` / `a[i]`）——本工程没有「下标访问」标签，
  // `JsonArrayReorganization` 把那个 `[ ]` 收成了 `ArrayLiteral`。文字原来写成「元组类型」，与样本不符。
  "ArrayLiteral in Statement": "值位下标访问的方括号被收成 `ArrayLiteral`（本工程没有 ElementAccessExpression 标签）；另有个别语句层的元组类型",
  "ArrayLiteral in Bracket": "同上，只是父单元是块括号：`{ x => x` 换行 `[1, 2, 3]` 换行 `a += 1 }` 里那个 `[1, 2, 3]`（TS 读成 `x[1, 2, 3]` 的元素访问，本工程按数组字面量收）。这一格是孤儿方括号的兜底形状（见 `json/array-literal.xl.md` 的 `Process` 早退），单列一条是为了不让它混进 `Statement` 那一类",
  // 解构形参的两种父单元都要登记：**普通形参**走第 66 轮第六批统一出来的 `Parameter`
  // （箭头那一支），**解构形参**（`([a, b]) => …` / `({ a, b }) => …`）仍在形参括号里，
  // 父单元是 `Bracket` ✓。
  "ArrayLiteral in ObjectLiteral": "对象字面量的计算键 `{ [k]: 1 }`",
  "Field in TypeLiteralBody": "映射类型 `{ [K in keyof T]: … }` 按 Field 收",
  "Field in InterfaceBody": "索引签名 `[key: string]: number` 按 Field 收",
  "Field in ClassBody": "类里的索引签名",
  "Field in TypeDefine": "映射类型出现在类型标注位置",
  "Field in Statement": "映射类型 / ASI 后的对象字面量键（口径不同）",
  "TypeLiteral in TypeAssign": "类型别名右值的对象类型与映射类型",
  "TypeLiteral in TypeDefine": "类型标注位置的对象类型",
  "TypeLiteral in Statement": "该处 `{ … }` 是类型（条件类型分支等）",
  "TypeLiteral in GenericType": "类型实参里的对象类型",
  "BinaryOperator in ArrayLiteral": "映射类型里的 `in` / 联合类型里的 `|`（按二元运算收）",
  "BinaryOperator in Statement": "`<` / `>` 与泛型实参同形（`a < b > c`），差分口径里已排除；联合类型同理",
  "BinaryOperator in LamdaParameter": "形参默认值里的逗号表达式（括号内）",
  "BinaryOperator in TypeDefine": "类型位的 `|` / `&` 联合与交叉",
  "UnaryOperator in Bracket": "1 处已知残渣：`iterators.d.ts` 的 `any[][typeof Symbol.iterator]`——那个 `[` 前面紧挨着另一个收好的 `[]` 括号，`DecideBracketContext` 对它判「值位」（前一个是收好的括号），所以类型查询没被认出来；内容没丢",
  "UnaryOperator in GenericType": "`typeof X` 作类型实参（TypeQuery，第 57 轮已清零）",
  "UnaryOperator in Statement": "类型位的 `-readonly` / `typeof X`（映射类型修饰符）",
  "TernaryOperator in Statement": "条件类型 `T extends U ? A : B` 与三元表达式同形",
  "Lamda in TypeDefine": "函数类型在极少数形状里仍按 Lamda 收（第 54 轮已从 17 处降到 0 处：函数类型现在有自己的 `FunctionType` 标签）",
  "Lamda in GenericType": "函数类型作类型实参（同上，已清零）",
  "ArrayLiteral in MethodDeclaration2": "（占位，不会命中）",
  "ObjectLiteral in Statement": "ASI 后 `return` 换行跟对象字面量 / switch case 块（口径不同）",
  "ObjectLiteral in Import": "导入列表 `{ a, b }` 被收成 ObjectLiteral 再读出 imported",
  "Signature in Field": "字段的箭头函数类型 `f = (a: number): void => {}`",
  "Signature in TypeLiteralBody": "类型字面量里的调用 / 构造签名",
  "Signature in InterfaceBody": "接口里的调用 / 构造签名",
  "MethodDeclaration in Statement": "箭头函数体里的调用（旧口径：块体被当成类型字面量）",
  "Export in Statement": "`export default` / `export =` 只收前缀两个词，表达式留在外面",
  "As in ArrayLiteral": "映射类型的 `as` 子句（键重映射）",
  "Satisfies in ArrayLiteral": "映射类型里的 satisfies（罕见形状）",
  "ArrayLiteral in TypeAssign": "类型别名的元组类型",
  "MethodDeclaration in ClassBody2": "（占位，不会命中）",
  "Class in Statement": "`export default class {}` 等声明位",
  "Function in Statement": "`export default function () {}` 等声明位",
  "Spread in TupleType": "元组类型里的变长元素 `readonly [...A, ...B]`（TS 是 RestType / NamedTupleMember）。第 66 轮之前这个键叫 `Spread in ArrayLiteral`——那时元组类型被收成 ArrayLiteral；现在元组有了自己的节点，父亲跟着改名，口径不变",
  "MethodDeclaration in TypeDefine": "类型标注里的构造签名形状（`abstract new(...args: any) => any ? F : …`）",
  "BinaryOperator in UnionType": "映射类型里的 `in`（`[K in \"a\"]`）按二元运算收——与 `BinaryOperator in ArrayLiteral` 同一口径",
  "BinaryOperator in IntersectionType": "同上（映射类型的 `in` 落在交叉类型里）",
  "ArrayLiteral in UnionType": "元组类型 `[T]` 用 ArrayLiteral 承接（与 `ArrayLiteral in TypeDefine` 同一口径）",
  "BinaryOperator in Bracket": "括号里的联合类型 `(A | B)`（类型位，本工程按二元运算收）",
  "BinaryOperator in BinaryOperator": "嵌套的联合 / 交叉类型（`A | B | null`）",
  "BinaryOperator in TernaryOperatorCondition": "条件类型的 `extends` 约束里的运算符",
  "Function in ClassBody": "类体里按 `function(...)` 写的类型成员（TS 读成 MethodSignature / FunctionType）",
  "Lamda in TernaryOperatorFalseStatement": "条件类型分支里的函数类型",
  "Lamda in Bracket": "括号里的函数类型 `(() => object)`",
  "Lamda in Statement": "语句层的函数类型（映射类型别名等）",
  "ArrayLiteral in ReturnType": "返回类型里的数组 / 元组写法",
  "ArrayLiteral in LogicalOperator": "逻辑运算右侧的下标 `a && b[0]`",
  "ArrayLiteral in IfCondition": "条件括号里的下标 `if (a[i])`",
  "ObjectLiteral in TypeAssign": "类型别名右值的索引签名 `{ [k: string]: T }`",
};

/// 「缺节点」方向上已登记的口径差异：这些 TS 构造在本工程里**本来就不产节点**（或另有归属）。
const MISSING_IGNORED = {
  YieldExpression: "`yield x` 按 `Keyword` + 表达式收（README 的关键字兜底口径）",
  AwaitExpression: "`await x` 同上",
  VariableDeclaration: "多声明符列表只产出一个 Let（gap-dashboard 已登记：一个 Let 对应一个 VariableStatement 的多个声明符）",
  VariableDeclarationList: "同 VariableDeclaration",
  MethodSignature: "成员位的 `abstract new (): A`：TS 读成名叫 new 的方法，本工程读成构造签名",  ObjectLiteralExpression: "解构默认值与嵌套解构的形状收进 Let 的 arrayPattern / objectPattern",
  ArrayLiteralExpression: "同上（数组模式）",
  LabeledStatement: "`return` 换行后的 `{ a: 1 }`：TS 记成标签，本工程按对象字面量收",
  SourceFile: "文件根节点",
  Block: "块语句由 Bracket / *Body 承接",
  TypeReference: "类型引用由 TypeDefine / GenericType 承接",
  LiteralType_removed: "（占位：字面量类型第 66 轮起有自己的标签，缺口不再整类遮蔽，见 ignoreMissing 的位置登记）",
  ConstructorType: "1 处已知残渣：`@types/node/test.d.ts:2119` 的 `F extends abstract new(…) => any ? F : undefined`（同一个 `FunctionType` 在别的文件里都成形，这里与 `TernaryOperator` 的收尾互相让位）",
  TypeQuery: "类型位的 `typeof X`：第 66 轮起由 `type-operator.xl.md` 收成 `TypeQuery`（含已经折成 `UnaryOperator` 的那种壳），这一条只剩个别还没接上的位置",
  MappedType: "映射类型的**内容**按 Field 收（`{ [K in T]: X }` 的成员在 `MappedType` 下仍是一个 `Field`）",
  ComputedPropertyName: "解构里的计算属性名 `({ [k]: v } = o)`（形状收进 Let 的 objectPattern）",
  PropertySignature: "极少数类型字面量成员没成形（`typescript.d.ts` 的 `ImportSpecifier & ({ readonly isTypeOnly: true } | …)` 一处，与 TypeLiteral 同一处）",
  MethodDeclaration: "3 处已知残渣：`events.d.ts` 的计算属性名带泛型的方法签名、`sqlite.d.ts` 按 `function(...)` 写的类型成员（本工程按 Function/Lamda 承接）",
  TypeLiteral: "1 处已知残渣：`util.d.ts:1563` 的 `{ [longOption: string]: … }` 被收成 ObjectLiteral（同一处的 TypeAssign 分支已登记为口径）",
  UnionType: "1 处已知残渣：**模板字面量类型插值段**里的联合（`type X = `a${\"x\" | \"y\"}b``）。那段内容是在字符串收尾之前重组的，此刻父单元还没接上（实测插值段链路是 `InterpolationString > String > Root`，而 `Root.Data` 里还找不到那个 `String`），所以「这一格前面是什么」问不出来、往上也找不到类型容器。试过按类型位放行，值位的 `${a | b}` 会跟着变成联合（那个取舍不划算），于是如实登记",
  IntersectionType: "1 处已知残渣（同上：映射类型 `as` 子句的模板字面量里 `K & string`）",
};

/// `BinaryExpression` 里本工程**另有归属**的运算符（与 `differential.mjs` 同口径）。
const IGNORED_BINARY_OPERATORS = [
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.CommaToken,
];

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|mts|cts)$/.test(p) && !p.endsWith(".d.ts.map")) out.push(p);
  }
  return out;
}

/// 产物树 → [{tag, start, end, parentTag}]（`SourceRange` 两头是 `Source | null`）。
function productUnits(source, file) {
  const template = new Template();
  const document = new TextDocument(source);
  document.FilePath = file;
  const context = new TextContext(template);
  context.Process(document);
  const units = [];
  (function visit(token, parentTag) {
    const start = token.SourceRange.Start === null ? -1 : token.SourceRange.Start.Index;
    const end = token.SourceRange.End === null ? -1 : token.SourceRange.End.Index;
    units.push({ tag: token.constructor.name, start, end, parentTag });
    for (const child of token.Data) visit(child, token.constructor.name);
  })(context.Root, null);
  return units;
}

/// TS 的 `SyntaxKind` 里有**别名**：TypeScript 6 里 `ImportType === LastTypeNode`（同一个枚举值 206），
/// 所以 `ts.SyntaxKind[node.kind]` 会把导入类型印成 `"LastTypeNode"`——按名字写映射就永远匹配不上
/// （实测 `Method in TypeQuery` 144 处全是这个假阳性）。这里按**语义**把别名正回真名。
function kindName(node) {
  if (ts.isImportTypeNode(node)) return "ImportType";
  // TypeScript 6 的枚举里还有几个**别名**：`TypePredicate === FirstTypeNode`
  // （`SyntaxKind[kind]` 会把它印成 `"FirstTypeNode"`）。按语义正名，
  // 否则 `REVERSE` 里写 `"TypePredicate"` 永远匹配不上。
  if (ts.isTypePredicateNode(node)) return "TypePredicate";
  return ts.SyntaxKind[node.kind];
}

/// TS AST → [{kind, start, end, node}]（`getStart` / `getEnd` 都不含前后 trivia）。
function sourceNodes(sf) {
  const nodes = [];
  const parents = new Map();
  (function link(node) {
    ts.forEachChild(node, (child) => {
      parents.set(child, node);
      link(child);
    });
  })(sf);
  (function visit(node) {
    nodes.push({ kind: kindName(node), start: node.getStart(sf), end: node.getEnd(), node });
    ts.forEachChild(node, visit);
  })(sf);
  return { nodes, parents };
}

/// 这个 TS 构造是不是已被登记为「本工程不产节点 / 另有归属」。
function ignoreMissing(entry, parents, file, source) {
  const node = entry.node;
  // **`.tsx` 不在范围内**（README 的「JSX / TSX 没有支持」）：那四个用例只钉住
  // 「不抛异常 / 不吞掉后面的代码」，所以 TS 在那里面读出来的构造一律不作数 ✓。
  if (file !== undefined && file.endsWith(".tsx")) return true;
  // **用例自己声明「这段源码不是合法 TS」时，TS 那边的解析不作数**：`// xl:ts-invalid`
  // 是体检用例的显式标记（`validate.mjs` 认它），用在这些**对抗形状**上——
  // 比如 `class C { a = 1` 换行 `` [`m`]() {} ``：TypeScript 6.0.3 自带的 parser 在这里
  // 报「';' expected」并把 `1[`m`]()` 读成一个 `CallExpression`（`ElementAccessExpression`
  // 上面套调用），而按 TS 语法它就是一条计算属性名方法 ✓。本工程按语法读，
  // 于是那一个 `CallExpression` 在产物里没有对应物——按**文件级**口径登记，
  // 并在汇总行里单独报出条数（不是悄悄吞掉）。
  if (source !== undefined && source.includes("xl:ts-invalid")) {
    return true;
  }
  // **正则字面量**：两种刻意不给节点的形状（都用例自己标了 `xl:ts-invalid`——
  // 源码本身不是合法 TS，诊断由 TypeScript 那边给出）：
  //   1. **未闭合 / 本行找不到配对 `/`**（`const r = /abc;`、JSX 闭合标签 `</div>`）：
  //      TS 仍产出一个正则节点并报语法错；本工程不给——给了就会一路吃到文件尾、
  //      把后面的代码整段吃掉（`lex-regex-not-close-tag` / `lex-regex-unterminated` 两个用例钉住）；
  //   2. `.tsx` 文件：JSX 不在本工程范围内（见 README 的「JSX / TSX 没有支持」）。
  if (entry.kind === "RegularExpressionLiteral") {
    if (file !== undefined && file.endsWith(".tsx")) return true;
    const text = source.slice(node.getStart(), node.getEnd());
    if (text.indexOf("/", 1) < 0) return true;
  }
  // **环境模块声明的名字**（`declare module "buffer" { … }`）在 TypeScript 6 的 AST 里带
  // `LiteralType` 形状，而它的父亲是一个内部标记节点（`SyntaxKind` 报出来是 `LastTypeNode`，
  // 不是 `ModuleDeclaration`），所以这里**往上爬几层**找 `ModuleDeclaration`。
  // 本工程把模块名当成**模块路径整体**收（`namespace.xl.md`：`declare module "…"` 不按点号拆
  // 嵌套命名空间），那里不该有字面量类型节点——按位置登记，而不是把整个 `LiteralType` 类别遮蔽掉。
  if (entry.kind === "LiteralType") {
    let up = parents.get(node);
    for (let hop = 0; hop < 3 && up; hop++) {
      if (ts.isModuleDeclaration(up)) return true;
      // TypeScript 6 给环境模块名套了一层**内部标记节点**（`SyntaxKind` 名就是 `LastTypeNode`，
      // 它在遍历映射里没有自己的父亲），所以按 kind 名认它一次。
      if (ts.SyntaxKind[up.kind] === "LastTypeNode") return true;
      up = parents.get(up);
    }
  }
  // **字面量类型里的带符号数字**：`type X = -1 | 0 | 1` 在 TS 那边是
  // `LiteralType > PrefixUnaryExpression`，本工程把 `-` 与数字**一起**收进 `LiteralType`
  // （`literal-type.xl.md`：类型位的 `-1` 不会被折成 `UnaryOperator`，符号作为子单元留在里面）。
  // 于是那个 `PrefixUnaryExpression` 没有对应的产物标签——这是**表示方式**的差别，按位置登记。
  if (entry.kind === "PrefixUnaryExpression") {
    const holder = parents.get(node);
    if (holder && ts.isLiteralTypeNode(holder)) return true;
  }
  if (MISSING_IGNORED[entry.kind]) return true;
  if (entry.kind === "BinaryExpression") {
    if (IGNORED_BINARY_OPERATORS.includes(node.operatorToken.kind)) return true;
  }
  if (entry.kind === "VariableDeclaration") {
    const list = parents.get(node);
    if (!list || !ts.isVariableDeclarationList(list) || list.declarations.length !== 1) return true;
  }
  // **尖括号类型断言 `<T[]>xs` 里的类型不产节点**：本工程把 `<T>` / `<T[]>` 那一对尖括号
  // 留成平铺符号（标签表里没有对应构造，用例 `expr-angle-assertion.ts` 的注记就是这么写的），
  // 于是断言里的 `ArrayType` 一定找不到宿主标签。这是**刻意保留**的形状，不是漏收。
  if (entry.kind === "ArrayType" || entry.kind === "TupleType" || entry.kind === "IndexedAccessType") {
    const holder = parents.get(node);
    if (holder && ts.isTypeAssertionExpression(holder)) return true;
  }
  return false;
}

function overlaps(a, b) {
  return a.start <= b.end && b.start <= a.end;
}

function corpus(mode) {
  const files = [];
  if (mode !== "cases") {
    files.push(...walk(path.join(root, "node_modules", "@types"), []));
    files.push(...walk(path.join(root, "node_modules", "typescript", "lib"), []));
    // **`undici-types` 是第 67 轮补进来的**：其余六把尺子（`lossless` / `structure` /
    // `boundaries` / `noise` / `differential` / `gap-dashboard`）一直都把它算进语料，
    // 只有这一把漏了——于是 `@types/node` 依赖的 44 个 `.d.ts`（`fetch.d.ts` /
    // `dispatcher.d.ts` / `webidl.d.ts` …）从来没有被「构造 ↔ 标签」这一步查过。
    // 一个只查一半语料的探针，报出来的「0」也只对一半语料成立。
    files.push(...walk(path.join(root, "node_modules", "undici-types"), []));
    files.push(...walk(path.join(root, "dist", "ts"), []));
    files.push(...walk(path.join(root, "samples"), []));
  }
  if (mode !== "real") for (const item of listCases()) files.push(item.file);
  return [...new Set(files)];
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find((a) => ["real", "cases", "all"].includes(a)) || "all";
  const topIndex = args.indexOf("--top");
  const top = topIndex >= 0 ? Number(args[topIndex + 1]) : 5;
  const showAll = args.includes("--all");
  // `--samples`：连已登记口径的条目也打印样本——登记过的**可能是错登记的**，
  // 看样本才能发现（第 61 轮就是靠它找出几处真误判的）。
  const showSamples = args.includes("--samples");

  const files = corpus(mode);
  const spurious = new Map();   // `${tag} in ${parentTag}` → {count, samples, allowed}
  const missing = new Map();    // kind → {count, samples}
  const errors = [];
  let failures = 0;
  let scriptInvalid = 0;        // 落在 `xl:ts-invalid` 用例文件里、按文件级口径跳过的条数

  for (const file of files) {
    let source = fs.readFileSync(file, "utf8");
    if (source.charCodeAt(0) === 0xfeff) source = source.substring(1);
    let units;
    try {
      units = productUnits(source, file);
    } catch (e) {
      failures++;
      errors.push(`${path.relative(root, file)}  ${e && e.constructor ? e.constructor.name : "?"}`);
      continue;
    }
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const { nodes, parents } = sourceNodes(sf);
    const rel = path.relative(root, file);
    const lineOf = (i) => sf.getLineAndCharacterOfPosition(Math.max(i, 0)).line + 1;
    const textOf = (a, b) => source.slice(a, Math.min(b, a + 70)).replace(/\n/g, "\\n");

    for (const unit of units) {
      const allowed = REVERSE[unit.tag];
      if (!allowed || unit.start < 0 || unit.end < 0) continue;
      if (nodes.some((n) => allowed.includes(n.kind) && overlaps(unit, n))) continue;
      const key = `${unit.tag} in ${unit.parentTag}`;
      if (!spurious.has(key)) spurious.set(key, { count: 0, samples: [], allowed: key in ALLOWED_EXTRA });
      const entry = spurious.get(key);
      entry.count++;
      if (entry.samples.length < top) entry.samples.push(`${rel}:${lineOf(unit.start)}  ${textOf(unit.start, unit.end + 1)}`);
    }

    const sourceIsInvalidCase = source.includes("xl:ts-invalid");
    for (const node of nodes) {
      const tags = TAGS_BY_KIND.get(node.kind);
      if (!tags) continue;
      const ignored = ignoreMissing(node, parents, rel, source);
      if (ignored && !showSamples) {
        if (sourceIsInvalidCase) scriptInvalid++;
        continue;
      }
      if (tags.some((tag) => units.some((u) => u.tag === tag && overlaps(u, node)))) continue;
      const key = ignored ? `${node.kind}（已登记不产节点）` : node.kind;
      if (!missing.has(key)) missing.set(key, { count: 0, samples: [] });
      const entry = missing.get(key);
      entry.count++;
      if (entry.samples.length < top) entry.samples.push(`${rel}:${lineOf(node.start)}  ${textOf(node.start, node.end)}`);
    }
  }

  console.log(`对齐探针[${mode}]：语料 ${files.length} 个文件，解析失败 ${failures}\n`);

  const rows = [...spurious.entries()].filter(([, v]) => showAll || v.allowed === false);
  const allowedRows = [...spurious.entries()].filter(([, v]) => v.allowed);
  // **「未登记」那一栏要按 `allowed` 数，不能按 `rows.length` 数**：`--all` 时 `rows` 把
  // 已登记口径也包含进来了，原来那一版会把 12 类已登记口径报成「未登记 12 类」——
  // 一个读数会随开关变化的标题，比没有标题更危险（第 67 轮修）。
  const unregisteredRows = rows.filter(([, v]) => !v.allowed);
  console.log(
    `=== 产物里有标签、源码里没有对应构造（未登记 ${unregisteredRows.length} 类 / 已登记口径 ${allowedRows.length} 类）===`,
  );
  for (const [key, v] of rows.sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n[${key}]  ${v.count} 处`);
    for (const s of v.samples) console.log("    " + s);
  }
  if (showSamples) {
    for (const [key, v] of allowedRows.sort((a, b) => b[1].count - a[1].count)) {
      console.log(`\n[${key}]  ${v.count} 处（口径：${ALLOWED_EXTRA[key]}）`);
      for (const s of v.samples) console.log("    " + s);
    }
  } else if (showAll) {
    for (const [key, v] of allowedRows.sort((a, b) => b[1].count - a[1].count)) {
      console.log(`\n[${key}]  ${v.count} 处（口径：${ALLOWED_EXTRA[key]}）`);
    }
  } else if (allowedRows.length) {
    console.log("\n（已登记口径的标签占用，见 ALLOWED_EXTRA；--all 打印，--samples 连样本一起打印）");
    console.log("  " + allowedRows.sort((a, b) => b[1].count - a[1].count).map(([k, v]) => `${k}=${v.count}`).join("  "));
  }

  console.log("\n=== 源码里有构造、产物里没有对应标签（缺节点）===");
  const missingRows = [...missing.entries()].sort((a, b) => b[1].count - a[1].count);
  if (missingRows.length === 0) console.log("（没有）");
  if (scriptInvalid > 0) {
    // **按文件级口径跳过的条数要报出来**，不能让「用例自己声明非法 TS」变成一张万能免罪符：
    // 只有标了 `// xl:ts-invalid` 的用例文件会走这条路（体检那边也认这个标记）。
    console.log(
      `（另有 ${scriptInvalid} 处落在声明了 \`xl:ts-invalid\` 的用例文件里：那些源码本身不是合法 TS，TS 那边的解析不作数）`,
    );
  }
  for (const [kind, v] of missingRows) {
    console.log(`\n[${kind}]  ${v.count} 处`);
    for (const s of v.samples) console.log("    " + s);
  }
  if (errors.length) {
    console.log(`\n解析失败 ${errors.length} 个文件（前 10 个）：`);
    for (const e of errors.slice(0, 10)) console.log("    " + e);
  }
}

main();
