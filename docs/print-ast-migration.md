
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

### 第 185 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `New` | `tokens/new/new.xl.md` |
| `Foreach` | `tokens/foreach/foreach.xl.md` |

中央 `switch` 的 `case` 从 37 降到 **35**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了三个出口：`ParenthesizedOf`（`new (getCtor())()` 那种括号被调用者）、
`LetFrom`（`for (const x of xs)` 的声明段）、以及 `Kids` 的**两种入参归一**——
`PrintAst` 里手上常常是**原始 Map**（`nameUnits.find(...)` 那种），
而 `projectableKids` 只吃视图；这一处踩过一次（`v.segments is not iterable`），已写进注释。

### 剩余 33 个 `case` 的分类（第 186 轮盘点）

按方案里的判据分两类：**能搬的**（整块只有一个宿主 token）与**必须留在共享层的**
（横切：任何 token 都可能进它的参数，或者它是投影的入口 / 地基）。

**能搬的（15 个，逐块搬）**

| `case` | 目标文件 |
| --- | --- |
| `ObjectLiteral` | `tokens/json/object-literal.xl.md` |
| `MappedType` | `tokens/type-literal/mapped-type.xl.md` |
| `TypeParameter` | `tokens/type-parameter.xl.md` |
| `ConditionalType` | `tokens/conditional-type.xl.md` |
| `TernaryOperator` | `tokens/ternary-operator.xl.md` |
| `FunctionType` | `tokens/function-type.xl.md` |
| `ExpressionWithTypeArguments` | `tokens/heritage-clause.xl.md` |
| `NamedTupleMember` | `tokens/tuple-member.xl.md` |
| `IndexSignature` | `tokens/index-signature.xl.md` |
| `For` | `tokens/for/for.xl.md` |
| `ImportType` | `tokens/import-type.xl.md` |
| `TypeAssign` | `tokens/type-assign.xl.md` |
| `Try` | `tokens/try/try.xl.md` |
| `Namespace` | `tokens/namespace/namespace.xl.md` |
| `Switch` | `tokens/switch/switch.xl.md` / `IfSet` → `tokens/if/if-set.xl.md` |

**必须留在共享层的（18 个）**

| `case` | 为什么 |
| --- | --- |
| `Root` / `Statement` | 投影的**入口与语句分派**，不是某个 token 的活 |
| `Let` | 声明列表在语句 / `for` / `foreach` / 形参四处都要用（`projectLetFrom`） |
| `BinaryOperator` / `LogicalOperator` | **表达式重写器**（`foldBinaryFrom`）：任何 token 都可能进它 |
| `UnaryOperator` / `PropertyAccess` | 同上（`projectExpression` 的入口） |
| `Method` | 调用重写器（`projectCall`）：被调用者可能是任何表达式 |
| `TypeDefine` | 类型位的**包装提层**，被所有类型宿主共用 |
| `Parameter` / `LamdaParameter` | `projectParameter` 同时服务箭头、函数、方法、构造器、`catch` |
| `Signature` | `CallSignature` / `ConstructSignature` / `MethodSignature` 三家共用 |
| `Field` | 成员位共用（类体 / 接口体 / 类型字面量） |
| `Lamda` | 箭头函数的结束判定要回看上下文 |
| `Import` | 模块子句（默认名 / 命名空间 / 具名 / `type` 标志）四处共用 |
| `IfSet` | `if` / `else if` / `else` 与 `while` 的条件段共用一份实现 |
| `TypeAssign` / `Namespace` | 重名较多、且被 `export` / `declare` 前缀支直接调用（可以搬，但收益低） |

> 结论与第 134 轮的评估一致：**「移除 `ts-ast.xl.md`」= 移除中央 `switch` + 给共享实现换名字**，
> 而不是把每一行都挪走。搬完上面那 15 块之后，剩下的共享实现会留在
> `typescript/print-ast-common.xl.md`（由 `ts-ast.xl.md` 改名而来），
> 判据仍然是**全量对拍四方向为 0**。

### 第 187 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `NamedTupleMember` | `tokens/tuple-member.xl.md` |
| `ExpressionWithTypeArguments` | `tokens/heritage-clause.xl.md` |
| `IndexSignature` | `tokens/index-signature.xl.md` |

