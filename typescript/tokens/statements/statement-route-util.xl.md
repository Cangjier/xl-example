# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { StatementScanner } from "./statement-scanner.xl.md"
```

# namespace cangjie

# class StatementRoute

根级语句的**家族路由码**（设计 §3.2，冻结）。`StatementRouteUtil.Decide` 返回其中之一，各根目录候选按
「只认自己那一族」`Accept` / `Reject`，互斥不靠先后（`CatalogGuide` 同时 Accept 会抛错）。

```ts
0 = None                  // 还没判出（只有 trivia / 首代码单元未到）：谁都不许据此 Reject
1 = ShellPlainExpression  // 普通表达式起点 → RootExpressionStatementPossibleShape 建壳
2 = ShellVariable         // let/const/var + 能起绑定 → VariableStatementPossibleShape 建壳
3 = Legacy                // 其余全部：留给 legacy 候选（import/export/声明/控制流/`;`/`{`）
4 = ShellStatementFamily  // Stage 4：控制流语句族壳化，本阶段留空
```

## static field None:int = 0

## static field ShellPlainExpression:int = 1

## static field ShellVariable:int = 2

## static field Legacy:int = 3

## static field ShellStatementFamily:int = 4

## static field ShellBlock:int = 5

## static field ShellLabel:int = 6

**标签语句族**（Stage 4c-2）：语句首 `标识符` + 下一代码单元 `:`。它与 `ShellStatementFamily` 分开取值，
因为建壳的时机不同（控制流族在首代码单元建、标签在 `:` 那一格才建），计数也分开放
（`LabelShellCount` / `ControlFlowShellCount`）。判界与建树仍走同一份 `ScanRoot` + `BuildStatement`。

## static field ShellDeclarationFamily:int = 7

**根层声明 / 导入导出族的通用语句壳**（Stage 4q）：语句首是 `interface` / `enum` / `type` /
`namespace` / `module` / `declare` / `import` / `export` / `using` 时由本族建壳，壳的
`Kind` 与终结候选的 `StatementKind` 都取这个值（与 `ShellStatementFamily` 分开取值，计数也分开：
`DeclarationShellCount`）。**判界与建树不新写第二份**：收口仍是 `StatementBuilder.BuildStatement`
原子建树（与 legacy `StatementPossibleShape` 同一份建造器、同一段 raw 单元），收口判据是
`StatementBoundaryUtil` 的 `;` / EOF / ASI 三条（与表达式语句族同一套边界规则——
声明与导入导出语句的边界规则本来就和表达式语句一致，不另立 `ScanRoot` 分支）。

**只挂根目录，不挂块体目录**（Stage 4q）：块内的声明 / `import` / `export` 由并行成员的块体目录负责，
本族**不注册进** `BlockPossibleShape.CreateBodyPossibleShapes`，避免同一条语句被两个目录双挂载。

**不覆盖 `function` / `class`**：它们的体语句已由 `SourceFileShape` 的括号事件（`TryMountFunctionBody`
/ 类体门控）接管；把它们也做成壳会改变体括号的宿主（壳而不是原父单元），从而与既有挂载路径双挂载。
`abstract class` 同理留给 legacy（判据见 `DecideDeclaration` 的说明）。

> **Stage 5d-3 更新**：上面这条「不覆盖」已被 5d-3 的**根层声明语句壳**取代（见下面三个族码）。根层
> `function` / `class` / 装饰器声明现在也由语句壳驱动；体括号的宿主确实换成了壳，所以
> `BlockPossibleShape.OnChildBracketCreated` / `OnShellBracketCreated` 里补了同一条
> `IsFunctionDeclarationBody` 判据（函数体仍挂块体目录，与旧路径同一条收集通道）。**块体里**的
> `function` / 装饰器声明仍不壳化（块体目录里没有对应候选，路由一改就是零候选），`class` 仍走
> `ShellStatementFamily`（gap-SW 的块内 class 壳）。

## static field ShellFunctionDeclaration:int = 8

**根层 `function` 声明的语句壳**（Stage 5d-3）：语句首是 `function`（含 `function*`、泛型函数）或
**同一行**的 `async function` 时由本族建壳。壳的 `Kind` / 终结候选的 `StatementKind` 都取这个值。

- **判界不调 `ScanRoot`**：体括号闭合即收口（`StatementBoundaryUtil.DeclarationShellEndCode`，唯一的
  「带体声明收口」实现点）；ambient 无体签名走 `;` / 声明跟随边界 / EOF（同一份 `StatementEndCode`）。
- **建树直接调 family builder**：收口时 `StatementBuilder.BuildFunctionDeclaration()`（**不**经过
  `BuildStatement` 的整段 raw 分派）。同一份 `FromUnits`、同一批节点工厂，所以接管不改变任何节点 / Pos。
- **只挂根目录**：`Decide` 只在语句首不是块体括号时判本族（块内 `function` 仍由块体 raw 递归建）。
- 开关：`EnableRootDeclarationShell`；关掉时 `Decide` 重新返回 `Legacy`，行为逐位回到 5d-2a。

## static field ShellClassDeclaration:int = 9

**根层 `class` 声明的语句壳**（Stage 5d-3）：语句首是 `class`，或同一行的 `abstract class`。
判界 / 建树与上一个族同一份机制（体括号闭合收口，收口时 `StatementBuilder.BuildClassDeclaration()`）。
`declare class` / `export class` / `export default class` 仍由声明 / 导出族壳接管（它们本来就走壳，
本族不抢）；块内 `class` 仍走 `ShellStatementFamily`（`EnableBlockClassShell`）。

## static field ShellDecoratedDeclaration:int = 10

**根层装饰器声明的语句壳**（Stage 5d-3）：语句首是 `@`。装饰器前缀后面是哪一种声明要到装饰器表达式
吃完才知道，所以本族的判界**只认体括号闭合 / `;` / EOF**（不认 ASI——`@dec` ⏎ `class C {}` 的换行是
装饰器与声明之间合法的换行，不是 ASI 边界）。收口时先问**同一份** `StatementBuilder.ScanDecoratedHead`
（与 `BuildDecoratedStatement` 同一个判型点）：`class` / `abstract` → `BuildClassDeclaration()`，
`function` → `BuildFunctionDeclaration()`，其余（`interface` / `enum` / `namespace` / `type` / 变量）仍交回
`BuildStatement`（未迁清单见 `HANDOFF-5d3.md`，不伪造接管）。

# class StatementClass

`StatementRouteUtil.ClassOf` 的**单元分类码**（设计 §2.3）。Stage 1 只落地分类器，判定仍由 `Decide` 驱动；
Stage 3 的操作符候选在这里按类 `Accept`，`EndPossible` 按类互斥。

## static field Unknown:int = 0

## static field OperandStart:int = 1

## static field BinaryOperator:int = 2

## static field PrefixOperator:int = 3

## static field Postfix:int = 4

## static field MemberAccess:int = 5

## static field Separator:int = 6

## static field Semicolon:int = 7

## static field Eof:int = 8

## static field StatementStart:int = 9

# class StatementRouteUtil

根级语句的**唯一分流点**（设计 §3.2）：一个全函数，返回 `StatementRoute` 的值，不建形状、不抛错。

两条硬约束：

1. **全函数**：任何下标、任何单元都返回一个 `StatementRoute`，不抛异常（候选的 `ComputeByIndex` 会直接调它）。
2. **只有 trivia 时禁止 `Reject`**：首代码单元还没到时返回 `None`，调用方据此**不** `Reject`——
   `CatalogGuide` 把 `Reject` 的候选永久删除，文件以注释/空白开头时首次判定就落在只有 trivia 的那一格，
   这里若让调用方 `Reject`，整条语句再没人接管（token-ast 28 个 crash 的根因）。

## static field EnableShellExpressions:bool = true

**表达式语句壳路径**（设计 §11）：T1d 收口修复已落地；r13 加文件级 fallback 兜底后**默认开启**（见 HANDOFF-s1d-r13.md）。

r3 实测（`true` 时）：`harness --all` **72/0/1known 全绿**（含 stage1/stage1-mixed）、`--double-accept` 冲突 0、
`--lint` PASS、`ast-json-diff` 0/0/0、`real-dts` 226/226；但 `ast-json` 仍 **6037/6167**（`missing-end` 24 +
`possible-compute` 49 等 130 条结构差）且 `token-ast` crash=**14**（基线 0），所以还不能默认打开。

r3 已修的两处：`ExpressionEndCode` 的判界基准从 code-only 数组改回 **`host.Data` + `CodeAt` 折算**；
`RootExpressionStatementPossibleShape` 增加**头格被上一条语句吞掉时的补建**（`tokenIndex > headAt` 且
`CanEndStatement` 为假时建壳）。剩余根因见 HANDOFF-s1d-r3.md §4。
`false` 时新候选整体 `Reject`、legacy 全接管（Wave1 逐位行为），harness 的双路对拍也用它。

## static field EnableFileFallback:bool = true

文件级兜底开关（T1d r13 路线 A）：`SourceFileRunner.Parse` 在新路径抛错时，把**整条文件**按
`EnableShellExpressions = false` 的候选目录重解析一次。只在开关 true 时读取；false 态不触发，行为逐字节不变。
## static field FileFallbackCount:int = 0

进程内累计的文件级兜底次数（只增不减）。harness / 集成表用它出「fallback 清单」的证据。
## static field LastFileFallback:bool = false

最近一次 `SourceFileRunner.Parse` 是否走了兜底；Parse 入口先重置，兜底成功后置 true。
## static field EnableShellStatements:int = 0

## static field EnableBlockBodyCatalog:bool = true

块体语句目录开关（Stage 4a 接入，Stage 4b 落地收集通道，**r2 起默认打开**）。`true` = 把变量声明与普通表达式两类语句候选挂到块体 `{` 括号上，块内语句由 possible 增量建 `StatementShape` 形状；收口时 `StatementBuilder.BuildBlock()` 调
`StatementBuilder.CollectBodyStatements()` 按序收集这些已建语句（raw 尾巴仍由同一个 `BuildStatement()` 逐条建），
不再把形状单元当 raw 喂给建造器。

**r2 修完两处后才默认打开**（HANDOFF-s4b-r2 §2/§3）：

- **D1 块内首句 `pos`**：块体目录建壳时宿主是块体 `{` 括号，`Pos` 改按 `bracket.StartIndex + 1` 取
  （与 legacy `BuildBlock` 的 `base` 同口径），不再因为没有前一个兄弟单元退回 `0`；后续语句仍取前一个兄弟的 `EndIndex`。
- **D2 块内末句无分号**：`StatementShape.ExitOrPre` 在「父单元是 `{` 括号、当前字符正是该括号的 `}`」时
  先按 ASI 收口（`BuildFromShell` + `FinishShell`）再 `Reload`，`}` 由驱动层重放给括号自己关闭；
  收口失败时 `DetachShell` 退回 raw、同样放行 `}`（安全回退，不建错树）。

证据：`tests/statement-possible/block-body-takeover.mjs`（17 条：`BlockShellCount` / `BlockBodyStatementCount`
增量、无文件级 fallback、XML == legacy、AST == TS 逐节点）。块内未覆盖语句族（if / while / try / …）不建壳，
整段 raw 交回 legacy 递归，XML / AST 与 legacy 逐字节一致。

## static field EnableArrowBodyCatalog:bool = true

**箭头块体目录开关**（Stage 4o）。`true` = `x => { … }` / `async x => { … }` / `(a, b) => { … }` 的块体括号
在创建时挂上块体语句目录（判据：`{` 前面那个非 trivia 单元是 `=>`）。箭头体的建树是
`ExpressionBuilder.ParseArrowBody` → `ParseBlock` → `StatementBuilder.BuildBlock()`，
收集通道与函数体完全相同（`HasBuiltBodyStatements` / `CollectBodyStatements`），不新增第二条建树路径。
`false` → 一律不挂，行为逐位回到 Stage 4n。

## static field EnableObjectMethodBodyCatalog:bool = true

**对象字面量方法体目录开关**（Stage 4o）。`true` = `{ m(){ … } }` / `{ get x(){ … } }` 的成员体括号
在创建时挂上块体语句目录（判据：宿主括号**没有目录**＝不是块体，且 `{` 前面是已闭合 `(` 或返回类型的 `{`）。
成员体建树是 `ExpressionBuilder.ParseObjectLiteral` 的 `new StatementBuilder(...).BuildStatement()`，
同样落到 `BuildBlock()` 的收集通道。`false` → 行为逐位回到 Stage 4n（对象方法体保持 raw / legacy）。

## static field BlockShellCount:int = 0

进程内累计「被块候选建成壳的块语句」条数（只增不减），与 `FileFallbackCount` 同一定位：harness / 集成表用它出「块语句确实走了新路径」的计数证据。

## static field BlockBodyStatementCount:int = 0

进程内累计「块体里由 possible 增量建成、再被 `CollectBodyStatements` 按序收集的语句」条数（只增不减）。
块内接管的计数证据：它与 `BlockShellCount` 一起把「块壳化」与「块内语句接管」分开计量，不靠 XML/AST 猜。

## static field LeftoverReplayCount:int = 0

进程内累计「语句壳收口后把留在父单元里的 raw 尾巴重新送进父目录判定」的格数（只增不减）。
用于证明 ASI 边界留下的 `{ ... }`（例如 `let a = 1` ⏎ `{ b; }`）会被父目录重新看见，而不是拖到 EOF。

## static field LeftoverReplayFailed:int = 0

进程内累计「重放尾巴时父目录抛错」的格数（只增不减）。重放是**尽力而为**：抛错就停在原地，让文件级 fallback / 原有 EOF 路径接管，绝不让重放把一次本来能过的解析变成失败。

Stage 4 位掩码（控制流语句族壳化），本阶段恒为 0。

## static field EnableControlFlowShell:bool = true

**控制流 / 声明族语句壳化开关**（Stage 4c）。`true` = `Decide` 把 `if` / `while` / `do` / `for` /
`switch` / `try` / `return` / `throw` / `break` / `continue` / `debugger` / `with`、标签语句（标识符 + `:`）
与空语句（`;`）判成 `StatementRoute.ShellStatementFamily`，由 `ControlFlowStatementPossibleShape` 建壳；
`false` 时这些起点重新判成 `Legacy`，行为逐位回到 Stage 4b 之前（安全回退，不靠候选先后）。
`EnableShellExpressions == false`（文件级 fallback 与 harness 的 legacy 对拍）时同样一律 `Legacy`。

## static field EnableControlFlowLabel:bool = true

标签语句是否随控制流壳接管（lbl: f();），**默认关（4c-2 实测回退）**。路由与候选都已落地（ShellLabel / LabelShellCount / 在 `:` 格建壳），实测 7 条标签用例全部 XML==legacy、AST==TS、label=1；但打开后**全表回归**：表达式壳的建壳时机被推迟一格，op-ast-proof 11/62、op-proof 8/40、lock-body-takeover 11/17 —— 表达式体状态机拿不到首个运算符。**Stage 4f 起改为默认打开**（上面这段 4c-2 的读数与「默认关」的结论保留为历史）：根因是「第二个代码单元还没到时 `Decide` 返回 `None`」，于是表达式根候选的头格永远等不到 `ShellPlainExpression`、到下一格被永久 `Reject`。4f 把那一格改成**文档级前瞻**（`IsLabelColonAhead`：只看源码字符判 `:`，跳过空白与注释），头格即可判族：`:` → `ShellLabel`（控制流候选在**首格**建壳），否则 → `ShellPlainExpression`（与标签关闭时逐位一致）。因此不再有「表达式壳建壳被推迟一格」，op-ast-proof / op-proof 回到 62/62、40/40。详见 `HANDOFF-s4f.md` §1。

Stage 4c-2 把那一格改成 **`None`（继续等，不判死、不判族）**：下一个代码单元到达后，`:` 才把这条语句判成 `ShellLabel`，`ControlFlowStatementPossibleShape` 在 `:` 那一格建壳（搬 `ident` + `:`，`Kind = ShellLabel`），判界走 legacy 的 `StatementScanner.ScanRoot`、建树走 `StatementBuilder.BuildStatement` 的标签分派——与 legacy 建标签语句是同一份 scanner / 同一份建造器。

两个守卫：① `Reject` 是被 `CatalogGuide` **永久删除**的，所以那一格只能 `None`（`Uncertain`），否则 `:` 到达时再没有候选能建壳；② `?` / `=` / `(` 紧跟标识符时 `colonAt` 不是 `:`，照常判成 `ShellPlainExpression`（`a ? b : c` 与 `a = 1` 不受影响）。

**标签体不分流**：`en:\n{ f() }` 的 `{` 是在标签壳里建的，由 `BuildStatement` 的标签分派原子递归，`SourceFileShape.OnBracketCreatedEvent` 的 `Decide == ShellBlock` 门控因此看不到它——这正是「标签体不得被表达式壳 / 块候选吞掉」那条不变量的守点。

**历史**（Stage 4c 的旧理由，已由上面的判据修掉）：标签的头是标识符、与普通表达式语句同格，壳在首代码单元那一格就建，而 `:` 还没到——于是默认关、继续走表达式壳（`StatementShape.BuildFromShell` → `StatementBuilder.BuildStatement` 的标签分派）。

## static field EnableControlFlowEmpty:bool = true

**Stage 4d：尾巴重放落地后默认打开**。`StatementShape.FinishShell` 收口后把 leftover 按原位送回父目录判定一次
（`LeftoverReplayCount` / `LeftoverReplayFailed` 计量），`;` 不再因为「壳收口后没人再判这一格」而丢节点；
证据见 `HANDOFF-s4d.md` §2 与 `s4c2-empty*` / `control-flow-takeover` 的空语句读数。旧读数保留作历史：

**Stage 4c-2 实测（打开后回退，默认关）**：把开关打开后，'';'' 作为**别人壳里的 leftover**（if (a) {} ⏎ ;、{ ; ; } 的第二格、; ⏎ ;）没有重放通道 —— FinishShell 只把 leftover 挪回父单元、不再问父目录，那一格永远没有人建，实测 if (a) {} ⏎ ; ⏎ while (b) {} ⏎ ; 少一条 EmptyStatement（AST 节点 8 vs 7，XML 同步不同）。这不是标签那种「判据时机」问题，而是 FinishShell 缺一次父目录重放（HANDOFF-s4c §7 风险 1 的同一条）。因此默认关：空语句由 legacy 的 BuildEmpty 建，s4c2-empty* 用例守 XML/AST 与 legacy 逐字节一致；接管证据与复现读数见 HANDOFF-s4c2.md。

空语句（语句首的 `;`）是否随控制流壳接管，**默认关**。

Stage 4c 默认关的理由是「重放回来的 `;` 会因旧 `ItemStart` 失管」（`if (a) {}` ⏎ `;` 少一条 `EmptyStatement`）。
4c-2 用专用用例把这条形态钉住（`s4c2-empty-after-block` / `s4c2-empty-table`），并由
`tests/statement-possible/control-flow-takeover.mjs` 的 `cf` 增量给出接管读数：一旦这条形态回退，
计数与 AST 会同时红，不会静默少语句。安全回退仍在——单开关置 `false` 即回到 legacy 的 `BuildEmpty`。

## static field ControlFlowShellCount:int = 0

进程内累计「被控制流候选建成壳的控制流/声明族语句」条数（只增不减），与 `BlockShellCount` 同一定位：
harness / 集成表用它出「这类语句确实走了新路径」的计数证据，不靠 XML/AST 猜。

## static field LabelShellCount:int = 0

进程内累计「被标签候选建成壳的标签语句」条数（只增不减）。与 `ControlFlowShellCount` 分开计量：
标签在 `:` 那一格建壳，控制流族在首代码单元建壳，两者的接管读数不能混在一个数里。

## static field EnableAwaitStatement:bool = true

**Stage 4l：块体目录里的 `await` 起点语句**。`await` 在冻结的 `IsLegacyKeyword` 里是**双角色起点**
（`await f()` 的关键字前缀，与旧式 `await` 标识符 / 标签），`Decide` 一律判成 `StatementRoute.Legacy`：
根层由 `StatementPossibleShape` 原子建树，行为一字不改。块体目录里没有 legacy 候选，所以
`async function a(){ await f(); }` 的 `await` 语句只能整段留在 raw 段（`BlockBodyStatementCount` 不增；
`BuildBlock` 的 legacy 递归仍建对树——那是「未接管」，不是「建错」）。

`true` = `BlockPossibleShape.CreateBodyPossibleShapes` 多注册一个 `AwaitStatementPossibleShape`，
只对**块体 `{` 括号**上的 `await` 首代码单元 `Accept`，壳 `Kind` / 终结候选都取
`StatementRoute.ShellStatementFamily`——建树走 `StatementBuilder`（同一段 raw 单元、同一份建造器），
所以接管只体现在计数上，XML / AST 与 legacy 逐字节一致。

**Stage 5d-6：判界已迁到 boundary 层**（与 `yield` 同一轮）。此前收口沿用 `StatementScanner.ScanRoot`，
它给不出 `await` 语句的 `End`，于是这一族只在「整段体恰好一条语句」时收得住；现在终结候选先问
`StatementBoundaryUtil.IsAwaitFamilyCode`，收口位置读 `StatementBoundaryUtil.AwaitFamilyEndCode`
（`await` 没有受限产生式，就是表达式语句的 `;` / ASI），**不再调 `ScanRoot`**。
`false` = 该候选整体 `Reject`，行为逐位回到 Stage 4k（安全回退，不靠候选先后）。

## static field AwaitShellCount:int = 0

进程内累计「块体目录里由 `await` 起点建成壳的语句」条数（只增不减）。与 `ControlFlowShellCount` **分开计量**：
`await` 走同一条壳机制，但它是双角色起点、只在块体目录补的入口，接管读数必须能从计数里直接读出来。

## static field EnableYieldStatement:bool = true

**Stage 5d-4：块体目录里的 `yield` 起点语句**。与 `EnableAwaitStatement` **同一个形状**的另一半：
`yield` 也是 `IsLegacyKeyword` 里的双角色起点（生成器里是 `YieldExpression`，非生成器里是标识符 / 标签），
`Decide` 一律判成 `StatementRoute.Legacy`，块体目录里没有 legacy 候选，于是
`function* g() { yield 1; }` 的体只能整段留在 raw 段——这是退场指标 `RawTailBuildCount` 里最大的一族。

`true` = `BlockPossibleShape.CreateBodyPossibleShapes` 多注册一个 `YieldStatementPossibleShape`，建壳判据与
`AwaitStatementPossibleShape` **逐字同构**，壳 `Kind` 与终结候选都取 `StatementRoute.ShellStatementFamily`，
建树走 `StatementBuilder` 的同一族方法（同一段 raw 单元、同一份建造器），所以接管只体现在计数上，
XML / AST 与 legacy 逐字节一致。

**Stage 5d-6：判界已迁到 boundary 层**。5d-4 时这一族的收口沿用 `StatementScanner.ScanRoot`
（每格 +1，实测 +184 `ScanRootCallCount`）；5d-6 起终结候选在 `ScanRoot` 之前先问
`StatementBoundaryUtil.IsYieldFamilyCode`，收口位置读 `StatementBoundaryUtil.YieldFamilyEndCode`
（受限产生式 + `;` / ASI，与 `BuildExpressionStatement` 同一套边界判据），**不再调 `ScanRoot`**。
`Kind` 仍是 `ShellStatementFamily`——判界分派按**首代码单元**（族判据）而不是新增一个 `Kind`，
所以壳的建树路径、计数与 `false` 时的回退语义都没有变化。

`false` = 该候选整体 `Reject`，行为逐位回到本阶段之前。

## static field YieldShellCount:int = 0

进程内累计「块体目录里由 `yield` 起点建成壳的语句」条数（只增不减）。与 `AwaitShellCount` **分开计量**：
两者是同一条壳机制的两个双角色关键字，接管读数必须能分别读出「这一族迁了几条」。
## static field ControlFlowBodyBraceCount:int = 0

进程内累计「**控制流体的 `{` 被挂上块体语句目录**」的个数（只增不减，Stage 4n）。与 `FunctionBodyMountCount`
（函数体挂载）分开计量：控制流体的括号宿主是**控制流壳**而不是 `Bracket`，走的是
`StatementShape.OnBracketCreatedEvent → BlockPossibleShape.TryMountControlFlowBody` 这条独立入口。

只增计数，语义与 `FunctionBodyMountCount` 相同：它只说明「挂了几次」，体里到底有没有语句被接管仍由
`BlockBodyStatementCount` / `ControlFlowShellCount` 读数决定；两个数一起看才能区分「挂上但没接管」与
「根本没挂」。

## static field EnableLabelBodyCatalog:bool = true

**Stage 5d-6（B）：标签壳里的体括号挂块体语句目录**。标签语句从 Stage 4f 起由 `ShellLabel` 壳接管，
但标签体（`lbl: { … }` 的块 / `lbl: while (a) { … }` 的循环体）的 `{` 是**壳里的子括号**，
`OnShellBracketCreated` 原先只认六个控制流关键字，标签壳的体括号因此一直没挂目录——
`StatementBuilder.BuildLabeled` 的 `BuildBlock()` 只能走整段 raw 递归，
`break` / `continue` / `let` 这些体内语句一条都没被壳接住（`RawTailBuildCount` 里最大的一族）。

`true` = `TryMountControlFlowBody` 也认「标签壳 + 体位置」，挂的是同一条通道
（`MountBodyCatalog` → `BuildBlock` 的 `HasBuiltBodyStatements` / `CollectBodyStatements`），
不新增任何建树路径与判据；`false` = 行为逐位回到本阶段之前（安全回退，不需要改源码）。

## static field LabelBodyMountCount:int = 0

进程内累计「**标签体 `{` 被挂上块体语句目录**」的个数（只增不减，Stage 5d-6 B）。与
`ControlFlowBodyBraceCount` / `FunctionBodyMountCount` 分开计量：三者是同一条挂载通道的三个入口，
分开才能读出「这一族到底挂了几次」。

## static field EnableDeclarationShell:bool = true

**Stage 4r 实测后曾默认关（安全回退）**：专用候选 `DeclarationStatementPossibleShape` 与 13 个 legacy 候选的
`Decide === ShellDeclarationFamily` 让位门控都已落地，打开时 27 条专用用例中 **25 条单条形态逐条通过**
（`DeclarationShellCount=1`、XML==legacy、AST==TS、fallback 0），但有 **2 条多语句组合**双建壳
（`interface I { }` ⏎ `const a = 1;`：decl=2；`type T = 1;` ⏎ `enum E { A }` ⏎ `export { T, E };`：enum 退化成 raw），
并且全表回归出 **1 条 ASI 用例**（`asi-type-then-return`：`type T = A` ⏎ `return;` 的声明壳在 ASI 边界既没建树也没重放，
整条退化成 raw）。按纪律不伪造绿，Stage 4r 起默认关，行为逐位回到 Stage 4q。

**Stage 4af 转正（默认开）**：上述残差与打开态全表残留已由 4af-A…4af-G 逐项清除——声明壳起点统一改用
`IsDeclarationFollowBoundary`（含 EOF 闭合括号、普通单词起点）、换行后的 `@` 认作装饰器声明起点、
`StatementEndCode` 收口实现上移并被 `StatementShape.TryToClose` 复用（EOF 收口不再有第二份判据）、
`possible-compute` 收尾残差（`export let` / 调用位）已清。打开态实测（本字段置 `true`）：
`token-ast` diff=0、`real-dts` 226/226、`ast-json` **6171/6171 且结构/位置/字段差 0/0/0**
（此前 57 条残差 = F 7 + E 47 + G 2，全清）、`declaration-statement-takeover` 33/33 knownGap=0、
`harness --all` 101/0/known1、`double-accept` 120/0、`final-matrix` 38/38，四个新门
（`export-no-semicolon-eof` 13/13、`eof-last-token-close` 13/13、`declaration-shell-call-position` 24/24、
`decorated-declaration-takeover` 14/14）全绿。

**根层声明 / 导入导出族语句壳开关**（Stage 4q）。`true` = `Decide` 把这些起点判成
`StatementRoute.ShellDeclarationFamily`，由 `ControlFlowStatementPossibleShape`（通用起点候选）建壳，
壳 `Kind` / 终结候选的 `StatementKind` 都取 `ShellDeclarationFamily`；收口走
`StatementBoundaryUtil` 的 `;` / EOF / ASI，建树走 `StatementBuilder.BuildStatement`。
`false` = 这些起点重新判成 `Legacy`，行为逐位回到 Stage 4p（安全回退，不靠候选先后）。

## static field DeclarationShellCount:int = 0

进程内累计「被声明 / 导入导出候选建成壳的语句」条数（只增不减）。与 `ControlFlowShellCount` /
`LabelShellCount` **分开计量**：三个族各有自己的建壳时机与关键字表，接管读数不能混在一个数里。

## static field EnableRootDeclarationShell:bool = true

**根层 `function` / `class` / 装饰器声明语句壳开关**（Stage 5d-3）。`true` = `Decide` 把这些根层起点判成
`ShellFunctionDeclaration` / `ShellClassDeclaration` / `ShellDecoratedDeclaration`，由通用起点候选
`ControlFlowStatementPossibleShape` 建壳（它是根目录里已经注册的候选，不新增候选、不改候选顺序），
壳 `Kind` / 终结候选的 `StatementKind` 都取对应族码；判界走
`StatementBoundaryUtil.DeclarationShellEndCode`（体括号 / `;` / 声明跟随边界 / EOF，**不调 `ScanRoot`**），
建树直接调 `StatementBuilder.BuildFunctionDeclaration()` / `BuildClassDeclaration()`。
`false` = 这些起点重新判成 `Legacy`，行为逐位回到 5d-2a（安全回退，不靠候选先后）。

**只收紧根层**：`Decide` 只在语句首的 `Parent` 不是括号时判这三个族；块体里的同名声明路由一字不变
（块体目录里没有这些候选，放开就是「零候选」等待，不是接管）。

## static field FunctionDeclarationShellCount:int = 0

进程内累计「被根层 `function` 声明壳接管的语句」条数（只增不减）。与 `DeclarationShellCount` 分开计量：
后者是 `interface` / `type` / `enum` / `import` / `export` 等声明族的既有账，本族是 5d-3 新收口的
`function`（含 `async function`）。**计数器只说明壳建了几个**，树对不对仍由
`declaration-shell-boundary.mjs` 的 AST / XML / ScanRoot 三面证据回答。

## static field ClassDeclarationShellCount:int = 0

进程内累计「被根层 `class` 声明壳接管的语句」条数（只增不减，含 `abstract class`）。与
`FunctionDeclarationShellCount` 分开计量（两族的体括号判界虽然同一份，但起点判据与 builder 不同）。

## static field DecoratedDeclarationShellCount:int = 0

进程内累计「被根层装饰器声明壳接管的语句」条数（只增不减）。它只说明 `@` 起点建了几个壳：
装饰器后面是什么声明由收口时的 `ScanDecoratedHead` 回答，class / function 走 family builder、
其余族仍走 `BuildStatement`（读数与 `LegacyStatementDispatchCount` 一起看才知道谁真迁了）。

## static field EnableSwitchCaseClause:bool = true

**switch 子句级语句接管开关**（Stage 4y 落地，Stage 4aa 转正）。**默认开**。S4y 未交付的根因已在 4aa 定位并修复：
子句壳的终结候选原先挂 `StatementKind = 0`（Wave1 变量族），走 `StatementScanner.ScanRoot`；子句壳的 `Data`
没有 `{` 前缀，`ScanRoot` 只认 `{` / `;` / 声明关键字起点（`f` 起头一律 `Mismatch`），所以壳在 `;` 处不收口，
一直涨到 case 块的 `}`，`ExitOrPre` 整体建树失败 → `DetachShell` 退回 raw。族标记改为
`StatementRoute.ShellPlainExpression`（`;` / EOF / ASI 判界）后：`case 1: a; b;` shell=2、
`case 1: f(); case 2: g();` shell=2、`case 1: f(); case 2: { g(); }` body=1，XML 与 legacy 逐字节一致。

`true` = switch 的 **case 块括号** `{ … }` 在创建时挂一份
**只含 `CaseClauseStatementPossibleShape`** 的目录（终结候选 `BlockBodyWaitingPossibleShape`）：
`case 1: f();` 的 `f();` 在冒号之后建壳，收口后由 `StatementBuilder.BuildCaseBlock` 按序收集进
`CaseClauseShape`。目录里**不放**表达式 / 变量 / 块体候选——那正是 Stage 4p 挂错括号时
`case <表达式>:` 被整套当语句建壳、抛 `SourceRange is not set` 的根因（见 HANDOFF-s4p/s4s）。
`false` = 不挂，case 块括号保持纯 raw，行为逐位回到 Stage 4s（子句语句由 `BuildCaseBlock` 的
legacy 递归建，树仍正确）。

## static field SwitchCaseClauseMountCount:int = 0

**switch case 块括号挂上子句语句目录**的次数（Stage 4y，只增不减）。与 `SwitchCaseBodyMountCount`
（case 体 `{` 的挂载）分开计量：一个 switch 只有一次本计数，case 体可以有多个。

## static field SwitchCaseClauseShellCount:int = 0

**switch 子句级语句被建成壳**的条数（Stage 4y，只增不减）。与 `SwitchCaseBodyMountCount`（挂载）分开：
挂上但一条子句语句都没接时本计数为 0（未接管，不是失败）。

## static field EnableBlockClassShell:bool = true

**块内 `class` 声明壳化开关**（Stage 4y 落地，Stage 4ac **转正并默认开**；Stage 4ae 在本基线上重做并转正）。`true` = `Decide` 把**宿主是块体 `{` 括号**的
`class` 起点判成 `StatementRoute.ShellStatementFamily`，由块体目录里既有的
`ControlFlowStatementPossibleShape` 建壳（`ScanRoot` 判界，`}` 收口），从而让
`{ class C {} }` / `{ class C { m(){} } }` 的 `BlockBodyStatementCount` 增量 > 0。
打开态的专用计数与全表读数见 `HANDOFF-s4ae.md`（`ast-json` 6167 / `real-dts` 226 / token diff 0 /
`--all` 101 全部在打开态实跑）。

`class` 原先在 `IsLegacyKeyword` 里、且 `IsDeclarationHead` 不含它：它的体语句按文档应由括号事件接管，
做成声明壳会改变体括号的宿主。本开关只改**块内**这一类起点（根层 `class` 仍走 legacy），且用
`ShellStatementFamily`（ScanRoot）而不是 `ShellDeclarationFamily`（`;` / EOF / ASI 边界）——带体声明的
边界是 `}`，与 `if` / `while` 同一条判界。

Stage 4ac/4ae 转正依据（打开态实跑，见 `HANDOFF-s4ae.md`）：`{ class C {} }` body=1、
`{ class C { m(){ let y = 1; } } }` body=2、`{ class C extends B {} }` body=1，三条 XML==legacy、fallback=0；
`{ class C {} f(); }` body=0 是**未接管**（class 壳收口后 `f();` 这一格没有回到块体目录），树与 legacy 逐字节一致；
打开态跑 `ast-json` 6167/6167、`ast-json-diff` 无差、`real-dts` 226/226、token diff 0、`--all` 101/0。
只要这些读数中任何一项回落，本开关就退回 `false`（安全回退：行为逐位回到 Stage 4y 默认关）。

## static method IsDeclarationHead:(text:string)=>bool

`ShellDeclarationFamily` 的**关键字起点集合**（Stage 4q）。只收「能起一条声明 / 导入导出语句」的关键字：

- `interface` / `enum` / `type` / `namespace` / `module` / `declare` —— 声明族；
- `import` / `export` —— 导入导出族（`export` 必须在这里：`Legacy` 关键字表里也有它，但本族的判据先跑）；
- `using` —— 显式资源管理声明（`using x = y;`；`await using` 由 `await` 那条路走，不在这里）。

**不在集合里**：`function` / `class` / `abstract` / `async`。前三者的体语句已由括号事件接管（见
`ShellDeclarationFamily` 的说明）；`async` 是「双角色」起点（`async x => …` 是表达式语句），归 `DecideCommon`。

```ts
return text === "interface" || text === "enum" || text === "type" || text === "namespace"
  || text === "module" || text === "declare" || text === "import" || text === "export"
  || text === "using";
```

## static method DecideDeclaration:(units:Array<Token>, headAt:int, text:string)=>int

**声明 / 导入导出族的细分判据**（Stage 4q）：返回 `ShellDeclarationFamily` 或 `None`。
`None` 的语义是「本族不管这一格，交回 `DecideCommon` 的既有判据」——**不是** `Reject`：
`Reject` 被 `CatalogGuide` 永久删除，第二个代码单元还没到时判死会让整条语句再没有人接管。

三条硬约束：

1. **只认 `IsDeclarationHead`**：其余关键字（`function` / `class` / `if` / …）一律 `None`。
2. **上下文关键字必须看下一格**：`type` / `module` / `namespace` / `declare` / `using` / `abstract`
   在 JS 里都能当标识符（`type = 1`、`module.exports`）。下一格是符号且不是 `*` 时判 `None`
   （`export *` 的 `*` 例外），让 `DecideCommon` 把 `type = 1` 判成表达式、`module.exports` 判成普通表达式。
3. **`import` 的表达式位不抢**：`import(` / `import.meta` 与 `DecideCommon` 用**同一判据**判成
   `ShellPlainExpression`（这里只返回 `None`，不重复写第二份判据）。

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions
  || !StatementRouteUtil.EnableControlFlowShell) {
  return StatementRoute.None;
}
if (!StatementRouteUtil.IsDeclarationHead(text)) {
  return StatementRoute.None;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  // 第二个代码单元还没到：继续等（判死会让这一格之后没人能接管这条语句）。
  return StatementRoute.None;
}
const next = units[nextAt];
if (next instanceof EndOfFileTokenShape) {
  // 裸关键字（`type` / `interface` 后直接 EOF）：不是声明，交回 legacy。
  return StatementRoute.None;
}
if (text === "import") {
  // 表达式位的 `import`：`import(...)` / `import.meta`。判据与 `DecideCommon` 逐字同源。
  if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
    return StatementRoute.None;
  }
  if (next instanceof Symbol && (next as Symbol).Is(".")) {
    return StatementRoute.None;
  }
  if (next instanceof Common) {
    // `import x = require("m")` 是 import-equals 声明，留给 legacy；`import x from` 才是本族。
    // 第二个代码单元之后的那格还没到时返回 None（= 等待，由 `IsDeclarationPending` 放行）。
    const afterAt = ItemUtil.NextCode(units, nextAt + 1);
    if (afterAt >= units.length) {
      return StatementRoute.None;
    }
    if (units[afterAt] instanceof Symbol && (units[afterAt] as Symbol).Is("=")) {
      return StatementRoute.None;
    }
  }
  return StatementRoute.ShellDeclarationFamily;
}
// `export * from "m"` 的 `*` 是声明位；其余符号说明这个关键字被当成标识符用了。
if (next instanceof Symbol) {
  if ((next as Symbol).Is("*")) {
    return StatementRoute.ShellDeclarationFamily;
  }
  return StatementRoute.None;
}
// **Stage 5d-8c：`declare` 与后继之间换行 ⇒ `declare` 是标识符，不是声明修饰词**。
// TS 的修饰词解析要求 `!scanner.hasPrecedingLineBreak()`，所以 `declare` ⏎ `const x = 1;` /
// `declare` ⏎ `module "m" {}` / `declare` ⏎ `class C {}` 一律是「ExpressionStatement(declare) +
// 下一条声明」（12 种后继逐一实测，含块注释里的换行）。本族若在这一格建壳，壳会把两条都吞进去
// （`BuildFromShell` 读到两条 → 「语句没有读完」→ 文件级 fallback）；`IsAsiBoundary` 的条件 5 又把
// `declare` 当声明头、不给 ASI 边界，所以表达式壳也收不了口。唯一正确的做法是**不建壳**：交回
// `DecideCommon`（`declare` 是普通标识符 → `ShellPlainExpression`），根表达式候选按 ASI 收在
// `declare` 上，下一条声明各走各的壳。行终止符判据读 `StatementScanner.NoLineBreakBetween`
// ——与 `DeclareIsAmbientVariable` 判 `declare const` 同一行用的是**同一个**函数，不新写第二套。
if (text === "declare" && !StatementScanner.NoLineBreakBetween(units[headAt], next)) {
  return StatementRoute.None;
}
// `export as namespace N`（UMD）留给 legacy：它不是普通导出声明，建造器没有这条分派。
if (next instanceof Common && (next as Common).Is("as")) {
  return StatementRoute.None;
}
return StatementRoute.ShellDeclarationFamily;
```

## static method IsDeclarationPending:(units:Array<Token>, headAt:int, text:string)=>bool

**声明族判据的「还没到」判据**（Stage 4r）：`DecideDeclaration` 需要看下一个代码单元才能把
`type T` 与 `type = 1`、`declare const` 与 `declare`、`import x from` 与 `import x =` 分开。
第二个代码单元还没到时**不能落回 `DecideCommon`**（它会把 `declare` / `type` 直接判成 `Legacy`），
也不能判成声明族（可能误吞标识符起点）——所以 `Decide` 在这一格返回 `None`（等待），
让专用候选保持 `Uncertain`。

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions
  || !StatementRouteUtil.EnableControlFlowShell) {
  return false;
}
if (!StatementRouteUtil.IsDeclarationHead(text)) {
  return false;
}
const nextAt = ItemUtil.NextCode(units, headAt + 1);
if (nextAt >= units.length) {
  return true;
}
if (units[nextAt] instanceof EndOfFileTokenShape) {
  return false;
}
if (text === "import" && units[nextAt] instanceof Common) {
  return ItemUtil.NextCode(units, nextAt + 1) >= units.length;
}
return false;
```

## static method IsControlFlowHead:(text:string)=>bool

`ShellStatementFamily` 的**关键字起点集合**：只有真正能起一条语句的控制流关键字。
`else` / `catch` / `finally` / `case` / `default` 不在里面——它们只能出现在上一条语句内部，
语句首出现就是非法输入，留给 legacy 与文件级 fallback，不在这里另起判据。

```ts
return text === "if" || text === "while" || text === "do" || text === "for"
  || text === "switch" || text === "try" || text === "return" || text === "throw"
  || text === "break" || text === "continue" || text === "debugger" || text === "with";
```

## static method IsLegacyKeyword:(text:string)=>bool

`StatementRoute.Legacy` 的关键字集合：声明族、导入导出族、控制流族与「双角色」起点（`async` / `using` /
`await` / `yield`）。**`export` 必须在里面**：`ExportDeclarationPossibleShape` 在 `export` 格 `Accept`，
本候选若也把它当普通标识符路由到壳，两个候选同格 `Accept` 会让 `CatalogGuide` 抛「终结候选与其它候选同时成立」。

```ts
return text === "import" || text === "export" || text === "using" || text === "type"
  || text === "interface" || text === "class" || text === "enum" || text === "namespace"
  || text === "module" || text === "declare" || text === "abstract" || text === "function"
  || text === "async" || text === "await" || text === "yield"
  || text === "if" || text === "else" || text === "for" || text === "while" || text === "do"
  || text === "switch" || text === "try" || text === "catch" || text === "finally"
  || text === "return" || text === "throw" || text === "break" || text === "continue"
  || text === "debugger" || text === "with";
```

## static method IsPrefixSymbol:(symbol:Symbol)=>bool

一元前缀起的符号（`! ~ + - ++ --`）：这些起点确定是表达式语句。

```ts
return symbol.Is("!") || symbol.Is("~") || symbol.Is("+") || symbol.Is("-")
  || symbol.Is("++") || symbol.Is("--");
```

## static method IsBinarySymbol:(symbol:Symbol)=>bool

二元/赋值符号（`ClassOf` 用；`Decide` 不看它们——语句起点不可能是二元符号）。

```ts
return symbol.Is("+") || symbol.Is("-") || symbol.Is("*") || symbol.Is("/") || symbol.Is("%")
  || symbol.Is("**") || symbol.Is("<<") || symbol.Is(">>") || symbol.Is(">>>")
  || symbol.Is("<") || symbol.Is(">") || symbol.Is("<=") || symbol.Is(">=")
  || symbol.Is("==") || symbol.Is("!=") || symbol.Is("===") || symbol.Is("!==")
  || symbol.Is("&") || symbol.Is("|") || symbol.Is("^") || symbol.Is("&&") || symbol.Is("||")
  || symbol.Is("??") || symbol.Is("=") || symbol.Is("+=") || symbol.Is("-=") || symbol.Is("*=")
  || symbol.Is("/=") || symbol.Is("%=") || symbol.Is("**=") || symbol.Is("<<=") || symbol.Is(">>=")
  || symbol.Is(">>>=") || symbol.Is("&=") || symbol.Is("|=") || symbol.Is("^=")
  || symbol.Is("&&=") || symbol.Is("||=") || symbol.Is("??=");
```

## static method IsLabelColonAhead:(units:Array<Token>, headAt:int)=>bool

**文档级前瞻**（Stage 4f）：语句首标识符之后的下一个**非空白、非注释**字符是不是 `:`。

只在「第二个代码单元还没到」的窗口里被 `DecideCommon` 调用：此时 `units` 里除了 trivia 没有任何 token
可看，唯一的事实来源是 `SourceRange.Document` 的源码字符。跳过空白（含换行，`en` ⏎ `: a;` 是合法标签）
与两种注释（`//` 到行尾、`/* */`），遇到其余任何字符立即返回它是不是 `:`。

**只读、不建状态**：不缓存、不改任何 token，和 `Document.GetValue` 一样是零分配的纯查询。

```ts
if (headAt < 0 || headAt >= units.length) {
  return false;
}
const range = units[headAt].SourceRange;
if (range.Document === null || range.EndIndex < 0) {
  return false;
}
const document = range.Document!;
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  at += 1;
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    continue;
  }
  if (ch === "/" && at < count) {
    const next = document.GetValue(at);
    if (next === "/") {
      at += 1;
      while (at < count && document.GetValue(at) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 1;
      let previous = "";
      let closed = false;
      while (at < count) {
        const inside = document.GetValue(at);
        at += 1;
        if (previous === "*" && inside === "/") {
          closed = true;
          break;
        }
        previous = inside;
      }
      if (!closed) {
        return false;
      }
      continue;
    }
    return false;
  }
  return ch === ":";
}
return false;
```

## static method DecideCommon:(text:string, units:Array<Token>, headAt:int)=>int

普通标识符与关键字的细分：`let/const/var` 看下一代码单元能否起绑定（与 `StatementScanner.StartsBinding` 同源）；
绑定还没到返回 `None`（继续等，不许 `Reject`）；`let` 当标识符/标签返回 `Legacy`（交回 legacy，行为与 A 一致）。

```ts
if (text === "let" || text === "const" || text === "var") {
  const bindingAt = ItemUtil.NextCode(units, headAt + 1);
  if (bindingAt >= units.length) {
    return StatementRoute.None;
  }
  if (StatementScanner.StartsBinding(units, bindingAt)) {
    return StatementRoute.ShellVariable;
  }
  return StatementRoute.Legacy;
}
if (StatementRouteUtil.EnableShellExpressions) {
  // **表达式位的 `import`**（S3k-3）：只有 `import(` 与 `import.meta` 是表达式语句；
  // `import x` / `import {` / `import *` / `import "m"` / `import type` 都是声明，留在 legacy。
  // 第二个代码单元还没到时必须 `None`（继续等）：`Reject` 被 `CatalogGuide` 永久删除，
  // 首格判死之后 `.` / `(` 那一格就再没有候选能建壳（s3k2 HANDOFF 里定位到的首格死锁）。
  if (text === "import") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt >= units.length) {
      return StatementRoute.None;
    }
    const next = units[nextAt];
    if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
      return StatementRoute.ShellPlainExpression;
    }
    if (next instanceof Symbol && (next as Symbol).Is(".")) {
      return StatementRoute.ShellPlainExpression;
    }
    return StatementRoute.Legacy;
  }
  // S3m: statement-start async arrows only. `async function ...` is a declaration and stays legacy.
  // Return None while the deciding unit has not arrived: Reject is permanent in CatalogGuide.
  if (text === "async") {
    const nextAt = ItemUtil.NextCode(units, headAt + 1);
    if (nextAt >= units.length) {
      return StatementRoute.None;
    }
    const next = units[nextAt];
    if (next instanceof Common && (next as Common).Is("function")) {
      return StatementRoute.Legacy;
    }
    if (next instanceof Bracket && (next as Bracket).StartBracketChar === "(") {
      const arrowAt = ItemUtil.NextCode(units, nextAt + 1);
      if (arrowAt >= units.length) {
        return StatementRoute.None;
      }
      if (units[arrowAt] instanceof Symbol && (units[arrowAt] as Symbol).Is("=>")) {
        return StatementRoute.ShellPlainExpression;
      }
      return StatementRoute.Legacy;
    }
    if (next instanceof Common && !(next as Common).CanStartNumber()) {
      const arrowAt = ItemUtil.NextCode(units, nextAt + 1);
      if (arrowAt >= units.length) {
        return StatementRoute.None;
      }
      if (units[arrowAt] instanceof Symbol && (units[arrowAt] as Symbol).Is("=>")) {
        return StatementRoute.ShellPlainExpression;
      }
      return StatementRoute.Legacy;
    }
    return StatementRoute.Legacy;
  }  if (StatementRouteUtil.EnableControlFlowShell && StatementRouteUtil.IsControlFlowHead(text)) {
    return StatementRoute.ShellStatementFamily;
  }
  // 标签语句：标识符之后的下一个代码单元是 `:`（`lbl: f();`）。`a ? b : c` 的头是 `a`、下一格是 `?`，
  // 不会命中；对象字面量的 `a: 1` 不在语句首。所以「语句首 ident + `:`」只可能是标签。
  // **第二个代码单元还没到时必须 `None`（继续等）**：此时 `:` / `?` / `=` / `(` 还不可区分。
  // 判成表达式语句会把标签锁进表达式壳；判死更不行——`Reject` 被 `CatalogGuide` 永久删除，
  // `:` 到达那一格就再没有候选能建标签壳（Stage 4c 默认关的根因，4c-2 在这里修掉）。
  if (StatementRouteUtil.EnableControlFlowLabel && !StatementRouteUtil.IsLegacyKeyword(text)) {
    const colonAt = ItemUtil.NextCode(units, headAt + 1);
    if (colonAt >= units.length) {
      // **Stage 4f**：第二个代码单元还没到 → 只问文档字符（`IsLabelColonAhead`），**不再返回 `None`**。
      // 4c-2/4d/4e 在这里返回 `None`，表达式根候选于是在头格 Uncertain、到下一格（`;` / EOF / ASI 边界）
      // 走「不能补建」分支被 `CatalogGuide` 永久 `Reject`，整条表达式语句拿不到壳 —— op-ast-proof 11/62。
      // 现在这一格就能判：`:` → 标签；否则 → 表达式（与标签关闭时的判据逐位一致）。
      if (StatementRouteUtil.IsLabelColonAhead(units, headAt)) {
        return StatementRoute.ShellLabel;
      }
      return StatementRoute.ShellPlainExpression;
    }
    if (units[colonAt] instanceof Symbol && (units[colonAt] as Symbol).Is(":")) {
      return StatementRoute.ShellLabel;
    }
  }
}
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return StatementRoute.Legacy;
}
return StatementRoute.ShellPlainExpression;
```

## static method ShouldYieldToDeclarationShell:(units:Array<Token>, tokenIndex:int)=>bool

**legacy 让位门控的唯一判据**（Stage 4x / S4z-r2）：`route` 命中 `ShellDeclarationFamily` 就让位，
**单调**。

Stage 4x 曾在门控里再问一次「壳在这一格真的会建吗」（`!StatementBoundaryUtil.CanEndStatementAt`），
把门控与壳的晚建守卫绑成同一份判据。S4z 证伪：**判据必须单调**——门控只看 `route`，
壳在边界格上一律 `Accept` 并在 `BuildByIndex` 里做起点同步（见
`declaration-statement-possible-shape.xl.md` 与 `control-flow-statement-possible-shape.xl.md`）。
两边各问一次「会不会建」，就会出现「门控让位、壳拒建」的双退（`enum E { A }` ⏎ `export { T, E };`
只能文件级 fallback），或者反过来「壳建了、legacy 也建」的双建（S4r 的 `decl=2`）。

所以这一格只回答一个问题：**route 是不是声明族**。是，legacy 候选就整族让位；
壳到底在哪一格建、搬多少单元，由壳自己的 `BuildByIndex` 决定，不在这里预判。

```ts
if (!StatementRouteUtil.EnableDeclarationShell || !StatementRouteUtil.EnableShellExpressions) {
  return false;
}
const route = StatementRouteUtil.Decide(units, tokenIndex);
// Stage 5d-3：根层 `function` / `class` / 装饰器声明也是「本条语句归壳」——落回 legacy 候选就会同格
// 双建（legacy class / function 候选是**提前挂载**的，Accept 得比语句壳更早）。让位仍只看 route，
// 保持 S4z 的单调性：壳在哪一格建、搬多少单元由壳自己决定，不在这里预判。
return route === StatementRoute.ShellDeclarationFamily
  || route === StatementRoute.ShellFunctionDeclaration
  || route === StatementRoute.ShellClassDeclaration
  || route === StatementRoute.ShellDecoratedDeclaration;
```
## static method IsSameLineWordAhead:(units:Array<Token>, headAt:int, expected:string)=>bool

**上下文关键字的文档级前瞻**（Stage 5d-3）：`units[headAt]` 之后、**同一行内**的下一个词是不是 `expected`。
只在「第二个代码单元还没 token 化」的那一格被 `Decide` 调用（`async` → `function`、`abstract` → `class`），
与 `IsLabelColonAhead` 同一手法：唯一的事实来源是 `SourceRange.Document` 的源码字符，不建状态、不缓存。

**行终止符一律判 false**：`async` ⏎ `function` 是 TS 的两条语句（`async` 自成 ExpressionStatement），
`abstract` ⏎ `class` 同理——这两条拆分由 legacy 候选按原路径做（`DecideCommon` 与
`FunctionDeclarationPossibleShape.SplitDeclare` 的同一口径）。块注释里出现行终止符也算换行
（与 `LineTerminator.HasBefore` 同口径）。

**为什么需要它**：这一格若不前瞻，`Decide` 只能返回 `None`（等待第二个代码单元），通用 legacy 候选会在
这一格问一次 `ScanRoot`；等 `function` / `class` 到达时族才判出来，壳只好晚建一格。前瞻让
`async function` / `abstract class` 在**首格**就判出族，`ScanRoot` 在这一族归零，候选也不需要一个
「第二格窗口」。

```ts
if (headAt < 0 || headAt >= units.length) {
  return false;
}
const range = units[headAt].SourceRange;
if (range.Document === null || range.EndIndex < 0) {
  return false;
}
const document = range.Document!;
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (ch === "\r" || ch === "\n" || ch === "\u2028" || ch === "\u2029") {
    return false;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetValue(at + 1);
    if (next === "/") {
      return false;
    }
    if (next === "*") {
      at += 2;
      let closed = false;
      while (at < count) {
        const inside = document.GetValue(at);
        if (inside === "\r" || inside === "\n" || inside === "\u2028" || inside === "\u2029") {
          return false;
        }
        at += 1;
        if (inside === "*" && at < count && document.GetValue(at) === "/") {
          at += 1;
          closed = true;
          break;
        }
      }
      if (!closed) {
        return false;
      }
      continue;
    }
    return false;
  }
  break;
}
let word = "";
while (at < count) {
  const ch = document.GetValue(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$") {
    word += ch;
    at += 1;
    continue;
  }
  break;
}
return word === expected;
```

## static method Decide:(units:Array<Token>, tokenIndex:int)=>int

**分流判据**（设计 §3.2，冻结签名）：本条目的首代码单元是什么，决定这条语句归谁建。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return StatementRoute.None;
}
const itemStart = ItemUtil.ItemStart(units);
if (itemStart < 0 || itemStart >= units.length) {
  return StatementRoute.None;
}
const headAt = ItemUtil.NextCode(units, itemStart);
if (headAt >= units.length || headAt > tokenIndex) {
  // 首代码单元还没到（只有 trivia）：不许判成任何一族，调用方只能继续等。
  return StatementRoute.None;
}
const head = units[headAt];
if (head.IsTriviaToken || head instanceof EndOfFileTokenShape) {
  return StatementRoute.None;
}
if (head instanceof Common) {
  // Stage 4q：声明 / 导入导出族先问一次（`None` = 本族不管，落回 `DecideCommon` 的既有判据）。
  const headText = (head as Common).TempToString();
  // **Stage 4y：块内 class 声明壳**（默认关）。只认宿主是块体 `{` 括号的 `class`：根层 `class` 仍走
  // legacy（体语句的括号事件与根级声明候选都按原路径走），本分支不改变根层任何一个字节。
  // 判成 `ShellStatementFamily` 而不是 `ShellDeclarationFamily`：带体声明的边界是 `}`，
  // 与 `if` / `while` 同一条 `ScanRoot` 判界；声明族的 `;` / EOF / ASI 边界不适用于它。
  if (StatementRouteUtil.EnableBlockClassShell && headText === "class") {
    const classOwner = head.Parent;
    if (classOwner instanceof Bracket && (classOwner as Bracket).StartBracketChar === "{") {
      return StatementRoute.ShellStatementFamily;
    }
  }
  // **Stage 5d-3：根层 function / class / 装饰器声明的语句壳**。只认**根层**：语句首的 `Parent` 不是括号
  // （根目录的宿主是 `SourceFileShape`）。块体里的 `class` 已由上一分支判成 `ShellStatementFamily`；
  // 块体里的 `function` / 装饰器声明**不动**——块体目录里没有对应候选，路由一改就是「零候选」等待，
  // 不是接管（安全回退的唯一正确形态是逐位保持 legacy）。
  if (StatementRouteUtil.EnableRootDeclarationShell && StatementRouteUtil.EnableShellExpressions
    && !(head.Parent instanceof Bracket)) {
    if (headText === "function") {
      return StatementRoute.ShellFunctionDeclaration;
    }
    if (headText === "class") {
      return StatementRoute.ShellClassDeclaration;
    }
    if (headText === "abstract") {
      const nextAt = ItemUtil.NextCode(units, headAt + 1);
      if (nextAt >= units.length) {
        // 第二个代码单元还没到：文档级前瞻（同一行下一个词是 `class`）→ 本族；否则等待
        // （判死会让这一格之后没人能接管；`abstract` 当标识符的形态下落回 `DecideCommon` 的 `Legacy`）。
        if (StatementRouteUtil.IsSameLineWordAhead(units, headAt, "class")) {
          return StatementRoute.ShellClassDeclaration;
        }
        return StatementRoute.None;
      }
      const next = units[nextAt];
      if (next instanceof Common && (next as Common).Is("class")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        return StatementRoute.ShellClassDeclaration;
      }
      // `abstract` ⏎ `class` 是 TS 的两条语句（修饰词自成 ExpressionStatement），落回 `DecideCommon`。
    }
    if (headText === "async") {
      const nextAt = ItemUtil.NextCode(units, headAt + 1);
      if (nextAt >= units.length) {
        // 同 `abstract`：`async` 之后同一行的下一个词是 `function` 就是本族。
        if (StatementRouteUtil.IsSameLineWordAhead(units, headAt, "function")) {
          return StatementRoute.ShellFunctionDeclaration;
        }
        return StatementRoute.None;
      }
      const next = units[nextAt];
      // **同一行**的 `async function` 才是本族；换行时 TS 的 ASI 把它拆成「async 表达式语句 +
      // function 声明」，那条拆分由 legacy 候选按原路径做（`DecideCommon` 也是这个判据）。
      if (next instanceof Common && (next as Common).Is("function")
        && StatementScanner.NoLineBreakBetween(head, next)) {
        return StatementRoute.ShellFunctionDeclaration;
      }
      // 其余 `async` 形态（箭头 / 标识符 / 换行拆分）逐位交回 `DecideCommon`。
    }
  }
  const declaration = StatementRouteUtil.DecideDeclaration(units, headAt, headText);
  if (declaration !== StatementRoute.None) {
    return declaration;
  }
  // Stage 4r：上下文关键字的判据要等下一个代码单元（`type T` / `declare const` / `import x from`）。
  // 这一格必须 None（等待）：落回 DecideCommon 会把 `declare` 判成 Legacy，专用候选当场被永久 Reject。
  if (StatementRouteUtil.IsDeclarationPending(units, headAt, headText)) {
    return StatementRoute.None;
  }
  return StatementRouteUtil.DecideCommon(headText, units, headAt);
}
if (head instanceof Symbol) {
  const symbol = head as Symbol;
  if (symbol.Is(";")) {
    // 空语句：默认归壳（`EnableControlFlowEmpty = true`；4d 的父目录重放已修好 `;` 的失管）。
    if (StatementRouteUtil.EnableShellExpressions && StatementRouteUtil.EnableControlFlowShell
      && StatementRouteUtil.EnableControlFlowEmpty) {
      return StatementRoute.ShellStatementFamily;
    }
    return StatementRoute.Legacy;
  }
  if (StatementRouteUtil.IsPrefixSymbol(symbol)) {
    return StatementRoute.ShellPlainExpression;
  }
  // **装饰器声明起点（Stage 4af-E）**：`@dec class C {}` / `@a @b interface I {}` 的语句首是
  // 装饰器前缀的 `@`（Symbol），既不是表达式、也不是语句关键字。4af-E 时它归 `Legacy`：legacy 的声明
  // 候选（class / interface / enum / module / type / function）自己认装饰器前缀，`state.Start`
  // 落在 `@` 上，建出的声明 children 最前就是 Decorator。**Stage 5d-3 起根层改判
  // `ShellDecoratedDeclaration`**（见下面的分支），块体里仍归 `Legacy`。
  //
  // 判成 `None`（本方法原来的落点）会让声明族 / 控制流族 / 表达式根候选在 `@` 这一格一直
  // `Uncertain`：装饰器声明要到 `class` 之后才能让 legacy 声明候选变成唯一候选，而 `@` 格活着的
  // 那几个候选不改判、拖到 EOF 与根终结候选撞「同时成立」——`@dec class C {}` 单独一个文件因此
  // 只能靠**文件级 fallback** 建对（HANDOFF-s4af-E §2）。归 `Legacy` 后这一格只有 legacy 声明
  // 候选还活着，装饰器声明在 root 目录里就能建出来（也是声明壳收口后 leftover replay 能建出
  // 装饰器类的前提：重放把 `@` 这一格送回 root 时，必须有候选能认下它）。
  //
  // 只改「这一格归哪一族」，不新写任何装饰器判据：`@` 之后是不是一条声明仍由各 legacy 候选
  // （以及声明壳收口后的 `SourceFileEndPossibleShape.BuildTrailingDeclaration`）判。
  if (symbol.Is("@")) {
    // **Stage 5d-3**：根层的装饰器声明改由语句壳驱动（`ShellDecoratedDeclaration`）。装饰器前缀后面是
    // 哪一种声明要到表达式吃完才知道，所以本族只负责「先建壳、体括号 / `;` / EOF 收口」，判型留给
    // 收口时的 `StatementBuilder.ScanDecoratedHead`（与 `BuildDecoratedStatement` 同一个判型点）。
    // 块体里的 `@` 仍判 `Legacy`（块体目录没有装饰器候选，放开只会在块体里留一个零候选的等待）。
    if (StatementRouteUtil.EnableRootDeclarationShell && StatementRouteUtil.EnableShellExpressions
      && !(head.Parent instanceof Bracket)) {
      return StatementRoute.ShellDecoratedDeclaration;
    }
    return StatementRoute.Legacy;
  }
  return StatementRoute.None;
}
if (head instanceof Bracket) {
  const startChar = (head as Bracket).StartBracketChar;
  if (startChar === "(" || startChar === "[") {
    return StatementRoute.ShellPlainExpression;
  }
  if (startChar === "{") {
    // 语句首的 `{` 一律是块语句：对象字面量只可能出现在表达式位置（`({ a: 1 });` / `x = { a: 1 }`），
    // 语句首不存在「从 `{` 起一条表达式语句」的写法。二义的裁决点就在这里，不在 Bracket 里另起判据。
    return StatementRoute.ShellBlock;
  }
  // `{`：块体 / 对象字面量二义，Stage 4 才裁；其余括号也不可能起语句。
  return StatementRoute.Legacy;
}
// 字符串 / 正则 / 模板 / 数字等字面量：确定的普通表达式起点。
return StatementRoute.ShellPlainExpression;
```

## static method ClassOf:(units:Array<Token>, tokenIndex:int)=>int

**单元分类器**（设计 §2.3，冻结签名）：`ClassOf` 是唯一的「当前单元是什么」判据，Stage 3 的操作符候选与
`EndPossible` 的互斥都从这里取值。未知单元返回 `Unknown`（`EndPossible` 在 `Unknown` 格一律 `Uncertain`，
宁可多等一格也不抛错）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return StatementClass.Unknown;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return StatementClass.Unknown;
}
if (unit instanceof EndOfFileTokenShape) {
  return StatementClass.Eof;
}
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  if (symbol.Is(";")) {
    return StatementClass.Semicolon;
  }
  if (symbol.Is(",") || symbol.Is(":") || symbol.Is("?") || symbol.Is(")")) {
    return StatementClass.Separator;
  }
  if (symbol.Is(".")) {
    return StatementClass.MemberAccess;
  }
  if (symbol.Is("++") || symbol.Is("--")) {
    return StatementClass.Postfix;
  }
  if (symbol.Is("!") || symbol.Is("~")) {
    return StatementClass.PrefixOperator;
  }
  if (StatementRouteUtil.IsBinarySymbol(symbol)) {
    return StatementClass.BinaryOperator;
  }
  return StatementClass.Unknown;
}
if (unit instanceof Bracket) {
  const startChar = (unit as Bracket).StartBracketChar;
  if (startChar === "(" || startChar === "[" || startChar === "{") {
    return StatementClass.OperandStart;
  }
  return StatementClass.Separator;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (StatementRouteUtil.IsLegacyKeyword(text)) {
    return StatementClass.StatementStart;
  }
  if (text === "typeof" || text === "void" || text === "delete" || text === "new") {
    return StatementClass.PrefixOperator;
  }
  if (text === "instanceof" || text === "in" || text === "as" || text === "satisfies"
    || text === "of") {
    return StatementClass.BinaryOperator;
  }
  return StatementClass.OperandStart;
}
// 字符串 / 正则 / 模板 / 数字等字面量。
return StatementClass.OperandStart;
```