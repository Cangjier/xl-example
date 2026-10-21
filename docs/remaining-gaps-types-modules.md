# 剩余失败分类：types / modules 组（8 份 crash）

> 基线：主仓 `85daba1d`（clone `cover-gaps-types`），`node typescript/cases/token-ast.mjs --quiet` 实测
> **ok 1648 / crash 35 / diff 9 / ts-invalid 10 / gap-now-passing 1**（total 1703）。
> 本文只覆盖 lead 指定的 **types 6 份 + modules 2 份** crash；8 份文件的 TS 侧（`ts.createSourceFile`，TS 6.0.3）
> **parseDiagnostics 均为 0**，即全部是「TS 合法、本仓解析崩溃」的真实缺口，不需要 TS-recovery 兜底。
> 方法：`SourceFileRunner.Parse` 逐份取完整异常链（含 `InnerException`）→ 去掉语料指令行后用 ddmin 缩到**保持同一条
> 最内层崩溃消息且 TS 仍 0 诊断**的最小复现 → 用变体探测分离触发条件 → 定位到 `typescript/**/*.xl.md` 的
> `file:方法:行`。以下「行号原文」均指 fixture 文件去掉指令注释后的实际代码行（括号内给 fixture 行号）。

## 0. 根因分组表

| 组 | 数量 | 文件 | 共同根因 | 难度 | 能否一起修 |
| --- | --- | --- | --- | --- | --- |
| G1 声明候选缺行末 ASI/边界 | **6** | `types/gap-r907-indexed-access-newline.ts`、`types/ty-export-type.ts`、`types/type-export-type.ts`、`types/type-tail-linecomment.ts`、`types/type-typeof-qualified-index.ts`、`modules/mod-import-equals-entity-name-newline.ts` | 语句/声明候选的收口只认 `;`（或 EOF），**行末换行 + 下一条语句首 token** 不是 Accept 点；于是候选范围跨行吞掉下一条语句，`Shape` 再按错误切片构造（alias 类型没读完 / 变量注解没读完 / import-equals 实体名多出 `(…)`） | S–M（按宿主再分 3 小类） | 可以，但按宿主分 3 个 patch 更稳 |
| G2 `>>` 拆分后的语句级下标错位 | **1** | `types/type-parameter-list.ts` | 前一条 class/interface 的 `>>` 被 AngleJudge 拆成两个 `>`（宿主 `Data` 插入单元）后，紧随其后的 `type` 别名候选的扫描/构建仍用**旧下标**（`DoneAt/Start`），`FromUnits` 切到错误范围 ⇒ `TypeBuilder` 有剩余单元 | M | 独立修（跨组风险） |
| G3 CatalogGuide 终结候选共存 | **1** | `modules/ex-default-after-import-01.ts` | `import './pool'`（无 `;`）后紧跟 `export default`：`ImportDeclarationEndPossibleShape` 的行末 ASI 分支在 `export` 这一格 Accept，但 import 声明 shell 的普通候选还没 Reject ⇒ `CatalogGuide` 抛「终结候选与其它候选同时成立」 | M | 独立修（涉及 end 判据收紧） |

合计 **8 份 = 6 + 1 + 1**。G1 内部按宿主分：**TypeAlias ×4**（gap-r907 / ty-export-type / type-export-type / type-tail-linecomment）、**VariableStatement ×1**（type-typeof-qualified-index）、**ImportEquals ×1**（mod-import-equals-entity-name-newline）。

跨组根因标注：
- **G1 = 行末 ASI / 声明边界（跨组）**：与 `end-build` 组的 `type-tail-linecomment` 尾巴、`end-compute` 的 import/export 收尾是同一族「终结候选在行末不 Accept」；修 G1 时应把「换行后首个代码单元不是类型续接符 ⇒ 可收口」抽成共用判据（现有 `ExpressionStatementPossibleShape.HasLineBreak`、`ImportDeclarationEndPossibleShape.CanEndAt/IsCompleteAt` 可复用）。
- **G2 = `>>` 拆分副作用（跨组）**：与 `possible-compute`/`end-build` 里所有「拆分后宿主 `Data` 变长、旧下标失效」同源；AngleJudge 判据本身没有错（type-parameter-list 的两个片段单独解析都 OK），**不要重复归因到 angle 判据**。
- **G3 = import/export 收尾（跨组）**：与 §5 的 import 声明收尾、`source-file-end-possible-shape.xl.md:61-68` 注释里「终结候选不许 Accept，否则 CatalogGuide 会报共存」是同一不变量。

