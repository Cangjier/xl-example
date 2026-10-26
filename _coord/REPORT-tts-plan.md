# REPORT-tts-plan — 「basic tokens → shape」重构：现状侦察 / 15 步差距 / 分包方案

- 作者：T2（架构侦察）
- 分支：`tts-plan`，克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\tts-plan`（从 `feature/all-possible` @ `3a0623c3` 建）
- 主仓库只读；未改 `typescript/IMPORTANCE.md`、未改 `core/syntax/basic-tokens/`、未修 `cjcli.xl.md`、未跑任何既有 gate。
- 实测探针：`tmp/probe.mjs`（被 `.gitignore` 的 `tmp` 吞掉，**未提交**）。

---

## 0. 复现配方（已实测通过）

```text
1) xl_build 工具（**不要传 out**，xl.json 的 build.out 已经是 "dist"）：
   xl_build { cwd: <clone>, paths: ["core","typescript"], targets: ["ts"] }
   → 560 written / 0 error / 3 warning（均为既有 E1107「同名 type 在两处声明」：
     class-get-accessor-possible-shape、class-index-signature-possible-shape、class-set-accessor-possible-shape）
2) node node_modules/typescript/bin/tsc -p .        # cwd=<clone>
   tsconfig：rootDir=dist、outDir=build、include=dist/**/*.ts、exclude=dist/cpp → exit 0
