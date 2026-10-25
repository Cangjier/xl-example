# 候选直建（direct candidate pipeline）——目标、实现与实测

> 本文记录 `feature/all-possible` @ **`a937244d`**（R2 收口：`merge(r2-expr)` + `merge(r2-harden)` +
> `merge(r2-verify)`，扩展 harness 60 条已入主仓库）上**已经落地**的直建实现：
> 变量语句、表达式语句、以及它们共享的表达式引擎。所有口径以仓库里的 `*.xl.md` 与 `build/ts` 实测为准，
> 不是设计稿的复述；设计稿与实现不一致的地方单独记在 §13。
>
> R2 在 R1 的两类语句之上做了两件事：
> **（A）覆盖范围扩面** —— 字面量 / 模板 / BigInt / 关键字操作数、数组 / 对象、调用 / 成员 / 下标 / `new` /
> 可选链、赋值 / 复合赋值 / 条件 / 逗号 / `as` / 非空断言 / `typeof`·`void`·`delete` 全部转为直建（§1.2、§5.8）；
> **（C）硬化** —— 行终止符守卫、`DeclineReasons` 分类、H2 异常计数、跨行 ASI 的明确口径（§14）。
> 目标 case 从 10 条扩到 **60 条**（正例 41 / 非正例 19），读数见 §9。
>
> 配套阅读：`docs/statement-ast-pipeline.md`（同一事件链的旧路径版本；已覆盖构造在该文里改标为直建）。
> 设计背景：`_coord/DESIGN-all-possible.md`、`_coord/R2-CONTRACT.md`、`_coord/R2-TARGET-CASES.md`、`_coord/DECISIONS.md`。
>
> 本轮验证口径（用户明确要求）：**只跑目标 case**，不跑 `tests/gates`、全量 `ast-json`（6171）、
> `coverage` / `sweep`、`samples`。构建成功（`xl_build` 0 error + `tsc` exit 0）是前提，不算验收。
> 文中所有命令都在本文所在的 `docs-r2` 克隆（`a937244d` + 548 个 `build/ts/*.js`）上实测过。

---

## 0. 一句话版本

```
basic token Close
  └─ 只问直接父单元 → 壳 StatementShape.ComputePossibleShapes          （H1）
        ├─ DirectSession.Ingest(shell.Data)   ← 新单元逐格喂给 session
        └─ super.ComputePossibleShapes        ← 仍然只问 StatementEndPossibleShape（边界不变）

壳收口（`;` / ASI、EOF、块里的 `}` 三条触发，全部汇到 BuildFromShell）
  └─ BuildFromShell(host, endIndex, context)                        （H2）
        ├─ 有 session 且未 Decline → try { session.Finish(endIndex) }   C4：抛错则 Errors++/LastError/Trace
        │     ├─ 成功返回已闭合形状 → host.Data.splice(0, consumed.length) → return
        │     └─ 返回 null（不完整 / 异常已计数）→ 落回旧路径
        └─ 否则 / 落回 → new StatementBuilder + 旧四路分派（范围外与 Decline 专用）
```

两条硬结论：

1. **建节点的时间点从「收口时整段重扫」变成「每个 token 关闭时」**；优先级靠 frame 栈 + 树旋转增量得到，
   不再由 `ExpressionBuilder.ParseBinary` 递归下降重读一遍。
2. **覆盖范围内 `new StatementBuilder` 在 H2 的 `return` 之前不会被执行**；`StatementBuilder.Load` 为 0。
   唯一的 `ExpressionBuilder.Load` 是 `DirectTokenUtil.OperatorToken` 复用运算符映射表的那一次（§8.3、A6 口径）。

---

## 1. 目标与边界

### 1.1 目标

**每个可以当场确定的构造，由候选建壳的同一刻起就由 session 直接建出 AST 形状**；收口只做「把私有形状树交回」，
不再把整段 raw 单元交给 builder 重扫。边界判定（语句从哪开始、到哪结束）仍完全由 possible 层负责，直建不参与。

### 1.2 覆盖范围（R2 收口）

下表是**当前**直建接管的构造；`case` 列是验证它的目标 case（§9 的 60 条里）。表下 §1.3 才是范围外。

| 构造 | 直建节点 | case |
| --- | --- | --- |
| `let` / `const` / `var` 变量语句 | `VariableStatementShape` → `VariableDeclarationListShape` → `VariableDeclarationShape` | R1-01/02/03 |
| 多声明 `let a=1,b=2` | list 下多个 declaration（`,` 不进 `Data`） | R1-05 |
| 无初始化 `let x` / `var z` | declaration 只有 `IdentifierShape`（ASI 收口） | R1-09 |
| 变量名 | `IdentifierShape`；解构 binding（`[]`/`{}`）→ `Decline(var.binding)` | R2-C3-01 |
| 数值字面量 / 十六进制 / BigInt | `NumericLiteralShape` / `BigIntLiteralShape` | R2-A1-pos-03（`1n`）；`0x1fn` 见 §11 扩展 |
| 字符串 / 模板（含插值） | `StringLiteralShape` / `TemplateExpressionShape`（插值用**嵌套直建引擎**，不碰 `ExpressionBuilder`） | R2-A1-pos-01/02 |
| `true` / `false` / `null` / `this` | 关键字叶子（token 不进 `Data`） | R2-A1-pos-04（`true && false`） |
| 标识符操作数 | `IdentifierShape` | R1-04/07 |
| 数组字面量（含 spread / 空槽） | `ArrayLiteralExpressionShape`（`SpreadElementShape`、零宽 `OmittedExpressionShape`） | R2-A2-pos-01/02 |
| 对象字面量（property / shorthand / computed / spread） | `ObjectLiteralExpressionShape` + 各属性节点；**方法体 / 访问器 → Decline** | R2-A2-pos-03/04/05；负例 `({m(){}})` |
| 调用 / 实参表 | `CallExpressionShape`；实参按顶层 `,` 切段逐个嵌套建；**实参 spread → Decline** | R2-A3-pos-01/02；负例 `f(...a)` |
| 成员 / 下标 / 可选链 | `PropertyAccessExpressionShape` / `ElementAccessExpressionShape`（`?.` 是 `QuestionDotToken` 子节点） | R2-A3-pos-03/04/05 |
| `new` | `NewExpressionShape`（被构造者的后缀链整体进 `new`） | R2-A3-pos-06 |
| 赋值 / 复合赋值 | `BinaryExpressionShape`，运算符节点是 `EqualsTokenShape` 等；右结合 | R2-A4-pos-01/02 |
| 条件 `?:` | `ConditionalExpressionShape`（`FrameStages`） | R2-A4-pos-03、R2-A4-pos-07 |
| 逗号 `,` | `BinaryExpressionShape`（`CommaPrecedence`，左结合） | R2-A4-pos-04（`a, b`，D3 本轮落地） |
| `as`（+ 类型子树） | `AsExpressionShape`；类型子树走 `TypeBuilder.Load + ParseType`（不经过 `ExpressionBuilder`） | R2-A4-pos-05 |
| 非空断言 `!` | `NonNullExpressionShape`（`!` 不进 `Data`，只做终点） | R2-A4-pos-06（须与 C1 守卫同时存在） |
| `typeof` / `void` / `delete` | `TypeOfExpressionShape` / `VoidExpressionShape` / `DeleteExpressionShape` | R2-A5-pos-01/02/03 |
| 一元前缀 `! ~ + - ++ --` | `PrefixUnaryExpressionShape`，`Data=[operand]`（运算符 token 不进 `Data`） | R1-07、R2-C1-02 |
| 一元后缀 `++ --` | `PostfixUnaryExpressionShape`，`Data=[operand]`；**前置行终止符 → 引擎 `Hold()`**（C1） | R2-C1-01 |
| 二元运算（`OperatorTable` 全表） | `BinaryExpressionShape`，`Data=[left, opToken, right]` | R1-01/04/06/07/08 |
| 括号 `(expr)` | `ParenthesizedExpressionShape`，`Data=[inner]`（区间含两侧括号，括号 token 不进 `Data`） | R1-06 |
| 表达式语句 | `ExpressionStatementShape`，`Data=[expr]`、`Expression=expr`（`;` 不是子节点，`end` 含 `;`） | R1-04、R2-A1-pos-01 等 |

> 泛型实参守卫：`f<T>(1)` / `a<b>(c)` / `new A<T>()` / `f<A<B>>(1)` 会被识别为泛型实参调用而
> `Decline(expr.decline)`，不会静默建成比较链；对照正例 `x<y>z` / `a<b>c` / `a<<b>(c)` 仍是直建正例（§14.5）。

### 1.3 覆盖范围外（保留旧路径）

- 正则字面量 `/a/g`、标签模板 `` tag`x` ``、箭头 / 函数 / 类表达式、对象方法体与 `get`/`set`、调用实参 spread；
- `satisfies`（`as` 做，`satisfies` 不做）、`as const`、泛型实参 / 实例化表达式（显式 Decline，见 §14.5）；
- `await` / `yield` / `class {}` / `if` / `return` 等**根本没有 session** 的语句（它们不是「Decline」而是「不进直建」，
  目标 case 记为 `safe`：断言 `built==0 && AST MATCH`，**不断言 `declined>=1`**）；
- 解构 binding、类型注解 `:`、确定赋值断言 `!`、`declare` / `using`、`@装饰器`、`const enum`；
- 跨行 ASI（`a⏎b` / `2⏎3`）——按 R2-D4 **明确保持 Decline**（§14.4）；
- 以及所有非变量 / 非表达式语句族（`if` / `for` / `while` / `do` / `switch` / `try` / `return` / `throw` /
  `break` / `continue` / label / block / `function` / `class` / `interface` / `type` / `enum` / `namespace` /
  `import` / `export`）。

覆盖范围外**不是静默 fallback**：session 显式 `Decline(reason, category)` + 计数（`DirectBuildMetrics.Declined`）+
分类（`DeclineReasons`，C3）+ `LastDeclineReason`；`Strict` 时先 `StrictViolations++` 再抛（D1）。范围外语句族内部如果出现变量 / 表达式语句，
**内层仍然直建**（例：`if (a) { let x = 1; }` 外层 `if` 走旧路径，内层 `let` 直建，实测 `built=1`）。

### 1.4 与「事后 Build」的差别

| 维度 | 旧路径（范围外 / Decline） | 直建（覆盖范围） |
| --- | --- | --- |
| 节点确定时机 | 收口时 | 每个 basic token 关闭时 |
| 语句的 raw 单元 | `builder.Load(consumed)` 整段重扫 | session 只读 `shell.Data`，增量吃新单元 |
| 表达式树 | `ExpressionBuilder.ParseBinary` 递归下降（按 `minPrecedence` 再读一遍） | frame 栈 + `ShapeInsertUtil.InsertBetween` 增量插入 / 旋转 |
| 变量声明判型 | `VariableStatementThreeLayer.TryBuild` | session 状态机直接建 |
| 收口后的转换 | `StatementShapeAst` 折形状 / `BuildStatement` | 交回的形状树**本身就是 AST**，无需再折 |
| 边界判定 | `StatementEndPossibleShape` + `StatementBoundaryUtil` | **完全一样**（直建不看边界判据） |

---

## 2. 生命周期与 hook

### 2.1 事件链