## 1. G1：声明候选缺行末 ASI / 边界（6 份）

### 1.0 共同机制

各声明候选（`TypeAliasDeclarationPossibleShape`、`VariableStatementPossibleShape`、`ImportEqualsDeclarationPossibleShape`）
目前只在**顶层 `;`**（TypeAlias：`type-alias-declaration-possible-shape.xl.md:123-137`，`DoneAt` 只记 `;`）或 EOF 上 Accept/Reject。
TS 6.0.3 在「行末换行 + 下一条语句首 token」时按 ASI 收口；本仓没有这一格，候选范围一直长到**下一条语句的 `;`**，
再由终点切片构造，于是：

- 类型别名：`typeUnits` 多出下一条语句的 token → `TypeBuilder.ParseType()` 读不完（`type-alias-declaration-shape.xl.md:169-175`）；
- 变量语句：`declare const a: any` 的注解范围（`statement-builder.xl.md:720-758`）跨到下一行 `type A = …`，在 `= ` 处截断 → 注解读不完（`:755-758`）；
- import-equals：实体名点号循环（`import-equals-declaration-shape.xl.md:151-166`）遇到下一条语句的 `(` Bracket → 抛「实体名缺少点号」（`:160`）。

通用修法（每小类只改自己的候选/收尾）：
**何时 build**：在「类型/声明末单元」上 build（不是在下一条语句的 `;` 上）；
**build 提取什么**：只提取本声明的代码单元（到末单元为止），后续 token 留给下一条；
**何时 close**：行末边界（换行 trivia 已过去、下一条语句首个代码单元到达）即收口；
**close 提取什么**：End = 本声明末单元的 `SourceRange.End`；`;` 若存在归本声明，否则不生成。
判据抽取：`hasLineBreakBefore(unit)` + 下一单元是否「类型续接符」——续接符白名单不是空集（`|`、`&`、`.`、`extends`、`?`、`:`、`=>`、`<` 等），
所以**不能简单「见换行就 ASI」**（`type T = A\n | B` 合法、`import A = foo\n.b` 也合法，实测后者不崩）。

### 1.1 `types/gap-r907-indexed-access-newline.ts`（TypeAlias）

**行号原文**（fixture 10/11 行）：`type T = A` ⏎ `["k"];`
**最小复现**：`type T = A\n["k"];`（TS 0 诊断；TS AST = `TypeAliasDeclaration(type T = A)` + `ExpressionStatement(["k"];)`）
**崩溃链**：`throw by line 0 ---> line 2: ["k"];` → `类型别名声明的类型没有读完`
**定位**：`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md:56-138`（`ComputeByIndex` 只认 `;`）→
`type-alias-declaration-shape.xl.md:169-175`（`typeUnits` 含 `A [ … ]`，`ParseType` 后 `At != Units.length` 抛 `:174`）。
**IMPORTANCE §6**：**end compute 不对**（声明终结候选缺行末 Accept；`build` 阶段被错误切片放大）。
**修法**：`ComputeByIndex` 在 `units[tokenIndex]` 为「行末后的首个代码单元且不是类型续接符」时 Accept，并把 `DoneAt = tokenIndex-1`；
`IsBuildable` 只在类型末单元为真；`FromUnits` 的 `typeTail` 走无 `;` 分支（`:137-144`）。
**难度**：M（要定义续接符白名单，且要覆盖 `[` 与 `|` 的差异——TS 只在**同一行**吃 `[`）。
**风险**：所有 type alias / `export type` 用例；`A\n| B`、`F<\nT>` 等跨行类型必须继续；修完可能由 crash 转 **diff**（需逐份 ast 对拍）。
**TS-recovery**：无（TS `parseDiagnostics=0`，正常语法）。

### 1.2 `types/type-tail-linecomment.ts`（TypeAlias，尾巴行注释）

