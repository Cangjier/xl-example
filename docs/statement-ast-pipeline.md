# 语句 → AST 全流程：以 `let x = 1;` 为案例

> 本文只回答一件事：**一条语句从源码字符到 AST 节点，在现行代码里到底经过哪些步骤、每一步由谁负责、数据长什么样**。
> 所有代码位置以 `*.xl.md` 为准；文中的 trace 都是在本仓 `build/ts` 产物上实测得到的（复跑方式见 §11）。
>
> 案例源码：`let x = 1;`（紧跟第二句 `let y = 2;`，用来展示「语句在文件中段如何收口」；文件末尾只有一句时的差异见 §7.2）。
>
> **2026-10-26 更新（R3 收口，`feature/all-possible` @ `b964fdb8`）**：直建已从「一条语句 = 一个表达式」推进到
> **语句本身** —— 控制流（块 / 空语句 / if / else-if / while / do / for / for-in / for-of / return / throw / break /
> continue）、函数声明与箭头函数、D7 语句边界修复、strict 全量化（H1′）；目标 case 从 60 条扩到 **92 条**。
> 建壳候选的挂载点收敛为 `DirectStatementHook.Attach`（H3-b，R3 新增），注册仍在 `direct-build-plugins` 的 5 行。
> 本文已把 §10（族差异表）、§11（复跑与读数）、§12（已知口径）改写为 R3 现状，并新增 §13（语句族直建流程）；
> hook / 状态机 / 装配助手的细节见 `docs/direct-candidate-pipeline.md` §2.2–§2.3、§15–§19。


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
                                            │     ├─ 成功 → host.Data.splice + return 已建好的形状
                                            │     │           （**不 new StatementBuilder**）
                                            │     └─ 抛错 → Errors++/LastError/Trace → 回落（C4）
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
| 直建契约 | `typescript/tokens/direct/direct-build-session.xl.md`、`direct-build-metrics.xl.md` | `DirectSession` 接口（`Ingest` / `Finish`）与计数 / 分类（`NoteDecline` + `DeclineReasons`）/ strict / trace 出口 |
| 直建注册 | `typescript/tokens/direct/direct-build-router.xl.md`、`direct-build-plugins.xl.md` | 按 `StatementRoute` kind 建 session；`plugins` 是唯一注册点（`ShellVariable` / `ShellPlainExpression`） |
| 直建建树 | `typescript/tokens/direct/direct-variable-session.xl.md`、`direct-expression-session.xl.md`、`direct-expression-engine.xl.md`、`direct-token-util.xl.md` | 变量语句 / 表达式语句状态机 + 增量表达式引擎（优先级旋转、括号嵌套、一元；R2 扩到 A1–A5 + C1 守卫） |
| 直建异常计数 | `typescript/tokens/statements/statement-shape.xl.md` 的 H2 | `try/catch` → `Errors++ / LastError / Trace` → 回落旧路径（C4） |
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
- **文件在 `;` 后立刻结束**（`let x = 1;` 无后续字符）：没有下一个字符来关闭 `;`，于是 `SourceFileShape.Process` 的 EOF 路径先 `mounted.TryToClose(context)`（`source-file-shape.xl.md:106`）→ `StatementShape.TryToClose`（`statement-shape.xl.md:289`）自己算 `lastCode` / 族边界，直接 `BuildFromShell` + `FinishShell`。实测单句 `let x = 1;` 的 `BuildFromShell(endIndex=7, Kind=0, Pos=0)` 与两句版第一句完全一致。
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
  let directBuilt:Token | null = null;
  try {
    directBuilt = direct.Finish(endIndex, context);
  } catch (error) {                                       // C4：异常计数后回落旧路径
    if (!direct.Declined) {
      DirectBuildMetrics.Errors += 1;
      DirectBuildMetrics.LastError = error instanceof Error ? error.message : String(error);
      DirectBuildMetrics.Trace("direct finish error: " + DirectBuildMetrics.LastError);
    }
    directBuilt = null;
  }
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

