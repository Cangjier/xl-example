# 语句 → AST 全流程：以 `let x = 1;` 为案例

> 本文只回答一件事：**一条语句从源码字符到 AST 节点，在现行代码里到底经过哪些步骤、每一步由谁负责、数据长什么样**。
> 所有代码位置以 `*.xl.md` 为准；文中的 trace 都是在本仓 `build/ts` 产物上实测得到的（复跑方式见 §11）。
>
> 案例源码：`let x = 1;`（紧跟第二句 `let y = 2;`，用来展示「语句在文件中段如何收口」；文件末尾只有一句时的差异见 §7.2）。

---

## 0. 一句话版本

```
字符流
  └─(SyntaxContext 驱动 128 字符窗口)→ basic token（Common / Symbol / WrapSymbol / Bracket / String …）
        └─(basic token Close 时只问父单元)→ CatalogGuide 判定候选
              ├─ 根目录：17 个语句候选 + 1 个终结候选
              └─ 命中 let/const/var + 绑定 → VariableStatementPossibleShape.Accept
                    └─ BuildByIndex：搬走已攒单元，建一个 StatementShape「语句壳」，挂到根上
                          └─(壳里的每个 basic token Close)→ 壳的终结候选 StatementEndPossibleShape
                                └─ 在 `;` 上 Accept → BuildFromShell
                                      ├─ VariableStatementThreeLayer.TryBuild（三层 possible 判型）
                                      └─ StatementBuilder.BuildStatement / BuildVariableStatement
                                            └─ IdentifierShape + NumericLiteralShape + 声明/列表/语句节点
                                                  └─ 关闭后的形状树 = AST（cjAst / ToXmlString 直接读它）
```

关键认识有三条：

1. **AST 不是另建的一棵树**。`StatementBuilder` 建出来的就是 `ShapeToken` 子类节点（`VariableStatementShape`、`IdentifierShape` …），关闭即 AST；`cjAst` 只是把 `constructor.name` 去掉 `Shape` 后缀，`ToXmlString` 用同一个类名当 XML 标签。见 `typescript/cases/ast-compare.mjs:106` 与 `core/syntax/token.xl.md:353`。
2. **语句的「边界」与「建树」是两件事，分两步发生**：possible 层只决定「从哪里开始、到哪里结束、归哪个族」；`StatementBuilder` 只做「给定一段连续 raw 单元，原子地建出节点」。
3. **判定和建壳是同一份状态的两个读者**：`ComputeByIndex` 把扫描进度写进 `PossibleShapeCache`，`BuildByIndex` 必须复用同一份 cache（`typescript/IMPORTANCE.md` §3.4），否则会出现「判到 A 格、建到 B 格」的错位。

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
| 建树器 | `typescript/tokens/statements/statement-builder.xl.md`、`typescript/tokens/expressions/expression-builder.xl.md` | 从无 trivia 的 `Units` + `Positions` 原子建节点 |
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
- **文件在 `;` 后立刻结束**（`let x = 1;` 无后续字符）：没有下一个字符来关闭 `;`，于是 `SourceFileShape.Process` 的 EOF 路径先 `mounted.TryToClose(context)`（`source-file-shape.xl.md:101`）→ `StatementShape.TryToClose`（`statement-shape.xl.md:268`）自己算 `lastCode` / 族边界，直接 `BuildFromShell` + `FinishShell`。实测单句 `let x = 1;` 的 `BuildFromShell(endIndex=7, Kind=0, Pos=0)` 与两句版第一句完全一致。
- **块里的语句遇到 `}`**：`StatementShape.ExitOrPre`（`statement-shape.xl.md:228`）在父单元是 `{` 括号、当前字符是 `}` 时先收口，再 `Reload`，让 `}` 回到块层。

三条路，一个建树入口。

### 6.3 BuildFromShell：四路分派

`StatementShape.BuildFromShell`（`statement-shape.xl.md:63`）先做准备工作，再按 `Kind` 选建树方式：