直建不新增调度器，**只搭在既有的「子单元关闭 → 父单元重算候选」事件上**：

1. `core/syntax/basic-tokens/*.xl.md` 的 `Close` 只问直接父单元（`common.xl.md` 的 `Close`：
   `parent.ComputePossibleShapes(context)`；`WrapSymbol` 空白 trivia 不问）。
2. 壳 `StatementShape` 是 `ShapeToken`，`ComputePossibleShapes` 被调用时先喂 session（**H1**），
   再走既有的 `OperatorBody.IngestAll` 与 `super.ComputePossibleShapes`。
3. 壳的 `CatalogGuide` 只有终结候选 `StatementEndPossibleShape`，所以边界判定与直建前逐字节相同。
4. 收口时（三条触发都汇到 `StatementShape.BuildFromShell`）先问 session（**H2**）；
   成功即交回，失败 / Decline 才建 builder。
5. `FinishShell` 用返回的节点顶替壳，leftover 按原序回插并重放——**与旧路径同一套**，直建不碰。

### 2.2 H3：建 session（两个建壳候选的 `BuildByIndex` 末尾）

变量语句（`typescript/tokens/statements/variable-statement-possible-shape.xl.md`，`BuildByIndex` 末尾）：

```ts
shell.DirectSession = DirectBuildRouter.Create(StatementRoute.ShellVariable, shell, context);
if (shell.DirectSession !== null) {
  shell.DirectSession.Ingest(shell.Data, context);
}
```

表达式语句（`typescript/tokens/statements/root-expression-statement-possible-shape.xl.md`，`BuildByIndex` 末尾，
**在晚建壳的 `shell.ComputePossibleShapes(context)` 之前**）：同样两行，kind 用 `StatementRoute.ShellPlainExpression`。
晚建分支随后触发的 H1 只是幂等增量，不会重复建节点。

`DirectBuildRouter.Create`（`direct-build-router.xl.md`）：

- 首次调用先 `Install()`，`DirectBuildPlugins.Install()` 是**全仓唯一注册点**；
- 未注册 kind 返回 `null`（= 该族本轮不直建）；
- 已注册则 `new (factory as any)(shell.Template, context, (shell as ShapeToken).Pos, shell)`，
  成功后 `DirectBuildMetrics.Sessions += 1`（session 自己不计数）。

两个已注册 kind（`direct-build-plugins.xl.md`，两行必须在 `Install()` 方法体内，避免 CommonJS 循环 require 拿到半初始化 exports）：

```ts
DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellPlainExpression, ExpressionStatementDirectSession);
```

`DirectSession` 是 interface（编译后无运行期值），签名见 `direct-build-session.xl.md`：
`Owner / Declined / Reason / Finished` + `Ingest / Finish / Summary`。

### 2.3 H1：唯一喂入点

`typescript/tokens/statements/statement-shape.xl.md` 的 `ComputePossibleShapes` 首行：

```ts
if (this.DirectSession !== null) {
  this.DirectSession.Ingest(this.Data, context);
}
```

约束（实现必须满足，两个 session 都满足）：

- **幂等**：session 自持游标 `Ingested`，重复 `Ingest` 只处理新单元；
- trivia 跳过；
- **只读**：不改 `units`、不改任何 raw token、不碰 `Parent` / `MountedUnit`；
- 不改 `ComputePossibleShapes` 的返回值、不建形状、不碰 `CatalogGuide`。

### 2.4 H2：唯一收口点

`StatementShape.BuildFromShell` 里，`const consumed = host.Data.slice(0, endIndex + 1);` 之后、
`const builder = new StatementBuilder(host.Template, context);` **之前**：

```ts
const direct = shell.DirectSession;
if (direct !== null && !direct.Declined) {
  let directBuilt:Token | null = null;
  try {
    directBuilt = direct.Finish(endIndex, context);
  } catch (error) {                                   // C4：H2 只在这里兜异常
    if (!direct.Declined) {                           // strict 的 Decline 抛错已计过 StrictViolations，不重复计 Errors
      DirectBuildMetrics.Errors += 1;
      DirectBuildMetrics.LastError = error instanceof Error ? error.message : String(error);
      DirectBuildMetrics.Trace("direct finish error: " + DirectBuildMetrics.LastError);
    }
    directBuilt = null;
  }
  if (directBuilt !== null) {
    host.Data.splice(0, consumed.length);
    return directBuilt;
  }
}
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, shell.Pos);
// …旧四路分派（范围外与 Decline 专用）
```

要点：

- `endIndex` 是 `shell.Data` 的**数组下标**（含 trivia 的原始下标），不是字符位；
- `Finish` 先自己补齐到 `endIndex`（`slice(0, endIndex+1)` 再 `Ingest`），因为最后一个代码单元关闭时
  不保证再触发一次 H1；
- `splice(0, consumed.length)` 与旧路径末尾同源，`FinishShell` 的壳替换 / leftover 重放照旧；
- `DirectSession !== null && Declined` 时连 `Finish` 都不调用（`Declined` 后 `Ingest`/`Finish` 本来也是空操作）；
- **直建成功时 builder 一次都不创建**。这是 D3，也是 A6 的判据来源；
- **`Finish` 抛异常时 `Errors++ / LastError / Trace` 后回落旧路径**（C4）。异常不再炸穿 `TryToClose`，
  但判据仍看计数器：`Errors` 为 1、AST 仍与 tsc 一致（旧路径接管）、下一次解析 `Reset` 后归 0。

### 2.5 三条收口触发，共用 H2

`BuildFromShell` 在仓库里只有三个调用点（`grep "BuildFromShell("`）：

| 触发 | 调用点 | 与直建的关系 |
| --- | --- | --- |
| `;` / ASI 边界 | `statement-end-possible-shape.xl.md` 的 `BuildByIndex`（终结候选 Accept 后） | 只用 H2，无需另加分支 |
| 块里的 `}` | `statement-shape.xl.md` 的 `ExitOrPre`（父单元是 `{`、当前字符是 `}`） | 同上；收口后 `FinishShell` + `Reload` 把 `}` 交回块层 |
| EOF / 壳关闭 | `statement-shape.xl.md` 的 `TryToClose`（EOF 路径自己算 `lastCode` / 族边界） | 同上 |

**所以 H2 只写一处**；session 绝不自己判边界（`endIndex` 只由调用方给）。

### 2.6 session 不参与 possible 候选机制

`DirectSession` **不是** `PossibleShape`：不进任何 `CatalogGuide`、不进 `Candidates`、不参与
`ComputeByIndex` 淘汰、不消费 `PossibleShapeCache`。它挂在**壳**上，只负责「节点怎么长」；
「条目从哪开始 / 到哪结束 / 归哪个族」仍由候选与 `StatementEndPossibleShape` 回答。

---

## 3. 变量语句 session 状态机

文件：`typescript/tokens/direct/direct-variable-session.xl.md`（类 `VariableStatementDirectSession`）。

### 3.1 状态

| 常量 | 值 | 含义 |
| --- | --- | --- |
| `ExpectHead` | 0 | 等 `let` / `const` / `var` |
| `ExpectBinding` | 1 | 等绑定名 |
| `ExpectEqualOrSep` | 2 | 等 `=` / `,` / `;` / 结束（无初始化 / 多声明） |
| `ExpectInitializer` | 3 | 初始化表达式（委托 `DirectExpressionEngine`） |
| `ExpectSep` | 4 | 等 `,` / `;` / 结束 |
| `Done` | 5 | 已完成 |

内部字段：`Ingested`（喂入游标）、`StoppedAt`（接不上的单元下标，`-1` 表示没有）、
`Keyword` / `KeywordAt`、`List`、`Declaration`、`Initializer`、`Units`、`PrevEnd`、`LastDeclarationEnd`。

### 3.2 转移表（`unit` = 非 trivia 子单元）

| 当前状态 | 输入 | 动作 | 下一状态 |
| --- | --- | --- | --- |
| Head | `Common`：`let` / `const` / `var` | 记 `Keyword`，建 `VariableDeclarationListShape` | Binding |
| Head | 其它 | `Decline("范围外变量语句头: …", "var.head")` | — |
| Binding | `Bracket`（`[` / `{`） | `Decline("解构绑定属范围外", "var.binding")` | — |
| Binding | 非 `Common` | `Decline("变量绑定不是标识符", "var.binding")` | — |
| Binding | `Common` 且是保留字 | `Decline("变量绑定是保留字: …", "var.binding")` | — |
| Binding | `Common` 合法标识符 | `IdentifierShape.FromBasicToken` + `Pos=unitPos`；建 `VariableDeclarationShape`（`Pos=name.Pos`、`SignIn(name.Start)`） | EqualOrSep |
| EqualOrSep | `Symbol` `=` | 建 `DirectExpressionEngine`，`BasePos` = `=` 的 `EndIndex` | Initializer |
| EqualOrSep | `Symbol` `,` | 无初始化收口当前 declaration； | Binding |
| EqualOrSep | `Symbol` `;` | 无初始化收口当前 declaration； | Done |
| EqualOrSep | `Symbol` `:` / `!` | `Decline("变量声明的类型注解 / 确定赋值断言属范围外", "var.type")` | — |
| EqualOrSep | 其它 | `StoppedAt = at`（可能是下一条语句） | 停 |
| Initializer | `Symbol` `;` / `,` | `engine.Finish()` → declaration.Add(expr)、`SignOut(expr.End)`、`TryToClose`；`;` → Done，`,` → Binding | — |
| Initializer | 其它 | `engine.IngestUnit(unit, unitPos)`；engine `Declined` → session `Decline("初始化表达式范围外: …", "var.init")`；engine `Held` → `StoppedAt = at` | Initializer / 停 |
| Sep | `Symbol` `;` | — | Done |
| Sep | `Symbol` `,` | — | Binding |
| Sep | 其它 | `StoppedAt = at` | 停 |

> R2 起 `Decline` 带第二个参数 `category`（闭集，见 §8.1）；上表是变量 session 的 12 个调用点按类归并后的结果。
> `Finish` 里还有 `var.stopped`，`CloseDeclarationWithInitializer` 里有 `var.coverage`（§3.5）。

### 3.3 节点构造与区间

- `VariableDeclarationShape`：`Pos = name.Pos`（**不是** `SourceRange.Start`，差一格会在 cjAst 里直接看到
  `pos:4 vs 3`）；`SignIn(name.StartIndex)`；有初始化器时 `SignOut(initializer.EndIndex)`，否则
  `SignOut(name.EndIndex)`；`TryToClose`。
- `VariableDeclarationListShape`：`Pos = BasePos`（= 建壳时的 `shell.Pos`）；`SignIn(Keyword.StartIndex)`；
  `SignOut(LastDeclarationEnd)`（**不含** `;`）；`Data = [decl…]`（逗号不是节点）。
- `VariableStatementShape`：`Pos = BasePos`；`SignIn(Keyword.StartIndex)`；
  `SignOut(Units[endIndex].SourceRange.EndIndex)`（**有 `;` 就含 `;`**；ASI 停在末代码单元）；
  `Data = [list]`；`TryToClose`。

以 `let x = 1;` 为例（源码 0 基）：statement `pos=0/end=10`、list `0/9`、declaration `3/9`、
identifier `3/5`、numeric `7/9`——与 TS 逐字段一致，也与旧路径结果逐字节相同。

