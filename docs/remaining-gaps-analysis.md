# 剩余 44 失败：分类汇总与分批修复计划

> **只读汇总**。本文件把四份分区分析（declarations / statements / types+modules / diffs）合并成
> 一张去重后的主分类表、一组跨组共用根因、一份按 IMPORTANCE §6 的七类汇总，以及一份可执行的分批修复计划。
> 基线：主仓 `feature/quick-parse` HEAD **`85daba1d`**。
> token 语料实测：**`total=1703 ok=1648 crash=35 diff=9 ts-invalid=10 gap-now-passing=1`**（1703 份 `.ts`），
> 即本文件对象 **44 = 35 crash + 9 diff**；修完后目标为 `ok 1692 / crash 0 / diff 0`（ts-invalid 10 与 gap-now-passing 1 不计入失败）。
>
> TS 侧：35 份 crash 在 `ts.createSourceFile` 下 `parseDiagnostics = 0`（全部 TS 合法，非 TS-recovery、非 TS 非法）。
> 9 份 diff 中 **2 份已登记 known-gap**（`gap-r1231`、`gap-r1237`），`stmt-throw` / `gap-r869` 带 TS 恢复色彩但
> 结构确定、对齐成本低；`decl-class-computed-member` 是 TS 的**规范行为**（对无分号对抗输入不插 ASI），属于「TS 恢复图式
> 的边界形态」，价值低。
>
> 四份来源（均为只读分析、已合入各自分支，详见 §8 溯源）：
> `docs/remaining-gaps-declarations.md`、`docs/remaining-gaps-statements.md`、
> `docs/remaining-gaps-types-modules.md`、`docs/remaining-gaps-diffs.md`。

---

## 0. 去重与数量校正（先看这一节）

| 来源 | crash | diff | 备注 |
| --- | --- | --- | --- |
| declarations | **19** | 0 | 任务书写「18」，文档实测为 19（A9+B3+C3+D1+E1+F1+G1），本文按 19 |
| statements | **9** | 0 | 含 `ambiguous/am-declare-module-nested.ts`（与 declarations 的 G 组**同一文件**） |
| types + modules | **8** | 0 | types 6 + modules 2 |
| diffs | 0 | **9** | known-gap 2 |
| **原始合计** | **36** | **9** | |
| **去重** | **−1** | 0 | `ambiguous/am-declare-module-nested.ts` 在 declarations G 与 statements G5 各记 1 次 |
| **去重后** | **35** | **9** | 合计 **44** |

- **唯一跨文档重复**：`ambiguous/am-declare-module-nested.ts`。本文把它并进「模块体语句分派」一行，
  **只计 1 次**（该行的「数量」= 1，不是 2）。
- 主分类表（§2）的 crash 行合计 = **35**，diff 行合计 = **9**，总合计 = **44**；与上文严格一致。
- 除该文件外，四份文档的文件清单两两无交集。

---

## 1. 总览

| 区域 | crash | diff | 小计 | 说明 |
| --- | --- | --- | --- | --- |
| declarations | 18 | 0 | 18 | 形参模式/默认值 9、继承实体名 3、声明头装饰器 3、孤立上下文关键字 1、`as` 类型实参 1、类型注解跨行 1 |
| modules / ambiguous（模块体分派） | 1 | 0 | 1 | `am-declare-module-nested`（decl G = stmt G5，去重后 1） |
| statements / expressions | 8 | 0 | 8 | 变量语句收口 5、return/throw 收口 1、声明体 `{` 换行 1、函数返回类型跨行 1 |
| types / modules（声明候选与 import 收尾） | 8 | 0 | 8 | 行末 ASI 6、`>>` 拆分下标 1、import/export 终结候选共存 1 |
| diffs（AST 对拍差异） | 0 | 9 | 9 | 边界 ASI 3、语句收口/do 壳 2、build/投影嵌套 3、类型位 `{` 1 |
| **合计** | **35** | **9** | **44** | |

**一句话结论**：44 份里 **35 份 crash 全部可在 `typescript/` 层修**（不碰 `core/**`、无 basic token 类）；
9 份 diff 中 7 份是稳定的结构差异（真 shape/判据缺口），2 份 known-gap（+1 份低价值 TS 恢复边界）建议留待用户拍板。
最大的单一收益点是 **decl A（形参模式/默认值，9 份）** 与 **行末 ASI 一族（statement 收口 + types G1 + decl E/F ≈ 14 份）**。

