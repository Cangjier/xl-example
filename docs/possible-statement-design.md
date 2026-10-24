# possible-statement 下一步完整重构设计

> 基线分支：`feature/possible-statement` @ **`e335f1fb`**（= `3eb86b72` + 原型 A `bc7ad673` + 原型 B `34efe57b`，两 merge commit 保留）。
> 本文件是**可执行设计**，给 3–5 个并行实现成员直接开工用；接口签名在本轮**冻结**（§11），改动需先改本文件。
> 事实来源：`recon-core.md` / `recon-parse.md`、两份原型 HANDOFF、`MERGE-REPORT.md`、`VERIFY-REPORT.md`，以及本分支上的实际代码（`statement-shape.xl.md` 128 行、`statement-end-possible-shape.xl.md` 89 行、`variable-statement-possible-shape.xl.md` 140 行、`shape-insert-util.xl.md` 58 行、`operator-table.xl.md` 74 行、`feas-operator-parser.xl.md` 289 行）。
> 纪律：`.xl.md` 是唯一事实来源；`dist/`、`build/` 是产物（gitignore），提交只含 `.xl.md` 与 `tests/*`。

---

## 0. 现状一句话与目标一句话

**现状**：语句 = 「根目录候选攒 raw basic token → `StatementScanner.ScanRoot` 说声到齐 → `StatementBuilder` 一口气建整条 → `splice` 顶替」；已有原型把 `let/const/var` 改成**壳**（语句起点建 `StatementShape`、自带 `CatalogGuide([], StatementEndPossibleShape)`、`;`/ASI/EOF 收口、原位换成品），表达式语句与操作符仍是 legacy，`Feas*` 候选 `BuildByIndex` 仍是桩。

**目标**：**语句壳成为唯一语句宿主**——语句起点建壳挂载，壳自带「语句体候选目录 + 语句终结候选」，由 `;`/ASI/EOF 收口；语句体候选按语句族分工，表达式体再按操作符 possible 增量建树（高优先级操作符用 `ShapeInsertUtil.InsertBetween` 插进父子之间）。AST 必须逐节点不变（`ast-json-diff` 0/0/0 是硬门禁）。

---

## 1. 目标架构

### 1.1 StatementShape 壳的生命周期（六步，A 已跑通前四步）

| # | 时机 | 动作 | 负责者 | 现状 |
|---|---|---|---|---|
| 1 | 语句第一个**代码**单元关闭 | 起点候选 `Accept` | `VariableStatementPossibleShape` / 新增 `RootExpressionStatementPossibleShape` / 未来各语句族候选 | A 已实现（变量），其余待加 |
| 2 | 同一格 | `BuildByIndex`：把 `[start..tokenIndex]` 的 raw 单元搬进 `new StatementShape`、`SignIn(headStart)`、`Pos`=前一个非 trivia 单元 `EndIndex`、`shell.Data.splice` 原位插回、`shell.Parent=host`、`host.MountedUnit=shell`、`shell.CatalogGuide = new CatalogGuide(体候选, new StatementEndPossibleShape())` | 同上 | A 已实现（`variable-statement-possible-shape.xl.md` 的 `BuildByIndex`） |
| 3 | 之后每个 basic token 关闭 | 流进壳（`UnitToken.Process` 转给 `MountedUnit`）；壳 `Data` 只追加 | `UnitToken`（core，不改） | 已通 |
| 4 | 壳自己的目录 | 体候选逐格判型 → 只剩一个 → `BuildByIndex` → 目录 `Reset` → 循环 | 各体候选 | **Stage 3 起才真正使用**；Stage 1/2 体候选为空集 |
| 5 | `;` / ASI 边界 / EOF | `StatementEndPossibleShape.ComputeByIndex` → `Accept`（且体候选已全部 `Reject`）→ `BuildByIndex` → `StatementShape.BuildFromShell(endIndex)` + `FinishShell(built)` | `statement-end-possible-shape` | A 已实现，判据复用 `ScanRoot`，**待换成统一判据（§2）与增量扫描（§8）** |
| 6 | 建不出来（EOF 且 `BuildFromShell` 抛错） | 拆壳：raw 单元原位退回父 `Data`、清 `parent.MountedUnit`、自己摘除并 `Closed`，让根终结候选按基线口径收口 | `StatementShape.TryToClose` | A 已实现（token-ast 4 个 diff 的根因修复，**必须保留**） |

**不变量（冻结）**：

- I1 壳**不进 AST**：收口一律走 `FinishShell`，壳 `Data` 里剩余 raw 单元按原序挪到语句形状之后。
- I2 壳的 `CatalogGuide` 体候选集在 Stage 1/2 为**空数组**——这样 `EndPossible` 永远不会撞「终结候选与其它候选同时成立」（core `catalog-guide.xl.md:90-96` 抛错）。Stage 3 起体候选非空，靠 §1.4 的「不同格」不变量维持。
- I3 `BuildFromShell` 喂给 `StatementBuilder` 的必须是**同一份 raw 单元切片与同一 `Pos`**（与 legacy `StatementPossibleShape.BuildByIndex` 逐字同口径），这是 AST 零差异的根。
- I4 所有候选的 `ComputeByIndex` 必须**全函数**：任意合法/残缺前缀返回 `Uncertain`，不得集体 `Reject`（0 候选且无 EndPossible 时 core 直接抛错）；且**只有 trivia**时禁止 `Reject`（`VariableStatementPossibleShape` 已加 5 行修复，是被永久删除的 `Candidates` 造成的 28 个 crash 的根因，新候选一律照抄）。

### 1.2 语句体候选怎么分工：**根上按语句族，壳内按构件**（决策 D1）

- **根目录（`SourceFileShape`）**：每个候选负责「**一类语句的起点**」，一格内**显式互斥**。不采用「一个候选吃全部语句族」（今天 `StatementPossibleShape` 那样）——它无法与新增的壳化候选共存，且判据会越滚越大。
- **壳内目录（`StatementShape.CatalogGuide`）**：候选负责「**语句体的构件**」（表达式叶子 / 操作符 / 声明列表项 / 条件子句 …），**不重复语句族判型**；语句族在壳建立时已由根候选决定，记在壳上（建议字段 `StatementShape.Kind:int`，不要靠猜）。
- 理由：根格每 basic token 都要问一遍，候选越少越好；壳内格只在本条语句内问，可以多。且「族 → 构件」是树形分派，天然可由壳的 `Kind` 选中不同体候选表。

### 1.3 let/const/var 的 possible 分层（决策 D2）

三层，**每层只判一件事**，禁止跨层复用判据：

| 层 | 文件 | 判什么 | 谁注册 | 现状 |
|---|---|---|---|---|
| 语句级 | `statements/variable-statement-possible-shape.xl.md` | 「首代码单元是 `let/const/var` 且下一格 `StatementScanner.StartsBinding`」→ 建壳 | 根目录 | A 已实现 |
| 声明级 | `declarations/variable-declaration-list-possible-shape.xl.md` | 壳体目录里：`Decl` `,` `Decl` … 的**列表与逗号**；`;`/ASI 收口交给 `EndPossible` | 壳体目录（Stage 5） | 桩 |
| 单条声明 | `declarations/variable-declaration-possible-shape.xl.md` | `Name`（+`!`）`=` `Initializer`、`:` `Type`、解构；建 `VariableDeclarationShape` | 列表候选内部（Stage 5） | 桩 |

**不启用** `keywords/{let,const,var}-keyword-possible-shape.xl.md`：关键字是 basic token，壳挂载后它的直接父单元是壳而不是根，再挂一层关键字候选会与语句级候选重复判型（第二份判据 = ASI 分叉同类风险）。保留文件不用，`xl_check` 的 warning 属于既有 W3102/W3103 口径。

### 1.4 块体 `{}` 复用同一壳（Stage 4，本轮只留口，不实现）

