# 54 — typescript/tokens/expressions/forms/shared（5 文件）

本批是 R13「bracket create 时触发 possible」的落地处。字节与代码行取 `_facts/typescript-tokens-expressions-forms-shared.md` 的机械读数；物理行（`read` 读数）依次为 516 / 478 / 148 / 69 / 97，**证据行号一律取 `read` 返回的行号**。两条前提先说清：

1. `ShapeStates` 只有 `Reject / Accept / Uncertain`（`core/syntax/shape-states.xl.md:5-7`），**没有 `Nothing`**，R25 的越界返回值在候选返回类型上无法表达；凡「越界返回 `Uncertain` / `false` / 宿主」者一律记 `B1` ○ 并在此注明，不再要求 `Nothing`。
2. 全仓 `grep HandleCloseDispatch` 在源码里 **0 命中**（15 处命中全在 `docs/`），R15/R16 的机制不存在；close 侧偏离统一按「替代物是什么」记 `P4`。

---

### typescript/tokens/expressions/forms/shared/expression-bracket-possible-shape.xl.md（20187B / 366行；ExpressionBracketScan、ExpressionBracketPossibleShape extends PossibleShape）

- 结构：possible 层 + 设计外状态表。挂载链是 R13 的正解形态：`Bracket.Transit` 建括号 → `BracketRoleCatalogHook.OnBracketCreated`（`core/syntax/basic-tokens/bracket.xl.md:163-165`）→ 三条线的分派（`typescript/tokens/statements/bracket-role-catalog-hook.xl.md:52`）→ `InstallAtBracketCreated` → `EnsureRegistered` + `BracketRoleResolver.Resolve` + `BracketCatalogInstaller.Install`（`typescript/tokens/statements/bracket-catalog-installer.xl.md:100-109` 把 `CatalogGuide` 挂到 bracket 上）→ 同拍末尾 `mounted.ComputePossibleShapes(context, PossibleSource.BracketCreate)`（`bracket.xl.md:175-177`）；此后每格由 bracket 自己的目录问 `ComputeByIndex`/`IsBuildable`，`BuildByIndex` 把 `Common` 换成 `IdentifierShape`/`NumericLiteralShape`，`ObjectLiteral` 角色下再就地封成员。
- 偏离：
  - `[P1]` ○ create 侧确实装目录、也确实在 create 拍问了一次（R13 成立），但装进去的是**按角色共享的「角色目录」**，不是形状自己的 possible；且角色未 `Known` 就不装（`Deferred`/`Fallback` 直接落空），R14 的「形状可能确定、data 不完整 ⇒ 只 install catalog 由 data 收敛」被换成「角色判对了才装」 — 证据 `expression-bracket-possible-shape.xl.md:256-261`（`EnsureRegistered(); const plan = BracketRoleResolver.Resolve(host, shape, context); if (!plan.IsKnown() || …RoleKinds.indexOf(plan.Role) < 0) { return false; } BracketCatalogInstaller.Install(shape, plan, context);`）、`:70-74`（`const catalog = new BracketRoleCatalog(role, …Shapes(), null); … BracketRoleResolver.RegisterCatalog(catalog);`，按角色只注册一次 ⇒ 同角色所有括号共用同一目录实例）
  - `[P2]` ○ `ComputeByIndex` 恒返回 `Uncertain`：R26 的「逐个活候选淘汰」空转，淘汰与定案全部下沉到 `IsBuildable`；单候选下与 R30 的次序（唯一候选 → 问 `IsBuildable` → `BuildByIndex`）一致，但候选本身不再携带任何判定 — 证据 `:265-269`（`return ShapeStates.Uncertain;`）
  - `[P4]` ● close 侧没有 `HandleCloseDispatch`：R16 要求 close 时**直接调用它**并让 possible/end 都不再触发；实际 close 仍走 `Bracket.Close` —— 先 `FlushOnClose` 补判最后一格（正是触发 possible），再转父单元 `ComputePossibleShapes(Close)`。替代物是本文件在注册目录时打上的 `FlushOnClose = true` — 证据 `:72`（`catalog.FlushOnClose = true;`）、`core/syntax/basic-tokens/bracket.xl.md:91-93`（`if (this.CatalogGuide !== null && this.CatalogGuide.FlushOnClose …) { this.ComputePossibleShapesByIndex(…, PossibleSource.Close); }`）、`bracket.xl.md:96-101`（父单元 `ComputePossibleShapes(context, PossibleSource.Close)`）
  - `[C3]` ○ 候选实例是进程级共享单例，per-bracket 状态改放静态 `States` 表，`PossibleShapeCache` 完全没被本候选用于自身状态（R09/R11 的 state 语义被绕开） — 证据 `:42`（`static field States:Array<ExpressionBracketScan> = []`）、`:46-58`（`CreatePossibleShapesCache` 懒建后 `Shapes()` 永远返回同一数组）
  - `[C1]` ○ 每建一个原子都线性扫 `States` 找状态（`Decide` → `FindState`），表无索引、随括号数增长，没有把查找结果记进 cache 复用 — 证据 `:86-90`（`for (const state of …States) { if (state.Host === units) { return state; } }`）、`:98`（`const known = …FindState(units);`）
  - `[B1]` ○ `host.Data[tokenIndex]` 缺失时返回 `undefined`（`Token` 形参），既不是 `Nothing` 也没有专用哨兵；`ShapeStates` 三值里没有可表达的越界值 — 证据 `:373-376`（`const token = host.Data[tokenIndex]; if (token === undefined) { return token; }`）
  - `[B4]` ● 两处读 `tokenIndex` 之后：① `IsBuildable` 用 `range.Document` 从单元末尾往后找第一个非空白字符，是 `<` 就让路（注释自己写明「建这一格时 `<` 还没进 `Data`」）；② `IsArrowParameterBracket` 沿 `parent.Data` 向后扫到 `=>` / `:` 才判形参表 — 证据 `:351-366`（`while (ahead < count) { … if (range.Document.GetValue(ahead) === "<") { return false; } }`）、`:207-239`
  - `[X1]` ● 设计外的「对象字面量成员封口器」：`SealMember` / `SealPendingShorthand` / `ReplaceSlot` / `RemoveUnit` 在 `BuildByIndex` 里直接 `splice` 宿主 `bracket.Data`，把 `a: 1`、`...a`、短写就地拼成 `PropertyAssignmentShape`/`SpreadAssignmentShape`/`ShorthandPropertyAssignmentShape`；这是在 shape→`ParseFromShape` 通道之外另开的一条建树通道 — 证据 `:398-414`、`:417-441`、`:443-493`、`:501`（`bracket.Data.splice(at, 1, member)`）、`:515`（`bracket.Data.splice(at, 1)`）
  - `[X1]` ○ 4 个设计外指标计数器与一张 44 词静态关键字表参与候选判定 — 证据 `:108-109`（`StatementRouteUtil.ExprBracketGuideCount += 1;`）、`:409`、`:433`、`:473`、`:492`（`ExprBracketAtomCount`/`ExprBracketMemberCount`）、`:50`（`Reserved` 词表，`:155` 用于拒绝建原子）
  - `[U4]` ○ 封成员只摘 `:` 与值，逗号等 basic token 留在 `bracket.Data` 里，close 后 `Data` ≠ AST children（legacy 读侧靠 `expression-builder.xl.md:1464-1466` 跳过 `,` 才没崩） — 证据 `:470-472`（`ReplaceSlot(ownerIndex…); RemoveUnit(colonUnit); RemoveUnit(valueUnit);`）
