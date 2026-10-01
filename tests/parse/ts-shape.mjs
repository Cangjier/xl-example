// TS 形状投影：把产物树投成 **TypeScript AST 的形状**。
//
//   import { projectRoot } from "./ts-shape.mjs"
//   const { ast, unmapped } = projectRoot(root.ToList(), source);   // → { kind, pos, end, …字段 }
//
// 这是「完全 follow TypeScript 形状」的落点，也是 `cases:tsast` 量成绩的地方。
// 它**不重新解析**：产物树是唯一事实来源，这里只做三件事——
//
//   1. **换名**：产物标签 → `SyntaxKind` 名（`Let` → `VariableDeclaration`、
//      `BinaryOperator` → `BinaryExpression`、`<Identifier>0</Identifier>` → `NumericLiteral`…）；
//   2. **补壳 / 提层**：TS 那边多出来的包装（`VariableStatement` / `VariableDeclarationList` /
//      `ExpressionStatement`）在这里补；TS 那边**没有**的包装（`ClassBody` / `ReturnType` /
//      `Bracket`…）在这里把内容**提上去**变成父节点的一个字段（见 `WRAPPER_FIELDS`）；
//   3. **字段名**：按 kind 给 TS 的字段名（`members` / `statements` / `properties` / `types`…）。
//
// **坐标一律来自产物树的 `range`**（闭区间 `[start, end]` → TS 的 `[pos, end)`），
// 投影自己不发明位置。**但有一处必须转**：TS 的 `getStart()` 不含前导 trivia，
// 而本工程一个节点常常把前导的 `let `/`const ` 也包在区间里——
// 实测 `let answer = 0` 的 `Let` 是 `[0,9]`，而 TS 的 `VariableDeclaration` 是 `[4,9)`
// （`getStart()` 跳过 `let `）。所以 `VariableDeclaration` 的起点要**推到第一个子节点**，
// 语句壳（`VariableDeclarationList` / `VariableStatement`）才用 `Let` 自己的起点。
//
// 没覆盖的构造**原样透传**（`kind` 保留产物标签名）并记进 `unmapped`——**不猜**：
// 猜出来的节点会让尺子报出假成绩。
//
// kind 用**名字**（`"VariableStatement"`）而不是数字：名字是规范的一部分，可读可改；
// 数字由使用方（`tests/parse/ts-ast.mjs`）从 `ts.SyntaxKind` 查出来，
// 这样本文件不必内建一张 300 条的枚举表，也就不会与 TypeScript 的版本漂移。

/** 投影时被抹掉的单元：它们在 TS 的语义子节点里不出现。 */
const INVISIBLE = new Set(["LineWrap", "AreaAnnotation", "LineAnnotation", "PreprocessorDirectives"]);

const NUMERIC_LITERAL = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?)n?$/;

/** 产物标签 → `SyntaxKind` 名（不做位置相关判断的那些）。 */
const KIND_BY_TAG = new Map([
  ["Root", "SourceFile"],
  ["Let", "VariableDeclaration"],
  ["BinaryOperator", "BinaryExpression"],
  ["LogicalOperator", "BinaryExpression"],
  ["UnaryOperator", "PrefixUnaryExpression"],
  ["NotNull", "NonNullExpression"],
  ["TernaryOperator", "ConditionalExpression"],
  ["Method", "CallExpression"],
  ["New", "NewExpression"],
  ["Lamda", "ArrowFunction"],
  ["LamdaParameter", "Parameter"],
  ["Parameter", "Parameter"],
  ["BindingElement", "BindingElement"],
  ["Spread", "SpreadElement"],
  ["ObjectLiteral", "ObjectLiteralExpression"],
  ["ArrayLiteral", "ArrayLiteralExpression"],
  ["As", "AsExpression"],
  ["Satisfies", "SatisfiesExpression"],
  ["TypeAssign", "TypeAliasDeclaration"],
  ["TypeDefine", "TypeReference"],
  ["TypeLiteral", "TypeLiteral"],
  ["GenericType", "TypeReference"],
  ["TypeParameter", "TypeParameter"],
  ["UnionType", "UnionType"],
  ["IntersectionType", "IntersectionType"],
  ["ArrayType", "ArrayType"],
  ["TupleType", "TupleType"],
  ["IndexedAccessType", "IndexedAccessType"],
  ["LiteralType", "LiteralType"],
  ["ConditionalType", "ConditionalType"],
  ["MappedType", "MappedType"],
  ["InferType", "InferType"],
  ["TypePredicate", "TypePredicate"],
  ["TypeOperator", "TypeOperator"],
  ["TypeQuery", "TypeQuery"],
  ["ImportType", "ImportType"],
  ["FunctionType", "FunctionType"],
  ["ParenthesizedType", "ParenthesizedType"],
  ["OptionalType", "OptionalType"],
  ["RestType", "RestType"],
  ["NamedTupleMember", "NamedTupleMember"],
  ["EnumMember", "EnumMember"],
  ["Field", "PropertyDeclaration"],
  ["MethodDeclaration", "MethodDeclaration"],
  ["IndexSignature", "IndexSignatureDeclaration"],
  ["NamespaceBody", "ModuleBlock"],
  ["FunctionBody", "Block"],
  ["MethodBody", "Block"],
  ["LambdaBody", "Block"],
  ["Decorator", "Decorator"],
  ["HeritageClause", "HeritageClause"],
  ["ExpressionWithTypeArguments", "ExpressionWithTypeArguments"],
  ["Signature", "CallSignatureDeclaration"],
  ["ConstString", "StringLiteral"],
  ["String", "StringLiteral"],
  ["RegexToken", "RegularExpressionLiteral"],
  ["Label", "LabeledStatement"],
  ["StaticBlock", "ClassStaticBlockDeclaration"],
  ["NamespaceExport", "NamespaceExportDeclaration"],
  ["Import", "ImportDeclaration"],
  ["Export", "ExportDeclaration"],
  ["Interface", "InterfaceDeclaration"],
  ["Enum", "EnumDeclaration"],
  ["Function", "FunctionDeclaration"],
  ["Class", "ClassDeclaration"],
  ["Namespace", "ModuleDeclaration"],
  ["Try", "TryStatement"],
  ["Switch", "SwitchStatement"],
  ["While", "WhileStatement"],
  ["DoWhile", "DoWhileStatement"],
  ["For", "ForStatement"],
  ["Foreach", "ForOfStatement"],
  ["IfSet", "IfStatement"],
]);

/** `<Keyword>` 的文本 → `SyntaxKind` 名。 */
const KEYWORD_KIND = new Map([
  ["string", "StringKeyword"], ["number", "NumberKeyword"], ["boolean", "BooleanKeyword"],
  ["void", "VoidKeyword"], ["any", "AnyKeyword"], ["unknown", "UnknownKeyword"],
  ["never", "NeverKeyword"], ["object", "ObjectKeyword"], ["symbol", "SymbolKeyword"],
  ["bigint", "BigIntKeyword"], ["undefined", "UndefinedKeyword"], ["null", "NullKeyword"],
  ["true", "TrueKeyword"], ["false", "FalseKeyword"], ["readonly", "ReadonlyKeyword"],
  ["typeof", "TypeOfKeyword"], ["keyof", "KeyOfKeyword"], ["unique", "UniqueKeyword"],
  ["infer", "InferKeyword"], ["extends", "ExtendsKeyword"], ["this", "ThisKeyword"],
  ["abstract", "AbstractKeyword"], ["declare", "DeclareKeyword"], ["export", "ExportKeyword"],
  ["import", "ImportKeyword"], ["new", "NewKeyword"], ["async", "AsyncKeyword"],
  ["await", "AwaitKeyword"], ["static", "StaticKeyword"], ["public", "PublicKeyword"],
  ["private", "PrivateKeyword"], ["protected", "ProtectedKeyword"], ["override", "OverrideKeyword"],
  ["get", "GetKeyword"], ["set", "SetKeyword"], ["default", "DefaultKeyword"],
  ["as", "AsKeyword"], ["satisfies", "SatisfiesKeyword"],
  // **`in` / `instanceof` 是 `Keyword`、也是 TS 的语义子节点**（`BinaryExpression` 的
  // `operatorToken` 就是它们）。漏了这两条时它们被投成 `Identifier`：
  // 真实语料 `InstanceOfKeyword` 缺 878 处（第 34 轮修）。
  ["in", "InKeyword"], ["instanceof", "InstanceOfKeyword"], ["asserts", "AssertsKeyword"],
]);

/** 标点 → `SyntaxKind` 名。 */
const TOKEN_KIND = new Map([
  ["=", "EqualsToken"], ["+=", "PlusEqualsToken"], ["-=", "MinusEqualsToken"],
  ["*=", "AsteriskEqualsToken"], ["/=", "SlashEqualsToken"], ["%=", "PercentEqualsToken"],
  ["+", "PlusToken"], ["-", "MinusToken"], ["*", "AsteriskToken"], ["/", "SlashToken"],
  ["%", "PercentToken"], ["<", "LessThanToken"], [">", "GreaterThanToken"],
  ["<=", "LessThanEqualsToken"], [">=", "GreaterThanEqualsToken"],
  ["==", "EqualsEqualsToken"], ["===", "EqualsEqualsEqualsToken"],
  ["!=", "ExclamationEqualsToken"], ["!==", "ExclamationEqualsEqualsToken"],
  ["&&", "AmpersandAmpersandToken"], ["||", "BarBarToken"], ["??", "QuestionQuestionToken"],
  ["!", "ExclamationToken"], ["?", "QuestionToken"], [":", "ColonToken"],
  [",", "CommaToken"], [";", "SemicolonToken"], ["(", "OpenParenToken"], [")", "CloseParenToken"],
  ["[", "OpenBracketToken"], ["]", "CloseBracketToken"], ["{", "OpenBraceToken"], ["}", "CloseBraceToken"],
  ["=>", "EqualsGreaterThanToken"], ["++", "PlusPlusToken"], ["--", "MinusMinusToken"],
  [".", "DotToken"], ["...", "DotDotDotToken"],
]);

/**
 * **包装节点**：TS 那边没有这一层，它的内容要**提上去**变成父节点的一个字段。
 *
 * 这一条是「字段名对拍」剩下的主要根因。产物里这几层是分开的——
 * 类 / 接口 / 函数都有各自的体节点（`ClassBody` / `InterfaceBody` / `FunctionBody`…），
 * 而 TS 那边 `members` / `body` / `type` **直接挂在声明上**。
 * 不提上去的话，父声明的字段只有 `children`（甚至没有），而包装节点自己还多出一个节点——
 * 「字段名对拍」与「kind 对拍」会**同时**报错。
 *
 * 表的值是「提到父节点的哪个字段」；`null` 表示摊平并把内容并进父节点的 `children`。
 */
const WRAPPER_FIELDS = new Map([
  ["ClassBody", "members"],
  ["InterfaceBody", "members"],
  ["TypeLiteralBody", "members"],
  ["EnumBody", "members"],
  ["ReturnType", "type"],
  // 括号只是分组，TS 那边没有对应节点：内容并进父节点的 `children`。
  ["Bracket", null],
]);

/**
 * **体节点**：它们要**换成另一个名字的字段**，而且**自己仍是一个节点**（不是把内容提上去）。
 *
 * 这一条是与 `WRAPPER_FIELDS` 的关键区别，也是「`Block` 那 335 处」的落点：
 * 产物里 `FunctionBody` / `MethodBody` / `NamespaceBody` 是各自独立的段，
 * 而 TS 那边它们就是 `Block` / `Block` / `ModuleBlock` —— **留着它们当节点**，
 * 父声明那边只改字段名（`body`）。早先把它们当包装提层提掉了，于是 TS 的 `Block`
 * 在产物侧整类不存在（实测 335 处 `Block` + 若干 `ModuleBlock`）。
 */
const BODY_FIELDS = new Map([
  ["FunctionBody", "body"],
  ["MethodBody", "body"],
  ["NamespaceBody", "body"],
  ["LambdaBody", "body"],
]);

/**
 * `children` / 分段名 → TS 那边的字段名。**按 kind 查**，查不到就用原名。
 *
 * 分段名本来就叫 `initial` / `compare` / `body` / `parameters`…（这套 token 层从一开始
 * 就照着 TS 起的名字），所以这张表只补**叫法不同**的那些。
 */