- 语句块本身是 `BlockStatement`：由**语句壳**认领（`Kind=Block`），壳收口时建 `BlockShape`；块体的「内部语句目录」不属于语句壳，属于**块括号**。
- 复用点与 today 的 body guide 完全同构：`core/syntax/basic-tokens/bracket.xl.md:136-166` 的 `Bracket.Transit` 建出 `Bracket` 后回调父单元的 `OnBracketCreatedEvent`；`BodyGuideUtil.MountBodyGuide` 已示范「给 body 括号挂 `CatalogGuide`」。
- 因此：在 `StatementShape` 上**预留** `OnBracketCreatedEvent` 覆写口 + `BodyKind:int`（`Block` / `ObjectLiteral`），Stage 4 用它把语句候选目录挂到 `{` 的 `Bracket` 上；**`{` 二义（块 vs 对象字面量）的裁决点仍归 `StatementRouteUtil`（§2.3）**，不在 `Bracket` 里新起判据。
- 先不做，原因：块内路径今天不经过根目录，改了收益/风险比差；且 `{` 二义与 `StatementBuilder` 既有大量判据纠缠（recon-core §F6）。

---

## 2. `;` / ASI 单一判据方案（决策 D3）

### 2.1 现状三处（已核实）

| 处 | 文件:行 | 角色 |
|---|---|---|
| 判据本体 | `typescript/tokens/statements/expression-statement-possible-shape.xl.md:359-558` `IsAsiBoundary(units, tokenIndex)`，约 200 行 | **唯一真正的 ASI 判据**（行终止符、延续符、调用位、后缀 `++`、声明头、标签、上下文关键字…） |
| 根终结候选 | `typescript/tokens/files/source-file-end-possible-shape.xl.md:48-82` | 只在 EOF 哨兵 / ASI 边界 `Accept`，`BuildByIndex`（1450+ 行）建整条语句 |
| 块内 | `statement-scanner.xl.md`（`EndsAtLineBreak` / `ScanToSemicolon` …）+ `statement-builder.xl.md:752-766,1362-1442` | 块内 ASI，无 EndPossible 参与 |

全仓 `IsAsiBoundary` 调用点只有 6 处（`expression-statement-possible-shape:790,970`、`statement-builder:1195,1281`、`type-alias-declaration-possible-shape:242,288`、`source-file-end-possible-shape:67` 等），原型未新增任何一份——**这条资产必须保住**。

### 2.2 收敛方案：新建 `statement-boundary-util.xl.md`（Stage 1 第一件事）

```
typescript/tokens/statements/statement-boundary-util.xl.md
class StatementBoundaryUtil
  static method IsAsiBoundary:(units:Array<Token>, tokenIndex:int)=>bool      // 从 ExpressionStatementPossibleShape 逐字搬迁，零行为变化
  static method IsSemicolon:(unit:Token)=>bool
  static method IsEof:(tokenIndex:int, units:Array<Token>)=>bool
  static method CanEndStatement:(units:Array<Token>, tokenIndex:int, atEof:bool)=>bool
        // = IsSemicolon(units[tokenIndex]) || IsEof(...) || IsAsiBoundary(units, tokenIndex)
```

- `ExpressionStatementPossibleShape.IsAsiBoundary` 改成**单行委托** `StatementBoundaryUtil.IsAsiBoundary(...)`，函数体搬走——与 B 对 `OperatorTable` 做过的「函数体逐字搬迁 + 委托」完全同一手法，因此四道 AST 门读数必须**逐位不变**（B 实测如此）。
- `SourceFileEndPossibleShape` 的格判据改成 `StatementBoundaryUtil.CanEndStatement(...)`（同值替换）。
- `StatementEndPossibleShape` 改成 `StatementBoundaryUtil.CanEndStatement(...)`（**不再直接调 `ScanRoot`**；`ScanRoot` 只保留「整条到齐 + `End`」的职责，见 §8 增量）。
- `StatementScanner` 的块内 ASI **不强行统一**：Stage 2 只把它内部「表达式语句在换行处是否结束」这一个判断改为调用 util，逐条用 `token-ast` + harness 锁住；其余判定（`StartsBinding`、声明头、`for` 头）保持原样，因为它们不是 ASI 边界判据。

### 2.3 EndPossible 与普通候选「不同格 Accept」的保证（决策 D4）

`CatalogGuide` 的语义是：**体候选 `Reject` 即被永久删除，直到 `Reset`**；`EndPossible` 只有在 `Candidates.size === 0` 且自己 `Accept` 时才建，否则抛「终结候选与其它候选同时成立」。所以「不同格」不能靠「谁先」，必须**结构性互斥**：

1. **单一分类器**：`StatementRouteUtil.ClassOf(units, tokenIndex):int` → `OperandStart | BinaryOperator | PrefixOperator | Postfix | MemberAccess | Separator | Semicolon | Eof | StatementStart`（一个函数、一张表，`Symbol`/`Common`/`Bracket` 的文本都从这里取）。
2. **体候选**只在自己关心的 `Class` 上 `Accept`，其余 `Reject`——但**遇到 `Semicolon`/`Eof`、以及 `CanEndStatement` 为真的格，先无条件 `Reject`**（顺序写死）。
3. **`EndPossible`** 只在这些格 `Accept`：`Class ∈ {Semicolon, Eof}`，或 `CanEndStatement(...)` 为真**且** `Class == StatementStart`（换行后的下一条语句起点）。两种集合按 `Class` 值天然不交。
4. **测试仪器（不是约定）**：`tests/statement-possible/harness.mjs` 在运行时 monkeypatch 每个候选与 `EndPossible` 的 `ComputeByIndex`（照 `tests/member-possible/harness.mjs` 的 monkeypatch 范式，不改源码），逐格记录 `Accept` 集合；出现「`EndPossible` + 任一普通候选同格 `Accept`」直接判 FAIL 并打印源码位置。这条仪器必须在 Stage 1 就上线，之后每个 Stage 都跑。
5. **额外防御**：`ClassOf` 对未知单元返回 `Unknown`，`Unknown` 格上 `EndPossible` 一律 `Uncertain`（宁可多等一格，也不能抛错）。

### 2.4 调用点迁移顺序（每步都是一个可回滚 commit）

1. 建 `StatementBoundaryUtil`（只新增，无调用方）→ gates 不变。
2. `ExpressionStatementPossibleShape` 委托（唯一改动点：函数体搬走 + 一行委托）→ **四道 AST 门必须逐位不变**。
3. `SourceFileEndPossibleShape` 改用 `CanEndStatement` → AST 门不变。
4. `StatementEndPossibleShape` 改用 `CanEndStatement` → `tests/feas-*` + harness 不变。
5. （Stage 2）`StatementScanner` 内部单个判断改用 util → `token-ast` 1716/1706/0/0/10 不变。
6. 最后才允许删 `ExpressionStatementPossibleShape` 里的搬迁残留（若只剩委托则保留委托，删除是可选）。

---

## 3. 表达式语句接入（Stage 1 核心，决策 D5）

### 3.1 范围与目标

把「确定的普通表达式起点」的表达式语句从 legacy 整段扫描**切到语句壳**，收口仍走 `StatementBuilder`（**原子建树，不增量**）——目的是先把壳的生命周期、路由互斥、统一判据、门禁仪器全部落地并证明 AST 零差异；增量表达式在 Stage 3。

### 3.2 分流不变量（`StatementRouteUtil.Decide`，冻结）