```ts
const consumed = host.Data.slice(0, endIndex + 1);        // 收口点之前的 raw 段（含 trivia）
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

本案例 `Kind = 0`，所以走第二行：

1. `VariableStatementThreeLayer.TryBuild`（`variable-statement-three-layer.xl.md:48`）先用 `VariableDeclarationListUtil.Judge(consumed)` 判「这是不是一条 let/const/var 声明列表」：头是 `let`、下一代码单元能起绑定、末单元是 `;`、`VariableDeclarationUtil.VerifyItems` 能数出 1 个声明 → `State=1, Declarations=1`。
2. 判型成立后调**同一个** `builder.BuildStatement()`（同一 builder、同一段 consumed、同一 Pos），所以接管不改变节点/Pos/End——AST 相等是构造保证，不是靠测试兜住。
3. `builder.At !== builder.Units.length` 时抛「语句没有读完」。

### 6.4 StatementBuilder：raw 段 → 节点

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

`StatementShape.FinishShell`（`statement-shape.xl.md:148`）：

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

### 7.2 单句 + EOF 的差异

`let x = 1;`（无后续字符）最终 XML/JSON 与 7.1 的第一句逐字节相同，只是收口触发点从「`;` 关闭 → 终结候选」变成「EOF → `StatementShape.TryToClose`」。两条路都调 `BuildFromShell`，所以建树结果没有第二条路径。

---

## 8. 一张图看「从 raw 段到节点」

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

失败时的退路（按顺序）：

- 表达式形状树折不出 AST → `StatementShapeAst.Decline` 记数，退回 `BuildStatement()`（当前语料 2 次）；
- `StatementFamilyDispatch` 越界 → 计数后 `BuildStatement()`（默认解析 `LegacyStatementDispatchCount = 0`）；
- 整条文件抛异常 → `SourceFileRunner.Parse` 用 `EnableShellExpressions=false` 的 legacy 目录**整文件重解析一次**（`source-file-runner.xl.md:47`，`file-fallback` 实测 0）。

---

## 10. 其它语句族的差异（速查）

| 族 | 建壳候选 | 壳 `Kind` | 收口判据 | 建树入口 |
| --- | --- | --- | --- | --- |
| `let/const/var` | `VariableStatementPossibleShape` | 0（None） | 短语句族 `;`/ASI/EOF | 三层 possible → `BuildStatement`（内部 `BuildVariableStatement`） |
| 普通表达式语句 | `RootExpressionStatementPossibleShape` | `ShellPlainExpression` | `;`/EOF/ASI（`ExpressionEndCode`） | 形状树 → `StatementShapeAst.BuildExpressionStatementFromShapes`；拒绝则 `BuildStatement` |
| 控制流 / 块 / 标签 | `ControlFlowStatementPossibleShape`、`BlockPossibleShape` | `ShellStatementFamily` / `ShellBlock` / `ShellLabel` | 体括号 / 链式 `else/while/catch/finally` | `StatementFamilyDispatch.Build` → `BuildIf/BuildWhile/…` |
| 根层 `function` / `class` / `@dec` | `ControlFlowStatementPossibleShape`（路由 8/9/10） | `ShellFunctionDeclaration` / `ShellClassDeclaration` / `ShellDecoratedDeclaration` | `DeclarationShellEndCode`（体括号 / `;` / 声明跟随边界） | `BuildFunctionDeclaration` / `BuildClassDeclaration` / `BuildDecoratedStatement` |
| 声明族（`interface/enum/type/namespace/import/export/declare`） | `DeclarationStatementPossibleShape`（路由 7） | `ShellDeclarationFamily` | `ExpressionEndCode` + `DeclarationFamilyBodyEndCode` | `StatementFamilyDispatch.Build` → 各 `Build*Declaration` |
| 块内语句 | 块体 `Bracket` 的目录 | 同各族 | 同上 | 块体目录建壳后同一套 |

同一个 shell 机制在三处被复用：根目录、块体括号目录、控制流体括号目录；差别只在「谁持有目录、候选表有哪些、`Kind` 是什么」。

---

## 11. 复跑与验证

前置（仓库根；`dist/`、`build/` 是生成物、被 gitignore）：

```powershell
# 1) 规范 → dist/ts（本仓 xl 不在 PATH，用 xl 工具）
#    xl_build(cwd="<repo>", paths=["core","typescript"], targets=["ts"], out="dist")
node node_modules/typescript/bin/tsc -p tsconfig.json     # exit 0