- 结论：偏离（10 条）。

---

### typescript/tokens/expressions/forms/shared/container-shape-catalog.xl.md（13729B / 345行；ContainerShapeCatalog、ContainerClosePossibleShape extends PossibleShape）

- 结构：一个「名不副实」的静态工具类 + 一个 possible 类。`ContainerShapeCatalog` 没有任何 `CatalogGuide`/`BracketRoleCatalog` 构造或注册，只有 13 个静态工具方法（角色白名单、三条位置闸、`BasePos`/`CalleeStart` 位置算术）；`ContainerClosePossibleShape` 唯一的挂载点是 `VariableDeclarationShape` 在 Close 拍自建的 `ContainerCloseGuide`（`typescript/tokens/declarations/variable-declaration-shape.xl.md:46`、`:55-58`），绕过宿主目录。
- 偏离：
  - `[B2]` ● `BuildByIndex` 用 `try/catch` 吞掉 legacy 解析器的全部异常，只 `RefusedCount += 1` 后返回宿主：compute/build 里的异常是 possible 诊断，R23 明令禁止吃掉 — 证据 `:446-455`（`try { if (role === BracketRole.CallArgs) { built = builder.ParsePostfix(); } else { built = builder.ParsePrimary(); } } catch (error) { ContainerShapeCatalog.RefusedCount += 1; return host; }`，`catch` 在 `:452`）
  - `[P1]` ● 触发时机只有 close：`ComputeByIndex` 先 `SetState(false)`，`source !== PossibleSource.Close` 直接 `Uncertain`，即 create 拍（`BracketCreate`）与逐格拍都不参与，R13「bracket create 时装 catalog possible」与 R14「data 增量收敛」整条落空 — 证据 `:366-390`（`:371-373` `if (source !== PossibleSource.Close) { return ShapeStates.Uncertain; }`）、安装点 `variable-declaration-shape.xl.md:55-58`（`this.ContainerCloseGuide = new CatalogGuide([new ContainerClosePossibleShape()]); … ComputePossibleShapes(this, context, source);`）
  - `[P4]` ○ 没有 `HandleCloseDispatch`；本文件把真正的 close 链写进注释：`Bracket.Close → 自己的 FlushOnClose → parent.ComputePossibleShapes(Close) → ContainerCloseGuide → ComputeByIndex → IsBuildable → BuildByIndex` —— 这整条就是 R16 要求被「直接派发」取代的原 close 逻辑 — 证据 `:273-283`（text 围栏链路图）、`:279`（`this.ContainerCloseGuide.ComputePossibleShapes(this, Close)`）
  - `[X1]` ● 设计外的「容器目录工厂」：类名叫 catalog，实际是「位置/角色闸 + legacy 重建器」的静态工厂，判据全部由 `CanBuild` 手写串起（开关位 → 增量闸 → `Closed` → 角色归一 → 宿主白名单 → 三条位置闸 → `BasePos`/`CalleeStart`），IMPORTANCE 没有这一层 — 证据 `:23`（`class ContainerShapeCatalog`）、`:306-364`（`CanBuild` 全文）
  - `[X1]` ● 设计外装配件：`IsSafeHost` 用 `host.constructor.name === "VariableDeclarationShape"` 字符串反射识别语法类；另有 3 个静态计数器与 1 个全局开关位，其中 `AlreadyConsumedCount` 全仓从未自增（死计数器） — 证据 `:268`（`return host.constructor.name === "VariableDeclarationShape";`）、`:25-29`（`BuildCount`/`RefusedCount`/`AlreadyConsumedCount`）、`:309`（`if (!StatementRouteUtil.EnableContainerShape) { return false; }`）、`:476`（只有 `ContainerShapeBuildCount` 自增）
  - `[B4]` ● `NextCodeText` 逐字符读 `bracket.SourceRange.End` 之后的原文（含跳过 `//`、`/* */`），`ArrowAhead`/`SequelAllowsBuild` 用它决定「这一格建不建」——判据建立在 `tokenIndex` 之后的字符上 — 证据 `:48-91`（`let at = range.End; while (at < count) { … }`）、`:38-46`、`:93-101`
  - `[X2]` ● 建树整段回退给 legacy `ExpressionBuilder`：`builder.Load(units, basePos)` 后 `ParsePostfix()`/`ParsePrimary()`，成功才用产物顶替括号，失败就什么都不建 — 证据 `:429-451`（`const builder = new ExpressionBuilder(shape.Template, context); builder.Load(units, basePos); …`）、`:456-463`（`if (built === null || builder.At !== index + 1) { … return host; }`）
  - `[B1]` ○ 越界一律返回 `Uncertain` / 返回宿主：`ComputeByIndex` 的 `tokenIndex` 检查返回 `Uncertain`，`BuildByIndex` 返回 `host`（形参是 `Token`），没有 `Nothing` 可返回 — 证据 `:374-376`、`:406-409`
  - `[C1]` ○ `BuildByIndex` 三次线性重找位置（`units.indexOf(shape)`、`builder.Units.indexOf(shape)`、`units.indexOf(builder.Units[start])`），`cache` 只存一个 bool，`ComputeByIndex` 已经算过的位置不复用 — 证据 `:423`、`:431`、`:464`、`:370`/`:388`（`cache.SetState(this.Slot(), …)`）
  - `[P3]` ○ 建出的 `built` 既不 `SignOut` 也不 `TryToClose`，直接 `units.splice(...)` 原位顶替并顺手改 `parent.MountedUnit`：R31 的「立即关闭」与 R32 的「未关闭 + 挂载」两条去向都不成立 — 证据 `:469-477`（`ExpressionAtomRegistry.RegisterContainer(built); built.Parent = parent; … units.splice(slot, at - slot + 1, built);`）