- `f()\ng()` / `a\nf()`：下一条语句的首 token（`g` / `f`）到达时，它自己收尾触发壳目录 → 终结候选在边界格 `Accept`，`endIndex` 落在 `)` / `a`，`leftover` 被重放；走的是正常的壳路径。**直建现状（R2）**：调用已被 A3 覆盖，`a\nf()` 与 `f()\ng()` 都是**两条都直建**（`built=2 declined=0`，实测 AST MATCH）；R1 时代 `a\nf()` 的「一正一反」读数（`built=1 declined=1`）已被淘汰。
- `a\nb`：第二个 `b` 在 EOF 前没有收尾事件，壳拿不到 Accept 机会；`StatementShape.TryToClose` 只能消费到末单元，`BuildFromShell` 读到两条语句抛「语句没有读完」→ `DetachShell` 退回 raw。**直建现状**：H2 先让 session 看到两条语句，显式 `Decline("语句内出现无法接续的单元 idx=2", "expr.stopped")`（`declined=1`），随后旧路径照旧抛错并 Detach；AST 仍与 TS 完全一致（实测 `equal: true`）。`a++\nb` 也落在这一支。这是**按裁决保持**的已知限制（C2，`docs/direct-candidate-pipeline.md` §14.4），目标 case 里按 neg 收录（`R2-C2-01`）。

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
| `let/const/var` | `VariableStatementPossibleShape` | 0（None） | 短语句族 `;`/ASI/EOF | **直建**：H3 建 `VariableStatementDirectSession`，H2 `Finish` → `VariableStatementShape`；Decline 时旧路径（三层 possible → `BuildStatement`）。R2：初始化器覆盖 A1–A5 全部构造 |
| 普通表达式语句 | `RootExpressionStatementPossibleShape` | `ShellPlainExpression` | `;`/EOF/ASI（`ExpressionEndCode`） | **直建**：H3 建 `ExpressionStatementDirectSession`，H2 `Finish` → `ExpressionStatementShape`；箭头函数也在这一路（表达式引擎自我激活） |
| 控制流 / 块（**R3**） | `ControlFlowStatementPossibleShape`、`BlockPossibleShape` | `ShellStatementFamily` / `ShellBlock` | 体括号 / 链式 `else/while/catch/finally` | **直建**：`DirectStatementHook.Attach`（H3-b）建 `ControlFlowStatementDirectSession`（两个 kind 同一个类），H2 `Finish` → `BlockShape` / `EmptyStatementShape` / `If/While/Do/For/ForIn/ForOf/Return/Throw/Break/Continue`；体内语句**不代建**（各自 H2 收口后由 `BuiltChildren` 收集）。`switch`/`try`/`with`/`debugger` 入口 `Decline(stmt.head)`；`for (let …)` 也 `stmt.head`；带标签的 `break/continue` → `stmt.label` |
| 根层 `function`（**R3**，R5 扩参数 / 返回类型） | `ControlFlowStatementPossibleShape`（路由 8） | `ShellFunctionDeclaration` | `DeclarationShellEndCode`（体括号 / `;` / 声明跟随边界） | **直建**：`FunctionDeclarationDirectSession`。参数表走 R3 的 `ParametersAreIdentifiers`（纯标识符）或 R5 的 `ParametersAreTypeAnnotated`（`a` / `a?` / `...a: T` / `: T`；**无类型注解的 rest 仍拒**，保住 `R3-B2-neg-02`），两者**并存**、共用静态工厂 `BuildParameters`；返回类型走 `DirectTypeAssembly.ReturnTypeOf`（`ParseReturnType`）；**体走 `BlockFrom`**（不能用 `FromUnits`：它有体会 `new StatementBuilder`）；泛型 / 默认值 / 解构 / 无体 → `stmt.func` |
| 根层 `class` / `@dec` | `ControlFlowStatementPossibleShape`（路由 9/10） | `ShellClassDeclaration` / `ShellDecoratedDeclaration` | `DeclarationShellEndCode` | **R5 起显式 Decline**：`DeclarationFamilyDirectSession` 只拒（`decl.class`，`ClassDeclarationShape` 有 2 处 `new StatementBuilder` ⇒ R6），建树仍走旧路径 |
| 声明族（`interface/enum/type/namespace/import/export/declare`） | `DeclarationStatementPossibleShape`（路由 7） | `ShellDeclarationFamily` | `ExpressionEndCode` + `DeclarationFamilyBodyEndCode` | **R5 起直建**：`DeclarationFamilyDirectSession` —— `interface` / `type` / `enum` 走三个 `FromUnits`（`shape.Pos = 壳 Pos`）；`namespace` / `module` / `import` / `export` / `declare` / `using` → `decl.head`；`enum` 带初始值 / 计算名 → `decl.enum` |
| `try` / `catch` / `finally`（**R4**） | `ControlFlowStatementPossibleShape`（路由 4） | `ShellStatementFamily` | `ExpressionEndCode` / `ShortFamilyEndCode` | **直建**：`ControlFlowStatementDirectSession.BuildTry` / `BuildCatchBinding`；`Data=[Block, CatchClause?, Block?]`。catch 绑定类型注解 / 解构 → `stmt.catch` |
| `switch`（**R4**） | `ControlFlowStatementPossibleShape`（路由 4） | `ShellStatementFamily` | 同上 | **直建 switch 自己**：`BuildSwitch` / `BuildCaseBlock`；**子句语句仍 legacy**（`CaseClauseStatementPossibleShape` 不接 `Attach`）⇒ `stmtLoads == 子句语句数`、A6 SKIP（§14.2） |
| `with` / `debugger`（**R4**） | `ControlFlowStatementPossibleShape`（路由 4） | `ShellStatementFamily` | 同上 | **直建**：`BuildWith`（单语句体走 `RawStatement`）/ `BuildDebugger`（`Data=[]`） |
| 标签语句（**R4**） | `ControlFlowStatementPossibleShape` | `ShellLabel` | `ExpressionEndCode` | **直建**：`BuildLabeled`（`ShellLabel` 已注册第 6 行；首代码单元是标识符，`LabelText` 在 `RecognizeHead` 记下，体递归 `BuildRange`） |
| 对象方法 / `get` / `set`（**R4**，R5 扩前缀与参数） | 对象字面量的成员循环 | 无独立壳 | 表达式引擎 | **直建**：`DirectObjectMemberAssembly.MemberFrom`；方法体 `BlockFrom`；**R5 起前缀可带 `async` / `*`、参数可带注解**（与函数声明同一个 `ParametersAreTypeAnnotated`）；`async *` / 计算属性 / 默认值 → `expr.member` |
| `for` 声明头（**R4**） | `ControlFlowStatementPossibleShape`（路由 4） | `ShellStatementFamily` | 同上 | **直建**：`DirectDeclarationAssembly.ListFrom`（只做 Identifier + 初始化器；不调 `TypeBuilder` / `ExpressionBuilder`） |
| 块内语句 | 块体 `Bracket` 的目录 | 同各族 | 同上 | 与根层同一套；块内的变量 / 表达式 / 控制流 / 函数语句都直建，`{ let x = 1; }` 因此 `built=2`（块 + 内层语句），根下节点仍是 1 |

同一个 shell 机制在三处被复用：根目录、块体括号目录、控制流体括号目录；差别只在「谁持有目录、候选表有哪些、`Kind` 是什么」。
R5 之后，「这个族是否直建」由 `direct-build-plugins` 的 **9 行** `Register` 唯一回答（R1 两行 + R3 三行 + R4 的
`ShellLabel` + R5 的三行 7/9/10；**物理行序 `2,1,4,5,6,8,7,9,10`**，按行序不按常量值）。未注册 kind ⇒ `Attach` 里的
`Create` 返回 null ⇒ 行为逐字节不变。

## 11. 复跑与验证（R3 时代的 92 条读数；R4 的 132 条见 §14.7；R5 的 189 条见 §15）

> **口径变更（R4）**：`CASES` 已扩到 **132**，合并态 `132/0`；本节的 92 条命令与读数保留为 R3 历史证据。
> 现行命令、132 条的读数、6 条改判、`--strict-all` 隐含 `--strict`（D6）都在
> `docs/direct-candidate-pipeline.md` §22 与本文 §14.7。**R5 之后累计 189 条**（新增 TY/DC/RS/CL 四组），
> 命令与实测读数见本文 **§15.6** 与 `docs/direct-candidate-pipeline.md` §23.7。

前置（仓库根；`dist/`、`build/` 是生成物、被 gitignore）。命令在 `docs-r3` 克隆（`b964fdb8`）上实测可跑：

```powershell
$clone = "C:\Users\Admin\Documents\GitHub\xl-example-set\docs-r3"
$setup = "C:\Users\Admin\Documents\GitHub\xl-example-set\chore-all-possible-setup"   # 8456ec3c 黄金克隆
cd $clone

# 1) 规范 → dist/ts（本仓 xl 不在 PATH，用会话内 xl_build 工具，不是 shell 命令）
#    xl_build(cwd=$clone, paths=["core","typescript"], targets=["ts"], out="dist", orphans=false)
#    实测：552 written, 0 skipped, 0 planned, 0 error(s), 3 warning(s)（warning 全是既有 E1107 重复类型声明）
node node_modules/typescript/bin/tsc -p tsconfig.json        # 实测 exit 0；build/ts = 552 个 .js

# 2) 分组
node tests/direct-build/target-cases.mjs --group=r1
#    实测 exit 0；CASES=10 FAILED=0；builtCases=10/10 loads=0
node tests/direct-build/target-cases.mjs --group=r2
#    实测 exit 0；CASES=50 FAILED=0；builtCases=33/50 loads=64

# 3) R3 组（32 条）
node tests/direct-build/target-cases.mjs --group=r3 --expect-direct --strict --decline-stats --baseline=$setup
#    实测 exit 0；CASES=32 FAILED=0；A1..A12 全 PASS；builtCases=25/32 loads=32
#    DECLINE-STATS: total=9 categories=4（stmt.func 3 / stmt.head 3 / expr.decline 2 / var.binding 1）

# 4) 全量 92 条（唯一最终判据）
node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats --baseline=$setup
#    实测 exit 0；CASES=92 FAILED=0；A1..A12 全 PASS；builtCases=68/92 loads=96
#    DECLINE-STATS: total=21 categories=5（expr.decline 12 / stmt.func 3 / stmt.head 3 / var.binding 2 / expr.stopped 1）

# 5) strict 全量化（必须与 --strict 联用；现状 2 条已知红，属 R4）
node tests/direct-build/target-cases.mjs --strict --strict-all --expect-direct --decline-stats --baseline=$setup
#    实测 exit 1；CASES=92 FAILED=2（R2-INC-01 `a +` / R2-INC-02 `a as`，A4/A12 FAIL、parse=THREW）
#    ⚠️ 单独 --strict-all 是 no-op（strict=off strict-all=on），不能当证据
```

