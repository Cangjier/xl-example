# 候选直建（direct candidate pipeline）——目标、实现与实测

> 本文记录 `feature/all-possible` @ `cdceb9ec`（`merge(direct-wire)`）上**已经落地**的直建实现：
> 变量语句、表达式语句、以及它们共享的表达式引擎。所有口径以仓库里的 `*.xl.md` 与 `build/ts` 实测为准，
> 不是设计稿的复述；设计稿与实现不一致的地方单独记在 §13。
>
> 配套阅读：`docs/statement-ast-pipeline.md`（同一事件链的旧路径版本；已覆盖构造在该文里改标为直建）。
> 设计背景：`_coord/DESIGN-all-possible.md`、`_coord/CONTRACT.md`、`_coord/DECISIONS.md`。
>
> 本轮验证口径（用户明确要求）：**只跑目标 case**，不跑 `tests/gates`、全量 `ast-json`（6171）、
> `coverage` / `sweep`、`samples`。构建成功（`xl_build` 0 error + `tsc` exit 0）是前提，不算验收。

---

## 0. 一句话版本

```
basic token Close
  └─ 只问直接父单元 → 壳 StatementShape.ComputePossibleShapes          （H1）
        ├─ DirectSession.Ingest(shell.Data)   ← 新单元逐格喂给 session
        └─ super.ComputePossibleShapes        ← 仍然只问 StatementEndPossibleShape（边界不变）

壳收口（`;` / ASI、EOF、块里的 `}` 三条触发，全部汇到 BuildFromShell）
  └─ BuildFromShell(host, endIndex, context)                        （H2）
        ├─ 有 session 且未 Decline → session.Finish(endIndex)
        │     ├─ 成功返回已闭合形状 → host.Data.splice(0, consumed.length) → return
        │     └─ 返回 null（不完整）→ 落回旧路径
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

### 1.2 覆盖范围（本轮）

| 构造 | 直建节点 | 说明 |
| --- | --- | --- |
| `let` / `const` / `var` 变量语句 | `VariableStatementShape` → `VariableDeclarationListShape` → `VariableDeclarationShape` | 关键字不是节点 |
| 多声明 `let a=1,b=2` | list 下多个 declaration | `,` 不进 `Data`，与 TS `forEachChild` 一致 |
| 无初始化 `let x` / `var z` | declaration 只有 `IdentifierShape` | ASI 收口 |
| 变量名 | `IdentifierShape` | 解构 binding（`[]`/`{}`）→ Decline |
| 数值字面量 | `NumericLiteralShape` | 复用 `NumericLiteralShape.FromBasicToken` |
| 标识符操作数 | `IdentifierShape` | 复用 `IdentifierShape.FromBasicToken` |
| 二元运算（`OperatorTable` 全表） | `BinaryExpressionShape`，`Data=[left, opToken, right]` | `+ - * / % ** << >> >>> < > <= >= == != === !== & ^ | && || ?? instanceof in` |
| 一元前缀 `! ~ + - ++ --` | `PrefixUnaryExpressionShape`，`Data=[operand]` | 运算符 token 只做 `OperatorToken` 字段，不进 `Data` |
| 一元后缀 `++ --` | `PostfixUnaryExpressionShape`，`Data=[operand]` | 同上 |
| 括号 `(expr)` | `ParenthesizedExpressionShape`，`Data=[inner]` | 区间含两侧括号；括号 token 不进 `Data` |
| 表达式语句 | `ExpressionStatementShape`，`Data=[expr]`、`Expression=expr` | `;` 不是子节点，`end` 含 `;` |

### 1.3 覆盖范围外（本轮保留旧路径）

字符串 / 模板 / 正则 / BigInt、数组 / 对象字面量、成员访问 `.` / `?.`、调用 `()`、下标 `[]`、`new`、
箭头 / 函数 / 类表达式、条件 `?:`、赋值 `=` / 复合赋值、`as` / `satisfies`、`typeof` / `void` / `delete`、
解构 binding、类型注解 `:`、确定赋值断言 `!`、`declare` / `using`、`@装饰器`、`const enum`；
以及所有非变量 / 非表达式语句族（`if` / `for` / `while` / `do` / `switch` / `try` / `return` / `throw` /
`break` / `continue` / label / block / `function` / `class` / `interface` / `type` / `enum` / `namespace` /
`import` / `export`）。

覆盖范围外**不是静默 fallback**：session 显式 `Decline(reason)` + 计数（`DirectBuildMetrics.Declined`）+
`LastDeclineReason`；`Strict` 时先 `StrictViolations++` 再抛（D1）。范围外语句族内部如果出现变量 / 表达式语句，
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
  const directBuilt = direct.Finish(endIndex, context);
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
- **直建成功时 builder 一次都不创建**。这是 D3，也是 A6 的判据来源。

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
| Head | 其它 | `Decline("范围外变量语句头: …")` | — |
| Binding | `Bracket`（`[` / `{`） | `Decline("解构绑定属范围外")` | — |
| Binding | 非 `Common` | `Decline("变量绑定不是标识符")` | — |
| Binding | `Common` 且是保留字 | `Decline("变量绑定是保留字: …")` | — |
| Binding | `Common` 合法标识符 | `IdentifierShape.FromBasicToken` + `Pos=unitPos`；建 `VariableDeclarationShape`（`Pos=name.Pos`、`SignIn(name.Start)`） | EqualOrSep |
| EqualOrSep | `Symbol` `=` | 建 `DirectExpressionEngine`，`BasePos` = `=` 的 `EndIndex` | Initializer |
| EqualOrSep | `Symbol` `,` | 无初始化收口当前 declaration； | Binding |
| EqualOrSep | `Symbol` `;` | 无初始化收口当前 declaration； | Done |
| EqualOrSep | `Symbol` `:` / `!` | `Decline("变量声明的类型注解 / 确定赋值断言属范围外")` | — |
| EqualOrSep | 其它 | `StoppedAt = at`（可能是下一条语句） | 停 |
| Initializer | `Symbol` `;` / `,` | `engine.Finish()` → declaration.Add(expr)、`SignOut(expr.End)`、`TryToClose`；`;` → Done，`,` → Binding | — |
| Initializer | 其它 | `engine.IngestUnit(unit, unitPos)`；engine `Declined` → session `Decline("初始化表达式范围外: …")`；engine `Held` → `StoppedAt = at` | Initializer / 停 |
| Sep | `Symbol` `;` | — | Done |
| Sep | `Symbol` `,` | — | Binding |
| Sep | 其它 | `StoppedAt = at` | 停 |

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
  2. `StoppedAt` 落在语句区间内 → Decline；否则正常收口；
  3. `Engine.Finish()` null → `Incomplete("表达式不完整: …")`；
  4. 建 `ExpressionStatementShape`：`Expression=expr`、`Add(expr)`、`Pos=BasePos`、
     `SignIn(首个代码单元.StartIndex)`、`SignOut(Units[endIndex].EndIndex)`（含 `;`）；
  5. `Finished=true`、`StatementsBuilt += 1`。

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
| `Prefixes` | 已建、还没挂操作数的前缀栈 |
| `PendingOperand` | 已建好、还没决定挂给谁的操作数（后缀比前缀绑得紧，见下） |
| `PreviousEnd` | 上一个非 trivia 单元的 `EndIndex` |
| `Inserts` | 二元插入 / 旋转次数 |
| `Held` / `HeldAt` | 接不上的单元：不 Decline，先停 |
| `Declined` / `Reason` | 范围外构造：显式放弃（不抛） |
| `LayerEnded` | 本层结束符之后不再消费 |

`IngestAll(units)` 的循环条件：`Ingested < units.length && !Declined && !Held && !LayerEnded`；
每个非 trivia 单元的 `pos = PreviousEnd < 0 ? BasePos : PreviousEnd`（与 `ExpressionBuilder.Load` 同口径），
然后 `PreviousEnd = unit.EndIndex`，再 `IngestUnit(unit, pos)`。

### 5.2 操作数位置（`ExpectOperand`）

- `Common` 且 `StartsNumber(text)`：必须是 `common.IsNumber()`（BigInt / 数值后缀 → Decline）；
  建 `NumericLiteralShape.FromBasicToken`、`Pos = pos` → `PendingOperand`，转 `ExpectOperator`。
- `Common` 且 `IsIdentifierOperand`：建 `IdentifierShape.FromBasicToken`、`Pos = pos` → `PendingOperand`。
  `true/false/null/this/super/typeof/void/delete/new/function/class/await/yield/import/…` 一律 false（显式集合在
  `direct-token-util.xl.md`，全仓只此一处）。
- `Common` 其它 → `Fail("字面量 / 关键字不在本轮范围: …")`。
- `Bracket` 且 `(`：**嵌套引擎**（§5.6）。
- `Bracket` 其它 → `Fail("数组 / 对象字面量不在本轮范围")`。
- `Symbol` 且文本 ∈ {`!`, `~`, `+`, `-`, `++`, `--`} **且** `OperatorTable.IsPrefixOperator(text)`：
  建 `PrefixUnaryExpressionShape`、`SignIn(运算符.StartIndex)`、`Pos = pos`、`OperatorToken = unit`（字段），
  压 `Prefixes`；**不立刻包操作数**（`-a++` 必须是 `-(a++)`）。
- 其它符号 → `Fail("操作数位置上的符号不在本轮范围: …")`。

### 5.3 运算符位置（`ExpectOperator`）

- `Symbol` `++` / `--`：`IngestPostfix`——替换 `PendingOperand` 为 `PostfixUnaryExpressionShape`
  （`Data=[operand]`、`Pos=operand.Pos`、`SignIn(operand.StartIndex)`、`SignOut(unit.EndIndex)`、
  `OperatorToken` 字段、`TryToClose`）。
- `Symbol` 二元运算符：`IngestBinary` = `FlushOperand()` + `PushOperator(...)`。
- `Symbol` `,` / `;` / `)` / `]` / `}`：**本层结束符** → `EndLayer()` = `FlushOperand` + `CompleteAllFrames` +
  `LayerEnded=true`，不 Held、不 Fail（所以 session 把 `;` / `,` 喂进来是安全的，虽然两个 session 通常自己先拦）。
- `Symbol` 其它 → `Fail("表达式运算符不在本轮范围: …")`（`.`, `?`, `=`, `=>`, `as` 等）。
- `Common` 且二元（`instanceof` / `in`）：`IngestBinary`。
- `Common` `as`：`Fail("类型断言不在本轮范围: as")`。
- `Common` 其它：**`Hold()`**（可能是下一条语句首单元 / ASI leftover）。
- `Bracket`：操作数后的 `(` / `[` / `{` 只能是调用 / 下标 / 块 → `Fail("调用 / 下标不在本轮范围")`。
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
括号内出现 `,`（逗号表达式 / 参数表）会因 `EndLayer` 后根不唯一而在 `Finish` 失败 → Decline。

### 5.7 失败的处置

| 情形 | 动作 | 计数 | 后续 |
| --- | --- | --- | --- |
| 范围外构造 | `Fail(reason)`：`Declined=true`、`Reason=reason`、trace `engine-decline: …`，**不抛** | session 的 `Decline` 统一 `Declined++` | `Finish` 返回 null |
| 表达式不完整（`Finish` 失败） | `Fail("二元运算符缺少右操作数" / "表达式没有闭合" / "表达式没有唯一的根节点")` | 由 session 定性：变量初始化不完整 → `Decline`（`Declined++`）；表达式语句不完整 → `Incomplete`（`IncompleteFallback++`） | 旧路径 |
| 接不上的单元（可能是下一条语句） | `Hold()`：`Held=true`、`HeldAt=该单元下标`，停止消费 | **不计任何数** | 由 session 记 `StoppedAt`，`Finish(endIndex)` 判是否在语句区间内 |

**`Held` 不是 Decline**：`a⏎b` 是合法 TS（两条语句），把它当 Decline 会把目标 case 的 `Declined==0` 弄成假红。

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

## 7. 范围外：显式 Decline + 计数

`Decline(reason)` 在两个 session 里是同一个协议（`direct-variable-session.xl.md` /
`direct-expression-session.xl.md`）：

```ts
if (this.Declined) return;
this.Declined = true;
this.Reason = reason;
DirectBuildMetrics.Declined += 1;
DirectBuildMetrics.LastDeclineReason = reason;
DirectBuildMetrics.Trace("… session decline: " + reason);
if (DirectBuildMetrics.Strict) {
  DirectBuildMetrics.StrictViolations += 1;
  throw new Error("DirectBuild strict: " + reason + " [" + this.Summary() + "]");
}
```

`Incomplete(reason)` 同构，但计 `IncompleteFallback += 1`（strict 下同样先计数再抛）。
**strict 的异常可能被上层 `TryToClose` / `ExitOrPre` 的 `try/catch` 吞成 `DetachShell`，所以判据永远是计数器，
不是「有没有抛异常」。**

本机实测（`SourceFileRunner.Parse` + `DirectBuildMetrics.Reset()`，`build/ts`）：

| 输入 | sessions | built | declined | incomplete | 说明 |
| --- | --- | --- | --- | --- | --- |
| `let x = f()` | 1 | 0 | 1 | 0 | `LastDeclineReason="初始化表达式范围外: 调用 / 下标不在本轮范围"` |
| `let x = "s"` | 1 | 0 | 1 | 0 | 字符串字面量：`操作数位置上的单元不在本轮范围` |
| `let x: number = 1` | 1 | 0 | 1 | 0 | 类型注解：`变量声明的类型注解 / 确定赋值断言属范围外` |
| `if (a) { let x = 1; }` | 1 | 1 | 0 | 0 | 外层 `if` 旧路径；内层 `let` 直建 |
| `function f() { return 1; }` | 0 | 0 | 0 | 0 | 覆盖范围外，不建 session |
| `a⏎b` / `2⏎3` | 1 | 0 | 1 | 0 | `语句内出现无法接续的单元 idx=2`（跨行 ASI，见 §11） |
| `a⏎f()` | 2 | 1 | 1 | 0 | 第一条 `a` 直建；第二条调用 Decline |
| `let x = 1 2` | 2 | 0 | 2 | 0 | 同一行两条无法接续；旧路径恢复 |

---

## 8. Metrics / trace / strict 与「直建被使用」的证据

### 8.1 `DirectBuildMetrics` 字段与计数归属

文件：`typescript/tokens/direct/direct-build-metrics.xl.md`（纯 static 类）。

| 字段 | 何时递增 | 归属 |
| --- | --- | --- |
| `Sessions` | `DirectBuildRouter.Create` 成功构造 session 后 | router（session 不重复计数） |
| `StatementsBuilt` | session 的 `Finish` 成功交回形状时 | 两个 session |
| `Declined` | session 的 `Decline(reason)` | 两个 session（引擎不计数，只 `Fail`） |
| `IncompleteFallback` | session 的 `Incomplete(reason)` | 两个 session |
| `Errors` | **本轮没有任何递增点** | 声明 / `Reset` 保留；恒 0（见 §11.7） |
| `StrictViolations` | `Decline` / `Incomplete` 且 `Strict` 时，**先加再抛** | 两个 session |
| `LastDeclineReason` | session 的 `Decline(reason)` | 两个 session |
| `LastError` | **本轮没有写入点** | 恒 `""`（只有 `Reset` 清零） |
| `Strict` / `TraceEnabled` | 外部（harness `--strict` / `--trace`） | `Reset` **不清**这两个 |
| `Traces` | `Trace(line)`，仅 `TraceEnabled`；环形 256 条，超了丢最早 | 引擎 / session / router |

`Reset()` 清计数与 `Traces`，保留 `Strict` / `TraceEnabled`。

### 8.2 trace 行格式

- 引擎：`insert(<op>) prec<N> owner=Holder|<类名>`、`engine-decline: <reason>`；
- 变量 session：`variable ingest head: let`、`variable ingest binding: x`、
  `variable close declaration (initialized|no initializer)`、`variable built: decls=N`、
  `variable session decline: …` / `variable session incomplete: …`；
- 表达式 session：`expression finish: endIndex=… ingested=… units=… stoppedAt=…`、
  `expression built: <类名>`、`expression held at idx=… units=…`、`expression session decline: …`。

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

构建（§10 的命令）：

```
xl_build: 548 written, 0 skipped, 0 planned, 0 error(s), 2485 warning(s)
tsc: exit 0
```

final 验收 `node tests/direct-build/target-cases.mjs --expect-direct --strict --trace`（exit 0）：

```
IMPL: state=wired metrics=present hooks=present router=present sessions=2
ASSERT: A1=PASS A2=PASS A3=PASS A4=PASS A5=PASS A6=PASS A7=PASS
DIRECT-TOTAL: builtCases=9/9 loads=0
CASES=9 FAILED=0 SKIPPED=1
```

默认模式 `node tests/direct-build/target-cases.mjs`（exit 0）：

```
IMPL: state=wired metrics=present hooks=present router=present sessions=2
DIRECT-TOTAL: builtCases=9/10 loads=3
CASES=10 FAILED=0 READING-FAIL=1
```

- 9 条正向：`built=1`（case 8 为 `built=2`）、`declined=0`、`incomplete=0`、`errors=0`、
  `strictViolations=0`、`loads=0`；
- 唯一 `READING-FAIL=1` 与 `loads=3` 来自反例 `let x = f()`：它 Decline 后走旧路径，`effectiveLoads=3` 是
  **设计行为**；`--expect-direct` 下该条整体 SKIP。默认模式把它计入 reading-pass 是 harness 的口径细节，不是失败。

---

## 9. 目标 case 与实测读数

10 条（第 10 条是反例，CONTRACT §6 / DECISIONS D4）。实测环境：本克隆 `docs/direct-pipeline`，
构建 `0 error` + `tsc` exit 0，harness 从 `feat-all-possible-verify` @ `79d32efe` 只读拷入。

| # | 源码 | 期望 | 实测（`--expect-direct --strict --trace`） |
| --- | --- | --- | --- |
| 1 | `let x = 2*3+1` | 正向 | `built=1 declined=0`，`stmtLoads=0 / exprLoads=2 (tokenUtil=2, legacy=0)`，A7 `insert(*) prec14` |
| 2 | `let x = 1;` | 正向 | `built=1 declined=0`，`exprLoads=0`，A7 SKIP（无二元） |
| 3 | `const a = 2*3;` | 正向 | `built=1 declined=0`，`exprLoads=1 (tokenUtil=1)`，A7 PASS |
| 4 | `2*3+1` | 正向（表达式语句） | `built=1 declined=0`，`exprLoads=2 (tokenUtil=2)`，A7 PASS |
| 5 | `let a=1,b=2` | 正向（多声明） | `built=1 declined=0`，`exprLoads=0`，A7 SKIP |
| 6 | `2*(3+1)` | 正向（括号） | `built=1 declined=0`，`exprLoads=2 (tokenUtil=2)`，A7 PASS |
| 7 | `-a*+b` | 正向（一元 / 优先级） | `built=1 declined=0`，`exprLoads=1 (tokenUtil=1)`，A7 PASS |
| 8 | `let x = 2*3+1; let y=4*5+6;` | 正向（两条语句） | `built=2 declined=0`，`exprLoads=4 (tokenUtil=4)`，A7 PASS |
| 9 | `let x = 1`（ASI） | 正向（无分号） | `built=1 declined=0`，`exprLoads=0`，A7 SKIP |
| 10 | `let x = f()` | **反例**：范围外 | 默认模式 `built=0 declined=1`、AST MATCH；`--expect-direct` 下 SKIP |

正向 9 条的 AST（`cjAst(root.Data)`）与 TS（`sf.statements.map(tsAst)`）**逐字段一致**；
XML 两次解析逐字节一致；根下节点数 == TS 顶层语句数。
`--strict` 下计数器仍全 0（strict 异常没有吞出假绿）。

---

## 10. 复跑命令（本克隆实测可跑）

```powershell
$clone = "C:\Users\Admin\Documents\GitHub\xl-example-set\docs-direct-pipeline"
cd $clone

# 0) 构建：xl_build 是会话工具，不是 shell 命令
#    xl_build(cwd=$clone, paths=["core","typescript"], targets=["ts"], out="dist", orphans=false)
#    实测：548 written, 0 skipped, 0 planned, 0 error(s), 2485 warning(s)
#    （warning 全部是既有 W3102/W3103；orphans:false 关掉 dist 历史残留的 E2004 噪音）
node node_modules/typescript/bin/tsc -p tsconfig.json        # 实测 exit 0

# 1) harness 一次性只读拷入（本分支不提交 tests/direct-build）
New-Item -ItemType Directory -Force tests\direct-build | Out-Null
Copy-Item C:\Users\Admin\Documents\GitHub\xl-example-set\feat-all-possible-verify\tests\direct-build\target-cases.mjs tests\direct-build\

# 2) 默认 10 条（反例期望 Declined>=1）
node tests/direct-build/target-cases.mjs
#    实测 exit 0；CASES=10 FAILED=0 READING-FAIL=1；builtCases=9/10 loads=3

# 3) final 验收（A4/A6 强制、A5 strict、A7 trace；反例自动 SKIP）
node tests/direct-build/target-cases.mjs --expect-direct --strict --trace
#    实测 exit 0；CASES=9 FAILED=0 SKIPPED=1；builtCases=9/9 loads=0
#    IMPL: state=wired metrics=present hooks=present router=present sessions=2
#    ASSERT: A1=PASS A2=PASS A3=PASS A4=PASS A5=PASS A6=PASS A7=PASS

# 4) 机器可读证据（可选）
node tests/direct-build/target-cases.mjs --expect-direct --strict --trace --json > target-cases-final.json
#    注意：PowerShell 5.1 的 > 写 UTF-16LE；要给 node 解析请改用
#    [IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))

# 5) 收尾：harness 不提交
Remove-Item -Recurse -Force tests\direct-build
git clean -fd tests\direct-build
```

**不跑**（本轮口径，见 `_coord/TARGET-CASES.md` §6）：`tests/gates/run.mjs`、`samples/check.mjs`、
`typescript/cases/ast-json.mjs` / `ast-json-diff.mjs`（全量 6171）、`tests/coverage/*`、
`tests/statement-possible/harness.mjs` 全量。这些数字不能引用为本轮验收。

---

## 11. 已知限制

1. **表达式语句跨行 ASI `a⏎b` / `2⏎3` 仍 Decline 走旧路径。** 根表达式壳在 EOF 才收口，传入的
   `endIndex` 覆盖两条语句；session 按 §4.6 规则显式 `Decline("语句内出现无法接续的单元 idx=2")`，
   旧路径 Detach 后恢复，AST 仍与 TS 一致（实测 `declined=1`、AST MATCH）。不在 10 条目标 case 内；
   若要把它们算进覆盖范围，需要调整壳 / 边界 hook，而不是让 session 自己判界（DESIGN §5）。
2. **`a⏎f()` 是「一正一反」**：第一条 `a` 直建成功，第二条调用 Decline。计数上是 `built=1 declined=1`，
   不要把它误读成整条输入被直建接住。
3. **跨行 `++` / `--` 没有行终止符守卫，会产出与 TS 不同的 AST**：`a⏎++b` 实测
   `AST-MATCH(ts): NO`——引擎在 `ExpectOperator` 把 `++` 当后缀，得到 `(a++)` + `(++b)`；TS 是 `a; ++b;`。
   旧 `StatementOperatorBody` 有 `LineTerminator.HasBetween` 守卫，引擎本轮没有搬。这条**不是 Decline**，
   直建会「成功」交回错误结构；目标 case 不涉及，扩展轮次必须在 `IngestPostfix` 前补同一条行终止符判据。
4. **只做数值字面量**（D2）：字符串 / 模板 / 正则 / BigInt / 布尔 / `null` / `this` / `super` 等一律 Decline。
5. **A6 不是字面 `exprLoads == 0`**：`DirectTokenUtil.OperatorToken` 每个二元运算符一次
   `ExpressionBuilder.Load`（§8.3）；验收口径是 `stmtLoads==0 && exprLegacy==0`。
6. **括号内的逗号**（`(a, b)`、参数表）→ 内层 `EndLayer` 后根不唯一 → Decline。
7. **`Errors` 计数器没有递增点**：本轮只有声明 / `Reset`，恒为 0。不要把它当「运行期异常数为 0」的证据；
   真正的异常路径是 session 的 `Decline` / `Incomplete` 与 strict 计数。
8. **`++a++` / `a++++`**：按 TS 结构建 `Prefix(Postfix(...))` / `Postfix(Postfix(...))`（与旧 builder 的
   `InsertionPoint` 行为一致），没有按「非法输入」Decline；AST 对拍口径优先。
9. **范围外语句族内部**仍可能出现被直建的内层语句（`if (a) { let x = 1; }`），这是预期：
   直建按「构造」生效，不按「外层族」生效。
10. **session 不判边界**：`let x = 1 2` 这类同一行无法接续的输入会 Decline 并回旧路径，
    由旧路径给出与直建前相同的错误 / 恢复行为。

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
`OperatorBody` 在覆盖构造上仍会被 H1 后面的 `IngestAll` 喂（既有行为），但直建**不读它**，
也不把它的产物转成 AST。

---

## 13. 与设计文档 / 实现不一致的地方（读代码时注意）

以下是本轮落地时与 `_coord/DESIGN-all-possible.md` / `CONTRACT.md` 文字有出入、但**以代码为准**的点：

1. **二元 `end` 的封口时机**：DESIGN §4.4 写「右操作数挂上时 `SignOut`」，实际在 `CompleteTop()` 出栈时按
   「最后一个子节点的 EndIndex」封（`direct-expression-engine.xl.md` 的 `CompleteTop`）。原因：右操作数可能
   继续长成更高优先级 / 右结合的子树（`a+b*c`、`a**b**c`），挂上就封会把外层 `end` 封早，而 `SignOut` 只能
   赋值一次。实测 `2*3+1` 的 `*` end=11、`+` end=13 均正确。
2. **引擎没有 `Blocked` 状态**：DESIGN §4.3 列了 `0 ExpectOperand / 1 ExpectOperator / 2 Blocked`；实现用
   `Declined` / `Held` / `LayerEnded` 三个布尔表达「停」，`Expect` 只有 1 / 2。
3. **前缀判据是「集合 ∩ `OperatorTable.IsPrefixOperator`」**：DESIGN 只写了 `IsPrefixOperator`；
   实现同时要求文本 ∈ {`!`,`~`,`+`,`-`,`++`,`--`}，`typeof` / `void` / `delete` 不走前缀。
4. **变量 list / statement 的 `Pos`**：DESIGN §4.2 写 `list.Pos = keywordUnitPos`；实现统一用 `BasePos`
   （= `shell.Pos`），statement 也用 `BasePos`。在文件首 / 常规位置两者相同，块内首条语句的 `BasePos`
   按建壳口径已含前导 trivia。
5. **`ExpectSep` 的 `Held` 实现**：DESIGN 写「变量 session 在 ExpectSep 看到 `let`：Held」；实现是
   `IngestSep` 对任何接不上的单元一律 `StoppedAt = at`（不叫 Held），由 `Finish` 判区间。
6. **`IncompleteFallback` 的计数点**：DECISIONS 附录原说 wire 时在 H2 加；实际落在两个 session 的
   `Incomplete(reason)` 里（`direct-variable-session.xl.md`、`direct-expression-session.xl.md`），H2 没有加。
   **不要在两处都加**，否则不完整时会计两次。
7. **`Errors` 无递增点**（§11.7）；DESIGN §6.2 把它列进「必须 0」的计数器，本轮它恒 0，不能作为证据。