### 3.4 Finish 收口流程

`Finish(endIndex, context)`（`direct-variable-session.xl.md`）：

1. `Finished` / `Declined` → 返回 null；
2. `endIndex < 0`、没有单元 → `Incomplete(...)` 计数并返回 null；
3. `StoppedAt < 0 && Ingested <= endIndex` → 用 `Units.slice(0, endIndex+1)` 补齐（幂等）；
4. `StoppedAt >= 0 && StoppedAt <= endIndex` → `Decline("语句内出现无法接续的单元 idx=…")`；
5. 还停在 `ExpectInitializer` → `CloseDeclarationWithInitializer`（`engine.Finish()` null → Decline）；
6. 还停在 `ExpectEqualOrSep` → 无初始化收口；
7. `ExpectSep` → `Done`；仍不是 `Done` → `Incomplete("语句没有收口, expect=…")`；
8. 建 list / statement，`TryToClose`，`Finished=true`，`DirectBuildMetrics.StatementsBuilt += 1`，返回 statement。

> 第 4 步的 `Decline` 分类是 `var.stopped`；第 5 / 6 步在 `CloseDeclarationWithInitializer` 里还有一道
> **覆盖校验**（`var.coverage`，见 §3.5）。

### 3.5 R2 硬化：`var.coverage` 覆盖校验（C1 的变量侧）

`CloseDeclarationWithInitializer` 在 `declaration.Add(expr)` 之前比一次「表达式终点 vs 本声明最后一个代码单元」：

```ts
// EqualAt 记住 = 的位置；boundHigh 是 , / ; 的下标，Finish 收口时是 endIndex + 1
expression.SourceRange.EndIndex !== 最后一个代码单元.EndIndex
  → this.Decline("声明终点与语句终点不一致: …", "var.coverage") → 返回 false → 旧路径
```

- 这是**安全网**：变量初始化器若把「跨行后缀」吃进来（`let x = a⏎++b` 一类），表达式终点会超过声明终点；
- 但在当前语料上**触发 0 次**（`REPORT-r2-harden §3.5`）：变量 session 在覆盖校验之前就先用 `var.stopped`
  收在「停不下来的单元」上。如实记录：它没有正例读数，只有静态审查；
- 变量侧的 `Decline` 调用点因此是 12 个，分类后 `DeclineReasons` 的键是
  `var.head` / `var.binding` / `var.type` / `var.init` / `var.stopped` / `var.coverage`（§8.1）。

---

## 4. 表达式语句 session 状态机

文件：`typescript/tokens/direct/direct-expression-session.xl.md`（类 `ExpressionStatementDirectSession`）。

它比变量 session 薄：**整个壳就是一条表达式**，逐格喂给同一个引擎。

- 状态：`Ingested`、`StoppedAt`、`Engine`、`FirstCodeAt`、`PrevEnd`、`SawSemicolon`，没有多状态枚举。
- `Ingest`：遇 trivia 跳过；见到 `;` 后置 `SawSemicolon`，**其后第一个非 trivia 单元** → `StoppedAt = at`
  （`;` 之后还有代码 = 下一条语句）；否则 `Engine.IngestUnit(unit, pos)`；
  engine `Declined` → session `Decline("表达式范围外: …")`；engine `Held` → `StoppedAt`。
- `Finish(endIndex)`：
  1. 补齐到 `endIndex`；
  2. `StoppedAt` 落在语句区间内 → Decline（分类 `expr.stopped`）；
  3. `Engine.Finish()` null → `Incomplete("表达式不完整: …")`；
  4. **覆盖校验（C1）**：表达式终点必须等于「语句最后一个代码单元」的终点（`;` 属语句不属表达式，
     期望终点退到它之前的代码单元）。不一致 → `Decline("表达式终点与语句终点不一致: …", "expr.coverage")`；
  5. 建 `ExpressionStatementShape`：`Expression=expr`、`Add(expr)`、`Pos=BasePos`、
     `SignIn(首个代码单元.StartIndex)`、`SignOut(Units[endIndex].EndIndex)`（含 `;`）；
  6. `Finished=true`、`StatementsBuilt += 1`。

`2*3+1` 的实测 trace：

```
insert(*) prec14 owner=Holder
insert(+) prec13 owner=Holder
expression finish: endIndex=4 ingested=5 units=5 stoppedAt=-1
expression built: BinaryExpressionShape
```

---

## 5. 表达式引擎

文件：`typescript/tokens/direct/direct-expression-engine.xl.md`（类 `DirectExpressionEngine`）。
变量初始化器与表达式语句**共用**这一个引擎（各自 new 一个实例）。

### 5.1 状态与字段

| 字段 | 作用 |
| --- | --- |
| `Expect` | `ExpectOperand(1)` / `ExpectOperator(2)` |
| `Root` | 容器 holder：顶层操作数、括号、二元 frame 都挂在它下面；`Finish` 返回它唯一的子节点 |
| `Frames` / `FramePrecs` / `FramePending` | 未完成二元 frame 栈：形状 / 优先级 / 右操作数是否还没到 |
| `FramePending` / `FrameStages` | R2 新增的阶段位（`StageDone/StageOperand/StageColon/StageFalse`），与 `FramePending` 同步维护；条件 `?:` 靠它区分「还在真分支」与「已过冒号」 |
| `Prefixes` | 已建、还没挂操作数的前缀栈 |
| `PendingOperand` | 已建好、还没决定挂给谁的操作数（后缀比前缀绑得紧，见下） |
| `NewPending` | `new` 的被构造者后缀链（A3） |
| `PreviousEnd` / `PreviousUnit` | 上一个非 trivia 单元的 `EndIndex` / 单元本身（C1 行终止符守卫读 `PreviousUnit`） |
| `Inserts` | 二元插入 / 旋转次数 |
| `Held` / `HeldAt` | 接不上的单元：不 Decline，先停（C1 守卫也用它） |
| `Declined` / `Reason` | 范围外构造：显式放弃（不抛） |
| `LayerEnded` | 本层结束符之后不再消费；括号子引擎用它判「括号内表达式提前收口」 |

`IngestAll(units)` 的循环条件：`Ingested < units.length && !Declined && !Held && !LayerEnded`；
每个非 trivia 单元的 `pos = PreviousEnd < 0 ? BasePos : PreviousEnd`（与 `ExpressionBuilder.Load` 同口径），
然后 `PreviousEnd = unit.EndIndex`，再 `IngestUnit(unit, pos)`。

### 5.2 操作数位置（`ExpectOperand`）

> 本节与 §5.3 描述的是 R1 的基础判定；R2 在其上扩面（字符串 / 模板 / BigInt / 关键字叶子、数组 / 对象、
> 调用 / 成员 / 下标 / `new` / 可选链、赋值 / 条件 / 逗号 / `as` / 非空 / `typeof`·`void`·`delete`），
> 新增分支统一见 **§5.8**。

- `Common` 且 `StartsNumber(text)`：数值 → `NumericLiteralShape.FromBasicToken`；BigInt（`1n` / `0x1fn`）→
  `BigIntLiteralShape`（十六进制按 `String(Number(...))` 归一）；数值后缀 → Decline。`Pos = pos` → `PendingOperand`，转 `ExpectOperator`。
- `Common` 且是字符串 / 模板单元：`"s"` / `'t'` → `StringLiteralShape`；`` `plain` `` → `NoSubstitutionTemplateLiteral`；
  有插值 → `TemplateExpressionShape`（插值内用**嵌套 `DirectExpressionEngine`**，§5.8）。
- `Common` 且是关键字字面量（`true` / `false` / `null` / `this`）：建关键字叶子，token **不进 `Data`**。
- `Common` 且 `IsIdentifierOperand`：建 `IdentifierShape.FromBasicToken`、`Pos = pos` → `PendingOperand`。
  保留字表只放行上面四个字面量关键字；`super/typeof/void/delete/new/function/class/await/yield/…` 一律 false
  （显式集合在 `direct-token-util.xl.md`；`typeof`/`void`/`delete`/`new` 有各自的分支）。
- `Common` 其它 → `Fail("字面量 / 关键字不在本轮范围: …")`。
- `Bracket` `(`：**嵌套引擎**（§5.6）；`[`：数组字面量（含 `SpreadElementShape`、零宽 `OmittedExpressionShape`）；
  `{`：对象字面量（property / shorthand / computed / spread；方法体 / 访问器 → `Fail`）。
- `Symbol` 且文本 ∈ {`!`, `~`, `+`, `-`, `++`, `--`} **且** `OperatorTable.IsPrefixOperator(text)`：
  建 `PrefixUnaryExpressionShape`、`SignIn(运算符.StartIndex)`、`Pos = pos`、`OperatorToken = unit`（字段），
  压 `Prefixes`；**不立刻包操作数**（`-a++` 必须是 `-(a++)`）。
- `Common` `typeof` / `void` / `delete`：建对应的 `TypeOfExpressionShape` / `VoidExpressionShape` /
  `DeleteExpressionShape`，操作数递归 `ParseOperand`（`delete a.b` 的后缀链复用 §5.3 的成员分支）。
- `Common` `new`：建 `NewExpressionShape`，用 `NewPending` 包住整条被构造者的后缀链。
- 其它符号 → `Fail("操作数位置上的符号不在本轮范围: …")`。

### 5.3 运算符位置（`ExpectOperator`）

- `Symbol` `++` / `--`：`IngestPostfix`——替换 `PendingOperand` 为 `PostfixUnaryExpressionShape`
  （`Data=[operand]`、`Pos=operand.Pos`、`SignIn(operand.StartIndex)`、`SignOut(unit.EndIndex)`、
  `OperatorToken` 字段、`TryToClose`）。**C1**：`++`/`--` 前若有行终止符 → `Hold()`（§14.1）。
- `Symbol` `!`：`NonNullExpressionShape`（`Data=[operand]`，`!` 不进 `Data`；同样受 C1 行终止符守卫）。
- `Symbol` 二元运算符：`IngestBinary` = `FlushOperand()` + `PushOperator(...)`；R2 起 `=` / 复合赋值 / `?` / `,`
  也走这里（优先级见 §5.8，`?` 用 `FrameStages`，`,` 用 `CommaPrecedence`）。
- `Symbol` `.` / `?.` / `(` / `[`：后缀链——成员 / 可选成员 / 调用 / 下标（可选链的三种后缀都带
  `QuestionDotToken` 子节点；实参表按顶层 `,` 切段递归建；实参 spread → `Fail`）。
- `Symbol` `;` / `)` / `]` / `}`：**本层结束符** → `EndLayer()` = `FlushOperand` + `CompleteAllFrames` +
  `LayerEnded=true`，不 Held、不 Fail（所以 session 把 `;` 喂进来是安全的，虽然两个 session 通常自己先拦）。
- `Symbol` 其它（`=>`、`?` 的非法形态等）→ `Fail("表达式运算符不在本轮范围: …")`。
- `Common` 且二元（`instanceof` / `in`）：`IngestBinary`。
- `Common` `as`：缓冲类型单元 → `TypeBuilder.Load + ParseType` 建类型子树（只读走一部分时把剩余单元**重新摄入**）；
  `satisfies` 显式 `Fail`（只放行 `as`）。