中央 `switch` 的 `case` 从 33 降到 **30**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了三个出口：`TypeDefineOf`（类型位包装提层）、`DottedExpression`（点号名折成
`QualifiedName`）、`TypeArguments`（实参段）。

**踩到的坑（写进这里，后面每块都要核）**：`IndexSignature` 那一块我按 TS 的枚举名写成了
`ctx.Node("IndexSignatureDeclaration", ...)`，而这一族一直用的是**短名** `"IndexSignature"`——
一改就让 `lib.es5.d.ts` 出「缺 19 + 多 19」。搬迁时**kind 字面量必须逐字照抄原实现**，
不能顺手改成 TS 的枚举名（本工程多处用短名：`DoStatement` / `IndexSignature` / `NonNullExpression`…）。

### 第 188 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `ConditionalType` | `tokens/conditional-type.xl.md` |
| `TernaryOperator` | `tokens/ternary-operator/ternary-operator.xl.md` |
| `FunctionType` | `tokens/function-type.xl.md` |

中央 `switch` 的 `case` 从 30 降到 **27**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了五个出口：`ConditionalNode`、`Segment`、`PunctBetween`、`UnwrapNodes`、`TypeOf`。

**又踩到一个（同样是「搬完才发现还有别的调用点」）**：`projectFunctionType` 除了那个 `case`，
还被 `projectTypeExpression` 里「类型参数段在函数类型**外面**」那一支直调
（`[GenericType(类型参数), FunctionType(…)]`）。搬完之后那里直接 `ReferenceError`。
修法不是把实现搬回去，而是**改成通用分派** `projectNode(list[1], ctx)`——
`projectNode` 会先问 `__token.PrintAst`，输入与原来那次直调完全相同、节点逐字节一样
（`@types/node/async_hooks.d.ts` 那种「泛型函数类型」实测一致）。

> 这一条值得记进搬迁手册：**搬之前先 grep 这个函数名**，除了 `case` 之外常常还有内部调用点；
> 有的话优先改成 `projectNode` / `ctx.Project` 的通用分派，而不是把实现留在原地。

### 第 189 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `Switch` | `tokens/switch/switch.xl.md` |
| `For` | `tokens/for/for.xl.md` |
| `Try` | `tokens/try/try.xl.md` |

中央 `switch` 的 `case` 从 27 降到 **24**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了出口：`BlockOfBody` / `SwitchClause` / `AllKids` / `BindingPattern`。

**又一次踩到「视图 vs 原始 Map」**：`ctx.AllKids(catchDefine)` 里 `catchDefine` 是**原始 Map**，
而 `allKids` 只吃**视图**——`v.segments is not iterable`。`Kids` 早先已经做过归一，
`AllKids` 忘了。**约定**：凡是从 `ctx` 出去的「吃一棵（子）树」的出口，
一律写成 `node instanceof Map ? view(node) : node` 再转调。

### 第 190 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `ImportType` | `tokens/import-type.xl.md` |
| `ObjectLiteral` | `tokens/json/object-literal.xl.md` |

中央 `switch` 的 `case` 从 24 降到 **22**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了出口：`ComputedNameExpression` / `MemberInObject` / `NumericLiteral` /
`IsIndexBracket`。

**同一个坑第三次**：`ctx.StringText(stringUnit)` 传的是**原始 Map**，而 `stringText` 只吃视图——
`Cannot read properties of undefined (reading 'get')`。已把 `StringText` 也归一。
至此 `Kids` / `AllKids` / `StringText` 三个都已归一，**剩下的出口凡是「吃树」的都要照办**：
`Text` / `Template` / `TextOf` 已经天然只吃一种（视图 / Map），无需处理。

### 还差什么

可搬的只剩 **3 块**：`MappedType`（85 行，依赖 `unwrapNodes` / `conditionalNode`，都已出口）、
`TypeParameter`（最大的一块，8.2k，依赖 `isTypeParameterModifier` / `splitTopLevel` / `typeOf`）、
`Namespace`（依赖 `structuralProps` / `memberNameOf` / `synthName`）。

`TypeAssign` 与其余 18 个一样**留在共享层**：它的投影要接一个**外层起点**（`export type T = string`
的 `pos` 从 `export` 起，由 `projectStatement` 递 `baseStart` 进来），`PrintAst(ctx, v)` 拿不到那个参数。