```
constants: Route.None=0  Route.ShellPlainExpression=1  Route.ShellVariable=2  Route.Legacy=3

Decide(units, tokenIndex):int
  1) 取 itemStart = ItemUtil.ItemStart(units)（由调用方算一次并传缓存，见 §8）
  2) 首代码单元 head = NextCode(units, itemStart)
  3) head 是 Common 关键字：
       let/const/var → 若 StartsBinding(下一代码单元) → ShellVariable
                       否则（let 当标识符 / 标签）→ Legacy
       async 且下一代码单元 ∈ {function, class, (, [ } 等 → Legacy   // 双角色，留给 legacy
       import → Legacy（import 声明 / import( / import.meta 全留 legacy）
       using / await using → Legacy
       type / interface / class / enum / namespace / module / declare / abstract / function
       if / else / for / while / do / switch / try / catch / finally / return / throw / break /
       continue / debugger / with → Legacy（Stage 4 才交给语句族候选）
       其它标识符 → ShellPlainExpression
  4) head 是 Symbol：`;` → Legacy（空语句）；`! ~ + - ++ --` → ShellPlainExpression（一元前缀起）
  5) head 是 Bracket：`(` / `[` → ShellPlainExpression；`{` → Legacy（块体/对象字面量二义，Stage 4 再裁）
  6) head 是 String / Regex / Numeric / Template 等字面量 → ShellPlainExpression
  7) 其它 → None
```

**互斥（不靠先后，靠一句话两处读）**：

- legacy `ExpressionStatementPossibleShape.ComputeByIndex` 顶部：`if (StatementRouteUtil.Decide(...) === Route.ShellPlainExpression) return ShapeStates.Reject;`（`Reject` 是永久的，但 `Reset` 会复原，所以不会饿死后续条目）。
- 新 `RootExpressionStatementPossibleShape.ComputeByIndex`：`Decide === ShellPlainExpression` 才 `Accept`，否则 `Reject`。
- legacy `StatementPossibleShape.ComputeByIndex` 内联的 let/const/var 分流（原型 A 加的 12 行）替换为：`if (Decide(...) !== Route.Legacy && Decide(...) !== Route.None) return Reject;`（保持它只做 `Legacy` 家族）。
- 关键：**`ExpressionStatementPossibleShape` 的 `ComputeByIndex` 只被根目录调用**；块内走的是 `ExpressionEnd` / `IsAsiBoundary`，因此路由钩子不影响块内路径（这是 A 的 HANDOFF 判定「不整体换壳」的落地方式：不换它的状态机，只在根格让它让位）。

### 3.3 新文件与改动

```
新增 typescript/tokens/statements/root-expression-statement-possible-shape.xl.md
     class RootExpressionStatementPossibleShape extends PossibleShape
       ComputeByIndex  = 路由判型（§3.2），全函数
       IsBuildable     = true（首代码单元到齐即可建壳；建壳后由 EndPossible 等收口）
       BuildByIndex    = 与 VariableStatementPossibleShape.BuildByIndex 逐字同构：
                         搬 raw 单元、Pos、SignIn、splice、Parent、MountedUnit、
                         CatalogGuide([], new StatementEndPossibleShape())
                         但 Kind = StatementKind.Expression
修改 typescript/tokens/files/source-file-shape.xl.md      注册新候选（在 ExpressionStatementPossibleShape 之前/之后均可，顺序无语义）
修改 typescript/tokens/statements/expression-statement-possible-shape.xl.md
     ComputeByIndex 顶部 +4 行路由 Reject（其余一字不改）
修改 typescript/tokens/statements/statement-possible-shape.xl.md
     内联 let/const/var 分流替换为 RouteUtil（A 的 12 行 → 3 行，行为等价）
修改 typescript/tokens/statements/statement-shape.xl.md   新增 field Kind:int = 0（默认 Expression/None 外的占位）
```

### 3.4 Feas* 原型如何接入（不在 Stage 1 做，Stage 3 做；这里冻结接法）

| 原型 | 处置 |
|---|---|
| `FeasOperandPossibleShape` | 改成正式 `expression-operand-possible-shape.xl.md`（复制改名，Feas 文件 Stage 3 末删除）；`BuildByIndex` 补桩：复用 `NumericLiteralShape.FromBasicToken` / `IdentifierShape.FromBasicToken` / `ParenthesizedExpressionShape`（Feas 原型已验证这三个工厂与 builder 同口径） |
| `FeasBinaryOperatorPossibleShape` | 正式化；`BuildByIndex` = 「按 `OperatorTable` 弹帧 + `ShapeInsertUtil.InsertBetween(shell, leftOperand, wrapper)` + `wrapper.Add(Builder.MakeOperatorToken(unit, i))` + `shell.MountedUnit = wrapper`」 |
| `FeasPrefixUnaryPossibleShape` | 正式化；`BuildByIndex` = 建 `PrefixUnaryExpressionShape`、`shell.MountedUnit = shape`，等操作数到齐后再 `Add`（与 Feas 的 `prefixShapes` 栈同构，但栈放**壳的字段**，不放 cache，见 §8） |
| `FeasOperatorParser` | 降格为**对拍器**：保留 `tests/feas-operator/harness.mjs` 作为「增量 vs 基线 `ExpressionBuilder`」的独立口径；解析逻辑整体搬成壳内状态机 `ExpressionStackMachine`（同一个类名可保留，但它不再自己 `Load` 全量单元，而是被候选在 BuildByIndex 里按帧调用） |
| `FeasRawTokenHost` | 保留只给 harness 用 |
| `OperatorTable` | **不动**，继续是唯一优先级来源（B 已让 builder 三个方法单行委托，实测四道 AST 门不变） |

**insert 何时 `sealRange`**（沿用 B 的结论并收紧）：

- 插入**未关闭**的 wrapper（二元运算符刚被读到、右操作数未到）：`sealRange=false`，只继承起点，终点等 wrapper 关闭时签出；调用方不得在此后立即读 `wrapper.SourceRange.End`。
- 插入**已完整**的子树（例如 `a` 已完成、被包进 `a + b` 的左侧）：左操作数是**已经带完整 span 的 child**，`InsertBetween` 只搬运、不重签，`sealRange` 仍为 `false`（child 自己的范围不重签是硬约束，重签会抛 `SourceRangeStartIsSetted`）。
- `sealRange=true` **只允许**用于「wrapper 与 child 同时收口」的场景（例如前缀运算符直接包裹一个已完成的字面量，且随后立即 `SignOut`）；这一条写进评审清单，不用则不放开。
- 幂等保护：任何 `FinishNode` 式收尾必须带 B 原型那行保护——**起点已签过的形状不再重签**（`wrapper.SourceRange.Start >= 0` 时跳过 `SignIn`）。

### 3.5 AST 零差异的保证与验证

1. **构造级**：`BuildFromShell` → `StatementBuilder.Load(consumed, shell.Pos)` → `BuildStatement()` → `builder.At === builder.Units.length` 断言（A 已有），与 legacy 喂同一份切片、同一 `Pos`。
2. **门禁级**：每 Stage 必须 `ast-json-diff` **0 结构 / 0 位置 / 0 字段**（6167/6167）、`token-ast` **crash=0 diff=0**、`real-dts-ast` 226/226。
3. **用例级**：`tests/statement-possible/harness.mjs` 对每条用例做 `ToXmlString()` 逐字节比较（与 `tests/feas-operator/harness.mjs` 同口径）＋ `ast-compare` 逐节点（与 `member-possible` 同口径）。
4. **反例库**：A 修的 4 个 diff 用例（`decl-instantiation-line-end`、`gap-instantiation-line-end`、`decl-obj-destructure-computed-key`、`ty-satisfies`）与 28 个 trivia 崩溃用例**永远保留在语料库里**，任何一个回归即 Stage 失败。

---

## 4. 操作符 possible 完整化（Stage 3，子阶段 S3a…S3g）

### 4.1 接入顺序（每步只加一种候选，跑全门禁再下一步）

| 子阶段 | 内容 | 新增/启用候选 | 验收要点 |
|---|---|---|---|
| S3a | **操作数叶子**：数字、标识符、字符串、正则、模板、`(`…`)`、`[`…`]`、对象字面量 | `expression-operand-possible-shape` | `1`、`a`、`"s"`、`(a)`、`[a]`、`{a:1}`（对象只在表达式上下文） |
| S3b | **二元**：`+ - * / % ** << >> >>> < > <= >= == != === !== & ^ \| && \|\| ?? instanceof in` | `binary-operator-possible-shape` | `1*2+3`→`+(*(1,2),3)`；`a+b*c`；`a-b-c` 左结合；`a**b**c` 右结合 |
| S3c | **一元**：前缀 `! ~ + - ++ -- typeof void delete`、后缀 `++ --` | `prefix-unary-possible-shape`、`postfix-unary-possible-shape` | `-a+b`→`+(-a,b)`；`a+++b` 的分词与归属；`!a` |
| S3d | **赋值 / 复合赋值**：`= += -= *= /= %= **= <<= >>= >>>= &= ^= \|= &&= \|\|= ??=` | `assignment-possible-shape`、`compound-assignment-possible-shape`（别名族 `aliases/first|last-*` 在 S3d 才启用） | 右结合；`x = y = 1`；`x += 1`；与语句级 `=` 的区分 |
| S3e | **条件**：`?:` | `conditional-expression-possible-shape` | `a?b:c`；`a?b:c?d:e` 右结合；`a?.b` 不能误判 |
| S3f | **as / satisfies** | `as-expression-possible-shape`、`satisfies-expression-possible-shape` | **最高风险**：`a<b>` 类型实参、`x satisfies T`（A 的 4 个 diff 根因就是这类）；先只在「已确定是表达式」的上下文启用，类型实参仍由 `ExpressionBuilder` 处理 |
| S3g | **调用 / 成员链**：`f(x)`、`a.b`、`a[b]`、`f?.()`、`a?.b`、`new X()`、`await`/`yield` 前缀 | `call-expression-*`、`property-access-*`/`member-access-*`、`new-expression-*` | 与 `Bracket` 的交接（`(` 由 `Bracket.Transit` 建）；链式后优先级最高，必须在二元之前收口 |

### 4.2 「未命中更高优先级时的左结合收尾」与 insert 的配合（冻结规则）

- 每个操作符候选的 `BuildByIndex` 里先执行**弹帧**：`while (frames.top.Precedence > prec || (== && !rightAssoc)) { 弹帧并 FinishNode(top) }`——这就是 `FeasOperatorParser.ParseExpression` 的 121-142 行的循环，**逐字搬**，不许重写。
- 弹帧后：若还有帧，用 `ShapeInsertUtil.InsertBetween(shell, top.Data[last], wrapper)` 插；无帧则 `wrapper.Add(left)`。
- **插入只能在候选 `BuildByIndex` 内部做**：build 之后目录立即 `Reset`（core `catalog-guide.xl.md:118-119`），绕过目录自己 `splice` 会让 `Candidates`/`Share` 锚点失配。
- 弹帧与插入后必须同步：`shell.MountedUnit`（指向当前最内层未完成 frame）、`wrapper.LastIndex`、`wrapper.Pos`（`InsertBetween` 已处理）、`Frames` 栈（壳字段）。

### 4.3 `OperatorTable` 是唯一优先级来源（冻结）

- 允许新增（都在 `operator-table.xl.md` 内，不新建文件）：`IsAssignmentOperator(text)`、`IsCompoundAssignment(text)`、`IsPostfixOperator(text)`、`IsConditional(text)`、`IsAsOperator(text)`（`as` / `satisfies`）、`IsKeywordBinary(text)`（`instanceof` / `in`）、`IsPrefixKeyword(text)`（`typeof` / `void` / `delete`）、`AssociationOf(text)`。
- **禁止**任何其它文件出现优先级数字字面量（`>= 15`、`precedence = 11` 之类）。`ExpressionBuilder` 的 `As` 固定 11 要迁进表（`AsPrecedence`）。
- **机械检查**：harness 里加一条「第二份表探测」——grep 生成的 `build/ts/**` 中除 `operator-table.js` 外出现 `=== 15`、`return 14` 等模式即 FAIL（`tests/statement-possible/harness.mjs --lint`）。

### 4.4 每个操作符候选：何时目录驱动、何时复用 builder 校验

| 决策 | 归属 |
|---|---|
| 「这一格是不是操作符 / 什么优先级 / 结合性 / 是否一元」 | **目录候选**（读 `OperatorTable`），O(1)，无 builder 调用 |
| 「建什么形状、子节点顺序、span」 | **目录候选**决定结构，但**工厂**一律复用 builder 公开入口：`MakeOperatorToken`、`SpanNode` 口径、`NumericLiteralShape.FromBasicToken` 等 |
| 「一段已可判定的子表达式（括号内容、类型实参、调用实参列表、对象字面量成员）」 | **复用 `ExpressionBuilder`**：候选把整段 raw 单元交给 builder 建，断言 `builder.At === units.length`；不自写第二套 |
| 「叶子」 | 复用 `FromBasicToken` 工厂（Feas 已验证与 builder 同口径） |
| 终局校验 | 每条被建形状 `SignIn/SignOut` 前断言 `StartIndex >= 0 && EndIndex >= 0`；AST 门是最终判据 |

---

## 5. 迁移路线 / Stage 划分（每个 Stage 一个可合并里程碑）

> 通用门禁表见 §7.3；每个 Stage 的「验收门读数」= 与基线**逐位相同**（除列出的新增 +N）。任一门劣化即回滚到该 Stage 的起点 commit。

### Stage 0（已完成，不需重做）
原型 A/B 合并于 `e335f1fb`，独立验证 PASS。**本 Stage 的产出是「基线读数 + 仪器缺失清单」**：`tests/statement-possible/harness.mjs` 不存在，`StatementEndPossibleShape` 每格重扫（无增量），`ExpressionStatementPossibleShape.IsAsiBoundary` 仍是第二份定义点（唯一一份，但位置不当）。

### Stage 1 — 判据收敛 + 表达式语句壳化（原子收口）
- **目标**：`;`/ASI 判据单一来源落地；普通表达式起点走语句壳；AST 零差异；双 Accept 仪器上线。
- **涉及文件**：新增 `statement-boundary-util`、`statement-route-util`、`root-expression-statement-possible-shape`、`tests/statement-possible/harness.mjs`；改 `expression-statement-possible-shape`（委托 + 路由 Reject）、`source-file-shape`（注册）、`statement-possible-shape`（内联分流 → RouteUtil）、`source-file-end-possible-shape`（`CanEndStatement`）、`statement-shape`（`Kind` 字段）。
- **依赖**：无（不依赖 Stage 0 之外任何未合并分支）。
- **验收**：§7.3 全表逐位不变；harness 新增 §7.1 的 `stage1`/`asi`/`route` 三组全绿；`double-accept` 冲突计数 0。
- **文件级可并行子任务**：见 §10（Wave 1 = 3 个互不重叠任务，Wave 2 = 1 个集成任务）。
- **回滚点**：Stage 1 起点 `e335f1fb`；另设**熔断开关**——`StatementRouteUtil` 里 `public static EnableShellExpressions:bool = true`，置 `false` 即让新候选全部 `Reject`、legacy 全接管（不需要 revert，用于线上定位）。

### Stage 2 — EndPossible 增量 + 块内 ASI 单源 + 性能基线
- **目标**：`StatementEndPossibleShape` 从「每格重扫整段」换成「只追加（`StatementScan` 同款：`Code`/`CodeAt`/`Checked`/`Start`）」，把每个 basic token 的代价从 O(n²) 降到 O(1) 摊销；块内一个 ASI 判断改调 util；产出性能基线。
- **涉及文件**：`statement-end-possible-shape`（增量状态）、`statement-scanner`（**只改一个判断**，单点 owner）、`tests/statement-possible/perf.mjs`（新增）。
- **依赖**：Stage 1 合并（要用 `StatementBoundaryUtil`）。
- **验收**：全表不变；`perf.mjs` 读数进本文件附录；候选调用计数 ≤ 每 basic token「根候选数 + 壳体候选数」。
- **回滚点**：Stage 2 起点；增量状态坏了只回退 `statement-end-possible-shape` 单文件（判据未改，行为等价）。

### Stage 3 — 操作符 possible 接入壳体（S3a…S3g 七个可独立合并的小步）
- **目标**：表达式语句由壳体内候选增量建树，`1*2+3` 走 `+(*(1,2),3)`；legacy `ExpressionStatementPossibleShape` 的表达式建树路径退为**兜底**（`CanEndStatement` 判不出、`Kind` 为双角色时仍用）。
- **涉及文件**：§4.1 的候选族、`expression-operand/binary/prefix/postfix/assignment/conditional/as/call-*`、`operator-table`（扩方法）、`statement-shape`（`Frames`/`Expect`/`Body` 字段 + `ExpressionStackMachine`）、`tests/statement-possible/harness.mjs`（加 `operators` 组）。
- **依赖**：Stage 1（壳）、Stage 2（增量扫，否则操作符高频 build 会退化）。
- **验收**：每子阶段单独跑全表；`operators` 组用例逐条 `ToXmlString` 与基线相等；`1*2+3`/`a+b*c`/`a-b-c`/`a**b**c`/`-a+b`/`a?b:c`/`x+=1` 全绿。
- **回滚点**：每个子阶段一个 commit，可单独 revert；熔断开关 `StatementShape.EnableIncrementalExpression:bool`。

### Stage 4 — 其余语句族壳化 + 块体 `{}` 目录
- **目标**：`if/while/do/for/for-in/for-of/return/break/continue/throw/debugger/with/try/switch/labeled/empty/block` 各自起点候选建壳（`Kind` 区分），壳体候选负责各自子句；块体 `{` 挂语句目录（`OnBracketCreatedEvent`），`{` 二义归 `StatementRouteUtil`。
- **涉及文件**：`statements/*-possible-shape.xl.md`（18 个桩逐个落地）、`statement-route-util`（扩 `Route.ShellStatementFamily`）、`source-file-shape`（批量注册）、`bracket` 侧不动（走 `OnBracketCreatedEvent` 契约）、`block-shape`（补 `CatalogGuide`）。
- **依赖**：Stage 1/3；**且必须等 Stage 3 稳定**（否则两类新候选叠加会把 double-accept 风险放大）。
- **验收**：全表不变 + `stage4` 组全绿；块体目录用例（`function f(){ let x=1; if(x) x++; }`）AST 逐节点一致；`{` 二义对拍组（`({a:1});`、`if(x){a:1}`）全绿。
- **回滚点**：每个语句族一个 commit；`Route` 常量按族灰度（`EnableShellStatements:int` 位掩码）。

### Stage 5 — 声明 possible 三层落地 + legacy 语句扫描退场
- **目标**：`let/const/var` 的声明级 / 列表级候选落地（§1.3），`StatementBuilder` 里对应分派逻辑只保留给「兜底 / 块内 legacy」；`StatementScanner.ScanRoot` 的职责缩小到「兜底整段扫描」。
- **涉及文件**：`variable-declaration-possible-shape`、`variable-declaration-list-possible-shape`、`variable-statement-possible-shape`（Kind 分流到体目录）、`statement-builder`（单点 owner，删除分派或加 `legacy` 标记）。
- **依赖**：Stage 4（体目录基础设施）。
- **验收**：全表不变；`stage5` 组（声明列表、解构、`let a=1,b=2`、`const {a}=o`、`let x`）全绿；`statement-builder` 行数下降且无行为变化（diff 审计）。
- **回滚点**：Stage 4 末尾 commit。

---

## 6. 文件所有权矩阵（单点负责，写前打招呼）

| 文件 | 单点 owner | 原因 / 纪律 |
|---|---|---|
| `typescript/tokens/files/source-file-shape.xl.md` | **Stage 集成 owner** | 根候选表只有一份，多流同改必冲突 |
| `typescript/tokens/files/source-file-end-possible-shape.xl.md` | **Stage 集成 owner** | ASI/EOF 终结候选唯一；与语句 EndPossible 争同一格 |
| `typescript/tokens/statements/statement-scanner.xl.md` | Stage 2 owner（之后冻结） | `;`/ASI 唯二裁决点之一；改动必须一次一个判断 |
| `typescript/tokens/statements/statement-builder.xl.md` | Stage 5 owner | 语句分派 switch，AST 硬约束，2327 行 |
| `typescript/tokens/expressions/expression-builder.xl.md` | Stage 3 owner | 优先级唯一来源（现已是委托），叶子/操作符工厂 |
| `typescript/tokens/expressions/operator-table.xl.md` | Stage 3 owner | 优先级唯一来源 |
| `core/syntax/catalog-guide.xl.md` | **Lead 专属** | core 单点，任何语义改动需 Lead 决策（本轮方案**不需要**改） |
| `core/syntax/possible-shape-cache.xl.md` | **Lead 专属** | `Share`/`Values` 语义 |
| `core/syntax/token.xl.md`、`unit-token.xl.md` | **Lead 专属** | 树结构 / `Parent` / `MountedUnit` |
| `typescript/tokens/statements/statement-shape.xl.md` | Stage 1 owner（Wave 2） | 壳本体：生命周期方法唯一 |
| `typescript/tokens/statements/statement-end-possible-shape.xl.md` | Stage 2 owner | 终结候选 |
| `typescript/tokens/statements/statement-boundary-util.xl.md` | Stage 1 Wave 1 owner A | 新文件，判据本体 |
| `typescript/tokens/statements/statement-route-util.xl.md` | Stage 1 Wave 2 owner B | 新文件，分流唯一判据 |
| `typescript/tokens/shape-insert-util.xl.md` | Stage 3 owner（B 已交付，冻结） | insert 原语语义 |
| `tests/statement-possible/harness.mjs` | Stage 1 Wave 1 owner C | 仪器；所有 Stage 都跑，改它要通知 Lead |

**并行流避免冲突的规则**：
1. 表里「单点 owner」之外**禁止**改这些文件；需要改就发 `send_message` 给 owner，由 owner 在一个 commit 里做。
2. 每个任务只创建**自己的新文件**（新增 `.xl.md` 不需要抢）；跨文件一行改动（如注册）一律交给对应 owner 的集成 task。
3. `Route` / `Boundary` / `OperatorTable` 的**接口在本文件冻结**（§11）；实现成员按签名写，不私改签名。
4. 每个 Stage 收尾由一个「集成 owner」统一跑 `xl_build`+全门禁并提交 merge。

---

## 7. 测试策略

### 7.1 新增 `tests/statement-possible/harness.mjs`（照 `tests/member-possible/harness.mjs` 的 `--all` 口径）

```
node tests/statement-possible/harness.mjs            # 默认：stage1 组
node tests/statement-possible/harness.mjs --all      # 全部分组（未实现的阶段自动 skip，并打印 skip 原因）
node tests/statement-possible/harness.mjs --group=asi,trivia,route,operators,stage4,stage5
node tests/statement-possible/harness.mjs --only=RootExpressionStatementPossibleShape
node tests/statement-possible/harness.mjs --file=cases.json
node tests/statement-possible/harness.mjs --double-accept   # 只跑互斥仪器
node tests/statement-possible/harness.mjs --lint            # 第二份优先级表 / 第二份 ASI 判据探测
node tests/statement-possible/harness.mjs --verbose
```

口径（三件套，全部要有）：
1. **AST 对拍**：`SourceFileRunner.Parse` + `ast-compare.cjAst` vs `ts.createSourceFile` + `tsAst`，逐节点 `kind/pos/end/text/name/children`。
2. **形状对拍**：`ToXmlString()` 逐字节（用于 Stage 3 增量表达式，比 AST 更早暴露结构错）。
3. **互斥仪器**：运行期 monkeypatch（不改源码，同 `member-possible` 的做法）每个候选与 `EndPossible` 的 `ComputeByIndex`，逐格记录 `Accept`；`EndPossible + 普通候选` 同格即 FAIL。另有「`Reject` 后无人接管」探测：记录「0 存活候选且非终结格」的格并报警（对应 A 的 28 crash 根因）。

分组与用例（`--all` 全跑）：

| 组 | 用例 |
|---|---|
| `stage1` | `let x = 1;`、`f();`、`a`、`a` ⏎ `b`、`1*2+3;`、`(a);`、`[a];`、`!a;`、`let a = 1` ⏎ `if (a) b;`（legacy 混排）、多语句混合、`import`/`export` 与表达式混排 |
| `asi` | 无分号换行、`return` ⏎ `x`（ASI 陷阱）、`a` ⏎ `++b`、`a++` ⏎ `b`、`let a = 1` ⏎ `let b = 2`、`type T = A` ⏎ `return`（A 已知边界）、`debugger` ⏎ `{a:1}`、行尾注释后换行、`}` 收口处的 ASI |
| `trivia` | **首格注释**（`// c` ⏎ `let x = 1;`）、块注释跨行、BOM、空白开头、注释夹在 `let` 与绑定之间 |
| `route` | `async () => {}` / `async function f(){}` / `import("x")` / `import.meta` / `import x from "y"` / `using` / `type X = 1` / `let: while(1){}`（`let` 当标签）/ `{a:1}` 语句块 vs 对象 / `let` 后跟 `=` 或 `(`（标识符用法） |
| `satisfies` | `x satisfies T;`、`a<b>;`（类型实参二义）、`const t: Record<string, number> = {};`、`decl-instantiation-line-end`、`gap-instantiation-line-end`、`decl-obj-destructure-computed-key`、`ty-satisfies`（A 的 4 个 diff 用例，永久保留） |
| `operators` | `1*2+3`、`a+b*c`、`a-b-c`、`a**b**c`、`a*(b+c)`、`-a+b`、`!a&&b`、`a+++b`、`x = y = 1`、`x += 1`、`a?b:c`、`a?b:c?d:e`、`f(x)[0].y`、`f?.()`、`new X().y`、`a+b*c-d/e`、`x instanceof Y`、`"k" in o` |
| `stage4` | `function f(){ let x=1; }`、`if(x) y; else z;`、`while(a) b;`、`for(let i=0;i<3;i++){}`、`for(x of o){}`、`switch(x){case 1: break;}`、`try{a}catch(e){b}`、`do a; while(b);`、块内注释首格 |
| `stage5` | `let a=1,b=2;`、`const {a,b:c}=o;`、`let [x]=a;`、`let x: T;`、`let x=1` ⏎ `let y=2`（ASI 分界）、`declare let x: number;` |

### 7.2 对抗用例清单（CI 必跑，任一红即停）
ASI 四陷阱（`return`/`break`/`continue`/后缀 `++` 换行）、首格注释、注释夹在关键字与绑定之间、`satisfies`/类型实参、混合语句（声明+控制流+表达式交替）、`1*2+3` 与 `a+b*c` 优先级、`a-b-c` 左结合、`a**b**c` 右结合、`-a**b`（语法错误边界）、`let` 当标签 / 当标识符、`{` 二义、块内 `}` 前的空语句、EOF 前无分号语句。

### 7.3 门禁命令与基线读数（`cwd` = 该成员自己的工作目录；`xl` CLI 不在 PATH，必须用 DSH 的 `xl_build`/`xl_check` 工具）

| # | 命令 / 工具 | 基线（`e335f1fb`） | 判定 |
|---|---|---|---|
| 1 | `xl_build(cwd, paths=["core","typescript"], targets=["ts"])` | **881 written / 0 error**（2481 warning 全为既有 W3102/W3103 缺 description） | 0 error |
| 2 | `xl_check(cwd, paths=["core","typescript"], targets=["ts"])` | **881 file(s) / 0 error(s)** | 0 error |
| 3 | `node node_modules/typescript/bin/tsc -p tsconfig.json` | **exit 0** | exit 0 |
| 4 | `node tests/parse/validate.mjs` | **1720 条 / 0 不合格** | 0 不合格；新用例只许 +N |
| 5 | `node typescript/cases/ast-json.mjs` | **6167 / 6167**（47 构造，cj-fail=0） | 全 ok |
| 6 | `node typescript/cases/ast-json-diff.mjs` | **0 结构 / 0 位置 / 0 字段**（6167/6167） | 0/0/0 |
| 7 | `node typescript/cases/token-ast.mjs` | **1716 / 1706 / crash=0 / diff=0 / ts-invalid=10** | crash=diff=0 |
| 8 | `node typescript/cases/real-dts-ast.mjs` | **226/226 一致，崩溃 0** | 226/226 |
| 9 | `node tests/feas-operator/harness.mjs` | **6/6** | 不劣化 |
| 10 | `node tests/feas-operator/insert-between.test.mjs` | **9/9** | 不劣化 |
| 11 | `node tests/statement-possible/harness.mjs --all` | **新增（Stage 1 起）** | 全绿，skip 需列明原因 |
| 12 | `node tests/statement-possible/perf.mjs` | **新增（Stage 2 起）** | 记录读数，不设硬阈值（见 §8） |

**不作判据（环境缺口，写进 README 口径）**：`tests/gates/run.mjs`（在纯 clone 里 1/8 通过，`tests/parse/ts-shape.mjs:23` `MODULE_NOT_FOUND`，需要含 `build/ts/cjcli.js` 的完整工作树）、`samples/check.mjs`（同上）、`runtime:check`/`runtime:cli`（缺 `cjcli` 产物）；以及**全树 `xl_build`**（`cjcli.xl.md:5-6` 引用不存在的 `dawn/text/*.xl.md`，是仓库现状，不是本次改动）。

---

## 8. 性能与缓存纪律

### 8.1 EndPossible 增量扫描（Stage 2）

- 现状：`StatementEndPossibleShape.ComputeByIndex` 每格重建 `code`/`codeAt` 数组并调 `ScanRoot(code)` → 一条 n 个单元的语句是 **O(n²)**；`ScanRoot` 内部还可能再扫一遍。
- 目标：照 `StatementScan`（`statement-possible-shape.xl.md:20-34`，b5stmt 已在 main 落地的「只追加」不变量）在 `PossibleShapeCache` 里存 `StatementEndScan { Start, Checked, Status, End, Code, CodeAt }`：
  - `Start` 变（换条目，`ItemUtil.ItemStart` 变了）才重建；
  - `Checked !== tokenIndex + 1` 时只 `push` 新代码单元；
  - `ScanRoot` 仍每格调用（它本身就是增量友好的，`Code` 只追加），若实测仍贵，再在 Stage 2 后半段看是否改成「只有新单元为 `;`/换行候选时才重扫」。
- **`Share` 只影响「何时建」，不影响「建成什么」**（`docs/share-cache-and-body-guide.md:75-92`）：`Share` 里只允许放**判定进度**（`Checked`/`Code`/`CodeAt`/`End`），**禁止**放会导致结构不同的东西（frame 栈、`Kind`、期望状态）。这类状态一律放**壳的字段**（`StatementShape.Frames/Expect/Body`），因为壳是 token，结构真值在树上。

### 8.2 避免「每 basic token × 10+ 候选 × O(k)」退化

- `ItemUtil.ItemStart` 是 O(k) 倒扫（recon-core §F5：7 候选 × O(k) 曾退化成二次，实测 2012ms → 22.5ms）。纪律：**每个条目每次 `ComputeByIndex` 只能算一次 `ItemStart`**，算完放 `cache` 的共享槽（`StatementEntryState.Start`），所有候选读缓存值，不再各自倒扫。
- 根候选数上限：Stage 1 后根目录 ≈ 14 个（现有 12 + 新 1 + 变量已有）；**禁止**把 18 个语句族全部塞进根目录（Stage 4 用 `Route` 分派，同一格只有 1–2 个候选可能 Accept，其余 O(1) Reject 仍要计入成本——所以 Stage 4 优先把「同一格大量候选」合并成单一分派候选 + 壳内族判型）。
- 每次 build 后 `Reset` 会清 `Values`（但不清 `Share`），所以「一条语句建一次」的频率下 `Scan` 只追加是最关键的摊销点。

### 8.3 可测的基准方法（`tests/statement-possible/perf.mjs`）

1. **长语句**：生成 `a1+a2+…+a300;`（n=300）与 10k 条 `a;`，分别测 `SourceFileRunner.Parse` 墙钟（`performance.now()`，重复 5 次取中位）。
2. **候选调用计数**：monkeypatch `ComputeByIndex` 计数，输出「每次 basic token 的候选调用数」与「总调用数 / 总 token 数」；基线值写进本文件附录表格，Stage 间只许下降或持平。
3. **退化探测**：n 从 100 → 200 → 400，耗时增长必须**接近线性**（比值 ≤ 2.5）；若接近 4 倍即二次退化，Stage 不得合并。
4. 对照：与 `e335f1fb` 基线同机同命令比（每成员在自己 clone 里各跑一次，读数以「比值」为准，不引用绝对 ms）。

---

## 9. 风险与回滚

| # | 风险 | 检测手段 | 回滚 / 缓解 |
|---|---|---|---|
| R1 | **ASI 判据分叉**（新写第二份）→ `CatalogGuide` 抛「终结候选与其它候选同时成立」 | `--lint` 探测：全仓 `IsAsiBoundary` 定义点必须只有 1（util 内）+ 委托；`xl_check` 后 grep `build/ts` | 判据只从 util 取；出现第二份即 revert 该 commit |
| R2 | **insert 后 `SourceRange` / `MountedUnit` / `Data` 下标错**（门禁不红但 AST 偶发偏移） | `tests/feas-operator/insert-between.test.mjs` 9 条 + `insert` 后读 `End` 的用例；`ToXmlString` 对拍 | `ShapeInsertUtil` 冻结不改；新增场景加单测后再改实现；单文件 revert |
| R3 | **`CatalogGuide` 0 候选抛错**（候选判型不全函数） | harness 的「0 存活候选且非终结格」探针；`token-ast` crash 计数 | 候选只 trivia 时禁 Reject（A 的 5 行修复）；立即修判型回 `Uncertain` |
| R4 | **块体 `{` 二义**（块 vs 对象字面量） | `stage4` 组 `({a:1});` / `if(x){a:1}` / `function f(){}` 对拍 | `{` 一律 `Route.Legacy` 直到 Stage 4 提交；Stage 4 每条用例一个 commit |
| R5 | **token-ast 回归**（A 的两个真实根因） | `token-ast` 1716/1706/0/0/10 逐位比对；A 的 4 个 diff 用例常驻语料 | 保留 `TryToClose` 拆壳兜底（必读不删）；shell 拆不掉就回退该文件 |
| R6 | **性能退化**（O(k) 候选、每格重扫） | `perf.mjs` 比值门（n 翻倍 ≤ 2.5 倍）+ 候选调用计数 | 回退 Stage 2 增量实现；`ItemStart` 单次缓存恢复 |
| R7 | **双 Accept 死等**（路由互斥漏一条路径） | `--double-accept` 仪器每 Stage 必跑 | 路由判据只在 `StatementRouteUtil` 一处；漏路径先加用例再修 |
| R8 | 类型实参 / `satisfies` 被壳吞掉（A 根因 B） | `satisfies` 组 7 条用例 | 壳只在「已确定是表达式」时建；不吞噬就 `EnableShellExpressions=false` |
| R9 | `StatementShape` 壳泄漏进根 `Data`（AST 少整条语句） | `ast-json-diff` 结构差 > 0；harness 断言父单元里无 `StatementShape` | A 已修（拆壳兜底）；断言写进 harness 常驻 |
| R10 | 并行成员改到同一单点文件 | §6 矩阵 + 提交前 `git diff --name-only` 自查 | 冲突时以 owner 为准，另一侧 rebase 重做 |

**统一回滚方式**：每个 Stage 一个分支 / 一个 merge commit（`--no-ff`），回滚 = `git revert -m 1 <merge>`；子阶段各自独立 commit，便于外科式回退。**熔断开关**（`EnableShellExpressions`、`EnableIncrementalExpression`、`EnableShellStatements`）保证「不改代码也能关掉新路径」，优先于 revert。

---

## 10. 给 Lead 的派工建议（Stage 1）

### 10.1 Wave 1（3 个并行任务，文件集互不重叠，可同时开工）

| 任务 | 写文件（source `.xl.md` + `tests/*`） | 依赖 | 验收 | 预估轮次 |
|---|---|---|---|---|
| **T1a 判据收敛** | 新增 `typescript/tokens/statements/statement-boundary-util.xl.md`；改 `expression-statement-possible-shape.xl.md`（`IsAsiBoundary` 函数体搬走 + 单行委托 **只此一处**）、`source-file-end-possible-shape.xl.md`（1 处改调 `CanEndStatement`） | 无 | 门禁 #1–#8 逐位不变；`--lint` ASI 定义点 = 1 | 4–5 |
| **T1b 壳/终结候选加固** | 改 `statement-shape.xl.md`（`Kind` 字段 + 保留拆壳兜底）、`statement-end-possible-shape.xl.md`（改用 `StatementBoundaryUtil.CanEndStatement`，**等 T1a 合并后再切**；本轮先加 `StatementEndScan` 状态与「只 trivia 不 Reject」断言） | 无（切换调用点依赖 T1a） | 门禁 #1–#10 不变；`feas` harness 6/6、insert 9/9 | 4–5 |
| **T1c 仪器与用例** | 新增 `tests/statement-possible/harness.mjs`（`--all`/`--double-accept`/`--lint`/`--verbose`/`--group`）、`tests/statement-possible/cases.json`、`tests/statement-possible/perf.mjs`（骨架） | 无（只读源码 + 运行期 monkeypatch） | `--all` 在**未合并任何 Stage 1 代码时**跑通并全绿（此时 shell 路径未启用，用例按 `stage1` 组 skip 或走 legacy 对拍均可） | 5–6 |

### 10.2 Wave 2（1 个集成任务，Wave 1 三个都合并后开工）

| 任务 | 写文件 | 依赖 | 验收 | 预估轮次 |
|---|---|---|---|---|
| **T1d 表达式语句接线** | 新增 `statement-route-util.xl.md`、`root-expression-statement-possible-shape.xl.md`；改 `source-file-shape.xl.md`（注册 1 行）、`expression-statement-possible-shape.xl.md`（`ComputeByIndex` 顶部 +4 行路由 Reject）、`statement-possible-shape.xl.md`（内联分流 → `RouteUtil`） | T1a 的 `StatementBoundaryUtil`（EndPossible 已用它）、T1b 的 `statement-shape`、T1c 的 harness | 门禁 #1–#11 逐位不变 + `stage1`/`asi`/`trivia`/`route`/`satisfies` 全绿 + `--double-accept` = 0 | ≤10（超出则拆成 T1d-1「RouteUtil + 新候选」/ T1d-2「接线 + 注册」） |

> 说明：T1d 故意不并进 Wave 1——`expression-statement-possible-shape.xl.md` 与 `source-file-shape.xl.md` 是单点文件，同时被 T1a/T1d 改会冲突；Wave 1 让 T1a 独占 `expression-statement-possible-shape` 的「判据搬迁」，Wave 2 才让 T1d 加「路由 Reject」两行。

### 10.3 独立合并 / 验证成员（常设，不占 Stage 文件所有权）

| 角色 | 职责 | 产物 |
|---|---|---|
| **integrate** | 每 Wave 收口：拉各成员分支 → `--no-ff` 合并 → 在自己的完整工作树跑 §7.3 全表 → 打 Stage merge commit | `MERGE-REPORT-stageN.md`（读数表 + diff 审计 + 失败归因） |
| **verify** | 独立 clone 复跑，不抄 integrate 读数；跑 §7.2 对抗用例（自写临时 untracked 脚本）；审 `git diff --name-status` 是否越界、`core/` 是否 0 改动、`OperatorTable`/`IsAsiBoundary` 定义点是否唯一 | `VERIFY-REPORT-stageN.md`（PASS/FAIL + 逐项读数 + 风险继承） |

**分支建议**：`feature/possible-statement-s1a`、`-s1b`、`-s1c`（Wave 1，从 `e335f1fb` 切）；`-s1d`（Wave 2，从 integrate 的 Wave 1 合并点切）；全部**不 push 主仓库**，由 integrate 汇总到 `feature/possible-statement`（Stage 1 合并点），再由 verify 独立复验后才允许 Lead 快进。

---

## 11. 冻结接口清单（实现成员按此写，不私改签名）

```ts
// 1) typescript/tokens/statements/statement-boundary-util.xl.md
class StatementBoundaryUtil
  static method IsAsiBoundary:(units:Array<Token>, tokenIndex:int)=>bool
  static method IsSemicolon:(unit:Token)=>bool
  static method IsEof:(units:Array<Token>, tokenIndex:int)=>bool
  static method CanEndStatement:(units:Array<Token>, tokenIndex:int, atEof:bool)=>bool

// 2) typescript/tokens/statements/statement-route-util.xl.md
class StatementRoute
  static field None:int = 0
  static field ShellPlainExpression:int = 1
  static field ShellVariable:int = 2
  static field Legacy:int = 3
  static field ShellStatementFamily:int = 4        // Stage 4
class StatementRouteUtil
  static field EnableShellExpressions:bool = true  // 熔断开关
  static field EnableShellStatements:int = 0       // Stage 4 位掩码
  static method ClassOf:(units:Array<Token>, tokenIndex:int)=>int   // §2.3 的分类器
  static method Decide:(units:Array<Token>, tokenIndex:int)=>int    // §3.2 的分流

// 3) typescript/tokens/statements/statement-shape.xl.md（Stage 1 新增字段；其余方法冻结）
class StatementShape
  field Kind:int = 0
  field EnableIncrementalExpression:bool = false   // Stage 3 熔断
  // Stage 3 追加（此处冻结名字，字段在 Stage 3 落地）：
  //   field Frames:Array<Token> = []
  //   field Expect:int = 0        // 0=Operand 1=BinaryOperator 2=Postfix 3=End
  static method BuildFromShell:(host:Token, endIndex:int, context:SyntaxContext)=>Token   // 冻结
  static method FinishShell:(shell:Token, built:Token)=>void                            // 冻结
  static method DetachShell:(shell:Token)=>bool     // Stage 1 把 A 的拆壳兜底抽成静态方法（行为等价）

// 4) typescript/tokens/statements/statement-end-possible-shape.xl.md
class StatementEndPossibleShape extends PossibleShape
  ComputeByIndex  // 判据 = StatementBoundaryUtil.CanEndStatement；0 候选时才会被调用
  BuildByIndex    // BuildFromShell + FinishShell

// 5) 冻结不改
ShapeInsertUtil.InsertBetween:(parent:Token, child:Token, wrapper:Token, sealRange?:bool)=>Token
OperatorTable.Precedence / IsRightAssociative / IsBinaryOperator / IsPrefixOperator
// Stage 3 允许扩充（同文件）：IsAssignmentOperator / IsCompoundAssignment / IsPostfixOperator /
//   IsConditional / IsAsOperator / IsKeywordBinary / IsPrefixKeyword / AssociationOf / AsPrecedence
```

---

## 12. 附录：本设计成立所依赖的已验证事实（出处）

1. 原型 A：`let/const/var` 语句壳在根层跑通，四道 AST 门与基线逐位相同；token-ast 28 crash + 4 diff 的两个根因与修复（trivia 首格禁 Reject、壳收不了口时拆壳）——`HANDOFF-feas-statement-2.md` §2。
2. 原型 B：`InsertBetween` 一次处理 `Data` 顺序 / `Parent` / `MountedUnit` / `SourceRange` / `Pos` / `LastIndex` 六件事，9 条单测；`OperatorTable` 让 `ExpressionBuilder` 三方法委托后 AST 门读数逐位不变——`HANDOFF.md`（feas-operator）。
3. 合并：两原型文件集不相交，0 冲突；合并后 10 道门禁全部 PASS，`core/` 0 改动——`MERGE-REPORT.md` §2–§3。
4. 独立验证：从零 clone 复跑 10 道门读数一致；13 条对抗用例与 TS 逐节点一致；`OperatorTable` 唯一定义、`IsAsiBoundary` 无第二份——`VERIFY-REPORT.md` §1–§3。
5. `CatalogGuide` 语义（Reject 永久删除、EndPossible 仅 0 候选时建、build 后 Reset）：`core/syntax/catalog-guide.xl.md:77-135`；basic token 只问直接父单元：`core/syntax/basic-tokens/common.xl.md:232-243`、`bracket.xl.md:136-166`。
6. 缓存纪律（`Share` 只影响何时建）：`docs/share-cache-and-body-guide.md:75-100`；`ItemUtil.ItemStart` O(k) 退化实测 2012ms → 22.5ms 同源。

---

## 13. Stage 1 T1d 实现回写（事实校准）

1. **`SourceFileEndPossibleShape` 的判据是 `CanEndStatement && !IsSemicolon`**（§2.2 / §2.4）：根终结候选只在「没有语句候选会消费这一格」时建语句；`;` 由语句候选自己收口，两边同格 `Accept` 会撞 `CatalogGuide`。
2. **`StatementBoundaryUtil.IsAsiBoundary` 有可选第三参 `limit:int`**（§11 冻结签名的补充）：块体里的 `units` 还没建形状，调用方（`StatementBuilder`）必须传段首，否则会走回上一条语句的声明关键字。
3. **lint 白名单事实**：`type-alias-declaration` 的类型层判据**保留**（它是类型层、不是语句边界）；`statement-boundary-util` 是**语句层唯一实现**，`ExpressionStatementPossibleShape.IsAsiBoundary` 只是单行委托。
4. **已知遗留：util ↔ expression-statement 循环 import**（`statement-boundary-util` 需要 `CanEndExpressionAt` / `HasLineBreakBefore` 等静态辅助）。当前生成的 TS 只在方法体内引用，运行期无 TDZ 问题；**Stage 2 计划把这些静态辅助方法迁入 `StatementBoundaryUtil`**，循环随之消失。
5. **T1d 分流落地口径**：`StatementRouteUtil.Decide` 是唯一分流点（全函数；首代码单元未到时返回 `None`，调用方**不得**据此 `Reject`）；`StatementEndPossibleShape` 的 `;` / EOF / ASI 判据改由 `CanEndStatement` 提供，`ScanRoot` 只保留「整条到齐 + `End`」。扫描器**已经提前收口**（`End < tokenIndex`，ASI 边界 token 属于下一条语句）时沿用 `End` 证据，避免声明族在 ASI 处被「只有表达式语句才 ASI」的起点规则卡住——这条是 Stage 2 把 ASI 判据按语句族细分时要收掉的遗留。