实测读数（R3 时代，2026-10-26，`feature/all-possible` @ `b964fdb8`；**R4 现行读数见 §14.7**）：

| 检查 | R3 读数（历史） | R4 读数（现行） |
| --- | --- | --- |
| `xl_build` | `552 written, 0 error(s), 3 warning(s)` | `554 written, 0 error(s), 3 warning(s)`（+2 个 R4 新文件） |
| `tsc` | exit 0（干净 clone `build/ts` = 552 个 `.js`） | exit 0（`build/ts` = 554 个 `.js`；主仓库 907，见 §12 末条） |
| `--group=r1` | 10/0；`builtCases=10/10 loads=0` | 10/0；`builtCases=10/10 loads=0` |
| `--group=r2` | 50/0；`builtCases=33/50 loads=64` | 50/0；`builtCases=35/50 loads=53`（R2-C2-01 改判） |
| `--group=r3` | 32/0；`builtCases=25/32 loads=32`；`DECLINE-STATS: total=9 categories=4` | 32/0；`builtCases=27/32 loads=17`；`total=5 categories=3`（4 条改判） |
| `--group=r4` | — | 40/0；`builtCases=34/40 loads=52`；`total=7 categories=6` |
| 全量 | 92/0；`builtCases=68/92 loads=96`；`total=21 categories=5` | **132/0**；`builtCases=106/132 loads=122`；`total=22 categories=7` |
| `--strict --strict-all` | **exit 1**；`CASES=92 FAILED=2`（R4 已知红） | **exit 0**；`132/0` |
| `--strict-all` 单独 | no-op（`strict=off`） | **`132/0`**，MODE = `strict=on (implied by --strict-all)` |

**R4 的读数不是本节命令的复跑结果**：本节命令是 R3 口径（92 条），R4 的完整命令表与逐组读数在
`docs/direct-candidate-pipeline.md` §22.5 / §22.4；本文 §14.7 只列最小集。

**本轮不跑**（用户明确口径）：`tests/gates`、全量 `typescript/cases/ast-json.mjs` / `ast-json-diff.mjs`（6171）、
`tests/coverage`、`samples/check.mjs`、`tests/statement-possible/harness.mjs` 全量、47 文件 smoke。
直建前的门标准读数（`6171/6171`、结构差 / 位置差 / 字段差 0）是**另一轮口径的历史基线**，不能引用为本轮验收。