- `Common` 其它：**`Hold()`**（可能是下一条语句首单元 / ASI leftover）。
- `Bracket`：操作数后的 `(` / `[` / `{` 只能是调用 / 下标 / 块；前两者按上一条后缀链处理，`{` → `Fail`。
- 其它：`Hold()`。

### 5.4 优先级插入 / 旋转（实际算法）

数据：`Frames` 是**已建出、右操作数还没挂**的 `BinaryExpressionShape` 栈；`FramePrecs[i]` 是它的优先级；
`FramePending[i]=true` 表示还在等右操作数。

```
PushOperator(unit, text, prec, rightAssoc, pos):
  // 1) 收掉栈上所有「优先级更高（或同级左结合）」的完整 frame
  while Frames 非空 && !FramePending[top]
        && (FramePrecs[top] > prec || (FramePrecs[top] == prec && !rightAssoc)):
    CompleteTop()                       // 弹出（它已是完整子树）
  // 2) 把新运算符节点插到「当前容器最后一个子节点」与其父级之间
  parent = Top()                        // Frames 空 → Root（holder）；否则栈顶 frame
  if parent === null || parent.Data.length === 0: Fail("二元运算符缺少左操作数")
  child = parent.Data[last]
  shape = new BinaryExpressionShape(Template)
  ShapeInsertUtil.InsertBetween(parent, child, shape)   // [.. child] → [.. shape]，shape.Data=[child]
  shape.Add(DirectTokenUtil.OperatorToken(unit, pos, Template, Context))
  Inserts += 1
  Frames.push(shape); FramePrecs.push(prec); FramePending.push(true)
  Expect = ExpectOperand
  Trace("insert(" + text + ") prec" + prec + " owner=" + (parent === Root ? "Holder" : parent.constructor.name))
```

```
FlushOperand():
  if PendingOperand == null: return
  operand = PendingOperand; PendingOperand = null
  while Prefixes 非空:
    p = Prefixes.pop(); p.Add(operand); p.SignOut(operand.EndIndex); p.TryToClose(); operand = p
  AttachOperand(operand)
```

```
AttachOperand(operand):
  if Frames 非空 && FramePending[top]:
    Frames[top].Add(operand); FramePending[top] = false
    // 注意：end **不在这里封**（右侧可能还要长成更高优先级的子树）
  else:
    Top().Add(operand)
```

```
CompleteTop():
  frame = Frames[top]
  if frame.EndIndex < 0 && frame.Data.length > 0:
    last = frame.Data[last]; if last.EndIndex >= 0: frame.SignOut(last.EndIndex)
  if frame.EndIndex >= 0: frame.TryToClose()
  pop Frames / FramePrecs / FramePending
```

`InsertBetween` 会把 `Pos` / `SignIn` 从 child 继承（`shape-insert-util.xl.md`），所以二元节点的 `pos`
始终等于左操作数的 `pos`（含其前导 trivia）；`end` 统一在 `CompleteTop` 出栈那一刻按「最后一个子节点的
`EndIndex`」封一次。这正是 `a+b*c` / `a**b**c` 外层 `end` 正确的做法（`SignOut` 只能赋值一次）。

### 5.5 `2*3+1` 的逐步树演化

Positions：`2`=7, `*`=9, `3`=10, `+`=11, `1`=12（`let x = ` 之后；表达式语句从 0 开始同理）。

| 事件 | 引擎动作 | 树（`Data`） |
| --- | --- | --- |
| `2` 关闭 | `NumericLiteralShape`，`Pos=7`，区间 `[7,9)` → `PendingOperand` | — |
| `*` 关闭 | `FlushOperand`：无 frame → `Root.Add(2)`；`PushOperator(prec=14)`：没有可收 frame；`parent=Root`、`child=2`，`InsertBetween` 建 `BinaryExpression(*)`；`Add(AsteriskToken)`；frame 入栈 pending | `Root.Data=[*]`；`*.Data=[2, *]`；`Inserts=1`，trace `insert(*) prec14 owner=Holder` |
| `3` 关闭 | `NumericLiteralShape` `[10,11)` → `PendingOperand`（还没挂父） | `*.Data=[2,*]` |
| `+` 关闭 | `IngestBinary`：先 `FlushOperand` → `*.Add(3)`、`FramePending=false`（end 仍未封）；再 `PushOperator(prec=13)`：栈顶 14 > 13 → `CompleteTop()`：`SignOut(3.EndIndex=11)`、`TryToClose`、弹出；`parent=Root`、`child=*`，`InsertBetween` 建 `BinaryExpression(+)`；`Add(PlusToken)`；frame 入栈 | `*.Data=[2,*,3]`、`*.end=11`；`Root.Data=[+]`；`+.Data=[*, +]`；`Inserts=2`，trace `insert(+) prec13 owner=Holder` |
| `1` 关闭 | `NumericLiteralShape` `[12,13)` → `PendingOperand`；`Finish` 时 `FlushOperand` → `+.Add(1)`、pending=false | `+.Data=[*,+,1]` |
| 收口 `Finish` | `CompleteAllFrames`：`SignOut(1.EndIndex=13)`、`TryToClose`、弹出；`Root.Data.length==1` → 返回 `+` | `+{pos7,end13} = +( *(2,*,3), +, 1 )` |

与 TS 逐字段一致：

```json
{ "kind": "BinaryExpression", "pos": 7, "end": 13, "children": [
  { "kind": "BinaryExpression", "pos": 7, "end": 11, "children": [
    { "kind": "NumericLiteral", "pos": 7, "end": 9, "text": "2" },
    { "kind": "AsteriskToken", "pos": 9, "end": 10 },
    { "kind": "NumericLiteral", "pos": 10, "end": 11, "text": "3" }
  ] },
  { "kind": "PlusToken", "pos": 11, "end": 12 },
  { "kind": "NumericLiteral", "pos": 12, "end": 13, "text": "1" }
] }
```

其它结构的实测：`2*(3+1)`（`Inserts=1`，`*` 的左子是 `2`、右子是 `ParenthesizedExpression`）；
`-a*+b`（`Inserts=1`，`*` 的两个操作数分别是 `Prefix(-,a)` / `Prefix(+,b)`）；
`a**b**c`（右结合，第二个 `**` 插到栈顶 frame 的最后一个子节点里）；`a<b&&c||d`（三次旋转）。

### 5.6 括号 = 嵌套引擎

`ExpectOperand` 收到 `Bracket` 且 `StartBracketChar === "("` 时：

1. `base = bracket.SourceRange.StartIndex + 1`；
2. `inner = new DirectExpressionEngine(Template, Context, base)`；`inner.IngestAll(bracket.Data)`；
3. 内层 `Declined` / `Held` / `Finish() === null` 全部上抛为外层 `Fail`；
4. 建 `ParenthesizedExpressionShape`：`Add(inner 根)`、`SignIn(bracket.StartIndex)`、
   `SignOut(bracket.EndIndex)`（**区间含两侧括号**）、`Pos = pos`、`TryToClose` → `PendingOperand`。

所以 `(` / `)` 关闭时（`Bracket.Close` 会问父单元）内层已经吃完整棵子树，外层把括号节点当一个操作数即可。
R2 起括号内的逗号按**逗号运算符**处理：`(a, b)` / `f((a,b))` / `a ? b : c, d` 实测均
`built=1 declined=0 AST MATCH`（属 §11 的扩展观察项，不在 60 条里）；内层若在 `EndLayer` 后还有接不上的单元，
由 `inner.LayerEnded → Fail("括号内表达式提前收口")` 显式拒绝。

### 5.7 失败的处置

| 情形 | 动作 | 计数 | 后续 |
| --- | --- | --- | --- |
| 范围外构造 | `Fail(reason)`：`Declined=true`、`Reason=reason`、trace `engine-decline: …`，**不抛** | session 的 `Decline` 统一 `Declined++` | `Finish` 返回 null |
| 表达式不完整（`Finish` 失败） | `Fail("二元运算符缺少右操作数" / "表达式没有闭合" / "表达式没有唯一的根节点")` | 由 session 定性：变量初始化不完整 → `Decline`（`Declined++`）；表达式语句不完整 → `Incomplete`（`IncompleteFallback++`） | 旧路径 |
| 接不上的单元（可能是下一条语句） | `Hold()`：`Held=true`、`HeldAt=该单元下标`，停止消费 | **不计任何数** | 由 session 记 `StoppedAt`，`Finish(endIndex)` 判是否在语句区间内 |

**`Held` 不是 Decline**：`a⏎b` 是合法 TS（两条语句），把它当 Decline 会把目标 case 的 `Declined==0` 弄成假红。

### 5.8 R2 扩面：新增构造分支（A1–A5 + C1）

R2 把引擎从「数值字面量 + 标识符 + 一元 / 二元 / 括号」扩到下表。每行都对应 §9 的目标 case，
落地位置在 `direct-expression-engine.xl.md` / `direct-token-util.xl.md`（R2 只改这两个文件，见 `REPORT-r2-expr`）。

| 组 | 构造 | 关键实现点 | case |
| --- | --- | --- | --- |
| A1 | 字符串 `"s"` / `'t'`、模板 `` `a${b}c` `` / `` `plain` ``、BigInt `1n` / `0x1fn`、`true`/`false`/`null`/`this` | `DirectTokenUtil.LiteralOperand` 出叶子；**有插值的模板返回 null**，由引擎 `ParseTemplate` 用**嵌套 `DirectExpressionEngine`** 建 `TemplateSpan`（A6：不得借 `ExpressionBuilder`） | R2-A1-pos-01/02/03/04 |
| A2 | 数组 `[1,2]` / `[a, ...b]`、对象 `({a: 1})` / `({a, b})` / `({[k]: 1})` | 数组：`SpreadElementShape`、空槽零宽 `OmittedExpressionShape`（区间 `[slotStart-1, slotStart)`）；对象：`PropertyAssignment` / `ShorthandPropertyAssignment`（`{a = 1}` 走 `Data.splice(1,0,EqualsToken)`）/ `ComputedPropertyNameShape` / `SpreadAssignment`；**方法体 / 访问器 → Decline** | R2-A2-pos-01…05；负例 `({m(){}})` |
| A3 | 调用 `f()` / `f(1,2)`、成员 `a.b`、下标 `a[0]`、可选链 `a?.b?.(1)`、`new a.b()` | 实参表按**顶层逗号**切段、逐段 `BuildSlice`（嵌套引擎），所以 `f((a,b))` 与 `f(a,b)` 互不串层；`new` 用 `NewPending` 包住整条被构造者后缀链；`?.` 的三种后缀都带 `QuestionDotToken` 子节点；**实参 spread → Decline** | R2-A3-pos-01…06；负例 `f(...a)` |
| A4 | 赋值 `a = 1` / `a = b = c`、复合赋值、条件 `a ? b : c`、逗号 `a, b`、`as`、非空 `a.b!` | 优先级 helper 在引擎内：赋值 = `AssignmentPrecedence`(0) 右结合、逗号 = `CommaPrecedence`(-1) 左结合、条件 = `CondPrecedence`(2)（`OperatorTable` 未改）；条件用 `FrameStages`（`StageOperand/StageColon/StageFalse`）；`as` 把类型单元缓冲后交 `TypeBuilder.Load + ParseType`，只读一部分时把剩余单元**重新摄入**；非空 `!` 不进 `Data`、只做终点 | R2-A4-pos-01…07 |
| A5 | `typeof a` / `void 0` / `delete a.b` | 关键字 token 不进 `Data`；`delete` 的 Suffix 链复用 A3 的后缀构建 | R2-A5-pos-01/02/03 |
| C1 | 行终止符守卫 | `IngestUnit` 末尾更新 `PreviousUnit`；`IngestOperator` 开头判 `IsRestrictedPostfix(text)`（`++`/`--`，`!` 同判）**且** `LineTerminator.HasBetween(PreviousUnit.SourceRange, unit.SourceRange)` → `Hold()`。守卫**只管跨行**，同一行 `a++b` 仍按既有语义建树 | R2-C1-01（`a⏎++b`）、R2-C1-02（`a⏎!b`） |

