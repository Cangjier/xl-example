# cover9 作者报告 — possible compute 不对：enum/interface 的 `declare` 与成员修饰词同行判据

日期：2026-10-22 ｜ 分支：`cover9-posscompute-decl` ｜ 起点：`b465cf6e`（merge cover9-missingpossible）
工作区：`C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-posscompute-decl`（独立克隆；未 push / 未 merge / 主仓只读）
任务：`task-12`（COVER9-AUTH-POSSDECL）｜ 修复对象：`cover9-survey-candidates.json` 的 **Z17–Z24 共 8 形**
（TS 6.0.3 `parseDiagnostics=0` 且本仓 crash / AST 三栏不一致）→ 全部转绿；用例追加到
`typescript/cases/possible-compute.ts` 的 cover9 段。

## 1. 一句话结论

8 条真红全部修复（survey probe Z17–Z24：`red-diff`/`red-crash` → `green`），同族两个变体
（`declare` ⏎ `const enum`、块内/模块体外的 `{ declare` ⏎ `enum … }`）一并核过：前者已顺手转绿，
后者（**模块体成员**路径）不在本任务 8 形内且需动 `module-block-shape`（不在写 scope），登记为遗留（§9）。
新增 25 条用例（164 → 189），`ast-json` 5990 → **6015**、`ast-json-diff` 0/0/0，其余门禁与基线持平（§10）。

## 2. 基线 / 最终读数

| 项 | 基线（b465cf6e） | 修复后（本分支） |
|---|---|---|
| `node tmp/survey-probe.mjs <Z 组>` | 24 条：red 24 / green 0（Z17–Z24 全红，Z01–Z16 属 W2 的 type-alias 组） | **Z17–Z24 全 green**；Z01–Z16 仍红（W2 负责，本分支未动 type-alias-*） |
| `node tests/cover9/probe.mjs --quiet`（官方 88 候选） | red=20 green=68（存储值偏差 24 条 exit 1，预期） | **red=20 green=68**（本类改动不涉及 A/B/C 组，未回归） |
| `node typescript/cases/ast-json.mjs` | 5990 / 5990 / fail 0 | **6015 / 6015 / fail 0**（+25 用例） |
| `node typescript/cases/ast-json-diff.mjs` | 5990/5990，结构 0 / 位置 0 / 字段 0 | **6015/6015，0/0/0** |
| `node typescript/cases/token-ast.mjs --quiet` | total=1715 ok=1705 crash=0 diff=0 ts-invalid=10 | **同上（无回归）** |
| `node tests/parse/validate.mjs` | 1719 / 0 不合格 | **1719 / 0 不合格**（新增用例只在 `typescript/cases`） |
| `node typescript/cases/real-dts-ast.mjs` | 226 / 226 | **226 / 226（0 崩溃 / 0 差异）** |
| `tsc -p tsconfig.json` | 0 error | **0 error** |
| `xl_check`（core+typescript，targets ts） | 0 error（2461 warning） | **0 error**（864 文件，2463 warning：+2 = 两个新 `PendingModifier` 字段的 W3102） |
| `git diff b465cf6e..HEAD -- core typescript/IMPORTANCE.md` | 空 | **空**（core 与 IMPORTANCE 零改动） |

## 3. 问题清单与根因（8 条，file:line 以修复前行为准）

### 3.1 根因 B（Z17–Z18）：enum / interface 的 `declare` 修饰词缺同行判据

- TS 侧：`declare` ⏎ `enum E { A }` → `ExpressionStatement("declare")[0,7)` +
  `EnumDeclaration[7,20)`（**enum 不带 DeclareKeyword**）；`declare` ⏎ `interface I {}` 同形。
  TS 的 `parseModifiers` 走 `nextTokenIsOnSameLineAndCanFollowModifier`：修饰词与声明词之间
  **有行终止符时修饰词不成立**，`declare` 按 ASI 自成一条表达式语句。
- 本仓：`enum-declaration-possible-shape.xl.md:79-88` / `interface-declaration-possible-shape.xl.md:82-88`
  的 `Stage0` 见到 `declare` 直接进 `Stage1`（不看换行），候选把两条并成一条声明；
  建树侧 `enum-declaration-shape.xl.md:111-115` / `interface-declaration-shape.xl.md:106-108`
  收集 `modifierUnits` 时也无同行判据（候选若把范围交给 FromUnits，declare 一定被当修饰词）。
- 已有参考：`class-declaration-possible-shape.xl.md:53-64` 的 `HasLineBreakBefore` +
  `:141-159` 的 `PendingModifier` 机制（cover5 D4 修的，`declare` ⏎ `class` 已绿）。

### 3.2 根因 C（Z19–Z24）：type literal / interface 成员修饰词（`readonly` / `new`）缺同行判据