**行号原文**（fixture 39/40 行）：`type T11 = A//c` ⏎ `[];`（其余 T1–T19 的「行注释尾巴」已在既有 934 轮规则内通过；本文件只剩 T11 这一条触发）
**最小复现**：`type T11 = A//c\n[];`（与 1.1 同根因：`//c` 的换行后 `[` 被当成类型续接；TS 0 诊断）
**崩溃链**：`throw by line 0 ---> line 40: [];` → `类型别名声明的类型没有读完`
**定位**：同 1.1；另注意行注释把换行吃进 trivia 后，`HasLineBreak` 仍能从 trivia 里看到换行（`ExpressionStatementPossibleShape.HasLineBreak` 已有能力）。
**IMPORTANCE §6**：**end compute 不对**（本文件另与 §6 表里「end build 不对（2）：type-tail 的行注释尾巴」同族，修 G1 时一并覆盖）。
**难度**：S（复用 1.1 的判据）。
**风险**：所有「类型尾 + 行注释 + 换行」的宿主（元组/字面量/形参/联合/…，fixture 已铺 19 组守卫）；修后须确认尾巴注释仍归 trivia、不进 End。
**TS-recovery**：无。

### 1.3 `types/ty-export-type.ts` / `types/type-export-type.ts`（TypeAlias + export type 子句）

**行号原文**（type-export-type 5/6 行）：`type X = number` ⏎ `export type { X }`；ty-export-type 同形（`type B = number` ⏎ `export type { B }` ⏎ `export { B as C }`）
**最小复现**：`type X = number\nexport type { X }`（TS 0 诊断；**注意**：`type X = number;` 带分号则本仓不崩——`export type { X }` 本身也单独 OK）
**崩溃链**：`类型别名声明不完整`（`type-alias-declaration-shape.xl.md:94/108`：alias 候选把 `export type { X }` 吞进范围后 `code` 结构不成立）
**定位**：`type-alias-declaration-possible-shape.xl.md:56-138`：别名 Stage 2 只等 `;`，不识别行末 + 下一条 `export`；被吞后 `FromUnits` 在 `:94/:108` 抛。
**IMPORTANCE §6**：**end compute 不对**（同时与 **export 声明收尾**跨组：`export type { … }` 本是 ExportDeclaration 的 clause，不应进 alias）。
**修法**：同 1.1 的行末 Accept；另外别名 Stage 2 遇到「行末后的 `export`」应直接 Accept 类型末单元（`export` 是声明首词，不可能续接类型）。
**难度**：S（在 1.1 上增加关键字白名单）。
**风险**：`export type T = A`（同一行）必须仍归 alias；`type X = A\nexport declare type Y = B` 等连续声明；ast 对拍。
**TS-recovery**：无。

### 1.4 `types/type-typeof-qualified-index.ts`（VariableStatement 注解范围）

**行号原文**（fixture 9/10/11 行）：`declare const a: any` ⏎ `declare type K = "k"` ⏎ `type A = typeof a.b[K];`
**最小复现**：`declare const a: any\ntype A = typeof a.b[K];`（TS 0 诊断；`const a: any`（无 declare）同崩；`declare const a: any;` 带分号则**不崩**；`type A = typeof a.b[K];` 单独 OK）
**崩溃链**：`throw by line 0 ---> line 11: type A = typeof a.b[K];` → `类型注解没有读完`
**定位**：`typescript/tokens/statements/statement-builder.xl.md:720-758`：变量语句的界没在行末收（`declare const a: any` 无 `;`），
type 注解扫描从 `:` 起在顶层 `=` 处停（`:726-730`），于是 `typeUnits = any type A`，`TypeBuilder` 读 `any` 后剩余 → `:755-758` 抛。
根因在**变量语句的 End/候选范围**（`statements/variable-statement-possible-shape.xl.md` 的终结候选），不是 `TypeBuilder`（同文件 `:753-755` 只是受害者）。
**IMPORTANCE §6**：**end compute 不对**（变量语句终结候选缺行末 ASI）。
**修法**：变量语句候选在行末 + 下一行首为声明首词（`type`/`interface`/`declare`/`let`/`const`…）时收口；
build 只在「注解/初始化器末单元」上；close 在行末，End 取注解末单元。
**难度**：S（只影响无分号变量声明；`const a: any` 本身是合法 ASI 场景）。
**风险**：多行注解（`let a:\n string`）与多行初始化必须继续；`declare` 前缀的一组用例（`end-compute` 组共用）。
**TS-recovery**：无。