守卫与覆盖校验的两层关系（C1 的最终形态）：

1. **引擎侧 `Hold`**（本表最后一行）：`a⏎++b` 在 `++` 处停下，表达式止于 `a`，语句 1 收到 `a`；
   换行后的 `++b` 由下一条语句（或同一壳的 leftover 重放）处理 → `built=2`、`declined=0`；
2. **session 侧覆盖校验**（§3.5 / §4）：若引擎守卫没命中、表达式越过了语句终点，
   `expr.coverage` / `var.coverage` 把这次「建多了」显式 Decline 回旧路径。

两层都实测存在：合入后的 `a⏎++b` / `a⏎--b` / `a⏎++b;` 读数均为 **`built=2 declined=0 AST MATCH XML==基线（逐字节）`**，
`DeclineReasons={}`（A11）；而 `X-bin-incr a + b⏎++c` 这类守卫也接管（`built=2`），
说明「守卫优先、覆盖校验兜底」的分层与设计一致。

**失败处置仍然是 §5.7 那三行**，只是 R2 新增的 `Fail` 原因多了：
`括号内表达式提前收口`（括号子引擎 `inner.LayerEnded`）、`泛型实参调用不在本轮范围`、
`嵌套泛型实参 / 类型实参拆分不在本轮范围: >>`、`条件表达式分支里的逗号不在本轮范围`。这些 `Fail` 都由
session 统一归到 `expr.decline` 分类，**引擎自己不计数**（D1 的单一职责）。

---

## 6. Pos / SourceRange / AST 口径

直建沿用既有口径，不发明第二套：

- `SourceRange` 是**半开** `[StartIndex, EndIndex)`，`EndIndex` = 最后一个字符下标 + 1
  （`core/syntax/source-range.xl.md`、`core/syntax/token.xl.md`）。
- 形状另有 `Pos`：**含前导 trivia**，取「前一个非 trivia 单元的 `EndIndex`」；文件首为 `0`
  （`core/syntax/shape-token.xl.md`）。
- 直建里 `Pos` 的来源：
  - session 的 `BasePos` = 建壳时的 `shell.Pos`（= 语句前一个非 trivia 单元 EndIndex）；
  - 引擎内 `pos = PreviousEnd < 0 ? BasePos : PreviousEnd`；变量初始化器的 `BasePos` = `=` 的 `EndIndex`；
    括号内层的 `BasePos = bracket.StartIndex + 1`；
  - `VariableDeclarationShape.Pos = name.Pos`（名字单元的前一个非 trivia 单元 EndIndex）。
- AST 的 `pos = shape.Pos`、`end = shape.SourceRange.EndIndex`，**不再 +1/-1**
  （`typescript/cases/ast-compare.mjs`、`typescript/ast/ast-node.xl.md`）。
- 语句 `end` 含 `;`（`SignOut(Units[endIndex].EndIndex)`）；declaration list 的 `end` 到最后一个 declaration
  为止（不含 `;`）；括号节点区间含两侧括号，但 `Pos` 仍按 `(` 前的 trivia 算。
- 注意：`typescript/IMPORTANCE.md` §4 仍写「shape 闭区间、AST 换算 +1」，与上述现行实现不一致，以实现为准。

---

## 7. 范围外：显式 Decline + 计数 + 分类

`Decline(reason, category)` 在两个 session 里是同一个协议（`direct-variable-session.xl.md` /
`direct-expression-session.xl.md`），R2 起带**分类**（C3）：

```ts
if (this.Declined) return;
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Declined += 1;
DirectBuildMetrics.NoteDecline(reason, category);   // 分类表 + LastDeclineReason + trace
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict: " + reason + " [" + this.Summary() + "]");
}
```

`Incomplete(reason)` 同构，但计 `IncompleteFallback += 1`（strict 下同样先计数再抛），**不进分类表**。
**strict 的异常可能被上层 `TryToClose` / `ExitOrPre` 的 `try/catch` 吞成 `DetachShell`，所以判据永远是计数器，
不是「有没有抛异常」。**

本机实测（`SourceFileRunner.Parse` + `DirectBuildMetrics.Reset()`，`build/ts`；R2 收口态）：

| 输入 | sessions | built | declined | incomplete | 说明 |
| --- | --- | --- | --- | --- | --- |
| `let x = f()` | 1 | **1** | **0** | 0 | **D1 翻正例**：调用被 A3 覆盖；`DeclineReasons={}` |
| `let x = "s"` | 1 | **1** | **0** | 0 | 字符串叶子被 A1 覆盖；`DeclineReasons={}` |
| `let x: number = 1` | 1 | 0 | 1 | 0 | `var.type`：`变量声明的类型注解 / 确定赋值断言属范围外` |
| `let {a} = b` | 1 | 0 | 1 | 0 | `var.binding`：`解构绑定属范围外` |
| `if (a) { let x = 1; }` | 1 | 1 | 0 | 0 | 外层 `if` 旧路径；内层 `let` 直建 |
| `function f() { return 1; }` | 0 | 0 | 0 | 0 | 覆盖范围外，不建 session |
| `a⏎b` / `2⏎3` | 1 | 0 | 1 | 0 | `expr.stopped`：`语句内出现无法接续的单元 idx=2`（C2，见 §11） |
| `a⏎f()` | 2 | **2** | **0** | 0 | R2：两段都直建（`f()` 已是正例），AST MATCH |
| `let x = 1 2` | 2 | 0 | 2 | 0 | 同一行两条无法接续；旧路径恢复 |

> 表里 `let x = f()` / `let x = "s"` / `a⏎f()` 三行是 R1 与 R2 的**口径翻转**，不是笔误：
> R1 时代它们分别读 `declined=1` / `declined=1` / `built=1 declined=1`，A1/A3 覆盖后自然变绿。
> `let x = f()` 在 R1 目标 case 里是「第 10 条反例」，按 **D1** 现在是正例（R1-10 已改判）。

---

## 8. Metrics / trace / strict 与「直建被使用」的证据

### 8.1 `DirectBuildMetrics` 字段与计数归属

文件：`typescript/tokens/direct/direct-build-metrics.xl.md`（纯 static 类）。

| 字段 | 何时递增 / 写入 | 归属 |
| --- | --- | --- |
| `Sessions` | `DirectBuildRouter.Create` 成功构造 session 后 | router（session 不重复计数） |
| `StatementsBuilt` | session 的 `Finish` 成功交回形状时 | 两个 session |
| `Declined` | session 的 `Decline(reason, category)` | 两个 session（引擎不计数，只 `Fail`） |
| `IncompleteFallback` | session 的 `Incomplete(reason)` | 两个 session |
| `Errors` | **H2 的 `catch`（C4）**：`Finish` 抛错且 `!direct.Declined` 时 `+1` | `statement-shape` 的 H2（R2 之前恒 0） |
| `StrictViolations` | `Decline` / `Incomplete` 且 `Strict` 时，**先加再抛** | 两个 session |
| `LastDeclineReason` | `NoteDecline(reason, category)` | 两个 session（最近一次，不是 per-category） |
| `LastError` | **H2 的 `catch`（C4）**：`error.message` 或 `String(error)` | `statement-shape` 的 H2（R2 之前恒 `""`） |
| `DeclineReasons` | `NoteDecline`：`Map<string,int>` 按 category 累加；`Reset` 清空 | `direct-build-metrics`（C3） |
| `Strict` / `TraceEnabled` | 外部（harness `--strict` / `--trace`） | `Reset` **不清**这两个 |
| `Traces` | `Trace(line)`，仅 `TraceEnabled`；环形 256 条，超了丢最早 | 引擎 / session / router / H2 |

`Reset()` 清计数、`DeclineReasons` 与 `Traces`，保留 `Strict` / `TraceEnabled`。

**category 闭集**（`R2-CONTRACT §3.1`，9 个；R2 起实际会出现的就是下面这些）：

| category | 来源（调用点数） |
| --- | --- |
| `var.head` | `IngestHead` ×2 |
| `var.binding` | `IngestBinding` ×3（解构 / 非标识符 / 保留字） |
| `var.type` | `IngestEqualOrSep` ×1 |
| `var.init` | `IngestInitializer` ×2、`CloseDeclarationWithInitializer` ×2、`CloseDeclarationWithoutInitializer` ×1 |
| `var.stopped` | `Finish` ×1 |
| `var.coverage` | `CloseDeclarationWithInitializer` ×1（R2 新增，§3.5） |
| `expr.decline` | `Ingest` ×1（引擎 `Fail` 原文带在 detail） |
| `expr.stopped` | `Finish` ×1 |
| `expr.coverage` | `Finish` ×1（R2 新增，§4） |

> `NoteDecline` **不动** `Declined`（session 自己加），也**不把 `IncompleteFallback` 记进表**。
> 空 category 记成 `unknown`（防御性，正常路径不会出现）。

### 8.2 trace 行格式

- 引擎：`insert(<op>) prec<N> owner=Holder|<类名>`、`engine-decline: <reason>`；
- 变量 session：`variable ingest head: let`、`variable ingest binding: x`、
  `variable close declaration (initialized|no initializer)`、`variable built: decls=N`、
  `variable session decline: …` / `variable session incomplete: …`；
- 表达式 session：`expression finish: endIndex=… ingested=… units=… stoppedAt=…`、
  `expression built: <类名>`、`expression held at idx=… units=…`、`expression session decline: …`；
- **分类 trace（R2/C3）**：`NoteDecline` 固定打 `decline[<category>] <reason>`，两个 session 的
  `Decline` 都走它。`--decline-stats` 的 `last=` 就是从这里取的（取不到时退化为 `LastDeclineReason`，永不参与判 FAIL）；
- **H2 异常 trace（R2/C4）**：`direct finish error: <LastError>`，只在 `Finish` 抛错且未 Decline 时打。

`let x = 2*3+1` 的完整实测 trace：

```
variable ingest head: let
variable ingest binding: x
insert(*) prec14 owner=Holder
insert(+) prec13 owner=Holder
variable close declaration (initialized)
variable built: decls=1
```

### 8.3 builder Load 口径（A6）

| 计数器 | 含义 | 目标 case 实测 |
| --- | --- | --- |
| `stmtLoads` | `StatementBuilder.prototype.Load` 调用数 | **0** |
| `exprDirectTokenUtil` | 调用栈含 `direct-token-util` 的 `ExpressionBuilder.Load` | = 二元运算符个数（1/2/4） |
| `exprLegacy` | 其它 `ExpressionBuilder.Load`（旧路径事后 Build） | **0** |
| `effectiveLoads` | `stmtLoads + exprLegacy` | **0** |