- 结论：偏离（10 条）。

---

### typescript/tokens/expressions/forms/shared/object-literal-operand.xl.md（4901B / 91行；ObjectLiteralOperandPossibleShape extends PossibleShape）

- 结构：possible 层，但只服务「操作数位的 `{`」这一种形状：`Claims` 只判「已闭合 + `{`」，`ComputeByIndex` 用 `ItemUtil.ItemStartCached` 圈定 item 起点（这一处用了 cache，符合 R09），`BuildByIndex` 再交给 `ExpressionBuilder` 建。文件头 `text` 围栏列了 6 条触发场景（`in`、`instanceof`、`typeof`、`+`、`&&`、三目中段）。
- 偏离：
  - `[X1]` ● 第二套判据：IMPORTANCE 的候选语义只有「shape 收窄到唯一 → build」，这里另立一条「`{` 处在操作数位」的认领规则（`Claims`），既不来自 shape、也不来自 end，且与表达式目录的判定并行存在 — 证据 `:27-42`（`static method Claims`：`if (!(unit as Bracket).Closed) { return false; } return (unit as Bracket).StartBracketChar === "{";`）、`:54-61`（`ItemUtil.ItemStartCached` 之后 `Reject`/`Accept`）
  - `[B4]` ● `BuildByIndex` 不看 `tokenIndex` 那一格，而是用 `ItemUtil.NextCode(host.Data, tokenIndex)` 往后找下一个代码格，再对那一格建 —— 明确消费 `tokenIndex` 之后的单元 — 证据 `:80-84`（`const codeIndex = ItemUtil.NextCode(host.Data, tokenIndex); … return …BuildInto(host, codeIndex, context);`）
  - `[X2]` ● 建树整段回退给 legacy：`builder.Load(units, BasePos(...))` 从 item 起点重载，`ParsePrimary()` 之后校验「不是原括号 / 不是 basic token / 读全一格」，任一条不满足就抛错 — 证据 `:127-139`（`builder.Load(units, …BasePos(units, bracket, codeIndex)); … const built = builder.ParsePrimary(); … if (builder.At !== index + 1) { throw … }`）
  - `[P3]` ○ `built` 只做 `Parent = host`、`MountedUnit` 重定向和 `units.splice(codeIndex, 1, built)`：既未 `SignOut` 也未 `TryToClose`，R31/R32 两种去向都不成立 — 证据 `:141-147`（`built.Parent = host; if (host.MountedUnit === bracket) { host.MountedUnit = built; } units.splice(codeIndex, 1, built);`）
  - `[B1]` ○ 越界返回 `Uncertain`（`ShapeStates` 无 `Nothing`）；`BuildInto` 里同类越界改为抛错，两种处理并存 — 证据 `:47-49`、`:113-115`（`throw new Error("增量变量形状未支持：值位对象字面量");`）