const FIELD_BY_KIND = new Map([
  ["ObjectLiteralExpression", new Map([["children", "properties"]])],
  ["ArrayLiteralExpression", new Map([["children", "elements"]])],
  ["LiteralType", new Map([["children", "literal"]])],
  ["HeritageClause", new Map([["children", "types"]])],
  ["ExpressionWithTypeArguments", new Map([["children", "expression"]])],
  ["TypeLiteral", new Map([["children", "members"]])],
  // 类型位的三段：数组元素的 `elementType`、联合/交叉的 `types`、括号类型的 `type`。
  // 产物里它们都摊成平级的 `children`，TS 那边各有一个具名字段。
  ["ArrayType", new Map([["children", "elementType"]])],
  ["UnionType", new Map([["children", "types"]])],
  ["IntersectionType", new Map([["children", "types"]])],
  ["ParenthesizedType", new Map([["children", "type"]])],
  ["TypeOperator", new Map([["children", "type"]])],
  // `SpreadElement.expression`（`...xs` 里的 `xs`）。
  ["SpreadElement", new Map([["children", "expression"]])],
  // 三元表达式：产物的分段名是 `condition` / `trueStatement` / `falseStatement`
  // （上游 Cangjie 起的名字），而 TS 那边早已改成 `whenTrue` / `whenFalse`，
  // 并且 `?` / `:` 两个标点也算子节点（`questionToken` / `colonToken`）。
  [
    "ConditionalExpression",
    new Map([
      ["trueStatement", "whenTrue"],
      ["falseStatement", "whenFalse"],
    ]),
  ],
  // 函数类型：TS 的 `FunctionType` 是 `parameters` + `type`（形参表与返回类型）。
  // 产物那边 `() => T` 是 `[Bracket(形参), SymbolToken(=>), 返回类型]` 三个平级单元。
  ["FunctionType", new Map([["children", "parameters"]])],
  // `new`：产物那边类型段叫 `name`，TS 那边被调用者叫 `expression`。
  ["NewExpression", new Map([["name", "expression"]])],
  // 非空断言 `x!`：TS 的 `NonNullExpression.expression`。
  ["NonNullExpression", new Map([["children", "expression"]])],
  // `typeof X`：TS 的 `TypeQuery.exprName`。
  ["TypeQuery", new Map([["children", "exprName"]])],
  // 元组：元素数组叫 `elements`；具名/可选/变长元素各自是 `NamedTupleMember` 等，照旧。
  ["TupleType", new Map([["children", "elements"]])],
  // 枚举成员：`A = 1` 是 `name` + `initializer`。
  ["EnumMember", new Map([["children", "initializer"]])],
  ["SourceFile", new Map([["children", "statements"]])],
  ["ModuleBlock", new Map([["children", "statements"]])],
  // 块：函数 / 方法 / 命名空间的体。TS 那边 `Block.statements`。
  ["Block", new Map([["children", "statements"]])],
  // 命名空间体：TS 那边叫 `body`（`NamespaceBody` 会**提层**到 `ModuleDeclaration.body`，
  // 这里的映射是给它自己作为独立模块块时用的）。
  ["NamespaceBody", new Map([["children", "body"]])],
  // 条件类型：TS 有四个具名字段，产物那边是在 `?` / `:` 处切开的平级单元。
  [
    "ConditionalType",
    new Map([
      ["children", "checkType"],
      ["children1", "extendsType"],
      ["children2", "trueType"],
      ["children3", "falseType"],
    ]),
  ],
  // 绑定元素：`BindingElement.name`（`[a]` 是 `a`；`{p: q}` 是 `p`，`q` 进 `PropertyName`）。
  // 产物那边 `[]` / `{}` 只是分组括号，摊平后是 `[identifier, ...]`，所以按字段名取第一个。
  ["BindingElement", new Map([["children", "name"]])],
  // 解构的两种绑定模式：TS 那边 `elements` 是一串 `BindingElement`。
  ["ArrayBindingPattern", new Map([["children", "elements"]])],
  ["ObjectBindingPattern", new Map([["children", "elements"]])],
  ["EnumDeclaration", new Map([["children", "members"]])],
  // 类型参数段：产物那边是一个 `GenericType` 包装（`A<T>`、`T<U>` 与类型引用同形），
  // TS 那边 `typeParameters` 是一串 `TypeParameter`——所以 `GenericType` 要**提层**：
  // 它的内容提到 `typeParameters`，包装自己不出节点。这一条覆盖类 / 接口 / 函数 / 别名四处。
  //
  // **一个 kind 在这两张表里只能出现一次**（`Map` 的键唯一，后写的会**静默覆盖**前一条）。
  // 这里踩过：`ClassDeclaration` 写了两遍，第二遍没有 `HeritageClause` 那条，
  // 于是 `heritageClauses` 整类字段凭空消失——而尺子只报「TS 多了 heritageClauses」，
  // 看不出「是我把映射写重了」。所以每个 kind 的映射**只写一处、写全**。
  [
    "ClassDeclaration",
    new Map([
      ["GenericType", "typeParameters"],
      ["HeritageClause", "heritageClauses"],
      // `children` 里剩下的只有继承段（`ClassBody` 已被提层到 `members`），
      // 所以这里映射到 `heritageClauses`**而不是** `members`——
      // 写成 `members` 会让继承段顶着 `members` 这个名字输出，而真正的成员被覆盖掉。
      ["children", "heritageClauses"],
    ]),
  ],
  [
    "InterfaceDeclaration",
    new Map([
      ["GenericType", "typeParameters"],
      ["HeritageClause", "heritageClauses"],
      ["children", "heritageClauses"],
    ]),
  ],
  ["TypeAliasDeclaration", new Map([["GenericType", "typeParameters"]])],
  ["FunctionDeclaration", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  // 方法与**方法签名**（接口里的）都要把 `children` 叫成 `parameters`——
  // 早先只登记了 `GenericType`，于是 `children` 这个字段名一路错下去（真实语料 6k+ 处）。
  //
  // **注意同一个 kind 在这张表里只能出现一次**：写两遍时**后一条会静默覆盖前一条**
  // （`Map` 的键唯一），症状是「某个字段名整类不对」而看不出原因。这个坑在第 9 轮
  // （`ClassDeclaration`）与第 33 轮（`MethodDeclaration`）各踩过一次——
  // 所以 `cases:shapelint` 现在会**扫源码**把重复键揪出来。
  ["MethodDeclaration", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  ["MethodSignature", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  ["FunctionExpression", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  ["ArrowFunction", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
]);

// ---------------------------------------------------------------------------
// 取值助手
// ---------------------------------------------------------------------------

/**
 * 合一个**声明名**的节点（`class A` / `function f` / `x: T` 的 `x`…）。
 *
 * 位置不能拿声明自己的 `start` 充数（踩过两次，症状不同）：
 *
 * 1. `export class A` 的声明从 `export` 起，而名字 `A` 在更后面——用声明开头会让
 *    **整类名字的区间都错位**（尺子上表现为「TS 有 82 个 `Identifier` 产物没有」）；
 * 2. 光用 `source.indexOf(name, start)` 还不够：`const f` 里 `f` 会在 **`const`** 里
 *    先被找到（同为 `f`）——所以搜索起点要**推过修饰词**（`modifiers="const"`）。
 *
 * 这是投影层能做到的最好程度：产物只把名字记成属性，**没记它的位置**。
 * 想彻底准，就得在 token 层给「名字」一个真节点（带自己的 `SourceRange`）——
 * 那是下一步的事，这里先把「推过修饰词」这条补偿做到位。
 */
function synthName(name, v, ctx) {
  if (name === "") return undefined;
  // **首选产物自己记的位置**：token 层在扫描那一刻就知道名字单元在哪，
  // 于是把它记成 `nameStart` / `nameEnd` 两个字段（见 `class.xl.md` 的 `NameStart`）。
  // 有它就**不做任何猜测**——下面的 `indexOf` 补偿只是给还没有这对字段的 token 兜底。
  const start = v.attrs.get("nameStart");
  const end = v.attrs.get("nameEnd");
  if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= start) {
    return { kind: "Identifier", text: name, pos: start, end: end + 1 };
  }
  const modifiers = v.attrs.get("modifiers");
  let from = v.start;
  if (typeof modifiers === "string" && modifiers !== "") {
    const last = modifiers.split(",").filter((w) => w !== "").pop();
    if (last !== undefined) {
      const at = ctx.source.indexOf(last, v.start);
      if (at >= 0) from = at + last.length;
    }
  }
  const found = ctx.source.indexOf(name, from);
  // **上界是「声明段的末尾」而不是 `v.end`**：`const f` 里那个 `f` 正好落在 `Let` 的末字符上，
  // 用 `found < v.end` 会把它判成越界（踩过：`const f = <T>(x: T): T => x` 的名字一直取不到）。
  const limit = ctx.source.length;
  const pos = found >= 0 && found < limit ? found : from;
  return { kind: "Identifier", text: name, pos, end: pos + name.length };
}

/**
 * 一个产物节点（Map）→ 归一后的视图：**标量属性**进 `attrs`、**数组**进 `segments`。
 *
 * 这两类必须分开存（踩过）：`name` / `fieldName` / `op` / `modifiers` 这些是**标量**，
 * 而 `children` / `parameters` / `initial` 这些是**数组**。最初只存了数组，
 * 于是「按属性给 `name`」那条规则**从未生效**——投影出来的类 / 接口 / 方法全部没有 `name`，
 * 而尺子报的是「TS 多了 `name`」这种看不出根因的差异。
 *
 * 叶子的 `value` 也当标量看（与 XML 的元素文本同义）。
 */
function view(node) {
  const type = node.get("type");
  const range = node.get("range");
  const attrs = new Map();
  const segments = new Map();
  for (const [key, raw] of node.entries()) {
    if (key === "type" || key === "range") continue;
    if (Array.isArray(raw)) segments.set(key, raw);
    else attrs.set(key, raw);
  }
  return {
    type,
    start: range ? range[0] : 0,
    end: range ? range[1] + 1 : 0,
    value: attrs.get("value"),
    attrs,
    segments,
  };
}

/** 某个分段里的**节点**（属性数组会被过滤掉）。 */
function kidsOf(v, key) {
  const raw = v.segments.get(key);
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x instanceof Map);
}

/** 全部子节点：各具名分段 + `children`，按 `Data` 顺序。 */
function allKids(v) {
  const out = [];
  for (const [key, raw] of v.segments) {
    if (key === "children") continue;
    if (!Array.isArray(raw)) continue;
    for (const x of raw) if (x instanceof Map) out.push(x);
  }
  for (const x of kidsOf(v, "children")) out.push(x);
  return out;
}

/** 把一个包装节点摊开：返回它的子节点（去掉透明单元）。 */
function unwrapNodes(node) {
  return allKids(view(node)).filter((k) => !INVISIBLE.has(k.get("type")));
}

function textOfNode(node, ctx) {
  const value = node.get("value");
  if (typeof value === "string") return value;
  const range = node.get("range");
  return range ? ctx.source.slice(range[0], range[1] + 1) : "";
}

function textOf(v, ctx) {
  if (typeof v.value === "string" && v.value !== "") return v.value;
  return ctx.source.slice(v.start, v.end);
}

/** 叶子按值分名——**这是「一类对多类」的落点**。 */
function leafKindOfText(text) {
  if (NUMERIC_LITERAL.test(text)) return "NumericLiteral";
  if (/^["'`]/.test(text)) return "StringLiteral";
  if (text === "true") return "TrueKeyword";
  if (text === "false") return "FalseKeyword";
  if (text === "null") return "NullKeyword";
  if (text === "undefined") return "UndefinedKeyword";
  return "Identifier";
}

/** 标点 → kind 名；不认识的按原文返回（由 `unmapped` 记账）。 */
function tokenKind(text) {
  return TOKEN_KIND.get(text) ?? text;
}

/**
 * **原始类型**名 → `SyntaxKind` 名。
 *
 * 它在 TS 那边**不是** `TypeReference`（见 `projectTypeDefine` 的说明）。
 * 这张表与 `KEYWORD_KIND` 有重叠，但**语义不同**：`KEYWORD_KIND` 管的是
 * 「产物把它标成 `<Keyword>` 了」，这张表管的是「**在类型位上**该叫这个名字」——
 * 而产物在类型位把 `string` 标成的是 `<Identifier>`（实测 `x: string` 里 `string` 是 `Identifier`）。
 */
const PRIMITIVE_TYPE_KIND = new Map([
  ["any", "AnyKeyword"],
  ["unknown", "UnknownKeyword"],
  ["number", "NumberKeyword"],
  ["bigint", "BigIntKeyword"],
  ["object", "ObjectKeyword"],
  ["boolean", "BooleanKeyword"],
  ["string", "StringKeyword"],
  ["symbol", "SymbolKeyword"],
  ["void", "VoidKeyword"],
  ["undefined", "UndefinedKeyword"],
  ["never", "NeverKeyword"],
  ["null", "NullKeyword"],
  ["this", "ThisKeyword"],
]);

/** 某个分段在这个 kind 下该叫什么。 */
function fieldNameFor(kind, key) {
  const table = FIELD_BY_KIND.get(kind);
  return table?.get(key) ?? key;
}

/**
 * 这个子节点是不是**包装**（该把内容提上去），是的话返回到哪个字段。
 *
 * 比纯查表多一条判断：`GenericType` **只有在装 `TypeParameter` 时**才是类型参数段
 * （`<T, U>` 的括号段），此时它是包装；装类型实参时（`Array<T>`）它是**真的节点**，
 * 得投成 `TypeReference`。不作这个区分就会把类型实参整个提掉——
 * 那种错误在尺子上表现为「凭空少一片节点」。
 */
function wrapperTarget(node) {
  const type = node.get("type");
  if (type === "GenericType") {
    const hasParameter = allKids(view(node)).some((k) => k.get("type") === "TypeParameter");
    return hasParameter ? "typeParameters" : undefined;
  }
  return WRAPPER_FIELDS.get(type);
}

const startOf = (node) => (node.get("range") ? node.get("range")[0] : 0);
const endOf = (node) => (node.get("range") ? node.get("range")[1] + 1 : 0);

// ---------------------------------------------------------------------------
// 投影
// ---------------------------------------------------------------------------

/** 一个产物节点 → 一个 TS 形状节点。 */
function projectNode(node, ctx) {
  if (!(node instanceof Map)) return undefined;
  const v = view(node);
  ctx.count++;
  // **尾部 trivia 一律剪掉**：TS 的节点 `end` **从不含尾部 trivia**，而本工程的区间常常含
  // （语句行尾的软换行、正则字面量后面的换行…）。第 23 轮只修了语句族，实测还漏着
  // 正则（`Δ1`）等零散几类——所以这里**不再按 kind 白名单**，改成统一剪：
  // 往回吃掉空白即可，节点里不会有一类「合法地以空白结尾」的情况。
  //
  // 反过来，**没有函数体的可调用签名要带上尾随分号**：`declare function f(): void;` 的 TS 是
  // `FunctionDeclaration[23,51)`（含 `;`），而产物那个 `Function` 到 `void` 就结束了——
  // 分号是它的平级兄弟。真实语料里 `FunctionDeclaration` 缺的近两千处基本是这一条。
  const mk = (kind, props) => {
    let end = stmtEndOf(v, ctx);
    if (SIGNATURE_KINDS.has(kind) && ctx.source[end] === ";") end += 1;
    return Object.assign({ kind }, props === undefined ? {} : props, { pos: v.start, end });
  };

  switch (v.type) {
    case "Root":
      return mk("SourceFile", { statements: projectEach(kidsOf(v, "children"), ctx) });

    case "Statement":
      return projectStatement(v, ctx);

    case "Let":
      return projectLet(v, ctx);

    case "BinaryOperator":
    case "LogicalOperator":
      return projectBinary(v, ctx);

    case "UnaryOperator":
      return projectUnary(v, ctx);

    case "Method":
      return projectCall(v, ctx);

    case "String":
    case "ConstString":
      return mk("StringLiteral", { text: stringText(v, ctx) });

    case "Identifier": {
      const text = textOf(v, ctx);
      return mk(leafKindOfText(text), { text });
    }

    case "Keyword": {
      const text = textOf(v, ctx);
      const kind = KEYWORD_KIND.get(text);
      return kind === undefined ? mk("Identifier", { text }) : mk(kind, { text });
    }

    case "SymbolToken":
      return mk(tokenKind(textOf(v, ctx)), { text: textOf(v, ctx) });

    case "TypeDefine":
      return projectTypeDefine(v, ctx);

    case "TypeAssign":
      return projectTypeAlias(v, ctx);

    case "Parameter":
    case "LamdaParameter":
      return projectParameter(v, ctx);

    case "TypeParameter":
      return projectTypeParameter(v, ctx);

    case "ConditionalType":
      return projectConditionalType(v, ctx);

    case "TernaryOperator":
      return projectConditionalExpression(v, ctx);

    case "Lamda":
      return projectLamda(v, ctx);

    case "FunctionType":
      return projectFunctionType(v, ctx);

    case "ExpressionWithTypeArguments":
      return projectExpressionWithTypeArguments(v, ctx);

    case "Import":
      return projectImport(v, ctx);

    case "Switch":
      return projectSwitch(v, ctx);

    case "Field":
      return projectField(v, ctx);

    case "EnumMember":
      return projectEnumMember(v, ctx);

    case "Lamda":
      return projectLamda(v, ctx);

    default: {
      let kind = KIND_BY_TAG.get(v.type);
      if (kind === undefined) {
        ctx.unmapped.add(v.type);
        return mk(v.type, { children: projectEach(allKids(v), ctx) });
      }
      // **接口 / 类型字面量里的方法声明是 `MethodSignature`**（类里才是 `MethodDeclaration`）。
      if (ctx.signature && v.type === "MethodDeclaration") kind = "MethodSignature";
      return mk(kind, structuralProps(v, kind, ctx));
    }
  }
}

/**
 * **类型容器**：它们的子单元**本身也是类型**，所以要以类型位的方式逐个投影
 * （原始类型名要变成 `StringKeyword` 这类关键字、具名类型要套 `TypeReference`），
 * 不能按普通子节点投。
 *
 * 漏了这一条的后果实测很集中：`"a" | "b" | string` 里的 `string` 出不来 `StringKeyword`、
 * `any[]` 里的 `any` 出不来 `AnyKeyword`、函数类型的返回类型同理——
 * 真实语料里这三类各占两千上下，都是同一个原因（父节点是 `UnionType` / `ArrayType` / `FunctionType`）。
 */
const TYPE_MEMBER_KINDS = new Set([
  "UnionType",
  "IntersectionType",
  "ArrayType",
  "TupleType",
  "IndexedAccessType",
  "ParenthesizedType",
  "TypeOperator",
  "OptionalType",
  "RestType",
  "NamedTupleMember",
]);

/**
 * 投影一批子单元，并在**签名上下文**里切换标记。
 *
 * 接口 / 类型字面量的成员在 TS 那边叫 `PropertySignature` / `MethodSignature`，
 * 而类里的同名成员叫 `PropertyDeclaration` / `MethodDeclaration`——同一个产物标签、
 * 两种上下文两种 kind（声明文件里签名那套是绝大多数）。这个标记就是那个上下文。
 */
function projectEachIn(list, ctx, parentKind) {
  // 类型容器的子单元按**类型位**投（见 `TYPE_MEMBER_KINDS`）。
  if (TYPE_MEMBER_KINDS.has(parentKind)) {
    const out = [];
    for (const item of list) {
      const projected = projectTypeExpression([item], ctx);
      if (projected !== undefined) out.push(projected);
    }
    return out;
  }
  const signature = parentKind === "InterfaceDeclaration" || parentKind === "TypeLiteral";
  if (!signature) return projectEach(list, ctx);
  const saved = ctx.signature;
  ctx.signature = true;
  try {
    return projectEach(list, ctx);
  } finally {
    ctx.signature = saved;
  }
}

function projectEach(list, ctx) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const items = list.filter((item) => item instanceof Map && !INVISIBLE.has(item.get("type")));
  let i = 0;
  while (i < items.length) {
    // **带标签的语句要合并**：产物那边 `outer: for (…) {}` 是**两个平级的单元**
    // （`Label[0,5]` 与 `For[7,36]`），而 TS 是 `LabeledStatement[0,37) > [Identifier, ForStatement]`——
    // 一个包住另一个。早先按 `Label` 单独投出一个 `LabeledStatement`，于是它的区间只盖住标签本身
    // （实测 `Δ-125` / `-64` / `-48` / `-33` … 一整族）。
    // 连续多个标签（`a: b: for`）从右往左套：最外层是第一个标签。
    if (items[i].get("type") === "Label") {
      const labels = [];
      let j = i;
      while (j < items.length && items[j].get("type") === "Label") {
        labels.push(items[j]);
        j++;
      }
      const statement = j < items.length ? projectNode(items[j], ctx) : undefined;
      if (statement !== undefined) {
        let wrapped = statement;
        for (let k = labels.length - 1; k >= 0; k--) {
          wrapped = labeled(labels[k], wrapped, ctx);
        }
        out.push(wrapped);
        i = j + 1;
        continue;
      }
    }
    // `undefined` = 这个单元在 TS 那边是 trivia（例如只有注释的语句），**不收**。
    const projected = projectNode(items[i], ctx);
    if (projected !== undefined) out.push(projected);
    i++;
  }
  return out;
}

/**
 * 一个标签 + 它标的语句 → `LabeledStatement`。
 *
 * 标签名那个 `Identifier` 的区间**不含冒号**：产物给的是 `Label[0,5]`（盖住 `outer:`），
 * 而 TS 的 `Identifier(outer)` 是 `[0,5)`——所以按**名字宽度**切，不从标签单元直接抄。
 */
function labeled(labelUnit, statement, ctx) {
  const text = String(labelUnit.get("label") ?? "");
  const at = startOf(labelUnit);
  return {
    kind: "LabeledStatement",
    label: { kind: "Identifier", text, pos: at, end: at + text.length },
    statement,
    pos: at,
    end: statement.end,
  };
}

/**
 * 语句的**投影终点**：把尾部的 trivia（换行 / 空白）剪掉。
 *
 * 本工程的语句区间**含尾部的换行**（ASI 断句时那一行软换行算在语句里），
 * 而 TS 的语句**从不含尾部 trivia**——实测 `A.x = 1`（无分号，下一行是 `}`）：
 * 产物给 `[82,90)`，TS 的 `ExpressionStatement` 是 `[82,89)`，差的就是那个换行符。
 *
 * 注意**不能顺手剪分号**：TS 的语句是**含**分号的（`x = 1;` ⇒ `ExpressionStatement[0,6)`），
 * 分号的归属只在 `let` 那三层的**内两层**上另有口径（见 `projectLet`）。
 */
function stmtEndOf(v, ctx) {
  let end = v.end;
  while (end > v.start && /\s/.test(ctx.source[end - 1])) end--;
  return end;
}

/**
 * 这个 kind 是不是**语句族**（要剪尾部 trivia 的那些）。
 *
 * 语句族的共同点：它们在 TS 那边都由「一行/一段语句」构成、**从不含尾部 trivia**。
 * `Block` / `ModuleBlock` 是块（右花括号之后不会有 trivia 归它），也一并剪。
 */
function stmtLike(kind) {
  return kind.endsWith("Statement") || kind === "Block" || kind === "ModuleBlock";
}

/**
 * 头部那个 `Keyword` 决定整条语句是什么（TS 那边的 kind，以及值挂在哪个字段上）。
 *
 * 这一族在产物里是**一个 `Keyword` 加一段平级兄弟**（`return a + b` ⇒ `Keyword(return)` + `BinaryOperator`），
 * 而 TS 是**一个语句节点包住表达式**。早先它们一律掉进 `ExpressionStatement` 分支、
 * 只投影第一个单元，于是「头一个 `Keyword` 变成 Identifier、后面整段子树消失」——
 * 真实语料 `ReturnStatement` 缺 1722 处，连带里面的 `BinaryExpression` / `CallExpression` /
 * `Identifier` 一起缺（第 34 轮修的）。
 */
const KEYWORD_STATEMENT_KINDS = new Map([
  ["return", "ReturnStatement"],
  ["throw", "ThrowStatement"],
  ["break", "BreakStatement"],
  ["continue", "ContinueStatement"],
  ["debugger", "DebuggerStatement"],
]);

/** 这些字段装的是**表达式**，其余（`break` / `continue` 的标签）装的是名字。 */
const KEYWORD_STATEMENT_EXPRESSION = new Set(["ReturnStatement", "ThrowStatement"]);

/**
 * 这些 kind 在 TS 那边**本身就是语句**——单个子单元是它们时不能再套 `ExpressionStatement`。
 *
 * 反过来，单个子单元是**表达式**（`f(1)` / `a + b` / `new X`）时，TS 是
 * `ExpressionStatement > 表达式`；早先直接返回那个表达式，于是每个这样的语句都少一层壳。
 */
const STATEMENT_KINDS = new Set([
  "Block",
  "BreakStatement",
  "ClassDeclaration",
  "ClassStaticBlockDeclaration",
  "ContinueStatement",
  "DebuggerStatement",
  "DoWhileStatement",
  "EnumDeclaration",
  "ExportDeclaration",
  "ForOfStatement",
  "ForStatement",
  "FunctionDeclaration",
  "IfStatement",
  "ImportDeclaration",
  "InterfaceDeclaration",
  "LabeledStatement",
  "ModuleBlock",
  "ModuleDeclaration",
  "NamespaceExportDeclaration",
  "ReturnStatement",
  "SwitchStatement",
  "ThrowStatement",
  "TryStatement",
  "TypeAliasDeclaration",
  "VariableStatement",
  "WhileStatement",
]);

/** 一条语句：TS 那边没有 `Statement` 这层壳——按内容的**开头**分派。 */
function projectStatement(v, ctx) {
  const kids = projectableKids(v);
  // **只有注释的语句不是语句**：`// xl:expect …` 这样的行在本工程是一层 `Statement`
  // 包着一个注释单元，而 TS 那边注释是 **trivia**、`forEachChild` 完全看不见它。
  // 早先这里退回一个 `ExpressionStatement`，于是每份用例文件都凭空多两个节点
  // （顶层 `pos=0` 的 `ExpressionStatement`），连 `SourceFile.getStart()` 都被带歪。
  if (kids.length === 0) return undefined;
  const head = kids[0];
  const headType = head.get("type");
  if (headType === "Let") {
    // `Let` 不只是一个节点：`=` 与初始化式是它的**平级兄弟**，所以整串交给 `projectLet`。
    return projectLet(v, ctx);
  }
  // ---- 关键字开头的语句（`return` / `throw` / `break` / `continue` / `debugger`）----
  if (headType === "Keyword") {
    const kind = KEYWORD_STATEMENT_KINDS.get(textOfNode(head, ctx));
    if (kind !== undefined) {
      const rest = kids.slice(1);
      const props = {};
      if (rest.length > 0) {
        const value = projectExpression(rest, ctx);
        if (value !== undefined) props[KEYWORD_STATEMENT_EXPRESSION.has(kind) ? "expression" : "label"] = value;
      }
      return Object.assign({ kind }, props, { pos: v.start, end: stmtEndOf(v, ctx) });
    }
  }
  if (kids.length === 1) {
    const kind = KIND_BY_TAG.get(headType);
    if (kind !== undefined) {
      const projected = projectNode(head, ctx);
      // 单个子单元**本身就是语句**（`if` / `class` / `import`…）⇒ 不再套壳；
      // 是**表达式**（`f(1)` / `a + b` / `new X`）⇒ TS 那边是 `ExpressionStatement > 表达式`。
      if (STATEMENT_KINDS.has(kind)) return projected;
      return { kind: "ExpressionStatement", expression: projected, pos: v.start, end: stmtEndOf(v, ctx) };
    }
  }
  return {
    kind: "ExpressionStatement",
    expression: projectExpression(kids, ctx),
    pos: v.start,
    end: stmtEndOf(v, ctx),
  };
}

/**
 * 这个单元能不能当**运算符**。
 *
 * 绝大多数运算符是 `SymbolToken`，但 **`in` / `instanceof` 是 `Keyword`**——
 * 只认 `SymbolToken` 时会整类丢两侧操作数（实测 `x in o` 只剩一个 `operatorToken`，
 * 真实语料 1118 处「产物只有 operatorToken、TS 有 left/right」都是这一条）。
 */
function isOperatorUnit(node, ctx) {
  const type = node.get("type");
  if (type === "SymbolToken") return true;
  return type === "Keyword" && ["in", "instanceof"].includes(textOfNode(node, ctx));
}

/**
 * 一串单元 → 一个表达式。
 *
 * 三种折叠，按优先级从高到低：
 *
 * 1. **点号链** `a.b.c` ⇒ **嵌套的 `PropertyAccessExpression`**（TS 的形状是左结合的）。
 *    产物那边它是**平铺**的 `[a, ., b, ., c]`——早先这里按「找第一个标点当运算符」处理，
 *    于是 `.` 被当成了二元运算符、折出一个 `BinaryExpression`：**heads 和 tails 两头都错**
 *    （TS 既没有那个 `BinaryExpression`，也没有 `.` 这个运算符节点）。
 * 2. **二元 / 赋值** ⇒ `BinaryExpression`（`x = 1` / `a + b`）。
 * 3. 单个单元 ⇒ 直接投影。
 */
function projectExpression(kids, ctx) {
  if (kids.length === 0) return undefined;
  if (kids.length === 1) return projectNode(kids[0], ctx);
  const isSymbol = (k, text) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === text;

  // ---- 1. 点号链（**从左边开始折**，折完把结果当左操作数继续） ----
  //
  // 早先是「找第一个标点当运算符」⇒ `.` 被当成二元运算符（两头都错）；
  // 中间改成「必须吃满整串才认这条链」⇒ `a.b.c = 1` 这种**链后面还有运算符**的又不认了，
  // 于是掉回二元分支、还是拿 `.` 当运算符。正解是**先折链、再拿链的结果当左操作数**。
  if (kids.length > 2 && isSymbol(kids[1], ".")) {
    let left = projectNode(kids[0], ctx);
    let i = 1;
    let call = null;
    while (i + 1 < kids.length && isSymbol(kids[i], ".")) {
      const next = kids[i + 1];
      if (next.get("type") === "Method") {
        // `console.log(1)` 的产物是 `[console, ., Method(name="log")]`——
        // 那个 `Method` 盖住的是 `log(1)`，而**名字**只占开头的几个字符，
        // 所以这里按名字宽度切一段 `Identifier` 出来（TS 的 `Identifier(log)` 正是这一段）。
        const name = String(next.get("name") ?? "");
        const at = startOf(next);
        left = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
          pos: left.pos,
          end: at + name.length,
        };
        call = projectNode(next, ctx);
        i += 2;
        break;
      }
      left = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: projectNode(next, ctx),
        pos: left.pos,
        end: endOf(next),
      };
      i += 2;
    }
    if (call !== null) {
      // 链尾是一次调用：把 `CallExpression` 的被调用者换成折好的点号链
      // （TS 的 `console.log(1)` 是 `CallExpression > PropertyAccessExpression > …`）。
      return Object.assign({}, call, { expression: left, pos: left.pos });
    }
    if (i >= kids.length) return left;
    return foldBinaryFrom(left, kids.slice(i), ctx);
  }
  // ---- 2. 二元 / 赋值 ----
  const opIndex = kids.findIndex((k, i) => i > 0 && isOperatorUnit(k, ctx));
  if (opIndex > 0 && opIndex < kids.length - 1) {
    return foldBinaryFrom(projectExpression(kids.slice(0, opIndex), ctx), kids.slice(opIndex), ctx);
  }
  return projectNode(kids[0], ctx);
}

/** `左 运算符 右…`：把已经折好的左操作数接上剩下的单元，折成一个 `BinaryExpression`。 */
function foldBinaryFrom(left, rest, ctx) {
  if (rest.length < 2 || rest[0].get("type") !== "SymbolToken") return left;
  const right = projectExpression(rest.slice(1), ctx);
  return {
    kind: "BinaryExpression",
    left,
    operatorToken: projectNode(rest[0], ctx),
    right,
    pos: left.pos,
    end: right ? right.end : endOf(rest[0]),
  };
}

/**
 * `let` / `const` / `var` 声明 → **TS 的三层**。
 *
 * 两个坐标细节（都是实测出来的）：
 *
 * - `VariableDeclaration`（声明本身）从**名字**开始，不含前面的 `let `/`const `——
 *   TS 的 `getStart()` 跳过前导 trivia，而本工程的 `Let` 把修饰词包在区间里；
 * - `VariableDeclarationList` / `VariableStatement`（两层壳）从 `let` 那个词开始。
 */
function projectLet(v, ctx) {
  const kids = projectableKids(v);
  // **`fieldName` / `modifiers` 在 `Let` 子单元上，不在外层 `Statement` 上**（踩过）：
  // 顶层形态是 `Statement > [Let(``const f``), SymbolToken(=), 初始化式]`，
  // 而 `Let` 自己的区间只盖到 `const f` 为止、初始化式是它的**平级兄弟**。
  // 早先这里直接读外层容器的属性，于是 `fieldName` 永远是空——`VariableDeclaration`
  // 的起点一直退到 `const`（实测 505 处对不上），而 `List` 那一层看不出来。
  return projectLetFrom(kids, ctx, v).statement;
}

/**
 * `let` 声明的**单元列表版**：列表本身才是主角，`Statement` 那层壳由调用方决定。
 *
 * 这样拆是因为 `for (let i = 0; …)` 的头部**没有** `Statement` 壳：
 * 产物那边 `For.initial` 是一段单元 `[Let, SymbolToken(=), 初始化式]`，
 * 而 TS 那边 `ForStatement.initializer` **直接就是 `VariableDeclarationList`**（不套 `VariableStatement`）。
 * 早先按单个 `Let` 投，看不到初值——`List` / `Declaration` 各短 4 个字符（实测 Δ-4）。
 */
function projectLetFrom(kids, ctx, container) {
  // 外层容器只用来取「语句整体」的区间（`Statement` 含分号、`For` 的段不含）。
  const stmtWhole = stmtEndOf(container, ctx);
  const stmtEnd = ctx.source[stmtWhole - 1] === ";" ? stmtWhole - 1 : stmtWhole;
  const listEnd = kids.length > 0 ? Math.min(stmtEnd, endOf(kids[kids.length - 1])) : stmtEnd;
  const letNode = kids.find((k) => k.get("type") === "Let") ?? null;
  const letView = letNode === null ? view(container) : view(letNode);
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const initNode = eqIndex >= 0 && eqIndex + 1 < kids.length ? kids[eqIndex + 1] : null;
  // **语句级修饰词不进前两层**：`export const q = 1` 的 TS 是
  // `Statement[104,…)`（含 `export`）/ `List[111,…)`（从 `const` 起）/ `Declaration[117,…)`（从名字起）。
  const listStart = modifierStart(letView, ctx);
  const declared = String(letView.attrs.get("fieldName") ?? "");
  // **解构声明的名字用产物自己的那个 `ArrayLiteral` / `ObjectLiteral`**（踩过）：
  // 它们就是绑定模式（`ArrayLiteral[6,21]` 与 TS 的 `ArrayBindingPattern[6,22)` 逐格一致），
  // 里面还带着结构化的 `BindingElement`。早先我从源码括号里**另造了一个空壳**，
  // 于是 `elements` 空着、里面的 `BindingElement` 与名字全丢——`ObjectBindingPattern` /
  // `ArrayBindingPattern` 的字段名差异、以及 `BindingElement` 那一族的 `Identifier` 缺口都是它。
  const patternUnit =
    declared === ""
      ? projectableKids(letView).find((k) => k.get("type") === "ArrayLiteral" || k.get("type") === "ObjectLiteral") ?? null
      : null;
  const name =
    patternUnit !== null
      ? projectBindingPattern(patternUnit, ctx)
      : declared === ""
        ? bindingSpan(container, listStart, listEnd, ctx)
        : synthName(declared, letView, ctx);
  const declaration = {
    kind: "VariableDeclaration",
    name,
    initializer: initNode === null ? undefined : projectNode(initNode, ctx),
    pos: name.pos,
    end: listEnd,
  };
  // **类型标注是声明的一部分，但它在 `Statement` 那一层**：`let a: string;` 的产物是
  // `Statement > [Let(``let a``), TypeDefine(``: string``)]`——`TypeDefine` 是 `Let` 的**兄弟**，
  // 不在 `Let` 里面（`Field` 那种才在自身里面）。TS 那边 `VariableDeclaration[4,13)` = `a: string`。
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  if (typeNode !== undefined) declaration.type = projectTypeDefine(view(typeNode), ctx);
  const list = {
    kind: "VariableDeclarationList",
    declarations: [declaration],
    flags: flagsOf(letView),
    pos: listStart,
    end: listEnd,
  };
  const statement = { kind: "VariableStatement", declarationList: list, pos: container.start, end: stmtWhole };
  // **`VariableStatement` 的修饰词只有语句级那几个**：`export const q = 1` 的 TS 是
  // `VariableStatement(modifiers=[ExportKeyword])` + `List(flags=Const)`——
  // `const` / `let` / `var` 是**列表的 flags**，不是语句的修饰词（混进去会多出一个 `ConstKeyword`）。
  const holder = {};
  addModifiers(letView, holder, ctx);
  const statementModifiers = holder.modifiers ?? [];
  const onlyStatementLevel = statementModifiers.filter((m) => !["const", "let", "var"].includes(m.text));
  if (onlyStatementLevel.length > 0) statement.modifiers = onlyStatementLevel;
  return { list, statement };
}

/**
 * 绑定模式：产物那边解构声明的括号段是 `ArrayLiteral` / `ObjectLiteral`，
 * 而 TS 在**绑定位**叫 `ArrayBindingPattern` / `ObjectBindingPattern`（字段 `elements`）。
 *
 * 同一个产物标签在**值位**是 `ArrayLiteralExpression`（`[1, 2]`）、在**绑定位**是
 * `ArrayBindingPattern`（`const [a, b] = …`）——所以这里按上下文显式换 kind，
 * 不走 `KIND_BY_TAG`（那张表是值位的）。
 */
function projectBindingPattern(unit, ctx) {
  const v = view(unit);
  const kind = v.type === "ArrayLiteral" ? "ArrayBindingPattern" : "ObjectBindingPattern";
  const elements = [];
  for (const kid of projectableKids(v)) {
    if (kid.get("type") === "BindingElement") elements.push(projectBindingElement(kid, ctx));
  }
  return { kind, elements, pos: v.start, end: stmtEndOf(v, ctx) };
}

/**
 * 绑定元素 → `BindingElement`。
 *
 * 三种形态（都在产物里，逐个按标点切）：
 *
 * | 源码 | TS 的子节点 |
 * | --- | --- |
 * | `a`（简写） | `name` |
 * | `p: q` | `propertyName`(`p`) + `name`(`q`) |
 * | `a = 1` | `name`(`a`) + `initializer`(`1`) |
 * | `...rest` | `name`（`...` 是节点的 `dotDotDotToken` **属性**，不是子节点，所以不投） |
 */
function projectBindingElement(unit, ctx) {
  const v = view(unit);
  const kids = projectableKids(v);
  const colonIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":");
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const names = kids.filter((k) => isNameNode(k) && !isTypeSeparator(k, ctx));
  const props = {};
  if (colonIndex >= 0 && names.length >= 2) {
    // `p: q`：点号左边是属性名、右边是绑定名
    const before = names.find((k) => endOf(k) <= startOf(kids[colonIndex]));
    const after = names.find((k) => startOf(k) > startOf(kids[colonIndex]));
    if (before !== undefined) props.propertyName = nameOf(before, ctx);
    if (after !== undefined) props.name = nameOf(after, ctx);
  } else if (names.length > 0) {
    props.name = nameOf(names[0], ctx);
  }
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) {
    const rhs = kids[eqIndex + 1];
    const text = textOfNode(rhs, ctx);
    props.initializer = { kind: leafKindOfText(text), text, pos: startOf(rhs), end: endOf(rhs) };
  }
  return { kind: "BindingElement", pos: v.start, end: stmtEndOf(v, ctx), ...props };
}

