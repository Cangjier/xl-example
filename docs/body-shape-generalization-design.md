# `OnBracketCreatedEvent` 推广可行性设计（带 body 的 shape）

> 任务：T2 / task-3。基线：主仓 `feature/quick-parse` @ `ac0782d5274c2a93810cc2166d1b26c172a723c5`。
> 本文只做只读分析与设计，不含源码改动。所有行号以该基线的 `.xl.md` 源码为准（`file:line` 是行号）。
> 读者：T3 `body-foundation`（按 §7 抽共享工具）、T5 `body-enum`、T6 `body-class`、T7 `body-typeliteral`、T8 `body-module`，以及合并 / 复验成员。

---

## 0. 结论摘要

1. **机制本身已经是通用的**：`Bracket.Transit` 在建出新括号后对**直接父单元**回调 `OnBracketCreatedEvent`（`core/syntax/basic-tokens/bracket.xl.md:162-164`），`IComputePossibleShapes` 上是默认空实现（`core/syntax/i-compute-possible-shapes.xl.md:41-49`，`core/syntax/unit-token.xl.md:64-68`）。**推广不需要改 `core/`**（也符合本轮「core 只允许用户要求的两处」的纪律），只需要让目标声明先变成「提前挂载的壳」。
2. **interface 能收到事件，唯一原因是它在关键字处就 `Accept` 建壳并 `host.MountedUnit = shell`**（`typescript/tokens/declarations/interface-declaration-possible-shape.xl.md:204-207`、`:253`）。此后字符流由壳处理，壳里的 `Bracket.Transit` 的 `unit` 就是壳自己，body `{` 的创建事件自然落在壳上。
3. **class / enum / module / function / type literal 收不到**：它们都是「等到 body 括号闭合那一格才 `BuildByIndex` 一次性建完整棵树」的**原子型**候选（class `:244-262`、enum `:236-254`、module `:254-303`、function `:383-478`）；body `{` 创建时 `unit` 是**源文件根 / 外层已闭合括号 / 语句容器**，它们的 `OnBracketCreatedEvent` 都是 `UnitToken` 的空实现，事件被静默丢弃。
4. **推广的通用范式 = 「壳化」七件套**（§3）：提前 `Accept` + 壳 `OnBracketCreatedEvent` 认领 body 括号 + body 括号挂 `CatalogGuide(成员候选)` + 新增 `*-end-possible-shape` 收口 + `BuildFromCode` / `CollectBodyMembers` 收口口径 + `MountedUnit` 挂载/卸载 + `Pos` 口径 + ASI/换行守卫。
5. **推荐顺序**：`body-foundation`（共享工具）→ **enum（第一个，最低风险）** → **class（主体，8 类成员）** → 视收益决定是否做 module（最高风险，建议延后甚至放弃）。**type literal 不建议作为 body-guide 课题**（结构性不匹配，见 §4.4 / §5）；function、object literal、class static block、switch case、try/catch 建议**明确放弃或延后**，理由见 §4.5-4.7 与 §6.3。
6. **验收唯一硬约束不变**：合并后 AST 与重构前**逐节点一致**（kind / pos / end / text / name），每一支都必须过工作流 §2 的 7 项门禁（§8）。

---

## 1. 机制现状：body 括号创建时，事件落到谁身上

### 1.1 三条核心事实（带行号）

**事实 A：括号创建时只通知「直接父单元」，不向上冒泡。**

`core/syntax/basic-tokens/bracket.xl.md:136-166`（`Bracket.Transit`）：

```ts
const mounted = new Bracket(unit.Template);
unit.Add(mounted);                 // ← 新括号立刻进 unit.Data
unit.MountedUnit = mounted;        // ← 后续字符全部转给新括号
mounted.Use(source.Value).SignIn(source);
if ("OnBracketCreatedEvent" in unit) {
  (unit as unknown as IComputePossibleShapes).OnBracketCreatedEvent(mounted, context);
}
```

`unit` = **当前正在处理字符的那个单元**（即调用 `Transit` 的 `Process` 所属单元），不是语法意义上的「将来的某个声明形状」。注释原文见 `bracket.xl.md:142`：「父单元没实现 `IComputePossibleShapes` 就不通知，也不再往上找。」——所有 `UnitToken` 都实现了它，所以**实质上每个括号创建事件都会回调，但只回调一层**。

**事实 B：`UnitToken.Process` 只把字符转给 `MountedUnit`。**

