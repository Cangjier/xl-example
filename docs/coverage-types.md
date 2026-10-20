# types 家族覆盖（chunk 1：TypeBuilder + 核心类型文法 + TypeAliasDeclaration 测量桥）

本页记录 `typescript/tokens/types/` 的第 1 块覆盖面、口径、暂缓项与公共 API。

## 1. 这次落了什么

| 层 | 文件 | 内容 |
| --- | --- | --- |
| builder | `typescript/tokens/types/type-builder.xl.md`（新） | `TypeBuilder`：手写递归下降的类型解析器 |
| shape | `types/type-reference-shape.xl.md` | `TypeReference`（含 `A<B>` 泛型实参） |
| shape | `types/qualified-name-shape.xl.md` | `QualifiedName`（`A.B`、`A.B.C` 左结合嵌套） |
| shape | `types/union-type-shape.xl.md` / `types/intersection-type-shape.xl.md` | 平铺成员 |
| shape | `types/parenthesized-type-shape.xl.md` | 含括号区间 |
| shape | `types/array-type-shape.xl.md` | 后缀 `[]`，可叠加 |
| shape | `types/tuple-type-shape.xl.md` | `[A, B]` / `[]`（无标签成员） |
| shape | `types/literal-type-shape.xl.md` | 字符串 / 数字 / 布尔 / BigInt / `null` 字面量类型 |
| shape | `types/type-literal-shape.xl.md` | 空对象类型 `{}`（非空报错，交给 chunk 2） |
| shape | `types/this-type-shape.xl.md` | `this` 类型（TS kind `ThisType`，带 `FromBasicToken`） |
| 测量载体 | `typescript/tokens/declarations/type-alias-declaration-shape.xl.md` | `TypeAliasDeclarationShape.FromUnits`：`children = [名字, 类型]`，`type` / `=` / `;` 不进 AST |
| 测量载体 | `typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md` | root 候选：首代码单元必须是 `type`，顶层 `;` 到齐才建 |
| 入口 | `typescript/tokens/files/source-file-shape.xl.md` | 只取消注释 `new TypeAliasDeclarationPossibleShape(),` 这一行 |
| 用例 | `typescript/cases/types.ts` | T1–T10（见 §4） |

原始类型关键字（`any`/`unknown`/`never`/`void`/`undefined`/`boolean`/`number`/`string`/`bigint`/`symbol`/`object`）
直接用 `typescript/tokens/keywords/` 里已有的关键字形状，`TypeBuilder` 用 `SpanLeaf` 签区间 + `Pos`；
这些形状文件不在本块 WRITE SCOPE 内，因此没有给它们加 `FromBasicToken`（唯一例外 `this` 落在本块的 `ThisTypeShape`）。

`types/*-possible-shape.xl.md` 这些桩本块**没有**实现：当前架构下类型解析由 `TypeBuilder` 在
`TypeAliasDeclarationShape.FromUnits` 里一次性完成，没有消费者会去 `BuildByIndex` 那些候选
（与 `docs/expression-ast-analysis.md` §6 末尾「不要动 expression 候选桩」同一个理由）。

## 2. `TypeBuilder` 公共 API（给 expressions / declarations 后续消费）

```
class TypeBuilder
  constructor(template:Template, context:SyntaxContext)
  Load(units:Array<Token>, basePos:int): void
  At: int
  ParseType(): Token
  ParseTypeArguments(): Array<Token>
```

- `Load`：跳过 trivia，按顺序装单元；`Positions[i]` = 第 i 个单元**含前导 trivia** 的起点
  （= 前一个非 trivia 单元 `SourceRange.End.Index + 1`，`basePos` 给第一个）。与 `ExpressionBuilder.Load` 完全同口径。
- `ParseType`：读一个完整类型（union 层，向下覆盖 intersection → 后缀 `[]` → 原子）。
- `ParseTypeArguments`：`At` 停在 `<` 上时读 `<A, B>`，返回实参数组并把 `At` 推到 `>` 之后；没有 `<` 时返回空数组、`At` 不动。
  给 `f<T>(a)` / `as T` / 尖括号断言 / 泛型箭头这些 Tier 2 产生式直接复用。

与 `ExpressionBuilder` 的对齐方式：两者的 `Units` / `Positions` / `At` 语义相同。
「表达式读到一半转读类型」时，把剩下的单元交给新的 `TypeBuilder.Load`，
`basePos` 取 `ExpressionBuilder.Units[ExpressionBuilder.At - 1].SourceRange.End.Index + 1`；
反过来（类型里嵌表达式，如后续 template literal type / 条件类型里的 `infer`）同样用 `ExpressionBuilder.Load` 接续。
两个 builder 都要求：读完后 `At === Units.length`，否则报「没有读完」。