复现本文的 trace：直建侧直接开 `DirectBuildMetrics.TraceEnabled`（下面这段）；壳目录 / 终结候选的判定仍可
用 `CatalogGuide.prototype.ComputePossibleShapesByIndex` 与 `StatementShape.BuildFromShell` 包一层
（只读、不改行为）。**注意**：本仓根 `package.json` 的 `type` 是 `commonjs`；带 `require` 的片段存成 `.cjs`（或 `.js`）都可直接 `node`，下面按 `.cjs` 存：

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
```

R3 的语句级 trace 会长出 `control ingest head: if` / `control built: if units=…` / `function built: units=4` 这类行
（`direct-control-session` 与 `direct-function-session` 各自打）；`--trace` 跑 harness 时它们出现在 `DIRECT` 行之前。

## 12. 已知口径偏差与残余（读代码时别踩）

- `typescript/IMPORTANCE.md` §4 的「shape 闭区间、AST 换算 +1」是旧口径；现行实现是 `SourceRange` 半开、AST `end` 直接取 `EndIndex`（见 §1）。
- `StatementPossibleShape` 仍存在，但默认根目录**不注册**它（`source-file-shape.xl.md:145` 的注释；只在 `EnableShellExpressions=false` 的 legacy 目录里插回第 4 位）。读默认路径时不要把它当成主入口。
- `VariableStatementThreeLayer.TryBuild` 内部调的是 `BuildStatement()`，不是 `StatementFamilyDispatch`；`LegacyStatementDispatchCount` 计的是 `BuildFromShell` 里 family 分派返回 null 后的那次兜底，两者不是同一件事。
- **直建 A6 不是字面 `exprLoads == 0`**：`DirectTokenUtil.OperatorToken` 每个二元运算符一次 `ExpressionBuilder.Load`
  复用映射表（CONTRACT §3.4 许可）；验收口径是 `stmtLoads == 0 && exprOtherDirect == 0 && exprLegacy == 0`
  （见 `docs/direct-candidate-pipeline.md` §8.3）。覆盖构造上 `StatementBuilder` **一次都不创建**
  （H2 在 `new StatementBuilder` 之前 return）。
- **R3 的 B1/B2 一行 `StatementBuilder` 都不许调**：`FunctionDeclarationShape.FromUnits` 在**有体**时会
  `new StatementBuilder` + `BuildStatement()` 建体，所以函数声明 session **不用 `FromUnits`**，只借它的
  `BuildParameters` 静态工厂与 `Pos` 口径，体走 `BlockFrom`（这是对 R3-CONTRACT §4.3.2 的实现口径修正）。
- **`DirectBuildMetrics.Errors` 的来源**：H2 的 C4 `catch`（`Finish` 抛错且未 Decline 时 +1）、H1′ 的 `catch`
  （Ingest 期抛错且未 Decline 时 +1）、以及 R4 的两处 eager Ingest 补的 `catch`（同样「先计数、已计数不重复」）；
  正常 / 负例输入恒 0。R4 起「已计数」判据**扩到 strict(incomplete)**（`Incomplete` 在 strict 下也是先
  `StrictViolations++` 再抛），所以 strict 的 Decline / Incomplete 被接住时**不**计 `Errors`。
- **直建覆盖范围（R5）**：变量语句（含**类型注解**）+ 表达式语句（R1/R2 的 A1–A5 + R5 的 `await` 前缀 / `async` 箭头）+
  控制流族（块 / 空语句 / if / 循环 / return / throw / break / continue / try·catch·finally / switch / with /
  debugger / 标签 / `for` 声明头）+ **函数声明**（Identifier 或类型注解参数、可选返回类型；生成器 / `async function`）+
  **函数体内的 `yield` / `await` 语句**（R5）+ `for await` + **对象方法 / `get` / `set`**（R5 起含 `async` / `*` 前缀
  与注解参数）+ **`interface` / `type` / `enum`**（R5）。
  正则 / 函数表达式 / 类表达式 / `as const` / 实参 spread / 泛型实参 / 解构 binding / 确定赋值断言 `!` /
  **`class` 与装饰器声明** / `namespace`·`import`·`export`·`declare`·`using` / `const enum` / 顶层 `await`·`yield`
  **仍 Decline 或走旧路径**。逐条见 `docs/direct-candidate-pipeline.md` §1.2 / §1.3 / §23。
  **`safe` 类别**（`built==0 && A1 MATCH`，不能断言 `declined>=1`）：`const enum`（根层不建壳）、`export interface`
  这类由导出候选直接建的形态、顶层 `await` / `yield`（语句壳要求父是 `{`；R4 的 body-legacy 已在 R5 消除，§15.4）。
- **C1 行终止符守卫**：引擎在 `++`/`--`/`!` 前发现行终止符 → `Hold()`；session 侧还有一道覆盖校验
  （`expr.coverage` / `var.coverage`）兜「建多了」的情况。目标 case `a⏎++b` / `a⏎--b` / `a⏎!b` 实测
  `built=2 declined=0 AST MATCH XML==基线`。
- **D7 已修（R3 三条 + R4 两条）**：`let x = a⏎++b` / `let x = a + b⏎++c` / `let x = a⏎!b` 自 R3 起
  `built=2 declined=0 AST MATCH`，A10 **SKIP**（旧基线 8456ec3c 本身错，`noBaseline`）；R4 把 `~` / `typeof`
  补进 `IsRestrictedPostfixUnit` 闭集（**第 4 个镜像**在 `direct-expression-engine.IsRestrictedPostfix`），
  `let x = a⏎~b` / `let x = a⏎typeof b` 同样 `built=2 A1 MATCH A10 SKIP`。守卫 `let x = a⏎+ b`（len=383）、
  `let x = ⏎~b`、`let x = ⏎typeof b` 仍 1 条且 A10 PASS（§14.6）。
- **strict 全量化（R3 起 H1′，R4 收口为 D6）**：H1 把 `Ingest` 包进 `try/catch`，`--strict` 下非正例的
  Decline / Incomplete **不再穿出 `Parse`**；R4 又把两处 eager Ingest（`root-expression-statement-possible-shape`、
  `direct-statement-hook`）包住，并让 **`--strict-all` 隐含 `--strict`**（MODE 打印
  `strict=on (implied by --strict-all)`）。合并态 `--strict --strict-all` 与单独 `--strict-all` 都是 **132/0**；
  旧口径「必须联用 / 仍有 2 条红」已废止。
- **`angle.ts` 的 `x<y>z` 歧义**：47 文件 smoke 里相对 8456ec3c 有 1 处既有差异（`angle.ts@4784`，标签模板 vs
  比较链），B1/B2 开关前后完全一致，是 R1/R2 表达式层的既有差异，**不是 R3 引入**，不在 92 条内（R4 观察项）。
- **表达式语句跨行 ASI `a⏎b` / `2⏎3` 已直建（R4）**：`built=2 declined=0`。修复点**不是** `IsAsiBoundary`
  的 1 个 `if`（那个 `if` 依赖的判据在本 case 上本来就返回 true、是行为空操作），而是
  `statement-shape.xl.md` 的 `TryToClose` 给 `ShellPlainExpression` 补的「表达式壳 EOF 也问
  `StatementBoundaryUtil.StatementEndCode`」分支（已获 Lead 追认）。详见 `docs/direct-candidate-pipeline.md` §14.4 / §22.1。
- **`build/ts` 的 552 与主仓库 907**：干净克隆首次构建 **552** 个 `.js`（552 个 `.xl.md` → 552 个 `.ts`）；
  主仓库 `dist/ts` 还残留 **354** 个孤儿 `.ts`（`xl_orphans` 报 354，对应源已删除），所以 `build/ts` 实测
  **907** 个 `.js` = 906 个由现存源编译 + 1 个无引用、未清理的 0 字节
  `typescript/run/statement-block-stream.js`。不影响读数。

---

## 13. R3：语句族直建流程（B1/B2）与 strict 全量化

### 13.1 一条控制流语句的完整链路（以 `if (a) { b; }` 为例）

```
if 的 basic token 关闭
  └─ 根目录判定：ControlFlowStatementPossibleShape（StatementRoute 4 = ShellStatementFamily）
        └─ BuildByIndex：建 IfStatementShape 壳
              ├─ 块体目录 TryMountControlFlowBody 挂好 `{…}`（体内 `b;` 因此有自己的壳）
              └─ H3-b：DirectStatementHook.Attach(shell, context)
                    ├─ Create(ShellStatementFamily) → ControlFlowStatementDirectSession（plugins 已注册）
                    └─ 首次 Ingest(shell.Data)：认首代码单元 `if` → HeadText="if"

壳里每个 basic token 关闭（`(a)` 括号、then 块）
  ├─ H1：session.Ingest(shell.Data) —— 幂等增量（B1 只累积，不在这里判结构）
  └─ 壳的终结候选：条件括号 / 体括号收口 → BuildFromShell（H2）

H2：session.Finish(endIndex)
  ├─ 折 code（跳过 trivia、截断到 endIndex）
  ├─ BuildRange → BuildIf
  │     ├─ ConditionOf(`(a)` 括号)：嵌套 DirectExpressionEngine（basePos = `(`.StartIndex+1）→ IdentifierShape
  │     ├─ then 是 `{…}` → BlockFrom → BuiltChildren：体内 `b;` 已被它自己的表达式语句壳收口 → 收下
  │     └─ Span(IfStatementShape, `if`, 体末, Pos=PositionAt(...))
  └─ 成功 → StatementsBuilt += 1 → 交回；**不 new StatementBuilder**
```

三条要点：

1. **体内语句不是父 session 建的**。块的 `Data` 是体内语句各自收口后的形状；`BuiltChildren` 只「收集 + 校验」，
   见到未收口的 `StatementShape` 就 `Decline(stmt.nested)`（绝不代建，否则 A6 红或静默错建）。
   因此 `built`（`StatementsBuilt`）包含体内语句：`{ let x = 1; }` = 2，而根下节点数 = 1（A3 与 A4 口径不同）。
2. **判定全在 `Finish`**：`Ingest` 只认首代码单元（`; { if while do for return throw break continue`），
   其余全在收口时按 `code` 形态分派——这是 B1 与变量 / 表达式 session 最大的不同（后者是逐格状态机）。
3. **失败即旧路径**：任一 `Build*` 返回 null 时 session 已 `Decline` / `Incomplete`，H2 不 `splice`、旧路径完整接管，
   AST / XML 与直建前逐字节相同。`if (a) { b }`（体末无 `;`，收口时序不确定）就走这条路。

### 13.2 函数声明（`function f(a) { return a; }`）

壳是 `ShellFunctionDeclaration`（kind 8），`Attach` 在 `Ingest` 期只认首单元 `function`（`async` / `declare` /
装饰器前缀在这里就 `Decline(stmt.func)`）。`Finish` 要求**恰好 4 个代码单元**（`function` / 名字 / 参数表 / 体），
参数表只认 Identifier（默认值 / rest / 类型注解 / 解构 → `stmt.func`，这是 A6 守卫），体走 `BlockFrom`：

```ts
const shape = new FunctionDeclarationShape(this.Template);
shape.FunctionName = name;                                  // name.Pos = function 关键字的 EndIndex
shape.Parameters = FunctionDeclarationShape.BuildParameters(this.Owner, parameters, this.Context);
shape.Body = block;                                         // BlockFrom（体内语句各自收口）
shape.Add(name); for (const p of shape.Parameters) shape.Add(p); shape.Add(block);
DirectStatementAssembly.Span(shape, keyword, body, this.BasePos, this.Context);
```

**不用 `FromUnits`** 的原因只有一个：它**有体时**内部 `new StatementBuilder(...)` + `Load` + `BuildStatement()`
建体（`function-declaration-shape.xl.md` 的 `bodyUnit !== null` 分支）——那就是 A6 的 `stmtLoads`，必须为 0。

### 13.3 箭头函数（`(a) => a`，走表达式引擎，不新建 session）

`ShellPlainExpression` 的 `ExpressionStatementDirectSession` 已经存在，所以箭头是 `direct-expression-engine` 的增量：
`(` 参数表先挂起一格（`ParamWait`）等 `=>`；是 `=>` → `StartArrowFromParams`（参数逐个 `IdentifierShape`），
否则退回普通括号表达式；裸参数在 `IngestOperator` 里由 `=>` 认出来（`StartArrow`，`async (a) => a` 在这里被拒）。
体由 `ArrowBody` 子引擎吃（`a => b => c` 递归），体是 `{…}` 时 `BuildArrowBlock` 当场建块——口径与 `BlockFrom` 一致。

### 13.4 注册点：唯一写者是 integration

R4 新增 3 个 kind 的消费方（`ShellLabel` 是新的 `Register` 行；`try`/`switch`/`with`/`debugger`/标签复用
`ShellStatementFamily` / `ShellLabel` 的同一个 session 类），全部写在
`typescript/tokens/direct/direct-build-plugins.xl.md` 的 `Install()` 里（**共 6 行**，物理顺序是
`StatementRoute` 常量顺序 `2,1,4,5,6,8`；B1 的 `ShellStatementFamily` 与 `ShellBlock` 复用**同一个** session 类）。
候选文件（`control-flow-statement-possible-shape`、`block-possible-shape`）里只有**一句** `DirectStatementHook.Attach`，
registry 不在那里——这样两个分支不会改同一个文件，未注册 kind 也天然回退到「行为逐字节不变」。

### 13.5 未覆盖族的现状（R4 收口态）

R4 之后**仍未走直建**的族：`for await`、`case` 空子句体、`switch` 子句语句（壳不接 `Attach`）、
函数体内 `yield` / `await` 语句（body-legacy）、`async (a) => …`、对象成员的 `async` / `*` / 计算属性 / 默认值、
catch 绑定注解 / 解构、类型 / 声明族 D（`class` / `interface` / `type` / `enum` / `namespace` / `import` /
`export` / `declare` / `using`）、装饰器。它们**仍走旧路径**（§6.4 的 `StatementBuilder` 四路分派），
AST / XML 与 R3 逐字节相同；内层变量 / 表达式 / 控制流 / 函数语句仍各自直建。
逐条读数口径见 `docs/direct-candidate-pipeline.md` §19 / §20.3 / §21.3。

---

## 14. R4：剩余语句族 / 生成器·async·对象方法 / C2·D7 收口

### 14.1 `try` / `catch` / `finally` 的链路

```
try 的 basic token 关闭
  └─ 根目录：ControlFlowStatementPossibleShape（路由 4 = ShellStatementFamily）
        └─ BuildByIndex：建 TryStatementShape 壳；`try` / `catch` / `finally` 的体括号各挂目录
              └─ H3-b：DirectStatementHook.Attach → ControlFlowStatementDirectSession
                    └─ Ingest：RecognizeHead 认首代码单元 `try`（R4 起在 AcceptedHeads 里）

壳收口（体括号 / `;` / EOF）→ H2 → session.Finish(endIndex)
  └─ BuildRange → BuildTry
        ├─ 第一个 Block：BlockFrom（体内语句各自收口、BuiltChildren 只收集）
        ├─ `catch` → BuildCatchBinding（绑定是 VariableDeclarationShape，`Data=[Identifier]`）+ Block
        │     └─ 绑定带 `:` / 解构 / 空绑定 → Decline(`stmt.catch`)
        ├─ `finally` → Block（`catch` 可有可无，`finally` 可无）
        └─ Span(TryStatementShape, try, 末单元) → StatementsBuilt += 1
```

`Data` 顺序固定 `[Block, CatchClause?, Block?]`；关键字本身不进 `Data`。目标 case 的 `expectBuilt` 是
**3 / 3 / 4 / 3**（`try{ a; }catch(e){ b; }` 之类 = try 自己 + 两条体内语句），因为体内语句由它们自己的壳计数。

### 14.2 `switch`：`CaseBlock` 与「子句语句仍是 legacy」

- `BuildSwitch`：`condition` = `(` 括号内的嵌套引擎；`CaseBlock` = `{…}`，`SignIn/Out` 是花括号、
  `Pos` 的 **base 是 `{` 的 `StartIndex+1`**（与 `BuildCaseBlock` 的口径一致）；
- `BuildCaseBlock`：`:` 取「三元深度 0 的第一个 `:`」；`case` 的 value 是嵌套表达式；**`case` / `default`
  里的语句不是本 session 建的**——`CaseClauseStatementPossibleShape` 建壳但**不调 `Attach`**，于是它们走 legacy；
- 因此 `stmtLoads` **必然等于子句语句数**（空 `switch` 0、1 子句 1、2 子句 2），A6 打 **SKIP** 并打印准确期望；
  `switch` 自己 `built=1`。`switch (a) { case 1: case 2: b; }`（空子句体）→ `stmt.case`（neg）。
  这就是 `R3-B1-neg-03` 改判 pos（`built=1`）而不把子句语句算进去的原因。

### 14.3 标签语句：`ShellLabel` 的第一个代码单元是标识符

标签壳与其它族最大的不同：首代码单元**不是关键字**，`Ingest` 期不能用 `AcceptedHeads` 判。R4 的做法：

1. `DirectBuildPlugins` 注册第 6 行：`StatementRoute.ShellLabel → ControlFlowStatementDirectSession`；
2. `RecognizeHead` 里 `Kind === ShellLabel` 时记 `LabelText = TextOf(unit)`、`HeadText = lbl:`，**不 Decline**；
3. `BuildLabeled` 要求 `code[1]` 是 `:`（否则 `stmt.label`），体 `code[2..]` 交给**同一个** `BuildRange`
   递归（`for` / `if` / `{…}` / 表达式都在表里）⇒ 标签体不需要新通道；标签体的 `{` 已由
   `TryMountControlFlowBody(..., allowLabel)` 挂好目录；
4. `break lbl` / `continue lbl`：`BuildBreakContinue` 认第三格是 Identifier ⇒ `Data=[Identifier]`。

`lbl: a;` 的 `built=1`（`R4-B3-guard-01`，A10 PASS）——标签**不得**把体内表达式语句再包一层。

### 14.4 `for` 声明头：`DirectDeclarationAssembly.ListFrom`

`BuildFor` 原来对「头部是声明」答 `Decline(stmt.head)`；R4 改为调新部件 `DirectDeclarationAssembly.ListFrom`
（`typescript/tokens/direct/direct-declaration-assembly.xl.md`）：

- 只做 **Identifier 名字 + 可选 `=` 初始化器**（初始化器 = `DirectStatementAssembly.ExpressionOf`，嵌套直建引擎）；
- 类型注解 / 确定赋值断言 → `stmt.type`，解构 binding → `stmt.binding`，`using` → `stmt.head`；
- `declaration.Pos = PositionAt(名字)`；`list.Pos = PositionAt(关键字)`；`SignIn/Out` = 关键字起、末声明止；
- 三槽（`;` 计数 2）与 `for-in` / `for-of`（`;` 计数 0 + `in`/`of`）都走它，`endExclusive` = `in`/`of` 下标。

**A6 要点**：`ListFrom` **不调** `TypeBuilder` / `ExpressionBuilder` / `StatementBuilder`；初始化器只走嵌套直建引擎。
`for (let i = 0; i < n; i++) { b; }` ⇒ `built=2`（for 自己 + 体内 `b;`），`R3-B1-neg-01/02` 与 `R4-B3-pos-11/12` 据此判。

### 14.5 生成器 / async 声明与对象成员

- `function*`：`code.length=5`，`code[1]` 是 `*` ⇒ `Data=[AsteriskToken, name, params…, body]`；
  `AsteriskToken.Pos = keyword.EndIndex`、区间 = `*` 自己。`async function`：`code[0]=async` ⇒
  `[AsyncKeyword, name, params…, body]`，`AsyncKeyword.Pos = BasePos`。参数表仍是纯 Identifier。
- **body-legacy 已被 R5 清除**：两个 possible-shape 的 `BuildByIndex` 各补一行 `Attach`，`yield` / `await` 语句
  现在由 `ControlFlowStatementDirectSession` 直建（`BuildYield` / `BuildAwait`，`RS-pos-01…04`）；
  `R4-B4-pos-01/02/04` 的 `expectBuilt` 1→2、`a6Skip` 删除，A6 实测 **0**（§15.4）。
- 对象方法（R5 扩前缀与参数）：`ObjectLiteralExpressionShape` 的成员循环里，`async` / `*` / `Name` 之后是 `(` ⇒
  `MethodDeclaration`（前缀是子节点）；`get`/`set` ⇒ 访问器（get 必须 0 参、set 必须 1 参）；组装在
  `DirectObjectMemberAssembly.MemberFrom`；方法体 `BlockFrom`；参数门与函数声明共用 `ParametersAreTypeAnnotated`；
  `async *` / 计算属性 / 默认值 → `expr.member`。`({ m(a: number) {} })` ⇒ `built=1`。

### 14.6 C2 的收口点（`TryToClose`）与 D7 的第 4 个镜像

- **C2**：表达式壳在 **EOF** 由 `StatementShape.TryToClose` 收口；R4 之前那一支把 `endIndex` 直接钉在
  `lastCode`，`a⏎b` 整段被吞进一条壳。R4 给 `ShellPlainExpression` 补了「EOF 也问
  `StatementBoundaryUtil.StatementEndCode(..., atEof=true, ...)`」的分支（与声明族 / 控制流族同一口径），
  壳在 `b` 之前收口 ⇒ 两条语句各自直建（`built=2`）。
  **`IsAsiBoundary` 里那个 `if` 不是修复点**：该判据对 `a⏎b` 本来就返回 true，单独加它是行为空操作。
  R5 把这条恒真分支与 3 个 helper（`IsLineStartOperandBoundary` / `IsOperandStartUnit` / `IsContinuationToken`，
  共 **111 行**）**删除**，`IsAsiBoundary` 的 `return !IsContinuation(current);` 一行未动；
  `CL-pos-01` 与两条 guard 钉住删除前后行为不变。
- **D7**：R5 起闭集**只有一份**（`typescript/tokens/statements/statement-token-sets.xl.md` 的 `StatementTokenSets`）：
  `IsRestrictedPostfixText`（`++ -- ! ~ typeof as satisfies`）/ `IsRestrictedPostfixUnit`（`Token` 版入口，只做
  `Symbol` / `Common` 判别）/ `IsExpressionContinuation`（续接闭集）。三个消费者（边界层、引擎层、
  `ExpressionStatementPossibleShape.IsContinuation`）都改成**一行委托**；`statement-scanner` /
  `statement-builder` 的 `ContinuesAcrossLine` 不动（语义面不同）。
  `let x = a⏎~b` / `let x = a⏎typeof b` 仍 `built=2`、A1 MATCH、A10 SKIP(noBaseline)；守卫 `let x = a⏎+ b`、
  `let x = ⏎~b`、`let x = ⏎typeof b` 仍 1 条且 A10 PASS。单测 `tests/direct-build/token-set-parity.mjs` 钉
  「同源 + 纯委托 + 单一定义」，实测 **PASS**（§15.5）。

### 14.7 R4 命令与读数（132 条；R5 的 189 条见 §15.6）

```powershell
$clone = "C:\Users\Admin\Documents\GitHub\xl-example-set\docs-r4"
$setup = "C:\Users\Admin\Documents\GitHub\xl-example-set\chore-all-possible-setup"
cd $clone

# xl_build(cwd=$clone, paths=["core","typescript"], targets=["ts"], out="dist", orphans=false)
#   实测：554 written, 0 error(s), 3 warning(s)
node node_modules/typescript/bin/tsc -p tsconfig.json      # exit 0；build/ts = 554 个 .js

node tests/direct-build/target-cases.mjs --group=r1        # 10/0；builtCases=10/10 loads=0
node tests/direct-build/target-cases.mjs --group=r2        # 50/0；builtCases=35/50 loads=53
node tests/direct-build/target-cases.mjs --group=r3 --expect-direct --strict --decline-stats --baseline=$setup
#   实测：32/0；builtCases=27/32 loads=17；DECLINE-STATS: total=5 categories=3
node tests/direct-build/target-cases.mjs --group=r4 --expect-direct --strict --decline-stats --baseline=$setup
#   实测：40/0；GROUPS: B3=16 B4=12 C2=5 D7=4 S=3；builtCases=34/40 loads=52
node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats --baseline=$setup
#   实测：132/0；A1..A12 全 PASS；builtCases=106/132 loads=122；DECLINE-STATS: total=22 categories=7
node tests/direct-build/target-cases.mjs --strict-all --expect-direct --decline-stats --baseline=$setup
#   实测：132/0；MODE: ... strict=on (implied by --strict-all) strict-all=on ...
```

**改判 6 条**（R4-Q1 的 4 条 + `R2-A2-neg-01` + `R2-C2-01`）：`R3-B1-neg-01/02`（`built=2`）、`R3-B1-neg-03`
（`built=1`）、`R3-B2-neg-03`（`built=1`）、`R2-A2-neg-01`（`({m(){}})` → pos `built=1`）、`R2-C2-01`
（`a⏎b` → pos `built=2`）。r1/r2/r3 的条数不变（10/50/32），变的只是 pos/neg 构成与 `builtCases` / `loads`。

---

## 15. R5：类型层 / 声明族 / 残余语句的完整链路（189 条）

> R5 把直建从「语句 / 表达式」扩到**类型层与声明层**，并清掉 R4 的两处 body-legacy 与三处镜像债：
> 新增 **57** 条目标 case（`TY` 20 / `DC` 20 / `RS` 12 / `CL` 5），累计 **189**；只验目标 case，不跑门标准。
> 机制细节与命令读数另见 `docs/direct-candidate-pipeline.md` §23（本节讲「一条语句在链路里怎么走」）。

### 15.1 带类型注解的变量语句（`let x: number = 1;`）

```
根目录：`let` → VariableStatementPossibleShape.Accept → 壳（kind 0）
  └─ H3：VariableStatementDirectSession
        ├─ H1 逐格 Ingest：let → x → `:`  ⇒ 进入 ExpectType=6，TypeStart = `:` 的 EndIndex，
        │                                 之后的单元进 TypeUnits（类型位，允许括号 / 符号 / trivia 跳过）
        ├─ `=` 到达 ⇒ FlushType：DirectTypeAssembly.TypeOf(TypeUnits, TypeStart, …)
        │     ├─ new TypeBuilder + Load(units, basePos) + ParseType()
        │     ├─ 覆盖校验：OriginalConsumed() == 最后一个代码单元下标 + 1（`>>` 已映射回原 units）
        │     ├─ 成功 ⇒ declaration.Add(NumberKeyword) ⇒ Data = [Identifier, Type]
        │     └─ 失败 ⇒ Decline("…", "var.type") → 旧路径接管（AST 不变）
        ├─ 初始化器 `1` 照旧走嵌套直建引擎 ⇒ Data = [Identifier, Type, Initializer]
        └─ `;` 收口 H2：Finish → VariableStatementShape；StatementsBuilt += 1；StatementBuilder 未 Load
```

要点：① `ExpectType` 的四个出口是 `=` / `,` / `;` / EOF(ASI)，`TY-pos-03`（无 `;`）与 `TY-pos-04`（多声明）
分别钉住后两者；② `!`（确定赋值断言）**不进** `ExpectType`，仍 `Decline(var.type)`（`TY-neg-01`）；
③ `TypeBuilder.Load` **不计 A6**，所以整条链的 `stmtLoads` / `exprLegacy` 都是 0；④ 覆盖校验失败**不交半棵树**。

### 15.2 函数声明（`function f(a: number, b?: string, ...c: T[]): void {}`）

1. 壳（`ShellFunctionDeclaration`，kind 8）→ `FunctionDeclarationDirectSession`；
2. `BuildDeclaration` 先过参数门：R3 的 `ParametersAreIdentifiers`（纯标识符）**或** R5 的
   `ParametersAreTypeAnnotated`（`a` / `a?` / `...a: T` / `: T`，类型位任意单元；`=` / `{` / `[` / `@` 即拒）。
   两门**并存**，纯标识符仍走旧门（`TY-guard-01`）；**rest 必须带类型注解**（`function f(...a) {}` 仍 `stmt.func`，
   `R3-B2-neg-02` 不动）；默认值会让 `TakeParameterInitializer` 拉 `ExpressionBuilder` ⇒ `TY-neg-02`；
3. 参数节点由静态工厂 `FunctionDeclarationShape.BuildParameters` 建（`?` / `...` / `: T` 都是子节点），
   **不复制第二份配方**；
4. 参数表之后、体之前若出现 `:` ⇒ 把 `:` 与 `{` 之间的单元交 `DirectTypeAssembly.ReturnTypeOf`
   （走 `ParseReturnType`，类型谓词由它分流），`shape.ReturnType = t` 且 `shape.Add(t)`；
   子节点顺序 **name → params… → returnType → body**；
5. 体走 `BlockFrom`（体内语句各自 H2 收口、各 +1）⇒ `function f(a: number) { return a; }` 的 `built` 是 **2**
   （函数 + `return` 语句），`TY-pos-11/12/13` 与 `TY-guard-01` 的 `expectBuilt=2` 即此口径。

### 15.3 声明族（`interface X { a: number; }` / `type T = A;` / `enum E { A, B }`）

声明壳**早已存在**（`DeclarationStatementPossibleShape` 继承 `ControlFlowStatementPossibleShape`，
R3 的 `DirectStatementHook.Attach` 就是唯一挂载点）。R5 只加一个 session + 3 行注册：

```
kind 7（ShellDeclarationFamily）→ DeclarationFamilyDirectSession
  ├─ Ingest 首格：kind 9/10 立刻 Decline(decl.class)；kind 7 按首代码单元 RecognizeHead
  │     interface/type/enum ⇒ 继续；namespace/import/export/declare/using/class/@ ⇒ Decline(decl.head / decl.class)
  └─ Finish(endIndex)：
        ├─ 截断到 endIndex 折 code / codeAt（壳可能吞进下一条，只消费到收口区间）
        ├─ 头复核：收口区间首单元必须与首格同族（否则 decl.shape）
        ├─ 分派：InterfaceDeclarationShape.FromUnits(owner, 0, bodyIndex, ctx)
        │         TypeAliasDeclarationShape.FromUnits(owner, 0, lastIndex, ctx)
        │         EnumDeclarationShape.FromUnits(owner, 0, bodyIndex, ctx)（成员门先拒 `=` / `[` ⇒ decl.enum）
        ├─ shape.Pos = this.BasePos          ← FromUnits 内部 start=0 会算成 0，必须覆盖
        ├─ 覆盖校验：built.EndIndex == 壳最后一个代码单元 EndIndex（含 `;`），否则 decl.coverage
        └─ StatementsBuilt += 1（成员 / 体内语句不是语句，不另计）
```

要点：① `interface X {}`（空体）与 `type T = A`（ASI 无 `;`）都必须通过覆盖校验，不能把「空」判成不完整；
② `type` 别名的 RHS 是**类型节点的免费载体**（`TypeBuilder` 全量读 + 覆盖校验）；
③ `class` / 装饰器 / `namespace` / `import` / `export` / `declare` 都是**显式 Decline**（不是「没 session」），
负例断言 `declined>=1` 且命中对应 category；④ `const enum` / `export interface` 走不到这里（safe，§12 / §15.6）。

### 15.4 `yield` / `await` / `for await`（R4 的 body-legacy 在 R5 消除）

- 两个 possible-shape 的 `BuildByIndex` 末尾各加一行 `DirectStatementHook.Attach(shell, context)`：
  壳一建好就接 session（R4 时有壳、不接，于是 legacy 收口、A6 必然 > 0）；
- `ControlFlowStatementDirectSession.AcceptedHeads` 加 `yield` / `await`：
  `BuildYield` 建 `ExpressionStatement[YieldExpression]`（`yield* a` 的 `AsteriskToken` **是子节点**，
  `Pos = yield.EndIndex`）；`BuildAwait` 建 `ExpressionStatement[AwaitExpression]`，操作数交给引擎；
- 引擎 `ExpectOperand` 里 `await` 与 `typeof` 同级（一元前缀）⇒ `await g() + 1` = `(await g()) + 1`，
  不是 `await (g() + 1)`。`async` 箭头：语句首 `async` + `(` ⇒ `AsyncPending`，参数表闭合且下一格 `=>` ⇒
  `ArrowFunctionShape[AsyncKeyword, Parameter…, =>, body]`；不是箭头就回退 Identifier `async` + 后缀链；
- `for await (… of …)`：`BuildFor` 认 `for` `await` `(`，`Data = [AwaitKeyword, binding, collection, body]`；
  `AwaitKeyword` **是子节点**（`Pos = for.EndIndex`），漏了它 A1 差一个 child；
- 对象成员：方法前缀扩 `async` / `*`，参数门与函数声明**同一个** `ParametersAreTypeAnnotated`；`async *m()` 仍
  `expr.member`（`MethodDeclaration` 的 children 顺序不成立）。
- 结果：`R4-B4-pos-01/02/04` 的 `expectBuilt` 1→2、`a6Skip` 删除、A6 实测 0；`R4-B4-neg-01/03` 与
  `R3-B2-neg-04` 改判 pos。顶层 `await a` / `yield a`（`R2-SAFE-01/03`）仍 `safe`：语句壳要求父是 `{`，
  顶层父是 `SourceFileShape`，要直建须改 `statement-route-util`（R6）。

### 15.5 单一来源与 CL：`StatementTokenSets` / C2 死分支 / 合法化的 `as`·`satisfies`

- **D7 闭集唯一来源**：新叶子 `typescript/tokens/statements/statement-token-sets.xl.md`（只 import `core`）导出
  `IsRestrictedPostfixText` / `IsRestrictedPostfixUnit` / `IsExpressionContinuation`；三个消费者
  （`StatementBoundaryUtil.IsRestrictedPostfixUnit`、`DirectExpressionEngine.IsRestrictedPostfix`、
  `ExpressionStatementPossibleShape.IsContinuation`）都是**一行委托**，无第二份字面量表。
- **C2**：`statement-boundary-util` 的恒真分支 + `IsContinuationToken` 手工副本（3 个 helper、111 行）删除；
  C2 的真修复点仍是 `TryToClose` 的 `ShellPlainExpression` 分支（§14.6），`CL-pos-01` / 两条 guard 钉住删除前后一致。
- **`as` / `satisfies` 合法化（R5-A2）**：进受限后缀闭集后，声明族与引擎自动继承；`DirectTokenUtil` 把两词移出
  标识符保留字表（运算符位是运算符、操作数位是标识符，tsc 实测）。
  `R5-CL-pos-02/03` 用**合法等价源** `let x = a⏎as;⏎b;` / `…satisfies;⏎b;` 验证「行首 `as` / `satisfies` 另起语句」
  （`built=3`、A1 MATCH、`noBaseline`）；原 `let x = a⏎as b` 属 tsc missing-semicolon recovery 的**非法输入**，
  R6 再做恢复语义。表达式语句侧 `a⏎as` 仍是 PARSE-ERROR（控制组同样，非回归）。
- **parity 单测**：`node tests/direct-build/token-set-parity.mjs` → **RESULT: PASS**（8 PASS + 1 INFO）：
  三个导出齐全、三个消费者纯委托、每个闭集全仓只有一份定义、`CORPUS` 59 个 token 供同步核对。

### 15.6 R5 命令与实测读数（189 条）

```powershell
$clone = "C:\Users\Admin\Documents\GitHub\xl-example-set\docs-r5"
$setup = "C:\Users\Admin\Documents\GitHub\xl-example-set\chore-all-possible-setup"
cd $clone

# xl_build(cwd=$clone, paths=["core","typescript"], targets=["ts"], out="dist", orphans=false)
#   实测：557 written, 0 error(s), 3 warning(s)（既有 E1107 重复类型声明）
node node_modules/typescript/bin/tsc -p tsconfig.json      # exit 0；build/ts = 557 个 .js

node tests/direct-build/target-cases.mjs --group=r1        # 10/0
node tests/direct-build/target-cases.mjs --group=r2 --expect-direct --strict --decline-stats --baseline=$setup   # 50/0
node tests/direct-build/target-cases.mjs --group=r3 --expect-direct --strict --decline-stats --baseline=$setup   # 32/0
node tests/direct-build/target-cases.mjs --group=r4 --expect-direct --strict --decline-stats --baseline=$setup   # 40/0
node tests/direct-build/target-cases.mjs --group=ty --expect-direct --strict --decline-stats --baseline=$setup   # 20/0
node tests/direct-build/target-cases.mjs --group=dc --expect-direct --strict --decline-stats --baseline=$setup   # 20/0
node tests/direct-build/target-cases.mjs --group=rs --expect-direct --strict --decline-stats --baseline=$setup   # 12/0
node tests/direct-build/target-cases.mjs --group=cl --expect-direct --strict --decline-stats --baseline=$setup   # 5/0
node tests/direct-build/target-cases.mjs --group=r5 --expect-direct --strict --decline-stats --baseline=$setup   # 57/0
node tests/direct-build/target-cases.mjs --expect-direct --strict --decline-stats --baseline=$setup              # 189/0
node tests/direct-build/target-cases.mjs --strict-all --expect-direct --decline-stats --baseline=$setup          # 189/0
node tests/direct-build/token-set-parity.mjs                                                                    # PASS
```

实测汇总（本克隆，2026-10-26）：`--group=r5` **57/0**（`builtCases=48/57 loads=24`，DECLINE `9/7`）；
全量 **CASES=189 FAILED=0**（`builtCases=157/189 loads=126`，`DECLINE-STATS: total=28 categories=11`）；
`--strict-all` **189/0**（MODE 含 `strict=on (implied by --strict-all)`）；`Q5: mode=auto → 6 条 expect=pos，未出现 0 条`。
逐组：r1 10/0、r2 50/0、r3 32/0、r4 40/0、ty 20/0、dc 20/0、rs 12/0、cl 5/0。

**主仓库交付口径（A4 prune 后）**：`dist/ts` 与 `build/ts` 各 **557**，与 557 个 `.xl.md` 源一一对应；
`xl_orphans(out="dist", prune=true)` 实测 **354 found / 354 removed**，prune 前后 `git status --porcelain` 均空、
`git ls-files dist build` = 0，prune 后重建复跑仍 **189/0**。

**R6 遗留**（细节见 `docs/direct-candidate-pipeline.md` §23.9）：`class` / 声明族建树、装饰器、
missing-semicolon recovery、顶层 `await`·`yield` 路由、`const enum`、`--q1`/`--q4` 退役、`angle.ts` 的 `x<y>z` 歧义
（47 语料 `XML-DIFF=1`，辅助指标）。
