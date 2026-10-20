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