### 第 191 轮：搬迁进度

| 块 | 落到哪 |
| --- | --- |
| `Namespace` | `tokens/namespace/namespace.xl.md` |
| `MappedType` | `tokens/type-literal/mapped-type.xl.md` |

中央 `switch` 的 `case` 从 22 降到 **20**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了出口 `Structural`（`structuralProps` 的转发）。

**踩到的坑（值得单独记）**：`namespace.xl.md` **import 了本工程的 `String` 类**（字符串 token），
它把全局的 `String` 遮蔽掉了——从 `ts-ast` 搬过去的 `String(v.attrs.get("namespace") ?? "")`
一到这个模块里就变成「用 `new` 调一个 token 类」，直接抛
`Class constructor String cannot be invoked without 'new'`。改成
`const raw = ....; const name = typeof raw === "string" ? raw : ""` 即可。

> 搬迁手册补一条：**搬进某个 token 文件后，先看那个文件的 import**——
> 本工程里有 `String` / `Number` 这类**与全局同名**的 token 类，
> 从 `ts-ast`（没被遮蔽）搬过去的裸全局调用会静默换语义。

### 还差什么

可搬的只剩 **1 块**：`TypeParameter`（8.2k，依赖 `isTypeParameterModifier` / `splitTopLevel` /
`typeOf` / `flattenInner` 等，都要经 `ctx` 出去）。搬完它就只剩 19 个「必须留在共享层」的
`case`（`Root` / `Statement` / `Let` / `BinaryOperator` / `LogicalOperator` / `UnaryOperator` /
`Method` / `PropertyAccess` / `TypeDefine` / `TypeAssign` / `Parameter` / `LamdaParameter` /
`Lamda` / `Import` / `IfSet` / `Signature` / `Field`），届时进入收尾：删 `switch`、
把共享实现改名 `print-ast-common.xl.md`。

### 第 192 轮：把「横切」也搬走——关键手法是**把直调点改成通用分派**

| 块 | 落到哪 | 说明 |
| --- | --- | --- |
| `Root` | `tokens/root.xl.md` | 一行：`ctx.Node("SourceFile", { statements: ctx.ProjectEach(...) })` |
| `PropertyAccess` | `tokens/property-access.xl.md` | 一行：整段交给 `ctx.Expression`（折链那一支） |
| `TypeDefine` | `tokens/type-define.xl.md` | **实现整块搬过去**，见下 |

中央 `switch` 的 `case` 从 20 降到 **16**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

**这一轮最重要的结论**：上一轮把 `TypeDefine` 判成「必须留共享层」是因为它还有**内部直调点**
（成员 / 形参 / 字段的 `type` 段都直接 `projectTypeDefine(...)`）。但那些直调点其实都握着
**那个单元的 Map**——把它们改成 `ctx.Project(那个单元)`（通用分派）之后，实现就可以整块搬进
token：`projectNode` 会先问 `__token.PrintAst` ✓，输入相同、结果逐字节一样，而且**全工程只剩一份实现**。

于是「横切」不再等于「必须留共享层」，判据变成：

> **留共享层**＝这个函数被共享层自己调用、且拿不到「单元」这个入口（例如
> `projectEach(list, ctx, parentKind)` 收到的是一串**已经取出来的**单元数组、
> `projectStatement(v, ctx, kind)` 还要接外层递进来的 `baseStart`）。
> **能搬**＝所有调用点都能改写成「把某个单元交给 `projectNode`」。

按这个判据重看剩下 16 个：`Let` / `TypeAssign` / `Lamda` / `Field` / `Parameter` / `Signature` /
`IfSet` / `Import` / `Method` / `BinaryOperator` / `LogicalOperator` / `UnaryOperator` /
`Statement` 里，多数有望照 `TypeDefine` 的办法搬走；`Statement`（语句分派 + 外层起点）与
`Let`（列表版）预计是最后留下的两个。

### 第 193 轮：搬「横切」的第一批（三个直调点为零的函数）