---

## 2. 去重后的主分类表（18 行 = 35 crash + 9 diff）

> 「数量」列：crash 行是该组的 crash 文件数，diff 行是该组的 diff 文件数；`类型` 列标 C=crash、D=diff。
> 「共同根因」给出**代码定位**（`typescript/**/*.xl.md` 的方法:行号），详细崩溃链/最小复现见各分区文档。
> 合计：C 行相加 = **35**，D 行相加 = **9**，总 **44**。

| # | 组名 | 区 | 数量 | 文件清单（缩写） | 共同根因（代码定位） | §6 类 | 难度 | 能否一起修 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **decl-A 形参模式/默认值** | declarations | **9** | decl-func-default-params, decl-func-destructured-params-typed, decl-func-destructured-params, decl-func-optional-params, decl-method-function-return, decl-param-arr-pattern-comment, decl-param-obj-pattern-comment, fn-destructured-params, fn-params | `function-declaration-shape:304-382` `BuildParameters` 门槛只认 `typed \|\| headIsRest`；模式/`=` 落「只认裸 Identifier」兜底 → `:357` 抛错；class 侧同构 `class-declaration-shape:430-499`（`:497`） | possible build | M | ✅ 一处（function）+ 一处（class）同构，9 份一起修 |
| 2 | **decl-B 继承子句实体名** | declarations | **3** | decl-heritage-tagged-template, gap-r985-heritage-optional-chain, gap-r985-heritage-template-expression | `heritage-clause-shape:98-107`（`startsWithAccess` 只认 `.` / `(`）→ `:145` 分支 → `:177 ParseName` → `type-builder:1780` 抛「缺少标识符」 | possible build | S | ✅ 同一处三支（`?.` / 模板串 / 标签模板） |
| 3 | **decl-C 声明头装饰器** | declarations | **3** | decl-interface-decorator-modifiers, decl-namespace-decorator-modifiers, decl-type-alias-decorator | interface/type-alias/module 的 possible Stage 0 只认 `declare`/关键字（`interface-declaration-possible-shape:81-95`、`type-alias-declaration-possible-shape:88-110`、`module-declaration-possible-shape:138+`）→ `@` 落表达式候选 → `expression-builder:2154` 抛「不支持的表达式起点」 | 缺少 possible | M | ✅ 三处同构（class 已有 `@` 路径可参照） |
| 4 | **decl-D 孤立上下文关键字** | declarations | **1** | decl-standalone-declare-abstract | `statement-builder:238-256` 的 `declare` 分支要求后跟变量关键字；关键字叶子路径（`expression-builder` `MakeKeywordLeaf` 一带）把 `declare/abstract` 提成 Keyword；EOF 兜底 `source-file-end-possible-shape:154-185` 把 `;` 交给 `expression-statement-shape:36-72`（`:71` 抛错） | possible compute（次 **basic token**，需用户决策） | S~M | ⚠️ 单独；两个方案（ts 层兜底 / basic token 不升级） |
| 5 | **decl-E `as` 类型实参后的裸 `,`** | declarations | **1** | decl-obj-destructure-computed-key | 无分号时 `endExclusive` 到文件末；`statement-builder:780-800` 初始化器按顶层 `,` 断句，`IsTypeArgumentStart`（`:629-640`）委派 `AngleJudge.CanStart`，其 `FollowerAllows` 不认「下一行语句首词」→ `<string, number>` 被切断 → `type-builder:1758` 抛「泛型实参缺少 >」 | possible build | S | ⚠️ 单独（一处扫描判据；改用 `AngleJudge.FindPair` 强制配对） |
| 6 | **decl-F 类型注解扫描跨行** | declarations | **1** | destr-object-newline-after-keyword | `statement-builder:720-762` 类型注解段终点只找 `=` / `,`（`:724-745`），不以语句结尾为界 → 吞下一行 → `:757` 抛「类型注解没有读完」 | possible build（次 end compute） | S | ⚠️ 单独（与共用根因②同一处扫描） |
| 7 | **module-block 语句分派（含 import）** | modules / ambiguous | **1** | ambiguous/am-declare-module-nested（decl G = stmt G5，**去重 1**） | `module-block-shape:104` 明确「import 成员暂缓」→ `:108` 交 `StatementBuilder.BuildStatement`，而它没有 `import`/`export` 分支 → 落 `BuildExpressionStatement` → `statement-builder:178` 抛「表达式没有读完」 | 缺少 possible | M | ⚠️ 单独（与 import/export 收尾共用根因⑦；模块体复用 root 分派表） |
| 8 | **stmt-G1 变量语句 `endExclusive` 只认 `;`** | statements / expressions | **5** | st-switch-block-case, stmt-switch-block-scoped-case, stmt-asi-long-chain, ex-await-yield, ex-call-comment-before-args | `statement-builder:642-668` `BuildVariableStatement` 的 `while (!IsSymbol(";")) endExclusive++`；而同文件 `:543` `BuildExpressionStatement` 已有 `EndsAtLineBreak` —— **同问题两个入口不同源** | end compute | S | ✅ 一个判据（复用 `EndsAtLineBreak` + 续接符白名单） |
| 9 | **stmt-G2 return/throw 表达式区间** | statements | **1** | stmt-unreachable-after-return | `statement-builder:1040` `BuildReturnOrThrow` 的 `endExclusive` 只按 `;`/段末算（同 G1 判据缺失，入口不同） | end compute | S | ✅ 与 G1 同一判据 |
| 10 | **stmt-G3 声明体 `{` 换行** | statements | **1** | gap-r929-label-body-brace-newline | `expression-statement-possible-shape:293-351` `IsAsiBoundary` 规则 5「段首声明关键字」从段首往回走 basic token，遇到标签头 `en:` 查不到 `enum` ⇒ 在被标声明的 `{` 处误判 ASI 边界；与 `StatementPossibleShape` 共存 → CatalogGuide 抛错 | end compute（次 possible compute） | M | ⚠️ 单独（共享判据，解析期+收尾期共用，回归面最大） |
| 11 | **stmt-G4 函数返回类型跨行** | statements | **1** | expr-generic-inst-statement | `function-declaration-shape:197` 返回类型扫描不认「换行 + 下一句起点」→ 吞 `f<string>;` | end compute | M | ⚠️ 与共用根因②（类型扫描不认 ASI）同一判据 |
| 12 | **types-G1 声明候选缺行末 ASI/边界** | types / modules | **6** | **TypeAlias×4**：gap-r907-indexed-access-newline, ty-export-type, type-export-type, type-tail-linecomment；**VariableStatement×1**：type-typeof-qualified-index；**ImportEquals×1**：mod-import-equals-entity-name-newline | 声明候选只在顶层 `;`/EOF Accept：`type-alias-declaration-possible-shape:56-138`（`DoneAt` 只记 `;`）→ `type-alias-declaration-shape:169-175` 抛；变量注解 `statement-builder:720-758`；import-equals `import-equals-declaration-shape:151-166`（`:160` 抛） | end compute | S–M | ✅ 同一判据，建议按 3 宿主（TypeAlias / VariableStatement / ImportEquals）分 3 个 patch |
| 13 | **types-G2 `>>` 拆分后的下标错位** | types | **1** | type-parameter-list | AngleJudge 把前一条声明的 `>>` 拆成两个 `>` → 宿主 `Data` 变长；`type-alias-declaration-possible-shape:66-69/:144/:151-156` 的缓存整数下标随之偏移 → `FromUnits` 切片错 → `:174` 抛「类型别名声明的类型没有读完」 | possible compute | M | ⚠️ 独立修（缓存改存「单元引用」而非整数下标） |
| 14 | **types-G3 import/export 终结候选共存** | modules | **1** | ex-default-after-import-01 | `import './pool'`（无 `;`）后 `export`：`import-declaration-end-possible-shape:60-86` 行末 ASI 分支 Accept，但 shell 候选 `ImportDeclarationPossibleShape` 还没 Reject → `catalog-guide:90-96` 抛「终结候选与其它候选同时成立」 | end compute | M | ⚠️ 独立（根因⑦；建议让 shell 先收口，A 案） |
| 15 | **diff-A 边界 ASI 判据** | statements / types / declarations | **3** | stmt-throw-no-argument-then-statement, gap-r907-index-signature-newline-after-readonly, decl-class-computed-member | ① `statement-builder:1050-1052` `split` 写死 `!isThrow` → throw 换行不收口；② `readonly` 与 `[` 换行仍被当修饰词（`class-declaration-shape:616` / `member-boundary:75-104`）；③ 成员值收口把「换行 + `[`」一律当新成员（`class-declaration-shape` `BuildMembers` 的 `FindMemberBoundary` 三处） | end compute | S / S–M / M | ⚠️ 三种判据不同源；B1 先取前 2（S），第 3 低价值可延后 |
| 16 | **diff-B 语句收口 / do 壳** | expressions / statements | **2** | gap-r1231-decl-newline-operator（known-gap）, stmt-do-while-body-terminated | ① 块 `}` + 换行 + `/` 没被当新语句（`source-file-end-possible-shape` ASI 判据 / `RegexStartAfter` 无写入点）；② `BuildDo:871` + `DoWhileCloseRule` 的块体「`}` 后等 `while`」没接住，`do-statement-possible-shape:18/24` 仍是空桩 | end compute（次 possible compute） | M / M–L | ✅ 可一起（共享语句收口判据，需全量对拍） |
| 17 | **diff-C build/投影嵌套** | expressions / modules | **3** | gap-r979-new-inst-tagged, gap-r869-exp-named-newline-then-from-like, gap-r955-yield-await-outside-context | ① `ParseNew`↔`ParsePostfix` 结合顺序（`expression-builder:1013-1030` / `:771-786`）：`new` 被包进 TaggedTemplate 外层，TS 是 `new (TaggedTemplate)`；② `export-declaration-shape:147-180/:236` 的 moduleSpecifier 只认裸 `String`，`from("m")` 的括号化形态缺 `ParenthesizedExpression`；③ 裸 `yield`/`await` 缺 generator/async 上下文（`SyntaxContext` 无标志，`ParseYield:624-657`） | possible build（③次缺少 possible/上下文） | M / S / L | ⚠️ 三个独立（①M ②S ③L） |
| 18 | **diff-D 类型位「词 + `{`」** | types | **1** | gap-r1237-type-position-brace（known-gap） | heritage 实体名只认标识符（`interface-declaration-possible-shape:111-139` 把 `{` 当接口体；`TakeDottedName`/`InterfaceBranch` 不认 `TypeLiteral`）；谓词类型字面量与函数体 `{` 相邻时的边界各自判断（`print-ast-common` 谓词投影入口） | possible compute（次 possible build） | L | ⚠️ 独立（三档共用一条「类型位 `{` 边界」判据） |

