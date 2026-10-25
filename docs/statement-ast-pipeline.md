# 语句 → AST 全流程：以 `let x = 1;` 为案例

> 本文只回答一件事：**一条语句从源码字符到 AST 节点，在现行代码里到底经过哪些步骤、每一步由谁负责、数据长什么样**。
> 所有代码位置以 `*.xl.md` 为准；文中的 trace 都是在本仓 `build/ts` 产物上实测得到的（复跑方式见 §11）。
>
> 案例源码：`let x = 1;`（紧跟第二句 `let y = 2;`，用来展示「语句在文件中段如何收口」；文件末尾只有一句时的差异见 §7.2）。
>
> **2026-10-25 更新（`feature/all-possible` @ `cdceb9ec`）**：变量语句与表达式语句已由**候选直建**接管
> （`typescript/tokens/direct/*`），覆盖构造不再走本文 §6.3–§6.4 的事后 Build 路径。本文已把
> §0 / §4.4 / §6.1 / §6.3 / §6.4 / §6.7 / §10 的已覆盖部分改写为直建流程；**未覆盖语句族仍按原文走旧路径**。
> 直建的目标、hook、状态机、优先级旋转算法与实测读数见 `docs/direct-candidate-pipeline.md`。

---

## 0. 一句话版本

```
字符流
  └─(SyntaxContext 驱动 128 字符窗口)→ basic token（Common / Symbol / WrapSymbol / Bracket / String …）
        └─(basic token Close 时只问父单元)→ CatalogGuide 判定候选
              ├─ 根目录：17 个语句候选 + 1 个终结候选
              └─ 命中 let/const/var + 绑定 → VariableStatementPossibleShape.Accept
                    └─ BuildByIndex：搬走已攒单元，建一个 StatementShape「语句壳」，挂到根上
                          ├─ H3：建 DirectSession 并喂一次已有的 Data（变量；表达式壳在晚建分支前建）
                          └─(壳里的每个 basic token Close)→ 壳的 ComputePossibleShapes
                                ├─ H1：DirectSession.Ingest(shell.Data) —— 逐格直建 AST 形状
                                └─ 壳的终结候选 StatementEndPossibleShape（边界判据不变）
                                      └─ 在 `;` / ASI / EOF / `}` 上 Accept → BuildFromShell
                                            ├─ H2（直建，覆盖构造）：session.Finish(endIndex)
                                            │     └─ 成功 → host.Data.splice + return 已建好的形状
                                            │           （**不 new StatementBuilder**）
                                            └─ 旧路径（Decline / 范围外）：
                                                  ├─ VariableStatementThreeLayer.TryBuild（三层 possible 判型）
                                                  └─ StatementBuilder.BuildStatement / BuildVariableStatement
                                                        └─ IdentifierShape + NumericLiteralShape + 声明/列表/语句节点
                                                              └─ 关闭后的形状树 = AST（cjAst / ToXmlString 直接读它）
```

两条路都产出同一棵「关闭后的形状树」：直建是**逐 token 增量**建，旧路径是**收口时整段重扫**建；
边界、壳替换、leftover 重放、`Pos` 口径两边完全一致（详见 `docs/direct-candidate-pipeline.md`）。

关键认识有四条：

1. **AST 不是另建的一棵树**。`StatementBuilder` / 直建 session 建出来的都是 `ShapeToken` 子类节点
   （`VariableStatementShape`、`IdentifierShape`、`BinaryExpressionShape` …），关闭即 AST；`cjAst` 只是把
   `constructor.name` 去掉 `Shape` 后缀，`ToXmlString` 用同一个类名当 XML 标签。见
   `typescript/cases/ast-compare.mjs:106` 与 `core/syntax/token.xl.md:353`。
2. **语句的「边界」与「建树」是两件事，分两步发生**：possible 层只决定「从哪里开始、到哪里结束、归哪个族」；
   建树层只做「给定一段连续 raw 单元（旧路径）或逐格单元（直建），原子地建出节点」。
3. **判定和建壳是同一份状态的两个读者**：`ComputeByIndex` 把扫描进度写进 `PossibleShapeCache`，`BuildByIndex`
   必须复用同一份 cache（`typescript/IMPORTANCE.md` §3.4），否则会出现「判到 A 格、建到 B 格」的错位。
4. **直建挂在壳上，不进候选目录**：`DirectSession` 不是 `PossibleShape`，只在 `StatementShape` 的
   `ComputePossibleShapes`（H1）与 `BuildFromShell`（H2）两个既有入口上各加一句；边界判据仍只有
   `StatementBoundaryUtil` 一份。

---

## 1. 角色与文件

| 角色 | 位置 | 职责 |
| --- | --- | --- |
| 驱动 | `core/syntax/syntax-context.xl.md` | 按 128 字符窗口调 `Root.Process`；维护绝对游标 `Index` 与 `ReloadMessage` 队列 |
| 根单元 | `typescript/tokens/files/source-file-shape.xl.md` | 持有根 `CatalogGuide`；EOF 路径先关挂载单元、再加 EOF 哨兵 |
| 通用单元 | `core/syntax/unit-token.xl.md` | 一帧的调度顺序：挂载单元 → `ExitOrPre` → 跳转队列 → `Default`；`Reload` 时压消息返回 |
| basic token | `core/syntax/basic-tokens/*.xl.md` | 承接字符；`Close` 时**只问直接父单元**要不要重算候选 |
| 形状候选 | `core/syntax/possible-shape.xl.md` | `ComputeByIndex` 判前缀、`BuildByIndex` 建形状；状态放 cache |
| 导 向 | `core/syntax/catalog-guide.xl.md` | 淘汰候选、终结候选 Accept、唯一候选 Build、`Reset` |
| 语句候选 | `typescript/tokens/statements/*-possible-shape.xl.md` | 根目录 17 个候选（`source-file-shape.xl.md:134`） |
| 终结候选 | `typescript/tokens/statements/statement-end-possible-shape.xl.md` | 回答「这条语句到这一格该结束了吗」 |
| 语句壳 | `typescript/tokens/statements/statement-shape.xl.md` | 收口后决定「形状树建 AST / 三层 possible / 族分派 / legacy 兜底」 |
| 建树器（旧路径） | `typescript/tokens/statements/statement-builder.xl.md`、`typescript/tokens/expressions/expression-builder.xl.md` | 从无 trivia 的 `Units` + `Positions` 原子建节点；**只服务 Decline / 范围外** |
| 直建契约 | `typescript/tokens/direct/direct-build-session.xl.md`、`direct-build-metrics.xl.md` | `DirectSession` 接口（`Ingest` / `Finish`）与计数 / strict / trace 出口 |
| 直建注册 | `typescript/tokens/direct/direct-build-router.xl.md`、`direct-build-plugins.xl.md` | 按 `StatementRoute` kind 建 session；`plugins` 是唯一注册点（`ShellVariable` / `ShellPlainExpression`） |
| 直建建树 | `typescript/tokens/direct/direct-variable-session.xl.md`、`direct-expression-session.xl.md`、`direct-expression-engine.xl.md`、`direct-token-util.xl.md` | 变量语句 / 表达式语句状态机 + 增量表达式引擎（优先级旋转、括号嵌套、一元） |
| AST 投影 | `typescript/cases/ast-compare.mjs:106`、`core/syntax/token.xl.md:353` | `cjAst` 与 `ToXmlString` 读同一棵已关闭形状树 |

区间口径（现行实现，以此为准）：

