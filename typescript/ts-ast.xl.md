# dependencies
```ts
// @ts-nocheck
```
```xl
import { Token } from "../core/syntax/token.xl.md"
```

# namespace cangjie

**TS 形状直出口**：把产物树（token 树）投成 `ts.createSourceFile` 的形状——**kind 用名字**、
每个节点带 `pos` / `end` 与 TS 那边的字段名，给 `cases:tsast` 那种逐节点对拍与人工 diff 用。

本文件是 `tests/parse/ts-shape.mjs`（原来那 2464 行 JS）的**逐字搬家**：
表名、函数名、函数体、表体与那份实现逐字符相同，只补了 xl 需要的类型标注。
口径是「**先证明等价，再谈改写**」——搬完用一把一次性尺子
（`tests/parse/ts-shape-crossover.mjs`）在全语料上逐字节对拍两份实现的输出：
**1399 个文件、0 处不一致**，结论记在 README 的台账里；那把尺子对拍完就删了，
长期判据是 `cases:tsast`（对 `ts.createSourceFile` 的逐节点对拍）。
所以搬家这一步不夹带任何改写：`stmtLike` 这类死代码、`projectLogical` 那两个够不着的
`case` 分支、`matchBrace` / `matchingBrace` 这一对重复实现，都照原样留着
（要动它们，另开一轮，用尺子量）。

**零改写是字面意思**：连空白都一样——`projectNode` 里那个跨 5 行的嵌套三元照原样搬过来，
它暴露出来的那个 `MethodDeclaration` 缺口是**改规则**修掉的（第 75 轮，
`typescript/tokens/function/method-declaration.xl.md` 的 `ValueOperators`），
不是绕着它写规范。

**比原来多的只有一个成员**：`ToJsonText`（以及它要用的 `Token` import）。
原来那份实现是「库」，序列化（`JSON.stringify(Token.ToPlain(…))`）散在两个调用方手里；
现在收成一处，`cjcli --ts-ast` 与 `samples/check.mjs` 共用同一个函数。

这是一份**纯函数库**：74 个函数都不依赖 `this`、彼此只靠参数耦合，所以按模块级
`# const` / `# method` 陈列，而不是收进一个 class——收进 class 要改掉几百处调用点，
那会把「等价迁移」变成「重写」。**导出面与原来一致**：`export { … }` 里那 10 个名字是
`# const` / `# method`，其余一律 `# private`。

类型口径：树上的动态值（节点字典、投影上下文）标 `any`——它们的形状由
[`core/syntax/token.xl.md`](../core/syntax/token.xl.md) 的 `ToList` / `ToDictionary` 给出，
是 `Map<string, any>` 那一层；标量（`source` / `text` / 字段名 / 下标）按中立类型标。
`ctx` 不另立 class：它的四个字段（`source` / `unmapped` / `count` / `signature`）在树里
以 `ctx.source` 这种写法出现 30 多处，立 class 就要连名带点一起改——**那属于改写，不属于搬家**。

`NUMERIC_LITERAL` 标 `RegExp`：TS 目标上它是准的；换到 C++ 目标时这一类要另想办法
（登记在 README 的目标差异里），**不为了一个还不存在的目标改动已经量过的实现**。

---

import { projectRoot } from "./ts-shape.mjs"
  const { ast, unmapped } = projectRoot(root.ToList(), source);   // → { kind, pos, end, …字段 }

这是「完全 follow TypeScript 形状」的落点，也是 `cases:tsast` 量成绩的地方。
它**不重新解析**：产物树是唯一事实来源，这里只做三件事——

  1. **换名**：产物标签 → `SyntaxKind` 名（`Let` → `VariableDeclaration`、
     `BinaryOperator` → `BinaryExpression`、`<Identifier>0</Identifier>` → `NumericLiteral`…）；
  2. **补壳 / 提层**：TS 那边多出来的包装（`VariableStatement` / `VariableDeclarationList` /
     `ExpressionStatement`）在这里补；TS 那边**没有**的包装（`ClassBody` / `ReturnType` /
     `Bracket`…）在这里把内容**提上去**变成父节点的一个字段（见 `WRAPPER_FIELDS`）；
  3. **字段名**：按 kind 给 TS 的字段名（`members` / `statements` / `properties` / `types`…）。

**坐标一律来自产物树的 `range`**（闭区间 `[start, end]` → TS 的 `[pos, end)`），
投影自己不发明位置。**但有一处必须转**：TS 的 `getStart()` 不含前导 trivia，
而本工程一个节点常常把前导的 `let `/`const ` 也包在区间里——
实测 `let answer = 0` 的 `Let` 是 `[0,9]`，而 TS 的 `VariableDeclaration` 是 `[4,9)`
（`getStart()` 跳过 `let `）。所以 `VariableDeclaration` 的起点要**推到第一个子节点**，
语句壳（`VariableDeclarationList` / `VariableStatement`）才用 `Let` 自己的起点。

没覆盖的构造**原样透传**（`kind` 保留产物标签名）并记进 `unmapped`——**不猜**：
猜出来的节点会让尺子报出假成绩。

kind 用**名字**（`"VariableStatement"`）而不是数字：名字是规范的一部分，可读可改；
数字由使用方（`tests/parse/ts-ast.mjs`）从 `ts.SyntaxKind` 查出来，
这样本文件不必内建一张 300 条的枚举表，也就不会与 TypeScript 的版本漂移。

**文件级指令 `// @ts-nocheck` 写在 `# dependencies` 的 ```ts` 块里**：
那是一整份产物**最前面**的一段（在 import 之前），所以 tsc 认它。

为什么需要它：这份实现是 JS 的逐字搬家——函数体里那些 `const props = {}` 之后再挂字段、
内层箭头函数不带参数类型之类的写法，在 `strict` 的 TS 里要报一百多处；
**改掉它们就是改写**，不是搬家。所以类型判据放在**下一层**：一次性尺子
`tests/parse/ts-shape-crossover.mjs` 在全语料上逐字节对拍两份实现的输出，
那才是「搬完了还等价」的证据。类型标注仍然写全，它们是文档，也是将来真要开检查时的起点。

# const INVISIBLE:Set<string> = new Set(["LineWrap", "AreaAnnotation", "LineAnnotation", "PreprocessorDirectives"])

# private const NUMERIC_LITERAL:RegExp = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?)n?$/

# const KIND_BY_TAG:Map<string, string>

```ts
new Map([
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
  // **`IndexSignature` 就是 TS 现在的名字**（第 89 轮）：`IndexSignatureDeclaration` 是它
  // 的旧别名，而 `ts.SyntaxKind` 的反向查表印出来的是 `IndexSignature`——照旧名投，
  // 尺子上会同时记「缺 `IndexSignature` 102 + 多 `IndexSignatureDeclaration` 102」。
  ["IndexSignature", "IndexSignature"],
  ["NamespaceBody", "ModuleBlock"],
  ["FunctionBody", "Block"],
  ["MethodBody", "Block"],
  ["LambdaBody", "Block"],
  // **循环体也是 `Block`**（第 71 轮）：`for` / `for…of` / `while` / `do…while` 的花括号体
  // 在产物里本来就有自己的单元（`ForBody` / `ForeachBody` / `WhileBody`，区间含那对花括号、
  // 内容就是里面的语句），只是这张表里没有它们——于是投影把它们当**没覆盖的标签**原样透传，
  // `Block` 整类在 TS 侧找不到（真实语料 352 处都压在 `For` / `ForOf` / `While` 三种父节点下）。
  ["ForBody", "Block"],
  ["ForeachBody", "Block"],
  ["WhileBody", "Block"],
  // 异常三段的花括号体同理（`try { … } catch { … } finally { … }`）。
  ["TryBody", "Block"],
  ["CatchBody", "Block"],
  ["FinallyBody", "Block"],
  ["Decorator", "Decorator"],
  ["HeritageClause", "HeritageClause"],
  ["ExpressionWithTypeArguments", "ExpressionWithTypeArguments"],
  ["Signature", "CallSignature"],
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
])
```

# const KEYWORD_KIND:Map<string, string>

```ts
new Map([
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
])
```

# const TOKEN_KIND:Map<string, string>

```ts
new Map([
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
])
```

# const WRAPPER_FIELDS:Map<string, string | null>

**包装节点**：TS 那边没有这一层，它的内容要**提上去**变成父节点的一个字段。

这一条是「字段名对拍」剩下的主要根因。产物里这几层是分开的——
类 / 接口 / 函数都有各自的体节点（`ClassBody` / `InterfaceBody` / `FunctionBody`…），
而 TS 那边 `members` / `body` / `type` **直接挂在声明上**。
不提上去的话，父声明的字段只有 `children`（甚至没有），而包装节点自己还多出一个节点——
「字段名对拍」与「kind 对拍」会**同时**报错。

表的值是「提到父节点的哪个字段」；`null` 表示摊平并把内容并进父节点的 `children`。

```ts
new Map([
  ["ClassBody", "members"],
  ["InterfaceBody", "members"],
  ["TypeLiteralBody", "members"],
  ["EnumBody", "members"],
  ["ReturnType", "type"],
  // 括号只是分组，TS 那边没有对应节点：内容并进父节点的 `children`。
  ["Bracket", null],
])
```

# private const BODY_FIELDS:Map<string, string>

**体节点**：它们要**换成另一个名字的字段**，而且**自己仍是一个节点**（不是把内容提上去）。

这一条是与 `WRAPPER_FIELDS` 的关键区别，也是「`Block` 那 335 处」的落点：
产物里 `FunctionBody` / `MethodBody` / `NamespaceBody` 是各自独立的段，
而 TS 那边它们就是 `Block` / `Block` / `ModuleBlock` —— **留着它们当节点**，
父声明那边只改字段名（`body`）。早先把它们当包装提层提掉了，于是 TS 的 `Block`
在产物侧整类不存在（实测 335 处 `Block` + 若干 `ModuleBlock`）。

```ts
new Map([
  ["FunctionBody", "body"],
  ["MethodBody", "body"],
  ["NamespaceBody", "body"],
  ["LambdaBody", "body"],
])
```

# const FIELD_BY_KIND:Map<string, Map<string, string>>

`children` / 分段名 → TS 那边的字段名。**按 kind 查**，查不到就用原名。

分段名本来就叫 `initial` / `compare` / `body` / `parameters`…（这套 token 层从一开始
就照着 TS 起的名字），所以这张表只补**叫法不同**的那些。

```ts
new Map([
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
  // **取值器 / 设值器**（第 93 轮加）：与函数一样，形参表叫 `parameters`——
  // 不登记时 `set x(v) {}` 的形参会顶着 `children` 出去（实测字段名差）。
  ["GetAccessor", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  ["SetAccessor", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  // 类构造：类里的 `constructor` 投成 `Constructor`（`SyntaxKind[177]`），字段名与函数一样是 `parameters`
  // ——没有这一行时它的形参会顶着 `children` 出去（实测 137 + 109 处字段名差异）。
  ["Constructor", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  ["FunctionExpression", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  ["ArrowFunction", new Map([["GenericType", "typeParameters"], ["children", "parameters"]])],
  // **循环两族的段名**（第 76 轮）：产物从一开始就按上游 Cangjie 的段名记
  // （`for…of` 是 `define` / `enumable` / `body`），TS 那边是另外三个名字。
  // 段名对不上时**只有「字段名」那一栏会红**（kind 与区间都是对的），实测：
  // `ForOfStatement` 185 处、`ForStatement` 126 处。
  [
    "ForOfStatement",
    new Map([
      ["define", "initializer"],
      ["enumable", "expression"],
      ["body", "statement"],
    ]),
  ],
  [
    "ForStatement",
    new Map([
      ["initial", "initializer"],
      ["compare", "condition"],
      ["next", "incrementor"],
      ["body", "statement"],
    ]),
  ],
  // `while (c) { … }`：产物的段名是 `compare` / `body`（上游 Cangjie 的叫法），
  // TS 是 `expression` / `statement`（实测 70 处）。
  [
    "WhileStatement",
    new Map([
      ["compare", "expression"],
      ["body", "statement"],
    ]),
  ],
  // **可调用 / 可构造签名的形参表**：产物那一格是 `children`（形参括号摊平后落在里面；
  // 第 73 轮把 `New` 里那一层也摊平了），TS 叫 `parameters`（实测 146 + 57 处）。
  ["CallSignature", new Map([["children", "parameters"]])],
  ["ConstructSignature", new Map([["children", "parameters"]])],
])
```

# private method synthName:(name:string, v:any, ctx:any)=>string

---------------------------------------------------------------------------

取值助手

---------------------------------------------------------------------------

合一个**声明名**的节点（`class A` / `function f` / `x: T` 的 `x`…）。

位置不能拿声明自己的 `start` 充数（踩过两次，症状不同）：

1. `export class A` 的声明从 `export` 起，而名字 `A` 在更后面——用声明开头会让
   **整类名字的区间都错位**（尺子上表现为「TS 有 82 个 `Identifier` 产物没有」）；
2. 光用 `source.indexOf(name, start)` 还不够：`const f` 里 `f` 会在 **`const`** 里
   先被找到（同为 `f`）——所以搜索起点要**推过修饰词**（`modifiers="const"`）。

这是投影层能做到的最好程度：产物只把名字记成属性，**没记它的位置**。
想彻底准，就得在 token 层给「名字」一个真节点（带自己的 `SourceRange`）——
那是下一步的事，这里先把「推过修饰词」这条补偿做到位。

```ts
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
```

# private method view:(node:any)=>any

一个产物节点（Map）→ 归一后的视图：**标量属性**进 `attrs`、**数组**进 `segments`。

这两类必须分开存（踩过）：`name` / `fieldName` / `op` / `modifiers` 这些是**标量**，
而 `children` / `parameters` / `initial` 这些是**数组**。最初只存了数组，
于是「按属性给 `name`」那条规则**从未生效**——投影出来的类 / 接口 / 方法全部没有 `name`，
而尺子报的是「TS 多了 `name`」这种看不出根因的差异。

叶子的 `value` 也当标量看（与 XML 的元素文本同义）。

```ts
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
```

# private method kidsOf:(v:any, key:string)=>Array<any>

```ts
  const raw = v.segments.get(key);
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x instanceof Map);
```

# private method allKids:(v:any)=>Array<any>

```ts
  const out = [];
  for (const [key, raw] of v.segments) {
    if (key === "children") continue;
    if (!Array.isArray(raw)) continue;
    for (const x of raw) if (x instanceof Map) out.push(x);
  }
  for (const x of kidsOf(v, "children")) out.push(x);
  return out;
```

# private method unwrapNodes:(node:any)=>Array<any>

```ts
  return allKids(view(node)).filter((k) => !INVISIBLE.has(k.get("type")));
```

# private method textOfNode:(node:any, ctx:any)=>string

```ts
  const value = node.get("value");
  if (typeof value === "string") return value;
  const range = node.get("range");
  return range ? ctx.source.slice(range[0], range[1] + 1) : "";
```

# private method textOf:(v:any, ctx:any)=>string

```ts
  if (typeof v.value === "string" && v.value !== "") return v.value;
  return ctx.source.slice(v.start, v.end);
```

# method leafKindOfText:(text:string)=>string

```ts
  if (NUMERIC_LITERAL.test(text)) return "NumericLiteral";
  if (/^["'`]/.test(text)) return "StringLiteral";
  if (text === "true") return "TrueKeyword";
  if (text === "false") return "FalseKeyword";
  if (text === "null") return "NullKeyword";
  // **`undefined` 不走这里**（第 91 轮修）：它是**上下文关键字**——值位的 `x === undefined`
  // 在 TS 那边是一个 `Identifier`（`undefined` 不是保留字），只有**类型位**的 `: undefined`
  // 才是 `UndefinedKeyword`。这条表管的是**叶子**（值位标识符），把它算成 `UndefinedKeyword`
  // 会同时记「多出 `UndefinedKeyword` 147 + 缺 `Identifier` 一大片」。
  // 类型位那一边由 `PRIMITIVE_TYPE_KIND` 负责（那里面有 `undefined` ✓）。
  return "Identifier";
```

# method tokenKind:(text:string)=>string

```ts
  return TOKEN_KIND.get(text) ?? text;
```

# private const LITERAL_TYPE_KEYWORDS:Set<string> = new Set(["null", "true", "false"])

**类型位要套 `LiteralType` 的三个词**（见 `projectTypeExpression` 里那一支）。

`undefined` 刻意不在里面：TS 的 `undefined | null` 是 `UndefinedKeyword` + `LiteralType > NullKeyword`
——两个词长得一样，形状却不同（这是 TS 自己的口径，不是本工程的取舍）。

# private const PRIMITIVE_TYPE_KIND:Map<string, string>

**原始类型**名 → `SyntaxKind` 名。

它在 TS 那边**不是** `TypeReference`（见 `projectTypeDefine` 的说明）。
这张表与 `KEYWORD_KIND` 有重叠，但**语义不同**：`KEYWORD_KIND` 管的是
「产物把它标成 `<Keyword>` 了」，这张表管的是「**在类型位上**该叫这个名字」——
而产物在类型位把 `string` 标成的是 `<Identifier>`（实测 `x: string` 里 `string` 是 `Identifier`）。

```ts
new Map([
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
])
```

# private method fieldNameFor:(kind:string, key:string)=>string

```ts
  const table = FIELD_BY_KIND.get(kind);
  return table?.get(key) ?? key;
```

# private method wrapperTarget:(node:any)=>string | null

这个子节点是不是**包装**（该把内容提上去），是的话返回到哪个字段。

比纯查表多一条判断：`GenericType` **只有在装 `TypeParameter` 时**才是类型参数段
（`<T, U>` 的括号段），此时它是包装；装类型实参时（`Array<T>`）它是**真的节点**，
得投成 `TypeReference`。不作这个区分就会把类型实参整个提掉——
那种错误在尺子上表现为「凭空少一片节点」。

```ts
  const type = node.get("type");
  if (type === "GenericType") {
    const hasParameter = allKids(view(node)).some((k) => k.get("type") === "TypeParameter");
    return hasParameter ? "typeParameters" : undefined;
  }
  return WRAPPER_FIELDS.get(type);
```

# private const startOf:(node:any)=>int = (node) => (node.get("range") ? node.get("range")[0] : 0)

# private const endOf:(node:any)=>int = (node) => (node.get("range") ? node.get("range")[1] + 1 : 0)

# private method astNode:(kind:string, props:any, v:any, ctx:any)=>any

**造一个投影节点**：`pos` 取视图的起点，`end` 由 `stmtEndOf` 剪掉尾部 trivia，
没有函数体的可调用签名再带上尾随分号。

这是 `projectNode` 里那个 `mk` 的**唯一实现**（`mk` 现在只是转调它）：逐节点出口
（token 自己的 `PrintAst`）与通用支**必须是同一份坐标口径**，否则两条路的坐标会悄悄漂开——
而这只会在 `cases:tsast` 的百分比上表现出来，看不出根因。

`props` 为 `undefined` 时只出 `{ kind, pos, end }`（自闭合那一类节点，例如 `EndOfFileToken`）。

```ts
  let end = stmtEndOf(v, ctx);
  if (SIGNATURE_KINDS.has(kind) && ctx.source[end] === ";") end += 1;
  return Object.assign({ kind }, props === undefined ? {} : props, { pos: v.start, end });
```

# private method astMembers:(v:any, parentKind:string, ctx:any)=>Array<any>

**类型容器的成员表**：把这一格的子单元按 `parentKind` 的分隔符切好后，**逐段整段投**
（切分规则见 `TYPE_MEMBER_SEPARATORS` / `typeMemberGroups`）。

它与通用支里 `projectEachIn` 的类型容器那一支**是同一套实现**——所以「token 自己出这一格」
与「交回通用支」的产物逐字节相同（第 77 轮的验收判据就是全语料逐字节对拍）。

```ts
  const out = [];
  for (const group of typeMemberGroups(kidsOf(v, "children"), parentKind, ctx)) {
    const projected = projectTypeExpression(group, ctx);
    if (projected !== undefined) out.push(projected);
  }
  return out;