/**
 * 解构声明的**绑定模式**区间：`const [a = 1, b = a] = []` 里那个 `[a = 1, b = a]`。
 *
 * 产物只把解构名记成 `arrayPattern="a,1,b,a"` 这样的**属性**（连括号都没记），
 * 所以这里从源码里把方括号 / 花括号那一段**配对扫出来**——从 `from` 往后找第一个 `[` 或 `{`，
 * 再按深度找它的配对括号。取不到时给一个零宽占位（宁可窄，不要凭空盖住整条声明）。
 */
function bindingSpan(v, from, limit, ctx) {
  const source = ctx.source;
  for (let i = from; i < limit; i++) {
    const ch = source[i];
    if (ch !== "[" && ch !== "{") continue;
    const close = ch === "[" ? "]" : "}";
    let depth = 0;
    for (let j = i; j < limit; j++) {
      if (source[j] === ch) depth++;
      else if (source[j] === close) {
        depth--;
        if (depth === 0) {
          return { kind: ch === "[" ? "ArrayBindingPattern" : "ObjectBindingPattern", pos: i, end: j + 1 };
        }
      }
    }
    break;
  }
  return { kind: "ArrayBindingPattern", pos: from, end: from };
}

/**
 * 列表层的起点：**最后一个修饰词**的位置（`modifiers="export,const"` → `const` 在哪）。
 *
 * 取不到时退回声明自己的起点（没有修饰词的情形，例如 `Let` 就从名字起）。
 */