**主分类表合计**：crash 行（#1–#14）= 9+3+3+1+1+1+1+5+1+1+1+6+1+1 = **35**；diff 行（#15–#18）= 3+2+3+1 = **9**；**总 44**。

> 去重说明（再次强调）：#7 的 1 份 = declarations 文档的 G 组与 statements 文档的 G5 组**同一文件**
> `ambiguous/am-declare-module-nested.ts`，原始两份文档各记 1 次（36），合并后只计 1 次（35）。

---

## 3. 跨组共用根因（修一处带出多份）

> 这些是「合并修复」的抓手：同一判据/同一入口在多组分叉，先抽公共判据再修，可避免二次回归。

| # | 共用根因 | 受影响组（含数量） | 统一修点 | 修一处预计带出 |
| --- | --- | --- | --- | --- |
| ① | **ASI 语句边界判据「两个入口不同源」** | stmt G1(5)、stmt G2(1)、types G1 的 TypeAlias(4)+VariableStatement(1)+ImportEquals(1)、decl E(1)、decl F(1)、diff-A 的 stmt-throw(1)、diff-B 的 gap-r1231(1) | 把 `StatementBuilder.EndsAtLineBreak`（`statement-builder:543` 已有）抽成唯一判据，`BuildVariableStatement` / `BuildReturnOrThrow` / `BuildExpressionStatement` 三处共用；续接符白名单（`,` `=` `=>` `\|` `&` `:` `.` `?` 等）统一 | stmt 6 + types G1 6 + decl E/F 2 ≈ **14 份** |
| ② | **类型扫描不认 ASI** | stmt G4(1)、types G1 TypeAlias(4)、decl F(1)、diff-A 的 readonly 成员边界?（否，属④/成员边界） | 新增 `EndsTypeAtLineBreak`（`TypeBuilder` 或 `StatementBuilder` 公共静态），三处调用点复用：变量注解（`statement-builder:633` 一带）、函数返回类型（`function-declaration-shape:197`）、类型别名（`type-alias-declaration-shape:165`） | ≈ **6 份**（与①交叉 2 份） |
| ③ | **`;` 归属（下一行以 `;` 开头）** | stmt G1 的 ex-call-comment-before-args(1)、types G1 的 VariableStatement(1)；历史 O 组（`gap-r942` 已修） | 边界判据里**放行**「下一个代码单元是 `;`」→ 归上一条语句（否则留给空语句、位置漂一格） | **2–3 份**（含防回归） |
| ④ | **声明体 `{` 换行 + 被标声明** | stmt G3(1)、diff-D 的 gap-r1237(1)（类型位 `{` 同族） | `IsAsiBoundary` 规则 5 往回找段首时**跳过标签头**（`Identifier :`）再看声明关键字；`current` 是 `{` 且段首是 `enum/interface/class/namespace/module` ⇒ 不判 ASI 边界。注意该判据解析期与收尾期共用（`source-file-end-possible-shape:48`），必须钉住 `if (a) b\n{}`、`class C\n{}`、`f()\n{}` 三组对照 | **2 份** + 防大面回归 |
| ⑤ | **模块体语句分派表缺失/分叉** | module-block import(1，同一文件还有体内 `export interface`)、diff-C 的 gap-r869(1 的 export 侧收尾) | 模块体复用 **root 的声明分派表**（import/export/declare/interface/type/const），不要第二份；或给 `BuildStatement` 增 import/export 分支调 `ImportDeclarationShape.FromUnits` / `ExportDeclarationShape.FromUnits` | **1–2 份** |
| ⑥ | **`>>` 拆分导致宿主 `Data` 变长、旧下标失效** | types G2(1)；风险面 = 所有「拆分后重建声明」的候选（class/interface/function 声明 + 其后的语句级扫描） | 语句级扫描缓存改存「单元对象引用」而非整数下标（`start = host.Data.indexOf(state.StartUnit)`），`IsBuildable` 比较 `Done` 单元对象；拆分点显式失效同宿主缓存（二期） | **1 份** + 预防同族 |
| ⑦ | **import/export 收尾不变量** | types G3(1)、types G1 ImportEquals(1)、module-block import(1)、diff-C 的 gap-r869(1) | 统一复用 `ImportDeclarationEndPossibleShape.CanEndAt/IsCompleteAt`（`import-declaration-end-possible-shape:89-130`）的续接表；shell 候选在行末边界主动 Reject（A 案），保证「终结候选 Accept 前 Candidates 已空」 | **3–4 份** |