- **readonly 4 形**（Z19–Z22）：`interface I { readonly` ⏎ `readonly: number }` 时 TS 造 **两个成员**：
  第一个是名字为 `readonly` 的**无类型 PropertySignature**，第二个才是带 `ReadonlyKeyword` 的成员
  （type literal / `readonly?: number` / `readonly(): void` 同形）。本仓
  `typescript/tokens/types/type-builder.xl.md:958-1003 ParseTypeMember` 只对「`readonly` ⏎ `[`」
  做了同行判定（:980-993），普通名分支（:994-1003）直接 `modifiers.push(ReadonlyKeyword)` →
  只造一个带 ReadonlyKeyword 的成员（结构差 `Identifier/PropertySignature -1, ReadonlyKeyword +1`）。
- **new 2 形**（Z23–Z24）：`type T = { new` ⏎ `new(): void }` 时 TS 造 `PropertySignature(name=new)`
  + `ConstructSignature`；本仓 `type-builder.xl.md:1018-1021` 成员首格 `new` 只看下一格是否
  `<`/`(` 就认构造签名（Z23/Z24 的下一格是 `new`，不满足），随后通用名字路径把下一行的 `new`
  当成上一格 `new` 的类型 → `ParseConstructorType`（:2076-2114）读 `new` 后要 `=>` 却见 `:`
  → crash「构造类型缺少 =>」。

## 4. 修复文件与改动（只改 `typescript/**`，3 个文件）

| 文件 | 改动（file:line 为修后行号） |
|---|---|
| `typescript/tokens/declarations/enum-declaration-possible-shape.xl.md` | 新增 `field PendingModifier`（:37）与 `private static HasLineBreakBefore`（:51-69，与 class 候选同款、走 `ExpressionStatementPossibleShape.HasLineBreak` 的 LF/CR/LS/PS 口径）；`State` 重置补 `PendingModifier = false`（:91）；Stage0 的 `declare` 改为**挂起**（:106-109），`enum`/`const` 到达时若有换行 `Reject`（:116-119 / :123-128）——`declare` ⏎ `enum` 与 `declare` ⏎ `const enum` 都让位给表达式语句候选。 |
| `typescript/tokens/declarations/interface-declaration-possible-shape.xl.md` | 同上：`PendingModifier` 字段（:41）、`HasLineBreakBefore`（:53-71）、重置（:94）、Stage0 `declare` 挂起（:109-112）+ `interface` 到达时换行 `Reject`（:114-120）。 |
| `typescript/tokens/types/type-builder.xl.md` | ① `ParseTypeMember` 的 `readonly` 换行判据从「只接 `[`」扩到**任意下一格**（:978-996）：与下一代码单元之间有行终止符时 `readonly` 当场收成无类型 `PropertySignature`（名字 `readonly`），下一行另起成员；② `new` 构造签名判据后补「按成员名收口」（:1089-1102）：`!isConstructSignature && 与下一代码单元换行` 时把 `new` 收成无类型 `PropertySignature`（名字 `new`），下一行的 `new()` 才是 ConstructSignature；`new` ⏎ `(` / `<`（G13/G14 已绿）不受影响（构造签名判据本就不看换行）。 |

未新增 `PossibleShape`：根因 B 是**已有候选的 Accept 判据**缺同行守卫（与 class 候选同构），
根因 C 是成员解析器（`TypeBuilder.ParseTypeMember`）的修饰词读法，均不涉及新候选形状。
`HasLineBreakBefore` 逐格回看 trivia、只做一次线性扫描，符合 IMPORTANCE §3.4（不在 possible 循环里每轮全量重扫）。

## 5. 四问（§6 解决问题思路）

1. **正确的应该什么时候 build**
   - `declare` + enum/interface：只在「`declare` 与声明词**同一行**」时它才是修饰词、由声明候选一次建完；
     有行终止符时 `declare` 按 ASI 自成 ExpressionStatement（由表达式语句候选收口），enum/interface
     从声明词那一格重新起候选、单独建。
   - 成员修饰词：`readonly` / `new` 只有与下一个 token **同一行**才是修饰词 / 构造签名头；
     换行时它们就是成员名（无类型 PropertySignature），下一个代码单元另起成员。
2. **build 时应该提取哪些信息**
   - enum/interface：修饰词（`declare`，enum 另有 `const`）、名字、类型形参 / heritage、体括号；
     `declare` 与声明词之间的行终止符是**判据信息**，不是声明内容。
   - 成员：成员名（Identifier / String / Numeric / ComputedPropertyName）、可选 `?`、类型、成员修饰词
     （ReadonlyKeyword 等）；`readonly`/`new` 作名字时**不带类型子节点**（TS 同款）。