function modifierStart(v, ctx) {
  const modifiers = v.attrs.get("modifiers");
  if (typeof modifiers !== "string" || modifiers === "") return v.start;
  const last = modifiers.split(",").filter((w) => w !== "").pop();
  if (last === undefined) return v.start;
  const at = ctx.source.indexOf(last, v.start);
  return at >= 0 ? at : v.start;
}

/** 声明的修饰词串 → TS 的 `NodeFlags`（`const` / `let` / `var`）。 */
function flagsOf(v) {
  const modifiers = String(v.attrs.get("modifiers") ?? "");
  if (modifiers.split(",").includes("const")) return "Const";
  if (modifiers.split(",").includes("var")) return "None";
  return "Let";
}

/** 二元运算：TS 的 `left` / `operatorToken` / `right`。 */
function projectBinary(v, ctx) {
  const kids = projectableKids(v);
  const opIndex = kids.findIndex((k) => isOperatorUnit(k, ctx));
  const declaredOp = v.attrs.get("op");
  const left = opIndex > 0 ? projectExpression(kids.slice(0, opIndex), ctx) : undefined;
  const right = opIndex >= 0 && opIndex + 1 < kids.length ? projectExpression(kids.slice(opIndex + 1), ctx) : undefined;
  // **两侧都没有时不要发一个空壳**：产物里有一类残缺的 `LogicalOperator`
  // （`a && b || c` 实测是三个只有 `op="And"/"Or"` 属性、**运算符符号根本没进树**的节点，
  // 而且左右两块还散成了平级兄弟）——那是 token 层的结构问题，投影这里治不了根，
  // 但至少不能凭空造一个既没有 `left` 也没有 `right` 的 `BinaryExpression`
  // （真实语料实测 1118 处「产物只有 operatorToken」）。退回把子单元投出来，让里面的节点还能对上。
  if (left === undefined && right === undefined) {
    return kids.length > 0 ? projectExpression(kids, ctx) : undefined;
  }
  const opNode =
    opIndex >= 0
      ? projectNode(kids[opIndex], ctx)
      : { kind: tokenKind(String(declaredOp ?? "?")), pos: v.start, end: v.start };
  return {
    kind: "BinaryExpression",
    left,
    operatorToken: opNode,
    right,
    pos: left ? left.pos : v.start,
    end: right ? right.end : v.end,
  };
}