| 块 | 落到哪 | 引用数 |
| --- | --- | --- |
| `UnaryOperator` | `tokens/unary-operator.xl.md` | 1 处声明 + 1 处 `case`，**没有别的直调点** |
| `Signature` | `tokens/signature/signature.xl.md` | 同上 |
| `Method`（调用） | `tokens/method.xl.md` | 同上 |

中央 `switch` 的 `case` 从 16 降到 **13**；全量对拍仍是 **1407 / 1407 完全一致、四方向 0**。

**挑块的判据（实测有效）**：先数引用数——
`声明 + case + 0 处直调` ⇒ 可以整块搬，搬完把 `case` 删掉即可；
`声明 + case + n 处直调` ⇒ 要么把直调改成 `ctx.Project(那个单元)`（第 192 轮 `TypeDefine` 那样），
要么留共享层（如果直调方拿不到「单元」这个入口）。

本轮三个的引用数都是 2（声明 + `case`），所以是纯搬运。

**两个细节**：

- `Signature` 结尾那个分号**不能改用 `ctx.Node`**：共享层的 `astNode` 对可调用签名
  连**逗号**也加一格（第 134 轮的修法），而这一处原来只认 `;`。改用 `ctx.Node` 会把
  接口里用逗号分隔的签名终点多推一格——所以这里保留原来的字面量算法；
- `UnaryOperator` 里那个 `{ typeof: …, void: …, delete: … }[declaredOp]` 索引要标 `any`
  （`declaredOp` 是 `any`，TS 目标下 `TS7053`）。

### 还剩 10 个 `case`

`Statement` / `Let` / `BinaryOperator` / `LogicalOperator` / `TypeAssign` / `Parameter` /
`LamdaParameter` / `Lamda` / `Import` / `IfSet` / `Field`（共 13 条 `case`，其中
`BinaryOperator` 与 `LogicalOperator` 共用 `projectBinary`、`Parameter` 与 `LamdaParameter`
共用 `projectParameter`）。引用数分别是：`projectField` 7、`projectStatement` 8、
`projectLet` 7、`projectTypeAlias` 5、`projectBinary` 4、`projectParameter` 3、`projectLamda` 3、
`projectImport` 2、`projectIfSet` 2。

`projectImport` / `projectIfSet` 引用数与上轮那三个相同（只有声明 + `case`），下一轮先搬它们。

### 第 194 轮：`IfSet` 与 `Import`

| 块 | 落到哪 | 引用数 |
| --- | --- | --- |
| `IfSet` | `tokens/if/if-set.xl.md` | 2（声明 + `case`） |
| `Import` | `tokens/import.xl.md` | 2（声明 + `case`） |

中央 `switch` 的 `case` 从 13 降到 **11**；全量对拍回到 **1407 / 1407 完全一致、四方向 0**。

`ctx` 又补了出口：`Attr`（按属性名取值，两种入参都认）、`FirstCodeAfter` / `MatchBrace` /
`NamedImportSpecifiers`，并把 `KidsOf` 也做了「视图 / 原始 Map」归一。

**这一轮抓到一个真回归，记在这里**：`Import` 搬完之后全量对拍掉到 **1400 / 1407**
（缺 10 + 多出 10，全是 `ImportClause`）。根因只有一处：

> 原实现是 `String(v.attrs.get("typeOnly") ?? "false") === "true"`，
> 而**产物里这个属性是布尔值 `true`**，不是字符串 `"true"`。
> 我按「一定是字符串」写成 `typeof === "string" ? … : "false"`，于是 `import type { … }`
> 的 `ImportClause` 起点从 `type` 退到了 `{`。

修法：`typeOnly === true || typeOnly === "true"`（两种都认），并且不依赖 `String`
（别的 token 文件里有同名遮蔽，见第 191 轮）。

> **搬迁手册再加一条**：原实现里 `String(x ??? "false") === "true"` 这类**宽松判定**
> 是刻意的，照抄要连「取值可能是布尔」一起照抄；把它「收紧成字符串判断」会静默改语义。
> 而且这类错**只有全量对拍能抓到**（单文件抽查看不出来）。

### 还剩 9 个 `case`

`Statement`(8) / `Let`(7) / `Field`(7) / `TypeAssign`(5) / `BinaryOperator`(4) /
`LogicalOperator`(4) / `Parameter`(3) / `LamdaParameter`(3) / `Lamda`(3)。
