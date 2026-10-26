# B4d · 箭头参数 `(` 的 Deferred replay（K2）

| 项 | 值 |
| --- | --- |
| 角色 | 站点智能体 B4d（补 K2：箭头形参 `(` 的 Deferred → 一次 replay） |
| 工作副本 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4d-arrow-params`，分支 `feature/b4d-arrow-params` |
| base | 主仓库 HEAD `c641266b`（B4c2 已合并；`EnableExprBracketCatalog=true`） |
| 提交 | `92f96f61` feat(b4d): arrow param bracket deferred replay（+ 本报告） |
| 改动 | 4 改 + 1 新建 + 1 探针（`arrow-params-catalog.xl.md` 新建；`arrow-function-shape` / `deferred-bracket-catalog` / `bracket-role-resolver` / `expression-builder` 修改） |
| 构建 | `xl_build {core,typescript}` **0 error / 3 warning**（3 条均既有 `E1107`）；`tsc -p .` exit 0；`xl check`（5 个改动文件）0/0 |
| 未合并 / 未 push / 未删目录 | 是 |

---

## 0. 结论先行

1. **K2 接通了**：箭头形参 `(` 在创建格登记 `Deferred ArrowParams`（A4b 的判定 + `B4b` 的
   `arrow-paren-wait-for-arrow`），`=>` 确定时由 `ArrowFunctionShape.BindParameterBracket` 调
   `DeferredBracketCatalog.Bind`，**每条括号恰好一次** replay；`ReplayFailureCount` 全程 **0**。
2. **`BuildGuide` 的「拒绝空 `Shapes`」没有绕过，是补了合法计划**：新增 `DeferredBracketCatalog.UpgradePlan`，
   在 replay 前用**已注册的角色目录**把 `Deferred` 计划升级成 `Known`（`Shapes` 非空、终结候选仍由
   安装器统一补 `WaitingEndPossible`）。守卫一个字没放宽。
3. **逐字建**：`(a: number)` / `(a, b)` / `async (a: number)` 的 `a` / `b` 在 replay 里成
   `ParameterShape` + `IdentifierShape`（+ 类型子节点），箭头形状仍由 legacy
   `ExpressionBuilder.ParseArrowFromBracket` 在收口格整棵建出——**参数不再被 legacy 按 raw 重读**，
   而是被 `ParseFunctionParameters` 直接收下（新增一条分支）。
4. **非箭头 `(a)` 不误 replay**：条目留在 `Pending`，`ReplayCount == 0`，分组括号原路。
5. **默认档四道门与 base 逐位相同或更好**：`gates` **4 / 0 / 7**、`wide-ast` **0 / 33 / 83+13=96**
   （base 84+13=97，**少一件 fallback**）、`--legacy` **0 / 0 / 2**、`real-dts` **PASS**、
   `tts` **429 PASS**、`ts-all` **429 / 426 ok / 3**（同三条）。

---

## 1. 改了哪几处、为什么是这几处

| # | 文件 | 动作 | 内容 |
|---|---|---|---|
| 1 | `typescript/tokens/expressions/forms/primary/arrow-params-catalog.xl.md` | **新建** | `ArrowParamsCatalog`：注册 `ArrowParams` 角色目录（候选复用 B1 的 `ParameterPossibleShape`）、`IsArrowable`（= `ParameterListPossibleShape.IsSimpleList`）、`IsPendingArrowParen`、`FinalizeBracket`、`BindArrowParen`（唯一 replay 入口）、6 个只读计数 |
| 2 | `typescript/tokens/expressions/arrow-function-shape.xl.md` | 修改 | `static BindParameterBracket(bracket, context)`：箭头一侧唯一调 `DeferredBracketCatalog.Bind` 的地方 |
| 3 | `typescript/tokens/statements/deferred-bracket-catalog.xl.md` | 修改 | `Bind(owner, narrow?)`：① `owner` 可以是**角色键字符串**；② `narrow` 把本次 `Bind` 限定到一只括号；③ 新增 `UpgradePlan`（Deferred → Known，补非空 `Shapes`） |
| 4 | `typescript/tokens/statements/bracket-role-resolver.xl.md` | 修改 | 新增 `IsAsyncArrowPrefix`；`Classify` 的 `(` 分支给 `async (` 一条 `Deferred ArrowParams`（`async-arrow-paren-wait-for-arrow`） |
| 5 | `typescript/tokens/expressions/expression-builder.xl.md` | 修改 | `ParseFunctionParameters`：① 入口调 `ArrowFunctionShape.BindParameterBracket(bracket, this.Context)`；② 循环里「已经是 `ParameterShape` 就直接收下」 |
| 6 | `typescript/cases/tts/tools/arrow-param-probe.mjs` | **新建** | 13 条只读探针（`PASS`），断言 §2 的三件事 |

`Bracket`（core）/ `variable-declaration-*` / `composite-initializer-forms-*`（K1 与 A4b 的写域）
**一个字节都没动**。

---

## 2. 机制（按 replay 的生命周期）

```
(` 格：BracketRoleResolver.Classify → Deferred ArrowParams（OwnerKey="ArrowFunctionShape"）
        → BracketRoleCatalogHook.OnBracketCreated → DeferredBracketCatalog.Register（只记引用）
=> 格：ExpressionBuilder.ParseArrowFromBracket（唯一知道 `)=>` 成立的地方）
        → ParseFunctionParameters(bracket)
        → ArrowFunctionShape.BindParameterBracket(bracket, context)
        → ArrowParamsCatalog.BindArrowParen:
             IsArrowable 判否 ⇒ RejectCount+1，不 replay（显式计数、不静默）
             Bind("ArrowFunctionShape", bracket)  ← 定向 + 一次（R1 由 bracket.ReplayCount 守）
                 ← UpgradePlan：Deferred → Known（补非空 Shapes）
                 ← BuildGuide / Replay：逐格 ComputePossibleShapesByIndex，建 ParameterShape
             FinalizeBracket：连做 Step，收口最后一个参数壳
             CollectBuiltParameters：残留非空 ⇒ HalfBuildCount+1（非 0 即缺陷）
收口：ParseFunctionParameters 的循环遇到 ParameterShape 直接收下（Pos / 区间是它自己建的）
```

**为什么 replay 的触发点在 `ParseFunctionParameters`，而不是某个 `=>` 格的候选**（这一条是实测结论，
不是偏好）：`VariableDeclarationShape` 的初始化器目录是 `IncrementalVariableDeclarationListBuilder.GuardedCatalog()`
（30 个 `DeclarationCellGuard`），实测在 `let f = (a: number) => a;` 里它对
`ArrowPossibleShape` 只投喂到 `=` 格（`Symbol("=")`）一次，之后整条声明在**下一格一次性建完**——
`=>` 那一格**不会**再问任何表达式候选（`tmp/dbg-guide.mjs` 的逐格读数）。所以把 Bind 挂在
「`=>` 格上的候选」（A2 §3 的原始建议）在这份 base 上**不会发生**；挂在
`ParseArrowFromBracket → ParseFunctionParameters` 上则是**每一条箭头都必然经过**的唯一位置，
判断归因也更硬：**只有 `)=>` 成立才会走到这里**。

**为什么参数必须由 legacy 收下、而不是在这里把箭头建掉**（B4b §5.2 第 3 条的同一处）：
`ArrowFunctionShape` 的箭头体由 `ArrowBodyPossibleShape` 建，而它只认「单标识符体」
（`(a, b) => a + b` 的体是二元表达式）。在 `=>` 格抢先建箭头会让 `a + b` 落到箭头之外
（错树，比崩溃更难查）。所以本棒**只 replay 形参、不抢建树那一拍**：箭头仍由 legacy 在收口格
整棵建出，树与 base 逐节点一致（`ts-all` 426 ok 不变即证据）。

**`Bind` 的两条扩展都是为了「不误领」**：① 通配 `Bind(owner)` 会把同文件里**所有**
`Deferred ArrowParams`（包括 `let a = (x), b = (y) => y` 的 `(x)`）一起 replay，
`(x)` 于是被建出参数壳、legacy 的分组括号读不到 raw ⇒ 必须按括号身份定向（`narrow`）；
② 箭头形状在 `=>` 那一格**还不存在**，用 `owner.constructor.name` 去认领就得造一个假实例，
所以 `owner` 接受角色键字符串（`"ArrowFunctionShape"`），并在注释里写明理由。

**一次性的两条证据**（探针 `arrow-twice` / `arrow-nested`）：同一括号第二次 `Bind` 时
`bracket.ReplayCount == 1` ⇒ `Replay` 直接返回 0 ⇒ `Bind` 返回空 ⇒ 不重复建；
`ReplayFailureCount` 在 13 条探针里恒为 0。

---

## 3. 探针读数（`node typescript/cases/tts/tools/arrow-param-probe.mjs`，13 条全 OK）

| 片段 | `(` 的角色 | replay | 结果 |
|---|---|---|---|
| `let f = (a: number) => a;` | Deferred ArrowParams | **1** | `a` → `IdentifierShape`；`(a: number)` 的 `ParameterShape(pos=9, IdentifierShape+NumberKeywordShape)` |
| `let g = (a, b) => a + b;` | Deferred ArrowParams | **1** | 两个 `ParameterShape(pos=9 / 11, IdentifierShape)` |
| `let h = async (a: number) => a;` | Deferred ArrowParams（`async-arrow-paren-wait-for-arrow`） | **1** | 同第一条 |
| `let k = x => x;` | 无括号 | 0 | 单标识符路径逐字节不变 |
| `let o = { m: (a: number) => a };` | Deferred ArrowParams（括号宿主元素位） | **1** | 值位箭头也 replay |
| `let c = h((a: number) => a + 1);` | Deferred ArrowParams（实参位） | **1** | 同上 |
| `let n = (a) => (b) => a + b;` | 外层 Deferred / 内层 Fallback | 1 | 内层见 §6 R2 |
| `let p = …; let q = …;` | 两条 Deferred，各一次 | **2** | 键定向不互相误领 |
| `let v = (a);` | Deferred（从未 `=>`） | **0** | 条目留在 `Pending`，走 `Paren`，不误 replay |
| `let w = (a) + 1;` | 同上 | **0** | 同上 |
| `let q = f(a, b);` | Known CallArgs | 0 | 实参表不受影响 |
| `function fn(a: number) {}` | Known ParameterList | 0 | B1 的路径不受影响 |
| `let d = (a: number, b = 1) => a;` | Deferred，`IsArrowable=false` | **0** | `RejectCount+1`，整段交 legacy（见 §6 R1） |

每条片段的 `fail+0`、`half=0`、`fileFallback=false`。

---

## 4. 验收读数（默认档）

| 命令 | base `c641266b` | 本提交 |
| --- | --- | --- |
| `xl_build {core,typescript}` | 632 页 / 0 error / 3 warning | **0 error / 3 warning**（同三条既有 `E1107`） |
| `node node_modules/typescript/bin/tsc -p .` | exit 0 | **exit 0** |
| `node tests/parse/wide-ast.mjs` | 0 / 33 / 84+13=97 PASS | **0 / 33 / 83+13=96 PASS**（fallback **少 1 件**） |
| `node tests/parse/wide-ast.mjs --legacy` | 0 / 0 / 2 PASS | **0 / 0 / 2 PASS** |
| `node typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0 / 429**（throw 3 / atomic 0 / partial 0 / incremental 426，逐项同基） |
| `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 429 / 426 ok / 3 err | **429 / 426 ok / 3 err**（`class-ball` / `expression-zoo` / `generic-container`，逐条同基） |
| `node tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 / 0 / 7**（`wide-ast`、`real-dts` 两道尺子 PASS） |
| `real-dts-ast` | PASS（0 崩溃 / 0-33 差异） | **PASS：崩溃 0 / 差异 0/33 / 缺 range 0** |
| `cases:check` | 1720 / 0 不合格 | **1720 条 0 条不合格** |

`FileFallbackByFamily`：`tests/cases/token=82、samples/declarations.ts=1`（base 83 / 1）。
少的那一件来自 `async (…)=>…` 现在走增量：`Classify` 认出 `async (` 是 Deferred 之后，
该括号不再是 `Fallback("no-host-rule:VariableDeclarationShape(")`，声明不再整条回退。

---

## 5. 与既有 WP 的边界（逐条核过）

| 边界 | 本棒做了什么 | 为什么安全 |
|---|---|---|
| B1 的 `ParameterListPossibleShape` | **只复用**（`Shapes()` / `EnsureState` / `Step` / `CloseShell` / `CollectBuiltParameters`），未改该文件 | B1 的探针读数不变：`function fn(a: number) {}` 仍 `Known ParameterList`、`replay 0` |
| B1 的「简单参数表」闸 | 原样沿用（`IsSimpleList`） | 保证「要么整份建、要么一个字节不动」，不出现半建 |
| A4b `Family` / `CompositeInitializerForms*` | **未改** | `(a) + b` / `(a)` 的分组判定逐字节不变（探针 `paren-binop` / `paren-only`） |
| K1（容器 shape 替换父 Data） | **未做** | replay 不碰父单元 `Data`，只碰括号自己的 `Data` |
| `variable-declaration-*` | **未改** | 收口时机与建树路径都由 legacy 原样决定 |
| core `bracket.xl.md` | **未改** | `ReplayCount` / `RoleState` / `Role` 都是 B0 既有字段 |
| `BuildGuide` 的空 `Shapes` 守卫 | **未放宽** | 用 `UpgradePlan` 补一份合法 `Known` 计划（有目录才有 `Shapes`，没目录仍然 `null` ⇒ 计数并拒绝） |

---

## 6. 剩下的、写在明处的卡点（没有静默）

| id | 项 | 现状 | 原因 / 下一步 |
| --- | --- | --- | --- |
| **R1** | 默认值 / 可选 `?` / 解构 / 装饰器 / 泛型类型的形参表 | **不 replay**（`RejectCount+1`），整段照 base 交 legacy；`let d = (a: number, b = 1) => a;` 的树仍正确（`ParameterShape(pos=19, IdentifierShape+NumericLiteralShape)` 由 legacy 建） | `ParameterListPossibleShape.IsSimpleList` 的闸（B1 §2 / R3 同一处）。放开要先给 `Probe` 加「吃掉 `=` + 默认值」的动作，并把 `CollectBuiltParameters` 的残留判据扩到 `=`，再验证「已建 `ParameterShape` 的区间含默认值」与 legacy `SpanNode` 同口径。任务书把 `(a: number, b = 1)` 列在目标里，这一格**没做到**，本报告不当作已完成 |
| **R2** | 嵌套箭头内层 `(b) =>` 的 `(` | `Classify` 返回 `Fallback("no-host-rule:VariableDeclarationShape(")`（前一个代码单元是 `=>`），不 replay | 缺一条「`=>` 之后紧跟 `(`」的 Deferred 规则。加上它只需在 `Classify` 的 `(` 分支补 `IsArrowPrefix`（与 `IsAsyncArrowPrefix` 同形），但嵌套箭头在 base 上已经正确（`fileFallback=false`、探针 OK），本棒按「不增面」原则未做 |
| **R3** | replay 的格位 | 发生在 `ParseFunctionParameters` 那一拍（收口格），**不是** `=>` 那一格 | 见 §2：这份 base 的声明初始化器目录在 `=>` 格**不再被问**（实测），把 Bind 挂在 `=>` 格的候选上不会发生。语义上仍满足「`=>` 确定后才 replay、且每条括号一次」；若要真的在 `=>` 格 replay，需要 E-base 让声明初始化器目录继续吃到 `=>` 格（另一棒的写域） |
| **R4** | `isArrowable` 只看源码文本 | `IsSimpleList` 判据是文本正则（B1 的），不是结构位 | 与 B1 同一份判据（不写第二份）；文本判据在 `(` / `)` / `=>` 三格的结论一致，满足 A2 R7 的「Reject 永久」要求 |

**没有把 replay 失败静默掉**：`ReplayFailureCount`（`DeferredBracketCatalog` 与
`StatementRouteUtil` 两份镜像）+ `ArrowParamsCatalog.RejectCount / HalfBuildCount`
在 13 条探针里分别恒为 0 / 0 / 0（`RejectCount` 只在 R1 那条形参表上计数，是**预期**非零）。
`Bind` 返回空 ⇒ `BindArrowParen` 返回 `false` ⇒ legacy 原路，不吞。

---

## 7. 可复算命令

```powershell
$d = "C:\Users\Admin\Documents\GitHub\xl-example-set\b4d-arrow-params"; Set-Location $d
xl_build { cwd: $d, paths: ["core","typescript"], targets: ["ts"] }   # 0 error / 3 warning
node node_modules/typescript/bin/tsc -p .                              # exit 0

node typescript/cases/tts/tools/arrow-param-probe.mjs                  # 13 条全 OK，PASS
node tests/parse/wide-ast.mjs                    # 0 / 33 / 83+13=96 PASS
node tests/parse/wide-ast.mjs --legacy           # 0 / 0 / 2 PASS
node typescript/cases/tts/run.mjs                # PASS 429
node typescript/cases/tts/tools/tshape-judge.mjs ts-all   # 429 / 426 / 3
node tests/gates/run.mjs                         # 4 PASS / 0 FAIL / 7 N/A
node typescript/cases/tts/tools/expr-bracket-probe.mjs    # B4b 的六片段（回归：`let v = (a);` 仍 deferred+1、无 replay）
```

`tmp/` 全部 gitignored，不提交（`tmp/arrow-probe.mjs` / `tmp/dbg-arrow.mjs` / `tmp/dbg-guide*.mjs`
是定位用的临时脚本；可复算的那一份已入库为 `typescript/cases/tts/tools/arrow-param-probe.mjs`）。
