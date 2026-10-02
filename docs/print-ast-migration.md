
---

## 6. 「把 ts-ast.xl.md 全部落到 printAst 上」——可行性与落点（第 134 轮的评估）

**结论：可行，但「全部落到 printAst」只能做到一半，另一半必须留在共享文件里。**

先把事实摆出来（第 134 轮实测）：

| 事实 | 数 |
| --- | ---: |
| `typescript/tokens/**` 的规范文件 | 118 |
| 覆写了 `PrintAst` 的 token 文件 | 7 |
| 覆写的 `PrintAst` 方法 | 9 |
| `typescript/ts-ast.xl.md` 的行数 | 4992 |
| 其中模块级 `# const` / `# method` 条目 | 143 |

也就是说：**逐节点出口（第 77 轮）已经搭好了**，`Token.PrintAst(ctx, v)` 是基类挂点、
`projectNode` 会先问 `node.__token.PrintAst(ctx, v)`（见 `core/syntax/token.xl.md` 的
`PrintAst` 与 `ts-ast.xl.md` 的 `projectNode` 开头）。缺的只是「把中央 `switch` 的
各个 `case` 搬到对应 token 自己的文件里」。

### 能搬的（大约 100 个条目）

`projectNode` 里那个 `switch (v.type)` 的每个 `case "X":`，对应的都是**某一个 token 类**：
`case "Let"` → `Let`、`case "Foreach"` → `Foreach`、`case "ConditionalType"` → `ConditionalType`……
搬法是把 `case "X": return projectX(v, ctx);` 里的 `projectX` **整体**挪进 `X` 的 `.xl.md`，
改写成 `PrintAst(ctx, v)`，并让 `ctx` 里那组出口助手（`Node` / `Each` / `Members` /
`Project` / `Text` / `TextOf` / `StringText` / `Template` / `LeafKind` / `KeywordKind` /
`TokenKind`）承担跨模块调用。这 100 个条目是**机械搬家**，逐条搬完跑一次
`cases:tsast`，数字不许动。

### 搬不了的（大约 40 个条目，必须留在共享文件里）

它们是**横切**的，没有单一宿主 token：

| 条目 | 为什么没有宿主 |
| --- | --- |
| `projectExpression` / `foldBinaryFrom` / `chainWithOptional` / `chainOnto` | 一整棵表达式的重写器，任何 token 都可能进它 |
| `projectTypeExpression` / `typeOf` / `projectTypeArguments` / `typeMemberGroups` | 同上（类型位） |
| `structuralProps` / `allKids` / `kidsOf` / `view` / `textOf` / `textOfNode` | 树访问的地基 |
| `splitTopLevel` / `isTypeSeparator` / `isNameNode` / `nameOf` / `synthName` | 小工具 |
| `projectRoot` / `ToJsonText` | 出口的入口，不属于任何一个节点 |
| `KIND_BY_TAG` / `FIELD_BY_KIND` / `WRAPPER_FIELDS` / `BODY_FIELDS` / `TYPE_MEMBER_KINDS` … | 投影侧的**表**，被所有分支读 |

**为什么不能塞回 `core/syntax/token.xl.md`**：`core/` 是「与语言无关」的那一半，
把 `Identifier` / `Bracket` / `ConditionalType` 这些 **typescript 层**的类名写进它
会直接反转依赖方向（`core` 不能 import `typescript`）。所以这份共享实现只能待在
**typescript 层**：可以留在原地（把文件名从 `ts-ast.xl.md` 改成 `print-ast-common.xl.md`），
也可以并进 `typescript/text-common-util.xl.md`。

### 因此「移除 ts-ast.xl.md」的准确含义

- **能移除的是「中央分派表」**：`projectNode` 的 `switch` 消失，改成基类
  `Token.PrintAst` 的兜底 + 各 token 自己的覆写；
- **不能移除的是「共享实现」**：它换一个文件名继续存在（或者并入 `text-common-util`）。
  行数不会减少，只会**重新分布**——判据仍然是 `cases:tsast` 的四列数字不许动。

### 建议的顺序