另有**组内单点多次收益**（不属于跨组，但一次改完多份）：decl A（9，function/class 两处 `ParseParameter` 路由）、
decl B（3，`startsWithAccess` 一支三档）、decl C（3，三处 possible 同构）、types G1 的 TypeAlias 4（一处判据）。

---

## 4. §6 七类汇总（与 IMPORTANCE「七类问题」对齐）

| # | IMPORTANCE §6 类别 | crash | diff | 合计 | 组 / 文件 |
| --- | --- | --- | --- | --- | --- |
| 1 | **basic token 存在问题** | 0 | 0 | **0** | 当前 0 份。若 decl D 走「basic token 不升级成 Keyword」方案，则该 1 份转此类（**需用户发起**，见 §6） |
| 2 | **缺少 possible** | 4 | 0 | **4** | decl C（3）、module-block import（1） |
| 3 | **缺少 end** | 0 | 0 | **0** | — |
| 4 | **possible compute 不对** | 2 | 1 | **3** | decl D（1）、types G2（1）；diff-D gap-r1237（1） |
| 5 | **possible build 不对** | 14 | 3 | **17** | decl A（9）、decl B（3）、decl E（1）、decl F（1）；diff-C（3） |
| 6 | **end compute 不对** | 15 | 5 | **20** | stmt G1（5）、G2（1）、G3（1）、G4（1）、types G1（6）、types G3（1）；diff-A（3）、diff-B（2） |
| 7 | **end build 不对** | 0 | 0 | **0** | —（types 文档 §1.2 里 `type-tail-linecomment` 的「end build」现象已按**主类 end compute** 计入，避免重复计数） |
| | **合计** | **35** | **9** | **44** | |