- `SourceRange` 是**半开** `[Start, End)`，`End` = 最后字符下标 +1（`core/syntax/source-range.xl.md:9`、`core/syntax/token.xl.md:214`）。
- 形状另有 `Pos`：**含前导 trivia**，取「前一个非 trivia 单元的 `EndIndex`」，文件首为 `0`（`core/syntax/shape-token.xl.md:19`）。
- AST 的 `pos` = `shape.Pos`，`end` = `shape.SourceRange.EndIndex`，**不再 +1/-1**（`typescript/cases/ast-compare.mjs:108`、`typescript/ast/ast-node.xl.md:19`）。
- 注意：`typescript/IMPORTANCE.md` §4 仍写「shape 闭区间、AST 换算 +1」，与上面三份现行实现不一致，以实现为准。

---

## 2. 案例的 token 序列

源码（0 基下标）：

```
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20
l e t   x   =   1 ;  ␠  l  e  t     y     =     2  ;
```

第一句被建壳时，根单元 `Data` 里攒到 `x` 为止的内容（实测，`WrapSymbol` 是空白 trivia）：

| Data 下标 | 源码区间 | 单元 | 类型 | 说明 |
| --- | --- | --- | --- | --- |
| 0 | `[0,3)` | `let` | `Common` | 标识符/关键字块 |
| 1 | `[3,4)` | `" "` | `WrapSymbol` | trivia；`Close` **不问**父单元（`wrap-symbol.xl.md:58`） |
| 2 | `[4,5)` | `x` | `Common` | 绑定名 |

建壳后，壳继续接住的单元（`;` 关闭那一刻）：

| 壳 Data 下标 | 源码区间 | 单元 | 说明 |
| --- | --- | --- | --- |
| 0 | `[0,3)` | `let` | 从根搬来 |
| 1 | `[3,4)` | `" "` | 从根搬来 |
| 2 | `[4,5)` | `x` | 从根搬来 |
| 3 | `[5,6)` | `" "` | 建壳瞬间被 **Reload 重放** 进壳的当前字符 |
| 4 | `[6,7)` | `=` | `Symbol` |
| 5 | `[7,8)` | `" "` | `WrapSymbol` |
| 6 | `[8,9)` | `1` | `Common` |
| 7 | `[9,10)` | `;` | `Symbol`，收口点 |

空白为什么必须有 token：它要让 `Data` 完整表达源码；但它只进 `Data`、不进任何形状字段（`wrap-symbol.xl.md:18`）。所以 `StatementBuilder.Load` 会把它过滤掉（见 §6.1）。

---

## 3. 阶段一：字符 → basic token

### 3.1 驱动

`SyntaxContext.Process`（`syntax-context.xl.md:133`）每轮取 `[Index, min(Index+128, count))` 交给 `Root.Process`，然后 `DrainMessages()`；一轮没有推进就抛「无进展」。文件跑完后：

1. `Root.SignOut(count)`；
2. 用空窗口 `[count,count)`（`IsEof`）再调一次根——**根单元的关闭由这条 EOF 路径驱动**；
3. 最后再抽一次消息队列。

### 3.2 一帧的调度

`UnitToken.Process`（`unit-token.xl.md:124`）逐字符：

1. 有 `MountedUnit` 就整个转交给它；它没推进游标就原样返回（不许死循环）。
2. 否则读一次当前字符，先问 `ExitOrPre`（形状自己拦字符），再依次跑 `ProcessQueue` 里的 basic 跳转，最后 `Default` 兜底。
3. `Done` 时统一补 `context.Index = index+1`；`Reload` 时把当前位置压进 `Messages` 并**返回整个窗口**，由驱动层重放。
4. 本单元已 `Quit` 或队列非空（且不是重放）时提前返回，把剩余窗口交回上层。

### 3.3 basic token 的收尾触发

- `Common.Transit`（`common.xl.md:617`）：能并进当前块就并；不能并就先 `last.TryToClose(context)`，**建出形状就返回 `Reload`**；否则开新块。
- `Symbol.Transit` / `Bracket.Transit` / `WrapSymbol.Transit` 同理。
- `Common.Close`（`common.xl.md:230`）：先 `Closed = true`，然后**只问直接父单元** `parent.ComputePossibleShapes(context)`；父单元返回 `Built` 就往上报告 `CloseStates.Built`。
- `WrapSymbol.Close`（`wrap-symbol.xl.md:58`）**不问父单元**：空白永远不是任何形状的收尾，问了只会让目录在一个判不出东西的下标上空转。

这就是整个解析的触发链：**字符 → basic token 收尾 → 父单元重算候选 → 可能建形状 → Reload 把当前字符重放进新单元**。

---

## 4. 阶段二：根目录判定（CatalogGuide）

### 4.1 根目录的构成

`SourceFileShape` 的构造器（`source-file-shape.xl.md:46`）：

```ts
this.CatalogGuide = new CatalogGuide(SourceFileShape.CreatePossibleShapes(), new SourceFileEndPossibleShape());
```

`CreatePossibleShapes()` 返回 17 个普通候选（`source-file-shape.xl.md:134`）：

| 位次 | 候选 | 族 |
| --- | --- | --- |
| 0 | `DeclarationStatementPossibleShape` | 声明族壳（`ControlFlowStatementPossibleShape` 的子类，路由 7） |
| 1 | `ImportDeclarationPossibleShape` | legacy 导入 |
| 2 | `ExportDeclarationPossibleShape` | legacy 导出 |
| 3 | `ImportEqualsDeclarationPossibleShape` | legacy |
| 4 | `ClassDeclarationPossibleShape` | legacy |
| 5 | `InterfaceDeclarationPossibleShape` | legacy |
| 6 | `ExportAssignmentPossibleShape` | legacy |
| 7 | `NamespaceExportDeclarationPossibleShape` | legacy |
| 8 | `FunctionDeclarationPossibleShape` | legacy |
| 9 | `EnumDeclarationPossibleShape` | legacy |
| 10 | `ModuleDeclarationPossibleShape` | legacy |
| 11 | `TypeAliasDeclarationPossibleShape` | legacy |
| 12 | **`VariableStatementPossibleShape`** | 变量语句壳 |
| 13 | `ControlFlowStatementPossibleShape` | 控制流壳 |
| 14 | `RootExpressionStatementPossibleShape` | 表达式壳 |
| 15 | `BlockPossibleShape` | 块 |
| 16 | `ExpressionStatementPossibleShape` | 表达式（legacy 目录也在用） |

终结候选单独一个：`SourceFileEndPossibleShape`（文件末尾/无壳语句的收尾）。

### 4.2 判定算法

`CatalogGuide.ComputePossibleShapesByIndex`（`catalog-guide.xl.md:77`）每次只做五步：

1. **形参校验**：`context` 必须是形参传进来的，否则当场抛——消息只能从这里挂进上下文。
2. **越界**：`host.Data[tokenIndex]` 不存在 → `Nothing`。
3. **淘汰**：还活着的候选逐个 `ComputeByIndex`；`Reject` 从 `Candidates` 里删掉（`PossibleShapes` 数组一个字不改）。
4. **终结候选**：`EndPossible` 判出 `Accept` 时
   - `Candidates.size === 0` → `BuildByIndex` 建它，`Reset`，返回 `Built`；
   - `Candidates.size > 0` → 抛「既像结束、又像还能长」。
5. **结果**：
   - 0 候选且无终结候选 → 抛；
   - 0 候选但有终结候选 → `Waiting`；
   - 多候选 → `Waiting`；
   - 恰好 1 个 → 先问 `IsBuildable`，`true` 才 `BuildByIndex`，`Reset`，返回 `Built`。

两条硬规则写死在实现里：