/**
 * 一元运算 → `PrefixUnaryExpression` 或 `PostfixUnaryExpression`。
 *
 * **前后缀是两种 kind**（TS：`-x` 是 `PrefixUnaryExpression`、`y++` 是 `PostfixUnaryExpression`）。
 * 产物那边两者都是 `UnaryOperator op="…"`，判据是**运算符单元在操作数之前还是之后**：
 * `y++` 的 `++` 排在 `y` 后面 ⇒ 后缀。
 *
 * **只给 `operand` 一个字段**：TS 那边运算符（`operator`）是节点的**属性**、不是子节点字段，
 * 所以 `ts.forEachChild` 看不到它。产物那边的 `SymbolToken` 也照此**不投影**。
 */
function projectUnary(v, ctx) {
  const kids = projectableKids(v);
  const opIndex = kids.findIndex((k) => isOperatorUnit(k, ctx));
  const operandKids = opIndex >= 0 ? kids.filter((_, i) => i !== opIndex) : kids;
  const operand = projectExpression(operandKids, ctx);
  const isPostfix = opIndex === kids.length - 1;
  return {
    kind: isPostfix ? "PostfixUnaryExpression" : "PrefixUnaryExpression",
    operand,
    pos: v.start,
    end: v.end,
  };
}

/** 调用：TS 的 `expression`（被调用者）+ `arguments`。 */
function projectCall(v, ctx) {
  const kids = projectableKids(v);
  const calleeText = String(v.attrs.get("name") ?? "");
  const calleeEnd = v.start + calleeText.length;
  const args = kids.filter((k) => k.get("type") !== "Bracket" && k.get("type") !== "GenericType");
  return {
    kind: "CallExpression",
    expression: { kind: leafKindOfText(calleeText), text: calleeText, pos: v.start, end: calleeEnd },
    arguments: projectEach(args, ctx),
    pos: v.start,
    end: v.end,
  };
}

/**
 * 类型标注 `name: T` → `TypeReference`，**但原始类型不套这一层**。
 *
 * 实测 TS 的两种形状截然不同（`let a: string` / `let b: Foo`）：
 *
 * - `a: string` → `VariableDeclaration > [Identifier(a), StringKeyword]` ——
 *   原始类型**直接**是一个 `StringKeyword` 节点，**没有** `TypeReference` 包着；
 * - `b: Foo`    → `VariableDeclaration > [Identifier(b), TypeReference > Identifier(Foo)]` ——
 *   具名类型才有 `TypeReference`，而且它在**同一个区间**上又套一个 `Identifier`。
 *
 * 早先这里一律返回 `TypeReference`，于是原始类型那 373 处（`NumberKeyword` 224 +
 * `StringKeyword` 149）在 TS 侧对不上，而产物侧还多出一层。
 */
function projectTypeDefine(v, ctx) {
  const kids = projectableKids(v);
  const colon = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":");
  const afterColon = colon === undefined ? kids : kids.slice(kids.indexOf(colon) + 1);
  const projected = projectTypeExpression(afterColon, ctx);
  if (projected === undefined) {
    ctx.unmapped.add("TypeDefine(空)");
    return { kind: "TypeReference", pos: v.start, end: v.end };
  }
  return projected;
}

/**
 * 没有函数体的**可调用签名**：它们的 `end` 要**带上尾随分号**（TS 的口径）。
 *
 * `declare function f(): void;` 的 TS 是 `FunctionDeclaration[23,51)`（含 `;`），
 * 而产物那个 `Function` 只到 `void` 为止——分号是它的平级兄弟。
 * 只对这几个 kind 做：带**函数体**的声明不会走到这里（体已经把它结束在 `}` 上了）。
 */
const SIGNATURE_KINDS = new Set(["FunctionDeclaration", "MethodDeclaration", "MethodSignature", "CallSignatureDeclaration"]);

/** 分隔标点：它们由**各自的容器**管（`|` 归 `UnionType`、`,` 归实参表）。 */function isTypeSeparator(node, ctx) {
  if (node.get("type") !== "SymbolToken") return false;
  return [",", "|", "&"].includes(textOfNode(node, ctx));
}

/** 这个单元是不是点号（`.`）——点号类型名要折成 `QualifiedName`。 */
function isDot(node, ctx) {
  return node.get("type") === "SymbolToken" && textOfNode(node, ctx) === ".";
}

/** 这个单元能不能当类型名的一段（`Identifier` / `Keyword`）。 */
function isNameNode(node) {
  const type = node.get("type");
  return type === "Identifier" || type === "Keyword";
}

/** 取一段类型名的节点（按原文宽度切，与 TS 的 `Identifier` 同区间）。 */
function nameOf(node, ctx) {
  const text = textOfNode(node, ctx);
  const at = startOf(node);
  return { kind: "Identifier", text, pos: at, end: at + text.length };
}

/**
 * **类型表达式**：一段单元 → 一个类型节点。类型是可以嵌套的，所以这里必须递归。
 *
 * 实测 TS 的形状（`let a: Map<string, number>`）：
 *
 * ```
 * TypeReference[7,25)            ← `Map<string, number>`（**整个**）
 *   Identifier[7,10)             ← `Map`（**同一区间的第二层**）
 *   typeArguments: StringKeyword[11,16) NumberKeyword[19,24)
 * ```
 *
 * 而产物那边是 `TypeDefine > [Identifier(Map), GenericType(<string, number>)]`——
 * `GenericType` 在那里的身份是**实参表**、不是节点。所以：
 *
 * - 头是 `Identifier` / `Keyword`，后面跟一个 `GenericType` ⇒ `TypeReference` + `typeArguments`；
 * - 头是原始类型名 ⇒ **直接是关键字节点**（不套 `TypeReference`，见 `PRIMITIVE_TYPE_KIND`）；
 * - 后面还跟一个 `ArrayType` ⇒ 再套一层 `ArrayType`（TS 的 `ArrayType` **从基名起**，
 *   而产物的 `ArrayType` 只盖住后缀那一段——所以要把它折上去）。
 */
function projectTypeExpression(nodes, ctx) {
  const list = nodes.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")) && !isTypeSeparator(k, ctx));
  if (list.length === 0) return undefined;
  const head = list[0];
  const generic = list.find((k) => k.get("type") === "GenericType");
  const arraySuffix = list.find((k) => k.get("type") === "ArrayType");

  if (head.get("type") === "Identifier" || head.get("type") === "Keyword") {
    const text = textOfNode(head, ctx);
    const span = { pos: startOf(head), end: endOf(head) };
    const nameNode = { kind: "Identifier", text, pos: span.pos, end: span.end };
    if (generic === undefined) {
      const primitive = PRIMITIVE_TYPE_KIND.get(text);
      if (primitive !== undefined) {
        return arraySuffix === undefined
          ? { kind: primitive, text, pos: span.pos, end: span.end }
          : { kind: "ArrayType", elementType: { kind: primitive, text, pos: span.pos, end: span.end }, pos: span.pos, end: endOf(arraySuffix) };
      }
    }
    // **点号类型名**（`A.B.C` / `N.M<T>`）：TS 在**类型位**用的是 `QualifiedName`（`left`/`right`）、
    // **不是** `PropertyAccessExpression`——两者形状很像，但值位与类型位各归各的。
    // 早先这里只取第一个 `Identifier`，后面的 `B`、`C` **整个丢掉**（缺口表里
    // `Identifier` 与 `TypeReference` 各占一大块，就是这个原因）。
    let typeName = nameNode;
    let end = typeName.end;
    let i = 1;
    while (i + 1 < list.length && isDot(list[i], ctx) && isNameNode(list[i + 1])) {
      const right = nameOf(list[i + 1], ctx);
      typeName = { kind: "QualifiedName", left: typeName, right, pos: typeName.pos, end: right.end };
      end = right.end;
      i += 2;
    }
    const base =
      generic === undefined
        ? { kind: "TypeReference", typeName, text, pos: span.pos, end }
        : {
            kind: "TypeReference",
            typeName,
            typeArguments: projectTypeArguments(generic, ctx),
            text,
            pos: span.pos,
            end: endOf(generic),
          };
    // 数组后缀：`Foo<Bar>[]` 的 TS 是 `ArrayType(Foo<Bar>[]) > TypeReference(Foo<Bar>)`。
    if (arraySuffix !== undefined) {
      return { kind: "ArrayType", elementType: base, pos: base.pos, end: endOf(arraySuffix) };
    }
    return base;
  }
  // 其余形状（`UnionType` / `IntersectionType` / `FunctionType` / `TypeLiteral` / `TupleType`…）
  // 交回通用投影，它们各自的子单元会再走一遍 `projectTypeExpression`。
  if (list.length === 1) return projectNode(list[0], ctx);
  return projectTypeExpression([head], ctx);
}

