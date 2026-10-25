# possible-statement：legacy 面盘点（Stage 5d 收尾）

> 分支 `feature/possible-statement-5d10b`，基线（转正 + Stage 5d 全合并）@ **`fa3d32af`**。
> 工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d10b`（`node_modules` 为 junction）。
> 口径：只读盘源码 + 跑测试；本文里每个「已接管」都有计数或 gate 读数，每处「仍 legacy」都指到文件/入口。
>
> 一句话结论（5d-10b 更新）：**默认路径已无 legacy**——`LegacyStatementDispatch=0`、根目录不再注册
> `StatementPossibleShape`、默认态 `ScanRoot=0`；legacy 只剩三种合法去处：**文件级 fallback 的重解析**
> （4 个文件）、**RawTail 4 / Declined 2 的段尾与拒绝建树**、以及**声明体内部仍由体指南建**
> （同属 possible 面，不是根语句壳）。`StatementBuilder` 的原子建树仍是收口后的唯一建树者（§6.9）。

---

## 0. 事实来源与复核方式

| 类别 | 来源 |
| --- | --- |
| 路由常量与开关默认值 | `typescript/tokens/statements/statement-route-util.xl.md`（`Route` 常量 §L30-70、开关 §L124-309） |
| 块体挂载开关 | `typescript/tokens/statements/block-possible-shape.xl.md`（§L94 / §L287 / §L296 / §L633） |
| 各 Stage 的交接结论 | `HANDOFF-s4*.md` 23 份（尤其 `HANDOFF-s4aa.md` §4 全表读数、§5 未覆盖） |
| 本轮可执行读数 | `tests/statement-possible/final-matrix.mjs`（新增）、`tests/statement-possible/declaration-statement-takeover.mjs`（双模式改造）、`HANDOFF-s5d.md` 附录 |

复核命令（cwd = 本分支工作目录）：

```powershell
node tests/statement-possible/final-matrix.mjs            # 38 条能力矩阵（含计数增量）
node tests/statement-possible/final-matrix.mjs --decl     # 声明族开档
node tests/statement-possible/final-matrix.mjs --class    # 块内 class 开档
node tests/statement-possible/declaration-statement-takeover.mjs          # 默认关
node tests/statement-possible/declaration-statement-takeover.mjs --open   # 开档
```

---

## 1. 语句级：路由表与已接管族

### 1.1 `StatementRoute` 常量（`statement-route-util.xl.md`）

| 常量 | 值 | 语义 | 谁建壳 / 谁收口 |
| --- | --- | --- | --- |
| `None` | 0 | 本族不管这一格，继续等（`Uncertain`，**不是** `Reject`） | — |
| `ShellPlainExpression` | 1 | 表达式语句 / 子句语句：`;` / EOF / ASI 收口 | `RootExpressionStatementPossibleShape`、`CaseClauseStatementPossibleShape` |
| `ShellVariable` | 2 | `let/const/var` 语句 | `VariableStatementPossibleShape`（三层，见 §1.3） |
| `Legacy` | 3 | 交给 legacy 整段建树 | `statement-possible-shape` / `source-file-end-possible-shape` → `StatementBuilder` |
| `ShellStatementFamily` | 4 | 控制流族 / 块内 `class` / 块内 `await`：`ScanRoot` 判界 | `ControlFlowStatementPossibleShape`、`AwaitStatementPossibleShape`、`DeclarationStatementPossibleShape`（块体目录） |
| `ShellBlock` | 5 | 块语句 `{ … }`（由括号事件挂块体目录） | `BlockPossibleShape` |
| `ShellLabel` | 6 | `lbl: stmt`（在 `:` 格建壳） | `ControlFlowStatementPossibleShape`（标签入口） |
| `ShellDeclarationFamily` | 7 | 根层声明 / 导入导出：`;` / EOF / ASI 收口 | `DeclarationStatementPossibleShape`（**默认关**） |

### 1.2 已由 possible 驱动的语句族（默认开关下）

「接管计数」是进程内只增计数器，读数取自 `final-matrix.mjs` 默认档（`HANDOFF-s5d.md` 附录 A）。

| 语句族 | 起点判据 | Route Kind | 候选 / 文件 | 默认 | 本轮读数 |
| --- | --- | --- | --- | --- | --- |
| 表达式语句（根） | 标识符 / 字面量 / `(` `[` / 一元符号 | `ShellPlainExpression` | `root-expression-statement-possible-shape.xl.md` | 开 | `expr-*` 11 条 AST 全等，壳计数无专用项（按族只记 XML/AST） |
| 变量声明 | `let/const/var` + `StartsBinding` | `ShellVariable` | `variable-statement-possible-shape.xl.md` + `variable-statement-three-layer.xl.md` | 开 | `var-simple/list/destructure` 3 条全等 |
| `if / while / do / for / for-in / for-of / switch / try / return / throw / break / continue / debugger / with` | 关键字起点 | `ShellStatementFamily` | `control-flow-statement-possible-shape.xl.md` | 开 | `ControlFlowShellCount`：if/while/for/for-of/try/do/return 各 +1 |
| 空语句（根 / 块体） | 语句首 `;` | `ShellStatementFamily` | 同上（`EnableControlFlowEmpty`） | 开 | `empty-root` cf=+1、`empty-in-block` shell+1/cf+1 |
| 标签语句 | `ident` + `:`（文档级前瞻 `IsLabelColonAhead`） | `ShellLabel` | 同上（4f 修判据） | 开 | `LabelShellCount=+1` |
| 块语句 | `{`（括号事件） | `ShellBlock` | `block-possible-shape.xl.md` | 开 | `block` shell+1/body+1、`block-nested` shell+2/body+2 |
| 块体内部语句 | 块体 `{` 上的目录 | 各族的 body 入口 | `block-possible-shape.xl.md`（`EnableBlockBodyCatalog`） | 开 | `BlockBodyStatementCount`：if/while/for/try/函数体/箭头体/对象方法体/子句 case 体均 > 0 |
| 函数体 / 箭头体 / 对象方法体 / switch case 体 / 控制流体 | `{` 前是 `)` / `=>` / 返回类型 / 属于控制流壳 | 挂载点（非语句族） | `block-possible-shape` 的 `TryMount*` 一族 | 开 | `FunctionBodyMountCount` / `ArrowBodyMountCount` / `SwitchCaseBodyMountCount` / `ControlFlowBodyBraceCount` |
| 块体内 `await` 语句 | `await` 首代码单元、宿主是块体 `{` | `ShellStatementFamily` | `AwaitStatementPossibleShape`（4l） | 开 | `await-block`：`AwaitShellCount=+1` + fnBody+1 |
| switch 子句级语句 | `case …:` 之后、宿主是 case 块 `{` | `ShellPlainExpression`（4aa 修正） | `case-clause-statement-possible-shape.xl.md` | 开（双开关） | `clause-one` shell=1、`clause-two` shell=2、`clause-case-body` body=1 |
| 声明 / 导入导出（根层） | `interface/enum/type/namespace/module/declare/import/export/using` | `ShellDeclarationFamily` | `declaration-statement-possible-shape.xl.md` | **关** | 默认 `DeclarationShellCount=0`（27/27 用例）；开档 21/27 接管（§6.1） |

### 1.3 let/const/var 的三层 possible

`variable-statement-three-layer.xl.md` 是三层实现的落点（计数：`StatementCount` / `ListCount` / `DeclarationCount` / `FallbackCount` / `MismatchCount`，开关 `Enabled`）：

| 层 | 判什么 | 产物 | 状态 |
| --- | --- | --- | --- |
| 语句级 | 首代码单元 `let/const/var` + 下一格 `StartsBinding` | `StatementShape`（`Kind=ShellVariable`） | 已落地 |
| 列表级 | `Decl (',' Decl)*` 与逗号、`;`/ASI 收口交给 `EndPossible` | 声明列表 | 已落地（`ListCount` 可读） |
| 单条声明 | `Name (!)? (= Initializer)? (: Type)?`、解构 | `VariableDeclarationShape` | 已落地（`DeclarationCount` 可读） |

> 结论：**「let/const 有对应 possible」这一条不只在语句级成立，列表/单条两级也在**；但它们只覆盖变量声明，
> `interface/type/enum/namespace/module/declare/import/export/using` 是另一条族（§6.1），默认关。

---

## 2. 语句级：默认路径已无 legacy；仅文件级 fallback 与残余形态保留

**Stage 5d 收尾（5d-10b）的口径**：默认解析里 `StatementRoute.Legacy` 派发 **0** 次，根目录不再注册
`StatementPossibleShape`，`ScanRoot` 在默认态全语料 **0** 次（`root-retirement.mjs`，6300 用例）。
下表逐项说明「哪些 legacy 面已经不在默认路径上」，以及**仍然存在**的那四处。

| 族 / 形态 | 5d 收尾后的现状 | 入口（文件:方法） | 证据 |
| --- | --- | --- | --- |
| 根层声明 / 导入导出（`interface/type/enum/namespace/module/declare/import/export/using`） | **已接管**（`EnableDeclarationShell=true`、`EnableRootDeclarationShell=true`）；壳判界、`StatementBuilder` 建树 | `statement-route-util.xl.md:DecideDeclaration` → `declaration-statement-possible-shape` / `StatementBoundaryUtil.StatementEndCode` | `declaration-statement-takeover` **33/33**（takeover=27、knownGap=0）；`declaration-shell-boundary` **74/74** |
| `function` / `class` / `abstract class` 声明（含体） | **已接管**（5d-3 / 5d-8a：根层与块内同一条壳通道） | `Decide` 的 `ShellFunctionDeclaration` / `ShellClassDeclaration` → `StatementBoundaryUtil.DeclarationShellEndCode` | `decl-shell` 74/74；ast-json 6171/6171（`end-build` 47 条） |
| 块内 `class` 声明 | **已接管**（`EnableBlockClassShell=true`，5d-7 起默认） | `statement-route-util.xl.md:Decide`（`ShellStatementFamily`） | `final-matrix --class`；`block-class` cf=+1；`control-flow-boundary` 85/85 |
| 声明体内部的语句（类成员体、命名空间体、枚举体） | **仍由各自体指南 / 体目录负责**（不是根语句壳，但同属 possible 通道）；`module` 体括号是 RawTail 1 的来源 | `typescript/tokens/declarations/*-possible-shape.xl.md`、`body-guide-util.xl.md` | `raw-tail-attribution`：`module-blocks.ts:L9` 1 次（4 条之一） |
| **文件级 fallback 的 legacy 重解析**（`EnableFileFallback=true`） | **保留**：只有新路径抛错时整文件按 legacy 目录重解析；4 个文件 | `SourceFileRunner.Parse` 的 fallback 分支 | `FileFallbackCount=4`；`ScanRoot` 42/46 次全部来自这里 |
| **RawTail 4**（段尾仍由 legacy 逐条建） | **保留**：3 族 4 条（`return` 后裸块 / 裸块尾巴 / 装饰器成员条件返回类型 / 模块体括号） | `StatementBuilder.BuildStatement` 的段尾重放 | `raw-tail-attribution`：与官方指标同源、3 族 |
| **Declined 2**（形状树拒绝、退回 legacy 建树） | **保留**：`new new A()()`（`KindNew` 委派）与箭头参数表带类型谓词 | `StatementShapeAst` 的 decline 分支 | `legacy-retirement --json` 的 `perFile`（`expression.ts:L107` / `L704`） |
| `switch` 子句内的已知缺口（§6.5） | **保留 1 条 knownGap**：嵌套 switch 内层子句不接管（树对、接管少） | `case-block-possible-shape.xl.md` / `case-clause-statement-possible-shape.xl.md` | `final-matrix` 的 `clause-nested-known-gap`（knownGap=1） |
| `{` 的二义（块 vs 对象字面量）在根层 | 5d 起由「块体目录 + 声明体括号判据」分别裁决，不再靠 `Decide` 预判 | `statement-route-util.xl.md:Decide` + `statement-boundary-util.xl.md:IsClosedDeclarationBody` | `declaration-shell-boundary` 的体括号族全绿 |

**要点**（比 Stage 5d 开头少一句「legacy 没有退场」）：**默认路径已经没有 legacy 派发**；剩下的 legacy 只有三种
合法去处——① 4 个文件级 fallback 的重解析（它是安全网，不是主路径）；② 4 条 RawTail + 2 条 Declined 的段尾 /
拒绝建树；③ 声明体内部仍由体指南建（同属 possible 面，但不是语句壳）。

**仍然成立的那条架构事实**：壳收口后把同一份 raw 切片交给 `StatementBuilder.BuildStatement` 建树——
「判界 / 挂载 / 建壳」已由 possible 完成，「原子建树」仍是 legacy 建造器。§6.9 据此保留，不再写成「未达成」。

---

## 3. 表达式级：已由「形状树 → AST」驱动的形态

证据：`op-ast-proof.mjs`（**94/94**）、`op-proof.mjs`（40/40）、`harness --all` 的 `operators-live`、
`final-matrix.mjs` 的 `expr-*` 11 条（AST/XML 全等）；优先级唯一来源是 `operator-table.xl.md`（lint：数字优先级条目 12、只在 `operator-table`），
插入原语是 `shape-insert-util.xl.md:InsertBetween`（`tests/feas-operator/insert-between.test.mjs` 9/9）。

| 形态 | 承载候选（`typescript/tokens/expressions/`） | 状态 |
| --- | --- | --- |
| 操作数叶子：数字 / 标识符 / 字符串 / 正则 / 模板 / `(`…`)` / `[`…`]` / 对象字面量 | `* -possible-shape` + `*-shape`（`parenthesized` / `array-literal` / `object-literal` / `template-*`） | 已接管 |
| 二元（含 `&&`/`\|\|`/`??`/`instanceof`/`in`/比较/位/移位/`**`） | `binary-expression-possible-shape.xl.md` + `feas-binary-operator-possible-shape.xl.md`（正式化） | 已接管，优先级/结合性由表 |
| 前缀一元（`! ~ + - ++ -- typeof void delete`）/ 后缀 `++ --` | `prefix-unary-*`、`postfix-unary-*`、`type-of-*`、`delete-*`、`void-*` | 已接管 |
| 赋值 / 复合赋值 | `feas-*` 正式化族 + `aliases/first|last-assignment-*`、`first|last-compound-assignment-*` | 已接管（**形状命名仍是 legacy 口径**，§4） |
| 条件 `?:` | `conditional-expression-possible-shape.xl.md` | 已接管 |
| `as` / `satisfies` / 类型断言 / 非空 `!` | `as-*`、`satisfies-*`、`type-assertion-*`、`non-null-*` | 已接管（`satisfies`/类型实参二义是 A 的历史根因，语料常驻） |
| 调用 / 成员 / 下标 / 可选链 / `new` / `import.meta` / 动态 `import()` | `call-*`、`property-access-*`、`element-access-*`、`new-*`、`meta-property-*`、`expression-with-type-arguments-*` | 已接管（`expr-optional`、`expr-import-meta`、`expr-dynamic-import` 全等） |
| 箭头 / 函数 / 类表达式 | `arrow-function-*`、`function-expression-*`、`class-expression-*` | 已接管（`expr-arrow`、`expr-async-arrow`、`expr-class` 全等） |
| `await` / `yield` / 展开 / 标签模板 | `await-expression-*`、`yield-expression-*`、`spread-element-*`、`tagged-template-*` | 已接管 |
| 合成 / 省略 / 类元素分号 | `synthetic-*`、`omitted-expression-*`、`semicolon-class-element-*` | 已接管（内部用途） |

---

## 4. 表达式级：仍 legacy 的形态

| 形态 | 现状 | 入口 | 证据 / 备注 |
| --- | --- | --- | --- |
| **逗号表达式** `a, b;` | **已由形状树接管**（S3n 起）：`(a, b);` / `f((a, b));` 形状文本 `(a,b)` / `call(f)`，AST == TS | `expression-statement-possible-shape` / 逗号族候选 | `op-ast-proof` 94/94 的 `s3n-comma-paren` / `s3n-comma-nested-call` |
| **赋值语句的形状命名** | 语句级 AST 全等门比较到 `FirstAssignment` vs `EqualsToken` 字段时必然 DIFF | `aliases/first-assignment-*` 与 `statement-shape-ast.xl.md` 的名字映射 | 任务基线记录；**本轮未复核**（真实 AST 门 ast-json 6167/6167 不含该字段） |
| **对象方法 + 对象返回类型** | 既有缺陷：方法返回类型为对象字面量类型时体/类型边界判错 | `expression-builder.xl.md:ParseObjectLiteral` / `statement-builder.xl.md` 的方法分派 | 任务基线记录；**本轮未复核** |
| `do b\n{}` / `()=>1\n{}`（换行后 `{`） | 已知形态缺陷，未修 | `statement-scanner.xl.md` / `expression-builder.xl.md:ParseArrowBody` | 任务基线记录；**本轮未复核** |
| 声明/类型里的表达式与类型 | 由 `expression-builder.xl.md` / `type-builder.xl.md` 整段建，不是 possible 形状树 | 同上 | 声明族默认关 → 该路径仍是主路径 |
| JSX / 装饰器体 | 未在 possible 面内 | `typescript/tokens/jsx/*`、`decorator-*` | 未复核 |

---

## 5. 开关矩阵（每个 `Enable*`：默认 / 作用 / 关闭回退 / 证据）

| 名称 | 默认 | 作用 | `false`（或关闭）时回退 | 全表证据 |
| --- | --- | --- | --- | --- |
| `StatementRouteUtil.EnableShellExpressions` | `true` | 壳化总闸；`false` = 新候选全部 `Reject`、legacy 全接管 | 逐位回到 Stage 1 前（harness 双路对拍档） | harness `--all` / `--double-accept`；所有探针的 legacy 档 |
| `EnableFileFallback` | `true` | 新路径抛错时整文件按 legacy 目录重解析 | `false` 时不触发，行为逐字节不变 | `FileFallbackCount` / `LastFileFallback`；全表 `fallback total=0` |
| `EnableBlockBodyCatalog` | `true` | 块体 `{` 挂语句目录（变量 + 表达式 + 控制流 + 块 + await） | 块内整段 raw 交回 legacy 递归 | `block-body-takeover` 21 条；`BlockBodyStatementCount` |
| `EnableArrowBodyCatalog` | `true` | `=> {…}` 体挂目录 | 箭头体保持 raw/legacy | `ArrowBodyMountCount`；`arrow-body` |
| `EnableObjectMethodBodyCatalog` | `true` | 对象方法/访问器体挂目录 | 对象方法体保持 raw/legacy | `object-method`（body+1、fnBody+1） |
| `EnableControlFlowShell` | `true` | `if/while/do/for/switch/try/return/throw/break/continue/debugger/with` + 标签 + 空语句判 `ShellStatementFamily`/`ShellLabel` | 这些起点重新判 `Legacy`（逐位回到 4b 前） | `control-flow-takeover` 39 条；`cf-body-takeover` 46 条 |
| `EnableControlFlowLabel` | `true` | 标签语句随控制流壳（4f 修判据后默认开） | 标签走表达式壳的 legacy 分派 | `LabelShellCount`；`label` 用例 |
| `EnableControlFlowEmpty` | `true` | 语句首 `;` 归壳（4d 尾巴重放后开） | 空语句由 legacy `BuildEmpty` 建 | `empty-root`；`s4c2-empty*` |
| `EnableAwaitStatement` | `true` | 块体目录里补 `await` 起点候选 | 该候选整体 `Reject`，await 语句留 raw | `AwaitShellCount`；`await-block` |
| `EnableDeclarationShell` | `true` | 根层声明/导入导出判 `ShellDeclarationFamily` | 重新判 `Legacy`（逐位回到 4p） | 探针 **33/33**、takeover=27、knownGap=0；`declaration-shell-boundary` 74/74 |
| `EnableRootDeclarationShell` | `true` | 根层 `function` / `class` / 装饰器声明壳（5d-3） | 这三类回落 legacy 候选 | ast-json `end-build` 47 条；`decl-shell` 74/74 |
| `EnableBlockDeclarationShell` | `true` | 块内 `function` / `class` / 装饰器声明壳（5d-8a） | 块内这三类回落 raw | `cf-body-takeover` 46/0；`block-body-takeover` 21/0 |
| `EnableSwitchCaseClause`（`StatementRouteUtil`） | `true` | 子句语句判壳（4aa 转正） | 子句语句由 `BuildCaseBlock` legacy 递归建（树仍对） | `SwitchCaseClauseShellCount`；`stage4aa` 12 条 |
| `EnableSwitchCaseClause`（`BlockPossibleShape`） | `true` | case 块 `{` 挂**只含子句候选**的目录 | 不挂 → mount=0（**必须与上一行同开同关**，否则假空转） | `SwitchCaseClauseMountCount`；`HANDOFF-s4aa` §5.5 |
| `EnableBlockClassShell` | `true` | 块内 `class` 起点判 `ShellStatementFamily`（判界已迁出 `ScanRoot`，5d-7 起默认开） | 块内 `class` 走 legacy | `final-matrix --class`：`block-class` cf=+1；默认态 `control-flow-boundary` 85/85 |
| `BlockPossibleShape.EnableBlockDeclarationCatalog` | `true` | 块体目录注册 `DeclarationStatementPossibleShape` | 块内声明不走声明族候选 | 默认 `decl=0` 与之一致 |
| `BlockPossibleShape.EnableSwitchCaseBody` | `true` | case 体 `{` 挂块体目录 | case 体保持 raw | `SwitchCaseBodyMountCount`；`clause-case-body` |
| `BlockPossibleShape.EnableBlockFunctionBody` | `true` | 块内函数声明体挂目录 | 块内函数体保持 raw | `BlockFunctionBodyMountCount` |
| `VariableStatementThreeLayer.Enabled` | `true` | 变量声明三层 possible | 声明列表回退整段 | `variable-statement-three-layer` 计数（`FallbackCount`/`MismatchCount`） |

> **`EnableShellStatements` 已删除**（5d-10b）：它从未接线（恒为 0、全仓无引用），是设计期的灰度位残留。
> 全仓 grep 只剩字段声明本身，删除后 `xl_build` + `tsc` 双过（`HANDOFF-5d10b.md` §4）。

> **开关纪律**：同名 `EnableSwitchCaseClause` 在 `StatementRouteUtil` 与 `BlockPossibleShape` 上各有一份，
> 只开一处 = 挂载/判型只剩一侧（mount=0 或 shell=0），**不是**「部分生效」。这是本轮盘点发现的唯一「同名单点风险」。

---

## 6. 剩余 gap 清单

| # | Gap | 影响 | 证据位置 | 本轮读数 / 状态 |
| --- | --- | --- | --- | --- |
| 6.1 | ~~声明族开档回归~~ | 5d 起声明族默认开且 33/33（`interface I {}` ⏎ `const` / `type T = 1;` ⏎ `enum` ⏎ `export` 两条组合形态已修） | `declaration-statement-takeover` 33/33、`declaration-shell-boundary` 74/74 | **已关闭**（5d-10b 复核） |
| 6.2 | **赋值壳 DIFF**：`FirstAssignment` vs `EqualsToken` | 形状名映射与 AST 字段名不同；真实 AST 门（ast-json）不比该字段，因此不红 | `aliases/first-assignment-*`；`ast-kind-names` | 未变（`ast-kind-names` PASS：四类硬断言） |
| 6.3 | ~~逗号~~ `a, b;` | S3n 起 `(a, b);` / `f((a, b));` 由形状树建，形状文本 `(a,b)` / `call(f)` | `op-ast-proof` 94/94 的 `s3n-comma-*` | **已关闭**（5d-10b 复核） |
| 6.4 | ~~块内 class 默认关~~ | `EnableBlockClassShell=true`，判界已迁出 `ScanRoot` | `final-matrix --class`；`control-flow-boundary` 85/85 | **已关闭**（5d-7 / 5d-10b 复核） |
| 6.5 | **switch 子句 gap**（嵌套 switch 内层子句不接管） | 1 条 knownGap；树仍逐字节正确 | `final-matrix` 的 `clause-nested-known-gap` | 保留（knownGap=1） |
| 6.6 | **`do b\n{}` / `()=>1\n{}`** | 换行后 `{` 的归属；5d 的边界判据（`do` / 箭头体）已收敛，探针全绿 | 5d 家族探针 | 未再复现（无独立 gate，如实保留） |
| 6.7 | **对象方法 + 对象返回类型** | 与 RawTail #3（装饰器成员 + 条件类型返回类型）同族 | `raw-tail-attribution` | 保留 1 条 RawTail |
| 6.8 | **声明体语句**（类/命名空间/枚举体）不由语句壳驱动 | 声明体仍走体指南 / 体目录（同属 possible 面） | `typescript/tokens/declarations/*`、`body-guide-util.xl.md` | 保留（`module` 体括号是 RawTail 1） |
| 6.9 | **`StatementBuilder` 仍是原子建树者** | 判界/挂载/建壳已由 possible 完成；收口仍把 raw 切片喂 legacy 建造器 | `statement-builder.xl.md:BuildStatement`、`statement-shape.xl.md:BuildFromShell` | 架构事实（目标四判定为达成，但这一层没重写，如实留档） |
| 6.10 | harness `known` | 5d-9a 起 `known=0`（`harness --all`：102/0/known=0） | `harness.mjs --all` | **已关闭** |
| 6.11 | 同名双开关（§5）`EnableSwitchCaseClause` | 只开一处 = 假空转；4aa 起按「同开同关」交付，默认两者都 true | `statement-route-util.xl.md` / `block-possible-shape.xl.md` | 保留为交接纪律（默认态不触发） |

---

## 7. 附录：Stage 5d-10b 最终全表读数（默认态，HEAD `fa3d32af` + 本轮）

`xl_build`：**2 written / 892 skipped / 0 error**；`tsc` exit 0。

| 项 | exit | 读数 |
| --- | --- | --- |
| `declaration-statement-takeover.mjs`（默认） | 0 | **33/33**，`actualDefault=true`、`decl=0`、`takeover=27`、`knownGap=0` |
| `final-matrix.mjs` | 0 | cases=38、`shapeAst=38/38`、`xmlEqLegacy=38/38`、`astEqTS=38/38`、knownGap=1、failed=0 |
| `harness --all` | 0 | groups run=8 skipped=3；cases **102/0/known=0**；fallback 0；double-accept 0 |
| `harness --double-accept` | 0 | cells=823 candidateCalls=5216 endCalls=823 acceptCells=189；冲突 0；cases=120 failed=0 |
| `ast-json` | 0 | **6171/6171**，cj-fail=0；`git status typescript/cases` 0 行 |
| `ast-json-diff` | 0 | 6171/6171；结构差 0、位置差 0、字段差 0 |
| `token-ast --quiet` | 0 | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10、known-gap=0 |
| `real-dts` | 0 | 226/226 解析成功、崩溃 0、AST 全等 226 |
| `validate` | 0 | 1720 条 / 0 条不合格 |
| `op-ast-proof` / `op-proof` / `ast-kind-names` | 0 / 0 / 0 | 94/94 / 40/40 / PASS |
| `legacy-retirement.mjs`（官方基线） | 0 | **0 / 46 / 4 / 2 / 2 / 4**（LegacyDispatch / ScanRoot / RawTail / Declined / totalDeclined / FileFallback） |
| `root-retirement.mjs` | 0 | 默认态 6300 用例 `ScanRoot=0`；false 态 11 用例 `ScanRoot=69`、逐节点一致、永不兜底 |
| `raw-tail-attribution.mjs` / `file-fallback-attribution.mjs` | 0 / 0 | 3 族 4 次（与官方指标同源）/ 4 ≤ 13（台账内、0 新类别） |