- **`Reject` 是永久的**（直到 `Reset`）。首格只有 trivia / 路由还没判出时**禁止 Reject**，否则整条语句从此没人接管。
- **接受与否只看个数**，不看出手顺序；同一格 `EndPossible` 与某个普通候选同时 Accept 直接抛错。互斥仪器 `harness --double-accept` 盯的就是这件事。

### 4.3 本案例的实测判定

对 `let x = 1; let y = 2;`，根宿主上的判定只有两格（其余字符都在壳里）：

| # | 宿主 | Data 下标 | 当前单元 | 存活候选 | 被淘汰 | 结果 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SourceFileShape` | 0 | `let` | `Declaration`/`Variable`/`ControlFlow`/`RootExpression`/`ExpressionStatement` 均 `Uncertain` | 其余 12 个 + `End` | `Waiting` |
| 2 | `SourceFileShape` | 2 | `x` | **`VariableStatementPossibleShape = Accept`** | `Declaration`/`ControlFlow`/`RootExpression`/`ExpressionStatement`/`End` | **`Built`**（建壳） |

为什么第 1 格 `Variable` 只是 `Uncertain`、第 2 格才 `Accept`？`VariableStatementPossibleShape.ComputeByIndex`（`variable-statement-possible-shape.xl.md:76`）要求「头是 `let/const/var`」且「下一代码单元能起绑定」；`StatementScanner.StartsBinding` 在只有 `let` 时还看不到绑定，于是 `Uncertain`（继续等），到 `x` 才 `Accept`。

为什么其他族做的是 `Reject` 而不是「先 Accept 再说」？`StatementRouteUtil.Decide`（`statement-route-util.xl.md:548`）是**全函数分流**：`let` 在第二格判出 `ShellVariable`（`DecideCommon`，`statement-route-util.xl.md:373`），于是声明族、控制流族、表达式族都主动 `Reject`。候选按族互斥靠的是判据，不是先后；否则 `CatalogGuide` 永远等不到唯一候选（AST 也许对，但语句永远建不出来）。

### 4.4 possible 的边界：`let` / `=` / `*` / `+` 都没有自己的候选

一句话：**possible 只负责「条目从哪开始、能长成哪个形状」；关键字与运算符是 basic token，语义在 builder / `OperatorTable` 里。**

| token | basic token | possible 层 | 谁真正处理 |
| --- | --- | --- | --- |
| `let` | `Common`（文本块） | 没有 `LetPossibleShape`。`VariableStatementPossibleShape` 只读 head 文本 + 下一格能否起绑定（`variable-statement-possible-shape.xl.md:24` / `:76`） | **直建**：`VariableStatementDirectSession` 在 `ExpectHead` 读文本 `let`/`const`/`var` 后进入绑定状态；**范围外**才走 `BuildStatement` 的 `let` + `StartsBinding` 分支（`statement-builder.xl.md:362`）。`LetKeywordShape` 只有类定义、全仓无引用——TS AST 里 `let` 本来也不是节点 |
| `=` | `Symbol` | 无 | **直建**：变量 session 的 `ExpectEqualOrSep` 见到 `=` 就建 `DirectExpressionEngine`（`BasePos` = `=` 的 `EndIndex`）；**范围外**（Decline 后）才是 `BuildVariableDeclarationList` 的 `IsSymbol("=")` 分支（`statement-builder.xl.md:1701`） |
| `*` / `+` | `Symbol` | 无 | 只有一张 `OperatorTable.Precedence`（`*`=14、`+`=13，`operator-table.xl.md:5`）。**直建**：`DirectExpressionEngine.PushOperator` 用优先级 + 结合性做 frame 栈插入 / 旋转，运算符形状由 `DirectTokenUtil.OperatorToken` 复用 `MakeOperatorToken` 产出（唯一的 `ExpressionBuilder.Load`，见直建文档 §8.3）。**范围外**：初始化器 `ExpressionBuilder.ParseBinary`（`expression-builder.xl.md:380`）、表达式语句 `StatementOperatorBody.PushBinary`（`statement-operator-body.xl.md:940`） |

`FeasOperandPossibleShape` / `FeasBinaryOperatorPossibleShape` / `FeasPrefixUnaryPossibleShape` 看起来像「运算符 possible」，但它们是**未接线的原型**：`BuildByIndex` 直接抛「原型由 `FeasOperatorParser` 增量建形状」，而 `FeasOperatorParser` 没有被任何语句/表达式路径实例化（全仓 grep 只在它自己的文件里出现）。真正的优先级只有 `OperatorTable` 一份。

为什么不做逐 token possible：

- `let` 是上下文关键字（`let = 1` / `let (a)` 里它是标识符），首格判死会永久 `Reject`，所以 `Decide` 在第二格判不出来时只能返回 `None`；
- 运算符在语法位置上没有歧义（`2 * 3` 中间只能是运算符），候选淘汰机制在这里没有信息可用；
- 优先级/结合性散进多个 possible 就会产生第二份优先级表。

直建同样**没有**为每个 token 做 possible：session / 引擎挂在壳上，见 §4.3 的 H1/H3；优先级只在
`OperatorTable`（旧路径）与 `DirectExpressionEngine`（直建路径）里各读同一张表，没有第三份。

**案例实测**：`let x = 2*3+1\nlet y=4*5+6`

壳的判定与 §6.7 完全同构：`x` 格建壳；终结候选在 `=`、`2`、`*`、`3`、`+`、`1` 上都 `Uncertain`；下一条语句的 `let` 到达那一格 `Accept`，`endIndex=10`（`1`，host.Data 下标）。

**旧路径对照**（只在 session Decline / 范围外时发生）：`BuildFromShell(endIndex=10)` → 三层 possible →
`BuildVariableStatement` → `BuildVariableDeclarationList` → `BuildExpressionRange(2*3+1)` → `ExpressionBuilder`：

```
ParseExpression → ParseAssign → ParseConditional → ParseBinary(4)
  2                     （ParseUnary）
  *  prec 14 ≥ 4        → 右操作数 ParseBinary(15)
    3                   → 内层 BinaryExpression(*)
  +  prec 13 < 15       → 内层收束；回到外层
  +  prec 13 ≥ 4        → 右操作数 ParseBinary(14)
    1                   → 外层 BinaryExpression(+)
```

**直建实际路径**（本案例走这条）：`let` / `x` / `=` / `2` / `*` / `3` / `+` / `1` 各自关闭时被 H1 喂进
`VariableStatementDirectSession`，`x` 当场建 `IdentifierShape`，`2*3` 在 `*` 关闭时建 `BinaryExpression(*)`，
`+` 关闭时按优先级把 `*` 收成左子、插入 `BinaryExpression(+)`；收口时 H2 的 `Finish` 直接交回
`VariableStatementShape`，**不创建 `StatementBuilder` / `ExpressionBuilder`（除 token 映射那一次 Load）**。
逐步树演化见 `docs/direct-candidate-pipeline.md` §5.5；trace 为
`insert(*) prec14 owner=Holder` → `insert(+) prec13 owner=Holder`。

AST（与 TS 逐字段一致，`equal: true`）：

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

两条语句分别是 `0/13` 与 `13/25`（第二条 `pos` 含换行）；`*`、`+` 是 AST 里的 token 节点，不是语句节点。

注意输入必须是「换行或 `;` 分隔」。同一行 `let x = 2*3+1 let y=4*5+6` 里 ASI 不成立（没有换行），第一条声明读到 `let` 时 `BuildFromShell` 抛「表达式没有读完」→ `DetachShell`，最终退成 raw token 形态（XML 里直接是 `<Common>let</Common>…`），不是合法程序。