/** 实参表 `<A, B>` → `typeArguments` 数组（按逗号切开，逐段递归）。 */
function projectTypeArguments(generic, ctx) {
  const parts = [];
  let current = [];
  for (const kid of projectableKids(view(generic))) {
    if (kid.get("type") === "SymbolToken" && textOfNode(kid, ctx) === ",") {
      parts.push(current);
      current = [];
      continue;
    }
    current.push(kid);
  }
  parts.push(current);
  const out = [];
  for (const part of parts) {
    const projected = projectTypeExpression(part, ctx);
    if (projected !== undefined) out.push(projected);
  }
  return out;
}

/** 属性 `x: T` / `x = 1` → `PropertyDeclaration`（类里）或 `PropertySignature`（接口 / 类型字面量里）。 */
function projectField(v, ctx) {
  const kids = projectableKids(v);
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  const nameText = String(v.attrs.get("fieldName") ?? v.attrs.get("name") ?? "");
  const props = { name: synthName(nameText, v, ctx) };
  if (typeNode !== undefined) {
    // **可选标记 `?` 是子节点**（`Signature` 家族）：`x?: string` 的 TS 是
    // `PropertySignature > [Identifier(x), QuestionToken, StringKeyword]`。
    // 产物那边 `?` 被**吞进了 `TypeDefine` 的区间**里（`TypeDefine[17,25]` = `?: string`），
    // 所以按「类型段第一个字符是不是 `?`」把它切出来，再让类型段从它后面起。
    const typeStart = startOf(typeNode);
    if (ctx.source[typeStart] === "?") {
      props.questionToken = { kind: "QuestionToken", text: "?", pos: typeStart, end: typeStart + 1 };
    }
    props.type = projectTypeDefine(view(typeNode), ctx);
  }
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = projectNode(kids[eqIndex + 1], ctx);
  addModifiers(v, props, ctx);
  // **接口 / 类型字面量里的成员是 `PropertySignature`**，类里才是 `PropertyDeclaration`——
  // 同一个产物标签 `Field`，两种上下文两种 kind（声明文件里前者是绝大多数）。
  const kind = ctx.signature ? "PropertySignature" : "PropertyDeclaration";
  return { kind, pos: v.start, end: stmtEndOf(v, ctx), ...props };
}

/** 枚举成员 `A` / `B = 1` → `EnumMember`（`name` + 可选 `initializer`）。 */
function projectEnumMember(v, ctx) {
  const kids = projectableKids(v);
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const nameNode = kids.find((k) => k.get("type") !== "SymbolToken") ?? null;
  const props = {};
  if (nameNode !== null) props.name = projectNode(nameNode, ctx);
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = projectNode(kids[eqIndex + 1], ctx);
  return { kind: "EnumMember", pos: v.start, end: v.end, ...props };
}

/**
 * 修饰词：产物那边是 `modifiers="export,const"` 这样的**字符串**，
 * 而 TS 那边 `modifiers` 是一串**节点**（`ExportKeyword` / `ConstKeyword`…）。
 *
 * **每个修饰词的区间要从原文里量出来**（踩过）：早先一律写成
 * `pos = v.start, end = v.start`（零宽），于是尺子上整类报「同 kind 同起点、终点差 6~9」——
 * 实测 `declare` 是 `TS[26,33)` 而我给 `[26,26)`，一份语料里几百处。
 *
 * 能这样量是因为**带修饰词的节点，自己的起点就是第一个修饰词的起点**
 * （实测 `Field[12,34]` 的 `modifiers="private,readonly"`：12 正是 `private` 的开头），
 * 所以从 `v.start` 起**按顺序**找每个词即可。
 */
function addModifiers(v, props, ctx) {
  const modifiers = v.attrs.get("modifiers");
  if (typeof modifiers !== "string" || modifiers === "") return;
  const words = modifiers.split(",").filter((word) => word !== "");
  const out = [];
  let at = v.start;
  for (const word of words) {
    const found = ctx.source.indexOf(word, at);
    const pos = found >= 0 && found < v.end ? found : at;
    out.push({ kind: `${word.charAt(0).toUpperCase()}${word.slice(1)}Keyword`, text: word, pos, end: pos + word.length });
    at = pos + word.length;
  }
  props.modifiers = out;
}

/**
 * 类型别名 `type A = B` → `TypeAliasDeclaration`（`name` + `type`）。
 *
 * 产物那边名字在 `alias` 属性上、右值在子节点里（`=` 之后），中间是平级的散单元——
 * 所以在 `=` 处切开：左边第一格是 `name`，右边整段是 `type`。
 */
function projectTypeAlias(v, ctx) {
  const kids = projectableKids(v).filter((k) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ";"));
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const aliasText = String(v.attrs.get("alias") ?? "");
  const lhs = eqIndex >= 0 ? kids.slice(0, eqIndex) : kids;
  const rhs = eqIndex >= 0 ? kids.slice(eqIndex + 1) : [];
  const nameNode = lhs.find((k) => k.get("type") === "Identifier");
  const nameText = nameNode === undefined ? aliasText : textOfNode(nameNode, ctx);
  // 泛型参数段在 `<` 与 `=` 之间（`type A<T> = …`）：它是**包装**，
  // 内容进 `typeParameters`、包装自己不出节点。`projectTypeAlias` 不走 `structuralProps`，
  // 所以这一处要**单独**提（漏了它这一行会一直挂在差异表上）。
  const generic = kids.find((k) => k.get("type") === "GenericType");
  const props = {
    name: nameNode === undefined ? synthName(nameText, v, ctx) : projectNode(nameNode, ctx),
    type: typeOf(rhs, ctx),
  };
  if (generic !== undefined) {
    const params = unwrapNodes(generic).filter((k) => k.get("type") === "TypeParameter");
    if (params.length > 0) props.typeParameters = projectEach(params, ctx);
  }
  return { kind: "TypeAliasDeclaration", pos: v.start, end: v.end, ...props };
}

/**
 * 形参 `x: string` → `Parameter`（`name` + `type`）。
 *
 * **`TypeDefine` 要摊平**：产物里 `x: string` 是 `Parameter > [Identifier, TypeDefine > Identifier]`，
 * 而 TS 的 `Parameter.type` **直接就是那个类型引用**，中间没有 `TypeDefine` 这一层。
 */
function projectParameter(v, ctx) {
  const kids = projectableKids(v);
  const nameNode = kids.find((k) => k.get("type") === "Identifier" || k.get("type") === "Keyword");
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  const question = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "?");
  const rest = kids.find((k) => k.get("type") === "Spread");
  const props = {
    name: nameNode === undefined ? undefined : projectNode(nameNode, ctx),
    type: typeNode === undefined ? undefined : projectTypeDefine(view(typeNode), ctx),
  };
  // **可选形参的 `?` 也是子节点**（TS：`Parameter > [name, questionToken, type]`，真实语料 5k+ 处）。
  // 与属性那一处同源：产物把 `?` 吞进了 `TypeDefine` 的区间里（`TypeDefine` 从 `?` 起），
  // 所以按「类型段第一个字符是不是 `?`」切。
  if (question !== undefined) {
    props.questionToken = projectNode(question, ctx);
  } else if (typeNode !== undefined && ctx.source[startOf(typeNode)] === "?") {
    const at = startOf(typeNode);
    props.questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
  }
  if (rest !== undefined) props.dotDotDotToken = projectNode(rest, ctx);
  return { kind: "Parameter", pos: v.start, end: v.end, ...props };
}

/**
 * 三元表达式 `a ? b : c` → `ConditionalExpression`（`condition` / `whenTrue` / `whenFalse`
 * + `questionToken` / `colonToken`）。
 *
 * **`?` 与 `:` 在这里是字段**（TS 的 `cond.questionToken` / `cond.colonToken` 都在
 * `forEachChild` 那一层），与 `ConditionalType` **正好相反**——那个是类型位，
 * TS 那边两个标点都不进子节点。两者形状极像、口径相反，是这一带最容易写错的地方。
 *
 * 分段名（`trueStatement` / `falseStatement`）是上游 Cangjie 的叫法，
 * TS 现在叫 `whenTrue` / `whenFalse`，改名在 `FIELD_BY_KIND` 里做。
 */
function projectConditionalExpression(v, ctx) {
  const props = {
    condition: projectSegment(v, "condition", ctx),
    whenTrue: projectSegment(v, "trueStatement", ctx),
    whenFalse: projectSegment(v, "falseStatement", ctx),
  };
  // `?` 与 `:` 在产物树里**没有单元**（`TernaryOperator` 只收三段），只能按相邻两段的位置合成：
  // `?` 落在条件段末尾，`:` 落在真值段末尾。位置是**算出来的**，不是量出来的。
  const start = v.start;
  const question = firstNodeOf(v, "condition");
  const whenTrue = firstNodeOf(v, "trueStatement");
  if (question !== null) props.questionToken = { kind: "QuestionToken", text: "?", pos: endOf(question), end: endOf(question) + 1 };
  if (whenTrue !== null) props.colonToken = { kind: "ColonToken", text: ":", pos: endOf(whenTrue), end: endOf(whenTrue) + 1 };
  return { kind: "ConditionalExpression", pos: start, end: v.end, ...props };
}

/** 取某个分段里第一个节点（没有就给 `undefined`）。 */
function firstNodeOf(v, key) {
  const kids = kidsOf(v, key);
  if (kids.length > 0) return kids[0];
  // 分段里可能只有一层包装（`TernaryOperatorCondition`），要往里再走一层。
  for (const raw of v.segments.values()) {
    if (!Array.isArray(raw)) continue;
    for (const wrapper of raw) {
      if (!(wrapper instanceof Map)) continue;
      for (const inner of kidsOf(view(wrapper), "children")) {
        if (inner.get("type") !== "SymbolToken") return inner;
      }
    }
  }
  return null;
}

/** 投影一个分段：先摊平包装，再把里面的节点投出来（取第一个）。 */
function projectSegment(v, key, ctx) {
  const kids = kidsOf(v, key);
  if (kids.length === 0) return undefined;
  const first = kids[0];
  // 分段的元素常常是**包装**（`TernaryOperatorCondition` / `IfCondition`…），要摊平一层。
  const inner = unwrapNodes(first).filter((k) => k.get("type") !== "SymbolToken");
  if (inner.length === 0) return projectNode(first, ctx);
  return projectExpression(inner, ctx);
}

/** 从 `from` 往后找第一个非空白字符的位置。 */
function firstCodeAfter(source, from) {
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i++;
  return i;
}