```

# method projectNode:(node:any, ctx:any, parentKind:string)=>any

---------------------------------------------------------------------------

投影

---------------------------------------------------------------------------

一个产物节点 → 一个 TS 形状节点。

`parentKind` 是**投影意义上的父 kind**（不是产物树里的父亲）——只有
「同一套产物标签在两个上下文里叫两种名字」的那几处要问它：
现在只有一处，类体里的 `constructor` 是 `ConstructorDeclaration` 而不是 `MethodSignature`。
取值由 `structuralProps` 在摊平包装体时往下传（`ClassBody` 的成员拿到的是 `ClassDeclaration`）。

```ts
  if (!(node instanceof Map)) return undefined;
  const v = view(node);
  ctx.count++;
  // **先问这个节点自己**（第 77 轮）：`__token` 是 `WithRangeOf` 补坐标时记下的、
  // 产出这一格的那个 token（见 `core/syntax/token.xl.md` 的 `PrintAst`）。
  // 它覆写了 `PrintAst` 就由它自己出这一格——出口因此是**逐节点**的，而不是一张中央表说了算；
  // 没覆写（基类返回 `undefined`）就落到下面这份通用支：换名表 + 提层 + 字段名。
  const owner = node.__token;
  if (owner !== undefined) {
    const own = owner.PrintAst(ctx, v);
    if (own !== undefined) return own;
  }
  // **尾部 trivia 一律剪掉**：TS 的节点 `end` **从不含尾部 trivia**，而本工程的区间常常含
  // （语句行尾的软换行、正则字面量后面的换行…）。第 23 轮只修了语句族，实测还漏着
  // 正则（`Δ1`）等零散几类——所以这里**不再按 kind 白名单**，改成统一剪：
  // 往回吃掉空白即可，节点里不会有一类「合法地以空白结尾」的情况。
  //
  // 反过来，**没有函数体的可调用签名要带上尾随分号**：`declare function f(): void;` 的 TS 是
  // `FunctionDeclaration[23,51)`（含 `;`），而产物那个 `Function` 到 `void` 就结束了——
  // 分号是它的平级兄弟。真实语料里 `FunctionDeclaration` 缺的近两千处基本是这一条。
  const mk = (kind, props) => {
    return astNode(kind, props, v, ctx);
  };
  // **父 kind**：少数几处「同一个产物标签按上下文换 kind」要问它
  // （类里的 `constructor` 是 `ConstructorDeclaration`）。它由 `structuralProps`
  // 在摊平包装体时显式往下传——不是从产物树的父亲读的。
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

    // **成员访问链**：token 层折出来的容器（`a.b` / `a.b(1)` / `f(1).x`）。
    // 形状交给 `projectExpression` 的折链那一支——它按左结合折成嵌套的
    // `PropertyAccessExpression`、链尾是调用时折成 `CallExpression`。
    case "PropertyAccess":
      return projectExpression(projectableKids(v), ctx);

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

    // 类型位的导入类型 `import("m").A` / `typeof import("m")`（第 76 轮）：
    // TS 那边 `argument` 是一层 `LiteralType`、`qualifier` 是限定名，两样都要切出来。
    case "ImportType":
      return projectImportType(v, ctx);

    // `infer X`：TS 那边只有一个 `typeParameter` 子字段，`infer` 那个词**不是**子节点。
    case "InferType":
      return projectInferType(v, ctx);

    // 下标访问类型 `A[K]`：TS 那边是 `objectType` + `indexType` 两个具名字段。
    case "IndexedAccessType":
      return projectIndexedAccessType(v, ctx);

    case "TypeAssign":
      return projectTypeAlias(v, ctx);

    case "Parameter":
    case "LamdaParameter":
      return projectParameter(v, ctx);

    // 索引签名 `{ [k: string]: T }`：TS 那边是 `parameters` + `type`（+ `readonly` 修饰词），
    // 产物那边是一串平级子单元，照通用投影会全塞进一个 `children`。
    case "IndexSignature":
      return projectIndexSignature(v, ctx);

    // 值位对象字面量 `{ a: 1, b, [k]: 2, ...rest, m() {} }`：TS 的 `properties` 是**成员数组**，
    // 产物那边是一串平级单元（照通用投影会把每个标点都当成一个属性）。
    case "ObjectLiteral":
      return projectObjectLiteral(v, ctx);

    case "ArrayLiteral":
      return projectArrayLiteral(v, ctx);

    // 类型查询 `typeof X`：TS 那边 `exprName` **只有名字**（`typeof` 是属性、不是子节点），
    // 产物那边它是 `[Keyword(typeof), Identifier(X)]` 两个平级单元——照通用投影会把
    // `TypeOfKeyword` 也塞进 `exprName`。
    // 非空断言 `x!`：TS 的 `NonNullExpression` 只有 `expression` 一个子字段——
    // `!` 那个词是节点的属性（`exclamationToken`），`forEachChild` 不访问它
    // （实测「多出来」里 `ExclamationToken` 350 个全是它）。
    //
    // **这里的 `case` 是产物标签，不是 TS 的 kind**（踩过一回）：产物标签是 `NotNull`，
    // `NonNullExpression` 是 `KIND_BY_TAG` 给它的**投出**名字——写成后者时这一支永远不命中，
    // 而那 350 个 `ExclamationToken` 一个都不会少。
    case "NotNull":
      return projectNonNullExpression(v, ctx);

    // 类型运算符 `keyof T` / `readonly T[]` / `unique symbol`：TS 那边那个词是节点的**属性**
    // （`operator`），`forEachChild` 只看 `type` 一个子字段。
    case "TypeOperator":
      return projectTypeOperator(v, ctx);

    // 映射类型 `{ [P in keyof T]-?: T[P] }`：TS 的子字段是
    // `readonlyToken` / `typeParameter` / `questionToken` / `type`。
    case "MappedType":
      return projectMappedType(v, ctx);

    // 继承段 `extends A, B` / `implements C`：TS 那边 `forEachChild` **只访问 `types`**——
    // `extends` / `implements` 那个词是节点的**属性**（`token`），不是子节点。
    case "HeritageClause":
      return projectHeritageClause(v, ctx);

    case "TypeQuery":
      return projectTypeQuery(v, ctx);

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

    case "IfSet":
      return projectIfSet(v, ctx);

    case "LogicalOperator":
      return projectLogical(v, ctx);

    case "Signature":
      return projectSignature(v, ctx);

    case "TypePredicate":
      return projectTypePredicate(v, ctx);

    case "Field":
      return projectField(v, ctx);

    case "EnumMember":
      return projectEnumMember(v, ctx);

    case "Lamda":
      return projectLamda(v, ctx);

    // **具名元组成员**与 **try 语句**走各自的投影（第 93 轮）：两者在 TS 那边都有
    // 「产物里不存在的壳」，通用投影投不对（具名元素的名字会被当成类型、
    // try 的三段会原样透传成 `body` / `catches` / `finally`）。
    case "NamedTupleMember":
      return projectNamedTupleMember(v, ctx);

    case "Try":
      return projectTry(v, ctx);

    // **类静态块**（`class A { static { … } }`，第 93 轮）：TS 是
    // `ClassStaticBlockDeclaration > body: Block`，而产物是 `StaticBlock > Statement*`
    // （体括号那层壳不在树里，`Block` 要自己造）——照通用投影只有 `children`、
    // 缺整个 `Block`（实测缺 `Block` + 字段名差）。
    case "StaticBlock":
      return projectStaticBlock(v, ctx);

    // **`for` 语句**（第 93 轮）：四个段在 TS 那边是 `initializer` / `condition` /
    // `incrementor` / `statement`，其中头三段是**表达式位**（照通用投影会逐个单元投，
    // `i < j` 会散成三个节点）、空体段在 `ToList` 里**是空数组**（空 `Block` 要自己造）。
    case "For":
      return projectFor(v, ctx);

    // **`new` 表达式**（第 95 轮）：产物的 `name` 段是**一串单元**（名字 + 类型实参段），
    // 照通用投影会把它们一起投成 `expression`（实测 `NewExpression` 字段名差 19 +
    // 多出一个 `TypeReference` 盖住 `<string, number>`）。
    case "New":
      return projectNew(v, ctx);

    // **装饰器**（第 95 轮）：TS 的 `Decorator` 只有 `expression` 一个字段
    // （`@Component({…})` 是 `CallExpression`、`@plain` 是 `Identifier`），
    // 而产物给的是 `name` + `children`（连 `@` 那个符号都在里面）。
    case "Decorator":
      return projectDecorator(v, ctx);

    // **可变长 / 可选类型**（`...A` / `B?`，第 95 轮）：TS 的字段是 `type`、
    // 两点号与问号**都不是子节点**；照通用投影它们会进 `children`
    // （实测字段名差 13 + 多出 `DotDotDotToken` / `QuestionToken`）。
    case "RestType":
      return projectWrappedType(v, ctx, "RestType");

    case "OptionalType":
      return projectWrappedType(v, ctx, "OptionalType");

    default: {
      let kind = KIND_BY_TAG.get(v.type);
      if (kind === undefined) {
        ctx.unmapped.add(v.type);
        return mk(v.type, { children: projectEach(allKids(v), ctx) });
      }
      // **接口 / 类型字面量里的方法声明是 `MethodSignature`**（类里才是 `MethodDeclaration`）；
      // **类里那个叫 `constructor` 的是 `ConstructorDeclaration`**（另一个 kind、没有名字字段）——
      // 两处都是「同一个产物标签、按上下文换 kind」（真实语料 `Constructor` 缺 269，全挂在 `ClassDeclaration` 下）。
      if (ctx.signature && v.type === "MethodDeclaration") kind = "MethodSignature";
      else if (
        v.type === "MethodDeclaration" &&
        parentKind === "ClassDeclaration" &&
        v.attrs.get("name") === "constructor"
      ) {
        // **判据是 `name` 属性、不是 `textOf`**：方法单元自己没有 `value`，
        // `textOf` 会退回 `source.slice(v.start, v.end)`（那是整段方法体，不是名字）。
        //
        // kind 名是 **`Constructor`**（`ts.SyntaxKind[177]` 印出来就是 `Constructor`；
        // `ConstructorDeclaration` 在这个 TypeScript 里是 `undefined`——按后者投，
        // 尺子上 269 处构造签名会一直算作「缺 `Constructor`」）。
        kind = "Constructor";
      }
      // **取值器 / 设值器**（`get x(): A { … }` / `set x(v) { … }`，第 93 轮）：
      // 产物把 `get` / `set` 记成 `modifiers="get"`，而 TS 那边 **kind 自己**就说明了是哪一个，
      // `get` / `set` **不是修饰词节点**——照 `modifiers` 投会多出 `GetKeyword` / `SetKeyword`
      // （实测多出 102 + 缺 `GetAccessor` / `SetAccessor`）。所以换 kind 并把那个词从修饰词里摘掉。
      let stripModifier;
      if (v.type === "MethodDeclaration") {
        const words = String(v.attrs.get("modifiers") ?? "").split(",");
        if (words.includes("get")) {
          kind = "GetAccessor";
          stripModifier = "GetKeyword";
        } else if (words.includes("set")) {
          kind = "SetAccessor";
          stripModifier = "SetKeyword";
        }
      }
      const props = structuralProps(v, kind, ctx);
      if (stripModifier !== undefined && Array.isArray(props.modifiers)) {
        props.modifiers = props.modifiers.filter((m) => m.kind !== stripModifier);
      }
      return mk(kind, props);
    }
  }
```

# private const TYPE_MEMBER_KINDS:Set<string>

**类型容器**：它们的子单元**本身也是类型**，所以要以类型位的方式逐个投影
（原始类型名要变成 `StringKeyword` 这类关键字、具名类型要套 `TypeReference`），
不能按普通子节点投。

漏了这一条的后果实测很集中：`"a" | "b" | string` 里的 `string` 出不来 `StringKeyword`、
`any[]` 里的 `any` 出不来 `AnyKeyword`、函数类型的返回类型同理——
真实语料里这三类各占两千上下，都是同一个原因（父节点是 `UnionType` / `ArrayType` / `FunctionType`）。

```ts
new Set([
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
])
```

# private const TYPE_MEMBER_SEPARATORS:Map<string, string>

**成员之间的分隔符**：类型容器的成员表按这个符号切段，**切完再整段投**。

第 76 轮的根因：`projectEachIn` 原来对类型容器的子单元**逐个**投
（`projectTypeExpression([item])`），可产物在类型位把「名字 + 实参」摆成**平级的两格**
（`ArrayLike` 与 `GenericType(<number>)` 是兄弟），于是

    ArrayLike<number> | string
      → TypeReference[7780,7789)      ← 只有名字，实参整片丢掉
        TypeReference[7789,7797)      ← 实参自己成了**另一个**节点（区间是 `<number>`）
        StringKeyword(string)

而 TS 那边是 `UnionType > [TypeReference(ArrayLike<number>)[7780,7797), StringKeyword]`。
同一类根因还压在**限定名**上：`ArrayBuffer | NodeJS.TypedArray` 的点号两边是两个平级单元，
`projectTypeExpression` 里那个限定名循环**一次都进不去**（`QualifiedName` 缺 844 处、
`TypeReference` 漂移 1761 处，实测数字见 README 第 76 轮）。

**只有这三种容器要切**：它们的成员之间**真的有**分隔符。其余容器
（`T[]` / `(A \| B)` / `keyof T` / `A[K]`）的子单元合起来就是**一个**类型，
没有「同级的另一个类型」这回事——那里维持逐个投。

```ts
new Map([
  ["UnionType", "|"],
  ["IntersectionType", "&"],
  ["TupleType", ","],
])
```

# private method typeMemberGroups:(list:Array<any>, parentKind:string, ctx:any)=>Array<Array<any>>

类型容器的一批子单元 → **切好的若干组**（每组是「一个类型」的全部单元）。

分隔符那一格**不进任何一组**：它不是类型的一部分（与 `projectTypeArguments` 切逗号同一口径），
留下的空组（`type A = | B` 的前导 `|`、尾随逗号）由 `filter` 挡掉。

```ts
  const separator = TYPE_MEMBER_SEPARATORS.get(parentKind);
  if (separator === undefined) return list.map((item) => [item]);
  const groups = [];
  let current = [];
  for (const item of list) {
    if (item instanceof Map && item.get("type") === "SymbolToken" && textOfNode(item, ctx) === separator) {
      groups.push(current);
      current = [];
      continue;
    }
    current.push(item);
  }
  groups.push(current);
  return groups.filter((group) => group.length > 0);
```

# private const MEMBER_LIST_KINDS:Set<string>

**成员表的宿主**：它们的内容是**成员**（`PropertySignature` / `MethodSignature` /
`IndexSignatureDeclaration`…），**不是语句**。

第 79 轮的根因：产物在**成员位**多包了一层 `<Statement>`（成员表挂上语句队列之后多出来的那层）——
`type T = { [k: string]: number }`、`declare class C { [k: string]: any }`、
带 `readonly` 的接口成员都是这一形状。照通用投影走，那一层会被补成
**`ExpressionStatement`**，于是索引签名变成 `ExpressionStatement > IndexSignatureDeclaration`
（实测缺 `IndexSignatureDeclaration` 102 处，还凭空多出一批 `ExpressionStatement`）。

```ts
new Set(["InterfaceDeclaration", "TypeLiteral", "ClassDeclaration", "EnumDeclaration"])
```

**`EnumDeclaration` 是第 86 轮补的**：枚举体里也是成员（`EnumMember`），而且**成员之间带 `,`**
（`[EnumMember, ,, EnumMember, ,]`）——不摊开的话那个 `,` 会把成员们折成一个 `BinaryOperator`，
投出来是 `ExpressionStatement > BinaryExpression`（实测「多出来」榜的第一名 `BinaryExpression`
1806 与第二名 `CommaToken` 1158 同源，样本全是 `export enum … { JsxClosingTag = "…", … }`）。

# private const MEMBER_TAGS:Set<string>

**哪些标签算「成员」**：成员位那层 `<Statement>` 只有**全部**由这些标签组成时才摊开。

这一条是实测补的守卫：`samples/generic.ts` 里有一句 `class Foo<T> { let value: T }`
（本工程的样本，不是合法 TS）——成员位的 `<Statement>` 里装的是个 `Let`，
无脑摊开会把它当成成员投出去，而 `projectLet` 那条路本来只服务语句位、容器类型不设防，
当场 `TypeError: node.get is not a function`。**摊开的判据要窄**：

```ts
new Set(["IndexSignature", "Field", "MethodDeclaration", "Signature", "EnumMember"])
```

# private method projectEachIn:(list:Array<any>, ctx:any, parentKind:string)=>Array<any>

投影一批子单元，并在**签名上下文**里切换标记。

接口 / 类型字面量的成员在 TS 那边叫 `PropertySignature` / `MethodSignature`，
而类里的同名成员叫 `PropertyDeclaration` / `MethodDeclaration`——同一个产物标签、
两种上下文两种 kind（声明文件里签名那套是绝大多数）。这个标记就是那个上下文。

```ts
  // **成员位没有语句**（第 79 轮）：成员表里遇到 `<Statement>` 就**摊开**——
  // 它下面那些单元本身就是成员（见 `MEMBER_LIST_KINDS` 的说明）。
  // 摊开放在最前面：它比类型容器那一条更靠外（成员表 vs 类型位）。
  if (MEMBER_LIST_KINDS.has(parentKind)) {
    const flat = [];
    for (const item of list) {
      if (item instanceof Map && item.get("type") === "Statement") {
        const inner = allKids(view(item)).filter((k) => !INVISIBLE.has(k.get("type")));
        // **只有整层都是成员才摊开**（见 `MEMBER_TAGS`）：`interface` / `type` / `class`
        // 的成员位在 TS 里放不下语句，可本工程自己的样本里出现过 `{ let value: T }` 这种写法。
        // **成员之间的 `,` 不算内容**（第 86 轮）：枚举体的那一层 `Statement` 里是
        // `[EnumMember, SymbolToken(,), EnumMember, …]`——`every` 不认逗号的话枚举永远摊不开，
        // 于是一个 `,` 把成员们折成 `BinaryOperator`、投成 `ExpressionStatement > BinaryExpression`。
        if (
          inner.length > 0 &&
          inner.every(
            (k) =>
              MEMBER_TAGS.has(k.get("type")) ||
              (k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ","),
          )
        ) {
          for (const one of inner) flat.push(one);
          continue;
        }
      }
      flat.push(item);
    }
    list = flat;
  }
  // 类型容器的子单元按**类型位**投（见 `TYPE_MEMBER_KINDS`），
  // 而且**按成员切好再投**（见 `TYPE_MEMBER_SEPARATORS` / `typeMemberGroups`）——
  // 逐个投会把 `ArrayLike<number>` / `NodeJS.TypedArray` 这类「一对多格」的写法拆散。
  if (TYPE_MEMBER_KINDS.has(parentKind)) {
    const out = [];
    for (const group of typeMemberGroups(list, parentKind, ctx)) {
      const projected = projectTypeExpression(group, ctx);
      if (projected !== undefined) out.push(projected);
    }
    return out;
  }
  const signature = parentKind === "InterfaceDeclaration" || parentKind === "TypeLiteral";
  if (!signature) return projectEach(list, ctx, parentKind);
  const saved = ctx.signature;
  ctx.signature = true;
  try {
    return projectEach(list, ctx, parentKind);
  } finally {
    ctx.signature = saved;
  }
```

# private method projectEach:(list:Array<any>, ctx:any, parentKind:string)=>Array<any>

```ts
  // **顶层逗号是分隔符，不是 TS 的语义子节点**（第 84 轮）：TS 的 `parameters` / `arguments` /
  // `elements` / `properties` / `types` 里都**没有**逗号子节点（逗号**运算符**是另一回事——
  // 那种早被 token 层折成 `BinaryOperator op=","`、走 `projectBinary` 那条路，不经过这里）。
  // 实测「投影后多出来的节点」里 `CommaToken` 占 **18568 个**（第一名），全是各处平级列表漏掉的。
  if (Array.isArray(list) === false) return [];
  const out = [];
  // **顶层逗号是分隔符，不是 TS 的语义子节点**（第 84 轮）：TS 的 `parameters` / `arguments` /
  // `elements` / `properties` / `types` 里都**没有**逗号子节点（逗号**运算符**是另一回事——
  // 那种早被 token 层折成 `BinaryOperator op=","`、走 `projectBinary` 那条路，不经过这里）。
  // 实测「投影后多出来的节点」里 `CommaToken` 占 **18568 个**（第一名），全是各处平级列表漏掉的。
  const items = list.filter(
    (item) =>
      item instanceof Map &&
      !INVISIBLE.has(item.get("type")) &&
      !(item.get("type") === "SymbolToken" && textOfNode(item, ctx) === ","),
  );
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
      const statement = j < items.length ? projectNode(items[j], ctx, parentKind) : undefined;
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
    const projected = projectNode(items[i], ctx, parentKind);
    if (projected !== undefined) out.push(projected);
    i++;
  }
  return out;
```

# private method labeled:(labelUnit:any, statement:any, ctx:any)=>any

一个标签 + 它标的语句 → `LabeledStatement`。

标签名那个 `Identifier` 的区间**不含冒号**：产物给的是 `Label[0,5]`（盖住 `outer:`），
而 TS 的 `Identifier(outer)` 是 `[0,5)`——所以按**名字宽度**切，不从标签单元直接抄。

```ts
  const text = String(labelUnit.get("label") ?? "");
  const at = startOf(labelUnit);
  return {
    kind: "LabeledStatement",
    label: { kind: "Identifier", text, pos: at, end: at + text.length },
    statement,
    pos: at,
    end: statement.end,
  };
```

# private method stmtEndOf:(v:any, ctx:any)=>int

语句的**投影终点**：把尾部的 trivia（换行 / 空白）剪掉。

本工程的语句区间**含尾部的换行**（ASI 断句时那一行软换行算在语句里），
而 TS 的语句**从不含尾部 trivia**——实测 `A.x = 1`（无分号，下一行是 `}`）：
产物给 `[82,90)`，TS 的 `ExpressionStatement` 是 `[82,89)`，差的就是那个换行符。

注意**不能顺手剪分号**：TS 的语句是**含**分号的（`x = 1;` ⇒ `ExpressionStatement[0,6)`），
分号的归属只在 `let` 那三层的**内两层**上另有口径（见 `projectLet`）。

```ts
  let end = v.end;
  while (end > v.start && /\s/.test(ctx.source[end - 1])) end--;
  return end;
```

# private method stmtLike:(kind:string)=>bool

这个 kind 是不是**语句族**（要剪尾部 trivia 的那些）。

语句族的共同点：它们在 TS 那边都由「一行/一段语句」构成、**从不含尾部 trivia**。
`Block` / `ModuleBlock` 是块（右花括号之后不会有 trivia 归它），也一并剪。

```ts
  return kind.endsWith("Statement") || kind === "Block" || kind === "ModuleBlock";