3. **什么时候 close**
   - 声明：体 `{…}` 闭合括号单元到齐即关闭；候选在「声明词到齐」时 Accept、`BuildByIndex` 一次建完。
   - 成员：名字 / 参数表 / 类型读完（或分隔符 `;`/`,`）即关闭；`readonly`/`new` 作名字的分支在
     名字单元之后立即关闭（不再读类型）。
4. **close 时应该提取哪些信息**
   - 声明：children 顺序（Decorator? → 修饰词 → 名字 → 类型形参 → heritage → 体）、区间从第一个
     修饰词 / 装饰器到 `}`、`Pos` 含前导 trivia；**换行时 `declare` 不是 children**（TS 的
     ExpressionStatement 另外一条）。
   - 成员：名字 / `?` / 类型 / 修饰词进 children；`readonly`、`new` 作名字时只有 Identifier，
     不含 ReadonlyKeyword / ConstructSignature 子节点；成员区间含自己的 `;`/`,`。

## 6. 逐条红→绿证据（survey probe，官方 probe 不覆盖 Z 组）

复跑（克隆内，只读探针）：把 `xl-example-set\cover9-survey\tmp\survey-probe.mjs` 原样复制到本克隆
`tmp/survey-probe.mjs`（探针按自身位置推仓库根；只读不改），并把 `cover9-survey-candidates.json`
的 Z 组包成 `{cases:[…]}` 交给它（`tmp/z-cases.json`，未提交）。

| id | 输入 | 修复前 | 修复后 |
|---|---|---|---|
| Z17 | `declare\nenum E { A }` | red-diff：结构 ExpressionStatement -1 / Identifier -1 / DeclareKeyword +1；位置 EnumDeclaration ts[7,20] cj[0,20] | **green** |
| Z18 | `declare\ninterface I {}` | red-diff：同上（InterfaceDeclaration ts[7,22] cj[0,22]） | **green** |
| Z19 | `interface I { readonly\nreadonly: number }` | red-diff：结构 Identifier -1 / PropertySignature -1 / ReadonlyKeyword +1 | **green** |
| Z20 | `type T = { readonly\nreadonly: number }` | 同上 | **green** |
| Z21 | `interface I { readonly\nreadonly?: number }` | 同上 | **green** |
| Z22 | `interface I { readonly\nreadonly(): void }` | red-diff：结构差 + 位置 MethodSignature ts[22,39] cj[13,39] | **green** |
| Z23 | `type T = { new\nnew(): void }` | red-crash：构造类型缺少 => | **green** |
| Z24 | `interface I { new\nnew(): void }` | red-crash：构造类型缺少 => | **green** |

**新增 25 条用例的「修复前红」证据**：用 `git stash` 暂存本分支 3 个 `.xl.md`、重建基线后逐条实测，
**25/25 全部 red**（10 条 declare 形 red-diff、9 条 readonly 形 red-diff、6 条 new 形 red-crash）；
恢复修改后 25/25 green。
另外核过的同族变体（未写入用例或已写）：`declare` ⏎ `const enum E { A }` 基线 red-diff、修复后 green
（已并入用例段）；块内 `{ declare` ⏎ `enum E { A } }` / `{ declare` ⏎ `interface I {} }` 基线修复前后都 green
（块级分派已有同行判据）；**模块体成员** `namespace N { declare` ⏎ `enum E { A } }` /
`declare module 'm' { declare` ⏎ `enum E { A } }` 修复后仍 red-diff（见 §9 遗留）。

## 7. 新增用例（+25，`typescript/cases/possible-compute.ts` 末尾 cover9 段）

段内注释写明 §6 类别（possible compute 不对）与候选 id（Z17–Z24）。一行一例、行内 `\n` 转义、
同 stem 无重复行（189 行去重核对 0 重复）、全 LF。分组（base 先行、trivia/重复形随后）：

- `declare` + enum/interface 换行（10）：base `declare\nenum E { A }` / `declare\ninterface I {}`；
  变体：非空接口体；trivia：块注释 / 行注释 / 下一行块注释 / 空行；同族 `declare\nconst enum`；
  重复形：前面还有一条声明、后面还有一条语句。
- `readonly` 成员修饰词换行（9）：base interface 形；type literal / `readonly?:` / `readonly():` /
  类型本身也 readonly；trivia：空行 / 词间块注释 / 行注释；重复形：后面还有成员。
- `new` 构造签名换行（6）：base type literal + interface；变体：带参数 / 返回类型不同；
  trivia：词间块注释；重复形：后面还有成员。

单 stem 读数：`[possible-compute] cases=189 cj-ok=189 cj-fail=0`；`ast-json-diff possible-compute`
189/189，结构 0 / 位置 0 / 字段 0。两份快照（`possible-compute.cj-ast.json` / `.ts-ast.json`）
由 `ast-json.mjs possible-compute` 重新生成，未手工合并。

## 8. 与其它分支 / 作者的交叉说明