`DirectTokenUtil.OperatorToken` 按 CONTRACT §3.4 复用唯一映射表：

```ts
const builder = new ExpressionBuilder(template, context);
builder.Load([unit], pos);                  // 只为让 SpanLeaf 取到 Units[0]/Positions[0]
return builder.MakeOperatorToken(unit, 0);  // 选型 + SignIn/SignOut/Pos/TryToClose 仍走老路径
```

因此 **A6 的验收口径是 `stmtLoads == 0 && exprLegacy == 0`**，不是字面 `exprLoads == 0`：
`exprLoads` 里 `exprDirectTokenUtil` 部分是 CONTRACT §3.4 明确许可的唯一映射表复用。
若要求字面 0，必须先改 `DirectTokenUtil.OperatorToken`（与 §3.4 冲突），不能为此牺牲唯一映射表。

### 8.4 端到端证据（本克隆实测，2026-10-25）

构建（§10 的命令；本克隆是干净克隆，`dist/` 为空）：

```
xl_build: 548 written, 0 skipped, 0 planned, 0 error(s), 2535 warning(s)
tsc: exit 0（build/ts = 548 个 .js）
```

> warning 2535 = R1 基线 2485 + expr 47 + harden 3（`DeclineReasons` / `NoteDecline` / `EqualAt` 的 W3102）。

全量 60 条（唯一最终判据，exit 0）：

```
node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats --baseline=<8456ec3c 克隆>
→ IMPL: state=wired metrics=present hooks=present router=present sessions=2
  ASSERT: A1=PASS A2=PASS A3=PASS A4=PASS A5=PASS A6=PASS A9=PASS A10=PASS A11=PASS
  DIRECT-TOTAL: builtCases=41/60 loads=69
  CASES=60 FAILED=0
  DECLINE-STATS: total=12 categories=3
    expr.decline        10  last="表达式范围外: 嵌套泛型实参 / 类型实参拆分不在本轮范围: >>"
    expr.stopped         1  last="语句内出现无法接续的单元 idx=2"
    var.binding          1  last="解构绑定属范围外"
```

默认模式（不带旗标）与 R1 的差别：

```
node tests/direct-build/target-cases.mjs
→ CASES=60 FAILED=0；builtCases=41/60（READING 不计失败，最终验收必须带 --expect-direct）
```

- 41 条正例：`built=1`（R1-08 为 `built=2`）、`declined=0`、`incomplete=0`、`errors=0`、
  `strictViolations=0`、`stmtLoads=0`、`effectiveLoads=0`、`DeclineReasons={}`（A11）；
- `loads=69` 是全部 case 的 `effectiveLoads` 求和：负例 / `safe` / `incomplete` 必然走旧路径（>0），
  **A6 只对正例强制 0**；
- `let x = f()`（R1-10）不再产生 `READING-FAIL`，也不再需要「反例 SKIP」的过渡口径。

---

## 9. 目标 case 与实测读数（60 条）

权威清单：`tests/direct-build/target-cases.mjs` 的 `CASES`（60 条）+ `_coord/REPORT-r2-verify-fix.md §3`。
**60 = R1 原 10 + verify 的 43 + 收口校正新增/改判 17**；正例 41 / 非正例 19（NEG 组）。

分组计数：R1=10、A1=5、A2=6、A3=7、A4=9、A5=3、C1=2、C2=1、C3=1、C4=1、GEN=8、SAFE=5、INC=2。

| expect | 条数 | 断言口径 |
| --- | --- | --- |
| `pos` | 41 | `built>=1`、`declined==0`、`incomplete==0`、`errors==0`、`strictViolations==0`、AST 逐字段 MATCH、`XML==baseline`、`DeclineReasons` 空（A11） |
| `neg` | 11 | `declined>=1`、`built==0`、`errors==0`、AST MATCH、`XML==baseline`、`DeclineReasons` 含期望 category（A9） |
| `safe` | 5 | **无 session 构造**：`built==0 && errors==0`（不断言 `declined`），AST MATCH、`XML==baseline` |
| `invalid` | 1 | 语法非法：`declined>=1`、`built==0`、两侧 Parse **同源拒绝**（文案逐字相同），AST 不可比 |
| `incomplete` | 2 | 收口期失败：`built==0`、`incomplete>=1`、`errors==0`、两侧同源拒绝 |

### 9.1 逐组清单（源码 → expect）

| 组 | case |
| --- | --- |
| R1-01…10 | `let x = 2*3+1` / `let x = 1;` / `const a = 2*3;` / `2*3+1` / `let a=1,b=2` / `2*(3+1)` / `-a*+b` / 两条语句 / `let x = 1` / **`let x = f()`（D1 pos）** |
| A1 | `"s"` / `` `a${b}c` `` / `1n` / `let t = true && false`（4 pos）；`/a/g`（neg） |
| A2 | `[1,2]` / `[a, ...b]` / `({a: 1})` / `({a, b})` / `({[k]: 1})`（5 pos）；`({m(){}})`（neg） |
| A3 | `f()` / `f(1,2)` / `a.b` / `a[0]` / `a?.b?.(1)` / `new a.b()`（6 pos）；`f(...a)`（neg） |
| A4 | `a = 1` / `a = b = c` / `a ? b : c` / `a, b` / `x as A[]` / `a.b!` / **`a ? (b, c) : d`（pos-07）**；`x satisfies T`（neg）、**`a ? b, c : d`（invalid）** |
| A5 | `typeof a` / `void 0` / `delete a.b`（3 pos） |
| C1 | `a⏎++b` / `a⏎!b`（pos） |
| C2 | `a⏎b`（neg，**明确保持 Decline**，见 §14.4） |
| C3 | `let {a} = b`（neg，期望 `var.binding`） |
| C4 | `2*3+1` + `--fault-inject=finish-throw`（注入式，见 §14.3） |
| GEN | `f<T>(1)` / `f<string, number>(1)` / `a<b>(c)` / `new A<T>()` / `f<A<B>>(1)`（5 neg）；`x<y>z` / `a<b>c` / `a<<b>(c)`（3 pos） |
| SAFE | `await a` / `class {}` / `yield a` / `if (a) b` / `return a?b:c`（5 safe） |
| INC | `a as` / `a +`（2 incomplete） |

### 9.2 实测读数（本克隆，`a937244d` + 548 .js）

| 命令 | 读数 | exit |
| --- | --- | --- |
| `--group=r1` | `CASES=10 FAILED=0`；`ASSERT: A1=PASS A2=PASS A3=PASS A4=READING A6=READING A9=SKIP A10=SKIP A11=READING`；`DIRECT-TOTAL: builtCases=10/10 loads=0` | 0 |
| `--expect-direct --strict --decline-stats --baseline=<8456ec3c>` | `CASES=60 FAILED=0`；`ASSERT: A1..A11 全 PASS`；`builtCases=41/60 loads=69`；`DECLINE-STATS: total=12 categories=3`（`expr.decline 10` / `expr.stopped 1` / `var.binding 1`） | 0 |
| `--only=R2-C4-01 --fault-inject=finish-throw --expect-direct --strict` | `CASES=1 FAILED=0`；A4 PASS（注入后 `errors=1`、`lastError` 含 inject、`declined=0`；第二次 `errors=0`；AST 仍 MATCH）；A6 PASS（只量第二次，`effectiveLoads=0`） | 0 |
| `--group=NEG` | `CASES=19 FAILED=0`；`builtCases=0/19 loads=69` | 0 |

**A1–A11 断言索引**（harness 里逐条实现）：

| 断言 | 含义 |
| --- | --- |
| A1 | AST 逐字段 == tsc（`cjAst(root.Data)` vs `sf.statements.map(tsAst)`）；`invalid` / `incomplete` 改判 `PARSE-REJECT-PARITY` |
| A2 | 同源解析两次 `ToXmlString()` 逐字节相同（C4 注入 case：注入那次 vs 不注入那次） |
| A3 | XML 非空且根下节点数 == TS 顶层语句数 |
| A4 | 按 `expect` 类别化（见上表） |
| A5 | `--strict` 时计数器仍全 0（**只作用于正例**，见 §10 的 strict 口径） |
| A6 | `stmtLoads + exprOtherDirect + exprLegacy == 0`（C4 只量第二次解析） |
| A7 | `--trace` 时 `Traces` 含 `insert(`（仅 `expectInsert` 的 case） |
| A9 | 负例（含 invalid）的 `DeclineReasons` 含期望 category |
| A10 | `XML==baseline`（`--baseline` 启用；invalid/incomplete 改比拒绝文案） |
| A11 | 正例 `DeclineReasons` 全空 |

> `R2-A4-pos-07 a ? (b, c) : d` 是**合法 TS 正例**（真分支是括号内的逗号表达式）；
> `R2-CONTRACT §1.1` 曾把它写成负例，实测 `built=1 / declined=0 / AST MATCH / XML IDENTICAL`，harness 已按正例收口。
> 真正的非法输入是**不带括号**的 `R2-A4-neg-02 a ? b, c : d`（TS 语法错误，两侧 Parse 同源拒绝）。

正向 41 条的 AST 与 TS **逐字段一致**；XML 两次解析逐字节一致；根下节点数 == TS 顶层语句数；
`--strict` 下计数器仍全 0（strict 异常没有吞出假绿）。

---

## 10. 复跑命令（本克隆实测可跑）

`tests/direct-build/target-cases.mjs` 已随 `a937244d` 合入主仓库，**不需要再临时拷入**。

```powershell
$clone = "C:\Users\Admin\Documents\GitHub\xl-example-set\docs-r2"
cd $clone

# 0) 构建：xl_build 是会话工具，不是 shell 命令
#    xl_build(cwd=$clone, paths=["core","typescript"], targets=["ts"], out="dist", orphans=false)
#    实测：548 written, 0 skipped, 0 planned, 0 error(s), 2535 warning(s)
#    （增量构建 / dist 缓存已热时显示 0 written, 548 skipped；判据仍是 0 error）
#    （warning 全部是既有 W3102/W3103；orphans:false 关掉 dist 历史残留的 E2004 噪音）
node node_modules/typescript/bin/tsc -p tsconfig.json        # 实测 exit 0

# 1) R1 原 10 条不回归（默认模式，只报读数）
node tests/direct-build/target-cases.mjs --group=r1
#    实测 exit 0；CASES=10 FAILED=0；builtCases=10/10 loads=0

# 2) 全量 60 条（唯一最终判据）
node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats `
     --baseline=C:\Users\Admin\Documents\GitHub\xl-example-set\chore-all-possible-setup
#    实测 exit 0；CASES=60 FAILED=0；A1..A11 全 PASS；builtCases=41/60 loads=69
#    DECLINE-STATS: total=12 categories=3（expr.decline 10 / expr.stopped 1 / var.binding 1）

# 3) C4 故障注入（必须单跑：注入路径在整批里只影响这一条）
node tests/direct-build/target-cases.mjs --only=R2-C4-01 --fault-inject=finish-throw --expect-direct --strict
#    实测 exit 0；CASES=1 FAILED=0；A4 PASS（errors=1 / lastError 含 inject / declined=0 / 第二次 errors=0）