> 计数口径：每组只按**主类**计一次；次类（如 decl F 次 end compute、stmt G3 次 possible compute、
> diff-A3 次 possible compute）只在各分区文档里标注，不重复计入本表。

---

## 5. 分批修复计划（4 阶段，从 1648 / 35 / 9 起算）

> 每一阶段独立 commit；验收命令见 §7。每阶段先写 2–3 条最小复现（各分区文档正文已给），
> 再动代码；以「逐文件 pre/post 失败清单对比」防回归。
> 「预期读数」是**名义值**（目标文件全部转 ok）；若出现「crash → diff 而非 ok」的个例，从 ok 里减去、diff 里加上，
> 仍算「不回归」（见各阶段备注）。

### Stage 1（S 难度，拿量）—— 18 份

| 组 | 文件数 | 难度 | 回归风险 |
| --- | --- | --- | --- |
| decl B 继承子句实体名 | 3 | S | 继承子句全语料（class/interface extends/implements）；`A.B<C>` 路径 |
| decl E `as` 类型实参 | 1 | S | 无分号 `as`/`satisfies` 带泛型实参的语料；比较运算误判面 |
| decl F 类型注解跨行 | 1 | S | 多行变量声明/类型注解；带泛型逗号的类型 |
| stmt G1 变量语句收口 | 5 | S | `const a = 1, b = 2`、`let a: T = v`、`for (let …)`、`declare const x: T`、`const a = 1\n;`（`;` 归属） |
| stmt G2 return/throw 收口 | 1 | S | `return (\n x )`、`return a\n + b`、`return` 在 case 里后跟 `}` |
| types G1 的 TypeAlias 4 份 | 4 | S–M | 所有 type alias / `export type`；`A\n\| B`、`F<\nT>` 跨行类型；行尾注释仍归 trivia |
| diffs B1（stmt-throw、gap-r907 索引签名、gap-r869） | 3 | S / S–M / S | throw 换行；成员修饰词换行 + `[`；`from ( "m" )` 括号化 moduleSpecifier |
| **合计** | **18** | | |