- **W2（`cover9-posscompute-type`，同 stem 另一段）**：本分支只 append 自己的 cover9 段（段首
  `cover9（possible compute）：enum/interface 的 declare 与成员修饰词`），不改历史行；W2 的
  type-alias 段各自追加，合并时同文件冲突按「两段都保留 + 重生成快照」处理。本分支未碰
  `type-alias-*` 文件，Z01–Z16 仍红，属 W2。
- **`cover9-possiblebuild` 分支的 type-builder 交叉**：本分支只改 `type-builder.xl.md` 的
  `ParseTypeMember` 两处（readonly :978-996、new :1089-1102），且都在「成员修饰词 / 成员名」段，
  与 possiblebuild 类型解析主链（`ParseType` / `ParseTypeReference` / `HasLineBreakBeforeCurrent`
  等区域）不重叠；若合并时同一文件冲突，取两侧区块后重跑 `ast-json` + `token-ast` 即可。
- `enum/interface-declaration-shape.xl.md`（建树侧）本分支**未改**：实测根因 B 在候选 Accept 判据，
  候选 Reject 后表达式语句候选收口 `declare`、声明候选从声明词重新起，建树侧不需要判据。

## 9. basic-token 是否牵涉 / 遗留

- **basic-token：不牵涉**（只登记）。8 形的 token 化在基线上都正确（`declare` / `readonly` / `new`
  均为 Common、换行是 trivia），缺口只在 possible Accept 与成员修饰词读法；未改 `core/**`、
  未改 basic-tokens、未新增 token 夹具。
- **遗留 1（同族未修，需动不在写 scope 的文件）**：模板块成员里的 `declare` ⏎ `enum` / `interface`——
  `namespace N { declare` ⏎ `enum E { A } }`、`declare module 'm' { declare` ⏎ `enum E { A } }`
  （TS diag=0）修复后仍 red-diff（结构 `DeclareKeyword +1 / ExpressionStatement -1 / Identifier -1`）。
  根因：`typescript/tokens/declarations/module-block-shape.xl.md:161-190` 的成员分派看到
  `declare` + `enum`/`interface` 直接路由到 `EnumDeclarationShape.FromUnits` / `InterfaceDeclarationShape.FromUnits`，
  没有「declare 与声明词同行」判据；修法是在该文件补 `StatementScanner.NoLineBreakBetween` 守卫
  （与 `class`/`function` 分支同款），本轮写 scope 未包含此文件，登记给下一批。
- **遗留 2**：`declare` ⏎ `const`（ambient 变量，G07）与 `declare` ⏎ `namespace` / `type`（G08/G11）
  实测本就绿，本分支未扩大改动面；`declare` ⏎ `abstract class` 等 class 族已由既有守卫覆盖。
- **风险**：`type-builder` 的 readonly 分支由「只接 `[`」扩到「任意下一格」，语义上等价于 TS 的
  `nextTokenIsOnSameLineAndCanFollowModifier`；全量 `ast-json` 6015/6015 与 `token-ast` 1715 无回归。

## 10. 复跑方法（克隆内）

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\cover9-posscompute-decl
# 重建（改过的 3 个 .xl.md）
#   xl_build(cwd=<clone>, paths=[上述 3 文件], targets=["ts"], out="dist", force=true)
.\node_modules\.bin\tsc.cmd -p tsconfig.json
# Z 组探针（只读；把 survey 探针复制到本克隆 tmp/，Z 组 cases 包成 {cases:[…]}）
node tmp/survey-probe.mjs tmp/z-cases.json     # 期望 Z17–Z24 green（Z01–Z16 仍 red，W2 负责）
node tests/cover9/probe.mjs --quiet            # red=20 green=68；存储值偏差 exit 1（预期）
node typescript/cases/ast-json.mjs             # 6015 / 6015 / fail 0
node typescript/cases/ast-json-diff.mjs        # 6015 / 0 结构 / 0 位置 / 0 字段
node typescript/cases/token-ast.mjs --quiet    # 1715（ok 1705 / ts-invalid 10）
node tests/parse/validate.mjs                  # 1719 / 0
node typescript/cases/real-dts-ast.mjs         # 226 / 226
git diff b465cf6e..HEAD -- core typescript/IMPORTANCE.md   # 空
```

## 11. 提交内容

- 代码：`typescript/tokens/declarations/enum-declaration-possible-shape.xl.md`、
  `typescript/tokens/declarations/interface-declaration-possible-shape.xl.md`、
  `typescript/tokens/types/type-builder.xl.md`
- 用例与快照：`typescript/cases/possible-compute.ts`（+25）、`possible-compute.cj-ast.json`、
  `possible-compute.ts-ast.json`
- 文档：本文件。`tmp/`（survey 探针副本、Z cases、check 脚本）未提交。
