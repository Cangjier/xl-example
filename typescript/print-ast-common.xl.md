# dependencies
```ts
// @ts-nocheck
```
```xl
import { Token } from "../core/syntax/token.xl.md"
import { Translate } from "./tokens/string/translate.xl.md"
```

# namespace cangjie

**TS 形状投影的共享核心**（本文件原名叫 `ts-ast.xl.md`，第 198 轮改名——见下）。

它把产物树（token 树）投成 `ts.createSourceFile` 的形状——**kind 用名字**、
每个节点带 `pos` / `end` 与 TS 那边的字段名，给 `cases:tsast` 那种逐节点对拍与人工 diff 用。

出口的分工（第 181~198 轮搬迁的结论）：

投影的**逐标签逻辑已经全部落在各 token 的 `PrintAst` 上**（49 块，一处一块搬完）。
`projectNode` 现在是三步：

1. `v = view(node)`；
2. **问这个节点自己**：`node.__token.PrintAst(ctx, v)`——覆写了就由它出这一格
   （`ctx.Nothing` 表示「这一格故意不出节点」）；
3. 没覆写（或返回 `undefined`）才落到本文件的**通用支**：换名表 + 提层 + 字段名。

**中央那张按 `v.type` 分派的 `switch` 已经整段删除**：它原来有 60 个 `case`，
搬到最后一个（`Statement`）时就没有分支了。所以本文件现在的角色是：

- **通用支**（`KIND_BY_TAG` / `WRAPPER_FIELDS` / `FIELD_BY_KIND` 三张表 + `structuralProps`）；
- **`ctx`**——递给 `PrintAst` 的那一组出口（`Kids` / `Expression` / `TypeExpression` /
  `Node` / `StartOf` / `EndOf` / `Project` / `TextOf` / …，共 40 多个）：
  搬迁层不许 import 本文件（token → 本文件 → token 会成环），横切工具只能经它过去；
- **共享实现**：那些**被共享层自己调用、且调用方拿不到「单元」这个入口**的函数
  （表达式重写器 `projectExpression` / `projectTypeExpression`、声明列表 `projectLetFrom`、
  成员名判据 `memberNameOf`、修饰词 `addModifiers`……）。
  判据是「所有调用点能不能改写成『把某个单元交给 `projectNode`』」——能就搬，不能就留。

本文件是 `tests/parse/ts-shape.mjs`（原来那 2464 行 JS）的**逐字搬家**：
表名、函数名、函数体、表体与那份实现逐字符相同，只补了 xl 需要的类型标注。
口径是「**先证明等价，再谈改写**」——搬完用一把一次性尺子
（当时那份逐字节对拍脚本）在全语料上逐字节对拍两份实现的输出：
**1399 个文件、0 处不一致**，结论记在 README 的台账里；那把尺子对拍完就删了，
长期判据是 `cases:tsast`（对 `ts.createSourceFile` 的逐节点对拍）。
所以搬家这一步不夹带任何改写：`stmtLike` 这类死代码、`matchBrace` / `matchingBrace`
这一对重复实现，都照原样留着（要动它们，另开一轮，用尺子量）。
`projectLogical`（够不着的那个 `case`）已在第 196 轮随搬迁删掉。

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
当时那份逐字节对拍脚本在全语料上逐字节对拍两份实现的输出，
那才是「搬完了还等价」的证据。类型标注仍然写全，它们是文档，也是将来真要开检查时的起点。

# const INVISIBLE:Set<string> = new Set(["LineWrap", "AreaAnnotation", "LineAnnotation", "PreprocessorDirectives"])

# private const NUMERIC_LITERAL:RegExp = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*(\.[\d_]*)?|\.[\d_]+)([eE][+-]?\d[\d_]*)?)n?$/

**这一版修过两处**（第 160 轮）：

- **指数里的分隔符**：`1_0e1_0` 原来不匹配（`[eE][+-]?\d+` 不许 `_`），于是投成 `Identifier`
  ——TS 那边它是 `NumericLiteral`（实测 `lex-number-separator-exponent.ts`）；
- **小数部分可以为空**：`1.`（`1..toString()` 的前半截）原来也不匹配，
  同样掉成 `Identifier`（TS：`NumericLiteral("1.")`）。小数点的两种写法合成
  `(\d[\d_]*(\.[\d_]*)?|\.[\d_]+)`：整数可带空小数、`.5` 这种前导点单独一支。

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
  ["DoWhile", "DoStatement"],
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
  // **`super` 也在这里**（第 98 轮）：`super.x` 的产物把 `super` 记成 `<Keyword>`，
  // 而它在 TS 那边永远是 `SuperKeyword`（不可能是标识符名）。
  ["super", "SuperKeyword"],
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
  // **第 135 轮补齐的一批**：位运算 / 移位 / 幂 / 逻辑赋值这些运算符原来一个都没在表里，
  // 于是 `tokenKind` 原样返回文本——`a **= 2` 的 `operatorToken.kind` 成了 `"**="` 而不是
  // `"AsteriskAsteriskEqualsToken"`（实测 `expr-compound-assign-all.ts` 缺 10 / 多出 10、
  // `ex-logical-assign.ts` 缺 5 / 多出 5，样本全是 `**= <<= >>= >>>= &= |= ^= &&= ||= ??=`）。
  // 名字一律照 `ts.SyntaxKind` 的拼法（`tests/parse/ts-ast.mjs` 就是从那边查的）。
  ["**", "AsteriskAsteriskToken"], ["**=", "AsteriskAsteriskEqualsToken"],
  ["<<", "LessThanLessThanToken"], ["<<=", "LessThanLessThanEqualsToken"],
  [">>", "GreaterThanGreaterThanToken"], [">>=", "GreaterThanGreaterThanEqualsToken"],
  [">>>", "GreaterThanGreaterThanGreaterThanToken"], [">>>=", "GreaterThanGreaterThanGreaterThanEqualsToken"],
  ["&", "AmpersandToken"], ["&=", "AmpersandEqualsToken"],
  ["|", "BarToken"], ["|=", "BarEqualsToken"],
  ["^", "CaretToken"], ["^=", "CaretEqualsToken"], ["~", "TildeToken"],
  ["&&=", "AmpersandAmpersandEqualsToken"], ["||=", "BarBarEqualsToken"], ["??=", "QuestionQuestionEqualsToken"],
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
  // **点号命名空间的内层声明也是 `body`**（第 156 轮）：`namespace A.B.C { … }` 的产物是
  // **三层嵌套的 `Namespace` 单元**（`A` 里面套 `B`、`B` 里面套 `C`），而 TS 那边
  // `ModuleDeclaration.body` 就是**里面那层 `ModuleDeclaration`**（只有最内层挂 `ModuleBlock`）。
  // 不收的话内层两层既进不了 `body`、名字也拿不到宿主
  // （实测 `decl-namespace-dotted.ts`：缺两层 `ModuleDeclaration` + `Identifier` 漂移）。
  // 没有副作用：命名空间体里的声明挂在 `NamespaceBody` 下面，不会以 `Namespace` 的身份直接做孩子。
  ["Namespace", "body"],
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
  // **类表达式同形**（第 176 轮）：`class extends B {}` 作为表达式时 TS 的 kind 是
  // `ClassExpression`，字段与 `ClassDeclaration` 一样（`heritageClauses` / `members`）——
  // 只给 `ClassDeclaration` 写映射时，类表达式那一支会把继承段顶着 `children` 投出去
  // （实测 `cls-expression.ts`：字段名 `children` vs `heritageClauses`）。
  [
    "ClassExpression",
    new Map([
      ["GenericType", "typeParameters"],
      ["HeritageClause", "heritageClauses"],
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
  // （`ClassDeclaration`）与第 33 轮（`MethodDeclaration`）各踩过一次——改这张表时**自己盯住重复键**。
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
  // **箭头的返回类型字段叫 `type`**（第 120 轮）：`ReturnType` 在 `WRAPPER_FIELDS` 里统一映射成
  // `type`，但 `ArrowFunction` 这一格在 `BODY_FIELDS` / 段名那一支里漏了改名——
  // 于是 `(a): B => c` 的字段名是 `returnType`，而 TS 是 `type`（实测字段名差 5 + 4）。
  ["ArrowFunction", new Map([["GenericType", "typeParameters"], ["children", "parameters"], ["returnType", "type"]])],
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

**位置的首选来源是 token 记的字段**：`Class` / `Interface` / `Enum` / `Let` / `TypeAssign` /
`Field` / `MethodDeclaration` 都在认下名字那一刻把它的下标记成 `nameStart` / `nameEnd`
（闭区间，见各自的 `NameStart`）——有这对字段就**不做任何猜测**，下面那套补偿一步都不跑。

没有这对字段时（字符串名 / 计算名那一档，以及还没记字段的 token）退回按原文量：

1. 位置不能拿声明自己的 `start` 充数（踩过两次，症状不同）：`export class A` 的声明从 `export` 起，
   而名字 `A` 在更后面——用声明开头会让**整类名字的区间都错位**（尺子上表现为「TS 有 82 个
   `Identifier` 产物没有」）；
2. 光用 `source.indexOf(name, start)` 还不够：`function f` 里那个 `f` 会在 **`function`** 里
   先被找到——所以搜索起点要**推过修饰词**（`modifiers="const"`）与装饰器。

这套补偿是**第二份近似**：它按文本猜位置，猜不中时（名字的首字母落在修饰词里、注释里有同样的词）
给出的区间与 token 自己记的那个不一致。字段那条路就是为了**把这份近似从投影里删掉**。

**还剩多少**（全语料 1517 份实测）：第 645 轮从 **1324 处降到 270 处**（`Field` **917 → 0**、
`Namespace` **401 → 264**），第 646 轮把 `Namespace`（三种名字共用一格 `nameRange`）、
`NamespaceExport` 与 `MethodDeclaration` 的字符串名都记上位置之后**降到 0 处**——
投影里那条 `indexOf` 补偿**一次都不再跑**（它是给还没记字段的 token 留的兜底，
今天全语料没有这样的 token；`Clone` 出来的克隆体仍走它）。

```ts
  // **私有名 `#x` 的 kind 是 `PrivateIdentifier`**（第 131 轮）：类字段 / 私有方法的名字
  // 由这条统一合成（见 `leafKindOfText` 的同一条判据），产物那边它只是一个普通文本块。
  // **位置用「原文」，`text` 用解开的**（第 381 轮）——两件事要的字符串不一样：
  // `\u0066` 这个名字在源码里占 **6 个字符**（`indexOf` 与 `end` 都按它算），
  // 而它的**名字**是 `f`（TS 的 AST `text` 也是 `f`）。
  // **这一格踩过**：第一版在调用点就把名字解开了 ⇒ `end` 按解开的长度算
  // ⇒ 函数声明的名字区间短一截 ⇒ 参数表跟着错位（`function f\u0066() {}` 报
  // `unimplemented: parameter without a name`）。
  const nameText = Translate.DecodeIdentifierEscapes(name);
  const nameKind = nameText.length > 1 && nameText[0] === "#" ? "PrivateIdentifier" : "Identifier";
  if (name === "") return undefined;
  // **名字那一格的整段区间**（`nameRange`，第 645 轮）：闭区间 `"起,止"`、**引号也在里面**——
  // 与 `bodyBraceRange` 同一形状。有它就能**按那一格自己**推出文本区间：
  // 开头是引号 ⇒ 引号名，文本在引号之间；否则整格就是文本。
  // **这是「token 出字段、投影直读」那一格**：`Namespace` 的字符串模块名、`Field` 的字符串名
  // 都从这里出——它们原先只能回原文 `indexOf(名字文本)` 猜，而带转义的名字 `indexOf` 根本找不到。
  const unitSpan = braceSpanOf(v.attrs.get("nameRange"));
  if (unitSpan !== null) {
    const head = ctx.source[unitSpan[0]];
    const quoted = head === '"' || head === "'";
    const pos = quoted ? unitSpan[0] + 1 : unitSpan[0];
    const end = quoted ? unitSpan[1] : unitSpan[1] + 1;
    if (end >= pos) {
      return { kind: nameKind, text: nameText, pos, end };
    }
  }
  // **首选 token 记的位置**：认下名字那一刻它就在手上（`SourceRange`），于是被记成
  // `nameStart` / `nameEnd` 两个下标（闭区间；见各 token 的 `NameStart`）。
  // 有它就**不做任何猜测**——下面的 `indexOf` 补偿只是给没有这对字段的那几档兜底。
  const start = v.attrs.get("nameStart");
  const end = v.attrs.get("nameEnd");
  if (typeof start === "number" && typeof end === "number" && start >= 0 && end >= start) {
    return { kind: nameKind, text: nameText, pos: start, end: end + 1 };
  }
  const modifiers = v.attrs.get("modifiers");
  let from = v.start;
  // **修饰词的位置首选 token 记的字段**（见 `modifierSpansOf`）：搜名字要从最后一个修饰词之后起，
  // 而那只差一格的位置 token 早就知道；没有字段时才回原文 `indexOf` 猜。
  const spans = modifierSpansOf(v);
  if (spans.length > 0) {
    from = spans[spans.length - 1].end;
  } else if (typeof modifiers === "string" && modifiers !== "") {
    const last = modifiers.split(",").filter((w) => w !== "").pop();
    if (last !== undefined) {
      const at = ctx.source.indexOf(last, v.start);
      if (at >= 0) from = at + last.length;
    }
  }
  // **装饰器也要推过**（第 170 轮）：`@observable` 换行 `a = 1` 里 `indexOf("a")` 会先命中
  // 装饰器名里的那个 `a`（`observable` 的第 5 个字符），于是字段名节点的区间落在装饰器里
  // （实测 `decl-class-decorator-property.ts`：`Identifier` 从 88 掉到 81）。
  const decoratorKids = allKids(v).filter((k) => k.get("type") === "Decorator");
  if (decoratorKids.length > 0) {
    const lastDecorator = decoratorKids[decoratorKids.length - 1];
    from = Math.max(from, endOf(lastDecorator));
  }
  const found = ctx.source.indexOf(name, from);
  // **上界是「声明段的末尾」而不是 `v.end`**：`const f` 里那个 `f` 正好落在 `Let` 的末字符上，
  // 用 `found < v.end` 会把它判成越界（踩过：`const f = <T>(x: T): T => x` 的名字一直取不到）。
  const limit = ctx.source.length;
  const pos = found >= 0 && found < limit ? found : from;
  return { kind: nameKind, text: nameText, pos, end: pos + name.length };
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
  // **`1n` 是 `BigIntLiteral`**（第 160 轮）：TS 那边整数字面量带 `n` 后缀时是**另一个 kind**
  // （`BigIntLiteral`），照 `NumericLiteral` 投会同时记「缺 `BigIntLiteral`」与
  // 「多出 `NumericLiteral`」（实测 `lex-number-bigint.ts` / `lx-numeric-literals.ts` /
  // `ty-literal-types.ts` 各一处）。
  if (NUMERIC_LITERAL.test(text)) return text.endsWith("n") ? "BigIntLiteral" : "NumericLiteral";
  if (/^["'`]/.test(text)) return "StringLiteral";
  if (text === "true") return "TrueKeyword";
  if (text === "false") return "FalseKeyword";
  if (text === "null") return "NullKeyword";
  // **`#x` 是 `PrivateIdentifier`**（第 131 轮）：类里的私有名在 TS 那边有自己的 kind
  // （`PrivateIdentifier`，区间含那个 `#`）。产物把它当普通文本块，照 `Identifier` 投
  // 会同时记「缺 `PrivateIdentifier`」与「多出 `Identifier`」
  // （实测 `cls-hash-in-operator.ts` / `cls-private-fields.ts` 一族 22 处）。
  if (text.length > 1 && text[0] === "#") return "PrivateIdentifier";
  // **`super` 永远是 `SuperKeyword`**（第 98 轮）：`super(1)` / `super.x` 的 TS 是
  // `CallExpression > SuperKeyword` / `PropertyAccessExpression > SuperKeyword`，
  // 而产物把那两个名字投成了 `Identifier`（实测缺 `SuperKeyword` 134 + 多出 `Identifier` 134）。
  // 它不可能是一个标识符名（`super` 是保留字），所以这一条没有副作用。
  if (text === "super") return "SuperKeyword";
  // **`this` 永远是 `ThisKeyword`**（第 146 轮）：值位与类型位在 TS 那边都是它
  // （`x?.Document === y.Document` 那种比较式里产物把 `this` 记成普通 `Identifier`，
  // 实测 `dist/ts/core/syntax/source-range.ts`：缺 `ThisKeyword` 1 + 多出 `Identifier` 1）。
  // **成员名 / 绑定名不走这里**（`nameOf` 一律给 `Identifier`），所以 `a.this` / `{ this: 1 }` 不受影响；
  // 形参名那一处也单独走 `nameOf`。
  if (text === "this") return "ThisKeyword";
  // **`undefined` 不走这里**（第 91 轮修）：它是**上下文关键字**——值位的 `x === undefined`
  // 在 TS 那边是一个 `Identifier`（`undefined` 不是保留字），只有**类型位**的 `: undefined`
  // 才是 `UndefinedKeyword`。这条表管的是**叶子**（值位标识符），把它算成 `UndefinedKeyword`
  // 会同时记「多出 `UndefinedKeyword` 147 + 缺 `Identifier` 一大片」。
  // 类型位那一边由 `PRIMITIVE_TYPE_KIND` 负责（那里面有 `undefined`）。
  return "Identifier";
```

# private method projectString:(v:any, ctx:any)=>any

字符串 → `StringLiteral` / `NoSubstitutionTemplateLiteral` / **模板字面量**。

模板（反引号串）在产物里是 `String > [ConstString, InterpolationString, ConstString, …]`，
而 TS 那边是**另一种结构**：

~~~text
`x${b}y`  ⇒ TemplateExpression[10,18)
              head: TemplateHead[10,14)        "`x${"
              templateSpans: [ TemplateSpan[14,18)
                                 expression: Identifier[14,15)  b
                                 literal: TemplateTail[15,18)   "}y`" ]
~~~

**类型位的模板**（`` `${string}-${string}` ``）形状相同、名字不同：外层是
`TemplateLiteralType`、span 是 `TemplateLiteralTypeSpan`、里面装的是 `type`（不是 `expression`）。
两者的**产物同形**，所以靠 `ctx.typePosition`（由 `projectTypeExpression` 打标）区分。

没有内插的模板是 `NoSubstitutionTemplateLiteral`（**不是** `StringLiteral`）。

```ts
  // 值位的普通字符串（引号串）走原来的口径。
  if (ctx.source[v.start] !== "`") return astNode("StringLiteral", { text: stringText(v, ctx) }, v, ctx);
  const kids = projectableKids(v);
  const consts = kids.filter((k) => k.get("type") === "ConstString");
  const interps = kids.filter((k) => k.get("type") === "InterpolationString");
  if (interps.length === 0) return astNode("NoSubstitutionTemplateLiteral", { text: stringText(v, ctx) }, v, ctx);
  const typePosition = ctx.typePosition === true;
  // **头部含那个 `{`**：`ConstString` 已经把 `$` 收进去了（`x$`），所以终点是
  // 第一段内插的起点再加一（`{` 那一格）。**先算成局部量**——在对象字面量里引用
  // 正在初始化的 `head` 是取不到值的（试过：`Cannot access 'head' before initialization`）。
  const headEnd = startOf(interps[0]) + 1;
  const head = {
    kind: "TemplateHead",
    pos: v.start,
    end: headEnd,
    // **段内文本**（TS 的口径：**不含**分隔符）：头段去掉开头的反引号与结尾的 `${`。
    // 按区间推出来，不扫源码：`headEnd` 落在 `{` 上，所以 `$` 在 `end - 2`。
    text: ctx.source.slice(v.start + 1, headEnd - 2),
  };
  const spans = [];
  for (let i = 0; i < interps.length; i++) {
    const isLast = i === interps.length - 1;
    const inner = projectableKids(view(interps[i]));
    const value = typePosition ? projectTypeExpression(inner, ctx) : projectExpression(inner, ctx);
    if (value === undefined) continue;
    // **段内文本**：从 `}` 之后算起；中段到 `$` 之前，尾段到收尾反引号之前。
    //
    // **起点按「那个 `}` 的右边一格」定，不按表达式的终点**（第 677 轮）：两者只在
    // 「表达式与 `}` 紧挨着」时相等 —— `` `${ `b${1}` }c` `` 里表达式终点落在**内层
    // 反引号之后一格**（那个空格上），照它 `+1` 就把 `}` 自己算进了段文本：
    // `node` 给 `ab1c`、本仓给 `ab1}c`（实测 `expr-template-nested-spaced`，
    // 执行侧 `l677-expressions-expr-template-nested-spaced` 量的就是它）。
    // 位置那一格第 623 轮已经这么算了（`pos` 取 `endOf(interps[i]) - 1`），
    // **文本这一格漏了同一处**——两格现在同一个起点。
    //
    // **分支按 `isLast` 定，不按 `consts[i + 1]`**：实测两者会不一致
    // （尾段也可能跟着一个常量段），那时按后者会算出一个**反向区间**——
    // `slice(25, 24)` 给的是空串，判据报的是「少了一个 `]`」，而线索离这里很远。
    const literalText = isLast
      ? ctx.source.slice(endOf(interps[i]), v.end - 1)
      : ctx.source.slice(endOf(interps[i]), endOf(consts[i + 1]) - 1);
    const literal = {
      kind: isLast ? "TemplateTail" : "TemplateMiddle",
      // **字面量段从 `}` 起**（TS 的 `TemplateTail` / `TemplateMiddle` 含那个右花括号），
      // 终点是下一个常量段的末尾再加一：那个 `ConstString` 已经把 `$` 收进去了，
      // 后面紧跟的 `{`（或尾段的那个反引号）是它的后面一格。
      //
      // **起点取那个 `}` 本身，不取内插表达式的终点**（第 623 轮）：两者只在
      // 「表达式与 `}` 紧挨着」时相等 —— `` `${ `b${1}` }c` `` 里表达式终点落在
      // 内层反引号之后一格（那个空格上），照它给起点就**多吞一个空格**
      //（实测 `op-template-nested`：`TemplateTail` 漂一格）。
      // `InterpolationString` 的区间**到 `}` 为止**（`$` 起、`}` 收）⇒ 减一就是它。
      pos: endOf(interps[i]) - 1,
      // 尾段后面没有常量段时（`` `${a}` ``）终点就是整个字符串的终点（含那个反引号）。
      end: consts[i + 1] === undefined ? v.end : endOf(consts[i + 1]) + 1,
      text: literalText,
    };
    const span = {
      kind: typePosition ? "TemplateLiteralTypeSpan" : "TemplateSpan",
      literal,
      pos: value.pos,
      end: literal.end,
    };
    if (typePosition) span.type = value;
    else span.expression = value;
    spans.push(span);
  }
  return {
    kind: typePosition ? "TemplateLiteralType" : "TemplateExpression",
    head,
    templateSpans: spans,
    pos: v.start,
    end: stmtEndOf(v, ctx),
  };
```

# private method tokenKind:(text:string)=>string

```ts
  return TOKEN_KIND.get(text) ?? text;
```

# private const LITERAL_TYPE_KEYWORDS:Set<string> = new Set(["null", "true", "false"])

**类型位要套 `LiteralType` 的三个词**（见 `projectTypeExpression` 里那一支）。

`undefined` 刻意不在里面：TS 的 `undefined | null` 是 `UndefinedKeyword` + `LiteralType > NullKeyword`
——两个词长得一样，形状却不同（这是 TS 自己的口径，不是本工程的取舍）。

# private const PRIMITIVE_TYPE_KIND:Map<string, string>

**原始类型**名 → `SyntaxKind` 名。

它在 TS 那边**不是** `TypeReference`（见 `tokens/type-define.xl.md` 的 `PrintAst`）。
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
  // **`intrinsic` 在 TS 那边是一个独立的 kind**（第 123 轮）：`type U = intrinsic;`
  // 的 TS 节点是 `IntrinsicKeyword`——**不是** `TypeReference > Identifier`。
  // 它只在类型位有意义（`lib.es5.d.ts` 的 `Uppercase` / `Lowercase` / `Capitalize` /
  // `Uncapitalize` 四个内建别名就是这一族，一个文件里 5 处）。
  ["intrinsic", "IntrinsicKeyword"],
])
```

# private method segmentNameOf:(node:any, kind:string | undefined, key:string)=>string | undefined

**问一个单元：这一格在你投出来的那个节点里叫什么**（第 988 轮）。

`SegmentNames` 是 token 自己声明的那一格（见 `core/syntax/token.xl.md`）：它的形状是
`Map<节点名, Map<段名, 字段名>>`。这一处只做两件事——把字典格换回它的 token（`__token`，
`WithRangeOf` 补坐标时记下的），再按节点名查一次。

**两个节点名都要试**（先 `kind`、再单元自己的标签名）：通用支拿到的 `kind` 是**父节点**的
节点名（`children` 那一格属于父声明），而**包装节点**（`FunctionBody` / `ReturnType` /
`GenericType`…）是**自己**投成节点的、字段名也归自己。所以：
`FunctionDeclaration` 的 `children` → `parameters` 走前一支，
`FunctionBody` 的 `children` → `statements` 走后一支——而两者恰好都由各自的 token 声明。
**顺序是「先父后己」**，与搬家前那张按 kind 查的中央表逐条等价（见 `fieldNameFor` 的账）。

`kind` 为 `undefined` 时只试单元自己的标签名。

**这一格是「问基类」的**（`core/syntax/token.xl.md` 的 `SegmentNames` 那一节）：基类答空表，
覆写过它的 token 答自己的那一份——所以这里不需要判「有没有这个成员」，
也不需要对 `any` 说好话（`owner` 就是 `Token`）。

```ts
  if (!(node instanceof Map)) return undefined;
  const owner = node.__token;
  if (owner === undefined || owner === null) return undefined;
  const table = owner.SegmentNames();
  if (!(table instanceof Map) || table.size === 0) return undefined;
  const tag = node.get("type");
  for (const name of kind === undefined ? [tag] : [kind, tag]) {
    const inner = table.get(name);
    if (!(inner instanceof Map)) continue;
    const field = inner.get(key);
    if (typeof field === "string") return field;
  }
  return undefined;
```

# private method fieldNameFor:(kind:string, key:string, node?:any)=>string

`children` / 分段名 → TS 那边的字段名。**按 kind 查**，查不到就用原名。

**首选问单元自己**（第 988 轮）：`SegmentNames` 就住在那个 token 上（见 `segmentNameOf`）——
段名是它自己的事实，所以投影只读，不再替每个 kind 背一份。查不到才落到下面这张表：
表里剩下的那些 kind 是**还没有搬过去的**（以及由上下文换名而来、自己没有标签的那几个：
`MethodSignature` / `GetAccessor` / `Constructor` / `ClassExpression` 都挂在
`MethodDeclaration` / `Class` 那两页上，它们的段名由宿主 token 一并声明）。

```ts
  const own = segmentNameOf(node, kind, key);
  if (own !== undefined) return own;
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
  // **裸块的花括号是节点，不是包装**：`(` / `[` 只是分组，内容提上去正好；
  // 而语句位那个 `{ … }` 在 TS 里是一个 `Block`（`projectNode` 里为它写了一支）。
  // 当包装提上去会把块里的语句**并到父节点语句表的末尾** —— 顺序于是与源码相反，
  // 而块里的语句是**按顺序执行**的（**静默错值**：实测
  // `function f() { { console.log("in") } console.log("out") }` 印出 `out / in`）。
  // 值位的花括号到不了这里：对象字面量是 `ObjectLiteral`、类型字面量是 `TypeLiteral`。
  if (type === "Bracket" && String(node.get("startBracket") ?? "") === "{") {
    return undefined;
  }
  if (type === "GenericType") {
    const hasParameter = allKids(view(node)).some((k) => k.get("type") === "TypeParameter");
    return hasParameter ? "typeParameters" : undefined;
  }
  return WRAPPER_FIELDS.get(type);
```

# private const startOf:(node:any)=>int = (node) => (node.get("range") ? node.get("range")[0] : 0)

# private const endOf:(node:any)=>int = (node) => (node.get("range") ? node.get("range")[1] + 1 : 0)

# private const NOTHING:any = { __nothing: true }

**「这一格没有节点」的哨兵**（第 198 轮）：token 的 `PrintAst` 返回 `undefined` 时，
`projectNode` 认为「它没覆写这一格」、于是落到通用投影——但有几处出口是**故意**
一个节点都不出的（例如 `projectStatement` 对那些「已经是上一条语句终结符」的空语句
返回 `undefined`）。所以那些出口改为返回 `ctx.Nothing`，`projectNode` 见到它就**直接返回
`undefined`**，不再往下走通用支。

# private const FUNCTION_LIKE_TAGS:Set<string> = new Set(["Function", "MethodDeclaration", "Lamda"])

**值位的函数体**（三个标签）：`function f() {}` / `class C { m() {} }` / `(x) => x`。

`export function` / `declare function` 那一族最后也收成 `Function`（修饰词折进 `modifiers`），
所以三个标签就够了；类型位的 `FunctionType` / `ConstructorType` **不在**这张表里
（那里不可能有 `yield` / `await` 这两个词）。

# private method functionContextOf:(ctx:any, token:any)=>any

从一个产物的 token 出发，找出**最近的那一层函数体**（见 `FUNCTION_LIKE_TAGS`），
答 `{ generator, async }`；一路上没有函数体就答 `null`（脚本 / 模块顶层）。

**为什么要有这一格**（第 960 轮，缺口 `gap-r955-yield-await-outside-context`）：
`yield` / `await` 在**生成器 / `async` 之外**是**普通标识符**
（`const v = yield;` / `function f() { return (yield); }` / `const w = await;` ——
TS 那边都是 `Identifier`），而 `projectExpression` 那一格认的是**词本身**
（第 130 / 739 轮为「同一个词的两态」写的判据）⇒ 一律投成 `YieldExpression` / `AwaitKeyword`。
缺的是**第三态：不在上下文里**，而上下文只能从祖先链上问。

**判据落在 token 树上**（不是 `ctx` 标志）：`projectExpression` 收到的每一格都带着
`__token`（`WithRangeOf` 记的），它的 `Parent` 链就是产物树——所以从 `yield` 那一格
往上一路走到函数体是**一两跳**的事（语句 → 体 → 函数）。带 `ctx` 标志要改的是
每一处进函数体的投影路径（`Function` / `MethodDeclaration` / `Lamda` / 对象字面量成员…），
漏一处就退化成「在生成器里也不认」，而祖先链上没有可漏的地方。

**`ctx` 只用来取原文**（`ctx.source`）：`SymbolToken` 上**没有 `TempToString`**
（那一格是 `Bracket` / `Keyword` 才有的），所以记号一律按源码切片取。
生成器记号是一个平级的 `SymbolToken`（`function* g() {}` 与 `class C { *m() {} }`
都把它放在 `Data` 里，位置分别在名字之后 / 名字之前），`async` 则有三种落法
（折进 `modifiers`、留在 `Data` 里当一个 `Identifier`、或 `Lamda` 的 `IsAsync` 字段）。

```ts
  let cursor = token;
  while (cursor !== null && cursor !== undefined) {
    const tag = cursor.constructor.name;
    if (FUNCTION_LIKE_TAGS.has(tag)) {
      let generator = false;
      let async = false;
      if (typeof cursor.modifiers === "string" && cursor.modifiers.split(",").includes("async")) {
        async = true;
      }
      if (Array.isArray(cursor.Data)) {
        for (const item of cursor.Data) {
          // **只在形参表之前找记号**：`function* g(a * b)` 这种乘法在括号**里面**，
          // 撞上那个 `(` 就收手，免得把一个乘法记号读成生成器。
          // 本文件**不 import `Bracket`**（见文件头：只 import 了 `Token` 与 `Translate`），
          // 所以这里按 `constructor.name` 认标签——与 `wrapperTarget` 那一处同一条口径。
          if (item.constructor.name === "Bracket" && item.startBracket === "(") {
            break;
          }
          if (item.constructor.name === "SymbolToken") {
            const range = item.SourceRange;
            if (range.Start !== null && range.Start !== undefined && range.Start.Value === "*") {
              generator = true;
            }
          }
          if (item.constructor.name === "Identifier") {
            const range = item.SourceRange;
            if (range.Start !== null && range.End !== null && ctx.source.slice(range.Start.Index, range.End.Index + 1) === "async") {
              async = true;
            }
          }
        }
      }
      if (cursor.IsAsync === true) {
        async = true;
      }
      return { generator: generator, async: async };
    }
    cursor = cursor.Parent;
  }
  return null;
```

# private const SIGNATURE_KINDS:Set<string> = new Set(["FunctionDeclaration", "MethodDeclaration", "MethodSignature", "CallSignature", "ConstructSignature"])

没有函数体的**可调用签名**：它们的 `end` 要**带上尾随分号**（TS 的口径）。

`declare function f(): void;` 的 TS 是 `FunctionDeclaration[23,51)`（含 `;`），
而产物那个 `Function` 只到 `void` 为止——分号是它的平级兄弟。
只对这几个 kind 做：带**函数体**的声明不会走到这里（体已经把它结束在 `}` 上了）。

# private method astNode:(kind:string, props:any, v:any, ctx:any)=>any

**造一个投影节点**：`pos` 取视图的起点，`end` 由 `stmtEndOf` 剪掉尾部 trivia，
没有函数体的可调用签名再带上尾随分号。

这是 `projectNode` 里那个 `mk` 的**唯一实现**（`mk` 现在只是转调它）：逐节点出口
（token 自己的 `PrintAst`）与通用支**必须是同一份坐标口径**，否则两条路的坐标会悄悄漂开——
而这只会在 `cases:tsast` 的百分比上表现出来，看不出根因。

`props` 为 `undefined` 时只出 `{ kind, pos, end }`（自闭合那一类节点，例如 `EndOfFileToken`）。

```ts
  let end = stmtEndOf(v, ctx);
  // **没有函数体的可调用签名要带上尾随分隔符**（第 134 轮）：`;` 与 **`,`** 都算——
  // 接口 / 类型字面量里的成员可以用逗号分隔，TS 那边那条 `MethodSignature` 的 `end`
  // **含那个逗号**（实测 `undici-types/cache.d.ts` 的
  // `match (…): Promise<…>, has (…): Promise<…>,` 一族：漂移 10 + 多出 10）。
  //
  // **带体的不收**（第 838 轮）：判据与文字写的一致——「**没有函数体**的可调用签名」。
  // 带体的函数 / 方法收在自己的 `}` 上、**不调 `parseSemicolon`**，紧跟的那个 `;`
  // 在 TS 那边是一条新的 `EmptyStatement`（`function f() {};` ⇒ `FunctionDeclaration[0,15)`
  // + `EmptyStatement[15,16)`）。原来只看 `SIGNATURE_KINDS` ⇒ 带体的一律多算一格，
  // 于是「空语句」既缺、声明又漂（实测 `stmt-generator-trailing-semicolon` 一族）。
  if (
    SIGNATURE_KINDS.has(kind) &&
    (props === undefined || props.body === undefined) &&
    (ctx.source[end] === ";" || ctx.source[end] === ",")
  ) {
    end += 1;
  }
  // **`pos` 不落在前导注释上**（第 140 轮）：对拍那一侧取的是 `node.getStart()`，
  // 它**跳过**节点前面的注释；而产物常把一整行注释收进**后一个单元**的区间里——
  //
  //     Readable | null,
  //     // stdin
  //     Readable | null,
  //
  // 那个 `UnionType` 的区间就从前一行那条注释开始（实测 `@types/node/child_process.d.ts`
  // 缺 7 + 多出 7，样本全是这一族）。判据只看**本节点自己的第一个子单元**是不是注释，
  // 是就跳到它后面第一个非空白字符；连着几条注释也一起跳。
  // 整段都是注释时不动（否则 `pos` 会越过 `end`）。
  let pos = v.start;
  for (;;) {
    const trivia = allKids(v).find(
      (k) =>
        startOf(k) === pos && (k.get("type") === "LineAnnotation" || k.get("type") === "AreaAnnotation"),
    );
    if (trivia === undefined) break;
    let at = endOf(trivia);
    while (at < v.end && /\s/.test(ctx.source[at])) at++;
    if (at >= v.end) break;
    pos = at;
  }
  return Object.assign({ kind }, props === undefined ? {} : props, { pos, end });
```

# private method astNodeHead:(kind:string, props:any, v:any, ctx:any)=>any

同 `astNode`，但键序是 **`{ kind, pos, end, …props }`**（坐标在前）。

**为什么留这一支**（第 199 轮）：搬家前有一批节点是**内联**写的——

    return { kind: "ForStatement", pos: v.start, end: v.end, ...props };

第 181~198 轮把它们逐块搬进各 token 的 `PrintAst`、改走 `ctx.Node` 之后，键序变成了
「props 在前、坐标在后」：**值一个没变，字节变了**。`samples` 的 `*.expected.tsast.json`
是**逐字节**比的，它当场抓出 13 类；按第 96 轮那份实现（夹具就是它生成的）逐个 kind 对下来，
共 **30 处构造点**（`ForStatement` / `TypeParameter` / `HeritageClause` / `SwitchStatement`、
`Field` 的两种 kind、`Foreach` 的两种 kind、`FunctionType` / `ConstructorType` …）。
`cases:tsast` 看不见这一条：它比 kind / 区间 / 字段名，比不了 JSON 的键序。

所以这一支只为「搬家前的键序」存在：**实现复用 `astNode`**（同一个坐标口径不抄第二遍），
拿到结果后按 `kind` / `pos` / `end` 重新排一遍键——**值原封不动**。新写的节点用 `ctx.Node` 即可。

```ts
  const node = astNode(kind, props, v, ctx);
  const ordered: any = { kind: node.kind, pos: node.pos, end: node.end };
  for (const key of Object.keys(node)) {
    if (key === "kind" || key === "pos" || key === "end") {
      continue;
    }
    ordered[key] = node[key];
  }
  return ordered;
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
    // **`ctx.Nothing` 表示「这一格故意不出节点」**（见 `NOTHING` 的说明）：
    // 与 `undefined`（＝没覆写、请走通用支）是两回事。
    if (own === ctx.Nothing) return undefined;
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
  // **裸块语句 `{ … }` 就是一个 `Block`**（第 123 轮）：产物那边它是一对花括号
  // （`BlockCloseRule` 在语句位给它补了语句队列，里面的东西已经是 `Statement`），
  // 而 TS 那边它是一个 `Block` 节点、有自己的 `statements`。照通用支投会**原样透传**
  // 一个未映射的 `<Bracket>`，外层还多套一个 `ExpressionStatement`
  // （实测 `{ let y = 2; f(y); }` / `case "a": { … }` / `switch` 分支体三族全中）。
  //
  // **只认 `{`**：`(` / `[` 是分组括号，它们由 `projectExpression` / 类型那几条路径摊平，
  // 走到这里的一律是块。判据取 `startBracket` 属性（与 `projectExpression` 里
  // 那个值位括号分支同一个来源）。
  if (v.type === "Bracket" && String(v.attrs.get("startBracket") ?? "") === "{") {
    return {
      kind: "Block",
      statements: projectEach(kidsOf(v, "children"), ctx),
      pos: v.start,
      end: stmtEndOf(v, ctx),
    };
  }
  // **父 kind**：少数几处「同一个产物标签按上下文换 kind」要问它
  // （类里的 `constructor` 是 `ConstructorDeclaration`）。它由 `structuralProps`
  // 在摊平包装体时显式往下传——不是从产物树的父亲读的。
  let kind = KIND_BY_TAG.get(v.type);
  if (kind === undefined) {
    ctx.unmapped.add(v.type);
    return mk(v.type, { children: projectEach(allKids(v), ctx) });
  }
  // **接口 / 类型字面量里的方法声明是 `MethodSignature`**（类里才是 `MethodDeclaration`）；
  // **类里那个叫 `constructor` 的是 `ConstructorDeclaration`**（另一个 kind、没有名字字段）——
  // 两处都是「同一个产物标签、按上下文换 kind」（真实语料 `Constructor` 缺 269，全挂在 `ClassDeclaration` 下）。
  if (ctx.signature && v.type === "MethodDeclaration") kind = "MethodSignature";
  // **表达式位的函数 / 类**（第 141 轮）：`(function () {…})()` / `const c = class {}` 在
  // TS 那边是 `FunctionExpression` / `ClassExpression`（带名字的也一样——`(function f(){})()`
  // 还是 `FunctionExpression`），而 `KIND_BY_TAG` 给的是**声明**名。
  // 判据是「谁在投它」：走 `projectExpression` 的就是表达式位
  // （与模板字面量靠 `ctx.typePosition` 分辨 `TemplateLiteralType` 是同一手法）。
  // 少了这一条，`fn-iife` / `stmt-paren-start` / `cls-expression` / `samples/generic.ts`
  // 这些地方各成一族（实测 `FunctionExpression` 缺 4、`ClassDeclaration` 多出 11）。
  if (ctx.expressionPosition === true) {
    if (v.type === "Function") kind = "FunctionExpression";
    else if (v.type === "Class") kind = "ClassExpression";
    // **用完就还回去**（第 134 轮修的）：这个标记说的是「**这一个**节点在表达式位」，
    // 不是「它的整棵子树也在」。不还的话，`(function () { function f() { … } … })()`
    // 里**体里那条函数声明会被当成表达式**——它投成 `FunctionExpression`，
    // 降级层于是报 `unimplemented: statement FunctionExpression`。
    // 而那是**普通代码里遍地都是**的形状（匿名 IIFE 里写一个辅助函数）。
    // **为什么以前没露**：只有 `kids.length === 1` 那一条才会置这个标记，
    // 而**带名字**的函数声明有两个子单元（名字 + 体）——于是「声明里套声明」一直是对的，
    // 只有**匿名**的 IIFE（一个子单元）才把标记漏下去。
    ctx.expressionPosition = false;
  }
  else if (
    v.type === "MethodDeclaration" &&
    (parentKind === "ClassDeclaration" || parentKind === "ClassExpression") &&
    v.attrs.get("name") === "constructor"
  ) {
    // **判据是 `name` 属性、不是 `textOf`**：方法单元自己没有 `value`，
    // `textOf` 会退回 `source.slice(v.start, v.end)`（那是整段方法体，不是名字）。
    //
    // kind 名是 **`Constructor`**（`ts.SyntaxKind[177]` 印出来就是 `Constructor`；
    // `ConstructorDeclaration` 在这个 TypeScript 里是 `undefined`——按后者投，
    // 尺子上 269 处构造签名会一直算作「缺 `Constructor`」）。
    //
    // **`ClassExpression` 是第 301 轮补上的**——原来只认 `ClassDeclaration`，
    // 于是**类表达式里的 `constructor` 一直是 `MethodDeclaration`**
    //（判据 `ex-index-and-call-signatures` 现场红的：`const K: Ctor = class { n: number;
    //  constructor(n) { this.n = n } }` 之后 `new K(4).n` 给 `undefined`，
    //  Node 给 `4`）。**TS 那边两种都投 `Constructor`**（`ClassExpression` 的成员
    // 就是 `ConstructorDeclaration`）——所以这是**投影漏了一格**，不是「两种口径」。
    //
    // **不补这一格的后果离现场很远**：降级层按 `NodeKind(members[i]) === "Constructor"`
    // 找显式构造函数（`LowerClass`）——找不到就**合成一个空的**，
    // 于是**写着的构造函数整条不跑**，字段初始化式还照常发
    // ⇒ `n: number`（无初始化式）留下 `undefined`、`n = 1` 把构造函数的赋值**盖掉**
    //（实测 `class { n = 1; constructor(v) { this.n = v } }` 给 `1`，Node 给 `7`）。
    // **一句异常都没有**——只有与 `node` 逐字节对拍才看得见。
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
    // **按文本摘，不按 kind 摘**（第 67 轮）：`get` / `set` 是**上下文关键字**——
    // `keyword.xl.md` 那边现在一律把它们投成 `Identifier`（引用位必须是普通标识符，
    // `const set = 1;` / `f(set)` 都要对），所以这里再按 `kind` 摘就**摘不掉了**，
    // 访问器会多留一格 `Identifier`。按**文本**摘与 kind 无关，两边都对。
    const word = stripModifier === "GetKeyword" ? "get" : "set";
    props.modifiers = props.modifiers.filter((m) => m.text !== word);
  }
  // **生成器记号的 `*` 是 `asteriskToken`**（第 130 轮）：`function* g() {}` 的产物把
  // `*` 记成一个平级的 `SymbolToken`，它会跟着形参一起落进 `parameters`——而 TS 那边
  // 它是 `FunctionDeclaration.asteriskToken`（**不是**形参，`forEachChild` 单独访问它）。
  // 摘出来之后字段名与 TS 一致，节点本身也还在（`AsteriskToken`）。
  if (Array.isArray(props.parameters)) {
    const star = props.parameters.findIndex((p) => p !== undefined && p.kind === "AsteriskToken");
    if (star >= 0) {
      props.asteriskToken = props.parameters[star];
      props.parameters.splice(star, 1);
    }
  }
  // **对象字面量成员不吃尾随逗号**（第 142 轮）：见 `projectObjectLiteral` 那一处的说明。
  const built = mk(kind, props);
  if (
    ctx.inObjectLiteral === true &&
    built !== undefined &&
    typeof built.end === "number" &&
    ctx.source[built.end - 1] === ","
  ) {
    built.end -= 1;
    while (built.end > built.pos && /\s/.test(ctx.source[built.end - 1])) built.end -= 1;
  }
  return built;
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
  // **没有分隔符的容器整段算一个类型**（第 164 轮）：`T[]` / `(A | B)` / `keyof T` / `A[K]`
  // 的子单元合起来就是**一个**类型，没有「同级的另一个类型」这回事——原先这里返回
  // `list.map((item) => [item])`（逐个成组），于是 `(F<A>)[]` 里那个「名字 + 实参段」
  // 被拆成两个节点（实测 `type-paren-content-nodes.ts`：`TypeReference[11,12)` 与
  // 一个盖住 `<A>` 的 `TypeReference`，缺的是 `F<A>` 那一格）。
  if (separator === undefined) return list.length === 0 ? [] : [list];
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
  // **数组里的洞是 `OmittedExpression`**（第 176 轮）：`[1, , 3]` 在 TS 那边是
  // `[NumericLiteral, OmittedExpression[39,39), NumericLiteral]`——一个**零宽**节点。
  // 产物在那个位置什么都没有（逗号之间是空的），所以空组要补一个零宽节点，
  // 位置取**后面那个逗号**的起点（TS 就是这么放的；末组的空位取列表末尾）。
  // 实测 `ex-array-holes.ts` / `expr-array-holes.ts` 各缺 1 个 `OmittedExpression`
  // ——值位数组字面量走的是 `projectArrayLiteral`（不是 `projectEachIn`），所以这一条
  // 写在两处；这里管绑定位与嵌套走 `List` 的那条路。
  if (parentKind === "ArrayLiteralExpression") {
    const out = [];
    let group = [];
    let lastEnd = list.length > 0 ? startOf(list[0]) : 0;
    // **上一个逗号的下标**（第 933 轮）：与 `tokens/json/array-literal.xl.md` 那一处同一份口径
    // ——洞的起点是「上一个**逗号**之后那一格」，而 `lastEnd + 1`（上一个元素的终点 + 1）
    // 在元素与逗号之间夹着注释 / 换行时差一格。
    let previousSeparator = -1;
    const flush = (separator) => {
      if (group.length === 0) {
        const at = previousSeparator === -1 ? lastEnd : previousSeparator + 1;
        out.push({ kind: "OmittedExpression", pos: at, end: at });
      } else {
        const one = projectExpression(group, ctx);
        if (one !== undefined) out.push(one);
        lastEnd = endOf(group[group.length - 1]);
      }
      group = [];
      if (separator !== undefined) previousSeparator = startOf(separator);
    };
    for (const item of list) {
      if (item.get("type") === "SymbolToken" && textOfNode(item, ctx) === ",") {
        flush(item);
        continue;
      }
      group.push(item);
    }
    if (group.length > 0) flush(undefined);
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
    // **只认「还没包住语句」的标签**（第 929 轮）：`Label` 现在**包住**它标的那条语句
    // （`Statement.AbsorbLabels` 折的），那一格由标签自己的 `PrintAst` 出形状；
    // 这一支留下来管**老形状**（标签与被标语句是平级兄弟，`labelIsFlat` 为真）。
    // 少了这个条件，包好的标签会去跟**后面那条平级语句**合并（整棵被标的子树丢掉）。
    if (items[i].get("type") === "Label" && labelIsFlat(items[i])) {
      const labels = [];
      let j = i;
      while (j < items.length && items[j].get("type") === "Label") {
        labels.push(items[j]);
        j++;
      }
      const statement = j < items.length ? projectNode(items[j], ctx, parentKind) : undefined;
      if (statement !== undefined) {
        // **体必须是「语句」**（第 566 轮，与 `projectStatement` 那一支同一句）：
        // 这一路是根列表 / 段，手里没有语句壳 ⇒ 终点就取体自己的。
        //
        // **这里也是「一个单元」的口径**（第 778 轮）：与 `projectStatement` 那一支同源，
        // 只是这一条只在**顶层列表 / 段**上跑。上面那条「连续标签」的判据把标签吃光之后，
        // 剩下那一格就是被标的语句——`outer: for (…)` 那种一个成形单元的写法一直是对的；
        // 「标签 + 表达式语句」在顶层会先被语句规则收进一个 `Statement` 壳，
        // 所以真正走这里的是**被别的容器收好的**那一档（见 `Statement` 壳那一支的说明）。
        let wrapped = asStatement(statement, statement.end ?? 0);
        for (let k = labels.length - 1; k >= 0; k--) {
          wrapped = labeled(labels[k], wrapped, ctx);
        }
        out.push(wrapped);
        i = j + 1;
        continue;
      }
    }
    // **`export` / `declare` / `default` 前缀 + 一条声明**（第 124 轮）。
    //
    // `projectStatement` 里早就有这一支，但它只在「整条语句被包在一个 `Statement` 单元里」
    // 时才有机会跑。而顶层（`Root.ToList()` 那一层）**有些声明单元根本不在 `Statement` 里**：
    // `export import X = ts.Y;` 实测就是
    // `[Keyword(export), Import(X = ts.Y)]` 两个**平级**的顶层单元，
    // 于是 `export` 被投成一个孤零零的 `ExportKeyword`、`ImportEqualsDeclaration`
    // 从 `import` 起算（实测 `typescript.d.ts` 的二十来条 `export import … = …` 全中：
    // 缺 `ImportEqualsDeclaration` 21 + 多出 21）。
    //
    // 判据与 `projectStatement` 那一支**同一套**：前缀词只能是 export / declare / default，
    // 后面那一格按换名表必须是一条**语句**（`import` → `ImportDeclaration` 在 `STATEMENT_KINDS` 里）。
    if (items[i].get("type") === "Keyword") {
      let j = i;
      while (
        j < items.length &&
        items[j].get("type") === "Keyword" &&
        ["export", "declare", "default"].includes(textOfNode(items[j], ctx))
      ) {
        j++;
      }
      if (j > i && j < items.length) {
        const lastKind = KIND_BY_TAG.get(items[j].get("type"));
        if (lastKind !== undefined && STATEMENT_KINDS.has(lastKind)) {
          const declaration = projectNode(items[j], ctx, parentKind);
          if (declaration !== undefined) {
            const leading = [];
            for (let k = i; k < j; k++) {
              const one = projectNode(items[k], ctx);
              if (one !== undefined) leading.push(one);
            }
            const modifiers = [...leading, ...(declaration.modifiers ?? [])];
            modifiers.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
            declaration.modifiers = modifiers;
            declaration.pos = startOf(items[i]);
            out.push(declaration);
            i = j + 1;
            continue;
          }
        }
      }
    }
    // **`export default` + 一条声明**（第 579 轮）：与上面那一支**同一件事**，
    // 缺的是「前缀词住在 `Export` 单元里」这一形状。
    //
    // `export default interface I {}` 的产物是 `[Export(export default), Interface]` **两格平级**：
    // `Interface.Success` 只往前吃**一个** `export` 词（`interface.xl.md`），吃不下 `default`
    // ⇒ 两个词留在外面成了 `Export` 单元；而 `export default class C {}` 走的是 `Class` 自己那条
    // `modifiers="export,default"` 的路（**一个单元**）⇒ 只有接口这一族露出来
    // （实测 `decl-interface-export-default.ts`：缺 `InterfaceDeclaration`、
    // 多出 `ExportDeclaration` + 平级的 `InterfaceDeclaration`）。
    //
    // 合并那一套**不在这里重写**：`projectExport` 里第 153 轮就有一支
    // 「`Export` 单元 + 一条声明 ⇒ 修饰词并进声明、起点从 `export` 起」，它只挂在
    // `projectStatement` 那一支上——而这一格**根本没有语句壳**（顶层平级）。两个入口问同一句
    // （与第 507 / 556 轮同一条理由：各写一份会漂）。
    //
    // 判据两道：① 这一格的文本以 `default` 收尾（`export = X` / `export { a }` 都排除在外——
    // `export { a }` 后面跟一条声明时**不是**这个形状，语料里有那种排版）；
    // ② 紧跟那一格的标签在 `DECLARATION_UNITS` 里。
    if (items[i].get("type") === "Export" && i + 1 < items.length) {
      const unitText = ctx.source.slice(startOf(items[i]), endOf(items[i]) + 1).trim();
      if (/\bdefault$/.test(unitText) && DECLARATION_UNITS.has(items[i + 1].get("type"))) {
        const merged = projectExport(items[i], ctx, items.slice(i + 1), endOf(items[i + 1]));
        if (merged !== undefined) {
          out.push(merged);
          i += 2;
          continue;
        }
      }
    }
    // `undefined` = 这个单元在 TS 那边不是它自己的一格（只有注释的语句、孤零零的 `;`）。
    //
    // **这一格里那个收尾 `;` 归谁**（第 838 轮）：`projectStatement` 那一支只看得到原文里
    // 前面那一格字符（`;` 前面是 `}`），而 TS 问的是**上一条语句自己调不调 `parseSemicolon`**——
    // `const o = { a: 1 }` 换行 `;` 里那个 `;` 归 `VariableStatement`（它的区间含 `;`），
    // 而 `function f() {}` 换行 `;` 里那个是**新的空语句**（带体的声明收在 `}` 上）。
    // 两种形状的前一格都是 `}`，所以这一问必须由**知道上一条是什么**的这一层来问，
    // 判据只有一份：`ownsTrailingSemicolon`（`NO_TRAILING_SEMICOLON` 那张表 + 三档特例）。
    //
    // **只在「这一格自己不成节点」或「它投出来的就是那个空语句」时接管**：
    // 别的一律照旧走 `projectStatement` 的读数（`;;` 那一格、`;` 顶一条语句那一格都在里面）。
    const projected = projectNode(items[i], ctx, parentKind);
    const semi = trailingSemicolonOf(items[i], ctx);
    if (
      semi !== undefined &&
      !ctx.consumedSemicolons.has(semi) &&
      (projected === undefined || (projected.kind === "EmptyStatement" && projected.pos === semi))
    ) {
      const previous = out.length > 0 ? out[out.length - 1] : undefined;
      // **上一条已经把这一格盖住了**（那个 `;` 落在它的区间里）：`import { a } from "m"`
      // 换行 `;` 里导入声明自己就吃着那个 `;`（它的区间到 `;` 为止），这一格什么都不出
      // ——原来那一支只写「并进上一条」，就是靠这一问把这种格子挡在外面的。
      const covered = previous !== undefined && typeof previous.end === "number" && semi < previous.end;
      if (
        !covered &&
        previous !== undefined &&
        typeof previous.end === "number" &&
        semi >= previous.end &&
        ownsTrailingSemicolon(previous, ctx)
      ) {
        // **被吃掉的 `;` 要算进上一条语句的终点**（第 167 轮）：`let a = 1` 换行 `;[1, 2].forEach(f)`
        // 里那个 `;` 在 TS 那边是上一条 `VariableStatement` 的**终结符**（`tryParseSemicolon`
        // 不看换行），所以上一条的区间要含它（实测 `st-asi-array.ts` / `st-asi-paren.ts`：
        // 上一条语句的终点各短一格）。
        previous.end = semi + 1;
        i++;
        continue;
      }
      // **不成节点的**那一档要在这里补出空语句（`function f() {} /*c*/;` 里那一格是
      // 「注释 + `;`」：`projectStatement` 按起点判、起点在注释上，于是整格被丢掉）。
      if (projected === undefined && !covered) {
        out.push({ kind: "EmptyStatement", pos: semi, end: semi + 1 });
        i++;
        continue;
      }
    }
    if (projected !== undefined) {
      out.push(projected);
    }
    i++;
  }
  return out;
```

# private method asStatement:(body:any, end:int)=>any

**标签右边那一格必须是「语句」**（第 566 轮）：TS 的 `LabeledStatement.statement` 是
`Statement` —— 体是**表达式**时（`done: f()`、`{ a: 1 }` 里的 `a: 1`）那边是
`ExpressionStatement > 表达式`，而产物给的是「`Label` 平级兄弟 + 裸表达式」
⇒ 少一整层壳（实测三份用例各缺一个 `ExpressionStatement`：
`stmt-label-statement`、`am-object-vs-block`、`stmt-object-vs-block`）。

**判据是 kind 的后缀** 而不是那张表：`STATEMENT_KINDS` 是「**单个子单元**是它时不再套壳」的
名单，它漏了 `ExpressionStatement` 自己、`ForInStatement`、`WithStatement` 这些
（`projectStatement` 那一支只在「`kids.length === 1`」时才用它，这里的体是**投影结果**，
范围大得多）。TS 那边「本来就是语句」的 kind 只有三类：`*Statement`、`*Declaration`、
以及 `Block` / `ModuleBlock` —— 表达式 kind 一个都不沾这三类，所以后缀判据不会误判。

**`end` 由调用方给**：壳体那一路（`projectStatement`）给的是
`max(壳的投影终点, 体的终点)` 再吃一个尾分号 —— `done: f();` 的
`ExpressionStatement` 在 TS 那边**含那个 `;`**；根列表那一路（`projectEach`）没有壳，
就从体自己的终点算。

```ts
  if (body === undefined || body === null) {
    return body;
  }
  const kind = body.kind;
  if (typeof kind !== "string") {
    return body;
  }
  if (
    kind === "Block" ||
    kind === "ModuleBlock" ||
    kind.endsWith("Statement") ||
    kind.endsWith("Declaration")
  ) {
    return body;
  }
  return { kind: "ExpressionStatement", expression: body, pos: body.pos, end };
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
  // **尾部注释也要剪掉**（第 132 轮）：TS 的节点终点**从不含 trivia**，而产物常把
  // **下一个声明的 JSDoc** 收进本声明的区间——
  //
  //     declare function request<…>(…): Promise<…>;
  //
  //     /** A faster version of `request`. */
  //     declare function stream<…>(…): …;
  //
  // 上面那条 `FunctionDeclaration` 的区间一直撑到那段注释结束（实测 `undici-types/api.d.ts`
  // 四条函数声明、`cache-interceptor.d.ts` 的 `type GetResult` 一族：漂移 + 多出各一份）。
  // 注释可能嵌得很深（上面那条是落在 `ReturnType > TypeDefine` 里的），所以沿
  // 「区间终点正好等于当前 `end`」的那条链**递归**找下去——每层最多命中一个孩子，
  // 代价与一个节点到它最后一个叶子的深度成正比。
  while (end > v.start) {
    while (end > v.start && /\s/.test(ctx.source[end - 1])) end--;
    const at = trailingTriviaStart(v, end);
    if (at === undefined || at < v.start) break;
    end = at;
  }
  return end;
```

# private method trailingTriviaStart:(v:any, end:int)=>int

**收尾 trivia**（注释）在这条区间链上的起点；没有就给 `undefined`。

只在「区间终点正好是这个 `end`」的子孙里找，所以每一层至多一个候选——这既是正确性
（别的注释不属于本节点的尾巴），也是代价的上界。

```ts
  for (const k of allKids(v)) {
    const range = k.get("range");
    if (range === undefined || range[1] + 1 !== end) continue;
    const type = k.get("type");
    if (type === "LineAnnotation" || type === "AreaAnnotation") return range[0];
    const inner = trailingTriviaStart(view(k), end);
    if (inner !== undefined) return inner;
  }
  return undefined;
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

# private const NO_TRAILING_SEMICOLON:Set<string>

**这些 kind 在 TS 那边收在块 / `}` 上、不调 `parseSemicolon`** ⇒ 紧跟它们的一个 `;`
是一条新的 `EmptyStatement`，而不是它们的终结符（第 663 轮）。

名单照 TS 的 parser 列：`if` / `while` / `for` / `for…in` / `for…of` / `switch` / `try` /
裸块收在 `}` 上；类 / 枚举 / 接口 / 命名空间 / 环境模块同样收在自己的 `}` 上。
**`DoStatement` 不在名单里**——`do … while (c)` 后面那个 `;` 归它自己；
**导入 / 导出 / 变量 / 表达式 / 类型别名也不在**——那几族自己就吃尾分号。

**`FunctionDeclaration` 按「有没有体」分两档**（见调用点）：带体的是声明、收在 `}` 上；
**没有体的是环境签名 / 重载**（`declare function f(): void;`），那个 `;` 归它自己。

```ts
new Set([
  "Block",
  "ClassDeclaration",
  "EnumDeclaration",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "FunctionDeclaration",
  "IfStatement",
  "InterfaceDeclaration",
  "ModuleDeclaration",
  "SwitchStatement",
  "TryStatement",
  "WhileStatement",
])
```

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
  "DoStatement",
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

# private const DECLARATION_UNITS:Set<string>

`export` 前缀后面那几种**声明**的产物标签（第 153 轮起在 `projectExport` 里，第 579 轮提到这一层）。

两个入口问**同一份**名单：`projectExport`（`Export` 单元 + 声明的合并）与
`projectEach`（顶层 / 段的平级列表上同一个合并）。各写一份就会漂——第 579 轮之前
只有 `projectStatement` 那一支接得上 `Export` 单元，顶层那两格平级的形状
（`export default interface I {}`）就漏在外面。

**名单仍是第 153 轮那一份**（第 579 轮试过收窄到 `interface` / `class` / `function` 三种，
又放回来了）：TS 那边能把 `export default` 收成**修饰词**的确实只有这三种，
可三种别的形状一量，收窄的净效果是**一处变好、一处变差**——

| 形状（`tmp/recon/r579-shapes/`） | 第 578 轮 | 收窄后 |
| --- | --- | --- |
| `export default interface I { … }` | 缺 1 / 多 2 | **四栏全零** |
| `export default namespace N { … }` | 缺 4 / 多 4 | 缺 3 / **漂 1** / 多 3 |
| `export default enum E { A }` | 缺 3 / 多 3 | 缺 3 / 多 3 |

后两种本来就**不是合法 TS**（`export default enum` 两个词实测在 `ts.createSourceFile`
那边是**一个 `ExportAssignment`**：`MISS ExportAssignment TS[0,14)` + `MISS Identifier TS[14,14)`），
两版都不可能是零；而「漂移」比「缺 + 多」难收拾（一个区间要挪、两个节点要挪），
所以**这一轮不动名单**——只把「哪一格问哪一份」这件事收成一份。

```ts
new Set(["Interface", "Class", "Function", "Enum", "Namespace"])
```

# private method projectStatement:(v:any, ctx:any)=>any

```ts
  const kids = projectableKids(v);
  // **只有注释的语句不是语句**：`// xl:expect …` 这样的行在本工程是一层 `Statement`
  // 包着一个注释单元，而 TS 那边注释是 **trivia**、`forEachChild` 完全看不见它。
  // 早先这里退回一个 `ExpressionStatement`，于是每份用例文件都凭空多两个节点
  // （顶层 `pos=0` 的 `ExpressionStatement`），连 `SourceFile.getStart()` 都被带歪。
  //
  // **但空语句 `;` 是一个 `Statement`**（第 141 轮）：语句规则把孤零零的 `;` 收成一个
  // **没有内容**的 `Statement`（`;` 是语句终结符、不进 `Data`），而 TS 那边它就是
  // `EmptyStatement`（区间正好是那个 `;`）。三处形态都在语料里：`;` 顶一条语句、
  // `if (a) ;` 的体、函数体里的空语句。
  if (kids.length === 0) {
    if (ctx.source[v.start] === ";") {
      // **已经被上一条语句吃掉的 `;` 不再是空语句**：TS 的 `parseExpressionStatement`
      // 收尾会把紧跟的那个 `;` 算作自己的终结符（`tryParseSemicolon` 不看换行），
      // 所以 `;(function(){})()` 换行 `;…` 里第二行的 `;` 属于**上一条**语句。
      // `semicolonEndOf` 吃掉它时在这里记了一笔（见那一处说明）。
      if (ctx.consumedSemicolons !== undefined && ctx.consumedSemicolons.has(v.start)) {
        return undefined;
      }
      // **判据落在原文排版上**：真正的空语句（防御性分号）永远写在**行首**——
      // `;` 顶一条语句、`if (a) ;` 的体、函数体里的空语句都是这一形状。
      // 而 `.d.ts` 里「成员声明后面那个 `;`」写在**行尾**（`a: string;`），TS 那边它不是节点。
      // 语句规则分不出这两者（都只是「孤零零一个 `;`」），所以在这里按行首 / 行尾筛：
      // 一刀切收下来会让整个语料多出 3439 个 `EmptyStatement`（实测，第一次就是这么翻车的）。
      // **中间那些 `;` 归上一条还是自成一条，由列表那一趟按 kind 定**（见 `projectEach` 的
      // 「被吃掉的 `;`」那一支）—— 这里只把「行首的」放行，其余交出去。
      let lineStart = v.start;
      while (lineStart > 0 && ctx.source[lineStart - 1] !== "\n") lineStart--;
      // **前面只有别空语句时也算行首**（第 179 轮）：`;;` 的第二个 `;` 前面那格是第一个 `;`，
      // 而 TS 那边两个各是一个 `EmptyStatement`（实测 `stmt-empty-semicolon.ts`：
      // 只投出第一个）。所以「行首」的判据放宽成「这一行到这里为止只有空白与 `;`」。
      const beforeOnLine = ctx.source.slice(lineStart, v.start);
      if (beforeOnLine.trim() !== "" && !/^[;\s]*$/.test(beforeOnLine)) {
        return undefined;
      }
      // **行首的 `;` 也可能是上一条语句的终结符**（第 167 轮）：TS 的 `tryParseSemicolon`
      // 不看换行——`let a = 1` 换行 `;[1, 2].forEach(f)` 里那个 `;` 属于 **VariableStatement**
      // （TS 的区间 [26,37) 把它算进去了），紧跟的 `[1, 2]…` 才是新语句。
      // 判据是**上一个有内容的行**：那行是代码（`const x = f`）时这个 `;` 就是它的终结符；
      // 是注释行或空行时（`// 注释` 换行 `;(function(){})()`、文件开头的 `;;`）才是真空语句
      // （实测 `st-asi-array.ts` / `st-asi-paren.ts` 与反例 `fn-iife.ts` / `stmt-empty-semicolon.ts`）。
      let previousChar = v.start - 1;
      while (previousChar >= 0 && /\s/.test(ctx.source[previousChar])) previousChar--;
      if (previousChar >= 0) {
        // **块 / 语句之后的分号照收**（第 178 轮）：`function f() {` 换行 `;` 里那个 `;` 是
        // TS 的 `EmptyStatement`（`st-misc-keywords.ts` 缺的就是它），`;;` 的第二个同理。
        // 只有前面是**一个表达式的结尾**（名字 / 数字 / 引号 / `)`…）时，这个 `;` 才是
        // 上一条语句的终结符。
        if (";}{".includes(ctx.source[previousChar])) {
          return { kind: "EmptyStatement", pos: v.start, end: v.start + 1 };
        }
        let previousLineStart = previousChar;
        while (previousLineStart > 0 && ctx.source[previousLineStart - 1] !== "\n") previousLineStart--;
        const previousLine = ctx.source.slice(previousLineStart, previousChar + 1).trim();
        const commentOnly =
          previousLine === "" ||
          previousLine.startsWith("//") ||
          previousLine.startsWith("/*") ||
          previousLine.endsWith("*/");
        if (!commentOnly) {
          return undefined;
        }
      }
      return { kind: "EmptyStatement", pos: v.start, end: v.start + 1 };
    }
    return undefined;
  }
  const head = kids[0];
  const headType = head.get("type");
  // **带标签的语句：壳里是 `[Label, 被标的语句]`**（第 536 轮）——
  // 与 `projectEach` 里那条「连续标签从右往左套」**同一件事**，只是那一条只在
  // **顶层列表 / 段**上跑（`Root.ToList()` 那一层），而这里的 `Statement` 壳
  // **整条被当成一个单元**递进来 ⇒ 那一条永远看不到它。
  //
  // **少了它会怎样**（实测 `decl-label-break-continue.ts` 一族 **19 份**文件）：
  // 整条落进通用支 ⇒ 投出 `ExpressionStatement > LabeledStatement(只盖标签)`
  // ⇒ 被标的那条语句（`ForStatement` / `WhileStatement` …）连它整棵子树一起丢
  //（一鱼多吃：`BreakStatement` 22 份 + `Block` 20 份 + `CallExpression` 23 份都在这一族里）。
  // **只认「还没包住语句」的标签**（第 929 轮，与 `projectEach` 那一支同一句）：
  // 包好的标签是**一个**单元（`kids.length === 1`），由它自己的 `PrintAst` 出形状；
  // 这一支管的是老形状（标签 + 被标语句平级，`kids.length >= 2`）。
  if (headType === "Label" && kids.length >= 2 && labelIsFlat(head)) {
    const labels = [];
    let at = 0;
    while (at < kids.length && kids[at].get("type") === "Label") {
      labels.push(kids[at]);
      at++;
    }
    // **体要按「一条语句」投影，不能只投紧跟的那一个单元**（第 778 轮，**普查当场红的**）。
    // 标签在产物里**只收前缀**（`label.xl.md`：名字 + 冒号折成自闭合的 `Label`），
    // 被标的那条语句与它**平级**——于是 `lab: s += "1"` 在壳里是
    // `[Label, Identifier(s), SymbolToken(=), BinaryOperator(+)]` 四个单元。
    // 早先这里 `projectNode(kids[at])` **只投第一个单元** ⇒ 整条语句被换成那个孤零零的
    // `Identifier`（实测：`cjcli --ts-ast` 给 `ExpressionStatement > Identifier`，
    // 区间还盖着整条语句；执行侧于是把 `s += "1"` 整条丢掉、只剩下一行 `s += "2"`）。
    // 循环 / 分支 / 块那几档看不出来——它们是**已经成形的一个单元**，
    // 一个单元本来就是一条语句（`outer: for (…)` / `blk: { … }` 一直是对的）。
    //
    // **判据是「剩下的那一串按一条语句投」**，与 `lab: { … }` 那一格同源：
    // 这里把剩下那些单元交回**同一个** `projectStatement`（`statementOfList` 造的合成视图，
    // 原来这几行内联在这里；第 929 轮 `Label.PrintAst` 也要同一件事 ⇒ 收成一份）
    // ——那里已经有「语句壳 / 表达式壳 / `;` 归属」的全套口径，另写一份就是第二处会漂的答案。
    // **不会复发**：剩下那一串的**第一个单元不再是 `Label`**
    //（上面那个 `while` 已经吃掉了连续的标签）。
    const restKids = kids.slice(at);
    if (restKids.length > 0) {
      const body = statementOfList(restKids, ctx);
      if (body !== undefined) {
        let wrapped = body;
        for (let k = labels.length - 1; k >= 0; k--) {
          wrapped = labeled(labels[k], wrapped, ctx);
        }
        return wrapped;
      }
    }
  }
  // **`export = X` / `export default X`**：产物那边表达式是 `Export` 单元的**平级兄弟**
  // （`Statement > [Export(export/=), 表达式]`），所以整条语句要交给 `projectExport`。
  //
  // **`kids.length >= 1`，不是 `> 1`**（第 87 轮修）：具名导出 `export { a as b }` 的语句里
  // 只有 `Export` **一个**单元（`{…}` 在它里面），`> 1` 的判据把它漏给了通用投影——
  // 于是括号里每个单元（含 `as` / `type` 两个词）都成了平级子节点，
  // 而 `ExportSpecifier` 一个也没投出来。
  if (headType === "Export" && kids.length >= 1) {
    // **语句那一格的终点**要一起递进去（第 548 轮）：具名导出的尾分号不在
    // `Export` 单元自己的区间里（见 `projectExport`）。
    return projectExport(head, ctx, kids.slice(1), stmtEndOf(v, ctx));
  }
  if (headType === "Let") {
    // `Let` 不只是一个节点：`=` 与初始化式是它的**平级兄弟**，所以整串交给列表版
    // `projectLetFrom`（**注意这里传的是「语句」的整串子单元**，不是 `Let` 那一个单元——
    // 那个单元自己的 `PrintAst` 只拿得到 `const f` 那一段，见 `tokens/let.xl.md`）。
    return projectLetFrom(projectableKids(v), ctx, v).statement;
  }
  // **`with (obj) { … }`**（第 137 轮）：产物是 `Statement > [Keyword(with), Bracket((obj)), Bracket({…})]`，
  // 而 TS 那边是 `WithStatement{ expression, statement }`。照通用支会整条投成一个
  // `ExpressionStatement`（实测 `st-with` / `stmt-with` 两族共 20 处）。
  // 体那个 `{` 里的语句由 `IsStatementStart` 新加的那一条（`with` 后面的括号）负责成形成 `Statement`。
  if (headType === "Keyword" && textOfNode(head, ctx) === "with") {
    const header = kids.find((k) => k.get("type") === "Bracket" && k.get("startBracket") === "(");
    const body = kids.find((k) => k.get("type") === "Bracket" && k.get("startBracket") === "{");
    const withProps = {};
    if (header !== undefined) withProps.expression = projectExpression(projectableKids(view(header)), ctx);
    if (body !== undefined) {
      withProps.statement = {
        kind: "Block",
        statements: projectEach(kidsOf(view(body), "children"), ctx, "Block"),
        pos: startOf(body),
        end: endOf(body),
      };
    }
    return { kind: "WithStatement", pos: v.start, end: stmtEndOf(v, ctx), ...withProps };
  }
  // ---- 关键字开头的语句（`return` / `throw` / `break` / `continue` / `debugger`）----
  if (headType === "Keyword") {
    // **`export` / `declare` 前缀 + 一条声明**（第 100 轮）：`export declare namespace Client {…}`
  // 的产物是 `Statement > [Keyword(export), Namespace(modifiers="declare")]`，而 TS 那边是
  // `ModuleDeclaration.modifiers = [ExportKeyword, DeclareKeyword]`（前缀词进**修饰词**、
  // 声明自己就是那条语句）。照下面的通用支会整条投成一个 `ExpressionStatement`
  // ——实测「多出 `ExpressionStatement`」410 里的一片（`undici-types` 整个 `export declare
  // namespace` 家族、`@types/node` 的 `declare module` 家族都在里面）。
    const prefixWords = kids.slice(0, kids.length - 1);
    const last = kids[kids.length - 1];
    const lastKind = KIND_BY_TAG.get(last.get("type"));
    const allPrefixes = prefixWords.every(
      (k) => k.get("type") === "Keyword" && ["export", "declare", "default"].includes(textOfNode(k, ctx)),
    );
    if (prefixWords.length > 0 && allPrefixes && lastKind !== undefined && STATEMENT_KINDS.has(lastKind)) {
      const declaration = projectNode(last, ctx);
      if (declaration !== undefined) {
        const leading = prefixWords.map((k) => projectNode(k, ctx)).filter((k) => k !== undefined);
        const modifiers = [...leading, ...(declaration.modifiers ?? [])];
        modifiers.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
        declaration.modifiers = modifiers;
        declaration.pos = v.start;
        return declaration;
      }
    }
    const kind = KEYWORD_STATEMENT_KINDS.get(textOfNode(head, ctx));
    if (kind !== undefined) {
      const rest = kids.slice(1);
      const props = {};
      // **没有表达式的 `throw`：TS 补一个零宽 `Identifier`**（第 906 轮）。
      //
      // `throw` 是 ASI 的**受限产生式**（换行就断句），而后面没有表达式时本仓的产物是
      // 光秃秃一个 `Keyword(throw)`（合法 TS 里不会出现——它是一条语法错，TS 那边
      // `parseDiagnostics` 只在**同一行**那种写法上报 "Expression expected."，
      // 换行那种写法**一条诊断都不报**，所以它可以是一条普通语料用例）。
      // TS 仍然建了一个**零宽** `Identifier` 当 `expression`（`forEachChild` 会访问它），
      // 于是尺子上报「缺 1 格 + 字段名不符 1 处」——`FIELD ThrowStatement 产物[] vs TS[expression]`。
      //
      // **位置取 `stmtEndOf`（不含尾分号的那一格）**，实测就是 TS 放那一格的地方：
      // `function f(){ throw` 换行 `}` ⇒ `ThrowStatement [13,19)`、`Identifier [19,19)`；
      // `const a = 1; throw;` ⇒ `Identifier [18,18)`（`;` 那一格）；文件末尾的 `throw` ⇒ [`5,5`)。
      // 三处都与「语句自己那一段的末尾」重合（本仓的语句壳本来就**不含**尾随 trivia），
      // 所以这一格不必回原文再扫一遍。
      //
      // **与数组的洞那一条同一个先例**（第 176 轮的 `OmittedExpression`）：
      // 产物里那一格什么都没有时，补一个零宽节点把「这一段是空的」这件事说出来。
      const bareEnd = stmtEndOf(v, ctx);
      if (rest.length > 0) {
        const value = projectExpression(rest, ctx);
        if (value !== undefined) props[KEYWORD_STATEMENT_EXPRESSION.has(kind) ? "expression" : "label"] = value;
      } else if (kind === "ThrowStatement") {
        props["expression"] = [{ kind: "Identifier", pos: bareEnd, end: bareEnd }];
      }
      // **收尾那个 `;` 归它自己**（第 838 轮）：`parseBreakOrContinueStatement` /
      // `parseReturnStatement` 收尾都调 `parseSemicolon()`，所以 TS 的区间含 `;`——
      // 而这一族的产物是「`Keyword` + 一段平级兄弟」、`;` **根本不在壳里**
      // （`for (;;) break;` 那个 `;` 被外层 `For` 收走，`break label;` 那个落在兄弟格上）
      // ⇒ 只按壳算就短一格。实测 `gap-m-misc-01`（`break;`）/ `-02`（`continue;`）/
      // `gap-a-comment-01`（`break label;`）各漂 1。
      return Object.assign({ kind }, props, {
        pos: v.start,
        end: semicolonEndOf(bareEnd, ctx),
      });
    }
  }
  // `head` 是不是名字上的**类型别名**（`TypeAssign`，`export type T = …` 的外壳还是 `Statement`）。
  if (kids.length === 1) {
    // **语句壳套语句壳是透明的**（第 929 轮）：上游会把「注释 + 被标的语句」先收成一条壳
    // （`blk :/*c*/{ … }` 里注释落在标签与块之间 ⇒ `Statement > [AreaAnnotation, Bracket]`），
    // 而那一格自己会投（`Statement.PrintAst` → `StatementOf`）⇒ 这里**直接交回它**。
    // 少了这一条，它会落到下面的表达式支 ⇒ 多一层 `ExpressionStatement`
    // （实测 `blk :/*c*/{ … }` / `lbl :/*c*/class C { … }` / `lbl :/*c*/function f() { … }` 一族 8 条）。
    if (headType === "Statement") {
      return projectNode(head, ctx);
    }
    const kind = KIND_BY_TAG.get(headType);
    if (kind !== undefined) {
      // **`export type T = …` 的 `pos` 在外层 `Statement` 上、修饰词在 `TypeAssign` 上**：
      // 起点取外层的 `v.start`，所以把外层起点**经 `ctx.baseStart` 递进去**
      // （`TypeAssign` 的投影已搬进 `tokens/type-assign.xl.md`，入口在那边，见第 197 轮）。
      let projected;
      if (headType === "TypeAssign") {
        const savedBaseStart = ctx.baseStart;
        ctx.baseStart = v.start;
        try {
          projected = projectNode(head, ctx);
        } finally {
          ctx.baseStart = savedBaseStart;
        }
      } else {
        projected = projectNode(head, ctx);
      }
      // 单个子单元**本身就是语句**（`if` / `class` / `import`…）⇒ 不再套壳；
      // 是**表达式**（`f(1)` / `a + b` / `new X`）⇒ TS 那边是 `ExpressionStatement > 表达式`。
      //
      // **类型别名要把尾分号吃进来**（第 535 轮）：`type F = (a) => B;` 在 TS 那边
      // `TypeAliasDeclaration` 的区间是 `[239,281)`（**含 `;`**，`Node.end` 就是分号之后），
      // 而产物这边 `TypeAssign` 自己的区间只到 `B` ⇒ 差一格
      //（实测 `expr-arrow-body-nested-ternary.ts` 一族 **21 份**文件各一处，
      //  修完全语料 850 → **871**）。别的语句族（`if` / `class` / `import` / `function`…）
      // **不能**这么吃 —— 它们的尾分号 TS 那边不算在自己身上（`class A {};` 的
      // `ClassDeclaration` 到 `}` 为止），所以只对 `TypeAliasDeclaration` 开这一档。
      if (STATEMENT_KINDS.has(kind)) {
        if (kind === "TypeAliasDeclaration") {
          projected.end = semicolonEndOf(
            Math.max(stmtEndOf(v, ctx), projected === undefined ? 0 : (projected.end ?? 0)),
            ctx,
          );
        }
        // **没体的函数声明也要吃尾分号**（第 838 轮）：`declare function f(): void /* c */ ;`
        // 在 TS 那边 `FunctionDeclaration` 的区间到 `;` 为止（第 663 轮那张表里它就写着
        // 「没体的是环境签名 / 重载，那个 `;` 归它自己」），而产物这边声明自己的区间只到
        // 最后一个实义单元（`;` 前面那条注释被 `stmtEndOf` 剪掉了）⇒ 整条短一大截
        // （实测 `decl-declare-function-trailing-comment`：缺 1 漂 1 多 1）。
        // **带体的那一档不在这一档**：它收在 `}` 上，`;` 是另一条 `EmptyStatement`。
        if (kind === "FunctionDeclaration" && projected.body === undefined) {
          projected.end = semicolonEndOf(projected.end ?? 0, ctx);
        }
        return projected;
      }
      // **终点不能早于表达式自己**（第 141 轮）：IIFE `(function () {…})()` 里那个 `Statement`
      // 单元的区间只到函数体那个 `}`，调用自己的 `()` 挂在 `Method` 上——见下面那一支的说明。
      // 收尾那个 `;` 也按 TS 的口径吃掉（见 `semicolonEndOf`）。
      return {
        kind: "ExpressionStatement",
        expression: projected,
        pos: v.start,
        end: semicolonEndOf(
          Math.max(stmtEndOf(v, ctx), projected === undefined ? 0 : (projected.end ?? 0)),
          ctx,
        ),
      };
    }
    // **裸块语句**（第 123 轮）：`{ … }` 在 TS 那边**本身就是一条语句**，
    // 不能再套 `ExpressionStatement`——`KIND_BY_TAG` 里没有 `Bracket`，
    // 所以上面那一支漏掉它，整块会被套上一层壳。
    if (headType === "Bracket" && String(head.get("startBracket") ?? "") === "{") {
      return projectNode(head, ctx);
    }
  }
  const expression = projectExpression(kids, ctx);
  return {
    kind: "ExpressionStatement",
    expression,
    pos: v.start,
    // **终点不能早于表达式自己**（第 141 轮）：IIFE `(function () {…})()` 里那个 `Statement`
    // 单元的区间只到函数体那个 `}`，而调用自己的 `()` 在 `Method` 上——
    // 于是表达式语句比 TS 短两个字符（实测 `fn-iife.ts` / `stmt-paren-start.ts` 各 2 处漂移）。
    end: semicolonEndOf(
      Math.max(stmtEndOf(v, ctx), expression === undefined ? 0 : expression.end),
      ctx,
    ),
  };
```

# private method semicolonEndOf:(end:int, ctx:any)=>int

`end` 之后跳过空白与注释，如果紧跟着一个 `;` 就把它算进来；否则原样返回。

**这是 TS 自己的口径**：`parseExpressionStatement` 收尾时调 `parseSemicolon()`，
而 `tryParseSemicolon` **不看换行**——当前 token 是 `;` 就吃掉。所以

    ;(function () { return 1 })()
    ;(function (a) { return a })(1)

第一行那条 `ExpressionStatement` 的区间是 `[1,31)`（**含下一行行首**那个 `;`），
而产物那边那个 `;` 根本不在树里（它是独立的一条空语句），于是短两格
（实测 `fn-iife.ts` / `stmt-paren-start.ts` 各 2 处漂移）。

**自己已经以 `;` 收尾的不再往后找**（第 838 轮）：`parseSemicolon` 只吃**紧跟**的那一个
`;`，吃过就不再吃第二个——`f();` 换行 `;` 里第二行那个 `;` 是**新的空语句**，
原来的写法一路跳过去把它算成了上一条的终结符（实测 `f();` 换行 `;`：上一条漂 1、
空语句缺 1）。判据落在**这一条自己的原文**上，与 `ownsTrailingSemicolon` 那一格同源。

```ts
  if (end > 0 && ctx.source[end - 1] === ";") return end;
  if (end > 0 && ctx.source[end - 1] === ";") return end;
  let at = end;
  for (;;) {
    while (at < ctx.source.length && /\s/.test(ctx.source[at])) at++;
    if (ctx.source.startsWith("//", at)) {
      while (at < ctx.source.length && ctx.source[at] !== "\n") at++;
      continue;
    }
    if (ctx.source.startsWith("/*", at)) {
      const close = ctx.source.indexOf("*/", at + 2);
      at = close < 0 ? ctx.source.length : close + 2;
      continue;
    }
    break;
  }
  return ctx.source[at] === ";" ? (ctx.consumedSemicolons.add(at), at + 1) : end;
```

# private method trailingSemicolonOf:(item:any, ctx:any)=>int

**这一格（一个产物单元）末尾那个 `;` 的位置**；末尾不是 `;` 就给 `undefined`。

判据落在**这一格自己的原文区间**上，而不是「这一格的起点是不是 `;`」：注释会把紧跟的
`;` 一起收进同一格（`function f() {} /*c*/;` 的那一格起点在注释上、`;` 在末尾），
按起点判就会把整格当成 trivia 丢掉（第 838 轮，实测那一格缺一个 `EmptyStatement`）。

**落在注释里面的 `;` 不算**（这一条是**普查当场红的**）：一整行注释以 `;` 收尾时
（`//     : never;` 这种行——`dist/ts` 里成片都是），这一格的末字符也是 `;`，
可它属于注释、不是语句终结符。判据是「末尾那一格**有没有落在某个子单元的区间里**」：
「注释 + `;`」那一格的注释子单元只盖到 `*/`、`;` 在它后面，而这一格整个 `;` 都在注释里。

```ts
  const end = endOf(item);
  if (end <= 0) return undefined;
  if (ctx.source[end - 1] !== ";") return undefined;
  for (const k of allKids(item instanceof Map ? view(item) : item)) {
    const range = k.get("range");
    if (range === undefined) continue;
    if (range[0] <= end - 1 && end - 1 <= range[1]) return undefined;
  }
  return end - 1;
```

# private method ownsTrailingSemicolon:(node:any, ctx:any)=>bool

**上一条语句自己会不会把紧跟的那个 `;` 当终结符**（第 838 轮的判据：问 kind，不问原文）。

四档，缺一档就有一族形状错位：

- **空语句不吞下一个**（`;;` 是两条 `EmptyStatement`，各自一格）；
- **自己已经以 `;` 收尾的不吞**（`f();` 换行 `;`：`parseSemicolon` 只吃紧跟的那一个，
  第二行那个 `;` 是新的空语句）；
- **带标签的语句问的是被标的那条**：`lab: {}` 换行 `;` 里那个 `;` 不归标签（`Block` 收在
  `}` 上），而 `lab: x = 1` 换行 `;` 归它（被标的是表达式语句）⇒ 递归问下去，
  两档由被标的那一条自己答；
- **`NO_TRAILING_SEMICOLON` 那张表**（第 663 轮）：表里的收在 `}` 上、不调 `parseSemicolon`
  ⇒ 紧跟的 `;` 是 `EmptyStatement`；表外的一律自己吃。
  **表里的 `FunctionDeclaration` 要按有没有体分两档**（同第 663 轮的口径）：
  没体的是环境签名 / 重载，那个 `;` 归它自己。

```ts
  const kind = String(node.kind);
  if (kind === "EmptyStatement") return false;
  if (typeof node.end === "number" && node.end > 0 && ctx.source[node.end - 1] === ";") return false;
  if (kind === "LabeledStatement" && node.statement !== undefined && node.statement !== null) {
    return ownsTrailingSemicolon(node.statement, ctx);
  }
  if (kind === "FunctionDeclaration" && node.body === undefined) return true;
  return !NO_TRAILING_SEMICOLON.has(kind);
```

# private method isOperatorUnit:(node:any, ctx:any)=>bool

这个单元能不能当**运算符**。

绝大多数运算符是 `SymbolToken`，但 **`in` / `instanceof` 是 `Keyword`**——
只认 `SymbolToken` 时会整类丢两侧操作数（实测 `x in o` 只剩一个 `operatorToken`，
真实语料 1118 处「产物只有 operatorToken、TS 有 left/right」都是这一条）。

**`Identifier` 那一态也要认**（第 550 轮）：关掉 reorg 之后，
`in` / `instanceof` 是**由 `KeywordCloseRule` 在关前那一趟升上去的** ——
可那一趟**排在最后**，而二元折叠造出来的那个单元是**自己又往下钻了一层**
（`ApplyCloseRules` 里 `Depth >= 8` 那道临时硬界，第 496 轮）——
界那一层**不再跑规则** ⇒ 最里面那一层的运算符**永远停在 `Identifier`**。
于是投影侧按 `Keyword` 判就**一格也认不出来**：整个 `x in o` 只剩下第一个操作数
（实测 `expr-in-array-literal.ts` 一份缺 38——`BinaryExpression` + `InKeyword` +
两侧操作数整族；`a instanceof b` 同样只投出 `a`）。
**按文本认词** 与 `WordText` 那条口径同一条（同一个词两态都要认）。

```ts
  const type = node.get("type");
  if (type === "SymbolToken") return true;
  if (type !== "Keyword" && type !== "Identifier") return false;
  return ["in", "instanceof"].includes(textOfNode(node, ctx));
```

# private method operatorTokenOf:(op:any, ctx:any)=>any

运算符那一格的**叶子节点**（第 550 轮）。

`Keyword` 那一态走现成的通用投影（`KEYWORD_KIND` 把它们映射成 `InKeyword` /
`InstanceOfKeyword`）；`Identifier` 那一态**必须按文本自己定 kind** ——
照通用投影会投成 `Identifier("in")`，于是同一个节点在账上**同时**记一笔「缺 `InKeyword`」
与一笔「多出 `Identifier`」。

```ts
  const text = textOfNode(op, ctx);
  if (op.get("type") !== "Identifier" || (text !== "in" && text !== "instanceof")) {
    return projectNode(op, ctx);
  }
  return {
    kind: text === "in" ? "InKeyword" : "InstanceOfKeyword",
    text,
    pos: startOf(op),
    end: startOf(op) + text.length,
  };
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
  // **注释是 trivia，不进表达式**（第 143 轮）：段里常夹着一整行注释——
  //
  //     ? // **数字键是 `NumericLiteral`**
  //       NUMERIC_LITERAL.test(…) ? { … } : nameOf(…)
  //
  // 不过滤的话这一串会以注释打头，通用支把它投成一个 `LineAnnotation` 节点、
  // 后面真正的表达式整段丢掉（实测 `dist/ts/typescript/ts-ast.ts` 缺 15 / 多出 3）。
  kids = kids.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  if (kids.length === 0) return undefined;
  // ---- 0a'。**隔空格的 async 泛型箭头** `async <T>(x: T) => x`（第 860 轮）----
  //
  // 这一档必须**排在 0a 前面**：它的产物是**三格** `[Identifier(async), GenericType(<T>), Lamda(…)]`，
  // 而 0a 的判据只问「头一格是 `Identifier`、第二格是 `GenericType`」——它当场把 `async <T>`
  // 认成实例化表达式（`ExpressionWithTypeArguments`），剩下的 `Lamda` 再走 `foldBinaryFrom`
  // ⇒ 实测 `expr-async-generic-arrow-spaced`：**缺 8 多 2**（`ArrowFunction` / `AsyncKeyword` /
  // `Parameter` / `EqualsGreaterThanToken` 整片缺，多出 `ExpressionWithTypeArguments` 与 `async`）。
  //
  // **与紧贴那一档的分工**：`async<T>(x) => x`（`async` 与 `<` 紧贴）在 `lamda.xl.md` 的
  // `Process` 里已经把泛型段**收进 `Lamda` 的替换范围**（那一档的产物只有一格 `Lamda`，
  // 本条一次都不会响）；隔空格那一档 `IsAsync` 仍是假、泛型段仍是**平级兄弟**，
  // 所以这里要自己把 `async` 与 `typeParameters` 两样补上，并把 `pos` 挪到 `async` 那一格
  //（`Lamda` 自己的起点是形参表）。
  // **`async` 与 `Lamda` 之间夹注释时是两格**（第 928 轮第二趟）：
  // `const g = async /*c*/ x => x;` 与 `const f = async/*c*/(): Promise<void> => {};` 里，
  // `LamdaCloseRule.Process` 找 `async` 的那一跳只跳软换行 ⇒ `IsAsync` 是假、`async`
  // 留在外面当**平级兄弟**（与「隔空格的泛型箭头」同一形状，只是中间那格是**注释**
  // ——它在投影前已被 `INVISIBLE` 滤掉，所以到这里是**两格**）。
  // 判据与上面那一档同源：头一格是 `Identifier(async)`、末一格是 `Lamda`，
  // 中间那格（如果有）必须是 `GenericType`。**两格 / 三格两种排版走同一段补法**。
  //
  // **为什么两格不会误伤**（`[async, () => 1]` / `f(async, () => 1)`）：那些地方的逗号
  // 是**平级的一格 `SymbolToken`**（逗号表达式成形的除外），kids 长度不是 2；
  // 两条语句（`async;` 换行 `() => 1`）也不会落进同一串单元。
  const asyncHead = kids[0].get("type") === "Identifier" && textOfNode(kids[0], ctx) === "async";
  const asyncPlain = asyncHead && kids.length === 2 && kids[1].get("type") === "Lamda";
  if ((kids.length === 3 && kids[0].get("type") === "Identifier" && kids[1].get("type") === "GenericType" && kids[2].get("type") === "Lamda" && textOfNode(kids[0], ctx) === "async") || asyncPlain) {
    const arrow: any = projectNode(kids[kids.length - 1], ctx);
    if (arrow !== undefined) {
      if (kids.length === 3) {
        const typeParams = unwrapNodes(kids[1]).filter((k) => k.get("type") === "TypeParameter");
        if (typeParams.length > 0) arrow.typeParameters = projectEach(typeParams, ctx);
      }
      // **`AsyncKeyword` 得自己补进 `modifiers`**：那一格平时由 `Lamda.IsAsync` 那条路合成，
      // 而这条路的 `IsAsync` 是假（隔空格那一档规矩如此）⇒ 只在投影这一层补一个节点，
      // 位置就取 `async` 那一格自己的两端（与 `async x => x` 合成出来的形状逐格相同）。
      const asyncNode = { kind: "AsyncKeyword", text: "async", pos: startOf(kids[0]), end: endOf(kids[0]) };
      if (Array.isArray(arrow.modifiers)) arrow.modifiers.push(asyncNode);
      else arrow.modifiers = [asyncNode];
      arrow.pos = startOf(kids[0]);
      return arrow;
    }
  }
  // ---- 0a。泛型实例化表达式 `f<string>`（第 850 轮）----
  //
  // TS 4.7 的 instantiation expression：`f<string>` 本身就是一个表达式，
  // TS 那边是 `ExpressionWithTypeArguments`（`expression` = 名字、`typeArguments` = 实参段）。
  // 产物那边它是**平级的两格**——`Identifier(f)` + `GenericType(<string>)`：
  // 泛型实参段在 token 层是主机的一个子单元（见 `generic-type.xl.md` 的名字闸），
  // 不是名字的孩子。
  //
  // 走通用支的后果（实测四条用例）：`f` 投成 `Identifier`、`GenericType` 投成 `TypeReference`，
  // 于是「缺 `ExpressionWithTypeArguments` + 缺实参的关键字 + 多出两格」。
  //
  // **这一格凭什么敢认**：token 层的 `IsAllowedFollower` 只在「`>` 后面那一格接不上表达式」时
  // 才让 `<…>` 成形（`;` / `)` / `,` / `??` / `(`），所以走到这里的两格**就是**实例化表达式；
  // 比较式（`a < b > c`）在 token 层就已经退回裸符号了，根本到不了这一支。
  // 带 `(` 的那一路仍然走链 / 调用那一支（`f<string>(x)` 是 `CallExpression`）。
  //
  // `endOf` 就是 TS 的 `end`（`range[1]`）——`startOf` / `endOf` 这一对在下面写着，
  // 全文件的口径一致（第 850 轮第一版多加了 1，实测四条用例一起报区间漂移）。
  // **被实例化的那头不止是个名字**（第 888 轮）：`g<number>` 之外还有
  // `a.b.c<string>`（链在 token 层已经折成**一格** `PropertyAccess`）与
  // `(a.b)<string>`（一格 `Bracket`，值位投出来是 `ParenthesizedExpression`）。
  // 原来这一格只认 `Identifier` ⇒ 那两格落到通用支：头一格投成 `PropertyAccessExpression`、
  // `GenericType` 投成 `TypeReference` ⇒ 缺 `ExpressionWithTypeArguments` + 缺实参里的关键字
  // （实测 `const f = a.b.c<string>;`：缺 2 / 多 0；`a[c]<string>` 同形——下标链折出来的
  // 也是 `PropertyAccess`）。
  // **为什么敢把这两类一起放进来**：`IsAllowedFollower` 那道闸在 token 层，
  // 走到这里的两格**就是**实例化表达式（第 850 轮那句话在这一格同样成立）；
  // 而比较式（`a.b.c<string> + 1`）在 token 层已经退回裸符号 ⇒ 产物里没有 `GenericType`，
  // 这一支一次都不会响（实测那一份的产物与 TS 逐格相同）。
  // `Bracket` 只认**圆括号**：`[a]<string>` / `{ a }<string>` 不是这条形状。
  const instHead = kids[0].get("type");
  const instCallee =
    instHead === "Identifier" ||
    instHead === "PropertyAccess" ||
    (instHead === "Bracket" && kids[0].get("startBracket") === "(");
  if (kids.length >= 2 && instCallee && kids[1].get("type") === "GenericType") {
    // **圆括号那一格要走 `projectExpression`**：`(a.b)<string>` 里的头一格是值位括号，
    // 而 TS 那边它是 `ParenthesizedExpression`（`ExpressionWithTypeArguments > ParenthesizedExpression`）。
    // `projectNode(Bracket, …)` 不认这一层（那一支在 `projectExpression` 里，
    // 见它那句「值位括号 `(expr)`」）⇒ 直接把括号单元原样投出来 ⇒ 实测「缺
    // `ParenthesizedExpression` 1 / 多一个未映射的 `Bracket` 1」。
    const expression =
      instHead === "Bracket" ? projectExpression([kids[0]], ctx) : projectNode(kids[0], ctx, "");
    if (expression !== undefined) {
      const args = projectTypeArguments(kids[1], ctx);
      // ---- 0a-1。**`callee<…>` 后面紧跟模板串 ⇒ 一条 `TaggedTemplateExpression`**（第 979 轮）----
      //
      // `f<T>`t`` 在 TS 那边**不是**「实例化表达式 + 模板」两格，而是**一条**
      // `TaggedTemplateExpression{ tag: Identifier(f), typeArguments: [TypeReference(T)],
      // template: NoSubstitutionTemplateLiteral }`——`<…>` 是**这条标签模板自己的**类型实参
      // （与 `f<T>(1)` 那条 `CallExpression{ expression, typeArguments, arguments }` 同一个口径）。
      // 拿真 TS 复量过（`tmp-r979/ts-shapes.cjs`）：`f<T>`t`` / `f<A, B>`t`` / `f<T>`${1}``
      // 三条的形状都是这一份，`x < y > `t`` 也一样（TS 把它读成 tag=`x`、typeArguments=`<y>`）。
      //
      // 原来这一支**先响**：`callee<…>` 投成 `ExpressionWithTypeArguments`，剩下的模板串交给
      // `foldBinaryFrom` ⇒ 模板那一格**整片丢**（登记的三条缺口：`gap-r977-inst-tagged*`，
      // 缺 `TaggedTemplateExpression` + `NoSubstitutionTemplateLiteral`、多一格 `ExpressionWithTypeArguments`）。
      //
      // 判据与 0b / 0c **同源**，只是标签那一串以 `GenericType` 收尾：
      //   · 模板**直接**是第三格（`f<T>`t``，与 0b 那一档同一个问题）；
      //   · 或者**装在第三格的 `PropertyAccess` 里**（`` f<T>`t`.c `` 的产物是
      //     `[Identifier(f), GenericType, PropertyAccess(String, ., c)]`——与 0c 一字不差）。
      // 两档的分工照抄 0b / 0c：直接那一档把剩下的一串交给 `chainOnto`，装在 `PropertyAccess`
      // 里那一档先 `chainOnto` 那一格自己的续格、再把外面的兄弟交给 `foldBinaryFrom`。
      //
      // 模板那一格凭什么敢认：与 0b 同一条——**原文的引号**（反引号才是模板，`"` / `'` 是普通字符串，
      // 产物里两者属性一模一样）；而 `<…>` 能成形本身就说明 token 层的 `IsAllowedFollower`
      // 认了「`>` 后面接不上普通表达式」（见 `generic-type.xl.md` 的名字闸）。
      const instTemplateDirect =
        kids.length >= 3 && kids[2].get("type") === "String" && ctx.source[startOf(kids[2])] === "`"
          ? kids[2]
          : undefined;
      const instTemplateChain =
        instTemplateDirect === undefined && kids.length >= 3 && kids[2].get("type") === "PropertyAccess"
          ? projectableKids(view(kids[2]))
          : [];
      const instChainHasTemplate =
        instTemplateChain.length >= 2 &&
        instTemplateChain[0].get("type") === "String" &&
        ctx.source[startOf(instTemplateChain[0])] === "`";
      // **第三档：模板被包在运算符单元的**左脊柱**里**（`` f<T>`t` + 1 ``）：产物是
      // `[Identifier(f), GenericType, BinaryOperator(String(反引号), +, 1)]`——
      // 走法与 0d 那一支**一字不差**（沿途把每一层的 `(运算符, 右操作数)` 从里往外收起来），
      // 区别只在标签那一串以 `GenericType` 收尾（0d 那一支的标签是 `kids.slice(0, 1)`）。
      // 脊柱上任何一层不满足就整个让开——宁可维持原来的错，也不把别的形状认成标签模板。
      let instSpineTemplate: any = undefined;
      let instSpineMembers: Array<any> = [];
      const instSpineLayers: Array<Array<any>> = [];
      if (
        instTemplateDirect === undefined &&
        !instChainHasTemplate &&
        kids.length >= 3 &&
        (kids[2].get("type") === "BinaryOperator" || kids[2].get("type") === "LogicalOperator")
      ) {
        let spine: any = kids[2];
        while (spine !== undefined) {
          const inner = projectableKids(view(spine));
          if (inner.length < 3) break;
          const spineHead = inner[0];
          const spineHeadKids = spineHead.get("type") === "PropertyAccess" ? projectableKids(view(spineHead)) : [spineHead];
          if (spineHeadKids[0]?.get("type") === "String" && ctx.source[startOf(spineHeadKids[0])] === "`") {
            instSpineTemplate = spineHeadKids[0];
            instSpineMembers = spineHeadKids.slice(1);
            instSpineLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
            break;
          }
          if (spineHead.get("type") !== "BinaryOperator" && spineHead.get("type") !== "LogicalOperator") break;
          instSpineLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
          spine = spineHead;
        }
      }
      if (instTemplateDirect !== undefined || instChainHasTemplate || instSpineTemplate !== undefined) {
        const templateUnit =
          instTemplateDirect !== undefined
            ? instTemplateDirect
            : instChainHasTemplate
              ? instTemplateChain[0]
              : instSpineTemplate;
        const template = projectNode(templateUnit, ctx);
        if (template !== undefined) {
          const head: any = {
            kind: "TaggedTemplateExpression",
            tag: expression,
            template,
            pos: startOf(kids[0]),
            end: endOf(templateUnit),
          };
          if (args.length > 0) head.typeArguments = args;
          if (instTemplateDirect !== undefined) {
            const tail = kids.slice(3);
            return tail.length === 0 ? head : chainOnto(head, tail, ctx);
          }
          if (instChainHasTemplate) {
            const chained = chainOnto(head, instTemplateChain.slice(1), ctx);
            const tail = kids.slice(3);
            if (tail.length === 0) return chained;
            // **尾巴第一格又是模板 ⇒ 接着接链，不当二元**（第 979 轮）：
            // `` f<T>`a`.b`c` `` 的产物是 `[Identifier, GenericType, PropertyAccess(`a`, ., b), String(`c`)]`
            // ——第二格模板是对**整条属性访问**再标一次（TS 是外面再套一层
            // `TaggedTemplateExpression`），交给 `chainOnto` 那一档；交给 `foldBinaryFrom`
            // 会把它当成一个操作数（实测那一格整片丢）。
            if (tail[0].get("type") === "String" && ctx.source[startOf(tail[0])] === "`") {
              return chainOnto(chained, tail, ctx);
            }
            return foldBinaryFrom(chained, tail, ctx);
          }
          // 脊柱那一档：先把标签与模板合成一条，再把沿途每一层从里往外折回去。
          const spineLeft = chainOnto(head, instSpineMembers, ctx);
          const spineRest: Array<any> = [];
          for (let q = instSpineLayers.length - 1; q >= 0; q--) {
            spineRest.push(instSpineLayers[q][0], instSpineLayers[q][1]);
          }
          for (const k of kids.slice(3)) spineRest.push(k);
          return foldBinaryFrom(spineLeft, spineRest, ctx);
        }
      }
      const self: any = {
        kind: "ExpressionWithTypeArguments",
        expression,
        pos: startOf(kids[0]),
        end: endOf(kids[1]),
      };
      if (args.length > 0) self.typeArguments = args;
      const rest = kids.slice(2);
      if (rest.length === 0) return self;
      return foldBinaryFrom(self, rest, ctx);
    }
  }
  // ---- 0a2。`instanceof` 右边那个实例化表达式 `b instanceof C<D>`（第 894 轮）----
  //
  // **与 0a 同一族，只是被实例化的那头不在开头**：产物是四格
  // `[Identifier(b), Keyword(instanceof), Identifier(C), GenericType(<D>)]`，
  // 而 0a 的判据只看**头一格** ⇒ 这一形状落到通用支：
  // `C` 投成 `Identifier`、`GenericType` 投成 `TypeReference` ⇒ 缺
  // `ExpressionWithTypeArguments`（实测片段 `const a = b instanceof C<D>;`：缺 2 / 漂 2 / 多 1）。
  //
  // **TS 那边怎么读**：`BinaryExpression(b, InstanceOfKeyword, ExpressionWithTypeArguments(C<D>))`——
  // 语法上就是实例化表达式，TS 另外用一条**语法错**把它拦下来
  //（`checkExpressionWithTypeArguments`：`The right hand side of an instanceof expression
  // must not be an instantiation expression`），说明解析这一层确实这么读。
  //
  // **为什么敢在投影这一层认**：`instanceof` 右边那一格的 `<…>` 只有在
  // token 层的 `IsTypePosition` 认了「`instanceof` 后面是类型位」时才成形
  //（见 `generic-type.xl.md` 第 894 轮那一支），所以走到这里的三格**就是**它。
  // 比较式（`a instanceof b < c`）在那一层根本没让 `<…>` 成形 ⇒ 这一支一次都不会响。
  //
  // **被实例化的那头只认名字**（与 0a 的豁免不同）：`a instanceof b.c<D>` 里 `c` 前面是 `.`
  // ⇒ token 层那一支不响 ⇒ `GenericType` 根本不存在；`a instanceof (b)<D>` 在 TS 里
  // 也不是实例化表达式。所以这里只列 `Identifier` 一格。
  //
  // **左边可能已经被收成 `BinaryOperator`**（实测）：`instanceof` 那一趟照样折，
  // 所以产物落下来是**两格** `[BinaryOperator(b, instanceof, C), GenericType(<D>)]`——
  // 那个 `BinaryOperator` 是**左操作数 + 运算符 + 被实例化的名字**，正好是本支要的前三格。
  // 两种形状（摊开的四格 / 折好的两格）在这里**先并成一条**再判，
  // 免得同一句话写两遍（写两遍就是两处会漂）。
  let instanceKids =
    kids.length >= 4 ? kids : [];
  if (
    kids.length === 2 &&
    (kids[0].get("type") === "BinaryOperator" || kids[0].get("type") === "LogicalOperator") &&
    kids[1].get("type") === "GenericType"
  ) {
    const folded = unwrapNodes(kids[0]);
    if (folded.length === 3) {
      instanceKids = [...folded, kids[1]];
    }
  }
  if (
    instanceKids.length >= 4 &&
    isOperatorUnit(instanceKids[1], ctx) &&
    textOfNode(instanceKids[1], ctx) === "instanceof" &&
    instanceKids[2].get("type") === "Identifier" &&
    instanceKids[3].get("type") === "GenericType"
  ) {
    const callee = projectNode(instanceKids[2], ctx, "");
    if (callee !== undefined) {
      const args = projectTypeArguments(instanceKids[3], ctx);
      const self: any = {
        kind: "ExpressionWithTypeArguments",
        expression: callee,
        pos: startOf(instanceKids[2]),
        end: endOf(instanceKids[3]),
      };
      if (args.length > 0) self.typeArguments = args;
      // **这一格不能交回 `foldBinaryFrom` 去折**（实测）：那个函数的 `rest` 是**原始单元**
      // （`Map`，它按 `k.get("type")` 问类型），而这里要交给它的是一个**已经投好的节点**
      // ——折到那一格会当场 `TypeError: opener.get is not a function`
      //（`angleAssertionLength` 对着一格普通对象问 `.get`）。
      //
      // 所以这里自己把这一层二元折出来（与 `foldBinaryFrom` 的二元那一支同一个形状：
      // `pos` 取左操作数、`end` 取右操作数），尾巴上还有运算符（`as` 那种）时才交回它。
      // 运算符节点仍走 `operatorTokenOf`——`instanceof` 在这一层常常还是 `Identifier`。
      const binary: any = {
        kind: "BinaryExpression",
        left: projectNode(instanceKids[0], ctx, ""),
        operatorToken: operatorTokenOf(instanceKids[1], ctx),
        right: self,
        pos: startOf(instanceKids[0]),
        end: self.end,
      };
      const rest = instanceKids.slice(4);
      if (rest.length === 0) return binary;
      return foldBinaryFrom(binary, rest, ctx);
    }
  }
  // ---- 0。尖括号类型断言 `<T>x`（第 144 轮）----
  //
  // TS 那边是 `TypeAssertionExpression > [type, expression]`，而产物把它记成**平级两格**：
  // `<T>` 是一个 `GenericType`（token 层的 `IsTypePosition` 放行的那种表达式最开头的 `<`，
  // 见 `generic-type.xl.md`），后面才是被断言的那个表达式。
  // 直接照链 / 二元那一支投会把它读成比较式（`<string` `>` `x`）。
  //
  // **泛型箭头函数不走这里**（`<T>(x: T): T => x` 也是 `[GenericType, Lamda]` 两格）——
  // 那一支在后面，这里先让开（判据是第二格是不是 `Lamda`）。
  if (kids[0].get("type") === "GenericType" && kids.length >= 2 && kids[1].get("type") !== "Lamda") {
    // **被断言的是「一个一元表达式」，不是后面全部**（第 379 轮）。
    //
    // TS 里 `<T>expr` 是**前缀**那一档（与 `!x` / `typeof x` 同一档）——
    // 所以 `<number>a + b` 是 `(<number>a) + b`，**不是** `<number>(a + b)`。
    // **原来把后面整段都吞了**（`projectExpression(kids.slice(1))`）：`<number>a + <number>b`
    // 于是投成「一个断言套住整个加法」——**值看着一样**（两边都算 `3`），
    // 可节点形状与区间都错，落到降级层就报 `name is not a local or a capture: number`
    //（判据 `c371-ex-type-assertions-in-operands`、`ex-angle-bracket-assertion` 那一族）。
    //
    // **修法**：断言只吃**一个操作数**（前缀运算符连着算），剩下那几格交给
    // `foldBinaryFrom`——第 141 / 180 轮那两处用的就是它（这里不另写一份折叠）。
    const assertedTypeKids = projectableKids(view(kids[0]));
    let asserted = projectTypeExpression(assertedTypeKids, ctx);
    // **「参数表」那层包装不是断言的类型**（第 890 轮）。
    //
    // `type-parameter.xl.md` 的 `IsParameterList` 有一条判据是「泛型段后面紧跟 `(`」——
    // 那是给泛型箭头 / 函数类型（`const g: <T>(x: T) => T`、`<T>(x: T) => x`）用的。
    // 可**定下它的时候后面那对括号还没扫完**（`=>` 也还没出现），所以那一格只能猜；
    // 断言正好撞在同一形状上：`<T>(x) > y` 里 `<T>` 后面也是 `(`。
    // 能分辨这件事的**只有这一层**：走到这里时括号已经成形，而**第二格不是 `Lamda`**
    //（上面那条判据）⇒ 这次 `<…>` 不可能是参数表。于是把包装拆掉、按**类型**重投一遍
    //（`<T>` 的内容是名字 ⇒ `TypeReference`，TS 那边正是它）。
    //
    // 实测：`<T>(x) > y` 修前缺 `TypeReference(T)` 多 `TypeParameter(T)`（缺 1 多 1）。
    if (asserted !== undefined && asserted.kind === "TypeParameter" && assertedTypeKids.length === 1) {
      asserted = projectTypeExpression(projectableKids(view(assertedTypeKids[0])), ctx);
    }
    // **操作数有多长**：前缀运算符一串，然后**一格**就是整个操作数——
    // 后缀链（`.b` / `(…)` / `[…]`）在产物里**已经折成一格**了
    //（`PropertyAccess` / `Method` / `Bracket`），所以不必在这里再拼后缀。
    let operandEnd = 1;
    while (operandEnd < kids.length && isPrefixOperatorUnit(kids[operandEnd], ctx)) {
      operandEnd += 1;
    }
    if (operandEnd < kids.length) {
      operandEnd += 1;
    }
    const expression = projectExpression(kids.slice(1, operandEnd), ctx);
    if (asserted !== undefined && expression !== undefined) {
      const assertedNode = {
        kind: "TypeAssertionExpression",
        type: asserted,
        expression,
        pos: startOf(kids[0]),
        end: expression.end,
      };
      const rest = kids.slice(operandEnd);
      if (rest.length === 0) {
        return assertedNode;
      }
      return foldBinaryFrom(assertedNode, rest, ctx);
    }
  }
  // **`GenericType` 没成形的那种**（第 152 轮）：`<number>1` 里 `>` 后面跟着一个**数字**，
  // 而 `IsAllowedFollower` 的白名单刻意不含数字（`foo(bar) > 3` 要能退回比较式），
  // 于是产物是一段平的 `[<, number, >, 1]`。判据仍然只看「第一个单元是不是 `<`」——
  // 有左操作数的比较式（`a < b > c`）第一个单元是那个 `a`，撞不到这里。
  if (kids[0].get("type") === "SymbolToken" && textOfNode(kids[0], ctx) === "<" && kids.length >= 3) {
    let depth = 0;
    let close = -1;
    for (let i = 0; i < kids.length; i++) {
      const text = kids[i].get("type") === "SymbolToken" ? textOfNode(kids[i], ctx) : "";
      if (text === "<") {
        depth++;
      } else if (text === ">") {
        depth--;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close > 0 && close + 1 < kids.length) {
      const asserted = projectTypeExpression(kids.slice(1, close), ctx);
      const expression = projectExpression(kids.slice(close + 1), ctx);
      if (asserted !== undefined && expression !== undefined) {
        return {
          kind: "TypeAssertionExpression",
          type: asserted,
          expression,
          pos: startOf(kids[0]),
          end: expression.end,
        };
      }
    }
  }
  // **值位括号 `(expr)`**（第 81 轮）：TS 那边是 `ParenthesizedExpression`（区间含那对括号、
  // `expression` 是里面那段），产物那边就是一个 `(` 括号单元。
  //
  // 判据能这么简单（只认「一个 `(` 括号」），是因为**实参表 / 形参表 / 类型括号不会走到这里**：
  // 那些括号的父单元是 `Method` / `Function` / `Lamda` / `Signature` / 类型容器，
  // 由各自的投影路径摊平；`projectExpression` 收到的单元一律是**操作数**。
  if (kids.length === 1 && kids[0].get("type") === "Bracket" && kids[0].get("startBracket") === "(") {
    return parenthesizedOf(kids[0], ctx);
  }
  // ---- 0b0. `await x` / `yield x`（第 130 轮）----
  //
  // 产物把 `await` / `yield` 记成一个 `Keyword`，与它的操作数**平级**；TS 那边它们是
  // `AwaitExpression` / `YieldExpression`，而那两个词**不是子节点**（`forEachChild`
  // 只访问 `expression`）。照通用支投会多出一个 `AwaitKeyword` / `YieldKeyword`、
  // 又缺整个表达式与它里面的调用（实测 `await g(a)`：缺 `AwaitExpression` /
  // `CallExpression` / 两个 `Identifier`，多出 `AwaitKeyword`）。
  //
  // **必须排在下面那句「单个单元直接投」之前**：`yield;` 的产物就是**一格**
  // `Keyword(yield)`，走到那一句会把它投成 `Identifier`。
  //
  // **那两个词不一定是 `Keyword`**（第 739 轮）：`x && await y` 里**内层那个 `await`**
  // 在产物里是 `Identifier`（逻辑段是从**外层那个前缀词**后面起算的，内层那一个
  // 还没被 `KeywordCloseRule` 升上去）——只认 `Keyword` 时这一格投成**一个光秃秃的标识符**、
  // 它的操作数 `y` 一个字都不留下，降级期报 `name is not a local or a capture: await`
  //（**整份文件跑不进来**）。与 `isOperatorUnit` 按文本认 `in` / `instanceof`
  // 是同一个手法：**同一个词两态都要认**（在模块 / 异步函数里 `await` 不可能是一个变量名）。
  const headKind = kids[0].get("type");
  const headWord = textOfNode(kids[0], ctx);
  if (headKind === "Keyword" || (headKind === "Identifier" && (headWord === "await" || headWord === "yield"))) {
    const word = headWord;
    // **第三态：裸的那个词**（第 960 轮，缺口 `gap-r955-yield-await-outside-context`）。
    //
    // 这个分支到第 959 轮为止只认「这一格是不是 `yield` / `await` 这个词」，而 TS 那边
    // 这两种写法**各自有两态**，分界**不在「我在不在生成器 / `async` 里」，而在「这个词有没有操作数」**：
    //
    // | 写法 | TS |
    // | --- | --- |
    // | 生成器里 `yield 1` / `yield* g()` | `YieldExpression` |
    // | **非生成器**的 `function f() { yield g(); }` | `YieldExpression`（TS 照收，运行期才报） |
    // | **两处都算**的裸 `yield`（`const v = yield;` / `return (yield);`） | **`Identifier`** |
    // | `async` 函数里 `await 1` | `AwaitExpression` |
    // | **非 async** 的 `function f() { await g(); }` | `AwaitExpression`（同上） |
    // | **两处都算**的裸 `await`（`const w = await;` / `return await;` / 顶层 `await;`） | **`Identifier`** |
    //
    // 所以判据是**两条一起**：①这一格**只有那个词**（`kids.length === 1`，没有操作数、
    // 没有 `*`）；②我**不在**那个上下文里（见 `functionContextOf`）。两条都成立才是普通标识符。
    // 只看 ② 会把 `await 0;` 这种**模块顶层 await** 一起判掉（那一条 TS 是 `AwaitExpression`），
    // 只看 ① 会把生成器里的裸 `yield` 判掉（那一条 TS 是 `YieldExpression`）。
    //
    // **`word` 这一道不能省**：这一格拿到的 `Keyword` **不止这两个词**——
    // `this` 在产物里也是一格 `Keyword`（`leafKindOfText` 把它投成 `ThisKeyword`），
    // 只按 `headKind === "Keyword"` 放行就会把每一格 `this` 都投成普通的 `Identifier`
    //（实测：整份文件的 `ThisKeyword` 全没了、降级期报 `name is not a local or a capture: this`）。
    //
    // **区间必须收在词自己身上**：不折时这一格是**一个标识符**，TS 的 `Identifier[9,15)`
    // 就是那个词；而下面 `yield` 那一支的 `end` 会拉到操作数末尾，照抄过来就会多出一段。
    // 所以这一支**自己造 `Identifier`**、不落下去。
    if (headKind === "Keyword" && (word === "yield" || word === "await") && kids.length === 1) {
      const owner = kids[0].__token;
      const context = owner === undefined ? null : functionContextOf(ctx, owner);
      const inContext = context !== null && (word === "yield" ? context.generator === true : context.async === true);
      if (inContext === false) {
        return {
          kind: "Identifier",
          text: word,
          pos: startOf(kids[0]),
          end: endOf(kids[0]),
        };
      }
    }
    // **`yield` 可以没有操作数、也可以带 `*`**（第 130 轮）：`yield;` 的 TS 是
    // `YieldExpression[146,151)`（就是那个词），`yield* other()` 的 `*` 进
    // `asteriskToken`、`other()` 进 `expression`。少了这两支，裸 `yield` 会被投成
    // `Identifier`、带 `*` 的那条只在 `yield*` 处收尾（`CallExpression` 整片丢）。
    if (word === "yield") {
      const props: any = {};
      let rest = kids.slice(1);
      if (rest.length > 0 && rest[0].get("type") === "SymbolToken" && textOfNode(rest[0], ctx) === "*") {
        props.asteriskToken = projectNode(rest[0], ctx);
        rest = rest.slice(1);
      }
      const value = rest.length > 0 ? projectExpression(rest, ctx) : undefined;
      if (value !== undefined) props.expression = value;
      return {
        kind: "YieldExpression",
        ...props,
        pos: startOf(kids[0]),
        end: value === undefined ? endOf(kids[kids.length - 1]) : value.end,
      };
    }
    // **`await` 是一元前缀、比二元与逻辑都紧**（第 739 轮）：`await x + 1` 是 `(await x) + 1`，
    // 而 token 层**已经把 `await` 后面那一整段折成了一个单元**（`BinaryOperator(x + 1)`）——
    // 照原样投就是把二元那一段整个塞进 `await` 的操作数（**静默错值**：
    // `await Promise.resolve(1) + 1` 在 Node 里给 `2`、本仓给 `[object Promise]1`；
    // `await Promise.resolve(0) && "T"` 在 Node 里给 `0`、本仓给 `"T"`）。
    //
    // **做法**：沿那个单元的**最左边那条脊**剥下去，剥到第一个不是运算符单元的操作数为止
    //（`await x * 2 + 3` 剥出 `x`、尾巴是 `* 2 + 3`；`await o.m() + 1` 剥出那一条链），
    // 剥出来的当 `await` 的操作数，剩下的连同本层后面的兄弟交给 `foldBinaryFrom` 照常折。
    // 这与第 711 轮收 `typeof o[k]().v` 那一格**是同一个形状**（一元前缀 + 操作数在后），
    // 只是这里操作数与 `await` **平级**、而那里操作数在那个一元单元**里面**。
    //
    // **尾巴里那格 `As` 不归 `foldBinaryFrom` 管**：`await x as T` 是平级两格 `[x, As]`
    //（摊平之后一个运算符都没有），`await x + 1 as any` 的尾巴里也有 `As`——
    // 这两种一律回落到下面那条老路（`as` 的结合性本仓另有口径，抢过来会把那一格丢掉）。
    if (word === "await" && kids.length >= 2) {
      const isOperatorFold = (unit:any):bool => {
        const kind = unit === undefined ? "" : unit.get("type");
        return kind === "BinaryOperator" || kind === "LogicalOperator";
      };
      // **先把最左边那条脊摊平**：`await x * 2 + 3` 的产物是
      // `BinaryOperator(+)( BinaryOperator(*)(x, *, 2), +, 3 )`——一直摊到「头一格不是
      // 运算符单元」为止，摊出来的那份平铺串里**第一个运算符**就是 `await` 该停的地方。
      // 左操作数**自己也可能是一段**（`await a && await b` 里那一格是
      // `Keyword(await) + 那个调用`），所以剥出来的是一段 **list**、不是一个单元。
      // **右边那一格不一定是运算符单元**：`await x > 0` 的产物是平铺的
      // `[await, x, >, 0]`（关系运算符那一族没折进单元），所以这一支不设「头一格是运算符」
      // 这道门——摊平之后找不到运算符就自然回落到下面那条老路。
      let flat = kids.slice(1);
      while (isOperatorFold(flat[0])) {
        const inner = projectableKids(view(flat[0]));
        if (inner.length < 2) break;
        flat = [...inner, ...flat.slice(1)];
      }
      let opAt = -1;
      for (let at = 0; at < flat.length; at++) {
        const unit = flat[at];
        // **运算符单元本身也是切点**（第 741 轮）：`await o?.p + 1` 里那个
        // `BinaryOperator` 单元的**第一个孩子是链的续接**（`?.p`），它就是 `await`
        // 该停的地方（摊平那一趟只摊**头一格**，所以它留在了 `flat` 里）。
        if (isOperatorFold(unit)) {
          opAt = at;
          break;
        }
        if (!isOperatorUnit(unit, ctx)) continue;
        // **`.` 不是切点**（第 740 轮，**实测踩过一次**）：`typeof (await Promise.resolve("s"))`
        // 里那对括号的子单元是**平铺的一串**（`[await, Promise, ., resolve(…)]`，链没折成
        // `PropertyAccess` 单元）——把那个 `.` 当成运算符切开会折出
        // `(await Promise) . resolve`，降级期报 `name is not a local or a capture: resolve`。
        // 它是**成员访问的续接**、不是二元运算符，跳过它之后这一支自然回落到老路
        //（老路把 `[Promise, ., resolve(…)]` 折成一条链，正是要的形状）。
        if (textOfNode(unit, ctx) === ".") continue;
        opAt = at;
        break;
      }
      // **只有在摊平之后真的能在运算符处切开、而且尾巴里没有 `As` / `Satisfies` / 平铺的 `.`
      // 时才走这一支**：`await x as T` 是平级两格 `[x, As]`（摊平之后一个运算符都没有），
      // 那两格的结合性本仓另有口径，抢过来说会把 `as` 那一格丢掉
      //（`await x + 1 as any` 也是同一形状：尾巴里那格 `As` 不归 `foldBinaryFrom` 管）；
      // 尾巴里有**平铺的 `.`**（`[+, b, ., c]`）时 `foldBinaryFrom` 会把那个 `.` 当成
      // 运算符（`operatorRank` 给不出名字的一律 7）⇒ 右操作数被切在半截上，也回落。
      const tail = opAt > 0 ? flat.slice(opAt) : [];
      const tailIsOperators =
        opAt > 0 &&
        tail.length >= 2 &&
        tail.every(
          (unit) =>
            unit.get("type") !== "As" &&
            unit.get("type") !== "Satisfies" &&
            !(unit.get("type") === "SymbolToken" && textOfNode(unit, ctx) === "."),
        );
      if (tailIsOperators) {
        const operand = projectExpression(flat.slice(0, opAt), ctx);
        if (operand !== undefined) {
          const awaited = {
            kind: "AwaitExpression",
            expression: operand,
            pos: startOf(kids[0]),
            end: operand.end,
          };
          return foldBinaryFrom(awaited, tail, ctx);
        }
      }
      // **`await` 的操作数是一条 `?.` 链、而那个运算符单元把链的续接装在自己第一个孩子里**
      // （第 741 轮，收掉第 739 轮登记的 `p739a-a14`）：`await o?.p + 1` 的产物是
      // `[Keyword(await), Identifier(o), BinaryOperator(+( NCO(p), +, 1 ))]`——
      // `?.p` 属于 **`await` 的操作数**那一截链（JS 里是 `(await (o?.p)) + 1`），
      // 而它在那个二元单元的**第一个孩子**位置上（与 `t?.get(k) ?? d` 那一族同一形状）。
      // 少了这一支，老路会把 `?.p` 接到**整个 `await` 节点的结果**上（`(await o)?.p`）⇒
      // 本仓给 `[object Promise]1`、Node 给 `3`（**静默错值**）。
      if (tail.length === 1 && isOperatorFold(tail[0])) {
        const inner = projectableKids(view(tail[0]));
        if (inner.length >= 2 && inner[0].get("type") === "NullConditionalOperator") {
          const base = projectExpression(flat.slice(0, opAt), ctx);
          if (base !== undefined) {
            let chained = chainWithOptional(base, inner[0], ctx);
            let chainAt = 1;
            while (chainAt < inner.length && inner[chainAt].get("type") === "NullConditionalOperator") {
              chained = chainWithOptional(chained, inner[chainAt], ctx);
              chainAt += 1;
            }
            const awaited = {
              kind: "AwaitExpression",
              expression: chained,
              pos: startOf(kids[0]),
              end: chained.end,
            };
            return foldBinaryFrom(awaited, inner.slice(chainAt), ctx);
          }
        }
      }
      const value = projectExpression(kids.slice(1), ctx);
      if (value !== undefined) {
        return { kind: "AwaitExpression", expression: value, pos: startOf(kids[0]), end: value.end };
      }
    }
  }
  // **表达式里的私有名 `#x`**（第 131 轮）：`#x in o` 的产物是
  // `[SymbolToken(#), Identifier(x), Keyword(in), Identifier(o)]`——`#` 与名字是两格。
  // 合成一个 `PrivateIdentifier` 之后，后面的运算符与操作数照常折（`in` 走
  // `isOperatorUnit` 那一支：它是 `Keyword` 不是 `SymbolToken`）。
  if (kids.length >= 2 && kids[0].get("type") === "SymbolToken" && textOfNode(kids[0], ctx) === "#") {
    const named = kids[1];
    const simple = named.get("type") === "Identifier" || named.get("type") === "Keyword";
    if (simple) {
      const head = {
        kind: "PrivateIdentifier",
        text: "#" + textOfNode(named, ctx),
        pos: startOf(kids[0]),
        end: endOf(named),
      };
      const rest = kids.slice(2);
      if (rest.length === 0) return head;
      return foldBinaryFrom(head, rest, ctx);
    }
    // **名字被折进了二元单元**（第 131 轮）：`#x in o` 的产物是
    // `[SymbolToken(#), BinaryOperator(in)( Identifier(x), «in», Identifier(o) )]`——
    // 那个二元单元的**第一个孩子才是名字**，其余是运算符与右操作数。
    // 不拆的话整个 `x in o` 会被当成名字（`PrivateIdentifier` 的区间一路撑到 `o`）。
    if (named.get("type") === "BinaryOperator" || named.get("type") === "LogicalOperator") {
      const inner = projectableKids(view(named));
      if (inner.length >= 2) {
        const head = {
          kind: "PrivateIdentifier",
          text: "#" + textOfNode(inner[0], ctx),
          pos: startOf(kids[0]),
          end: endOf(inner[0]),
        };
        return foldBinaryFrom(head, [...inner.slice(1), ...kids.slice(2)], ctx);
      }
    }
  }
  // **泛型箭头函数的类型参数段是平级兄弟**（第 134 轮）：`const f = <T>(x: T): T => x` 的产物是
  // `[GenericType(<T>), Lamda(…)]`——`<T>` **不在** `Lamda` 里面。TS 那边它是
  // `ArrowFunction.typeParameters`。照通用支投会把它当成一个类型引用（`TypeReference`），
  // `ArrowFunction` 与它的形参、返回类型整片丢（实测 `expr-arrow-generic.ts` 缺 16）。
  if (kids.length === 2 && kids[0].get("type") === "GenericType" && kids[1].get("type") === "Lamda") {
    const arrow: any = projectNode(kids[1], ctx);
    if (arrow !== undefined) {
      const typeParams = unwrapNodes(kids[0]).filter((k) => k.get("type") === "TypeParameter");
      if (typeParams.length > 0) arrow.typeParameters = projectEach(typeParams, ctx);
      arrow.pos = startOf(kids[0]);
      return arrow;
    }
  }
  // **带 `async` 的泛型箭头函数**（第 856 轮）：`async<T>(x) => x` 的产物是
  // `[Identifier(async), GenericType(<T>), Lamda(…)]`——上面那一支只认**两格**
  // （`<T>` + `Lamda`）。**这一格在实测里没有跑到**（第 856 轮拿探针对过：
  // `const h = async<T>(x) => x;` 那条路根本不进本方法，`ARROW-TP` 那条临时诊断
  // 一次都没响），所以**不在这里落代码**——留下的只是这条经度过的结论：
  // 要收这一档得先找到是谁投的这条 `Lamda`（`IsAsync` 与起点已经在
  // `lamda.xl.md` 的 `Process` 里补齐了，`typeParameters` 那一格仍缺）。
  // **表达式位的标记**（第 141 轮）：`Function` / `Class` 这一个产物标签在
  // 声明位是 `FunctionDeclaration` / `ClassDeclaration`、在表达式位是
  // `FunctionExpression` / `ClassExpression`，产物同形——唯一可靠的区分是「谁在投它」。
  // 与 `ctx.typePosition` 同一手法（见 `projectTypeExpression` 那一处）。
  if (kids.length === 1) {
    const savedExpression = ctx.expressionPosition;
    ctx.expressionPosition = true;
    try {
      return projectNode(kids[0], ctx);
    } finally {
      ctx.expressionPosition = savedExpression;
    }
  }
  const isSymbol = (k, text) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === text;

  // ---- 0。`import.meta` / `new.target`（第 141 轮）----
  //
  // TS 那边它们是 `MetaProperty`（**只有 `name` 一个子节点**——`forEachChild` 对
  // `MetaProperty` 只访问 `name`，`new` / `import` 那个词**不出节点**），外面那一层
  // 属性链再套 `PropertyAccessExpression`：
  //
  //     import.meta.url  ⇒  PropertyAccessExpression[MetaProperty(meta), Identifier(url)]
  //     new.target       ⇒  MetaProperty[Identifier(target)]
  //
  // 产物那边是 `[Keyword(import), ., PropertyAccess(meta . url)]` 与
  // `[Keyword(new), ., Identifier(target)]` 两种形状，照链那一支走会投成
  // `PropertyAccessExpression` 并多出 `ImportKeyword` / `NewKeyword`
  // （实测 `ex-meta-props.ts`：缺 2 + 多出 4）。
  if (
    kids[0] !== undefined &&
    (kids[0].get("type") === "Keyword" || kids[0].get("type") === "Identifier") &&
    (textOfNode(kids[0], ctx) === "new" || textOfNode(kids[0], ctx) === "import") &&
    isSymbol(kids[1], ".") &&
    kids.length >= 3
  ) {
    const named = kids[2];
    // `import.meta.url` 的 `meta.url` 被收成了一个 `PropertyAccess`；`new.target` 只是名字。
    //
    // **名字那一格也可能是一个 `BinaryOperator`**（第 539 轮实测）：关掉 reorg 之后
    // `new.target === A` 里 `target === A` 被折成了一个 `BinaryOperator`
    //（`new` 不再当链底之后，二元那条规则把 `target` 与它右边整段收在一起）。
    // 照整格投影会把 `=== A` 一起卷进 `MetaProperty` ⇒ **只取它的第一个操作数**
    //（运算符左边那一格就是名字）。探针现场（`tmp/recon/probe-meta.cjs`）：
    //
    //     MP1DBG kids=Keyword(new),SymbolToken(.),BinaryOperator()
    const namedKids = named.get("type") === "PropertyAccess" ? projectableKids(view(named)) : [named];
    // **「名字那一格是不是被折进了二元单元」要单独记下来**（第 560 轮）：
    // 下面那个「一直往左走到不是二元运算符为止」的循环只有在**第一格就是二元单元**时才有意义
    //（`new.target === A`：`target === A` 被折成一格，名字要从它左边取）。
    // 原来那一句 `inner` 的写法**没有把这件事记下来** —— 它写的是
    // 「`firstName` 不是二元单元 ⇒ `inner = [firstName]`」，而那对**普通名字**也成立
    // ⇒ `import.meta.url` 的 `meta.url` 是**一个 `PropertyAccess`**、`namedKids` 是
    // `[meta, ., url]`，`firstName` 就是那个 `meta` ⇒ `inner` 被砍成 `[meta]`
    // ⇒ 下面那个「往后接 `.名字`」的循环一格都接不上 ⇒ 投出来只有 `MetaProperty(meta)`
    //（实测 `expr-call-import-meta.ts` / `ex-meta-props.ts`：缺 `PropertyAccessExpression`
    //  + `Identifier(url)` 两个 ——而 `[PropertyAccessExpression, Identifier]` 正好是
    //  「`.url` 整段丢了」的形状）。
    const headIsBinary =
      namedKids.length > 0 &&
      namedKids[0] instanceof Map &&
      namedKids[0].get("type") === "BinaryOperator";
    // **一直往左走到不是二元运算符为止**（第 539 轮实测）：那个 `BinaryOperator` 是**嵌套**的
    //（`target === A` 折了好几层，探针打出来 `first` 仍然是 `BinaryOperator`）——
    // 只剥一层不够，要剥到最左边那个真正的名字。
    let firstName = namedKids.length > 0 ? namedKids[0] : undefined;
    let guard = 0;
    while (
      firstName instanceof Map &&
      firstName.get("type") === "BinaryOperator" &&
      guard < 32
    ) {
      const down = projectableKids(view(firstName));
      if (down.length === 0) break;
      firstName = down[0];
      guard = guard + 1;
    }
    // **只有「剥过」才把 `inner` 收成一格**：`new.target === A` 的名字是剥出来的那一格
    //（运算符与右操作数属于**外面**那一折，第 539 轮把区间修对、接运算符那一截是另一笔账）；
    // 其余情形 `inner` 就是**整个 `namedKids`** ——`meta.url` 那两格要在下面接上。
    const inner = headIsBinary && firstName !== undefined ? [firstName] : namedKids;
    let meta: any = {
      kind: "MetaProperty",
      name: nameOf(inner[0], ctx),
      pos: startOf(kids[0]),
      end: endOf(inner[0]),
    };
    let at = 1;
    while (at < inner.length) {
      if (!isSymbol(inner[at], ".") || at + 1 >= inner.length) break;
      const member = inner[at + 1];
      meta = {
        kind: "PropertyAccessExpression",
        expression: meta,
        name: nameOf(member, ctx),
        pos: meta.pos,
        end: endOf(member),
      };
      at += 2;
    }
    // **后面那些 `.名字` 也要继续接上**（第 346 轮，**实测撞到的**）：
    // 原来到这里直接 `kids.slice(3)` 丢给 `foldBinaryFrom`——而 `.` 在那一支里
    // 会当成**二元运算符** ⇒ `new.target.name` 投出来是一个**光秃秃的 `Identifier(name)`**
    //（症状：降级期报「name is not a local or a capture: name」——
    //  **一句话里没有一个字提到 `new.target`**）。
    // 所以先把点号链**走完**，再把手里的余下部分交给二元那一支。
    let after = 3;
    while (after + 1 < kids.length && isSymbol(kids[after], ".")) {
      const member = kids[after + 1];
      meta = {
        kind: "PropertyAccessExpression",
        expression: meta,
        name: nameOf(member, ctx),
        pos: meta.pos,
        end: endOf(member),
      };
      after += 2;
    }
    const rest = kids.slice(after);
    // **`new.target === A`：运算符那一截要接回来**（第 580 轮，第 539 轮把区间修对时
    // 把这一条留给了后面的轮次）：
    //
    // 名字那一格被折成 `BinaryOperator(target === A)` 之后，`kids.slice(after)` 里
    // **只剩运算符本身**（`===` 与 `A` 在那一格的 `Data` 里）⇒ 照「`rest` 为空就
    // `return meta`」收尾就是**把整个右半截丢掉**。实测（第 580 轮，
    // `decl-class-new-target.ts`）：投影只投出一个 `MetaProperty [112,122)`，
    // 缺 `BinaryExpression` / `EqualsEqualsEqualsToken` / `Identifier(A)` 三个
    // ——TS 那边是 `BinaryExpression [112,128) > [MetaProperty, «===», Identifier(A)]`。
    //
    // 取法：从那一格二元单元**最左边那条脊**（一直往左的第一格）递归收它的**其余兄弟**，
    // 收出来的正是 `foldBinaryFrom` 要的 `[运算符, 操作数, …]`（与下面 `.名字` 那一支同源）。
    // **必须递归**：这条脊是左嵌套的（`a === b === c` 折成 `(a === b) === c`）——
    // 逐层往下 `push` 会把两层的顺序搞反（`[===, c, ===, b]`），而
    // `[…内层, 本层运算符, 本层右操作数]` 这个顺序正好就是它。
    const binaryTail = (unit: any, depth: int): any[] => {
      if (depth > 32 || unit instanceof Map === false) return [];
      if (unit.get("type") !== "BinaryOperator") return [];
      const down = projectableKids(view(unit));
      if (down.length === 0) return [];
      return [...binaryTail(down[0], depth + 1), ...down.slice(1)];
    };
    const tail = headIsBinary ? [...binaryTail(named, 0), ...rest] : rest;
    if (tail.length === 0) return meta;
    return foldBinaryFrom(meta, tail, ctx);
  }

  // ---- 0a. 可选链 / 可选调用（第 107 轮）----
  //
  // 产物把 `?.` 之后的**每一格**收成一个 `NullConditionalOperator` 单元，而且它**不一定
  // 跟在点号链后面**：`list?.push(1)` 是 `[Identifier(list), NCO(Method(push))]`、
  // `x?.y?.(1)` 是 `[Identifier(x), NCO(y), NCO(Bracket(1))]`。
  // 原来只在「链」那一支里处理 NCO（那一支要求 `kids[1]` 是 `.` 或 `[`），这两种形状
  // **整段丢掉**——实测缺 `CallExpression` 49 / `QuestionDotToken` 40 /
  // `PropertyAccessExpression` 189 里成片，而且都会连带多出未映射的
  // `<NullConditionalOperator>` 与 `<Bracket>`。
  const ncoIndex = kids.findIndex((k) => k.get("type") === "NullConditionalOperator");
  // **链后面还挂着 `as` / `satisfies` 时，0a0 / 0a 两条都要让开**（第 664 轮）：
  // `a?.b as T` 的产物是 `[Identifier(a), NullConditionalOperator(b), As(T)]` 三格 ——
  // 那两条支路的收尾都是「把 NCO 接到左边、剩下的交给 `foldBinaryFrom`」，
  // 而 `As` / `Satisfies` **不是二元单元** ⇒ 那一格整格丢掉
  //（实测缺 `AsExpression` + `TypeReference` + `Identifier`，四个方向里只有「缺」这一栏响）。
  // 让开之后落到主流程第 2 节（`asIndex` 那一支），`As` / `Satisfies` 的折法只有那一份。
  // **`f(o?.a as T)` 那种实参位同样受益**：让开之后 0a0 不再抢，主流程照折。
  const asAfterNco = kids
    .slice(ncoIndex + 1)
    .some((k) => k.get("type") === "As" || k.get("type") === "Satisfies");
  // ---- 0a0. **基名与 `?.` 平级**：`f(o?.a)` 那一种（第 143 轮）----
  //
  // **症状**：`?.` 出现在**实参位 / 下标位 / 模板插值位**时，产物是
  // `[Identifier(o), NCO(a)]` **两个平级单元**（基名留在外面），而
  // `projectExpression` 走到通用支只会取 `kids[0]`——**基名在、`?.a` 整个没了**：
  //   · 投影层报「未映射标签 `NullConditionalOperator`」，
  //   · 降级层当场报 `unimplemented: expression NullConditionalOperator`
  //     （`console.log(f?.(o?.a))` 与 `console.log([o?.a])` 就是这么红的）。
  //
  // **为什么语句位一直是对的**：`a?.b` 在语句位由 **`PropertyAccess` / 二元那一支**接手
  // （上面 0a / 0a2 两条），它们的判据都看「NCO 前面那个兄弟」——而**实参位**这一层
  // 只看得到一个「实参段」，前面没有兄弟可看。
  //
  // **判据**（三条都要）：
  //   1. `ncoIndex > 0`——NCO 前面确实有个兄弟；
  //   2. 那个兄弟是**链基名**（`IsChainBaseNode`，与 `property-access.xl.md` 的
  //      `IsChainBase` 同一份口径的**渲染侧**版本）；
  //   3. **NCO 的第一个子单元不是 `Method`**——这一条是**让路**用的：`a.Start?.Document`
  //      的形状是 `[a, ., Start, NCO(Document)]`，那里 NCO 的成员名恰好也是 `Identifier`，
  //      照这一支折会把 `.Start` 与 `?.Document` 之间的那层链**搅散**
  //      （实测 `dist/ts/core/syntax/source-range.ts`：`QuestionDotToken` 与 `Identifier`
  //      各缺一片）。而 `?.(…)` / `?.[…]` 那一族（`NCO` 的第一个子单元是 `Method` / 括号）
  //      不属于本支，它们由下面 0a 与 `Method` 自己那两条接手。
  //   4. **前缀里没有顶层二元运算符**（`BinaryOperator` / `LogicalOperator` 单元，
  //      或者光秃秃的运算符符号）——有的话这条 `?.` 属于**右边那个操作数段**，
  //      要交给下面 0a 在运算符处切开那一支：
  //      `this.Start?.Document === other.Start?.Document` 照本支走会把前面那一整段
  //      （连同那个二元单元）吞进一个 `PropertyAccessExpression`
  //      （实测 `source-range.ts` 漂移 2 + 多出 2）。
  const NCO_BASE_OPERATORS = new Set([
    "+", "-", "*", "/", "%", "**", "<", ">", "<=", ">=", "==", "!=", "===", "!==",
    "<<", ">>", ">>>", "&", "|", "^", "&&", "||", "??", "in", "instanceof", "=",
  ]);
  const prefixHasOperator = kids.slice(0, ncoIndex).some(
    (k) =>
      k.get("type") === "BinaryOperator" ||
      k.get("type") === "LogicalOperator" ||
      (k.get("type") === "SymbolToken" && NCO_BASE_OPERATORS.has(textOfNode(k, ctx))),
  );
  if (
    ncoIndex > 0 &&
    asAfterNco === false &&
    prefixHasOperator === false &&
    IsChainBaseNode(kids[ncoIndex - 1]) &&
    projectableKids(view(kids[ncoIndex]))[0]?.get("type") !== "Method"
  ) {
    let optional = projectExpression(kids.slice(0, ncoIndex), ctx);
    if (optional !== undefined) {
      let at = ncoIndex;
      while (at < kids.length && kids[at].get("type") === "NullConditionalOperator") {
        optional = chainWithOptional(optional, kids[at], ctx);
        at++;
      }
      if (at >= kids.length) return optional;
      return foldBinaryFrom(optional, kids.slice(at), ctx);
    }
  }
  // **「二元单元里包着 NCO」那一形状要让给下面 0a2 那一支**（第 145 轮）：
  //
  //     x.Start?.Document === y.Start?.Document
  //
  // 的产物是 `[x, ., Start, BinaryOperator(===)(NCO(Document), ===, y), ., Start, NCO(Document)]`——
  // 末尾那个 NCO 属于**右边那条链**（`y.Start?.Document`），但这一支会先把前缀投成二元表达式、
  // 再往上套一层属性访问，右边那条链整个错位
  // （实测 `dist/ts/core/syntax/source-range.ts`：漂移 2 + 多出 3，`PropertyAccessExpression`
  // 的区间一直撑到整条比较式末尾）。0a2 那一条正是为这个形状写的：它把 NCO 接回基名、
  // 再连**后面的兄弟**一起折。
  const hasNcoInBinary = kids.some(
    (k) =>
      (k.get("type") === "BinaryOperator" || k.get("type") === "LogicalOperator") &&
      projectableKids(view(k))[0]?.get("type") === "NullConditionalOperator",
  );
  // **尾巴上还挂着 `as` / `satisfies` 时，这一支也要让开**（见上面 `asAfterNco` 那一处）。
  if (ncoIndex > 0 && hasNcoInBinary === false && asAfterNco === false && !(kids[0].get("type") === "BinaryOperator" && kids.slice(1).some((k) => k.get("type") === "NullConditionalOperator" || isSymbol(k, ".")))) {
    // **前缀里有顶层二元运算符时，NCO 要并进「右边那个操作数段」**（第 145 轮）：
    //
    //     x.Start === y.Start?.Document
    //
    // 里 `?.Document` 属于**右操作数**（TS：`BinaryExpression(x.Start, ===, y.Start?.Document)`），
    // 而直接 `chainWithOptional(projectExpression(整个前缀), nco)` 会把整条比较式包进属性访问
    // （实测 `cy.ts` 的 a3：漂移 1 + 多出 2，区间一路撑到表达式末尾）。
    // 做法与 0a2 同款：在运算符处切开，把 NCO 接到尾巴上再交回 `foldBinaryFrom`。
    const prefix = kids.slice(0, ncoIndex);
    const OP_TEXTS = new Set([
      "+", "-", "*", "/", "%", "**", "<", ">", "<=", ">=", "==", "!=", "===", "!==",
      "<<", ">>", ">>>", "&", "|", "^", "&&", "||", "??", "in", "instanceof",
    ]);
    let opAt = -1;
    let bestRank = 99;
    for (let i = 1; i < prefix.length; i++) {
      const k = prefix[i];
      if (k.get("type") === "BinaryOperator" || k.get("type") === "LogicalOperator") {
        opAt = i;
        break;
      }
      const text = textOfNode(k, ctx);
      if (k.get("type") !== "SymbolToken" || OP_TEXTS.has(text) === false) {
        continue;
      }
      const rank = operatorRank(text);
      if (rank < bestRank) {
        bestRank = rank;
        opAt = i;
      }
    }
    if (opAt > 0) {
      const base = projectExpression(prefix.slice(0, opAt), ctx);
      if (base !== undefined) {
        let optional = foldBinaryFrom(base, [...prefix.slice(opAt), kids[ncoIndex]], ctx);
        let at = ncoIndex + 1;
        while (at < kids.length && kids[at].get("type") === "NullConditionalOperator") {
          optional = chainWithOptional(optional, kids[at], ctx);
          at++;
        }
        if (at >= kids.length) return optional;
        return foldBinaryFrom(optional, kids.slice(at), ctx);
      }
    }
    let optional = projectExpression(kids.slice(0, ncoIndex), ctx);
    // **一元前缀的操作数在后**（第 178 轮）：`delete a?.b` 的产物是
    // `[UnaryOperator(delete a), NullConditionalOperator(b)]`——`delete` 只是前缀，
    // `?.b` 属于**它的操作数**。直接把 NCO 接到那个一元节点上会得到 `(delete a)?.b`
    // （实测 `expr-optional-delete.ts`：漂移 1 + 多出 2，`DeleteExpression` 的区间只到 `a`）。
    //
    // **操作数那一格有两个名字**（第 740 轮，**实测踩过一次**）：`typeof` / `void` / `delete`
    // 是 `TypeOfExpression` 那一族（字段叫 **`expression`**），而 `!` / `~` / `+` / `-` /
    // `++` / `--` 是 **`PrefixUnaryExpression`**（字段叫 **`operand`**）——
    // 这一支原来只认 `expression`，于是 `!o?.p` / `-o?.p` **够不着它**、掉到下面那条通用路：
    // `?.p` 被接到**那个一元节点的结果**上（`(!o)?.p`）⇒ 本仓给 `undefined`、Node 给 `false`
    //（`-o?.p` 本仓给 `undefined`、Node 给 `-1`，**静默错值**）。
    // 这与第 711 / 739 两轮在链那一支踩到的是**同一格**（同一个形状两处各写一遍就会漂）。
    const UNARY_KINDS = new Set([
      "DeleteExpression",
      "TypeOfExpression",
      "VoidExpression",
      "PrefixUnaryExpression",
    ]);
    // **这一支写成 `if` / `else if` 而不是嵌套三元**（第 740 轮实测）：`cases:tsast` 的语料
    // **包含产物自己**，而嵌套条件表达式那一格这一版还认不全（缺 `ConditionalExpression` +
    // `ColonToken`，实测 13 缺 1 漂 2 多）——写成一条条的 `if` 就没有这一格。
    let operandField = "";
    if (optional !== undefined && UNARY_KINDS.has(optional.kind)) {
      if (optional.expression !== undefined) {
        operandField = "expression";
      } else if (optional.operand !== undefined) {
        operandField = "operand";
      }
    }
    if (optional !== undefined && operandField !== "") {
      let inner:any = operandField === "expression" ? optional.expression : optional.operand;
      let unaryAt = ncoIndex;
      while (unaryAt < kids.length && kids[unaryAt].get("type") === "NullConditionalOperator") {
        inner = chainWithOptional(inner, kids[unaryAt], ctx);
        unaryAt++;
      }
      const rebuilt:any = {
        ...optional,
        end: inner === undefined ? optional.end : inner.end,
      };
      rebuilt[operandField] = inner;
      if (unaryAt >= kids.length) return rebuilt;
      return foldBinaryFrom(rebuilt, kids.slice(unaryAt), ctx);
    }
    let at = ncoIndex;
    while (at < kids.length && kids[at].get("type") === "NullConditionalOperator") {
      optional = chainWithOptional(optional, kids[at], ctx);
      at++;
    }
    if (at >= kids.length) return optional;
    // **NCO 后面那一串不一定是运算符**（第 967 轮）：`a?.b!.c.d` 的产物是
    // `[Identifier(a), NCO(NotNull(PropertyAccess([b, ., c]))), ., Identifier(d)]`——
    // NCO 那一趟折完（`chainWithOptional` 的子链分支把 `!.c` 接上了），**下一格是点号**：
    // 那不是运算符、而是**链的续格**。这一段原来无条件交给 `foldBinaryFrom`，
    // 而它找不到运算符时**原样返回左操作数** ⇒ `.d` 整段丢
    //（实测 `gap-r964-opt-assert-member-member`：`PropertyAccessExpression` 与
    //  `Identifier` 各漂，`a?.b!.c.d` 被投成 `a?.b!.c`）。
    // 判据与链那一支同款：**下一格是点号 / 下标 / 以调用开头** ⇒ 交给 `chainOnto`
    //（它与「点号后面那一格」那几支是同一份实现），其余原样走二元那一支。
    if (isDot(kids[at], ctx) || isIndexBracket(kids[at]) || isCallFirstUnit(kids[at], ctx)) {
      return chainOnto(optional, kids.slice(at), ctx);
    }
    return foldBinaryFrom(optional, kids.slice(at), ctx);
  }
  // **链的续格长在二元单元里面**（第 743 轮）：`o["f"]().v + 1` 的产物是
  //
  //     [PropertyAccess(o, [f]), BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», 1 )]
  //
  // ——`o["f"]().v` 那一截（**调用括号 + 后缀**，见 `isCallFirstUnit`）是那个二元单元的
  // **第一个孩子**，而链的头一格是它的**前一个兄弟**。
  // **判据只认「第一格以一次调用开头」**（与 `isCallFirstUnit` 同一句）：点号开头的
  // 那一份不在这里——`o.f().v + 1` 的 token 层把整条链折成了一个 `Method` 单元，
  // 本来就走得通（实测），放开 `.` 那一档会换掉既有形状。
  //
  // **要递归**（第 743 轮同一批量的）：`o[k]().v * 2 + 1` 是**两层**二元单元套着
  //（外层的第一个孩子是内层那个 `*`）——只看一层的话这一条整支不进，
  // 而它的症状与不修时一字不差（交出那个函数自己）。
  //
  // **它排在 0a2 前面**（第 863 轮，只是把定义往上搬）：0a2 那一支也要问同一个问题——
  // 「这一格的第一格以一次调用开头吗」，而它比下面那条链支**先跑**。
  const chainTailInOperator = (unit: any): bool => {
    if (unit === undefined || unit === null) return false;
    const kind = unit.get("type");
    if (kind !== "BinaryOperator" && kind !== "LogicalOperator") return false;
    const inner = projectableKids(view(unit));
    if (inner.length < 2) return false;
    if (isCallFirstUnit(inner[0], ctx)) return true;
    return chainTailInOperator(inner[0]);
  };
  // **把那个二元单元摊到「续格 + 运算符」一层**（第 863 轮）：0a2 那一支要的是这个分法
  // ——尾巴里那个单元拆成「续格那一格（**整格**留着自己去投）+ 它自己的运算符与右操作数」。
  // **与 `flattenChainTailInOperator` 只差一处**：那一支要**裸的续格几格**
  //（链支的入口判据不认「外面包着 `()` 的那种单元」），这一支要**续格那一格自己**
  //（0a2 把尾巴交给 `foldBinaryFrom`，它的右操作数再递回链支——那一支认的是没摊开的形状）。
  // **递归那一档**：`o[k]().v * 2 + 1` 是**两层**二元单元套着，一路走到最里面那一层
  //（第一格以一次调用开头）才停，再把沿途每一层的运算符与右操作数按**从里到外**接上。
  const unwindChainTailInOperator = (unit: any, out: Array<any>) => {
    const inner = projectableKids(view(unit));
    if (inner.length >= 2 && isCallFirstUnit(inner[0], ctx)) {
      out.push(inner[0]);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    if (
      inner.length >= 2 &&
      (inner[0].get("type") === "BinaryOperator" || inner[0].get("type") === "LogicalOperator") &&
      chainTailInOperator(inner[0])
    ) {
      unwindChainTailInOperator(inner[0], out);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    out.push(unit);
  };
  // ---- 0a2. `?.` 那一串被包进了**二元的操作数位**（第 124 轮）----
  //
  // **二元单元排在列表最前面、右操作数延续到它外面的兄弟**（第 145 轮）：
  //
  //     x.Start === y.Start?.Document
  //     ⇒ [BinaryOperator(===)( PropertyAccess(x.Start), «===», y ), ., Start, NCO(Document)]
  //
  // ——左操作数与运算符都在那个单元里，**右操作数却是「它最后一个孩子 + 后面那些兄弟」**
  // （末尾那个 `?.Document` 让链收不进单元）。照通用支投的话这个二元单元会被当成一个整操作数，
  // 后面那截链再单独成节点（实测 `cy.ts` 的 a3：漂移 1 + 多出 2）。
  //
  // **必须排在上面那一支（`?.` 接在链后面）之前**：不排的话末尾那个 NCO 会先把整个前缀
  // （含这个二元单元）投成一条链、再往上套属性访问，右操作数就永远接不上。
  //
  // **判据只看「尾巴是不是一条链的续接」**（`.` 或 `?.`）：`a += b -= c` 那种链式赋值
  // 也是同样的「二元单元在头」形状，但它没有尾巴链、必须交回通用支（实测
  // `ex-chained-assign.ts` / `expr-chained-assign.ts`：多出 6 + 缺 2）。
  //
  // **「以一次调用开头」也算续接**（第 743 轮）：`1 + o["f"]().v` 的产物是
  //
  //     [BinaryOperator( 1, «+», PropertyAccess(o, [f]) ), PropertyAccess(Bracket(()), ., v)]
  //
  // ——**下标调用那一截在单元里、它的调用括号与后缀掉在外面**（与 `o["f"]().v + 1`
  // 正好左右相反，两者由同一轮的两支各管一边）。少了这一档，右操作数只到 `o["f"]` 为止：
  // 实测多出一个盖住整段的 `PropertyAccessExpression` / `CallExpression`，
  // 而真正的 `o["f"]().v` 整片缺失（判据 `exec/round711/p711b-b02`）。
  const tailIsChain = kids
    .slice(1)
    .some((k) => k.get("type") === "NullConditionalOperator" || isSymbol(k, ".") || isCallFirstUnit(k, ctx));
  // **续格与更松的运算符一起装在下一个二元单元里**（第 863 轮）：`1 + o["f"]().v + 2` 的产物是
  //
  //     [BinaryOperator( 1, «+», PropertyAccess(o, [f]) ),
  //      BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», 2 )]
  //
  // ——链头 `o["f"]` 是**第一个单元的最后一个孩子**，续格 `().v` 是**第二个单元的第一个孩子**，
  // 两个 `+` 之间还隔着这一层：TS 是 `(1 + o["f"]().v) + 2`。
  // 少了这一档，下面那条链支会拿**整个第一个单元**当链头（`1 + o["f"]`）：
  // 投出 `PropertyAccess( CallExpression( BinaryExpression(1 + o["f"]), [] ) )`——
  // 缺 `PropertyAccessExpression` / `CallExpression` 各一格、漂一个 `BinaryExpression`，
  // 又多出三个盖住前缀的节点（实测缺口 `gap-round744-chain-in-binary-three-operands`）。
  // **与 `tailIsChain` 是同一件事的两种排版**：`1 + o["f"]().v` 里续格是**外面的兄弟**（走上面），
  // 再往后接一个运算符时它就**搬进了下一个单元**（走这里）。
  const tailInOperator = kids
    .slice(1)
    .some(
      (k) =>
        (k.get("type") === "BinaryOperator" || k.get("type") === "LogicalOperator") &&
        chainTailInOperator(k),
    );
  if (
    (tailIsChain || tailInOperator) &&
    kids.length >= 2 &&
    kids[0].get("type") === "BinaryOperator"
  ) {
    const headInner = projectableKids(view(kids[0]));
    if (headInner.length >= 2) {
      const operatorUnit = headInner[headInner.length - 2];
      const base = projectExpression(headInner.slice(0, headInner.length - 2), ctx);
      if (base !== undefined && isOperatorUnit(operatorUnit, ctx)) {
        // **尾巴里那个二元单元要摊开**（第 863 轮）：摊法是 `unwindChainTailInOperator`
        //（续格那一格**整格**留下——链支认的是没摊开的形状，第 744 轮踩过一次），
        //它自己的运算符与右操作数原样跟在后面、由 `foldBinaryFrom` 折。
        const tail: Array<any> = [];
        for (const one of kids.slice(1)) {
          const oneKind = one.get("type");
          if (
            (oneKind === "BinaryOperator" || oneKind === "LogicalOperator") &&
            chainTailInOperator(one)
          ) {
            unwindChainTailInOperator(one, tail);
            continue;
          }
          tail.push(one);
        }
        return foldBinaryFrom(
          base,
          [operatorUnit, ...headInner.slice(headInner.length - 1), ...tail],
          ctx,
        );
      }
    }
  }
  //
  //   [Identifier(t), BinaryOperator(??)( NullConditionalOperator(Method(get)), «??», String )]
  //
  // ——`?.` 之前的**基名 `t` 是那个 `BinaryOperator` 单元的前一个兄弟**，运算符与右操作数
  // 都在它里面。照二元那一支走，左操作数落到 `t` 上、`BinaryOperator` 内部那个 NCO 另算，
  // 于是 TS 的 `BinaryExpression` / `CallExpression` / `PropertyAccessExpression` /
  // `QuestionDotToken` **整片丢**（实测 `dist/ts/typescript/ts-ast.ts` 与 `undici-types`
  // 各成片：`table?.get(key) ?? key` 这种写法在产物里遍地都是）。
  //
  // 修法：先把这个 NCO 接到基名上（`chainWithOptional`），再把那个单元**内部**剩下的
  // `[运算符, 右操作数, …]` 与本层后面还跟着的兄弟一起折成二元。
  // 产物里那些运算符单元带着自己的区间，`foldBinaryFrom` 用 `textOfNode` 取文本，照收。
  if (kids.length >= 2) {
    for (let at = 1; at < kids.length; at++) {
      const unit = kids[at];
      if (unit.get("type") !== "BinaryOperator" && unit.get("type") !== "LogicalOperator") {
        continue;
      }
      const inner = projectableKids(view(unit));
      if (inner.length < 2 || inner[0].get("type") !== "NullConditionalOperator") {
        continue;
      }
      const base = projectExpression(kids.slice(0, at), ctx);
      if (base === undefined) {
        continue;
      }
      const extended = chainWithOptional(base, inner[0], ctx);
      return foldBinaryFrom(extended, [...inner.slice(1), ...kids.slice(at + 1)], ctx);
    }
  }
  // ---- 0b. 标签模板 `tag`…``（第 137 轮；第 946 轮（二）从「恰好两个单元」放宽到「末尾那一格是模板」）----
  //
  // 产物是 `[<标签单元>, String]` **两格平级**（`tag`a${b}c`` 的标签与模板各一格），
  // 而 TS 那边是 `TaggedTemplateExpression{ tag, template }`。照通用支投会把它当成
  // 两个平级节点（模板表达式整个丢掉，实测 `ex-tagged-template` 缺 10）。
  // 判据落在**原文的引号**上：那个 `String` 的起点字符是反引号（普通字符串是 `"` / `'`，
  // 产物里两者的属性一模一样，分不出来）。
  //
  // **标签本身可能是一整段链**（第 946 轮（二）实测）：`new ns[a]`` ` `` 的产物是
  // `[Identifier(ns), Bracket([a]), String]` **三格**（`New` 那一趟把下标与模板一起收进了
  // 被构造者那一段），原来的 `kids.length === 2` 在这一档上判否 ⇒ 模板整格丢、
  // 投出来的 `NewExpression` 只剩 `expression`。
  //
  // **放宽成「末尾那一格是反引号 `String`」还差一条守卫**（同轮实测撞到的回归）：
  // `tag`a${x}b` === tag`a${x}b`` 的产物是 `[Identifier(tag), BinaryOperator(String, ===, tag), String]`
  // ——末尾那格也是模板，可**标签不是前面全部**（TS 是 `tag`a${x}b`` 与 `tag`a${x}b`` 两个标签模板
  // 做 `===`），照放宽后的那一支投会把整条比较式收成一个标签模板（0d 那段本来管的就是这一族）。
  // 所以再加一问：**模板前面那一串必须是一条「后缀链」**——`Identifier` / `PropertyAccess` /
  // `Method` / `Bracket` / `String` 这些「能接在操作数后面」的单元，
  // 出现运算符（`BinaryOperator` / `LogicalOperator` …）就不成立。这一问与 0c / 0d 是同一句话，
  // 只是那两段各自判自己的形状。
  // **点号也是后缀链的一格**（第 947 轮（二））：`o.tag`t`` / `new A.B`t`` 的标签是**平铺的一条链**
  // （`[Identifier(o), ., Identifier(tag)]`）——不给点号，这一族的标签就整条判否
  // （实测 `tmp/r947/gate-sweep2.mjs`：`new A.B` 换行 `` `t` `` `.c` 那一族 27 条对不上）。
  // 这一问要挡的是**运算符**（下面那句里点名的 `BinaryOperator` / `LogicalOperator`），
  // 点号与名字不在其中。
  // **`GenericType` / `ExpressionWithTypeArguments` 也是链的一格**（第 977 轮普查量到的）：
  // `f<T>`t`` 的标签是**一格**实例化表达式，而它**看起来像**运算符那一段——
  // 不给它这一档，`const a = f<T>`t`;` 这**一条**就整族让开：实测 39 条片段
  // （`inst-tagged` 那一个底样的每个位置 × 三种 trivia）全部对不上，症状是 `f<T>` 被折成
  // `BinaryExpression(LessThan, T, GreaterThan)` 而模板独立成格。
  // **两种节点名都要认**：token 层的 `GenericType` 在**表达式位**投出来的是
  // `ExpressionWithTypeArguments`（TS 4.7 的 instantiation expression），在**类型位**才是
  // `TypeReference`——而这里拿到的是**已经投好**的节点（第 977 轮第一次只加了 `GenericType`，
  // 量下来那 39 条一条没动，正是这个缘故）。
  // **拿真 TS 复量过那一格**（`tmp/r977-ts.mjs`）：`f < T > `t`` 与 `f<T>`t``、
  // `f < T > (1)` —— 三种排版 TS 都读成**一条** `TaggedTemplateExpression` / `CallExpression`
  // 带 `TypeReference`（而 `x < y > z` 才是二元），所以这一档不是放宽、是**同一句判据少了一格**。
  const tagIsPostfixChain = (units: Array<any>): bool => {
    for (const one of units) {
      const kind = one.get("type");
      if (kind === "Identifier" || kind === "PropertyAccess" || kind === "Method" || kind === "Bracket" || kind === "String" || kind === "GenericType" || kind === "ExpressionWithTypeArguments") {
        continue;
      }
      if (isDot(one, ctx)) {
        continue;
      }
      return false;
    }
    return units.length > 0;
  };
  // **模板后面那一串也要是链的续格**（第 947 轮）：判据从「**末尾**那一格是模板」
  // 放宽成「**链里有一格是模板**」，模板后面那一串交给 `chainOnto`（与 0c 同一段代码）。
  //
  // **为什么末尾那一格不一定是模板**：`new A` 换行 `` `t` `` `.b` 的产物是
  // `[Identifier(A), String(反引号), ., Identifier(b)]` **四格平铺**——`New` 那一趟把整段
  // 收进了被构造者，而 `New` 排在链规则**前面**，所以链还没折；0c 要的正是「模板与后缀
  // **已经折成**一个 `PropertyAccess`」，在这里不成立 ⇒ 剩下的 `[., b]` 被当成二元运算符的
  // 尾巴折成 `BinaryExpression`（实测 `new A` 换行 `` `t` `` `.b` 缺 1 多 2、
  // `new A[0]` 换行 `` `t${x}` `` `.b` 缺 8）。
  //
  // **尾巴必须整段都是链的续格**：混着运算符（`BinaryOperator` / `LogicalOperator` …）就整个让开，
  // 交回下面通用那一支——宁可维持原来的错，也不把「模板不在这一格的末尾」当成标签模板。
  const IsChainTail = (units: Array<any>): bool => {
    for (const one of units) {
      const kind = one.get("type");
      if (
        kind === "Identifier" ||
        kind === "PropertyAccess" ||
        kind === "Method" ||
        kind === "Bracket" ||
        kind === "ArrayLiteral" ||
        kind === "NullConditionalOperator" ||
        kind === "NotNull"
      ) {
        continue;
      }
      if (isDot(one, ctx)) {
        continue;
      }
      return false;
    }
    return true;
  };
  // 从右往左找那一格模板：**最后**一格能当标签模板起点的就是它。
  // `at` 从 1 起（模板前面至少要有一格标签），标签与尾巴两问都过才认。
  let templateAt = -1;
  for (let at = kids.length - 1; at >= 1; at--) {
    const one = kids[at];
    if (one.get("type") !== "String" || ctx.source[startOf(one)] !== "`") {
      continue;
    }
    if (tagIsPostfixChain(kids.slice(0, at)) && IsChainTail(kids.slice(at + 1))) {
      templateAt = at;
      break;
    }
  }
  if (templateAt !== -1) {
    const tag = projectExpression(kids.slice(0, templateAt), ctx);
    const template = projectNode(kids[templateAt], ctx);
    if (tag !== undefined && template !== undefined) {
      const head = { kind: "TaggedTemplateExpression", tag, template, pos: tag.pos, end: template.end };
      const tail = kids.slice(templateAt + 1);
      return tail.length === 0 ? head : chainOnto(head, tail, ctx);
    }
  }
  // ---- 0c. 标签模板**后面还跟着后缀**（第 176 轮）----
  //
  // `` tag`abc`.length `` 的产物是
  // `[Identifier(tag), PropertyAccess(String(反引号), ., length)]`——
  // **标签留在外面，模板串与后缀在同一个 `PropertyAccess` 单元里**（XML 实测）。
  // 所以上面那条 0b 判据（`kids[1]` **就是**那个 `String`）看不到它，
  // 通用支只投第一格，于是**标签模板与后缀整片丢**：
  // `` const r = tag`abc`.length `` 投出来是 `VariableDeclaration{ Identifier r, Identifier tag }`，
  // 降级层拿到一个光秃秃的 `tag`，于是运行时给的是**函数本身**
  //（Node 给 `3`、本仓给 `[Function (anonymous)]`——`runtime:cli` 第 53 份语料是绿的，
  // 因为它只钉了不带后缀的 `` tag`abc` ``）。
  //
  // 判据与 0b 同源，只是往里走一层：第二格是 `PropertyAccess`、它**第一个**可投影子单元
  // 是**反引号开头**的 `String`（普通字符串是 `"` / `'`，`projectString` 靠这个分岔）。
  // 标签那一侧走 `projectExpression(kids.slice(0, 1))`：`obj.tag` / `f()` / `(…)`
  // 这些接收者本来就是**一个单元**，`projectExpression` 自己会投对
  //（`(cond)` 那一格落在 `parenthesizedOf` 上）。
  //
  // 后缀那两个方向**照抄已经有的那份**（`chainOnto`）：下标 `[…]`、点号成员、
  // 点号后面跟 `Method`（调用）、成员格里又是一条链——与「二元右操作数后面那串续格」
  // 走的是同一段代码，不另写一遍。本层后面还跟着兄弟（`` tag`abc`.length + 1 ``）时
  // 再交回二元那一支。
  // **标签那一格必须是「一个已经完整的表达式」**（`IsChainBaseNode` 那一份判据，
  // 外加值位括号）：`1 + t`abc`` 的产物也是 `[BinaryOperator(1, +, t), PropertyAccess(…)]`
  // 这种「模板单元在第二格」的形状，但那里的标签是**那个二元单元的最后一个操作数**
  //（`t`），不是整个 `1 + t`——认错的话 `1 + t`abc`` 会变成 `(1 + t)`abc``，
  // 静默算成另一个值。那一族（模板单元**跟在运算符单元后面**）记在台账里，本轮不做。
  const tagUnit = kids[0];
  const tagIsComplete =
    IsChainBaseNode(tagUnit) ||
    (tagUnit.get("type") === "Bracket" && tagUnit.get("startBracket") === "(");
  // **标签本身可能是一整段平铺的链**（第 947 轮（二））：`o/*c*/.tag`t`.b` 的产物是
  // `[Identifier(o), ., Identifier(tag), PropertyAccess(String, ., b)]`——那条注释把
  // `o.tag` 那一段**拆平了**（链规则没把它们折成一格），于是 `kids[1]` 是**点号**、
  // 不是那个 `PropertyAccess`，判据卡在 `kids[1]` 上 ⇒ 模板与后缀整片丢（实测缺 3 漂 1）。
  // 所以先**找出那一格装着模板的 `PropertyAccess`**（在它前面那一串仍是后缀链时），
  // 标签取它**前面全部**——上面那条 `kids.length === 2` 的口径在这里自然被覆盖。
  let templateChainAt = -1;
  for (let at = 1; at < kids.length; at++) {
    if (kids[at].get("type") !== "PropertyAccess") {
      continue;
    }
    if (tagIsPostfixChain(kids.slice(0, at)) === false) {
      continue;
    }
    const probe = projectableKids(view(kids[at]));
    if (probe.length >= 2 && probe[0].get("type") === "String" && ctx.source[startOf(probe[0])] === "`") {
      templateChainAt = at;
      break;
    }
  }
  if (tagIsComplete && templateChainAt !== -1) {
    const inner = projectableKids(view(kids[templateChainAt]));
    const tag = projectExpression(kids.slice(0, templateChainAt), ctx);
    const template = projectNode(inner[0], ctx);
    if (tag !== undefined && template !== undefined) {
      const head = {
        kind: "TaggedTemplateExpression",
        tag,
        template,
        pos: tag.pos,
        end: template.end,
      };
      const chained = chainOnto(head, inner.slice(1), ctx);
      const tail = kids.slice(templateChainAt + 1);
      return tail.length === 0 ? chained : foldBinaryFrom(chained, tail, ctx);
    }
  }
  // ---- 0d. 标签模板处在**运算符的左脊柱**上（第 176 轮）----
  //
  // `` tag`abc` + 1 `` 的产物是 `[Identifier(tag), BinaryOperator(String(反引号), +, 1)]`，
  // `` tag`abc`.length + 1 + 2 `` 是
  // `[Identifier(tag), BinaryOperator(BinaryOperator(PropertyAccess(String, ., length), +, 1), +, 2)]`
  // ——**标签还在外面，模板串在被运算符单元吃掉的那一格的最左边**。
  // 与 0c 是同一件事（模板串被留成了兄弟单元的成员），只是中间多套了几层运算符。
  //
  // 判据沿**左脊柱**往下走：每一层都要求「这一格的第一个子单元是模板串（或者
  // 第一个子单元是 `PropertyAccess`、它的第一个子单元是模板串）」，沿途把每个运算符单元的
  // `(运算符, 右操作数)` 从**里往外**收起来；收到模板串那一层为止，再把它们**从里往外**
  // 交给 `foldBinaryFrom`——左结合链本身怎么折，与通用那一支是同一段代码。
  //
  // 脊柱上任何一层不满足就整个让开（交回下面的通用支）：宁可维持原来的错，
  // 也不能把「模板串其实不在这一格」的形状认成标签模板。
  if (
    tagIsComplete &&
    kids.length >= 2 &&
    (kids[1].get("type") === "BinaryOperator" || kids[1].get("type") === "LogicalOperator")
  ) {
    let spine = kids[1];
    let templateUnit: any = undefined;
    let members: Array<any> = [];
    const layers: Array<Array<any>> = [];
    while (spine !== undefined) {
      const inner = projectableKids(view(spine));
      if (inner.length < 3) break;
      const head = inner[0];
      const headKids = head.get("type") === "PropertyAccess" ? projectableKids(view(head)) : [head];
      if (headKids[0]?.get("type") === "String" && ctx.source[startOf(headKids[0])] === "`") {
        templateUnit = headKids[0];
        members = headKids.slice(1);
        layers.push([inner[inner.length - 2], inner[inner.length - 1]]);
        break;
      }
      if (head.get("type") !== "BinaryOperator" && head.get("type") !== "LogicalOperator") break;
      layers.push([inner[inner.length - 2], inner[inner.length - 1]]);
      spine = head;
    }
    if (templateUnit !== undefined) {
      const tag = projectExpression(kids.slice(0, 1), ctx);
      const template = projectNode(templateUnit, ctx);
      if (tag !== undefined && template !== undefined) {
        let left: any = {
          kind: "TaggedTemplateExpression",
          tag,
          template,
          pos: tag.pos,
          end: template.end,
        };
        if (members.length > 0) left = chainOnto(left, members, ctx);
        const rest: Array<any> = [];
        for (let q = layers.length - 1; q >= 0; q--) {
          rest.push(layers[q][0], layers[q][1]);
        }
        for (const k of kids.slice(2)) rest.push(k);
        return foldBinaryFrom(left, rest, ctx);
      }
    }
  }
  // ---- 0e. 零实参的调用括号被卷进了运算符单元（第 179 轮）----
  //
  // `xs[0]() + 1` 的产物是
  // `[PropertyAccess(xs, [0]), BinaryOperator(Bracket(空), +, 1)]`——
  // **被调方在外面，它那一对空括号却在二元单元的最左边**。
  // 投影的二元那一支会把这个 `()` 当成左操作数（`ParenthesizedExpression(空)`），
  // 被调方那一段于是只剩 `xs[0]`——`console.log(xs[0]() + 1)` 打出来的是**函数本身**
  //（Node 给 `2`，**静默错值**）。
  //
  // 判据：沿**二元单元的左脊柱**往下走，找到「第一个子单元是**空的 `(` 括号**」那一层
  // ——那个括号是**前一个兄弟（被调方）的实参表**。先把前一个兄弟投出来、
  // 套一层零实参的 `CallExpression`，再把沿途每一层的 `(运算符, 右操作数)`
  // **从里往外**交给 `foldBinaryFrom`（与 0d 那一支同一个折法）。
  //
  // 脊柱上任何一层不满足就整个让开——宁可维持原来的错，也不能把别的形状认成调用。
  if (
    kids.length >= 2 &&
    (kids[1].get("type") === "BinaryOperator" || kids[1].get("type") === "LogicalOperator")
  ) {
    let emptyCallSpine = kids[1];
    let emptyCallBracket: any = undefined;
    const emptyCallLayers: Array<Array<any>> = [];
    while (emptyCallSpine !== undefined) {
      const inner = projectableKids(view(emptyCallSpine));
      if (inner.length < 3) break;
      const head = inner[0];
      if (
        head.get("type") === "Bracket" &&
        head.get("startBracket") === "(" &&
        projectableKids(view(head)).length === 0
      ) {
        emptyCallBracket = head;
        emptyCallLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
        break;
      }
      if (head.get("type") !== "BinaryOperator" && head.get("type") !== "LogicalOperator") break;
      emptyCallLayers.push([inner[inner.length - 2], inner[inner.length - 1]]);
      emptyCallSpine = head;
    }
    if (emptyCallBracket !== undefined) {
      const callee = projectExpression(kids.slice(0, 1), ctx);
      if (callee !== undefined) {
        let called: any = {
          kind: "CallExpression",
          expression: callee,
          arguments: [],
          pos: callee.pos,
          end: endOf(emptyCallBracket),
        };
        const rest: Array<any> = [];
        for (let q = emptyCallLayers.length - 1; q >= 0; q--) {
          rest.push(emptyCallLayers[q][0], emptyCallLayers[q][1]);
        }
        for (const k of kids.slice(2)) rest.push(k);
        return foldBinaryFrom(called, rest, ctx);
      }
    }
  }
  // ---- 0f. 赋值后面跟着逗号（第 180 轮）----
  //
  // `a = 1, 5` 的产物是 `[Identifier(a), SymbolToken(=), BinaryOperator(1, «,», 5)]`——
  // **逗号单元最左边那一格 `1` 其实是赋值号的右操作数**，而 `a` `=` 还在外面。
  // TS 那边是 `BinaryExpression( BinaryExpression(a = 1), «,», 5 )`。
  // 照通用支走会拼成 `a = (1, 5)`——实测 `const c = (a = 1, 5)` 里那个 `a` 变成 **5**
  //（Node 给 **1**，**静默错值**）；`(a = 1, a = 2)` 则干脆报
  // `unimplemented: assignment to a non-identifier`（形状这一层就错了）。
  //
  // **判据两头都要**：
  //   · 前面那一格是**赋值号**（`=` / `+=` / …）——`a = b + 1` 的产物也是
  //     `[a, =, BinaryOperator(b, +, 1)]`，但那里的单元**不是逗号**，
  //     照这条认会把 `a = b + 1` 拆成 `(a = b) + 1`；
  //   · 这个单元的运算符是 **`,`**（只有逗号比赋值更松，也才会这样分家）。
  //
  // **逗号是左结合的，所以最左边那一格可能要往下走几层**：
  // `a = 1, b, c` 的产物是 `[a, =, BIN(BIN(1, «,», b), «,», c)]`——
  // 沿**左脊柱**一路走到「第一个子单元**不是**逗号单元」那一层，
  // 那一格才是赋值号的右操作数。然后把沿途每一层的 `(运算符, 右操作数)`
  // **从里往外**交给 `foldBinaryFrom`（与 0d / 0e 同一个折法）。
  if (kids.length >= 2) {
    for (let at = 1; at < kids.length; at++) {
      const unit = kids[at];
      if (unit.get("type") !== "BinaryOperator" && unit.get("type") !== "LogicalOperator") continue;
      // **赋值号不一定紧贴着这个单元**（第 863 轮）：`x = 1 + o["f"]().v, y` 的产物是
      //
      //     [x, «=», BinaryOperator( 1, «+», PropertyAccess(o, [f]) ),
      //      BinaryOperator(,)( PropertyAccess(Bracket(()), ., v), «,», y )]
      //
      // ——RHS 里那条调用链把**逗号单元推到了隔着一个兄弟**的位置（链的续格与逗号折进了
      // 同一个单元），于是「前一个兄弟是赋值号」那一问在这里**为假**、整支不进 ⇒
      // 逗号被当成 RHS 的一部分：TS 是 `(x = 1 + o["f"]().v), y`，产物给 `x = (…, y)`
      //（实测 `tmp/r863/ctl-4` / `ctl-5`）。
      // **判据改成「本层左边有没有一个赋值号」**，取**最左边**那一个——逗号比任何赋值都松，
      // 切点就该落在最外面那一层赋值上（`x = y = 1, z` 切在第一个 `=`，折出来是 `(x = y = 1), z`）。
      // `a = b + 1` 那一档照旧由下面「这个单元里是逗号吗」挡住，不受影响。
      let assignAt = -1;
      for (let j = 1; j < at; j++) {
        const one = kids[j];
        if (one.get("type") !== "SymbolToken") continue;
        const text = textOfNode(one, ctx);
        const isAssign =
          text === "=" ||
          (text.length > 1 &&
            text.endsWith("=") &&
            !["==", "===", "!=", "!==", "<=", ">="].includes(text));
        if (isAssign) {
          assignAt = j;
          break;
        }
      }
      if (assignAt < 0) continue;
      const unitInner = projectableKids(view(unit));
      if (unitInner.length < 3) continue;
      if (textOfNode(unitInner[unitInner.length - 2], ctx) !== ",") continue;
      let level = unit;
      let leftmost: any = undefined;
      const levels: Array<Array<any>> = [];
      while (level !== undefined) {
        const inner = projectableKids(view(level));
        if (inner.length < 3) break;
        levels.push([inner[inner.length - 2], inner[inner.length - 1]]);
        const head = inner[0];
        const headIsComma =
          (head.get("type") === "BinaryOperator" || head.get("type") === "LogicalOperator") &&
          textOfNode(head, ctx) === ",";
        if (headIsComma) {
          level = head;
          continue;
        }
        leftmost = head;
        break;
      }
      if (leftmost === undefined) continue;
      const assigned = projectExpression([...kids.slice(0, at), leftmost], ctx);
      if (assigned === undefined) continue;
      const rest: Array<any> = [];
      for (let q = levels.length - 1; q >= 0; q--) {
        rest.push(levels[q][0], levels[q][1]);
      }
      for (const k of kids.slice(at + 1)) rest.push(k);
      return foldBinaryFrom(assigned, rest, ctx);
    }
  }
  // ---- 0b2. 标签模板**后面还跟着后缀**：第 173 轮在这里加过一条判据——**退回来了** ----
  //
  // 判据写的是「第二格是 `PropertyAccess` 且它第一个子单元是反引号 String」，
  // 拼法是把标签模板拼好后按 `dottedExpression` 那条形状挂成员。
  // **实测它一次都没生效**：`cases:tsast` 照样 1434/1434、
  // `` tag`abc`.length `` 照样给 `[Function (anonymous)]`、
  // AST 照样是 `VariableDeclaration{ Identifier r, Identifier tag }`
  //（标签模板与 `.length` 全丢）。**没被验证过的改动不留** → 撤回。
  //
  // **这一轮我重犯了第 168 轮那个错**：没插桩就加分支（「先插桩、再下结论」）。
  // **下一轮的入口**：给 `projectExpression` 插一行探针，把
  // `[Identifier tag, PropertyAccess{…}]` 这种 kids **到底落在哪一支**打出来——
  // 现在已知的是：**这一支不是它**（那一段入口更早）。
  // 另外这一轮**证实了一件事**：第 172 轮那次「结果挪一格」的试验是在
  // **AST 还错着**的时候做的，所以它当时**什么也证明不了**——
  // 等 AST 修对之后，那个槽位假设**要重新量一遍**（不能拿它当已否证的结论）。
  // ---- 0b1. 标签模板**后面还跟着后缀**：第 173 / 174 轮各试过一次——**都退回来了** ----
  //
  // **判据是对的、取子单元的办法也找到了**（第 174 轮探针）：
  // 这个形状确实是 `projectLetFrom → projectExpression`，kids 正是
  // `Identifier,PropertyAccess`；而取子单元要用 **`projectableKids`**
  //（第 173 轮用 `view(...)` → 分支**静默不成立**，所以那次「没生效」）。
  //
  // **换成 `projectableKids` 之后分支生效了**（AST 立刻变对：标签模板与 `.length` 都在），
  // **但降级层当场报新错**：`v.segments is not iterable`——
  // 说明这一支里对那个 `String` 单元调 `projectNode(…)` **拿到的不是投影期待的那种节点**
  //（`v.segments` 是投影内部 `String` 视图上的字段，见本文件 4527 / 5380 那两处）。
  // **没被验证过的改动不留** → 第二次也撤回。
  //
  // **下一轮的第一件事**：把**已经在用的**那条 0b 判据（`` tag`abc` `` 整句那条，
  // 第 137 轮）里 `projectNode(kids[1], ctx)` 的 **`kids[1]` 到底是什么形状**打出来
  //（`allKids` / `view` / `kidsOf(…, "children")` 各给什么），
  // 再拿同一个形状去投属性访问里的那个 `String`——**照抄那条已经跑通的路**，
  // 不再自己另找一条。
  // ---- 0b. 展开实参（第 114 轮）----
  //
  // `f(...xs)` 的产物把 `...` 与目标分成**两格**，而 `...` 是 `SymbolToken`
  // （`isOperatorUnit` 对任何符号都为真），照二元那一支会把它投成一个孤立的
  // `DotDotDotToken`（实测多出 66，样本全是 `...(newValues)` / `...(items)` 这种调用实参）。
  if (kids.length >= 2 && kids[0].get("type") === "SymbolToken" && textOfNode(kids[0], ctx) === "...") {
    const spread = projectExpression(kids.slice(1), ctx);
    if (spread !== undefined) {
      return {
        kind: "SpreadElement",
        expression: spread,
        pos: startOf(kids[0]),
        end: endOf(kids[kids.length - 1]),
      };
    }
  }
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
  // **`!` 后面那个下标被收成了「数组字面量」兄弟**（第 303 轮）：
  // `o.b![1]` 的产物是 `<NotNull(PropertyAccess(o.b), !)>` 与 `<ArrayLiteral(1)>`
  // **两个平级单元**——`!` 那一格只把**左边**包起来，后面那个 `[` 谁也不认它
  // （它不是下标位、也不是数组字面量位，于是**按数组字面量成形**）。
  // 于是原来的链分支进不来（它要求 `kids[1]` 是 `.` 或**真下标**），
  // `NotNull` 单独投影 ⇒ **`[1]` 整个丢掉**：
  // `o.b![1]` 在 Node 里是 `2`，本仓给的是**那个数组本身**——**静默错值**
  // （判据 `ex-nonnull-chain-index` / `ex-nonnull-and-as-chain`）。
  // **一元前缀的操作数掉在单元外面**（第 739 轮）时也要进这一支：
  // `typeof await p` 的产物是 `[UnaryOperator(typeof await), PropertyAccess(p)]`——
  // 第二格是一条**成员访问链**（头一格是 `Identifier`，不是调用括号），
  // 所以上面那些入口条件（`.` / 下标 / 以调用开头）一个都不成立，
  // 这个一元单元会被单独投出去（`expression` 缺一格）⇒ 降级期报
  // `unimplemented: expression AwaitKeyword`。判据与下面那一支共用同一个 `chainTail`。
  const chainTail = (unit: any): bool => {
    if (unit === undefined || unit === null) return false;
    const tailKind = unit.get("type");
    if (tailKind === "Bracket" || tailKind === "PropertyAccess" || tailKind === "Method") return true;
    if (tailKind === "NotNull") return true;
    return tailKind === "SymbolToken" && textOfNode(unit, ctx) === ".";
  };
  // **把那个二元单元摊进 `ck`**（判据与理由见上面 `chainTailInOperator`）：
  // 续格那一截按原样摊成平级（与 `isCallFirstUnit` 那一支同一个手法），
  // 运算符与右操作数**原样留在后面**（尾巴那一支就是按「以运算符开头的一串」折的）。
  // **递归那一档**：第一格还是二元单元时先把它摊开，再把自己的运算符与右操作数接上
  //（`o[k]().v * 2 + 1` ⇒ `[o[k], (, ., v, «*», 2, «+», 1]`）。
  const flattenChainTailInOperator = (unit: any, out: Array<any>) => {
    const inner = projectableKids(view(unit));
    if (inner.length >= 2 && isCallFirstUnit(inner[0], ctx)) {
      // **整格 `Method` 不摊开**（第 975 轮）：`a!()()() + 1` 的那个二元单元里，
      // 第一格是 `Method(name=""[Method(name=""[Bracket])])`——它自己说的是**三次调用**
      // （第 966 轮那句话：一格可以盖着好几层），摊成它的**孩子**就少了一层，
      // 实测最外面那格 `CallExpression` 的区间只到 `[0,6)`（TS 是 `[0,8)`）。
      // 整格留给链循环：那里的 `Method` 分支正是按「最里面那一格」折的
      //（`innermostCallee` + `graftCallee`）。
      // **`PropertyAccess` 那一档照旧摊开**：`o["f"]().v` 那一格才是「调用 + 后缀」
      // 两件事装在一个外壳里，摊平之后循环里那两支各办一件。
      if (inner[0].get("type") === "PropertyAccess") {
        for (const one of projectableKids(view(inner[0]))) out.push(one);
      } else {
        out.push(inner[0]);
      }
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    if (
      inner.length >= 2 &&
      (inner[0].get("type") === "BinaryOperator" || inner[0].get("type") === "LogicalOperator") &&
      chainTailInOperator(inner[0])
    ) {
      flattenChainTailInOperator(inner[0], out);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    out.push(unit);
  };
  // **链头是函数 / 类时，续格（下标）可能与运算符一起装在二元单元里**（第 775 轮）：
  // `() => class { static s = 1; }["s"] * 16` 在箭头体里的产物是
  // `[Class, Statement(BinaryOperator(ArrayLiteral(s), «*», 16))]`——那个 `["s"]` 先按
  // **数组字面量**成形（与链入口那条新判据同一处境：前面那一格 token 层认不出是值），
  // 再与后面的运算符折进同一个单元（与第 743 轮 `o["f"]().v + 1` 是同一副面孔，
  // 只是续格是**下标**、不是调用）。
  // **只有「链头只可能做值」的那两格才算数**：别的链头（标识符 / 已折好的链）本来就由
  // token 层认成下标，轮不到这一支——放开会换掉既有形状（实测 `o["i"] * 2` 一直是对的）。
  const indexTailInOperator = (unit: any): bool => {
    if (unit === undefined || unit === null) return false;
    const kind = unit.get("type");
    if (kind !== "BinaryOperator" && kind !== "LogicalOperator") return false;
    const inner = projectableKids(view(unit));
    if (inner.length < 2) return false;
    if (isIndexFirstUnit(inner[0], ctx)) return true;
    return indexTailInOperator(inner[0]);
  };
  // 摊法与 `flattenChainTailInOperator` 一字不差（递归那一档同一理由）：
  // 续格那一格（下标）摊成平级，运算符与右操作数**原样留在后面**，由尾巴那一支折二元。
  const flattenIndexTailInOperator = (unit: any, out: Array<any>) => {
    const inner = projectableKids(view(unit));
    if (inner.length >= 2 && isIndexFirstUnit(inner[0], ctx)) {
      out.push(inner[0]);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    if (
      inner.length >= 2 &&
      (inner[0].get("type") === "BinaryOperator" || inner[0].get("type") === "LogicalOperator") &&
      indexTailInOperator(inner[0])
    ) {
      flattenIndexTailInOperator(inner[0], out);
      for (let j = 1; j < inner.length; j++) out.push(inner[j]);
      return;
    }
    out.push(unit);
  };
  // **把那个二元单元拆成两段**（第 744 轮）：续格那一格（归**操作数**）与
  // 「运算符 + 右操作数」（归**外层折二元**）。`typeof o["f"]().v + ""` 要的就是这个分法——
  // 一元比二元**紧**，`+ ""` 不在一元的操作数里。
  // **续格给的是那一格单元本身、不是摊平的几格**：它要递回 `projectExpression` 的链那一支，
  // 而那一支认的是**没摊开**的形状（与上面那一支注释里写的是同一条理由——
  // 裸的 `(` 兄弟不在链那一支的入口判据里）。
  const splitChainTailInOperator = (unit: any) => {
    const rest: Array<any> = [];
    let tail: any = undefined;
    const walk = (one: any) => {
      const inner = projectableKids(view(one));
      if (inner.length >= 2 && isCallFirstUnit(inner[0], ctx)) {
        tail = inner[0];
        for (let j = 1; j < inner.length; j++) rest.push(inner[j]);
        return;
      }
      if (inner.length >= 2 && chainTailInOperator(inner[0])) {
        walk(inner[0]);
        for (let j = 1; j < inner.length; j++) rest.push(inner[j]);
        return;
      }
      rest.push(one);
    };
    walk(unit);
    return { tail: tail, rest: rest };
  };
  if (
    kids.length >= 2 &&
    (isSymbol(kids[1], ".") || isIndexBracket(kids[1]) ||
      (kids[0].get("type") === "NotNull" && kids[1].get("type") === "ArrayLiteral") ||
      // **`!` 后面那一格以一次下标开头**（第 333 轮）：`[1]!` 与 `[0].id`
      // 两种外壳（`NotNull` / `PropertyAccess`）都要认——判据与理由见
      // `isIndexFirstUnit` 那一段。少了它，`o.b![1]![0]` 与 `data.list![0].id`
      // **整条链都进不来**（后两个方括号连着丢）。
      (kids[0].get("type") === "NotNull" && isIndexFirstUnit(kids[1], ctx)) ||
      // **函数 / 类表达式后面紧跟的方括号是下标**（第 775 轮）：`function () { }["length"]` /
      // `class { }["name"]` 里那个方括号与前一条（`o.b![1]`）**是同一处境**——
      // 前面那一格不是「标识符 / 已折好的链」，于是它按**数组字面量**成形；
      // 而链的头一格是**只可能做值**的函数 / 类单元 ⇒ 那个方括号只能是下标。
      // 少了这一条，链那一支整个进不来：`kids[0]` 单独投出去（`FunctionDeclaration`）、
      // 方括号整段丢（降级期报 `unimplemented: expression FunctionDeclaration`）。
      // **续格后面还跟着运算符时**形状又换一格（`["s"] * 16` 折进了同一个二元单元）——
      // 那一档由 `indexTailInOperator` 认（判据见上面那一段）。
      ((kids[0].get("type") === "Function" || kids[0].get("type") === "Class") &&
        (isIndexFirstUnit(kids[1], ctx) || indexTailInOperator(kids[1]))) ||
      // **第二格以一次调用开头**（第 692 轮）：`o["f"]().v` 的产物是
      // `[PropertyAccess(o, [f]), PropertyAccess(Bracket(()), ., v)]`——
      // 调用那一对括号**与它后面的 `.v` 一起**折进了第二个 `PropertyAccess`
      //（`o["f"]()` 单独出现时是三格平级 `[o, Bracket([f]), Bracket(())]`，
      //  多了后缀之后 token 层给出的形状**就换了一个**）。
      // 判据与理由见 `isCallFirstUnit` 那一段。
      isCallFirstUnit(kids[1], ctx) ||
      // **第二格是二元单元、续格在它里面**（第 743 轮，判据见上面 `chainTailInOperator`）。
      chainTailInOperator(kids[1]) ||
      // **一元前缀 + 操作数在外的链**（第 739 轮，判据见上面 `chainTail` 那一段）。
      (kids[0].get("type") === "UnaryOperator" && chainTail(kids[1])))
  ) {
    // **嵌套的链要摊平**（第 86 轮）：产物偶尔把**一整条链**塞进另一条链的成员位——
    // `this.Parent!.Data.splice(1, 2)` 实测是
    // `[NotNull(this.Parent), ., PropertyAccess([Data, ., Method(splice)])]`，
    // 而 TS 那边是**左结合**的 `((this.Parent!).Data).splice(1, 2)`。
    // 不摊平的话那一格会走「成员名」那一支、投成一个盖住整段的 `Identifier`
    // （实测 `Data.splice(1, 2)` 成了名字，`splice` 那次调用也丢了）。
    const ck = [];
    for (let at = 0; at < kids.length; at++) {
      const k = kids[at];
      // **第二格那份「调用括号 + 后缀」要摊开**（第 692 轮）：
      // `o["f"]().v` 的第二格是 `PropertyAccess(Bracket(()), ., v)`——
      // 它外壳是属性访问，里层却是**两件事**：先对前面那次下标的结果**调一次**，
      // 再把 `.v` 接上去。**不摊开的话**：循环看到的是一个 `PropertyAccess`
      // ⇒ 既不是下标、也不是点号 ⇒ `break` ⇒ `left` 停在 `ElementAccessExpression`，
      // 后面整段丢（`console.log(o["f"]().v)` 于是打印**那个函数自己**，
      // Node 打印 `1`——**静默错值**；`typeof o["f"]()` 那一条既有判据钉的
      // 是**没有后缀**的形状，所以一直没露）。
      // **摊开之后与 `o["f"]()` 那条既有路一字不差**：`(` 那一格走循环里
      // 「调用括号也是链上的一格」那一支，`.v` 走点号那一支。
      // **摊开之前先问一句「这一格的区间是不是盖着两层调用」**（第 966 轮）：
      // `a!()().c` 的第二格是 `PropertyAccess(Method(name=""[Bracket(())]), ., c)`——
      // 那个 `Method` 里**只有一对括号**，可它的区间一直盖到第二个 `)`：
      // 里层（`a!()`）那次调用与外层那对括号**共用同一格 `Method`**。
      // 摊开成 `[Method, ., c]` 之后，`Method` 原本那个「外面还有一层」的信息就**丢了**
      //（`projectNode(Method)` 只投得出内层那一次调用）⇒ 外层的调用、`.c` 一起消失
      //（实测 `gap-r964-nonnull-call-twice-member`：缺 4 格）。
      // **做法**：摊开这件事交给 `chainOnto` 的 Method 分支——它按**区间**判「外面还有一层」，
      // 正是这一档需要的（那一支第 966 轮补齐了）。
      if (k.get("type") === "PropertyAccess" && at > 0 && isIndexFirstUnit(k, ctx)) {
        const bareKids = projectableKids(view(k));
        const bareHead = bareKids.length > 0 ? bareKids[0] : undefined;
        if (bareHead !== undefined && bareHead.get("type") === "Method"
          && bareHead.get("name") !== undefined && String(bareHead.get("name")) === ""
          && endOf(bareHead) < endOf(k)) {
          ck.push(k);
          continue;
        }
      }
      if (k.get("type") === "PropertyAccess" && at > 0 && isCallFirstUnit(k, ctx)) {
        for (const inner of projectableKids(view(k))) ck.push(inner);
        continue;
      }
      if (k.get("type") === "PropertyAccess" && at > 0 && isSymbol(kids[at - 1], ".")) {
        for (const inner of projectableKids(view(k))) ck.push(inner);
        continue;
      }
      // **二元单元的第一个孩子是链的续格**（第 743 轮，判据见上面 `chainTailInOperator`）：
      // `o["f"]().v + 1` 的第二格那个二元单元里装的是**链的下一截**（调用括号 + 后缀）。
      // **不摊开的话**：循环在那一格上停住（它既不是下标、也不是点号），
      // 尾巴那一支又把整个二元单元当成「以运算符开头的一串」递给 `foldBinaryFrom`——
      // 可它是一格**单元**、不是运算符 ⇒ `rest.length < 2` 那一条直接返回 `left`
      // ⇒ `o["f"]().v + 1` 交出**那个函数自己**（Node 给 2，**静默错值**；
      //  `o[k]().v + ""` 同一条路，实测 Node `1` 对产物 `[Function: f]`）。
      // **摊开之后与 `o["f"]().v` 那条既有路一字不差**：续格交给循环里那几支，
      // 运算符与右操作数原样留在后面，由尾巴那一支折成二元。
      if (
        at > 0 &&
        (k.get("type") === "BinaryOperator" || k.get("type") === "LogicalOperator") &&
        chainTailInOperator(k)
      ) {
        flattenChainTailInOperator(k, ck);
        continue;
      }
      // **续格（下标）与运算符一起装在二元单元里**（第 775 轮，判据见上面
      // `indexTailInOperator`）：与上一条同款——续格摊成平级，运算符与右操作数留在后面。
      // **只在链头是函数 / 类时走**：那一档才有「方括号被收成数组字面量」这件事。
      if (
        at > 0 &&
        (k.get("type") === "BinaryOperator" || k.get("type") === "LogicalOperator") &&
        (kids[0].get("type") === "Function" || kids[0].get("type") === "Class") &&
        indexTailInOperator(k)
      ) {
        flattenIndexTailInOperator(k, ck);
        continue;
      }
      // **点号后面那一格是一个二元单元**（第 125 轮）：`(a.pos ?? 0)` 的产物把
      // `a.pos ?? 0` 平铺成 `[a, ., BinaryOperator(pos, ??, 0)]`——那个 `BinaryOperator`
      // 的**第一个孩子才是成员名**，其余才是运算符与右操作数。不摊开的话下面
      // `nameOf(next)` 会把整段 `pos ?? 0` 当成名字（投出一个盖住整段的 `Identifier`），
      // `PropertyAccessExpression` / `QuestionQuestionToken` / `NumericLiteral` 全丢
      // （实测 `dist/ts/typescript/ts-ast.ts` 与 `lib.es5.d.ts` 成片）。
      if (
        (k.get("type") === "BinaryOperator" || k.get("type") === "LogicalOperator") &&
        at > 0 &&
        isSymbol(kids[at - 1], ".")
      ) {
        const inner = projectableKids(view(k));
        if (inner.length >= 2) {
          for (const one of inner) ck.push(one);
          continue;
        }
      }
      ck.push(k);
    }
    // **`!` 后面那一格「以一次下标开头」的单元要摊开**（第 333 轮）：
    // `data.list![0].id` 的 token 形状是 `[NotNull(data.list), PropertyAccess(ArrayLiteral(0), ., id)]`
    // ——第二格的外壳是**属性访问**，而它要落的其实是**两件事**：
    // 先按那个方括号下标、再把 `.id` 接上去。
    // **不摊开的话**：循环看到的是一个 `PropertyAccess` ⇒ 既不是下标、也不是点号
    // ⇒ `break` ⇒ 后面整段丢（`data.list![0].id` 于是给**整个数组**，
    // 而 Node 给 `1`——**静默错值**，判据 `c331-ex-nonnull-and-optional-mix`）。
    // **`NotNull` 那一档不在这里摊**：它自带「断言」那一半，
    // 摊成两格反而会把那个 `!` 丢成一枚裸符号——它由循环里那一支一起办（见下面）。
    const headAssert = kids.length > 0 && kids[0].get("type") === "NotNull";
    if (headAssert && ck.length > 0) {
      const flattened: Array<any> = [];
      for (let at = 0; at < ck.length; at++) {
        const one = ck[at];
        // **外壳是属性访问、头一格是「断言盖着一次调用」时也要摊开**（第 975 轮）：
        // `a!()![0]` 的第二格是 `PropertyAccess([NotNull(Bracket(()), !), Bracket([0])])`——
        // 里层是两件事（先按括号调一次、再取下标），摊开之后循环里那两支各办一件；
        // 不摊开的话它在循环里既不是下标、也不是点号 ⇒ `break`（实测
        // `gap-r975-nonnull-call-assert-index` / `gap-r975-nonnull-call-thrice-assert-member`）。
        // **与上面那条 `isIndexFirstUnit` 的分工**：那一支管「先下标、再断言」，
        // 这一支管「先调用、再断言」（判据就是 `isCallFirstUnit(头一格)`）。
        const oneHead = one.get("type") === "PropertyAccess"
          ? projectableKids(view(one))[0]
          : undefined;
        const assertCallCell = oneHead !== undefined && oneHead.get("type") === "NotNull"
          && isCallFirstUnit(oneHead, ctx);
        if (
          at > 0 &&
          one.get("type") === "PropertyAccess" &&
          (isIndexFirstUnit(one, ctx) || assertCallCell)
        ) {
          for (const inner of projectableKids(view(one))) flattened.push(inner);
          continue;
        }
        flattened.push(one);
      }
      ck.length = 0;
      for (const one of flattened) ck.push(one);
    }
    // **一元前缀的操作数在后**（第 711 轮，**普查当场红的**）：`typeof o[k]().v` 的产物是
    // `[UnaryOperator(typeof o[k]), Bracket(()), ., v]`——那个一元单元把 `typeof`
    // 与**它的操作数**装在同一格里，而链上后面那些格接的是**操作数**
    //（JS 里 `typeof` 管的是整条链 `o[k]().v`，不是 `o[k]` 那一段）。
    //
    // **照原样折会静默错值**：后面那些格被套在 `typeof` 的**结果**上——
    // `typeof o[k]` 是一个字符串，再对它调一次 ⇒ 报
    // `cannot call a non-closure value`（`typeof o[k]().v`）；
    // 而少了调用那一格时（`o[k]().v + ""`）拿到的是**那个函数自己**。
    // **`typeof (…)` 是同一个形状的第三个出口**：`typeof o[k]()` 早就有判据钉着
    // （`c307-rt-typeof-element-call-in-args`），它走的是**平级三格**那一条路；
    // 一旦后面再接一个后缀，token 层的形状就换成了「一元单元 + 链上其余格」。
    //
    // **做法与第 178 轮 `?.` 那一处一字不差**（那里也是「一元前缀 + 操作数在后」）：
    // 把操作数那一格接上链上其余格、**当场递归折完**，再套回那个一元节点——
    // 下面那个循环因此不再进（整条链在这里已经折完）。
    // **只在后面真是链上的一格时才走这一支**（`.` / 下标 / 调用 / 成员 / 断言）：
    // `?.` 与二元那一族由下面那两条尾支管，抢过来会换掉既有形状。
    // （`chainTail` 那份判据提到上面那个入口条件那儿去了——两处必须是同一句。）
    if (ck.length > 1 && ck[0].get("type") === "UnaryOperator" && chainTail(ck[1])) {
      const unaryKids = projectableKids(view(ck[0]));
      let operandAt = 0;
      while (
        operandAt < unaryKids.length &&
        (unaryKids[operandAt].get("type") === "SymbolToken" || unaryKids[operandAt].get("type") === "Keyword")
      ) {
        operandAt += 1;
      }
      // **两层前缀叠在同一个一元单元里、操作数却掉在外面**（第 739 轮）：
      // `typeof await p` 的产物是 `[UnaryOperator(typeof await), PropertyAccess(p)]`——
      // 上面那个循环把 `typeof` **与 `await`** 都当成「词」跳过去了，`operandAt` 顶到末尾
      // ⇒ 这一支整条不进 ⇒ 那个一元单元照原样投出一个 `AwaitKeyword`
      //（降级期报 `unimplemented: expression AwaitKeyword`，离现场很远）。
      // **往回退一格**：最后那个词自己也是要吃操作数的，把它与后面的兄弟接起来递归折完
      //（折出来的是 `typeof (await p)`，与 Node 的语义一致）。
      if (operandAt === unaryKids.length && operandAt > 1) {
        const lastText = textOfNode(unaryKids[operandAt - 1], ctx);
        if (["await", "yield", "typeof", "void", "delete", "!", "~", "+", "-", "++", "--"].includes(lastText)) {
          operandAt -= 1;
        }
      }
      // **操作数那一格有两个名字**（实测踩过一次）：`typeof` / `void` / `delete` / `await`
      // 是 `TypeOfExpression` 那一族（字段叫 **`expression`**），而 `!` / `~` / `+` / `-` /
      // `++` / `--` 是 **`PrefixUnaryExpression`**（字段叫 **`operand`**）——
      // 只认 `expression` 的话 `!o[k]().v` 会**退回**旧路（投成 `(!o[k])().v`，
      // 运行期报 `cannot call a non-closure value`），而 `typeof o[k]().v` 是好的
      // ——**同一个形状两种结局**，最费时间的那一种。
      // **两个名字都认不出来时按 `op` 定**（第 739 轮）：`typeof await p` 里那个一元
      // 单元的**操作数本来就缺**（它掉在单元外面）⇒ `TypeOfExpression` 投出来的是
      // `expression: undefined` ⇒ 上面那两句「字段在不在」都不成立、整条支路白走
      //（症状是 `typeof await p` 报 `unimplemented: expression AwaitKeyword`）。
      // 判据用**运算符自己的文本**（`typeof` / `void` / `delete` 是**词**，三格独立 kind、
      // 字段叫 `expression`；其余是符号，`PrefixUnaryExpression` 那一族的字段叫 `operand`）。
      // **两处调用点共用它**（第 744 轮抽出来）：下面那一支与「续格在二元单元里」那一支
      // 都要把操作数挂回同一个一元节点上——各写一遍就是两处会漂。
      const attachToUnary = (operand: any) => {
        const unaryHead = projectNode(ck[0], ctx);
        if (operand === undefined || unaryHead === undefined) return undefined;
        const outerWord = ck[0].get("op");
        const wordKinds = ["typeof", "void", "delete"];
        const preferExpression =
          (typeof outerWord === "string" && wordKinds.includes(outerWord)) ||
          unaryHead.expression !== undefined;
        if (preferExpression) {
          return { ...unaryHead, expression: operand, end: operand.end };
        }
        if (unaryHead.operand !== undefined) {
          return { ...unaryHead, operand: operand, end: operand.end };
        }
        return { ...unaryHead, expression: operand, end: operand.end };
      };
      // **续格与更松的运算符在同一个单元里**（第 744 轮）：`typeof o["f"]().v + ""` 的产物是
      //
      //     [UnaryOperator(typeof o["f"]), BinaryOperator( PropertyAccess(Bracket(()), ., v), «+», "" )]
      //
      // ——一元单元里装的是**操作数的头**，续格与运算符一起在**下一个单元**里。
      // **照下面那一支走会错**：它把 `kids.slice(1)` 整段（含运算符）都递进去递归，
      // 而链那一支现在会把 `+ ""` 一起折进操作数 ⇒ 那个一元单元盖住整段
      //（TS 只盖 `o["f"]().v`：缺 1 漂 1 多 2）。
      // **一元比二元紧**，所以这里把那个单元拆开：续格归操作数、运算符与右操作数
      // 交给 `foldBinaryFrom` 在外层折（`!o["f"]().v + ""` 同理）。
      if (kids.length >= 2 && chainTailInOperator(kids[1])) {
        const split = splitChainTailInOperator(kids[1]);
        const operand = projectExpression([...unaryKids.slice(operandAt), split.tail], ctx);
        const attached = attachToUnary(operand);
        if (attached !== undefined) {
          return foldBinaryFrom(attached, [...split.rest, ...kids.slice(2)], ctx);
        }
      }
      if (operandAt < unaryKids.length) {
        // **链上其余格用「摊开之前」的那一份**（`kids`，不是 `ck`）：`ck` 里第二格
        // （`PropertyAccess(Bracket(()), ., v)`）已经被摊成三格平级
        //（`(` / `.` / `v`）——而 `projectExpression` 的链那一支认的是**没摊开**的形状
        //（见上面 `isCallFirstUnit` 那一段）。递摊开那一份会让它落进二元那一支：
        // 折出一个**操作符是 `DotToken` 的 `BinaryExpression`**，
        // 降级期报 `name is not a local or a capture: v`（实测踩过一次）。
        const operand = projectExpression([...unaryKids.slice(operandAt), ...kids.slice(1)], ctx);
        const attached = attachToUnary(operand);
        if (attached !== undefined) return attached;
      }
    }
    // **链的头一格是函数 / 类时，它就是表达式位的**（第 775 轮）：`function () { }.bind(o)` /
    // `class { }.prototype` 里那一格是**链的头**，而这一支原来直接
    // `projectNode(ck[0], ctx)`——`ctx.expressionPosition` 没人置，于是投出
    // `FunctionDeclaration` / `ClassDeclaration`，降级期报
    // `unimplemented: expression FunctionDeclaration`（听起来像「函数表达式没实现」，
    // 而 `(function () { })()` 那一半一直是好的——分界正是「体后面跟的是 `(` 还是 `.`」：
    // 末尾那对实参括号走 3b 那一支、**递回 `projectExpression`**，于是标记照常置上）。
    // **判据只看这一格自己**：标记置宽了（留给整棵子树）会让体里的声明也被当成表达式
    //（第 134 轮那条注释记的就是这个坑），所以只对 `Function` / `Class` 这两个标签置位。
    const projectChainHead = (unit: any): any => {
      if (unit.get("type") !== "Function" && unit.get("type") !== "Class") {
        return projectNode(unit, ctx);
      }
      const savedExpression = ctx.expressionPosition;
      ctx.expressionPosition = true;
      try {
        return projectNode(unit, ctx);
      } finally {
        ctx.expressionPosition = savedExpression;
      }
    };
    let left =
      ck[0].get("type") === "Bracket" && ck[0].get("startBracket") === "("
        ? parenthesizedOf(ck[0], ctx)
        : projectChainHead(ck[0]);
    // **这一条链上出现过非空断言**（第 303 轮）：出现过之后，
    // 后面那些「按数组字面量成形的方括号」**每一格都是下标**——
    // `o.b![1]![0]` 里**两个** `[` 都是这种形状（第二个的前一格是**已经折好的**
    // `ElementAccessExpression`，不再挨着那个 `NotNull`）。
    // 只看「前一格是不是 `NotNull`」的话，第二个下标会**整段丢掉**
    //（判据 `c303-nonnull-then-index` 第二版量的就是它）。
    // **链的头一格是「只可能做值」的单元**（第 775 轮扩了这一格）：`NotNull` 是第 303 轮
    // 那一档（`o.b![1]`），**函数 / 类**是第 775 轮新加的一档（`function () { }["length"]`）——
    // 两者处境一字不差：token 层认不出「前面那一格是个值」，于是那个方括号按数组字面量成形。
    let sawNullAssert =
      ck[0].get("type") === "NotNull" ||
      ck[0].get("type") === "Function" ||
      ck[0].get("type") === "Class";
    let i = 1;
    while (i < ck.length) {
      // **下标链接**：`a[i]` → `ElementAccessExpression`（第 80 轮）。
      //
      // **紧跟在一个「非空断言」后面的 `ArrayLiteral` 也是下标**（第 303 轮，理由见上面
      // 那一段）：`o.b![1]` 里那个 `[1]` 是按**数组字面量**成形的，
      // 而它在**链上**（前一格是 `NotNull`）就只能是下标——
      // 数组字面量不会紧跟在表达式后面出现（`o.b [1]` 在 JS 里就是 `o.b[1]`）。
      const indexLike = isIndexBracket(ck[i]) ||
        (ck[i].get("type") === "ArrayLiteral" && sawNullAssert);
      if (indexLike) {
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
      // **调用括号也是链上的一格**（第 309 轮）——`o["m"]()` 的产物是
      // `[Identifier(o), Bracket([m]), Bracket(())]`（**下标那一格是平级的**，
      // 与 `o.m()` 不同：那个形状里 `(` 会被折进 `Method`）。
      // 上面那一支替 `[m]` 建出 `ElementAccessExpression` 之后，紧跟的 `()` 是
      // **对它的调用**——少了这一格，循环在这里 `break` ⇒ 只剩 `ElementAccessExpression`
      // ⇒ **那次调用整格消失**（`typeof (o["m"]())` 于是算的是**方法本身**、
      // 给 `"function"`，Node 给 `"object"`——**静默错值**；
      // 判据 `c307-rt-typeof-element-call-in-args`）。
      // **做法与上面下标那一支同款**（先把左边折好，再套一层），
      // 与 `projectExpression` 里那条「末尾是 `(` 括号」的规则（3b）**是同一件事**
      // ——区别只是这里在处理**一条已经开始的链**。
      // **它必须排在下标那一支之后**：`a[i]` 与 `a(i)` 长得像，
      // 而那个 `[` / `(` 的分别正是 `startBracket` 那一格。
      if (ck[i].get("type") === "Bracket" && ck[i].get("startBracket") === "(") {
        left = {
          kind: "CallExpression",
          expression: left,
          arguments: splitTopLevel(projectableKids(view(ck[i])), ctx, ",")
            .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
            .filter((a) => a !== undefined),
          pos: left.pos,
          end: endOf(ck[i]),
        };
        i += 1;
        continue;
      }
      if (!isSymbol(ck[i], ".") || i + 1 >= ck.length) {
        // **`!` 非空断言接在链中间**（第 143 轮）：`source.Pre()!.Pre()` 的产物是
        // `[…, Method(Pre), NotNull, ., Method(Pre)]`——`!` 是**一个单元**，它把左边整段
        // 包成 `NonNullExpression`，链再照常往下接。不认它的话循环在这里 break，
        // 后面那整段链会掉成平级节点（实测 `string/string-guide.ts`：漂移 6 + 多出 4）。
        if (ck[i].get("type") === "NotNull") {
          // **`[1]!` 这种「先下标、再断言」的一格**（第 333 轮）：见 `isIndexFirstUnit`
          // 那一段的表——中间那一格的外壳是 `NotNull`，里层却是一个方括号。
          // **次序是语义**：TS 是 `((o.b!)[1])!`——先下标、再把 `!` 套在那个结果上。
          // 原来无条件写成「把 `left` 整个包进 `NonNullExpression`」 ⇒ 断言套在了**下标之前**
          // ⇒ 值一样（断言不改值）可**区间与层数都对不上**，
          // 而后面那个 `[0]` 又因为 `sawNullAssert` 已经置真而接上——
          // 表面上跑得通，`cases:tsast` 一比就漂（实测 `arr![0]![0]`：缺两个
          // `ElementAccessExpression` + 两个 `NumericLiteral`、`NonNullExpression` 漂 4）。
          const bangKids = projectableKids(view(ck[i]));
          const bangHead = bangKids.length >= 1 ? bangKids[0] : undefined;
          // **`f()!` 这种「先调用、再断言」的一格**（第 975 轮）：`a!()!()!()` 的第二格是
          // `NotNull([Bracket(()) , !])`——那个括号是**一次调用**（对 `left` 的），`!` 套在
          // **调用结果**上（TS：`NonNull(CallExpression(a!))`）。下面那条只认
          // `isIndexFirstUnit`（下标那一档），于是这一格直接把 `left` 包进 `NonNullExpression`
          // ⇒ **那次调用的节点整格丢**（实测 `gap-r973-nonnull-call-assert-call-assert`：
          // 最里面那个 `CallExpression` 缺、`NonNullExpression` 漂 1）。
          // 判据与下标那一支**一字不差**（`endOf(括号) < endOf(这一格)`）：先建调用、再套断言。
          if (bangHead !== undefined && bangHead.get("type") === "Bracket"
            && bangHead.get("startBracket") === "(" && endOf(bangHead) < endOf(ck[i])) {
            left = {
              kind: "CallExpression",
              expression: left,
              arguments: splitTopLevel(projectableKids(view(bangHead)), ctx, ",")
                .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                .filter((a: any) => a !== undefined),
              pos: left.pos,
              end: endOf(bangHead),
            };
          } else if (bangHead !== undefined && bangHead.get("type") === "Method") {
            // **断言的核是一格调用单元**（第 975 轮）：`a!()()!()` 的第二格是
            // `NotNull([Method(name=""[Bracket(())]) , !])`——那一格自己盖着**两层**调用
            // （第 966 轮那句话：一格说两次调用），而上面那两支只认「核是实参括号」
            //（第 975 轮补的「先调用、再断言」）与「核是下标」⇒ 这一格整格丢。
            // 折法与 `chainOnto` 的 NotNull 单元那一支、以及 `assertedMember` 的
            // Method 那一档**共用同一对**：`innermostCallee` 接出最里面那一格、
            // `graftCallee` 把整串壳套上去，`!` 最后套在整条链外面。
            left = graftCallee(
              projectNode(bangHead, ctx),
              innermostCallee(left, innermostMethod(bangHead), ctx),
              undefined,
            );
          } else if (bangHead !== undefined && isIndexFirstUnit(bangHead, ctx)) {
            const bracket = bangHead;
            const argument = projectExpression(projectableKids(view(bracket)), ctx);
            left = {
              kind: "ElementAccessExpression",
              expression: left,
              argumentExpression: argument,
              pos: left.pos,
              end: endOf(bracket),
            };
          }
          left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(ck[i]) };
          sawNullAssert = true;
          i += 1;
          continue;
        }
        // **这一格自己就是一个调用单元**（第 962 轮）：`o!()()` 的产物是
        // `[NotNull(o!), Method name=""[Bracket( () )]]`——那一次调用**不是**跟着点号来的，
        // 于是它在上面那条 `isSymbol(".")` 的门槛前就掉出去了（`break` ⇒ 整格消失，
        // 实测只剩一个 `NonNullExpression`，两个 `CallExpression` 都不成形）。
        // 折法与下面「点号后面那一格是 `Method`」那一段是**同一件事**
        //（第 366 轮的两步走 + 第 962 轮那两格），区别只是**点号没有出现**——
        // 所以这里只补「点号不来」这一档：被调用者是 `left`、而这一格盖着两层调用
        //（判据就是**区间**：`Method` 比它那个实参括号更靠右，与另外三处一字不差）。
        if (ck[i].get("type") === "Method") {
          const callKids = projectableKids(view(ck[i])).filter((k: any) => k.get("type") !== "GenericType");
          const callHead = callKids.length > 0 ? callKids[0] : undefined;
          const bareName = String(ck[i].get("name") ?? "");
          // **这一格盖着两层调用、而内层那一格的名字也是空的**（第 966 轮）：
          // `a!()()` 的产物是 `[NotNull(a), Method(name=""[Method(name="")[Bracket(()), !], Bracket(())])]`
          // ——内层那格 `Method(name="")` 本身就是**第一次调用**，外层这一格是**第二次**。
          // 原来这一档只认「第一格是实参括号」，于是内层那次调用**整格丢**、
          // 外层也只被投成一次调用（实测 `gap-r964-nonnull-call-twice-member`：缺 4 格）。
          // 折法就是「各投各的」：内层 `projectNode(callHead)` 给出的**已经是**对 `left` 的
          // 一次调用，只需把受体换成 `left`（它那一格本来没人填），位置取 `left.pos`；
          // 外层再用 `projectNode(ck[i])` 套一层。
          if (bareName === "" && callHead !== undefined && callHead.get("type") === "Method"
            && String(callHead.get("name") ?? "") === "") {
            // **「最里面那一格」要一路问到底**（第 975 轮，**普查当场红的**）：
            // `a!()()()()`（四次调用）的 `callHead` 是
            // `Method(name=""[Method(name=""[Bracket(())])])`——里面**还套着一格**，
            // 而这里原来只对「头一格是实参括号」那一档补一层
            // （`deepHead.get("type") === "Bracket"`）⇒ 四层调用只折出两层
            //（实测 `gap-r973-nonnull-call-quad`：两个 `CallExpression` 的区间一路漂到
            //  `[0,10)`；三层那一档 `a!()()()` 也是同一句话少问一层）。
            // **折法与 `chainWithOptional` / `chainOnto` 的 Method 分支共用同一对**
            //（第 971 轮立的 `innermostMethod` + `graftCallee`；「最里面那一格的被调用者
            //  怎么建」第 975 轮收进 `innermostCallee`）：先走到**最里面**那一格
            // `Method`，再让 `projectNode(callHead)` 那一串壳**整体**套上去——
            // `graftCallee` 一路下到最里面那一层调用，不会像原来那样把中间几层丢掉。
            const innerCall = graftCallee(
              projectNode(callHead, ctx),
              innermostCallee(left, innermostMethod(callHead), ctx),
              undefined,
            );
            left = Object.assign({}, projectNode(ck[i], ctx), {
              expression: innerCall,
              pos: innerCall.pos,
              end: endOf(ck[i]),
            });
            i += 1;
            continue;
          }
          // **这一格盖着两层调用、而里层那一次只留下一个实参括号**（第 966 轮）：
          // `a!()()` 的产物是 `[NotNull(a, !), Method(name=""[Bracket(())])]`——**一个
          // `Method` 单元里只有一对括号**，可它说的是**两次调用**：前一次是「调用 `left`」、
          // 后一次才是这一格自己那次（两次调用共用一格 `Method` 的区间）。
          // **判据是区间**（与另外三处一字不差）：`Method` 比它那个实参括号更靠右 ⇒
          // 里面还裹着一层。少了这一档就只投出**一次**调用（实测
          // `gap-r964-nonnull-call-twice-member`：`CallExpression` 与
          // `PropertyAccessExpression` 整片缺、`.c` 也跟着丢）。
          // 折法与上面那支同款：先建里层那次调用（受体是 `left`、区间到括号为止），
          // 再把这一格自己那次套在外面。
          if (bareName === "" && callHead !== undefined && callHead.get("type") === "Bracket"
            && callHead.get("startBracket") === "(" && endOf(callHead) < endOf(ck[i])) {
            const innerCall: any = {
              kind: "CallExpression",
              expression: left,
              arguments: splitTopLevel(projectableKids(view(callHead)), ctx, ",")
                .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                .filter((a) => a !== undefined),
              pos: left.pos,
              end: endOf(callHead),
            };
            left = Object.assign({}, projectNode(ck[i], ctx), {
              expression: innerCall,
              pos: innerCall.pos,
              end: endOf(ck[i]),
            });
            i += 1;
            continue;
          }
          // **断言盖的是一次调用、这一格外面还有一层调用**（第 966 轮）：`a!()!()` 的产物是
          // `[NotNull(a, !), Method(name=""[NotNull(Bracket(()), !), Bracket(())])]`——
          // 那个 `NotNull` 的核是**实参括号**（不是名字），所以这里要自己把内层那次调用
          // 建出来（`assertedMember` 只认名字）。**判据与另外几处一字不差**：
          // `Method` 比它那个实参括号更靠右 ⇒ 外面还有一层。
          if (bareName === "" && callHead !== undefined && callHead.get("type") === "NotNull") {
            const assertKids = projectableKids(view(callHead)).filter(
              (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
            );
            const assertHead = assertKids.length > 0 ? assertKids[0] : undefined;
            // **断言里的核是一格 `Method`**（第 975 轮）：`a!()()!()` 的这一格是
            // `Method(name=""[NotNull(Method(name=""[Bracket(())]), !), Bracket(())])`——
            // 断言盖的**不是一对括号**、而是**一格调用单元**（那一格自己还盖着两层调用，
            // 第 966 轮那句话）。原来这里只认「核是实参括号」⇒ 这一支整条不进、
            // 链在下面 `break` ⇒ 三格 `CallExpression` 与那个 `NonNullExpression` 一起丢
            //（实测 `gap-r973-nonnull-call-twice-assert`：缺 3 漂 1）。
            // 折法与 `chainWithOptional` / `chainOnto` 的 Method 分支**共用同一对**：
            // 走到最里面那一格（`innermostMethod`）、被调用者交给 `innermostCallee`、
            // 换法交给 `graftCallee`——再把 `!` 套在整条调用链外面。
            if (assertHead !== undefined && assertHead.get("type") === "Method") {
              const innerCall = graftCallee(
                projectNode(assertHead, ctx),
                innermostCallee(left, innermostMethod(assertHead), ctx),
                undefined,
              );
              const assertedCall: any = {
                kind: "NonNullExpression",
                expression: innerCall,
                pos: innerCall.pos,
                end: endOf(callHead),
              };
              left = Object.assign({}, projectNode(ck[i], ctx), {
                expression: assertedCall,
                pos: assertedCall.pos,
                end: endOf(ck[i]),
              });
              i += 1;
              continue;
            }
            if (assertHead !== undefined && assertHead.get("type") === "Bracket"
              && assertHead.get("startBracket") === "(") {
              const innerCall: any = {
                kind: "CallExpression",
                expression: left,
                arguments: splitTopLevel(projectableKids(view(assertHead)), ctx, ",")
                  .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                  .filter((a) => a !== undefined),
                pos: left.pos,
                end: endOf(assertHead),
              };
              const assertedCall: any = {
                kind: "NonNullExpression",
                expression: innerCall,
                pos: innerCall.pos,
                end: endOf(callHead),
              };
              left = Object.assign({}, projectNode(ck[i], ctx), {
                expression: assertedCall,
                pos: assertedCall.pos,
                end: endOf(ck[i]),
              });
              i += 1;
              continue;
            }
            // **断言里的核是一对下标括号**（第 975 轮）：`a!()[0]!()` 的第二格是
            // `Method(name=""[NotNull([Bracket([0]), !]), Bracket(())])`——**被调用者是
            // 「断言盖着一次下标」**（`(a!()[0])!`），而这一格自己那次调用的实参表是
            // 后面那一对平级的括号。上面那两支只认「核是调用」⇒ 整格丢
            //（实测 `gap-r975-nonnull-index-assert-call`：缺 2 漂 2）。
            // 次序与下标那一支一字不差：先接受体、再把 `!` 套在外面；这一格自己那次调用
            // 由 `projectNode(ck[i])` 那个壳给出（它的被调用者位置正好填这一格）。
            if (assertHead !== undefined && assertHead.get("type") === "Bracket"
              && assertHead.get("startBracket") === "[") {
              const element: any = {
                kind: "ElementAccessExpression",
                expression: left,
                argumentExpression: projectExpression(projectableKids(view(assertHead)), ctx),
                pos: left.pos,
                end: endOf(assertHead),
              };
              const assertedInner: any = {
                kind: "NonNullExpression",
                expression: element,
                pos: element.pos,
                end: endOf(callHead),
              };
              left = Object.assign({}, projectNode(ck[i], ctx), {
                expression: assertedInner,
                pos: assertedInner.pos,
                end: endOf(ck[i]),
              });
              i += 1;
              continue;
            }
            // **核既不是调用、也不是下标 ⇒ 这个 `NotNull` 是**被调用者**（第 975 轮）：
            // `a!()[0]!()` 的第一格是 `Method(name=""[NotNull(a), Bracket(())])`——
            // `!` 挂在**被调用者**身上，实参括号是**平级的兄弟**。这一档照 `projectNode(这一格)`
            // 投出来就是对的（`Method` 自己的 `anonymousCallee` 那一支早就会把
            // 「有 `!` 的被调用者 + 实参表」办成 `CallExpression > NonNullExpression`），
            // 原来这里没有兜底 ⇒ 循环 `break`、`CallExpression[0,4)` 与后面整段一起丢。
            left = projectNode(ck[i], ctx);
            i += 1;
            continue;
          }
          if (bareName === "" && callHead !== undefined
            && callHead.get("type") === "Bracket" && callHead.get("startBracket") === "("
            && endOf(callHead) < endOf(ck[i])) {
            const innerCall = {
              kind: "CallExpression",
              expression: left,
              arguments: splitTopLevel(projectableKids(view(callHead)), ctx, ",")
                .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                .filter((a) => a !== undefined),
              pos: left.pos,
              end: endOf(callHead),
            };
            left = Object.assign({}, projectNode(ck[i], ctx), {
              expression: innerCall,
              pos: innerCall.pos,
              end: endOf(ck[i]),
            });
            i += 1;
            continue;
          }
        }
        break;
      }
      const next = ck[i + 1];
      // **私有成员名 `#x`**（第 131 轮）：产物把 `this.#x` 拆成 `[this, ., #, x]` 两格，
      // 而 TS 那边 `name` 是**一个** `PrivateIdentifier`（区间含那个 `#`，`#` 是它的一部分）。
      // 不合并的话点号后面只剩一个 `#`（投成一个 `Identifier("#")`、区间短一格），
      // 后面那个名字还掉成平级节点（实测 `cls-hash-in-operator.ts` / `cls-private-fields.ts`）。
      if (next.get("type") === "SymbolToken" && textOfNode(next, ctx) === "#" && i + 2 < ck.length) {
        const after = ck[i + 2];
        const at = startOf(next);
        // **私有方法调用 `this.#m()`**（第 138 轮）：点号后面是 `[SymbolToken(#), Method(name="m")]`——
        // `Method` 自己盖住的是 `m()`，名字只占开头那几个字符。照「名字 + 调用」两件事办：
        // `name` 是一个含 `#` 的 `PrivateIdentifier`（区间到名字末尾），外面再套一层 `CallExpression`。
        if (after.get("type") === "Method") {
          const raw = String(after.get("name") ?? "");
          const nameEnd = startOf(after) + raw.length;
          const member = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: { kind: "PrivateIdentifier", text: "#" + raw, pos: at, end: nameEnd },
            pos: left.pos,
            end: nameEnd,
          };
          const call = projectNode(after, ctx);
          left = Object.assign({}, call, { expression: member, pos: member.pos, end: endOf(after) });
          i += 3;
          continue;
        }
        left = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: {
            kind: "PrivateIdentifier",
            text: "#" + textOfNode(after, ctx),
            pos: at,
            end: endOf(after),
          },
          pos: left.pos,
          end: endOf(after),
        };
        i += 3;
        continue;
      }
      // **点号后面那一格是 `!` 包着的方法调用 / 成员**（第 147 轮）：
      // `source.Pre()!.Pre()!` 里 `.Pre()!` 在产物里是**一个** `NotNull(Method(Pre), !)`
      // 单元——名字只占 `Method` 开头的几个字符，`!` 是调用**之后**的断言。
      // 照名字那一支投会得到一个盖住整段 `Pre()` 的 `Identifier`
      // （实测 `string/string-guide.ts`：漂移 6 + 多出 4）。
      if (next.get("type") === "NotNull") {
        const asserted = projectableKids(view(next)).filter(
          (k) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
        );
        const head = asserted[0];
        if (head !== undefined && head.get("type") === "Method") {
          const raw = String(head.get("name") ?? "");
          const nameEnd = startOf(head) + raw.length;
          const member = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: { kind: "Identifier", text: raw, pos: startOf(head), end: nameEnd },
            pos: left.pos,
            end: nameEnd,
          };
          const call = Object.assign({}, projectNode(head, ctx), {
            expression: member,
            pos: member.pos,
            end: endOf(head),
          });
          left = { kind: "NonNullExpression", expression: call, pos: call.pos, end: endOf(next) };
          i += 2;
          continue;
        }
        if (head !== undefined) {
          // 断言里可能是一条**链**而不是一个名字：`Get(units, index)!.SourceRange.Start!` 的
          // `NotNull` 里装着 `PropertyAccess(SourceRange . Start)`。照名字投会得到一个
          // 文本是整条链的 `Identifier`（实测 `dist/ts/typescript/tokens/if/if-set.ts` 一族：
          // 漂移 14 + 缺 7 + 多出 7）。逐格接上去，最后再套 `NonNullExpression`。
          const chain = head.get("type") === "PropertyAccess" ? projectableKids(view(head)) : [head];
          for (const piece of chain) {
            if (piece.get("type") === "SymbolToken") {
              continue;
            }
            left = {
              kind: "PropertyAccessExpression",
              expression: left,
              name: nameOf(piece, ctx),
              pos: left.pos,
              end: endOf(piece),
            };
          }
          left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(next) };
          i += 2;
          continue;
        }
      }
      if (next.get("type") === "Method") {
        // `console.log(1)` 的产物是 `[console, ., Method(name="log")]`——
        // 那个 `Method` 盖住的是 `log(1)`，而**名字**只占开头的几个字符，
        // 所以这里按名字宽度切一段 `Identifier` 出来（TS 的 `Identifier(log)` 正是这一段）。
        const name = String(next.get("name") ?? "");
        // **空名字的 `Method` = 「把左边那个值再调一次」**（第 366 轮，**实测撞到的**）：
        // `x.get()()` 的产物是
        // `PropertyAccess{ Identifier(x), ., Method(name="", child=Method(name="get")) }`
        // （实测 `cjcli` 打出来的单元树）——**外层那个 `Method` 的名字是空的**，
        // 而这条链支（`projectExpression` 里按 `projectableKids` 直接走的那一条）
        // **正是它走的路**（在 `projectNode` 入口按形状拦的探针**没响**——
        // 所以第 348 / 362 两轮一直在**旁边那份副本**上找）。
        // 照下面那条走会造出一个 `Identifier("")` 的成员 ⇒ 语义变成「取一个空名字的属性」
        // ⇒ 降级层报 `cannot call a non-closure value`（**一句话里没有一个字提到空名字**）。
        // 正确的形状是 `CallExpression{ expression: <左边那一段>, arguments: […] }`。
        if (name === "") {
          // **两步**（第 366 轮，**实测撞到的**）：外层那个 `Method` 的**名字是空的**，
          // 而它的第一个子单元就是**内层那一格**（`Method(name="get")`）——
          // 直接 `projectNode(外层)` 得到的是**被调者为空**的调用（那一格要靠下面这段填），
          // 所以先把**内层**当成普通的成员调用折一遍、再把「调用这个结果」套上去。
          const innerKids = projectableKids(view(next));
          const innerMethod = innerKids.length > 0 && innerKids[0].get("type") === "Method" ? innerKids[0] : undefined;
          if (innerMethod !== undefined) {
            // **最里面那一格要一路问到底**（第 975 轮）：`a.b()()().c` 的外层空名字 `Method`
            // 里**套着两格**（`Method("")[Method("")[Method("b")]]`）——原来只问**第一格**
            // 的名字（答空串）⇒ 投出一格名字为空的属性访问，而**最里面那次调用**（`b()`）
            // 连同它上面那一层一起丢（实测 `gap-r973-member-call-thrice-member`：
            // 漂 3 多 2，多出来的正是那格空名字的属性访问）。
            // 折法与 `chainWithOptional` / `chainOnto` 的 Method 分支**共用同一对**
            //（`innermostMethod` + `innermostCallee` + `graftCallee`）：整串壳照
            // `projectNode(next)` 给出的层数接上，只把**最里面那一格**的被调用者换掉。
            left = graftCallee(
              projectNode(next, ctx),
              innermostCallee(left, innermostMethod(next), ctx),
              undefined,
            );
            i += 2;
            continue;
          }
          // **第一个子单元是「名字 + `!`」**（第 962 轮）：`o!.m!()` 的产物是
          // `PropertyAccess([NotNull(o!), ., Method name=""[NotNull(m!), Bracket]])`——
          // 与 `chainWithOptional`（第 166 轮）/ `chainOnto`（第 852 轮）那两处**同形**，
          // 那一份判据立了 `assertedMember`，**这一份副本漏了**。
          // 少了它，下面那句 `expression: left` 会把**被调用者当成 `left`**，
          // 于是成员名 `m` 与它那个 `!` **整段丢**（实测：缺 `PropertyAccessExpression`
          // 与 `Identifier` 各一、`NonNullExpression` 的区间只到 `o!` 那两格）。
          if (innerKids.length > 0 && innerKids[0].get("type") === "NotNull") {
            const asserted = assertedMember(left, innerKids[0], ctx, undefined);
            if (asserted !== undefined) {
              const outerCall = projectNode(next, ctx);
              left = Object.assign({}, outerCall, { expression: asserted, pos: asserted.pos });
              i += 2;
              continue;
            }
          }
          // **第一个子单元是实参括号，而这一格盖着两层调用**（第 962 轮）：`o!()()` 的产物是
          // `[NotNull(o!), Method name=""[Bracket( () )]]`——那一格 Bracket 是**内层**那次
          // 调用的实参表，外层那次调用只体现在 `Method` 自己的区间上（`[2,6)` 盖住 `()()`）。
          // 只折一层会**丢掉内层那一次调用**（实测 `o!()()`：两个 `CallExpression` 都不成形）。
          // 「外面还有没有一层」这一问就是**区间**——是**问得出来**的，所以不必靠形状猜：
          // `(f)()`（`[Bracket]` 就是被调用者、只有一层）那一档的 `Method` 与它的 Bracket **同尾**，
          // 这里因此不会误收（`(f)()` / `q = (f)()` / `return (a)(b)` 三档都在门里钉着）。
          if (innerKids.length > 0 && innerKids[0].get("type") === "Bracket"
            && innerKids[0].get("startBracket") === "(" && endOf(innerKids[0]) < endOf(next)) {
            const innerArgs = {
              kind: "CallExpression",
              expression: left,
              arguments: splitTopLevel(projectableKids(view(innerKids[0])), ctx, ",")
                .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                .filter((a: any) => a !== undefined),
              pos: left.pos,
              end: endOf(innerKids[0]),
            };
            const outerCall = projectNode(next, ctx);
            left = Object.assign({}, outerCall, { expression: innerArgs, pos: innerArgs.pos, end: endOf(next) });
            i += 2;
            continue;
          }
          const outerCall = projectNode(next, ctx);
          left = Object.assign({}, outerCall, { expression: left, pos: left.pos });
          i += 2;
          continue;
        }
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
      // **点号后面那一段是一个 `NotNull`**（第 105 轮）：`Get(…)!.SourceRange.Start!` 的产物是
      // `[…, NotNull(Get…!), ., NotNull(PropertyAccess(SourceRange.Start))]`——第二个 `!`
      // 的单元里**装着一段点号链**，而那个 `!` 在 TS 那边套住的是**整条链**
      // （`NonNullExpression > PropertyAccessExpression > PropertyAccessExpression > …`）。
      // 照下面那一支会把它当成一个成员名（`nameOf` 取到整段原文），于是
      // `Identifier` / `PropertyAccessExpression` / `NonNullExpression` 三处同时错位
      // （实测漂移 76 + 30 + 33、多出 71 + 75）。
      if (next.get("type") === "NotNull") {
        const inner = projectableKids(view(next)).filter(
          (k) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
        );
        const target = inner.length > 0 ? inner[0] : undefined;
        if (target !== undefined && target.get("type") === "PropertyAccess") {
          const members = projectableKids(view(target));
          if (members.length > 0) {
            left = {
              kind: "PropertyAccessExpression",
              expression: left,
              name: nameOf(members[0], ctx),
              pos: left.pos,
              end: endOf(members[0]),
            };
            for (let j = 1; j + 1 < members.length; j += 2) {
              if (!isSymbol(members[j], ".")) break;
              left = {
                kind: "PropertyAccessExpression",
                expression: left,
                name: nameOf(members[j + 1], ctx),
                pos: left.pos,
                end: endOf(members[j + 1]),
              };
            }
          }
        } else if (target !== undefined) {
          left = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: nameOf(target, ctx),
            pos: left.pos,
            end: endOf(target),
          };
        }
        left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(next) };
        i += 2;
        continue;
      }
      // 成员名**永远是 `Identifier`**（TS 那边 `a.import` 的 `name` 就是一个文本为那个词的
      // `Identifier`，不是 `ImportKeyword`）：产物那边它可能已经被 `KeywordCloseRule`
      // 升级成 `<Keyword>`，所以这里按**名字宽度**切一段，而不是把那个词按词法身份投出来。
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
    // **链尾紧跟着可选链的续接**（第 101 轮）：`this.Variables.get(key)?.Value ?? null` 的产物是
    // `[…链…, BinaryOperator(??)( NullConditionalOperator(Value), ??, null )]`——
    // `?.` 之后的成员被收成一个 `NullConditionalOperator` 单元。TS 那边它是**在链上加一格**
    // （`PropertyAccessExpression` + `questionDotToken`），所以这里要先把它接到 `left` 上，
    // 再拿剩下的运算符折二元。
    const tail0 = ck[i];
    const spliceOptional = (unit) => {
      const inner = projectableKids(view(unit));
      if (inner.length === 0 || inner[0].get("type") !== "NullConditionalOperator") return null;
      const extended = chainWithOptional(left, inner[0], ctx);
      return { extended, rest: inner.slice(1) };
    };
    if (tail0.get("type") === "NullConditionalOperator") {
      const extended = chainWithOptional(left, tail0, ctx);
      if (i + 1 >= ck.length) return extended;
      return foldBinaryFrom(extended, ck.slice(i + 1), ctx);
    }
    if (tail0.get("type") === "BinaryOperator" || tail0.get("type") === "LogicalOperator") {
      const spliced = spliceOptional(tail0);
      if (spliced !== null) {
        const folded = foldBinaryFrom(spliced.extended, spliced.rest, ctx);
        // **右操作数后面还跟着链的续格**（第 115 轮）：`this.Start?.Document === other.Start?.Document`
        // 的产物把「右操作数的 `.Start` 与 `?.Document`」平铺在 `BinaryOperator` **外面**
        //（左操作数的 `?.Document` 却在里面）。不接的话右边只到 `other` 为止：
        // 漂移 + `PropertyAccessExpression` / `Identifier` 各缺一片，还多出一个短区间节点。
        if (folded !== undefined && folded.right !== undefined && i + 1 < ck.length) {
          const right = chainOnto(folded.right, ck.slice(i + 1), ctx);
          if (right !== undefined) {
            folded.right = right;
            folded.end = right.end;
          }
        }
        return folded;
      }
    }
    return foldBinaryFrom(left, ck.slice(i), ctx);
  }
  // ---- 2. `as` / `satisfies`（第 96 轮）----
  //
  // 产物把 `expr as T` 记成**两个平级单元**：`Identifier(error)` 与 `As(类型)`——
  // 运算符词右边的类型装在 `As` 里，**左边的操作数是它的前一个兄弟**。
  // 原来这里既不认 `As` 也不认 `satisfies`，于是整段只剩第一个操作数
  // （实测缺 `AsExpression` + 缺 `AnyKeyword` + 多出一个只盖住 `as any` 的节点）。
  const asIndex = kids.findIndex((k) => k.get("type") === "As" || k.get("type") === "Satisfies");
  if (asIndex > 0) {
    // **`as` / `satisfies` 是关系级运算符**（`operatorRank` 给 7，与 `<` / `in` / `instanceof` 同档）。
    // 所以它左边如果坐着**更松**的运算符（`,` = -1、赋值 = 0、`||` / `??` = 1、`&&` = 2、
    // `|` = 3、`^` = 4、`&` = 5、相等 = 6），**外层节点是那个运算符**，`as` 只绑到它右边那一小段。
    // 少了这一条，`c = a as number` 会把整条赋值当成 `as` 的左操作数：
    // 实测产物是 `AsExpression[c = a as number]`（少 12 个字符）外加一个盖住 `c = a` 的
    // `BinaryExpression`，而 TS 是 `BinaryExpression(c, =, AsExpression(a, number))`。
    // 切完交给 `foldBinaryFrom` 递归——那一支自己会把 `as` 折在正确的层级上。
    let cutIndex = -1;
    let cutRank = 999;
    for (let i = 1; i < asIndex; i++) {
      if (!isOperatorUnit(kids[i], ctx)) continue;
      const rank = operatorRank(textOfNode(kids[i], ctx));
      if (rank < cutRank) {
        cutRank = rank;
        cutIndex = i;
      }
    }
    if (cutIndex > 0 && cutRank < 7) {
      return foldBinaryFrom(projectExpression(kids.slice(0, cutIndex), ctx), kids.slice(cutIndex), ctx);
    }
    // **串起来的 `as` / `satisfies` 要一路折到底**（第 154 轮）：`a as const satisfies B`
    // 的产物是 `[a, As(const), Satisfies(B)]` 三格——只取第一个就把后面那个整个丢了
    // （实测 `stmt-adversarial-shapes.ts`：缺 `SatisfiesExpression` / `TypeReference` / `Identifier`）。
    // 折法与 TS 一致：外层 `SatisfiesExpression`、里面套 `AsExpression`。
    // **展开位上的 `as` / `satisfies`**（第 724 轮）：`f(...xs as T)` 的产物是两个
    // **平级**单元 `[Spread(…xs), As(T)]`，而 TS 那边 `as` 是**更松**的那一层——
    // `...(xs as T)` ⇒ `SpreadElement{ expression: AsExpression }`。
    // 照平级折就成了 `AsExpression{ expression: SpreadElement }`：**两层套反了**。
    //
    // 症状不是「形状漂了」而是**静默错值**：降级层看 `arguments` 里那一格是
    // `AsExpression`（不是 `SpreadElement`）⇒ 那条实参**不展开**、整个数组被原样
    // 当成**一个**实参递进去（`rest(...[1, 2, 3] as any)` 的 `a.length` 给 **1**、
    // `Math.max(...[1, 5, 3] as any)` 给 **NaN**、`mixed(...xs as any)` 的 `a` 是那个数组）。
    //
    // 修法：左边那一格是 `Spread` 时，先把它照常投影（`[Spread]` 给的就是
    // `SpreadElement{ expression }`），**把里面那个操作数取出来**当 `as` 的左操作数，
    // 再把整条 `as` / `satisfies` 链**套回 `SpreadElement` 里面**——
    // 括号化那一档（`...([1, 2, 3] as any)`）产物本来就把它装在同一格，所以一直是对的，
    // 这一句只是把**同一件事的另一种排版**折成同一个形状。
    const spreadFirst = asIndex === 1 && kids[0].get("type") === "Spread";
    let node = projectExpression(kids.slice(0, asIndex), ctx);
    if (spreadFirst && node !== undefined && node.kind === "SpreadElement") {
      node = node.expression;
    }
    let at = asIndex;
    while (at < kids.length) {
      const unit = kids[at];
      if (unit.get("type") !== "As" && unit.get("type") !== "Satisfies") {
        break;
      }
      const typeKids = projectableKids(view(unit));
      const type = typeKids.length > 0 ? projectTypeExpression(typeKids, ctx) : undefined;
      node = {
        kind: unit.get("type") === "Satisfies" ? "SatisfiesExpression" : "AsExpression",
        expression: node,
        type,
        pos: node === undefined ? startOf(unit) : node.pos,
        end: endOf(unit),
      };
      at += 1;
    }
    // **套回 `SpreadElement` 里**（`end` 跟着里面那个节点走，`pos` 从 `...` 起算）。
    const wrapSpread = (result:any) => spreadFirst && result !== undefined
      ? { kind: "SpreadElement", expression: result, pos: startOf(kids[0]), end: result.end }
      : result;
    if (at >= kids.length) return wrapSpread(node);
    return wrapSpread(foldBinaryFrom(node, kids.slice(at), ctx));
  }
  // ---- 3. 二元 / 赋值 ----
  //
  // **切在优先级最低的那个运算符上**（第 88 轮）：`x && y || z` 的 TS 是 `(x && y) || z`，
  // 按**第一个**运算符切会得到 `x && (y || z)`（优先级反了）。同级取**最左**（左结合）。
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
  // ---- 3b. 调用链的末尾那一格是 `(` 括号（第 168 轮）----
  //
  // `y(function () { … })()` 的产物是 `[Method(name="y"), Bracket( () )]`——末尾那对括号是
  // **对调用结果再调一次**的实参表，而它不在 `Method` 里（`Method` 的区间只到函数体那个 `}`）。
  // TS 那边是外面再套一层 `CallExpression`，区间一直到那个 `)`。
  // 不接的话外层调用整个没有、内层终点也短两格（实测 `stmt-asi-paren-call.ts`：
  // `BinaryExpression` 与 `CallExpression` 各漂 2 + 多出一个短区间节点）。
  // 与上面下标那一支同款：先折前面那段，再套一层。
  if (
    kids.length >= 2 &&
    kids[kids.length - 1].get("type") === "Bracket" &&
    kids[kids.length - 1].get("startBracket") === "("
  ) {
    const bracket = kids[kids.length - 1];
    const base = projectExpression(kids.slice(0, kids.length - 1), ctx);
    return {
      kind: "CallExpression",
      expression: base,
      arguments: splitTopLevel(projectableKids(view(bracket)), ctx, ",")
        .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
        .filter((a) => a !== undefined),
      pos: base.pos,
      end: endOf(bracket),
    };
  }
  return projectNode(kids[0], ctx);
```

# private method parenthesizedOf:(unit:any, ctx:any)=>any

括号表达式 `( … )` → `ParenthesizedExpression`（括号本身**属于**这个节点，与 TS 一致）。

产物那边值位的括号就是一个 `Bracket` 单元（`startBracket="("`），内容在它里面。
判据只认「括号是这一层的操作数」——实参表 / 形参表 / 类型括号不会走到这里
（那些括号的父单元是 `Method` / `Function` / `Lamda` / `Signature` / 类型容器，各走各的投影路径）。

```ts
  const inner = projectableKids(view(unit));
  return {
    kind: "ParenthesizedExpression",
    expression: inner.length > 0 ? projectExpression(inner, ctx) : undefined,
    pos: startOf(unit),
    end: endOf(unit),
  };
```

# private method IsChainBaseNode:(node:any)=>boolean

`node` 能不能当**一条可选链的基名**（`?.` 左边那一格）——**渲染侧**的版本。

它与 token 层 [tokens/property-access.xl.md](./tokens/property-access.xl.md) 的 `IsChainBase`
问的是同一个问题，但**判的不是同一个东西**：那边判的是 `Token`（`instanceof Identifier` 那些），
这里判的是**产物的一格**（`Map`，`type` 是标签名）。两处不能合并——层级不同。

**`Bracket` 按标签名认不出来**，所以从**属性**上判：
`<Bracket startBracket="(" …>` 在产物里是 `type=Bracket` 加一个 `startBracket` 属性，
只有它才可能是链基名（`(a + b)?.c` 是 `ParenthesizedExpression`，`a[0]?.b` 的 `a[0]` 早就是
`PropertyAccess` 了）——所以这里**直接放掉 `Bracket`**：
`a?.b?.[c]` 那种形状里，末尾那个 `[c]` 也会被算成「收尾括号」，
认它就会把 `?.b` 与 `?.[c]` 合成一格（token 层那一版实测踩过，见 `null-conditional-operator.xl.md`）。

关键字（`return` / `case` / `typeof` …）在产物里是 `Identifier`，要按**文本**排掉。

```ts
if (!(node instanceof Map)) {
  return false;
}
const type = node.get("type");
if (type === "Identifier" || type === "Keyword") {
  const value = node.get("value");
  const text = typeof value === "string" ? value : "";
  return !(
    text === "return" ||
    text === "throw" ||
    text === "case" ||
    text === "default" ||
    text === "else" ||
    text === "do" ||
    text === "break" ||
    text === "continue" ||
    text === "yield" ||
    text === "typeof" ||
    text === "void" ||
    text === "in" ||
    text === "instanceof" ||
    text === "new" ||
    text === "import" ||
    text === "await" ||
    text === "super"
  );
}
return (
  type === "Method" ||
  type === "PropertyAccess" ||
  type === "NullConditionalOperator" ||
  type === "New" ||
  type === "ArrayLiteral" ||
  type === "ObjectLiteral" ||
  type === "String" ||
  type === "ConstString"
);
```

# method isIndexFirstUnit:(unit:any, ctx:any)=>bool

**这一格是不是「以一次下标开头」**（第 333 轮）——`isIndexFirstUnit` 是给
**非空断言后面那一串**用的判据。

**为什么需要它**：`!` 是一个**单元**，它只把**左边**包起来，而**右边**那一格
谁也不认（它不是下标位、也不是数组字面量位）——于是 token 层会按**它能认的那个形状**
成形。三种都实测到了：

| 写法 | token 层给的形状 |
| --- | --- |
| `o.b![1]` | `[NotNull(o.b), ArrayLiteral(1)]`（数组字面量当兄弟） |
| `o.b![1]![0]` | `[NotNull(o.b), NotNull(ArrayLiteral(1)), ArrayLiteral(0)]`（`[1]!` 又是一格） |
| `data.list![0].id` | `[NotNull(data.list), PropertyAccess(ArrayLiteral(0), ., id)]`（`.id` 折到了那个方括号上） |

三者的**头一格都是下标**——所以链那一支要认的不只是「兄弟是个方括号」，
而是「这一格**以**一次下标开头」（里面可能再套一层 `!`、也可能后面还接着 `.id`）。

**`PropertyAccess` 也要往里看**：`[0].id` 那一格的外壳是属性访问，
而它的**第一格**才是那个方括号——判据递归一层就够。

```ts
const kind = unit.get("type");
if (kind === "ArrayLiteral" || isIndexBracket(unit)) return true;
if (kind === "NotNull" || kind === "PropertyAccess") {
  const inner = projectableKids(view(unit));
  if (inner.length >= 1) return isIndexFirstUnit(inner[0], ctx);
}
return false;
```

# private method isBareCallMethod:(unit:any, ctx:any)=>bool

**这一格是不是「裸的一次调用」**（第 965 轮）——名字为空、并且第一个实义子单元是
**内层 `Method` / 实参括号 / `NotNull`** 的 `Method`。

**为什么要单独立一条**：`a?.[b]()()` 的 NCO 里第二格是
`Method(name="")[Bracket(())]`——那**是一次调用**，而**外面这一次调用只体现在它自己的区间上**
（与第 962 轮「外面还有没有一层」是同一句话）。这种单元在交给 `chainOnto` 之前
**不能摊开**：摊成裸括号之后那次调用就没有节点了、外层 `CallExpression` 的区间也短一格
（实测 `gap-r964-opt-index-call-twice`：漂 2）。所以「摊开」那一步要先问这一句，
认了就把**整格**交给 `chainOnto`（它第 965 轮认了这一档）。

`NotNull` 那一档同样要挡住摊开：`a?.b!()()` 里那一格是
`Method(name="")[NotNull(b, !), …]`，摊开之后断言与名字都会掉出去。

```ts
  if (unit === undefined || unit === null || unit.get("type") !== "Method") return false;
  if (String(unit.get("name") ?? "") !== "") return false;
  const kids = projectableKids(view(unit)).filter((k: any) => k.get("type") !== "GenericType");
  if (kids.length === 0) return false;
  const head = kids[0];
  return head.get("type") === "Method"
    || (head.get("type") === "Bracket" && head.get("startBracket") === "(")
    || head.get("type") === "NotNull";
```

# method isCallFirstUnit:(unit:any, ctx:any)=>bool

**这一格是不是「以一次调用开头」**（第 692 轮）——`isIndexFirstUnit` 的姊妹。

**为什么需要它**：`o["m"]()` 单独出现时 token 层给的是**三格平级**
（`[o, Bracket([m]), Bracket(())]`，见 `tokens/property-access.xl.md` 里那一段：
`MethodCloseRule` 只认 `Identifier` 当被调用者），可在它后面再接一个后缀之后，
形状**换成了两格**：

| 写法 | token 层给的形状 |
| --- | --- |
| `o["m"]()` | `[Identifier(o), Bracket([m]), Bracket(())]`（三格平级） |
| `o["m"]().v` | `[PropertyAccess(o, [m]), PropertyAccess(Bracket(()), ., v)]` |

第二格那份把**调用括号**与**它后面的后缀**装进了同一个 `PropertyAccess` 外壳里——
`projectExpression` 的链那一支（判据是「`kids[1]` 是 `.` 或下标」）于是整个进不来，
`kids[0]` 单独投出去、后面那半段丢。所以链那一支要认的不只是「第二格是个点号/下标」，
还要认「第二格**以一次调用开头**」。

**判据只往里看一层、且只认 `PropertyAccess` / `NotNull` / `Method` 外壳**：
裸的 `(` 括号兄弟（`f()()` 那一种）**不在这里**——它的归属由 `projectExpression`
末尾那条「调用链的末尾那一格是 `(` 括号」（3b）管，放开会换掉既有形状。

**`Method` 也算一格**（第 962 轮）：`o!()()` 的产物是
`[NotNull(o!), Method name=""[Bracket( () )]]`——第二格**本身就是那次调用**
（名字为空 ⇒ 它要说的正是「把左边那个值再调一次」）。这一档原来进不了链那一支
（入口判据答 `false` ⇒ 链那个循环在 `break` 上停住、**整格消失**，实测只剩一个
`NonNullExpression`、两个 `CallExpression` 都不成形）。**裸的 `(` 兄弟仍然不在名单里**，
理由与上面那一句一字不差。

```ts
if (unit === undefined || unit === null) return false;
const kind = unit.get("type");
// **这一格自己就是一次调用**（第 966 轮）：`a!()!()` 的产物是
// `[NotNull(a, !), Method(name=""[NotNull(Bracket(()), !), Bracket(())])]`——
// 第二格是**一次调用**（名字为空），而链那一支的入口判据原来只认
// `PropertyAccess` / `NotNull` 外壳**里**第一格是实参括号这一形状 ⇒ 答否 ⇒
// 链整个进不来、`kids[0]` 单独投出去（实测 `gap-r964-nonnull-call-assert-call`：
// 只剩一个盖到 `a!` 的 `NonNullExpression`，两个 `CallExpression` 都不成形）。
// **为什么这一档是安全的**：`Method` 是一个**完整的单元**（那次调用有自己的区间），
// 与「平级的裸 `(` 兄弟」**不是一件事**——后者仍然由 `projectExpression` 末尾 3b 那一支管。
// 它的「以一次调用开头」有两种壳：实参括号自己（`a!()()`）、或断言盖着实参括号
//（`a!()!()` 里那一格是 `NotNull(Bracket(()), !)`）。
if (kind === "Method") {
  const mKids = projectableKids(view(unit)).filter((k: any) => k.get("type") !== "GenericType");
  const mHead = mKids.length > 0 ? mKids[0] : undefined;
  if (mHead === undefined) return false;
  if (mHead.get("type") === "Bracket" && mHead.get("startBracket") === "(") return true;
  if (mHead.get("type") === "NotNull") {
    const asserted = projectableKids(view(mHead)).filter(
      (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
    );
    const inner = asserted.length > 0 ? asserted[0] : undefined;
    if (inner === undefined) return false;
    if (inner.get("type") === "Bracket" && inner.get("startBracket") === "(") return true;
    // **断言里的核是一个下标括号**（第 975 轮）：`a!()[0]!()` 的第二格是
    // `Method(name=""[NotNull(Bracket([0]), !), Bracket(())])`——被调用者是「先下标、再断言」，
    // 而这一格自己那次调用的实参括号是**平级的兄弟**（那一格盖着整段 `[0]!()`）⇒
    // 它同样是「以一次调用开头」。少了这一句链那一支整个进不来
    //（实测 `gap-r975-nonnull-index-assert-call`：缺 2 漂 2）。
    if (inner.get("type") === "Bracket") return isIndexFirstUnit(inner, ctx);
    // **断言里的核自己也是一次调用**（第 975 轮）：`a!()()!()` 的第一格是
    // `NotNull(Method(name=""[Bracket(())]), !)`——`!` 盖在一格 `Method` 上，而那一格
    // 本身就是「以一次调用开头」。上面那一句只认「核是实参括号」⇒ 判据答否 ⇒
    // 链那一支整个进不来（实测 `gap-r973-nonnull-call-twice-assert`：缺 3 漂 1）。
    // 递归问它即可——判据与 `Method` 那一支同源（都问「这一格是不是以一次调用开头」）。
    return isCallFirstUnit(inner, ctx);
  }
  // **头一格自己又是一格 `Method`**（第 972 轮，**普查当场红的**）：`a!()()().c` 的第二格是
  // `PropertyAccess(Method(name=""[Method(name=""[Bracket(())])]), ., c)`——两格 `Method`
  // 说的是**三次**调用（每一格空名字的 `Method` 都盖着一次调用，见第 971 轮那一族）。
  // 头一格是 `Method` 时它自己就是「里面那次调用」⇒ 这一格同样是「以一次调用开头」，
  // 判据与上面那一档同源，递归问它即可（`Method` 是**完整单元**，与平级的裸 `(` 兄弟不是一件事）。
  // 少了这一句：第 971 轮补的 `head.get("type") === "Method" && isCallFirstUnit(head, ctx)`
  // 在这里答否 ⇒ 链那一支整个进不来、`kids[0]` 单独投出去（实测 `gap-r971-nonnull-call-thrice-member`：
  // 只剩一个盖到 `a!` 的 `NonNullExpression`，缺 5 格）。
  if (mHead.get("type") === "Method") return isCallFirstUnit(mHead, ctx);
  return false;
}
if (kind === "PropertyAccess" || kind === "NotNull") {
  const inner = projectableKids(view(unit));
  if (inner.length >= 1) {
    const head = inner[0];
    if (head.get("type") === "Bracket" && head.get("startBracket") === "(") return true;
    // **头一格是「外面那次调用」在 `Method` 里**（第 971 轮，**普查当场红的**）：
    // `a!()().c` 的第二格是
    // `PropertyAccess(Method(name=""[Bracket(())]), ., c)`——实参括号在 `Method`
    // **里面**，于是这一格同样是「以一次调用开头」。原来这里只认**平级的** `Bracket`，
    // 于是链那一支整个进不来、`kids[0]` 单独投出去：实测只剩一个盖到 `a!` 的
    // `NonNullExpression`，两个 `CallExpression`、`PropertyAccessExpression` 与
    // `Identifier(c)` 一起丢（`gap-r964-nonnull-call-twice-member`，缺 4 格）。
    // 判据只多问一句 `isCallFirstUnit(头一格)`，认的仍然只有 `Method` 那一档
    // ——**平级的裸 `(` 兄弟照旧不在名单里**（理由与上面那一句一字不差）。
    // **头一格是 `NotNull` 时也要递归问**（第 975 轮）：`a!()![0]` 的第二格是
    // `PropertyAccess([NotNull(Bracket(()), !), Bracket([0])])`——那一格的头是
    // 「断言盖着一次调用」，同样是「以一次调用开头」；原来只认 `Method` ⇒ 链那一支
    // 整个进不来（实测 `gap-r975-nonnull-call-assert-index`：缺 3 漂 1）。
    if (head.get("type") === "NotNull") return isCallFirstUnit(head, ctx);
    return head.get("type") === "Method" && isCallFirstUnit(head, ctx);
  }
}
return false;
```

# private method assertedMember:(left:any, unit:any, ctx:any, questionDot:any)=>any

把一格**「成员名 + `!`」**（`NotNull`）折成 TS 的 `NonNullExpression`（第 852 轮立）。
返回**已经套好断言的那条链**，`left` 是它的受体；折不出来（没有 `!`、没有名字）给 `undefined`。

为什么单独立一格：同一形状**在两条路上各出现一次**，而两条路原来各折各的——

- `NullConditionalOperator` 的**第一格**就是 `NotNull`（`a?.b!`：产物
  `[Identifier(a), NCO(NotNull([Identifier(b), !]))]`，第 166 轮）；
- `?.` 之后的**续格**是「名字为空、被调用者带 `!`」的 `Method`
  （`a?.b!()`：产物 `NCO[Method name=""[NotNull(b, !), Bracket]]`；
  `a?.b!.c!()`：`NCO[NotNull(b, !), ., Method name=""[NotNull(c, !), Bracket]]`）。

前者走了「先按名字折一格、再把 `!` 套上去」（第 166 轮），后者**两处调用点都没走**
（`chainWithOptional` 与 `chainOnto` 都无条件按 `name` 折一格属性访问）⇒
`name` 是空串时投出一个**名字为空**的 `PropertyAccessExpression`：实测
`a?.b!()` 缺 `NonNullExpression`（`gap-c-optchain-nonnull-01`）、
`a?.b!.c!()` 里 `NonNullExpression` / `PropertyAccessExpression` / `Identifier` 三处漂
（`gap-c-optchain-nonnull-02`）。

**次序是语义**：先把**成员**接到 `left` 上，再把 `!` 套在**整条链**上
（TS 是 `NonNull(PropertyAccess(…, b))`，不是「名字叫 `b!`」）；
`?.` 那一格（`questionDot`）挂**内层**那个属性访问（TS 就是这么放的），
所以调用方传的是**那一格 `?.` 自己**的位置（第一格那一路传 NCO 的起点）。

```ts
  const inner = projectableKids(view(unit)).filter((k: any) => !INVISIBLE.has(k.get("type")));
  const bang = inner.find((k: any) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!");
  const nameUnit = inner.find((k: any) => k !== bang);
  if (nameUnit === undefined || bang === undefined) return undefined;
  let node: any;
  // **断言里那一格是一个下标括号**（第 966 轮）：`a?.['b']!` 的 NCO 内容是
  // `NotNull([Bracket(['b']), !])`——名称位拿到的是**一对方括号**，而不是一个名字。
  // 照下面那条通用支走会 `nameOf(那对括号)` ⇒ 投出一个文本是 `['b']` 的 `Identifier`
  //（实测 `gap-r964-opt-index-assert-member`：缺 `ElementAccessExpression` / `StringLiteral`、
  //  多一格名叫 `['b']` 的属性访问）。**那一格是下标**：与 `chainOnto` 里
  // `Bracket(startBracket="[")` 那一支**是同一件事**——先建 `ElementAccessExpression`，
  // 再把 `!` 套在它外面（次序与 TS 一致：`NonNull(ElementAccess(a, 'b'))`）。
  if (nameUnit.get("type") === "Bracket" && nameUnit.get("startBracket") === "[") {
    node = {
      kind: "ElementAccessExpression",
      expression: left,
      argumentExpression: projectExpression(projectableKids(view(nameUnit)), ctx),
      pos: left.pos,
      end: endOf(nameUnit),
    };
    if (questionDot !== undefined) node.questionDotToken = questionDot;
  } else if (nameUnit.get("type") === "Bracket" && nameUnit.get("startBracket") === "(") {
    // **断言里的核是一对实参括号**（第 975 轮）：`a?.()!()` 的 NCO 内容是
    // `NotNull([Bracket(()), !])`——那个括号是**一次调用**（`a?.()`），`!` 套在它的结果上
    //（TS：`NonNull(CallExpression(a with ?.) )`，`?.` 挂在那次调用上）。
    // 上面那条只认**下标**括号，于是这一格落到下面那条通用支 ⇒ 投出一格名字叫 `()` 的
    // 属性访问（实测 `gap-r975-opt-call-assert-call-twice`：漂 1 多 2）。
    // 折法与上面那条下标支**一字不差**（先建那一格、再把 `!` 套在外面）。
    node = {
      kind: "CallExpression",
      expression: left,
      arguments: splitTopLevel(projectableKids(view(nameUnit)), ctx, ",")
        .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
        .filter((a: any) => a !== undefined),
      pos: left.pos,
      end: endOf(nameUnit),
    };
    if (questionDot !== undefined) node.questionDotToken = questionDot;
  } else if (nameUnit.get("type") === "PropertyAccess") {
    // **里面那条链也要逐格接**（第 166 轮）：`a?.b.c!` 的 NCO 内容是
    // `NotNull(PropertyAccess([b, ., c]))`，TS 那边是两层
    // `PropertyAccessExpression`（第一格带 `?.`）外面套 `NonNullExpression`——
    // 只按名字投一格会把 `b.c` 当成一个名字（实测区间 75→81、两个 `Identifier` 都漂）。
    const members = projectableKids(view(nameUnit));
    let cur = left;
    let pending: any = questionDot;
    for (const member of members) {
      if (member.get("type") === "NullConditionalOperator") {
        cur = chainWithOptional(cur, member, ctx);
        pending = undefined;
        continue;
      }
      if (isDot(member, ctx) || !isNameNode(member)) {
        continue;
      }
      const one: any = {
        kind: "PropertyAccessExpression",
        expression: cur,
        name: nameOf(member, ctx),
        pos: cur.pos,
        end: endOf(member),
      };
      if (pending !== undefined) {
        one.questionDotToken = pending;
        pending = undefined;
      }
      cur = one;
    }
    node = cur;
  } else if (nameUnit.get("type") === "Method") {
    // **断言里的核是一格调用单元**（第 975 轮）：`a?.b()!` 的 NCO 内容是
    // `NotNull([Method(name="b"), !])`——`!` 盖在**那次调用**的结果上
    //（TS：`NonNull(CallExpression(PropertyAccess(a?.b)))`）。照下面那条通用支走会把
    // `b()` 整段当成一个名字（实测 `gap-r973-opt-call-assert-index`：多一格名字叫
    // `b()` 的属性访问、缺那一格 `CallExpression`，两个方向一起响）。
    // 折法与 `chainWithOptional` / `chainOnto` 的 Method 分支**共用同一对**
    //（`innermostMethod` + `innermostCallee` + `graftCallee`）：先走到最里面那一格、
    // 把她当被调用者接上，`?.` 挂在**新接出来那一格**上（TS 的放法），
    // 没那么一格时交给 `graftCallee` 挂到最里面那次调用上。
    const callee = innermostCallee(left, innermostMethod(nameUnit), ctx);
    const built = callee !== left;
    if (built && questionDot !== undefined) callee.questionDotToken = questionDot;
    node = graftCallee(projectNode(nameUnit, ctx), callee, built ? undefined : questionDot);
  } else {
    node = {
      kind: "PropertyAccessExpression",
      expression: left,
      name: nameOf(nameUnit, ctx),
      pos: left.pos,
      end: endOf(nameUnit),
    };
    if (questionDot !== undefined) node.questionDotToken = questionDot;
  }
  return {
    kind: "NonNullExpression",
    expression: node,
    pos: left.pos,
    end: endOf(bang),
  };
```

# private method innermostMethod:(unit:any)=>any

**一路走到「里面没有 `Method` 了」那一格**（第 971 轮）：`unit` 本身算第一格。

一个 `Method` 单元里可以盖着**好几层调用**——`a?.b()()()` 的 NCO 里是
`Method(name="")[Method(name="")[Method(name="b")]]`：名字为空的每一格都是「对结果再调一次」，
而**真正带成员名的是最里面那一格**。所以问成员名、问区间都要先走到最里面那一格——
只问第一格的名字会把它读成空名字（第 966 轮那一版就是这么走的，见
`gap-r964-opt-call-triple`：三层只折出两层）。两处调用点（`chainWithOptional` 的
「被调用者是 `Method`」那一支、`chainOnto` 的 Method 分支）**共用这一份**。

```ts
  let deepest = unit;
  let depth = 0;
  while (depth < 32) {
    const down = projectableKids(view(deepest)).filter((k: any) => k.get("type") !== "GenericType");
    const next = down.length > 0 ? down[0] : undefined;
    if (next === undefined || next.get("type") !== "Method") break;
    deepest = next;
    depth = depth + 1;
  }
  return deepest;
```

# private method graftCallee:(call:any, callee:any, questionDot:any)=>any

**把一条调用链最里面那一格的被调用者换成 `callee`**（第 971 轮）。

`projectNode(那一格 Method)` 投出来的是**这一格里所有的调用层**（`CallExpression` 套
`CallExpression`），而 `?.` 与成员名属于**最里面**那一层（TS 的放法：`a?.b()()()` 里 `?.`
挂在 `a?.b` 那个属性访问上）。所以换的时候要**下到最里面那一格调用**再换——只换最外层那份
`expression` 会把中间几层的被调用者一起丢掉（实测 `gap-r964-opt-call-triple`：产物是
`CallExpression[0,10) > CallExpression[0,8) > Identifier(a)`，`.b` 与最里面那次调用都不见了）。

`questionDot` 非空时挂在**最里面那一格调用**上（`a?.()()` 那一族：`?.` 挂在 `a?.()` 那次调用
上、不是外层那次）；`callee` 自己带着 `?.`（`a?.b()()()` 那一族）时调用方传 `undefined`。
每一层的 `pos` 都取 `callee.pos`——一条调用链的每一层都从链的起点起算。

```ts
  const graft = (call: any): any => {
    if (call === undefined || call === null || typeof call !== "object") return callee;
    const inner = call.expression;
    const deeper = inner !== undefined && inner !== null && inner.kind === "CallExpression";
    const node: any = Object.assign({}, call, {
      expression: deeper ? graft(inner) : callee,
      pos: callee.pos,
    });
    if (deeper === false && questionDot !== undefined) node.questionDotToken = questionDot;
    return node;
  };
  return graft(call);
```

# private method innermostCallee:(left:any, deepest:any, ctx:any)=>any

**把「最里面那一格 `Method`」的被调用者建出来**（第 975 轮）——`innermostMethod` 的搭档，
`graftCallee` 的输入。

一个空名字的 `Method` 单元里可以套着好几层调用（见 `innermostMethod`），而**最里面那一格**
说的正是「对 `left` 的那一次调用」。它的核有三种，折法各不相同：

| 核 | 写法 | 要建的那一格 |
| --- | --- | --- |
| **一个名字** | `Method("")[Method("b")]` | 先接一格 `PropertyAccessExpression` |
| **一对实参括号** | `Method("")[Bracket(…)]` | 「括号那一次」要**单独**建成一格 `CallExpression` |
| 都不是 | `Method("")` | 就是 `left` 自己（原样返回） |

**第二档为什么必须单独建**：这一格的区间**比它的实参括号更靠右**（第 966 轮那句话：
一格说两次调用）——`projectNode(那一格 Method)` 只投得出**外面**那次调用，
里面那次（括号那一次）没有节点。判据与另外五处**一字不差**：
`endOf(括号) < endOf(这一格)`。

**这一份原来是五处各写一遍**（第 975 轮收拢）：`projectExpression` 的链循环、
`chainWithOptional` 的「第一格是 `Method`」与子链成员循环、`chainOnto` 的 Method 分支
与子链成员循环——**前两处只认名字那一档**，于是「括号 + 再调」那一路一到三层就少一层
（实测 `gap-r973-opt-assert-call-thrice` / `gap-r973-opt-index-call-thrice` 一族：
`a?.b!()()()` 缺 3、`a?.[b]()()()` 漂 1）。

`?.` **不在这里挂**：四种调用点各有各的放法（`chainWithOptional` 挂在**新接出来那一格**上，
`chainOnto` 那一支没有 `?.`）——调用方自己决定。

```ts
  const name = String(deepest.get("name") ?? "");
  if (name !== "") {
    const at = startOf(deepest);
    return {
      kind: "PropertyAccessExpression",
      expression: left,
      name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
      pos: left.pos,
      end: at + name.length,
    };
  }
  const kids = projectableKids(view(deepest)).filter((k: any) => k.get("type") !== "GenericType");
  const head = kids.length > 0 ? kids[0] : undefined;
  if (head !== undefined && head.get("type") === "Bracket" && head.get("startBracket") === "("
    && endOf(head) < endOf(deepest)) {
    return {
      kind: "CallExpression",
      expression: left,
      arguments: splitTopLevel(projectableKids(view(head)), ctx, ",")
        .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
        .filter((a: any) => a !== undefined),
      pos: left.pos,
      end: endOf(head),
    };
  }
  return left;
```

# private method chainWithOptional:(left:any, unit:any, ctx:any)=>any

`a.b?.c` / `a?.[i]` → 在链上再加一格（带 `questionDotToken`）。

产物把 `?.` 之后的成员收成一个 `NullConditionalOperator` 单元（里面只有成员名 / 下标括号），
而 TS 那边它是**前一个表达式链上的一格**：`PropertyAccessExpression` / `ElementAccessExpression`
各带一个 `questionDotToken`（那个 `?.` 记号是子节点）。

`?.` 的坐标**由那一格 `NullConditionalOperator` 自己给**（第 615 轮）：它的 `Process`
签入用的正是那个 `?.` `SymbolToken`（`SignInToken(current)`），所以 `startOf(unit)`
直接就是那个 `?`。**从前是回原文量的**（成员名的起点往前 `lastIndexOf("?")`），
那是第二份近似：还要自己挡住「抓到更早的那个 `?`」（上一条三元、上一个可选链，第 124 轮踩过）。

```ts
  const kids = projectableKids(view(unit));
  const first = kids.length > 0 ? kids[0] : undefined;
  // **`?.` 就在这一格的起点上**：调用方递进来的 `unit` **一定是** `NullConditionalOperator`
  //（`Process` 里 `SignInToken(那个 ?. 符号)`），所以不用回原文找。
  const dot = startOf(unit);
  const questionDot =
    typeof dot === "number" && dot >= 0
      ? { kind: "QuestionDotToken", text: "?.", pos: dot, end: dot + 2 }
      : undefined;
  // **`?.name(args)`**（第 107 轮）：那一格是一个 `Method`（调用）——先折出带 `?.` 的
  // 属性访问，再把调用套上去（TS：`CallExpression > PropertyAccessExpression(?.)`）。
  if (first !== undefined && first.get("type") === "Method") {
    const nameText = String(first.get("name") ?? "");
    // **被调用者自己带 `!`**（第 852 轮）：`a?.b!()` 里那一格是
    // `Method(name="")[NotNull(b, !), Bracket]`——`?.` 属于 `NotNull` 里面那条链、
    // 断言套在链上、调用在最外面（TS：`CallExpression > NonNull > PropertyAccess(?.)`）。
    // 按下面的「名字 + 调用」折会投出一个**名字为空**的 `PropertyAccessExpression`
    //（实测缺 `NonNullExpression`、多一格空名属性访问），所以这一档交给 `assertedMember`。
    if (nameText === "") {
      const calleeKid = projectableKids(view(first)).filter(
        (k: any) => k.get("type") !== "GenericType",
      )[0];
      if (calleeKid !== undefined && calleeKid.get("type") === "NotNull") {
        const asserted = assertedMember(left, calleeKid, ctx, questionDot);
        if (asserted !== undefined) {
          const call = projectNode(first, ctx);
          return Object.assign({}, call, {
            expression: asserted,
            pos: asserted.pos,
            end: endOf(unit),
          });
        }
      }
      // **被调用者是内层那一格 `Method`**（第 962 轮）：`o?.m()()` 的产物是
      // `NCO[Method(name="")[Method(name="m")]]`——与普通链那条路（第 366 轮）**同形同修**：
      // 先把**内层**按成员调用折一遍，再把「调用这个结果」套上去。
      // 少了这一支，那一格会落到下面「按成员名折」⇒ 投出一个**名字为空**的属性访问
      //（实测 `o?.m()()`：`CallExpression` / `PropertyAccessExpression` / `Identifier` 三处漂）。
      //
      // **名字要一路往下找到最里面那一格**（第 971 轮）：`a?.b()()()` 的 NCO 里是
      // `Method(name="")[Method(name="")[Method(name="b")]]`——名字为空的每一格都是
      // 「对结果再调一次」，而 `?.` 与成员名属于**最里面**那一层。第 966 轮那一版只问
      // **第一格**的名字（答空串）⇒ 走的是下面「名字为空」那一支、把中间几层与 `.b` 一起丢了
      //（实测 `gap-r964-opt-call-triple`：`CallExpression[0,10) > CallExpression[0,8) >
      // Identifier(a)`）。两件事各收在各处：走到最里面那一格是 `innermostMethod`，
      // 「换被调用者要下到最里面那一格调用」是 `graftCallee`——`chainOnto` 的 Method 分支
      // 用的是同一对。
      if (calleeKid !== undefined && calleeKid.get("type") === "Method") {
        // **最里面那一格的被调用者怎么建，收在 `innermostCallee` 里**（第 975 轮）：
        // 它按核分三档（名字 / 实参括号 / `left` 自己），其中「括号那一次」要单独建成一格——
        // 少了那一档，`a?.b()()()` 一族**每一次都少一层**
        //（实测 `gap-r973-opt-assert-call-thrice`：`CallExpression` 各漂 / 缺）。
        const callee = innermostCallee(left, innermostMethod(calleeKid), ctx);
        // **`?.` 挂在这一格新接出来的那一层上**（TS 的放法）：接了名字 / 建了「括号那一次」
        // 就挂在那上面（`a?.b!()` 那一族断言已经把它挂进 `assertedMember` 里了）；
        // 什么都没接（被调用者就是 `left`）时交给 `graftCallee` 挂到最里面那次调用上
        //（`a?.()()` 那一档：`?.` 属于 `a?.()` 那一次，不是外面那次）。
        const built = callee !== left;
        if (built && questionDot !== undefined) callee.questionDotToken = questionDot;
        const innerCall = graftCallee(
          projectNode(calleeKid, ctx),
          callee,
          built ? undefined : questionDot,
        );
        const outerCall = projectNode(first, ctx);
        return Object.assign({}, outerCall, {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
      }
      // **被调用者是 `left`、而这一格盖着两层调用**（第 962 轮）：`o?.m?.()(1)` 的 `NCO` 里是
      // `Method(name="")[Bracket, 1]`——那个 Bracket 是**内层**那次调用（`?.()`）的实参表，
      // 外层那次调用的实参是它后面的兄弟（`1`），而外层调用只体现在 `Method` 自己的区间上。
      // 只折一层会**丢掉内层那一次调用**。「外面还有没有一层」这一问就是**区间**
      //（与普通链那条路的同一句判据：`Method` 比它那个 Bracket 更靠右）。
      if (calleeKid !== undefined && calleeKid.get("type") === "Bracket"
        && calleeKid.get("startBracket") === "(" && endOf(calleeKid) < endOf(first)) {
        const innerCall: any = {
          kind: "CallExpression",
          expression: left,
          arguments: splitTopLevel(projectableKids(view(calleeKid)), ctx, ",")
            .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
            .filter((a: any) => a !== undefined),
          pos: left.pos,
          end: endOf(calleeKid),
        };
        if (questionDot !== undefined) innerCall.questionDotToken = questionDot;
        const outerCall = projectNode(first, ctx);
        return Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos, end: endOf(unit) });
      }
      // **这一格盖着两层调用、而里层那一次只留下一个实参括号**（第 966 轮）：
      // `a!()()` 的 NCO 里那一格是 `Method(name=""[Bracket(())])`——**一格 `Method` 里只有
      // 一对括号**，可它说的是两次调用（两次共用这一格的区间）。判据与上面那一支一字不差：
      // `Method` 比它那个括号更靠右 ⇒ 里面还裹着一层。少了它只投出一次调用
      //（实测 `gap-r964-nonnull-call-twice-member` 的 NCO 那一半：缺 4 格）。
      if (calleeKid !== undefined && calleeKid.get("type") === "Bracket"
        && calleeKid.get("startBracket") === "(" && endOf(calleeKid) < endOf(first)) {
        const innerCall: any = {
          kind: "CallExpression",
          expression: left,
          arguments: splitTopLevel(projectableKids(view(calleeKid)), ctx, ",")
            .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
            .filter((a: any) => a !== undefined),
          pos: left.pos,
          end: endOf(calleeKid),
        };
        if (questionDot !== undefined) innerCall.questionDotToken = questionDot;
        const outerCall = projectNode(first, ctx);
        return Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos, end: endOf(unit) });
      }
    }
    const nameAt = startOf(first);
    const member = {
      kind: "PropertyAccessExpression",
      expression: left,
      name: { kind: "Identifier", text: nameText, pos: nameAt, end: nameAt + nameText.length },
      pos: left.pos,
      end: nameAt + nameText.length,
    };
    if (questionDot !== undefined) member.questionDotToken = questionDot;
    const call = projectNode(first, ctx);
    return Object.assign({}, call, { expression: member, pos: member.pos, end: endOf(unit) });
  }
  // **`o.m?.().k`**（第 154 轮）：NCO 里的第一格是**属性访问**，而它的第一格是实参括号——
  // 那是 token 层的属性访问重组把 `( ) . k` 折成了一个 `PropertyAccess`
  //（XML 实测：`<NCO><PropertyAccess><Bracket/><.><k/></PropertyAccess></NCO>`；
  //  插桩也确认了：`chainWithOptional` 收到的 `first` 是 `PropertyAccess` 而不是 `Bracket`）。
  //
  // **语义上是先调用、再取属性**：`o.m?.()` 是调用，`.k` 挂在它的**结果**上。
  // 所以这里自己把那一格拆开：拿**头一个**实参括号建 `CallExpression`，
  // 再把括号**之后**的成员逐个接上去——
  // 不拆的话它会落到下面「按成员名折属性访问」那一支，
  // 把括号当成名字，投出一个名叫 `()` 的属性访问（实测就是这个形状），
  // 运行期于是**静默**给 `undefined`（JS 给 `3`）。
  if (first !== undefined && first.get("type") === "PropertyAccess") {
    const inner = projectableKids(view(first));
    const head = inner.length > 0 ? inner[0] : undefined;
    if (head !== undefined && head.get("type") === "Bracket" && head.get("startBracket") === "(") {
      const call: any = {
        kind: "CallExpression",
        expression: left,
        arguments: splitTopLevel(projectableKids(view(head)), ctx, ",")
          .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
          .filter((a) => a !== undefined),
        pos: left.pos,
        end: endOf(head),
      };
      if (questionDot !== undefined) call.questionDotToken = questionDot;
      // **括号之后剩下的成员**（`.k` / `[i]` / `.k` 连着的几格）：逐个往链上挂。
      // 名字取那一格的 `Identifier`（token 层已经把成员名收成一个单元）；
      // 下标那一格是 `[` 括号——两种都按下面「按成员名折」那一段的同一口径写。
      let node: any = call;
      for (let i = 1; i < inner.length; i++) {
        const member = inner[i];
        const memberAt = startOf(member);
        if (member.get("type") === "Bracket" && member.get("startBracket") === "[") {
          const element: any = {
            kind: "ElementAccessExpression",
            expression: node,
            argumentExpression: projectExpression(projectableKids(view(member)), ctx),
            pos: node.pos,
            end: endOf(member),
          };
          node = element;
          continue;
        }
        if (member.get("type") === "SymbolToken") continue;
        const nameText = textOfNode(member, ctx);
        if (nameText === "") continue;
        node = {
          kind: "PropertyAccessExpression",
          expression: node,
          name: { kind: "Identifier", text: nameText, pos: memberAt, end: memberAt + nameText.length },
          pos: node.pos,
          end: memberAt + nameText.length,
        };
      }
      return node;
    }
  }
  // **`?.(args)`**（第 107 轮）：那一格是实参括号，TS 是带 `questionDotToken` 的 `CallExpression`。
  if (first !== undefined && first.get("type") === "Bracket" && first.get("startBracket") === "(") {
    const call = {
      kind: "CallExpression",
      expression: left,
      // **实参按顶层逗号切段、每段走 `projectExpression`**（第 143 轮）：不能走 `projectEach`——
      // 那个助手是**逐格**投的，而实参位正是「基名与 `?.` 平级」的形状（`h?.(o?.a)` 的括号里是
      // `[Identifier(o), NCO(a)]` 两格），逐格投会让 `?.a` 落成一个**未映射的
      // `NullConditionalOperator`**、基名与它各占一个实参（实测：缺 `PropertyAccessExpression`
      // 与 `QuestionDotToken` 各一 + 多出一个 `NullConditionalOperator`）。
      // 与 `chainOnto` 里「紧跟一对圆括号 ⇒ 再调一次」那一支是同一个写法。
      arguments: splitTopLevel(projectableKids(view(first)), ctx, ",")
        .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
        .filter((a) => a !== undefined),
      pos: left.pos,
      end: endOf(unit),
    };
    if (questionDot !== undefined) call.questionDotToken = questionDot;
    return call;
  }
  // **`?.[i]`**（第 124 轮）：实参是括号**里面**那一段——早先这里直接 `projectNode(first)`，
  // 把整个 `[…]` 括号投成一个节点（未映射的 `<Bracket>`），于是 TS 那边
  // `ElementAccessExpression` 有了、却凭空多出一个 `Bracket`。
  if (first !== undefined && first.get("type") === "Bracket" && first.get("startBracket") === "[") {
    // **这一格后面还跟着兄弟时，下标只是链上的一格**（第 962 轮）：`o?.['m']()` 的 NCO 里
    // **两个括号装在同一格**（`NCO[Bracket([), Bracket(())]`）——原来这里无条件把整格 NCO
    // 当成一个下标（`end: endOf(unit)` 一路盖到 `()` 后面）就返回，
    // 于是那次调用整格丢掉、`ElementAccessExpression` 的区间也漂（实测缺一个
    // `CallExpression`、`ElementAccessExpression` 漂 2）。
    // 修法与 `chainOnto` 的续格循环同款：**把剩下的兄弟交给它**——那里面
    // 「紧跟一对圆括号 ⇒ 对左边那个结果再调用一次」正是这一档要的。
    const more = kids.length > 1;
    const element = {
      kind: "ElementAccessExpression",
      expression: left,
      argumentExpression: projectExpression(projectableKids(view(first)), ctx),
      pos: left.pos,
      end: more ? endOf(first) : endOf(unit),
    };
    if (questionDot !== undefined) element.questionDotToken = questionDot;
    if (more) {
      // **剩下的兄弟里那些「以一次调用开头」的单元要先摊开**（第 962 轮）：
      // `o?.['m']().v` 的第二格是 `PropertyAccess([Bracket(()), ., v])`——
      // 调用与它后面的后缀一起装在一个外壳里（第 692 轮那条口径）。
      // 不摊开的话 `chainOnto` 的循环在它上面既不是点号也不是括号 ⇒ `break` ⇒ **整段丢**
      //（实测缺 `CallExpression` / `PropertyAccessExpression` / `Identifier` 三个）。
      // 摊开之后与 `projectExpression` 链那一支里那一份**是同一件事**。
      const rest: Array<any> = [];
      for (const unit of kids.slice(1)) {
        // **裸的一次调用不要摊开**（第 965 轮）：`a?.[b]()()` 的第二格是
        // `Method(name="")[Bracket(())]`——它是**一次调用**、而外面那次调用只体现在
        // 这个 `Method` 自己的区间上（与第 962 轮那条「外面还有没有一层」同源）。
        // 摊开成裸括号之后 `chainOnto` 见到的只是内层那对实参括号 ⇒ 外层那次调用
        // **没有节点**、区间也短一格（实测 `gap-r964-opt-index-call-twice`：外层漂 2）。
        // 整格交给 `chainOnto`（它认了这一档）。
        if (isBareCallMethod(unit, ctx)) {
          rest.push(unit);
          continue;
        }
        if (isCallFirstUnit(unit, ctx)) {
          for (const inner of projectableKids(view(unit))) rest.push(inner);
          continue;
        }
        rest.push(unit);
      }
      return chainOnto(element, rest, ctx);
    }
    return element;
  }
  // **`a?.b!`：`!` 落在 NCO **里面**、语义上却套在整条链**外面**（第 166 轮）：
  // 产物是 `[Identifier(a), NullConditionalOperator(NotNull([Identifier(b), !]))]`——
  // `!` 先被 `NotNull` 规则折进了 NCO 的内容里，而 TS 是
  // `NonNullExpression > PropertyAccessExpression(a?.b)`。先按 NCO 里那个**名字**折出带 `?.`
  // 的属性访问，再把 `!` 套到整条链上；不这么收的话 `!` 会留在成员名上，
  // `PropertyAccessExpression` 的区间多一格、`NonNullExpression` 少一层
  // （实测 `expr-nonnull-optional.ts` 与 `expr-optional-call-nodes.ts`）。
  if (first !== undefined && first.get("type") === "NotNull") {
    // 折法收在 `assertedMember` 里（第 852 轮）：`a?.b!` 与 `a?.b!()` / `a?.b!.c!()`
    // 是同一格，`!` 都套在**整条链**上，差的是它后面还接不接东西。
    const asserted = assertedMember(left, first, ctx, questionDot);
    if (asserted !== undefined) return chainOnto(asserted, kids.slice(1), ctx);
  }
  // **`a?.b` 加模板串 ⇒ `TaggedTemplateExpression`**（第 175 轮）：`` a?.b`t` `` 的产物是
  // `[Identifier(a), NullConditionalOperator([Identifier(b), String])]`——成员名与那个模板串
  // 都在 NCO 里。TS 那边是 `TaggedTemplateExpression > [PropertyAccessExpression(a?.b),
  // NoSubstitutionTemplateLiteral]`（实测 `ex-optional-call-new.ts`：缺
  // `TaggedTemplateExpression` + `NoSubstitutionTemplateLiteral`，`PropertyAccessExpression`
  // 的区间一路撑到模板串末尾）。
  const stringUnit = kids.find((k) => k.get("type") === "String" || k.get("type") === "ConstString");
  if (stringUnit !== undefined && kids.length >= 2) {
    const tagName = kids.find((k) => k !== stringUnit && isNameNode(k));
    if (tagName !== undefined) {
      const member: any = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: nameOf(tagName, ctx),
        pos: left.pos,
        end: endOf(tagName),
      };
      if (questionDot !== undefined) member.questionDotToken = questionDot;
      // **模板串后面还跟着兄弟时，链要接着往下接**（第 965 轮）：`` a?.b`t`() `` 的产物是
      // `[Identifier(a), NCO(Identifier(b), String)]`，而那次调用是 **NCO 的下一个兄弟**
      // （与上面 `a?.[b][c]()` 那一档同形：链的最后一格在 NCO 里、续格在 NCO 外面）。
      // 原来这里直接交出一个 `TaggedTemplateExpression` 就完了 ⇒ 那次调用**整格丢**
      //（实测 `gap-r964-opt-member-tagged-call`：缺一个 `CallExpression`）。
      // 剩下的兄弟交给 `chainOnto`——「紧跟一对圆括号 ⇒ 再调一次」那一支正是这一档要的。
      const tagged: any = {
        kind: "TaggedTemplateExpression",
        tag: member,
        template: projectNode(stringUnit, ctx),
        pos: left.pos,
        end: endOf(stringUnit),
      };
      const afterString = kids.indexOf(stringUnit) + 1;
      if (afterString < kids.length) return chainOnto(tagged, kids.slice(afterString), ctx);
      return tagged;
    }
  }
  // **这一格自己又是一条链**（第 124 轮）：`a?.b.c` 的产物是
  // `[Identifier(a), NullConditionalOperator(PropertyAccess([b, ., c]))]`——
  // 整个 `b.c` 是 NCO 里的**一个** `PropertyAccess` 单元。走下面那条通用支的话，
  // 那个单元会被投成**一个** `Identifier`（名字取到整段 `b.c`），于是
  // `PropertyAccessExpression` 少一层、`Identifier` 多一个、区间也跟着漂
  // （实测 `a?.b.c` / `x?.Parent.Parent` 这一族）。逐格接上去，
  // `questionDotToken` 挂在**第一格**上（TS 就是这么放的：`a?.b.c` 的 `?.` 属于内层那个节点）。
  if (first !== undefined && first.get("type") === "PropertyAccess") {
    const members = projectableKids(view(first));
    let node = left;
    // **`?.` 挂在链的下一格上**（TS 的放法）：`a?.b.c` 里它是**内层**那个
    // `a?.b` 的 `questionDotToken`，不是外层 `…​.c` 的。所以先存着，接第一格时用掉。
    let pending: any = questionDot;
    let j = 0;
    while (j < members.length) {
      const member = members[j];
      if (member.get("type") === "NullConditionalOperator") {
        node = chainWithOptional(node, member, ctx);
        pending = undefined;
        j += 1;
        continue;
      }
      if (isDot(member, ctx)) {
        j += 1;
        continue;
      }
      // **子链里夹着一格「名字 + `!`」**（第 966 轮）：`a?.b!.c` 的 NCO 内容是
      // `[NotNull(b), ., PropertyAccess([c])]`——`!` 与 `b` 在**同一格**里，而它要盖的是
      // **接上 `b` 之后**那一条链（TS：`PropertyAccess(NonNull(PropertyAccess(a?.b)), c)`）。
      // 不走这一支的话，下面三条都不认 `NotNull` ⇒ 落到通用支 ⇒ `nameOf` 把「名字 + `!`」
      // 当成一个名字（`Identifier` 的值成了 `"b!"`）⇒ 缺 `NonNullExpression`、
      // 多一格属性访问（实测 `gap-r964-opt-assert-member-member` 的漂移正是它）。
      // 折法与 `chainOnto` 的子链分支**一字不差**：先接成员（`?.` 挂在**内层**那一格），
      // 再把 `!` 套在**整条链**上、位置取那一格自己的末端。
      if (member.get("type") === "NotNull") {
        const bangKids = projectableKids(view(member)).filter(
          (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
        );
        const innerName = bangKids.length > 0 ? bangKids[0] : undefined;
        if (innerName !== undefined) {
          const holder: any = {
            kind: "PropertyAccessExpression",
            expression: node,
            name: nameOf(innerName, ctx),
            pos: node.pos,
            end: endOf(innerName),
          };
          if (pending !== undefined) {
            holder.questionDotToken = pending;
            pending = undefined;
          }
          node = {
            kind: "NonNullExpression",
            expression: holder,
            pos: holder.pos,
            end: endOf(member),
          };
        }
        j += 1;
        continue;
      }
      if (member.get("type") === "Method") {
        const nameText = String(member.get("name") ?? "");
        const nameAt = startOf(member);
        // **这一格是「名字为空」的调用单元**（第 964 轮补上这份副本）：
        // `o?.m()().v` 的 NCO 里那一格是
        // `PropertyAccess([Method name=""[Method name="m"]], ., v)`——**空名字 `Method` 的第一格
        // 是内层那次调用**。折法与 `chainWithOptional` 的空名字那一支**是同一件事**
        //（第 366 轮的两步走 + 第 962 轮那三支），少了它这一格会投出一个**名字为空**的属性访问
        //（实测 `o?.m()().v`：`CallExpression` / `PropertyAccessExpression` / `Identifier` 三处漂）。
        // **这一份是那条判据的第五处副本**：另外四处已由第 962 / 963 轮补齐，
        // 补上这一处之后五处同形；「五处收成一份实现」登记为下一步（见 README 第 964 轮那一节）。
        if (nameText === "") {
          const callKids = projectableKids(view(member)).filter((k: any) => k.get("type") !== "GenericType");
          const callHead = callKids.length > 0 ? callKids[0] : undefined;
          if (callHead !== undefined && callHead.get("type") === "NotNull") {
            const asserted = assertedMember(node, callHead, ctx, pending);
            if (asserted !== undefined) {
              node = Object.assign({}, projectNode(member, ctx), {
                expression: asserted,
                pos: asserted.pos,
              });
              pending = undefined;
              j += 1;
              continue;
            }
            // **断言盖的是一次调用、这一格外面还有一层调用**（第 966 轮）：`a?.['b']!()` 的 NCO 里
            // 那一格是 `Method(name=""[NotNull(Bracket(['b']), !), Bracket(())])`——
            // 断言里的核是**下标括号**（不是名字），`assertedMember` 只认名字 ⇒ 给 `undefined`。
            // 折不出来的话整格落到 `break`（实测 `gap-r964-opt-index-assert-call`：
            // 缺两个 `CallExpression`、`ElementAccessExpression` 的区间只到 `]`）。
            // **做法与 `chainOnto` 那一处一字不差**：先把「下标 + `!`」折成 `NonNull`，
            // 再把外面那次调用套上去（`?.` 挂在里面那次下标上——TS 就是这么放的）。
            const assertKids = projectableKids(view(callHead)).filter(
              (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
            );
            const assertHead = assertKids.length > 0 ? assertKids[0] : undefined;
            if (assertHead !== undefined && assertHead.get("type") === "Bracket"
              && assertHead.get("startBracket") === "[") {
              const element: any = {
                kind: "ElementAccessExpression",
                expression: node,
                argumentExpression: projectExpression(projectableKids(view(assertHead)), ctx),
                pos: node.pos,
                end: endOf(assertHead),
              };
              if (pending !== undefined) element.questionDotToken = pending;
              const assertedCall: any = {
                kind: "NonNullExpression",
                expression: element,
                pos: element.pos,
                end: endOf(callHead),
              };
              node = Object.assign({}, projectNode(member, ctx), {
                expression: assertedCall,
                pos: assertedCall.pos,
              });
              pending = undefined;
              j += 1;
              continue;
            }
          }
          if (callHead !== undefined && callHead.get("type") === "Method") {
            // **这一格盖着一层或好几层调用**（第 966 轮立、第 971 轮按「最里面那一格」补齐）：
            // `a?.b()()` / `a?.b()()()` / `a?.b()()().c` 的 NCO 里那一格都是
            // `Method(name="")[Method(name="")[…]]`——名字为空的每一格都是「对结果再调一次」，
            // **真正带成员名的是最里面那一格**；外层再用 `projectNode(member)` 套一层。
            // 只读 `callHead` **第一格**的名字（第 966 轮那一版）会把三层当成两层：
            // 实测 `a?.b()()().c` 漂 2、字段 1、`Identifier(b)` 整格丢。
            // 折法与 `chainWithOptional` 的「被调用者是 `Method`」那一支**一字不差**：
            // 走到最里面那一格用 `innermostMethod`，**被调用者怎么建**用 `innermostCallee`
            //（第 975 轮收拢：名字 / 实参括号 / `left` 三档一处一份），
            // 换法用 `graftCallee`（它一路下到最里面那一层调用，不会把中间几层丢掉）。
            const callee = innermostCallee(node, innermostMethod(callHead), ctx);
            const built = callee !== node;
            if (built && pending !== undefined) callee.questionDotToken = pending;
            const innerCall = graftCallee(projectNode(callHead, ctx), callee, built ? undefined : pending);
            node = Object.assign({}, projectNode(member, ctx), {
              expression: innerCall,
              pos: innerCall.pos,
            });
            pending = undefined;
            j += 1;
            continue;
          }
          if (callHead !== undefined && callHead.get("type") === "Bracket"
            && callHead.get("startBracket") === "(" && endOf(callHead) < endOf(member)) {
            const innerCall: any = {
              kind: "CallExpression",
              expression: node,
              arguments: splitTopLevel(projectableKids(view(callHead)), ctx, ",")
                .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
                .filter((a: any) => a !== undefined),
              pos: node.pos,
              end: endOf(callHead),
            };
            if (pending !== undefined) innerCall.questionDotToken = pending;
            node = Object.assign({}, projectNode(member, ctx), {
              expression: innerCall,
              pos: innerCall.pos,
            });
            pending = undefined;
            j += 1;
            continue;
          }
        }
        const holder = {
          kind: "PropertyAccessExpression",
          expression: node,
          name: { kind: "Identifier", text: nameText, pos: nameAt, end: nameAt + nameText.length },
          pos: node.pos,
          end: nameAt + nameText.length,
        };
        if (pending !== undefined) holder.questionDotToken = pending;
        const call = projectNode(member, ctx);
        node = Object.assign({}, call, { expression: holder, pos: holder.pos });
      } else if (member.get("type") === "Bracket" && member.get("startBracket") === "[") {
        // **下标括号也是链上的一格**（第 962 轮）：`o?.m()[0]` 的 NCO 里那一格是
        // `PropertyAccess([Method(m), Bracket([0])])`——`[0]` 与成员名**平级**。
        // 落到下面那条通用支会被 `nameOf` 当成**一个名字**（实测投出名叫 `"[0]"` 的
        // `Identifier` ⇒ 缺 `ElementAccessExpression` 与 `NumericLiteral`、多一格属性访问）。
        // 收法与 `chainOnto` 里那一支**一字不差**：同一形状、同一个判据，不写第二份。
        const element: any = {
          kind: "ElementAccessExpression",
          expression: node,
          argumentExpression: projectExpression(projectableKids(view(member)), ctx),
          pos: node.pos,
          end: endOf(member),
        };
        if (pending !== undefined) element.questionDotToken = pending;
        node = element;
      } else {
        const step = {
          kind: "PropertyAccessExpression",
          expression: node,
          name: nameOf(member, ctx),
          pos: node.pos,
          end: endOf(member),
        };
        if (pending !== undefined) step.questionDotToken = pending;
        node = step;
      }
      pending = undefined;
      j += 1;
    }
    // **这一格后面还跟着兄弟时，链要接着往下接**（第 965 轮）：`a?.[b][c]()` 的产物是
    // `[Identifier(a), NCO(PropertyAccess([Bracket([b]), Bracket([c])]), Bracket(()))]`——
    // **两个下标装在 NCO 里的那一格 `PropertyAccess` 里**，而那次调用是 NCO 的**下一个兄弟**。
    // 原来这里直接 `return node`（下标接完就交差）⇒ 那次调用**整格丢**，
    // `ElementAccessExpression` 的区间也只到 `[c]` 为止（实测
    // `gap-r964-opt-index-index-call`：缺一个 `CallExpression`）。
    // 剩下的兄弟交给 `chainOnto`——「紧跟一对圆括号 ⇒ 再调一次」那一支正是这一档要的，
    // 与上面 `?.[i]` 那一支里同一个写法（第 962 轮立），不写第二份。
    return kids.length > 1 ? chainOnto(node, kids.slice(1), ctx) : node;
  }
  // **成员名一律是 `Identifier`**（第 175 轮）：`a?.import` 里那个 `import` 在产物中是
  // `Keyword`，照通用支投会得到 `ImportKeyword`，而 TS 那边点号后面一律是**属性名**
  // （实测 `expr-member-named-import-optional.ts`：缺 `Identifier` + 多出 `ImportKeyword`）。
  // 与第 125 轮「成员名不期待操作数」同源，`nameOf` 本来就是这条口径。
  const name =
    first === undefined
      ? undefined
      : first.get("type") === "Identifier" || first.get("type") === "Keyword"
        ? nameOf(first, ctx)
        : projectNode(first, ctx);
  const access = {
    kind: "PropertyAccessExpression",
    expression: left,
    name,
    pos: left.pos,
    end: endOf(unit),
  };
  if (questionDot !== undefined) access.questionDotToken = questionDot;
  return access;
```

# private method chainOnto:(node:any, units:Array<any>, ctx:any)=>any

把一串「链的续格」（`.` + 名字 / 下标括号 / 可选链单元）**接在一个已有节点上**。

用在「产物把右操作数的链平铺在运算符外面」那一支（见 `projectExpression` 的说明）：
折出二元之后，右边的续格还要顺着接上去，否则那一段整片丢。

```ts
  let left = node;
  let i = 0;
  while (i < units.length && left !== undefined) {
    const unit = units[i];
    // **紧跟一格反引号模板 ⇒ 又是一条标签模板**（第 979 轮）：`` tag`a``b` `` 与
    // `` f<T>`t``u` `` 在 TS 那边是**嵌套的两条** `TaggedTemplateExpression`（里外各带自己的
    // `template`）——左边那一条当外层的 `tag`。原来这一格没有分支，落到循环末尾被跳过 ⇒
    // **外面那一层整格丢**（实测 `` f<T>`t``u` ``：外层的 `TaggedTemplateExpression` 区间
    // 只到第一个模板、第二格模板不见）。判据与 0b 同源：**只有反引号才算模板**
    //（普通字符串与模板在产物里的属性一模一样，靠原文的引号分）。
    if (unit.get("type") === "String" && ctx.source[startOf(unit)] === "`") {
      const template = projectNode(unit, ctx);
      if (template === undefined) break;
      left = { kind: "TaggedTemplateExpression", tag: left, template, pos: left.pos, end: endOf(unit) };
      i += 1;
      continue;
    }
    if (unit.get("type") === "NullConditionalOperator") {
      left = chainWithOptional(left, unit, ctx);
      i += 1;
      continue;
    }
    if (isIndexBracket(unit)) {
      const argument = projectExpression(projectableKids(view(unit)), ctx);
      left = {
        kind: "ElementAccessExpression",
        expression: left,
        argumentExpression: argument,
        pos: left.pos,
        end: endOf(unit),
      };
      i += 1;
      continue;
    }
    // **紧跟一个「按数组字面量成形的方括号」⇒ 那就是一次下标**（第 333 轮）。
    //
    // **为什么它一定不是数组字面量**：这一条路只在**链的续格**上走——
    // 一个值后面紧跟着 `[` 在 JS 里就是下标（`a [1]` 与 `a[1]` 是一回事）。
    // 而 token 层在**非空断言后面那一格**正好会给这个形状：
    // `o?.a.b![0]` 的 NCO 里是 `[NotNull(PropertyAccess(a.b)), ArrayLiteral(0)]`——
    // `[0]` 谁也不认它 ⇒ 按数组字面量成形、与前面那一格**平级**。
    // 不认它的话这个下标**整段丢掉**：Node 给 `7`、本仓给 `[7]`——**静默错值**
    //（判据 `c323-ex-nonnull-in-chains` 现场量的就是它）。
    // **做法与上面那一支一字不差**（只有「从哪个形状取实参」不同）。
    if (unit.get("type") === "ArrayLiteral") {
      const argument = projectExpression(projectableKids(view(unit)), ctx);
      left = {
        kind: "ElementAccessExpression",
        expression: left,
        argumentExpression: argument,
        pos: left.pos,
        end: endOf(unit),
      };
      i += 1;
      continue;
    }
    // **紧跟一对圆括号 ⇒ 对左边那个结果再调用一次**（第 168 轮）：`y(function(){})()`
    // 的产物是 `[…, Method(name="y"), Bracket( () )]`——末尾那对括号是**平级的兄弟**
    // （不在 `Method` 里），TS 那边是外面再套一层 `CallExpression`（区间到那个 `)`）。
    // 普通的调用早被收成 `Method` 单元了，所以这里见到的圆括号只会是这一形状
    // （实测 `stmt-asi-paren-call.ts`：`BinaryExpression` 与 `CallExpression` 各漂 2）。
    if (unit.get("type") === "Bracket" && unit.get("startBracket") === "(") {
      left = {
        kind: "CallExpression",
        expression: left,
        arguments: splitTopLevel(projectableKids(view(unit)), ctx, ",")
          .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
          .filter((a) => a !== undefined),
        pos: left.pos,
        end: endOf(unit),
      };
      i += 1;
      continue;
    }
    // **这一格自己是一个非空断言**（第 975 轮）：`a?.b![0]![1].c` 的 NCO 里第二格是
    // `NotNull([Bracket([0]), !])`——「**先下标、再断言**」的一格（与链循环里
    // `isIndexFirstUnit` 那一支、以及第 975 轮补的「先调用、再断言」同形）。
    // 这一支原来根本没有 ⇒ 它既不是点号、也不是下标 / 圆括号 / `Method`，
    // 循环在它前面就 `break` ⇒ **断言与那个下标一起丢**（实测
    // `gap-r973-opt-assert-index-index-member`：缺 5 漂 2）。
    // **次序是语义**：TS 是 `((a?.b![0])![1])`——先把下标接上、再把 `!` 套在那个结果上。
    if (unit.get("type") === "NotNull") {
      const bangKids = projectableKids(view(unit)).filter(
        (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
      );
      const bangHead = bangKids.length > 0 ? bangKids[0] : undefined;
      let asserted: any = left;
      if (bangHead !== undefined && bangHead.get("type") === "Bracket"
        && bangHead.get("startBracket") === "[") {
        asserted = {
          kind: "ElementAccessExpression",
          expression: left,
          argumentExpression: projectExpression(projectableKids(view(bangHead)), ctx),
          pos: left.pos,
          end: endOf(bangHead),
        };
      } else if (bangHead !== undefined && bangHead.get("type") === "Bracket"
        && bangHead.get("startBracket") === "(" && endOf(bangHead) < endOf(unit)) {
        asserted = {
          kind: "CallExpression",
          expression: left,
          arguments: splitTopLevel(projectableKids(view(bangHead)), ctx, ",")
            .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
            .filter((a: any) => a !== undefined),
          pos: left.pos,
          end: endOf(bangHead),
        };
      } else if (bangHead !== undefined && bangHead.get("type") === "Method") {
        asserted = graftCallee(
          projectNode(bangHead, ctx),
          innermostCallee(left, innermostMethod(bangHead), ctx),
          undefined,
        );
      }
      left = { kind: "NonNullExpression", expression: asserted, pos: left.pos, end: endOf(unit) };
      i += 1;
      continue;
    }
    // **这一格自己就是一次调用**（第 965 轮）：`a?.[b]()()` 的 NCO 里是
    // `[Bracket([b]), Method(name="")[Bracket(())]]`——那一格 `Method` 前面**没有点号**
    // （它要说的正是「对左边那个结果再调一次」），所以它在下面 `isDot` 那道门槛前
    // 就 `break` 了 ⇒ **那次调用整格丢**（实测 `gap-r964-opt-index-call-twice`：
    // 外层 `CallExpression` 的区间只到第一个 `)`）。
    // 判据与 `chainWithOptional` 的「内层是 `Method`」那一支**同源**（第 962 轮立的两步走
    // 加区间判据），区别只是**点号没有出现**；空名字那一档也走同一条路
    //（`Method(name="")[Bracket(...)]` 的投影本身就是「被调用者是 `left` 的一次调用」）。
    if (unit.get("type") === "Method") {
      const callKids = projectableKids(view(unit)).filter((k: any) => k.get("type") !== "GenericType");
      const callHead = callKids.length > 0 ? callKids[0] : undefined;
      const bareName = String(unit.get("name") ?? "");
      // **这一格盖着两层（或更多层）调用**（第 966 轮立、第 971 轮按「最里面那一格」补齐）：
      // `a?.b()()()` 的 NCO 里最外面那一格是
      // `Method(name="")[Method(name="")[Method(name="b")]]`——`projectNode(unit)` 对
      // **名字为空**的 `Method` 投出来的是一次 `CallExpression`，而它里面那层是**第二格**
      // （`Method(name="")[Method(name="b")]`，同样是空的）。所以直接把这一格整个投出来
      // 交给 `left` 是不够的：那样**外面那一次调用没有节点**（实测
      // `gap-r964-opt-call-triple`：`CallExpression` / `PropertyAccessExpression` /
      // `Identifier` 三处漂、另多一格名字为空的属性访问）。
      // **做法**：被调用者接在**最里面**那一格调用上——走进最里面那一格用 `innermostMethod`、
      // **被调用者怎么建**用 `innermostCallee`（第 975 轮收拢：名字 / 实参括号 / `left`
      // 三档各一处一份），换法交给 `graftCallee`
      //（它一路下到最里面那一层，不会把中间几层丢掉）。与 `chainWithOptional` 的
      // 「被调用者是 `Method`」那一支**共用同一对**。
      if (bareName === "" && callHead !== undefined && callHead.get("type") === "Method") {
        const innerCall = graftCallee(
          projectNode(callHead, ctx),
          innermostCallee(left, innermostMethod(callHead), ctx),
          undefined,
        );
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName === "" && callHead !== undefined && callHead.get("type") === "NotNull") {
        const asserted = assertedMember(left, callHead, ctx, undefined);
        if (asserted !== undefined) {
          const call = projectNode(unit, ctx);
          left = Object.assign({}, call, { expression: asserted, pos: asserted.pos });
          i += 1;
          continue;
        }
        // **断言盖的是一次调用、这一格外面还有一层调用**（第 966 轮）：`a!()!()` 的产物是
        // `[NotNull(a, !), Method(name=""[NotNull(Bracket(()), !), Bracket(())])]`——
        // 那个 `NotNull` 的核是**实参括号**（不是名字），`assertedMember` 只认名字 ⇒ 给
        // `undefined`；照下面那条「被调用者就是 `left`」的路折又只折出一层
        //（实测 `gap-r964-nonnull-call-assert-call`：缺两个 `CallExpression`、
        //  `NonNullExpression` 的区间只到 `a!`）。
        // **判据与别的几处一字不差**：`Method` 比它那个实参括号更靠右 ⇒ 外面还有一层。
        const assertKids = projectableKids(view(callHead)).filter(
          (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
        );
        const assertHead = assertKids.length > 0 ? assertKids[0] : undefined;
        if (assertHead !== undefined && assertHead.get("type") === "Bracket"
          && assertHead.get("startBracket") === "(") {
          const innerCall: any = {
            kind: "CallExpression",
            expression: left,
            arguments: splitTopLevel(projectableKids(view(assertHead)), ctx, ",")
              .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
              .filter((a) => a !== undefined),
            pos: left.pos,
            end: endOf(assertHead),
          };
          const assertedCall: any = {
            kind: "NonNullExpression",
            expression: innerCall,
            pos: innerCall.pos,
            end: endOf(callHead),
          };
          const outerCall = projectNode(unit, ctx);
          left = Object.assign({}, outerCall, { expression: assertedCall, pos: assertedCall.pos });
          i += 1;
          continue;
        }
      }
      if (bareName === "" && callHead !== undefined && callHead.get("type") === "Method"
        && String(callHead.get("name") ?? "") === "") {
        // **这一格盖着两层调用、而内层那一格的名字也是空的**（第 966 轮）：`a!()()` 的产物是
        // `[NotNull(a, !), Method(name=""[Method(name=""[Bracket(()), !]), Bracket(())])]`——
        // 内层 `Method(name="")` 本身就是**第一次调用**（它的核是那对实参括号），
        // 外层那一格是**第二次调用**。取名字那一支在这里会把 `""` 当成成员名 ⇒ 投出一格
        // 名字为空的属性访问（实测 `gap-r964-nonnull-call-twice-member`：整条链丢 4 格）。
        // 折法就是「各投各的」：内层 `projectNode(callHead)` 给出的**已经是**对 `left` 的
        // 一次调用，只需要把它的受体换成 `left`（它自己那格是空的、没人填），
        // 位置取 `left.pos`；外层再用 `projectNode(unit)` 套一层。
        const innerCall = Object.assign({}, projectNode(callHead, ctx), {
          expression: left,
          pos: left.pos,
        });
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName === "" && callHead !== undefined && callHead.get("type") === "Method"
        && String(callHead.get("name") ?? "") !== "") {
        const innerName = String(callHead.get("name") ?? "");
        const innerAt = startOf(callHead);
        const innerMember: any = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: innerName, pos: innerAt, end: innerAt + innerName.length },
          pos: left.pos,
          end: innerAt + innerName.length,
        };
        const innerCall = Object.assign({}, projectNode(callHead, ctx), {
          expression: innerMember,
          pos: innerMember.pos,
        });
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName === "" && callHead !== undefined && callHead.get("type") === "Bracket"
        && callHead.get("startBracket") === "(" && endOf(callHead) < endOf(unit)) {
        const innerCall: any = {
          kind: "CallExpression",
          expression: left,
          arguments: splitTopLevel(projectableKids(view(callHead)), ctx, ",")
            .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
            .filter((a: any) => a !== undefined),
          pos: left.pos,
          end: endOf(callHead),
        };
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: innerCall,
          pos: innerCall.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
      if (bareName !== "") {
        const at = startOf(unit);
        const member: any = {
          kind: "PropertyAccessExpression",
          expression: left,
          name: { kind: "Identifier", text: bareName, pos: at, end: at + bareName.length },
          pos: left.pos,
          end: at + bareName.length,
        };
        left = Object.assign({}, projectNode(unit, ctx), {
          expression: member,
          pos: member.pos,
          end: endOf(unit),
        });
        i += 1;
        continue;
      }
    }
    // **这一格自己就是一条子链、而前面没有点号**（第 973 轮，**普查当场红的**）：
    // `a?.b![0].c` 的 NCO 里第二格是 `PropertyAccess([Bracket([0]), Identifier(c)])`——
    // `chainWithOptional` 的 `NotNull` 那一支折出断言之后，把剩下的 `[那一格]` 交给这里；
    // 可子链那一支原来住在下面 `isDot` 那一段**里面** ⇒ 这一格既不是点号、也不是下标括号 /
    // 圆括号 / `Method`，循环在它前面就 `break` ⇒ **整格丢**（实测
    // `gap-r971-opt-assert-index-member`：缺 3 漂 1）。抬出来之后这一格照子链折，
    // 跨过的格子数是 **1**（没有点号要跨），`pendingBang` 那两格照旧。
    const dotStep = isDot(unit, ctx) && i + 1 < units.length;
    const loneSubChain = dotStep === false && unit.get("type") === "PropertyAccess";
    if (dotStep === false && loneSubChain === false) break;
    // **点号后面那一格可能自带一个 `!`**（第 333 轮）：`o?.a!.b!` 的 NCO 里是
    // `[NotNull(a), ., NotNull(b)]`——那个 `!` 与成员名**在同一格里**
    //（token 层把「名字 + 非空断言」折成了一个 `NotNull`）。
    // **不拆开的话**：下面那三支都不认 `NotNull` ⇒ 落到最后那个 `else` ⇒
    // `nameOf(NotNull)` 把整段「名字 + `!`」当成**一个名字**
    //（实测：多出一个 `Identifier` 值叫 `"b!"`、`NonNullExpression` 与
    // `PropertyAccessExpression` 各漂 2），运行期于是给 `undefined`
    //（`+ 1` 变成 `NaN`——**静默错值**，判据 `c305-ex-optional-chain-nonnull-mix`）。
    //
    // **次序是语义**：先把**成员**接上，再把 `!` 套在**整条链**上
    //（TS 是 `NonNull(PropertyAccess(…, b))`，不是「名字叫 `b!`」）。
    let bangUnit: any = undefined;
    let next = dotStep ? units[i + 1] : unit;
    // **断言该盖到哪一格**（第 966 轮）：`a?.b!.c.d` 里那条子链（`PropertyAccess([c, ., d])`）
    // 接的是**断言之后**那一条链，而「把 `!` 套上去」这件事发生在**子链分支内部**——
    // 那里需要知道终点在哪，`bangEnd` 就是那一格 `NotNull` 自己的末端。
    let bangEnd: number | undefined = undefined;
    if (next.get("type") === "NotNull") {
      bangUnit = next;
      bangEnd = endOf(bangUnit);
      const inner = projectableKids(view(next)).filter(
        (k: any) => !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!"),
      );
      if (inner.length === 0) break;
      next = inner[0];
    }
    if (next.get("type") === "Method") {
      const name = String(next.get("name") ?? "");
      // **被调用者自己带 `!`**（第 852 轮）：`a?.b!.c!()` 里 `.c!()` 那一格是
      // `Method(name="")[NotNull(c, !), Bracket]`——断言套在**接上 `c` 之后**的那条链上，
      // 调用在最外面。按名字折会投出名字为空的属性访问（实测三处漂），
      // 所以这一档交给 `assertedMember`。与上面 `chainWithOptional` 那一处同形同修。
      if (name === "") {
        const calleeKid = projectableKids(view(next)).filter(
          (k: any) => k.get("type") !== "GenericType",
        )[0];
        if (calleeKid !== undefined && calleeKid.get("type") === "NotNull") {
          const asserted = assertedMember(left, calleeKid, ctx, undefined);
          if (asserted !== undefined) {
            const call = projectNode(next, ctx);
            left = Object.assign({}, call, { expression: asserted, pos: asserted.pos });
            i += 2;
            continue;
          }
        }
        // **被调用者是内层那一格 `Method`**（第 962 轮）：与上面 `chainWithOptional`
        // 那一处**同形同修**（第 366 轮立的两步走）——`a?.b.c()()` 里 `.c()()` 那一格是
        // `Method(name="")[Method(name="c")]`，先把内层折成成员调用、再把外层那次调用套上去；
        // 少了它，那一格会落到下面「按成员名折」⇒ 投出一个**名字为空**的属性访问。
        if (calleeKid !== undefined && calleeKid.get("type") === "Method") {
          // **折法与 `chainWithOptional` 那一处、以及本函数 Method 分支一字不差**
          //（第 975 轮收拢）：最里面那一格用 `innermostMethod`、被调用者用
          // `innermostCallee`、换法用 `graftCallee`。
          const innerCall = graftCallee(
            projectNode(calleeKid, ctx),
            innermostCallee(left, innermostMethod(calleeKid), ctx),
            undefined,
          );
          const outerCall = projectNode(next, ctx);
          left = Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos });
          i += 2;
          continue;
        }
        // **被调用者是 `left`、而这一格盖着两层调用**（第 962 轮）：判据与另外两处
        // 一字不差——`Method` 比它那个实参括号**更靠右**，说明外面还有一层调用。
        if (calleeKid !== undefined && calleeKid.get("type") === "Bracket"
          && calleeKid.get("startBracket") === "(" && endOf(calleeKid) < endOf(next)) {
          const innerCall: any = {
            kind: "CallExpression",
            expression: left,
            arguments: splitTopLevel(projectableKids(view(calleeKid)), ctx, ",")
              .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
              .filter((a: any) => a !== undefined),
            pos: left.pos,
            end: endOf(calleeKid),
          };
          const outerCall = projectNode(next, ctx);
          left = Object.assign({}, outerCall, { expression: innerCall, pos: innerCall.pos });
          i += 2;
          continue;
        }
      }
      const at = startOf(next);
      const member = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: { kind: "Identifier", text: name, pos: at, end: at + name.length },
        pos: left.pos,
        end: at + name.length,
      };
      const call = projectNode(next, ctx);
      left = Object.assign({}, call, { expression: member, pos: member.pos });
    } else if (next.get("type") === "PropertyAccess") {
      // 成员格自己又是一条链单元（`[Start, NCO(Document)]`）：逐格接上去。
      const members = projectableKids(view(next));
      // **断言还没套上去的话，它盖到哪一格由 `bangEnd` 给**（第 966 轮）：
      // `a?.b!.c.d` 里 `!.` 之后那条子链接的是断言之后那一条链（TS：`((a?.b)!).c.d`），
      // 所以「先把 `!` 套成 `NonNullExpression`、再接子链的第一格」——套上去的位置就是
      // 那一格 `NotNull` 的末端。`a?.b!.c` 那条子链只有一格名字时由循环末尾那句补上。
      let pendingBang: number | undefined = bangUnit !== undefined ? bangEnd : undefined;
      let j = 0;
      while (j < members.length) {
        const member = members[j];
        if (member.get("type") === "NullConditionalOperator") {
          left = chainWithOptional(left, member, ctx);
          j += 1;
          continue;
        }
        if (isDot(member, ctx) && j + 1 < members.length) {
          // **上一次断言还没套上去就先套**（第 966 轮）：`a?.b!.c.d` 的 NCO 是
          // `[NotNull(b), ., PropertyAccess([c, ., d])]`——第二格那条子链**自己从 `c` 开头**，
          // 而它整个要接的受体是**断言之后**那一条链。
          // 原来那句同名赋值从来没写 ⇒ 断言压在手上、直接拿 `c` 去接 ⇒ 投出来的是
          // `a?.b!.d`（`.c` 整段丢，实测 `gap-r964-opt-assert-member-member`：
          // `PropertyAccessExpression` 与 `Identifier` 各漂）。折法与
          // `chainWithOptional` 的成员循环**一字不差**：接第一格之前先把 `!` 套成
          // `NonNullExpression`，`?.` 仍然挂在**内层**那一格上。
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
          }
          left = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: nameOf(members[j + 1], ctx),
            pos: left.pos,
            end: endOf(members[j + 1]),
          };
          j += 2;
          continue;
        }
        // **子链自己从一个名字开头**（第 971 轮，**普查当场红的**）：`a?.b!.c.d` 的 NCO
        // 第二格是 `PropertyAccess([c, ., d])`——**第一格就是成员名 `c`**，这条子链不是
        // 从点号开头的。上面那一支只认「点号 + 名字」那种成对形状，落单的第一格走到循环
        // 末尾那句空转的 `j += 1` ⇒ **`c` 整格丢、`.d` 直接接在断言后面**：投出来的是
        // `a?.b!.d`（实测 `gap-r964-opt-assert-member-member`：`PropertyAccessExpression`
        // 与 `Identifier` 各漂 2，`Identifier` 是那个 `d` 顶着 `c` 的位置）。
        // 折法与 `chainWithOptional` 子链分支末尾那句**一字不差**（名字接一格），
        // 顺序也一致：**先把手上那个 `!` 套成 `NonNullExpression`，再接这一格**。
        if (member.get("type") === "Identifier" || member.get("type") === "Keyword") {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = {
            kind: "PropertyAccessExpression",
            expression: left,
            name: nameOf(member, ctx),
            pos: left.pos,
            end: endOf(member),
          };
          j += 1;
          continue;
        }
        // **这一格自己是一次（或好几层）调用**（第 975 轮）：`a?.b!()()().c` 那条子链的
        // 第一格是 `Method(name=""[Method(name=""[Bracket(())])])`——子链循环里原来只有
        // 「名字」「下标」两支，`Method` 落到循环末尾那句空转的 `j += 1` ⇒ **三层调用整段丢**
        //（实测 `gap-r973-opt-assert-call-thrice-member`：缺 3）。
        // 折法与 `chainWithOptional` 子链分支那一支**同源**（第 975 轮收拢成同一对：
        // `innermostMethod` + `innermostCallee` + `graftCallee`）。
        // **核是 `NotNull` 的那一档让开**：它要按断言折（把 `!` 套在调用结果上），
        // 由 `chainWithOptional` / 本函数别处那几支管——这里只认「纯调用」那三种壳。
        const memberIsCall = (unit: any): bool => {
          const name = String(unit.get("name") ?? "");
          if (name !== "") return true;
          const inner = projectableKids(view(unit)).filter((k: any) => k.get("type") !== "GenericType");
          const head = inner.length > 0 ? inner[0] : undefined;
          if (head === undefined) return false;
          return head.get("type") === "Method"
            || (head.get("type") === "Bracket" && head.get("startBracket") === "(");
        };
        if (member.get("type") === "Method" && memberIsCall(member)) {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = graftCallee(
            projectNode(member, ctx),
            innermostCallee(left, innermostMethod(member), ctx),
            undefined,
          );
          j += 1;
          continue;
        }
        // **一对平级的圆括号也是链上的一格**（第 975 轮）：`a?.b![0]().c` 那条子链的
        // 第一格是 `Bracket(())`——它是**对左边那个结果再调一次**（与 `chainOnto` 顶端
        // 「紧跟一对圆括号 ⇒ 再调一次」那一支同一件事）。子链循环里原来只有「下标」那一支
        // ⇒ 圆括号落到循环末尾那句空转的 `j += 1` ⇒ **那次调用整格丢**
        //（实测 `gap-r973-opt-assert-index-call-member`：缺 1）。
        // 顺序与上面两支一致：**先把手上那个 `!` 套成 `NonNullExpression`，再接这一格**。
        if (member.get("type") === "Bracket" && member.get("startBracket") === "(") {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = {
            kind: "CallExpression",
            expression: left,
            arguments: splitTopLevel(projectableKids(view(member)), ctx, ",")
              .map((group) => (group.length === 0 ? undefined : projectExpression(group, ctx)))
              .filter((a: any) => a !== undefined),
            pos: left.pos,
            end: endOf(member),
          };
          j += 1;
          continue;
        }
        // **下标括号也是链上的一格**（第 973 轮）：`a?.b![0].c` 那条子链的第一格是
        // `Bracket([0])`——`chainWithOptional` 的子链分支里早就有这一支，而这里没有：
        // 它落到循环末尾那句空转的 `j += 1` ⇒ **下标整格丢**（实测
        // `gap-r971-opt-assert-index-member`：缺 `ElementAccessExpression` / `NumericLiteral`）。
        // 折法与 `chainWithOptional` 子链分支里那一支**一字不差**（同一形状、同一个判据），
        // 顺序也一致：**先把手上那个 `!` 套成 `NonNullExpression`，再接这一格**。
        if (member.get("type") === "Bracket" && member.get("startBracket") === "[") {
          if (pendingBang !== undefined) {
            left = {
              kind: "NonNullExpression",
              expression: left,
              pos: left.pos,
              end: pendingBang,
            };
            pendingBang = undefined;
          }
          left = {
            kind: "ElementAccessExpression",
            expression: left,
            argumentExpression: projectExpression(projectableKids(view(member)), ctx),
            pos: left.pos,
            end: endOf(member),
          };
          j += 1;
          continue;
        }
        j += 1;
      }
      // **子链吃完还没用掉的那个断言，仍然要套在整条链上**（第 966 轮）：
      // `a?.b!.c` 那条子链只有一格名字（不是 `c.d`）时，`isDot` 那一支不会响，
      // 断言就留在这里——不补这一句它整格丢。
      if (pendingBang !== undefined) {
        left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: pendingBang };
      }
    } else {
      left = {
        kind: "PropertyAccessExpression",
        expression: left,
        name: nameOf(next, ctx),
        pos: left.pos,
        end: endOf(next),
      };
    }
    // **那一格自带 `!` 的话，断言套在整条链上**（见上面那一段）。
    if (bangUnit !== undefined) {
      left = { kind: "NonNullExpression", expression: left, pos: left.pos, end: endOf(bangUnit) };
    }
    // **跨过几格**：点号那一档是「点号 + 成员」两格；抬出来的那一档（`unit` 自己是子链）
    // 只有 **1** 格（第 973 轮）。
    i += dotStep ? 2 : 1;
  }
  return left;
```

# private method isPrefixOperatorUnit:(node:any, ctx:any)=>bool

**这一格是不是一个前缀运算符**（第 379 轮）——只给「尖括号断言要吃多长」那一处用。

**为什么需要它**：`<T>expr` 是**前缀**那一档，所以它的操作数是「一个**一元表达式**」：
`<number>-x` 里断言管的是 `-x`（不是 `-` 自己），`<number>a + b` 里断言管到 `a` 就停。
判「到哪里停」要认得出前缀运算符那一串。

**只认**：单元型 `UnaryOperator`（`!x` / `typeof x` / `void x` / `delete x` / `await x` 与
`++i` / `--i` 在产物里都是它），以及**裸符号** `!` `~` `+` `-` `++` `--`
（`+` / `-` 在操作数位置上不会落成 `BinaryOperator`）。
**二元运算符不在这里**——它们住在 `BinaryOperator` / `LogicalOperator` 单元里，
不是一个裸符号，所以 `a + b` 的那个 `+` 撞不到这一支。

```ts
  const type = node.get("type");
  if (type === "UnaryOperator") return true;
  if (type !== "SymbolToken") {
    const text = textOfNode(node, ctx);
    return text === "typeof" || text === "void" || text === "delete" || text === "await";
  }
  const text = textOfNode(node, ctx);
  return text === "!" || text === "~" || text === "+" || text === "-" || text === "++" || text === "--";
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
  // **运算符不一定是 `SymbolToken`**（第 131 轮）：`in` / `instanceof` 是 `Keyword`
  // （`#x in o` 的 `in` 就是），与 `projectExpression` 里那条 `isOperatorUnit` 同一口径。
  if (rest.length < 2 || !isOperatorUnit(rest[0], ctx)) return left;
  const firstRank = operatorRank(textOfNode(rest[0], ctx));
  if (firstRank === 0) {
    // 赋值：右结合，交给递归。
    //
    // **但逗号比赋值更松**（第 180 轮）：`a = 1, a = 2` 的 TS 形状是
    // `BinaryExpression( BinaryExpression(a = 1), «,», BinaryExpression(a = 2) )`——
    // 赋值的**右操作数只到下一个顶层逗号为止**。
    // 少了这一格，右操作数会把逗号一起吃掉：实测 `(a = 1, a = 2)` 投成
    // `a = (1, a) = 2`（降级层于是报 `assignment to a non-identifier`，
    // 而**形状这一层**错得更早——`cases:tsast` 一量就红）。
    let commaAt = rest.length;
    for (let k = 1; k < rest.length; k++) {
      if (isOperatorUnit(rest[k], ctx) && textOfNode(rest[k], ctx) === ",") {
        commaAt = k;
        break;
      }
    }
    let right = projectExpression(rest.slice(1, commaAt), ctx);
    // **复合赋值**（第 96 轮）：token 层把 `a += 2` 展开成 `a = a + 2` 那一串（为执行层留一份
    // 可单独取出的运算符），所以这里看到的是「`=` + 一个 `BinaryOperator`」。TS 那边是**一个**
    // `BinaryExpression`、运算符是 `PlusEqualsToken`、右操作数是 `2`（不是 `a + 2`）。
    // 判据落在**原文**上：那个 `=` 单元的区间盖住的是 `+=` 这种两三个字符。
    // 照原样投会多出 `EqualsToken` + `PlusToken`、又缺那个复合 kind（实测 134 + 94）。
    const opText = ctx.source.slice(startOf(rest[0]), endOf(rest[0]));
    const operatorToken =
      opText === textOfNode(rest[0], ctx)
        ? projectNode(rest[0], ctx)
        : { kind: tokenKind(opText), text: opText, pos: startOf(rest[0]), end: endOf(rest[0]) };
    // **递归剥掉最左边那个 `left`**（第 168 轮）：展开式的左操作数**不只是那个左值**——
    // `a += b + c` 的产物是 `a = (a + b) + c`（token 层展开时把 `a` 埋进了内层），
    // 而 TS 要的是 `a += (b + c)`。原来只认「`right.left` 与 `left` 完全同区间」，
    // 这一族于是根本没被拆开（实测 `ex-chained-assign.ts` / `expr-assign-chained-compound.ts`：
    // 多出 `BinaryExpression` + `PlusToken`，缺真正的右操作数）。
    const stripSelf = (node) => {
      if (node === undefined || node.kind !== "BinaryExpression" || node.left === undefined) {
        return undefined;
      }
      if (node.left.pos === left.pos && node.left.end === left.end) {
        return node.right;
      }
      const stripped = stripSelf(node.left);
      if (stripped === undefined) {
        return undefined;
      }
      return { ...node, left: stripped, pos: stripped.pos, end: node.end };
    };
    // **后缀壳要能穿透**（第 290 轮）：`u += 2 as number` 的展开式是
    // `u = (u + 2) as number`（`As` 是**语句级**最后一个单元），
    // 而 TypeScript 要的是 `u += (2 as number)`——`as` 贴的是**复合赋值右操作数**那一段
    //（实测 `ts.createSourceFile`：`BinaryExpression(u, «+=», AsExpression(2))`）。
    // 原来的剥自己那一格只认**最外层就是 `BinaryExpression`**
    // ⇒ 包着壳时一格都没剥 ⇒ 下游拿到 `u += (u + 2)` ⇒ **静默错值**
    //（`total += xs.shift() as number` 实测从 499500 变成 `1.07e+301`）。
    // 判据：壳（`As` / `Satisfies` / `!`）里那一格剥完，壳**照原样罩回去**；
    // 壳里剥不动就整个不动（`u += (2 as number)` 那一格本来就没问题）。
    const stripSelfThrough = (node) => {
      if (node === undefined) return undefined;
      if (node.kind === "AsExpression" || node.kind === "SatisfiesExpression" || node.kind === "NonNullExpression") {
        const inner = stripSelfThrough(node.expression);
        if (inner === undefined) return undefined;
        return { ...node, expression: inner, pos: inner.pos };
      }
      return stripSelf(node);
    };
    // 壳里那一格是什么（只看形状，不动它）——用来核对「是不是同一个复合运算符」。
    const coreOf = (node) => {
      if (node === undefined) return undefined;
      if (node.kind === "AsExpression" || node.kind === "SatisfiesExpression" || node.kind === "NonNullExpression") {
        return coreOf(node.expression);
      }
      return node;
    };
    // **左嵌套的复合赋值展开**（第 168 轮）：`a += b -= c` 的产物是
    // `[a, «+=», HEAD(二元: a ⊕ b), «-=», TAIL(二元: (a ⊕ b) ⊖ c)]`——token 层把 `a`
    // 埋进了最左边那一格，于是通用递归拿到的左操作数是 `a ⊕ b` 而不是 `b`
    // （实测 `ex-chained-assign.ts` / `expr-assign-chained-compound.ts`：
    // 多出一个 `BinaryExpression(a += b)` + `PlusToken`，缺 `b -= c`）。
    // TS 那边是 `a += (b -= c)`。形状很窄（正好五格、两个二元单元、两个 `=` 单元），
    // 就在这里显式重建：把 TAIL 里最左边那个左值剥掉，内层用第二个 `=` 上的复合运算符。
    if (
      opText.length > 1 &&
      rest.length === 4 &&
      (rest[1].get("type") === "BinaryOperator" || rest[1].get("type") === "LogicalOperator") &&
      (rest[3].get("type") === "BinaryOperator" || rest[3].get("type") === "LogicalOperator") &&
      rest[2].get("type") === "SymbolToken" &&
      textOfNode(rest[2], ctx) === "=" &&
      ctx.source.slice(startOf(rest[2]), endOf(rest[2])).length > 1
    ) {
      const tailNode = projectNode(rest[3], ctx);
      const strippedTail = tailNode === undefined ? undefined : stripSelf(tailNode);
      if (
        strippedTail !== undefined &&
        strippedTail.kind === "BinaryExpression" &&
        strippedTail.left !== undefined
      ) {
        const innerText = ctx.source.slice(startOf(rest[2]), endOf(rest[2]));
        const inner = {
          ...strippedTail,
          operatorToken: {
            kind: tokenKind(innerText),
            text: innerText,
            pos: startOf(rest[2]),
            end: endOf(rest[2]),
          },
          pos: strippedTail.left.pos,
        };
        return {
          kind: "BinaryExpression",
          left,
          operatorToken,
          right: inner,
          pos: left.pos,
          end: inner.end,
        };
      }
    }
    if (
      opText.length > 1 &&
      right !== undefined &&
      coreOf(right) !== undefined &&
      coreOf(right).kind === "BinaryExpression" &&
      coreOf(right).left !== undefined &&
      // 展开出来的那个运算符单元**沿用同一个区间**（`+=` 的 [2,4)），所以判据看 kind、不看区间。
      coreOf(right).operatorToken !== undefined &&
      coreOf(right).operatorToken.kind === tokenKind(opText.slice(0, -1))
    ) {
      const stripped = stripSelfThrough(right);
      if (stripped !== undefined) {
        right = stripped;
      }
    }
    const assigned = {
      kind: "BinaryExpression",
      left,
      operatorToken,
      right,
      pos: left.pos,
      end: right ? right.end : endOf(rest[0]),
    };
    // **剩下的那一串逗号接着折**（左结合，`a = 1, b = 2, c = 3` 折成三层）。
    if (commaAt < rest.length) return foldBinaryFrom(assigned, rest.slice(commaAt), ctx);
    return assigned;
  }
  let node = left;
  let i = 0;
  while (i + 1 < rest.length) {
    const op = rest[i];
    // **运算符也可能是 `Keyword`**（第 131 轮）：`in` / `instanceof` 都是
    // （`#x in o` 的 `in`），只认 `SymbolToken` 会当场 `break`，运算符与右操作数一起丢。
    if (!isOperatorUnit(op, ctx)) break;
    const rank = operatorRank(textOfNode(op, ctx));
    // 下一个「同级或更低优先级」的运算符就是这一段的终点。
    let stop = rest.length;
    for (let k = i + 1; k < rest.length; k++) {
      // **尖括号断言那一组不是运算符**（第 379 轮）。
      //
      // `x < <number>y` 与 `<number>a < <number>a` 里都有「一个 `<` 起的是**断言**」——
      // 把它当成比较运算符就会在这一格切段 ⇒ 右操作数是**空的**
      // ⇒ 折出一个**没有 `right` 的 `BinaryExpression`**，降级层报
      // `ast node BinaryExpression has no child right`（**形状层的内部错误**，
      // 比「读错了值」更难查）。
      //
      // **只在操作数位置上认**：`k` 前面那一格是运算符（或它就是这一段的第一格）
      // ⇒ 这个 `<` 前面**没有左操作数** ⇒ 只可能是断言。
      // 比较式 `a < b < c` 的第二个 `<` 前面是 `b`（一个名字）⇒ 这里不跳，照旧切段。
      if ((k === 0 || isOperatorUnit(rest[k - 1], ctx)) && angleAssertionLength(rest, k, ctx) > 0) {
        k += angleAssertionLength(rest, k, ctx) - 1;
        continue;
      }
      if (isOperatorUnit(rest[k], ctx) && operatorRank(textOfNode(rest[k], ctx)) <= rank) {
        stop = k;
        break;
      }
    }
    const right = projectExpression(rest.slice(i + 1, stop), ctx);
    node = {
      kind: "BinaryExpression",
      left: node,
      // **运算符那一格按文本定 kind**（第 550 轮）：`in` / `instanceof` 在深度界那一层
      // 还是 `Identifier`，见 `operatorTokenOf`。
      operatorToken: operatorTokenOf(op, ctx),
      right,
      pos: node.pos,
      end: right ? right.end : endOf(op),
    };
    i = stop;
  }
  return node;
```

# private method angleAssertionLength:(kids:Array<any>, at:int, ctx:any)=>int

**从 `at` 起是不是一个「平的尖括号断言」**（`<T>操作数`），是的话返回它有多长；
不是就返回 `0`（第 379 轮）。

**为什么需要它**：`x < <number>y` 里的第二个 `<` 在产物里是**平的符号**
（它不在表达式的最开头，所以 token 层没把它收成 `GenericType`——
第 379 轮把「运算符之后」那一档也放行了，于是**现在多半已经收起来了**，
可**收不起来的那些**（后继闸没过）仍然会走到这里）。
把它当成比较运算符就会切出空的右操作数 ⇒ 折出一个没有 `right` 的节点
（实测 `ast node BinaryExpression has no child right`）。

**判据只看形状**：`<`、配对到 `>`、`>` 后面**还有一格操作数**
（前缀运算符可以连着几格，与断言那一支同一口径）。
**「这个 `<` 前面有没有左操作数」由调用方判**（那一格信息只有它手上有）——
所以这里不做位置判断，只回答「这一组长得像不像断言」。

```ts
  if (at >= kids.length) {
    return 0;
  }
  const opener = kids[at];
  if (opener.get("type") !== "SymbolToken" || textOfNode(opener, ctx) !== "<") {
    return 0;
  }
  let depth = 0;
  let close = -1;
  for (let i = at; i < kids.length; i++) {
    const text = kids[i].get("type") === "SymbolToken" ? textOfNode(kids[i], ctx) : "";
    if (text === "<") {
      depth += 1;
    } else if (text === ">") {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  // **`<T>` 里至少要有一样东西，后面至少要跟着一格操作数**（`< > x` 那种空段不算）。
  if (close <= at + 1 || close + 1 >= kids.length) {
    return 0;
  }
  let operandEnd = close + 1;
  while (operandEnd < kids.length && isPrefixOperatorUnit(kids[operandEnd], ctx)) {
    operandEnd += 1;
  }
  if (operandEnd >= kids.length) {
    return 0;
  }
  return operandEnd + 1 - at;
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

# private method projectHeadDeclare:(kids:Array<any>, ctx:any, container:any)=>any

**没有 `Let` 的声明段**：`for (const v of xs)` / `for (const k in o)` 的头部（第 545 轮）。

TS 那边 `ForOfStatement.initializer` 与 `for (let i = 0; …)` 一样**直接就是
`VariableDeclarationList`**（不套 `VariableStatement`）。可产物在这一档里**没有 `Let`**：
解析期的 `LetBranch` 只在 `=` / `:` / `;` / `,` / 换行那几格进门，`of` / `in` 不在其中，
所以声明段一直是 `[Keyword(const), Identifier(v)]` **两格平铺**——投影那一支
（`foreach.xl.md` 的 `PrintAst`）只认「第一个子单元是 `Let`」⇒ 整段被当表达式投
⇒ `initializer` 成了 `Identifier("const")`（实测 6 份：`st-for-of` / `stmt-for-of-call` /
`stmt-for-of-no-block` / `st-for-await` / `stmt-for-await` / `fn-async-generator`）。

名字那一格是**唯一**一个名字单元 / 模式括号（`for (const [a, b] of xs)`），
按形态分派给 `nameOf` / `projectBindingPattern`；列表的标志位从头顶那个词读
（`flagsOf` 读的是 `modifiers` 属性，这一档没有那个属性）。

**名字那一格的判据与 `isNameNode` 同一条**（第 598 轮）：`Keyword` 也算名字 不是风格问题——
`for (const set of xs)` 里那个 `set` 会被 `KeywordCloseRule` 升成 `<Keyword>set</Keyword>`
（`keyword.xl.md` 的 `IsUpgradable`），只认 `Identifier` 就**整段找不到名字** ⇒ 本方法给
`undefined` ⇒ `initializer` 整格消失 ⇒ 降级层报
`ast node ForOfStatement has no child initializer`（**整份文件进不来**，判据
`c305-e2e-event-emitter-generic`；`get` / `override` 当绑定名同理）。
名字那一格**一律投 `Identifier`**：绑定名按定义就是一个标识符，不看那个词在别处是不是关键字。

```ts
  const inner = kids.filter((k) => !INVISIBLE.has(k.get("type")));
  if (inner.length === 0) return undefined;
  // **名字那一格从后往前找**：`const` / `let` / `var` / `using` 与 `await` 都可能还是
  // `Identifier`（关键字升级在本单元的那一趟里跑，投影这一趟是**之后**的事）——
  // 从前往后找会把那个词当成名字。
  const isPatternKid = (k: any) =>
    k.get("type") === "ArrayLiteral" ||
    k.get("type") === "ObjectLiteral" ||
    (k.get("type") === "Bracket" && (k.get("startBracket") === "[" || k.get("startBracket") === "{"));
  const isDeclareWord = (k: any) => {
    const text = textOfNode(k, ctx);
    return text === "const" || text === "let" || text === "var" || text === "using";
  };
  let nameKid = undefined;
  for (let at = inner.length - 1; at >= 0; at--) {
    const one = inner[at];
    if ((isNameNode(one) || isPatternKid(one)) && !isDeclareWord(one)) {
      nameKid = one;
      break;
    }
  }
  if (nameKid === undefined) return undefined;
  const declared = isPatternKid(nameKid) ? projectBindingPattern(nameKid, ctx) : nameOf(nameKid, ctx);
  // **列表的起点是那个声明词**、不是段里的第一格：`for await (const v of xs)` 的段里
  // `await` 排在 `const` 前面（TS 那边它是 `ForOfStatement.awaitModifier`、
  // 不是列表的一部分）——**所以这个声明词要从后往前找**（第 546 轮）：
  // 从前往后找时 `await` 自己就是 `Identifier`、`textOfNode` 也答 `"await"`，
  // 可 `inner.find` 只认「是不是声明词」 ⇒ 第一格 `await` 被当成起点
  // ⇒ 列表区间从 `await` 起（实测 `st-for-await` / `stmt-for-await` / `fn-async-generator`
  // 三份都是 `[82,96)` 对 TS 的 `[89,96)`）。声明词在名字前面、`await` 更靠前，
  // 从后往前找拿到的就是**离名字最近**的那个声明词（判据 `isDeclareWord` 与上面共用）。
  let declareKid = undefined;
  for (let at = inner.length - 1; at >= 0; at--) {
    if (isDeclareWord(inner[at])) {
      declareKid = inner[at];
      break;
    }
  }
  const head = declareKid === undefined ? inner[0] : declareKid;
  const headText = textOfNode(head, ctx);
  const flags = headText === "const" ? "Const" : headText === "var" ? "None" : "Let";
  return {
    kind: "VariableDeclarationList",
    declarations: [{ kind: "VariableDeclaration", name: declared, pos: startOf(nameKid), end: endOf(nameKid) }],
    flags,
    pos: startOf(head),
    end: endOf(inner[inner.length - 1]),
  };
```

# private method isIndexBracket:(node:any)=>bool

**值位下标访问的那对方括号**：`a[i]` 的 `[` 括号单元。

判据只有「是不是 `[` 括号」——值位里前面有操作数的 `[` 就是下标（见 `projectExpression`
那一支的说明），没有操作数的那些早被 `ArrayLiteral` 收走，类型位的那些是 `IndexedAccessType`。
（与 `isDot` / `isNameNode` 那几个小判据同一个位置。）

```ts
  return node.get("type") === "Bracket" && node.get("startBracket") === "[";
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
  // **尾部 trivia 要剪掉**（第 853 轮）：TS 的节点终点**从不含 trivia**，而产物常把尾随注释
  // 收进**最后一个单元里面**——`const f = (a, b) => a/*c*/;` 那条注释落在
  // `LamdaBody > Statement` 里，`Lamda` 自己的区间就盖到了注释末尾（实测 `[10,26)`，
  // 而 TS 的 `ArrowFunction` 是 `[10,21)`）⇒ 声明列表与声明各长出一截
  // （`gap-sweep-comment-arrow-01`：漂 2 多 2）。判据走 `stmtEndOf`——它就是投影层
  // 「节点终点不含尾部 trivia」的那一份实现（第 132 轮，投影出的每个节点都走它），
  // 这里不另写一份「往回吃注释」的循环。**`stmtEndOf` 收的是视图**（与 `endOf` 那个
  // 读 `range` 的助手不同）：这一层的 `kids` 是节点字典，所以要 `view(...)` 一次。
  const listEnd =
    kids.length > 0 ? Math.min(stmtEnd, stmtEndOf(view(kids[kids.length - 1]), ctx)) : stmtEnd;
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
  // **绑定模式是 `Let` 的平级兄弟**（第 135 轮）：`const [[a, b], [, c = 0]] = …` 的产物是
  //
  //     Statement > [ Let(arrayPattern="a,b,c,0"), ArrayLiteral(带 BindingElement 的模式), =, ArrayLiteral(RHS) ]
  //
  // ——那个**结构化的** `ArrayLiteral` / `ObjectLiteral` 在 `Let` **外面**（`=` 的左边），
  // 而 `Let` 自己只记了一个扁平的 `arrayPattern="a,b,c,0"` 属性（嵌套与洞全丢）。
  // 早先只在 `Let` 的子单元里找，于是永远找不到、退回 `bindingSpan` 造一个空壳：
  // `elements` 空着、里面的 `BindingElement` 与名字整片丢
  // （实测 `decl-arr-destructure-nested` / `vars-destructure-nested` /
  // `decl-destructure-nested-names` 三族共 27 处）。所以先在**整段列表里 `=` 左边**找。
  const eqAt = kids.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=");
  const headKids = eqAt >= 0 ? kids.slice(0, eqAt) : kids;
  const isPatternUnit = (k: any) =>
    k.get("type") === "ArrayLiteral" ||
    k.get("type") === "ObjectLiteral" ||
    (k.get("type") === "Bracket" && (k.get("startBracket") === "[" || k.get("startBracket") === "{"));
  const patternUnit =
    headKids.find(isPatternUnit) ?? projectableKids(letView).find(isPatternUnit) ?? null;
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
    // **初始化式是 `=` 右边**整段**，不是一格**（第 101 轮）：`const a = this.Parent!.Data.indexOf(this)`
    // 的右边在产物里是**四个平级单元**（`NotNull` / `.` / `PropertyAccess` / …），
    // 原来只取第一格——于是整条链只剩最前面那个 `NotNull`，链尾全丢
    // （实测 `NonNullExpression` 多出 71 + 漂移 76、`DotToken` 多出 75、`PropertyAccessExpression`
    // 漂移 24 都是它）。
    const initKids = eq >= 0 ? one.slice(eq + 1) : [];
    const initializer = initKids.length === 0 ? undefined : projectExpression(initKids, ctx);
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
      initializer,
      pos: oneName.pos,
      // **同一个口径**（第 853 轮）：声明自己的终点是「这个声明符**最后一个单元**的终点」，
      // 而那一格里面可能含着尾随注释——剪法与上面 `listEnd` 一字不差（`stmtEndOf`）。
      end: one.length > 0 ? Math.min(stmtEnd, stmtEndOf(view(one[one.length - 1]), ctx)) : listEnd,
    };
    // **类型标注是声明的一部分，但它在 `Statement` 那一层**：`let a: string;` 的产物是
    // `Statement > [Let(``let a``), TypeDefine(``: string``)]`——`TypeDefine` 是 `Let` 的**兄弟**，
    // 不在 `Let` 里面（`Field` 那种才在自身里面）。TS 那边 `VariableDeclaration[4,13)` = `a: string`。
    const typeNode = one.find((k) => k.get("type") === "TypeDefine");
    if (typeNode !== undefined) declaration.type = ctx.Project(typeNode);
    // **明确赋值断言 `let a!: number`**（第 156 轮）：TS 那边是
    // `VariableDeclaration.exclamationToken`（`!` 是一个子节点），产物把它记成一个平级的
    // `SymbolToken("!")`。不收的话缺 `ExclamationToken` + 字段名差一格
    // （实测 `vars-definite.ts`：`VariableDeclaration` 与 `PropertyDeclaration` 各一处）。
    const bang = one.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "!");
    if (bang !== undefined) declaration.exclamationToken = projectNode(bang, ctx);
    return declaration;
  });
  const list = {
    kind: "VariableDeclarationList",
    declarations,
    flags: flagsOf(letView),
    pos: listStart,
    end: listEnd,
  };
  // **起点跳过前导 trivia**（第 161 轮）：`/* a */ const x = 1;` 里那个 `Statement` 从注释起，
  // 而 TS 的 `VariableStatement.getStart()` 会跳过它（实测 `lex-comment-two-on-one-line.ts`：
  // 产物 106 vs TS 114）。
  const firstReal = kids.find((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  const statementStart = firstReal === undefined ? container.start : startOf(firstReal);
  const statement = { kind: "VariableStatement", declarationList: list, pos: statementStart, end: stmtWhole };
  // **`VariableStatement` 的修饰词只有语句级那几个**：`export const q = 1` 的 TS 是
  // `VariableStatement(modifiers=[ExportKeyword])` + `List(flags=Const)`——
  // `const` / `let` / `var` 是**列表的 flags**，不是语句的修饰词（混进去会多出一个 `ConstKeyword`）。
  const holder = {};
  addModifiers(letView, holder, ctx);
  const statementModifiers = holder.modifiers ?? [];
  // **`await` / `using` 也不是语句修饰词**（第 151 轮）：它们是**列表的 flags**
  // （`VariableDeclarationList.flags = AwaitUsing`），挂到语句上会多出两个节点。
  const onlyStatementLevel = statementModifiers.filter(
    (m) => !["const", "let", "var", "await", "using"].includes(m.text),
  );
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
  // **括号形态也要认**（第 137 轮）：绑定位里 `{ a }` / `[a]` 有时还没被
  // `JsonObjectCloseRule` / `JsonArrayCloseRule` 收成 `ObjectLiteral` /
  // `ArrayLiteral`（`[k2]: { a }` 里右边那一格就是一对裸花括号）——只认那两种标签时
  // 整层 `ObjectBindingPattern` 连里面的 `BindingElement` 一起丢。
  const braceKind =
    v.type === "ArrayLiteral" || (v.type === "Bracket" && v.startBracket === "[")
      ? "ArrayBindingPattern"
      : "ObjectBindingPattern";
  const kind = braceKind;
  const elements = [];
  const kids = projectableKids(v);
  // **洞 `[, c]` 是一个零宽的 `OmittedExpression`**（第 135 轮）：TS 在元素表里留一格
  // 零宽节点（`ArrayBindingPattern.elements = [OmittedExpression, BindingElement]`），
  // 而产物那边只有一个逗号、什么都没有。**尾随逗号不算洞**（`[a, b,]` 只有两个元素）。
  const groups = [];
  const commaAts = [];
  let group = [];
  for (const kid of kids) {
    if (kid.get("type") === "SymbolToken" && textOfNode(kid, ctx) === ",") {
      groups.push(group);
      commaAts.push(startOf(kid));
      group = [];
      continue;
    }
    group.push(kid);
  }
  groups.push(group);
  let cursor = v.start + 1;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i].length === 0) {
      if (i === groups.length - 1) break;
      elements.push({ kind: "OmittedExpression", pos: cursor, end: cursor });
    } else {
      for (const kid of groups[i]) {
        if (kid.get("type") === "BindingElement") elements.push(projectBindingElement(kid, ctx));
      }
    }
    if (i < commaAts.length) cursor = commaAts[i] + 1;
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
  // **绑定位里还能再嵌一层模式**（第 135 轮）：`[[a, b], …]` 的元素是**另一个**
  // `ArrayLiteral` / `ObjectLiteral`（`{ b: [c, d = 2] }` 里 `:` 右边也是）。
  // 原来只找名字，`names` 为空时那个 `BindingElement` 连 `name` 都没有——
  // 嵌套的 `ArrayBindingPattern` / `ObjectBindingPattern` 与它们里面的名字整片丢
  // （实测三族嵌套解构用例共 27 处）。
  const isPatternLike = (k: any) =>
    k.get("type") === "ArrayLiteral" ||
    k.get("type") === "ObjectLiteral" ||
    (k.get("type") === "Bracket" && (k.get("startBracket") === "[" || k.get("startBracket") === "{"));
  // **默认值那一侧的括号不算绑定名**（第 355 轮，**实测撞到的**）：
  // `{ tags = [] as string[] }` 里 `=` **右边**那个 `[]` 是**默认值**（值位），
  // 而照「第一个像模式的单元」找会把它当成**绑定名** ⇒ 投出一个**没有 text** 的
  // `ArrayBindingPattern` ⇒ 降级期报 `ast node ArrayBindingPattern has no text`
  //（**那条消息原来不带区间**，第 355 轮才补上——补上之后一眼看出是哪个 `[]`
  // （`at 46..48`），**这一步省掉了一整轮插桩**）。
  // 判据与上面 `colonIndex` 那一支同一条纪律：**切分点左边才是名字**。
  const beforeEq = eqIndex >= 0 ? kids.slice(0, eqIndex) : kids;
  const patternKid = beforeEq.find(isPatternLike);
  const props = {};
  if (dots !== undefined) {
    props.dotDotDotToken = { kind: "DotDotDotToken", text: "...", pos: startOf(dots), end: startOf(dots) + 3 };
  }
  if (colonIndex >= 0) {
    // `p: q` / `p: [a, b]`：冒号左边是属性名、右边是绑定名（或一层模式）。
    // **左边也可能是一个计算名 `[k]: v`**（第 137 轮）：产物里它是 `ArrayLiteral` / `[` 括号，
    // TS 那边是 `ComputedPropertyName`（实测 `decl-binding-computed-key.ts` 缺
    // `ComputedPropertyName` 2 + `Identifier` 2 + 字段名 2）。
    const computedUnit = kids.find(
      (k) =>
        (isIndexBracket(k) || k.get("type") === "ArrayLiteral") && startOf(k) < startOf(kids[colonIndex]),
    );
    if (computedUnit !== undefined) {
      props.propertyName = {
        kind: "ComputedPropertyName",
        expression: computedNameExpression(computedUnit, ctx),
        pos: startOf(computedUnit),
        end: endOf(computedUnit),
      };
    } else {
      const before = names.find((k) => endOf(k) <= startOf(kids[colonIndex]));
      // **键是一个引号名**（第 693 轮，**实测撞到的**）：`const { "x": a } = o` 的键那一格
      // 是 `<String><ConstString>x</ConstString></String>`，而 `isNameNode` 只认
      // `Identifier` / `Keyword` ⇒ 这一格**找不到键** ⇒ `propertyName` 整个丢掉，
      // 降级层随后把**绑定的名字**当成键（`{ "x": a }` 读成了 `{ a }`）
      // ⇒ `const { "x": a } = { x: 9 }` **静默给 `undefined`**（JS 给 `9`）。
      // 取法与 `specifierNameOf` 那条**一字不差**：引号名给 `StringLiteral`
      //（`text` 是引号里那段），其余走 `nameOf`——键的取法本来就只有这一种。
      // 位置落在**原始 Map** 上，`stringText` / `astNode` 吃的是**视图**，所以这里要过一趟 `view`。
      const quotedBefore = kids.find(
        (k) =>
          (k.get("type") === "String" || k.get("type") === "ConstString") &&
          endOf(k) <= startOf(kids[colonIndex]),
      );
      if (quotedBefore !== undefined) {
        props.propertyName = astNode(
          "StringLiteral",
          { text: stringText(view(quotedBefore), ctx) },
          view(quotedBefore),
          ctx,
        );
      } else if (before !== undefined) {
        props.propertyName = nameOf(before, ctx);
      }
    }
    // **冒号右边那一格**才是绑定名 / 嵌套模式；`[k2]: { a }` 里冒号**左边**那个
    // `ArrayLiteral` 是计算名（第 137 轮）——`patternKid` 取的是「第一个模式单元」，
    // 在这里会取错，所以要按**位置**重新找一次。
    const afterColon = kids.find(
      (k) => isPatternLike(k) && startOf(k) > startOf(kids[colonIndex]),
    );
    const afterPattern = afterColon;
    if (afterPattern !== undefined) {
      props.name = projectBindingPattern(afterPattern, ctx);
    } else {
      const after = names.find((k) => startOf(k) > startOf(kids[colonIndex]));
      if (after !== undefined) props.name = nameOf(after, ctx);
    }
  } else if (patternKid !== undefined) {
    props.name = projectBindingPattern(patternKid, ctx);
  } else if (names.length > 0) {
    props.name = nameOf(names[0], ctx);
  }
  if (eqIndex >= 0 && eqIndex + 1 < kids.length) {
    // **默认值不只是一格**（第 135 轮）：`[c, d = 2] = []` 里那个默认值是**一对括号**
    // （`ArrayLiteral`），照「取一格当叶子」投会把它当成 `Identifier("")`。
    const rest = kids.slice(eqIndex + 1);
    const only = rest.length === 1 ? rest[0] : undefined;
    props.initializer =
      only !== undefined && isNameNode(only)
        ? {
            kind: leafKindOfText(textOfNode(only, ctx)),
            text: textOfNode(only, ctx),
            pos: startOf(only),
            end: endOf(only),
          }
        : projectExpression(rest, ctx);
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
  const words = modifiers.split(",").filter((w) => w !== "");
  if (words.length === 0) return v.start;
  // **`await using x`**（第 151 轮）：`await` 与 `using` 都是**声明列表**的标志
  // （TS 那边是 `VariableDeclarationList.flags = AwaitUsing`，两个词都**不是**语句修饰词），
  // 所以列表要从 `await` 起。其余情形列表从**最后一个**修饰词起
  // （`export const x` 的列表从 `const` 起，而语句从 `export` 起）。
  // 实测 `decl-await-using-basic.ts` / `vars-await-using.ts`：列表起点差 6 格，
  // 语句上还多出 `AwaitKeyword` / `UsingKeyword` 两个节点。
  const from = words[0] === "await" ? words[0] : words[words.length - 1];
  // **位置首选 token 记的字段**（见 `modifierSpansOf`）：有它就不回原文猜。
  const spans = modifierSpansOf(v);
  if (spans.length === words.length) {
    return words[0] === "await" ? spans[0].pos : spans[spans.length - 1].pos;
  }
  const at = ctx.source.indexOf(from, v.start);
  return at >= 0 ? at : v.start;
```

# private method flagsOf:(v:any)=>int

```ts
  const modifiers = String(v.attrs.get("modifiers") ?? "");
  const words = modifiers.split(",");
  // **显式资源管理声明是列表自己的标志位**（第 655 轮）：`using x = f()` 是 `Using`、
  // `await using x = g()` 是 `AwaitUsing`——它们不是 `Let`。
  // 这一格过去只有 `Const` / `None` / 其余全是 `Let` 三支，`using` 静默落进 `Let`
  //（`modifiers` 里那两个词**解析期就已经记下了**，是投影这一支没读）。
  if (words.includes("using")) return words.includes("await") ? "AwaitUsing" : "Using";
  if (words.includes("const")) return "Const";
  if (words.includes("var")) return "None";
  return "Let";
```

# private method projectSignedLiteralType:(v:any, ctx:any)=>any

`LiteralType > [加号/减号, 数字]` → `LiteralType > PrefixUnaryExpression`；不是这个形状给 `undefined`
（调用方照原来那条路走）。

TS 把 `-1` 读成**前缀一元表达式**（`PrefixUnaryExpression{ operator: MinusToken, operand: NumericLiteral }`），
而不是「一个减号 + 一个数字」两个平级节点——所以那个 `-` 必须进 `operator` 字段、不进 `children`。

```ts
  const kids = projectableKids(v);
  if (kids.length !== 2) return undefined;
  const head = kids[0];
  if (head.get("type") !== "SymbolToken") return undefined;
  const op = textOfNode(head, ctx);
  if (op !== "-" && op !== "+") return undefined;
  const operand = projectNode(kids[1], ctx);
  if (operand === undefined) return undefined;
  return {
    kind: "LiteralType",
    literal: {
      kind: "PrefixUnaryExpression",
      // **临时标记**（第 66 轮）：用来证明「值位那个节点到底是不是这里造的」。
      // 探针里出现它就说明是这里；不出现就说明还有第三处。查完删掉。
      // **`operator` 放运算符文本**（不是 `tokenKind(op)` 那种名字）：**类型位与值位共用这一处**
      // （`type X = -1` 与 `let y = -1` 的产物同形），而降级层要按文本分派。
      // 对拍尺子只比**字段名**、不比值，所以两种写法尺子都认——文本更有用。
      operator: op,
      operand,
      pos: startOf(head),
      end: operand.end,
    },
    pos: v.start,
    end: stmtEndOf(v, ctx),
  };
```

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

**一个名字单元 → `Identifier` 节点**（第 4463 行这一格是 `ctx.NameOf` 的实现，
对象字面量的键、限定名的右半、类型引用的名字都走它）。

**位置用原文、`text` 用解开的**（第 382 轮）：`{ \u0061: 1 }` 那个键在源码里占
**6 个字符**（`end` 要按它算），而它的**名字**是 `a`（TS 的 AST `text` 也是 `a`）。
**这一格第 381 轮漏了**——那时候改的是 `Identifier.PrintAst`（**子单元**那条路）
与投影读**属性**那三处，而对象字面量这一支是**自己拿文本合一个节点**的
（`ctx.NameOf(nameUnits[0])`），压根不经过前两条 ⇒
`Object.keys({ \u0061: 1 })` 给 `["\u0061"]`、`x.a` 给 `undefined`（**静默错值**）。

```ts
  const text = textOfNode(node, ctx);
  const at = startOf(node);
  return { kind: "Identifier", text: Translate.DecodeIdentifierEscapes(text), pos: at, end: at + text.length };
```

# private method functionTypeProps:(kids:Array<any>, ctx:any)=>any

**函数类型 / 构造类型那一格的 `{ kind, props }`**——`FunctionType.PrintAst`（`function-type.xl.md`）
与 `projectTypeExpression`（下面那一格的「平铺 `( … ) => T` 段」）**共用同一份**。

**为什么要把这一格搬到这里**（第 927 轮（三））：柯里化的函数类型在 token 层被整段收进
**同一个** `FunctionType` 节点（`function-type.xl.md` 的收集循环「`=>` 只在左边是形参表时继续」），
于是**返回类型**那一格交回类型投影时是**平铺**的 `Bracket` / `SymbolToken(=>)` / 类型 三格——
它得再投出**里层那个 `FunctionType`**。两处要的是同一件事，所以只留一份实现：
`PrintAst` 拿 `{ kind, props }` 去配 `NodeHead`（坐标来自它自己那个单元视图），
`projectTypeExpression` 拿同一份去配**这一段的起止**（第一格的起点到最后一格的终点）。

**返回的是 `{ kind, props }` 而不是节点**：坐标由调用方给（两边的坐标来源不同——
一个是视图、一个是平铺单元的起止），而 `kind` 与 `props` 逐字相同。

```ts
  const arrowIndex = kids.findIndex(
    (k: any) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=>",
  );
  const before = arrowIndex < 0 ? kids : kids.slice(0, arrowIndex);
  const generic = before.find((k: any) => k.get("type") === "GenericType");
  const newUnit = before.find((k: any) => k.get("type") === "Keyword" && textOfNode(k, ctx) === "new");
  const props: any = {};
  const params = [];
  for (const k of before) {
    if (k === generic || k === newUnit) continue;
    if (k.get("type") === "Keyword" && textOfNode(k, ctx) === "abstract") {
      props.modifiers = [...(props.modifiers ?? []), projectNode(k, ctx)];
      continue;
    }
    if (k.get("type") === "Bracket") {
      for (const part of splitTopLevel(unwrapNodes(k), ctx, ",")) {
        for (const inner of part) params.push(inner);
      }
      continue;
    }
    params.push(k);
  }
  if (generic !== undefined) {
    const typeParams = unwrapNodes(generic).filter((k: any) => k.get("type") === "TypeParameter");
    if (typeParams.length > 0) props.typeParameters = projectEach(typeParams, ctx);
  }
  props.parameters = projectEach(params, ctx);
  if (arrowIndex >= 0 && arrowIndex + 1 < kids.length) {
    props.type = typeOf(kids.slice(arrowIndex + 1), ctx);
  }
  return { kind: newUnit === undefined ? "FunctionType" : "ConstructorType", props };
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
  // **只滤掉 `,`，`|` / `&` 留着**（第 133 轮）：逗号是类型实参表的分隔符（不是类型的
  // 一部分），而 `|` / `&` 是**类型运算符**——调用方直接递一列平铺单元时
  // （`projectTypeParameter` 把包住约束的 `UnionType` 摊开再拼回来就是这种），
  // 把 `|` 一并滤掉会让整条联合被当成「名字 + 实参」投成一个 `TypeReference`
  // （实测 `undici-types/header.d.ts` 的 `{ [K in HeaderNames | Lowercase<HeaderNames>]?: … }`）。
  const list = nodes.filter(
    (k) => k instanceof Map && !INVISIBLE.has(k.get("type")) && !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ","),
  );
  if (list.length === 0) return undefined;
  // **平铺的 `( … ) => T` 段**（第 927 轮（三））：这一段是**里层的函数类型**——
  // 柯里化（`() => () => void`）与「返回类型自己是一段函数类型」的形状在 token 层被整段收进
  // **同一个** `FunctionType` 节点（见 `function-type.xl.md` 的收集循环），于是交到这里的
  // 是平铺的 `Bracket` / `SymbolToken(=>)` / 类型 三格。少了这一支，那个 `(` 会当成裸 `Bracket`
  // 投出去、`void` 整格不见（实测：缺里层 `FunctionType` + `VoidKeyword`、多一个 `Bracket`）。
  //
  // **必须排在联合 / 交叉那一支**前面**：`() => A | B` 在 TS 那边是
  // `FunctionType(type = UnionType[A, B])`（`=>` 比 `|` 松），先按 `|` 切就会拆成
  // `UnionType[FunctionType(() => A), B]`——两层的方向反了。
  const flatArrowAt = list.findIndex(
    (k, i) => i > 0 && k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=>",
  );
  if (flatArrowAt > 0 && list[0].get("type") === "Bracket") {
    const built = functionTypeProps(list, ctx);
    return {
      kind: built.kind,
      pos: startOf(list[0]),
      end: endOf(list[list.length - 1]),
      ...built.props,
    };
  }
  // **平铺的联合 / 交叉**（第 133 轮）：见上。按**最外层**的分隔符切段、每段自己递归。
  const isTypeOp = (k: any, text: string) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === text;
  for (const [op, kind] of [
    ["|", "UnionType"],
    ["&", "IntersectionType"],
  ] as Array<[string, string]>) {
    // `&` 比 `|` 紧：收 `|` 时可以穿过 `&`（`A | B & C` 是 `A | (B & C)`），反过来不行。
    const at = list.findIndex((k, i) => i > 0 && i + 1 < list.length && isTypeOp(k, op));
    if (at <= 0) continue;
    const types = [];
    let start = 0;
    for (let i = 1; i < list.length; i++) {
      if (!isTypeOp(list[i], op) || i + 1 >= list.length) continue;
      const one = projectTypeExpression(list.slice(start, i), ctx);
      if (one !== undefined) types.push(one);
      start = i + 1;
    }
    const tail = projectTypeExpression(list.slice(start), ctx);
    if (tail !== undefined) types.push(tail);
    if (types.length > 1) {
      return { kind, types, pos: startOf(list[0]), end: endOf(list[list.length - 1]) };
    }
  }
  // **带符号的数字字面量类型**（第 124 轮）：`type X = -1 | 0 | 1` 的产物是
  // `LiteralType > [SymbolToken(-), Identifier(1)]`，而 TS 那边那个 `literal` 是
  // **一个** `PrefixUnaryExpression`（`operator` 是 `MinusToken`、`operand` 是数字）。
  // 不折这一层的话 `-` 会投成一个孤立的 `MinusToken`、`PrefixUnaryExpression` 整类缺
  // （实测 `typescript.d.ts` 的 `pos: -1;` / `end: -1;`）。
  if (list.length === 1 && list[0].get("type") === "LiteralType") {
    const signed = projectSignedLiteralType(view(list[0]), ctx);
    if (signed !== undefined) return signed;
  }
  // **点号名已经折成一个 `PropertyAccess` 单元**（第 128 轮）：类型位的限定名
  // （`NodeJS.ArrayBufferView`）本该是 `TypeReference > QualifiedName`，可链一旦在
  // token 层折成单元，下面那个「逐格套 `QualifiedName`」的循环就再也进不去
  // （它只看**平级**的点号）——于是落到最后那句「投第一个单元」，
  // `projectNode(PropertyAccess)` 走值位那条路投出一个 `PropertyAccessExpression`
  // （实测 `@types/node/util.d.ts` 的 `object is NodeJS.ArrayBufferView` 一族 46 处）。
  // 只认「全是名字与点号」的形状：带调用的链（`f(x).y`）不是类型。
  // **平的 `<...>` 类型实参段**（第 171 轮）：有些位置 token 层没把实参收成 `GenericType`
  // ——`A[Lowercase<K>]` 里那个 `<` 落在 `IsTypePosition` 的白名单之外，产物是
  // `[名字, SymbolToken(<), 实参…, SymbolToken(>)]` **平铺**五格。TS 那边照样是带
  // `typeArguments` 的 `TypeReference`（实测 `undici-types/header.d.ts` 的
  // `KnownHeaderValues[Lowercase<K>]`：缺 `TypeReference` + `Identifier`，名字那格的区间也短）。
  const openAt = list.findIndex(
    (k, i) => i > 0 && k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "<",
  );
  if (openAt > 0) {
    let depth = 0;
    let closeAt = -1;
    for (let i = openAt; i < list.length; i++) {
      if (list[i].get("type") !== "SymbolToken") {
        continue;
      }
      const text = textOfNode(list[i], ctx);
      if (text === "<") {
        depth++;
      } else if (text === ">") {
        depth--;
        if (depth === 0) {
          closeAt = i;
          break;
        }
      }
    }
    if (closeAt > openAt) {
      const base = projectTypeExpression(list.slice(0, openAt), ctx);
      const args = [];
      for (const group of splitTopLevel(list.slice(openAt + 1, closeAt), ctx, ",")) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) args.push(one);
      }
      if (base !== undefined && args.length > 0) {
        return { ...base, typeArguments: args, end: endOf(list[closeAt]) };
      }
    }
  }
  const paUnit = list.find((k) => k.get("type") === "PropertyAccess");
  // **后面还可能跟着类型实参段**（第 161 轮）：`x is A.B<C>` 的产物是
  // `[PropertyAccess(A.B), GenericType(<C>)]` **两格**——只认「整段就一格」时实参整个丢
  // （实测 `type-new-nodes-adversarial.ts` 的 `x is A.B<C>`：缺 `TypeReference` + `Identifier`）。
  if (
    paUnit !== undefined &&
    (list.length === 1 || (list.length === 2 && list[1].get("type") === "GenericType"))
  ) {
    const members = projectableKids(view(paUnit));
    const pureName = members.every((k) => isNameNode(k) || isDot(k, ctx));
    const names = members.filter((k) => isNameNode(k));
    if (pureName && names.length > 1) {
      const generic = list.length === 2 ? list[1] : undefined;
      const props: any = { typeName: qualifiedNameFrom(names, ctx) };
      if (generic !== undefined) {
        const args = projectTypeArguments(generic, ctx);
        if (args !== undefined) {
          props.typeArguments = args;
        }
      }
      return {
        kind: "TypeReference",
        ...props,
        pos: startOf(list[0]),
        end: endOf(list[list.length - 1]),
      };
    }
  }
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
    // **点号名后面再跟「下标访问 / 数组后缀」**（第 854 轮）：`type A = typeof a.b[K]` 的产物是
    // `[TypeQuery(typeof a), ., IndexedAccessType(b, K)]`——那个 `IndexedAccessType` 的
    // **左半边**（`b`）才是限定名的右半、`K` 是下标；`typeof a.b[K][]` 那一格外还套着
    // `ArrayType(IndexedAccessType(b, K))`。TS 那边的形状是
    // `IndexedAccessType{ objectType: TypeQuery(exprName: QualifiedName(a, b)), indexType: K }`。
    // 照下面那条路收会把 `b` 当成**一个成员名**、`TypeQuery` 的区间一路撑到 `]`
    //（实测缺 `IndexedAccessType` / `QualifiedName` / `TypeReference` 各一格，
    //  `TypeQuery` 与 `Identifier` 两处漂）。做法：尾段先按它自己的规矩投出来
    //（下标 / 数组的壳与 `<X>` 实参都在里面），再把**链上最左边那一格名字**换成整条
    // `TypeQuery`（`absorbIntoTypeQuery`），外层各壳的起点跟着挪到 `typeof`。
    const suffixUnit = list
      .slice(2)
      .find((k) => k.get("type") === "IndexedAccessType" || k.get("type") === "ArrayType");
    if (suffixUnit !== undefined && name !== undefined) {
      const absorbed = absorbIntoTypeQuery(projectNode(suffixUnit, ctx), query, name);
      if (absorbed !== undefined) return absorbed;
    }
    if (name !== undefined) {
      query.exprName = name;
      query.end = endOf(list[list.length - 1]);
    }
    // **点号名 + 类型实参**（第 113 轮）：`typeof http.ServerResponse<InstanceType<Request>>`
    // 的产物是 `[TypeQuery(typeof http), ., ServerResponse, GenericType(…)]`——
    // 上面那一支只管点号名，实参段还是平级兄弟。TS 那边 `TypeQuery.typeArguments` 要照收，
    // 否则实参里那串名字整片丢（实测缺 `Identifier` 394 / `TypeReference` 140 的样本
    // 全是 `https.d.ts` 的这一族）。
    const queryGeneric = list.find((k) => k.get("type") === "GenericType");
    if (queryGeneric !== undefined) {
      const typeArguments = [];
      for (const group of splitTopLevel(projectableKids(view(queryGeneric)), ctx, ",")) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) typeArguments.push(one);
      }
      if (typeArguments.length > 0) {
        query.typeArguments = typeArguments;
        query.end = endOf(queryGeneric);
      }
    }
    return query;
  }
  // **`typeof X<Y>` / `import("m").X<Y>`**（第 109 / 114 轮）：TS 的 `TypeQuery` 与
  // `ImportType` 都可以带**类型实参**（`typeArguments`），而实参段在产物里是它们的
  // **平级兄弟**。不收的话：少 `typeArguments`、区间短一截（漂移），实参里那串名字整片丢。
  if (list[0].get("type") === "TypeQuery" || list[0].get("type") === "ImportType") {
    const query = projectNode(list[0], ctx);
    const generic = list.find((k) => k.get("type") === "GenericType");
    if (generic !== undefined && query !== undefined) {
      const typeArguments = [];
      for (const group of splitTopLevel(projectableKids(view(generic)), ctx, ",")) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) typeArguments.push(one);
      }
      if (typeArguments.length > 0) {
        query.typeArguments = typeArguments;
        query.end = endOf(generic);
        return query;
      }
    }
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
    // **走通用分派而不是直调那个函数**（第 188 轮）：`FunctionType` 的投影已经搬进
    // `tokens/function-type.xl.md` 的 `PrintAst`，而 `projectNode` 会先问它——
    // 输入与原来那次直调完全相同，产出的节点逐字节一样。
    const fn = projectNode(list[1], ctx);
    if (typeParams.length > 0) {
      fn.typeParameters = projectEach(typeParams, ctx);
    }
    fn.pos = startOf(list[0]);
    return fn;
  }
  const head = list[0];
  let generic = list.find((k) => k.get("type") === "GenericType");
  const arraySuffix = list.find((k) => k.get("type") === "ArrayType");
  // **`A<T>[]` 的产物把实参段装进了 `ArrayType` 里面**（第 104 轮）：
  // `[Identifier(Dirent), ArrayType(GenericType(NonSharedBuffer))]`——那个 `GenericType`
  // 是**基名的实参表**，不是元素类型。照原样投会得到「`TypeReference` 只盖住 `Dirent`」
  // + 数组里多出一个 `TypeReference`，实参那一格的 `Identifier` 也丢
  //（实测 `TypeReference` 缺 220 / 漂移 50、`Identifier` 缺 553 里成片就是这个形状，
  // `@types/node/fs.d.ts` 的 `Dirent<NonSharedBuffer>[]` 一眼可见）。
  if (generic === undefined && arraySuffix !== undefined) {
    const inside = projectableKids(view(arraySuffix)).find((k) => k.get("type") === "GenericType");
    if (inside !== undefined) generic = inside;
  }

  // **`.` 后面是一个 `IndexedAccessType`**（第 110 轮）：`NodeJS.Module["exports"]` 的产物是
  // `[Identifier(NodeJS), ., IndexedAccessType(Identifier(Module), LiteralType("exports"))]`——
  // 限定名的右半在 `IndexedAccessType` **里面**，而 TS 那边 `IndexedAccessType.objectType`
  // 是整条 `NodeJS.Module`（`TypeReference > QualifiedName`）。
  // 不收的话 `IndexedAccessType` / `QualifiedName` / `Identifier(Module)` / `LiteralType` /
  // `StringLiteral` **五个节点一起丢**，`TypeReference` 的区间也短一截
  //（实测 `StringLiteral` 缺 71 + `LiteralType` 缺 37 的样本全长得这个样子）。
  if (
    (head.get("type") === "Identifier" || head.get("type") === "Keyword") &&
    list.length >= 3 &&
    isDot(list[1], ctx) &&
    list[2].get("type") === "IndexedAccessType"
  ) {
    const iat = list[2];
    const inner = projectableKids(view(iat));
    const rightUnit = inner.find((k) => isNameNode(k));
    if (rightUnit !== undefined) {
      const text = textOfNode(head, ctx);
      const leftName = { kind: "Identifier", text, pos: startOf(head), end: endOf(head) };
      const right = nameOf(rightUnit, ctx);
      const typeName = { kind: "QualifiedName", left: leftName, right, pos: leftName.pos, end: right.end };
      const node = {
        kind: "IndexedAccessType",
        objectType: { kind: "TypeReference", typeName, text, pos: typeName.pos, end: typeName.end },
        pos: startOf(head),
        end: endOf(iat),
      };
      const indexUnit = inner.find((k) => k !== rightUnit);
      const indexType = indexUnit === undefined ? undefined : projectTypeExpression([indexUnit], ctx);
      if (indexType !== undefined) node.indexType = indexType;
      return node;
    }
  }
  // **平铺的构造类型**（第 111 轮）：`type C = new <T>(x: T) => T` 的产物把 `new` / `<T>` /
  // 形参括号 / `=>` / 返回类型**平铺**在类型别名里（**没有** `FunctionType` 单元——
  // 带 `new` 的那个形状 `FunctionTypeCloseRule` 认不出来），而 TS 是 `ConstructorType`。
  // 照通用支会投出一个盖住 `new <T>` 的 `TypeReference` + 一个 `Identifier(new)`
  //（实测多出 `NewKeyword` / `TypeReference` / `Identifier`，同时缺整个 `ConstructorType`
  // 与它的形参、返回类型）。
  if (head.get("type") === "Keyword" && textOfNode(head, ctx) === "new") {
    const arrow = list.findIndex((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=>");
    if (arrow > 0) {
      const ctorProps = {};
      const ctorGeneric = list.find((k) => k.get("type") === "GenericType");
      if (ctorGeneric !== undefined) {
        const typeParams = unwrapNodes(ctorGeneric).filter((k) => k.get("type") === "TypeParameter");
        if (typeParams.length > 0) ctorProps.typeParameters = projectEach(typeParams, ctx);
      }
      const bracket = list.find((k) => k.get("type") === "Bracket");
      if (bracket !== undefined) {
        const inner = unwrapNodes(bracket);
        const paramUnits = inner.filter((k) => k.get("type") === "Parameter");
        if (paramUnits.length > 0) {
          ctorProps.parameters = projectEach(paramUnits, ctx);
        } else {
          // **平铺的形参**：这一支里括号的内容是 `[Identifier(x), TypeDefine(: T)]`，
          // 没有 `Parameter` 单元，所以按顶层逗号切组、每组自己造一个（实测漏了它
          // `Parameter` 缺 1）。
          const params = [];
          for (const part of splitTopLevel(inner, ctx, ",")) {
            if (part.length === 0) continue;
            const nameUnit = part.find((k) => k.get("type") === "Identifier" || k.get("type") === "Keyword");
            const typeUnit = part.find((k) => k.get("type") === "TypeDefine");
            const param = {
              kind: "Parameter",
              pos: startOf(part[0]),
              end: endOf(part[part.length - 1]),
            };
            if (nameUnit !== undefined) param.name = projectNode(nameUnit, ctx);
            if (typeUnit !== undefined) param.type = ctx.Project(typeUnit);
            params.push(param);
          }
          ctorProps.parameters = params;
        }
      }
      const ctorType = typeOf(list.slice(arrow + 1), ctx);
      if (ctorType !== undefined) ctorProps.type = ctorType;
      return {
        kind: "ConstructorType",
        pos: startOf(head),
        end: endOf(list[list.length - 1]),
        ...ctorProps,
      };
    }
  }
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
    while (i + 1 < list.length && isDot(list[i], ctx)) {
      // **`.` 后面可能是一个 `ArrayType`**（第 103 轮）：`A.B[]` 的产物是
      // `[Identifier(A), ., ArrayType(Identifier(B))]`——那个 `ArrayType` 里**只有名字**，
      // 它是限定名的右半，外层那个 `[]` 才是数组后缀。只认 `isNameNode(list[i+1])` 时
      // 链在这里断掉：`TypeReference` 只盖住 `A`、`QualifiedName` 与 `Identifier(B)` 全丢，
      // 而外层的 `ArrayType` 又套错了位置（实测 `Identifier` 缺 1050 里成片、
      // `TypeReference` / `ArrayType` 各一片）。
      const next = list[i + 1];
      const innerNames =
        next.get("type") === "ArrayType" ? projectableKids(view(next)).filter((k) => isNameNode(k)) : null;
      const nameUnit = innerNames !== null && innerNames.length === 1 ? innerNames[0] : next;
      if (!isNameNode(nameUnit)) break;
      const right = nameOf(nameUnit, ctx);
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
  // **运算符的操作数可能被拆到外面**（第 103 轮）：`readonly webcrypto.KeyUsage[]` 的产物是
  // `[TypeOperator(readonly, webcrypto), ., ArrayType(KeyUsage)]`——点号名与数组后缀都在
  // 运算符单元**外面**。TS 那边 `TypeOperator.type` 是整段 `webcrypto.KeyUsage[]`
  // （`QualifiedName` 与 `ArrayType` 都在它里面）。收回来之后 `TypeOperator` 的区间也才对得上。
  if (head.get("type") === "TypeOperator" && list.length > 1) {
    const inner = projectableKids(view(head));
    const operandHead = inner.length > 0 ? inner[inner.length - 1] : undefined;
    if (operandHead !== undefined && isNameNode(operandHead)) {
      const operand = projectTypeExpression([operandHead, ...list.slice(1)], ctx);
      const node = operand === undefined ? undefined : projectNode(head, ctx);
      if (node !== undefined) {
        node.type = operand;
        node.end = operand.end;
        return node;
      }
    }
  }
  // **类型谓词被包在联合里**（第 119 轮）：`asserts x is null | undefined` 的产物是
  // `UnionType > [TypePredicate([asserts, x, is, null, |, undefined])]`——谓词在里面、
  // 联合在外面；而 TS 正好**相反**（谓词在外、`TypePredicate.type` 才是那个 `UnionType`）。
  // 不翻过来的话那个 `UnionType` 的区间多一截（产物 [24,53) vs TS [37,53)），
  // 于是同时记「缺 `UnionType`」+「多出 `UnionType`」+ 缺 `UndefinedKeyword`（实测 35 处）。
  if (
    list.length === 1 &&
    (list[0].get("type") === "UnionType" || list[0].get("type") === "IntersectionType")
  ) {
    const unionUnit = list[0];
    const inner = projectableKids(view(unionUnit));
    const predicate = inner.find((k) => k.get("type") === "TypePredicate");
    if (predicate !== undefined && inner.length === 1) {
      const parts = projectableKids(view(predicate));
      const isIndex = parts.findIndex((k) => textOfNode(k, ctx) === "is");
      const typeKids = isIndex >= 0 ? parts.slice(isIndex + 1) : [];
      const separator = unionUnit.get("type") === "UnionType" ? "|" : "&";
      const types = [];
      for (const group of splitTopLevel(typeKids, ctx, separator)) {
        const one = projectTypeExpression(group, ctx);
        if (one !== undefined) types.push(one);
      }
      const node = projectNode(predicate, ctx);
      if (node !== undefined && types.length > 0) {
        node.type = {
          kind: unionUnit.get("type"),
          types,
          pos: types[0].pos,
          end: types[types.length - 1].end,
        };
        node.end = types[types.length - 1].end;
        return node;
      }
    }
  }
  // 其余形状（`UnionType` / `IntersectionType` / `FunctionType` / `TypeLiteral` / `TupleType`…）
  // 交回通用投影，它们各自的子单元会再走一遍 `projectTypeExpression`。
  if (list.length === 1) {
    // **类型位的标记**（第 99 轮）：模板字面量在值位是 `TemplateExpression`、在类型位是
    // `TemplateLiteralType`（span 里装的是类型而不是表达式），而两者的**产物同形**——
    // 唯一可靠的区分是「谁在投它」：走 `projectTypeExpression` 的就是类型位。
    const saved = ctx.typePosition;
    ctx.typePosition = true;
    try {
      return projectNode(list[0], ctx);
    } finally {
      ctx.typePosition = saved;
    }
  }
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

# private method absorbIntoTypeQuery:(node:any, query:any, name:any)=>any

把**投好的尾段**接回一条 `TypeQuery` 上，返回带上这条 `TypeQuery` 的那个节点（第 854 轮立）。

**它解决的问题**：`typeof a.b[K]` / `typeof a.b<X>[K]` / `typeof a.b[K][]` 里，
`typeof` 那一格在产物里**只收 `typeof a`**，`a` 后面那一串（点号名、`<X>`、`[K]`、`[]`）
都是它外面的平级单元。TS 那边这些后缀**包在 `TypeQuery` 外面**：

| 写法 | TS 的形状 |
| --- | --- |
| `typeof a.b` | `TypeQuery > QualifiedName(a, b)` |
| `typeof a.b[K]` | `IndexedAccessType > [TypeQuery(QualifiedName(a, b)), K]` |
| `typeof a.b[K][]` | `ArrayType > IndexedAccessType > [TypeQuery(…), K]` |
| `typeof a.b<X>[K]` | `IndexedAccessType > [TypeQuery(QualifiedName(a, b), typeArguments=[X]), K]` |

**「哪一格是名字」由链自己回答**：沿着 `objectType` / `elementType` / `typeName` / `left`
一路往左走到**最左边那一格名字**（`b`），把它接到 `name`（`a`）右边折成 `QualifiedName`、
写进 `query.exprName`，再**把那一格换掉**——外层的壳（`IndexedAccessType` / `ArrayType`）
于是自然带上整条链，`TypeQuery` 的终点停在最后一个名字上（`<X>` 那一档还要把实参收进来：
`TypeQuery.end` 与 `typeArguments` 一起取 `TypeReference` 自己的）。

**做不到就给 `undefined`**（链上没有名字那一格），调用方退回原来那条「只接点号名」的路。

```ts
  if (node === undefined || node === null) return undefined;
  // **最左边那一格名字**：接上 `name`（左边已经收好的限定名）折成 `QualifiedName`。
  if (node.kind === "Identifier") {
    query.exprName =
      name === undefined
        ? node
        : { kind: "QualifiedName", left: name, right: node, pos: name.pos, end: node.end };
    query.end = node.end;
    return query;
  }
  // **实参那一档**：`b<X>` 在产物里是一个 `TypeReference`（名字 + 实参段），
  // 实参属于 `TypeQuery`（与第 113 轮那条「点号名 + 类型实参」同一口径）。
  // **递归只管往左走到名字那一格**（它已经把 `query.exprName` 写好了），所以这里
  // **不能**把它的返回值再赋给 `exprName`——那个返回值就是 `query` 自己，
  // 赋值会当场造出一个自环（实测 `kindsInAst` 报 `Maximum call stack size exceeded`）。
  if (node.kind === "TypeReference") {
    const absorbed = absorbIntoTypeQuery(node.typeName, query, name);
    if (absorbed === undefined) return undefined;
    if (node.typeArguments !== undefined) query.typeArguments = node.typeArguments;
    query.end = node.end;
    return query;
  }
  if (node.kind === "QualifiedName") {
    const left = absorbIntoTypeQuery(node.left, query, name);
    if (left === undefined) return undefined;
    node.left = left;
    node.pos = left.pos;
    return node;
  }
  if (node.kind === "IndexedAccessType") {
    const objectType = absorbIntoTypeQuery(node.objectType, query, name);
    if (objectType === undefined) return undefined;
    node.objectType = objectType;
    node.pos = objectType.pos;
    return node;
  }
  if (node.kind === "ArrayType") {
    // **`elementType` 在这一层是「一格数组」**（`ArrayType` 的 `PrintAst` 走 `ctx.Each`，
    // 实测 `type A = X[]` 的产物 JSON 是 `elementType:[{…}]`）——与上面 `TypeReference` /
    // `QualifiedName` 那几条「单个节点」不同，照单节点收会落到最后那句 `return undefined`
    //（`typeof a.b[K][]` 就是它：尾段是 `ArrayType(IndexedAccessType(b, K))`）。
    if (Array.isArray(node.elementType)) {
      const first = node.elementType[0];
      const absorbedElement = absorbIntoTypeQuery(first, query, name);
      if (absorbedElement === undefined) return undefined;
      node.elementType = [absorbedElement];
      node.pos = absorbedElement.pos;
      return node;
    }
    const elementType = absorbIntoTypeQuery(node.elementType, query, name);
    if (elementType === undefined) return undefined;
    node.elementType = elementType;
    node.pos = elementType.pos;
    return node;
  }
  return undefined;
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
  // **属性里那个名字也要解转义**（第 381 轮）：`const \u0061bc = 1` 的名字住在
  // `Let.fieldName` 这个**属性**上（不是子单元），`x.\u0061` 的键同理。
  // **与 `Identifier.PrintAst` 共用一份解码**（`text-common-util.xl.md` 的
  // `DecodeIdentifierEscapes`）——两处各写一份就是两处会漂的答案（这一轮第一版
  // 只改了标识符那一格，于是 `function f\u0066()` 绿了、`const \u0061bc` 还是红的）。
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
  // **点号模块名只取第一段**（`namespace A.B.C` 外层的名字是 `A`——TS 那边是
  // `ModuleDeclaration(A) > ModuleDeclaration(B) > …`）：那一段的区间由 `Namespace`
  // 重组时记进 `nameRange`，这里直读。只有 `namespace` 这一个属性会带点号
  // （引号名 `"a.b"` 走的是别的属性），所以按它分流不会误伤。
  const rawNamespace = v.attrs.get("namespace");
  const dotAt = typeof rawNamespace === "string" ? rawNamespace.indexOf(".") : -1;
  const lookup = dotAt > 0 ? rawNamespace.substring(0, dotAt) : name;
  const direct = projectableKids(v).find((k) => k.get("type") === "Identifier" && textOfNode(k, ctx) === lookup);
  const at = direct === undefined ? synthName(lookup, v, ctx) : projectNode(direct, ctx);
  if (at === undefined) {
    return { name: undefined, computed: null, unit: direct === undefined ? null : direct };
  }
  const before = at.pos > 0 ? ctx.source[at.pos - 1] : "";
  if ((before === '"' || before === "'") && ctx.source[at.end] === before) {
    // **`text` 是引号里的那段，不含引号**（第 183 轮修）：TS 那边字符串字面量名字的
    // `text` 是**解码后的值**（`{ "x-y"() {} }` 的名字文本就是 `x-y`），
    // 而这里原来切的是 `[pos-1, end+1)`——**把两个引号也带上了**。
    // 后果不在解析侧（尺子只比 kind / 区间 / 字段名，不比字段**值**），
    // 而在**降级层**：`{ "x-y"() {} }` 于是存在**键 `"x-y"`（带引号）**上，
    // 按 `o["x-y"]` 永远取不到（实测：`Object.keys` 印出来是 `"x-y"`）。
    // **转义还没解**（`{ "a\nb"() {} }` 的文本是 `a\nb` 四个字符，TS 给一个真换行）——
    // 属性名里罕见，记在台账里。
    return {
      name: {
        kind: "StringLiteral",
        text: ctx.source.slice(at.pos, at.end),
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

# private method modifierSpansOf:(v:any)=>Array<any>

token 记下的**每个修饰词各自的区间**（产物字典里的 `modifierSpans`，`"起:止"` 用 `,` 连接、闭区间）。

解析期认下声明那一刻位置就在手上，所以这一格是**事实**；没有这一格的 token（还没记的那几档）
返回空数组，调用方退回「回原文 `indexOf` 猜」那条路。

```ts
  const raw = v.attrs.get("modifierSpans");
  if (typeof raw !== "string" || raw === "") return [];
  const out = [];
  for (const piece of raw.split(",")) {
    const parts = piece.split(":");
    if (parts.length !== 2) return [];
    const start = Number(parts[0]);
    const end = Number(parts[1]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return [];
    // 产物记的是**闭区间**（与 `nameStart` / `nameEnd` 同一口径），节点要的是右开区间。
    out.push({ pos: start, end: end + 1 });
  }
  return out;
```

# private method addDecorators:(v:any, props:any, ctx:any)=>void

**装饰器并进 `modifiers`**：TS 那边装饰器与关键字修饰词**同住 `modifiers` 一列**，按源码位置先后排
（`@dec export class C {}` 的 `modifiers` 是 `[Decorator, ExportKeyword]`）。

与 `addModifiers` 的分工：那一支管**能被字段完整表达的**关键字词（`export` / `declare` / `readonly`…，
产物那边是一串文本），这一支管**带子树的** `Decorator` 节点（产物那边是一个子单元）。
两处都走这一份实现：通用支（`structuralProps`）与各 token 自己的 `PrintAst`（`Class` 走前者，
`TypeAssign` / `Interface` / `Namespace` 走后者）——各写一份就会在「谁先谁后」上漂。

判据只看子单元里有没有 `Decorator`：没有就一个字段都不动（连 `modifiers` 都不建）。

```ts
  const projected = allKids(v)
    .filter((k) => k.get("type") === "Decorator")
    .map((k) => projectNode(k, ctx))
    .filter((node) => node !== undefined);
  if (projected.length === 0) return;
  const merged = [...projected, ...(Array.isArray(props.modifiers) ? props.modifiers : [])];
  merged.sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0));
  props.modifiers = merged;
```

# private method addModifiers:(v:any, props:any, ctx:any, baseStart:int)=>void

修饰词：产物那边是 `modifiers="export,const"` 这样的**字符串**，
而 TS 那边 `modifiers` 是一串**节点**（`ExportKeyword` / `ConstKeyword`…）。

**每个修饰词的区间要从原文里量出来**（踩过）：早先一律写成
`pos = v.start, end = v.start`（零宽），于是尺子上整类报「同 kind 同起点、终点差 6~9」——
实测 `declare` 是 `TS[26,33)` 而我给 `[26,26)`，一份语料里几百处。

**位置首选 token 记的字段**（各 token 的 `ModifierSpans`）：修饰词在源码里各自占哪一格，
认下声明那一刻就在手上，有它就不做任何猜测。

没有字段时才退回**从原文里量**：带修饰词的节点自己的起点就是第一个修饰词的起点
（实测 `Field[12,34]` 的 `modifiers="private,readonly"`：12 正是 `private` 的开头），
所以从 `v.start` 起按顺序找每个词。这条近似会被**前面装饰器里的同名文本**骗到——
`@exported export class C {}` 里量出来的是 `exported` 里那一段（实测缺 `ExportKeyword` 1 + 多出 1）。

```ts
  let words = [];
  const modifiers = v.attrs.get("modifiers");
  if (typeof modifiers === "string" && modifiers !== "") {
    words = modifiers.split(",").filter((word) => word !== "");
  } else {
    // **有的单元把修饰词记成布尔属性、名字就是那个词**：`Lamda` 的 `async`
    // （TS 那边 `async x => x` 的 `ArrowFunction.modifiers` 就是 `[AsyncKeyword]`）。
    // 这一支不是给声明层留的兜底——声明层（`Class` / `Interface` / `Namespace` / `TypeAssign` …）
    // 一律有 `modifiers` 文本走上面那一条。
    for (const [key, value] of v.attrs) {
      if (value === true || value === "true") words.push(key);
    }
  }
  if (words.length === 0) return;
  // **字段是主路**：个数对不上（还没记这一格的 token）才退回下面的猜法。
  const spans = modifierSpansOf(v);
  if (spans.length === words.length) {
    const out = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      out.push({ kind: `${word.charAt(0).toUpperCase()}${word.slice(1)}Keyword`, text: word, pos: spans[i].pos, end: spans[i].end });
    }
    props.modifiers = out;
    return;
  }
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

# private const PARAMETER_MODIFIERS:Set<string> = new Set(["public", "private", "protected", "readonly", "override"])

# private method projectSegment:(v:any, key:string, ctx:any)=>any

```ts
  const kids = kidsOf(v, key);
  if (kids.length === 0) return undefined;
  const first = kids[0];
  // **整段一起投，只在遇到「分段壳」时才摊平一层**（第 97 轮）：
  // `TernaryOperator` 的三个段在 `ToList` 里**已经摊平**（`trueStatement` 直接就是
  // `Method(f(1))` 那一格、`falseStatement` 直接就是 `PropertyAccess(y.z)`）——
  // 照「先摊平一层」的老写法会把那个单元**自己的子单元**当成整段，
  // 于是 `f(1)` 只剩 `1`、`y.z` 只剩 `y`、`p === q` 只剩 `p`：
  // 实测缺 `PropertyAccessExpression` 502 / `CallExpression` 246 / `BinaryExpression` 273
  // 里成片都是它（三元的两个分支 + 条件）。
  //
  // 判据是「这个 tag 在 `KIND_BY_TAG` 里查不到**且**名字以 `Condition` / `Statement` / `Segment`
  // 结尾」——那才是分段壳（`TernaryOperatorCondition` 这种）。
  // **不能只看「查不到映射」**：`PropertyAccess` 也不在 `KIND_BY_TAG` 里（它自己覆写了
  // `PrintAst`），只看映射会把 `y.z` 摊成两个裸名字。
  const leaf = first.get("type") === "Identifier" || first.get("type") === "Keyword" || first.get("type") === "SymbolToken";
  const wrapper =
    !leaf &&
    KIND_BY_TAG.get(first.get("type")) === undefined &&
    /(Condition|Statement|Segment)$/.test(first.get("type"));
  if (wrapper) {
    const inner = unwrapNodes(first).filter((k) => k.get("type") !== "SymbolToken");
    return inner.length === 0 ? projectNode(first, ctx) : projectExpression(inner, ctx);
  }
  // **只排掉分段自己的标点**（`?` / `:`），**不能把所有 `SymbolToken` 都排掉**（第 106 轮）：
  // 条件里就有比较运算符——`i > 0 ? a : b` 的 `>` 会被整条丢掉，`projectExpression` 拿到
  // `[i, 0]` 于是折不动、只投出第一个操作数（实测缺 `BinaryExpression` 79 +
  // `GreaterThanToken` + 右侧那个字面量，样本集中在 `? :` 的条件位上）。
  const inner = kids.filter(
    (k) => !(k.get("type") === "SymbolToken" && [":", "?"].includes(textOfNode(k, ctx))),
  );
  if (inner.length === 0) return projectNode(first, ctx);
  return projectExpression(inner, ctx);
```

# private method firstCodeAfter:(source:string, from:int)=>int

```ts
  let i = from;
  while (i < source.length && /\s/.test(source[i])) i++;
  return i;
```

# private method skipSourceTrivia:(source:string, from:int)=>int

从 `from` 起跳过**空白与注释**（`//…` 到行尾、`/*…*/`），返回第一个实义字符的下标。

`firstCodeAfter` 只跳空白；而 TS 的节点区间虽然**不含尾部 trivia**，却**含中间的 trivia**——
`import { a } from "m"/*c*/;` 的 `ImportDeclaration` 终点是那个 `;` 之后（注释夹在中间），
所以「`StmtEndOf` 之后那个字符是不是 `;`」这一问必须先跳过注释才有答案。

```ts
  let i = from;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      i += 2;
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    break;
  }
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

# private method namedSpecifiersOf:(brace:any, kind:string, ctx:any)=>Array<any>

具名导入 / 导出的每一项 → `ImportSpecifier` / `ExportSpecifier`（两种语句只有 `kind` 不同，所以共一份实现）。

产物把 `{ a as b, c, type D }` 摊成 `Bracket > [Identifier(a), Identifier(as), Identifier(b), SymbolToken(,), …]`，
而 TS 那边是 `NamedImports` / `NamedExports > ImportSpecifier / ExportSpecifier{ propertyName?, name }`。

**读的是 token 子单元，不是原文**：每一项的起止、`as` 的两侧、段首的 `type`、字符串名，
在树上本来就是**带区间的单元**——直读即可。**这一格是本文件最后一处回原文重新做词法的地方**，
照原文扫的写法要用正则猜 `as` 的两侧，两处实测错法：
`import { a /* c */ as b }` 把注释算进 `propertyName`（漂移 1 + 多出 1）、
`import { "a-b" as c }` 把字符串名投成 `Identifier`（缺 `StringLiteral` 1 + 多出 1）。

```ts
  const out = [];
  let segment = [];
  // **`As` 那一格的替身标记**（第 829 轮）：折拢形态里 `as` 不再是一个平铺的
  // `Identifier`，所以分段时用它占「`as` 那一格」的位置（见 `walkSpecifierUnit`）。
  const AS_SEPARATOR: Map<string, any> = new Map([["type", "AsSeparator"]]);
  const flush = () => {
    if (segment.length === 0) return;
    const units = segment;
    segment = [];
    // 位置只从**带区间的实义单元**上取（标记本身没有 `range`）：
    // `startOf` / `endOf` 对没有 `range` 的 Map 一律给 0，落在段首 / 段尾就是一处假区间。
    const ranged = units.filter((k) => k !== AS_SEPARATOR);
    const pos = startOf(ranged.length > 0 ? ranged[0] : units[0]);
    const end = endOf(ranged.length > 0 ? ranged[ranged.length - 1] : units[units.length - 1]);
    // **段首的 `type` 是标志**：`import { type B }` / `export { type D }` 的 specifier 区间含 `type`，
    // 但 `name` 只是后面那个名字。只剩一个单元的 `{ type }` 不跳（那个 `type` 就是名字）。
    const head = (k) => (k.get("type") === "Identifier" || k.get("type") === "Keyword") && textOfNode(k, ctx) === "type";
    const body = units.length > 1 && head(units[0]) ? units.slice(1) : units;
    if (body.length === 0) return;
    const asAt = body.findIndex(
      (k) =>
        k === AS_SEPARATOR ||
        (k.get("type") === "Identifier" && textOfNode(k, ctx) === "as"),
    );
    const name = specifierNameOf(body[body.length - 1], ctx);
    if (asAt > 0) {
      out.push({ kind, propertyName: specifierNameOf(body[asAt - 1], ctx), name, pos, end });
      return;
    }
    out.push({ kind, name, pos, end });
  };
  // **每一项怎么找**：括号里的内容有两种形态——同一行写完的是**平铺**的一串单元
  // （`{ A as B, C }`），而**跨行**的会被逗号运算符折成一棵树
  // （`{ ⏎ A, ⏎ B ⏎ }` ⇒ `Statement > BinaryOperator(op=",") > …`）。
  // 所以按文档顺序递归展开 `Statement` / `BinaryOperator`，把 `,` 当分段边界：
  // 两种形态于是走同一条路——这正是从前那段回原文切分替我们兜住的东西。
  const walkSpecifierUnit = (unit:any) => {
    const type = unit.get("type");
    if (type === "Statement" || type === "BinaryOperator") {
      for (const child of projectableKids(view(unit))) walkSpecifierUnit(child);
      return;
    }
    // **`As` 是「`as` + 别名」的折拢形态**（第 829 轮）：`import { a, b as c ⏎ } from "m"`
    // （带注释时同样）里 `as` 不再是平铺的 `Identifier` —— 逗号运算符把前面那段折成
    // `BinaryOperator(a, `,`, b)`，`as c` 这一段折成一个 `As` 单元（它的区间**从 `as` 起**，
    // 子单元只有那个别名）。原来把 `As` 当普通单元压进段里 ⇒ 整段只有一个单元 ⇒
    // `asAt` 找不到 ⇒ specifier 少了 `propertyName`、`name` 变成整个 `As` 单元的投影
    //（实测 `b as c` 的 `Identifier` 区间成了 `as c` / `as c //c`，缺 1 漂移 2）。
    // 这里把它摊成「一个分隔标记 + 它的子单元」，与平铺形态走同一条判据。
    if (type === "As") {
      segment.push(AS_SEPARATOR);
      for (const child of projectableKids(view(unit))) walkSpecifierUnit(child);
      return;
    }
    if (type === "SymbolToken" && textOfNode(unit, ctx) === ",") {
      flush();
      return;
    }
    segment.push(unit);
  };
  for (const child of projectableKids(brace instanceof Map ? view(brace) : brace)) walkSpecifierUnit(child);
  flush();
  return out;
```

# private method specifierNameOf:(unit:any, ctx:any)=>any

一个名字单元 → 节点：引号名（`import { "a-b" as c }`）给 `StringLiteral`（`text` 是引号里那段），
其余走 `nameOf`（`Identifier`）。位置一律**含引号**（TS 的字符串名节点就是这么记的）。

```ts
  const type = unit.get("type");
  if (type === "String" || type === "ConstString") {
    // `stringText` / `astNode` 吃的是**视图**，`nameOf` 吃的是原始 Map——两者的入口不同。
    return astNode("StringLiteral", { text: stringText(view(unit), ctx) }, view(unit), ctx);
  }
  return nameOf(unit, ctx);
```

# private method conditionalNode:(kids:Array<any>, start:int, end:int, ctx:any)=>any

`[T, extends, U, ?, A, :, B]` 那一段单元 → 一个 `ConditionalType`。

**假分支又是条件类型时要递归**（第 116 轮）：TS 的条件类型是**右嵌套**的——
`A extends B ? C : D extends E ? F : G` 的 `falseType` 是一个 `ConditionalType`。
产物把它们**平铺在同一串单元里**，而 `typeOf`（→ `projectTypeExpression`）折不动平铺的
`extends` / `?` / `:`——于是内层那条条件类型只剩几个孤立的名字：实测 `@types/node/test.d.ts` 的
`ReturnType = F extends (...) => infer T ? T ⏎ : F extends abstract new(...) => infer T ? T ⏎ : unknown`
缺 `ConditionalType` / `ConstructorType` / `AbstractKeyword` / `Parameter` / `DotDotDotToken`
等 13 个节点（`Identifier` 缺 375 / `TypeReference` 缺 118 的样本全在这一族）。

```ts
  const isSymbol = (k, text) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === text;
  const slice = kids.slice(start, end);
  const isExtends = (k) =>
    (k.get("type") === "Keyword" || k.get("type") === "Identifier") && textOfNode(k, ctx) === "extends";
  const extIndex = slice.findIndex(isExtends);
  const questionIndex = slice.findIndex((k) => isSymbol(k, "?"));
  const colonIndex = slice.findIndex((k) => isSymbol(k, ":"));
  const node = {
    kind: "ConditionalType",
    pos: startOf(slice[0]),
    end: endOf(slice[slice.length - 1]),
  };
  if (extIndex > 0) node.checkType = typeOf(slice.slice(0, extIndex), ctx);
  if (extIndex >= 0) {
    const stop = questionIndex > extIndex ? questionIndex : slice.length;
    node.extendsType = typeOf(slice.slice(extIndex + 1, stop), ctx);
  }
  if (questionIndex >= 0) {
    const stop = colonIndex > questionIndex ? colonIndex : slice.length;
    node.trueType = typeOf(slice.slice(questionIndex + 1, stop), ctx);
  }
  if (colonIndex >= 0) {
    const tail = slice.slice(colonIndex + 1);
    const tailExt = tail.findIndex(isExtends);
    const tailQuestion = tail.findIndex((k) => isSymbol(k, "?"));
    const tailColon = tail.findIndex((k) => isSymbol(k, ":"));
    node.falseType =
      tailExt > 0 && tailQuestion > tailExt && tailColon > tailQuestion
        ? conditionalNode(tail, 0, tail.length, ctx)
        : typeOf(tail, ctx);
  }
  return node;
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
  let end = last !== undefined && typeof last.end === "number" ? last.end : sv.end;
  // **没有语句的分支（贯穿到下一条 `case`）**：区间到那个 `:` 为止（第 97 轮）。
  // `SwitchSegment` 自己的尾巴比 TS 多一个字符——实测 `case ",":` 产物 [1129,1139)
  // vs TS [1129,1138)：108 处漂移 + 108 处「多出来」是同一个节点两边各记一次。
  // **位置由 token 自己记**（`SwitchSegment.ColonPos`，第 615 轮）：认下这一段那一刻
  // 那个 `SymbolToken` 就在手上 ⇒ 这里直读字段，不再回原文 `lastIndexOf(":")` 猜。
  if (last === undefined) {
    const colonPos = sv.attrs.get("colonPos");
    if (typeof colonPos === "number" && colonPos >= sv.start) end = colonPos + 1;
  }
  return {
    kind: kindWord === "default" ? "DefaultClause" : "CaseClause",
    pos: sv.start,
    end,
    ...props,
  };
```

# private method projectExport:(v:any, ctx:any, following:Array<any>, stmtEnd:int)=>any

`export = X` / `export default X` → `ExportAssignment`（`expression`）。

产物那边这两种在 `Export` 单元**外面**：`Statement > [Export(含 export/=), 表达式]`
（`export = strict`）或 `Statement > [Export(含 export/default), 表达式]`——
于是通用投影把 `Export` 投成 `ExportDeclaration`、真正的表达式留成一个平级的
`ExpressionStatement`（真实语料 `ExportAssignment` 849 处里，`expression` 整个丢掉的
与 `Identifier` 缺 1149 处同源）。

判据：那个 `Export` 单元后面还有子单元（`export { a }` / `import` 那一族没有）——
有就跟上来的整段收成 `expression`，区间从 `export` 到表达式末尾。

`stmtEnd` 是**外头那一格 `Statement` 的终点**（`projectStatement` 递进来的）：
具名导出的尾分号算在 `ExportDeclaration` 里，可它**不在 `Export` 单元的区间里** ——
解析期 `Export.Process` 一遇到 `;` 就停，把那一个字符留给了语句（见 `tokens/export.xl.md`）。

```ts
  const view_ = v.attrs === undefined ? view(v) : v;
  const kids = projectableKids(view_);
  // **`export default interface I {}` / `export class C {}` 是声明自己带修饰词**
  // （第 153 轮）：TS 那边是 `InterfaceDeclaration.modifiers = [ExportKeyword, DefaultKeyword]`，
  // 而产物是 `[Export([Keyword(export), Keyword(default)]), Interface(…)]` 两格平级。
  // 照「`default` 后面跟表达式」那一支投会得到一个 `ExportAssignment` 包着整条接口声明
  // （实测 `decl-interface-export-default.ts`：缺 `InterfaceDeclaration` / `ExportKeyword` /
  // `DefaultKeyword`，多出 `ExportAssignment`）。
  const declared = (following ?? []).find(
    (k) => k instanceof Map && DECLARATION_UNITS.has(k.get("type")),
  );
  if (declared !== undefined) {
    const node = projectNode(declared, ctx);
    if (node !== undefined) {
      const words = projectableKids(view_).filter(
        (k) =>
          (k.get("type") === "Keyword" || k.get("type") === "Identifier") &&
          ["export", "default"].includes(textOfNode(k, ctx)),
      );
      const mods = words.map((word) => ({
        kind: textOfNode(word, ctx) === "export" ? "ExportKeyword" : "DefaultKeyword",
        text: textOfNode(word, ctx),
        pos: startOf(word),
        end: endOf(word),
      }));
      if (mods.length > 0) {
        node.modifiers = [...mods, ...(node.modifiers ?? [])];
        // **区间从 `export` 那个词起**：TS 的 `Node.getStart()` 跳过前导 trivia，
        // 于是带修饰词的声明就是从 `export` 起（实测漂移：产物 96 vs TS 81）。
        node.pos = Math.min(node.pos ?? mods[0].pos, mods[0].pos);
      }
      return node;
    }
  }
  const rest = kids.filter((k) => !(k.get("type") === "Keyword" && textOfNode(k, ctx) === "export"));
  // **`export = X` / `export default X` 的 `Export` 单元自己就是一格**（第 534 轮实测）：
  // 关掉 reorg 之后这一支走的是「解析期只把**前缀两个词**收进 `Export`」那条路
  //（`export.xl.md` 的构造函数那一段写着这条路），所以 `rest` 里那一格的文本是
  // **`"export default"` / `"export ="`**，而不是两格 `Keyword` ——
  // 原来那句「`rest` 里有 `Keyword(default)`」于是永远为假 ⇒ 整条落到最后的
  // `ExportDeclaration`（实测 `am-declare-module-css.ts`：缺 `ExportAssignment` +
  // 缺它的 `Identifier(c)`、多出 `ExportDeclaration`）。
  // **判据改成「那一格的文本里有没有 `default` / `=` 这个尾词」**：
  // 两种形状（`Export` 一格 / 两格 `Keyword`）都认，判的仍是「这是不是赋值式导出」。
  const wordTail = (k: any) => {
    const parts = textOfNode(k, ctx).trim().split(/\s+/);
    return parts[parts.length - 1];
  };
  const isWord = (k: any, text: string) =>
    (k.get("type") === "Keyword" || k.get("type") === "Identifier" || k.get("type") === "Export") &&
    (textOfNode(k, ctx) === text || wordTail(k) === text);
  const isAssignment =
    rest.some((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=") ||
    rest.some((k) => isWord(k, "default") || wordTail(k) === "=");
  // 等号 / `default` 之后的表达式：`Export` 单元里剩下的 + 语句里跟在它后面的兄弟。
  const inUnit = rest.filter(
    (k) =>
      !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "=") &&
      !isWord(k, "default") &&
      wordTail(k) !== "=",
  );
  const expr = [...inUnit, ...(following ?? [])].filter(
    (k) => k instanceof Map && !(k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ";"),
  );
  if (isAssignment && expr.length > 0) {
    const value = projectExpression(expr, ctx);
    if (value !== undefined) {
      // **尾分号算在 `ExportAssignment` 里**（`export = strict;` 的 TS 是 `[23,39)`，含 `;`）
      //——与第 33 轮记的「没有函数体的可调用签名要带尾分号」同一条口径。
      //
      // **尾分号那一格要跨过 trivia 才看得见**（第 909 轮片段普查量出的
      // `gap-r907-export-default-assignment-trailing-comment`）：`export default 1/*c*/;` 里
      // `end` 落在 `1` 之后，紧挨着的那个字符是**注释的开头** ⇒ 原来那句
      // `ctx.source[end] === ";"` 给否 ⇒ 区间停在 `1` 之后（实测产物 `[0,16)`、TS 是 `[0,22)`）。
      // 所以先把空白与注释跳过去再问一次「是不是 `;`」——注释是 trivia，
      // 与第 817 轮那条线一致（`export default 1/*c*/ ;` 的 TS 也是 `[0,23)`，含那个 `;`）。
      // **换行也一起跳**：`export default 1` 换行 `;` 在 TS 那边同样是 `[0,18)`（含 `;`）。
      const end = endOf(expr[expr.length - 1]);
      let semiAt = end;
      while (semiAt < ctx.source.length) {
        const one = ctx.source[semiAt];
        if (one === " " || one === "\t" || one === "\r" || one === "\n") {
          semiAt = semiAt + 1;
          continue;
        }
        if (one === "/" && ctx.source[semiAt + 1] === "*") {
          const close = ctx.source.indexOf("*/", semiAt + 2);
          if (close < 0) {
            break;
          }
          semiAt = close + 2;
          continue;
        }
        if (one === "/" && ctx.source[semiAt + 1] === "/") {
          const line = ctx.source.indexOf("\n", semiAt + 2);
          if (line < 0) {
            break;
          }
          semiAt = line;
          continue;
        }
        break;
      }
      return {
        kind: "ExportAssignment",
        expression: value,
        pos: view_.start,
        end: ctx.source[semiAt] === ";" ? semiAt + 1 : end,
      };
    }
  }
  // 具名导出（`export { a as b, c, type D }`）与模块名走 `namedExportClause`（第 87 轮）：
  // 尾分号算在 `ExportDeclaration` 里（TS 的 `export { a };` 是 [0,14)，含 `;`）。
  //
  // **终点取的是语句那一格**（第 548 轮）：那个 `;` 不在 `Export` 单元自己的区间里
  // （`Export.Process` 遇到 `;` 就停，字符留给语句）——照抄单元自己的终点会**差一格**。
  // 少了这一条实测怎样：`export { a };` 一族 **九份**文件各得一处**漂移** + 一处**多出来**
  //（`mod-export-named-list.ts` / `mod-export-star.ts` / `mod-export-named-alias.ts` …，
  // 全是同一个形状：产物 `[71,83)` 对 TS `[71,84)`）。
  return {
    kind: "ExportDeclaration",
    pos: view_.start,
    // **区间必须从视图上取**（第 93 轮修）：`projectStatement` 递进来的是**原始 Map**，
    // 而 `stmtEndOf` 读的是 `v.start` / `v.end` —— 原始 Map 上这两个属性都是 `undefined`
    // （它们在 `range` 里），于是终点变成 `undefined`、投影出来的 `ExportDeclaration`
    // 成了零宽区间：实测 108 处漂移 + 108 处「多出来」（同一个节点两边各记一次）。
    // **起点仍从视图取**（`stmtEnd` 已经是算好的整数，不再经过原始 Map）。
    end: stmtEnd,
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
  const props = {};
  // **导出属性 `with { … }` / `assert { … }`**（第 666 轮）：与导入那一侧同一条口径
  // （第 136 轮，写在 `import.xl.md` 的 `PrintAst` 里）。产物把
  // `[Keyword(with), Bracket({…})]` 平铺在模块说明符之后，而 TS 那边是
  // `ExportDeclaration.assertClause`；不摘出来的话它会被下面那一句当成具名导出的括号
  //（`export * from "m" with { … }` 里唯一的 `{` 就是它）。
  const assertUnits: Array<any> = [];
  const braces: Array<any> = [];
  for (let i = 0; i < kids.length; i++) {
    const one = kids[i];
    if (one.get("type") === "Bracket" && one.get("startBracket") === "{") {
      braces.push(one);
      const word = i > 0 ? kids[i - 1] : undefined;
      const wordText = word === undefined ? "" : textOfNode(word, ctx);
      if (wordText !== "with" && wordText !== "assert") continue;
      const elements: Array<any> = [];
      for (const part of splitTopLevel(projectableKids(view(one)), ctx, ",")) {
        const colonAt = part.findIndex(
          (k: any) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === ":",
        );
        if (colonAt < 0) continue;
        const nameUnit = part.slice(0, colonAt).find((k: any) => isNameNode(k));
        if (nameUnit === undefined) continue;
        const valueUnit = part
          .slice(colonAt + 1)
          .find((k: any) => k.get("type") === "String" || k.get("type") === "ConstString");
        elements.push({
          kind: "AssertEntry",
          name: nameOf(nameUnit, ctx),
          value: valueUnit === undefined ? undefined : projectNode(valueUnit, ctx),
          pos: startOf(nameUnit),
          end: valueUnit === undefined ? endOf(nameUnit) : endOf(valueUnit),
        });
      }
      props.assertClause = {
        kind: "AssertClause",
        elements,
        pos: startOf(word),
        end: endOf(one),
      };
      assertUnits.push(word, one);
    }
  }
  const brace = braces.find((k) => assertUnits.includes(k) === false);
  if (brace !== undefined) {
    const open = startOf(brace);
    const close = endOf(brace);
    props.exportClause = {
      kind: "NamedExports",
      elements: namedSpecifiersOf(brace, "ExportSpecifier", ctx),
      pos: open,
      end: close,
    };
  }
  // **`export * as ns from "m"`**（第 165 轮）：TS 那边 `exportClause` 是一个
  // `NamespaceExport`（区间从 `*` 到那个名字的末尾，`Identifier` 是它的子节点）。
  // 产物那一段是 `[*, Keyword(as), Identifier(ns)]` 平级三格——不收的话
  // `ExportDeclaration` 少一整个 `exportClause` 字段、缺 `NamespaceExport` + `Identifier`
  // （实测 `ex-reexport.ts` / `mod-export-star-as-namespace.ts` / `mod-adversarial-shapes.ts`）。
  const star = kids.find((k) => k.get("type") === "SymbolToken" && textOfNode(k, ctx) === "*");
  if (brace === undefined && star !== undefined) {
    const asIndex = kids.findIndex((k) => textOfNode(k, ctx) === "as");
    const nameNode = asIndex < 0 ? undefined : kids[asIndex + 1];
    if (nameNode !== undefined) {
      props.exportClause = {
        kind: "NamespaceExport",
        name: projectNode(nameNode, ctx),
        pos: startOf(star),
        end: endOf(nameNode),
      };
    }
  }
  // `export { a } from "m"` 的模块名（TS：`moduleSpecifier`，与 `exportClause` 并列）。
  // **括号那一档**（第 877 轮）：`from("m")` 的字符串在 `Method(name="from")` **里面**
  // ⇒ 那个 `Method` 就是 TS 的 `ParenthesizedExpression`（`moduleSpecifier` 仍是括号**里**那个
  // `StringLiteral`，与 TS 一致：语义报错是「模块名不是字符串字面量」，语法树里那对括号还在）。
  // 少了这一句实测缺 `ParenthesizedExpression` 一格。
  const module_ = moduleSpecifierIn(kids);
  if (module_ !== undefined) {
    const projected = projectNode(module_, ctx);
    const holder = moduleHolderOf(kids, module_);
    if (holder === undefined) {
      props.moduleSpecifier = projected;
    } else {
      // **括号那一档**（第 877 轮）：`from("m")` 里那个字符串装在
      // `Method(name="from")` 里面（`Method` 的字典把实参表**摊平**成 `children`，
      // 所以 `holder` 就是那个 `Method`）——TS 那边这条语句仍是一条 `ExportDeclaration`，
      // 而那一格是 `ParenthesizedExpression`（`moduleSpecifier` 是括号**里**那个
      // `StringLiteral`：语义上会报「模块名不是字符串字面量」，语法树上那对括号还在）。
      // 少了它实测缺 `ParenthesizedExpression` 一格。
      //
      // **区间两头都从那个字符串推**：TS 给的是 `[17,22)`，而字符串自己的区间是 `[19,22)`
      // ⇒ 起点是字符串起点**减一**（那个 `(` —— `from` 那两个字符不算），终点是字符串终点**加一**
      //（`endOf` 在这一层给的是**闭**右端，见 `parenthesizedOf` 那一处的用法；
      // 而 TS 的 `ParenthesizedExpression` **不含**那个右括号）。照 `Method` 自己的两端给会多出
      // 一格 `[13,22)`（把 `from` 也圈进去，实测「缺一格 + 多一格」两边各差一格）。
      props.moduleSpecifier = {
        kind: "ParenthesizedExpression",
        expression: projected,
        pos: Math.max(0, startOf(module_) - 1),
        end: endOf(module_) + 1,
      };
    }
  }
  return props;
```

# private method braceSpanOf:(raw:any)=>any

把 token 记下的**整对花括号**（产物字典里的 `bodyBraceRange`，`"起,止"` 闭区间）
读成 `[起, 止]`；没记过 / 记坏了给 `null`。

**为什么要这一格**（用户口径：token 出字段、投影直读）：`IfSegment.BodyBrace`（第 637 轮）
与 `Try.TryBrace` 的写法一样——**挂体那一刻那个 `Bracket` 就在手上** ⇒ 两端都是**事实**。
投影原来只能回原文找 `{` 再 `MatchingBrace` 扫一遍，那一趟会被块里的字符串或注释里的
假括号骗到（`if (a) { s = "{" }` 就是它）。

```ts
  if (typeof raw !== "string" || raw.includes(",") === false) return null;
  const parts = raw.split(",");
  if (parts.length !== 2) return null;
  const start = Number(parts[0]);
  const end = Number(parts[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) return null;
  return [start, end];
```

# private method bodyBlockOf:(from:int, kids:Array<any>, ctx:any, braceRange:string = "")=>any

**循环体**的体 → `Block`（或没有花括号时的单条语句 / 空体时 `undefined`）。

**第一判据是 token 记下的整对花括号**（第 641 轮，`braceRange` = 产物字典里的
`bodyBraceRange`）：`While.BodyBrace` 在挂体那一刻就把那对括号记下了，
有它 ⇒ TS 那边就是一个 `Block`（**空块也在内**），下面那一套「找 `{` + `MatchingBrace`」
一步都不跑。

与 `blockOfBody` 的分工：那一支的 `kids` 里已经有成形的语句、靠「第一个语句之前有没有 `{`」
判断；而 `for` / `while` / `do…while` / `for…of` 的体段在 `ToList` 里**只有语句**
（花括号那层壳不在树里），所以**没有字段时**括号只能**从原文找**——`from` 传头部结束的位置。

**这一格今天四个循环体全都记了**（`While` / `For` / `Foreach` / `DoWhile` 各自的 `BodyBrace`，
第 618 / 619 / 598 / 641 轮陆续补齐 ⇒ 下面那套「找 `{` + `MatchingBrace`」是**兜底**，
给还没记字段的 token 与克隆体留着）。

```ts
  const list = kids.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  const projections = projectEach(list, ctx);
  // **整对读字段那一支**（第 641 轮）：字段只在「体就是一对花括号」时才会被 token 写下
  //（`While.BodyBrace` 的 `CaptureBodyBrace` 那一处就是这个条件），
  // 所以有它 ⇒ TS 那边就是一个 `Block`——空块那一档（`while (c) {}`）也一并落在这里。
  const knownBrace = braceSpanOf(braceRange);
  if (knownBrace !== null) {
    return { kind: "Block", statements: projections, pos: knownBrace[0], end: knownBrace[1] + 1 };
  }
  // **空体语句 `while (c);` / `for (const x of y);`**（第 127 轮）：体段为空、
  // 原文里头部之后紧跟一个 `;` ⇒ TS 那边是一个 `EmptyStatement`。
  // 这一支要**排在找花括号之前**：`while (c) ;  return { … };` 里后面那个 `{`
  // 是下一条语句的，先找括号会把它认成循环体。
  if (projections.length === 0) {
    let at = from;
    while (at < ctx.source.length && /\s/.test(ctx.source[at])) at++;
    if (ctx.source[at] === ";") {
      return { kind: "EmptyStatement", pos: at, end: at + 1 };
    }
  }
  const first = list.length > 0 ? startOf(list[0]) : -1;
  const brace = ctx.source.indexOf("{", from);
  // **花括号必须在第一个语句之前**（第 127 轮）：`while (c) f();` 换行 `return { … };`
  // 里 `indexOf("{", from)` 找到的是下一条语句里那个 `{`。原来只查「配对的 `}` 不早于
  // 最后一条语句的终点」——那个判据在「括号整个落在语句之后」时**恒真**
  // （实测 `dist/ts/typescript/ts-ast.ts` 两处：`while (…) end++;` 换行 `return { kind: … };`
  // 与 `const props = { … }` 前一个函数体，各多出一个 `Block` 包住整个对象字面量）。
  if (brace >= 0 && (first < 0 || brace < first)) {
    const close = matchingBrace(ctx.source, brace);
    const last = list.length > 0 ? endOf(list[list.length - 1]) : -1;
    // 括号还必须**盖住全部语句**，否则那个 `{` 是下一条语句的（见 `blockOfBody` 的说明）。
    if (close >= brace && close >= last) {
      return { kind: "Block", statements: projections, pos: brace, end: close + 1 };
    }
  }
  if (projections.length === 1) return projections[0];
  if (projections.length === 0) return undefined;
  return { kind: "Block", statements: projections, pos: startOf(list[0]), end: endOf(list[list.length - 1]) };
```

# private method blockOfBody:(kids:Array<any>, ctx:any, from:int, braceRange:string = "")=>any

一个段的体 → `Block`（或没有花括号时的单条语句）。

**第一判据是 token 记下的整对花括号**（第 641 轮，`braceRange` = 产物字典里的
`bodyBraceRange`）：`IfSegment.BodyBrace` 在挂体那一刻就把那对括号记下了，
有它就**直接**是那个 `Block`——下面那套「找 `{` + `MatchingBrace` + 比对语句表」
一步都不跑（那套是回原文猜的第二份答案）。

**没有字段时才回原文猜**（`For` / `While` / `DoWhile` / `Foreach` 的体段**今天也都记了这一格**，
所以这一支是留给克隆体与还没记字段的 token 的兜底）：
判据（两处都得看，不能只看第一个 `{`）：先找**第一个语句起点之前**的那个 `{`，
再要求它配对出来的 `}` **不早于最后一个语句的终点**——
`if (a) b(); { c(); }` 里那个 `{` 属于**下一条语句**，第一个语句的终点在它之前，
所以「第一个 `{` 就认块」会造出一个 TS 那边不存在的 `Block`。
反过来，体的语句都在花括号里时，配对的 `}` 一定盖住全部语句。

```ts
  const list = kids.filter((k) => k instanceof Map && !INVISIBLE.has(k.get("type")));
  const projections = projectEach(list, ctx);
  // **整对读字段那一支**（第 641 轮）：字段只在「体就是一对花括号」时才会被 token 写下
  //（`CaptureBodyBrace` / `Try` 那两处都是这个条件），所以有它 ⇒ TS 那边就是一个 `Block`，
  // 连空体那一档（`if (a) {}`）也一并落在这里。
  const known = braceSpanOf(braceRange);
  if (known !== null) {
    return {
      node: { kind: "Block", statements: projections, pos: known[0], end: known[1] + 1 },
      end: known[1] + 1,
    };
  }
  if (projections.length === 0) {
    // **体里只有注释**（第 140 轮）：`} else if (item === "_") { // 注释 }` 的产物里那条
    // `Statement` 只剩一个注释单元（trivia），`projectEach` 投出 `undefined`——
    // 于是这里返回 `undefined`，而 TS 那边那个 `Block` 是**实打实存在**的（空的 `statements`）。
    // 少了它 `IfStatement` 的字段名差一格、`Block` 缺一个
    // （实测 `dist/ts/typescript/tokens/identifier.ts` 两处 `else if` 的注释体，全语料同类 15 处）。
    // 位置从**原始子单元**上取：注释虽然是 trivia，但它所在的那个 `Statement` 是有区间的。
    const at = list.length > 0 ? startOf(list[0]) : -1;
    if (at >= 0) {
      const open = ctx.source.lastIndexOf("{", at);
      if (open >= 0) {
        const close = matchingBrace(ctx.source, open);
        const between = ctx.source.slice(open + 1, at).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
        if (close >= open && between.trim() === "") {
          return {
            node: { kind: "Block", statements: [], pos: open, end: close + 1 },
            end: close + 1,
          };
        }
      }
    }
    // **空体 `if (a) {}`**（第 150 轮）：体段一个单元都没有（连注释都没有），但原文里那对
    // 花括号是实打实的——TS 那边是一个空的 `Block`。从 `from`（条件段末尾）往后只允许
    // 空白 / `)` / 注释，撞上 `{` 就是那个体
    // （实测 `ex-regex.ts` 的 `if (/x/.test(s)) {\n}`：缺 `Block` 1 + `IfStatement` 漂移 1）。
    if (from !== undefined && from >= 0) {
      let at = from;
      while (at < ctx.source.length) {
        const ch = ctx.source[at];
        if (/\s/.test(ch) || ch === ")") {
          at++;
          continue;
        }
        if (ch === "/" && ctx.source[at + 1] === "/") {
          while (at < ctx.source.length && ctx.source[at] !== "\n") at++;
          continue;
        }
        if (ch === "/" && ctx.source[at + 1] === "*") {
          const close = ctx.source.indexOf("*/", at + 2);
          at = close < 0 ? ctx.source.length : close + 2;
          continue;
        }
        break;
      }
      if (ctx.source[at] === "{") {
        const open = at;
        const close = matchingBrace(ctx.source, open);
        if (close >= open) {
          return { node: { kind: "Block", statements: [], pos: open, end: close + 1 }, end: close + 1 };
        }
      }
    }
    return undefined;
  }
  const first = startOf(list[0]);
  const last = endOf(list[list.length - 1]);
  const brace = ctx.source.lastIndexOf("{", first);
  if (brace >= 0) {
    const close = matchingBrace(ctx.source, brace);
    // **`{` 与第一条语句之间只能有空白与注释**（第 97 轮）：只要求「配对的 `}` 不早于最后一条」
    // 是不够的——`if (name === "") return undefined;` 会往回找到**别处**（下一个函数）的 `{`，
    // 那个 `}` 当然「不早于」，于是凭空造出一个盖住半个文件的 `Block`：
    // 实测 `IfStatement` 漂移 99 + 多出 99 全是它（产物区间 14595 vs TS 13479）。
    const between = ctx.source.slice(brace + 1, first).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
    if (close >= last && between.trim() === "") {
      return { node: { kind: "Block", statements: projections, pos: brace, end: close + 1 }, end: close + 1 };
    }
  }
  // 没有花括号：TS 那边就是那条语句本身（`if (a) f();` ⇒ `ExpressionStatement`）。
  // **终点取投影出来的那个节点自己的 `end`**（第 157 轮）：`last` 是**产物单元**的终点，
  // 它会带上尾随那个软换行（`if (skip()) continue loop` 换行 ⇒ 单元到 169、TS 到 168）。
  // 投影节点的 `end` 已经过 `stmtEndOf` 剪过 trivia，正好是 TS 的口径
  // （实测 `decl-label-break-continue.ts`：`IfStatement` 漂移 2 + 多出 2）。
  const lastProjected = projections.length > 0 ? projections[projections.length - 1] : undefined;
  const bodyEnd = lastProjected !== undefined && typeof lastProjected.end === "number" ? lastProjected.end : last;
  return {
    node:
      projections.length === 1
        ? projections[0]
        : { kind: "Block", statements: projections, pos: first, end: last },
    end: bodyEnd,
  };
```

# private method matchingBrace:(source:string, open:int)=>int

```ts
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    // **字符串与注释里的花括号不算括号**（第 96 轮）：`document.GetValue(index + 2) === "{"`
    // 这种写法让深度永远回不到 0、配对直接失败——于是体被判成「没有花括号」，
    // `IfStatement` / `Block` 的终点停在最后一条语句上（实测 137 处漂移 + 137 处「多出来」是同一处）。
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < source.length && source[i] !== c; i++) {
        if (source[i] === "\\") i++;
      }
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      for (i += 2; i < source.length && !(source[i] === "*" && source[i + 1] === "/"); i++);
      i++;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
```

# private method matchingParenOf:(source:string, from:int)=>int

从 `from` 起往后找**第一对配对圆括号**的右括号下标；找不到给 `-1`。

与 `matchingBrace` 同一套扫描（跳过字符串与注释），只把计数的括号换成 `(` / `)`。
给「头部之后是不是空体语句」那一支用：`for (i = f(x); …) ;` 里 `f(x)` 的右括号
不能当成头部的右括号，所以必须**按深度配对**、不能取第一个 `)`。

```ts
  let depth = 0;
  let started = false;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < source.length && source[i] !== c; i++) {
        if (source[i] === "\\") i++;
      }
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      for (i += 2; i < source.length && !(source[i] === "*" && source[i + 1] === "/"); i++);
      i++;
      continue;
    }
    if (c === "(") {
      depth++;
      started = true;
      continue;
    }
    if (c === ")") {
      depth--;
      if (depth === 0 && started) return i;
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
  // **单个子单元也走 `projectExpression`**（第 954 轮）：原来这里是「一格直接 `projectNode`」，
  // 于是 `{ [(x in y)]: 1 }` 那一格——计算名里**套一层圆括号**——投出一格裸 `Bracket`
  //（未映射），而 TS 那边是 `ComputedPropertyName > ParenthesizedExpression > BinaryExpression`
  //（实测缺 `ParenthesizedExpression` 1、多未映射 `Bracket` 1，与 `in` 无关：
  // `{ [(a + b)]: 1 }` / `{ [(f(x))]: 1 }` 同形）。**判据一条没新写**：值位括号 →
  // `ParenthesizedExpression` 那一条长在 `projectExpression` 里（见那里 0a 之前那一支），
  // 这里只是把单格也交给它问一次；单个非括号单元仍落到它的末尾那一句
  //（`return projectNode(kids[0], ctx)`）——与原来逐格同一结果。
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
  // **属性里那个名字也要解转义**（第 381 轮）：`const \u0061bc = 1` 的名字住在
  // `Let.fieldName` 这个**属性**上（不是子单元），`x.\u0061` 的键同理。
  // **与 `Identifier.PrintAst` 共用一份解码**（`text-common-util.xl.md` 的
  // `DecodeIdentifierEscapes`）——两处各写一份就是两处会漂的答案（这一轮第一版
  // 只改了标识符那一格，于是 `function f\u0066()` 绿了、`const \u0061bc` 还是红的）。
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
      // **私有名的组成单元也要跳过**（第 138 轮）：`#m` 在产物里是
      // `[SymbolToken(#), Identifier(m)]` **两格**，而 `props.name` 是从 `name` 属性合成的
      // **一个** `PrivateIdentifier`（`nameNode` 因此是 `null`）——两格都会漏进
      // `parameters`，多出一个 `#` 与一个 `Identifier(m)`
      // （实测 `decl-class-private-method` / `lex-private-method`：多出 6 + 字段名 3）。
      // 只对 `PrivateIdentifier` 生效：`namespace A.B.C` 那种合成名**确实**跨着里面的几格，
      // 按区间一刀切会把它们全丢掉。
      //
      // **两端都是「开区间终点」**（`endOf` = `range[1] + 1`），所以里面那几格的判据是
      // `endOf(x) <= name.end`——写成 `<` 时最后那一格（`m`）会漏掉，只剩 `#` 被吃掉。
      if (
        nameNode === null &&
        props.name !== undefined &&
        props.name.kind === "PrivateIdentifier" &&
        startOf(x) >= props.name.pos &&
        endOf(x) <= props.name.end
      ) {
        continue;
      }
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
        // **`Namespace` 那一档只在「点号命名空间的嵌套」里成立**（第 367 轮，
        // **第 292 轮那股改动的另一半**）：
        // `namespace A.B.C { … }` 的产物是**三层 `Namespace` 套着** ⇒ 内层字段名是
        // `body`（TS 的 `ModuleDeclaration.body` 就是里面那层）；
        // 而 `namespace O { export namespace I { … } }` 里那个内层 `Namespace` 是
        // 外层 **`ModuleBlock` 的孩子** ⇒ TS 那边它躺在 `statements` 里。
        // 一律收成 `body` 的后果（第 292 轮实测）：降级层 `ListOf(block, "statements")`
        // **一个语句都取不到** ⇒ 内层命名空间根本没建 ⇒ 脚本报
        // `cannot read properties of undefined`（**离现场很远**）。
        const nestedNamespaceInBody = x.get("type") === "Namespace" && kind !== "ModuleDeclaration";
        if (nestedNamespaceInBody === false) {
          props[body] = projectNode(x, ctx);
          continue;
        }
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
      // **段名先问这一格的主人**（第 988 轮）：`kept[0]` 只是这一段的第一个单元，
      // 而段是 `v` 这一格切出来的——所以问 `v`，字段名归它。
      const field = fieldNameFor(kind, key, v);
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
      // **段名先问这一格的主人**（第 988 轮）：`target` 已经是投影的字段名
      // （`WrapperTarget` 给的：`ClassBody` → `members`、`GenericType` → `typeParameters`…），
      // 所以这里问的是「**同一张表**里另写的那些叫法」——问的是 `v`（这一格自己、也就是
      // 切出这个段的那张 token），**不是**包装单元或它的内容：
      // 段是这一格切出来的，字段名归它。
      //
      // **这里踩过一次**（第 988 轮，`samples` 当场抓出）：「问内容」在 `GenericType`
      // 这种**每个 token 都可能有**的包装上会落空——`Class` 的 `children` 里第一格是
      // `GenericType`，它的 `SegmentNames` 里没有 `ClassDeclaration` 这一档
      // ⇒ 查不到 ⇒ `ClassDeclaration.heritageClauses` 整格变成 `types`，而
      // `cases:tsast` 只看 kind / 区间 / 字段名**集合**，这一格恰好两边都在（只是名字换了）
      // 所以它是绿的。`samples` 是逐字节比，它当场报出来。
      const field = target === "children" ? fieldNameFor(kind, key, v) : fieldNameFor(kind, target, v);
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
  // **装饰器并进 `modifiers` 并按源码位置排序**（见 `addDecorators`）：TS 的 `modifiers` 是源码顺序
  // （`@dec export class` 也好、`export class` 也好，谁在前谁先）。
  addDecorators(v, props, ctx);
  return props;
```

# private method projectableKids:(v:any)=>Array<any>

```ts
  return allKids(v).filter((k) => !INVISIBLE.has(k.get("type")));
```

# private method labelIsFlat:(node:any)=>bool

这一格标签**还没有包住**被它标的语句（老形状：标签与被标语句是平级兄弟）。

第 929 轮起 `Statement.AbsorbLabels` 会把被标的语句**搬进标签**里
（`<Label label="outer"><While>…</While></Label>`，与 TS 的 `LabeledStatement` 同形），
于是「标签 + 右边那一格」那两处合并补丁（`projectEach` / `projectStatement`）**只在
老形状上**才该生效——包好的标签是一个单元、由 `Label.PrintAst` 自己出形状。

判据就是「它有没有子单元」（与 `Token.ToDictionary` 那一份同源：空了才自闭合）。

```ts
  return kidsOf(view(node), "children").length === 0;
```

# private method statementOfList:(list:Array<any>, ctx:any)=>any

把一串**平铺的单元**当成**一条语句**投：造一个同区间的合成语句视图，交回 `projectStatement`。

**两个调用方问的是同一句**：`projectStatement` 的标签那一支（老形状下「标签右边剩下的那一串」）
与 `Label.PrintAst`（包好的标签里那一段）。`projectStatement` 那儿已经有「语句壳 / 表达式壳 /
`;` 归属」的全套口径，另写一份就是第二处会漂的答案。

```ts
  if (list.length === 0) {
    return undefined;
  }
  const rest = {
    type: "Statement",
    start: startOf(list[0]),
    end: endOf(list[list.length - 1]),
    value: undefined,
    attrs: new Map(),
    segments: new Map([["children", list]]),
  };
  return projectStatement(rest, ctx);
```

# private method stringText:(v:any, ctx:any)=>any

```ts
  const content = kidsOf(v, "children").find((k) => k.get("type") === "ConstString");
  if (content !== undefined) return textOfNode(content, ctx);
  // **没有内容单元 = 一个字都没有**（第 119 轮修掉的那条老缺口）。
  //
  // 这个 token 的内容**全部**住在 `ConstString` 子单元里——实测（见台账第 119 轮的现场）：
  //   - `"x"` / `'a\nb'` / `@"raw"` / `` `t` `` → **都有**一个 `ConstString` 子单元；
  //   - `` `${1}` `` / `` `a${1}` `` / `` `${1}b` `` → 文本段**照样**各给一个
  //     （**包括空段**：那个 `ConstString` 的值就是空串）；
  //   - `""` / `''` / `` `` `` → **一个都没有**。
  // 所以「一个都没有」只可能是**空串**，不是「值是一对引号」。
  //
  // **原来这里退到「原样切源码」**：那给出的是**带引号的原文**（`""`）——
  // 于是空串与非空串在降级层分不开，判据报的是
  // `unimplemented: an empty string literal is reported in quoted form`，
  // 而 `let s = ""` 这种遍地都是的写法直接跑不起来（`parsing-gaps` 里记了几十轮）。
  return "";
```

# private method kindsInAst:(node:any, out:Set<string>)=>void

把一棵投影出来的 AST 里的 **`kind` 名**收进 `out`（只认节点：有 `kind` 字段的对象）。

用途只有一个：`projectRoot` 报 `unmapped` 之前拿它**对一次账**（见下面那一节）。

```ts
  if (node === null || typeof node !== "object" || !("kind" in node)) {
    return;
  }
  out.add(node.kind);
  for (const key of Object.keys(node)) {
    if (key === "kind" || key === "pos" || key === "end" || key === "text") {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) kindsInAst(item, out);
    } else {
      kindsInAst(value, out);
    }
  }
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

返回 `{ ast, unmapped, count }`：`unmapped` 是这次没覆盖到、**并且真的原样透传进了产物**的
产物标签；`count` 是投影出的节点数。

**为什么末尾要拿 `kindsInAst` 对一次账**（第 199 轮）：`ctx.unmapped.add(v.type)` 记在
`projectNode` 的通用支里，而**有些调用点只是「问一下」这个子单元能投出什么**——
结果被调用方丢掉、根本不落进 AST（实测全语料 9137 处这样的访问，散布在 48 个文件里；
最典型的是各种参数括号 `(a, b)`：投影总是先问一遍再自己摊平）。
只按 `add` 记账，这一栏就是**噪声**：它数的是「投影路过谁」，不是「谁透传进了产物」。
透传节点的 `kind` 就是标签名本身（`mk(v.type, …)`），所以「这个标签名在产物里当过 kind」
正好等值于「它透传进了产物」——滤掉问路的那批之后这一栏才有判据的价值
（`cases:tsast` 的退出码已经把它算进去了）。

```ts
  const ctx = {
    source,
    unmapped: new Set(),
    count: 0,
    // **类型位标记**（第 99 轮）：`projectTypeExpression` 在投「只有一个单元」的类型时置上它，
    // 让 `projectString` 知道该出 `TemplateLiteralType` 还是 `TemplateExpression`
    // （两者产物同形，只有这一点上下文能区分）。
    typePosition: false,
    // **被上一条语句吃掉的 `;`**（第 141 轮）：TS 的 `parseExpressionStatement` 收尾会把
    // 紧跟的那个 `;` 算成自己的终结符（`tryParseSemicolon` 不看换行），所以那种 `;`
    // **不再**是一条 `EmptyStatement`。语句是按顺序投的，所以先吃后判、用这个集合对账。
    consumedSemicolons: new Set(),
    // **给 token 的 `PrintAst(ctx, v)` 用的出口助手**（见 `core/syntax/token.xl.md` 的 `PrintAst`）：
    // 覆写里不必 import 任何东西——造节点、投一批子单元、按成员切、取文本、分叶子名，
    // 全在这一组里。它们**逐个转调**上面那些共享实现，所以两条路的产物逐字节相同。
    Node: (kind, props, view) => astNode(kind, props, view, ctx),
    // **坐标在前的键序**（第 199 轮）：搬家前那批内联写法的节点用它，见 `astNodeHead`。
    NodeHead: (kind, props, view) => astNodeHead(kind, props, view, ctx),
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
    StringText: (node) => stringText(node instanceof Map ? view(node) : node, ctx),
    // **字符串 / 模板串这一格**（第 99 轮）：模板串要递归投内插里的表达式或类型，
    // 那不是 token 层能做的事，所以实现留在 `projectString`、由 token 的 `PrintAst` 转过来。
    Template: (view) => projectString(view, ctx),
    LeafKind: (text) => leafKindOfText(text),
    KeywordKind: (text) => KEYWORD_KIND.get(text),
    TokenKind: (text) => tokenKind(text),
    // **搬迁用的补充出口**（第 181 轮）：`case "X": return projectX(v, ctx)` 那 100 条要逐块
    // 搬进各 token 自己的 `PrintAst(ctx, v)`，而那一层**不能 import 本文件**
    // （token 层反过来被本文件依赖，会成环）。所以这些横切的小工具只能经 `ctx` 递过去——
    // 与上面那一组同款：逐个转调共享实现，行为不变。
    // **`PrintAst` 收到的 `v` 是「视图」不是原始 Map**（见 `projectNode` 开头那句
    // `const v = view(node)`），所以取坐标这两种都要认：视图读 `start` / `end` 两个字段，
    // 原始 Map 走 `range`。搬迁过去的代码里 `v.start` / `v.end` 就是这么用的。
    StartOf: (node) => (node instanceof Map ? startOf(node) : node.start),
    EndOf: (node) => (node instanceof Map ? endOf(node) : node.end),
    StmtEndOf: (view) => stmtEndOf(view, ctx),
    // **尾分号那一格的出口**（第 840 轮）：`declare module "mm";` 那个 `;` 到达时
    // 声明早已成形（收尾规则问「简写」的那一刻列表只到名字），所以它由**投影侧**
    // 按「没体的声明自己吃尾分号」补进区间——与第 838 轮那条口径同一份实现。
    SemicolonEndOf: (end) => semicolonEndOf(end, ctx),
    Split: (list, separator) => splitTopLevel(list, ctx, separator),
    Invisible: INVISIBLE,
    IsSymbol: (node, text) => isSymbol(node, text),
    IsDot: (node) => isDot(node, ctx),
    IsIndexBracket: (node) => isIndexBracket(node),
    IsOperatorUnit: (node) => isOperatorUnit(node, ctx),
    ChainWithOptional: (node, nco) => chainWithOptional(node, nco, ctx),
    NameOf: (node) => nameOf(node, ctx),
    // **`Kids` 两种都认**（第 185 轮）：`PrintAst` 里传进来的常常是**视图**（`v`），
    // 但取子单元时手上也可能是**原始 Map**（`nameUnits.find(...)` 那种）——
    // `projectableKids` 只吃视图，所以这里自己归一。
    Kids: (node) => projectableKids(node instanceof Map ? view(node) : node),
    Expression: (list) => projectExpression(list, ctx),
    TypeExpression: (list) => projectTypeExpression(list, ctx),
    ProjectEach: (list, parentKind) => projectEach(list, ctx, parentKind),
    // **把一串单元当作「成员表」投**（第 934 轮）：`MappedType` 的值类型之后还能再跟成员
    // （TS 的 `parseMappedType` 在值类型之后照样 `parseTypeMembers()`），而那一格住不进
    // `ToDictionary` 的成员段（映射类型的字典是「修饰词 / 键 / 值类型」那一套）⇒
    // 由它的 `PrintAst` 把那一小段按成员位投一次。
    // 实现与通用支那一支**共用同一份**（`projectEachIn`，`parentKind` 传 `"TypeLiteral"`：
    // 那一格同时决定「成员之间不切」与 `ctx.signature`——`Field` 因此投成
    // `PropertySignature` 而不是 `PropertyDeclaration`）。
    MemberList: (list, parentKind) => projectEachIn(list, ctx, parentKind),
    KidsOf: (node, key) => kidsOf(node instanceof Map ? view(node) : node, key),
    Attr: (node, key) => (node instanceof Map ? view(node) : node).attrs.get(key),
    FirstCodeAfter: (text, at) => firstCodeAfter(text, at),
    MatchBrace: (text, at) => matchBrace(text, at),
    // **跳过源文本里的空白与注释**（第 829 轮）：`import … from "m"/*c*/;` 那种
    // 「尾分号前面夹一条注释」的排法要能问到那个 `;`（见 `skipSourceTrivia`）。
    SkipSourceTrivia: (text, at) => skipSourceTrivia(text, at),
    NamedSpecifiers: (brace, kind) => namedSpecifiersOf(brace, kind, ctx),
    MemberNameOf: (view) => memberNameOf(view, ctx),
    AddModifiers: (view, props, baseStart) => addModifiers(view, props, ctx, baseStart),
    Decorators: (view, props) => addDecorators(view, props, ctx),
    OperatorRank: (text) => operatorRank(text),
    FoldBinaryFrom: (left, list) => foldBinaryFrom(left, list, ctx),
    ParameterModifiers: PARAMETER_MODIFIERS,
    SynthName: (text, view) => synthName(text, view, ctx),
    StatementOf: (view) => projectStatement(view, ctx),
    // **一串平铺的单元当作一条语句投**（第 929 轮）：`Label.PrintAst` 要的就是它
    // （包好的标签里装的是被标语句的那一段，而它可能不是一个成形单元）。
    // 与 `projectStatement` 里那一支**共用一份实现**（见 `statementOfList`）。
    StatementOfList: (list) => statementOfList(list, ctx),
    Nothing: NOTHING,
    BodyBlockOf: (from, list, braceRange) => bodyBlockOf(from, list, ctx, braceRange),
    MatchingBrace: (source, at) => matchingBrace(source, at),
    MatchingParen: (source, at) => matchingParenOf(source, at),
    IndexBracketOf: (view) => indexBracketOf(view, ctx),
    ParenthesizedOf: (unit) => parenthesizedOf(unit, ctx),
    LetFrom: (list, view) => projectLetFrom(list, ctx, view),
    HeadDeclare: (list, view) => projectHeadDeclare(list, ctx, view),
    IsNameNode: (node) => isNameNode(node),
    QualifiedNameFrom: (list) => qualifiedNameFrom(list, ctx),
    DottedExpression: (list) => dottedExpression(list, ctx),
    TypeArguments: (generic) => projectTypeArguments(generic, ctx),
    ConditionalNode: (list, from, to) => conditionalNode(list, from, to, ctx),
    Segment: (view, key) => projectSegment(view, key, ctx),
    UnwrapNodes: (unit) => unwrapNodes(unit),
    TypeOf: (list) => typeOf(list, ctx),
    FunctionTypeProps: (kids) => functionTypeProps(kids, ctx),
    BlockOfBody: (list, from, braceRange) => blockOfBody(list, ctx, from, braceRange),
    SwitchClause: (seg) => projectSwitchClause(seg, ctx),
    AllKids: (node) => allKids(node instanceof Map ? view(node) : node),
    BindingPattern: (unit) => projectBindingPattern(unit, ctx),
    ComputedNameExpression: (unit) => computedNameExpression(unit, ctx),
    Structural: (view, kind) => structuralProps(view, kind, ctx),
    IsTypeParameterModifier: (node) => isTypeParameterModifier(node, ctx),
    MemberInObject: MEMBER_IN_OBJECT,
    NumericLiteral: NUMERIC_LITERAL,
    // **运算符那一格的叶子节点**（第 550 轮）：`in` / `instanceof` 在深度界那一层
    // 还是 `Identifier`，照 `Project` 投会投成 `Identifier("in")` ——
    // `BinaryOperator.PrintAst` 那一支正需要它（见 `operatorTokenOf`）。
    OperatorNode: (unit) => operatorTokenOf(unit, ctx),
  };
  const statements = projectEach(exported, ctx);

  // **没有语句的文件**（整份文件只有注释）：TS 的 `SourceFile.getStart()` **就是文件长度**
  // （没有 token 可跳，`getStart` 退回 `end`），而本工程原来退回 `0`——于是
  // `@types/node/index.d.ts` 那 38 个「只有许可注释」的桩文件整份对不上
  //（实测缺 `SourceFile` 38，三个样本都是这种桩）。
  const firstStart = statements.length > 0 ? statements[0].pos : source.length;
  const ast = {
    kind: "SourceFile",
    statements,
    endOfFileToken: { kind: "EndOfFileToken", pos: source.length, end: source.length },
    pos: firstStart,
    end: source.length,
  };
  // **只报真的透传进产物的那一批**（第 199 轮）：`ctx.unmapped` 里混着「投影只是问了一下、
  // 结果被调用方丢掉」的标签（见上面那一节的实测数），拿产物自己的 `kind` 集合对一次账就干净了。
  const landed: Set<string> = new Set<string>();
  kindsInAst(ast, landed);
  return {
    ast,
    unmapped: [...ctx.unmapped].filter((tag) => landed.has(tag)).sort(),
    count: ctx.count,
  };
```

# private method moduleSpecifierIn:(kids:Array<any>)=>any

在这几格（以及它们的子格）里找**模块路径**那个字符串节点；找不到给 `undefined`。

**为什么要递归**（第 877 轮）：`export { a }` 换行 `from("m")` 里那个 `from` 被
`MethodCloseRule` 收成了一个 `Method(name="from")`，字符串在**它里面**——
TS 那边这条语句照样是一条 `ExportDeclaration`（`moduleSpecifier` 是括号里的字符串，
`from` 自己不是节点）。原来那句只在**本层**找 `String` ⇒ 具名导出的 `moduleSpecifier`
整格丢，而那对括号连带字符串又被通用投影投成一个平级的 `ParenthesizedExpression`
（实测缺 `StringLiteral` / `ParenthesizedExpression` 各一格、字段名差 1）。
**判据仍然是「有没有那个字符串」**，只是把「里面」也算进来——与 `import.xl.md` 的
`FindStringUnit`（`import fs = require("fs")` 那一档）**同一句话**。

```ts
  for (const kid of kids) {
    if (!(kid instanceof Map)) continue;
    if (kid.get("type") === "String") return kid;
  }
  // **只往 `Method` 里面看**（第 877 轮）：`export { a } ⏎ from("m")` 里那个字符串装在
  // `Method(name="from")` 里面。**不能一律递归**——`export { "a-b" as c }` 的字符串名就在
  // 具名子句的**花括号里**，那是 `ExportSpecifier` 的名字、不是模块路径
  //（实测 `mod-export-string-name` 当场红：字段名差 1）。
  for (const kid of kids) {
    if (!(kid instanceof Map) || kid.get("type") !== "Method") continue;
    const one = kid.attrs === undefined ? view(kid) : kid;
    for (const inner of allKids(one)) {
      if (inner instanceof Map && inner.get("type") === "String") return inner;
    }
  }
  return undefined;
```

# private method moduleHolderOf:(kids:Array<any>, target:any)=>any

`target`（那个模块路径字符串）**装在谁里面**；它自己就在 `kids` 这一层时给 `undefined`。

`from("m")` 里那个字符串装在 `Method(name="from")` 里面，而 TS 那边那一格是
`ParenthesizedExpression` ⇒ 投影要知道「它是不是被括号裹着」（见 `namedExportClause`）。

```ts
  for (const kid of kids) {
    if (!(kid instanceof Map) || kid.get("type") !== "Method") continue;
    const one = kid.attrs === undefined ? view(kid) : kid;
    for (const inner of allKids(one)) {
      if (inner === target) return kid;
    }
  }
  return undefined;
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