**预期读数**：**ok 1666 / crash 20 / diff 6**（ok +18 = 15 crash + 3 diff）。
- 备注（可能转 diff）：types G1 的 TypeAlias 4 份若按文档警告由 crash 转 diff（`type-tail-linecomment`、
  `gap-r907-indexed-access-newline` 属 end-build 同族），则 ok 1662–1666、diff 6–10，crash 20 不变；
  这属于「崩溃消掉、口径另修」，不算回归。
- 备注（TS 恢复形）：`stmt-throw` 是 S 成本的恢复图对齐，作为例外进本批（分区文档已判定值得）。

### Stage 2（M 难度，主体）—— 15 份

| 组 | 文件数 | 难度 | 回归风险 |
| --- | --- | --- | --- |
| decl A 形参模式/默认值 | 9 | M | 所有函数/方法形参；`parameter-shape` 消费方；`ParseParameter` 共用 |
| stmt G4 函数返回类型跨行 | 1 | M | 类型扫描 ASI 三处调用点；`A\n\| B` 不被切断 |
| types G1 其余（VariableStatement 1 + ImportEquals 1） | 2 | S | `declare`/多行注解守卫；跨行限定名 `import A = foo\n.b` 必须继续 |
| types G3 import/export 终结候选共存 | 1 | M | 所有无分号 import（side-effect/named/default/`import type`）；`import { a }\nfrom "m"` 不受影响 |
| module-block 语句分派（import） | 1 | M | `declare module` 体内 import/export/declare/interface/type/const 全族 |
| diffs B2（gap-r979 new + 标签模板） | 1 | M | `new f<T>`t`` / `new A.B`t`` / `new Map<K,V>()` 三类共享 |
| **合计** | **15** | | |

**预期读数**：**ok 1681 / crash 6 / diff 5**（累计 +15 = 14 crash + 1 diff）。
- 若同批顺手做 `decl-class-computed-member`（价值低、见 §6 决策），则 ok 1682 / diff 4；
  本文默认把它推迟到 Stage 4 的决策项。