### 1.5 `modules/mod-import-equals-entity-name-newline.ts`（ImportEquals）

**行号原文**（fixture 4/5 行）：`import A = foo` ⏎ `("m");`
**最小复现**：`import A = foo\n("m");`（TS 0 诊断；TS = `ImportEqualsDeclaration(A = foo)` + `ExpressionStatement(("m");)`；`import A = foo\n.b;` 合法且本仓不崩——`.` 是续接符）
**崩溃链**：`import equals 的实体名缺少点号`
**定位**：`typescript/tokens/declarations/import-equals-declaration-shape.xl.md:151-166`（实体名循环要求 `foo` 后每个单元都是 `.`）；
范围来自 `declarations/import-equals-declaration-possible-shape.xl.md` 的收口（只认 `;`），把 `("m")` Bracket 与后续 `;` 吞进声明。
**IMPORTANCE §6**：**end compute 不对**（import-equals 终结候选缺行末 ASI）。
**修法**：候选在行末 + 下一行首为 `(`（Bracket）或声明首词时 Accept，build 只提取 `import A = <qualified>` 到实体名末单元；
close 行末；`import-equals-declaration-shape.xl.md:157-166` 的点号循环因此不会再见 Bracket。
**难度**：S。
**风险**：跨行限定名 `import A = foo\n.b` 必须继续（`.` 白名单）；`import A = require("m")` 不受影响。
**TS-recovery**：无。

## 2. G2：`>>` 拆分后的语句级下标错位（1 份）

**文件**：`types/type-parameter-list.ts`（fixture 3/4/5/6 行：`type X<T extends string = "a"> = T;` / `class C<T, U extends X<T>> {}` / `interface I { m<K>(error: K): void }` / `type F = <V>(a: V) => V;`）

**实测分离**（关键）：
- `type X<T extends string = "a"> = T;` 单独 → OK；`class C<T, U extends X<T>> {}` 单独 → OK；`type F = <V>(a: V) => V;` 单独 → OK。
- 但 `class C<T, U extends X<T>> {}\ntype F = (a: V) => V;` / `…type F = number;` / `…type F = A;` / `…type F = 1;` **全部崩**；
  `class C<T, U> {}\ntype F = …;` **不崩**；`class C<T> {}` + alias **不崩**；`interface I<T, U extends X<T>> {}\ntype F = number;` **也崩**。
- `type F = number`（**无** `;`）→ 不崩；`class C<T,U extends X<T>> {}` 后接 `interface J {…}` / `const q = 1;` → 不崩。
⇒ 触发条件 = **前一条声明含 `>>` 拆分**（class/interface 的 `U extends X<T>>`）+ **紧随的 `type` 别名以 `;` 收尾**；与别名的类型形状无关。
**最小复现**：`class C<T, U extends X<T>> {}\ntype F = number;`（TS 0 诊断）
**崩溃链**：`类型别名声明的类型没有读完`（`type-alias-declaration-shape.xl.md:174`）
**定位**：`typescript/tokens/declarations/type-alias-declaration-possible-shape.xl.md`：
- `:66-69` `state.Start = ItemUtil.ItemStart(units)`、`:78-130` 扫描、`:144` `DoneAt === tokenIndex`、`:151-156` `BuildByIndex` 用缓存下标 `splice`；
- `>>` 经 `AngleJudge` 拆分（class/interface 候选 build 时把 `>>` 拆成两个 `>`）会让宿主 `Data` 变长，紧随其后的类型别名扫描缓存里的下标随之偏移 ±1；
- `IsBuildable` 在下一条语句的 `;` 上按旧下标成立，`FromUnits` 的切片多/少一个单元 ⇒ `TypeBuilder` 剩余 ⇒ `:174` 抛。
（docs §9 已记载「委托前后 type-parameter-list 崩溃消息不变」——**这不是 AngleJudge 判据错**，而是拆分改变宿主 `Data` 长度后语句级扫描缓存未失效。）
**IMPORTANCE §6**：**possible compute 不对**（扫描缓存/下标；build 用错范围）。
**修法**：
- **何时 build**：仍在别名自己的 `;` 上，但 `IsBuildable` 改为「`host.Data[tokenIndex]` 是那个缓存的 `Done` 单元对象」而不是比较整数下标；
- **build 提取什么**：`start` 用 `host.Data.indexOf(state.StartUnit)` 现算，不用缓存整数；
- **何时 close**：不变（`;`/EOF）；
- **close 提取什么**：End 取末单元（`;` 或类型末），不变。
- 更稳的补丁：在 `AngleJudge` 拆分点显式让同宿主语句级缓存失效（`CatalogGuide.Reset` 只清它自己的；若别名扫描缓存挂在 root 的候选上，需要拆分方回调/版本号）。
**难度**：M（涉及缓存契约；先修「缓存改单元引用」即可覆盖本用例，拆分点回调可作为二期）。
**风险**：所有 type alias 用例（大量）+ 所有走拆分路径的 class/interface/function 声明；需全量 ast 对拍（ident 4763+/4787 快照）。
**TS-recovery**：无。