# 4) 非正例 19 条
node tests/direct-build/target-cases.mjs --group=NEG
#    实测 exit 0；CASES=19 FAILED=0；builtCases=0/19 loads=69

# 5) 机器可读证据（可选）
node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats `
     --baseline=C:\Users\Admin\Documents\GitHub\xl-example-set\chore-all-possible-setup --json > r2-readings.json
#    实测 exit 0（本机 510KB）。注意：本机 PowerShell 的 `>` 实测写的是 UTF-16LE（带 BOM、字节间有 \0），
#    直接 require/JSON.parse 会报 "Unexpected token"；要给 node 解析请改用
#    [IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
#    或 node tests/direct-build/target-cases.mjs --json | Out-File -Encoding utf8 r2-readings.json
```

CLI 速查（`--help` 的输出就是权威）：

| 旗标 | 作用 |
| --- | --- |
| `--group=<g1,g2>` | `r1` / `r2` / `all` / `A1…A5` / `C1…C4` / `GEN` / `SAFE` / `INC` / `NEG` / `POS`（大小写不敏感） |
| `--only=<id\|序号\|source>` | 先按 case ID 精确匹配（`R2-A3-pos-04`），再退回 R1 语义：全数字 = 1 基序号 / 精确 source / 子串 source |
| `--trace` | 打开 `TraceEnabled` 并断言 `Traces` 含 `insert(`（A7） |
| `--strict` | 打开 `DirectBuildMetrics.Strict` 并断言计数器全 0（A5，**只对正例**，见下） |
| `--expect-direct` | 强制 A4/A6（及 `--strict` 时的 A5、A9/A11） |
| `--decline-stats` | 打印 `DECLINE-STATS`（count 降序、同数按 category 字典序；`last=` 取 trace） |
| `--baseline=<repo>` | 用另一个已构建的 8456ec3c 克隆同源解析，比对 XML（A10） |
| `--fault-inject=finish-throw` | C4 专用：给 `ExpressionStatementDirectSession.prototype.Finish` 包一层一次性抛错（进程内，不改源码） |
| `--json` | stdout 只输出一份 JSON 读数（schema `dsh/xl-example/target-cases@2`，`expect` 枚举含 `safe/invalid/incomplete`） |

**输出兼容性**：R1 原 10 条的 `SOURCE / TS-AST / CJ-AST / AST-MATCH(ts) / XML / DIRECT` 六类输出行
与新 harness **50 行 vs 50 行、差异 0**（`_coord/r2-verify-fix-r1-compat.txt`）；R2 新增的断言行只能**追加**在
每条 case 之后（`CATEGORY:` / `A9:` / `A10:` / `A11:`），不改旧行。

**strict 口径（重要，勿误读为产品红）**：`--strict` 目前只对**正例** Parse 生效。`let {a} = b` 在 `Strict=true` 下，
变量 session 的 `Decline` 发生在 **H1/Ingest**（`statement-shape` 的 H1 未包 `try/catch`），异常会抛穿 `Parse`
（且抛出的不是 `Error`，`message` 为 `undefined`），AST 全没了、两次尝试还把 `var.binding` 计成 2。
这是 **strict 语义（Decline 即抛）与「负例必须 AST MATCH」互斥**，不是产品红：harness 对 `expect != "pos"`
的 case 用 `Strict=false` 解析，并在 A5 的 SKIP 文案里明说。**R3 若要给 H1 加 `try/catch`，才能把
「strict 全量」变成真语义。**

**不跑**（本轮口径，见 `_coord/R2-CONTRACT.md §6`）：`tests/gates/run.mjs`、`samples/check.mjs`、
`typescript/cases/ast-json.mjs` / `ast-json-diff.mjs`（全量 6171）、`tests/coverage/*`、
`tests/statement-possible/harness.mjs` 全量。这些数字不能引用为本轮验收。

---

## 11. 已知限制（R2 收口态）

1. **表达式语句跨行 ASI `a⏎b` / `2⏎3` 仍 Decline 走旧路径（C2，按 R2-D4 明确保持）。** 根表达式壳在 EOF 才收口，
   传入的 `endIndex` 覆盖两条语句；session 显式 `Decline("语句内出现无法接续的单元 idx=2", "expr.stopped")`，
   旧路径 Detach 后恢复，AST 仍与 TS 一致（实测 `declined=1`、AST MATCH、`XML==baseline`）。
   **目标 case 里它按 neg 收录（R2-C2-01），不是漏项。** R3 若直建化，才改为 pos（`built=2 declined=0`）。
2. **泛型实参 / 实例化表达式一律 Decline**：`f<T>(1)` / `f<string, number>(1)` / `a<b>(c)` / `new A<T>()` /
   `f<A<B>>(1)`（`expr.decline`）。这是 A3 覆盖调用后**必须保留的守卫**：没有它，`f<T>(1)` 会被静默建成比较链
   （`built=1 AST NO`）——基线靠「调用未覆盖」侥幸正确，属 R2 引入的回归，已由 27ac618e 修掉。
   对照正例 `x<y>z` / `a<b>c` / `a<<b>(c)` 证明比较链没有被误伤。
3. **`a ? (b, c) : d` 是正例，`a ? b, c : d` 才是非法输入。** 前者真分支是括号内的逗号表达式
   （`built=1 AST MATCH XML IDENTICAL`）；后者 TS 语法错误，两侧 `Parse` 同源拒绝、AST 无可比。
   `R2-CONTRACT §1.1` 原先把前者写成负例，**已按实测改正**（见 §13.8）。
4. **行终止符守卫只覆盖「前缀 `++` / `--` / `!` 出现在行首」这一族**：`a⏎++b` / `a⏎--b` / `a⏎!b` 已
   `built=2 declined=0 AST MATCH XML==基线`。**变量声明里的同类缺陷不在本轮**（D7）：
   `let x = a⏎++b`、`let x = a⏎!b`、`let x = a + b⏎++c`、`let x = a + b⏎--c` 仍 `AST NO`，
   但直建前后 `XML` 与 8456ec3c **逐字节一致**（`var.stopped ×2`）——这是 **8456ec3c 的历史缺陷，不是本轮回归**，
   按 R2-D7 **不列入目标 case**。
5. **A6 不是字面 `exprLoads == 0`**：`DirectTokenUtil.OperatorToken` 每个二元运算符一次
   `ExpressionBuilder.Load`（§8.3）；验收口径是 `stmtLoads==0 && exprOtherDirect==0 && exprLegacy==0`。
6. **括号内的逗号**：R2 已按逗号运算符建，`(a, b)` / `f((a,b))` / `a ? b : c, d` 实测
   `built=1 declined=0 AST MATCH`；它们**不在 60 条目标 case 里**（属 `R2-TARGET-CASES §6` 的扩展观察项）。
   顶层 `a, b` 已是正例（D3）。
7. **`Errors` 现在有递增点（C4）**：H2 的 `catch` ×1。但正常/负例输入上它**恒 0**；
   不要把它当「运行期异常数为 0」的普遍证据，异常路径仍主要看 `Declined` / `IncompleteFallback` / `StrictViolations`。
8. **`++a++` / `a++++`**：按 TS 结构建 `Prefix(Postfix(...))` / `Postfix(Postfix(...))`（与旧 builder 的
   `InsertionPoint` 行为一致），没有按「非法输入」Decline；AST 对拍口径优先。
9. **范围外语句族内部**仍可能出现被直建的内层语句（`if (a) { let x = 1; }`），这是预期：
   直建按「构造」生效，不按「外层族」生效。
10. **session 不判边界**：`let x = 1 2` 这类同一行无法接续的输入会 Decline 并回旧路径，
    由旧路径给出与直建前相同的错误 / 恢复行为。
11. **`build/ts` 的历史 0 字节孤儿**：主仓库 `build/ts/typescript/run/statement-block-stream.js`（0 字节，
    2026-10-24 就已存在，`dist` / 源码 / 任何 `require` 都不引用）是**累积构建目录的观察项**，非本轮引入。
    干净克隆首次构建只有 **548** 个 `.js`（没有这个文件）；主仓库因历史累积是 **903** 个。
    不影响任何读数，未清理。

---

## 12. 与旧 `BuildFromShell` 的关系

`StatementShape.BuildFromShell` 是本轮唯一被改动的收口函数；直建分支插在
`consumed` 计算之后、`new StatementBuilder` 之前（§2.4），因此：

| 输入 | 行为 |
| --- | --- |
| 覆盖范围内、session 未 Decline、`Finish` 成功 | `splice` + `return directBuilt`；**旧路径一步都不执行**（不建 builder、不 `Load`、不三层 possible、不 family 分派、不 `BuildStatement`、不 `BuildExpressionStatementFromShapes`） |
| 覆盖范围内但 session Decline（范围外构造） | `Finish` 返回 null → **完整走旧路径**；AST / XML 与直建前逐字节相同 |
| 覆盖范围外的语句族（`if` / `function` / `class` / 声明族…） | 那些壳没有任何 H3 调用，`shell.DirectSession` 保持 `null`（`plugins` 里也没有它们的 kind）→ **完整走旧路径**，行为不变 |
| 覆盖范围内但 `Finish` 不完整 | session 的 `Incomplete` / `Decline` 计数 → 旧路径（目标 case 上该计数为 0） |

直建成功时 `host.Data.splice(0, consumed.length)` 与旧路径末尾的 splice 同源，随后
`StatementEndPossibleShape.BuildByIndex` 照旧调 `StatementShape.FinishShell(host, built, context)`：
壳被节点顶替、leftover 回插并重放、`LeftoverReplayDepth` 防递归——全部不变。
表达式语句的壳在覆盖构造上仍会被 H1 后面的 `OperatorBody.IngestAll` 喂（既有行为；变量壳的 `OperatorBody`
为 `null`），但直建**不读它**，也不把它的产物转成 AST。

---

## 13. 与设计文档 / 实现不一致的地方（读代码时注意）

以下是落地时与 `_coord/DESIGN-all-possible.md` / `_coord/CONTRACT.md` / `_coord/R2-CONTRACT.md` 文字有出入、
但**以代码为准**的点：

1. **二元 `end` 的封口时机**：DESIGN §4.4 写「右操作数挂上时 `SignOut`」，实际在 `CompleteTop()` 出栈时按
   「最后一个子节点的 EndIndex」封（`direct-expression-engine.xl.md` 的 `CompleteTop`）。原因：右操作数可能
   继续长成更高优先级 / 右结合的子树（`a+b*c`、`a**b**c`），挂上就封会把外层 `end` 封早，而 `SignOut` 只能
   赋值一次。实测 `2*3+1` 的 `*` end=11、`+` end=13 均正确。
2. **引擎没有 `Blocked` 状态**：DESIGN §4.3 列了 `0 ExpectOperand / 1 ExpectOperator / 2 Blocked`；实现用
   `Declined` / `Held` / `LayerEnded` 三个布尔表达「停」，`Expect` 只有 1 / 2。
3. **前缀判据是「集合 ∩ `OperatorTable.IsPrefixOperator`」**：DESIGN 只写了 `IsPrefixOperator`；
   实现同时要求文本 ∈ {`!`,`~`,`+`,`-`,`++`,`--`}，`typeof` / `void` / `delete` 不走前缀（A5 单独建节点）。