### Stage 3（M–L 难度，收尾）—— 7 份

| 组 | 文件数 | 难度 | 回归风险 |
| --- | --- | --- | --- |
| decl C 声明头装饰器 | 3 | M | interface/namespace/module/type alias 声明候选；modifiers 投影（`@dec class C {}` 已是绿的，别动 class 路径） |
| stmt G3 声明体 `{` 换行 | 1 | M | `IsAsiBoundary` 共享判据（解析期+收尾期）；`if (a) b\n{}`、`class C\n{}`、`f()\n{}` 三组对照 |
| types G2 `>>` 拆分下标 | 1 | M | 所有 type alias + 所有走拆分路径的 class/interface/function 声明；全量 ast 对拍 |
| diffs B3（gap-r1231 块尾 `/`、stmt-do-while 壳） | 2 | M / M–L | `}` 后 `/` 的除法 vs 正则；do-while 全部形态 |
| **合计** | **7** | | |

**预期读数**：**ok 1688 / crash 1 / diff 3**（累计 +7 = 5 crash + 2 diff）。
- 备注：`gap-r1231` 是 known-gap，但分区文档判定可在 shape 层（end 判据）修，无需用户裁定；
  若改完仍留 diff，可保留 known-gap 并减记收益（ok −1 / diff +1）。

### Stage 4（S–M：1 份修复 + 用户决策/known-gap）—— 1 份必做 + 3 份可选

| 项 | 文件数 | 难度 | 说明 |
| --- | --- | --- | --- |
| decl D 孤立上下文关键字 | 1 | S~M | 走「`typescript/` 兜底」：EOF/ASI 兜底先剥尾 `;`，表达式层把孤立 `declare/abstract` 当 Identifier（与 `foo;` 同路） |
| diffs B4：gap-r955（generator/async 上下文）、gap-r1237（类型位 `{`） | 2 | L / L | **需用户决策**：接受长期 known-gap，或立项（gap-r955 可先试投影层 `Parent` 链，不动 core；gap-r1237 需大改 heritage/谓词边界） |
| decl-class-computed-member（TS-recovery，低价值） | 1 | M | **建议不模仿**：TS 对无分号对抗输入不插 ASI，shape 判据正确；可接受长期 diff 或加 known-gap 注释 |
| `\u{…}` 花括号转义标识符（可选） | 0（无对应语料） | M~L | 前瞻项：ES2015 `\u{1F600}` 形态；需用户发起 basic token/token 层决策，**不计入 44** |

**预期读数（Stage 4 必做部分）**：**ok 1689 / crash 0 / diff 3**（+1 crash）。
**若用户批准 B4 + decl-class-computed-member 全部对齐**：**ok 1692 / crash 0 / diff 0** —— 44 份全部清零。

### 阶段读数汇总

| 阶段 | 起始 ok/crash/diff | 处理份数 | 结束 ok/crash/diff |
| --- | --- | --- | --- |
| 基线 85daba1d | — | — | **1648 / 35 / 9** |
| Stage 1 | 1648 / 35 / 9 | 18（15C+3D） | **1666 / 20 / 6** |
| Stage 2 | 1666 / 20 / 6 | 15（14C+1D） | **1681 / 6 / 5** |
| Stage 3 | 1681 / 6 / 5 | 7（5C+2D） | **1688 / 1 / 3** |
| Stage 4（必做） | 1688 / 1 / 3 | 1（1C） | **1689 / 0 / 3** |
| Stage 4（用户批准 3 份 diff 对齐） | 1689 / 0 / 3 | 3（3D） | **1692 / 0 / 0** |

> 算术核对：35 = 15+14+5+1；9 = 3+1+2+3；1648+18+15+7+1(+3) = 1689(+3) = 1692；
> 1703 = 1692 ok + 0 crash + 0 diff + 10 ts-invalid + 1 gap-now-passing。

---

## 6. 需要用户拍板 / 知情的清单

1. **decl D（`declare;` / `abstract;`，1 份 crash）**：两条路——
   ① 纯 `typescript/` 层兜底（EOF/ASI 兜底先剥尾 `;` + 孤立关键字当 Identifier）：不碰 core，S~M；
   ② **basic token 层**「`declare`/`abstract` 不升级成 Keyword」：按 `IMPORTANCE §3.1` **只能由用户发起**，会动
   `core/syntax/basic-tokens/`。建议走 ①，②仅作用户选项记录。