## 3. 区间口径（实测 TS，2026-10-21）

按 IMPORTANCE §4：shape 的 `SourceRange` 是闭区间（`Start`/`End` 都是字符下标，含端点），
`Pos` = 前一个非 trivia 单元 `End.Index + 1`（含前导 trivia，与 TS 的 `pos` 同口径）；
AST 的 `End` 由 `ParseFromShape` 换算成 `SourceRange.End.Index + 1`。

本块踩到的几处**必须逐节点对齐**的口径：

- `type` 关键字、`=`、`;` 不进 AST：`type T = A;` → `TypeAliasDeclaration[0,11) → [Identifier[4,6) T, TypeReference[8,10) A]`；
- 类型引用的 `Pos` 含前导 trivia：`type T =   A;` → `TypeReference[8,12)`；限定名同理；
- `ArrayType` 与元素**同起点**，终点是 `]`：`A[]` → `ArrayType[8,12) → TypeReference[8,10)`；
- `TupleType` / `TypeLiteral` / `ParenthesizedType` 的区间**含括号**；`Pos` 仍是括号前的口径；
- `LiteralType` 与内部字面量的 `pos` 同口径、都含前导 trivia：`type T = "a";` → `LiteralType[8,13) → StringLiteral[8,12)`，
  `type T = 1;` → `LiteralType[8,10) → NumericLiteral[8,10)`（这条实测纠正了一次「字符串从引号起算」的误判）；
- `null` / `true` / `false` 是 `LiteralType` 里挂关键字叶子，`undefined` 却是 `UndefinedKeyword`（关键字类型）：
  `type T = null;` → `LiteralType{NullKeyword}`，`type T = undefined;` → `UndefinedKeyword`；
- `this` 类型是 `ThisType`（不是表达式里 `this` 的 `ThisKeyword`）；
- 空 tuple / 空对象类型没有 children：`[]` → `TupleType[8,11)`，`{}` → `TypeLiteral[8,11)`。

## 4. 用例覆盖（`typescript/cases/types.ts`）

| 组 | 构造 | 条数 |
| --- | --- | --- |
| T1 | 12 个原始类型关键字 + trivia 变体 | 19 |
| T2 | 类型引用（`A` / `A<B>` / `A<B, C>`）+ trivia + 多语句 | 14 |
| T3 | union（2/3/5 成员、优先级、注释、跨行） | 9 |
| T4 | intersection（含与 union 的优先级） | 6 |
| T5 | 括号类型（嵌套、与 union / array 组合） | 6 |
| T6 | 数组类型（叠加、与 union / tuple 组合） | 6 |
| T7 | tuple（空 / 单元素 / 多元素 / 尾随逗号 / 嵌套 / 跨行 / 注释） | 9 |
| T8 | 字面量类型（字符串 / 数字 / 小数 / 布尔 / BigInt / null / 组合 / trivia） | 18 |
| T9 | 空对象类型（含 `{}[]`、union） | 4 |
| T10 | 重复语句（同文件多条 `type`） | 4 |

## 5. 暂缓项（`types.ts` 末尾的 `//` 注释目标）

1. **限定名 `A.B` / `A.B.C` / `A.B<C>`**：形状已实现（`QualifiedNameShape` + `TypeBuilder.MakeQualifiedName`），
   但 TS 侧这个节点的反查名是 **`FirstNode`**（`SyntaxKind.QualifiedName` 的别名盖掉了反向映射）。
   本仓权威尺子 `typescript/cases/ast-json.mjs` 的 `TS_KIND_ALIASES` 还没有这一条
   （`tests/parse/ts-ast.mjs` 有 `["FirstNode","QualifiedName"]`），`ast-json-diff.mjs` 的 `kindOf` 同样没有。
   **依赖**：给这两个 harness 文件各加一行 `["FirstNode", "QualifiedName"]`，然后把 `types.ts` 里那三行注释取消。
   在补上之前加进来会让全量门变红，因此本块先不写。
2. **函数类型 / 构造类型 / 参数 / 非空对象类型成员**：依赖 `ParameterShape` 与 `=>`（cover-expressions-1 的 chunk）。
3. **conditional / mapped / infer / keyof / typeof / indexed / import type / template literal type / type predicate / 类型算子**：
   chunk 2；`TypeBuilder` 的递归下降骨架已就位（`ParseType` 是 union 层，插新层不破坏现有调用）。