- 结论：偏离（5 条）。

---

### typescript/tokens/expressions/forms/shared/initializer-tail-judge.xl.md（1776B / 49行；InitializerTailJudge）

- 结构：判官层（纯静态谓词），不属于 shape/possible/end 三件套，没有 `ComputeByIndex`/`BuildByIndex`，只有 `IsInitializerEnd(units, from)`。
- 偏离：
  - `[X1]` ● 判官层本身是设计外机制：用一个读原文的谓词回答「初始化器是否到底」，代替 `end` 终结候选（R28/R29 的 `EndPossible` 语义）；全仓 7 个文件、8 处调用直接 import 它（`composite-initializer-tail-judge.xl.md:79`、`composite-initializer-judge.xl.md:87`、`composite-initializer-forms-judge.xl.md:308`/`:380`、`update-expression-possible-shape.xl.md:153`、`delete-possible-shape.xl.md:91`、`member-chain-judge.xl.md:289`、`assignment-possible-shape.xl.md:240`） — 证据 `:17`（`## static method IsInitializerEnd:(units:Array<Token>, from:int)=>bool`）、`:19-68`
  - `[B4]` ● 判定只依赖 `units[from]` 之后的原文：从 `range.EndIndex` 起逐字符扫到文件末，跳过空白/`//`/`/* */`/任意个 `;`，再宣布「后面没有了」；`from` 通常就是末格，因此读的必然是 `tokenIndex` 之后 — 证据 `:23-33`（`let at = range.EndIndex; while (at < count) { … }`）、`:35-60`（空白与两种注释）、`:61-67`（`if (ch === ";") { at += 1; continue; } return false;`）