2. **diffs B4 两份（`gap-r955`、`gap-r1237`）**：均 L 难度、跨层/大边界改动。
   - `gap-r955`：`yield`/`await` 缺 generator/async 上下文标志（`SyntaxContext` 无此位）。可先试「投影层沿 `Parent` 链判」
     （不动 core），彻底方案要跨层加标志，影响 `await`/`yield` 全部形态。
   - `gap-r1237`：类型位「词 + `{`」三档（heritage 类型字面量 / `is {…}` / `asserts x is {…}`），需共用一条
     「类型位里 `{` 的边界」判据，回归面高。
   请拍板：**接受长期 known-gap**，还是**立项**（若立项，建议单独立项、不进近期批次）。
3. **`decl-class-computed-member`（1 份 diff）**：TS 对「无分号的两个计算成员」不插 ASI，把第二行吞成
   第一个成员的初始化器（`1["s"+"t"] = 2` 的赋值链）。本仓两成员切分是规范行为。**建议不模仿**：
   接受长期 diff，或在 fixture 上加 `xl:known-gap` 说明（文档层，不改判据）。
4. **`\u{…}` 花括号转义（前瞻，无语料）**：若未来要支持，属 token 层字符归类，需用户发起；当前不计入 44。

---

## 7. 公共验收口径（每阶段都要跑）

```bash
# 构建（应 0 error；W3102/W3103 为既有噪音）
xl_build(cwd=<克隆>, paths=["core","typescript"], orphans:false)
node node_modules/typescript/bin/tsc                       # 退出码 0

# 目标文件
node typescript/cases/token-ast.mjs <目标文件相对路径>      # 退出码 0（PASS）

# 全量（1703 份）
node typescript/cases/token-ast.mjs --quiet                # crash/diff 只降、ok 只升
node typescript/cases/token-ast.mjs --fail-only            # 与改前失败清单逐文件比对，0 份原 ok 变坏

# AST 回归
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs                    # 4806/4806，结构差 0 / 位置差 0 / 字段差 0（HEAD 85daba1d）
node typescript/cases/real-dts-ast.mjs                     # 226/226（如本机有 dts 语料）
```

判定：**该批目标全部 PASS；全量 crash/diff 不升、ok 不降；0 份原 ok 变坏；ast:cases 完全一致；tsc 0 error**。
各分区的详细回归面与「四问/五问」答案见源文档对应小节。

---

## 8. 溯源

| 内容 | 路径（分支 / commit） | 克隆 | 覆盖份数 |
| --- | --- | --- | --- |
| declarations 分区分析 | `cover-gaps-decl` 分支 **`383d1182`**：`docs/remaining-gaps-declarations.md` | `C:\Users\Admin\Documents\GitHub\xl-example-set\cover-gaps-decl` | 19 crash（= 18 declarations + ambiguous 1） |
| statements 分区分析 | `cover-gaps-stmt` 分支 **`69558d66`**：`docs/remaining-gaps-statements.md` | `...\cover-gaps-stmt` | 9 crash（含同一个 ambiguous） |
| types + modules 分区分析 | `cover-gaps-types` 分支 **`804fca2f`**：`docs/remaining-gaps-types-modules.md` | `...\cover-gaps-types` | 8 crash（types 6 + modules 2） |
| diffs 分区分析 | `cover-gaps-diffs` 分支 **`bb9243eb`**：`docs/remaining-gaps-diffs.md` | `...\cover-gaps-diffs` | 9 diff |
| **本汇总** | `cover-gaps-summary` 分支：`docs/remaining-gaps-analysis.md`（基线主仓 HEAD `85daba1d`） | `...\cover-gaps-summary` | **44 = 35 crash + 9 diff（去重后）** |
| 上位总览（历史读数/七类/相位） | `docs/token-ast-analysis.md`（本文为其 §10 的交叉引用对象） | 主仓 | 历史 191 条归因与修复状态 |

> 本文只做汇总与排期，不改变四份源文档的任何结论；数量差异（declarations 18→19）按源文档实测 19 采用。
> 各条具体「崩溃链 / 最小复现 / 用户五问 / 逐文件行号」以源文档为准，本文不重复。