3) node tmp/probe.mjs                              # 逐字符 dump，读 build/ts
```

**踩坑**：第一次传 `out:"build"` 会把产物写到 `build/ts/`，而 tsconfig 的 `include` 是 `dist/**/*.ts`，
于是 `error TS18003: No inputs were found`。正确做法是让 `xl_build` 用默认 `dist`。

---

## 1. 现状架构一页纸（带文件:行）

### 1.1 一条链：字符 → basic token → 父单元重算候选 → 建 shape

1. **字符由 basic token 承接**：`UnitToken.Process` 的逐字符窗口循环
   （`core/syntax/unit-token.xl.md:89-204`，核心循环 `:124-195`）在每格依次跑
   `ExitOrPre`（`:153`）→ `ProcessQueue` 里的跳转（`:166-186`）→ `Default`（`:187-194`）。
   跳转队列只有一项：`BasicDispatch.Transit`（`core/syntax/templates/basic-dispatch.xl.md:92`，全链 `:110-224`），
   它按 BOM → Shebang → 注释/正则 → 字符串 → 括号 → 空白 → 符号 → Common 的顺序分派，
   **basic token 由各 `Transit` 自己 `unit.Add(new Xxx(...))` 挂到"当前单元"的 `Data` 下**
   （例：`BatchPlain` 里 `unit.Add(new Common(unit.Template))`，`basic-dispatch.xl.md:346`）。
   "当前单元" = 根（`SourceFileShape`）或它当前的 `MountedUnit` 链最内层。

2. **basic token close 只问父单元**（IMPORTANCE §3.2）：`Close` 里
   `parent.ComputePossibleShapes(context)`，返回 `Built` 就转成 `Reload`。
   共 9 处同一份写法：`common.xl.md:232-243`、`symbol.xl.md:121-132`、`bracket.xl.md:94-105`、
   `regex-token.xl.md:47-58`、`shebang.xl.md:93-95`、`bom.xl.md:75-77`、`line-annotation.xl.md:92-103`、
   `area-annotation.xl.md:143-154`、`string/string.xl.md:208-210`。
   **只在父单元实现 `IComputePossibleShapes` 时问；不往上找。**

3. **宿主重算候选**：`UnitToken.ComputePossibleShapes`（`unit-token.xl.md:37-48`）把宿主转给
   `this.CatalogGuide.ComputePossibleShapes(this, context)`；按下标版本 `:50-61`。
   `CatalogGuide.ComputePossibleShapesByIndex`（`catalog-guide.xl.md:61-121`）的实际顺序：
   形参校验（`:78-80`）→ 越界 `Nothing`（`:81-84`）→ **只淘汰**（逐个 `ComputeByIndex`，
   `Reject` 从 `Candidates` 删，`:85-89`）→ 终结候选 `Accept`（`:91-96`，同时 `Candidates>0` 抛错 `:93-95`）
   → `Accept` 且 `Candidates==0` 时调 `EndPossible.BuildByIndex` 并 `Reset`（`:97-101`）
   → 零候选且 `EndPossible===null` 抛错（`:102-107`）→ 多候选 `Waiting`（`:108-110`）
   → 唯一候选过 `IsBuildable`（`:115-117`）再 `BuildByIndex`（`:118-120`）。
   `Reset` 重置 `Candidates` + `Clear()` 缓存（`:123-135`）。

4. **basic token 的"谁是父"决定一切**：文档期望的"char 10 的 `Common("3")` 进
   `BinaryExpressionShape(+)`"成立的前提，是那时 `MountedUnit` 已经指向 Binary(+)。

### 1.2 数据结构与四个原语的**真实**语义

- `Token.Data`（`core/syntax/token.xl.md:40`）：子单元数组；`Parent`（`:36`）；
  `MountedUnit`（`:44`）：**非空时本单元的 `Process` 直接整段转给它**
  （`unit-token.xl.md:142-151`），是"挂载链"的唯一载体。
  `LastIndex`（`:52`）记最近消费的**下标**（形状补终点用 `+1`）。
- `TryToClose`（`token.xl.md:118-129`）：范围两端都已设置才 `Close`；起点只能签一次
  （`SignIn` `:185-201`）、终点只能签一次（`SignOut` `:214-232`，且递归给最后一个子单元
  `TrySignOut` `:234-252`）。`ShapeToken.TryToClose`（`shape-token.xl.md:47-65`）
  在终点未定时用"最后子单元的 End"或 `LastIndex+1` 自补。
- `Replace`（`token.xl.md:312-333`）：在父 `Data` 里**原位 1:1 替换**自己——`splice` 两次，
  并同步 `Parent.MountedUnit`（`:327-329`）。文档里 char 9/10/12 的"原位换成 NumericLiteralShape /
  BinaryExpressionShape"就是它。
- `MoveDataTo`（`:131-140`）：把自己 `Data` 全部搬给 target 再清空（文档"被 shape 消费时移入"）。
- `Add` / `AddRange`（`:142-164`）、`Quit`（`:166-175`，卸载并返回父）、`RemoveSelf`（`:335-351`）。
- `Reload` 的语义：basic token `Close` 建出形状后返回 `Reload`
  → `UnitToken.Process` 把当前下标压成 `ReloadMessage` 并**停止整个窗口**
  （`unit-token.xl.md:107`、`:154-157`、`:172-175`）→ 驱动层 `DrainMessages`
  用**只含一格**的窗口 `[at, at+1)` 重放（`syntax-context.xl.md:184-229`，
  "窗口必须一格"的理由见 `:188-190`）；重放没推进就原地重试（最多 8 次，`:207-222`）。
  **这是"basic token 关闭 → 建 shape → 当前字符重新分派给新 MountedUnit"的唯一回路。**
- `ShapeToken.Pos`（`shape-token.xl.md:19-24`）：AST 起点（含前导 trivia）= 前一个非 trivia 单元的
  `SourceRange.EndIndex`，首个为 0。它**独立于** `SourceRange`（代码的半开区间）。
- `PossibleShapeCache`（`core/syntax/possible-shape-cache.xl.md`）：
  `Values` 按形状槽位存"逐条目"状态、`Clear()` 清（`:112-124`，紧跟每次 `BuildByIndex` 后的 `Reset`）；
  `Share` 跨条目、活到宿主 shape 生命周期（`:21-29`，`Reset` 不清，必须自带新鲜度判据）；
  `ItemStartValue/ItemStartLength`（`:81-111`）按条目记忆 `ItemUtil.ItemStart`，
  这是"扫到哪/条目从哪开始"的官方缓存位；槽位由 `PossibleShape.Slot()`（`possible-shape.xl.md:26-56`）发放。

### 1.3 现状的致命事实：**没有增量建 shape，只有"壳 + EOF 原子建树"**

探针（`let x = 2*3+1`，逐字符 `ProcessRange`，见 §2）显示：

- char 0–4 与文档**完全一致**：只有 `SourceFileShape` + 3 个 basic 单元
  （`Common("let")`、`WrapSymbol(" ")`、`Common("x")`）。
- **char 5（"x" 关闭）时建的形状是 `StatementShape`（`pos=0, src=[0,未封)`），
  不是文档的 `VariableStatementShape` 三层**，并且它把 4 个 basic 单元原样收进 `Data`。
- char 6–12 全部是 basic 单元继续堆进这个壳，**一个子形状都没建**。
- EOF 才一次性建出与文档 **逐节点、逐 Pos、逐区间都相同**的树。

原因：

1. `VariableStatementPossibleShape.BuildByIndex`（`typescript/tokens/statements/variable-statement-possible-shape.xl.md:138-222`）
   在 `let`+绑定到齐（`IsBuildable` `:122-136`）时建的是
   `new StatementShape(host.Template)`（`:184`），把已有单元 `splice` 进壳（`:182-192`），
   然后 **`shell.CatalogGuide = new CatalogGuide([], endShape)`（`:200`）——候选数组是空的**，
   终结候选是 `StatementEndPossibleShape`；`host.MountedUnit = shell`（`:203`）。
   空候选 ⇒ 之后每格只问终结候选"该结束了吗"，**没有任何子形状 possible 会被问**，所以不会增量建。
2. 终结候选 `StatementEndPossibleShape.BuildByIndex`（`statement-end-possible-shape.xl.md:333-517`）
   在收口那一格调 `StatementShape.BuildFromShell` + `StatementShape.FinishShell`
   （`:514-516`），即**整段 `Data` 交给 `StatementBuilder` 原子建树**：
   `StatementShape.BuildFromShell`（`statement-shape.xl.md:95-289`）里
   `new StatementBuilder(...).Load(consumed, shell.Pos)`（`:224-225`）+ 三层判定
   `VariableStatementThreeLayer.TryBuild(builder, consumed)`（`:239-245`，实现见
   `variable-statement-three-layer.xl.md:48-76`，它内部就是 `builder.BuildStatement()`），
   最后由 `FinishShell`（`statement-shape.xl.md:293-344`）把壳从父 `Data` 里 `splice` 成建好的形状，
   未消费的 basic 单元再原位插回父 `Data` 重放。
3. 因此 `VariableStatementShape`（`variable-statement-shape.xl.md:9-28`）现在**只是一个空壳类**
   （只有构造函数），`VariableDeclarationListShape` / `VariableDeclarationShape` 是 `StatementBuilder`
   内部用的"建树零件"，不是能挂载、能吃字符、能有 CatalogGuide 的活形状。
4. 同理 `AsteriskTokenShape` / `PlusTokenShape` / `EqualsTokenShape` / `NumericLiteralShape` /
   `IdentifierShape` / `BinaryExpressionShape` 都是 `ExpressionBuilder`/`StatementBuilder`
   在原子建造时 `new` 出来的产物，**没有对应的 `XxxPossibleShape` 注册在任何目录里**。

一句话：**当前是"basic token 全量缓冲 + 收口时一次原子建树"；文档要的是
"basic token 关闭即触发父级候选，逐层长出形状、逐层原位替换"。差别是架构级的，不是 bug 级。**

### 1.4 `CatalogGuide` 判定链与 IMPORTANCE §3.3 的偏差点

| # | §3.3 规范 | 现状 | 判定 |
|---|---|---|---|
| a | 终结候选 `Accept` 且 `Candidates==0` 时「调 `BuildByIndex` 结束（**签出 `SignOut` → `TryToClose` → `Quit`**），`Reset` 返回 `Built`」 | `CatalogGuide` 只调 `EndPossible.BuildByIndex`（`catalog-guide.xl.md:97-101`）；**签出/关闭/卸载这三步整体落在终结候选自己身上**，而现有 `StatementEndPossibleShape.BuildByIndex`（`:514-516`）做的是 `BuildFromShell` + `FinishShell`（原子建树 + `splice` 替换），**根本不做 `SignOut→TryToClose→Quit`** | **偏离（语义级）**，这正是本次重构要抹平的差 |
| b | `Candidates>0` 且终结候选 `Accept` → 抛错 | `:91-95` 一致 | 一致 |
| c | 零候选且 `EndPossible===null` → 抛错；不为 null → `Waiting` | `:102-107` 一致 | 一致 |
| d | 多候选 → `Waiting`；唯一候选先 `IsBuildable` 再 `BuildByIndex`，`Reset` | `:108-120` 一致 | 一致 |
| e | 形参漏传 `context` 当场炸 | `:78-80` 一致 | 一致 |
| f | 「shape **禁止覆盖 `ComputePossibleShapes`**」 | `StatementShape` 覆盖了它（`statement-shape.xl.md:59-93`，先喂 `DirectSession` 再 `super`） | **规范被违反**（行为上目前等价，但增量化后这层覆盖会变成第二个建树入口，必须处理） |
| g | §3.4「`BuildByIndex` 也要复用同一份 cache；`ItemUtil.ItemStart` 只在 cache 为 null 时回退」 | 大量形状仍直接调 `ItemUtil.ItemStart`（例：`variable-statement-possible-shape.xl.md:141`） | **局部偏离**，与本次用例无直接冲突，但新增 possible 必须按 §3.4 写 |

### 1.5 其它必须知道的事实

- 根目录候选表在 `source-file-shape.xl.md:134-191`；`VariableStatementPossibleShape` 在第 `:169` 位注释
  明确写着「**根层 `let`/`const`/`var` 声明先建 `StatementShape` 壳（`;`/ASI 由壳的终结候选收口）**」——
  这就是现状架构的自述。
- `SourceFileShape.Process` 特判 EOF 空窗口（`source-file-shape.xl.md:101-128`）：
  先 `mounted.TryToClose` + `Quit`，再补最后一个子单元，再建 `EndOfFileTokenShape` 塞进 `Data`。
  `SourceFileShape.Close`（`:59-81`）收尾时**过滤掉 trivia 与 EOF 哨兵**——文档 EOF 树里空格/`=` 消失的另一半原因。
- `SyntaxContext.Process` 的 EOF 尾部（`syntax-context.xl.md:154-157`）：
  `Index=count` → `Root.SignOut(count)` → 空窗口 `Root.Process` → `DrainMessages`。
- 探针必须复刻这一段（不能用 `context.Process`，否则拿不到中间态）。

---

## 2. 15 步差距表（实测 vs 文档）

探针口径：每字符一个 `context.ProcessRange(fileRoot, new SourceRange(doc,i,i+1), i)`，
最后一步复刻 `SyntaxContext.Process` 尾部（`SignOut(count)` + 空窗口）。
下表"现状"是 `tmp/probe.mjs` 的原始输出（已删掉与文档同形的重复描述）。

| # | 字符 | 期望（docs/expected-token-time-shapes.md） | 现状（实测） | 偏差归类（IMPORTANCE §5） |
|---|---|---|---|---|
| 0 | `l` | SF + `Common[0,1)` | 相同 | **无偏差** |
| 1 | `e` | 同，text=`le` | 相同 | **无偏差** |
| 2 | `t` | 同，text=`let` | 相同 | **无偏差** |
| 3 | ` ` | + `WrapSymbol[3,4)` | 相同（父=SF，未建 shape） | **无偏差** |
| 4 | `x` | + `Common[4,5)` | 相同 | **无偏差** |
| 5 | ` ` | `VariableStatement(0,[0,未封))→VariableDeclarationList(0,[0,未封))→VariableDeclaration(3,[4,未封))→{Identifier(3,[4,5)), WrapSymbol[5,6)}` | `StatementShape(pos=0,[0,未封))` 挂载，`Data` = `Common("let")`+`WrapSymbol[3,4)`+`Common("x")`+`WrapSymbol[5,6)`；**没有 VariableStatement/List/Declaration/Identifier 任何一层** | **possible build 不对**（建错形状：空候选壳 vs 三层）+ **缺少 possible**（三层与 Identifier 均无 possible 候选） |
| 6 | `=` | `Symbol[6,7)` 挂在 `VariableDeclarationShape` 下 | `Symbol[6,7)` 挂在 `StatementShape` 下 | **possible build 不对**（归属层错） |
| 7 | ` ` | `WrapSymbol[7,8)` 挂在 `VariableDeclarationShape` 下 | 挂在 `StatementShape` 下 | **possible build 不对** |
| 8 | `2` | `Common[8,9)` 挂在 `VariableDeclarationShape` 下（`=` 与两空格仍是兄弟） | 挂在 `StatementShape` 下 | **possible build 不对** |
| 9 | `*` | `Common("2")` **原位换成** `NumericLiteralShape(pos=7,[8,9))`；追加 `Symbol[9,10)` | 无替换，`Common`+`Symbol` 继续堆在壳里 | **缺少 possible**（NumericLiteral 无候选）+ **possible build 不对**（没有"关闭即替换"的 build） |
| 10 | `3` | `Symbol("*")` → `AsteriskTokenShape(pos=9,[9,10))`；`BinaryExpressionShape(pos=7,[8,未封))` **原位替换 NumericLiteral 的位置**，子 = Numeric(2)/Asterisk/`Common("3")` | 全是 basic 单元，无运算形状 | **缺少 possible**（BinaryExpression、AsteriskToken 均无候选）+ **possible build 不对** |
| 11 | `+` | `Common("3")`→`NumericLiteralShape(pos=10,[10,11))`；**`Binary(*)` 当场封口 `[8,11)`**；追加 `Symbol[11,12)` | 无封口，无任何形状 | **缺少 end**（右操作数关闭即封 Binary 右边界，没有这个 end 候选/回调）+ **缺少 possible** |
| 12 | `1` | `Symbol("+")` → `PlusTokenShape(pos=11,[11,12))`；`BinaryExpressionShape(+)` **原位替换 Binary(*) 的位置**；`Common[12,13)` 进 `Binary(+)` | 全是 basic 单元 | **缺少 possible** + **possible build 不对** |
| EOF | — | `Common("1")`→`NumericLiteral`；清掉剩余 basic token（空格、`=`）；`SF[0,13)→VS[0,13)→VDL[0,13)→VD(3,[4,13))→{Identifier(3,[4,5)), Binary(+)(7,[8,13))→{Binary(*)[8,11)→{Num(2),Asterisk,Num(3)}, PlusToken[11,12), Num(1)[12,13)}}` | **完全一致**（结构、类名、Pos、SourceRange 逐项相同；空格与 `=` 已被 `StatementBuilder` 丢弃、`SourceFileShape.Close` 再过滤 trivia） | **无偏差**（结果等价；达成方式不同：一次原子建树） |

**统计**：15 步中 5 步无偏差（char 0–4）、1 步无偏差（EOF 结果等价）、**9 步偏差全部落在 char 5–12**，
且偏差集中在一件事：**"basic token 关闭后没有子形状 possible 被问、没有原位替换发生"**。
按 §5 分类计数：缺少 possible 6 步（5,9,10,11,12 各含，10 含两个）、possible build 不对 6 步（5,6,7,8,9,10,12）、
缺少 end 1 步（11）；**没有** basic token 存在问题、**没有** possible compute 不对、**没有** end compute/build 不对
（现有 basic token 行为与文档 char 0–4 逐字符一致）。

---

## 3. 分包方案（可直接拆给 3–6 个成员）

> 原则：**core 不改**（判断依据见 §4），全部改动落在 `typescript/` 的形状层；
> 每个包都以"某几步必须绿"为验收，且文件清单尽量互不重叠。
> 所有包都不允许改 basic tokens / IMPORTANCE.md / cjcli.xl.md / gates。

### WP-1「变量声明三层增量外壳」（char 5、6、7）
- **目标**：char 5 的 `x` 关闭时，按文档建出
  `VariableStatementShape(pos=0,[0,未封)) → VariableDeclarationListShape(pos=0,[0,未封)) → VariableDeclarationShape(pos=3,[4,未封))`，
  并把 `let`/空格/`x` 按"移入 / 原位替换"落位；声明名由 WP-2 的 `IdentifierPossibleShape` 提供。
- **要改的文件**：
  - `typescript/tokens/statements/variable-statement-possible-shape.xl.md`（`BuildByIndex` 改 `new VariableStatementShape`，目录候选改为"列表候选"）
  - `typescript/tokens/statements/variable-statement-shape.xl.md`（从空壳变成活形状：`ComputePossibleShapes`/`Close`/`ExitOrPre`/字段提取）
  - `typescript/tokens/declarations/variable-declaration-list-shape.xl.md`（改成可挂载层：签入到 `let` 起点、目录挂"声明候选"）
  - `typescript/tokens/declarations/variable-declaration-shape.xl.md`（改成可挂载层：目录里挂 `IdentifierPossibleShape` 与（WP-3 的）表达式目录；`=` 的提取与丢弃时机）
  - `typescript/tokens/declarations/variable-declaration-scan-util.xl.md`（扫描判据复用/降级为只读）
  - **新增** `typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md`、`variable-declaration-possible-shape.xl.md`
- **依赖**：WP-2（拿 Identifier 的 possible）；**被 WP-3 依赖**（声明里的初始值位置要挂"表达式目录"）。
- **冲突面**：与 WP-4 同抢 `variable-statement-possible-shape` / `statement-shape`（"谁建壳、谁收口"）；
  与 WP-3 在 `variable-declaration-shape` 的"`=` 之后挂什么目录"上接壤（约定：WP-3 提供只读的
  `ExpressionCatalogFactory`，WP-1 只 import 不写同一文件）。
- **验收（必须绿）**：char 5 三层 + `IdentifierShape` + `WrapSymbol[5,6)` 全对；char 6/7 的 `Symbol("=")`、`WrapSymbol[7,8)`
  的**归属层**正确；char 0–4 与 EOF 不退步。
- **预估**：3–5 人日（是新写三个 possible + 改三个 shape，最大的一块之一）。

### WP-2「叶子单元 possible + 关闭即原位替换」（char 4–5、8–9、10–11、12–13）
- **目标**：`Common` 关闭 → 候选 `Accept` → `BuildByIndex` 用 `FromBasicToken` 立即关闭，
  并在父 `Data` 里 `Replace` 原位替换。产出 `IdentifierShape`、`NumericLiteralShape`。
- **要改的文件**：
  - `typescript/tokens/names/identifier-shape.xl.md`（补 `FromBasicToken`；若已有则只补 possible）
  - `typescript/tokens/literals/numeric-literal-shape.xl.md`（同上）
  - **新增** `typescript/tokens/names/identifier-possible-shape.xl.md`、`typescript/tokens/literals/numeric-literal-possible-shape.xl.md`
  - 可能微调 `core/syntax/templates/number-template.xl.md` 的**只读**接口调用（不改 core 文件；数字模板本身在 core）
- **依赖**：无（但只有被 WP-1/WP-3 注册后整链才可见）；**被 WP-1、WP-3 依赖** —— **必须最先合入**。
- **冲突面**：几乎没有（全是叶子形状 + 新增文件）。
- **验收**：char 5 `IdentifierShape(pos=3,[4,5) text="x")`；char 9/11/12 与 EOF 的 `NumericLiteralShape`
  （注意 `pos` 取"前一个非 trivia 单元 End"：char 9 是 7、char 11 是 10、EOF 的 `1` 是 11）。
  以及"第二次关闭同一格不重复替换"的幂等性。
- **预估**：1–2 人日（最小、风险最低、**建议第一波就做**）。

### WP-3「二元表达式增量 + 运算符 shape + 右边界当场封口」（char 9、10、11、12）
- **目标**：`*`/`+` 关闭时建 `AsteriskTokenShape`/`PlusTokenShape`（吃 `Symbol`）；以"左操作数 + 运算符"为条件建
  `BinaryExpressionShape` 并**原位替换左操作数的位置**；**右操作数关闭即 `SignOut` 封 Binary 的 End**
  （char 11 的 `Binary(*)[8,11)` 就是这样来的）；char 12 再以 Binary(*) 为左操作数建 Binary(+)。
- **要改的文件**：
  - `typescript/tokens/expressions/binary-expression-shape.xl.md`（加 possible 所需的扫描状态 + 右操作数封口）
  - **新增** `typescript/tokens/expressions/binary-expression-possible-shape.xl.md`、`binary-operator-possible-shape.xl.md`
  - `typescript/tokens/punctuation/asterisk-token-shape.xl.md`、`plus-token-shape.xl.md`（`FromBasicToken` + 各自 possible）
  - `typescript/tokens/expressions/operator-table.xl.md`（只读优先级查询，**不要在这里加状态**）
  - `typescript/tokens/expressions/expression-builder.xl.md`（保留为 EOF/fallback 路径；默认路径不再调用它）
- **依赖**：WP-2（操作数 possible）；**被 WP-1 依赖**（initializer 目录）；与 WP-1 的"表达式目录工厂"边界见上。
- **冲突面**：`expression-builder.xl.md`（与 WP-4 的 fallback 路径）、`variable-declaration-shape`（与 WP-1）。
- **验收**：char 9 `NumericLiteralShape` 替换 + `Symbol[9,10)`；char 10 `AsteriskTokenShape` + `Binary(*)[8,未封)` 原位替换；
  char 11 **`Binary(*)[8,11)` 已封口** + `NumericLiteral[10,11)`；char 12 `PlusTokenShape` + `Binary(+)[8,未封)`
  + `Common[12,13)` 进 Binary(+)；EOF 树不变。
- **预估**：3–4 人日（封口时机最容易错，建议先写"单形状单测"再进整链）。

### WP-4「收口与残留 basic token 清理」（char 11 封口后 + EOF）
- **目标**：把"语句族终结 = 整壳原子建树"改成"只封区间 + 清掉未消费的 basic token（空格、`=`）"；
  `StatementEndPossibleShape` / `SourceFileEndPossibleShape` 在**增量树已完整**时不再调 `StatementBuilder`；
  保留旧路径作为 per-kind fallback。
- **要改的文件**：
  - `typescript/tokens/statements/statement-end-possible-shape.xl.md`（收口判据与 end 候选改造）
  - `typescript/tokens/statements/statement-shape.xl.md`（`BuildFromShell`/`FinishShell`/`DetachShell` 降级为 fallback；
    去掉对 `ComputePossibleShapes` 的覆盖，或改成不建树的纯喂入）
  - `typescript/tokens/files/source-file-end-possible-shape.xl.md`
  - `typescript/tokens/statements/statement-builder.xl.md`（**不改**，只是不再被默认路径调用；作为对照实现保留）
- **依赖**：WP-1、WP-3（否则没有"已完整的增量树"可保留）。
- **冲突面**：**最大**——与 WP-1 同抢 `variable-statement-possible-shape` / `statement-shape`；
  建议 WP-4 在 WP-1 合入后再开工，且只动 `statement-*.xl.md` 与 `source-file-end-possible-shape.xl.md`。
- **验收**：EOF 树与文档仍逐项相同、且 `StatementBuilder.Load` 调用数为 0（默认路径）；
  char 11 的 `[8,11)` 封口在"没有整壳收口"的情况下依然成立；`;`/ASI 既有用例不退步。
- **预估**：3–5 人日（最危险的一块；建议保留整链路开关）。

### WP-5「装配 / 开关 / 逐字符回归」（贯穿，最后收）
- **目标**：根目录候选表、`StatementRouteUtil` 的开关键、把 T1 的 `tests/parse/token-time-shapes.mjs`
  接成默认回归；默认走增量、旧路径可一键回退。
- **要改的文件**：
  - `typescript/tokens/files/source-file-shape.xl.md`（候选表/Pos 初始化）
  - `typescript/tokens/statements/statement-route-util.xl.md`（新增"增量 vs 壳"开关）
  - `tests/parse/token-time-shapes.mjs`（**属于 T1 的输出，本包只接不改算法**）
- **依赖**：全部。
- **验收**：15 步全绿 + 关掉开关时回到今天的行为（逐字节）。
- **预估**：1–2 人日。

### 推荐执行波次

```text
W1（并行）：WP-2（叶子 possible，独立、风险最低） ‖ WP-1（三层外壳，可与 WP-2 并行开发）
W2：        WP-3（二元表达式；依赖 WP-2 已合、WP-1 的 initializer 目录）
W3：        WP-4（收口/清理；必须等 WP-1 + WP-3 合入）
W4：        WP-5（装配 + 回归，锁绿）
```

**若必须严格串行**：WP-2 → WP-1 → WP-3 → WP-4 → WP-5。
理由：WP-2 提供所有"叶子"，WP-1 提供"容器层与目录"，WP-3 的 Binary 既需要叶子（操作数）也需要 WP-1 的
`VariableDeclarationShape` 作为宿主；WP-4 只有在树能增量长出来之后才有意义；WP-5 是接线与锁绿。

### 合并冲突面汇总

| 文件 | 涉及包 | 建议 |
|---|---|---|
| `variable-statement-possible-shape.xl.md` | WP-1, WP-4 | WP-1 先写完；WP-4 只改"终结候选要不要建树"那一处 |
| `statement-shape.xl.md` | WP-1(间接), WP-4 | WP-4 **独占**；WP-1 只在 WP-4 未开工前读 |
| `variable-declaration-shape.xl.md` | WP-1, WP-3 | 目录装配点抽到**新文件** `expression-catalog-factory`，两包都只 import |
| `expression-builder.xl.md` | WP-3, WP-4 | WP-3 改；WP-4 只读 |
| `source-file-shape.xl.md` | WP-5 | 单独一人收口 |

### 是否必须顺序：`VariableStatementShape` 与 `VariableDeclarationListShape` 的"签入点"必须一次定死
char 5 的期望树要求 `VariableDeclarationListShape` 也 `pos=0, src=[0,未封)`（从 `let` 起），
而 `VariableDeclarationShape` 从 `x` 的 `pos=3` 起。这条不一致是跨 WP-1/WP-4 的**契约**，
必须由 Lead 在 W1 前写进包描述，否则两包会各按各的理解签范围。

---

## 4. core 调度层要不要改？——**判断：不需要改，除非出现"N:1 替换"原语缺口**

依据（逐条可核对）：

1. **触发链已通**：basic token `Close` 只问父单元的 `ComputePossibleShapes` 已存在且在 9 个 basic token 里一致
   （§1.1 第 2 条的行号），父单元是挂载中的 shape 时，问到的就是那个 shape 的 `CatalogGuide`——
   文档要求的"basic token 直接挂到当前正在等它的 shape 的 `Data` 下"由 `MountedUnit` 天然满足。
2. **判定链完整**：淘汰 / 终结 / 唯一候选 build / `IsBuildable` / `Reset` 全在 `catalog-guide.xl.md:61-135`，
   与 §3.3 除(a)(f)两条语义分歧外逐条一致；"空候选数组 + 终结候选"是**合法且正在使用**的形态
   （`variable-statement-possible-shape.xl.md:200`）。
3. **原语齐备**：原位替换 `Replace`（`token.xl.md:312`）、搬移 `MoveDataTo`（`:131`）、
   追加 `Add`（`:142`）、卸载 `Quit`（`:166`）、shape 自补终点 `ShapeToken.TryToClose`（`shape-token.xl.md:47-65`）、
   `Pos` 口径（`:19-24`）都能直接支撑文档里的"原位替换/移入/封口/清 basic token"。
4. **缓存契约够用**：`PossibleShapeCache` 的 `Values`（逐条目、`Clear` 清）+ `Share`（跨条目、自带新鲜度）
   + `ItemStart`（按条目记忆扫描下界）足以让每个新 possible 按 §3.4 记"扫到哪"。
5. **唯一可能的 core 缺口**：`Replace` 只做 **1:1**。若某个 build 需要把父 `Data` 里一段连续单元
   （如 `[Numeric(2), Symbol(*), Common(3)]`）整体换成 1 个形状，只能组合
   `Add`+`splice`+`Replace`，或者自己 `new` 形状后手工 `Parent.Data.splice(...)`（现状
   `variable-statement-possible-shape.xl.md:182-203` 就是这么干的）。
   **建议**：先按现状在 typescript 层组合实现；只有当 ≥3 个包都要重复这段 splice 时才向 Lead 申请
   一个 core 小原语（`Token.ReplaceRange(start, endExclusive, item)`）。
   不要在 W1 就动 core——那是把风险从形状层搬到全语料。
6. **反向证据**：如果说 core 要改，唯一理由是 §3.3(a) 的"终结候选负责 `SignOut→TryToClose→Quit`"。
   这是**规范与实现的分歧**，不是 core 缺能力：`SignOut`/`TryToClose`/`Quit` 三个方法都在 `Token` 上现成
   （`token.xl.md:214`、`:118`、`:166`）。**结论：把 §3.3(a) 落成 reality 是"改各 shape 的 end/build"，
   不是"改 core 调度".**

---

## 5. 不要动清单（硬约束）

1. `core/syntax/basic-tokens/**`（8 种 basic token：`common`、`symbol`、`wrap-symbol`、`bracket`、
   `area-annotation`、`line-annotation`、`regex-token`、`string/**`；`bom`/`shebang` 亦然）——**只读分析**，
   除用户明确要求否则 AI 不得改（IMPORTANCE §3.1）。
2. `typescript/IMPORTANCE.md`——只能用户改。
3. `cjcli.xl.md`（依赖已删除的 `./dawn/text/*`，根级全量 build 必 E1006；本次不修）。
4. 所有既有 gate：`tests/gates/**`、`npm run gates`、`samples`、`coverage`、`ast:*` 系列——重构期间禁用，不跑、不改。
5. 主仓库 `C:\Users\Admin\Documents\GitHub\xl-example`——只读。
6. `tmp/` 下的探针脚本——**不提交**（`.gitignore` 已含 `tmp`）；提交的只有本报告。

---

## 6. 文档可疑点（docs/expected-token-time-shapes.md：开头已声明"不一定完全正确"）

1. **char 8 的 `Symbol("=")` 与两个空格还留在树里，与 §3.5「Close 后 `Data` 等价于 AST children」冲突（时间性例外）**。
   文档没写"`=` 何时被 `VariableDeclarationShape` 提取字段并丢弃"：如果 char 8 就已经提取，树里就不该再有 `Symbol("=")`；
   如果到 char 9 才丢，那 char 9 的替换动作就同时包含"换 Numeric + 吞 `=`"两件事。
   **建议**：char 8 按"已提取字段、节点暂留到该层 Close"实现，并在文档里补一句时间线。
2. **char 11「`Binary(*)` 的右边界 = 3 的 end，当场封 `[8,11)`」没有说明"谁触发封口"**。
   按 §3.3，终结候选只在"语句该结束"时 `Accept`；这里 Binary 在语句远未结束时就要封口，
   只能是"右操作数 shape 关闭时父 Binary 在自己的 `TryToClose`/child-close 回调里 `SignOut`"。
   文档需要补一条：**形状对子单元关闭的响应链**（否则各包会各自发明一套）。
3. **char 5 的 `VariableDeclarationListShape` 签入点**：文档给了 `pos=0 src=[0,未封)`，
   但没说它为什么不是从 `x`（4）起。若按"每个形状签入到自己的首个代码单元"这条直觉规则会差一格。
   建议文档补一行"list 层与 statement 层同起点（关键字 `let`）"。
4. **char 3/4 line 13 的措辞容易被误读**：「char 3/4 只有 raw 单元」——本质是"只有 basic 单元、
   还没建任何 shape"，而不是"没有 possible 在判"。实测 char 3/4 时根目录每格都在跑候选（只是都 `Uncertain`）。
   建议改成"只有 basic 单元，尚未建 shape"。
5. **line 6-8「只有一个 `Data`，没有 `Raw`」**：本分支已无 `Raw` 类，这条无法对照、可视为已满足；
   但"basic token 被 shape 消费时原位替换/移入"的两种方式（`Replace` vs `MoveDataTo`）文档混着说，
   实现时需要逐形状指定。建议文档对每步标注"替换 / 移入 / 清掉"是哪一种。
6. **EOF 树的 `SourceFileShape` 之外没有 `EndOfFileTokenShape`**：这依赖 `SourceFileShape.Close` 过滤 EOF 哨兵
   （`source-file-shape.xl.md:79`）。文档没提这个过滤，实现时**不能**在增量路径里自己再造一个"漏 EOF"的 bug。

> 注：文档中 `Pos` 的取值（char 9 的 7、char 10 的 7、char 11 的 10、char 12 的 11）与现实现
> `ShapeToken.Pos` 规则（`shape-token.xl.md:19-24`，前一个非 trivia 单元 End）**完全自洽**，
> 这一段文档是对的，不要按"形状起始字符"去算。

---

## 7. 风险与不确定点（HANDOFF）

### 最大 3 个风险
1. **R1 双路径互污染（最高）**：`StatementShape` 的 `BuildFromShell`/`FinishShell`/`DetachShell`/`LeftoverReplay`
   （`statement-shape.xl.md:95-371`）与新增的增量 possible **在同一份 `Data` 上抢单元**。
   一旦某个 possible 把单元吃进形状，壳的 `consumed` 切片就变了 → `builder.At !== Units.length` → 抛"语句没有读完"
   → 文件级 fallback（`source-file-runner.xl.md:47-61`）。**必须在 W1 决定开关粒度（建议 per-StatementKind），
   并保证"某条语句一旦走增量，就不再把它的原始 basic 单元交给 builder"。**
2. **R2 既有读数全变**：`StatementLegacyMetrics` / `VariableStatementThreeLayer.{StatementCount,...}` /
   `DirectBuildMetrics` 与七道 gate 都假定"壳 + 原子建树"。重构期间 gates 禁用，但解禁后基线要整体重设；
   建议每个包都留旧路径与计数器，不删。
3. **R3 表达式层两套判据分叉**：`operator-table` / `expression-builder` 是 AST 导向的原子建造器，
   与新增 `BinaryExpressionPossibleShape` 会各有一套"优先级/断句"判据。**必须让增量层复用
   `operator-table` 的只读查询，禁止复制优先级表**，否则 `a-b-c` 与 `a*b+c` 会走两条结论。

### 不确定 / 未确认清单
- **未读全文**（决定 WP-1~3 精确改法，交给下一个成员）：`statement-builder.xl.md`、`expression-builder.xl.md`、
  `binary-expression-shape.xl.md`、`numeric-literal-shape.xl.md`、`identifier-shape.xl.md`、
  `asterisk/plus/equals-token-shape.xl.md`、`variable-declaration{-list}-shape.xl.md`、
  `variable-declaration-list-util.xl.md`、`operator-table.xl.md`。
- **未实测**：`Token.Replace` 在"`MountedUnit` 指向被替换单元"时的行为（代码上有处理 `token.xl.md:327-329`，未跑）；
  `FinishShell` 的 `LeftoverReplay` 与增量路径并存时的行为（`:315-343`）。
- **未跑**：全语料回归 / 任何 gate（按约束禁止）；因此"核心不需要改"是**静态判断 + 单用例实测**，
  不是全语料结论。
- **未验证**：一个形状同时是"父级 `Data` 的兄弟替换目标"又"自己挂着 `MountedUnit`"时，
  `Replace` 与 `MountedUnit` 的交互（char 10/12 的 `Binary` 就是这样）。
- **文档未定**：§6 的 6 条里第 1、2、3 条需要 Lead/用户裁定后才能进 WP-1~3；否则三包会各选一种语义。

### 给 Lead 的最小决策清单（开工前）
1. char 8 的 `Symbol("=")` 是"暂留节点"还是"已丢弃字段"？（§6-1）
2. char 11 的 Binary 右边界封口由 **谁** 触发？（§6-2）——建议：右操作数 shape `Close` 时回调父 Binary。
3. 默认路径的开关粒度：per-StatementKind / per-shape / 全局？（§7-R1）
4. `VariableDeclarationListShape` 的签入点 = `let` 的 Start（0）——确认后写进 WP-1 契约。（§6-3）