---

## 5. 阶段三：建壳（StatementShape）

### 5.1 BuildByIndex 做了什么

第 2 格判定 `Built` 后，`VariableStatementPossibleShape.BuildByIndex`（`variable-statement-possible-shape.xl.md:137`）：

1. `start = ItemUtil.ItemStart(host.Data)`：**最后一个非 basic 单元之后**（`item-util.xl.md:11`）。首个条目为 0；上一条语句已经建成 `VariableStatementShape` 时，它就是「上一个 AST 节点下标 +1」，会把语句间空白也包进来。
2. `pos`：往前跳过 trivia，取前一个非 trivia 单元的 `EndIndex`；没有就 0。**这就是 AST 的 `pos`，含前导 trivia**。
3. `moved = host.Data.slice(start, tokenIndex+1)`，从根上 `splice` 走。
4. 新建 `StatementShape`；`shell.Pos = pos`；把 `moved` 逐个 `Add` 进壳；`shell.SignIn(moved[0].SourceRange.Start)`。
5. 给壳配一份**空候选目录 + 终结候选**：
   ```ts
   const endShape = new StatementEndPossibleShape();   // StatementKind = 0（None/变量族）
   shell.CatalogGuide = new CatalogGuide([], endShape);
   ```
6. `host.Data.splice(start, 0, shell)`；`shell.Parent = host`；`host.MountedUnit = shell`。

建壳后状态：

```
根.Data = [ StatementShape ]            // 壳占位，Data 之外仍是 raw 单元
壳.Data = [let] [␠] [x]                 // 3 个单元（x 已收尾）
壳.SourceRange = start 0 / end 未设置（-1）  → 未关闭
壳.Pos = 0
壳.CatalogGuide = { PossibleShapes: [], EndPossible: StatementEndPossibleShape }
```

注意两件事：

- **壳没有候选**。它已经知道自己是一条语句，不需要再猜族；它只需要回答「什么时候结束」。
- 建壳发生在 `x` 收尾的那一下，此时字符 `" "`（下标 5）还没被消费。`BuildByIndex` 返回后 `CatalogGuide` 向上报 `Built`，`Common.Transit` 返回 `Reload`，驱动层把下标 5 重放给新挂载的壳——这就是壳的第 4 个单元 `[5,6)` 的由来。

### 5.2 为什么是「壳」而不是直接建 AST

直接建 AST 需要同时知道「这条语句到哪结束」和「它归哪个族」；而这两件事在 `x` 这一格都还不完整（`;` 还没来、甚至可能是 ASI）。壳把这两个问题拆开：

- possible 层在**开始格**建壳；
- 终结候选在**结束格**收口；
- 收口时才把「从开头到结束」的 raw 段一次性交给建树器。

---

## 6. 阶段四、五：壳收口与建 AST

### 6.1 壳里的判定

壳本身是 `ShapeToken`，`ProcessQueue` 就是 basic 队列；每来一个 basic token 并收尾，父单元（壳）的 `ComputePossibleShapes` 就会调自己的目录。由于普通候选为空，`ComputePossibleShapesByIndex` 实际只问 `StatementEndPossibleShape`：

> **直建引入的 H1**：`StatementShape.ComputePossibleShapes` 现在首行是
> `if (this.DirectSession !== null) { this.DirectSession.Ingest(this.Data, context); }`，然后才跑既有的
> `OperatorBody.IngestAll` 与 `super.ComputePossibleShapes`。H1 **不改返回值、不建形状、不碰 CatalogGuide**，
> 所以本节下面的终结候选判定逐字节不变；直建只是在同一事件里顺手把节点建好。

```ts
// 节选：终结候选 Accept 且 0 个普通候选时
if (ended) { …EndPossible.BuildByIndex… }
if (Candidates.size === 0) return Waiting;   // 只有终结候选时，0 候选 = 继续等
```

`StatementEndPossibleShape.ComputeByIndex`（`statement-end-possible-shape.xl.md:39`）：

1. 当前单元是 EOF 哨兵 → 直接 `Accept`。
2. 用 `PossibleShapeCache` 里的 `StatementEndScan{Start, Checked, Status, End, Code, CodeAt}` **只追加**新单元（跳过 trivia），换条目才重建。
3. 计算 `StatementScanner.AtEOF`（宿主已签出，或当前单元之后文档里已无内容）。
4. 按 `StatementKind` 与首个代码单元选边界判据；变量壳 `StatementKind = 0`，首代码单元是 `let` → `StatementBoundaryUtil.ShortFamilyEndCode`。
5. 判出结束位置就 `Status = 1`，返回 `Accept`。

本案例的壳内实测：

| # | 宿主 | 壳.Data 下标 | 当前单元 | 终结候选 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 3 | `StatementShape` | 4 | `=` | `Uncertain` | `Waiting` |
| 4 | `StatementShape` | 6 | `1` | `Uncertain` | `Waiting` |
| 5 | `StatementShape` | 7 | `;` | **`Accept`** | **`Built`**（收口） |

第 5 格为什么是 `;` 收尾而不是更早？`;` 这个 `Symbol` 本身是在字符 `;` 到达时创建的；它要等到下一个字符（空格，下标 10）来「顶掉」它时才 `Close`。`Close` 触发壳目录 → 终结候选在 `;` 这一格 `Accept` → 0 个普通候选 → `EndPossible.BuildByIndex`。所以「`;` 是结束」这件事是在 `;` **关闭**时被确认的，不是它刚出现时。

`BuildByIndex`（`statement-end-possible-shape.xl.md:333`）不再重复猜：它从 `host.Data` 重新折出 `code / codeAt`，用与 `ComputeByIndex` **同一份**判据算出 `endIndex`，然后：

```ts
const built = StatementShape.BuildFromShell(host, endIndex, context);
StatementShape.FinishShell(host, built, context);
```

`ComputeByIndex` 与 `BuildByIndex` 必须同源，否则会出现「Accept 在第 7 格、建却从第 6 格截断」——这就是边界判据只有一份实现（`statement-boundary-util.xl.md`）的原因。

### 6.2 另外两条收口触发：EOF / `}`

`BuildFromShell` 一共有三条触发路径：

- **`;` / ASI 边界**：本文主路径——`;` 关闭时 `StatementEndPossibleShape.Accept`，`EndPossible.BuildByIndex` 收口（§6.1）。
- **文件在 `;` 后立刻结束**（`let x = 1;` 无后续字符）：没有下一个字符来关闭 `;`，于是 `SourceFileShape.Process` 的 EOF 路径先 `mounted.TryToClose(context)`（`source-file-shape.xl.md:101`）→ `StatementShape.TryToClose`（`statement-shape.xl.md:289`）自己算 `lastCode` / 族边界，直接 `BuildFromShell` + `FinishShell`。实测单句 `let x = 1;` 的 `BuildFromShell(endIndex=7, Kind=0, Pos=0)` 与两句版第一句完全一致。
- **块里的语句遇到 `}`**：`StatementShape.ExitOrPre`（`statement-shape.xl.md:249`）在父单元是 `{` 括号、当前字符是 `}` 时先收口，再 `Reload`，让 `}` 回到块层。

三条路，一个建树入口。

### 6.3 BuildFromShell：先直建（H2），再旧四路分派

`StatementShape.BuildFromShell`（`statement-shape.xl.md`）是所有收口路径的唯一入口。现在它先算
`consumed`，然后**先问直建 session**（H2）：