## 3. G3：CatalogGuide 终结候选共存（1 份）

**文件**：`modules/ex-default-after-import-01.ts`（fixture 3/4/6 行：`import './pool'` / `export default Agent` / （空行）`declare class Agent {}`）
**最小复现**：`import './pool'\nexport default Agent`（TS 0 诊断；`import './pool';` 带分号 → 不崩；`export default 1` 同样崩）
**崩溃链**：`throw by line 0 ---> line 4: export default Agent`（两层包装）→ `CatalogGuide: 终结候选与其它候选同时成立（宿主 ImportDeclarationShape，下标 8）`（最小复现下标 4）
**两个候选是谁 / 为什么同时成立**：
- **终结候选** = `ImportDeclarationEndPossibleShape.ComputeByIndex`（`typescript/tokens/declarations/import-declaration-end-possible-shape.xl.md:60-86`）。
  它走行末 ASI 分支（`:64-85`）：当前 `tokenIndex` 是 `export`（下一条语句首个代码单元），向前找到换行 trivia、
  `previous` 是 `import './pool'` 的最后一个代码单元、`IsCompleteAt` 与 `CanEndAt`（`:89-130` 前探下一行首词，`export` 不在续接表）均成立 ⇒ **Accept**。
- **其它候选** = `ImportDeclarationShape` 自己的候选目录里还没 Reject 的普通候选（side-effect import 的 shell/空 clause 形态，`ImportDeclarationPossibleShape` 等）。
  它此刻仍 `Uncertain`（还没有看到 `;`），`Candidates.size > 0`。
- `CatalogGuide.ComputePossibleShapesByIndex`（`core/syntax/catalog-guide.xl.md:90-96`）的不变量是「终结候选 Accept 时普通候选必须已全部 Reject」，否则直接抛错。
  根因即：**import 声明的 shell 候选与终结候选在同一格（`export`）竞争**——终结候选认为声明已结束，shell 认为还能长（等 `;`）。
**IMPORTANCE §6**：**end compute 不对**（终结候选 Accept 时机太早；与 **import/export 收尾**跨组）。
**修法（二选一，建议 A）**：
- **A. 让 shell 先收口（推荐）**：`ImportDeclarationPossibleShape` 在扫描到行末后的首个代码单元时，如果 `ImportDeclarationEndPossibleShape.IsCompleteAt(units, previous) && CanEndAt(...)`
  成立，就主动 `Reject`/标记可结束，使 `Candidates` 为空后终结候选才 Accept；语义是「import 声明在行末 ASI 边界结束」。
- **B. 收紧终结判据**：`EndPossible.Accept` 之前要求 shell 候选已 Reject（把不变量从抛错改成等待一格），但要避免无限等待（EOF 处也要能收）。
- **何时 build**：在行末边界（`export` 之前）build import 声明；**build 提取**：只 `import './pool'`（含 side-effect 字符串），不含 `export`；
  **何时 close**：同一格 close；**close 提取**：End 取字符串单元末，`export` 归下一条。
**难度**：M（CatalogGuide 不变量与 root 语句边界联动；不能只放宽抛错）。
**风险**：所有无分号 import（side-effect / named / default / `import type`）；`import { a }\nfrom "m"` 的续行必须不受影响（`CanEndAt` 的续接表已含 `from/as/defer`）；
  `export default` / `export =` 的候选共存（§5 的 export 收尾是同一族）。