```

# private const KEYWORD_STATEMENT_KINDS:Map<string, string>

头部那个 `Keyword` 决定整条语句是什么（TS 那边的 kind，以及值挂在哪个字段上）。

这一族在产物里是**一个 `Keyword` 加一段平级兄弟**（`return a + b` ⇒ `Keyword(return)` + `BinaryOperator`），
而 TS 是**一个语句节点包住表达式**。早先它们一律掉进 `ExpressionStatement` 分支、
只投影第一个单元，于是「头一个 `Keyword` 变成 Identifier、后面整段子树消失」——
真实语料 `ReturnStatement` 缺 1722 处，连带里面的 `BinaryExpression` / `CallExpression` /
`Identifier` 一起缺（第 34 轮修的）。

```ts
new Map([
  ["return", "ReturnStatement"],
  ["throw", "ThrowStatement"],
  ["break", "BreakStatement"],
  ["continue", "ContinueStatement"],
  ["debugger", "DebuggerStatement"],
])
```

# private const KEYWORD_STATEMENT_EXPRESSION:Set<string> = new Set(["ReturnStatement", "ThrowStatement"])

# private const STATEMENT_KINDS:Set<string>

这些 kind 在 TS 那边**本身就是语句**——单个子单元是它们时不能再套 `ExpressionStatement`。

反过来，单个子单元是**表达式**（`f(1)` / `a + b` / `new X`）时，TS 是
`ExpressionStatement > 表达式`；早先直接返回那个表达式，于是每个这样的语句都少一层壳。

```ts
new Set([
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
])
```

# private method projectStatement:(v:any, ctx:any)=>any

```ts
  const kids = projectableKids(v);
  // **只有注释的语句不是语句**：`// xl:expect …` 这样的行在本工程是一层 `Statement`
  // 包着一个注释单元，而 TS 那边注释是 **trivia**、`forEachChild` 完全看不见它。
  // 早先这里退回一个 `ExpressionStatement`，于是每份用例文件都凭空多两个节点
  // （顶层 `pos=0` 的 `ExpressionStatement`），连 `SourceFile.getStart()` 都被带歪。
  if (kids.length === 0) return undefined;
  const head = kids[0];
  const headType = head.get("type");
  // **`export = X` / `export default X`**：产物那边表达式是 `Export` 单元的**平级兄弟**
  // （`Statement > [Export(export/=), 表达式]`），所以整条语句要交给 `projectExport`。
  //
  // **`kids.length >= 1`，不是 `> 1`**（第 87 轮修）：具名导出 `export { a as b }` 的语句里
  // 只有 `Export` **一个**单元（`{…}` 在它里面），`> 1` 的判据把它漏给了通用投影——
  // 于是括号里每个单元（含 `as` / `type` 两个词）都成了平级子节点，
  // 而 `ExportSpecifier` 一个也没投出来。
  if (headType === "Export" && kids.length >= 1) {
    return projectExport(head, ctx, kids.slice(1));
  }
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
  // `head` 是不是名字上的**类型别名**（`TypeAssign`，`export type T = …` 的外壳还是 `Statement`）。
  if (kids.length === 1) {
    const kind = KIND_BY_TAG.get(headType);
    if (kind !== undefined) {
      // **`export type T = …` 的 `pos` 在外层 `Statement` 上、修饰词在 `TypeAssign` 上**：
      // 起点取外层的 `v.start`，所以这里把外层起点递给 `projectTypeAlias`。
      const projected =
        headType === "TypeAssign" ? projectTypeAlias(view(head), ctx, v.start) : projectNode(head, ctx);
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
```

# private method isOperatorUnit:(node:any, ctx:any)=>bool

这个单元能不能当**运算符**。

绝大多数运算符是 `SymbolToken`，但 **`in` / `instanceof` 是 `Keyword`**——
只认 `SymbolToken` 时会整类丢两侧操作数（实测 `x in o` 只剩一个 `operatorToken`，
真实语料 1118 处「产物只有 operatorToken、TS 有 left/right」都是这一条）。

```ts
  const type = node.get("type");
  if (type === "SymbolToken") return true;
  return type === "Keyword" && ["in", "instanceof"].includes(textOfNode(node, ctx));
```

# private method projectExpression:(kids:Array<any>, ctx:any)=>any

一串单元 → 一个表达式。

四种折叠，按优先级从高到低：

1. **链**（成员访问与下标访问混排）`a.b.c` / `a[i].b` ⇒ **左结合的嵌套**
   （`PropertyAccessExpression` / `ElementAccessExpression`）。产物那边链是一个
   `PropertyAccess` 单元、子单元按原文顺序排；早先这里按「找第一个标点当运算符」处理，
   于是 `.` 被当成了二元运算符、折出一个 `BinaryExpression`：**heads 和 tails 两头都错**
   （TS 既没有那个 `BinaryExpression`，也没有 `.` 这个运算符节点）。
2. **二元 / 赋值** ⇒ `BinaryExpression`（`x = 1` / `a + b`）。
3. **后缀下标**（链没成形、只有平级两格时）⇒ `ElementAccessExpression`。
4. 单个单元 ⇒ 直接投影。

```ts
  if (kids.length === 0) return undefined;
  // **值位括号 `(expr)`**（第 81 轮）：TS 那边是 `ParenthesizedExpression`（区间含那对括号、
  // `expression` 是里面那段），产物那边就是一个 `(` 括号单元。
  //
  // 判据能这么简单（只认「一个 `(` 括号」），是因为**实参表 / 形参表 / 类型括号不会走到这里**：
  // 那些括号的父单元是 `Method` / `Function` / `Lamda` / `Signature` / 类型容器，
  // 由各自的投影路径摊平；`projectExpression` 收到的单元一律是**操作数**。
  if (kids.length === 1 && kids[0].get("type") === "Bracket" && kids[0].get("startBracket") === "(") {
    const inner = projectableKids(view(kids[0]));
    return {
      kind: "ParenthesizedExpression",
      expression: inner.length > 0 ? projectExpression(inner, ctx) : undefined,
      pos: startOf(kids[0]),
      end: endOf(kids[0]),
    };
  }
  if (kids.length === 1) return projectNode(kids[0], ctx);
  const isSymbol = (k, text) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === text;

  // ---- 1. 链（成员访问与下标访问混排，**从左边开始折**） ----
  //
  // 产物那边链是一个 `PropertyAccess` 单元，子单元**按原文顺序**排：
  //
  //   `a.b.c`      → [a, ., b, ., c]
  //   `a.b(1).c`   → [a, ., Method(b(1)), ., c]
  //   `a[i]`       → [a, Bracket[i]]            （第 80 轮：下标进链）
  //   `a[i].b`     → [a, Bracket[i], ., b]
  //
  // TS 那边是**左结合的嵌套**，所以这里顺着走、折一层套一层。
  // **第 70 轮**：token 层新增了 `PropertyAccess`（成员访问链在 token 层就折成一个单元），
  // 所以这里的两条输入路径都要认——`PropertyAccess` 单元走同一个递归（见 `projectNode`），
  // 而**值位里散着的平铺链**（类型位、`?.` 让路之后的残留）仍走这一支。
  if (kids.length >= 2 && (isSymbol(kids[1], ".") || isIndexBracket(kids[1]))) {
    // **嵌套的链要摊平**（第 86 轮）：产物偶尔把**一整条链**塞进另一条链的成员位——
    // `this.Parent!.Data.splice(1, 2)` 实测是
    // `[NotNull(this.Parent), ., PropertyAccess([Data, ., Method(splice)])]`，
    // 而 TS 那边是**左结合**的 `((this.Parent!).Data).splice(1, 2)`。
    // 不摊平的话那一格会走「成员名」那一支、投成一个盖住整段的 `Identifier`
    // （实测 `Data.splice(1, 2)` 成了名字，`splice` 那次调用也丢了）。
    const ck = [];
    for (let at = 0; at < kids.length; at++) {
      const k = kids[at];
      if (k.get("type") === "PropertyAccess" && at > 0 && isSymbol(kids[at - 1], ".")) {
        for (const inner of projectableKids(view(k))) ck.push(inner);
        continue;
      }
      ck.push(k);
    }
    let left = projectNode(ck[0], ctx);
    let i = 1;
    while (i < ck.length) {
      // **下标链接**：`a[i]` → `ElementAccessExpression`（第 80 轮）。
      if (isIndexBracket(ck[i])) {
        const argument = projectExpression(projectableKids(view(ck[i])), ctx);
        left = {
          kind: "ElementAccessExpression",
          expression: left,
          argumentExpression: argument,
          pos: left.pos,
          end: endOf(ck[i]),
        };
        i += 1;
        continue;
      }
      if (!isSymbol(ck[i], ".") || i + 1 >= ck.length) break;
      const next = ck[i + 1];
      if (next.get("type") === "Method") {
        // `console.log(1)` 的产物是 `[console, ., Method(name="log")]`——
        // 那个 `Method` 盖住的是 `log(1)`，而**名字**只占开头的几个字符，
        // 所以这里按名字宽度切一段 `Identifier` 出来（TS 的 `Identifier(log)` 正是这一段）。
        const name = String(next.get("name") ?? "");
        const at = startOf(next);
        const member = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
          pos: left.pos,
          end: at + name.length,
        };
        // 链尾是一次调用：把 `CallExpression` 的被调用者换成折好的点号链
        // （TS 的 `console.log(1)` 是 `CallExpression > PropertyAccessExpression > …`）。
        //
        // **折完继续走**（第 70 轮修）：`CjcliHost.Fs().readFileSync(p)` 的中间那次调用
        // 之后再取成员仍属同一条链——原来这里 `break`，于是链被截成两段、
        // 外层那次调用整个丢掉（实测 `CallExpression` 缺 1263 里的最大一块）。
        const call = projectNode(next, ctx);
        left = Object.assign({}, call, { expression: member, pos: member.pos });
        i += 2;
        continue;
      }
      // 成员名**永远是 `Identifier`**（TS 那边 `a.import` / `a.new` 的 `name` 就是一个
      // 文本为那个词的 `Identifier`，不是 `ImportKeyword`）：产物那边它可能已经被
      // `KeywordReorganization` 升级成 `<Keyword>`，所以这里按**名字宽度**切一段，
      // 而不是把那个词按词法身份投出来。
      left = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: nameOf(next, ctx),
        pos: left.pos,
        end: endOf(next),
      };
      i += 2;
    }
    if (i >= ck.length) return left;
    return foldBinaryFrom(left, ck.slice(i), ctx);
  }
  // ---- 2. 二元 / 赋值 ----
  //
  // **切在优先级最低的那个运算符上**（第 88 轮）：`x && y || z` 的 TS 是 `(x && y) || z`，
  // 按**第一个**运算符切会得到 `x && (y || z)` ✗（优先级反了）。同级取**最左**（左结合）。
  // 实测这一族是「多出来」与「漂移」两榜的最大来源（`BinaryExpression` 654 / 657）。
  let opIndex = -1;
  let bestRank = 999;
  for (let i = 1; i < kids.length - 1; i++) {
    if (!isOperatorUnit(kids[i], ctx)) continue;
    const rank = operatorRank(textOfNode(kids[i], ctx));
    if (rank < bestRank) {
      bestRank = rank;
      opIndex = i;
    }
  }
  if (opIndex > 0) {
    return foldBinaryFrom(projectExpression(kids.slice(0, opIndex), ctx), kids.slice(opIndex), ctx);
  }
  // ---- 3. 下标访问 `a[i]`（第 79 轮）----
  //
  // **必须排在二元切分之后**（踩过）：`a = b[i]` 里 `[]` 绑得比 `=` 紧，先折会把整条赋值
  // 当成下标表达式（`ElementAccessExpression.expression` 成了 `BinaryExpression`）。
  // 二元切分先走，递归到 `[b, [i]]` 这一段时再折，优先级才对。
  //
  // 产物那边下标访问是**平级的两格**（`Identifier(b)` + `[` 括号），TS 那边是
  // `ElementAccessExpression > [expression, argumentExpression]`。缺这一支的后果：
  // `ElementAccessExpression` 整类缺 300 处，而且**右操作数会在括号处截断**
  // （`options.Output = args[index + 1]` 的区间止于 `args`）。
  //
  // 判据是**末尾那一格是 `[` 括号**：值位里前面有操作数的 `[` 就是下标
  // （没有操作数的由 `json/array-literal.xl.md` 收成 `ArrayLiteral`，到不了这里；
  // 类型位的 `T[K]` 是 `IndexedAccessType` 单元，也到不了这里）。
  // 递归写法顺带覆盖 `a[i][j]` 与 `f(a)[0]`：先折前面那段，再套一层。
  if (kids.length >= 2 && isIndexBracket(kids[kids.length - 1])) {
    const bracket = kids[kids.length - 1];
    const base = projectExpression(kids.slice(0, kids.length - 1), ctx);
    const argument = projectExpression(projectableKids(view(bracket)), ctx);
    return {
      kind: "ElementAccessExpression",
      expression: base,
      argumentExpression: argument,
      pos: base.pos,
      end: endOf(bracket),
    };
  }
  return projectNode(kids[0], ctx);