4. **泛型参数声明 `type T<U> = U[]`、修饰词 `export` / `declare`**：留给 declarations chunk；本块的 root 候选只放行裸 `type`。
5. 嵌套泛型实参的连写闭合 `A<B<C>>`：基本 token 会把 `>>` 收成一个 `Symbol`，本块未处理（写成 `A<B<C> >` 也不通），
   与 `f<T>(a)` 一起归到 Tier 2 泛型实参那一批。

## 6. chunk 2：函数类型 + 对象类型成员 + 限定名转绿

起点：\`origin/integration 53b5cae7\`（无 types chunk1），\`git merge origin/cover-types-1\` 后 1044/1044 全绿；
本 chunk 后 127 条 types（全量 1098）。§5 里第 2、3 条已在本 chunk 落地，其余仍暂缓。

### 6.1 harness 别名（唯一改动的共享文件）

\`typescript/cases/ast-json.mjs\` 与 \`ast-json-diff.mjs\` 的 \`TS_KIND_ALIASES\` 各加一行
\`["FirstNode", "QualifiedName"]\`（+ 一行注释）：TS 把 \`SyntaxKind.QualifiedName\` 的反查名印成 \`FirstNode\`。
加完后 \`type T = A.B;\` / \`A.B.C\` / \`A.B<C>\` 三条转绿，其它 stem 不回归。

### 6.2 函数类型（\`FunctionType\`）

- \`TypeBuilder.ParseFunctionType\`：\`(\`…\`)\` 括号后跟 \`=>\` 时按函数类型解析；children = 参数们 + 返回类型，\`=>\` 不进 AST；
- \`TypeBuilder.ParseParameterList\` / \`ParseParameter\`：参数 \`名字 [?] : 类型\`，children = Identifier、可选 QuestionToken、类型；
  基本 token 会把连写的 \`?:\` 收成一个 \`Symbol\`（\`SymbolTemplate\` 组合符号表里有 \`?:\`），
  所以 \`ParseOptionalMark\` 同时认 \`?\` 与 \`?:\`，\`?:\` 时 QuestionToken 只覆盖 \`?\` 一个字符；
- \`FunctionTypeShape\` / 扩展的 \`ParameterShape\`（字段 \`ParameterName\` / \`QuestionToken\` / \`Type\`）。

### 6.3 对象类型成员（\`TypeLiteral\`）

\`TypeBuilder.ParseTypeMember\` 支持四种成员：属性 \`a: A\` / \`a?: A\`、只读 \`readonly a: A\`、方法 \`a(): B\`、
索引 \`[k: string]: A\`、调用 \`(a: A): B\`；新增 \`PropertySignatureShape\` / \`MethodSignatureShape\` /
\`IndexSignatureShape\` / \`CallSignatureShape\`。

两处实测口径：
1. **成员节点包含它后面的分隔符**：\`{ a: A; b: B }\` 的 \`PropertySignature\` 是 \`[10,16)\`（\`;\` 在 15），
   \`SpanTypeMember\` 因此把紧跟的 \`;\` / \`,\` 也吃进区间；最后一个没有分隔符的成员不含。
2. 成员之间的分隔符不进 children；空 \`{}\` 仍然没有 children。

### 6.4 仍然暂缓（\`types.ts\` 末尾 \`//\` 目标）

constructor type / 构造签名、rest 与解构参数、默认值、对象类型里的 \`readonly [k: string]\` / 可选方法 / get set、
conditional / mapped / infer / keyof / typeof / indexed / import type / template literal type / type predicate / 类型算子、
泛型参数声明与 export / declare 修饰词、\`A<B<C>>\` 连写闭合（\`>>\` 被 basic token 收成一个 Symbol）。

## 7. chunk 3：条件类型 / infer / 类型算子 / 索引访问 / 构造类型 / rest / 嵌套泛型

起点：\`origin/integration cbb8dc0f\` + merge \`origin/cover-types-2\` = 1234/1234（aliases 两处并集保留，merge 无冲突）；
本 chunk 后 types 127→185（全量 1292）。

### 7.1 条件类型（\`ConditionalType\`）

\`ParseType\` 变成「条件层」：先 \`ParseUnionType\` 读 checkType；遇到 \`extends\` 就继续读 extendsType、\`?\`、trueType、\`:\`、falseType。
children 顺序 = [checkType, extendsType, trueType, falseType]；四个关键字都不是节点。
trueType / falseType 都递归调 \`ParseType\`，所以 falseType 天然右结合（\`D extends E ? F : G\`）。
条件类型可以出现在任何 \`ParseType\` 的调用点（类型实参、tuple、返回类型、括号里）。

### 7.2 infer / TypeParameter

\`ParseInferType\`：children 只有一个 \`TypeParameter\`（\`infer\` 不进 AST）；\`TypeParameter\` 的 children 是名字 Identifier。
实测 \`(infer U)\` 是 \`InferType[20,27) → TypeParameter[25,27) → Identifier[25,27)\`。

### 7.3 类型算子 / 类型查询（\`TypeOperator\` / \`TypeQuery\`）

- \`keyof\` / \`readonly\` / \`unique\` → \`TypeOperator\`，children 只有操作数（算子关键字不进 AST）；
- \`typeof a\` / \`typeof a.b\` → \`TypeQuery\`，children 只有一个实体名（Identifier / 限定名，\`ParseEntityName\`）；
- \`keyof typeof a\` 自然组合（TypeOperator 的操作数走 \`ParsePostfixType\`，会再落到 TypeQuery）。

### 7.4 索引访问类型（\`IndexedAccessType\`）

\`ParsePostfixType\` 的后缀方括号分两种：**空** \`[ ]\` 是数组类型（既有），**非空** \`[B]\` 是索引访问（新增，children = [对象类型, 索引类型]，索引在括号内按 \`ParseType\` 读）。
左结合可叠加 \`A[B][C]\`。

### 7.5 构造类型 / rest 参数

- \`new (参数) => R\` → \`ConstructorType\`：\`new\` 与 \`=>\` 不进 AST，children = 参数们 + 返回类型（\`new () => A\` 没有参数孩子）；
  \`abstract new\` **暂缓**：TS 侧会多一个 \`FirstContextualKeyword\` 修饰节点，需要单独的别名与形状。
- rest 参数 \`(...a: A[])\`：\`Parameter\` 的 children 顺序补上 \`DotDotDotToken\`（\`...\` 是 \`Symbol\`，进 AST），
  顺序 = DotDotDotToken、Identifier、可选 QuestionToken、类型；\`ParameterShape\` 新增 \`RestToken\` 字段。

### 7.6 嵌套泛型实参 \`A<B<C>>\`（\`>>\` 拆分）

基本 token 把连续闭合尖括号收成一个 \`Symbol\`（\`>>\` / \`>>>\`）。\`TypeBuilder.Load\` 把这种单元按字符拆成多个只含一个 \`>\` 的虚拟 \`Symbol\`：
用 \`Document.At(start.Index + k)\` 取每个字符的 \`Source\`，各自 \`AppendAndSignOut\` + \`SignIn\`，区间各占一个字符。
这样 \`A<B<C>>\` 的内层 \`TypeReference\` 结束在第一个 \`>\`、外层结束在第二个，与 TS 完全对齐。

### 7.7 仍然暂缓（\`types.ts\` 末尾 \`//\` 目标）

mapped type、template literal type、type predicate、import type、\`abstract new\`、解构 / 默认值参数、
泛型参数声明与 export / declare 修饰词。

## 8. chunk 4：mapped / template literal / predicate / import type / abstract new

起点：`origin/integration` + merge `origin/cover-types-3`（实测基线 1397/1397，types 185）。

### 8.1 mapped type（`MappedType`）

花括号节点直接是 `MappedType`（不是 `TypeLiteral`）：`ParseTypeLiteral` 先用 `HasMappedMember` 判断
「第一个代码单元是 `[` 且里面第二个代码单元是 `in`」。children 顺序与 TS 一致：只读修饰 token、
`TypeParameter`（children = Identifier + 约束）、可选标记 token、可选 `as` 名字类型、值类型。

实测口径：`-readonly` / `+readonly` 在 TS 里只留一个 `MinusToken` / `PlusToken` 子节点（readonly 关键字不进 AST），
`-?` / `+?` 同理；连写 `]?:` 里 `?:` 是一个 `Symbol`，可选标记 token 只覆盖 `?` 一个字符（复用 `ParseOptionalMark`）。

### 8.2 模板字面量类型（`TemplateLiteralType`）

复用 `String` 的模板 token 层（`IsTemplateToken` 与 `ExpressionBuilder` 同口径）：无插值 → `LiteralType → NoSubstitutionTemplateLiteral`；
有插值 → `TemplateLiteralType` = `TemplateHead` + 若干 `TemplateLiteralTypeSpan`（插值里按 `ParseType` 读 + `TemplateMiddle` / `TemplateTail`）。
区间口径与表达式模板一致。

### 8.3 类型谓词（`TypePredicate`）

`(x: A) => x is B` / `asserts x is B`：函数类型返回类型由 `ParseReturnType` 分流；children = 可选 `AssertsKeyword`、
Identifier、类型；`is` 不进 AST。TS 反查名是别名 `FirstTypeNode`，harness 两文件加 `["FirstTypeNode","TypePredicate"]`。

### 8.4 abstract new（ConstructorType 修饰）

`abstract new () => A`：`abstract` 进 children 成为 `AbstractKeyword`；TS 反查名是别名 `FirstContextualKeyword`，
harness 两文件加 `["FirstContextualKeyword","AbstractKeyword"]`。

### 8.5 import type（`ImportType`）

`import("m").A`：children = 模块字符串（`LiteralType → StringLiteral`）、限定名、可选泛型实参；
`import` / `(` / `)` / `.` 不进 AST。TS 反查名是别名 `LastTypeNode`，harness 两文件加 `["LastTypeNode","ImportType"]`。

## 9. chunk 5：泛型类型别名（type parameter 声明）

起点：merge `origin/cover-types-4` 后实测 **1611/1611**（= integration 1571 + types 40）；
本 chunk 后见报告实测。

### 9.1 type parameter 表（`TypeBuilder.ParseTypeParameterList`）

`TypeAliasDeclarationShape.FromUnits` 在名字后遇到 `<` 时先按 `<` / `>` 深度找类型参数表的闭合
（`>>` / `>>>` 是一个 `Symbol`，`FindTypeParameterClose` 按 2 / 3 个闭合算），再把 `<…>` 那一段交给
`TypeBuilder.Load` + `ParseTypeParameterList`（`>>` 在那里已被拆成两个单字符 `>`，嵌套泛型约束的闭合逐个消费）。

### 9.2 TypeParameter children / 区间

children 顺序与 TS 一致：variance / const 关键字（`InKeyword` / `OutKeyword` / `ConstKeyword`）→ `Identifier`
→ 可选约束类型（`extends` 之后）→ 可选默认类型（`=` 之后）。`extends` / `=` 不进 AST。
实测 `type T<U>` 是 `TypeParameter[7,8)`（`Pos` 从 `<` 之后算）；`type T<U extends A = B>` 是 `[7,22)` 三个孩子；
`type T<in out U>` 是 `[7,15) → [InKeyword, OutKeyword, Identifier]`。
`TypeParameterShape` 新增 `DefaultType` / `VarianceTokens` 字段。

### 9.3 暂缓

`export type …` / `declare type …`（与 export/declare 声明候选抢同一格，需要先让根候选放行修饰词），
class / interface / function 的泛型参数（declarations chunk），语义层的默认值约束检查。

## sweep 3（measurement-only）

| 形态 | 结果 | 说明 |
| --- | --- | --- |
| `type T = (x: any) => x is A;` | 绿 | 函数类型位置的谓词 |
| `type T = (x: any) => asserts x is A;` | 绿 | asserts + is |
| `function assertA(x: any): asserts x is A {}` | 绿 | 函数声明 asserts + is |
| `class C { m(): this {...} }` / `interface I { m(): this; }` / `type T = { m(): this }` | 绿 | this 类型 |
| `type T = this;` / `interface I { readonly x: this; }` | 绿 | this 类型独立/属性位置 |
| `const s: unique symbol = Symbol();` | 绿 | statement，已放进 expression.ts |
| `type T = unique symbol;` | 绿 | 类型位置（语义由 ts 检查，语法层可解析） |
| `type U = import("m").T;` | 绿（原有） | import 类型 |
| `type T = new () => A;` / `abstract new () => A` | 绿 | 函数类型位置的构造签名 |
| `type T = keyof keyof T;` | 绿 | 类型运算符链 |
| `type T = readonly (A | B)[];` / `(A | B)[]` / `(() => A)[]` | 绿 | readonly/括号/函数数组 |
| trivia（运算符后注释、谓词前注释、成员名后注释） | 绿 | 逐条测 |

暂缓（原因）：

- `function isA(x: any): x is A { … }`：函数声明侧返回类型的 `x is A` 谓词路径未接（函数类型位置已绿）。
- `function assertB(x: any): asserts x {}`：无 is 的 asserts 谓词（TypePredicate 缺 is 分支）。
- `declare const t: unique symbol;`：变量声明不接受 declare 修饰。
- `type T = typeof import("m");`：ParseTypeQuery 只认实体名，`import(...)` 形式未接。
- `type T = { new (): A };`：类型字面量成员里的 ConstructSignature 未接（现被解析成 MethodSignature，`new` 当方法名）。

## typeof import（cover-type-query-import-1）

`type T = typeof import("m")`：TS 的节点就是 `ImportType`（`typeof` 只是 flag），没有再包 `TypeQuery`；children = `LiteralType`（模块字符串）＋可选限定名（`.a` / `.default` 都是 `Identifier`）。实现：`TypeBuilder.ParseTypeQuery` 在 `typeof` 之后见到 `import` 就直接建 `ImportTypeShape` 返回。

已绿：`typeof import("m")`、`typeof import("m").a`、`typeof import("m").default`、`keyof typeof import("m")`、`typeof import("m")[K]`，以及注释 trivia；回归 `typeof a`、`typeof a.b.c`、`import("m").T` 不变。

暂缓（原因）：`typeof import("m", { with: { type: "json" } })` —— 合法，但 ImportType 多一个 `AssertClause` 孩子，需扩 import-type-shape（不在本 chunk 写范围）。

## import 类型 attributes（cover-import-type-attrs-1）

`ImportType` 的 children 顺序 = 模块字符串（`LiteralType`）→ 可选 `ImportAttributes`（TS 反查名 `AssertClause`）→ 限定名 → 可选泛型实参。
`with` / `assert` 关键字与括号不进 AST；`ImportAttributes` 的 children 是若干 `ImportAttribute`（反查名 `AssertEntry`，key + 字符串值）。
实现：`ImportTypeShape` 增加 `AssertClause` 字段；`TypeBuilder.ParseImportTypeAttributes()` 在模块字符串之后解析 `with` / `assert`
（两种写法在 AST 上是同一个 kind）；`ParseImportType` 与 `typeof import` 分支共用它。

已绿：`typeof import("m", { with: { type: "json" } })`、`import("m", { with: { type: "json" } }).X`、带泛型实参、
legacy `assert` 写法、字符串键（`{ "type": "json" }`），以及 4 条注释 trivia；回归 `import("m").X`、`typeof import("m")` 不变。

## sweep 4（measurement-first）

| 形态 | 结果 | 说明 |
| --- | --- | --- |
| `type T = <const U>(x: U) => U;` | 红→绿 | 泛型函数类型 + const 类型参数：type-builder 新增 ParseGenericFunctionType（`<` 起头，TypeParameter→Parameter→返回类型） |
| `type T = <U>(x: U) => U;` / `<U extends A>` | 红→绿 | 同一分支顺带覆盖普通泛型约束 |
| `const f = <const T>(x: T) => x;` | 原已绿 | 箭头函数侧已支持 const 类型参数 |
| `function g<const T>(x: T) {}` | 原已绿 | 函数声明侧已支持 |
| `a satisfies T satisfies U` / `a satisfies T as U` / `(a satisfies T) satisfies U` | 原已绿 | expression 家族已有 |
| `a as T as U` / `a as unknown as T` | 原已绿 | 同上 |
| `type T = this["x"]` / `this extends A ? B : C` / `this & A` | 原已绿 | this 类型在索引访问/条件/交叉位置 |
| trivia（`<const /* c */ U>`、`this /* c */ ["x"]`、`satisfies /* c */ T`、`as /* c */ T`） | 绿 | 逐条测 |

暂缓（原因）：instantiation expressions 无调用形 `const g = f<string>;`、`const h = new C<number>;`、`const k = a.b<T>;`
—— 当前 expression-builder 在类型实参后要求 `(`（调用）或运算符，语句结束会报「表达式意外结束」；修它要改 expressions 家族，
本 chunk 写范围只有 type-builder。带调用的 `f<string>(1)` 原已绿。

## nested type args（cover-nested-typeargs-1）

`>>` / `>>>` 在基本 token 层是一个组合 `Symbol`；`TypeBuilder.Load` 早已按字符把它拆成多个 `>` 虚拟单元，
所以类型位置的嵌套实参（`A<B<C>>`、`A<B<C<D>>>`、`Map<string, Array<number>>`、`A<B<C>, D<E>>`、
条件类型 extendee、heritage、返回类型）本来就绿；本 chunk 只补测量。

**红→绿**：`function f<T extends A<B>>()` —— `FunctionDeclarationShape.FromUnits` 用 `angleBuilder.At`（虚拟单元数）
直接加到原始 code 下标上，`>>` 拆分会多出单元导致越界、报「缺少参数表」。修法：按原 `code` 逐格还原宽度
（`>>` 计 2、`>>>` 计 3）再把 `paramIndex` 映射回原始下标；class/interface 的泛型头不受影响（本来绿）。

已绿清单：`class/interface C<T extends A<B>>`、`class C<T = A<B>>`、`function f<T extends A<B>>()`、
`A<B<C>>` / `A<B<C<D>>>` / `Map<string, Array<number>>` / `A<B<C>, D<E>>`、`class C extends A<B<C>>`、
`interface I extends A<B<C>>`、`function f(): A<B<C>>`、方法返回 `A<B<C>>`、条件 extendee，以及注释 trivia。

## sweep 5（measurement-first）

| 形态 | 结果 | 说明 |
| --- | --- | --- |
| `type T = keyof A["b"];` | 绿 | TypeOperator 操作数可以是 IndexedAccess |
| `type T = A["b"]["c"];` / `A[B["c"]]` / `(A | B)["x"]` | 绿 | 索引访问链/复合操作数 |
| `` `${A}${B}` `` / `` `${A}-${B}-${C}` `` / `` `${number}` `` / `` `${string & K}` `` | 绿 | 相邻占位（空 TemplateMiddle）/关键字/交叉类型插值 |
| `U extends A<infer R> ? R : never` / `Generator<infer R, infer S>` | 绿 | infer 在泛型实参与多参数位 |
| `type T = () => infer R;` | 绿 | 返回位 infer（语法层可解析） |
| 嵌套条件 infer / 递归映射 `F<T>` | 绿 | 条件套条件、`{ [K in keyof T]: F<T[K]> }` |
| `typeof a["b"]` / `(typeof a)["b"]` | 绿 | TypeQuery 后接索引访问 |
| trivia（模板插值内注释、`keyof /* c */`） | 绿 | 逐条测 |

## this 参数（cover-this-param-1，measurement）

oracle：TS 的 this 参数在 AST 里是普通 `Parameter`，名字是 **`Identifier` 且 text 为 `"this"`**（不是 ThisKeyword），
children = Identifier("this") + 类型；函数声明 / 方法 / 接口方法 / 类型字面量方法 / 函数类型 / 构造类型的 `(`…`)` 参数表都走同一口径。

已绿（无需改源）：`function f(this: A, x: B)`、`function f(this: void)`、`function f(this: A)`、
`class C { m(this: A, x: B) {} }`、`interface I { m(this: A): void; }`、`type T = { m(this: A): void }`、
`type F = (this: A, x: B) => C`、`type F = new (this: A) => B`、`type F = (this: void) => A`，
以及 trivia（`this /* c */ : A`）与 rest 回归。

非法（oracle，不写用例）：`function f(x: B, this: A) {}` —— this 参数必须是第一个参数。

## type members sweep（cover-type-members-1）

红→绿（TypeBuilder.ParseTypeMember 扩展，type literal 与 interface 成员共用）：

- get/set 访问器：`{ get x(): A; set x(v: A) }`、`interface I { get x(): A }`、`interface I { set x(v: A) }` —— 新增 GetAccessor / SetAccessor 分支
  （children = Identifier + [Parameter] + [返回类型]）；
- 可选方法 `m?(): void`：`?` 紧跟参数表/泛型参数表时作为 MethodSignature 的 QuestionToken child；
- 泛型方法 `m<T>(x: T): T`：名字后先解析 TypeParameterList，children 顺序 = Identifier → TypeParameter… → Parameter… → 返回类型。

原本已绿（只补测量）：call signature（`{ (): void }`、`{ (a: A): B }`）、construct signature（`{ new (): C }`、
`{ new <U>(x: U): U }`、interface 内 `new`）、索引签名（string / readonly number / symbol）、方法重载、
`readonly a: A; b?: B`、以及注释 trivia。

## type params full（cover-typeparams-full-1）

红→绿（两处根因都在「下标/体扫描」，不是 TypeParameter 形状）：

1. `class C<T = A<B<C>>> {}` / `class C<T = { a: A }> {}`：
   - class/interface 的 `FromUnits` 用 `typeParameterBuilder.At`（`>>` 拆分后的虚拟单元数）直接加原始下标 → 越界；
     改为按原 code 还原宽度（`>>` 计 2、`>>>` 计 3）再映射回原始下标（同 function-declaration-shape 的修法）。
   - class/interface 的 possible shape 在 Stage 3 把**第一个 `{`** 当类体，`{ a: A }` 类型字面量默认值会被误认；
     新增 `AngleDepth`：`<` 加一、`>` 减一，只有深度 0 的 `{` 才算类/接口体。
2. TypeParameter children 顺序（variance → Identifier → 约束 → 默认值）本来已对；`in`/`out`/`const`、
   `keyof`/限定名/函数类型约束、复杂默认（嵌套泛型 / 类型字面量）、多形参引用约束、注释 trivia 全部只补测量。

已绿清单：class/interface/function/arrow/type-alias 的 `<T extends A = B, U = C>`、`class C<in T>`、`class C<out T>`、
`class C<in out T>`、`function f<const T>`、`T extends keyof X`、`T extends a.B<C>`、`T extends (a: A) => B`、
`T = A<B<C>>>`、`T = { a: A }`、`T extends A, U extends T`，以及注释 trivia。

## sweep 6（measurement-first）

| 形态 | 结果 | 说明 |
| --- | --- | --- |
| `type T = import("m").A<B>;` / `const x: import("m").A = a;` | 绿 | import 类型（带泛型实参 / 变量标注位置） |
| `declare const s: unique symbol;` | 绿 | declare 变量声明（earlier chunk 已支持） |
| `interface I { [s]: A }` | **红→绿** | 计算属性名成员：TypeBuilder.ParseTypeMember 新增 ComputedPropertyName 分支（children = ComputedPropertyName → Identifier，再接 `?` / `:` 类型或参数表） |
| `interface I { [s]?: A }` / `[s](): A` / `readonly [s]: A` | 绿 | 同一分支的可选/方法/只读变体 |
| `keyof typeof a` / `keyof typeof a.b` / `typeof a[0]` | 绿 | TypeOperator/TypeQuery 链，`[0]` 索引访问落在 TypeQuery 之后 |
| `abstract new () => A` / `new () => A` / `(() => void) \| (new () => A)` | 绿 | 构造类型边界（含括号联合） |
| `` `${A}` extends `${infer U}` ? U : never `` | 绿 | 模板字面量 + infer |
| `const a = { x: 1 } satisfies A;` / `f({ x: 1 } satisfies A);` | 绿 | satisfies 回归 |
| trivia（`typeof /* c */ import(...)`、`keyof /* c */ typeof a`） | 绿 | 逐条测 |

## tuple edges（cover-tuples-1）

红→绿：可选命名元组成员 `[a?: A]`、`[first: A, second?: B]` —— 基本 token 把 `?` 与 `:` 收成一个组合 `?:` Symbol，
原实现只认分开的 `?` + `:`。修法：`ParseTupleType` 的命名成员判定加 `?:`；问号统一走 `ParseOptionalMark`（QuestionToken 只覆盖 `?`，
冒号算已消费），`?:` 时跳过冒号检查。

已绿清单（measurement）：`[]`、`[A]`、`[A, B]`、`[A?]`、`[A?, B?]`、`[A, B?]`、`[...A[]]`、`[A, ...B[]]`、
`[first: A, second: B]`、`[first: A, ...rest: B[]]`、`readonly [A, B]`、`readonly []`；位置：变量标注 / 函数返回 / 属性 / 嵌套 `[[A], [B]]`；
`A | B | C`、`A & B & C`、`(A | B) & C`、`(A)`；`keyof any`、`keyof unknown`、`unknown[]`、`never[]`；注释 trivia。
## 分支合并补记（docs 补全，数据由 git 推导）
> 用例行增量取 `git diff <merge>^1 <merge> -- typescript/cases/*.ts` 的 numstat（仅 .ts）；
> 实现文件取 `git diff --name-only <merge>^1 <merge> -- typescript/tokens`；tip = `git rev-parse <merge>^2`。
> 合并提交未记录 deferred，详见对应分支提交与报告。
- `cover-types-sweep-6` @ `369f637a` — (computed property names + types sweep 6)；cases +16/-0（types）；impl: type-builder
- `cover-types-sweep-5` @ `b579fd6e` — (types measurement sweep 5)；cases +20/-0（types）；impl: 
- `cover-types-sweep-4` @ `fac3583e` — (generic function types + measurement)；cases +30/-2（expression,types）；impl: type-builder
- `cover-constructor-types-1` @ `66a7f5f5` — (generic constructor types)；cases +30/-1（types）；impl: type-builder
- `cover-construct-sig-1` @ `55520db3` — (construct signatures + generic heritage calls)；cases +34/-1（declarations,types）；impl: heritage-clause-shape,construct-signature-shape,type-builder
- `cover-type-predicates-1` @ `9a1b519f` — (x is A / asserts x return types)；cases +31/-1（declarations）；impl: function-declaration-shape,type-builder
- `cover-types-sweep-2` @ `2860d332` — (types/expression measurement sweep 2)；cases +35/-1（expression,types）；impl: 
- `cover-tuple-rest-1` @ `1e12951b` — (tuple rest/optional/labeled + infer)；cases +20/-2（types）；impl: type-builder
- `cover-types-sweep-1` @ `df06c913` — (types +29, expression +10 measurement)；cases +63/-0（expression,types）；impl: 
- `cover-types-5` @ `35819dd7` — (generic type parameters + variance)；cases +27/-7（types）；impl: type-alias-declaration-shape,type-builder,type-parameter-shape
- `cover-type-assert-1` @ `ef5b1092` — (type assertions)；cases +45/-0（type-assertions）；impl: expression-builder,expression-statement-possible-shape