`core/syntax/unit-token.xl.md:99-129`：

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, source);
  return;                          // ← 挂载单元存在时，本单元其它逻辑全部让路
}
const exitState = this.ExitOrPre(context, source);
...
for (const item of this.ProcessQueue.Data) { ... }
this.Default(context, source);
```

所以「谁在吃字符」由 `MountedUnit` 决定：`root.MountedUnit = 壳` ⇒ 壳在吃；`bodyBracket.MountedUnit = null` ⇒ body 括号在吃，它里面的 `Transit` 的 `unit` 是 body 括号本身。

**事实 C：body 括号上的成员候选靠「basic token 关闭时问父单元」触发，与括号事件是两条独立通道。**

- basic token 关闭 → 问**直接父单元**：`Bracket.Close`（`bracket.xl.md:80-98`）只问 `this.Parent` 的 `ComputePossibleShapes`，不再上溯；普通 basic token 同理问自己的 `Parent`。
- 父单元（body 括号）`UnitToken.ComputePossibleShapes` 把 `this`（宿主 = 那个括号）转给 `CatalogGuide`（`unit-token.xl.md:38-49`）。
- `CatalogGuide.ComputePossibleShapesByIndex` 的判定顺序（`core/syntax/catalog-guide.xl.md:61-121`）：逐个候选 `ComputeByIndex` 淘汰 → 终结候选 `Accept` 且候选为 0 则 build → 候选 0 且无终结候选**抛错**（`:102-107`）→ 多候选 `Waiting` → 唯一候选先 `IsBuildable` 再 `BuildByIndex`，建完 `Reset`。

⇒ **body 成员增量只要求「成员候选目录挂在 body 括号上」；body 括号本身是谁的括号、怎么认出来，才是 `OnBracketCreatedEvent` 要解决的问题。**

### 1.2 事件落点表（逐个 body 形态）

| body 括号 | 创建时 `Transit` 的 `unit` | 事件实际落点 | 落点是否覆写了 `OnBracketCreatedEvent` | 壳是否已挂载 |
|---|---|---|---|---|
| interface 声明体 `{ … }` | `InterfaceDeclarationShape` 壳 | 壳 | ✅ `interface-declaration-shape.xl.md:68-96` | ✅ 在 `interface` 关键字格挂载（possible `:253`） |
| class 声明体 | 源文件根 `SourceFileShape` / 已闭合的模块体 `Bracket` / 语句容器 | 同上 | ❌ 默认空实现 | ❌ class 候选在 body 出现后仍等 `BuildByIndex`（possible `:210-230`、`:244-262`），从不挂载 |
| enum 声明体 | 同上 | 同上 | ❌ | ❌ enum 候选同样原子型（possible `:214-254`） |
| namespace / module 体 | 源文件根 / 模块体括号 | 同上 | ❌ | ❌ module 候选**原子建树**，自述见 `module-declaration-possible-shape.xl.md:38-40` |
| function 函数体 | 源文件根 / 语句容器 | 同上 | ❌ | ❌ function 候选等 `{…}` 或 `;` 才 `Accept`（possible `:383-388`） |
| type literal `{ … }` | ——（不是字符流上的括号创建，见 §4.4） | 不适用 | ❌ `TypeLiteralPossibleShape` 是 `throw` 桩（`type-literal-possible-shape.xl.md:15-24`）且**从未注册进任何 `CatalogGuide`** | 无 |
| object literal `{ … }` | 表达式/语句层，`ObjectLiteralExpressionShape` 只有构造器（`object-literal-expression-shape.xl.md:9-19`） | 无 | ❌ | 无 |
| class static block `static { … }` | class body 括号 | class body `Bracket` | ❌（`Bracket` 继承 `UnitToken` 默认空实现） | ❌ 且 `ClassStaticBlockDeclarationPossibleShape` 也是桩（`:15-24`） |
| switch case 体 / try catch 体 | 语句容器 / block 括号 | 同上 | ❌ | ❌ `statement/*-possible-shape` 同名文件是桩（`try-statement-possible-shape.xl.md:15-24` 等） |

> 说明：`Bracket` 自己从不上溯回调（`bracket.xl.md:142`），所以 **body 里面再出现的括号（类型字面量、方法参数表、static block）其父单元是 body 括号，事件到 body 括号就停了**，不会回到外层声明壳。interface 正依赖这一点：`interface-declaration-shape.xl.md:60` 明确写「接口体里的嵌套括号父级是接口体，不会回到本形状」。

### 1.3 interface 为什么能收到（完整链路，逐行证据）

1. `interface` 关键字关闭时，`InterfaceDeclarationPossibleShape.ComputeByIndex` 置 `state.Done = true`（`interface-declaration-possible-shape.xl.md:117-126`），本轮直接返回 `Accept`（`:204-207`）。文档自述 `:24-25`：「`Done` 表示已经确认是接口声明……本候选不再等接口体括号闭合。」
2. `IsBuildable` 要求 `state.Done`（`:210-217`），`CatalogGuide` 在剩唯一候选时调 `BuildByIndex`（`catalog-guide.xl.md:114-120`）。
3. `BuildByIndex`（`:219-254`）把 `state.Start..tokenIndex` 已攒的单元原样搬进新壳 `InterfaceDeclarationShape`，算出壳 `Pos`（`:239-250`），`host.Data.splice(start, consumed.length, shell)`，然后 **`host.MountedUnit = shell`**（`:253`）。这一步是全机制的枢纽：从下一个字符起 `UnitToken.Process` 就把字符交给壳（`unit-token.xl.md:99-102`）。
4. 壳吃名字 / 类型参数 / heritage；body `{` 到达时，壳的 `ProcessQueue` 里 `Bracket.Transit(unit = shell, …)` 建括号 → 回调 `shell.OnBracketCreatedEvent`。
5. `InterfaceDeclarationShape.OnBracketCreatedEvent`（`interface-declaration-shape.xl.md:68-96`）四道守卫后认定 body：不是 `{` → 忽略；已认定过 → 忽略；`IsDefinitelyBodyBracket` 为假（尖括号深度 ≠ 0、或前一代码单元是 `extends` / `implements` / `,`）→ 忽略。认定后同时做两件事：
   - `body.CatalogGuide = new CatalogGuide(InterfaceDeclarationShape.CreateBodyPossibleShapes())`（`:94`）——**成员增量目录挂到 body 括号上**；
   - `this.CatalogGuide = new CatalogGuide([], new InterfaceDeclarationEndPossibleShape())`（`:95`）——**壳自己的收口候选**。文档解释 `:77`：「本形状自己的目录向导也在这一刻才装——头部阶段不需要判候选，装早了只是一遍空转。」
6. body `}` 关闭时 `Bracket.Close` 只问父单元 = 壳（`bracket.xl.md:88-97`）。壳的目录只有终结候选：`InterfaceDeclarationEndPossibleShape.ComputeByIndex` 看「当前格是不是已闭合的 `{` 括号」→ `Accept`（`interface-declaration-end-possible-shape.xl.md:26-37`）；`BuildByIndex`（`:39-66`）用壳 `Data` 走 `BuildFromCode`，在父单元里原地 `splice` 顶替，并 `parent.MountedUnit = null`（`:54-64`）。
7. 收口时 `CollectBodyMembers`（`interface-declaration-shape.xl.md:366-443`）优先收 body `Data` 里**已建好的成员形状**，残留 raw 尾巴回退 `BuildMembers`；两条路径都只经 `TypeBuilder.ParseTypeMember()`，所以 AST 口径不变（`docs/member-possible-design.md:11-25`）。

### 1.4 其它 shape 为什么收不到（按机制归因）

- **没有壳**：body `{` 创建时字符流不在任何一个「将要成为该声明」的单元里。class 的 `{` 是在**根**（或外层已闭合括号）处理字符时创建的，`unit = 根 / 外层括号`；class 候选此时还没 `Accept`（它要等 body 括号作为已闭合单元出现在 `host.Data` 里，见 `class-declaration-possible-shape.xl.md:210-230`）。所以事件落在 `SourceFileShape` 或 `Bracket` 上，默认空实现。
- **原子建树**：class / enum / module / function 的 `BuildByIndex` 都是「到齐了整棵一次建」：
  - class：`ClassDeclarationShape.FromUnitsAllowAnonymous`（`class-declaration-possible-shape.xl.md:251-262`），成员的逐条解析在 `ClassDeclarationShape.BuildMembers`（`class-declaration-shape.xl.md:697` 起；文档 `:64-69` 说明成员种类）；
  - enum：`EnumDeclarationShape.FromUnits`（`enum-declaration-possible-shape.xl.md:243-254`），成员在 `EnumDeclarationShape.BuildMembers` 按顶层逗号切（`enum-declaration-shape.xl.md:200-229`）；
  - module：自述「建树是原子型……不需要挂载型」（`module-declaration-possible-shape.xl.md:38-40`），体由 `ModuleBlockShape.FromBracket` 递归建语句（`module-block-shape.xl.md:64-93`）；
  - function：`FunctionDeclarationPossibleShape.BuildByIndex`（`:390-478`）在 `{…}` 或 `;` 那一格一次建。
  ⇒ **「事件收不到」与「成员一次性解析」是同一件事的两面**：因为候选没提前建壳，body 括号归谁、什么时候归，都只能在闭合后才确定。
- **type literal 例外**：它根本不是字符流上的「括号创建」决定的——它由 `TypeBuilder.ParseTypeLiteral` 在**已经闭合的 `Bracket` 单元**上直接建（`typescript/tokens/types/type-builder.xl.md:642-658`、`:911-947`）。详见 §4.4。

---

## 2. 「壳化」通用范式（七件套）

任何候选要吃到 `OnBracketCreatedEvent`，必须同时具备下面七项。缺一项都会退化成「事件收了但用不上」或「AST 不一致」。

| # | 配套 | interface 的现成样板 | 推广时的注意点 |
|---|---|---|---|
| 1 | **提前 `Accept`**：在声明关键字那一格就认定「这是我的声明」，不再等 body | `interface-declaration-possible-shape.xl.md:204-207` | 必须保留 ASI/换行守卫（`declare` ⏎ `class` 等多条语句）与装饰器前缀状态机；提前 `Accept` 后本候选**不能再扫描 body**，body 内容归壳 |
| 2 | **壳 `OnBracketCreatedEvent`**：在壳上认定 body 括号 | `interface-declaration-shape.xl.md:68-96` | 判据必须与既有 `TypeBuilder.IsBodyBrace` / `IsDefinitelyBodyBracket` 同口径（尖括号深度、前一代码单元不能是「后面还能接类型」的位置），否则 `function f(): {a:A} {}` 这类会把返回类型对象字面量当 body |
| 3 | **body 括号挂 `CatalogGuide(成员候选)`** | `interface-declaration-shape.xl.md:94` | 目录只建一份、静态缓存、所有 body 括号共用（`CreateBodyPossibleShapes` `:129-150`）；判定状态在各 `CatalogGuide` 自己的缓存里，不能跨 body 共享 |
| 4 | **壳的终结候选 `*-end-possible-shape`** | `interface-declaration-end-possible-shape.xl.md` 全文 | 只有 body 括号闭合后向导才装上（`:24`），所以终结判定可以只看「当前格是不是已闭合的 `{`」；`BuildByIndex` 里要 `splice` 顶替壳并清 `parent.MountedUnit`（`:54-64`） |
| 5 | **`BuildFromCode` 收口**：从壳 `Data`（头部单元 + body 括号）建完整形状 | `interface-declaration-shape.xl.md:174-346` | class/enum 现有的是 `FromUnits(host, start, tokenIndex)`（按 host.Data 下标），**壳化后必须新增/改成按「已排好的 code 数组 + pos」的入口**，否则壳的 `Data` 下标口径对不上（壳里没有 trivia，host.Data 里有） |
| 6 | **`MountedUnit` 挂载/卸载** | 挂：possible `:253`；卸：end-possible `:61-63` | `Token.Quit` 会清 `Parent.MountedUnit`（`core/syntax/token.xl.md:159-168`）；`Token.Replace` 会把 `MountedUnit` 转给替身（`:289-310`）。壳收口用 `splice` 而非 `Replace` 时**必须手动清 `MountedUnit`**，否则后续字符被送进已顶替的旧壳 |
| 7 | **`Pos` 口径 + ASI/换行守卫** | `Pos`：possible `:239-250` / `:223`；ASI：`:55-70`、`:112-126` | `Pos = 前一个非 trivia 单元的 End.Index + 1`（`final docs §3.1`、IMPORTANCE §4）；壳在建壳时就定 `Pos`，收口直接沿用（end-possible `:43` 注释）。ASI 守卫必须在**提前 Accept 之前**判完（决定要不要进壳），进壳之后 `declare` / `abstract` 的 ASI 语义已被 `BuildFromCode` 的头部处理接管 |

**额外一条（不属七件套但决定成败）：成员候选目录必须对任意合法成员头给出非空 `Kinds`。** `CatalogGuide` 在「0 候选且无终结候选」时直接抛错（`catalog-guide.xl.md:102-107`）；interface 的 body 目录没有终结候选（`:94` 只传 shapes），所以 7 类候选必须覆盖对象类型成员的全部语法。class / enum 推广时同样要保证分类函数**全函数性**，否则一个没见过的成员头就会在 body 中途炸掉（见 §8.4 的兜底建议）。

---

## 3. 候选清单总表

风险等级：**低** = 只复用既有成员建造器、成员语法封闭；**中** = 需要新的成员判型工具、恢复形多；**高** = 连带需要语句/类型层的增量或两处壳化；**不建议** = 结构性不匹配或收益不成立。

| 候选 | 现状 | 最小重构 | 新增/修改文件（预估） | body 成员候选 | 风险 |
|---|---|---|---|---|---|
| **enum 声明** | 原子型：等 body 括号闭合后 `EnumDeclarationShape.FromUnits` 一次建（possible `:243-254`） | 提前 `Accept`（`enum` / `const enum` / `declare [const] enum`）+ 壳 + `EnumMemberPossibleShape` + `EnumDeclarationEndPossibleShape` + `BuildFromCode` | 改 2 / 增 2（见 §3.1） | **1 类**：`EnumMemberShape`（名字 = Identifier / StringLiteral / NumericLiteral / ComputedPropertyName，可选 `= 初始化器`） | **低** |
| **class 声明** | 原子型：`ClassDeclarationShape.BuildMembers` 一次解析（class-shape `:697`），候选等 body（possible `:210-230`、`:244-262`） | 同上，但成员判型复杂（修饰词、`get`/`set` 消歧、`static`、值初始化器、ASI）+ 8 类候选 | 改 2 / 增 ≥8（见 §3.2） | **8 类**：PropertyDeclaration / MethodDeclaration / Constructor / GetAccessor / SetAccessor / ClassStaticBlock / SemicolonClassElement / IndexSignature | **中高** |
| **type literal** | `TypeBuilder.ParseTypeLiteral` 直建（type-builder `:911-947`）；`TypeLiteralPossibleShape` 是 `throw` 桩且**未注册进任何目录** | **不建议按 body-guide 推广**；若要做增量，是「TypeBuilder 拆 `BuildMembers` + 调用方壳化」另一课题 | 见 §4.4 | 可复用对象类型 **7 类**（与 interface 完全相同） | **不建议（本轮）** |
| **module block / namespace** | 原子型 + 体是**语句/声明**混合，由 `ModuleBlockShape.BuildMember` 的分派树建（module-block `:95-729`） | module 声明提前 Accept 壳化 **且** 体上挂「语句/声明增量目录」；两层改造 | 改 4+ / 增 ≥3（见 §3.4） | Statement / Import / Export / Class / Interface / Enum / Function / Module / TypeAlias 等（≈9 类，且必须与 `BuildMember` 分派树同口径） | **最高** |
| **function 声明** | 原子型；参数表/返回类型由 `TypeBuilder` 在 build 期解析，body 是语句块 | function 壳化 + body（Block）增量 + 无体/重载/ASI 拆分（`SplitDeclare` / `SplitAt`）迁移 | 改 3+ / 增 ≥2（见 §3.5） | 语句（`StatementPossibleShape` 等）——即 module 体的同一难题 | **高** |
| object literal | 只有 `ObjectLiteralExpressionShape` 构造器（`object-literal-expression-shape.xl.md:9-19`），无 `FromUnits`/`BuildMembers` | 不适用（表达式字面量整体尚未实现） | — | — | **放弃** |
| class static block | `ClassStaticBlockDeclarationPossibleShape` 是桩；体在 class body 内，父级是 body `Bracket`（事件到 `Bracket` 就停） | 只能等 class body 增量先有；自身体是语句块 | — | — | **放弃（本轮）** |
| switch case / try catch / case block | 同名 possible-shape 均为桩（`try-statement-possible-shape.xl.md:15-24`、`module-block-possible-shape.xl.md:15-25` 等） | 属语句层增量，不是「声明壳」问题 | — | — | **放弃（本轮）** |

### 3.1 enum declaration（第一个落地，最低风险）

**现状**：`EnumDeclarationPossibleShape` 的 `Stage` 机器（`:20-38`）一直走到 `Stage 3` 见到 body `{` → `Stage 4` / `Done`，`IsBuildable` 要求 `DoneAt === tokenIndex`（`:236-241`），`BuildByIndex` 一次性调 `EnumDeclarationShape.FromUnits`（`:243-254`）。`FromUnits` 里完成装饰器 / `declare` / `const` 修饰词、名字、body 括号、成员切分（`enum-declaration-shape.xl.md:61-198`）。

**最小重构**：

1. `EnumDeclarationPossibleShape`：`enum` 关键字格（含 `declare` / `const` / `@dec` 前缀的既有状态机）即置 `state.Done` 并 `Accept`；不再需要 `Stage 2`（等名字）/`Stage 3`（等 body）/`Stage 4`。`BuildByIndex` 改为「把 `state.Start..tokenIndex` 搬进 `EnumDeclarationShape` 壳并 `host.MountedUnit = shell`」——直接照抄 interface possible `:225-254`，只是壳类型不同。
2. `EnumDeclarationShape`：新增 `OnBracketCreatedEvent`（认领枚举体 `{`；枚举头的「可疑位置」比 interface 少：前一代码单元是名字，尖括号深度为 0 即可，但仍建议走共享判据）、新增 `static BuildFromCode(host, code, pos, context)`（把现有 `FromUnits` 的 `code` 版本抽出，供壳收口与 `FromUnits` 共用）、新增 `static CollectBodyMembers`（与 interface `:366-443` 同构：预算集已建成员，raw 尾巴回退 `BuildMembers`）。`BuildMembers` / `BuildMember` 保持不动。
3. 新增 `EnumDeclarationEndPossibleShape`：照抄 interface end（`:26-66`），判「当前格是已闭合 `{`」→ `BuildFromCode` → `splice` → 清 `MountedUnit`。
4. 新增 `EnumMemberPossibleShape`：成员判型极简——条目起点（`ItemUtil.ItemStart`）之后，名字是第一格（Identifier / String / Numeric / `[` 计算名括号）；遇到条目内**顶层** `,` 或换行后下一成员首格 / 容器收口字符 → `Accept`；`BuildByIndex` 从共享扫描取出 `[start, end]`，调 `EnumDeclarationShape.BuildMember` 同一建造器（建议把它从 `private static` 提升为包内可见，或复制其分派到新候选并保持同口径）。注意：枚举初始化器是**任意表达式**，切分只认「顶层 `,` Symbol」，嵌套括号/字符串都是单个 Unit，所以与现 `BuildMembers` 的顶层逗号切分天然同口径（`enum-declaration-shape.xl.md:202-223`）。

**新增/修改文件清单**：
- 改 `typescript/tokens/declarations/enum-declaration-possible-shape.xl.md`
- 改 `typescript/tokens/declarations/enum-declaration-shape.xl.md`（`OnBracketCreatedEvent` / `BuildFromCode` / `CollectBodyMembers`；`BuildMembers` 可见性）
- 增 `typescript/tokens/declarations/enum-declaration-end-possible-shape.xl.md`
- 增 `typescript/tokens/members/enum-member-possible-shape.xl.md`（目录按现有 `typescript/tokens/members/` 放；若 T3 定了新目录由 T3 定）

**body guide 成员候选**：`[EnumMemberPossibleShape]`。**风险低**：成员语法封闭（无修饰词链、无值初始化器的 ASI、成员间只有逗号）；`BuildMembers` 已有且逻辑简单。

**可独立验收的门禁点**：
- `tests/body-guide/harness.mjs --only=EnumMemberPossibleShape`：用 monkeypatch 把 `EnumDeclarationShape.CreateBodyPossibleShapesCache` 裁成 `[EnumMemberPossibleShape]`，逐节点对比 `ts.createSourceFile`（参考 `tests/member-possible/harness.mjs`，见 `member-possible-design.md:243-276`）；
- 7 项门禁（§8），特别盯 `declarations.ts` / `dts-types.ts` / `possible-build.ts` / `end-declarations.ts` 的枚举用例（含 `declare const enum`、`@dec enum`、计算名、字符串/数字名、尾随逗号）。

### 3.2 class declaration（主体工程，8 类成员）

**现状**：`ClassDeclarationPossibleShape` 的 `Stage` 机器（`:19-40`）到 `Stage 3` 见到类体 `{`（`:210-230`）后 `Done`，`BuildByIndex` 走 `ClassDeclarationShape.FromUnitsAllowAnonymous`（`:251-262`）。注意 `:51` 的注释「类体非空时本候选主动 `Reject`——类成员还没实现」是**过期注释**：`:216-221` 的现行代码已接受非空类体，成员由 `ClassDeclarationShape.BuildMembers`（class-shape `:697`）解析，`:64-69` 文档也确认 5 类成员已实现。壳化前建议顺手修掉这条误导性注释。

**最小重构**：

1. `ClassDeclarationPossibleShape`：`class` 关键字格即 `Accept`（保留 `declare` / `abstract` / `export` / `default` / 装饰器前缀与 `HasLineBreakBefore` ASI 守卫，`:53-69`、`:150-159`）；`BuildByIndex` 改为建 `ClassDeclarationShape` 壳并挂载。
2. `ClassDeclarationShape`：新增 `OnBracketCreatedEvent`——判类体 `{`：尖括号深度为 0、前一代码单元不是 `extends` / `implements`（heritage 里可以有对象类型？TS 里 `implements {a:A}` 非法，但泛型实参里的 `{}` 是类型字面量；`extends A<{x:B}>` 里的 `{` 深度 > 0 已被挡掉）。建议直接用共享判据 + 每族「blocked words」参数（class = `extends` / `implements` / `,`），与 interface 同口径。新增 `static BuildFromCode(host, code, pos, context)` 与 `static CollectBodyMembers`（与 interface 同构）；`BuildMembers` 保持不动。
3. 新增 `ClassDeclarationEndPossibleShape`（同 interface end）。
4. 新增 8 个成员候选（目录缓存 `ClassDeclarationShape.CreateBodyPossibleShapes`）。**共享判型工具是成败关键**：class 成员与对象类型成员语法不同（修饰词、值初始化器、方法体、访问器、constructor、static block、裸 `;`、索引签名），不能复用 `MemberPossibleUtil` 的 `ClassifyHead`，需要新的 `ClassMemberPossibleUtil`（判型 + 边界 + 共享 `ClassMemberPossibleScan`），并保证：
   - 修饰词消歧与 `ClassDeclarationShape.BuildMembers` 的 `parseModifiers` 三档判据**逐条对齐**（`class-declaration-shape.xl.md:773-809` 的注释已把 `static` 不跨换行、`get`/`set` 不跨换行、其余修饰词 `nextTokenIsOnSameLineAndCanFollowModifier` 三档写清）；
   - 方法/构造/访问器的函数体是**已闭合 `{}` 括号**单元或单语句，边界判据要覆盖 `;`、闭合 `}`、换行 ASI、函数体结束；
   - 属性初始化器是表达式（`= <expr>`），表达式可能以 `{` / `(` / `[` / `<` / 换行敏感；`a = b` ⏎ `c()` 是两条成员（TS 不插 ASI 的地方要逐条照 `BuildMembers` 现状）；
   - 保留 `MemberParsedWhole` 式兜底：`BuildByIndex` 读不完整段 → 不建、不 `splice`，raw 留给收口时 `ClassDeclarationShape.BuildMembers` 重建（`member-possible-design.md:58-64`、`:310-328` 的 `residual` / 非法恢复教训）。
5. 8 类候选：`PropertyDeclarationPossibleShape`、`MethodDeclarationPossibleShape`、`ConstructorPossibleShape`、`GetAccessorPossibleShape`、`SetAccessorPossibleShape`、`ClassStaticBlockDeclarationPossibleShape`、`SemicolonClassElementPossibleShape`、`IndexSignaturePossibleShape`。
   - 注意 `typescript/tokens/expressions/semicolon-class-element-possible-shape.xl.md` **已存在同名文件**（本次未核实是否桩，T6 动手前先读）；其余 7 类无同名 possible 文件，全部新建。
   - 索引签名在 class 体里与 `PropertyDeclaration` 形态相近但 `IndexSignature` 是独立 AST 节点，候选可独立，也可由 Property 候选按 `[k: string]:` 前缀分支建 `IndexSignatureShape`——推荐独立候选，保持「一个候选只建一种形状」的断言风格（`member-possible-design.md:169-182`）。

**新增/修改文件清单**：改 `class-declaration-possible-shape.xl.md`、`class-declaration-shape.xl.md`；增 `class-declaration-end-possible-shape.xl.md`；增 `class-member-possible-util.xl.md`（或并入 T3 的共享帮助类）；增 8 个 `*-possible-shape.xl.md`（`SemicolonClassElement` 那份先复用/改造）。

**风险中高**：成员多、修饰词/ASI/值初始化器边界复杂、AST 节点种类多（8 类），且 `class` 出现在根、模块体、语句位、`export default`、表达式 `class {}`（`ClassExpressionPossibleShape` 是另一条路径）——**壳化只针对「声明」候选；`class` 表达式必须继续走 `ExpressionBuilder`，两条路不能串**。

**可独立验收的门禁点**：
- `harness --only=<某一类>` 逐类 0 fail，再 `--only=` 全部 8 类 0 fail；
- 逐类 AST 断言：`BuildByIndex` 产出类型必须是自己那一类（`instanceof`），不匹配 `throw`；
- 7 项门禁，特别盯 `declarations.ts`、`members.ts`、`class-expressions.ts`、`export.ts`（`export default class`）、`dts-types.ts`、`end-declarations.ts`。

### 3.3 module block / namespace（最高风险，建议延后）

**现状**：`ModuleDeclarationPossibleShape` 是**原子型**，且是「根级」候选：它把 `namespace N { … }` 当成一条 item 整体扫（`Scan` `:51-136`），到齐后 `BuildByIndex` 一次建（`:261-303`），体由 `ModuleBlockShape.FromBracket`（`module-block-shape.xl.md:64-93`）+ `BuildMember` 那条巨型分派树（`:95-729`，含 export / default / declare / abstract 修饰词、import / export 各种形、无分号 ambient 收口、合成零宽 `;`、`Pos` 重锚）建。

**为什么最高**：
1. **要两层改造**：module 声明本身要壳化（提前 `Accept` + `OnBracketCreatedEvent` 认领体括号），**同时**体上还要挂一个「语句/声明增量目录」——后者等于把 `BuildMember` 的分派树逐条改写成 possible 候选 + 边界判据。这不是复用 interface 的「成员 = 对象类型成员」一维语法，而是整个语句层。
2. **成员边界不是一种语法**：`let x = 1` 的 ASI、`export * from`、无分号 ambient 声明的换行收口、`declare module "m" { … }` 的合成 `;`——每一条都要与 `ModuleBlockShape.BuildMember` / `StatementBuilder` 同口径，任何偏差都是 AST 差异。
3. **收益可疑**：模块体通常体量有限；巨型 namespace 在 `.d.ts` 里存在，但 `real-dts-ast` 的 226 份语料是当前唯一压力面，是否值得为它引入一层语句级增量，需要 T4 基准先给出「module body 的实际耗时占比」再决定。

**如果一定要做（最小可行）**：先只做「module 声明壳化」（`namespace` / `module` / `declare global` 关键字提前 `Accept` + 壳 + `EndPossible`），**体仍走 `ModuleBlockShape.FromBracket` 一次性建**——这样能验证事件通道与收口口径，但不产生成员增量收益。真正的增量需要第二批（语句级 `CatalogGuide`），建议作为独立课题重新评估。

### 3.4 function declaration（风险高，建议放弃本轮）

**难点**：
1. 头部要壳化：`function` 之后的 `*` / 泛型 `<...>` / 名字 / 参数表 `(…)` / 返回类型：`类型` 都要由壳吃——但**参数与返回类型现在是 `TypeBuilder` 在 build 期解析的**（`function-declaration-shape.xl.md` 的 `FromUnits`；`TypeBuilder` 的 `ParseParameter` / `ParseType`），壳化后必须新增「参数表 / 返回类型增量入口」，或在收口时仍用 `TypeBuilder` 一次性解析参数表与类型——后者可行（壳只负责吃字符、把参数表括号与返回类型单元攒进 `Data`），但**返回类型里的 `{…}` 不能被误认为函数体**，要沿用 `TypeBuilder.IsBodyBrace`（`module-block-shape.xl.md:537-538` 已在用）。
2. body 是语句块：`StatementBuilder` 一次性建，增量需要语句级候选（与 module 同一难题），而函数的体通常短，收益最低。
3. 无体 / 重载 / ASI：现有候选里 `SplitDeclare` / `SplitAt` / `NoNewlineBefore` / `IsDecoratedDeclarationStart` 的整套 ASI 逻辑（`function-declaration-possible-shape.xl.md:33-35`、`:143-154`、`:296-329`）需要在壳化后重新安放（壳没有 `ComputeByIndex`；只能塞进 `EndPossible`，而 `EndPossible` 看不到「还没关闭的 `{` 之前」的字符序列判定）。**这是本候选最容易被低估的风险**。

结论：**本轮放弃**。若将来要提升函数体解析性能，正确切入点是「`StatementBuilder` 内部增量」而不是 `OnBracketCreatedEvent` 推广。

### 3.5 其它：明确放弃清单及理由

| 形态 | 为什么不做 |
|---|---|
| type literal | 不是 `OnBracketCreatedEvent` 的适用面（§4.4）：它在**已闭合括号**上由 `TypeBuilder` 建，没有字符流时点；且 `TypeLiteralPossibleShape` 未注册，没有「壳」可言 |
| object literal | `ObjectLiteralExpressionShape` 只有构造器（`:9-19`），表达式字面量整体尚未实现；且它是表达式层，不是声明壳 |
| class static block | 父级是 class body `Bracket`，事件到 `Bracket` 就停（`bracket.xl.md:142`）；自身体是语句块。只能作为 class body 8 类成员之一，不能独立吃括号事件 |
| switch case / try catch / case block | 同名 possible-shape 是桩（`try-statement-possible-shape.xl.md:15-24`、`module-block-possible-shape.xl.md:15-25`）；属语句层增量，与「声明壳」无关 |
| interface 的「嵌套 body」 | 不需要：壳已认定 body 后，嵌套括号父级是 body 括号（`interface-declaration-shape.xl.md:60`），事件本来就不该回到壳 |

---

## 4. TypeLiteral 专节（核实结论）

### 4.1 谁在什么地方建 type literal

- **唯一建造器**：`TypeBuilder.ParseTypeLiteral(bracket, start)`（`typescript/tokens/types/type-builder.xl.md:911-947`）。
- **入口**：`TypeBuilder.ParseType` 遇到 `{` 括号单元时 `this.At++` 后调用（`:642-658`），即**任何类型位**：`type T = {…}`（`TypeAliasDeclarationShape.FromUnits` → `TypeBuilder`）、`interface I { a: {…} }`（`ParseTypeMember` → `ParseType`）、函数参数/返回值、泛型实参、`as {…}`、`satisfies {…}` 等。
- **输入形态**：`bracket` 是**已经闭合**的 `Bracket` 单元（`ParseTypeLiteral` 直接读 `bracket.Data`，`:921-935`，并用 `bracket.SourceRange.Start/End` 签范围 `:938-943`）。
- `TypeLiteralPossibleShape` 现状：`ComputeByIndex` / `BuildByIndex` 双 `throw`（`type-literal-possible-shape.xl.md:15-24`）；**`git grep` 显示它没有被任何 `new CatalogGuide(...)` 引用**（全仓 6 处 `new CatalogGuide`：`source-file-shape.xl.md:65`、`export-declaration-shape.xl.md:53`、`import-declaration-shape.xl.md:62`、`import-clause-shape.xl.md:37`、`interface-declaration-shape.xl.md:94-95`），是**未注册的死代码**。

### 4.2 为什么它不适合 `OnBracketCreatedEvent` 推广

1. **时点不匹配**：`ParseTypeLiteral` 执行时 body `{` 早已关闭（括号是一个完整 Unit）。字符流上 `{` 创建那一刻，还没人知道它是类型字面量（要看到所在的类型上下文），`Transit` 的 `unit` 是根 / 外层括号（§1.2），没有「类型字面量壳」。
2. **没有 O(n²) 痛点**：`TypeBuilder` 是「一次 Load、一次解析」的批处理，不会每字符重算候选，所以 body 增量对它没有性能收益；它的开销来自语法量大，而不是判定重复。
3. **AST 口径风险**：`TypeLiteralShape` 只有 `Members` 字段和构造器（`type-literal-shape.xl.md:24-29`），**没有 `BuildFromCode` / `BuildMembers`**；成员收集内联在 `ParseTypeLiteral` 的 while 循环里（`:928-936`）。要做增量必须先把这段抽成 `static BuildMembers` / `CollectBodyMembers`，属于 `TypeBuilder` 改造。

### 4.3 如果仍要做增量（独立课题，而非 body-guide）

两条可行路线，均**不推荐本轮做**：

- **路线 A（推荐给将来）**：不碰 `OnBracketCreatedEvent`，改为在 `ParseTypeLiteral` 内部「按成员边界预扫」——即把 `MemberPossibleUtil` 的 `FindTypeMemberBoundary` 用在 `bracket.Data` 上，逐个成员跑 `ParseTypeMember`，而不是一个 while 循环里反复 `Peek`。这是纯 `TypeBuilder` 内部优化，语义等价、风险可控。
- **路线 B（不建议）**：给「类型上下文」也建壳（例如 `TypeAliasDeclarationShape` 提前 Accept 后，在 `=` 之后挂一个类型层 guide）。它需要一套「类型候选目录」，远超本轮范围。

### 4.4 现有 7 个对象类型成员候选能否复用

**能，而且本来就是同一套**：interface body 的 `CreateBodyPossibleShapes`（`interface-declaration-shape.xl.md:129-150`）就是对象类型成员 7 类；`docs/member-possible-design.md:128-182` 的判型表与 `TypeBuilder.ParseTypeMember` 同口径，明确覆盖「对象类型成员」。type literal 的成员与 interface 成员是同一套语法（接口体 `Bracket.Data` 与类型字面量 `{…}` 内容同口径，见 `interface-declaration-shape.xl.md:41-44`）。
⇒ 如果走路线 B / 将来给 type literal 挂 guide，直接复用 `InterfaceDeclarationShape.CreateBodyPossibleShapes()` 的 7 个候选与 `MemberPossibleUtil` 即可，**不需要新候选**；需要新增的是「谁在 `{` 创建时认出这是类型字面量并挂 guide」——正是缺的那一环。

---

## 5. 推荐实施顺序与依赖

### 5.1 顺序图

```
integration-1（interface 基线）
        │
        ▼
[1] body-foundation（T3）        共享帮助类 + 契约 + harness 骨架
        │
        ├──────────────┬──────────────────────────┐
        ▼              ▼                          ▼
[2] body-enum(T5)  [3] body-class(T6)       （延后）body-module(T8，T9 起评）
        │              │
        └──────┬───────┘
               ▼
        integration-2（merge，全量门禁）
               │
               ▼
     （可选，独立课题）type literal 增量 / module 语句增量
```

### 5.2 每步的改动文件、风险与门禁

| 步 | 分支 | 改动文件（预估） | 风险 | 独立验收 |
|---|---|---|---|---|
| 1 | `body-foundation`（T3） | 增 `typescript/tokens/declarations/body-guide-util.xl.md`（§7 的接口）；增 `docs/body-guide-contract.md`（成员候选契约，照 `member-possible-design.md` 的写法）；增 `tests/body-guide/harness.mjs`；**不改任何现有 shape** | 低（新文件 + 文档） | `xl_check` 0 error、`tsc` 0；harness 对 interface 现有 7 候选跑 `--all` 与 `--only=...` 全过（证明工具不改变既有行为） |
| 2 | `body-enum`（T5） | §3.1 的 2 改 2 增 | 低 | harness 枚举组 0 fail；7 门禁 |
| 3 | `body-class`（T6） | §3.2 的 2 改 1 增 1 工具 + 8 候选 | 中高 | harness 8 类逐类 + 联合 0 fail；7 门禁 |
| 4 | `body-module`（T8，**延后/放弃**） | 若要试：module 声明壳化（2 改 1 增），体仍原子 | 最高 | 仅壳化也算一次可验收增量（事件与收口口径），但**没有性能收益** |
| — | type literal / function / static block / switch / try / object literal | **不做**（§3.3-3.5） | — | — |

**并行关系**：步 2 与步 3 在步 1 冻结共享工具后**可并行**，写文件不重叠（enum 与 class 各自文件 + 各自的 end-possible）；两者都依赖步 1 的 `BodyGuideUtil` 接口签字，所以步 1 必须先合并。步 3 依赖步 2 的经验（共享帮助类是否够用），建议 body-enum 合入 integration 后再开 body-class 的最终实现（可先并行做判型工具原型）。

### 5.3 放弃/延后清单与理由（明确写死）

- **type literal**：不是 `OnBracketCreatedEvent` 的适用面；`TypeLiteralShape` 缺 `BuildFromCode` / `BuildMembers`；`TypeLiteralPossibleShape` 是未注册死桩。**本轮放弃**；如要提升类型解析性能，改做 §4.3 路线 A（`TypeBuilder` 内按成员预扫），并另立课题。
- **module block / namespace**：需两层壳化（声明 + 语句层增量），成员是语句/声明混合、分派树 700+ 行（`module-block-shape.xl.md:95-729`），风险与收益不成比例。**本轮延后**；是否做由 T4 基准里 module body 的耗时占比决定。
- **function declaration**：参数/返回类型在 build 期由 `TypeBuilder` 解析、体是语句块、ASI 拆分逻辑（`SplitDeclare` / `SplitAt`）难以搬进 `EndPossible`。**本轮放弃**。
- **object literal / class static block / switch case / try catch**：表达式/语句层，或父级是 body `Bracket`（事件到 `Bracket` 停），或 possible 层整体未实现。**放弃**。

---

## 6. 共享抽取建议（T3 `body-foundation` 照此实施）

### 6.1 为什么必须抽

interface 里的 `CreateBodyPossibleShapes` / `IsDefinitelyBodyBracket` / `CollectBodyMembers` 是**通用管线**（挂目录、认 body 括号、收成员、收口），只是目前私有地长在 `InterfaceDeclarationShape` 上（`:129-150`、`:98-127`、`:366-443`）。enum/class 若各抄一份，会出现三份「判 body 括号」和「收成员」的漂移风险，而这两处正是 AST 差异的高发点。**T3 的目标是让 interface 的既有行为逐字节不变**（先做纯抽取 + 委托），再让 T5/T6 只写「本族差异」。

### 6.2 建议新增文件与接口

新增 `typescript/tokens/declarations/body-guide-util.xl.md`（放 declarations 下，紧邻 interface / class / enum / module；只 import `core` 与 `CatalogGuide` / `PossibleShape` / `Bracket` / `Token`，**不 import 具体声明形状**，避免 require 环）：

```ts
# class BodyGuideUtil

## static method BasePos:(host:Token, start:int)=>int
// 条目 / 壳的 Pos：start 之前最近一个非 trivia 单元的 End.Index + 1（没有就是 0）。
// 与 InterfaceDeclarationPossibleShape.BuildByIndex(:239-250)、BuildFromCode(:178)、
// MemberPossibleUtil.BasePos 同一口径。

## static method IsBodyBracket:(shell:Token, bracket:Bracket, blocked:Array<string>)=>bool
// 在壳的 Data 里判定「这个新括号肯定是我的 body」：
//   - 不是 `{` → false；
//   - 尖括号深度（AngleJudge.ScanDepth，`>>`/`>>>` 按层拆）不为 0 → false；
//   - 前一代码单元文本 ∈ blocked（interface: extends/implements/,；class 同；
//     module 为空；enum 可空）→ false。
// 由 InterfaceDeclarationShape.IsDefinitelyBodyBracket(:98-127) 泛化而来。

## static method MountBodyGuide:(bracket:Bracket, shapes:Array<PossibleShape>)=>CatalogGuide
// bracket.CatalogGuide = new CatalogGuide(shapes); 返回该 guide（便于断言 / 测试）。

## static method MountShell:(host:Token, start:int, tokenIndex:int, shell:Token, context:SyntaxContext)=>Token
// 把 host.Data[start..tokenIndex] 的单元搬进 shell（Add + Parent）、按 BasePos 定 shell.Pos、
// host.Data.splice(start, n, shell)、host.MountedUnit = shell。返回 shell。
// 由 InterfaceDeclarationPossibleShape.BuildByIndex(:225-254) 泛化而来；壳的 SignIn 用首单元。

## static method CollectBodyMembers:(host:Token, bracket:Bracket, context:SyntaxContext,
//                                rawFallback:(host:Token, bracket:Bracket, context:SyntaxContext)=>Array<Token>)=>Array<Token>
// 由 InterfaceDeclarationShape.CollectBodyMembers(:366-443) 原样泛化：
// 预算集已建成员形状 → 丢弃 trivia 与残留 `;`/`,` → 遇 raw basic token 截断，
// 只把这一截 raw 交给 rawFallback（各族的 BuildMembers）逐成员建，再拼接。
// 这样「增量建出的成员」与「raw 尾巴」两条路径的 AST 逐节点一致。

## static method FinishShell:(host:Token, shell:Token, built:Token)=>void
// 把壳在 host.Data 里原地 splice 成 built，built.Parent = host，
// 并在 host.MountedUnit === shell 时置 null。由 interface end-possible(:39-66) 泛化。

## static method CreateShapesCache:(cacheRef:Array<PossibleShape> | null, factory:()=>Array<PossibleShape>)=>Array<PossibleShape>
// 各族的「目录只建一份」缓存（interface :129-150 的同款），可选；也可由各族自己保留静态字段。
```

**刻意不抽的部分**（各族自己保留）：
- 成员判型（`MemberPossibleUtil` 只服务对象类型成员；class 需要独立 `ClassMemberPossibleUtil`；enum 极简，直接写在候选里）；
- 壳的头部语义（名字 / 类型参数 / heritage / 修饰词）：各声明形状自己的 `BuildFromCode`；
- 每族的 `blocked` 单词表与 `CreateBodyPossibleShapes` 名单。

### 6.3 T3 的验收（纯抽取不改变行为）

1. `InterfaceDeclarationShape` 的三个私有工具改为**委托** `BodyGuideUtil`，函数体逐字等价；
2. `IsDefinitelyBodyBracket` 保留为薄委托（或直接删、调用点改调 util——但为减少合并冲突建议保留）；
3. 7 项门禁全绿，且 `ast-json-diff` 必须 **0 结构差 / 0 位置差 / 0 字段差**（纯重构不应有任何 AST 变化）；
4. `tests/body-guide/harness.mjs` 提供 `--all` / `--only=` monkeypatch（照 `tests/member-possible/harness.mjs`），先只覆盖 interface，作为 T5/T6 的验收底座。

---

## 7. 验收口径（每个候选分支合并前）

### 7.1 7 项门禁（工作流 §2，缺一不可）

```
xl_build(cwd=<克隆>, paths=["core","typescript"], targets=["ts"], out="dist")   # 0 error
node node_modules/typescript/bin/tsc.cmd -p tsconfig.json                       # 0 error
node typescript/cases/ast-json.mjs              # 6167（+本分支新增用例 N）
node typescript/cases/ast-json-diff.mjs         # 0 结构差 / 0 位置差 / 0 字段差
node typescript/cases/token-ast.mjs --quiet     # 不差于基线 1715 total / 1705 ok / 0 crash
node tests/parse/validate.mjs                   # 1719 条 / 0 不合格
node typescript/cases/real-dts-ast.mjs          # 226/226
xl_check(cwd=<克隆>, paths=["core","typescript"], targets=["ts"])               # 0 error
```

**AST 逐节点一致是唯一硬约束**：壳化只允许改变「什么时候建」，不允许改变「建成什么」——成员仍只由既有建造器（`TypeBuilder.ParseTypeMember` / `ClassDeclarationShape.BuildMembers` / `EnumDeclarationShape.BuildMember`）产出，区间 / `Pos` / `End` / 文本口径一律不变。

### 7.2 需要特别盯的既有用例 stem

| stem | 盯什么 |
|---|---|
| `declarations.ts` | class / enum / interface 的 base + trivia + 重复形（成员多条、修饰词叠加） |
| `members.ts` | 成员语法全表（属性 / 方法 / 访问器 / 索引 / 计算名 / 可选标记） |
| `module-blocks.ts`、`module-declarations.ts` | module 壳化若尝试，这里最先红 |
| `end-declarations.ts` | 声明收口（`;` / `}` / EOF / ASI）——壳 `EndPossible` 的直接压力面 |
| `dts-types.ts`、`dts-recovery.ts` | `.d.ts` 里 ambient / `declare` 组合，enum/class 高频 |
| `types.ts`、`types` 相关（`dts-types`） | type literal 成员与对象类型；T7 若动 `TypeBuilder` 必看 |
| `possible-build.ts`、`possible-compute.ts`、`missing-possible.ts` | 候选 Accept/Reject 时机与「没有候选」抛错 |
| `class-expressions.ts` | `class {}` 表达式路径不能被声明壳化串到 |
| `export.ts`、`export-functions.ts` | `export default class` / `export class` 的修饰词与壳化提前 Accept 的交互 |
| `asi-import-boundary.ts`、`end.ts` | ASI/换行守卫（`declare` ⏎ `class`） |
| `real-dts-ast.mjs` 的 226 份 `lib.*.d.ts` | interface/class/enum 巨型语料，壳化回归的总测 |

### 7.3 分支级门禁点（可在 7 门禁前独立验收，便于并行）

1. **壳挂载**：断言在 `class` / `enum` 关键字格后 `host.MountedUnit === shell`、壳在 `host.Data` 末尾；
2. **body 认领**：断言 `shell.BodyBracket === 那个括号`、`bracket.CatalogGuide !== null`，反面用例（heritage 里的 `{}`、尖括号里的 `{}`、`extends` 后的 `{}`）不认领；
3. **成员增量**：`harness --only=<候选>` 0 fail；再 `--only=` 本族全部候选 0 fail；
4. **收口**：壳被完整形状顶替、`parent.MountedUnit` 清空、`Pos` 与整段 `FromUnits` 完全一致；
5. **恢复形**：非法/残缺源码（`class C { a = 1 b = 2 }`、`enum E { A B }`）走 `CollectBodyMembers` 的 raw 兜底，不抛新错、AST 与基线一致（照 `member-possible-design.md:310-328` 的教训，先跑基线探针对比）。

---

## 8. 风险登记与开放问题

1. **`CatalogGuide` 0 候选抛错**（`catalog-guide.xl.md:102-107`）：class body 的成员判型若出现未覆盖的头（例如 recovery 形），会直接抛。缓解：判型函数保持**全函数性**（默认返回 `Property|Method` 两可），并保留 raw 尾巴兜底；建议在 T3 的契约文档里把「所有成员头必须落在某类 Kinds 里」写成硬性要求。
2. **`EndPossible` 与候选共存的抛错**（`catalog-guide.xl.md:91-95`）：壳的目录是 `[]` + end，body 目录是 candidates + 无 end——两者语义不同，不能混用（T3 的 `MountBodyGuide` / 壳的 `new CatalogGuide([], end)` 要分开两个帮助方法，避免误用）。
3. **body 最后一个成员的收口时点**：body `}` 关闭**不会**触发 body 自己的目录（`Bracket.Close` 只问父 = 壳），所以候选必须靠「下一个字符是容器收口字符」证据提前 `Accept`（`member-possible-design.md:72-77`）。class/enum 候选必须照抄这条，不能等 `}`。
4. **壳化与 `IsBuildable` 的交互**：提前 `Accept` 后，候选在 body 出现前就是唯一候选且 `IsBuildable` 为真 → 立即建壳。若同格还有其它候选（装饰器前缀状态机下），`CatalogGuide` 会等它们 `Reject`（interface 的 `@dec interface` 就是这样，见 `interface-declaration-possible-shape.xl.md:212`）。T5/T6 的候选状态机要保证「提前 Done」与「装饰器/修饰词尚未定」能共存。
5. **`Pos` 双口径**：壳建时定 `Pos`（`BodyGuideUtil.BasePos`），收口直接沿用；`BuildFromCode` 内部各子形状的 `Pos` 仍按「同层前一个非 trivia 单元」算——class/enum 的 `BuildFromUnit` 已有大量「模块体首成员 Pos 会算成 0、由上层 Positions 重锚」的经验（`module-block-shape.xl.md:579-595`、`:705-718`），壳化后 `BuildFromCode` 拿到的 `code` 数组里**没有 trivia**，这些重锚逻辑要逐条核对。
6. **`export` / `default` 修饰词的位置**：`export default class` 的 AST children 是 `[ExportKeyword, DefaultKeyword, …]`，`FromUnits` 已经处理（`class-declaration-shape.xl.md:187-230`、`:305-338`）。壳化后这些修饰词在壳 `Data` 里，`BuildFromCode` 的头部解析要原样保留；`ClassDeclaration.EndPossible` 收口时壳 `Pos` 已含前导 trivia，不要再重算。
7. **`class` 表达式不能串路**：`ClassExpressionPossibleShape`（表达式层）与声明候选是两条路；壳化只改声明候选，`ExpressionBuilder` 的 `class {}` 解析不动。
8. **module 的「值不值得」**：建议由 T4 的基准先给出 module body 在真实语料的耗时占比，再决定 T8 做不做（§5.3）。

---

## 9. 附：证据索引（本次核对的关键文件与行号）

| 主题 | 文件:行 |
|---|---|
| 括号创建事件（只通知直接父单元） | `core/syntax/basic-tokens/bracket.xl.md:136-166`（回调 `:162-164`） |
| 括号关闭只问父单元 | `core/syntax/basic-tokens/bracket.xl.md:80-98` |
| `MountedUnit` 优先接管字符 | `core/syntax/unit-token.xl.md:88-135`（`:99-102`） |
| 事件接口与默认实现 | `core/syntax/i-compute-possible-shapes.xl.md:41-49`；`core/syntax/unit-token.xl.md:64-68` |
| 目录判定顺序（淘汰/终结/唯一候选/Reset） | `core/syntax/catalog-guide.xl.md:61-135` |
| `MountedUnit` 卸载 / 转移 | `core/syntax/token.xl.md:159-168`（`Quit`）、`:289-310`（`Replace`）、`:312-328`（`RemoveSelf`） |
| interface 提前 Accept + 建壳挂载 | `interface-declaration-possible-shape.xl.md:204-207`、`:210-217`、`:219-254`（挂载 `:253`） |
| interface 壳的 body 认领 + 挂成员目录 | `interface-declaration-shape.xl.md:68-96`、`:98-127`、`:129-150` |
| interface 收口（build/collect/fallback） | `interface-declaration-shape.xl.md:174-346`（`CollectBodyMembers` `:366-443`） |
| interface 终结候选 | `interface-declaration-end-possible-shape.xl.md:26-37`、`:39-66` |
| class 候选（原子型） | `class-declaration-possible-shape.xl.md:210-230`、`:244-262`（过期注释 `:51`） |
| class 成员建造器 | `class-declaration-shape.xl.md:64-69`、`:696-809`（`BuildMembers`） |
| enum 候选（原子型） | `enum-declaration-possible-shape.xl.md:20-38`、`:214-254` |
| enum 成员建造器 | `enum-declaration-shape.xl.md:61-198`、`:200-229`、`:231-309` |
| module 原子建树 | `module-declaration-possible-shape.xl.md:38-40`、`:51-136`、`:261-303`；`module-block-shape.xl.md:64-93`、`:95-729` |
| function 原子型 | `function-declaration-possible-shape.xl.md:33-35`、`:383-478` |
| type literal 直建 | `type-builder.xl.md:642-658`、`:911-947`；`type-literal-shape.xl.md:24-29`；`type-literal-possible-shape.xl.md:15-24` |
| 未注册的桩 | `module-block-possible-shape.xl.md:15-25`；`class-static-block-declaration-possible-shape.xl.md:15-24`；`try-statement-possible-shape.xl.md:15-24` |
| 成员候选合同 / 收口证据 / residual 教训 | `docs/member-possible-design.md:11-25`、`:58-64`、`:72-77`、`:128-182`、`:243-276`、`:310-328` |
| cache 双阶段 / shape→AST 口径 | `typescript/IMPORTANCE.md:52-79`；`docs/Final.md:104-130` |
| 7 项门禁与构建纪律 | `SHAPE-CACHE-WORKFLOW.md` §2、§3 |