/** 配对的花括号：`{` 的位置 → 配对的 `}` 的位置（找不到给 `-1`）。 */
function matchBrace(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** 原文 `[from, to)` 里某个名字的 `Identifier`（按原文量位置，与 TS 同区间）。 */
function identWithin(source, text, from, to) {
  const at = source.indexOf(text, from);
  if (at < 0 || at + text.length > to) return undefined;
  return { kind: "Identifier", text, pos: at, end: at + text.length };
}

/**
 * `import` 声明 → TS 的形状。
 *
 * 产物把它摊成**一个节点 + 一串平级单元**：
 *
 * ```
 * import { A as B, C } from "m"
 *   ⇒ Import(imported="B,C") + Bracket{ A, as, B, `,`, C } + Identifier(from) + String("m")
 * ```
 *
 * 而 TS 是三层：`ImportDeclaration > ImportClause > (NamedImports > ImportSpecifier…)`，
 * 其中那个 `from` **不是节点**。真实语料里这三层各缺一千多（第 34 轮）。
 *
 * 几条实测口径：
 * - `ImportDeclaration` **含尾随分号**（`import d from "m";` 的 TS 是 `[0,18)`，产物到 `"m"` 就停了）；
 * - `ImportClause` 从子句第一个词开始、到最后一个子句单元结束。**`type` 也算在里面**
 *   （`import type { A } from "m"` 的 TS 是 `ImportClause[7,17)`），而产物**没把 `type` 记成单元**，
 *   所以那个起点只能从 `import` 之后的第一个非空白字符量；
 * - `NamedImports` / `ImportSpecifier` 的区间**直接按原文的 `{}` 与逗号量**：产物这边
 *   花括号有时是 `Bracket`、有时（带别名时）是 `ObjectLiteral`，按标签分会漏一半。
 */
function projectImport(v, ctx) {
  const kids = projectableKids(v);
  const props = {};
  const moduleNode = kids.find((k) => k.get("type") === "String" || k.get("type") === "ConstString");
  if (moduleNode !== undefined) props.moduleSpecifier = projectNode(moduleNode, ctx);
  let end = stmtEndOf(v, ctx);
  if (ctx.source[end] === ";") end += 1;

  const fromNode = kids.find((k) => k.get("type") === "Identifier" && textOfNode(k, ctx) === "from");
  const equals = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  // `import x = require("m")` 在 TS 那边是**另一个 kind**，不是 `ImportDeclaration`。
  if (equals !== undefined) {
    const nameNode = kids.find((k) => k.get("type") === "Identifier" && k !== fromNode);
    const callNode = kids.find((k) => k.get("type") === "Method");
    // `require("m")` 的字符串在**那个 `Method` 里面**，不是 `Import` 的直接子单元。
    const innerString =
      moduleNode ??
      (callNode === undefined
        ? undefined
        : projectableKids(view(callNode)).find((k) => k.get("type") === "String" || k.get("type") === "ConstString"));
    const equalsProps = {};
    if (nameNode !== undefined) equalsProps.name = projectNode(nameNode, ctx);
    if (callNode !== undefined) {
      equalsProps.moduleReference = {
        kind: "ExternalModuleReference",
        expression: innerString === undefined ? undefined : projectNode(innerString, ctx),
        pos: startOf(callNode),
        end: endOf(callNode),
      };
    }
    return { kind: "ImportEqualsDeclaration", pos: v.start, end, ...equalsProps };
  }

  const clause = kids.filter((k) => k !== moduleNode && k !== fromNode && !INVISIBLE.has(k.get("type")));
  if (clause.length === 0) return { kind: "ImportDeclaration", pos: v.start, end, ...props };

  const source = ctx.source;
  const clauseStart =
    String(v.attrs.get("typeOnly") ?? "false") === "true"
      ? firstCodeAfter(source, v.start + "import".length)
      : startOf(clause[0]);
  const clauseEnd = endOf(clause[clause.length - 1]);
  const clauseProps = {};

  const braceOpen = source.indexOf("{", clauseStart);
  const braceClose = braceOpen >= 0 && braceOpen < clauseEnd ? matchBrace(source, braceOpen) : -1;
  const star = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "*");
  const names = clause.filter((k) => k.get("type") === "Identifier" && textOfNode(k, ctx) !== "as");

  if (star !== undefined) {
    // `import * as ns from "m"`：`NamespaceImport` 盖住 `* as ns` 整段（TS 就是这么给的）。
    const nsName = names[names.length - 1];
    clauseProps.namedBindings = {
      kind: "NamespaceImport",
      name: nsName === undefined ? undefined : projectNode(nsName, ctx),
      pos: startOf(star),
      end: clauseEnd,
    };
  } else if (braceClose >= 0) {
    // 花括号之前那一段是默认导入（`import d, { … }` 的 `d`）。
    const defaultName = names.find((k) => startOf(k) < braceOpen);
    if (defaultName !== undefined) clauseProps.name = projectNode(defaultName, ctx);
    clauseProps.namedBindings = {
      kind: "NamedImports",
      elements: namedImportSpecifiers(source, braceOpen, braceClose),
      pos: braceOpen,
      end: braceClose + 1,
    };
  } else if (names.length > 0) {
    clauseProps.name = projectNode(names[0], ctx);
  }

  props.importClause = { kind: "ImportClause", pos: clauseStart, end: clauseEnd, ...clauseProps };
  return { kind: "ImportDeclaration", pos: v.start, end, ...props };
}

/** `{ … }` 里按**顶层逗号**切出每个 `ImportSpecifier`（别名写 `A as B`）。 */
function namedImportSpecifiers(source, braceOpen, braceClose) {
  const out = [];
  let depth = 0;
  let segStart = braceOpen + 1;
  const flush = (to) => {
    let from = segStart;
    while (from < to && /\s/.test(source[from])) from++;
    let stop = to;
    while (stop > from && /\s/.test(source[stop - 1])) stop--;
    if (from >= stop) return;
    const asAt = source.slice(from, stop).search(/\s+as\s+/);
    if (asAt >= 0) {
      const gap = source.slice(from + asAt).match(/\s+as\s+/)[0].length + asAt;
      const property = identWithin(source, source.slice(from, from + asAt).trim(), from, from + asAt);
      const nameText = source.slice(from + gap, stop).trim();
      const name = identWithin(source, nameText, from + gap, stop);
      out.push({ kind: "ImportSpecifier", propertyName: property, name, pos: from, end: stop });
    } else {
      out.push({ kind: "ImportSpecifier", name: identWithin(source, source.slice(from, stop), from, stop), pos: from, end: stop });
    }
  };
  for (let i = braceOpen + 1; i < braceClose; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    else if (source[i] === "," && depth === 0) {
      flush(i);
      segStart = i + 1;
    }
  }
  flush(braceClose);
  return out;
}

/**
 * 条件类型 `T extends U ? A : B` → `ConditionalType`（四个具名字段）。
 *
 * 产物那边是一串**平级单元**：`[T, extends, U, ?, A, :, B]`，所以在 `?` 与 `:` 处切开。
 * `?` / `:` 本身不进任何字段（TS 那边没有 `questionToken` 字段）。
 */
function projectConditionalType(v, ctx) {
  const kids = projectableKids(v);
  const isSymbol = (k, text) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === text;
  const extIndex = kids.findIndex((k) => k.get("type") === "Keyword" && textOfNode(k, ctx) === "extends");
  const questionIndex = kids.findIndex((k) => isSymbol(k, "?"));
  const colonIndex = kids.findIndex((k) => isSymbol(k, ":"));
  const props = {};
  if (extIndex > 0) props.checkType = typeOf(kids.slice(0, extIndex), ctx);
  if (extIndex >= 0) {
    const end = questionIndex > extIndex ? questionIndex : kids.length;
    props.extendsType = typeOf(kids.slice(extIndex + 1, end), ctx);
  }
  if (questionIndex >= 0) {
    const end = colonIndex > questionIndex ? colonIndex : kids.length;
    props.trueType = typeOf(kids.slice(questionIndex + 1, end), ctx);
  }
  if (colonIndex >= 0) props.falseType = typeOf(kids.slice(colonIndex + 1), ctx);
  return { kind: "ConditionalType", pos: v.start, end: v.end, ...props };
}

/**
 * 函数类型 `(x: number) => string` → `FunctionType`（`parameters` + `type`）。
 *
 * 产物那边是三个平级单元：`[Bracket(形参表), SymbolToken(=>), 返回类型]`。
 * 形参要**摊平括号**（TS 那边 `parameters` 直接是 `Parameter`，没有括号那一层节点），
 * `=>` 之后是 `type`。
 */
function projectFunctionType(v, ctx) {
  const kids = projectableKids(v);
  const arrowIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=>");
  const params = [];
  for (const k of arrowIndex < 0 ? kids : kids.slice(0, arrowIndex)) {
    if (k.get("type") === "Bracket") {
      for (const inner of unwrapNodes(k)) params.push(inner);
      continue;
    }
    params.push(k);
  }
  const props = { parameters: projectEach(params, ctx) };
  if (arrowIndex >= 0 && arrowIndex + 1 < kids.length) {
    props.type = typeOf(kids.slice(arrowIndex + 1), ctx);
  }
  return { kind: "FunctionType", pos: v.start, end: v.end, ...props };
}

/**
 * `extends` / `implements` 里的 `B<T>` → `ExpressionWithTypeArguments`
 * （`expression` = 被继承的那个名字，`typeArguments` = `<T>` 里的实参）。
 *
 * 产物那边是平级的两块（`[Identifier(B), GenericType(<T>)]`），
 * 而字段表原来只把 `children` 整体映射成 `expression`——于是实参挂在 `expression` 下、
 * `typeArguments` 整个字段不见（实测 15 处）。`GenericType` 在这里的身份是**实参表**，不是节点。
 */
function projectExpressionWithTypeArguments(v, ctx) {
  const kids = projectableKids(v);
  const generic = kids.find((k) => k.get("type") === "GenericType");
  const names = kids.filter((k) => isNameNode(k));
  const props = {};
  if (names.length > 0) props.expression = dottedExpression(names, ctx);
  if (generic !== undefined) props.typeArguments = projectTypeArguments(generic, ctx);
  return { kind: "ExpressionWithTypeArguments", pos: v.start, end: v.end, ...props };
}

/**
 * 一串名字 → 点号表达式。
 *
 * **`ExpressionWithTypeArguments` 里用的是 `PropertyAccessExpression`**（不是 `QualifiedName`）：
 * `extends globalThis.Iterator` 的 TS 是 `ExpressionWithTypeArguments > PropertyAccessExpression`。
 * （`QualifiedName` 是**类型引用**那一支的写法，见 `projectTypeExpression`——两者别混。）
 */
function dottedExpression(names, ctx) {
  let node = nameOf(names[0], ctx);
  for (let i = 1; i < names.length; i++) {
    const right = nameOf(names[i], ctx);
    node = { kind: "PropertyAccessExpression", expression: node, name: right, pos: node.pos, end: right.end };
  }
  return node;
}

/**
 * `switch (v) { … }` → `SwitchStatement`（`expression` + `caseBlock`）。
 *
 * TS 在这两层之间还有一个 **`CaseBlock`**（就是那对花括号），产物那边没有这一层
 * （`Switch` 只有 `compare` 与 `segments` 两个段）——所以这里**合成**它：
 * 区间从第一个 `{` 起、到 `switch` 自己的终点（那个 `}` 正好是最后一个字符）。
 */
function projectSwitch(v, ctx) {
  const kids = projectableKids(v);
  const cond = kidsOf(v, "compare");
  const segments = projectEach(kidsOf(v, "segments"), ctx);
  const brace = ctx.source.indexOf("{", v.start);
  const props = {};
  if (cond.length > 0) props.expression = projectExpression(cond, ctx);
  props.caseBlock = { kind: "CaseBlock", clauses: segments, pos: brace >= 0 ? brace : v.start, end: v.end };
  return { kind: "SwitchStatement", pos: v.start, end: v.end, ...props };
}

/**
 * 类型参数 `<T extends object = any>` → `TypeParameter`
 * （`name` + 可选 `constraint` / `default` / `modifiers`）。
 *
 * 产物那边名字、`extends`、约束、`=`、默认值是**平级单元**，按标点切开。
 */
function projectTypeParameter(v, ctx) {
  const kids = projectableKids(v);
  // `extends` 的**词法身份不固定**：本仓库记过「接口的 `extends` 永远升不成 `Keyword`」——
  // 所以两种身份都认（`<T extends U>` 里它是 `Keyword`，而某些上下文里它是 `Identifier`）。
  // 只认 `Keyword` 时会**整类丢掉约束**（实测 17 处 `TypeParameter` 少一个 `constraint`）。
  const extIndex = kids.findIndex(
    (k) => (k.get("type") === "Keyword" || k.get("type") === "Identifier") && textOfNode(k, ctx) === "extends",
  );
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  // 名字 = 第一个 Identifier，但要**排掉两样东西**：
  // ① `extends`（它的词法身份不固定，可能是 Identifier）；
  // ② 修饰词——`out` 在产物里就是 **`Identifier`**（README 记过），
  //    不排掉的话 `<out T>` 会把 `out` 当成名字、`modifiers` 反而空掉（实测这一族 17 处）。
  const nameIndex = kids.findIndex(
    (k) => k.get("type") === "Identifier" && textOfNode(k, ctx) !== "extends" && !isTypeParameterModifier(k, ctx),
  );
  const nameNode = nameIndex >= 0 ? kids[nameIndex] : undefined;
  const props = { name: nameNode === undefined ? undefined : projectNode(nameNode, ctx) };
  if (extIndex >= 0) {
    const end = eqIndex > extIndex ? eqIndex : kids.length;
    // `in` / `out` / `const` 是**修饰词**，不是约束内容——`<in T extends U>` 里它们排在名字**前面**。
    const body = kids.slice(extIndex + 1, end).filter((k) => !isTypeParameterModifier(k, ctx));
    if (body.length > 0) props.constraint = typeOf(body, ctx);
  }
  if (eqIndex >= 0) props.default = typeOf(kids.slice(eqIndex + 1), ctx);
  // 修饰词只认**名字之前**的那些：`<const T>` 的 `const`、`<in T>` / `<out T>` 的变型词。
  // TS 把它们算作 `TypeParameter.modifiers`（`forEachChild` 那层看得见），漏了 `const`
  // 就会少一整个字段（实测 `decl-func-generic-const-modifier.ts` 那族）。
  const modifiers = kids.filter((k, i) => (nameIndex < 0 || i < nameIndex) && isTypeParameterModifier(k, ctx));
  if (modifiers.length > 0) props.modifiers = projectEach(modifiers, ctx);
  return { kind: "TypeParameter", pos: v.start, end: v.end, ...props };
}

/**
 * 类型参数的修饰词：变型标注 `in` / `out` 与 `const` 类型参数。
 *
 * **两者的词法身份不同**（README 的「已知口径」里记过）：TS 的扫描器只把 `in` 当关键词，
 * `out` 是上下文修饰、词法上仍是**标识符**；`const` 同理（产物那边是 `Keyword`）。
 * 所以两种都认，否则 `out` 会被当成约束内容。
 */