```ts
const consumed = host.Data.slice(0, endIndex + 1);        // 收口点之前的 raw 段（含 trivia）
// H2：直建收口（覆盖构造）
const direct = shell.DirectSession;
if (direct !== null && !direct.Declined) {
  const directBuilt = direct.Finish(endIndex, context);
  if (directBuilt !== null) {
    host.Data.splice(0, consumed.length);
    return directBuilt;                 // ← 在 new StatementBuilder 之前返回
  }
}
// 以下旧路径只服务 Decline / 范围外输入
const builder = new StatementBuilder(host.Template, context);
builder.Load(consumed, shell.Pos);                        // 过滤 trivia，记 Positions

let built = null;
if (shell.Kind === ShellPlainExpression && shell.OperatorBody !== null)
  built = builder.BuildExpressionStatementFromShapes(shell.OperatorBody);   // 表达式：形状树折 AST
if (built === null && (shell.Kind === ShellVariable || shell.Kind === 0))
  built = VariableStatementThreeLayer.TryBuild(builder, consumed);          // 变量：三层 possible 判型
if (built === null && shell.Kind === ShellFunctionDeclaration)  built = builder.BuildFunctionDeclaration();
else if (built === null && shell.Kind === ShellClassDeclaration) built = builder.BuildClassDeclaration();
else if (built === null && shell.Kind === ShellDecoratedDeclaration) built = builder.BuildDecoratedStatement();
if (built === null) {
  built = StatementFamilyDispatch.Build(builder, shell.Kind);               // 其余族：family 方法
  if (built === null) built = builder.BuildStatement();                     // 最后兜底
}
```

**本案例走 H2 的 `return`**：`let x = 1;` 建壳时 H3 已建 `VariableStatementDirectSession`；`x` 关闭时
`IdentifierShape` 已建，`=` 关闭时进入初始化器、`1` 关闭时 `NumericLiteralShape` 已建，收口时 `Finish`
交回 `VariableStatementShape`。`new StatementBuilder` 与 `builder.Load` **在覆盖范围内一次都不会执行**；
`host.Data.splice` 与旧路径末尾同源，随后 `FinishShell` 照旧把壳换成这个节点。

> **判定口径（A6）**：覆盖构造直建成功时 `StatementBuilder.prototype.Load` 调用数 == 0；
> `ExpressionBuilder.prototype.Load` 只有 `DirectTokenUtil.OperatorToken` 复用运算符映射表的那一次
> （每个二元运算符 1 次，CONTRACT §3.4 许可），验收看 `stmtLoads == 0 && exprLegacy == 0`。

**旧路径（Decline / 范围外时）**：`Kind = 0` 的变量语句走第二行 `VariableStatementThreeLayer.TryBuild`：

1. `VariableStatementThreeLayer.TryBuild`（`variable-statement-three-layer.xl.md:48`）先用
   `VariableDeclarationListUtil.Judge(consumed)` 判「这是不是一条 let/const/var 声明列表」：头是 `let`、
   下一代码单元能起绑定、末单元是 `;`、`VariableDeclarationUtil.VerifyItems` 能数出 1 个声明 →
   `State=1, Declarations=1`。
2. 判型成立后调**同一个** `builder.BuildStatement()`（同一 builder、同一段 consumed、同一 Pos），所以接管
   不改变节点 / Pos / End——AST 相等是构造保证，不是靠测试兜住。
3. `builder.At !== builder.Units.length` 时抛「语句没有读完」。

### 6.4 旧路径：StatementBuilder 把 raw 段折成节点（覆盖构造不再走）

> **现状**：变量语句与表达式语句的覆盖构造已由直建 session 建出同一批节点（同样的 `Pos` / `SourceRange` /
> 字段），本节描述的是 **Decline / 范围外** 时的旧路径，保留作为「同口径对照」。直建侧对应的节点构造见
> `docs/direct-candidate-pipeline.md` §3.3 / §4。
>
> 直建产物与本节的旧路径产物**逐字段相同**：`VariableDeclarationShape.Pos = name.Pos`、
> list `end` 不含 `;`、statement `end` 含 `;`；直建的 `VariableDeclarationShape` 也是
> `Pos = name.Pos`（不是 `SourceRange.Start`），差一格会在 cjAst 里直接看到 `pos:4 vs 3`。

`builder.Load`（`statement-builder.xl.md:97`）把 8 个 raw 单元折成 5 个 code 单元，并给每个 code 单元记一个 `Pos`：

| Units 下标 | 单元 | 源码区间 | `Positions[i]`（AST pos） |
| --- | --- | --- | --- |
| 0 | `let` | `[0,3)` | 0 |
| 1 | `x` | `[4,5)` | 3 |
| 2 | `=` | `[6,7)` | 5 |
| 3 | `1` | `[8,9)` | 7 |
| 4 | `;` | `[9,10)` | 9 |

`Positions[i]` 是「本单元前一个非 trivia 单元的 EndIndex」——含前导 trivia，与 TS 的 `pos` 同口径。

然后 `BuildStatement`（`statement-builder.xl.md:214`）按首单元文字分派：`let` + `StartsBinding` → `BuildVariableStatement()`（`statement-builder.xl.md:1534`）：

1. `keywordIndex = 0`，`At = 1`；向后扫到 `;`（Units 下标 4），得 `endExclusive = 4`。
2. `BuildVariableDeclarationList(keywordIndex=0, endExclusive=4, listStart=0)`（`statement-builder.xl.md:1610`）：
   - 名字 `x` → `IdentifierShape.FromBasicToken`（`identifier-shape.xl.md:25`）；`identifier.Pos = Positions[1] = 3`，区间 `[4,5)`，`EscapedText="x"`。
   - `=` 后是初始化表达式：`BuildExpressionRange(3,3)`（`statement-builder.xl.md:176`）→ 新 `ExpressionBuilder`，`Load([1], basePos=Positions[3]=7)`，`ParseExpression()`。
   - `ParseExpression` → `ParseAssign` → `ParseConditional` → `ParseBinary(4)` → `ParseUnary` → `ParsePostfix` → `ParsePrimary`（`expression-builder.xl.md:282/317/380/520/919/2217`）；数字分支 `NumericLiteralShape.FromBasicToken`（`expression-builder.xl.md:2436`）：区间 `[8,9)`，`Pos = 7`，`Text = "1"`（`String(Number("1"))`）。
   - `declaration.Add(name)`、`declaration.Add(initializer)`，`Finish(declaration, 1, 3)` → `SourceRange [4,9)`、`Pos=3`。
   - `list.SignIn(0)` / `list.SignOut(9)`、`Pos=0`、`TryToClose`。
3. 回到 `BuildVariableStatement`：`shape.Add(list)`；`At=endExclusive=4` → 吃掉 `;` → `At=5`；`Finish(shape, 0, 4)` → `SourceRange [0,10)`、`Pos=0`、`TryToClose`。

节点结果（AST 侧）：

| AST kind | shape | SourceRange | Pos | AST pos/end | 字段 |
| --- | --- | --- | --- | --- | --- |
| `VariableStatement` | `VariableStatementShape` | `[0,10)` | 0 | 0 / 10 | — |
| `VariableDeclarationList` | `VariableDeclarationListShape` | `[0,9)` | 0 | 0 / 9 | — |
| `VariableDeclaration` | `VariableDeclarationShape` | `[4,9)` | 3 | 3 / 9 | — |
| `Identifier` | `IdentifierShape` | `[4,5)` | 3 | 3 / 5 | `EscapedText="x"` |
| `NumericLiteral` | `NumericLiteralShape` | `[8,9)` | 7 | 7 / 9 | `Text="1"` |