- 与 52 篇的关系（`composite-initializer-tail-judge`）：**同一语义、单一实现，不是副本** —— 52 篇的 `CanBuild` 直接调 `InitializerTailJudge.IsInitializerEnd(units, last)`，注释写明「不再各处各写一份 `NextSignificantChar === ""`」（`composite-initializer-tail-judge.xl.md:77-80`）；因此这条 `X1` 记在本文件（共享判官）而不是 52 篇，52 篇另欠的是它自己 `CanBuild` 里的 `catch`（`composite-initializer-tail-judge.xl.md:89-93`）。
- 结论：偏离（3 条）。

---

### typescript/tokens/expressions/forms/shared/expression-atom-registry.xl.md（1667B / 36行；ExpressionAtomRegistry）

- 结构：工具层，但性质是设计外的进程级身份表：4 个 `Set<any>`（`Atoms`/`Members`/`Containers`/`Nodes`）加 8 个 `Register*/Has*` 与 `Reset`，没有任何 shape/possible 语义，也不属于 IMPORTANCE 的任何一层。
- 偏离：
  - `[X1]` ● 全局可变单例作为「形状身份」的权威来源：注册发生在各 possible/`BuildByIndex`（`:36-43`、`:45-52`、`:72-79`），清空发生在文件装配处（`typescript/tokens/files/source-file-shape.xl.md:85-86` 的 `ExpressionAtomRegistry.Reset();`），生命周期由每文件重入决定，设计里没有这个跨文件登记表 — 证据 `:10-16`（`static field Atoms:Set<any> = new Set()` 等 4 个）、`:90-97`（`Reset` 里整表换新）
  - `[X1]` ● 它是「词法层回问语法层」的存储端：`TypeScriptRegexTemplate.IsOperandShape` 先用 `ExpressionAtomRegistry.HasContainer(unit)`、再用 `unit.constructor.name` 的 `endsWith("ExpressionShape")`/`endsWith("LiteralShape")` 反射判断操作数（`typescript/run/typescript-template.xl.md:118-131`），`ContainerShapeCatalog.IsPostfixBracketPosition` 也用 `HasContainer` 决定 `[` 是不是下标（`container-shape-catalog.xl.md:256-257`）；IMPORTANCE 只规定 basic token 单向被语法层消费，没有反向查询通道（第 80 篇已把查询端记为 `X1`） — 证据 `:14`（`static field Containers:Set<any> = new Set()`）、`:81-88`（`HasContainer`）
- 结论：偏离（2 条）。

---

## 本批统计

| 文件 | ● | ○ | 小计 |
| --- | --- | --- | --- |
| `expression-bracket-possible-shape.xl.md` | 3 | 7 | 10 |
| `container-shape-catalog.xl.md` | 6 | 4 | 10 |
| `object-literal-operand.xl.md` | 3 | 2 | 5 |
| `initializer-tail-judge.xl.md` | 2 | 1 | 3 |
| `expression-atom-registry.xl.md` | 2 | 0 | 2 |
| **合计（5 文件）** | **16** | **14** | **30** |

按编号：`P1` 2（1●/1○）、`P2` 1（0●/1○）、`P3` 2（0●/2○）、`P4` 2（1●/1○）、`C1` 2（0●/2○）、`C3` 1（0●/1○）、`B1` 3（0●/3○）、`B2` 1（1●）、`B4` 4（4●）、`U4` 1（0●/1○）、`X1` 9（7●/2○）、`X2` 2（2●）。`D1`/`S1`–`S4`/`R1`/`R2`/`U1`–`U3`/`X3` 本批 0；5 个文件 `prose` 均为 0，围栏外无散文。

- 本批最重的一条是 `container-shape-catalog.xl.md:452` 的 `catch`：`BuildByIndex` 把 `ParsePrimary`/`ParsePostfix` 的异常吞成 `RefusedCount += 1`，这正是 R23 明令禁止的「compute/build 里 catch 掉异常」，且它同时把失败变成静默「什么都不建」。
- R13 在本批只落成一半：create 侧链路真实存在（`bracket.xl.md:163-165` → `bracket-catalog-installer.xl.md:100-109` → `bracket.xl.md:175-177`），但装的是按角色共享的「角色目录」，close 侧则完全没有 `HandleCloseDispatch`，改用 `FlushOnClose` 在 `Bracket.Close` 里补判最后一格。
- 5 个文件里有 4 个的核心判据都建立在「看 `tokenIndex` 之后」上（文档前瞻 / `NextCode` / 向后扫 `Data`），这是本批最普遍的越界形态。
