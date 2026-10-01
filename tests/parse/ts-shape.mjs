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
  ["NamespaceBody", "body"],
  ["FunctionBody", "body"],
  ["MethodBody", "body"],
  ["LambdaBody", "body"],
  ["ReturnType", "type"],
  // 括号只是分组，TS 那边没有对应节点：内容并进父节点的 `children`。
  ["Bracket", null],
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
  ["FunctionType", new Map([["children", "parameters"]])],
  // 元组：元素数组叫 `elements`；具名/可选/变长元素各自是 `NamedTupleMember` 等，照旧。
  ["TupleType", new Map([["children", "elements"]])],
  // 枚举成员：`A = 1` 是 `name` + `initializer`。
  ["EnumMember", new Map([["children", "initializer"]])],
  ["SourceFile", new Map([["children", "statements"]])],
  ["ModuleBlock", new Map([["children", "statements"]])],
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
  ["EnumDeclaration", new Map([["children", "members"]])],
  // 类型参数段：产物那边是一个 `GenericType` 包装（`A<T>`、`T<U>` 与类型引用同形），
  // TS 那边 `typeParameters` 是一串 `TypeParameter`——所以 `GenericType` 要**提层**：
  // 它的内容提到 `typeParameters`，包装自己不出节点。这一条覆盖类 / 接口 / 函数 / 别名四处。
  ["TypeAliasDeclaration", new Map([["GenericType", "typeParameters"]])],
  ["InterfaceDeclaration", new Map([["GenericType", "typeParameters"], ["HeritageClause", "heritageClauses"]])],
  ["FunctionDeclaration", new Map([["GenericType", "typeParameters"]])],
  ["MethodDeclaration", new Map([["GenericType", "typeParameters"]])],
  ["FunctionExpression", new Map([["GenericType", "typeParameters"]])],
  ["ArrowFunction", new Map([["GenericType", "typeParameters"]])],
  ["FunctionDeclaration", new Map([["children", "parameters"]])],
  ["FunctionExpression", new Map([["children", "parameters"]])],
  ["ArrowFunction", new Map([["children", "parameters"]])],
  // 类的 `children` 里混着三种东西：类型参数、继承段、成员。TS 把它们分成**三个字段**。
  // `ClassBody` 提上来的成员进 `members`（见 `WRAPPER_FIELDS`），这里只留另外两种。
  [
    "ClassDeclaration",
    new Map([
      ["children", "typeParameters"],
      ["HeritageClause", "heritageClauses"],
    ]),
  ],
  ["InterfaceDeclaration", new Map([["HeritageClause", "heritageClauses"]])],
]);

// ---------------------------------------------------------------------------
// 取值助手
// ---------------------------------------------------------------------------

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
  const mk = (kind, props) => Object.assign({ kind }, props === undefined ? {} : props, { pos: v.start, end: v.end });

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

    case "Field":
      return projectField(v, ctx);

    case "EnumMember":
      return projectEnumMember(v, ctx);

    case "Lamda":
      return projectLamda(v, ctx);

    default: {
      const kind = KIND_BY_TAG.get(v.type);
      if (kind === undefined) {
        ctx.unmapped.add(v.type);
        return mk(v.type, { children: projectEach(allKids(v), ctx) });
      }
      return mk(kind, structuralProps(v, kind, ctx));
    }
  }
}

function projectEach(list, ctx) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!(item instanceof Map)) continue;
    if (INVISIBLE.has(item.get("type"))) continue;
    out.push(projectNode(item, ctx));
  }
  return out;
}

/** 一条语句：TS 那边没有 `Statement` 这层壳——按内容的**开头**分派。 */
function projectStatement(v, ctx) {
  const kids = projectableKids(v);
  if (kids.length === 0) {
    return { kind: "ExpressionStatement", pos: v.start, end: v.end };
  }
  const head = kids[0];
  const headType = head.get("type");
  if (headType === "Let") {
    // `Let` 不只是一个节点：`=` 与初始化式是它的**平级兄弟**，所以整串交给 `projectLet`。
    return projectLet(v, ctx);
  }
  if (kids.length === 1) {
    const kind = KIND_BY_TAG.get(headType);
    if (kind !== undefined) return projectNode(head, ctx);
  }
  return {
    kind: "ExpressionStatement",
    expression: projectExpression(kids, ctx),
    pos: v.start,
    end: v.end,
  };
}