注意 `VariableDeclaration` 的 `Pos=3` 比 `SourceRange.Start=4` 小一格：`Pos` 包含 `let` 后面的空格，`SourceRange` 是代码范围（半开）。AST 的 `pos` 取前者、`end` 取后者的终点，正好是 TS 的口径。

### 6.5 FinishShell：把壳换成节点

`StatementShape.FinishShell`（`statement-shape.xl.md:169`）：

1. 找到壳在父单元里的位置；
2. 取出壳内剩余单元 `leftover`，清空壳；
3. `parent.Data.splice(index, 1, built)`——**壳被建成节点顶替**；
4. 把 `leftover` 按原序插回 `built` 之后，并逐个通过父目录 `ComputePossibleShapesByIndex` **重放**（`LeftoverReplayDepth` 防递归）。

本案例收口点就是壳的最后单元，`leftover` 为空；壳被替换后根上只剩 `VariableStatementShape`。随后字符 `" "`（下标 10）被 Reload 重放回根，再创建下一条语句的 `let`。

根上第二句的实测判定：

| # | 宿主 | Data 下标 | 当前单元 | 存活候选 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 6 | `SourceFileShape` | 2 | `let` | 5 个均 `Uncertain` | `Waiting` |
| 7 | `SourceFileShape` | 4 | `y` | `VariableStatementPossibleShape=Accept` | `Built`（第二壳，`Pos=10`） |

第二壳 `BuildFromShell(endIndex=8, Kind=0, Pos=10)`、`BuildStatement` 再跑一遍同样的流程；差别只有 `Positions` 整体后移（`[10,14,16,18,20]`）。

### 6.6 EOF 收尾

第二句的 `;` 同样在文件末尾前没有后字符可顶掉，由 EOF 路径收口；随后根加 `EndOfFileTokenShape`，根目录判定：所有语句候选 `Reject`、`SourceFileEndPossibleShape.Accept` → 建 trailing（本案例没有 trailing raw，直接返回）。最后 `SourceFileShape.Close` 把 trivia 与 EOF 哨兵从 `Data` 里滤掉（`source-file-shape.xl.md:59`），留下两个 AST 节点。

### 6.7 ASI：没有 `;` 时收口在哪

ASI 不是预处理，也不插入 `;` 节点；它只是**终结候选在末代码单元上 Accept 的另一种判据**。判据在 `StatementBoundaryUtil.EndsAtLineBreak`（`statement-boundary-util.xl.md:339`），三个条件同时成立才算边界：

1. 两个代码单元之间真有换行（按源位置判，注释里的换行也算）；
2. 前一个单元能收住表达式（`StatementScanner.EndsExpression`，`statement-scanner.xl.md:455`）；
3. 后一个单元接不上（`ContinuesAcrossLine`，`:478`；`(`/`[`/`{`、`.`、`+`、`=`、`as` … 都会续接）。

另有几类特例也在这里收：类型实参 / 实例化收尾的 `>` + 换行后调用位、闭合 `{}` 收尾、行首 `;` 后面同一行还有代码时归下一条空语句。

变量族的终结候选读 `VariableStatementEndCode` → `ScanToSemicolonIncremental(code, 1, true, atEof)`（`statement-boundary-util.xl.md:1013`）：从第 2 个代码单元往后扫，遇到 `;`、或 `EndsAtLineBreak` / 不可续接尾巴，就停在**前一个**单元。

以 `let x = 1\nlet y = 2` 实测：

| # | 宿主 | Shell.Data 下标 | 当前单元 | 终结候选 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 4 | `StatementShape` | 6 | `1` | `Uncertain` | `Waiting` |
| 5 | `StatementShape` | 8 | `let`（下一条语句的首 token） | **`Accept`** | **`Built`**（`endIndex=6`，即 `1`） |

为什么不在 `1` 那一格收？`1` 收尾时后面只有一个换行 trivia，**下一个代码单元还没到**，「接不上」判不出来。等下一条语句的 `let` 到达、并且它自己收尾触发壳目录时，`EndsAtLineBreak(1, let)` 才成立 → 壳 Accept，`endIndex` 落到 `1`（host.Data 下标 6）。

收口后的动作正是 §6.5 的 FinishShell：

- `BuildFromShell` 只消费到 `1`，`\n` 与 `let` 成为 `leftover`；
- `FinishShell` 把 `leftover` 插回 `built` 之后，并对 `let` 走一次 leftover replay；
- 第二个壳的 `Pos=9`（第一条语句的 `EndIndex`），`builder.Load` 的 `Positions=[9,13,15,17]`。

最终 AST（与 TS 逐字段一致，`equal: true`）：

| 节点 | pos / end |
| --- | --- |
| `VariableStatement` #1 | 0 / 9（`end` 不含 `\n`） |
| `VariableStatement` #2 | 9 / 19（`pos` 含 `\n`） |
| `VariableDeclaration` #2 | 13 / 19 |
| `Identifier` `y` | 13 / 15 |
| `NumericLiteral` `2` | 17 / 19 |

这里面没有 `SemicolonToken`；第一条语句的 `end` 停在 `1` 的右边界，第二条语句的 `pos` 从前一条的 `EndIndex` 起算（含前导 trivia），所以换行只被第二条的 `pos` 吃掉一次。

**表达式语句的 ASI** 有两条路，取决于「边界 token 有没有机会在壳里收尾」：

- `f()\ng()` / `a\nf()`：下一条语句的首 token（`g` / `f`）到达时，它自己收尾触发壳目录 → 终结候选在边界格 `Accept`，`endIndex` 落在 `)` / `a`，`leftover` 被重放；走的是正常的壳路径。**直建现状**：`a\nf()` 的第一条 `a` 由直建成功交回（`built=1`），第二条 `f()` 因调用属范围外显式 Decline（`declined=1`）；`f()\ng()` 两条都 Decline，旧路径恢复，AST 仍 MATCH。
- `a\nb`：第二个 `b` 在 EOF 前没有收尾事件，壳拿不到 Accept 机会；`StatementShape.TryToClose` 只能消费到末单元，`BuildFromShell` 读到两条语句抛「语句没有读完」→ `DetachShell` 退回 raw。**直建现状**：H2 先让 session 看到两条语句，按 §4.6 显式 `Decline("语句内出现无法接续的单元 idx=2")`（`declined=1`），随后旧路径照旧抛错并 Detach；AST 仍与 TS 完全一致（实测 `equal: true`）。`a++\nb` 也落在这一支。这是本轮已知限制（见 `docs/direct-candidate-pipeline.md` §11.1），不在 10 条目标 case 内。

**受限产生式不套用上面的三条件**：

- `return` / `throw`：`ReturnThrowEndCode`（`statement-boundary-util.xl.md:938`）——关键字后紧接换行就收在关键字本身（`return\nx` = `return;` + `x;`），否则扫到 `;`；
- `break` / `continue`：`BreakContinueEndCode`（`:950`）同理，标签与 `;` 按同一格判；
- 后缀 `++` / `--`：`IsAsiBoundary`（`:21`）对前缀位置显式返回 `false`（`a++; --` ⏎ `a;` 的第二条是 `--a;`），只有前面还有能收住表达式的单元时才可能构成边界；
- `throw` ⏎ 操作数在 TS 里本身就是语法错误（restricted production），不进这条路径。

建树器一侧读的是同一套判据：`BuildVariableStatement` 扫声明列表时用 `StatementBuilder.EndsAtLineBreak`（`statement-builder.xl.md:1550`），`BuildExpressionStatement` 用 `EndsAtLineBreak` + `StatementBoundaryUtil.IsAsiBoundary`（`:1339`）。终结候选与建树器必须同源，否则会出现「壳收在 `1`、builder 扫到 `let`」的错位。