```

# private method foldBinaryFrom:(left:any, rest:Array<any>, ctx:any)=>any

从 `left` 起、把 `rest`（以运算符开头、`[op, 操作数, op, 操作数, …]`）折成 `BinaryExpression`。

**结合性按 TS**（第 88 轮）：**赋值是右结合**（`a = b = c` ⇒ `a = (b = c)`），
**其余二元运算符是左结合**（`a && b && c` ⇒ `(a && b) && c`）。原来一律右结合，
于是整条链的区间一路撑到最后一个操作数——实测 `DRIFT: BinaryExpression` 657 与
「多出来」654 全是这一族（`error !== null && error !== undefined && …` 那种四段逻辑链，
产物的四个节点起点是四个操作数，而 TS 的四个节点**都从第一个操作数起**、终点逐个增长）。

左结合那一支折的时候，每一段的右操作数**取到下一个同级（或更低优先级）运算符为止**——
更高优先级的那些（`a || b && c` 里的 `&&`）留给 `projectExpression` 自己切。

```ts
  if (rest.length < 2 || rest[0].get("type") !== "SymbolToken") return left;
  const firstRank = operatorRank(textOfNode(rest[0], ctx));
  if (firstRank === 0) {
    // 赋值：右结合，交给递归。
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
  let node = left;
  let i = 0;
  while (i + 1 < rest.length) {
    const op = rest[i];
    if (op.get("type") !== "SymbolToken") break;
    const rank = operatorRank(textOfNode(op, ctx));
    // 下一个「同级或更低优先级」的运算符就是这一段的终点。
    let stop = rest.length;
    for (let k = i + 1; k < rest.length; k++) {
      if (rest[k].get("type") === "SymbolToken" && isOperatorUnit(rest[k], ctx) && operatorRank(textOfNode(rest[k], ctx)) <= rank) {
        stop = k;
        break;
      }
    }
    const right = projectExpression(rest.slice(i + 1, stop), ctx);
    node = {
      kind: "BinaryExpression",
      left: node,
      operatorToken: projectNode(op, ctx),
      right,
      pos: node.pos,
      end: right ? right.end : endOf(op),
    };
    i = stop;
  }
  return node;
```

# private method operatorRank:(text:string)=>int

运算符的优先级（**数字越小越松**），结合性靠 `foldBinaryFrom` 分「赋值 / 其余」两支。

这一份是 `projectExpression` 切分二元表达式的依据：**先切优先级最低的**、
同级取最左（左结合）。赋值也是 0，但 `foldBinaryFrom` 会把它当右结合处理。

```ts
  if (text === ",") return -1;
  if (
    text === "=" ||
    text === "+=" ||
    text === "-=" ||
    text === "*=" ||
    text === "/=" ||
    text === "%=" ||
    text === "**=" ||
    text === "<<=" ||
    text === ">>=" ||
    text === ">>>=" ||
    text === "&=" ||
    text === "|=" ||
    text === "^=" ||
    text === "&&=" ||
    text === "||=" ||
    text === "??="
  ) {
    return 0;
  }
  if (text === "||" || text === "??") return 1;
  if (text === "&&") return 2;
  if (text === "|") return 3;
  if (text === "^") return 4;
  if (text === "&") return 5;
  if (text === "==" || text === "!=" || text === "===" || text === "!==") return 6;
  if (text === "<<" || text === ">>" || text === ">>>") return 8;
  if (text === "+" || text === "-") return 9;
  if (text === "*" || text === "/" || text === "%") return 10;
  if (text === "**") return 11;
  // `<` / `>` / `in` / `instanceof` / `as` / `satisfies` 那一档（也是这一族里最常见的一档）。
  return 7;
```

# private method isIndexBracket:(node:any)=>bool

**值位下标访问的那对方括号**：`a[i]` 的 `[` 括号单元。

判据只有「是不是 `[` 括号」——值位里前面有操作数的 `[` 就是下标（见 `projectExpression`
那一支的说明），没有操作数的那些早被 `ArrayLiteral` 收走，类型位的那些是 `IndexedAccessType`。
（与 `isDot` / `isNameNode` 那几个小判据同一个位置。）

```ts
  return node.get("type") === "Bracket" && node.get("startBracket") === "[";
```

# private method projectLet:(v:any, ctx:any)=>Array<any>

`let` / `const` / `var` 声明 → **TS 的三层**。

两个坐标细节（都是实测出来的）：

- `VariableDeclaration`（声明本身）从**名字**开始，不含前面的 `let `/`const `——
  TS 的 `getStart()` 跳过前导 trivia，而本工程的 `Let` 把修饰词包在区间里；
- `VariableDeclarationList` / `VariableStatement`（两层壳）从 `let` 那个词开始。

```ts
  const kids = projectableKids(v);
  // **`fieldName` / `modifiers` 在 `Let` 子单元上，不在外层 `Statement` 上**（踩过）：
  // 顶层形态是 `Statement > [Let(``const f``), SymbolToken(=), 初始化式]`，
  // 而 `Let` 自己的区间只盖到 `const f` 为止、初始化式是它的**平级兄弟**。
  // 早先这里直接读外层容器的属性，于是 `fieldName` 永远是空——`VariableDeclaration`
  // 的起点一直退到 `const`（实测 505 处对不上），而 `List` 那一层看不出来。
  return projectLetFrom(kids, ctx, v).statement;
```

# private method projectLetFrom:(kids:Array<any>, ctx:any, container:any)=>Array<any>

`let` 声明的**单元列表版**：列表本身才是主角，`Statement` 那层壳由调用方决定。

这样拆是因为 `for (let i = 0; …)` 的头部**没有** `Statement` 壳：
产物那边 `For.initial` 是一段单元 `[Let, SymbolToken(=), 初始化式]`，
而 TS 那边 `ForStatement.initializer` **直接就是 `VariableDeclarationList`**（不套 `VariableStatement`）。
早先按单个 `Let` 投，看不到初值——`List` / `Declaration` 各短 4 个字符（实测 Δ-4）。

```ts
  // 外层容器只用来取「语句整体」的区间（`Statement` 含分号、`For` 的段不含）。
  const stmtWhole = stmtEndOf(container, ctx);
  const stmtEnd = ctx.source[stmtWhole - 1] === ";" ? stmtWhole - 1 : stmtWhole;
  const letNode = kids.find((k) => k.get("type") === "Let") ?? null;
  // **多声明符**（第 93 轮）：`let a = 1, b = 2` 在 TS 里是**两个 `VariableDeclaration`**
  // （同一个 `VariableDeclarationList.declarations` 的两格），而产物只有一段平铺单元。
  // 顶层逗号就是那个分隔符——`f(x, y)` / `[a, b]` / `{ a: 1 }` / `T<A, B>` 里的逗号都在
  // 各自的单元**里面**，不会出现在这一层。
  const groups = [];
  let group = [];
  for (const k of kids) {
    if (group.length > 0 && k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ",") {
      groups.push(group);
      group = [];
      continue;
    }
    group.push(k);
  }
  if (group.length > 0) groups.push(group);
  const listEnd = kids.length > 0 ? Math.min(stmtEnd, endOf(kids[kids.length - 1])) : stmtEnd;
  // **容器可能是视图、也可能是字典格**（第 79 轮）：`projectLet`（语句位）传的是视图，
  // `structuralProps`（`for (let i = 0; …)` 的头部）传的是 `view(...)`。原来这里一律
  // `view(container)`，于是前者会 `view(view)` 抛 `TypeError`——那条路平时走不到
  // （`projectStatement` 自己处理 Let 开头的语句），一摊开成员位的 `Statement` 就被踩到了。
  const containerView = container instanceof Map ? view(container) : container;
  const letView = letNode === null ? containerView : view(letNode);
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
  // **每个声明符一个 `VariableDeclaration`**：第一组用 `Let` 自己的 `fieldName`（名字在那上面），
  // 后面的组名字就是组里第一格（`j = 1` 的 `j`）；类型标注取**本组**的 `TypeDefine`。
  const declarations = groups.map((one, index) => {
    const eq = one.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
    const initNode = eq >= 0 && eq + 1 < one.length ? one[eq + 1] : null;
    const head = one[0];
    const oneName =
      index === 0
        ? name
        : head === undefined || (head.get("type") !== "Identifier" && head.get("type") !== "Keyword")
          ? bindingSpan(container, head === undefined ? listStart : startOf(head), listEnd, ctx)
          : projectNode(head, ctx);
    const declaration = {
      kind: "VariableDeclaration",
      name: oneName,
      initializer: initNode === null ? undefined : projectNode(initNode, ctx),
      pos: oneName.pos,
      end: one.length > 0 ? Math.min(stmtEnd, endOf(one[one.length - 1])) : listEnd,
    };
    // **类型标注是声明的一部分，但它在 `Statement` 那一层**：`let a: string;` 的产物是
    // `Statement > [Let(``let a``), TypeDefine(``: string``)]`——`TypeDefine` 是 `Let` 的**兄弟**，
    // 不在 `Let` 里面（`Field` 那种才在自身里面）。TS 那边 `VariableDeclaration[4,13)` = `a: string`。
    const typeNode = one.find((k) => k.get("type") === "TypeDefine");
    if (typeNode !== undefined) declaration.type = projectTypeDefine(view(typeNode), ctx);
    return declaration;
  });
  const list = {
    kind: "VariableDeclarationList",
    declarations,
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
```

# private method projectBindingPattern:(unit:any, ctx:any)=>any

绑定模式：产物那边解构声明的括号段是 `ArrayLiteral` / `ObjectLiteral`，
而 TS 在**绑定位**叫 `ArrayBindingPattern` / `ObjectBindingPattern`（字段 `elements`）。

同一个产物标签在**值位**是 `ArrayLiteralExpression`（`[1, 2]`）、在**绑定位**是
`ArrayBindingPattern`（`const [a, b] = …`）——所以这里按上下文显式换 kind，
不走 `KIND_BY_TAG`（那张表是值位的）。

```ts
  const v = view(unit);
  const kind = v.type === "ArrayLiteral" ? "ArrayBindingPattern" : "ObjectBindingPattern";
  const elements = [];
  for (const kid of projectableKids(v)) {
    if (kid.get("type") === "BindingElement") elements.push(projectBindingElement(kid, ctx));
  }
  return { kind, elements, pos: v.start, end: stmtEndOf(v, ctx) };
```

# private method projectBindingElement:(unit:any, ctx:any)=>any

绑定元素 → `BindingElement`。

三种形态（都在产物里，逐个按标点切）：

| 源码 | TS 的子节点 |
| --- | --- |
| `a`（简写） | `name` |
| `p: q` | `propertyName`(`p`) + `name`(`q`) |
| `a = 1` | `name`(`a`) + `initializer`(`1`) |
| `...rest` | `dotDotDotToken`(`...`) + `name`(`rest`)——**两点号是子节点**（`forEachChild` 会访问它，
第 93 轮修：早先按「属性」处理，实测 `BindingElement` 字段名差 8 处） |

```ts
  const v = view(unit);
  const kids = projectableKids(v);
  const colonIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":");
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const dots = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "...");
  const names = kids.filter((k) => isNameNode(k) && !isTypeSeparator(k, ctx));
  const props = {};
  if (dots !== undefined) {
    props.dotDotDotToken = { kind: "DotDotDotToken", text: "...", pos: startOf(dots), end: startOf(dots) + 3 };
  }
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
```

# private method bindingSpan:(v:any, from:int, limit:int, ctx:any)=>int

解构声明的**绑定模式**区间：`const [a = 1, b = a] = []` 里那个 `[a = 1, b = a]`。

产物只把解构名记成 `arrayPattern="a,1,b,a"` 这样的**属性**（连括号都没记），
所以这里从源码里把方括号 / 花括号那一段**配对扫出来**——从 `from` 往后找第一个 `[` 或 `{`，
再按深度找它的配对括号。取不到时给一个零宽占位（宁可窄，不要凭空盖住整条声明）。

```ts
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
```

# private method modifierStart:(v:any, ctx:any)=>int

列表层的起点：**最后一个修饰词**的位置（`modifiers="export,const"` → `const` 在哪）。

取不到时退回声明自己的起点（没有修饰词的情形，例如 `Let` 就从名字起）。

```ts
  const modifiers = v.attrs.get("modifiers");
  if (typeof modifiers !== "string" || modifiers === "") return v.start;
  const last = modifiers.split(",").filter((w) => w !== "").pop();
  if (last === undefined) return v.start;
  const at = ctx.source.indexOf(last, v.start);
  return at >= 0 ? at : v.start;
```

# private method flagsOf:(v:any)=>int

```ts
  const modifiers = String(v.attrs.get("modifiers") ?? "");
  if (modifiers.split(",").includes("const")) return "Const";
  if (modifiers.split(",").includes("var")) return "None";
  return "Let";
```

# private method projectBinary:(v:any, ctx:any)=>any

```ts
  const kids = projectableKids(v);
  // **切在优先级最低的运算符上**（第 88 轮）：与 `projectExpression` 那一支同一判据。
  // 原来这里取**第一个**运算符、再把右边整段递归——`error !== null && error !== undefined && …`
  // 那种四段逻辑链会被折成**右结合**（`a && (b && (c && d))`），四个节点的起点落在四个操作数上；
  // 而 TS 是左结合（`((a && b) && c) && d`），四个节点**都从第一个操作数起**、终点逐个增长。
  let opIndex = -1;
  let bestRank = 999;
  for (let i = 1; i < kids.length; i++) {
    if (!isOperatorUnit(kids[i], ctx)) continue;
    const rank = operatorRank(textOfNode(kids[i], ctx));
    if (rank < bestRank) {
      bestRank = rank;
      opIndex = i;
    }
  }
  const declaredOp = v.attrs.get("op");
  const left = opIndex > 0 ? projectExpression(kids.slice(0, opIndex), ctx) : undefined;
  // **运算符在树里**（这一族是绝大多数）：从 `left` 起按 TS 的结合性折（左结合 / 赋值右结合）。
  if (opIndex > 0 && kids[opIndex].get("type") === "SymbolToken") {
    return foldBinaryFrom(left, kids.slice(opIndex), ctx);
  }
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
```

# private method projectUnary:(v:any, ctx:any)=>any

一元运算 → `PrefixUnaryExpression` 或 `PostfixUnaryExpression`。

**前后缀是两种 kind**（TS：`-x` 是 `PrefixUnaryExpression`、`y++` 是 `PostfixUnaryExpression`）。
产物那边两者都是 `UnaryOperator op="…"`，判据是**运算符单元在操作数之前还是之后**：
`y++` 的 `++` 排在 `y` 后面 ⇒ 后缀。

**只给 `operand` 一个字段**：TS 那边运算符（`operator`）是节点的**属性**、不是子节点字段，
所以 `ts.forEachChild` 看不到它。产物那边的 `SymbolToken` 也照此**不投影**。

```ts
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
```

# private method projectCall:(v:any, ctx:any)=>any

调用 `f(a)` → `CallExpression`（`expression` + `arguments` + 可选 `typeArguments`）。

```ts
  const kids = projectableKids(v);
  const calleeText = String(v.attrs.get("name") ?? "");
  const calleeEnd = v.start + calleeText.length;
  const args = kids.filter((k) => k.get("type") !== "Bracket" && k.get("type") !== "GenericType");
  const generic = kids.find((k) => k.get("type") === "GenericType");
  const props = {
    expression: { kind: leafKindOfText(calleeText), text: calleeText, pos: v.start, end: calleeEnd },
    arguments: projectEach(args, ctx),
    pos: v.start,
    end: v.end,
  };
  // **调用上的类型实参**（第 95 轮）：产物把它们收成一个 `GenericType` 子单元，而
  // `args` 那一支是**排掉** `GenericType` 的（它原来整类丢掉）。TS 那边是 `typeArguments`，
  // 内容按**类型位**投（`f<string>(1)` 是 `StringKeyword`，不是 `TypeReference`）。
  if (generic !== undefined) {
    const typeArguments = [];
    for (const group of splitTopLevel(projectableKids(view(generic)), ctx, ",")) {
      const one = projectTypeExpression(group, ctx);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  return { kind: "CallExpression", ...props };
```

# private method projectTypeDefine:(v:any, ctx:any)=>any

类型标注 `name: T` → `TypeReference`，**但原始类型不套这一层**。

实测 TS 的两种形状截然不同（`let a: string` / `let b: Foo`）：

- `a: string` → `VariableDeclaration > [Identifier(a), StringKeyword]` ——
  原始类型**直接**是一个 `StringKeyword` 节点，**没有** `TypeReference` 包着；
- `b: Foo`    → `VariableDeclaration > [Identifier(b), TypeReference > Identifier(Foo)]` ——
  具名类型才有 `TypeReference`，而且它在**同一个区间**上又套一个 `Identifier`。

早先这里一律返回 `TypeReference`，于是原始类型那 373 处（`NumberKeyword` 224 +
`StringKeyword` 149）在 TS 侧对不上，而产物侧还多出一层。

```ts
  const kids = projectableKids(v);
  const colon = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":");
  const afterColon = colon === undefined ? kids : kids.slice(kids.indexOf(colon) + 1);
  const projected = projectTypeExpression(afterColon, ctx);
  if (projected === undefined) {
    ctx.unmapped.add("TypeDefine(空)");
    return { kind: "TypeReference", pos: v.start, end: v.end };
  }
  return projected;
```

# private const SIGNATURE_KINDS:Set<string> = new Set(["FunctionDeclaration", "MethodDeclaration", "MethodSignature", "CallSignature", "ConstructSignature"])

没有函数体的**可调用签名**：它们的 `end` 要**带上尾随分号**（TS 的口径）。

`declare function f(): void;` 的 TS 是 `FunctionDeclaration[23,51)`（含 `;`），
而产物那个 `Function` 只到 `void` 为止——分号是它的平级兄弟。
只对这几个 kind 做：带**函数体**的声明不会走到这里（体已经把它结束在 `}` 上了）。

# private method isTypeSeparator:(node:any, ctx:any)=>bool

```ts
  if (node.get("type") !== "SymbolToken") return false;
  return [",", "|", "&"].includes(textOfNode(node, ctx));
```

# private method isDot:(node:any, ctx:any)=>bool

```ts
  return node.get("type") === "SymbolToken" && textOfNode(node, ctx) === ".";
```

# private method isNameNode:(node:any)=>bool

```ts
  const type = node.get("type");
  return type === "Identifier" || type === "Keyword";
```

# private method nameOf:(node:any, ctx:any)=>string

```ts
  const text = textOfNode(node, ctx);
  const at = startOf(node);
  return { kind: "Identifier", text, pos: at, end: at + text.length };
```

# private method projectTypeExpression:(nodes:Array<any>, ctx:any)=>any

**类型表达式**：一段单元 → 一个类型节点。类型是可以嵌套的，所以这里必须递归。

实测 TS 的形状（`let a: Map<string, number>`）：

~~~
TypeReference[7,25)            ← `Map<string, number>`（**整个**）
  Identifier[7,10)             ← `Map`（**同一区间的第二层**）
  typeArguments: StringKeyword[11,16) NumberKeyword[19,24)
~~~

而产物那边是 `TypeDefine > [Identifier(Map), GenericType(<string, number>)]`——
`GenericType` 在那里的身份是**实参表**、不是节点。所以：

- 头是 `Identifier` / `Keyword`，后面跟一个 `GenericType` ⇒ `TypeReference` + `typeArguments`；
- 头是原始类型名 ⇒ **直接是关键字节点**（不套 `TypeReference`，见 `PRIMITIVE_TYPE_KIND`）；
- 后面还跟一个 `ArrayType` ⇒ 再套一层 `ArrayType`（TS 的 `ArrayType` **从基名起**，
  而产物的 `ArrayType` 只盖住后缀那一段——所以要把它折上去）。

```ts
  const list = nodes.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")) && !isTypeSeparator(k, ctx));
  if (list.length === 0) return undefined;
  // **`TypeDefine` 先摊平**：有些上下文里整个类型位就是**一个** `TypeDefine` 子单元
  // （参数标注 / 字段标注那一族），而它的内容才是「基名 + 实参 + 数组后缀」那一串。
  // 不摊平的话 `list[0]` 是 `TypeDefine`，会直接掉到最后那句「只投第一个」——
  // 于是 `Array<unknown> | X` 这种成员只出基名（实测这版把漂移从 1759 提到 2263）。
  // **`typeof A.B`**（第 83 轮）：产物那个 `TypeQuery` **只收 `typeof A`**，
  // 点号与后面的名字是它**外面**的平级单元（`declare var atob: typeof globalThis.atob`）。
  // TS 那边 `exprName` 是 `QualifiedName`、区间覆盖整段（也**没有** `typeof` 子节点）。
  // 不接的话后面那串名字整个丢掉——`Identifier` 缺 1581 里的另一簇就是它
  // （`buffer.d.ts` 的 `globalThis.atob` / `globalThis.btoa`）。
  if (list.length >= 3 && list[0].get("type") === "TypeQuery" && isDot(list[1], ctx)) {
    const query = projectNode(list[0], ctx);
    const tail = list.filter((k, i) => i >= 2 && isNameNode(k));
    // **`head` 已经是投好的节点**（`query.exprName`），而 `qualifiedNameFrom` 吃的是**单元**
    // （它自己会调 `nameOf`）——所以这里手工往右套（踩过一次：把投好的节点喂给
    // `qualifiedNameFrom` 会 `node.get is not a function`）。
    // `query.exprName` 已经是**投好的节点**（不是单元）——判它看 `kind`，
    // 不能拿 `isNameNode` 去问（那个判据吃的是字典格；踩过一次：会 `node.get is not a function`）。
    const head = query.exprName;
    let name =
      head !== undefined && (head.kind === "Identifier" || head.kind === "QualifiedName")
        ? head
        : undefined;
    for (const k of tail) {
      const right = nameOf(k, ctx);
      name =
        name === undefined
          ? right
          : { kind: "QualifiedName", left: name, right, pos: name.pos, end: right.end };
    }
    if (name !== undefined) {
      query.exprName = name;
      query.end = endOf(list[list.length - 1]);
    }
    return query;
  }
  if (list.length === 1 && list[0].get("type") === "TypeDefine") {
    return projectTypeExpression(projectableKids(view(list[0])), ctx);
  }
  // **类型参数段 + 函数类型**（第 82 轮）：产物把 `<R, TArgs extends any[]>` 放在 `FunctionType`
  // **外面**——`TypeDefine` 里是两个平级单元 `[GenericType(类型参数), FunctionType(…)]`，
  // 而 TS 那边它是 **`FunctionType.typeParameters`**（区间也从类型参数段起：
  // `<R>(a: A) => B` 整段都是 `FunctionType`）。
  //
  // 早先这里按「头是 `GenericType`」走到通用支，只投出那个 `GenericType`
  // （`KIND_BY_TAG` 给它的是 `TypeReference`）——类型参数成了它的孩子、**整个函数类型被丢掉**：
  // 真实语料 `Identifier` 缺 1616 里的一大片、`TypeReference` 缺 417，
  // 全是 `@types/node/async_hooks.d.ts` 那种「泛型函数类型」（`snapshot(): <R, TArgs…>(…) => R`）。
  if (list.length === 2 && list[0].get("type") === "GenericType" && list[1].get("type") === "FunctionType") {
    const typeParams = unwrapNodes(list[0]).filter((k) => k.get("type") === "TypeParameter");
    const fn = projectFunctionType(view(list[1]), ctx);
    if (typeParams.length > 0) {
      fn.typeParameters = projectEach(typeParams, ctx);
    }
    fn.pos = startOf(list[0]);
    return fn;
  }
  const head = list[0];
  const generic = list.find((k) => k.get("type") === "GenericType");
  const arraySuffix = list.find((k) => k.get("type") === "ArrayType");

  if (head.get("type") === "Identifier" || head.get("type") === "Keyword") {
    const text = textOfNode(head, ctx);
    const span = { pos: startOf(head), end: endOf(head) };
    const nameNode = { kind: "Identifier", text, pos: span.pos, end: span.end };
    if (generic === undefined) {
      // **`null` / `true` / `false` 在类型位要套一层 `LiteralType`**（第 76 轮）：
      // TS 那边 `null | Writable` 的第一个成员是 `LiteralType > NullKeyword`，
      // 而产物只在**一部分**上下文里造了这一层（`literal-type.xl.md` 覆盖的是它认得的那些位置），
      // 类型参数约束、类型实参段这些地方的 `null` 还是裸的 `Identifier`
      // （实测缺 `LiteralType` 214 处，样本几乎全是 `X extends null | Y`）。
      // `undefined` **不套**（TS 那边就是裸的 `UndefinedKeyword`）——这是这一条唯一的例外。
      if (LITERAL_TYPE_KEYWORDS.has(text)) {
        const literal = { kind: PRIMITIVE_TYPE_KIND.get(text), text, pos: span.pos, end: span.end };
        return { kind: "LiteralType", literal, pos: span.pos, end: span.end };
      }
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
```

# private method projectTypeArguments:(generic:any, ctx:any)=>Array<any>

```ts
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
```

# private method projectImportType:(v:any, ctx:any)=>any

类型位的导入类型 `import("m")` / `import("m").A.B` / `typeof import("m")` → `ImportType`。

产物那边的形状是 `[Keyword(typeof)?, Method(name="import")[String], SymbolToken(.), Identifier*]`
（第 66 轮 `import-type.xl.md` 收的）；TS 那边只有**两个**子字段：

- `argument`：**一层 `LiteralType` 包着**那个 `StringLiteral`（`import("buffer").Blob` 的 TS 是
  `ImportType > LiteralType > StringLiteral`）——照通用投影投时这一层整个没有，
  实测缺 `LiteralType` 221 处、`ImportType` 的字段名也整类不对（113 处）；
- `qualifier`：点号后面那一串名字，TS 用的是 **`QualifiedName`**（不是 `PropertyAccessExpression`
  ——那是 `extends` 那一支的写法，见 `dottedExpression` 的说明）。

`typeof` 与 `import` 两个词都**不进子字段**：前者是 TS 节点的标志位、后者是语法词。

```ts
  const kids = projectableKids(v);
  // 实参那个字符串：可能裸着，也可能被 `Method(name="import")` 包着（值位那条调用规则先收过一遍）。
  let stringUnit = kids.find((k) => k.get("type") === "String" || k.get("type") === "ConstString");
  if (stringUnit === undefined) {
    const call = kids.find((k) => k.get("type") === "Method");
    if (call !== undefined) {
      stringUnit = projectableKids(view(call)).find(
        (k) => k.get("type") === "String" || k.get("type") === "ConstString",
      );
    }
  }
  const props = {};
  if (stringUnit !== undefined) {
    const literal = {
      kind: "StringLiteral",
      text: stringText(view(stringUnit), ctx),
      pos: startOf(stringUnit),
      end: endOf(stringUnit),
    };
    props.argument = { kind: "LiteralType", literal, pos: literal.pos, end: literal.end };
  }
  const names = kids.filter((k) => isNameNode(k) && !(k.get("type") === "Keyword"));
  if (names.length > 0) props.qualifier = qualifiedNameFrom(names, ctx);
  return { kind: "ImportType", pos: v.start, end: v.end, ...props };
```

# private method qualifiedNameFrom:(names:Array<any>, ctx:any)=>any

一串名字 → **限定名**（`A.B.C` 折成左结合的 `QualifiedName` 嵌套）。

与 `dottedExpression` 是**同形不同 kind**的一对：类型位（类型引用的名字、导入类型的限定名）
用 `QualifiedName`，值位（`extends` / `implements` 的表达式）用 `PropertyAccessExpression`。

```ts
  let node = nameOf(names[0], ctx);
  for (let i = 1; i < names.length; i++) {
    const right = nameOf(names[i], ctx);
    node = { kind: "QualifiedName", left: node, right, pos: node.pos, end: right.end };
  }
  return node;
```

# private method projectInferType:(v:any, ctx:any)=>any

`infer X` / `infer X extends Y` → `InferType`（唯一子字段是 `typeParameter`）。

`infer` 那个词**不是子节点**：TS 的 `InferType` 只有 `typeParameter` 一格
（实测这一类的字段名差异 72 处全是「产物有 `children`、TS 只有 `typeParameter`」）。

```ts
  const param = projectableKids(v).find((k) => k.get("type") === "TypeParameter");
  const props = {};
  if (param !== undefined) props.typeParameter = projectNode(param, ctx);
  return { kind: "InferType", pos: v.start, end: v.end, ...props };
```

# private method indexBracketOf:(v:any, ctx:any)=>int

下标访问类型 `A[K]` 里**下标那一对方括号的左括号**位置。

从节点终点往回找**与最后那个 `]` 配对**的 `[`：这样 `A["k"]["j"]` 找到的是**外层**那个
（从前往后找会先撞上内层的 `[`，把 `A` 当成对象类型、`["k"]["j"]` 全当下标）。
找不到时给 `-1`（调用方退回「整段一次投」）。

```ts
  const source = ctx.source;
  // `v` 在这一层是**视图**（`projectNode` 开头 `view(node)` 过的），所以起止取 `v.start` / `v.end`。
  let end = v.end - 1;
  while (end > v.start && source[end] !== "]") end--;
  if (source[end] !== "]") return -1;
  let depth = 0;
  for (let i = end; i >= v.start; i--) {
    const ch = source[i];
    if (ch === "]") depth++;
    else if (ch === "[") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
```

# private method projectIndexedAccessType:(v:any, ctx:any)=>any

下标访问类型 `A[K]` → `IndexedAccessType`（`objectType` + `indexType`）。

产物那边是**一串平级单元**（方括号本身不进产物，与 `ArrayType` 同一口径），
所以按「单元起点在下标括号之前还是之后」切两段——两段都以类型位方式投
（`NodeJS.TypedArray[K]` 的对象类型因此才是一个限定名，而不是散单元）。
段名对不上是实测最大的一处字段差异（657 处：产物只有 `children`）。

```ts
  const kids = projectableKids(v);
  const open = indexBracketOf(v, ctx);
  if (open < 0) {
    const whole = projectTypeExpression(kids, ctx);
    return { kind: "IndexedAccessType", pos: v.start, end: v.end, objectType: whole };
  }
  const objectUnits = kids.filter((k) => startOf(k) < open);
  const indexUnits = kids.filter((k) => startOf(k) >= open);
  const props = {};
  const objectType = projectTypeExpression(objectUnits, ctx);
  const indexType = projectTypeExpression(indexUnits, ctx);
  if (objectType !== undefined) props.objectType = objectType;
  if (indexType !== undefined) props.indexType = indexType;
  return { kind: "IndexedAccessType", pos: v.start, end: v.end, ...props };
```

# private method memberNameOf:(v:any, ctx:any)=>any

**成员的名字节点**（`Field` / 方法声明 / 方法签名 / 命名空间…都要问它）。

TS 那边成员名有四种形态，判据在这里**收口**——`projectField` 与 `structuralProps` 共用一份。
原来 `projectField` 自己 `synthName` 合一个 `Identifier`，于是**接口 / 类型字面量里的成员**
（那一支正是 `projectField`）的引号名、数字名、计算名**全都长成 `Identifier`**。实测缺口：
`StringLiteral` 1083、`NumericLiteral` 216、`ComputedPropertyName` 231，以及计算名里面的
`PropertyAccessExpression` 593（全是 `[Symbol.toStringTag]: string` 那一种）。

| 源码 | 名字节点 |
| --- | --- |
| `a` | `Identifier`（树里有那个子单元就用它，没有才 `synthName` 合成） |
| `"a-b"` / `'a-b'` | `StringLiteral`，**区间含那对引号** |
| `0` / `1.5` | `NumericLiteral` |
| `[Symbol.toStringTag]` / `[kOptions]` | `ComputedPropertyName`，区间**含那对方括号**，里面照值位投 |

返回 `{ name, computed, unit }`：`computed` 是那个计算名单元、`unit` 是名字那个**子单元**
（两者调用方都要从段循环里**排掉**，否则它会以 `ArrayLiteral` / `Identifier` 的身份在成员里
再出现一次——`unit` 是实测补的：接口名那个 `Identifier` 没被排掉时会顶着
`heritageClauses` 出去，实测 2640 处字段名不符）。

两处判据是实测逼出来的：

- **计算名先问**，而且**不看 `name` 属性空不空**：`[Symbol.toStringTag]` 的名字属性是**空串**
  （`name=""`），原来那个 `name !== ""` 的闸门直接把它挡在外面，整个名字节点都没有；
- **引号判据是「名字起点前面那一格就是引号」**，不是「窗口里找得到 `"name"`」：成员的类型里
  可能正好有同名字符串（`x: "x"`），按窗口找会把类型当成名字。`synthName` 已经把名字的位置
  算好了（推过修饰词、优先用 `nameStart` / `nameEnd`），直接问它左边那一格。

```ts
  const rawName = v.attrs.get("name") ?? v.attrs.get("fieldName") ?? v.attrs.get("namespace");
  const name = typeof rawName === "string" ? rawName : "";
  const computed = computedNameUnit(v, ctx);
  if (computed !== null) {
    return {
      name: {
        kind: "ComputedPropertyName",
        expression: computedNameExpression(computed, ctx),
        pos: startOf(computed),
        end: endOf(computed),
      },
      computed,
      unit: null,
    };
  }
  if (name === "") {
    return { name: undefined, computed: null, unit: null };
  }
  const direct = projectableKids(v).find((k) => k.get("type") === "Identifier" && textOfNode(k, ctx) === name);
  const at = direct === undefined ? synthName(name, v, ctx) : projectNode(direct, ctx);
  if (at === undefined) {
    return { name: undefined, computed: null, unit: direct === undefined ? null : direct };
  }
  const before = at.pos > 0 ? ctx.source[at.pos - 1] : "";
  if ((before === '"' || before === "'") && ctx.source[at.end] === before) {
    return {
      name: {
        kind: "StringLiteral",
        text: ctx.source.slice(at.pos - 1, at.end + 1),
        pos: at.pos - 1,
        end: at.end + 1,
      },
      computed: null,
      unit: direct === undefined ? null : direct,
    };
  }
  if (direct === undefined && NUMERIC_LITERAL.test(name)) {
    return { name: { kind: "NumericLiteral", text: name, pos: at.pos, end: at.end }, computed: null, unit: null };
  }
  return { name: at, computed: null, unit: direct === undefined ? null : direct };
```

# private method projectIndexSignature:(v:any, ctx:any)=>any

索引签名 `{ [k: string]: T }` / `readonly [k: symbol]: T` → `IndexSignatureDeclaration`。

TS 那边它有三个具名字段：`parameters`（`[k: string]` 那个 `k: string`）、`type`（值类型）、
`modifiers`（`readonly`）；产物那边是**一串平级子单元**（`Parameter` + `TypeDefine`（+ `readonly`
那个词）），照通用投影会全塞进一个 `children`（实测 `IndexSignatureDeclaration` 的字段名
整类不符）。

`readonly` 在产物里是**子单元**（不是一个属性），所以这里单独把它收成修饰词节点——
`addModifiers` 读的是 `modifiers` 属性 / 布尔属性，这一格两样都没有（见它的说明）。

```ts
  const kids = projectableKids(v);
  const params = kids.filter((k) => k.get("type") === "Parameter");
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  const readonlyUnit = kids.find(
    (k) =>
      (k.get("type") === "Keyword" || k.get("type") === "Identifier") && textOfNode(k, ctx) === "readonly",
  );
  const props = {};
  if (params.length > 0) {
    // **形参的区间要去掉那对方括号**（第 92 轮）：产物的 `Parameter` 单元把 `[` 也圈进来了
    // （`[key: string]` 给 [14,26)），而 TS 的 `Parameter` 是 `key: string`（[15,26)）——
    // 实测这一族 104 处漂移（样本 `key: string]: unknown;`），都是「起点早一格」。
    props.parameters = projectEach(params, ctx, "IndexSignature").map((one) => ({
      ...one,
      pos: one.name !== undefined ? one.name.pos : one.pos,
      end: one.type !== undefined ? one.type.end : one.end,
    }));
  }
  if (typeNode !== undefined) {
    props.type = projectTypeDefine(view(typeNode), ctx);
  }
  if (readonlyUnit !== undefined) {
    props.modifiers = [projectNode(readonlyUnit, ctx)];
  }
  return { kind: "IndexSignature", pos: v.start, end: stmtEndOf(v, ctx), ...props };
```

# private method projectField:(v:any, ctx:any)=>any

```ts
  const kids = projectableKids(v);
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  // **名字走共用判据**（见 `memberNameOf`）：引号名是 `StringLiteral`、数字名是
  // `NumericLiteral`、计算名是 `ComputedPropertyName`（`[Symbol.toStringTag]` 的名字属性是空串，
  // 也只有那一条路认得出来）。
  const named = memberNameOf(v, ctx);
  const props = {};
  if (named.name !== undefined) {
    props.name = named.name;
  }
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
  } else {
    // **没有类型标注的可选成员**（`a?;` / `private a?;` / `readonly b?;`）：
    // 有类型标注时 `?` 被吞进了 `TypeDefine` 的区间（上一条分支），没有类型标注时
    // 它是**平级的 `SymbolToken`**——而 TS 那边它照样是 `questionToken` 字段
    // （实测 `PropertySignature` / `PropertyDeclaration` 字段名差 12 处、缺 `QuestionToken` 12 个）。
    const question = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "?");
    if (question !== undefined) props.questionToken = projectNode(question, ctx);
  }
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = projectNode(kids[eqIndex + 1], ctx);
  addModifiers(v, props, ctx);
  // **字段上的装饰器也是修饰词**（`@Input() name: string`，第 95 轮）：`projectField` 不走
  // `structuralProps`，所以这一处要单独收（实测成员位缺 `Decorator` 3 + 缺 `CallExpression`）。
  const fieldDecorators = kids.filter((k) => k.get("type") === "Decorator");
  if (fieldDecorators.length > 0) {
    const projected = fieldDecorators.map((d) => projectNode(d, ctx)).filter((d) => d !== undefined);
    const merged = [...projected, ...(Array.isArray(props.modifiers) ? props.modifiers : [])];
    merged.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
    props.modifiers = merged;
  }
  // **接口 / 类型字面量里的成员是 `PropertySignature`**，类里才是 `PropertyDeclaration`——
  // 同一个产物标签 `Field`，两种上下文两种 kind（声明文件里前者是绝大多数）。
  const kind = ctx.signature ? "PropertySignature" : "PropertyDeclaration";
  return { kind, pos: v.start, end: stmtEndOf(v, ctx), ...props };
```

# private method projectEnumMember:(v:any, ctx:any)=>any

```ts
  const kids = projectableKids(v);
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const nameNode = kids.find((k) => k.get("type") !== "SymbolToken") ?? null;
  const props = {};
  if (nameNode !== null) props.name = projectNode(nameNode, ctx);
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) props.initializer = projectNode(kids[eqIndex + 1], ctx);
  return { kind: "EnumMember", pos: v.start, end: v.end, ...props };
```

# private method addModifiers:(v:any, props:any, ctx:any, baseStart:int)=>void

修饰词：产物那边是 `modifiers="export,const"` 这样的**字符串**，
而 TS 那边 `modifiers` 是一串**节点**（`ExportKeyword` / `ConstKeyword`…）。

**每个修饰词的区间要从原文里量出来**（踩过）：早先一律写成
`pos = v.start, end = v.start`（零宽），于是尺子上整类报「同 kind 同起点、终点差 6~9」——
实测 `declare` 是 `TS[26,33)` 而我给 `[26,26)`，一份语料里几百处。

能这样量是因为**带修饰词的节点，自己的起点就是第一个修饰词的起点**
（实测 `Field[12,34]` 的 `modifiers="private,readonly"`：12 正是 `private` 的开头），
所以从 `v.start` 起**按顺序**找每个词即可。

```ts
  let words = [];
  const modifiers = v.attrs.get("modifiers");
  if (typeof modifiers === "string" && modifiers !== "") {
    words = modifiers.split(",").filter((word) => word !== "");
  } else {
    // **声明位的 `export` / `declare` 是布尔属性**（`Interface export="true"` / `Namespace declare="true"`），
    // 而 `Class` 那边是 `modifiers="export"` 字符串——两种写法都要认（真实语料 606 处
    // `ExportKeyword` 全挂在 `InterfaceDeclaration` 480 / `TypeAliasDeclaration` 126 上）。
    for (const [key, value] of v.attrs) {
      if (value === true || value === "true") words.push(key);
    }
  }
  if (words.length === 0) return;
  const out = [];
  let at = baseStart === undefined ? v.start : baseStart;
  for (const word of words) {
    const found = ctx.source.indexOf(word, at);
    const pos = found >= 0 && found < v.end ? found : at;
    out.push({ kind: `${word.charAt(0).toUpperCase()}${word.slice(1)}Keyword`, text: word, pos, end: pos + word.length });
    at = pos + word.length;
  }
  props.modifiers = out;
```

# private method projectTypeAlias:(v:any, ctx:any, baseStart:int)=>any

类型别名 `type A = B` → `TypeAliasDeclaration`（`name` + `type`）。

产物那边名字在 `alias` 属性上、右值在子节点里（`=` 之后），中间是平级的散单元——
所以在 `=` 处切开：左边第一格是 `name`，右边整段是 `type`。

**修饰词在 `TypeAssign` 自己身上，但 `pos` 要从外层量**：`export type T = string` 的产物是
`Statement > [TypeAssign(modifiers="export"), =, 右值]`——`TypeAssign` 的起点是 `type` 那个词、
而 TS 的 `TypeAliasDeclaration` 从 `export` 起。所以 `baseStart` 由调用方
（`projectStatement`）把外层的起点递进来，修饰词仍从 `v`（`TypeAssign`）读。

```ts
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
  //
  // **只在 `=` 左边找**（第 95 轮修）：右值里也有 `GenericType`——
  // `type Z = <T>(x: T) => T` 的 `<T>` 是**函数类型自己的**类型参数，
  // 不是别名的（TS 那边 `TypeAliasDeclaration` 没有 `typeParameters` 这一格）；
  // 从整个 `kids` 里找会把泛型箭头函数的别名多挂一个 `typeParameters`。
  const generic = lhs.find((k) => k.get("type") === "GenericType");
  const props = {
    name: nameNode === undefined ? synthName(nameText, v, ctx) : projectNode(nameNode, ctx),
    type: typeOf(rhs, ctx),
  };
  if (generic !== undefined) {
    const params = unwrapNodes(generic).filter((k) => k.get("type") === "TypeParameter");
    if (params.length > 0) props.typeParameters = projectEach(params, ctx);
  }
  addModifiers(v, props, ctx, baseStart);
  return { kind: "TypeAliasDeclaration", pos: baseStart ?? v.start, end: v.end, ...props };
```

# private const PARAMETER_MODIFIERS:Set<string> = new Set(["public", "private", "protected", "readonly", "override"])

# private method projectParameter:(v:any, ctx:any)=>any

形参 `x: string` → `Parameter`（`name` + `type`）。

**形参上的修饰词**（TS 4.x 起的参数属性）：`constructor(private readonly a: number)` 的
`private` / `readonly` 在 TS 那边是 `modifiers` 里的节点，在产物这边是 `Parameter` 下的平铺
`Keyword`——所以它们既要从名字搜索里排掉，也要收进 `modifiers`。

**`TypeDefine` 要摊平**：产物里 `x: string` 是 `Parameter > [Identifier, TypeDefine > Identifier]`，
而 TS 的 `Parameter.type` **直接就是那个类型引用**，中间没有 `TypeDefine` 这一层。

```ts
  const kids = projectableKids(v);
  // **形参上的修饰词是子节点**（第 93 轮修）：`constructor(private readonly a: number)` 的产物是
  // `Parameter > [Keyword(private), Keyword(readonly), Identifier(a), TypeDefine]`，
  // 而 TS 把前两个放进 `modifiers` 字段。两件事都要做：
  // ① 收成 `modifiers`；② **跳过它们再找名字**——`private` 也是 `Keyword`，
  // 早先的 `find(Identifier || Keyword)` 会把它当成形参名（实测缺 `Identifier` 3 +
  // 缺 `ReadonlyKeyword` + 字段名差 11）。
  const leadingModifiers = [];
  for (const k of kids) {
    if (k.get("type") === "Keyword" && PARAMETER_MODIFIERS.has(textOfNode(k, ctx))) {
      leadingModifiers.push(k);
      continue;
    }
    break;
  }
  const body = leadingModifiers.length > 0 ? kids.slice(leadingModifiers.length) : kids;
  const nameNode = body.find((k) => k.get("type") === "Identifier" || k.get("type") === "Keyword");
  const typeNode = body.find((k) => k.get("type") === "TypeDefine");
  const question = body.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "?");
  // **剩余形参的 `...` 是子节点**（TS：`Parameter > [dotDotDotToken, name, type]`，语料 483 处）。
  // 产物那边它常常是**第一个平级的 `SymbolToken("...")`**（`...args: string[]`），
  // 只有被收成 `Spread` 时才走下面那一支（`Spread` 是 `<Spread>` 标签、`kind` 是 `SpreadElement`）。
  const dots = body.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "...");
  const rest = body.find((k) => k.get("type") === "Spread");
  const props = {
    // **`this` 形参的名字是 `Identifier`，不是 `ThisKeyword`**：TS 的 `this: Window` 里
    // `parameterName` 就是一个文本为 `this` 的 `Identifier`（`ThisKeyword` 只出现在类型位）。
    // 产物那边它是 `<Keyword>this</Keyword>`，照通用投影会投成 `ThisKeyword`
    // （真实语料 `Parameter` 下缺 1149 个 `Identifier`，绝大多数就是这一条）。
    name:
      nameNode === undefined
        ? undefined
        : nameNode.get("type") === "Keyword" && textOfNode(nameNode, ctx) === "this"
          ? { kind: "Identifier", text: "this", pos: startOf(nameNode), end: endOf(nameNode) }
          : projectNode(nameNode, ctx),
    type: typeNode === undefined ? undefined : projectTypeDefine(view(typeNode), ctx),
  };
  // **可选形参的 `?` 也是子节点**（TS：`Parameter > [name, questionToken, type]`，真实语料 5k+ 处）。
  // 与属性那一处同源：产物把 `?` 吞进了 `TypeDefine` 的区间里（`TypeDefine` 从 `?` 起），
  // 所以按「类型段第一个字符是不是 `?`」切。
  if (leadingModifiers.length > 0) props.modifiers = projectEach(leadingModifiers, ctx);
  if (question !== undefined) {
    props.questionToken = projectNode(question, ctx);
  } else if (typeNode !== undefined && ctx.source[startOf(typeNode)] === "?") {
    const at = startOf(typeNode);
    props.questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
  }
  // **默认值也是形参的一部分**（`constructor(public b = 1)` / `(a = 2) => a`）：
  // 产物把 `=` 与初值平铺在 `Parameter` 下，TS 那边是 `initializer` 字段
  // （实测 `Parameter` 字段名差、连缺初值那个 `NumericLiteral`）。
  const eq = body.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  if (eq >= 0 && eq + 1 < body.length) props.initializer = projectNode(body[eq + 1], ctx);
  // `...` 的位置用**它自己的 `range`**（不是从名字往回推一位）：`k.get("range")[0]` 就是那个点号。
  if (dots !== undefined) {
    props.dotDotDotToken = { kind: "DotDotDotToken", text: "...", pos: startOf(dots), end: startOf(dots) + 3 };
  } else if (rest !== undefined) {
    props.dotDotDotToken = projectNode(rest, ctx);
  }
  return { kind: "Parameter", pos: v.start, end: v.end, ...props };
```

# private method projectConditionalExpression:(v:any, ctx:any)=>any

三元表达式 `a ? b : c` → `ConditionalExpression`（`condition` / `whenTrue` / `whenFalse`
+ `questionToken` / `colonToken`）。

**`?` 与 `:` 在这里是字段**（TS 的 `cond.questionToken` / `cond.colonToken` 都在
`forEachChild` 那一层），与 `ConditionalType` **正好相反**——那个是类型位，
TS 那边两个标点都不进子节点。两者形状极像、口径相反，是这一带最容易写错的地方。

分段名（`trueStatement` / `falseStatement`）是上游 Cangjie 的叫法，
TS 现在叫 `whenTrue` / `whenFalse`，改名在 `FIELD_BY_KIND` 里做。

```ts
  const props = {
    condition: projectSegment(v, "condition", ctx),
    whenTrue: projectSegment(v, "trueStatement", ctx),
    whenFalse: projectSegment(v, "falseStatement", ctx),
  };
  // `?` 与 `:` 在产物树里**没有单元**（`TernaryOperator` 只收三段），只能从**源码里量**：
  // 在两段的区间之间找那个标点（中间可能有空白与注释）。
  //
  // **早先这里是「按上一段末尾合成」的，位置差一格**（第 88 轮修）：`endOf` 是**闭区间**
  // （最后一个字符的下标），于是两个 token 都落在标点**前一格**上——
  // 实测 `DRIFT: ColonToken` 158 + `DRIFT: QuestionToken` 127 全是它。
  const question = punctBetween(v, "condition", "trueStatement", "?", ctx);
  const colon = punctBetween(v, "trueStatement", "falseStatement", ":", ctx);
  if (question !== undefined) props.questionToken = question;
  if (colon !== undefined) props.colonToken = colon;
  return { kind: "ConditionalExpression", pos: v.start, end: v.end, ...props };
```

# private method punctBetween:(v:any, fromKey:string, toKey:string, ch:string, ctx:any)=>any

在两段之间**量**出那个标点（`?` / `:`）：从上一段的末尾往后扫，扫到下一段的起点为止。

产物树里 `TernaryOperator` 只有三段、标点没有单元，所以只能这么做；**不能按「上一段末尾 + 1」
合成**——中间一般有空白（`error ? a : b`），而且 `endOf` 是闭区间，两个坑叠起来正好差一格。

```ts
  const from = firstNodeOf(v, fromKey);
  if (from === null) return undefined;
  const to = firstNodeOf(v, toKey);
  const startAt = endOf(from) + 1;
  const stop = to === null ? v.end : startOf(to);
  for (let i = startAt; i < stop && i < ctx.source.length; i++) {
    if (ctx.source[i] === ch) {
      return {
        kind: ch === "?" ? "QuestionToken" : "ColonToken",
        text: ch,
        pos: i,
        end: i + 1,
      };
    }
  }
  return undefined;
```

# private method firstNodeOf:(v:any, key:string)=>any

```ts
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
```

# private method projectSegment:(v:any, key:string, ctx:any)=>any

```ts
  const kids = kidsOf(v, key);
  if (kids.length === 0) return undefined;
  const first = kids[0];
  // 分段的元素常常是**包装**（`TernaryOperatorCondition` / `IfCondition`…），要摊平一层。
  const inner = unwrapNodes(first).filter((k) => k.get("type") !== "SymbolToken");
  if (inner.length === 0) return projectNode(first, ctx);
  return projectExpression(inner, ctx);
```

# private method firstCodeAfter:(source:string, from:int)=>int

```ts
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i++;
  return i;
```

# private method matchBrace:(source:string, open:int)=>int

```ts
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
```

# private method identWithin:(source:string, text:string, from:int, to:int)=>int

```ts
  const at = source.indexOf(text, from);
  if (at < 0 || at + text.length > to) return undefined;
  return { kind: "Identifier", text, pos: at, end: at + text.length };
```

# private method projectImport:(v:any, ctx:any)=>any

`import` 声明 → TS 的形状。

产物把它摊成**一个节点 + 一串平级单元**：

~~~
import { A as B, C } from "m"
  ⇒ Import(imported="B,C") + Bracket{ A, as, B, `,`, C } + Identifier(from) + String("m")
~~~

而 TS 是三层：`ImportDeclaration > ImportClause > (NamedImports > ImportSpecifier…)`，
其中那个 `from` **不是节点**。真实语料里这三层各缺一千多（第 34 轮）。

几条实测口径：
- `ImportDeclaration` **含尾随分号**（`import d from "m";` 的 TS 是 `[0,18)`，产物到 `"m"` 就停了）；
- `ImportClause` 从子句第一个词开始、到最后一个子句单元结束。**`type` 也算在里面**
  （`import type { A } from "m"` 的 TS 是 `ImportClause[7,17)`），而产物**没把 `type` 记成单元**，
  所以那个起点只能从 `import` 之后的第一个非空白字符量；
- `NamedImports` / `ImportSpecifier` 的区间**直接按原文的 `{}` 与逗号量**：产物这边
  花括号有时是 `Bracket`、有时（带别名时）是 `ObjectLiteral`，按标签分会漏一半。

```ts
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
    } else {
      // **`import x = A.B.C`**（第 95 轮）：TS 的 `moduleReference` 是 `QualifiedName`
      // （`A.B.C` 是两层嵌套的 `QualifiedName`），而产物把它摊成平级单元——
      // 不收出来会缺整族 `QualifiedName` / `Identifier`（实测 5 处）。
      const names = kids.filter((k) => k.get("type") === "Identifier" && k !== nameNode && k !== fromNode);
      if (names.length > 0) equalsProps.moduleReference = qualifiedNameFrom(names, ctx);
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
```

# private method namedImportSpecifiers:(source:string, braceOpen:int, braceClose:int)=>Array<any>

```ts
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
```

# private method projectConditionalType:(v:any, ctx:any)=>any

条件类型 `T extends U ? A : B` → `ConditionalType`（四个具名字段）。

产物那边是一串**平级单元**：`[T, extends, U, ?, A, :, B]`，所以在 `?` 与 `:` 处切开。
`?` / `:` 本身不进任何字段（TS 那边没有 `questionToken` 字段）。

```ts
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
```

# private method projectFunctionType:(v:any, ctx:any)=>any

函数类型 `(x: number) => string` → `FunctionType`（`parameters` + `type`，可选 `typeParameters`）。

产物那边是平级单元：`[GenericType(类型参数表)?, Bracket(形参表), SymbolToken(=>), 返回类型]`。
形参要**摊平括号**（TS 那边 `parameters` 直接是 `Parameter`，没有括号那一层节点），
`=>` 之后是 `type`。

**类型参数表要单独提出来**（第 82 轮）：`<R, TArgs extends any[]>(fn: (…args: TArgs) => R) => R`
里那个 `GenericType` 装的是 `TypeParameter`——它在 TS 那边是 `FunctionType.typeParameters`，
**不是形参**。早先它跟形参表一起投出去（`GenericType` 自己的 `KIND_BY_TAG` 是 `TypeReference`），
于是那些类型参数与其上的约束整个丢掉：真实语料 `Identifier` 缺 1616 里的一大片、
`TypeReference` 缺 417 同源（`@types/node/async_hooks.d.ts` 那种「泛型函数类型」在语料里成片）。
判据与 `wrapperTarget` 对 `GenericType` 的判据**同源**：装 `TypeParameter` 的才是类型参数段。

```ts
  const kids = projectableKids(v);
  const arrowIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=>");
  const before = arrowIndex < 0 ? kids : kids.slice(0, arrowIndex);
  const generic = before.find((k) => k.get("type") === "GenericType");
  const params = [];
  for (const k of before) {
    if (k === generic) continue;
    if (k.get("type") === "Bracket") {
      // **形参之间的逗号不进 `parameters`**（TS 那边 `parameters` 只有 `Parameter`）：
      // 括号的内容是 `[Parameter, SymbolToken(,), Parameter]`，摊平后要按顶层逗号切。
      for (const part of splitTopLevel(unwrapNodes(k), ctx, ",")) {
        for (const inner of part) params.push(inner);
      }
      continue;
    }
    params.push(k);
  }
  const props = {};
  if (generic !== undefined) {
    const typeParams = unwrapNodes(generic).filter((k) => k.get("type") === "TypeParameter");
    if (typeParams.length > 0) props.typeParameters = projectEach(typeParams, ctx);
  }
  props.parameters = projectEach(params, ctx);
  if (arrowIndex >= 0 && arrowIndex + 1 < kids.length) {
    props.type = typeOf(kids.slice(arrowIndex + 1), ctx);
  }
  return { kind: "FunctionType", pos: v.start, end: v.end, ...props };
```

# private method projectExpressionWithTypeArguments:(v:any, ctx:any)=>any

`extends` / `implements` 里的 `B<T>` → `ExpressionWithTypeArguments`
（`expression` = 被继承的那个名字，`typeArguments` = `<T>` 里的实参）。

产物那边是平级的两块（`[Identifier(B), GenericType(<T>)]`），
而字段表原来只把 `children` 整体映射成 `expression`——于是实参挂在 `expression` 下、
`typeArguments` 整个字段不见（实测 15 处）。`GenericType` 在这里的身份是**实参表**，不是节点。

```ts
  const kids = projectableKids(v);
  const generic = kids.find((k) => k.get("type") === "GenericType");
  const names = kids.filter((k) => isNameNode(k));
  const props = {};
  if (names.length > 0) props.expression = dottedExpression(names, ctx);
  if (generic !== undefined) props.typeArguments = projectTypeArguments(generic, ctx);
  return { kind: "ExpressionWithTypeArguments", pos: v.start, end: v.end, ...props };
```

# private method dottedExpression:(names:Array<any>, ctx:any)=>any

一串名字 → 点号表达式。

**`ExpressionWithTypeArguments` 里用的是 `PropertyAccessExpression`**（不是 `QualifiedName`）：
`extends globalThis.Iterator` 的 TS 是 `ExpressionWithTypeArguments > PropertyAccessExpression`。
（`QualifiedName` 是**类型引用**那一支的写法，见 `projectTypeExpression`——两者别混。）

```ts
  let node = nameOf(names[0], ctx);
  for (let i = 1; i < names.length; i++) {
    const right = nameOf(names[i], ctx);
    node = { kind: "PropertyAccessExpression", expression: node, name: right, pos: node.pos, end: right.end };
  }
  return node;
```

# private method projectSwitch:(v:any, ctx:any)=>any

`switch (v) { … }` → `SwitchStatement`（`expression` + `caseBlock`）。

TS 在这两层之间还有一个 **`CaseBlock`**（就是那对花括号），产物那边没有这一层
（`Switch` 只有 `compare` 与 `segments` 两个段）——所以这里**合成**它：
区间从第一个 `{` 起、到 `switch` 自己的终点（那个 `}` 正好是最后一个字符）。

```ts
  const kids = projectableKids(v);
  const cond = kidsOf(v, "compare");
  const segments = kidsOf(v, "segments");
  const brace = ctx.source.indexOf("{", v.start);
  const props = {};
  if (cond.length > 0) props.expression = projectExpression(cond, ctx);
  props.caseBlock = {
    kind: "CaseBlock",
    clauses: segments.map((seg) => projectSwitchClause(seg, ctx)),
    pos: brace >= 0 ? brace : v.start,
    end: v.end,
  };
  return { kind: "SwitchStatement", pos: v.start, end: v.end, ...props };
```

# private method projectSwitchClause:(seg:any, ctx:any)=>any

一个 `case` / `default` 分支 → **`CaseClause` / `DefaultClause`**（第 89 轮）。

产物那边是 `<SwitchSegment key="case|default">`，里面一层 `<SwitchCase>表达式</SwitchCase>`
与一层 `<SwitchStatement>`（装分支体那些 `<Statement>`）；TS 那边是
`CaseClause > [expression, statements]` / `DefaultClause > [statements]`，**区间含 `case` 这个词**
（就是 segment 自己的区间）。

早先这里把整段交给通用投影，于是 `SwitchSegment` / 内层 `SwitchStatement` / `SwitchCase`
三个标签**原样透传**成了三个 kind——实测「多出来」203 + 203 + 192，
而 TS 那边是 `SwitchStatement > caseBlock: CaseBlock > clauses: (CaseClause|DefaultClause)`。

```ts
  const sv = seg instanceof Map ? view(seg) : seg;
  const kindWord = String(sv.attrs.get("key") ?? "");
  const kids = projectableKids(sv);
  const caseUnit = kids.find((k) => k.get("type") === "SwitchCase");
  const bodyUnit = kids.find((k) => k.get("type") === "SwitchStatement");
  const props = {};
  if (kindWord !== "default" && caseUnit !== undefined) {
    props.expression = projectExpression(projectableKids(view(caseUnit)), ctx);
  }
  if (bodyUnit !== undefined) {
    const body = allKids(view(bodyUnit)).filter((k) => !INVISIBLE.has(k.get("type")));
    const statements = projectEach(body, ctx);
    if (statements.length > 0) props.statements = statements;
  }
  // **区间结尾按最后一个语句算**（第 89 轮修）：`SwitchSegment` 自己的区间比 TS 多一个字符
  // （实测 `case "\r":` 产物 [345,400) vs TS [345,399)，192 处漂移 + 192 处「多出来」——
  // 同一个节点两边都记了一次）。没有语句的那些（`case 2:` 后面直接跟下一个 `case`）
  // 用 segment 自己的尾巴就正好。
  const last = props.statements !== undefined ? props.statements[props.statements.length - 1] : undefined;
  const end = last !== undefined && typeof last.end === "number" ? last.end : sv.end;
  return {
    kind: kindWord === "default" ? "DefaultClause" : "CaseClause",
    pos: sv.start,
    end,
    ...props,
  };
```

# private method projectSignature:(v:any, ctx:any)=>any

可调用 / 可构造签名 `(x: A): B` / `new (x: A): B` → `CallSignature` / `ConstructSignature`。

产物那边两者**同标签**（`<Signature kind="call|construct">`），靠 `kind` 属性分——
所以这里按属性换 kind。TS 那边两者都没有名字字段、形参直接挂在自己身上。

```ts
  const kind = v.attrs.get("kind") === "construct" ? "ConstructSignature" : "CallSignature";
  const props = structuralProps(v, kind, ctx);
  // 产物把 `new` 收成一个 `New` 子单元（`NewType` 里才是形参括号）：TS 那边
  // `ConstructSignature` 的形参**直接挂在自己身上**，中间没有那一层。
  const kids = projectableKids(v);
  const newUnit = kids.find((k) => k.get("type") === "New");
  if (newUnit !== undefined) {
    const inner = projectableKids(view(newUnit));
    const bracket = inner.find((k) => k.get("type") === "Bracket");
    if (bracket !== undefined) {
      const params = unwrapNodes(bracket).filter((k) => !INVISIBLE.has(k.get("type")));
      props.parameters = projectEach(params, ctx, kind);
    }
    const returnType = inner.find((k) => k.get("type") === "ReturnType");
    if (returnType !== undefined) {
      const inner2 = unwrapNodes(returnType).filter((k) => !INVISIBLE.has(k.get("type")));
      const t = typeOf(inner2, ctx);
      if (t !== undefined) props.type = t;
    }
    delete props.children;
  }
  const end = SIGNATURE_KINDS.has(kind) && ctx.source[stmtEndOf(v, ctx)] === ";" ? stmtEndOf(v, ctx) + 1 : stmtEndOf(v, ctx);
  return { kind, pos: v.start, end, ...props };
```

# private method projectExport:(v:any, ctx:any, following:Array<any>)=>any

`export = X` / `export default X` → `ExportAssignment`（`expression`）。

产物那边这两种在 `Export` 单元**外面**：`Statement > [Export(含 export/=), 表达式]`
（`export = strict`）或 `Statement > [Export(含 export/default), 表达式]`——
于是通用投影把 `Export` 投成 `ExportDeclaration`、真正的表达式留成一个平级的
`ExpressionStatement`（真实语料 `ExportAssignment` 849 处里，`expression` 整个丢掉的
与 `Identifier` 缺 1149 处同源）。

判据：那个 `Export` 单元后面还有子单元（`export { a }` / `import` 那一族没有）——
有就跟上来的整段收成 `expression`，区间从 `export` 到表达式末尾。

```ts
  const view_ = v.attrs === undefined ? view(v) : v;
  const kids = projectableKids(view_);
  const rest = kids.filter((k) => !(k.get("type") === "Keyword" && textOfNode(k, ctx) === "export"));
  const isAssignment =
    rest.some((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=") ||
    rest.some((k) => k.get("type") === "Keyword" && textOfNode(k, ctx) === "default");
  // 等号 / `default` 之后的表达式：`Export` 单元里剩下的 + 语句里跟在它后面的兄弟。
  const inUnit = rest.filter(
    (k) =>
      !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=") &&
      !(k.get("type") === "Keyword" && textOfNode(k, ctx) === "default"),
  );
  const expr = [...inUnit, ...(following ?? [])].filter(
    (k) => k instanceof Map && !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ";"),
  );
  if (isAssignment && expr.length > 0) {
    const value = projectExpression(expr, ctx);
    if (value !== undefined) {
      // **尾分号算在 `ExportAssignment` 里**（`export = strict;` 的 TS 是 `[23,39)`，含 `;`）
      //——与第 33 轮记的「没有函数体的可调用签名要带尾分号」同一条口径。
      const end = endOf(expr[expr.length - 1]);
      return {
        kind: "ExportAssignment",
        expression: value,
        pos: view_.start,
        end: ctx.source[end] === ";" ? end + 1 : end,
      };
    }
  }
  // 具名导出（`export { a as b, c, type D }`）与模块名走 `namedExportClause`（第 87 轮）：
  // 尾分号算在 `ExportDeclaration` 里（TS 的 `export { a };` 是 [0,14)，含 `;`）。
  return {
    kind: "ExportDeclaration",
    pos: view_.start,
    // **区间必须从视图上取**（第 93 轮修）：`projectStatement` 递进来的是**原始 Map**，
    // 而 `stmtEndOf` 读的是 `v.start` / `v.end` —— 原始 Map 上这两个属性都是 `undefined`
    // （它们在 `range` 里），于是终点变成 `undefined`、投影出来的 `ExportDeclaration`
    // 成了零宽区间：实测 108 处漂移 + 108 处「多出来」（同一个节点两边各记一次）。
    end: stmtEndOf(view_, ctx),
    ...namedExportClause(view_, ctx),
  };
```

# private method namedExportClause:(v:any, ctx:any)=>any

**具名导出**（第 87 轮）：`export { a as b, c, type D }` 的产物是
`[Keyword(export), Bracket{ a as b, c, type D }]`，而 TS 那边是

    ExportDeclaration[0,29)  exportClause:NamedExports[7,28)
                             └ elements: ExportSpecifier[9,15)  propertyName:a  name:b
                                         ExportSpecifier[17,18) name:c
                                         ExportSpecifier[20,26) name:D

照通用投影会把括号里每个单元（**包括 `as` 与 `type` 两个词**）投成平级子节点——
实测「多出来」里 `Identifier` 234 个就是那个 `as`，而 `ExportSpecifier` 缺 134 个。
所以这里自己造 `NamedExports`（区间含那对花括号）与 `ExportSpecifier`
（`as` 不出现、`type` 也不出现：TS 那边它是标志、连区间都算在 specifier 里）。

```ts
  const kids = projectableKids(v);
  const brace = kids.find((k) => k.get("type") === "Bracket" && k.get("startBracket") === "{");
  const props = {};
  if (brace !== undefined) {
    const open = startOf(brace);
    const close = endOf(brace);
    props.exportClause = {
      kind: "NamedExports",
      elements: namedExportSpecifiers(ctx.source, open, close - 1),
      pos: open,
      end: close,
    };
  }
  // `export { a } from "m"` 的模块名（TS：`moduleSpecifier`，与 `exportClause` 并列）。
  const module_ = kids.find((k) => k.get("type") === "String");
  if (module_ !== undefined) props.moduleSpecifier = projectNode(module_, ctx);
  return props;
```

# private method namedExportSpecifiers:(source:string, braceOpen:int, braceClose:int)=>Array<any>

`export { a as b, c, type D }` → `ExportSpecifier` 数组。

与 `namedImportSpecifiers` **同形**（`as` 不是子节点：`propertyName` + `name`），
差别只有一处：**段首的 `type`** 是要跳过的标志，但**区间仍从段首算**
（TS 的 `type D` 那个 specifier 是 `[20,26)`，子节点只有 `name: D[25,26)`）。

```ts
  const out = [];
  let depth = 0;
  let segStart = braceOpen + 1;
  const flush = (to) => {
    let from = segStart;
    while (from < to && /\s/.test(source[from])) from++;
    let stop = to;
    while (stop > from && /\s/.test(source[stop - 1])) stop--;
    if (from >= stop) return;
    const pos = from;
    // 段首的 `type` 是标志：跳过它再算名字，但**区间从段首算**。
    const body = source.slice(from, stop);
    const head = body.replace(/^type\s+/, "");
    const headAt = from + (body.length - head.length);
    const asAt = head.search(/\s+as\s+/);
    if (asAt >= 0) {
      const gap = head.slice(asAt).match(/\s+as\s+/)[0].length + asAt;
      const property = identWithin(source, head.slice(0, asAt).trim(), headAt, headAt + asAt);
      const nameText = head.slice(gap).trim();
      const name = identWithin(source, nameText, headAt + gap, stop);
      out.push({ kind: "ExportSpecifier", propertyName: property, name, pos, end: stop });
    } else {
      out.push({
        kind: "ExportSpecifier",
        name: identWithin(source, head.trim(), headAt, stop),
        pos,
        end: stop,
      });
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
```

# private method projectTypePredicate:(v:any, ctx:any)=>any

类型谓词 `value is T` / `asserts value is T` / `asserts value` → `TypePredicate`。

产物那边三种身份（`asserts` 是 `AssertsKeyword`、参数名是 `Identifier`、`is` 是 `Keyword`）
全挤在**平级的子单元**里，而 TS 那边它们是两个具名字段（`parameterName` / `type`，
`asserts` 时多一个 `assertsModifier`）——不分开时整族都只投出「一串 `Identifier`」
（真实语料 `TypePredicate` 的 `is` / 类型实参全对不上，`TypeReference` 有 360 处缺在它下面）。

`is` 在产物里的词法身份不固定（`Keyword` 或 `Identifier`），两种都认；
谓词里的类型**走类型位投影**（`T` ⇒ `TypeReference > Identifier`）。

```ts
  const kids = projectableKids(v);
  const props = {};
  let i = 0;
  if (i < kids.length && kids[i].get("type") === "Keyword" && textOfNode(kids[i], ctx) === "asserts") {
    props.assertsModifier = projectNode(kids[i], ctx);
    i++;
  }
  if (i < kids.length && isNameNode(kids[i])) {
    props.parameterName = projectNode(kids[i], ctx);
    i++;
  }
  if (i < kids.length && textOfNode(kids[i], ctx) === "is") {
    // **`is` 不进子字段**（第 76 轮实测）：TS 的 `TypePredicate` 只有
    // `parameterName` / `type`（+ `asserts` 时的 `assertsModifier`）三格，
    // `is` 是词法记号、`ts.forEachChild` **不会**访问它——留着一个 `isKeyword`
    // 会让这一整类（382 处）的字段名多出一格。位置仍然算出来（下面那个 `i++`）。
    i++;
  }
  if (i < kids.length) {
    const type = projectTypeExpression(kids.slice(i), ctx);
    if (type !== undefined) props.type = type;
  }
  return { kind: "TypePredicate", pos: v.start, end: v.end, ...props };
```

# private method projectLogical:(v:any, ctx:any)=>any

`a && b || c` 的链 → **左结合的嵌套 `BinaryExpression`**。

产物那边第 71 轮起是「整段一个单元、子单元按原文顺序排」（`[a, &&, b, ||, c]`）——
运算符就是它的子单元，所以按「遇到运算符就折一层」扫一遍即可。
只有一个操作数时（`a`）不成节点：TS 那边它就是那个操作数本身。

```ts
  const kids = projectableKids(v);
  if (kids.length === 0) return undefined;
  let left = projectNode(kids[0], ctx);
  let i = 1;
  while (i + 1 < kids.length) {
    left = {
      kind: "BinaryExpression",
      left,
      operatorToken: projectNode(kids[i], ctx),
      right: projectNode(kids[i + 1], ctx),
      pos: left.pos,
      end: endOf(kids[i + 1]),
    };
    i += 2;
  }
  return left;
```

# private method projectIfSet:(v:any, ctx:any)=>any

`if (a) { … } else if (b) { … } else { … }` → **嵌套的 `IfStatement`**。

产物那边的形状是 `IfSet > IfSegment*`，而 TS 是
`IfStatement(expression, thenStatement[, elseStatement])`——`IfSegment` 在 TS 侧**没有对应节点**
（它是产物自己的分段壳）。所以这里不能走通用的 `structuralProps`：那会把 `IfSegment`
原样透传（真实语料 103 处挂在「未覆盖标签」上），而每个段的体又会散成裸的语句单元
（`Block` 整类缺 2185 处，其中 **1814 处的父节点正是 `IfStatement`**）。

四处口径都是实测出来的（`tolist` 会把 `IfSegment` 的 `statement` 段**摊平**：
段里那个 `IfStatement` 自己不是节点，它的子单元才是）：

1. **`IfSegment` 收起、`IfStatement` 摊平**：`statement` 段直接是体的语句列表，
   `condition` 段直接是条件表达式——两者都不必再剥一层壳；
2. **花括号要回原文找**：`if (a) { g(); }` 的 `IfStatement` 区间是 `[7,18]`（两个端点**包含**），
   而 `if (a) g();` 的 `IfStatement` 区间 `[7,10]` 恰好等于那条语句本身。
   判据是「体的**每一段**都由花括号包着」：只有首个语句的起点在 `{` 与配对 `}` 之间时才是块，
   否则那个 `{` 是**后一条语句**（`if (a) b(); { }`）——用「第一个 `{` 就认块」会造出假节点；
3. **`else` 那个词不进子字段**（第 76 轮实测）：TS 的 `IfStatement` 只有
   `expression` / `thenStatement` / `elseStatement` 三格，`else` 是词法记号、
   `ts.forEachChild` **不会**访问它——留着一个 `elseKeyword` 会让这一整类（163 处）
   的字段名多出一格。所以下面那个位置仍然算出来（`at`），但**不挂进 `props`**；
4. **`else if` 是嵌套、`else {}` 是块**：前者把一个完整的 `if` 段交给递归。

```ts
  const segments = projectableKids(v).filter((k) => k.get("type") === "IfSegment");
  if (segments.length === 0) {
    return { kind: "IfStatement", pos: v.start, end: v.end };
  }
  /** 段里的条件：`condition` 段在这一层是**摊平**的（`if (a)` 直接就是那个 `Identifier`）。 */
  const conditionOf = (seg) => {
    const cond = kidsOf(view(seg), "condition");
    return cond.length === 0 ? undefined : projectExpression(cond, ctx);
  };
  // **体 = 段里除了条件之外的全部子单元**：`condition` 段在这一层是**摊平**的
  // （`if (a)` 的段里，条件段直接就是那个 `Identifier`），所以不能按标签认，
  // 只能按身份排掉条件段里的那几个单元（否则 `a` 会被当成第一条语句，块里凭空多一个 `Identifier`）。
  const bodyOf = (seg) => {
    const view_ = view(seg);
    const cond = new Set(kidsOf(view_, "condition"));
    return allKids(view_).filter((k) => !INVISIBLE.has(k.get("type")) && !cond.has(k));
  };
  /**
   * 造一层 `IfStatement`，返回 `{ node, end }`。
   *
   * **返回值里带上终点**是刻意的：外层那一层的终点必须等于它 `elseStatement` 的终点，
   * 而 `elseStatement` 在 `else if` 时是**下一个段自己造的**那一层——
   * 直接从返回的节点上读会读到未定的字段，所以让内层把终点显式交出来。
   */
  const build = (index) => {
    const props = {};
    const seg = view(segments[index]);
    const expr = conditionOf(segments[index]);
    if (expr !== undefined) props.expression = expr;
    const thenBody = blockOfBody(bodyOf(segments[index]), ctx);
    if (thenBody !== undefined) props.thenStatement = thenBody.node;
    let pos = seg.start;
    let end = thenBody === undefined ? seg.end : thenBody.end;
    if (index + 1 < segments.length) {
      // **`else` 在本段的 `if` 与下一段之间**，所以从下一段的起点往回找：
      // 段的起点在 `else if` 时是那个 `if`（不是 `else`），从本段起点往后找会把它自己
      // 那个 `else` 认成这一层的（实测 `elseKeyword` 的区间整体前移一格族）。
      const at = ctx.source.lastIndexOf("else", view(segments[index + 1]).start);
      const key = view(segments[index + 1]).attrs.get("key");
      if (key === "if") {
        const inner = build(index + 1);
        props.elseStatement = inner.node;
        // `else if` 时**内层那一层的起点**要改成 `else` 后面那个 `if`——
        // 它自己的 `seg.start` 也在那个 `if` 上，所以两层各修各的，外层不动 `pos`。
        inner.node.pos = ctx.source.indexOf("if", at + 4);
        end = inner.end;
      } else {
        // **`else { … }` 的 `elseStatement` 是那个体本身**（块或单条语句），
        // 不是又一层 `IfStatement`（第 90 轮修）：多造一层会让 `IfStatement` 多出 225 个，
        // 而 TS 那边 `elseStatement` 是 `Block`——同一处还带着「区间偏短」的漂移 116 处。
        const elseBody = blockOfBody(bodyOf(segments[index + 1]), ctx);
        if (elseBody !== undefined) {
          props.elseStatement = elseBody.node;
          end = elseBody.end;
        } else {
          // 空体（`else {}`）：TS 那边仍是一个空 `Block`。
          const brace = ctx.source.indexOf("{", at + 4);
          const close = brace >= 0 ? matchingBrace(ctx.source, brace) : -1;
          if (brace >= 0 && close >= brace) {
            props.elseStatement = { kind: "Block", statements: [], pos: brace, end: close + 1 };
            end = close + 1;
          }
        }
      }
    }
    // 终点**从体量出来**，不能取段的 `range[1]`：那两端在花括号体上是**包含**的
    // （`{ b(); }` 给 15），在单条语句体上是**排他**的（`b();` 给 11）——
    // 同一个字段两种口径，只有回原文量那对花括号才分得清。
    return { node: { kind: "IfStatement", pos, end, ...props }, end };
  };
  return build(0).node;
```

# private method projectFor:(v:any, ctx:any)=>any

`for (let i = 0, j = 1; i < j; i++, j--) {}` → `ForStatement`。

产物那边四个段是命名段（`initial` / `compare` / `next` / `body`），TS 那边是
`initializer` / `condition` / `incrementor` / `statement`：

- **头部三段是表达式位**：照通用投影会逐个单元投（`i < j` 会散成 `Identifier` +
  `LessThanToken` + `Identifier`，实测「缺 `BinaryExpression`」成片是这个形状）；
  `let` 开头的那一段走列表版（`VariableDeclarationList`，**不套 `VariableStatement`**）；
- **体段为空时 `body` 是 `[]`**（`for (;;) {}` 的空块在 `ToList` 时就摊掉了），
  而 TS 那边仍有一个空 `Block`——所以空体要**自己从原文造**（按头部 `)` 之后的 `{` 量区间）。

```ts
  const props = {};
  const initial = kidsOf(v, "initial").filter((k) => !INVISIBLE.has(k.get("type")));
  if (initial.length > 0) {
    props.initializer =
      initial[0].get("type") === "Let"
        ? projectLetFrom(initial, ctx, v).list
        : projectExpression(initial, ctx);
  }
  const compare = kidsOf(v, "compare").filter((k) => !INVISIBLE.has(k.get("type")));
  if (compare.length > 0) props.condition = projectExpression(compare, ctx);
  const next = kidsOf(v, "next").filter((k) => !INVISIBLE.has(k.get("type")));
  if (next.length > 0) props.incrementor = projectExpression(next, ctx);
  const body = kidsOf(v, "body").filter((k) => !INVISIBLE.has(k.get("type")));
  const built = blockOfBody(body, ctx);
  if (built !== undefined) {
    props.statement = built.node;
  } else if (ctx.source[stmtEndOf(v, ctx) - 1] === "}") {
    // 空体：括号在原文里，自己量（与 `projectTry` 里两个块同一套做法）。
    const header = ctx.source.indexOf(")", v.start);
    const brace = header >= 0 ? ctx.source.indexOf("{", header) : -1;
    const close = brace >= 0 ? matchingBrace(ctx.source, brace) : -1;
    if (brace >= 0 && close >= brace) {
      props.statement = { kind: "Block", statements: [], pos: brace, end: close + 1 };
    }
  }
  return { kind: "ForStatement", pos: v.start, end: v.end, ...props };
```

# private method blockOfBody:(kids:Array<any>, ctx:any)=>any

一个段的体 → `Block`（或没有花括号时的单条语句）。

判据（两处都得看，不能只看第一个 `{`）：先找**第一个语句起点之前**的那个 `{`，
再要求它配对出来的 `}` **不早于最后一个语句的终点**——
`if (a) b(); { c(); }` 里那个 `{` 属于**下一条语句**，第一个语句的终点在它之前，
所以「第一个 `{` 就认块」会造出一个 TS 那边不存在的 `Block`。
反过来，体的语句都在花括号里时，配对的 `}` 一定盖住全部语句。

```ts
  const list = kids.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  const projections = projectEach(list, ctx);
  if (projections.length === 0) return undefined;
  const first = startOf(list[0]);
  const last = endOf(list[list.length - 1]);
  const brace = ctx.source.lastIndexOf("{", first);
  if (brace >= 0) {
    const close = matchingBrace(ctx.source, brace);
    if (close >= last) {
      return { node: { kind: "Block", statements: projections, pos: brace, end: close + 1 }, end: close + 1 };
    }
  }
  // 没有花括号：TS 那边就是那条语句本身（`if (a) f();` ⇒ `ExpressionStatement`）。
  return {
    node:
      projections.length === 1
        ? projections[0]
        : { kind: "Block", statements: projections, pos: first, end: last },
    end: last,
  };
```

# private method matchingBrace:(source:string, open:int)=>int

```ts
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
```

# private const MEMBER_IN_OBJECT:Set<string> = new Set(["MethodDeclaration", "GetAccessor", "SetAccessor", "PropertyAssignment", "ShorthandPropertyAssignment", "SpreadAssignment"])

**对象字面量里「已经是成员」的那些 kind**：`{ m() {} }` 那一组只有一格、投出来就是
`MethodDeclaration`——它**直接进 `properties`**，不要再套一层 `ShorthandPropertyAssignment`
（TS 那边对象字面量的方法是 `MethodDeclaration` / `GetAccessor` / `SetAccessor`，与类里同名）。

# private method splitTopLevel:(kids:Array<any>, ctx:any, separator:string)=>Array<Array<any>>

把一串单元按**顶层分隔符**切成若干组（分隔符自己不进任何一组）。

对象字面量的成员（`,`）、数组字面量的元素（`,`）、类型容器的成员（`|` / `&` / `,`）
都是这一种切法——`typeMemberGroups` 是它在类型位的那一份（按 `parentKind` 选分隔符），
这里这份给**值位**用。

```ts
  const groups = [];
  let current = [];
  for (const kid of kids) {
    if (kid.get("type") === "SymbolToken" && textOfNode(kid, ctx) === separator) {
      groups.push(current);
      current = [];
      continue;
    }
    current.push(kid);
  }
  groups.push(current);
  return groups.filter((group) => group.length > 0);
```

# private method projectObjectLiteral:(v:any, ctx:any)=>any

值位对象字面量 `{ a: 1, b, "k": 2, [k]: 3, ...rest, m() {} }` → `ObjectLiteralExpression`。

TS 那边的 `properties` 是**成员数组**：

| 写法 | TS 的成员 |
| --- | --- |
| `a: 1` / `"k": 2` | `PropertyAssignment`（名字照常投，引号名是 `StringLiteral`） |
| `[k]: 3` | `PropertyAssignment` + `ComputedPropertyName` |
| `b` | `ShorthandPropertyAssignment` |
| `...rest` | `SpreadAssignment`（区间含 `...`，`expression` 是后面那段） |
| `m() {}` | `MethodDeclaration`（原样放进 `properties`，见 `MEMBER_IN_OBJECT`） |

产物那边是**一串平级单元**（`[a, :, 1, ,, b, ,, …]`），照通用投影会把每个单元都当成一个属性
——实测缺 `PropertyAssignment` 387 处，而 `properties` 里还混着 `ColonToken` / `CommaToken`。
所以这里按**顶层逗号**切成成员组，每组按上表分派。

**解构模式不走这里**：`const { a, b } = x` / `f({ a, b })` 那条路由 `projectBindingPattern`
（它自己造 `ObjectBindingPattern`），与本方法各管一边。

```ts
  const properties = [];
  for (const group of splitTopLevel(projectableKids(v), ctx, ",")) {
    const first = group[0];
    // `...rest`：TS 的 `SpreadAssignment` 区间含 `...`，`expression` 是后面那段。
    if (first.get("type") === "Spread") {
      const inner = projectableKids(view(first)).filter(
        (k) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "..."),
      );
      properties.push({
        kind: "SpreadAssignment",
        expression: inner.length > 0 ? projectExpression(inner, ctx) : undefined,
        pos: startOf(first),
        end: endOf(first),
      });
      continue;
    }
    const colonAt = group.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":");
    if (colonAt < 0) {
      // 简写属性（`{ a }`）或一个已经成形的成员（`{ m() {} }`）。
      if (group.length === 1) {
        const one = projectNode(group[0], ctx);
        if (one !== undefined && MEMBER_IN_OBJECT.has(one.kind)) {
          properties.push(one);
        } else {
          properties.push({
            kind: "ShorthandPropertyAssignment",
            name: one,
            pos: startOf(group[0]),
            end: endOf(group[0]),
          });
        }
      } else {
        const one = projectExpression(group, ctx);
        if (one !== undefined) properties.push(one);
      }
      continue;
    }
    const nameUnits = group.slice(0, colonAt);
    const valueUnits = group.slice(colonAt + 1);
    // 计算属性名 `[k]`：产物里是一个 `ArrayLiteral`（含方括号），TS 是 `ComputedPropertyName`。
    const computed =
      nameUnits.length === 1 && isIndexBracket(nameUnits[0]) ? nameUnits[0] : undefined;
    const name =
      computed === undefined
        ? projectExpression(nameUnits, ctx)
        : {
            kind: "ComputedPropertyName",
            expression: computedNameExpression(computed, ctx),
            pos: startOf(computed),
            end: endOf(computed),
          };
    properties.push({
      kind: "PropertyAssignment",
      name,
      initializer: valueUnits.length > 0 ? projectExpression(valueUnits, ctx) : undefined,
      pos: startOf(group[0]),
      end: endOf(group[group.length - 1]),
    });
  }
  const props = properties.length === 0 ? {} : { properties };
  return { kind: "ObjectLiteralExpression", pos: v.start, end: stmtEndOf(v, ctx), ...props };
```

# private method projectArrayLiteral:(v:any, ctx:any)=>any

值位数组字面量 `[a, b, ...c]` → `ArrayLiteralExpression`（`elements` 是**元素数组**）。

同一类账：产物那边是一串平级单元（含逗号），照通用投影会把逗号也当成一个元素
（实测 `ArrayLiteralExpression` 的漂移与 `Identifier` 缺口里都有它）。按顶层逗号切，
每段整段投；`...c` 那一格照 `SpreadElement` 投（TS 的数组里就是 `SpreadElement`，
与对象字面量的 `SpreadAssignment` 不同）。

```ts
  const elements = [];
  for (const group of splitTopLevel(projectableKids(v), ctx, ",")) {
    if (group.length === 1) {
      const one = projectNode(group[0], ctx);
      if (one !== undefined) elements.push(one);
      continue;
    }
    const one = projectExpression(group, ctx);
    if (one !== undefined) elements.push(one);
  }
  const props = elements.length === 0 ? {} : { elements };
  return { kind: "ArrayLiteralExpression", pos: v.start, end: stmtEndOf(v, ctx), ...props };
```

# private method projectNonNullExpression:(v:any, ctx:any)=>any

非空断言 `x!` → `NonNullExpression`（**只有 `expression` 一个子字段**）。

TS 那边 `!` 是节点的属性（`exclamationToken`），`forEachChild` **不访问**它；产物那边它是
`[Identifier, SymbolToken(!)]` 两个平级单元——照通用投影会把 `!` 也算进 `expression`
（实测「多出来的节点」里 `ExclamationToken` 350 个全是它）。

```ts
  const kids = projectableKids(v).filter(
    (k) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
  );
  const props = {};
  const expression = kids.length > 0 ? projectExpression(kids, ctx) : undefined;
  if (expression !== undefined) props.expression = expression;
  return { kind: "NonNullExpression", pos: v.start, end: v.end, ...props };
```

# private method projectTypeOperator:(v:any, ctx:any)=>any

`keyof T` / `readonly T[]` / `unique symbol` → `TypeOperator`（**只有 `type` 一个子字段**）。

TS 那边那个词（`keyof` / `readonly` / `unique`）是节点的**属性**（`operator`），
`forEachChild` 只看 `type`。产物那边它与操作数是平级的两个单元，照通用投影会把它当成
`type` 的一段——实测「多出来的节点」里两类都从这里来：

- `readonly Uint8Array[]`：`type` 成了一个两格的数组（`ReadonlyKeyword` + `ArrayType`）✗，
  而 TS 的 `type` **就是那个 `ArrayType`**（`TypeOperator[17,38) > ArrayType[26,38)`）；
- `unique symbol`：操作数被投成 `TypeReference > Identifier(symbol)` ✗，
  而 TS 那边是 `SymbolKeyword`（`TypeOperator[9,22) > SymbolKeyword[16,22)`）——
  所以操作数必须走**类型位投影**（`projectTypeExpression`），不是通用投影。

```ts
  const kids = projectableKids(v).filter(
    (k) =>
      !(
        k.get("type") === "Keyword" &&
        (textOfNode(k, ctx) === "keyof" ||
          textOfNode(k, ctx) === "readonly" ||
          textOfNode(k, ctx) === "unique")
      ),
  );
  const props = {};
  const operand = kids.length > 0 ? projectTypeExpression(kids, ctx) : undefined;
  if (operand !== undefined) props.type = operand;
  return { kind: "TypeOperator", pos: v.start, end: v.end, ...props };
```

# private method projectMappedType:(v:any, ctx:any)=>any

映射类型 `{ readonly [P in keyof T]-?: T[P] }` → `MappedType`。

TS 那边的子字段（实测 `{ [P in keyof T]-?: T[P] }`）：

    MappedType[9,35)  typeParameter:TypeParameter[12,24)
                      questionToken:MinusToken[25,26)      ← `-?` 那个 `-`（`?` 不进子节点）
                      type:IndexedAccessType[29,33)

产物那边它们与一层 `Statement` 壳混在一起
（`[Statement[ ArrayLiteral(TypeParameter), SymbolToken(-), TypeDefine ]]`）——
照通用投影会投出一个 `ExpressionStatement`（实测「多出来」465 个）并把修饰符当成它的内容。
所以这里把这层壳摊平、按词形分派到四个字段。

```ts
  const flat = [];
  for (const k of projectableKids(v)) {
    if (k.get("type") === "Statement") {
      for (const inner of unwrapNodes(k)) flat.push(inner);
      continue;
    }
    flat.push(k);
  }
  const props = {};
  let readonlyToken;
  let questionToken;
  let typeParameter;
  const rest = [];
  for (let i = 0; i < flat.length; i++) {
    const k = flat[i];
    const kind = k.get("type");
    const word = kind === "Keyword" || kind === "Identifier" || kind === "SymbolToken" ? textOfNode(k, ctx) : "";
    if (word === "readonly") {
      readonlyToken = projectNode(k, ctx);
      continue;
    }
    if (word === "-" || word === "+") {
      // `-readonly` 是 `readonlyToken`，`-?` 是 `questionToken`——看**紧跟的下一格**。
      const next = i + 1 < flat.length ? textOfNode(flat[i + 1], ctx) : "";
      if (next === "readonly") {
        // **`-readonly` 的 `readonlyToken` 就是那个 `-`**（TS 的类型是
        // `ReadonlyKeyword | PlusToken | MinusToken`），后面那个 `readonly` 词
        // **不再单独成节点**——不收掉它会多出一个 `ReadonlyKeyword`，
        // 同时缺一个 `MinusToken`（实测「多出 1」+「缺 1」就是这一处）。
        readonlyToken = projectNode(k, ctx);
        i++;
      } else {
        questionToken = projectNode(k, ctx);
      }
      continue;
    }
    if (word === "?") {
      questionToken = projectNode(k, ctx);
      continue;
    }
    if (word === "in") continue;
    if (kind === "ArrayLiteral" || kind === "Bracket") {
      const inner = projectableKids(view(k)).find((x) => x.get("type") === "TypeParameter");
      if (inner !== undefined) {
        typeParameter = projectNode(inner, ctx);
        continue;
      }
    }
    if (kind === "TypeParameter") {
      typeParameter = projectNode(k, ctx);
      continue;
    }
    rest.push(k);
  }
  if (readonlyToken !== undefined) props.readonlyToken = readonlyToken;
  if (typeParameter !== undefined) props.typeParameter = typeParameter;
  // **可选映射的 `?` 被吞进了值类型的区间**（第 93 轮）：`{ [K in T]?: X }` 里那个
  // `TypeDefine` 从 `?` 起（与属性、形参两处同源），所以按「值类型段第一个字符是不是 `?`」切。
  // `-?` 那一支不走这里（`-` 已经是 `questionToken`）。
  if (questionToken === undefined && rest.length > 0 && ctx.source[startOf(rest[0])] === "?") {
    const at = startOf(rest[0]);
    questionToken = { kind: "QuestionToken", text: "?", pos: at, end: at + 1 };
  }
  if (questionToken !== undefined) props.questionToken = questionToken;
  const typeNode = rest.length > 0 ? projectTypeExpression(rest, ctx) : undefined;
  if (typeNode !== undefined) props.type = typeNode;
  return { kind: "MappedType", pos: v.start, end: v.end, ...props };
```

# private method projectNamedTupleMember:(v:any, ctx:any)=>any

具名元组成员 `[a: string]` / `[b?: number]` / `[...rest: boolean[]]` → `NamedTupleMember`。

TS 的字段是 `name` + 可选 `questionToken` / `dotDotDotToken` + `type`；产物那边是
`NamedTupleMember > [Identifier(名字), TypeDefine(类型)]`（`...` 是平级的 `SymbolToken`）。

**不能走通用投影**：`NamedTupleMember` 在 `TYPE_MEMBER_KINDS` 里，通用支会把名字那个
`Identifier` 也当类型投成 `TypeReference`（实测「多出来」3 + 缺 `QuestionToken` 1 +
字段名差 3，全部是这一处）。

```ts
  const kids = projectableKids(v);
  const dots = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "...");
  const spread = kids.find((k) => k.get("type") === "Spread");
  const nameNode = kids.find((k) => k.get("type") === "Identifier" || k.get("type") === "Keyword");
  const typeNode = kids.find((k) => k.get("type") === "TypeDefine");
  const props = {};
  if (nameNode !== undefined) {
    // `this` 作元组成员名时必须是 `Identifier`（与形参那一处同源，见 `projectParameter`）。
    props.name =
      nameNode.get("type") === "Keyword" && textOfNode(nameNode, ctx) === "this"
        ? { kind: "Identifier", text: "this", pos: startOf(nameNode), end: endOf(nameNode) }
        : projectNode(nameNode, ctx);
  }
  if (dots !== undefined) {
    props.dotDotDotToken = { kind: "DotDotDotToken", text: "...", pos: startOf(dots), end: startOf(dots) + 3 };
  } else if (spread !== undefined) {
    props.dotDotDotToken = projectNode(spread, ctx);
  }
  if (typeNode !== undefined) {
    // `?` 与属性、形参两处同源：它被吞进了 `TypeDefine` 的区间（`b?: number` 的段从 `?` 起）。
    const typeStart = startOf(typeNode);
    if (ctx.source[typeStart] === "?") {
      props.questionToken = { kind: "QuestionToken", text: "?", pos: typeStart, end: typeStart + 1 };
    }
    props.type = projectTypeDefine(view(typeNode), ctx);
  }
  return { kind: "NamedTupleMember", pos: v.start, end: v.end, ...props };
```

# private method projectTry:(v:any, ctx:any)=>any

`try { … } catch (e) { … } finally { … }` → `TryStatement`。

产物那边三段是**命名段**（`body` / `catches` / `finally`，见 `ToList`），
TS 那边是 `TryStatement > [tryBlock?, catchClause?, finallyBlock?]`：

- `body` / `finally` 段里直接是**语句**（`TryBody` / `FinallyBody` 那层壳在 `ToList` 时
  就被摊平了，产物里根本没有对应的块节点），所以两个 `Block` 要**自己造**：
  按关键字之后的那个 `{` 与配对的 `}` 量区间；
- `catches` 段里是 `CatchDefine`（`(e)`，区间含括号）与 `CatchBody`（本来就是 `Block` 节点）——
  `CatchDefine` 在 TS 里**不是节点**，它的内容进 `CatchClause.variableDeclaration`
  （一个只有 `name` 的 `VariableDeclaration`）。

照通用投影的结果是 `TryStatement > [body, catches, finally]`（实测缺 `Block` 2 +
缺 `CatchClause` + 缺 `VariableDeclaration` + 多出一个未映射的 `CatchDefine`）。

```ts
  const seg = (key) => kidsOf(v, key).filter((k) => !INVISIBLE.has(k.get("type")));
  const props = {};
  const blockAfter = (from, statements) => {
    const brace = ctx.source.indexOf("{", from);
    if (brace < 0) return undefined;
    const close = matchingBrace(ctx.source, brace);
    if (close < brace) return undefined;
    return { kind: "Block", statements, pos: brace, end: close + 1 };
  };
  const tryAt = ctx.source.indexOf("try", v.start);
  const tryBlock = blockAfter(tryAt < 0 ? v.start : tryAt, projectEach(seg("body"), ctx, "Block"));
  if (tryBlock !== undefined) props.tryBlock = tryBlock;
  const catches = seg("catches");
  const catchDefine = catches.find((k) => k.get("type") === "CatchDefine");
  const catchBody = catches.find((k) => k.get("type") === "CatchBody");
  if (catchDefine !== undefined || catchBody !== undefined) {
    const anchor = catchDefine !== undefined ? startOf(catchDefine) : startOf(catchBody);
    const at = ctx.source.lastIndexOf("catch", anchor);
    const inner = {};
    if (catchDefine !== undefined) {
      const binding = allKids(view(catchDefine)).find((k) => !INVISIBLE.has(k.get("type")));
      const name = binding === undefined ? undefined : projectNode(binding, ctx);
      if (name !== undefined) {
        inner.variableDeclaration = { kind: "VariableDeclaration", name, pos: name.pos, end: name.end };
      }
    }
    if (catchBody !== undefined) inner.block = projectNode(catchBody, ctx);
    props.catchClause = {
      kind: "CatchClause",
      pos: at >= 0 ? at : anchor,
      end: catchBody !== undefined ? endOf(catchBody) : endOf(catchDefine),
      ...inner,
    };
  }
  const finallyStatements = projectEach(seg("finally"), ctx, "Block");
  if (finallyStatements.length > 0) {
    const at = ctx.source.indexOf("finally", v.start);
    const finallyBlock = blockAfter(at < 0 ? v.start : at, finallyStatements);
    if (finallyBlock !== undefined) props.finallyBlock = finallyBlock;
  }
  return { kind: "TryStatement", pos: v.start, end: v.end, ...props };
```

# private method projectStaticBlock:(v:any, ctx:any)=>any

类静态块 `class A { static { … } }` → `ClassStaticBlockDeclaration`（`body: Block`）。

产物那边体括号不在树里（`StaticBlock > Statement*`），所以 `Block` 要**自己造**：
按 `static` 之后的那个 `{` 与配对的 `}` 量区间（与 `projectTry` 里两个块同一套做法）。

```ts
  const statements = projectEach(projectableKids(v), ctx, "Block");
  const brace = ctx.source.indexOf("{", v.start);
  const close = brace >= 0 ? matchingBrace(ctx.source, brace) : -1;
  const body =
    brace >= 0 && close >= brace ? { kind: "Block", statements, pos: brace, end: close + 1 } : undefined;
  return { kind: "ClassStaticBlockDeclaration", pos: v.start, end: v.end, ...(body === undefined ? {} : { body }) };
```

# private method projectNew:(v:any, ctx:any)=>any

`new Map<string, number>()` → `NewExpression`（`expression` + 可选 `typeArguments` / `arguments`）。

产物的 `New` 把 `name` 段记成**一串单元**（被构造者 + 类型实参段）、`arguments` 段是实参：

- 类型实参段要按**类型位**投进 `typeArguments`（`Map<string, number>` 的两格是
  `StringKeyword` / `NumberKeyword`，不是 `TypeReference`）；
- 空实参段在 `ToList` 里**干脆不出现**（`new Map<A, B>()`），而 TS 那边空 `arguments`
  也不进字段（`forEachChild` 不访问空数组）——所以只在非空时挂。

```ts
  const nameUnits = kidsOf(v, "name").filter((k) => !INVISIBLE.has(k.get("type")));
  const generic = nameUnits.find((k) => k.get("type") === "GenericType");
  const callee = nameUnits.find((k) => k.get("type") !== "GenericType");
  const props = {};
  if (callee !== undefined) props.expression = projectNode(callee, ctx);
  if (generic !== undefined) {
    const typeArguments = [];
    for (const group of splitTopLevel(projectableKids(view(generic)), ctx, ",")) {
      const one = projectTypeExpression(group, ctx);
      if (one !== undefined) typeArguments.push(one);
    }
    if (typeArguments.length > 0) props.typeArguments = typeArguments;
  }
  const args = kidsOf(v, "arguments").filter((k) => !INVISIBLE.has(k.get("type")));
  if (args.length > 0) props.arguments = projectEach(args, ctx);
  return { kind: "NewExpression", pos: v.start, end: v.end, ...props };
```

# private method projectDecorator:(v:any, ctx:any)=>any

装饰器 `@Component({ … })` / `@plain` → `Decorator`（**只有 `expression`**）。

TS 那边 `@Component({…})` 的 `expression` 是一个 `CallExpression`（被调用者是那个 `Identifier`），
`@plain` 的 `expression` 就是那个 `Identifier`；`@` 这个符号**不是节点**。
产物那边给的是 `name` + `children`（`@` 也在里面）——照通用投影会多出一个 `@` 节点。

```ts
  const kids = projectableKids(v).filter(
    (k) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "@"),
  );
  const props = {};
  if (kids.length > 0) {
    const inner = projectNode(kids[0], ctx);
    if (inner !== undefined) props.expression = inner;
  }
  return { kind: "Decorator", pos: v.start, end: v.end, ...props };
```

# private method projectWrappedType:(v:any, ctx:any, kind:string)=>any

`...A`（`RestType`）与 `B?`（`OptionalType`）→ 只有 `type` 一个字段。

两点号与问号在 TS 那边**不是子节点**（它们只是语法记号；`OptionalType` 与 `RestType`
的 kind 本身就说明了），所以要把它们从内容里排掉，否则会多出 `DotDotDotToken` /
`QuestionToken` 两个节点（实测各若干）。

```ts
  const kids = projectableKids(v).filter(
    (k) => !(k.get("type") === "SymbolToken" && ["...", "?"].includes(textOfNode(k, ctx))),
  );
  const props = {};
  const inner = kids.length > 0 ? projectTypeExpression(kids, ctx) : undefined;
  if (inner !== undefined) props.type = inner;
  return { kind, pos: v.start, end: v.end, ...props };
```

# private method projectHeritageClause:(v:any, ctx:any)=>any

`extends A, B` / `implements C, D` → `HeritageClause`（只有 `types` 一个子字段）。

TS 那边 `HeritageClause` 的 `forEachChild` **只访问 `types`**：`extends` / `implements`
那个词是节点的**属性**（`token`），不参与遍历。产物那边它与类型是一串**平级单元**
（`[Keyword(extends), TypeReference, SymbolToken(,), TypeReference]`），照通用投影会把
`ExtendsKeyword` 当成一个子节点——实测「投影后多出来的节点」里 `ExtendsKeyword` 有 **2192 个**。

```ts
  const kids = projectableKids(v).filter(
    (k) =>
      !(
        (k.get("type") === "Keyword" || k.get("type") === "Identifier") &&
        (textOfNode(k, ctx) === "extends" || textOfNode(k, ctx) === "implements")
      ),
  );
  const projected = projectEach(kids, ctx, "HeritageClause");
  const props = projected.length === 0 ? {} : { types: projected };
  return { kind: "HeritageClause", pos: v.start, end: v.end, ...props };
```

# private method projectTypeQuery:(v:any, ctx:any)=>any

`typeof X` / `typeof A.B` → `TypeQuery`（只有 `exprName` 一个子字段）。

TS 那边 `typeof` 是节点的**属性**（不是子节点），`exprName` 就是那个名字
（单个名字是 `Identifier`、点号名是 `QualifiedName`）——产物那边它是
`[Keyword(typeof), Identifier(X)]` 两个平级单元，照通用投影会把 `TypeOfKeyword`
也塞进 `exprName`。点号后面的名字常常在**节点外面**（见 `projectTypeExpression` 里那一支）。

```ts
  const kids = projectableKids(v);
  // **`typeof` 不是名字**（踩过）：它是 `Keyword`，而 `isNameNode` 认得 `Keyword`
  // （成员名那一族要用它），所以这里要显式排掉——否则 `exprName` 会是
  // `QualifiedName(typeof, globalThis)` 这种把运算符当名字的东西。
  const names = kids.filter((k) => isNameNode(k) && textOfNode(k, ctx) !== "typeof");
  const props = {};
  if (names.length === 1) {
    props.exprName = nameOf(names[0], ctx);
  } else if (names.length > 1) {
    props.exprName = qualifiedNameFrom(names, ctx);
  }
  return { kind: "TypeQuery", pos: v.start, end: v.end, ...props };
```

# private method projectTypeParameter:(v:any, ctx:any)=>any

类型参数 `<T extends object = any>` → `TypeParameter`
（`name` + 可选 `constraint` / `default` / `modifiers`）。

产物那边名字、`extends`、约束、`=`、默认值是**平级单元**，按标点切开。

```ts
  const kids0 = projectableKids(v);
  // **约束被整个包进 `UnionType` / `IntersectionType` 的形状**（第 83 轮）：产物把一个
  // `<A extends null | Writable>` 收成**一个** `UnionType`——名字、`extends`、约束三段全在它里面
  // （实测 `@types/node/child_process.d.ts` 那种 `<I extends null | Writable, O extends …>`
  // 成片：`Identifier` 缺 1581 里的一大块就是这个，名字与约束两头的 `Identifier` 都没有宿主）。
  // TS 那边 `TypeParameter` 是 `[name, constraint]` 两个字段、约束是**不含名字**的那个联合，
  // 所以这里把它摊开、按同一个分隔符重新切一次（收尾处再把余下的成员补回去）。
  const wrapped =
    kids0.length === 1 &&
    (kids0[0].get("type") === "UnionType" || kids0[0].get("type") === "IntersectionType")
      ? kids0[0]
      : undefined;
  const kids = wrapped === undefined ? kids0 : projectableKids(view(wrapped));
  // `extends` 的**词法身份不固定**：本仓库记过「接口的 `extends` 永远升不成 `Keyword`」——
  // 所以两种身份都认（`<T extends U>` 里它是 `Keyword`，而某些上下文里它是 `Identifier`）。
  // 只认 `Keyword` 时会**整类丢掉约束**（实测 17 处 `TypeParameter` 少一个 `constraint`）。
  const extIndex = kids.findIndex(
    (k) => (k.get("type") === "Keyword" || k.get("type") === "Identifier") && textOfNode(k, ctx) === "extends",
  );
  const eqIndex = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  // **映射类型的 `K in T`**（第 93 轮）：`in` 在名字**后面**（变型标注的 `in` 在名字**前面**，
  // 见 `isTypeParameterModifier`），所以「位置在名字之后」本身就是判据。
  // TS 那边 `MappedType.typeParameter.constraint` 就是 `in` 右边那一段——
  // 不收出来会整类丢约束（实测 47 处 `TypeParameter` 少一个 `constraint`，
  // 连带缺它里面的 `TypeOperator` / `TypeReference` / `Identifier`）。
  const inIndex = kids.findIndex(
    (k) => (k.get("type") === "Keyword" || k.get("type") === "Identifier") && textOfNode(k, ctx) === "in",
  );
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
  // 映射键的约束（见上面的 `inIndex`）：`extends` 与 `in` 不会同时出现，所以两条互斥。
  if (extIndex < 0 && nameIndex >= 0 && inIndex > nameIndex) {
    const body = kids.slice(inIndex + 1).filter((k) => !isTypeParameterModifier(k, ctx));
    if (body.length > 0) props.constraint = typeOf(body, ctx);
  }
  if (eqIndex >= 0) props.default = typeOf(kids.slice(eqIndex + 1), ctx);
  // 修饰词只认**名字之前**的那些：`<const T>` 的 `const`、`<in T>` / `<out T>` 的变型词。
  // TS 把它们算作 `TypeParameter.modifiers`（`forEachChild` 那层看得见），漏了 `const`
  // 就会少一整个字段（实测 `decl-func-generic-const-modifier.ts` 那族）。
  const modifiers = kids.filter((k, i) => (nameIndex < 0 || i < nameIndex) && isTypeParameterModifier(k, ctx));
  if (modifiers.length > 0) props.modifiers = projectEach(modifiers, ctx);
  // **收尾：把被包进联合的约束补全**（见上面 `wrapped`）：`extends` 之后那一段只是**第一个成员**
  // （`null`），余下的成员（`| Writable`）在同级的下一个组里——按同一个分隔符切回来，
  // 重新拼成一个 `UnionType` / `IntersectionType`，区间取第一个成员到最后一个成员。
  if (wrapped !== undefined) {
    const separator = wrapped.get("type") === "UnionType" ? "|" : "&";
    const members = splitTopLevel(kids, ctx, separator);
    const firstMember = members.length > 0 ? members[0] : [];
    const extAt = firstMember.findIndex(
      (k) => (k.get("type") === "Keyword" || k.get("type") === "Identifier") && textOfNode(k, ctx) === "extends",
    );
    const head = extAt >= 0 ? firstMember.slice(extAt + 1) : firstMember;
    const types = [];
    const firstType = head.length > 0 ? projectTypeExpression(head, ctx) : undefined;
    if (firstType !== undefined) types.push(firstType);
    for (const group of members.slice(1)) {
      const one = projectTypeExpression(group, ctx);
      if (one !== undefined) types.push(one);
    }
    if (types.length === 1) {
      props.constraint = types[0];
    } else if (types.length > 1) {
      props.constraint = {
        kind: wrapped.get("type"),
        types,
        pos: types[0].pos,
        end: types[types.length - 1].end,
      };
    }
  }
  return { kind: "TypeParameter", pos: v.start, end: v.end, ...props };
```

# private method isTypeParameterModifier:(node:any, ctx:any)=>bool

类型参数的修饰词：变型标注 `in` / `out` 与 `const` 类型参数。

**两者的词法身份不同**（README 的「已知口径」里记过）：TS 的扫描器只把 `in` 当关键词，
`out` 是上下文修饰、词法上仍是**标识符**；`const` 同理（产物那边是 `Keyword`）。
所以两种都认，否则 `out` 会被当成约束内容。

```ts
  const type = node.get("type");
  if (type !== "Keyword" && type !== "Identifier") return false;
  return ["in", "out", "const"].includes(textOfNode(node, ctx));
```

# private method projectLamda:(v:any, ctx:any)=>any

箭头函数 → `ArrowFunction`（`parameters` / `body` / `equalsGreaterThanToken` / `type`）。

**`=>` 在产物树里没有单元**（`Lamda` 只收 `parameters` 与 `body` 两段），
而 TS 那边 `equalsGreaterThanToken` 是子节点——所以这里按「形参段末尾 = 箭头位置」**合成**一个。
位置是**算出来的**：真实位置要靠词法才能知道 `=>` 前面的空白有多少，`endOf(参数段)` 只是它的下界。

```ts
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
```

# private method typeOf:(nodes:Array<any>, ctx:any)=>any

右值那一段单元 → 一个类型节点（`TypeDefine` 摊平；空段给 `undefined`）。

**走的是类型位的投影**（`projectTypeExpression`），不是逐个单元的通用投影：
类型别名 / 约束 / 联合成员这些位置上，`A<any>` 是**一个** `TypeReference`（同一区间两层节点），
早期那版按「第一个单元」投，于是实参整片丢掉（真实语料 `TypeReference` 缺 2087、
`AnyKeyword` 缺 1408 里的一大块都是这一条：`Array<any>` / `T extends any[]` 的实参没成形）。

```ts
  const list = nodes.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  if (list.length === 0) return undefined;
  return projectTypeExpression(list, ctx);
```

# private method quotedModuleNameSpan:(source:string, name:string, from:int)=>any

模块声明那个名字是不是**字符串字面量**（`declare module "assert/strict" {}`）。

产物的 `namespace` 属性里**没有引号**，所以判据只能回到原文：在**体（第一个 `{`）之前**
的窗口里找 `"name"` / `'name'`。找不到就是普通标识符（`namespace Foo`）——
窗口必须在 `{` 处截断，否则 `namespace A { const s = "A" }` 里的字符串会被误认成模块名。

```ts
  const brace = source.indexOf("{", from);
  const to = brace < 0 ? from + name.length + 40 : brace;
  const window = source.slice(from, Math.max(to, from + name.length + 2));
  for (const quote of ['"', "'"]) {
    const at = window.indexOf(quote + name + quote);
    if (at >= 0) return { pos: from + at, end: from + at + name.length + 2 };
  }
  return undefined;
```

# private method computedNameUnit:(v:any, ctx:any)=>any

计算属性名那个单元（`[Symbol.toPrimitive]` 在产物里是 `ArrayLiteral`，**含方括号**）。

只认「**第一个**子单元，而且原文那个位置就是 `[`」的那种——类字段的初始化式
（`x = [1, 2]`）也是 `ArrayLiteral`，但它前面还有 `=`。

```ts
  const kids = projectableKids(v);
  if (kids.length === 0) return null;
  const first = kids[0];
  if (first.get("type") !== "ArrayLiteral") return null;
  return ctx.source[startOf(first)] === "[" ? first : null;
```

# private method computedNameExpression:(unit:any, ctx:any)=>any

```ts
  const kids = projectableKids(view(unit)).filter((k) => !INVISIBLE.has(k.get("type")));
  const names = kids.filter((k) => isNameNode(k));
  const dots = kids.filter((k) => isDot(k, ctx)).length;
  if (dots > 0 && names.length === dots + 1) return dottedExpression(names, ctx);
  if (kids.length === 1) return projectNode(kids[0], ctx);
  return projectExpression(kids, ctx);
```

# private method structuralProps:(v:any, kind:string, ctx:any)=>any

结构类节点的字段（按 kind 给 TS 的字段名）。

**包装节点要提上去**（见 `WRAPPER_FIELDS`）：`ClassBody` 的内容成为 `ClassDeclaration.members`、
`ReturnType` 的内容成为 `FunctionDeclaration.type`、`Bracket` 的内容并进 `children`。

```ts
  const props = {};
  const used = new Set();
  // **装饰器要收成修饰词**（第 95 轮）：TS 把 `@Component({…})` 放在被装饰声明的
  // `modifiers` 里（第一格），而产物把它平铺在声明下面——不收出来有两个后果：
  // `Decorator` 整类缺（实测 12 处），以及 `ClassDeclaration.children` 被当成继承段
  // （`heritageClauses` 字段凭空多出，因为那张表把 `children` 映射成了 `heritageClauses`）。
  const decorators = [];
  // **`name` 按产物节点自己的属性给**，不维护 kind 白名单——白名单漏一个 kind，
  // 「字段名对拍」就多一处看不出根因的假差异。
  // 命名空间是唯一的例外：它的名字落在 `namespace` 属性上（不是 `name`）。
  const rawName = v.attrs.get("name") ?? v.attrs.get("fieldName") ?? v.attrs.get("namespace");
  const name = typeof rawName === "string" ? rawName : "";
  let nameNode = null;
  // 计算属性名的那个单元（`[Symbol.toPrimitive]`）；它在下面的段循环里要**跳过**。
  let computedUnit = null;
  // **`Constructor` 没有 `name` 字段**（TS 的类构造就是一个匿名的函数式声明）：
  // 产物那边它带着 `name="constructor"`，照抄会多出一个 TS 不认的 `Identifier`
  // 挂在构造下（那一格一直对不上）。
  if (name !== "" && kind === "Constructor") {
    used.add("name");
  } else {
    // **名字走共用判据**（见 `memberNameOf`）：`Identifier` / `StringLiteral`（引号名）/
    // `NumericLiteral`（数字名）/ `ComputedPropertyName`（计算名）四态在这里分派，
    // `projectField` 用的是同一份。
    const named = memberNameOf(v, ctx);
    computedUnit = named.computed;
    nameNode = named.unit;
    if (named.name !== undefined) {
      props.name = named.name;
    }
    if (named.name !== undefined || named.computed !== null) {
      used.add("name");
      used.add("fieldName");
      used.add("namespace");
    }
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
      // **可选方法 / 方法签名的 `?` 是字段、不是子节点**（第 93 轮修）：TS 的
      // `MethodSignature > [name, questionToken, type]`，而产物把它平铺在 `children` 里
      // （`MethodDeclaration > [?, Bracket(形参), ReturnType]`）——不收出来它会跟着
      // 形参表落进 `parameters`（实测字段名差 149 处）。
      if (
        (kind === "MethodSignature" || kind === "MethodDeclaration") &&
        x.get("type") === "SymbolToken" &&
        textOfNode(x, ctx) === "?"
      ) {
        const questionAt = startOf(x);
        props.questionToken = { kind: "QuestionToken", text: "?", pos: questionAt, end: questionAt + 1 };
        continue;
      }
      // **装饰器是修饰词、不是子节点**（见上面 `decorators`）。
      if (x.get("type") === "Decorator") {
        decorators.push(x);
        continue;
      }
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
      // **包装体的成员拿到的是「外层声明」的 kind**：`ClassBody` 的 `members` 属于
      // `ClassDeclaration`（类里的 `constructor` 要按这个上下文投成 `ConstructorDeclaration`），
      // 不是 `ClassBody` 自己。
      const membersParent = kind === "ClassBody" ? "ClassDeclaration" : kind;
      const projected = projectEachIn(nodes, ctx, membersParent);
      props[field] = Array.isArray(already) ? already.concat(projected) : projected;
    }
  }
  // 修饰词：产物那边是字符串，TS 那边是一串节点（见 `addModifiers` 的说明）。
  addModifiers(v, props, ctx);
  // **装饰器并进 `modifiers` 并按源码位置排序**：TS 的 `modifiers` 是源码顺序
  // （`@dec export class` 也好、`export class` 也好，谁在前谁先）。
  if (decorators.length > 0) {
    const projected = decorators.map((d) => projectNode(d, ctx)).filter((d) => d !== undefined);
    const merged = [...projected, ...(Array.isArray(props.modifiers) ? props.modifiers : [])];
    merged.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
    props.modifiers = merged;
  }
  return props;
```

# private method projectableKids:(v:any)=>Array<any>

```ts
  return allKids(v).filter((k) => !INVISIBLE.has(k.get("type")));
```

# private method stringText:(v:any, ctx:any)=>any

```ts
  const content = kidsOf(v, "children").find((k) => k.get("type") === "ConstString");
  if (content !== undefined) return textOfNode(content, ctx);
  const value = v.attrs.get("text");
  if (typeof value === "string" && value !== "") return value;
  return ctx.source.slice(v.start, v.end);
```

# method projectRoot:(exported:Array<any>, source:string)=>any

投影整棵树 → `ts.createSourceFile` 同形的单根节点。

三处**文件边界**的口径（实测出来的，两处都反直觉）：

- `SourceFile` 的 `getStart()` **不是 0**，而是**第一个 token 的位置**——
  前置注释与空行都算前导 trivia。本工程的区间本来就不含前导 trivia，
  所以根的起点就取第一个语句的起点（没有语句时退回 0）；
- `SourceFile.end` 是**文件长度**（含尾部的换行）；
- `EndOfFileToken` 是**文件末尾的零宽节点**：`pos === end === 文件长度`，
  而且它在 `ts.forEachChild` 那一层**是可见的**（`forEachChild` 对 `SourceFile`
  先访问 `statements` 再访问 `endOfFileToken`）。整个语料每份文件各一个，**不改它就一直缺**。

返回 `{ ast, unmapped, count }`：`unmapped` 是这次没覆盖到的产物标签（透传的那些），
`count` 是投影出的节点数。

```ts
  const ctx = {
    source,
    unmapped: new Set(),
    count: 0,
    // **给 token 的 `PrintAst(ctx, v)` 用的出口助手**（见 `core/syntax/token.xl.md` 的 `PrintAst`）：
    // 覆写里不必 import 任何东西——造节点、投一批子单元、按成员切、取文本、分叶子名，
    // 全在这一组里。它们**逐个转调**上面那些共享实现，所以两条路的产物逐字节相同。
    Node: (kind, props, view) => astNode(kind, props, view, ctx),
    // **空段不写这一格**：通用支里 `structuralProps` 的段循环是「`kept.length > 0` 才写」，
    // 所以 `<TupleType></TupleType>`（空元组）在 TS 那边是 `{kind,pos,end}`、**没有** `elements`。
    // `undefined` 在 `JSON.stringify` 里不出现（`projectParameter` 的 `name` / `type` 也是这个写法），
    // 于是覆写与通用支的产物逐字节相同——这一条是第 77 轮对拍时抓出来的（10 个空元组 / 具名元组文件）。
    Each: (view, parentKind) => {
      const out = projectEachIn(kidsOf(view, "children"), ctx, parentKind);
      return out.length === 0 ? undefined : out;
    },
    Members: (view, parentKind) => astMembers(view, parentKind, ctx),
    Project: (node, parentKind) => projectNode(node, ctx, parentKind),
    Text: (view) => textOf(view, ctx),
    TextOf: (node) => textOfNode(node, ctx),
    StringText: (view) => stringText(view, ctx),
    LeafKind: (text) => leafKindOfText(text),
    KeywordKind: (text) => KEYWORD_KIND.get(text),
    TokenKind: (text) => tokenKind(text),
  };
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
```

# method ToJsonText:(projected:any)=>string

把 `projectRoot` 的结果串成**紧凑单行 JSON**：取 `ast`（那个 `SourceFile` 同形的节点），
过一遍 `Token.ToPlain`（`Map` → 普通对象；`JSON.stringify` 对 `Map` 一律给 `{}`），
再 `JSON.stringify`——不带第三参数，单行是刻意选的形态。

**为什么不把 `unmapped` 也塞进来**：`cjcli --ts-ast` 的 stdout 要能**直接 diff** 一个
`ts.createSourceFile` 的转储，多一个包装键就得让每个下游先取 `.ast`；
那份记账走 stderr（`unmapped` 仍然在 `projectRoot` 的返回值里，库的调用方拿得到）。

```ts
return JSON.stringify(Token.ToPlain(projected.ast));
```