# 2) 本文章节里的读数
node typescript/cases/ast-json.mjs                         # total 6171 / cj-ok 6171 / cj-fail 0
node typescript/cases/ast-json-diff.mjs                    # 6171/6171；结构差 0 / 位置差 0 / 字段差 0
node tests/statement-possible/harness.mjs --only=stage1-let  # pass=2 fail=0；double-accept 冲突 0；file-fallback 0
```

本机实测（2026-10-25，HEAD `11e0c68f`，定向构建 `core`+`typescript` 后）：`xl_build` 0 error、`tsc` exit 0；上面三条读数与 `docs/Final.md` §4 一致。

复现本文的 trace：在 `build/ts` 上包一层 `CatalogGuide.prototype.ComputePossibleShapesByIndex`，进入前记 `host.constructor.name / tokenIndex / host.Data`，调用时临时包装每个候选与 `EndPossible` 的 `ComputeByIndex` 记返回值，再包 `StatementShape.BuildFromShell` 与 `StatementBuilder.prototype.BuildStatement`。核心代码：

```js
const { CatalogGuide } = require('./build/ts/core/syntax/catalog-guide.js');
const { StatementShape } = require('./build/ts/typescript/tokens/statements/statement-shape.js');
const log = [];
let current = null;
const orig = CatalogGuide.prototype.ComputePossibleShapesByIndex;
CatalogGuide.prototype.ComputePossibleShapesByIndex = function (host, i, ctx) {
  const rec = { host: host.constructor.name, i, unit: host.Data[i], states: [] };
  log.push(rec); current = rec;
  try { return orig.call(this, host, i, ctx); } finally { current = null; }
};
const origBuild = StatementShape.BuildFromShell;
StatementShape.BuildFromShell = function (host, endIndex, ctx) {
  console.log('BuildFromShell', host.constructor.name, 'endIndex=', endIndex, 'Pos=', host.Pos);
  return origBuild.call(StatementShape, host, endIndex, ctx);
};
// 再对每个 new CatalogGuide 的 PossibleShapes / EndPossible 包装 ComputeByIndex 记 state 即可
```

（包装只读状态、不改行为；本仓 `tests/statement-possible/harness.mjs` 用的也是同一套 monkeypatch 思路。）

---

## 12. 已知口径偏差与残余（读代码时别踩）

- `typescript/IMPORTANCE.md` §4 的「shape 闭区间、AST 换算 +1」是旧口径；现行实现是 `SourceRange` 半开、AST `end` 直接取 `EndIndex`（见 §1）。
- `StatementPossibleShape` 仍存在，但默认根目录**不注册**它（`source-file-shape.xl.md:145` 的注释；只在 `EnableShellExpressions=false` 的 legacy 目录里插回第 4 位）。读默认路径时不要把它当成主入口。
- `VariableStatementThreeLayer.TryBuild` 内部调的是 `BuildStatement()`，不是 `StatementFamilyDispatch`；`LegacyStatementDispatchCount` 计的是 `BuildFromShell` 里 family 分派返回 null 后的那次兜底，两者不是同一件事。
- 残余：整文件 fallback 4 例、块体 raw 尾巴 4 例、形状树拒绝 2 例、`ScanRoot` 46 次全在 fallback 重解析里（`docs/Final.md` §6.2）。