4. **变量 list / statement 的 `Pos`**：DESIGN §4.2 写 `list.Pos = keywordUnitPos`；实现统一用 `BasePos`
   （= `shell.Pos`），statement 也用 `BasePos`。在文件首 / 常规位置两者相同，块内首条语句的 `BasePos`
   按建壳口径已含前导 trivia。
5. **`ExpectSep` 的 `Held` 实现**：DESIGN 写「变量 session 在 ExpectSep 看到 `let`：Held」；实现是
   `IngestSep` 对任何接不上的单元一律 `StoppedAt = at`（不叫 Held），由 `Finish` 判区间。
6. **`IncompleteFallback` 的计数点**：DECISIONS 附录原说 wire 时在 H2 加；实际落在两个 session 的
   `Incomplete(reason)` 里（`direct-variable-session.xl.md`、`direct-expression-session.xl.md`），H2 没有加。
   **不要在两处都加**，否则不完整时会计两次。
7. **`Errors` 的递增点在 H2（C4）**，不是 session：DESIGN §6.2 把它列进「必须 0」的计数器；
   R2 起它只在 H2 的 `catch` 里 `+1`，正常输入恒 0。不要把它当全局证据。
8. **`a ? (b, c) : d` 的正负判反了（已更正）**：`R2-CONTRACT §1.1` 第 28 行原文把它列为负例（「真分支逗号」），
   实测是**合法 TS 正例**（`built=1 declined=0 AST MATCH XML IDENTICAL`，harness 的 `R2-A4-pos-07`）；
   真正非法的是**不带括号**的 `a ? b, c : d`（`R2-A4-neg-02`，`invalid`：直建显式 Decline + 两侧 Parse
   同源拒绝「条件表达式缺少冒号」）。**本文以 harness 与实测为准**；`R2-TARGET-CASES.md` 与 `R2-CONTRACT.md`
   的 43 条/43 计数、以及 §1.1 那一行属**收口前口径**，权威数字是 60 条。
9. **`R2-CONTRACT §3.3.3` 的覆盖校验伪代码有 off-by-one**：循环 `for (at = 0; at <= endIndex; ...)` 在
   `endUnit === ";"` 时会把 `;` 自己当 `lastCode`，任何 `a;` / `2*3+1;` 都会被误 Decline。实现按同一段的
   **注释意图**（`;` 属语句不属表达式，期望终点退到它之前的代码单元）在 `at === endIndex && TextOf(unit) === ";"`
   时跳过该单元；实测 `a;` / `2*3+1;` / `let x = 1;` 均不触发。
10. **`--strict` 语义的小变化（C4 副作用）**：H2 现在**捕获** session 在 `Finish` 内抛出的 strict 异常
    （`direct.Declined==true` → 不重复计 `Errors` → 回落旧路径），所以「strict 抛错」不再必然炸到
    `TryToClose` 的 `DetachShell`；判据仍是计数器（`StrictViolations` 已 +1）。实测 `a, b` 在 strict 下
    `declined=1 strictViolations=1 errors=0`、AST 仍 MATCH。
11. **Decline 的 trace 行格式变了（C3）**：从 `expression session decline: X` 改为
    `decline[expr.decline] X`（变量侧同理是 `decline[var.*] X`）；`LastDeclineReason` 语义不变，仍只记最近一次。
    `--decline-stats` 的 `last=` 优先从这条 trace 取。
12. **`var.coverage` 的边界参数**：`CloseDeclarationWithInitializer` 新增内部参数 `boundHigh:int`
    （`;`/`,` 到达时传分隔符下标、`Finish` 收口时传 `endIndex + 1`）并用新字段 `EqualAt` 记住 `=` 的位置；
    这是 session 的**内部方法签名**，不在 CONTRACT §3 的接口增量表里，不影响外部调用点。

---

## 14. R2 硬化（C1 / C3 / C4 / C2）与 D7 基线缺陷

R2 的 C 组改动只碰 4 个文件：`direct-build-metrics`、`direct-variable-session`、`direct-expression-session`、
`statement-shape`（只动 H2 与 import）。引擎与 token-util 属 A 组（§5.8）。

### 14.1 C1 行终止符守卫（两层）

- **引擎层**（`direct-expression-engine`）：`IngestUnit` 成功消费后更新 `PreviousUnit`；`IngestOperator`
  开头判 `IsRestrictedPostfix(text) && LineTerminator.HasBetween(PreviousUnit.SourceRange, unit.SourceRange)`
  → `Hold()`。`Hold` **不计数、不 Decline**，只停止消费。
- **session 层**（覆盖校验）：
  - 表达式 session 在 `Finish` 建语句之前比「表达式终点 == 语句最后一个代码单元终点」（`;` 跳过），
    不一致 → `Decline("表达式终点与语句终点不一致: …", "expr.coverage")`；
  - 变量 session 在 `CloseDeclarationWithInitializer` 比同构的一对（`var.coverage`），`REPORT-r2-harden §3.5`
    记录它在当前语料**触发 0 次**（安全网）。
- **最终读数**（目标 case，实测）：`a⏎++b` / `a⏎--b` / `a⏎++b;` → `built=2 declined=0`、
  `AST MATCH`、`XML` 与 8456ec3c **逐字节一致**、`DeclineReasons={}`（A11）。
  `a⏎!b` 同为 `built=2 declined=0 AST MATCH`（`!` 由 A4 覆盖，守卫同判据）。
- **分层证据**：harden 单分支时代这三条是 `built=1 declined=1 expr.coverage`（过渡态）；合入 expr 的 `Hold` 后
  守卫先命中、session 根本走不到覆盖校验，于是变成 `declined=0`。两层叠加、互不干扰。
  `X-bin-incr a + b⏎++c` / `X-bin-decr a * b⏎--c` 在本合并后也是 `built=2 AST MATCH`（守卫接管）。

### 14.2 C3 `DeclineReasons` 分类计数

```ts
DirectBuildMetrics.NoteDecline(reason, category)   // 分类表 + LastDeclineReason + trace
```

- `static DeclineReasons: Map<string,int>`；闭集 9 类见 §8.1；空 category 防御性记 `unknown`；
- `NoteDecline` **不动 `Declined`**（session 自己加），`IncompleteFallback` **不进表**；
- `Reset()` 清空分类表；`Strict` / `TraceEnabled` 不清；
- trace 固定 `decline[<category>] <reason>`，harness 的 `--decline-stats` 从这里取 `last=`；
- 实测：`let {a} = b` → `{"var.binding":1}`；`/a/g` 等 4 条 A 负例 → `{"expr.decline":1}`；
  `a⏎b`（C2）→ `{"expr.stopped":1}`；41 条正例 → `{}`（A11）。
  全量 `DECLINE-STATS: total=12 categories=3`（`expr.decline 10` / `expr.stopped 1` / `var.binding 1`）。

### 14.3 C4 H2 异常计数（注入式验证）

`BuildFromShell` 的 H2 用 `try/catch` 包住 `Finish`：捕获后（`!direct.Declined` 时）
`Errors += 1` → `LastError = message` → `Trace("direct finish error: …")` → `directBuilt = null` → 回落旧路径。

`--fault-inject=finish-throw` 在 harness 进程内包一层 `ExpressionStatementDirectSession.prototype.Finish`，
**第一次**调用抛 `Error("inject: finish-throw")`（不改源码）。实测：

| 阶段 | built | declined | Errors | LastError | AST |
| --- | --- | --- | --- | --- | --- |
| 注入一次（`2*3+1`） | 0 | 0 | **1** | **`inject: finish-throw (harness fault injection)`** | **MATCH**（旧路径接管） |
| 紧接着 `Reset()` + 不注入再解析 | **1** | 0 | **0** | `""` | MATCH |

- 四条断言：`Errors==1`、`LastError` 含 `inject`、AST 仍 MATCH、第二次 `Errors==0`（计数不粘）；
- C4 的 A6 **只量第二次（不注入）解析**：`stmtLoads=0 exprLoads=2 effectiveLoads=0`；
- `direct.Declined==true`（strict 的 `StrictViolations` 抛错）时**不重复计 Errors**。

### 14.4 C2 跨行 ASI：明确保持 Decline（不是验收门）

`a⏎b` / `2⏎3` 在本轮**显式保持 Decline**（R2-D4）：

| 输入 | built | declined | `DeclineReasons` | AST | XML vs 8456ec3c |
| --- | --- | --- | --- | --- | --- |
| `a⏎b` | 0 | 1 | `{"expr.stopped":1}` | MATCH | IDENTICAL |
| `2⏎3` | 0 | 1 | `{"expr.stopped":1}` | MATCH | IDENTICAL |

- 目标 case 记为 **neg**（`R2-C2-01`），期望 `declined>=1` + AST MATCH + `XML==baseline` + `expr.stopped`；
- 它**不是**「待修 bug」：根表达式壳在 EOF 才收口，`endIndex` 覆盖两条语句，session 只能显式 Decline 让旧路径恢复；
- R3 若把跨行 ASI 直建化，则本行改为 pos（`built=2 declined=0`），期望 AST 是两条 `ExpressionStatement`。

### 14.5 泛型实参守卫（A3 的配套负例）

A3 覆盖调用后，`f<T>(1)` 会被建成 `f < T > (1)`（`built=1 declined=0`，AST NO）——基线靠「调用未覆盖」侥幸正确，
所以这是 **R2 引入的回归**，已由 `27ac618e` 用 `AngleDepth` / `PrevAngleClose` 改成显式 Decline：

| 输入 | built | declined | AST | 期望 |
| --- | --- | --- | --- | --- |
| `f<T>(1)` / `f<string, number>(1)` / `a<b>(c)` / `new A<T>()` / `f<A<B>>(1)` | 0 | 1 | MATCH | neg（`GEN` 组 5 条） |
| `x<y>z` / `a<b>c` / `a<<b>(c)` | 1 | 0 | MATCH | pos（对照，证明比较链未被误伤） |

### 14.6 D7 基线历史缺陷（**不列入目标 case**）

以下输入在 8456ec3c 上**本来就是坏的**（AST 与 tsc 不一致），直建前后 **XML 逐字节一致**，
所以它们不是本轮回归，也不能写成目标 case（那等于要求 R2 顺手修旧路径的历史缺陷）：

| 输入 | built | declined | AST-MATCH | XML vs 8456ec3c | 分类 |
| --- | --- | --- | --- | --- | --- |
| `let x = a⏎++b` | 0 | 2 | **NO** | **IDENTICAL** | `var.stopped ×2` |
| `let x = a⏎!b` | 0 | 2 | **NO** | **IDENTICAL** | `var.stopped ×2` |
| `let x = a + b⏎++c` | 0 | 2 | **NO** | **IDENTICAL** | `var.stopped ×2` |
| `let x = a + b⏎--c` | 0 | 2 | **NO** | **IDENTICAL** | `var.stopped ×2` |

- 与 `REPORT-r2-harden §7` / `REPORT-r2-merge-code §4.1` 的记录逐项一致；
- 归属：**8456ec3c 的历史缺陷**，属 R3 的语句边界工作；本轮只保证「不因直建而变坏（XML 一致）」。