---

## 7. 最终产物

### 7.1 `let x = 1; let y = 2;`

XML（`root.ToXmlString()`，标签名就是运行时类名；为可读性分行，实际输出是单行）：

```xml
<SourceFileShape>
  <VariableStatementShape>
    <VariableDeclarationListShape>
      <VariableDeclarationShape>
        <IdentifierShape></IdentifierShape>
        <NumericLiteralShape></NumericLiteralShape>
      </VariableDeclarationShape>
    </VariableDeclarationListShape>
  </VariableStatementShape>
  <VariableStatementShape>…（第二句同构）…</VariableStatementShape>
</SourceFileShape>
```

`cjAst(root)`（`typescript/cases/ast-compare.mjs:106`）与 `ts.createSourceFile` 的投影：

```json
{
  "kind": "SourceFile", "pos": 0, "end": 21,
  "children": [
    { "kind": "VariableStatement", "pos": 0, "end": 10,
      "children": [
        { "kind": "VariableDeclarationList", "pos": 0, "end": 9,
          "children": [
            { "kind": "VariableDeclaration", "pos": 3, "end": 9,
              "children": [
                { "kind": "Identifier", "pos": 3, "end": 5, "text": "x" },
                { "kind": "NumericLiteral", "pos": 7, "end": 9, "text": "1" }
              ] } ] } ] },
    { "kind": "VariableStatement", "pos": 10, "end": 21, "children": [ … ] }
  ]
}
```

实测：本案例 `cjAst` 与 `tsAst` **逐字段完全一致**（`equal: true`）；`let x = 1;` 单句版同为 true。注意 `let` 关键字不是 AST 子节点（TS 的 `VariableDeclarationList` 用 flags 表达 `let/const`），所以 XML/JSON 里都没有它。

**直建接管后**：同一份 XML / JSON 与本节（旧路径）结果逐字节相同——目标 case 的 A1（AST 逐字段）与 A2
（XML 两次一致）实测全 PASS；差别只在建树时机（token 关闭时 vs 收口时）与方式（增量旋转 vs 递归下降），
输出层不变。

### 7.2 单句 + EOF 的差异

`let x = 1;`（无后续字符）最终 XML/JSON 与 7.1 的第一句逐字节相同，只是收口触发点从「`;` 关闭 → 终结候选」变成「EOF → `StatementShape.TryToClose`」。两条路都调 `BuildFromShell`，所以建树结果没有第二条路径。

---

## 8. 一张图看「从 raw 段到节点」

> 这是**旧路径**（Decline / 范围外）。覆盖构造的直建不是「收口时读整段 raw」，而是「token 关闭时逐格建」，
> 其树演化见 `docs/direct-candidate-pipeline.md` §5.5；两条路的输出节点逐字段相同。

```
壳.Data（8 个带 trivia 的 basic 单元）
  │ BuildFromShell: consumed = Data.slice(0, endIndex+1)
  ▼
StatementBuilder.Load(consumed, shell.Pos)
  │ 跳过 IsTriviaToken；Units=5；Positions=[0,3,5,7,9]
  ▼
BuildStatement() → 首单元 "let" + StartsBinding(x) → BuildVariableStatement()
  │
  ├─ BuildVariableDeclarationList()
  │    ├─ name: IdentifierShape.FromBasicToken(x)      → Pos=3, [4,5)
  │    └─ initializer: BuildExpressionRange([1], 7)
  │         └─ ExpressionBuilder.ParseExpression()
  │              └─ … ParsePrimary → NumericLiteralShape → Pos=7, [8,9)
  │
  └─ Finish(statement, 0, 4)   → Pos=0, [0,10)
        │
        ▼
VariableStatementShape（Data = [VariableDeclarationListShape]）
  │ 关闭后的形状树 = AST；cjAst 读 constructor.name / Pos / SourceRange / 字段 / Data
  ▼
{ kind:"VariableStatement", pos:0, end:10, children:[…] }
```

---

## 9. 为什么这样设计（四条硬约束）

1. **候选互斥靠判据，不靠先后**。`StatementRouteUtil.Decide` 是全函数，任何下标都返回一个族码；同一格绝不让两个候选同时 Accept。互斥仪器的实测（`harness --double-accept`）是 120/0、冲突 0。
2. **Reject 是永久的，所以「还没判出来」只能 `Uncertain`**。只有 trivia、首代码单元未到、路由返回 `None` 时都不许 Reject；否则 `CatalogGuide` 会把候选从 `Candidates` 里永久删除，整条语句再没人接管（曾造成 28 个 crash）。
3. **边界判据只有一份**。`StatementBoundaryUtil` 同时服务终结候选的 `ComputeByIndex` 与 `BuildByIndex`（以及壳的 EOF 兜底），保证「Accept 的那一格」与「真正消费到的末格」是同一个数；两份实现就会分叉成「语句没有读完」或吞掉下一条语句。
4. **建树器原子、无副作用**。`StatementBuilder` 只吃 `Units + Positions`，不回头改 token；`Load` 先过滤 trivia，`Finish`/`SpanLeaf` 统一签入签出并写 `Pos`。同一段 raw、同一个 `Pos`，无论从哪条入口进来（三层 possible / family 分派 / legacy）都建出同一个节点。

直建接管后这四条**一条都没改**：第 1 条仍是 `StatementRouteUtil` 决定族；第 2 条仍是候选的 Reject 规则；
第 3 条仍是 `StatementBoundaryUtil` 一份（session 不判边界）；第 4 条现在有两条建树实现
（`StatementBuilder` 与 `DirectSession`），但两者读同一套 `Pos` / 区间口径，输出同一批形状节点。

失败时的退路（按顺序）：

- 表达式形状树折不出 AST → `StatementShapeAst.Decline` 记数，退回 `BuildStatement()`（当前语料 2 次）；
- `StatementFamilyDispatch` 越界 → 计数后 `BuildStatement()`（默认解析 `LegacyStatementDispatchCount = 0`）；
- 整条文件抛异常 → `SourceFileRunner.Parse` 用 `EnableShellExpressions=false` 的 legacy 目录**整文件重解析一次**（`source-file-runner.xl.md:47`，`file-fallback` 实测 0）。

---

## 10. 其它语句族的差异（速查）

| 族 | 建壳候选 | 壳 `Kind` | 收口判据 | 建树入口 |
| --- | --- | --- | --- | --- |
| `let/const/var` | `VariableStatementPossibleShape` | 0（None） | 短语句族 `;`/ASI/EOF | **直建**：H3 建 `VariableStatementDirectSession`，H2 `Finish` → `VariableStatementShape`；Decline 时旧路径（三层 possible → `BuildStatement`） |
| 普通表达式语句 | `RootExpressionStatementPossibleShape` | `ShellPlainExpression` | `;`/EOF/ASI（`ExpressionEndCode`） | **直建**：H3 建 `ExpressionStatementDirectSession`，H2 `Finish` → `ExpressionStatementShape`；Decline 时旧路径（形状树 → `StatementShapeAst.BuildExpressionStatementFromShapes`，拒绝则 `BuildStatement`） |
| 控制流 / 块 / 标签 | `ControlFlowStatementPossibleShape`、`BlockPossibleShape` | `ShellStatementFamily` / `ShellBlock` / `ShellLabel` | 体括号 / 链式 `else/while/catch/finally` | `StatementFamilyDispatch.Build` → `BuildIf/BuildWhile/…`（**未覆盖，现状不变**） |
| 根层 `function` / `class` / `@dec` | `ControlFlowStatementPossibleShape`（路由 8/9/10） | `ShellFunctionDeclaration` / `ShellClassDeclaration` / `ShellDecoratedDeclaration` | `DeclarationShellEndCode`（体括号 / `;` / 声明跟随边界） | `BuildFunctionDeclaration` / `BuildClassDeclaration` / `BuildDecoratedStatement`（**未覆盖**） |
| 声明族（`interface/enum/type/namespace/import/export/declare`） | `DeclarationStatementPossibleShape`（路由 7） | `ShellDeclarationFamily` | `ExpressionEndCode` + `DeclarationFamilyBodyEndCode` | `StatementFamilyDispatch.Build` → 各 `Build*Declaration`（**未覆盖**） |
| 块内语句 | 块体 `Bracket` 的目录 | 同各族 | 同上 | 块体目录建壳后同一套；块内的变量 / 表达式语句同样走直建 |