1. **先把缺口做完**（现在是 971 条；这一步与「搬家」互不干扰，但先做缺口收益更直接）；
2. 再按「一个 `case` 一次提交」的粒度搬家，每次只搬一个 token，跑一次 `cases:tsast`
   对齐基线——这样任何一次搬错都能立刻定位到那一个文件；
3. 最后删掉 `projectNode` 的空壳与 `ts-ast.xl.md` 的文件名。

### 第 182 轮：搬迁进度

| 块 | 落到哪 | 备注 |
| --- | --- | --- |
| `ArrayLiteral` | `tokens/json/array-literal.xl.md` | 第 181 轮 |
| `RegexToken` | `tokens/regex-token.xl.md` | 区间按原文重新量，终点自己算 |
| `RestType` / `OptionalType` | `tokens/tuple-member.xl.md` | 一个方法拆成两处（kind 不同） |
| `Spread` | `tokens/spread.xl.md` | |
| `EnumMember` | `tokens/enum/enum-member.xl.md` | |
| `Decorator` | `tokens/decorator.xl.md` | |

`ts-ast.xl.md` 中央 `switch` 的 `case` 从 60 降到 **49**；每一块搬完都跑了一次全量对拍，
**1407 / 1407 完全一致、四方向仍为 0**。

这一轮又给 `ctx` 补了一个出口：`TypeExpression`（类型位的一整段 → 一个类型节点），
与上一轮的 `Expression` 对称。搬迁时反复遇到的两条约定（`PrintAst` 收到的是**视图**、
搬迁层不能 import `ts-ast`）已经在上一节记下。

搬迁的机械规则（照抄即可）：

| 原写法 | 搬迁后 |
| --- | --- |
| `projectableKids(v)` | `ctx.Kids(v)` |
| `projectExpression(list, ctx)` | `ctx.Expression(list)` |
| `projectTypeExpression(list, ctx)` | `ctx.TypeExpression(list)` |
| `projectNode(x, ctx[, kind])` | `ctx.Project(x[, kind])` |
| `textOfNode(x, ctx)` | `ctx.TextOf(x)` |
| `stringText(v, ctx)` | `ctx.StringText(v)` |
| `startOf / endOf` | `ctx.StartOf / ctx.EndOf` |
| `stmtEndOf(v, ctx)` | `ctx.StmtEndOf(v)` |
| `splitTopLevel(list, ctx, sep)` | `ctx.Split(list, sep)` |
| `{ kind, pos: v.start, end: stmtEndOf(v, ctx), ...props }` | `ctx.Node(kind, props, v)` |
| `INVISIBLE` / `nameOf` / `isDot` / `isSymbol` | `ctx.Invisible` / `ctx.NameOf` / `ctx.IsDot` / `ctx.IsSymbol` |

### 第 183 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `NotNull` | `tokens/not-null.xl.md` |
| `InferType` | `tokens/infer-type.xl.md` |
| `While` | `tokens/while/while.xl.md` |
| `DoWhile` | `tokens/do-while/do-while.xl.md` |

中央 `switch` 的 `case` 从 49 降到 **45**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

又给 `ctx` 补了四个出口：`ProjectEach` / `KidsOf` / `BodyBlockOf` / `MatchingBrace` /
`MatchingParen`（`while` / `do…while` 这两块要用「自己造 Block」与「按深度配对括号」两件事）。

### 第 184 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| （死代码清理）`String` / `Identifier` / `Keyword` / `SymbolToken` | 四个 `case` 早已被各自的 `PrintAst` 抢先命中，这一轮把死分支删掉 |
| `StaticBlock` | `tokens/class/static-block.xl.md` |
| `HeritageClause` | `tokens/heritage-clause.xl.md` |
| `TypeOperator` | `tokens/type-operator.xl.md` |
| `IndexedAccessType` | `tokens/type-bracket.xl.md` |

中央 `switch` 的 `case` 从 45 降到 **37**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了一个出口：`IndexBracketOf`（`A[K]` 里下标括号的左括号位置——
从节点终点往回找**与最后那个 `]` 配对**的 `[`，这样 `A["k"]["j"]` 找到的是外层那个）。