/** 一串单元 → 一个表达式；多单元时按「左 运算符 右」折。 */
function projectExpression(kids, ctx) {
  if (kids.length === 0) return undefined;
  if (kids.length === 1) return projectNode(kids[0], ctx);
  const opIndex = kids.findIndex((k, i) => i > 0 && k.get("type") === "SymbolToken");
  if (opIndex > 0 && opIndex < kids.length - 1) {
    const left = projectExpression(kids.slice(0, opIndex), ctx);
    const right = projectExpression(kids.slice(opIndex + 1), ctx);
    return {
      kind: "BinaryExpression",
      left,
      operatorToken: projectNode(kids[opIndex], ctx),
      right,
      pos: left ? left.pos : startOf(kids[0]),
      end: right ? right.end : endOf(kids[kids.length - 1]),
    };
  }
  return projectNode(kids[0], ctx);
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
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const nameNode = kids.find((k) => k.get("type") !== "SymbolToken") ?? null;
  const initNode = eqIndex >= 0 && eqIndex + 1 < kids.length ? kids[eqIndex + 1] : null;
  const declStart = nameNode !== null ? startOf(nameNode) : v.start;
  const declaration = {
    kind: "VariableDeclaration",
    name: nameNode === null ? undefined : projectNode(nameNode, ctx),
    initializer: initNode === null ? undefined : projectNode(initNode, ctx),
    pos: declStart,
    end: v.end,
  };
  const list = {
    kind: "VariableDeclarationList",
    declarations: [declaration],
    flags: flagsOf(v),
    pos: v.start,
    end: v.end,
  };
  return { kind: "VariableStatement", declarationList: list, pos: v.start, end: v.end };
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
  const opIndex = kids.findIndex((k) => k.get("type") === "SymbolToken");
  const declaredOp = v.attrs.get("op");
  const opNode =
    opIndex >= 0
      ? projectNode(kids[opIndex], ctx)
      : { kind: tokenKind(String(declaredOp ?? "?")), pos: v.start, end: v.start };
  const left = opIndex > 0 ? projectExpression(kids.slice(0, opIndex), ctx) : undefined;
  const right = opIndex >= 0 && opIndex + 1 < kids.length ? projectExpression(kids.slice(opIndex + 1), ctx) : undefined;
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
 * 一元运算 → `PrefixUnaryExpression`。
 *
 * **只给 `operand` 一个字段**：TS 那边运算符（`operator`）是节点的**属性**、不是子节点字段，
 * 所以 `ts.forEachChild` 看不到它。产物那边的 `SymbolToken` 也照此**不投影**——
 * 早先投了它，尺子就多报一处「产物多了 `operator`」的假差异。
 */
function projectUnary(v, ctx) {
  const kids = projectableKids(v);
  const opIndex = kids.findIndex((k) => k.get("type") === "SymbolToken");
  const operand = opIndex >= 0 ? projectExpression(kids.slice(opIndex + 1), ctx) : projectExpression(kids, ctx);
  return {
    kind: "PrefixUnaryExpression",
    operand,
    pos: v.start,
    end: operand ? operand.end : v.end,
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
 * 类型标注 `name: T` → TS 的 `TypeReference`。
 *
 * TS 在**同一个区间上放两层**（`TypeReference` 套 `Identifier`），本工程只有一个
 * `TypeDefine` + 里面的标识符，所以这里补出「类型引用」那一层。
 */
function projectTypeDefine(v, ctx) {
  const kids = projectableKids(v);
  const colon = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":");
  const afterColon = colon === undefined ? kids : kids.slice(kids.indexOf(colon) + 1);
  const typeNode = afterColon.find((k) => k.get("type") === "Identifier" || k.get("type") === "Keyword") ?? kids[0];
  if (typeNode === undefined) {
    ctx.unmapped.add("TypeDefine(空)");
    return { kind: "TypeReference", pos: v.start, end: v.end };
  }
  const inner = projectNode(typeNode, ctx);
  return { kind: "TypeReference", typeName: inner, text: textOfNode(typeNode, ctx), pos: inner.pos, end: inner.end };
}

/** 属性 `x: T` / `x = 1` → `PropertyDeclaration`（`name` + `type` / `initializer` / `modifiers`）。 */
function projectField(v, ctx) {
  const kids = projectableKids(v);
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  const nameText = String(v.attrs.get("fieldName") ?? v.attrs.get("name") ?? "");
  const props = {
    name: { kind: "Identifier", text: nameText, pos: v.start, end: v.start + nameText.length },
  };
  if (typeNode !== undefined) props.type = projectTypeDefine(view(typeNode), ctx);
  // `x = 1` 的初值：`=` 后面那一格（与 `projectLet` 同款读法）。
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = projectNode(kids[eqIndex + 1], ctx);
  addModifiers(v, props);
  return { kind: "PropertyDeclaration", pos: v.start, end: v.end, ...props };
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
 * 这里按字符串补出那一串——**位置是合成的**（宽度为零，落在声明开头），
 * 因为产物没有记每个修饰词的区间。字段名与数组形状对得上，区间对不上；
 * 尺子比的是字段名，所以它在这里是「够用但不算精确」，如实写在 README 里。
 */
function addModifiers(v, props) {
  const modifiers = v.attrs.get("modifiers");
  if (typeof modifiers !== "string" || modifiers === "") return;
  props.modifiers = modifiers
    .split(",")
    .filter((word) => word !== "")
    .map((word) => ({
      kind: `${word.charAt(0).toUpperCase()}${word.slice(1)}Keyword`,
      text: word,
      pos: v.start,
      end: v.start,
    }));
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
  const nameStart = nameNode !== undefined ? startOf(nameNode) : v.start;
  // 泛型参数段在 `<` 与 `=` 之间（`type A<T> = …`）：它是**包装**，
  // 内容进 `typeParameters`、包装自己不出节点。`projectTypeAlias` 不走 `structuralProps`，
  // 所以这一处要**单独**提（漏了它这一行会一直挂在差异表上）。
  const generic = kids.find((k) => k.get("type") === "GenericType");
  const props = {
    name: { kind: "Identifier", text: nameText, pos: nameStart, end: nameStart + nameText.length },
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
  if (question !== undefined) props.questionToken = projectNode(question, ctx);
  if (rest !== undefined) props.dotDotDotToken = projectNode(rest, ctx);
  return { kind: "Parameter", pos: v.start, end: v.end, ...props };
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

/** 类型参数 `<T extends object>` → `TypeParameter`（`name` + 可选 `constraint`）。 */function projectTypeParameter(v, ctx) {
  const kids = projectableKids(v);
  const extIndex = kids.findIndex((k) => k.get("type") === "Keyword" && textOfNode(k, ctx) === "extends");
  const nameNode = kids.find((k) => k.get("type") === "Identifier");
  const props = { name: nameNode === undefined ? undefined : projectNode(nameNode, ctx) };
  if (extIndex >= 0 && extIndex + 1 < kids.length) props.constraint = typeOf(kids.slice(extIndex + 1), ctx);
  return { kind: "TypeParameter", pos: v.start, end: v.end, ...props };
}

/** 箭头函数：`ArrowFunction`（`parameters` / `body` / `type`）。 */
function projectLamda(v, ctx) {
  const kids = projectableKids(v);
  const params = kids.filter((k) => k.get("type") === "Parameter" || k.get("type") === "LamdaParameter");
  const body = kids.filter(
    (k) => !["Parameter", "LamdaParameter", "SymbolToken", "ReturnType"].includes(k.get("type")),
  );
  return {
    kind: "ArrowFunction",
    parameters: projectEach(params, ctx),
    body: body.length === 0 ? undefined : projectNode(body[0], ctx),
    pos: v.start,
    end: v.end,
  };
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
  if (name !== "") {
    const nameEnd = v.start + name.length;
    props.name = { kind: "Identifier", text: name, pos: v.start, end: nameEnd };
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
    if (kept.length > 0) props[fieldNameFor(kind, key)] = projectEach(kept, ctx);
    for (const [target, nodes] of promoted) {
      if (nodes.length === 0) continue;
      const field = target === "children" ? fieldNameFor(kind, key) : fieldNameFor(kind, target);
      props[field] = projectEach(nodes, ctx);
    }
  }
  // 修饰词：产物那边是字符串，TS 那边是一串节点（见 `addModifiers` 的说明）。
  addModifiers(v, props);
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
 * 返回 `{ ast, unmapped, count }`：`unmapped` 是这次没覆盖到的产物标签（透传的那些），
 * `count` 是投影出的节点数。
 */
function projectRoot(exported, source) {
  const ctx = { source, unmapped: new Set(), count: 0 };
  const statements = projectEach(exported, ctx);
  return {
    ast: { kind: "SourceFile", statements, pos: 0, end: source.length },
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