**TS-recovery**：无（TS 直接给 ImportDeclaration + ExportAssignment 两条语句；无需猜）。

## 4. 修复批次建议（按「收益/风险」排序）

| 批次 | 内容 | 预计读数变化 | 依据 |
| --- | --- | --- | --- |
| **1** | G1 的 TypeAlias 4 份（1.1–1.3）：抽「行末 ASI + 续接符白名单」到 `TypeAliasDeclarationPossibleShape` | ok 1648→**1652**、crash 35→**31**、diff 9 不变（若某份修后转 diff 则 ok 少 1） | 同一处判据，收益最大；`type-tail-linecomment` 还能顺带清掉 §6 的 end-build 2 之一 |
| **2** | G1 的 ImportEquals（1.5）+ G3（3）：一个 S + 一个 M，都是 import 收尾 | ok +2 → **1654**（若 G3 走 A 案） | import 收尾规则一处统一（`CanEndAt` 复用） |
| **3** | G1 的 VariableStatement（1.4）：变量语句行末收口 | ok +1 → **1655** | S，但触及 `declare`/多行注解守卫 |
| **4** | G2（2）：缓存下标/单元引用 + 拆分失效 | ok +1 → **1656**、crash 35→**27** | M/L，单独一批，修完必须全量 ast 对拍 |
| 收尾 | 8 份全部转 PASS 后，按惯例撤 `xl:note` 里的历史说明、把 `tests/cases/token` 的期望复核一遍 | 目标 ok 1656 / crash 27 / diff 9 | — |

**建议顺序**：1 → 2 → 3 → 4。G1 的各小类可并行由不同人做（互不重叠：TypeAlias / ImportEquals / VariableStatement），但都依赖同一份「续接符白名单」；
G2 与 G1 不重叠（G2 不改 Accept 时机，只改缓存下标），可并行；G3 与 G1 的 ImportEquals 都在 declarations 层，建议同一人依次做避免 conflict。

## 5. 与其他组共用的根因（跨组清单）

1. **行末 ASI / 声明边界（G1）**：`end-build` 组的 `type-tail-linecomment` 尾巴、`end-compute` 组的 import/export 收尾、`possible-compute` 组里的声明候选，共用「换行后首 token 不是续接符 ⇒ 收口」这一格；
   实现时建议把「续接符白名单 + HasLineBreak」放进 `ExpressionStatementPossibleShape` 同级的公共位置（现 `HasLineBreak` 在 `statements/expression-statement-possible-shape.xl.md`）。
2. **`>>` 拆分副作用（G2）**：`possible-compute` / `end-build` 里任何「拆分后宿主 `Data` 变长」的条目共用「缓存下标失效」问题；
   AngleJudge 判据本身无需改（type-parameter-list 三段单独都 OK），**不要重复归因**到 angle。
3. **`}` 收口 / class/interface body（G2 的触发面）**：class/interface 候选 build 时拆分 `>>` 并替换整条声明，是本组的「因」；
   同类问题也会影响 `end-build` 的块体收尾。
4. **import/export 收尾（G1.5 / G3）**：`ImportDeclarationEndPossibleShape.CanEndAt/IsCompleteAt`（`import-declaration-end-possible-shape.xl.md:89-130`）
   是本仓已有的「行末 ASI 判据」，G1 的 ImportEquals 与 G3 都应复用它，避免再写一份续接表。

## 6. 复现/测量命令（本次实际执行）

```bash
node typescript/cases/token-ast.mjs --quiet          # 基线：ok 1648 / crash 35 / diff 9
# 单份 crash + 异常链（在 clone 里）：直接 SourceFileRunner.Parse + InnerException 遍历

> **状态：全部条目已在 round 21–26 修复；最终读数 token 1690 ok / 0 crash / 0 diff / 10 ts-invalid / 3 gap-now-passing，ast 4848/4848（47 构造）、ast:dts 226/226（HEAD `840258dc`）。**
# 最小复现：已写入正文各小节；均为 TS 0 诊断、本仓 crash 的片段
```

> 说明：本文件为**分析文档**，未改任何 `.xl.md`/代码/`tests/cases`；8 份 fixture 的行号/原文按 `85daba1d` 实测。