function isTypeParameterModifier(node, ctx) {
  const type = node.get("type");
  if (type !== "Keyword" && type !== "Identifier") return false;
  return ["in", "out", "const"].includes(textOfNode(node, ctx));
}

/**
 * 箭头函数 → `ArrowFunction`（`parameters` / `body` / `equalsGreaterThanToken` / `type`）。
 *
 * **`=>` 在产物树里没有单元**（`Lamda` 只收 `parameters` 与 `body` 两段），
 * 而 TS 那边 `equalsGreaterThanToken` 是子节点——所以这里按「形参段末尾 = 箭头位置」**合成**一个。
 * 位置是**算出来的**：真实位置要靠词法才能知道 `=>` 前面的空白有多少，`endOf(参数段)` 只是它的下界。
 */
function projectLamda(v, ctx) {
  const props = structuralProps(v, "ArrowFunction", ctx);
  const params = kidsOf(v, "parameters");
  const lastParam = params.length > 0 ? unwrapNodes(params[0]).pop() : null;
  if (lastParam !== undefined && lastParam !== null) {
    // `=>` 的位置**按原文找**：早先量成「最后一个形参的终点」，`(x) => {}` 于是落在 `x` 后面
    // （把 `)` 也算进去了没？实测真实语料 154 处漂移就是这么来的）。从形参段之后往后搜第一个 `=>`。
    const from = endOf(lastParam);
    const at = ctx.source.indexOf("=>", from);
    // `=>` 在 TS 那边占两个字符（`[281,283)`），**不是零宽**——零宽永远对不上。
    const pos = at >= 0 && at < v.end ? at : from;
    const width = ctx.source.startsWith("=>", pos) ? 2 : 0;
    props.equalsGreaterThanToken = { kind: "EqualsGreaterThanToken", text: "=>", pos, end: pos + width };
  }
  return { kind: "ArrowFunction", pos: v.start, end: v.end, ...props };
}

/** 右值那一段单元 → 一个类型节点（`TypeDefine` 摊平；空段给 `undefined`）。 */
function typeOf(nodes, ctx) {
  const list = nodes.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  if (list.length === 0) return undefined;
  if (list[0].get("type") === "TypeDefine") return projectTypeDefine(view(list[0]), ctx);
  if (list.length === 1) return projectNode(list[0], ctx);
  return projectEach(list, ctx)[0];
}

/**
 * 模块声明那个名字是不是**字符串字面量**（`declare module "assert/strict" {}`）。
 *
 * 产物的 `namespace` 属性里**没有引号**，所以判据只能回到原文：在**体（第一个 `{`）之前**
 * 的窗口里找 `"name"` / `'name'`。找不到就是普通标识符（`namespace Foo`）——
 * 窗口必须在 `{` 处截断，否则 `namespace A { const s = "A" }` 里的字符串会被误认成模块名。
 */
function quotedModuleNameSpan(source, name, from) {
  const brace = source.indexOf("{", from);
  const to = brace < 0 ? from + name.length + 40 : brace;
  const window = source.slice(from, Math.max(to, from + name.length + 2));
  for (const quote of ['"', "'"]) {
    const at = window.indexOf(quote + name + quote);
    if (at >= 0) return { pos: from + at, end: from + at + name.length + 2 };
  }
  return undefined;
}

/**
 * 计算属性名那个单元（`[Symbol.toPrimitive]` 在产物里是 `ArrayLiteral`，**含方括号**）。
 *
 * 只认「**第一个**子单元，而且原文那个位置就是 `[`」的那种——类字段的初始化式
 * （`x = [1, 2]`）也是 `ArrayLiteral`，但它前面还有 `=`。
 */
function computedNameUnit(v, ctx) {
  const kids = projectableKids(v);
  if (kids.length === 0) return null;
  const first = kids[0];
  if (first.get("type") !== "ArrayLiteral") return null;
  return ctx.source[startOf(first)] === "[" ? first : null;
}

/** 计算属性名里的表达式：点号链折成 `PropertyAccessExpression`，单个名字就是它自己。 */
function computedNameExpression(unit, ctx) {
  const kids = projectableKids(view(unit)).filter((k) => !INVISIBLE.has(k.get("type")));
  const names = kids.filter((k) => isNameNode(k));
  const dots = kids.filter((k) => isDot(k, ctx)).length;
  if (dots > 0 && names.length === dots + 1) return dottedExpression(names, ctx);
  if (kids.length === 1) return projectNode(kids[0], ctx);
  return projectExpression(kids, ctx);
}

/**
 * 结构类节点的字段（按 kind 给 TS 的字段名）。
 *
 * **包装节点要提上去**（见 `WRAPPER_FIELDS`）：`ClassBody` 的内容成为 `ClassDeclaration.members`、
 * `ReturnType` 的内容成为 `FunctionDeclaration.type`、`Bracket` 的内容并进 `children`。
 */
function structuralProps(v, kind, ctx) {
  const props = {};
  const used = new Set();
  // **`name` 按产物节点自己的属性给**，不维护 kind 白名单——白名单漏一个 kind，
  // 「字段名对拍」就多一处看不出根因的假差异。
  // 命名空间是唯一的例外：它的名字落在 `namespace` 属性上（不是 `name`）。
  const rawName = v.attrs.get("name") ?? v.attrs.get("fieldName") ?? v.attrs.get("namespace");
  const name = typeof rawName === "string" ? rawName : "";
  let nameNode = null;
  // 计算属性名的那个单元（`[Symbol.toPrimitive]`）；它在下面的段循环里要**跳过**。
  let computedUnit = null;
  if (name !== "") {
    // **首选树里那个真子单元**：声明名现在作为 `Identifier` 留在 `Data` 里（见
    // `typescript/tokens/class/class.xl.md` 的 `Process`），它带自己的 `SourceRange`——
    // 拿它就是拿真位置，不做任何猜测。只有还没补上子单元的 token 才走 `synthName`。
    nameNode =
      projectableKids(v).find((k) => k.get("type") === "Identifier" && textOfNode(k, ctx) === name) ?? null;
    // **模块名可能是字符串字面量**：`declare module "assert/strict" {}` 的 TS 是
    // `ModuleDeclaration > StringLiteral`（**带引号那一整段**），而命名空间是 `Identifier`。
    //
    // 产物把两者都记成 `namespace="…"` 属性，而且**引号被吃掉了**（`namespace="assert/strict"`），
    // 所以「按 `name` 首字符是不是引号分」这条判据**永远不成立**——要去原文里找那一对引号。
    // 真实语料 `StringLiteral` 缺的那近两千处一直是这个模块名（第 34 轮修）。
    const literal = v.type === "Namespace" ? quotedModuleNameSpan(ctx.source, name, v.start) : undefined;
    // **计算属性名**：`[Symbol.toPrimitive]` 在产物里是一个 `ArrayLiteral` 单元（**含方括号**），
    // 而 TS 是 `name: ComputedPropertyName > …`。原来那个单元被当成数组字面量投出来、
    // 名字则用 `synthName` 合成一个「整段点号名」的 Identifier——两头都错
    // （真实语料 `PropertyAccessExpression` 缺 4245、`ComputedPropertyName` 缺一千多，第 34 轮修）。
    //
    // 判据是「**第一个**子单元且原文那个位置就是 `[`」：类字段的初始化式 `x = [1, 2]`
    // 也是一个 `ArrayLiteral`，但它前面还有 `=`，不能认成名字。
    const computed =
      literal === undefined && nameNode === null ? computedNameUnit(v, ctx) : null;
    if (literal !== undefined) {
      props.name = {
        kind: "StringLiteral",
        text: ctx.source.slice(literal.pos, literal.end),
        pos: literal.pos,
        end: literal.end,
      };
    } else if (computed !== null) {
      computedUnit = computed;
      props.name = {
        kind: "ComputedPropertyName",
        expression: computedNameExpression(computed, ctx),
        pos: startOf(computed),
        end: endOf(computed),
      };
    } else {
      props.name = nameNode === null ? synthName(name, v, ctx) : projectNode(nameNode, ctx);
    }
    used.add("name");
    used.add("fieldName");
    used.add("namespace");
  }
  for (const [key, raw] of v.segments) {
    if (used.has(key) || !Array.isArray(raw)) continue;
    // **只收节点数组**：`modifiers` / `imports` / `decorators` 是**属性**（字符串数组），
    // 混进来会凭空多出一个字段，把「字段名对拍」搅成假差异。
    if (!raw.some((x) => x instanceof Map)) continue;
    const kept = [];
    const promoted = new Map();
    for (const x of raw) {
      if (!(x instanceof Map) || INVISIBLE.has(x.get("type"))) continue;
      // 名字那个单元已经进 `props.name` 了，不要再当成子节点收一遍。
      if (x === nameNode || x === computedUnit) continue;
      // **体节点**：改字段名，但自己仍是一个节点（见 `BODY_FIELDS`）。
      const body = BODY_FIELDS.get(x.get("type"));
      if (body !== undefined) {
        props[body] = projectNode(x, ctx);
        continue;
      }
      const target = wrapperTarget(x);
      if (target === undefined) {
        kept.push(x);
        continue;
      }
      const bucketKey = target ?? "children";
      const bucket = promoted.get(bucketKey) ?? [];
      for (const inner of unwrapNodes(x)) bucket.push(inner);
      promoted.set(bucketKey, bucket);
    }
    if (kept.length > 0) {
      const field = fieldNameFor(kind, key);
      // 同一字段**只写一次**（后写的会覆盖前写的）：一个 kind 的同一字段可能来自两处
      // （例如 `Bracket` 摊平出来的形参与自己的 `children`），合并而不是覆盖。
      const already = props[field];
      // **以 `Let` 开头的段**（`for (let i = 0; …)` 的头部）：TS 那边这个字段**直接就是
      // `VariableDeclarationList`**（不套 `VariableStatement`），而初值是这个段里的平级兄弟——
      // 所以整段交给列表版去投，不能逐个单元投。
      const projected =
        kept[0].get("type") === "Let"
          ? [projectLetFrom(kept, ctx, view(kept[kept.length - 1])).list]
          : projectEachIn(kept, ctx, kind);
      props[field] = Array.isArray(already) ? already.concat(projected) : projected;
    }
    for (const [target, nodes] of promoted) {
      if (nodes.length === 0) continue;
      const field = target === "children" ? fieldNameFor(kind, key) : fieldNameFor(kind, target);
      const already = props[field];
      const projected = projectEachIn(nodes, ctx, kind);
      props[field] = Array.isArray(already) ? already.concat(projected) : projected;
    }
  }
  // 修饰词：产物那边是字符串，TS 那边是一串节点（见 `addModifiers` 的说明）。
  addModifiers(v, props, ctx);
  return props;
}

/** 语句 / 声明壳里可投影的子节点（去掉透明单元）。 */
function projectableKids(v) {
  return allKids(v).filter((k) => !INVISIBLE.has(k.get("type")));
}

function stringText(v, ctx) {
  const content = kidsOf(v, "children").find((k) => k.get("type") === "ConstString");
  if (content !== undefined) return textOfNode(content, ctx);
  const value = v.attrs.get("text");
  if (typeof value === "string" && value !== "") return value;
  return ctx.source.slice(v.start, v.end);
}

/**
 * 投影整棵树 → `ts.createSourceFile` 同形的单根节点。
 *
 * 三处**文件边界**的口径（实测出来的，两处都反直觉）：
 *
 * - `SourceFile` 的 `getStart()` **不是 0**，而是**第一个 token 的位置**——
 *   前置注释与空行都算前导 trivia。本工程的区间本来就不含前导 trivia，
 *   所以根的起点就取第一个语句的起点（没有语句时退回 0）；
 * - `SourceFile.end` 是**文件长度**（含尾部的换行）；
 * - `EndOfFileToken` 是**文件末尾的零宽节点**：`pos === end === 文件长度`，
 *   而且它在 `ts.forEachChild` 那一层**是可见的**（`forEachChild` 对 `SourceFile`
 *   先访问 `statements` 再访问 `endOfFileToken`）。整个语料每份文件各一个，**不改它就一直缺**。
 *
 * 返回 `{ ast, unmapped, count }`：`unmapped` 是这次没覆盖到的产物标签（透传的那些），
 * `count` 是投影出的节点数。
 */
function projectRoot(exported, source) {
  const ctx = { source, unmapped: new Set(), count: 0 };
  const statements = projectEach(exported, ctx);
  const firstStart = statements.length > 0 ? statements[0].pos : 0;
  return {
    ast: {
      kind: "SourceFile",
      statements,
      endOfFileToken: { kind: "EndOfFileToken", pos: source.length, end: source.length },
      pos: firstStart,
      end: source.length,
    },
    unmapped: [...ctx.unmapped].sort(),
    count: ctx.count,
  };
}

export {
  projectRoot,
  projectNode,
  leafKindOfText,
  tokenKind,
  INVISIBLE,
  KEYWORD_KIND,
  KIND_BY_TAG,
  TOKEN_KIND,
  WRAPPER_FIELDS,
  FIELD_BY_KIND,
};