同一个 shell 机制在三处被复用：根目录、块体括号目录、控制流体括号目录；差别只在「谁持有目录、候选表有哪些、`Kind` 是什么」。

---

## 11. 复跑与验证（直建现状）

前置（仓库根；`dist/`、`build/` 是生成物、被 gitignore）。命令在 `docs/direct-pipeline` 克隆上实测可跑：

```powershell
$clone = "C:\Users\Admin\Documents\GitHub\xl-example-set\docs-direct-pipeline"
cd $clone

# 1) 规范 → dist/ts（本仓 xl 不在 PATH，用会话内 xl_build 工具，不是 shell 命令）
#    xl_build(cwd=$clone, paths=["core","typescript"], targets=["ts"], out="dist", orphans=false)
#    实测：548 written, 0 skipped, 0 planned, 0 error(s), 2485 warning(s)（warning 全是既有 W3102/W3103）
node node_modules/typescript/bin/tsc -p tsconfig.json        # 实测 exit 0

# 2) 目标 case harness（一次性只读拷入；本分支不提交 tests/direct-build）
#    若当前分支/集成目标已含 tests/direct-build/target-cases.mjs（main 在 75a5c4a1 已正式合入），跳过本步
New-Item -ItemType Directory -Force tests\direct-build | Out-Null
Copy-Item C:\Users\Admin\Documents\GitHub\xl-example-set\feat-all-possible-verify\tests\direct-build\target-cases.mjs tests\direct-build\
node tests/direct-build/target-cases.mjs                     # 默认 10 条：exit 0，CASES=10 FAILED=0 READING-FAIL=1
node tests/direct-build/target-cases.mjs --expect-direct --strict --trace
#    final 验收：exit 0，CASES=9 FAILED=0 SKIPPED=1，builtCases=9/9 loads=0，A1–A7 全 PASS

# 3) 收尾
Remove-Item -Recurse -Force tests\direct-build
git clean -fd tests\direct-build
```

实测读数（2026-10-25，`feature/all-possible` @ `cdceb9ec`，本机）：

| 检查 | 读数 |
| --- | --- |
| `xl_build` | `548 written, 0 error(s), 2485 warning(s)` |
| `tsc` | exit 0 |
| 默认 harness | `IMPL: state=wired … sessions=2`；`CASES=10 FAILED=0 READING-FAIL=1`；`builtCases=9/10 loads=3`（反例 `let x = f()` 的旧路径读数） |
| final harness | `ASSERT: A1=PASS A2=PASS A3=PASS A4=PASS A5=PASS A6=PASS A7=PASS`；`CASES=9 FAILED=0 SKIPPED=1`；`builtCases=9/9 loads=0` |

**本轮不跑**（用户明确口径）：`tests/gates`、全量 `typescript/cases/ast-json.mjs` / `ast-json-diff.mjs`（6171）、
`tests/coverage`、`samples/check.mjs`、`tests/statement-possible/harness.mjs` 全量。直建前的门标准读数是
`6171/6171`、结构差 / 位置差 / 字段差 0，但那是**另一轮口径的历史基线**，不能引用为直建验收。

复现本文的 trace：直建侧直接开 `DirectBuildMetrics.TraceEnabled`（下面这段）；壳目录 / 终结候选的判定仍可
用 `CatalogGuide.prototype.ComputePossibleShapesByIndex` 与 `StatementShape.BuildFromShell` 包一层
（只读、不改行为）。**注意**：本仓 `package.json` 是 ESM，带 `require` 的片段要存成 `.cjs` 才能直接 `node`：

```js
// 存成 tmp-trace.cjs，在仓库根执行：node tmp-trace.cjs
const path = require('path');
const base = path.join(process.cwd(), 'build/ts/typescript');
const { SourceFileRunner } = require(path.join(base, 'run/source-file-runner.js'));
const { DirectBuildMetrics } = require(path.join(base, 'tokens/direct/direct-build-metrics.js'));

DirectBuildMetrics.Reset();
DirectBuildMetrics.TraceEnabled = true;
SourceFileRunner.Parse('let x = 2*3+1', 'case.ts');
console.log(DirectBuildMetrics.Traces.join('\n'));
console.log('built=', DirectBuildMetrics.StatementsBuilt, 'declined=', DirectBuildMetrics.Declined);
// variable ingest head: let
// variable ingest binding: x
// insert(*) prec14 owner=Holder
// insert(+) prec13 owner=Holder
// variable close declaration (initialized)
// variable built: decls=1
// built= 1 declined= 0
```

（上面 7 行 trace 为 2026-10-25 在本仓 `build/ts` 上的实测输出。）

---

## 12. 已知口径偏差与残余（读代码时别踩）

- `typescript/IMPORTANCE.md` §4 的「shape 闭区间、AST 换算 +1」是旧口径；现行实现是 `SourceRange` 半开、AST `end` 直接取 `EndIndex`（见 §1）。
- `StatementPossibleShape` 仍存在，但默认根目录**不注册**它（`source-file-shape.xl.md:145` 的注释；只在 `EnableShellExpressions=false` 的 legacy 目录里插回第 4 位）。读默认路径时不要把它当成主入口。
- `VariableStatementThreeLayer.TryBuild` 内部调的是 `BuildStatement()`，不是 `StatementFamilyDispatch`；`LegacyStatementDispatchCount` 计的是 `BuildFromShell` 里 family 分派返回 null 后的那次兜底，两者不是同一件事。
- **直建 A6 不是字面 `exprLoads == 0`**：`DirectTokenUtil.OperatorToken` 每个二元运算符一次 `ExpressionBuilder.Load`
  复用映射表（CONTRACT §3.4 许可）；验收口径是 `stmtLoads == 0 && exprLegacy == 0`（见 `docs/direct-candidate-pipeline.md` §8.3）。
  覆盖构造上 `StatementBuilder` **一次都不创建**（H2 在 `new StatementBuilder` 之前 return）。
- **`DirectBuildMetrics.Errors` 本轮没有递增点**（只有声明与 `Reset`），恒 0；不要把它当作「运行期异常为 0」的证据，
  异常路径看 `Declined` / `IncompleteFallback` / `StrictViolations`。
- **表达式语句跨行 ASI `a⏎b` / `2⏎3` 仍是已知限制**：session 显式 Decline、旧路径 Detach 恢复、AST 仍 MATCH；
  不在 10 条目标 case 内。详见 `docs/direct-candidate-pipeline.md` §11。
- 残余数字（整文件 fallback 4 例、块体 raw 尾巴 4 例、形状树拒绝 2 例、`ScanRoot` 46 次）是**直建前基线**的
  门标准读数；本轮不跑门标准，未重新测量，读到时按历史值对待。
